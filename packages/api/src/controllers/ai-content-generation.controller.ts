import { Request, Response, NextFunction } from 'express';
import { AIContentGenerationService, ContentGenerationOptions } from '../services/ai-content-generation.service.js';
import { StepDetectionService } from '../services/step-detection.service.js';
import { ValidationError } from '../utils/validation.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class AIContentGenerationController {
  private aiService: AIContentGenerationService;
  private stepDetectionService: StepDetectionService;

  constructor(aiService: AIContentGenerationService, stepDetectionService: StepDetectionService) {
    this.aiService = aiService;
    this.stepDetectionService = stepDetectionService;
  }

  /**
   * Generate a complete guide from a recording session
   * POST /api/v1/ai-content/sessions/:sessionId/generate-guide
   */
  generateGuideFromSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { sessionId } = req.params;
      const { 
        title, 
        description, 
        tone = 'professional',
        length = 'detailed',
        includeScreenshots = true,
        includeTips = true,
        includeWarnings = true,
        includeTroubleshooting = true,
        targetAudience = 'general',
        language = 'en',
        customInstructions
      } = req.body;

      if (!sessionId) {
        res.status(400).json({
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'Session ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get processed steps for the session
      const steps = await this.stepDetectionService.getProcessedSteps(sessionId);

      if (steps.length === 0) {
        res.status(400).json({
          error: {
            code: 'NO_STEPS_FOUND',
            message: 'No processed steps found for this session. Please process the session first.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const options: ContentGenerationOptions = {
        tone,
        length,
        includeScreenshots,
        includeTips,
        includeWarnings,
        includeTroubleshooting,
        targetAudience,
        language,
        customInstructions
      };

      const guide = await this.aiService.generateGuide(steps, options, title, description);

      res.status(200).json({
        data: guide,
        message: 'Guide generated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate content for specific steps
   * POST /api/v1/ai-content/generate-step-content
   */
  generateStepContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { steps, options } = req.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_STEPS',
            message: 'Steps array is required and must not be empty',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!options) {
        res.status(400).json({
          error: {
            code: 'MISSING_OPTIONS',
            message: 'Content generation options are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const generatedSteps = await this.aiService.generateStepContent(steps, options);

      res.status(200).json({
        data: generatedSteps,
        message: 'Step content generated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate a title for a workflow
   * POST /api/v1/ai-content/generate-title
   */
  generateTitle = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { steps, options } = req.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_STEPS',
            message: 'Steps array is required and must not be empty',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const title = await this.aiService.generateTitle(steps, options || {});

      res.status(200).json({
        data: { title },
        message: 'Title generated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate a description for a workflow
   * POST /api/v1/ai-content/generate-description
   */
  generateDescription = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { steps, options } = req.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_STEPS',
            message: 'Steps array is required and must not be empty',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const description = await this.aiService.generateDescription(steps, options || {});

      res.status(200).json({
        data: { description },
        message: 'Description generated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Summarize a workflow
   * POST /api/v1/ai-content/summarize-workflow
   */
  summarizeWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { steps, maxLength = 200 } = req.body;

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_STEPS',
            message: 'Steps array is required and must not be empty',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const summary = await this.aiService.summarizeWorkflow(steps, maxLength);

      res.status(200).json({
        data: summary,
        message: 'Workflow summarized successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Assess guide quality
   * POST /api/v1/ai-content/assess-quality
   */
  assessGuideQuality = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { guide } = req.body;

      if (!guide) {
        res.status(400).json({
          error: {
            code: 'MISSING_GUIDE',
            message: 'Guide object is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const assessment = await this.aiService.assessGuideQuality(guide);

      res.status(200).json({
        data: assessment,
        message: 'Guide quality assessed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Improve guide content based on feedback
   * POST /api/v1/ai-content/improve-guide
   */
  improveGuideContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { guide, feedback } = req.body;

      if (!guide) {
        res.status(400).json({
          error: {
            code: 'MISSING_GUIDE',
            message: 'Guide object is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!feedback || typeof feedback !== 'string') {
        res.status(400).json({
          error: {
            code: 'MISSING_FEEDBACK',
            message: 'Feedback string is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const improvedGuide = await this.aiService.improveGuideContent(guide, feedback);

      res.status(200).json({
        data: improvedGuide,
        message: 'Guide content improved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get content generation options
   * GET /api/v1/ai-content/options
   */
  getContentOptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const options = {
        tones: ['professional', 'casual', 'technical', 'beginner-friendly'],
        lengths: ['concise', 'detailed', 'comprehensive'],
        targetAudiences: ['beginner', 'intermediate', 'advanced', 'general'],
        languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
        features: {
          includeScreenshots: 'Include screenshot references in instructions',
          includeTips: 'Add helpful tips for each step',
          includeWarnings: 'Include warnings for potential issues',
          includeTroubleshooting: 'Add troubleshooting information'
        }
      };

      res.status(200).json({
        data: options,
        message: 'Content generation options retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Health check for AI service
   * GET /api/v1/ai-content/health
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Test AI service connectivity
      const testSteps = [{
        id: 'test',
        sessionId: 'test',
        timestamp: Date.now(),
        action: 'click' as const,
        actionDescription: 'Click test button',
        confidence: 1,
        processedAt: new Date(),
        createdAt: new Date()
      }];

      const testOptions: ContentGenerationOptions = {
        tone: 'professional',
        length: 'concise',
        includeScreenshots: false,
        includeTips: false,
        includeWarnings: false,
        includeTroubleshooting: false,
        targetAudience: 'general',
        language: 'en'
      };

      // Try to generate a simple title as a health check
      await this.aiService.generateTitle(testSteps, testOptions);

      res.status(200).json({
        status: 'healthy',
        message: 'AI content generation service is operational',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'AI content generation service is not available',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  };
}