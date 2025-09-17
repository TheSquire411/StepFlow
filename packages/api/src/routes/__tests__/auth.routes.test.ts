import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createAuthRoutes } from '../auth.routes.js';
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
const { validateRequest: mockValidateRequest } = vi.mocked(await import('../../utils/validation.js'));

describe('Auth Routes Integration', () => {
  let app: express.Application;
  let mockAuthService: AuthService;

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
      verifyAccessToken: vi.fn(),
    } as any;

    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', createAuthRoutes(mockAuthService));

    // Mock validation to pass through by default
    mockValidateRequest.mockImplementation((schema, data) => data);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /auth/register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register user successfully', async () => {
      (mockAuthService.register as Mock).mockResolvedValue({
        message: 'User registered successfully',
        userId: 'user-id-123',
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: { userId: 'user-id-123' },
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(userData);
    });

    it('should handle registration failure', async () => {
      (mockAuthService.register as Mock).mockRejectedValue(
        new Error('Registration failed')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('REGISTRATION_FAILED');
    });
  });

  describe('GET /auth/verify-email/:token', () => {
    it('should verify email successfully', async () => {
      const token = 'verification-token';
      (mockAuthService.verifyEmail as Mock).mockResolvedValue({
        message: 'Email verified successfully',
      });

      const response = await request(app)
        .get(`/auth/verify-email/${token}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Email verified successfully',
      });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('should handle invalid token', async () => {
      const token = 'invalid-token';
      (mockAuthService.verifyEmail as Mock).mockRejectedValue(
        new Error('Invalid token')
      );

      const response = await request(app)
        .get(`/auth/verify-email/${token}`)
        .expect(400);

      expect(response.body.error.code).toBe('VERIFICATION_FAILED');
    });
  });

  describe('POST /auth/login', () => {
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
      (mockAuthService.login as Mock).mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: mockAuthResponse.user.id,
            email: mockAuthResponse.user.email,
            firstName: mockAuthResponse.user.firstName,
            lastName: mockAuthResponse.user.lastName,
            planType: mockAuthResponse.user.planType,
            emailVerified: mockAuthResponse.user.emailVerified,
            preferences: mockAuthResponse.user.preferences,
          },
          tokens: mockAuthResponse.tokens,
        },
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
    });

    it('should handle invalid credentials', async () => {
      (mockAuthService.login as Mock).mockRejectedValue(
        new Error('Invalid email or password')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle unverified email', async () => {
      (mockAuthService.login as Mock).mockRejectedValue(
        new Error('Please verify your email before logging in')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (mockAuthService.refreshToken as Mock).mockResolvedValue(newTokens);

      const response = await request(app)
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens: newTokens },
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should handle missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should handle invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';
      (mockAuthService.refreshToken as Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/request-password-reset', () => {
    it('should request password reset successfully', async () => {
      const email = 'test@example.com';
      (mockAuthService.requestPasswordReset as Mock).mockResolvedValue({
        message: 'Password reset link sent',
      });

      const response = await request(app)
        .post('/auth/request-password-reset')
        .send({ email })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset link sent',
      });

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith({ email });
    });
  });

  describe('POST /auth/reset-password', () => {
    const resetData = {
      token: 'reset-token',
      password: 'NewPassword123!',
    };

    it('should reset password successfully', async () => {
      (mockAuthService.resetPassword as Mock).mockResolvedValue({
        message: 'Password reset successfully',
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset successfully',
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetData);
    });

    it('should handle invalid reset token', async () => {
      (mockAuthService.resetPassword as Mock).mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_RESET_TOKEN');
    });
  });

  describe('Protected Routes', () => {
    const userId = 'user-id-123';
    const accessToken = 'valid-access-token';

    beforeEach(() => {
      (mockAuthService.verifyAccessToken as Mock).mockResolvedValue(userId);
    });

    describe('POST /auth/logout', () => {
      it('should logout successfully with valid token', async () => {
        (mockAuthService.logout as Mock).mockResolvedValue({
          message: 'Logged out successfully',
        });

        const response = await request(app)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ refreshToken: 'refresh-token' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Logged out successfully',
        });

        expect(mockAuthService.logout).toHaveBeenCalledWith(userId, 'refresh-token');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .send({ refreshToken: 'refresh-token' })
          .expect(401);

        expect(response.body.error.code).toBe('AUTH_001');
      });
    });

    describe('GET /auth/profile', () => {
      it('should get profile successfully with valid token', async () => {
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

        // Mock database access
        const mockClient = {
          query: vi.fn().mockResolvedValue({ rows: [mockUser] }),
          release: vi.fn(),
        };

        (mockAuthService as any).db = {
          connect: vi.fn().mockResolvedValue(mockClient),
        };

        const response = await request(app)
          .get('/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.id).toBe(userId);
        expect(response.body.data.user.email).toBe('test@example.com');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/auth/profile')
          .expect(401);

        expect(response.body.error.code).toBe('AUTH_001');
      });

      it('should handle invalid token', async () => {
        (mockAuthService.verifyAccessToken as Mock).mockRejectedValue(
          new Error('Invalid token')
        );

        const response = await request(app)
          .get('/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.error.code).toBe('AUTH_001');
      });
    });
  });

  describe('Route Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/auth/non-existent')
        .expect(404);

      // Express default 404 handling
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express built-in JSON parsing error
      expect(response.status).toBe(400);
    });
  });
});