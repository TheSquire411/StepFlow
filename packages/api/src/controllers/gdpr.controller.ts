import { Request, Response } from 'express';
import { GDPRComplianceService } from '../services/gdpr-compliance.service';
import { AuditLoggingService } from '../services/audit-logging.service';
import { logger } from '../services/sentry.service';

export class GDPRController {
  /**
   * Record user consent
   */
  static async recordConsent(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { consentType, granted, version } = req.body;

      await GDPRComplianceService.recordConsent(req, {
        userId,
        consentType,
        granted,
        version
      });

      res.status(200).json({
        success: true,
        message: 'Consent recorded successfully',
        data: {
          consentType,
          granted,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to record consent', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'CONSENT_RECORDING_FAILED',
          message: 'Failed to record consent',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Get user consent status
   */
  static async getConsent(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const consent = await GDPRComplianceService.getUserConsent(userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          consent,
          retrievedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get consent', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'CONSENT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve consent information',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Request data export
   */
  static async requestDataExport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { format, includeAuditLogs } = req.body;

      const downloadUrl = await GDPRComplianceService.exportUserData(req, userId);

      res.status(200).json({
        success: true,
        message: 'Data export initiated successfully',
        data: {
          downloadUrl,
          format,
          includeAuditLogs,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          requestedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to request data export', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'DATA_EXPORT_FAILED',
          message: 'Failed to initiate data export',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Download data export
   */
  static async downloadDataExport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { exportId } = req.params;

      // Verify export belongs to user and is still valid
      // Implementation would check export database
      
      // Log download attempt
      AuditLoggingService.logPrivacyEvent(req, {
        action: 'data_export',
        userId,
        details: { exportId, action: 'download' }
      });

      // In a real implementation, this would stream the file
      res.status(200).json({
        success: true,
        message: 'Export download initiated',
        data: {
          exportId,
          downloadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to download data export', { 
        error: error.message, 
        userId: req.user?.id,
        exportId: req.params.exportId
      });

      res.status(500).json({
        error: {
          code: 'EXPORT_DOWNLOAD_FAILED',
          message: 'Failed to download data export',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Request data deletion
   */
  static async requestDataDeletion(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { confirmDeletion, retentionReason } = req.body;

      if (!confirmDeletion) {
        return res.status(400).json({
          error: {
            code: 'DELETION_NOT_CONFIRMED',
            message: 'Data deletion must be explicitly confirmed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      await GDPRComplianceService.deleteUserData(req, userId, retentionReason);

      res.status(200).json({
        success: true,
        message: 'Data deletion completed successfully',
        data: {
          userId,
          deletedAt: new Date().toISOString(),
          retentionReason
        }
      });
    } catch (error) {
      logger.error('Failed to delete user data', { 
        error: error.message, 
        userId: req.user?.id 
      });

      // Check if error is due to retention requirements
      if (error.message.includes('cannot be deleted')) {
        return res.status(409).json({
          error: {
            code: 'DELETION_BLOCKED',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'DATA_DELETION_FAILED',
          message: 'Failed to delete user data',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Request data anonymization
   */
  static async requestDataAnonymization(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { confirmAnonymization } = req.body;

      if (!confirmAnonymization) {
        return res.status(400).json({
          error: {
            code: 'ANONYMIZATION_NOT_CONFIRMED',
            message: 'Data anonymization must be explicitly confirmed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      await GDPRComplianceService.anonymizeUserData(req, userId);

      res.status(200).json({
        success: true,
        message: 'Data anonymization completed successfully',
        data: {
          userId,
          anonymizedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to anonymize user data', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'DATA_ANONYMIZATION_FAILED',
          message: 'Failed to anonymize user data',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Get privacy report
   */
  static async getPrivacyReport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const report = await GDPRComplianceService.generatePrivacyReport(userId);

      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate privacy report', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'PRIVACY_REPORT_FAILED',
          message: 'Failed to generate privacy report',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }

  /**
   * Request data portability
   */
  static async requestDataPortability(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { targetFormat, includeMetadata } = req.body;

      // Log portability request
      AuditLoggingService.logPrivacyEvent(req, {
        action: 'data_portability',
        userId,
        details: { targetFormat, includeMetadata }
      });

      // Generate portable data format
      const downloadUrl = await GDPRComplianceService.exportUserData(req, userId);

      res.status(200).json({
        success: true,
        message: 'Data portability export initiated',
        data: {
          downloadUrl,
          format: targetFormat,
          includeMetadata,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          requestedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to request data portability', { 
        error: error.message, 
        userId: req.user?.id 
      });

      res.status(500).json({
        error: {
          code: 'DATA_PORTABILITY_FAILED',
          message: 'Failed to initiate data portability export',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  }
}