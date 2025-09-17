import { apiClient } from './api.service';

export interface RecordingSession {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'stopped';
  startedAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, any>;
}

export interface Recording {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  description?: string;
  duration: number;
  fileUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  metadata: Record<string, any>;
  steps: any[];
  status: 'processing' | 'completed' | 'failed' | 'deleted';
  processingProgress: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecordingInput {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateRecordingInput {
  title?: string;
  description?: string;
  status?: 'processing' | 'completed' | 'failed' | 'deleted';
  processingProgress?: number;
  errorMessage?: string;
}

export interface ScreenRecordingOptions {
  video: {
    mediaSource: 'screen' | 'window' | 'tab';
    width?: number;
    height?: number;
    frameRate?: number;
  };
  audio: boolean;
}

class RecordingService {
  private currentSession: RecordingSession | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingStream: MediaStream | null = null;
  private recordingChunks: Blob[] = [];
  private chunkUploadQueue: Array<{ chunk: Blob; index: number }> = [];

  /**
   * Check if browser supports screen recording
   */
  isScreenRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }

  /**
   * Check if extension is available
   */
  async isExtensionAvailable(): Promise<boolean> {
    try {
      // Try to communicate with extension
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage('stepflow-extension-id', { type: 'PING' }, (response) => {
            resolve(!!response);
          });
        });
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Start screen recording session
   */
  async startRecording(options: CreateRecordingInput): Promise<RecordingSession> {
    if (this.currentSession?.status === 'active') {
      throw new Error('Recording session already active');
    }

    try {
      // Create recording session on server
      const response = await apiClient.post<{ data: RecordingSession }>('/recordings/sessions', options);
      this.currentSession = response.data.data;

      // Start screen capture
      await this.startScreenCapture();

      // Notify extension if available
      const hasExtension = await this.isExtensionAvailable();
      if (hasExtension) {
        this.notifyExtension('START_RECORDING', { sessionId: this.currentSession.id });
      }

      return this.currentSession;
    } catch (error) {
      this.currentSession = null;
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording session
   */
  async stopRecording(): Promise<Recording> {
    if (!this.currentSession) {
      throw new Error('No active recording session');
    }

    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop media stream
      if (this.recordingStream) {
        this.recordingStream.getTracks().forEach(track => track.stop());
        this.recordingStream = null;
      }

      // Upload any remaining chunks
      await this.uploadRemainingChunks();

      // Complete session on server
      const response = await apiClient.post<{ data: Recording }>(`/recordings/sessions/${this.currentSession.id}/complete`);
      const recording = response.data.data;

      // Notify extension
      const hasExtension = await this.isExtensionAvailable();
      if (hasExtension) {
        this.notifyExtension('STOP_RECORDING');
      }

      // Clean up
      this.cleanup();

      return recording;
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      throw new Error('No active recording session to pause');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.currentSession.status = 'paused';

      // Notify extension
      const hasExtension = await this.isExtensionAvailable();
      if (hasExtension) {
        this.notifyExtension('PAUSE_RECORDING');
      }
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (!this.currentSession || this.currentSession.status !== 'paused') {
      throw new Error('No paused recording session to resume');
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.currentSession.status = 'active';

      // Notify extension
      const hasExtension = await this.isExtensionAvailable();
      if (hasExtension) {
        this.notifyExtension('RESUME_RECORDING');
      }
    }
  }

  /**
   * Get current recording session
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<Recording> {
    const response = await apiClient.get<{ data: Recording }>(`/recordings/${recordingId}`);
    return response.data.data;
  }

  /**
   * List user recordings
   */
  async listRecordings(limit = 50, offset = 0): Promise<Recording[]> {
    const response = await apiClient.get<{ data: Recording[] }>('/recordings', {
      params: { limit, offset }
    });
    return response.data.data;
  }

  /**
   * Update recording
   */
  async updateRecording(recordingId: string, updates: UpdateRecordingInput): Promise<Recording> {
    const response = await apiClient.patch<{ data: Recording }>(`/recordings/${recordingId}`, updates);
    return response.data.data;
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    await apiClient.delete(`/recordings/${recordingId}`);
  }

  /**
   * Private methods
   */
  private async startScreenCapture(): Promise<void> {
    if (!this.isScreenRecordingSupported()) {
      throw new Error('Screen recording is not supported in this browser');
    }

    try {
      // Request screen capture
      this.recordingStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } as any,
        audio: true
      });

      // Set up MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus'
      };

      // Fallback to other formats if VP9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
      this.recordingChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
          this.queueChunkUpload(event.data, this.recordingChunks.length - 1);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.cleanup();
      };

      // Handle stream end (user stops sharing)
      this.recordingStream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing ended by user');
        this.stopRecording().catch(console.error);
      };

      // Start recording with 5-second chunks
      this.mediaRecorder.start(5000);

    } catch (error) {
      throw new Error(`Failed to start screen capture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private queueChunkUpload(chunk: Blob, index: number): void {
    this.chunkUploadQueue.push({ chunk, index });
    
    // Process upload queue
    this.processUploadQueue();
  }

  private async processUploadQueue(): Promise<void> {
    if (!this.currentSession || this.chunkUploadQueue.length === 0) {
      return;
    }

    const { chunk, index } = this.chunkUploadQueue.shift()!;

    try {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', index.toString());
      formData.append('totalChunks', this.recordingChunks.length.toString());

      await apiClient.post(`/recordings/sessions/${this.currentSession.id}/chunks`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log(`Uploaded chunk ${index + 1}/${this.recordingChunks.length}`);
    } catch (error) {
      console.error(`Failed to upload chunk ${index}:`, error);
      // Re-queue the chunk for retry
      this.chunkUploadQueue.unshift({ chunk, index });
    }
  }

  private async uploadRemainingChunks(): Promise<void> {
    // Wait for all chunks to be uploaded
    while (this.chunkUploadQueue.length > 0) {
      await this.processUploadQueue();
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private notifyExtension(type: string, payload?: any): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage('stepflow-extension-id', { type, payload });
      }
    } catch (error) {
      console.warn('Failed to notify extension:', error);
    }
  }

  private cleanup(): void {
    this.currentSession = null;
    this.mediaRecorder = null;
    this.recordingStream = null;
    this.recordingChunks = [];
    this.chunkUploadQueue = [];
  }
}

export const recordingService = new RecordingService();