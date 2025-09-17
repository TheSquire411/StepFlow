import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AIContentGenerationController } from '../ai-content-generation.controller';
import { AIContentGenerationService } from '../../services/ai-content-generation.service';
import { StepDetectionService } from '../../services/step-detection.service';

// Mock services
const mockAIService = {
  generateGuide: vi.fn(),
  generateStepContent: vi.fn(),
  generateTitle: vi.fn(),
  generateDescription: vi.fn(),
  summarizeWorkflow: vi.fn(),
  assessGuideQuality: vi.fn(),
  improveGuideContent: vi.fn()
} as unknown as AIContentGenerationService;

const mockStepDetectionService = {
  getProcessedSteps: vi.fn()
} as unknown as StepDetectionService;

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
};

describe('AIContentGenerationController', () => {
  let app: express.Application;
  let controller: AIContentGenerationController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    
    controller = new AIContentGenerationController(mockAIService, mockStepDetectionService);
    
    // Set up routes
    app.post('/sessions/:sessionId/generate-guide', controller.generateGuideFromSession);
    app.post('/generate-step-content', controller.generateStepContent);
    app.post('/generate-title', controller.generateTitle);
    app.post('/generate-description', controller.generateDescription);
    app.post('/summarize-workflow', controller.summarizeWorkflow);
    app.post('/assess-quality', controller.assessGuideQuality);
    app.post('/improve-guide', controller.improveGuideContent);
    app.get('/options', controller.getContentOptions);
    app.get('/health', controller.healthCheck);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /sessions/:sessionId/generate-guide', () => {
    it('should generate guide from session successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'click',
          actionDescription: 'Click login button',
          confidence: 0.9,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      const mockGuide = {
        id: 'guide-1',
        title: 'Login Guide',
        description: 'How to login',
        steps: [{
          stepNumber: 1,
          title: 'Click Login',
          description: 'Click the login button',
          detailedInstructions: 'Locate and click the login button',
          originalStep: mockSteps[0]
        }],
        metadata: {
          totalSteps: 1,
          estimatedDuration: '1 minute',
          difficulty: 'beginner' as const,
          tags: ['login'],
          category: 'Authentication'
        },
        generatedAt: new Date(),
        confidence: 0.9
      };

      vi.mocked(mockStepDetectionService.getProcessedSteps).mockResolvedValue(mockSteps);
      vi.mocked(mockAIService.generateGuide).mockResolvedValue(mockGuide);

      const response = await request(app)
        .post('/sessions/session-123/generate-guide')
        .send({
          title: 'Custom Login Guide',
          tone: 'professional',
          targetAudience: 'beginner'
        })
        .expect(200);

      expect(response.body.data).toEqual(mockGuide);
      expect(response.body.message).toBe('Guide generated successfully');
      expect(mockStepDetectionService.getProcessedSteps).toHaveBeenCalledWith('session-123');
      expect(mockAIService.generateGuide).toHaveBeenCalledWith(
        mockSteps,
        expect.objectContaining({
          tone: 'professional',
          targetAudience: 'beginner'
        }),
        'Custom Login Guide',
        undefined
      );
    });

    it('should handle missing session ID', async () => {
      await request(app)
        .post('/sessions//generate-guide')
        .send({})
        .expect(404);
    });

    it('should handle no processed steps', async () => {
      vi.mocked(mockStepDetectionService.getProcessedSteps).mockResolvedValue([]);

      const response = await request(app)
        .post('/sessions/session-123/generate-guide')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('NO_STEPS_FOUND');
    });

    it('should handle service errors', async () => {
      vi.mocked(mockStepDetectionService.getProcessedSteps).mockRejectedValue(new Error('Service error'));

      await request(app)
        .post('/sessions/session-123/generate-guide')
        .send({})
        .expect(500);
    });
  });

  describe('POST /generate-step-content', () => {
    it('should generate step content successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'click',
          actionDescription: 'Click button',
          confidence: 0.9,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      const mockGeneratedSteps = [
        {
          stepNumber: 1,
          title: 'Click Button',
          description: 'Click the button',
          detailedInstructions: 'Locate and click the button',
          originalStep: mockSteps[0]
        }
      ];

      vi.mocked(mockAIService.generateStepContent).mockResolvedValue(mockGeneratedSteps);

      const response = await request(app)
        .post('/generate-step-content')
        .send({
          steps: mockSteps,
          options: {
            tone: 'casual',
            length: 'concise'
          }
        })
        .expect(200);

      expect(response.body.data).toEqual(mockGeneratedSteps);
      expect(response.body.message).toBe('Step content generated successfully');
    });

    it('should validate steps array', async () => {
      const response = await request(app)
        .post('/generate-step-content')
        .send({
          options: { tone: 'professional' }
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STEPS');
    });

    it('should validate options', async () => {
      const response = await request(app)
        .post('/generate-step-content')
        .send({
          steps: [{ id: 'step-1', action: 'click' }]
        })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_OPTIONS');
    });
  });

  describe('POST /generate-title', () => {
    it('should generate title successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          action: 'click',
          actionDescription: 'Click login',
          confidence: 0.9,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      vi.mocked(mockAIService.generateTitle).mockResolvedValue('How to Login');

      const response = await request(app)
        .post('/generate-title')
        .send({
          steps: mockSteps,
          options: { tone: 'professional' }
        })
        .expect(200);

      expect(response.body.data.title).toBe('How to Login');
      expect(response.body.message).toBe('Title generated successfully');
    });

    it('should handle empty steps', async () => {
      const response = await request(app)
        .post('/generate-title')
        .send({
          steps: [],
          options: { tone: 'professional' }
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STEPS');
    });
  });

  describe('POST /generate-description', () => {
    it('should generate description successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          action: 'click',
          actionDescription: 'Click login',
          confidence: 0.9,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      vi.mocked(mockAIService.generateDescription).mockResolvedValue('A guide to login process');

      const response = await request(app)
        .post('/generate-description')
        .send({
          steps: mockSteps,
          options: { tone: 'casual' }
        })
        .expect(200);

      expect(response.body.data.description).toBe('A guide to login process');
      expect(response.body.message).toBe('Description generated successfully');
    });
  });

  describe('POST /summarize-workflow', () => {
    it('should summarize workflow successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          action: 'click',
          actionDescription: 'Click login',
          confidence: 0.9,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      const mockSummary = {
        summary: 'Login workflow',
        keyActions: ['Click login'],
        duration: '1 minute',
        complexity: 2
      };

      vi.mocked(mockAIService.summarizeWorkflow).mockResolvedValue(mockSummary);

      const response = await request(app)
        .post('/summarize-workflow')
        .send({
          steps: mockSteps,
          maxLength: 150
        })
        .expect(200);

      expect(response.body.data).toEqual(mockSummary);
      expect(response.body.message).toBe('Workflow summarized successfully');
    });
  });

  describe('POST /assess-quality', () => {
    it('should assess guide quality successfully', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Test Guide',
        description: 'Test description',
        steps: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: '0 minutes',
          difficulty: 'beginner' as const,
          tags: [],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0.8
      };

      const mockAssessment = {
        overallScore: 8,
        clarity: 8,
        completeness: 7,
        accuracy: 9,
        usability: 8,
        suggestions: ['Add more details'],
        issues: []
      };

      vi.mocked(mockAIService.assessGuideQuality).mockResolvedValue(mockAssessment);

      const response = await request(app)
        .post('/assess-quality')
        .send({ guide: mockGuide })
        .expect(200);

      expect(response.body.data).toEqual(mockAssessment);
      expect(response.body.message).toBe('Guide quality assessed successfully');
    });

    it('should validate guide parameter', async () => {
      const response = await request(app)
        .post('/assess-quality')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_GUIDE');
    });
  });

  describe('POST /improve-guide', () => {
    it('should improve guide content successfully', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Original Title',
        description: 'Original description',
        steps: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: '0 minutes',
          difficulty: 'beginner' as const,
          tags: [],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0.8
      };

      const improvedGuide = {
        ...mockGuide,
        title: 'Improved Title',
        description: 'Improved description'
      };

      vi.mocked(mockAIService.improveGuideContent).mockResolvedValue(improvedGuide);

      const response = await request(app)
        .post('/improve-guide')
        .send({
          guide: mockGuide,
          feedback: 'Make it clearer'
        })
        .expect(200);

      expect(response.body.data.title).toBe('Improved Title');
      expect(response.body.message).toBe('Guide content improved successfully');
    });

    it('should validate guide and feedback parameters', async () => {
      // Missing guide
      let response = await request(app)
        .post('/improve-guide')
        .send({ feedback: 'Make it better' })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_GUIDE');

      // Missing feedback
      response = await request(app)
        .post('/improve-guide')
        .send({ guide: {} })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_FEEDBACK');
    });
  });

  describe('GET /options', () => {
    it('should return content generation options', async () => {
      const response = await request(app)
        .get('/options')
        .expect(200);

      expect(response.body.data).toHaveProperty('tones');
      expect(response.body.data).toHaveProperty('lengths');
      expect(response.body.data).toHaveProperty('targetAudiences');
      expect(response.body.data).toHaveProperty('languages');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.message).toBe('Content generation options retrieved successfully');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status when AI service is working', async () => {
      vi.mocked(mockAIService.generateTitle).mockResolvedValue('Test Title');

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.message).toBe('AI content generation service is operational');
    });

    it('should return unhealthy status when AI service fails', async () => {
      vi.mocked(mockAIService.generateTitle).mockRejectedValue(new Error('AI service down'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.message).toBe('AI content generation service is not available');
    });
  });

  describe('authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      
      const controllerWithoutAuth = new AIContentGenerationController(mockAIService, mockStepDetectionService);
      appWithoutAuth.post('/generate-title', controllerWithoutAuth.generateTitle);

      const response = await request(appWithoutAuth)
        .post('/generate-title')
        .send({ steps: [], options: {} })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(mockAIService.generateTitle).mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/generate-title')
        .send({
          steps: [{ id: 'step-1', action: 'click', actionDescription: 'Click' }],
          options: { tone: 'professional' }
        })
        .expect(500);

      expect(response.body).toBeDefined();
    });

    it('should validate request parameters', async () => {
      // Test various validation scenarios
      const testCases = [
        {
          endpoint: '/generate-step-content',
          body: { options: {} }, // Missing steps
          expectedCode: 'INVALID_STEPS'
        },
        {
          endpoint: '/generate-title',
          body: { steps: [] }, // Empty steps
          expectedCode: 'INVALID_STEPS'
        },
        {
          endpoint: '/assess-quality',
          body: {}, // Missing guide
          expectedCode: 'MISSING_GUIDE'
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post(testCase.endpoint)
          .send(testCase.body)
          .expect(400);

        expect(response.body.error.code).toBe(testCase.expectedCode);
      }
    });
  });
});