import { Router } from 'express';
import multer from 'multer';
import { RecordingController } from '../controllers/recording.controller.js';
import { RecordingService } from '../services/recording.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per chunk
    fieldSize: 10 * 1024 * 1024,  // 10MB for other fields
  },
  fileFilter: (req, file, cb) => {
    // Accept video files and common recording formats
    const allowedMimeTypes = [
      'video/webm',
      'video/mp4',
      'video/x-msvideo', // .avi
      'video/quicktime',  // .mov
      'application/octet-stream' // For chunks that might not have proper MIME type
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are allowed.`));
    }
  }
});

export function createRecordingRoutes(recordingService: RecordingService): Router {
  const router = Router();
  const controller = new RecordingController(recordingService);

  // All recording routes require authentication
  router.use(authMiddleware);

  // Recording session management
  router.post('/sessions', controller.startSession);
  router.get('/sessions/:sessionId', controller.getSession);
  router.post('/sessions/:sessionId/complete', controller.completeSession);
  router.post('/sessions/:sessionId/steps', controller.captureStep);

  // File upload endpoint with multer middleware
  router.post('/sessions/:sessionId/chunks', 
    upload.single('chunk'), 
    controller.uploadChunk
  );

  // Recording CRUD operations
  router.get('/', controller.listRecordings);
  router.get('/:recordingId', controller.getRecording);
  router.patch('/:recordingId', controller.updateRecording);
  router.delete('/:recordingId', controller.deleteRecording);

  // Error handling for multer
  router.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the maximum limit of 100MB',
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