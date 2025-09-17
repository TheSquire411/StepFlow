import { Router } from 'express';
import multer from 'multer';
import { StepDetectionController } from '../controllers/step-detection.controller.js';
import { StepDetectionService } from '../services/step-detection.service.js';
import { ComputerVisionService } from '../services/computer-vision.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    fieldSize: 10 * 1024 * 1024,  // 10MB for other fields
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only image files are allowed.`));
    }
  }
});

export function createStepDetectionRoutes(
  stepDetectionService: StepDetectionService,
  computerVisionService: ComputerVisionService
): Router {
  const router = Router();
  const controller = new StepDetectionController(stepDetectionService, computerVisionService);

  // All step detection routes require authentication
  router.use(authMiddleware);

  // Step processing endpoints
  router.post('/sessions/:sessionId/process', controller.processSessionSteps);
  router.get('/sessions/:sessionId/steps', controller.getProcessedSteps);
  router.delete('/sessions/:sessionId/steps', controller.deleteProcessedSteps);

  // Computer vision endpoints with file upload
  router.post('/analyze-screenshot', 
    upload.single('screenshot'), 
    controller.analyzeScreenshot
  );

  router.post('/analyze-click', 
    upload.single('screenshot'), 
    controller.analyzeClick
  );

  router.post('/enhance-screenshot', 
    upload.single('screenshot'), 
    controller.enhanceScreenshot
  );

  router.post('/optimize-image', 
    upload.single('image'), 
    controller.optimizeImage
  );

  router.post('/extract-colors', 
    upload.single('image'), 
    controller.extractColors
  );

  // Error handling for multer
  router.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the maximum limit of 50MB',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FILE_TYPE',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    next(error);
  });

  return router;
}