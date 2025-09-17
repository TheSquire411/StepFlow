import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response } from 'express';
import { GuideController } from '../guide.controller.js';
import { GuideService } from '../../services/guide.service.js';

// Mock the GuideService
vi.mock('../../services/guide.service.js');

const mockGuideServiceInstance = {
  createGuide: vi.fn(),
  getGuide: vi.fn(),
  updateGuide: vi.fn(),
  deleteGuide: vi.fn(),
  listGuides: vi.fn(),
  getGuideAnalytics: vi.fn(),
  incrementViewCount: vi.fn()
};

vi.mocked(GuideService).mockImplementation(() => mockGuideServiceInstance as any);

describe('GuideController', () => {
  let guideController: GuideController;
  let mockGuideService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    guideController = new GuideController();
    mockGuideService = mockGuideServiceInstance;
    
    mockRequest = {
      user: { id: 'user-123' },
      params: {},
      body: {},
      query: {}
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  describe('createGuide', () => {
    it('should create a guide successfully', async () => {
      const mockGuide = {
        id: 'guide-123',
        title: 'Test Guide',
        userId: 'user-123'
      };

      mockRequest.body = {
        recordingId: 'recording-123',
        title: 'Test Guide'
      };

      mockGuideService.createGuide.mockResolvedValueOnce(mockGuide);

      await guideController.createGuide(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.createGuide).toHaveBeenCalledWith('user-123', mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockGuide);
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await guideController.createGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service errors', async () => {
      mockRequest.body = { title: 'Test Guide' };
      mockGuideService.createGuide.mockRejectedValueOnce(new Error('Service error'));

      await guideController.createGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to create guide' });
    });
  });

  describe('getGuide', () => {
    it('should get a guide successfully', async () => {
      const mockGuide = {
        id: 'guide-123',
        title: 'Test Guide',
        userId: 'user-123'
      };

      mockRequest.params = { id: 'guide-123' };
      mockGuideService.getGuide.mockResolvedValueOnce(mockGuide);

      await guideController.getGuide(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.getGuide).toHaveBeenCalledWith('guide-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith(mockGuide);
    });

    it('should return 404 if guide not found', async () => {
      mockRequest.params = { id: 'nonexistent-guide' };
      mockGuideService.getGuide.mockResolvedValueOnce(null);

      await guideController.getGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Guide not found' });
    });
  });

  describe('updateGuide', () => {
    it('should update a guide successfully', async () => {
      const mockGuide = {
        id: 'guide-123',
        title: 'Updated Guide',
        userId: 'user-123'
      };

      mockRequest.params = { id: 'guide-123' };
      mockRequest.body = { title: 'Updated Guide' };
      mockGuideService.updateGuide.mockResolvedValueOnce(mockGuide);

      await guideController.updateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.updateGuide).toHaveBeenCalledWith('guide-123', 'user-123', mockRequest.body);
      expect(mockResponse.json).toHaveBeenCalledWith(mockGuide);
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'guide-123' };

      await guideController.updateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if guide not found', async () => {
      mockRequest.params = { id: 'nonexistent-guide' };
      mockRequest.body = { title: 'Updated Guide' };
      mockGuideService.updateGuide.mockResolvedValueOnce(null);

      await guideController.updateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Guide not found' });
    });
  });

  describe('deleteGuide', () => {
    it('should delete a guide successfully', async () => {
      mockRequest.params = { id: 'guide-123' };
      mockGuideService.deleteGuide.mockResolvedValueOnce(true);

      await guideController.deleteGuide(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.deleteGuide).toHaveBeenCalledWith('guide-123', 'user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 if guide not found', async () => {
      mockRequest.params = { id: 'nonexistent-guide' };
      mockGuideService.deleteGuide.mockResolvedValueOnce(false);

      await guideController.deleteGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Guide not found' });
    });
  });

  describe('listGuides', () => {
    it('should list guides with filters', async () => {
      const mockResult = {
        guides: [
          { id: 'guide-1', title: 'Guide 1' },
          { id: 'guide-2', title: 'Guide 2' }
        ],
        total: 2,
        page: 1,
        limit: 10
      };

      mockRequest.query = {
        search: 'test',
        category: 'tutorial',
        page: '1',
        limit: '10'
      };

      mockGuideService.listGuides.mockResolvedValueOnce(mockResult);

      await guideController.listGuides(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.listGuides).toHaveBeenCalledWith('user-123', {
        search: 'test',
        category: 'tutorial',
        tags: undefined,
        status: undefined,
        difficulty: undefined,
        language: undefined,
        page: 1,
        limit: 10,
        sortBy: undefined,
        sortOrder: undefined
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle tags parameter', async () => {
      mockRequest.query = {
        tags: 'tag1,tag2,tag3'
      };

      const mockResult = {
        guides: [],
        total: 0,
        page: 1,
        limit: 20
      };

      mockGuideService.listGuides.mockResolvedValueOnce(mockResult);

      await guideController.listGuides(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.listGuides).toHaveBeenCalledWith('user-123', {
        search: undefined,
        category: undefined,
        tags: ['tag1', 'tag2', 'tag3'],
        status: undefined,
        difficulty: undefined,
        language: undefined,
        page: undefined,
        limit: undefined,
        sortBy: undefined,
        sortOrder: undefined
      });
    });
  });

  describe('getGuideAnalytics', () => {
    it('should get guide analytics successfully', async () => {
      const mockAnalytics = {
        guide_id: 'guide-123',
        view_count: 100,
        last_viewed_at: new Date()
      };

      mockRequest.params = { id: 'guide-123' };
      mockGuideService.getGuideAnalytics.mockResolvedValueOnce(mockAnalytics);

      await guideController.getGuideAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.getGuideAnalytics).toHaveBeenCalledWith('guide-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith(mockAnalytics);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count successfully', async () => {
      mockRequest.params = { id: 'guide-123' };
      mockGuideService.incrementViewCount.mockResolvedValueOnce(undefined);

      await guideController.incrementViewCount(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.incrementViewCount).toHaveBeenCalledWith('guide-123');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
});