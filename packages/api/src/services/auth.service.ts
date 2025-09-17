import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';
import { User, CreateUserInput, LoginInput, PasswordResetRequestInput, PasswordResetInput } from '../models/user.model.js';
import { EmailService } from './email.service.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'passwordResetToken' | 'emailVerificationToken'>;
  tokens: AuthTokens;
}

export class AuthService {
  private db: Pool;
  private emailService: EmailService;
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(db: Pool, emailService: EmailService) {
    this.db = db;
    this.emailService = emailService;
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Register a new user with email verification
   */
  async register(userData: CreateUserInput): Promise<{ message: string; userId: string }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Insert user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, email_verification_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userData.email, passwordHash, userData.firstName, userData.lastName, emailVerificationToken]
      );

      const userId = result.rows[0].id;

      await client.query('COMMIT');

      // Send verification email
      await this.emailService.sendVerificationEmail(userData.email, emailVerificationToken);

      return {
        message: 'User registered successfully. Please check your email for verification.',
        userId
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const client = await this.db.connect();
    
    try {
      const result = await client.query(
        `UPDATE users 
         SET email_verified = true, email_verification_token = NULL, updated_at = NOW()
         WHERE email_verification_token = $1 AND email_verified = false
         RETURNING id`,
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired verification token');
      }

      return { message: 'Email verified successfully' };
    } finally {
      client.release();
    }
  }

  /**
   * Login user and return tokens
   */
  async login(loginData: LoginInput): Promise<AuthResponse> {
    const client = await this.db.connect();
    
    try {
      // Get user by email
      const result = await client.query(
        `SELECT id, email, password_hash, first_name, last_name, plan_type, 
                email_verified, preferences, created_at, updated_at
         FROM users 
         WHERE email = $1`,
        [loginData.email]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];

      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Please verify your email before logging in');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      // Store refresh token in database
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Remove sensitive data from user object
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        user: {
          id: userWithoutPassword.id,
          email: userWithoutPassword.email,
          firstName: userWithoutPassword.first_name,
          lastName: userWithoutPassword.last_name,
          planType: userWithoutPassword.plan_type,
          emailVerified: userWithoutPassword.email_verified,
          preferences: userWithoutPassword.preferences,
          createdAt: userWithoutPassword.created_at,
          updatedAt: userWithoutPassword.updated_at
        },
        tokens
      };
    } finally {
      client.release();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as { userId: string };
      
      // Check if refresh token exists in database
      const client = await this.db.connect();
      try {
        const result = await client.query(
          'SELECT id FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
          [decoded.userId, refreshToken]
        );

        if (result.rows.length === 0) {
          throw new Error('Invalid or expired refresh token');
        }

        // Generate new tokens
        const newTokens = await this.generateTokens(decoded.userId);

        // Replace old refresh token with new one
        await client.query(
          'UPDATE refresh_tokens SET token = $1, expires_at = $2, updated_at = NOW() WHERE user_id = $3 AND token = $4',
          [newTokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), decoded.userId, refreshToken]
        );

        return newTokens;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    const client = await this.db.connect();
    
    try {
      if (refreshToken) {
        // Remove specific refresh token
        await client.query(
          'DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2',
          [userId, refreshToken]
        );
      } else {
        // Remove all refresh tokens for user (logout from all devices)
        await client.query(
          'DELETE FROM refresh_tokens WHERE user_id = $1',
          [userId]
        );
      }

      return { message: 'Logged out successfully' };
    } finally {
      client.release();
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequestInput): Promise<{ message: string }> {
    const client = await this.db.connect();
    
    try {
      // Check if user exists
      const userResult = await client.query(
        'SELECT id, first_name FROM users WHERE email = $1',
        [data.email]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists or not for security
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
      }

      const user = userResult.rows[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await client.query(
        `UPDATE users 
         SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
         WHERE id = $3`,
        [resetToken, resetExpires, user.id]
      );

      // Send reset email
      await this.emailService.sendPasswordResetEmail(data.email, resetToken, user.first_name);

      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    } finally {
      client.release();
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(data: PasswordResetInput): Promise<{ message: string }> {
    const client = await this.db.connect();
    
    try {
      // Find user with valid reset token
      const result = await client.query(
        `SELECT id FROM users 
         WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [data.token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired reset token');
      }

      const userId = result.rows[0].id;

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      // Update password and clear reset token
      await client.query(
        `UPDATE users 
         SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, userId]
      );

      // Invalidate all refresh tokens for security
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

      return { message: 'Password reset successfully' };
    } finally {
      client.release();
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
        [userId, refreshToken, expiresAt]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Verify access token and return user ID
   */
  async verifyAccessToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as { userId: string; type: string };
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded.userId;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }
}