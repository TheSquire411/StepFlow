import { Request, Response } from 'express';
import { IntegrationService } from '../services/integration.service';
import { AuthService } from '../services/auth.service';
import { RecordingService } from '../services/recording.service';
import { AIContentGenerationService } from '../services/ai-content-generation.service';
import { GuideService } from '../services/guide.service';
import { SharingService } from '../services/sharing.service';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

export class IntegrationController {
  private integrationService: IntegrationService;

  constructor() {
    this.integrationService = new IntegrationService(
      new AuthService(),
      new RecordingService(),
      new AIContentGenerationService(),
      new GuideService(),
      new SharingService(),
      new SubscriptionService()
    );
  }

  testWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, guideTitle } = req.body;
      
      // Create mock recording data for testing
      const mockRecordingFile = Buffer.from('mock-recording-data');
      
      const result = await this.integrationService.testCompleteWorkflow({
        email: email || `test-${Date.now()}@example.com`,
        password: password || 'TestPassword123!',
        recordingFile: mockRecordingFile,
        guideTitle: guideTitle || 'Integration Test Guide'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Integration workflow test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  testConnectivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.integrationService.testServiceConnectivity();
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Service connectivity test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  testConsistency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      const result = await this.integrationService.testDataConsistency(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Data consistency test failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getSystemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const connectivity = await this.integrationService.testServiceConnectivity();
      
      const systemStatus = {
        timestamp: new Date().toISOString(),
        overallHealth: connectivity.overallHealth,
        services: connectivity.services,
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.json({
        success: true,
        data: systemStatus
      });
    } catch (error) {
      logger.error('System status check failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}