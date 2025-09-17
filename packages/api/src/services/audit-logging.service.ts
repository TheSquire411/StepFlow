import { Request } from 'express';
import { logger } from './sentry.service';
import { EncryptionService } from './encryption.service';

export interface AuditEvent {
  eventType: AuditEventType;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export enum AuditEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  SYSTEM_ACCESS = 'system_access',
  SECURITY_EVENT = 'security_event',
  PRIVACY_EVENT = 'privacy_event',
  ADMIN_ACTION = 'admin_action',
  API_ACCESS = 'api_access'
}

export class AuditLoggingService {
  /**
   * Log authentication events
   */
  static logAuthEvent(req: Request, event: {
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'token_refresh';
    userId?: string;
    email?: string;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.AUTHENTICATION,
      userId: event.userId,
      action: event.action,
      details: {
        email: event.email ? EncryptionService.maskSensitiveData(event.email) : undefined,
        ...event.details
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: event.success,
      errorMessage: event.errorMessage,
      riskLevel: event.success ? 'low' : 'medium'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log data access events
   */
  static logDataAccess(req: Request, event: {
    action: 'read' | 'list' | 'search';
    userId: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.DATA_ACCESS,
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      details: event.details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: true,
      riskLevel: 'low'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log data modification events
   */
  static logDataModification(req: Request, event: {
    action: 'create' | 'update' | 'patch';
    userId: string;
    resourceType: string;
    resourceId: string;
    changes?: Record<string, any>;
    success: boolean;
    errorMessage?: string;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.DATA_MODIFICATION,
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      details: {
        changes: event.changes ? EncryptionService.maskSensitiveData(event.changes) : undefined
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: event.success,
      errorMessage: event.errorMessage,
      riskLevel: 'medium'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log data deletion events
   */
  static logDataDeletion(req: Request, event: {
    userId: string;
    resourceType: string;
    resourceId: string;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.DATA_DELETION,
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: 'delete',
      details: event.details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: event.success,
      errorMessage: event.errorMessage,
      riskLevel: 'high'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log security events
   */
  static logSecurityEvent(req: Request, event: {
    action: 'rate_limit_exceeded' | 'suspicious_activity' | 'unauthorized_access' | 'permission_denied' | 'ip_banned';
    userId?: string;
    details?: Record<string, any>;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.SECURITY_EVENT,
      userId: event.userId,
      action: event.action,
      details: event.details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: false,
      riskLevel: event.riskLevel || 'high'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log privacy events (GDPR compliance)
   */
  static logPrivacyEvent(req: Request, event: {
    action: 'data_export' | 'data_deletion' | 'consent_given' | 'consent_withdrawn' | 'data_portability';
    userId: string;
    details?: Record<string, any>;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.PRIVACY_EVENT,
      userId: event.userId,
      action: event.action,
      details: event.details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: true,
      riskLevel: 'medium'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log admin actions
   */
  static logAdminAction(req: Request, event: {
    action: string;
    adminUserId: string;
    targetUserId?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    success: boolean;
    errorMessage?: string;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.ADMIN_ACTION,
      userId: event.adminUserId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      details: {
        targetUserId: event.targetUserId,
        ...event.details
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: event.success,
      errorMessage: event.errorMessage,
      riskLevel: 'high'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Log API access events
   */
  static logAPIAccess(req: Request, event: {
    userId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    success: boolean;
  }) {
    const auditEvent: AuditEvent = {
      eventType: AuditEventType.API_ACCESS,
      userId: event.userId,
      action: `${event.method} ${event.endpoint}`,
      details: {
        statusCode: event.statusCode,
        responseTime: event.responseTime
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      sessionId: req.sessionID,
      success: event.success,
      riskLevel: 'low'
    };

    this.writeAuditLog(auditEvent);
  }

  /**
   * Write audit log entry
   */
  private static writeAuditLog(event: AuditEvent) {
    // Log to structured logging system
    logger.info('Audit Event', {
      audit: true,
      eventType: event.eventType,
      userId: event.userId,
      resourceId: event.resourceId,
      resourceType: event.resourceType,
      action: event.action,
      details: event.details,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: event.timestamp.toISOString(),
      sessionId: event.sessionId,
      success: event.success,
      errorMessage: event.errorMessage,
      riskLevel: event.riskLevel
    });

    // For critical events, also log to separate security log
    if (event.riskLevel === 'critical') {
      logger.error('Critical Security Event', {
        audit: true,
        critical: true,
        ...event
      });
    }

    // Store in database for compliance (implement based on requirements)
    this.storeAuditEvent(event).catch(error => {
      logger.error('Failed to store audit event', { error: error.message, event });
    });
  }

  /**
   * Store audit event in database
   */
  private static async storeAuditEvent(event: AuditEvent): Promise<void> {
    // This would typically store in a dedicated audit table
    // Implementation depends on your database setup
    try {
      // Example implementation - replace with actual database call
      // await db.auditLogs.create(event);
      
      // For now, we'll just ensure the event is properly logged
      // In production, you'd want to store this in a tamper-proof audit database
    } catch (error) {
      logger.error('Audit storage failed', { error: error.message });
    }
  }

  /**
   * Create audit middleware for automatic API logging
   */
  static createAuditMiddleware() {
    return (req: Request, res: any, next: Function) => {
      const startTime = Date.now();
      
      // Capture original end function
      const originalEnd = res.end;
      
      res.end = function(chunk: any, encoding: any) {
        const responseTime = Date.now() - startTime;
        
        // Log API access
        AuditLoggingService.logAPIAccess(req, {
          userId: req.user?.id,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode < 400
        });
        
        // Call original end function
        originalEnd.call(this, chunk, encoding);
      };
      
      next();
    };
  }

  /**
   * Get audit logs for a user (for GDPR compliance)
   */
  static async getUserAuditLogs(userId: string): Promise<AuditEvent[]> {
    // Implementation would query audit database
    // This is a placeholder for the actual implementation
    try {
      // return await db.auditLogs.findMany({ where: { userId } });
      return [];
    } catch (error) {
      logger.error('Failed to retrieve user audit logs', { error: error.message, userId });
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Delete user audit logs (for GDPR compliance)
   */
  static async deleteUserAuditLogs(userId: string): Promise<void> {
    try {
      // await db.auditLogs.deleteMany({ where: { userId } });
      logger.info('User audit logs deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user audit logs', { error: error.message, userId });
      throw new Error('Failed to delete audit logs');
    }
  }
}