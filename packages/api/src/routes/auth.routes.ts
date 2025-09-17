import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();
  const authController = new AuthController(authService);

  // Public routes
  router.post('/register', authController.register);
  router.get('/verify-email/:token', authController.verifyEmail);
  router.post('/login', authController.login);
  router.post('/refresh-token', authController.refreshToken);
  router.post('/request-password-reset', authController.requestPasswordReset);
  router.post('/reset-password', authController.resetPassword);

  // Protected routes
  router.post('/logout', requireAuth(authService), authController.logout);
  router.get('/profile', requireAuth(authService), authController.getProfile);

  return router;
}