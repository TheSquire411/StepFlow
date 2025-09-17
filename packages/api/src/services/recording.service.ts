import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  Recording, 
  RecordingSession, 
  CreateRecordingInput, 
  UpdateRecordingInput,
  RecordingChunk,
  RecordingSchema,
  RecordingSessionSchema,
  CreateRecordingSchema,
  UpdateRecordingSchema
} from '../models/recording.model.js';
import { ValidationError } from '../utils/validation.js';
import { FileStorageService } from './file-storage.service.js';

export class RecordingService {
  private db: Pool;
  private fileStorage: FileStorageService;
  private activeSessions: Map<string, RecordingSession> = new Map();

  constructor(db: Pool, fileStorage: FileStorageService) {
    this.db = db;
    this.fileStorage = fileStorage;
  }

  /**
   * Start a new recording session
   */
  async startRecordingSession(userId: string, input: CreateRecordingInput): Promise<RecordingSession> {
    // Validate input
    const validatedInput = CreateRecordingSchema.parse(input);

    const sessionId = uuidv4();
    const now = new Date();

    const session: RecordingSession = {
      id: sessionId,
      userId,
      title: validatedInput.title,
      description: validatedInput.description,
      status: 'active',
      startedAt: now,
      lastActivityAt: now,
      metadata: validatedInput.metadata || {}
    };

    // Validate session data
    const validatedSession = RecordingSessionSchema.parse(session);

    // Store session in memory for active management
    this.activeSessions.set(sessionId, validatedSession);

    // Store session in database
    const query = `
      INSERT INTO recording_sessions (
        id, user_id, title, description, status, started_at, last_activity_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      sessionId,
      userId,
      validatedSession.title,
      validatedSession.description,
      validatedSession.status,
      validatedSession.startedAt,
      validatedSession.lastActivityAt,
      JSON.stringify(validatedSession.metadata)
    ];

    try {
      await this.db.query(query, values);
      return validatedSession;
    } catch (error) {
      this.activeSessions.delete(sessionId);
      throw new Error(`Failed to create recording session: ${error.message}`);
    }
  }

  /**
   * Upload a video chunk for an active recording session
   */
  async uploadRecordingChunk(sessionId: string, chunkIndex: number, totalChunks: number, chunkData: Buffer): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Recording session not found or not active');
    }

    if (session.status !== 'active') {
      throw new ValidationError('Recording session is not active');
    }

    // Update last activity
    session.lastActivityAt = new Date();
    this.activeSessions.set(sessionId, session);

    // Store chunk using file storage service
    const chunkKey = `recordings/${sessionId}/chunks/chunk_${chunkIndex.toString().padStart(4, '0')}.webm`;
    
    try {
      await this.fileStorage.uploadFile(chunkKey, chunkData, 'video/webm');
      
      // Update session activity in database
      await this.db.query(
        'UPDATE recording_sessions SET last_activity_at = $1 WHERE id = $2',
        [session.lastActivityAt, sessionId]
      );

      console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} for session ${sessionId}`);
    } catch (error) {
      throw new Error(`Failed to upload recording chunk: ${error.message}`);
    }
  }

  /**
   * Complete a recording session and create a recording record
   */
  async completeRecording(sessionId: string): Promise<Recording> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Recording session not found');
    }

    try {
      // Update session status to stopped
      session.status = 'stopped';
      await this.db.query(
        'UPDATE recording_sessions SET status = $1 WHERE id = $2',
        ['stopped', sessionId]
      );

      // Get all chunks for this session
      const chunks = await this.fileStorage.listFiles(`recordings/${sessionId}/chunks/`);
      
      if (chunks.length === 0) {
        throw new Error('No recording chunks found for session');
      }

      // Merge chunks into final video file
      const finalVideoKey = `recordings/${sessionId}/final_recording.webm`;
      await this.mergeVideoChunks(sessionId, chunks, finalVideoKey);

      // Generate thumbnail
      const thumbnailKey = `recordings/${sessionId}/thumbnail.jpg`;
      await this.generateThumbnail(finalVideoKey, thumbnailKey);

      // Calculate duration and file size
      const fileInfo = await this.fileStorage.getFileInfo(finalVideoKey);
      const duration = await this.getVideoDuration(finalVideoKey);

      // Create recording record
      const recordingId = uuidv4();
      const now = new Date();

      const recording: Recording = {
        id: recordingId,
        userId: session.userId,
        sessionId: sessionId,
        title: session.title,
        description: session.description,
        duration,
        fileUrl: await this.fileStorage.getFileUrl(finalVideoKey),
        thumbnailUrl: await this.fileStorage.getFileUrl(thumbnailKey),
        fileSize: fileInfo.size,
        metadata: session.metadata,
        steps: [], // Will be populated by AI processing
        status: 'processing',
        processingProgress: 0,
        createdAt: now,
        updatedAt: now
      };

      // Validate recording data
      const validatedRecording = RecordingSchema.parse(recording);

      // Store recording in database
      const query = `
        INSERT INTO recordings (
          id, user_id, session_id, title, description, duration, file_url, thumbnail_url,
          file_size, metadata, steps, status, processing_progress, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        recordingId,
        validatedRecording.userId,
        validatedRecording.sessionId,
        validatedRecording.title,
        validatedRecording.description,
        validatedRecording.duration,
        validatedRecording.fileUrl,
        validatedRecording.thumbnailUrl,
        validatedRecording.fileSize,
        JSON.stringify(validatedRecording.metadata),
        JSON.stringify(validatedRecording.steps),
        validatedRecording.status,
        validatedRecording.processingProgress,
        validatedRecording.createdAt,
        validatedRecording.updatedAt
      ];

      await this.db.query(query, values);

      // Clean up session from memory
      this.activeSessions.delete(sessionId);

      // Clean up temporary chunk files
      await this.cleanupChunks(sessionId);

      return validatedRecording;
    } catch (error) {
      // Update session with error status
      await this.db.query(
        'UPDATE recording_sessions SET status = $1 WHERE id = $2',
        ['failed', sessionId]
      );
      
      this.activeSessions.delete(sessionId);
      throw new Error(`Failed to complete recording: ${error.message}`);
    }
  }

  /**
   * Get a recording by ID
   */
  async getRecording(recordingId: string, userId?: string): Promise<Recording | null> {
    let query = 'SELECT * FROM recordings WHERE id = $1';
    const values = [recordingId];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      duration: row.duration,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      fileSize: row.file_size,
      metadata: row.metadata,
      steps: row.steps,
      status: row.status,
      processingProgress: row.processing_progress,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * List recordings for a user
   */
  async listRecordings(userId: string, limit = 50, offset = 0): Promise<Recording[]> {
    const query = `
      SELECT * FROM recordings 
      WHERE user_id = $1 AND status != 'deleted'
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      duration: row.duration,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      fileSize: row.file_size,
      metadata: row.metadata,
      steps: row.steps,
      status: row.status,
      processingProgress: row.processing_progress,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Update a recording
   */
  async updateRecording(recordingId: string, userId: string, updates: UpdateRecordingInput): Promise<Recording | null> {
    const validatedUpdates = UpdateRecordingSchema.parse(updates);
    
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validatedUpdates.title !== undefined) {
      setParts.push(`title = $${paramIndex++}`);
      values.push(validatedUpdates.title);
    }

    if (validatedUpdates.description !== undefined) {
      setParts.push(`description = $${paramIndex++}`);
      values.push(validatedUpdates.description);
    }

    if (validatedUpdates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(validatedUpdates.status);
    }

    if (validatedUpdates.processingProgress !== undefined) {
      setParts.push(`processing_progress = $${paramIndex++}`);
      values.push(validatedUpdates.processingProgress);
    }

    if (validatedUpdates.errorMessage !== undefined) {
      setParts.push(`error_message = $${paramIndex++}`);
      values.push(validatedUpdates.errorMessage);
    }

    if (setParts.length === 0) {
      return this.getRecording(recordingId, userId);
    }

    setParts.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(recordingId, userId);

    const query = `
      UPDATE recordings 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      title: row.title,
      description: row.description,
      duration: row.duration,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      fileSize: row.file_size,
      metadata: row.metadata,
      steps: row.steps,
      status: row.status,
      processingProgress: row.processing_progress,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Delete a recording (soft delete)
   */
  async deleteRecording(recordingId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE recordings 
      SET status = 'deleted', updated_at = $1
      WHERE id = $2 AND user_id = $3
    `;

    const result = await this.db.query(query, [new Date(), recordingId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Get active recording session
   */
  async getRecordingSession(sessionId: string): Promise<RecordingSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      return session;
    }

    // Check database for session
    const query = 'SELECT * FROM recording_sessions WHERE id = $1';
    const result = await this.db.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const dbSession: RecordingSession = {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      metadata: row.metadata
    };

    // Add back to memory if still active
    if (dbSession.status === 'active') {
      this.activeSessions.set(sessionId, dbSession);
    }

    return dbSession;
  }

  /**
   * Capture a step during recording
   */
  async captureStep(sessionId: string, stepData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Recording session not found or not active');
    }

    if (session.status !== 'active') {
      throw new ValidationError('Recording session is not active');
    }

    try {
      // Store step in database
      const query = `
        INSERT INTO recording_steps (
          id, session_id, timestamp, action, element, coordinates, text, url, screenshot_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const stepId = uuidv4();
      const values = [
        stepId,
        sessionId,
        stepData.timestamp,
        stepData.action,
        stepData.element || null,
        stepData.coordinates ? JSON.stringify(stepData.coordinates) : null,
        stepData.text || null,
        stepData.url || null,
        stepData.screenshot || null,
        new Date()
      ];

      await this.db.query(query, values);

      // Update session activity
      session.lastActivityAt = new Date();
      this.activeSessions.set(sessionId, session);

      await this.db.query(
        'UPDATE recording_sessions SET last_activity_at = $1 WHERE id = $2',
        [session.lastActivityAt, sessionId]
      );

      console.log(`Step captured for session ${sessionId}:`, stepData.action);
    } catch (error) {
      throw new Error(`Failed to capture step: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private async mergeVideoChunks(sessionId: string, chunks: string[], outputKey: string): Promise<void> {
    // This would use FFmpeg to merge video chunks
    // For now, we'll simulate this process
    console.log(`Merging ${chunks.length} chunks for session ${sessionId}`);
    
    // In a real implementation, you would:
    // 1. Download all chunks
    // 2. Use FFmpeg to concatenate them
    // 3. Upload the final video
    
    // For now, we'll just copy the first chunk as the final video
    if (chunks.length > 0) {
      const firstChunk = await this.fileStorage.getFile(chunks[0]);
      await this.fileStorage.uploadFile(outputKey, firstChunk, 'video/webm');
    }
  }

  private async generateThumbnail(videoKey: string, thumbnailKey: string): Promise<void> {
    // This would use FFmpeg to generate a thumbnail from the video
    // For now, we'll create a placeholder thumbnail
    console.log(`Generating thumbnail for video ${videoKey}`);
    
    // Create a simple placeholder image buffer (1x1 pixel PNG)
    const placeholderThumbnail = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    await this.fileStorage.uploadFile(thumbnailKey, placeholderThumbnail, 'image/jpeg');
  }

  private async getVideoDuration(videoKey: string): Promise<number> {
    // This would use FFprobe to get video duration
    // For now, we'll return a placeholder duration
    console.log(`Getting duration for video ${videoKey}`);
    return 30; // 30 seconds placeholder
  }

  private async cleanupChunks(sessionId: string): Promise<void> {
    try {
      const chunks = await this.fileStorage.listFiles(`recordings/${sessionId}/chunks/`);
      for (const chunk of chunks) {
        await this.fileStorage.deleteFile(chunk);
      }
      console.log(`Cleaned up ${chunks.length} chunks for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to cleanup chunks for session ${sessionId}:`, error);
    }
  }
}