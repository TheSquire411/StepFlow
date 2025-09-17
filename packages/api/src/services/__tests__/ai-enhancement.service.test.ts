import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AIEnhancementService, FormatConversionOptions } from '../ai-enhancement.service.js';
import { GeneratedGuide } from '../ai-content-generation.service.js';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
  }
}));

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
        drawText: vi.fn()
      }),
      embedFont: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new ArrayBuffer(1000))
    })
  },
  rgb: vi.fn(),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'HelveticaBold'
  }
}));

describe('AIEnhancementService', () => {
  let service: AIEnhancementService;
  let mockModel: { generateContent: Mock };
  let mockGuide: GeneratedGuide;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variable
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    
    service = new AIEnhancementService();
    
    // Get the mock model instance
    mockModel = (service as any).model;
    
    // Create a mock guide for testing
    mockGuide = {
      id: 'test-guide-1',
      title: 'Test Guide',
      description: 'A test guide for unit testing',
      steps: [
        {
          stepNumber: 1,
          title: 'First Step',
          description: 'Click the login button',
          detailedInstructions: 'Navigate to the login page and click the login button',
          originalStep: {
            id: 'step-1',
            timestamp: 1000,
            action: 'click',
            element: 'login-button',
            elementType: 'button',
            coordinates: { x: 100, y: 200 },
            screenshotUrl: 'screenshot1.png',
            actionDescription: 'Click login button',
            confidence: 0.9,
            url: 'https://example.com/login'
          }
        },
        {
          stepNumber: 2,
          title: 'Second Step',
          description: 'Enter username',
          detailedInstructions: 'Type your username in the username field',
          originalStep: {
            id: 'step-2',
            timestamp: 2000,
            action: 'type',
            element: 'username-input',
            elementType: 'input',
            coordinates: { x: 150, y: 250 },
            screenshotUrl: 'screenshot2.png',
            actionDescription: 'Type username',
            confidence: 0.85,
            url: 'https://example.com/login'
          }
        }
      ],
      metadata: {
        totalSteps: 2,
        estimatedDuration: '2 minutes',
        difficulty: 'beginner' as const,
        tags: ['login', 'authentication'],
        category: 'Authentication'
      },
      generatedAt: new Date(),
      confidence: 0.9
    };
  });

  describe('summarizeGuide', () => {
    it('should generate a guide summary successfully', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            summary: 'This guide shows how to log into the system',
            keyPoints: ['Navigate to login page', 'Enter credentials'],
            quickReference: ['1. Click login', '2. Enter username'],
            estimatedReadTime: '1 minute'
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.summarizeGuide(mockGuide);

      expect(result).toMatchObject({
        originalGuideId: 'test-guide-1',
        title: 'Test Guide - Summary',
        summary: 'This guide shows how to log into the system',
        keyPoints: ['Navigate to login page', 'Enter credentials'],
        quickReference: ['1. Click login', '2. Enter username'],
        estimatedReadTime: '1 minute'
      });
      expect(result.id).toMatch(/^summary_/);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle AI generation failure gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.summarizeGuide(mockGuide);

      expect(result).toMatchObject({
        originalGuideId: 'test-guide-1',
        title: 'Test Guide - Summary',
        summary: 'A 2-step guide covering the main workflow.',
        keyPoints: ['First Step', 'Second Step'],
        quickReference: ['1. First Step', '2. Second Step']
      });
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Invalid JSON response'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.summarizeGuide(mockGuide);

      expect(result.summary).toBe('A 2-step guide covering the main workflow.');
    });
  });

  describe('convertGuideFormat', () => {
    it('should convert guide to PDF format', async () => {
      const options: FormatConversionOptions = {
        format: 'pdf',
        includeImages: true,
        includeAnnotations: true
      };

      const result = await service.convertGuideFormat(mockGuide, options);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should convert guide to text format', async () => {
      const options: FormatConversionOptions = {
        format: 'text',
        includeImages: false,
        includeAnnotations: false
      };

      const result = await service.convertGuideFormat(mockGuide, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('Test Guide');
      expect(result).toContain('First Step');
      expect(result).toContain('Second Step');
    });

    it('should convert guide to HTML format', async () => {
      const options: FormatConversionOptions = {
        format: 'html',
        includeImages: true,
        includeAnnotations: true,
        customStyling: {
          primaryColor: '#007bff',
          fontFamily: 'Arial'
        }
      };

      const result = await service.convertGuideFormat(mockGuide, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Guide');
      expect(result).toContain('#007bff');
      expect(result).toContain('Arial');
    });

    it('should convert guide to markdown format', async () => {
      const options: FormatConversionOptions = {
        format: 'markdown',
        includeImages: true,
        includeAnnotations: true
      };

      const result = await service.convertGuideFormat(mockGuide, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('# Test Guide');
      expect(result).toContain('## 1. First Step');
      expect(result).toContain('## 2. Second Step');
    });

    it('should generate video script', async () => {
      const mockResponse = {
        response: {
          text: () => 'Video script for Test Guide\n\nIntroduction: Welcome to this guide...'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const options: FormatConversionOptions = {
        format: 'video',
        includeImages: false,
        includeAnnotations: false,
        videoOptions: {
          duration: 10,
          voiceOver: true,
          transitions: true
        }
      };

      const result = await service.convertGuideFormat(mockGuide, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('Video script for Test Guide');
    });

    it('should throw error for unsupported format', async () => {
      const options: FormatConversionOptions = {
        format: 'unsupported' as any,
        includeImages: false,
        includeAnnotations: false
      };

      await expect(service.convertGuideFormat(mockGuide, options))
        .rejects.toThrow('Unsupported format: unsupported');
    });
  });

  describe('translateGuide', () => {
    it('should translate guide successfully', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            title: 'Guía de Prueba',
            description: 'Una guía de prueba para pruebas unitarias',
            steps: [
              {
                stepNumber: 1,
                title: 'Primer Paso',
                description: 'Haz clic en el botón de inicio de sesión',
                detailedInstructions: 'Navega a la página de inicio de sesión y haz clic en el botón de inicio de sesión'
              }
            ],
            warnings: ['UI elements kept in original language']
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.translateGuide(mockGuide, 'Spanish');

      expect(result.targetLanguage).toBe('Spanish');
      expect(result.translatedGuide.title).toBe('Guía de Prueba');
      expect(result.translatedGuide.description).toBe('Una guía de prueba para pruebas unitarias');
      expect(result.warnings).toContain('UI elements kept in original language');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle translation failure', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Translation service unavailable'));

      await expect(service.translateGuide(mockGuide, 'Spanish'))
        .rejects.toThrow('Translation failed: Translation service unavailable');
    });

    it('should handle invalid translation response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Invalid JSON'
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      await expect(service.translateGuide(mockGuide, 'Spanish'))
        .rejects.toThrow('Translation failed: Invalid response format');
    });
  });

  describe('assessContentQuality', () => {
    it('should assess content quality successfully', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            overallScore: 8.5,
            scores: {
              clarity: 9,
              completeness: 8,
              accuracy: 9,
              usability: 8,
              accessibility: 7
            },
            suggestions: [
              {
                type: 'accessibility',
                priority: 'medium',
                description: 'Add alt text for images',
                suggestedFix: 'Include descriptive alt text for all screenshots',
                impact: 'Improves accessibility for screen readers'
              }
            ],
            strengths: ['Clear step-by-step structure', 'Good use of screenshots'],
            weaknesses: ['Could use more detailed explanations'],
            readabilityScore: 8,
            estimatedCompletionTime: '3 minutes'
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.assessContentQuality(mockGuide);

      expect(result.overallScore).toBe(8.5);
      expect(result.scores.clarity).toBe(9);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('accessibility');
      expect(result.strengths).toContain('Clear step-by-step structure');
      expect(result.readabilityScore).toBe(8);
    });

    it('should handle quality assessment failure gracefully', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Assessment failed'));

      const result = await service.assessContentQuality(mockGuide);

      expect(result.overallScore).toBe(7);
      expect(result.scores.clarity).toBe(7);
      expect(result.suggestions).toEqual([]);
      expect(result.strengths).toContain('Clear step-by-step structure');
    });
  });

  describe('generateImprovementSuggestions', () => {
    it('should generate improvement suggestions for low-scoring areas', async () => {
      const qualityReport = {
        overallScore: 6,
        scores: {
          clarity: 5,
          completeness: 6,
          accuracy: 8,
          usability: 7,
          accessibility: 4
        },
        suggestions: [],
        strengths: [],
        weaknesses: ['Poor accessibility', 'Unclear instructions'],
        readabilityScore: 6,
        estimatedCompletionTime: '5 minutes'
      };

      const mockResponse = {
        response: {
          text: () => JSON.stringify([
            {
              type: 'clarity',
              priority: 'high',
              description: 'Instructions are too vague',
              suggestedFix: 'Add more specific details about where to click',
              stepNumber: 1,
              impact: 'Users will be less confused about what to do'
            },
            {
              type: 'accessibility',
              priority: 'high',
              description: 'Missing accessibility features',
              suggestedFix: 'Add alt text and keyboard navigation instructions',
              impact: 'Makes guide usable for users with disabilities'
            }
          ])
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateImprovementSuggestions(mockGuide, qualityReport);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('clarity');
      expect(result[0].priority).toBe('high');
      expect(result[1].type).toBe('accessibility');
    });

    it('should return empty array for high-quality guides', async () => {
      const qualityReport = {
        overallScore: 9,
        scores: {
          clarity: 9,
          completeness: 9,
          accuracy: 9,
          usability: 9,
          accessibility: 8
        },
        suggestions: [],
        strengths: [],
        weaknesses: [],
        readabilityScore: 9,
        estimatedCompletionTime: '3 minutes'
      };

      const result = await service.generateImprovementSuggestions(mockGuide, qualityReport);

      expect(result).toEqual([]);
    });

    it('should handle suggestion generation failure', async () => {
      const qualityReport = {
        overallScore: 5,
        scores: {
          clarity: 4,
          completeness: 5,
          accuracy: 6,
          usability: 5,
          accessibility: 4
        },
        suggestions: [],
        strengths: [],
        weaknesses: ['Multiple issues'],
        readabilityScore: 5,
        estimatedCompletionTime: '10 minutes'
      };

      mockModel.generateContent.mockRejectedValue(new Error('Suggestion generation failed'));

      const result = await service.generateImprovementSuggestions(mockGuide, qualityReport);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error when API key is missing', () => {
      delete process.env.GOOGLE_GEMINI_API_KEY;

      expect(() => new AIEnhancementService())
        .toThrow('GOOGLE_GEMINI_API_KEY environment variable is required');
    });
  });

  describe('helper methods', () => {
    it('should estimate read time correctly', () => {
      const readTime = (service as any).estimateReadTime(mockGuide);
      expect(readTime).toMatch(/\d+ minutes?/);
    });

    it('should estimate completion time correctly', () => {
      const completionTime = (service as any).estimateCompletionTime(mockGuide);
      expect(completionTime).toMatch(/\d+ minutes/);
    });

    it('should wrap text correctly', () => {
      const text = 'This is a very long line of text that should be wrapped at a certain length';
      const wrapped = (service as any).wrapText(text, 20);
      
      expect(wrapped).toBeInstanceOf(Array);
      expect(wrapped.every((line: string) => line.length <= 20)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = (service as any).generateId('test');
      const id2 = (service as any).generateId('test');
      
      expect(id1).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});