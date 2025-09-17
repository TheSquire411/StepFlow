import { Request, Response, NextFunction } from 'express';
import { StepDetectionService } from '../services/step-detection.service.js';
import { ComputerVisionService } from '../services/computer-vision.service.js';
import { ValidationError } from '../utils/validation.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class StepDetectionController {
  private stepDetectionService: StepDetectionService;
  private computerVisionService: ComputerVisionService;

  constructor(stepDetectionService: StepDetectionService, computerVisionService: ComputerVisionService) {
    this.stepDetectionService = stepDetectionService;
    this.computerVisionService = computerVisionService;
  }

  /**
   * Process steps for a recording session
   * POST /api/v1/step-detection/sessions/:sessionId/process
   */
  processSessionSteps = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const result = await this.stepDetectionService.processSessionSteps(sessionId);

      res.status(200).json({
        data: result,
        message: 'Steps processed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get processed steps for a session
   * GET /api/v1/step-detection/sessions/:sessionId/steps
   */
  getProcessedSteps = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const steps = await this.stepDetectionService.getProcessedSteps(sessionId);

      res.status(200).json({
        data: steps,
        message: 'Processed steps retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Analyze screenshot for UI elements
   * POST /api/v1/step-detection/analyze-screenshot
   */
  analyzeScreenshot = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Screenshot file is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const analysis = await this.computerVisionService.analyzeScreenshot(req.file.buffer);

      res.status(200).json({
        data: analysis,
        message: 'Screenshot analyzed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Analyze click coordinates on screenshot
   * POST /api/v1/step-detection/analyze-click
   */
  analyzeClick = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Screenshot file is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { x, y } = req.body;

      if (x === undefined || y === undefined) {
        res.status(400).json({
          error: {
            code: 'MISSING_COORDINATES',
            message: 'Click coordinates (x, y) are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const coordinates = { x: parseInt(x), y: parseInt(y) };
      const analysis = await this.computerVisionService.analyzeClick(req.file.buffer, coordinates);

      res.status(200).json({
        data: analysis,
        message: 'Click analyzed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Enhance screenshot with annotations
   * POST /api/v1/step-detection/enhance-screenshot
   */
  enhanceScreenshot = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Screenshot file is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { annotations } = req.body;

      if (!annotations || !Array.isArray(annotations)) {
        res.status(400).json({
          error: {
            code: 'INVALID_ANNOTATIONS',
            message: 'Annotations array is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const enhancedImage = await this.computerVisionService.enhanceScreenshot(req.file.buffer, annotations);

      // Set appropriate headers for image response
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': enhancedImage.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(enhancedImage);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optimize image for web delivery
   * POST /api/v1/step-detection/optimize-image
   */
  optimizeImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Image file is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { width, height, quality, format } = req.body;

      const options = {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        quality: quality ? parseInt(quality) : undefined,
        format: format as 'jpeg' | 'png' | 'webp' | undefined
      };

      const optimizedImage = await this.computerVisionService.optimizeImage(req.file.buffer, options);

      // Determine content type based on format
      let contentType = 'image/jpeg';
      if (options.format === 'png') contentType = 'image/png';
      if (options.format === 'webp') contentType = 'image/webp';

      res.set({
        'Content-Type': contentType,
        'Content-Length': optimizedImage.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(optimizedImage);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Extract colors from image
   * POST /api/v1/step-detection/extract-colors
   */
  extractColors = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'Image file is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { count } = req.body;
      const colorCount = count ? parseInt(count) : 5;

      const colors = await this.computerVisionService.extractColors(req.file.buffer, colorCount);

      res.status(200).json({
        data: { colors },
        message: 'Colors extracted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete processed steps for a session
   * DELETE /api/v1/step-detection/sessions/:sessionId/steps
   */
  deleteProcessedSteps = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      await this.stepDetectionService.deleteProcessedSteps(sessionId);

      res.status(200).json({
        message: 'Processed steps deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}