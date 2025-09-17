import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordingService } from '../recording.service';

// Mock the API client
vi.mock('../api.service', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock browser APIs
const mockMediaDevices = {
  getDisplayMedia: vi.fn(),
};

const mockMediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  onerror: null,
  state: 'inactive',
}));

const mockMediaStream = {
  getTracks: vi.fn(() => [
    { stop: vi.fn() }
  ]),
  getVideoTracks: vi.fn(() => [
    { onended: null }
  ])
};

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices,
    userAgent: 'test-agent'
  },
  writable: true
});

Object.defineProperty(global, 'MediaRecorder', {
  value: mockMediaRecorder,
  writable: true
});

Object.defineProperty(global.MediaRecorder, 'isTypeSupported', {
  value: vi.fn(() => true),
  writable: true
});

Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: vi.fn()
    }
  },
  writable: true
});

describe('RecordingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state
    (recordingService as any).currentSession = null;
    (recordingService as any).mediaRecorder = null;
    (recordingService as any).recordingStream = null;
    (recordingService as any).recordingChunks = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isScreenRecordingSupported', () => {
    it('should return true when getDisplayMedia is available', () => {
      expect(recordingService.isScreenRecordingSupported()).toBe(true);
    });

    it('should return false when getDisplayMedia is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          mediaDevices: {}
        },
        writable: true
      });

      expect(recordingService.isScreenRecordingSupported()).toBe(false);
    });

    it('should return false when navigator.mediaDevices is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      expect(recordingService.isScreenRecordingSupported()).toBe(false);
    });
  });

  describe('isExtensionAvailable', () => {
    it('should return true when extension responds', async () => {
      const mockSendMessage = vi.fn((extensionId, message, callback) => {
        callback({ success: true });
      });
      
      Object.defineProperty(global, 'chrome', {
        value: {
          runtime: {
            sendMessage: mockSendMessage
          }
        },
        writable: true
      });

      const result = await recordingService.isExtensionAvailable();
      expect(result).toBe(true);
    });

    it('should return false when extension does not respond', async () => {
      const mockSendMessage = vi.fn((extensionId, message, callback) => {
        callback(null);
      });
      
      Object.defineProperty(global, 'chrome', {
        value: {
          runtime: {
            sendMessage: mockSendMessage
          }
        },
        writable: true
      });

      const result = await recordingService.isExtensionAvailable();
      expect(result).toBe(false);
    });

    it('should return false when chrome runtime is not available', async () => {
      Object.defineProperty(global, 'chrome', {
        value: undefined,
        writable: true
      });

      const result = await recordingService.isExtensionAvailable();
      expect(result).toBe(false);
    });
  });

  describe('startRecording', () => {
    it('should start recording successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        title: 'Test Recording',
        status: 'active',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {}
      };

      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockSession }
      });

      mockMediaDevices.getDisplayMedia.mockResolvedValue(mockMediaStream);

      const result = await recordingService.startRecording({
        title: 'Test Recording',
        description: 'Test description'
      });

      expect(result).toEqual(mockSession);
      expect(apiClient.post).toHaveBeenCalledWith('/recordings/sessions', {
        title: 'Test Recording',
        description: 'Test description'
      });
      expect(mockMediaDevices.getDisplayMedia).toHaveBeenCalled();
    });

    it('should throw error if recording is already active', async () => {
      // Set up active session
      (recordingService as any).currentSession = {
        id: 'active-session',
        status: 'active'
      };

      await expect(recordingService.startRecording({
        title: 'Test Recording'
      })).rejects.toThrow('Recording session already active');
    });

    it('should throw error if screen capture fails', async () => {
      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: { id: 'session-123', status: 'active' } }
      });

      mockMediaDevices.getDisplayMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(recordingService.startRecording({
        title: 'Test Recording'
      })).rejects.toThrow('Failed to start recording');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording successfully', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'active'
      };

      const mockRecording = {
        id: 'recording-123',
        sessionId: 'session-123',
        title: 'Test Recording',
        status: 'processing'
      };

      // Set up active session
      (recordingService as any).currentSession = mockSession;
      (recordingService as any).mediaRecorder = {
        stop: vi.fn(),
        state: 'recording'
      };
      (recordingService as any).recordingStream = mockMediaStream;

      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockRecording }
      });

      const result = await recordingService.stopRecording();

      expect(result).toEqual(mockRecording);
      expect(apiClient.post).toHaveBeenCalledWith('/recordings/sessions/session-123/complete');
    });

    it('should throw error if no active session', async () => {
      await expect(recordingService.stopRecording()).rejects.toThrow('No active recording session');
    });
  });

  describe('pauseRecording', () => {
    it('should pause recording successfully', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'active'
      };

      const mockMediaRecorder = {
        pause: vi.fn(),
        state: 'recording'
      };

      (recordingService as any).currentSession = mockSession;
      (recordingService as any).mediaRecorder = mockMediaRecorder;

      await recordingService.pauseRecording();

      expect(mockMediaRecorder.pause).toHaveBeenCalled();
      expect(mockSession.status).toBe('paused');
    });

    it('should throw error if no active session', async () => {
      await expect(recordingService.pauseRecording()).rejects.toThrow('No active recording session to pause');
    });
  });

  describe('resumeRecording', () => {
    it('should resume recording successfully', async () => {
      const mockSession = {
        id: 'session-123',
        status: 'paused'
      };

      const mockMediaRecorder = {
        resume: vi.fn(),
        state: 'paused'
      };

      (recordingService as any).currentSession = mockSession;
      (recordingService as any).mediaRecorder = mockMediaRecorder;

      await recordingService.resumeRecording();

      expect(mockMediaRecorder.resume).toHaveBeenCalled();
      expect(mockSession.status).toBe('active');
    });

    it('should throw error if no paused session', async () => {
      await expect(recordingService.resumeRecording()).rejects.toThrow('No paused recording session to resume');
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session', () => {
      const mockSession = { id: 'session-123' };
      (recordingService as any).currentSession = mockSession;

      const result = recordingService.getCurrentSession();
      expect(result).toEqual(mockSession);
    });

    it('should return null if no current session', () => {
      const result = recordingService.getCurrentSession();
      expect(result).toBeNull();
    });
  });

  describe('API methods', () => {
    it('should get recording by ID', async () => {
      const mockRecording = { id: 'recording-123', title: 'Test Recording' };
      
      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockRecording }
      });

      const result = await recordingService.getRecording('recording-123');

      expect(result).toEqual(mockRecording);
      expect(apiClient.get).toHaveBeenCalledWith('/recordings/recording-123');
    });

    it('should list recordings', async () => {
      const mockRecordings = [
        { id: 'recording-1', title: 'Recording 1' },
        { id: 'recording-2', title: 'Recording 2' }
      ];
      
      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockRecordings }
      });

      const result = await recordingService.listRecordings(10, 0);

      expect(result).toEqual(mockRecordings);
      expect(apiClient.get).toHaveBeenCalledWith('/recordings', {
        params: { limit: 10, offset: 0 }
      });
    });

    it('should update recording', async () => {
      const mockRecording = { id: 'recording-123', title: 'Updated Recording' };
      
      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { data: mockRecording }
      });

      const result = await recordingService.updateRecording('recording-123', {
        title: 'Updated Recording'
      });

      expect(result).toEqual(mockRecording);
      expect(apiClient.patch).toHaveBeenCalledWith('/recordings/recording-123', {
        title: 'Updated Recording'
      });
    });

    it('should delete recording', async () => {
      const { apiClient } = await import('../api.service');
      vi.mocked(apiClient.delete).mockResolvedValue({});

      await recordingService.deleteRecording('recording-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/recordings/recording-123');
    });
  });
});