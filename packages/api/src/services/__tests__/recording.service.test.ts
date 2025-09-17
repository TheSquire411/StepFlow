import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecordingService } from '../recording.service.js';
import { FileStorageService } from '../file-storage.service.js';

// Mock database
const mockDb = {
  query: vi.fn(),
  end: vi.fn()
};

// Mock file storage service
const mockFileStorage: FileStorageService = {
  uploadFile: vi.fn(),
  getFile: vi.fn(),
  getFileUrl: vi.fn(),
  getFileInfo: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn()
};

describe('RecordingService', () => {
  let recordingService: RecordingService;

  beforeEach(() => {
    vi.clearAllMocks();
    recordingService = new RecordingService(mockDb as any, mockFileStorage);
  });

  it('should create a recording service instance', () => {
    expect(recordingService).toBeDefined();
  });

  describe('startRecordingSession', () => {
    it('should create a new recording session successfully', async () => {
      const userId = 'user-123';
      const input = {
        title: 'Test Recording',
        description: 'A test recording session',
        metadata: { browser: 'chrome' }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'session-123' }] });

      const session = await recordingService.startRecordingSession(userId, input);

      expect(session).toMatchObject({
        userId,
        title: input.title,
        description: input.description,
        status: 'active',
        metadata: input.metadata
      });
      expect(session.id).toBeDefined();
      expect(session.startedAt).toBeInstanceOf(Date);
    });
  });
});