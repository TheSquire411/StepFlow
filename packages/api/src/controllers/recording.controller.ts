import { Request, Response, NextFunction } from 'express';
import { RecordingService } from '../services/recording.service.js';
import { ValidationError } from '../utils/validation.js';
import { CreateRecordingSchema } from '../models/recording.model.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class RecordingController {
  private recordingService: RecordingService;

  constructor(recordingService: RecordingService) {
    this.recordingService = recordingService;
  }

  /**
   * Start a new recording session
   * POST /api/v1/recordings/sessions
   */
  startSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const session = await this.recordingService.startRecordingSession(req.user.id, req.body);
      
      res.status(201).json({
        data: session,
        message: 'Recording session started successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload a recording chunk
   * POST /api/v1/recordings/sessions/:sessionId/chunks
   */
  uploadChunk = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      const { chunkIndex, totalChunks } = req.body;

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'No file uploaded',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (chunkIndex === undefined || totalChunks === undefined) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'chunkIndex and totalChunks are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await this.recordingService.uploadRecordingChunk(
        sessionId,
        parseInt(chunkIndex),
        parseInt(totalChunks),
        req.file.buffer
      );

      res.status(200).json({
        message: 'Chunk uploaded successfully',
        data: {
          sessionId,
          chunkIndex: parseInt(chunkIndex),
          totalChunks: parseInt(totalChunks)
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete a recording session
   * POST /api/v1/recordings/sessions/:sessionId/complete
   */
  completeSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      const recording = await this.recordingService.completeRecording(sessionId);

      res.status(200).json({
        data: recording,
        message: 'Recording completed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get recording session status
   * GET /api/v1/recordings/sessions/:sessionId
   */
  getSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      const session = await this.recordingService.getRecordingSession(sessionId);

      if (!session) {
        res.status(404).json({
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Recording session not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if user owns this session
      if (session.userId !== req.user.id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this recording session',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        data: session
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a recording by ID
   * GET /api/v1/recordings/:recordingId
   */
  getRecording = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const { recordingId } = req.params;
      const recording = await this.recordingService.getRecording(recordingId, req.user.id);

      if (!recording) {
        res.status(404).json({
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        data: recording
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List user's recordings
   * GET /api/v1/recordings
   */
  listRecordings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (limit > 100) {
        res.status(400).json({
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit cannot exceed 100',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const recordings = await this.recordingService.listRecordings(req.user.id, limit, offset);

      res.status(200).json({
        data: recordings,
        pagination: {
          limit,
          offset,
          count: recordings.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a recording
   * PATCH /api/v1/recordings/:recordingId
   */
  updateRecording = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const { recordingId } = req.params;
      const recording = await this.recordingService.updateRecording(recordingId, req.user.id, req.body);

      if (!recording) {
        res.status(404).json({
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        data: recording,
        message: 'Recording updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a recording
   * DELETE /api/v1/recordings/:recordingId
   */
  deleteRecording = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

      const { recordingId } = req.params;
      const deleted = await this.recordingService.deleteRecording(recordingId, req.user.id);

      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'RECORDING_NOT_FOUND',
            message: 'Recording not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        message: 'Recording deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Capture a step during recording
   * POST /api/v1/recordings/sessions/:sessionId/steps
   */
  captureStep = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      const stepData = req.body;

      // Validate required fields
      if (!stepData.timestamp || !stepData.action) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'timestamp and action are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await this.recordingService.captureStep(sessionId, stepData);

      res.status(200).json({
        message: 'Step captured successfully',
        data: {
          sessionId,
          timestamp: stepData.timestamp,
          action: stepData.action
        }
      });
    } catch (error) {
      next(error);
    }
  };
}