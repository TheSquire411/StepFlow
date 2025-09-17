import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { 
  CreateUserSchema, 
  LoginSchema, 
  PasswordResetRequestSchema, 
  PasswordResetSchema 
} from '../models/user.model.js';
import { validateRequest } from '../utils/validation.js';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response) => {
    try {
      const userData = validateRequest(CreateUserSchema, req.body);
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: { userId: result.userId }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            error: {
              code: 'USER_EXISTS',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      res.status(400).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: error instanceof Error ? error.message : 'Registration failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Verify user email
   */
  verifyEmail = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Verification token is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await this.authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Email verification error:', error);
      
      res.status(400).json({
        error: {
          code: 'VERIFICATION_FAILED',
          message: error instanceof Error ? error.message : 'Email verification failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response) => {
    try {
      const loginData = validateRequest(LoginSchema, req.body);
      const result = await this.authService.login(loginData);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          return res.status(401).json({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        if (error.message.includes('verify your email')) {
          return res.status(401).json({
            error: {
              code: 'EMAIL_NOT_VERIFIED',
              message: error.message,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      res.status(400).json({
        error: {
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : 'Login failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
            timestamp: new Date().toISOString()
          }
        });
      }

      const tokens = await this.authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Logout user
   */
  logout = async (req: Request, res: Response) => {
    try {
      const userId = req.userId!; // Set by auth middleware
      const { refreshToken } = req.body;
      
      const result = await this.authService.logout(userId, refreshToken);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(400).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: error instanceof Error ? error.message : 'Logout failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Request password reset
   */
  requestPasswordReset = async (req: Request, res: Response) => {
    try {
      const data = validateRequest(PasswordResetRequestSchema, req.body);
      const result = await this.authService.requestPasswordReset(data);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      
      res.status(400).json({
        error: {
          code: 'PASSWORD_RESET_REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Password reset request failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Reset password
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const data = validateRequest(PasswordResetSchema, req.body);
      const result = await this.authService.resetPassword(data);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error instanceof Error && error.message.includes('Invalid or expired')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.status(400).json({
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: error instanceof Error ? error.message : 'Password reset failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.userId!; // Set by auth middleware
      
      // This would typically use a UserService, but for now we'll implement it here
      const client = await this.authService['db'].connect();
      try {
        const result = await client.query(
          `SELECT id, email, first_name, last_name, plan_type, email_verified, 
                  preferences, created_at, updated_at
           FROM users 
           WHERE id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
              timestamp: new Date().toISOString()
            }
          });
        }

        const user = result.rows[0];
        
        res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              planType: user.plan_type,
              emailVerified: user.email_verified,
              preferences: user.preferences,
              createdAt: user.created_at,
              updatedAt: user.updated_at
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Get profile error:', error);
      
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}