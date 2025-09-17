import { AuthService } from './auth.service';
import { RecordingService } from './recording.service';
import { AIContentGenerationService } from './ai-content-generation.service';
import { GuideService } from './guide.service';
import { SharingService } from './sharing.service';
import { SubscriptionService } from './subscription.service';
import { logger } from '../utils/logger';

export class IntegrationService {
  constructor(
    private authService: AuthService,
    private recordingService: RecordingService,
    private aiService: AIContentGenerationService,
    private guideService: GuideService,
    private sharingService: SharingService,
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * Complete end-to-end workflow test
   * Tests the full user journey from registration to guide sharing
   */
  async testCompleteWorkflow(testData: {
    email: string;
    password: string;
    recordingFile: Buffer;
    guideTitle: string;
  }): Promise<{
    success: boolean;
    steps: Array<{ step: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ step: string; success: boolean; error?: string }> = [];
    
    try {
      // Step 1: User Registration
      logger.info('Testing user registration workflow');
      const registerResult = await this.authService.register(
        testData.email,
        testData.password,
        'Test',
        'User'
      );
      results.push({ step: 'User Registration', success: !!registerResult.user });

      // Step 2: User Login
      logger.info('Testing user login workflow');
      const loginResult = await this.authService.login(testData.email, testData.password);
      results.push({ step: 'User Login', success: !!loginResult.token });

      const userId = loginResult.user.id;

      // Step 3: Recording Upload
      logger.info('Testing recording upload workflow');
      const recording = await this.recordingService.createRecording({
        userId,
        title: 'Test Recording',
        description: 'Integration test recording',
        duration: 60,
        fileData: testData.recordingFile
      });
      results.push({ step: 'Recording Upload', success: !!recording.id });

      // Step 4: AI Content Generation
      logger.info('Testing AI content generation workflow');
      const generatedContent = await this.aiService.generateGuideContent(recording.id);
      results.push({ step: 'AI Content Generation', success: !!generatedContent.steps.length });

      // Step 5: Guide Creation
      logger.info('Testing guide creation workflow');
      const guide = await this.guideService.createGuide({
        userId,
        recordingId: recording.id,
        title: testData.guideTitle,
        description: 'Integration test guide',
        steps: generatedContent.steps
      });
      results.push({ step: 'Guide Creation', success: !!guide.id });

      // Step 6: Guide Sharing
      logger.info('Testing guide sharing workflow');
      const sharingSettings = await this.sharingService.createSharingSettings(guide.id, {
        isPublic: true,
        allowedDomains: ['*']
      });
      results.push({ step: 'Guide Sharing', success: !!sharingSettings.shareUrl });

      // Step 7: Subscription Check
      logger.info('Testing subscription workflow');
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      results.push({ step: 'Subscription Check', success: !!subscription });

      return {
        success: results.every(r => r.success),
        steps: results
      };

    } catch (error) {
      logger.error('Integration workflow test failed:', error);
      results.push({ 
        step: 'Workflow Error', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        steps: results
      };
    }
  }

  /**
   * Test service health and connectivity
   */
  async testServiceConnectivity(): Promise<{
    services: Array<{ name: string; healthy: boolean; latency?: number }>;
    overallHealth: boolean;
  }> {
    const services = [];
    
    try {
      // Test Auth Service
      const authStart = Date.now();
      await this.authService.validateToken('test-token').catch(() => {});
      services.push({
        name: 'Auth Service',
        healthy: true,
        latency: Date.now() - authStart
      });
    } catch {
      services.push({ name: 'Auth Service', healthy: false });
    }

    try {
      // Test Recording Service
      const recordingStart = Date.now();
      await this.recordingService.getRecording('test-id').catch(() => {});
      services.push({
        name: 'Recording Service',
        healthy: true,
        latency: Date.now() - recordingStart
      });
    } catch {
      services.push({ name: 'Recording Service', healthy: false });
    }

    try {
      // Test AI Service
      const aiStart = Date.now();
      await this.aiService.checkServiceHealth();
      services.push({
        name: 'AI Service',
        healthy: true,
        latency: Date.now() - aiStart
      });
    } catch {
      services.push({ name: 'AI Service', healthy: false });
    }

    return {
      services,
      overallHealth: services.every(s => s.healthy)
    };
  }

  /**
   * Test cross-service data consistency
   */
  async testDataConsistency(userId: string): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check user data consistency across services
      const user = await this.authService.getUserById(userId);
      const userRecordings = await this.recordingService.getUserRecordings(userId);
      const userGuides = await this.guideService.getUserGuides(userId);
      const userSubscription = await this.subscriptionService.getUserSubscription(userId);

      // Verify recording-guide relationships
      for (const guide of userGuides) {
        const recording = userRecordings.find(r => r.id === guide.recordingId);
        if (!recording) {
          issues.push(`Guide ${guide.id} references non-existent recording ${guide.recordingId}`);
        }
      }

      // Verify subscription limits
      if (userSubscription) {
        const planLimits = await this.subscriptionService.getPlanLimits(userSubscription.planType);
        if (userGuides.length > planLimits.maxGuides) {
          issues.push(`User has ${userGuides.length} guides but plan allows ${planLimits.maxGuides}`);
        }
      }

      return {
        consistent: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Data consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        consistent: false,
        issues
      };
    }
  }
}