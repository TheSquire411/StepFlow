import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const integrationController = new IntegrationController();

// Admin-only routes for integration testing
router.post('/test-workflow', authMiddleware, integrationController.testWorkflow);
router.get('/test-connectivity', authMiddleware, integrationController.testConnectivity);
router.get('/test-consistency/:userId', authMiddleware, integrationController.testConsistency);
router.get('/system-status', integrationController.getSystemStatus);

export { router as integrationRoutes };