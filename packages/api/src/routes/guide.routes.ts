import { Router } from 'express';
import { GuideController } from '../controllers/guide.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();
const guideController = new GuideController();

// Protected routes (require authentication)
router.post('/', authenticateToken, guideController.createGuide.bind(guideController));
router.get('/', authenticateToken, guideController.listGuides.bind(guideController));
router.get('/:id', authenticateToken, guideController.getGuide.bind(guideController));
router.put('/:id', authenticateToken, guideController.updateGuide.bind(guideController));
router.delete('/:id', authenticateToken, guideController.deleteGuide.bind(guideController));
router.get('/:id/analytics', authenticateToken, guideController.getGuideAnalytics.bind(guideController));

// Public routes
router.post('/:id/view', guideController.incrementViewCount.bind(guideController));

// Analytics endpoints (public for embedded guides)
router.post('/:id/analytics/view', guideController.trackView.bind(guideController));
router.post('/:id/analytics/step-view', guideController.trackStepView.bind(guideController));
router.post('/:id/analytics/step-time', guideController.trackStepTime.bind(guideController));
router.post('/:id/analytics/completion', guideController.trackCompletion.bind(guideController));
router.post('/:id/analytics/engagement', guideController.trackEngagement.bind(guideController));

export default router;