import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database functions
const mockExecuteQuery = vi.fn();
const mockExecuteTransaction = vi.fn();

vi.mock('../../config/database.js', () => ({
  executeQuery: mockExecuteQuery,
  executeTransaction: mockExecuteTransaction
}));

// Import after mocking
const { GuideService } = await import('../guide.service.js');

describe('GuideService', () => {
  let guideService: any;

  beforeEach(() => {
    guideService = new GuideService();
    vi.clearAllMocks();
  });

  describe('createGuide', () => {
    it('should create a guide successfully', async () => {
      const userId = 'user-123';
      const input = {
        recordingId: 'recording-123',
        title: 'Test Guide',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test', 'guide'],
        settings: { theme: 'dark' },
        language: 'en',
        difficulty: 'beginner'
      };

      const mockClient = {
        query: vi.fn()
      };

      // Mock recording check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'recording-123', user_id: userId }]
      });

      // Mock guide creation
      const mockGuide = {
        id: 'guide-123',
        user_id: userId,
        recording_id: 'recording-123',
        title: 'Test Guide',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test', 'guide'],
        settings: '{"theme":"dark"}',
        language: 'en',
        difficulty: 'beginner',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockGuide]
      });

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const result = await guideService.createGuide(userId, input);

      expect(result).toEqual({
        id: 'guide-123',
        userId: userId,
        recordingId: 'recording-123',
        title: 'Test Guide',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test', 'guide'],
        settings: { theme: 'dark' },
        language: 'en',
        difficulty: 'beginner',
        status: 'draft',
        steps: [],
        createdAt: mockGuide.created_at,
        updatedAt: mockGuide.updated_at
      });
    });

    it('should throw error if recording not found', async () => {
      const userId = 'user-123';
      const input = {
        recordingId: 'nonexistent-recording',
        title: 'Test Guide'
      };

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] })
      };

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await expect(guideService.createGuide(userId, input)).rejects.toThrow(
        'Recording not found or access denied'
      );
    });
  });

  describe('getGuide', () => {
    it('should get a guide with steps', async () => {
      const guideId = 'guide-123';
      const userId = 'user-123';

      const mockGuideWithSteps = {
        id: 'guide-123',
        user_id: userId,
        recording_id: 'recording-123',
        title: 'Test Guide',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test'],
        settings: '{"theme":"dark"}',
        language: 'en',
        difficulty: 'beginner',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date(),
        steps: [
          {
            id: 'step-1',
            order: 1,
            title: 'Step 1',
            description: 'First step',
            screenshotUrl: 'screenshot1.jpg',
            audioUrl: null,
            duration: 5000,
            actionType: 'click',
            coordinates: { x: 100, y: 200 },
            annotations: []
          }
        ]
      };

      mockExecuteQuery.mockResolvedValueOnce({
        rows: [mockGuideWithSteps]
      });

      const result = await guideService.getGuide(guideId, userId);

      expect(result).toEqual({
        id: 'guide-123',
        userId: userId,
        recordingId: 'recording-123',
        title: 'Test Guide',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test'],
        settings: { theme: 'dark' },
        language: 'en',
        difficulty: 'beginner',
        status: 'published',
        steps: mockGuideWithSteps.steps,
        createdAt: mockGuideWithSteps.created_at,
        updatedAt: mockGuideWithSteps.updated_at
      });
    });

    it('should return null if guide not found', async () => {
      const guideId = 'nonexistent-guide';
      const userId = 'user-123';

      mockExecuteQuery.mockResolvedValueOnce({ rows: [] });

      const result = await guideService.getGuide(guideId, userId);

      expect(result).toBeNull();
    });
  });

  describe('updateGuide', () => {
    it('should update a guide successfully', async () => {
      const guideId = 'guide-123';
      const userId = 'user-123';
      const input = {
        title: 'Updated Guide Title',
        status: 'published' as const
      };

      const mockClient = {
        query: vi.fn()
      };

      // Mock guide existence check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: guideId }]
      });

      // Mock update query
      const updatedGuide = {
        id: guideId,
        user_id: userId,
        recording_id: 'recording-123',
        title: 'Updated Guide Title',
        description: 'Test description',
        category: 'tutorial',
        tags: ['test'],
        settings: '{"theme":"dark"}',
        language: 'en',
        difficulty: 'beginner',
        status: 'published',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [updatedGuide]
      });

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const result = await guideService.updateGuide(guideId, userId, input);

      expect(result?.title).toBe('Updated Guide Title');
      expect(result?.status).toBe('published');
    });

    it('should throw error if guide not found', async () => {
      const guideId = 'nonexistent-guide';
      const userId = 'user-123';
      const input = { title: 'Updated Title' };

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] })
      };

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await expect(guideService.updateGuide(guideId, userId, input)).rejects.toThrow(
        'Guide not found or access denied'
      );
    });
  });

  describe('deleteGuide', () => {
    it('should delete a guide successfully', async () => {
      const guideId = 'guide-123';
      const userId = 'user-123';

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 1 })
      };

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const result = await guideService.deleteGuide(guideId, userId);

      expect(result).toBe(true);
    });

    it('should return false if guide not found', async () => {
      const guideId = 'nonexistent-guide';
      const userId = 'user-123';

      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 0 })
      };

      mockExecuteTransaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      const result = await guideService.deleteGuide(guideId, userId);

      expect(result).toBe(false);
    });
  });

  describe('listGuides', () => {
    it('should list guides with pagination', async () => {
      const userId = 'user-123';
      const filters = {
        page: 1,
        limit: 10,
        search: 'test'
      };

      // Mock count query
      mockExecuteQuery.mockResolvedValueOnce({
        rows: [{ total: '5' }]
      });

      // Mock guides query
      const mockGuides = [
        {
          id: 'guide-1',
          user_id: userId,
          recording_id: 'recording-1',
          title: 'Test Guide 1',
          description: 'Description 1',
          category: 'tutorial',
          tags: ['test'],
          settings: '{}',
          language: 'en',
          difficulty: 'beginner',
          status: 'published',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'guide-2',
          user_id: userId,
          recording_id: 'recording-2',
          title: 'Test Guide 2',
          description: 'Description 2',
          category: 'tutorial',
          tags: ['test'],
          settings: '{}',
          language: 'en',
          difficulty: 'intermediate',
          status: 'draft',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockExecuteQuery.mockResolvedValueOnce({
        rows: mockGuides
      });

      const result = await guideService.listGuides(userId, filters);

      expect(result.total).toBe(5);
      expect(result.guides).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('getGuideAnalytics', () => {
    it('should get guide analytics', async () => {
      const guideId = 'guide-123';
      const userId = 'user-123';

      const mockAnalytics = {
        guide_id: guideId,
        view_count: 100,
        last_viewed_at: new Date(),
        title: 'Test Guide'
      };

      mockExecuteQuery.mockResolvedValueOnce({
        rows: [mockAnalytics]
      });

      const result = await guideService.getGuideAnalytics(guideId, userId);

      expect(result).toEqual(mockAnalytics);
    });

    it('should throw error if guide not found', async () => {
      const guideId = 'nonexistent-guide';
      const userId = 'user-123';

      mockExecuteQuery.mockResolvedValueOnce({ rows: [] });

      await expect(guideService.getGuideAnalytics(guideId, userId)).rejects.toThrow(
        'Guide not found or access denied'
      );
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      const guideId = 'guide-123';

      mockExecuteQuery.mockResolvedValueOnce({ rows: [] });

      await guideService.incrementViewCount(guideId);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE guide_analytics'),
        [guideId]
      );
    });
  });
});