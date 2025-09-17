import { Request } from 'express';
import { logger } from './sentry.service';
import { AuditLoggingService } from './audit-logging.service';
import { EncryptionService } from './encryption.service';
import { User } from '../models/user.model';
import { Guide } from '../models/guide.model';
import { Recording } from '../models/recording.model';

export interface DataExportRequest {
  userId: string;
  requestedBy: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  requestedBy: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  deletionDate?: Date;
  retentionReason?: string;
}

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'functional' | 'necessary';
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  version: string;
}

export class GDPRComplianceService {
  /**
   * Export all user data for GDPR compliance
   */
  static async exportUserData(req: Request, userId: string): Promise<string> {
    try {
      logger.info('Starting user data export', { userId });

      // Log privacy event
      AuditLoggingService.logPrivacyEvent(req, {
        action: 'data_export',
        userId,
        details: { requestedBy: req.user?.id }
      });

      // Collect all user data
      const userData = await this.collectUserData(userId);
      
      // Create export package
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        data: userData,
        metadata: {
          version: '1.0',
          format: 'JSON',
          encryption: 'AES-256-GCM'
        }
      };

      // Encrypt the export data
      const encryptedData = EncryptionService.encrypt(JSON.stringify(exportData));
      
      // Store export file (implement file storage)
      const exportId = EncryptionService.generateSecureUUID();
      const downloadUrl = await this.storeExportFile(exportId, encryptedData);

      logger.info('User data export completed', { userId, exportId });
      
      return downloadUrl;
    } catch (error) {
      logger.error('User data export failed', { error: error.message, userId });
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data for GDPR compliance
   */
  static async deleteUserData(req: Request, userId: string, retentionReason?: string): Promise<void> {
    try {
      logger.info('Starting user data deletion', { userId, retentionReason });

      // Log privacy event
      AuditLoggingService.logPrivacyEvent(req, {
        action: 'data_deletion',
        userId,
        details: { 
          requestedBy: req.user?.id,
          retentionReason 
        }
      });

      // Check for legal retention requirements
      const retentionCheck = await this.checkRetentionRequirements(userId);
      if (retentionCheck.mustRetain && !retentionReason) {
        throw new Error(`Data cannot be deleted: ${retentionCheck.reason}`);
      }

      // Delete user data in order
      await this.deleteUserDataCascade(userId);

      logger.info('User data deletion completed', { userId });
    } catch (error) {
      logger.error('User data deletion failed', { error: error.message, userId });
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Record user consent
   */
  static async recordConsent(req: Request, consent: {
    userId: string;
    consentType: ConsentRecord['consentType'];
    granted: boolean;
    version: string;
  }): Promise<void> {
    try {
      const consentRecord: ConsentRecord = {
        userId: consent.userId,
        consentType: consent.consentType,
        granted: consent.granted,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        version: consent.version
      };

      // Store consent record
      await this.storeConsentRecord(consentRecord);

      // Log privacy event
      AuditLoggingService.logPrivacyEvent(req, {
        action: consent.granted ? 'consent_given' : 'consent_withdrawn',
        userId: consent.userId,
        details: {
          consentType: consent.consentType,
          version: consent.version
        }
      });

      logger.info('Consent recorded', { 
        userId: consent.userId, 
        consentType: consent.consentType, 
        granted: consent.granted 
      });
    } catch (error) {
      logger.error('Failed to record consent', { error: error.message, consent });
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user consent status
   */
  static async getUserConsent(userId: string): Promise<ConsentRecord[]> {
    try {
      // Implementation would query consent database
      // return await db.consentRecords.findMany({ where: { userId } });
      return [];
    } catch (error) {
      logger.error('Failed to get user consent', { error: error.message, userId });
      throw new Error('Failed to retrieve consent records');
    }
  }

  /**
   * Anonymize user data (alternative to deletion)
   */
  static async anonymizeUserData(req: Request, userId: string): Promise<void> {
    try {
      logger.info('Starting user data anonymization', { userId });

      // Generate anonymous ID
      const anonymousId = EncryptionService.generateSecureUUID();

      // Anonymize user record
      await this.anonymizeUserRecord(userId, anonymousId);

      // Anonymize related data
      await this.anonymizeRelatedData(userId, anonymousId);

      // Log privacy event
      AuditLoggingService.logPrivacyEvent(req, {
        action: 'data_anonymization',
        userId,
        details: { 
          anonymousId,
          requestedBy: req.user?.id 
        }
      });

      logger.info('User data anonymization completed', { userId, anonymousId });
    } catch (error) {
      logger.error('User data anonymization failed', { error: error.message, userId });
      throw new Error('Failed to anonymize user data');
    }
  }

  /**
   * Generate privacy report for user
   */
  static async generatePrivacyReport(userId: string): Promise<any> {
    try {
      const report = {
        userId,
        generatedAt: new Date().toISOString(),
        dataCategories: await this.getDataCategories(userId),
        consentStatus: await this.getUserConsent(userId),
        dataRetention: await this.getDataRetentionInfo(userId),
        thirdPartySharing: await this.getThirdPartySharing(userId),
        rights: {
          canExport: true,
          canDelete: await this.canDeleteUserData(userId),
          canAnonymize: true,
          canPortability: true
        }
      };

      return report;
    } catch (error) {
      logger.error('Failed to generate privacy report', { error: error.message, userId });
      throw new Error('Failed to generate privacy report');
    }
  }

  /**
   * Collect all user data for export
   */
  private static async collectUserData(userId: string): Promise<any> {
    try {
      // Collect data from all relevant tables
      const userData = {
        profile: await this.getUserProfile(userId),
        guides: await this.getUserGuides(userId),
        recordings: await this.getUserRecordings(userId),
        sharing: await this.getUserSharing(userId),
        subscriptions: await this.getUserSubscriptions(userId),
        auditLogs: await AuditLoggingService.getUserAuditLogs(userId),
        consent: await this.getUserConsent(userId)
      };

      // Decrypt PII data for export
      if (userData.profile) {
        userData.profile = EncryptionService.decryptPII(userData.profile);
      }

      return userData;
    } catch (error) {
      logger.error('Failed to collect user data', { error: error.message, userId });
      throw new Error('Failed to collect user data');
    }
  }

  /**
   * Delete user data in cascade order
   */
  private static async deleteUserDataCascade(userId: string): Promise<void> {
    try {
      // Delete in reverse dependency order
      await this.deleteUserAuditLogs(userId);
      await this.deleteUserSharing(userId);
      await this.deleteUserGuides(userId);
      await this.deleteUserRecordings(userId);
      await this.deleteUserSubscriptions(userId);
      await this.deleteUserConsent(userId);
      await this.deleteUserProfile(userId);
    } catch (error) {
      logger.error('Failed to delete user data cascade', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Check retention requirements
   */
  private static async checkRetentionRequirements(userId: string): Promise<{
    mustRetain: boolean;
    reason?: string;
  }> {
    try {
      // Check for active subscriptions
      const hasActiveSubscription = await this.hasActiveSubscription(userId);
      if (hasActiveSubscription) {
        return { mustRetain: true, reason: 'Active subscription exists' };
      }

      // Check for legal holds
      const hasLegalHold = await this.hasLegalHold(userId);
      if (hasLegalHold) {
        return { mustRetain: true, reason: 'Legal hold in place' };
      }

      // Check for outstanding payments
      const hasOutstandingPayments = await this.hasOutstandingPayments(userId);
      if (hasOutstandingPayments) {
        return { mustRetain: true, reason: 'Outstanding payments exist' };
      }

      return { mustRetain: false };
    } catch (error) {
      logger.error('Failed to check retention requirements', { error: error.message, userId });
      return { mustRetain: true, reason: 'Unable to verify retention requirements' };
    }
  }

  /**
   * Store export file
   */
  private static async storeExportFile(exportId: string, encryptedData: any): Promise<string> {
    // Implementation would store file in secure storage
    // Return download URL that expires after 30 days
    const downloadUrl = `https://api.stepflow.com/exports/${exportId}`;
    return downloadUrl;
  }

  /**
   * Store consent record
   */
  private static async storeConsentRecord(consent: ConsentRecord): Promise<void> {
    // Implementation would store in consent database
    // await db.consentRecords.create({ data: consent });
  }

  // Placeholder methods for data operations
  private static async getUserProfile(userId: string): Promise<any> {
    // return await User.findById(userId);
    return null;
  }

  private static async getUserGuides(userId: string): Promise<any[]> {
    // return await Guide.findMany({ where: { userId } });
    return [];
  }

  private static async getUserRecordings(userId: string): Promise<any[]> {
    // return await Recording.findMany({ where: { userId } });
    return [];
  }

  private static async getUserSharing(userId: string): Promise<any[]> {
    // return await Sharing.findMany({ where: { userId } });
    return [];
  }

  private static async getUserSubscriptions(userId: string): Promise<any[]> {
    // return await Subscription.findMany({ where: { userId } });
    return [];
  }

  private static async deleteUserAuditLogs(userId: string): Promise<void> {
    await AuditLoggingService.deleteUserAuditLogs(userId);
  }

  private static async deleteUserSharing(userId: string): Promise<void> {
    // await Sharing.deleteMany({ where: { userId } });
  }

  private static async deleteUserGuides(userId: string): Promise<void> {
    // await Guide.deleteMany({ where: { userId } });
  }

  private static async deleteUserRecordings(userId: string): Promise<void> {
    // await Recording.deleteMany({ where: { userId } });
  }

  private static async deleteUserSubscriptions(userId: string): Promise<void> {
    // await Subscription.deleteMany({ where: { userId } });
  }

  private static async deleteUserConsent(userId: string): Promise<void> {
    // await ConsentRecord.deleteMany({ where: { userId } });
  }

  private static async deleteUserProfile(userId: string): Promise<void> {
    // await User.delete({ where: { id: userId } });
  }

  private static async anonymizeUserRecord(userId: string, anonymousId: string): Promise<void> {
    // Implementation would update user record with anonymous data
  }

  private static async anonymizeRelatedData(userId: string, anonymousId: string): Promise<void> {
    // Implementation would anonymize related records
  }

  private static async getDataCategories(userId: string): Promise<string[]> {
    return ['profile', 'guides', 'recordings', 'sharing', 'analytics'];
  }

  private static async getDataRetentionInfo(userId: string): Promise<any> {
    return {
      profileData: '2 years after account deletion',
      analyticsData: '26 months',
      auditLogs: '7 years'
    };
  }

  private static async getThirdPartySharing(userId: string): Promise<any[]> {
    return [
      { service: 'OpenAI', purpose: 'AI content generation', dataTypes: ['guide content'] },
      { service: 'Stripe', purpose: 'Payment processing', dataTypes: ['billing information'] }
    ];
  }

  private static async canDeleteUserData(userId: string): Promise<boolean> {
    const retention = await this.checkRetentionRequirements(userId);
    return !retention.mustRetain;
  }

  private static async hasActiveSubscription(userId: string): Promise<boolean> {
    // Check for active subscriptions
    return false;
  }

  private static async hasLegalHold(userId: string): Promise<boolean> {
    // Check for legal holds
    return false;
  }

  private static async hasOutstandingPayments(userId: string): Promise<boolean> {
    // Check for outstanding payments
    return false;
  }
}