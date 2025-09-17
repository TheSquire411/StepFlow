import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { Request, Response } from 'express';
import { AIEnhancementController } from '../ai-enhancement.controller.js';
import { AIEnhancementService } from '../../services/ai-enhancement.service.js';
import { GuideService } from '../../services/guide.service.js';

// Mock the services
vi.mock('../../services/ai-enhancement.service.js');
vi.mock('../../services/guide.service.js');

describe('AIEnhancementController', () => {
  let controller: AIEnhancementController;
  let mockAIEnhancementService: {
    summarizeGuide: Mock;
    convertGuideFormat: Mock;
    translateGuide: Mock;
    assessContentQuality: Mock;
    generateImprovementSuggestions: Mock;
  };
  let mockGuideService: {
    getGuide: Mock;
  };
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock services
    mockAIEnhancementService = {
      summarizeGuide: vi.fn(),
      convertGuideFormat: vi.fn(),
      translateGuide: vi.fn(),
      assessContentQuality: vi.fn(),
      generateImprovementSuggestions: vi.fn()
    };

    mockGuideService = {
      getGuide: vi.fn()
    };

    // Mock the service constructors
    (AIEnhancementService as any).mockImplementation(() => mockAIEnhancementService);
    (GuideService as any).mockImplementation(() => mockGuideService);

    controller = new AIEnhancementController();

    // Create mock request and response
    mockRequest = {
      params: { guideId: 'test-guide-1' },
      body: {},
      user: { id: 'user-1' }
    };

    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn()
    };
  });

  describe('summarizeGuide', () => {
    it('should summarize guide successfully', async () => {
      const mockGuide = {
        id: 'test-guide-1',
        title: 'Test Guide',
        description: 'Test description',
        steps: []
      };

      const mockSummary = {
        id: 'summary-1',
        originalGuideId: 'test-guide-1',
        title: 'Test Guide - Summary',
        summary: 'This is a test summary',
        keyPoints: ['Point 1', 'Point 2'],
        quickReference: ['1. Step 1', '2. Step 2'],
        estimatedReadTime: '2 minutes',
        createdAt: new Date()
      };

      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.summarizeGuide.mockResolvedValue(mockSummary);

      await controller.summarizeGuide(mockRequest as Request, mockResponse as Response);

      expect(mockGuideService.getGuide).toHaveBeenCalledWith('test-guide-1', 'user-1');
      expect(mockAIEnhancementService.summarizeGuide).toHaveBeenCalledWith(mockGuide);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.summarizeGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 404 when guide is not found', async () => {
      mockGuideService.getGuide.mockResolvedValue(null);

      await controller.summarizeGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Guide not found' });
    });

    it('should handle service errors', async () => {
      const mockGuide = { id: 'test-guide-1' };
      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.summarizeGuide.mockRejectedValue(new Error('AI service error'));

      await controller.summarizeGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to generate guide summary',
        details: 'AI service error'
      });
    });
  });

  describe('convertGuideFormat', () => {
    it('should convert guide to PDF successfully', async () => {
      const mockGuide = { id: 'test-guide-1', title: 'Test Guide' };
      const mockPDFBuffer = Buffer.from('PDF content');
      
      mockRequest.body = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.convertGuideFormat.mockResolvedValue(mockPDFBuffer);

      await controller.convertGuideFormat(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="Test Guide.pdf"');
      expect(mockResponse.send).toHaveBeenCalledWith(mockPDFBuffer);
    });

    it('should convert guide to HTML successfully', async () => {
      const mockGuide = { id: 'test-guide-1', title: 'Test Guide' };
      const mockHTML = '<html><body>Test Guide</body></html>';
      
      mockRequest.body = {
        format: 'html',
        includeImages: true,
        includeAnnotations: true
      };

      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.convertGuideFormat.mockResolvedValue(mockHTML);

      await controller.convertGuideFormat(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockResponse.send).toHaveBeenCalledWith(mockHTML);
    });

    it('should return 400 for invalid format', async () => {
      mockRequest.body = {
        format: 'invalid-format',
        includeImages: true,
        includeAnnotations: true
      };

      await controller.convertGuideFormat(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid format',
        supportedFormats: ['video', 'pdf', 'text', 'html', 'markdown']
      });
    });

    it('should handle conversion errors', async () => {
      const mockGuide = { id: 'test-guide-1' };
      mockRequest.body = { format: 'pdf', includeImages: true, includeAnnotations: true };
      
      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.convertGuideFormat.mockRejectedValue(new Error('Conversion failed'));

      await controller.convertGuideFormat(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to convert guide format',
        details: 'Conversion failed'
      });
    });
  });

  describe('translateGuide', () => {
    it('should translate guide successfully', async () => {
      const mockGuide = { id: 'test-guide-1', title: 'Test Guide' };
      const mockTranslation = {
        id: 'translation-1',
        originalGuideId: 'test-guide-1',
        targetLanguage: 'Spanish',
        translatedGuide: { ...mockGuide, title: 'Guía de Prueba' },
        confidence: 0.9,
        warnings: [],
        createdAt: new Date()
      };

      mockRequest.body = { targetLanguage: 'Spanish' };
      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.translateGuide.mockResolvedValue(mockTranslation);

      await controller.translateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockAIEnhancementService.translateGuide).toHaveBeenCalledWith(mockGuide, 'Spanish');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTranslation
      });
    });

    it('should return 400 when target language is missing', async () => {
      mockRequest.body = {};

      await controller.translateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Target language is required' });
    });

    it('should handle translation errors', async () => {
      const mockGuide = { id: 'test-guide-1' };
      mockRequest.body = { targetLanguage: 'Spanish' };
      
      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.translateGuide.mockRejectedValue(new Error('Translation failed'));

      await controller.translateGuide(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to translate guide',
        details: 'Translation failed'
      });
    });
  });

  describe('assessContentQuality', () => {
    it('should assess content quality successfully', async () => {
      const mockGuide = { id: 'test-guide-1', title: 'Test Guide' };
      const mockQualityReport = {
        overallScore: 8.5,
        scores: {
          clarity: 9,
          completeness: 8,
          accuracy: 9,
          usability: 8,
          accessibility: 7
        },
        suggestions: [],
        strengths: ['Clear instructions'],
        weaknesses: [],
        readabilityScore: 8,
        estimatedCompletionTime: '5 minutes'
      };
      const mockSuggestions = [
        {
          type: 'accessibility',
          priority: 'medium',
          description: 'Add alt text',
          suggestedFix: 'Include descriptive alt text',
          impact: 'Better accessibility'
        }
      ];

      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.assessContentQuality.mockResolvedValue(mockQualityReport);
      mockAIEnhancementService.generateImprovementSuggestions.mockResolvedValue(mockSuggestions);

      await controller.assessContentQuality(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          qualityReport: mockQualityReport,
          suggestions: mockSuggestions
        }
      });
    });

    it('should handle assessment errors', async () => {
      const mockGuide = { id: 'test-guide-1' };
      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.assessContentQuality.mockRejectedValue(new Error('Assessment failed'));

      await controller.assessContentQuality(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to assess content quality',
        details: 'Assessment failed'
      });
    });
  });

  describe('getImprovementSuggestions', () => {
    it('should get improvement suggestions successfully', async () => {
      const mockGuide = { id: 'test-guide-1', title: 'Test Guide' };
      const mockQualityReport = {
        overallScore: 6.5,
        scores: { clarity: 6, completeness: 7, accuracy: 8, usability: 6, accessibility: 5 },
        suggestions: [],
        strengths: [],
        weaknesses: [],
        readabilityScore: 6,
        estimatedCompletionTime: '10 minutes'
      };
      const mockSuggestions = [
        { type: 'clarity', priority: 'high', description: 'Improve clarity', suggestedFix: 'Add more details', impact: 'Better understanding' },
        { type: 'accessibility', priority: 'medium', description: 'Add accessibility features', suggestedFix: 'Include alt text', impact: 'Better accessibility' }
      ];

      mockGuideService.getGuide.mockResolvedValue(mockGuide);
      mockAIEnhancementService.assessContentQuality.mockResolvedValue(mockQualityReport);
      mockAIEnhancementService.generateImprovementSuggestions.mockResolvedValue(mockSuggestions);

      await controller.getImprovementSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          overallScore: 6.5,
          suggestions: mockSuggestions,
          priorityCount: {
            high: 1,
            medium: 1,
            low: 0
          }
        }
      });
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return supported languages', async () => {
      await controller.getSupportedLanguages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            code: 'es',
            name: 'Spanish',
            nativeName: 'Español'
          })
        ])
      });
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', async () => {
      await controller.getSupportedFormats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            format: 'pdf',
            name: 'PDF Document',
            description: expect.any(String),
            features: expect.any(Array)
          })
        ])
      });
    });
  });
});