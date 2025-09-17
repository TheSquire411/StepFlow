import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService } from '../auth.service.js';
import { EmailService } from '../email.service.js';

// Mock dependencies
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('crypto');

const mockBcrypt = bcrypt as {
  hash: Mock;
  compare: Mock;
};

const mockJwt = jwt as {
  sign: Mock;
  verify: Mock;
};

const mockCrypto = crypto as {
  randomBytes: Mock;
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: Pool;
  let mockEmailService: EmailService;
  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Mock database pool
    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient),
    } as any;

    // Mock email service
    mockEmailService = {
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };

    // Set up environment variables
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';

    authService = new AuthService(mockDb, mockEmailService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [{ id: 'user-id-123' }] }) // Insert user
        .mockResolvedValueOnce(undefined); // COMMIT

      // Mock bcrypt hash
      mockBcrypt.hash.mockResolvedValue('hashed-password');

      // Mock crypto random bytes
      mockCrypto.randomBytes.mockReturnValue({
        toString: vi.fn().mockReturnValue('verification-token'),
      });

      const result = await authService.register(userData);

      expect(result).toEqual({
        message: 'User registered successfully. Please check your email for verification.',
        userId: 'user-id-123',
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        userData.email,
        'verification-token'
      );
    });

    it('should throw error if user already exists', async () => {
      // Mock existing user
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] }) // Check existing user
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle database errors during registration', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(authService.register(userData)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      mockClient.query.mockResolvedValue({ rows: [{ id: 'user-id' }] });

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [token]
      );
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      first_name: 'John',
      last_name: 'Doe',
      plan_type: 'free',
      email_verified: true,
      preferences: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should login successfully with valid credentials', async () => {
      // Mock database response
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [] }); // Store refresh token

      // Mock bcrypt compare
      mockBcrypt.compare.mockResolvedValue(true);

      // Mock JWT generation
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.login(loginData);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          planType: mockUser.plan_type,
          emailVerified: mockUser.email_verified,
          preferences: mockUser.preferences,
          createdAt: mockUser.created_at,
          updatedAt: mockUser.updated_at,
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password_hash);
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw error for non-existent user', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for unverified email', async () => {
      const unverifiedUser = { ...mockUser, email_verified: false };
      mockClient.query.mockResolvedValue({ rows: [unverifiedUser] });

      await expect(authService.login(loginData)).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });

    it('should throw error for invalid password', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const userId = 'user-id-123';

    it('should refresh token successfully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue({ userId, type: 'refresh' });

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 'token-id' }] }) // Check token exists
        .mockResolvedValueOnce({ rows: [] }); // Update token

      // Mock new token generation
      mockJwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    });

    it('should throw error for invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error for non-existent refresh token in database', async () => {
      mockJwt.verify.mockReturnValue({ userId, type: 'refresh' });
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('logout', () => {
    const userId = 'user-id-123';
    const refreshToken = 'refresh-token';

    it('should logout successfully with refresh token', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await authService.logout(userId, refreshToken);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2',
        [userId, refreshToken]
      );
    });

    it('should logout from all devices when no refresh token provided', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await authService.logout(userId);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE user_id = $1',
        [userId]
      );
    });
  });

  describe('requestPasswordReset', () => {
    const email = 'test@example.com';

    it('should send password reset email for existing user', async () => {
      const mockUser = { id: 'user-id', first_name: 'John' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Find user
        .mockResolvedValueOnce({ rows: [] }); // Update reset token

      mockCrypto.randomBytes.mockReturnValue({
        toString: vi.fn().mockReturnValue('reset-token'),
      });

      const result = await authService.requestPasswordReset({ email });

      expect(result.message).toContain('password reset link has been sent');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        'reset-token',
        'John'
      );
    });

    it('should return success message even for non-existent user', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await authService.requestPasswordReset({ email });

      expect(result.message).toContain('password reset link has been sent');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetData = {
      token: 'reset-token',
      password: 'NewPassword123!',
    };

    it('should reset password successfully', async () => {
      const userId = 'user-id-123';
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: userId }] }) // Find user with token
        .mockResolvedValueOnce({ rows: [] }) // Update password
        .mockResolvedValueOnce({ rows: [] }); // Delete refresh tokens

      mockBcrypt.hash.mockResolvedValue('new-hashed-password');

      const result = await authService.resetPassword(resetData);

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(resetData.password, 12);
    });

    it('should throw error for invalid reset token', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(authService.resetPassword(resetData)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });
  });

  describe('verifyAccessToken', () => {
    const accessToken = 'valid-access-token';
    const userId = 'user-id-123';

    it('should verify access token successfully', async () => {
      mockJwt.verify.mockReturnValue({ userId, type: 'access' });

      const result = await authService.verifyAccessToken(accessToken);

      expect(result).toBe(userId);
      expect(mockJwt.verify).toHaveBeenCalledWith(accessToken, 'test-access-secret');
    });

    it('should throw error for invalid token type', async () => {
      mockJwt.verify.mockReturnValue({ userId, type: 'refresh' });

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        'Invalid or expired access token'
      );
    });

    it('should throw error for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        'Invalid or expired access token'
      );
    });
  });
});