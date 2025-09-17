import { Router } from 'express';
import { GDPRController } from '../controllers/gdpr.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware, commonSchemas } from '../middleware/validation.middleware';
import { RateLimitingMiddleware } from '../middleware/rate-limiting.middleware';
import { z } from 'zod';

const router = Router();

// All GDPR routes require authentication
router.use(authMiddleware);

// Apply stricter rate limiting for GDPR operations
router.use(RateLimitingMiddleware.custom({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'GDPR operation rate limit exceeded'
}));

// Validation schemas
const consentSchema = z.object({
  consentType: z.enum(['marketing', 'analytics', 'functional', 'necessary']),
  granted: z.boolean(),
  version: z.string().min(1).max(10)
});

const dataExportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeAuditLogs: z.boolean().default(true)
});

const dataDeletionSchema = z.object({
  confirmDeletion: z.boolean().refine(val => val === true, {
    message: 'Must confirm deletion'
  }),
  retentionReason: z.string().optional()
});

/**
 * @route POST /api/gdpr/consent
 * @desc Record user consent
 * @access Private
 */
router.post('/consent',
  ValidationMiddleware.validateBody(consentSchema),
  GDPRController.recordConsent
);

/**
 * @route GET /api/gdpr/consent
 * @desc Get user consent status
 * @access Private
 */
router.get('/consent',
  GDPRController.getConsent
);

/**
 * @route POST /api/gdpr/export
 * @desc Request data export
 * @access Private
 */
router.post('/export',
  ValidationMiddleware.validateBody(dataExportSchema),
  GDPRController.requestDataExport
);

/**
 * @route GET /api/gdpr/export/:exportId
 * @desc Download data export
 * @access Private
 */
router.get('/export/:exportId',
  ValidationMiddleware.validateParams(z.object({
    exportId: commonSchemas.id
  })),
  GDPRController.downloadDataExport
);

/**
 * @route POST /api/gdpr/delete
 * @desc Request data deletion
 * @access Private
 */
router.post('/delete',
  ValidationMiddleware.validateBody(dataDeletionSchema),
  GDPRController.requestDataDeletion
);

/**
 * @route POST /api/gdpr/anonymize
 * @desc Request data anonymization
 * @access Private
 */
router.post('/anonymize',
  ValidationMiddleware.validateBody(z.object({
    confirmAnonymization: z.boolean().refine(val => val === true, {
      message: 'Must confirm anonymization'
    })
  })),
  GDPRController.requestDataAnonymization
);

/**
 * @route GET /api/gdpr/privacy-report
 * @desc Get privacy report
 * @access Private
 */
router.get('/privacy-report',
  GDPRController.getPrivacyReport
);

/**
 * @route POST /api/gdpr/portability
 * @desc Request data portability
 * @access Private
 */
router.post('/portability',
  ValidationMiddleware.validateBody(z.object({
    targetFormat: z.enum(['json', 'xml', 'csv']).default('json'),
    includeMetadata: z.boolean().default(true)
  })),
  GDPRController.requestDataPortability
);

export { router as gdprRoutes };