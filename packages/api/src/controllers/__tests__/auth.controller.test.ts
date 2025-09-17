import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response } from 'express';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../../services/auth.service.js';

// Mock the validation utility
vi.mock('../../utils/validation.js', () => ({
  validateRequest: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
}));

// Import the mocked function
const { validateRequest: mockValidateRequest, ValidationError } = vi.mocked(await import('../../utils/validation.js'));

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: AuthService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock AuthService
    mockAuthService = {
      register: vi.fn(),
      verifyEmail: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    } as any;

    // Mock Express Request and Response
    mockRequest = {
      body: {},
      params: {},
      userId: undefined,
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    authController = new AuthController(mockAuthService);
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register user successfully', async () => {
      mockValidateRequest.mockReturnValue(userData);
      (mockAuthService.register as Mock).mockResolvedValue({
        message: 'User registered successfully',
        userId: 'user-id-123',
      });

      mockRequest.body = userData;

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: { userId: 'user-id-123' },
      });
    });

    it('should handle user already exists error', async () => {
      mockValidateRequest.mockReturnValue(userData);
      (mockAuthService.register as Mock).mockRejectedValue(
        new Error('User with this email already exists')
      );

      mockRequest.body = userData;

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle validation errors', async () => {
      mockValidateRequest.mockImplementation(() => {
        throw new ValidationError('Validation failed');
      });

      mockRequest.body = { invalid: 'data' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Validation failed',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      (mockAuthService.verifyEmail as Mock).mockResolvedValue({
        message: 'Email verified successfully',
      });

      mockRequest.params = { token };

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should handle missing token', async () => {
      mockRequest.params = {};

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Verification token is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle invalid token error', async () => {
      const token = 'invalid-token';
      (mockAuthService.verifyEmail as Mock).mockRejectedValue(
        new Error('Invalid or expired verification token')
      );

      mockRequest.params = { token };

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Invalid or expired verification token',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockAuthResponse = {
      user: {
        id: 'user-id-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        planType: 'free',
        emailVerified: true,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    };

    it('should login successfully', async () => {
      mockValidateRequest.mockReturnValue(loginData);
      (mockAuthService.login as Mock).mockResolvedValue(mockAuthResponse);

      mockRequest.body = loginData;

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockAuthResponse,
      });
    });

    it('should handle invalid credentials', async () => {
      mockValidateRequest.mockReturnValue(loginData);
      (mockAuthService.login as Mock).mockRejectedValue(
        new Error('Invalid email or password')
      );

      mockRequest.body = loginData;

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle unverified email', async () => {
      mockValidateRequest.mockReturnValue(loginData);
      (mockAuthService.login as Mock).mockRejectedValue(
        new Error('Please verify your email before logging in')
      );

      mockRequest.body = loginData;

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (mockAuthService.refreshToken as Mock).mockResolvedValue(newTokens);

      mockRequest.body = { refreshToken };

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens: newTokens },
      });
    });

    it('should handle missing refresh token', async () => {
      mockRequest.body = {};

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';
      (mockAuthService.refreshToken as Mock).mockRejectedValue(
        new Error('Invalid or expired refresh token')
      );

      mockRequest.body = { refreshToken };

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const userId = 'user-id-123';
      const refreshToken = 'refresh-token';

      (mockAuthService.logout as Mock).mockResolvedValue({
        message: 'Logged out successfully',
      });

      mockRequest.userId = userId;
      mockRequest.body = { refreshToken };

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId, refreshToken);
    });

    it('should handle logout error', async () => {
      const userId = 'user-id-123';
      (mockAuthService.logout as Mock).mockRejectedValue(new Error('Logout failed'));

      mockRequest.userId = userId;
      mockRequest.body = {};

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const email = 'test@example.com';
      mockValidateRequest.mockReturnValue({ email });
      (mockAuthService.requestPasswordReset as Mock).mockResolvedValue({
        message: 'Password reset link sent',
      });

      mockRequest.body = { email };

      await authController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset link sent',
      });
    });

    it('should handle validation error', async () => {
      mockValidateRequest.mockImplementation(() => {
        throw new ValidationError('Invalid email');
      });

      mockRequest.body = { email: 'invalid-email' };

      await authController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PASSWORD_RESET_REQUEST_FAILED',
          message: 'Invalid email',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('resetPassword', () => {
    const resetData = {
      token: 'reset-token',
      password: 'NewPassword123!',
    };

    it('should reset password successfully', async () => {
      mockValidateRequest.mockReturnValue(resetData);
      (mockAuthService.resetPassword as Mock).mockResolvedValue({
        message: 'Password reset successfully',
      });

      mockRequest.body = resetData;

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should handle invalid reset token', async () => {
      mockValidateRequest.mockReturnValue(resetData);
      (mockAuthService.resetPassword as Mock).mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      mockRequest.body = resetData;

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired reset token',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = 'user-id-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        plan_type: 'free',
        email_verified: true,
        preferences: {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock database access through authService
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [mockUser] }),
        release: vi.fn(),
      };

      // Access the private db property for testing
      (mockAuthService as any).db = {
        connect: vi.fn().mockResolvedValue(mockClient),
      };

      mockRequest.userId = userId;

      await authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
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
        },
      });
    });

    it('should handle user not found', async () => {
      const userId = 'non-existent-user';

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };

      (mockAuthService as any).db = {
        connect: vi.fn().mockResolvedValue(mockClient),
      };

      mockRequest.userId = userId;

      await authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle database error', async () => {
      const userId = 'user-id-123';

      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('Database error')),
        release: vi.fn(),
      };

      (mockAuthService as any).db = {
        connect: vi.fn().mockResolvedValue(mockClient),
      };

      mockRequest.userId = userId;

      await authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile',
          timestamp: expect.any(String),
        },
      });
    });
  });
});