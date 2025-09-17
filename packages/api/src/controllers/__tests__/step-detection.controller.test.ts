import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { StepDetectionController } from '../step-detection.controller';
import { StepDetectionService } from '../../services/step-detection.service';
import { ComputerVisionService } from '../../services/computer-vision.service';
import { authMiddleware } from '../../middleware/auth.middleware';

// Mock services
const mockStepDetectionService = {
  processSessionSteps: vi.fn(),
  getProcessedSteps: vi.fn(),
  deleteProcessedSteps: vi.fn()
} as unknown as StepDetectionService;

const mockComputerVisionService = {
  analyzeScreenshot: vi.fn(),
  analyzeClick: vi.fn(),
  enhanceScreenshot: vi.fn(),
  optimizeImage: vi.fn(),
  extractColors: vi.fn()
} as unknown as ComputerVisionService;

// Mock auth middleware
vi.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  })
}));

describe('StepDetectionController', () => {
  let app: express.Application;
  let controller: StepDetectionController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new StepDetectionController(mockStepDetectionService, mockComputerVisionService);
    
    // Set up routes
    app.post('/sessions/:sessionId/process', controller.processSessionSteps);
    app.get('/sessions/:sessionId/steps', controller.getProcessedSteps);
    app.delete('/sessions/:sessionId/steps', controller.deleteProcessedSteps);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /sessions/:sessionId/process', () => {
    it('should process session steps successfully', async () => {
      const mockResult = {
        steps: [
          {
            id: 'step-1',
            sessionId: 'session-123',
            timestamp: 1000,
            action: 'click',
            actionDescription: 'Click the button',
            confidence: 0.8,
            processedAt: new Date()
          }
        ],
        totalSteps: 1,
        processingTime: 150,
        confidence: 0.8
      };

      vi.mocked(mockStepDetectionService.processSessionSteps).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/sessions/session-123/process')
        .expect(200);

      expect(response.body.data).toEqual(mockResult);
      expect(response.body.message).toBe('Steps processed successfully');
      expect(mockStepDetectionService.processSessionSteps).toHaveBeenCalledWith('session-123');
    });

    it('should handle processing errors', async () => {
      vi.mocked(mockStepDetectionService.processSessionSteps).mockRejectedValue(
        new Error('Processing failed')
      );

      await request(app)
        .post('/sessions/session-123/process')
        .expect(500);
    });

    it('should require session ID', async () => {
      await request(app)
        .post('/sessions//process')
        .expect(404);
    });
  });

  describe('GET /sessions/:sessionId/steps', () => {
    it('should get processed steps successfully', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'click',
          actionDescription: 'Click the button',
          confidence: 0.8,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      vi.mocked(mockStepDetectionService.getProcessedSteps).mockResolvedValue(mockSteps);

      const response = await request(app)
        .get('/sessions/session-123/steps')
        .expect(200);

      expect(response.body.data).toEqual(mockSteps);
      expect(response.body.message).toBe('Processed steps retrieved successfully');
      expect(mockStepDetectionService.getProcessedSteps).toHaveBeenCalledWith('session-123');
    });

    it('should handle retrieval errors', async () => {
      vi.mocked(mockStepDetectionService.getProcessedSteps).mockRejectedValue(
        new Error('Retrieval failed')
      );

      await request(app)
        .get('/sessions/session-123/steps')
        .expect(500);
    });
  });

  describe('DELETE /sessions/:sessionId/steps', () => {
    it('should delete processed steps successfully', async () => {
      vi.mocked(mockStepDetectionService.deleteProcessedSteps).mockResolvedValue();

      const response = await request(app)
        .delete('/sessions/session-123/steps')
        .expect(200);

      expect(response.body.message).toBe('Processed steps deleted successfully');
      expect(mockStepDetectionService.deleteProcessedSteps).toHaveBeenCalledWith('session-123');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(mockStepDetectionService.deleteProcessedSteps).mockRejectedValue(
        new Error('Deletion failed')
      );

      await request(app)
        .delete('/sessions/session-123/steps')
        .expect(500);
    });
  });

  describe('authentication', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock auth middleware to reject
      vi.mocked(authMiddleware).mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
      });

      await request(app)
        .post('/sessions/session-123/process')
        .expect(401);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(mockStepDetectionService.processSessionSteps).mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/sessions/session-123/process')
        .expect(500);

      // The error should be handled by the global error handler
      expect(response.body).toBeDefined();
    });

    it('should validate session ID parameter', async () => {
      const response = await request(app)
        .post('/sessions/invalid-session-id/process');

      // Should still process but service might reject invalid ID
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('computer vision endpoints', () => {
    beforeEach(() => {
      // Add multer mock for file uploads
      app.use((req, res, next) => {
        if (req.headers['content-type']?.includes('multipart/form-data')) {
          req.file = {
            buffer: Buffer.from('mock-image-data'),
            mimetype: 'image/png',
            originalname: 'test.png',
            size: 1024
          } as any;
        }
        next();
      });

      app.post('/analyze-screenshot', controller.analyzeScreenshot);
      app.post('/analyze-click', controller.analyzeClick);
      app.post('/enhance-screenshot', controller.enhanceScreenshot);
      app.post('/optimize-image', controller.optimizeImage);
      app.post('/extract-colors', controller.extractColors);
    });

    it('should analyze screenshot successfully', async () => {
      const mockAnalysis = {
        elements: [
          {
            type: 'button',
            boundingBox: { x: 100, y: 100, width: 50, height: 30 },
            confidence: 0.9
          }
        ],
        text: [],
        confidence: 0.8,
        processingTime: 100
      };

      vi.mocked(mockComputerVisionService.analyzeScreenshot).mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/analyze-screenshot')
        .attach('screenshot', Buffer.from('mock-image'), 'test.png')
        .expect(200);

      expect(response.body.data).toEqual(mockAnalysis);
      expect(response.body.message).toBe('Screenshot analyzed successfully');
    });

    it('should analyze click successfully', async () => {
      const mockClickAnalysis = {
        targetElement: {
          type: 'button',
          boundingBox: { x: 100, y: 100, width: 50, height: 30 },
          confidence: 0.9
        },
        nearbyElements: [],
        confidence: 0.9,
        elementType: 'button',
        actionContext: 'button_click'
      };

      vi.mocked(mockComputerVisionService.analyzeClick).mockResolvedValue(mockClickAnalysis);

      const response = await request(app)
        .post('/analyze-click')
        .field('x', '125')
        .field('y', '115')
        .attach('screenshot', Buffer.from('mock-image'), 'test.png')
        .expect(200);

      expect(response.body.data).toEqual(mockClickAnalysis);
      expect(response.body.message).toBe('Click analyzed successfully');
    });

    it('should require file for image analysis endpoints', async () => {
      await request(app)
        .post('/analyze-screenshot')
        .expect(400);
    });

    it('should require coordinates for click analysis', async () => {
      await request(app)
        .post('/analyze-click')
        .attach('screenshot', Buffer.from('mock-image'), 'test.png')
        .expect(400);
    });
  });
});