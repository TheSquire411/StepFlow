import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AIEnhancementService, FormatConversionOptions } from '../ai-enhancement.service';
import { apiClient } from '../api.service';

// Mock the API service
vi.mock('../api.service', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

// Mock DOM methods for download functionality
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

describe('AIEnhancementService', () => {
  let service: AIEnhancementService;
  let mockApiService: {
    post: Mock;
    get: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIEnhancementService();
    mockApiService = apiService as any;

    // Mock document methods
    document.createElement = vi.fn().mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
          style: {}
        };
      }
      return {};
    });

    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  describe('summarizeGuide', () => {
    it('should summarize guide successfully', async () => {
      const mockSummary = {
        id: 'summary-1',
        originalGuideId: 'guide-1',
        title: 'Test Guide - Summary',
        summary: 'This is a test summary',
        keyPoints: ['Point 1', 'Point 2'],
        quickReference: ['1. Step 1', '2. Step 2'],
        estimatedReadTime: '2 minutes',
        createdAt: new Date()
      };

      mockApiService.post.mockResolvedValue({ data: mockSummary });

      const result = await service.summarizeGuide('guide-1');

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/ai-enhancement/guides/guide-1/summarize');
      expect(result).toEqual(mockSummary);
    });

    it('should handle summarization errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('API error'));

      await expect(service.summarizeGuide('guide-1'))
        .rejects.toThrow('Failed to generate guide summary');
    });
  });

  describe('convertGuideFormat', () => {
    it('should convert guide to PDF format', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      const options: FormatConversionOptions = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      mockApiService.post.mockResolvedValue({ data: mockBlob });

      const result = await service.convertGuideFormat('guide-1', options);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/ai-enhancement/guides/guide-1/convert',
        options,
        { responseType: 'blob' }
      );
      expect(result).toBe(mockBlob);
    });

    it('should convert guide to HTML format', async () => {
      const mockHTML = '<html><body>Test Guide</body></html>';
      const options: FormatConversionOptions = {
        format: 'html',
        includeImages: true,
        includeAnnotations: true
      };

      mockApiService.post.mockResolvedValue({ data: mockHTML });

      const result = await service.convertGuideFormat('guide-1', options);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/ai-enhancement/guides/guide-1/convert',
        options,
        { responseType: 'json' }
      );
      expect(result).toBe(mockHTML);
    });

    it('should convert guide to text format', async () => {
      const mockText = 'Test Guide\n\n1. First Step\n2. Second Step';
      const options: FormatConversionOptions = {
        format: 'text',
        includeImages: false,
        includeAnnotations: false
      };

      mockApiService.post.mockResolvedValue({ data: mockText });

      const result = await service.convertGuideFormat('guide-1', options);

      expect(result).toBe(mockText);
    });

    it('should handle conversion errors', async () => {
      const options: FormatConversionOptions = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      mockApiService.post.mockRejectedValue(new Error('Conversion failed'));

      await expect(service.convertGuideFormat('guide-1', options))
        .rejects.toThrow('Failed to convert guide to pdf format');
    });
  });

  describe('translateGuide', () => {
    it('should translate guide successfully', async () => {
      const mockTranslation = {
        id: 'translation-1',
        originalGuideId: 'guide-1',
        targetLanguage: 'Spanish',
        translatedGuide: { title: 'Guía de Prueba' },
        confidence: 0.9,
        warnings: [],
        createdAt: new Date()
      };

      mockApiService.post.mockResolvedValue({ data: mockTranslation });

      const result = await service.translateGuide('guide-1', 'Spanish');

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/ai-enhancement/guides/guide-1/translate',
        { targetLanguage: 'Spanish' }
      );
      expect(result).toEqual(mockTranslation);
    });

    it('should handle translation errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('Translation failed'));

      await expect(service.translateGuide('guide-1', 'Spanish'))
        .rejects.toThrow('Failed to translate guide to Spanish');
    });
  });

  describe('assessContentQuality', () => {
    it('should assess content quality successfully', async () => {
      const mockAssessment = {
        qualityReport: {
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
        },
        suggestions: [
          {
            type: 'accessibility',
            priority: 'medium',
            description: 'Add alt text',
            suggestedFix: 'Include descriptive alt text',
            impact: 'Better accessibility'
          }
        ]
      };

      mockApiService.get.mockResolvedValue({ data: mockAssessment });

      const result = await service.assessContentQuality('guide-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/ai-enhancement/guides/guide-1/quality-assessment');
      expect(result).toEqual(mockAssessment);
    });

    it('should handle assessment errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Assessment failed'));

      await expect(service.assessContentQuality('guide-1'))
        .rejects.toThrow('Failed to assess content quality');
    });
  });

  describe('getImprovementSuggestions', () => {
    it('should get improvement suggestions successfully', async () => {
      const mockSuggestions = {
        overallScore: 6.5,
        suggestions: [
          {
            type: 'clarity',
            priority: 'high',
            description: 'Improve clarity',
            suggestedFix: 'Add more details',
            impact: 'Better understanding'
          }
        ],
        priorityCount: {
          high: 1,
          medium: 0,
          low: 0
        }
      };

      mockApiService.get.mockResolvedValue({ data: mockSuggestions });

      const result = await service.getImprovementSuggestions('guide-1');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/ai-enhancement/guides/guide-1/improvement-suggestions');
      expect(result).toEqual(mockSuggestions);
    });

    it('should handle suggestion errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Suggestions failed'));

      await expect(service.getImprovementSuggestions('guide-1'))
        .rejects.toThrow('Failed to get improvement suggestions');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should get supported languages successfully', async () => {
      const mockLanguages = [
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' }
      ];

      mockApiService.get.mockResolvedValue({ data: mockLanguages });

      const result = await service.getSupportedLanguages();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/ai-enhancement/supported-languages');
      expect(result).toEqual(mockLanguages);
    });

    it('should handle language fetch errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Languages failed'));

      await expect(service.getSupportedLanguages())
        .rejects.toThrow('Failed to get supported languages');
    });
  });

  describe('getSupportedFormats', () => {
    it('should get supported formats successfully', async () => {
      const mockFormats = [
        {
          format: 'pdf',
          name: 'PDF Document',
          description: 'Portable document format',
          features: ['Print-ready', 'Professional layout']
        }
      ];

      mockApiService.get.mockResolvedValue({ data: mockFormats });

      const result = await service.getSupportedFormats();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/ai-enhancement/supported-formats');
      expect(result).toEqual(mockFormats);
    });

    it('should handle format fetch errors', async () => {
      mockApiService.get.mockRejectedValue(new Error('Formats failed'));

      await expect(service.getSupportedFormats())
        .rejects.toThrow('Failed to get supported formats');
    });
  });

  describe('downloadGuide', () => {
    it('should download PDF guide', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      const options: FormatConversionOptions = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      mockApiService.post.mockResolvedValue({ data: mockBlob });

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
      (document.createElement as Mock).mockReturnValue(mockLink);

      await service.downloadGuide('guide-1', options, 'my-guide.pdf');

      expect(mockLink.download).toBe('my-guide.pdf');
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });

    it('should download text guide', async () => {
      const mockText = 'Guide content';
      const options: FormatConversionOptions = {
        format: 'text',
        includeImages: false,
        includeAnnotations: false
      };

      mockApiService.post.mockResolvedValue({ data: mockText });

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
      (document.createElement as Mock).mockReturnValue(mockLink);

      // Mock Blob constructor
      global.Blob = vi.fn().mockImplementation((content, options) => ({
        content,
        options,
        size: content[0].length,
        type: options?.type || ''
      })) as any;

      await service.downloadGuide('guide-1', options);

      expect(mockLink.download).toBe('guide.text');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle download errors', async () => {
      const options: FormatConversionOptions = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      mockApiService.post.mockRejectedValue(new Error('Download failed'));

      await expect(service.downloadGuide('guide-1', options))
        .rejects.toThrow('Failed to download guide');
    });
  });

  describe('utility methods', () => {
    it('should get correct quality score colors', () => {
      expect(service.getQualityScoreColor(9)).toBe('text-green-600');
      expect(service.getQualityScoreColor(7)).toBe('text-yellow-600');
      expect(service.getQualityScoreColor(4)).toBe('text-red-600');
    });

    it('should get correct priority colors', () => {
      expect(service.getPriorityColor('high')).toBe('bg-red-100 text-red-800');
      expect(service.getPriorityColor('medium')).toBe('bg-yellow-100 text-yellow-800');
      expect(service.getPriorityColor('low')).toBe('bg-blue-100 text-blue-800');
    });

    it('should format scores correctly', () => {
      expect(service.formatScore(8.5)).toBe('85%');
      expect(service.formatScore(7.2)).toBe('72%');
      expect(service.formatScore(6)).toBe('60%');
    });

    it('should get correct suggestion type icons', () => {
      expect(service.getSuggestionTypeIcon('clarity')).toBe('🔍');
      expect(service.getSuggestionTypeIcon('completeness')).toBe('📋');
      expect(service.getSuggestionTypeIcon('accuracy')).toBe('✅');
      expect(service.getSuggestionTypeIcon('usability')).toBe('👤');
      expect(service.getSuggestionTypeIcon('accessibility')).toBe('♿');
      expect(service.getSuggestionTypeIcon('unknown')).toBe('💡');
    });
  });
});