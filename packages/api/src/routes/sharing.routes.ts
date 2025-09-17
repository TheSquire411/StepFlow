import { Router } from 'express';
import { SharingController } from '../controllers/sharing.controller.js';
import { SharingService } from '../services/sharing.service.js';
import { authenticateToken, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { pool } from '../config/database.js';

const router = Router();
const sharingService = new SharingService(pool);
const sharingController = new SharingController(sharingService);

// Protected routes (require authentication)

/**
 * @route POST /api/sharing/guides/:guideId/settings
 * @desc Create or update sharing settings for a guide
 * @access Private
 */
router.post('/guides/:guideId/settings', authenticateToken, sharingController.createSharingSettings);

/**
 * @route GET /api/sharing/guides/:guideId/settings
 * @desc Get sharing settings for a guide
 * @access Private
 */
router.get('/guides/:guideId/settings', authenticateToken, sharingController.getSharingSettings);

/**
 * @route PUT /api/sharing/guides/:guideId/settings
 * @desc Update sharing settings for a guide
 * @access Private
 */
router.put('/guides/:guideId/settings', authenticateToken, sharingController.updateSharingSettings);

/**
 * @route POST /api/sharing/guides/:guideId/permissions
 * @desc Create share permission for a user
 * @access Private
 */
router.post('/guides/:guideId/permissions', authenticateToken, sharingController.createSharePermission);

/**
 * @route GET /api/sharing/guides/:guideId/permissions
 * @desc Get share permissions for a guide
 * @access Private
 */
router.get('/guides/:guideId/permissions', authenticateToken, sharingController.getSharePermissions);

/**
 * @route PUT /api/sharing/permissions/:permissionId
 * @desc Update share permission
 * @access Private
 */
router.put('/permissions/:permissionId', authenticateToken, sharingController.updateSharePermission);

/**
 * @route DELETE /api/sharing/permissions/:permissionId
 * @desc Delete share permission
 * @access Private
 */
router.delete('/permissions/:permissionId', authenticateToken, sharingController.deleteSharePermission);

/**
 * @route POST /api/sharing/guides/:guideId/embed
 * @desc Generate custom embed code for a guide
 * @access Private
 */
router.post('/guides/:guideId/embed', authenticateToken, sharingController.generateEmbedCode);

// Public routes (no authentication required)

/**
 * @route POST /api/sharing/verify/:shareToken
 * @desc Verify access to a shared guide
 * @access Public
 */
router.post('/verify/:shareToken', sharingController.verifyShareAccess);

/**
 * @route GET /api/sharing/guide/:shareToken
 * @desc Get public guide data for shared access
 * @access Public
 */
router.get('/guide/:shareToken', sharingController.getSharedGuide);

/**
 * @route GET /api/sharing/guides/:guideId/settings/public
 * @desc Get public sharing settings (for users with permissions)
 * @access Semi-Public (optional auth)
 */
router.get('/guides/:guideId/settings/public', optionalAuthMiddleware, sharingController.getSharingSettings);

export default router;