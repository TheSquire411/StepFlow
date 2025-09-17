import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIContentGenerationService, ContentGenerationOptions } from '../ai-content-generation.service';
import { ProcessedStep } from '../step-detection.service';

// Mock Google Generative AI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
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

describe('AIContentGenerationService', () => {
  let service: AIContentGenerationService;
  let mockSteps: ProcessedStep[];
  let mockOptions: ContentGenerationOptions;

  beforeEach(() => {
    // Set up environment variable
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    
    service = new AIContentGenerationService();
    
    mockSteps = [
      {
        id: 'step-1',
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: '#login-button',
        coordinates: { x: 100, y: 200 },
        actionDescription: 'Click the login button',
        confidence: 0.9,
        elementType: 'button',
        elementText: 'Login',
        processedAt: new Date(),
        createdAt: new Date()
      },
      {
        id: 'step-2',
        sessionId: 'session-123',
        timestamp: 2000,
        action: 'type',
        element: '#email-input',
        text: 'user@example.com',
        actionDescription: 'Type email address',
        confidence: 0.8,
        elementType: 'input',
        processedAt: new Date(),
        createdAt: new Date()
      }
    ];

    mockOptions = {
      tone: 'professional',
      length: 'detailed',
      includeScreenshots: true,
      includeTips: true,
      includeWarnings: true,
      includeTroubleshooting: true,
      targetAudience: 'general',
      language: 'en'
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(() => new AIContentGenerationService()).not.toThrow();
    });

    it('should throw error without API key', () => {
      delete process.env.GOOGLE_GEMINI_API_KEY;
      expect(() => new AIContentGenerationService()).toThrow('GOOGLE_GEMINI_API_KEY environment variable is required');
    });
  });

  describe('generateGuide', () => {
    it('should generate a complete guide successfully', async () => {
      // Mock AI responses
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'How to Login to Your Account' }
        })
        .mockResolvedValueOnce({
          response: { text: () => 'This guide will help you log into your account in 2 simple steps.' }
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            estimatedDuration: '2 minutes',
            difficulty: 'beginner',
            tags: ['login', 'authentication'],
            category: 'Account Management'
          })}
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Click Login Button',
            description: 'Navigate to the login section',
            detailedInstructions: 'Locate and click the login button to proceed',
            tips: ['Make sure you are on the correct website'],
            expectedResult: 'Login form should appear'
          })}
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Enter Email',
            description: 'Input your email address',
            detailedInstructions: 'Type your registered email address in the email field',
            tips: ['Double-check for typos'],
            expectedResult: 'Email field should be filled'
          })}
        });

      const guide = await service.generateGuide(mockSteps, mockOptions);

      expect(guide).toBeDefined();
      expect(guide.title).toBe('How to Login to Your Account');
      expect(guide.description).toBe('This guide will help you log into your account in 2 simple steps.');
      expect(guide.steps).toHaveLength(2);
      expect(guide.metadata.totalSteps).toBe(2);
      expect(guide.metadata.difficulty).toBe('beginner');
      expect(guide.confidence).toBeGreaterThan(0);
    });

    it('should handle empty steps array', async () => {
      await expect(service.generateGuide([], mockOptions)).rejects.toThrow('No steps provided for guide generation');
    });

    it('should handle AI service errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service error'));

      await expect(service.generateGuide(mockSteps, mockOptions)).rejects.toThrow('Failed to generate guide');
    });

    it('should use provided title and description', async () => {
      const customTitle = 'Custom Login Guide';
      const customDescription = 'Custom description for login process';

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            estimatedDuration: '2 minutes',
            difficulty: 'beginner',
            tags: ['login'],
            category: 'Account'
          })}
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Step 1',
            description: 'First step',
            detailedInstructions: 'Instructions'
          })}
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Step 2',
            description: 'Second step',
            detailedInstructions: 'Instructions'
          })}
        });

      const guide = await service.generateGuide(mockSteps, mockOptions, customTitle, customDescription);

      expect(guide.title).toBe(customTitle);
      expect(guide.description).toBe(customDescription);
    });
  });

  describe('generateStepContent', () => {
    it('should generate content for all steps', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Click Login Button',
            description: 'Navigate to login',
            detailedInstructions: 'Click the login button'
          })}
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({
            title: 'Enter Email',
            description: 'Input email',
            detailedInstructions: 'Type your email'
          })}
        });

      const generatedSteps = await service.generateStepContent(mockSteps, mockOptions);

      expect(generatedSteps).toHaveLength(2);
      expect(generatedSteps[0].stepNumber).toBe(1);
      expect(generatedSteps[0].title).toBe('Click Login Button');
      expect(generatedSteps[1].stepNumber).toBe(2);
      expect(generatedSteps[1].title).toBe('Enter Email');
    });

    it('should handle step generation failures gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Generation failed'));

      const generatedSteps = await service.generateStepContent(mockSteps, mockOptions);

      expect(generatedSteps).toHaveLength(2);
      // Should fallback to basic content
      expect(generatedSteps[0].title).toBe('Step 1');
      expect(generatedSteps[0].description).toBe('Click the login button');
    });
  });

  describe('generateTitle', () => {
    it('should generate appropriate title', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'How to Login Successfully' }
      });

      const title = await service.generateTitle(mockSteps, mockOptions);

      expect(title).toBe('How to Login Successfully');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('generate a clear and descriptive title'));
    });

    it('should handle title generation failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Title generation failed'));

      const title = await service.generateTitle(mockSteps, mockOptions);

      expect(title).toBe('Step-by-Step Guide');
    });
  });

  describe('generateDescription', () => {
    it('should generate appropriate description', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Learn how to log into your account with this simple 2-step guide.' }
      });

      const description = await service.generateDescription(mockSteps, mockOptions);

      expect(description).toBe('Learn how to log into your account with this simple 2-step guide.');
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('generate a clear and helpful description'));
    });

    it('should handle description generation failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Description generation failed'));

      const description = await service.generateDescription(mockSteps, mockOptions);

      expect(description).toBe('A 2-step guide to complete this workflow.');
    });
  });

  describe('summarizeWorkflow', () => {
    it('should summarize workflow successfully', async () => {
      const mockSummary = {
        summary: 'User login process',
        keyActions: ['Click login', 'Enter email'],
        duration: '2 minutes',
        complexity: 3
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockSummary) }
      });

      const summary = await service.summarizeWorkflow(mockSteps, 150);

      expect(summary.summary).toBe('User login process');
      expect(summary.keyActions).toEqual(['Click login', 'Enter email']);
      expect(summary.duration).toBe('2 minutes');
      expect(summary.complexity).toBe(3);
    });

    it('should handle summarization failure', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Summarization failed'));

      const summary = await service.summarizeWorkflow(mockSteps);

      expect(summary.summary).toBe('A 2-step workflow');
      expect(summary.keyActions).toHaveLength(2);
    });
  });

  describe('assessGuideQuality', () => {
    it('should assess guide quality successfully', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Test Guide',
        description: 'Test description',
        steps: [{
          stepNumber: 1,
          title: 'Step 1',
          description: 'First step',
          detailedInstructions: 'Do this',
          originalStep: mockSteps[0]
        }],
        metadata: {
          totalSteps: 1,
          estimatedDuration: '1 minute',
          difficulty: 'beginner' as const,
          tags: ['test'],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0.8
      };

      const mockAssessment = {
        overallScore: 8,
        clarity: 8,
        completeness: 7,
        accuracy: 9,
        usability: 8,
        suggestions: ['Add more details'],
        issues: []
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockAssessment) }
      });

      const assessment = await service.assessGuideQuality(mockGuide);

      expect(assessment.overallScore).toBe(8);
      expect(assessment.clarity).toBe(8);
      expect(assessment.suggestions).toEqual(['Add more details']);
    });

    it('should handle assessment failure', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Test Guide',
        description: 'Test description',
        steps: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: '0 minutes',
          difficulty: 'beginner' as const,
          tags: [],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0
      };

      mockGenerateContent.mockRejectedValue(new Error('Assessment failed'));

      const assessment = await service.assessGuideQuality(mockGuide);

      expect(assessment.overallScore).toBe(7);
      expect(assessment.suggestions).toEqual([]);
    });
  });

  describe('improveGuideContent', () => {
    it('should improve guide content based on feedback', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Original Title',
        description: 'Original description',
        steps: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: '0 minutes',
          difficulty: 'beginner' as const,
          tags: [],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0
      };

      const improvedContent = {
        title: 'Improved Title',
        description: 'Improved description',
        steps: []
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(improvedContent) }
      });

      const improvedGuide = await service.improveGuideContent(mockGuide, 'Make it clearer');

      expect(improvedGuide.title).toBe('Improved Title');
      expect(improvedGuide.description).toBe('Improved description');
      expect(improvedGuide.generatedAt).not.toEqual(mockGuide.generatedAt);
    });

    it('should return original guide if improvement fails', async () => {
      const mockGuide = {
        id: 'guide-1',
        title: 'Original Title',
        description: 'Original description',
        steps: [],
        metadata: {
          totalSteps: 0,
          estimatedDuration: '0 minutes',
          difficulty: 'beginner' as const,
          tags: [],
          category: 'Test'
        },
        generatedAt: new Date(),
        confidence: 0
      };

      mockGenerateContent.mockRejectedValue(new Error('Improvement failed'));

      const improvedGuide = await service.improveGuideContent(mockGuide, 'Make it better');

      expect(improvedGuide).toEqual(mockGuide);
    });
  });

  describe('utility methods', () => {
    it('should estimate duration correctly', async () => {
      // Test private method through public interface
      const shortSteps = mockSteps.slice(0, 1);
      const longSteps = Array(10).fill(mockSteps[0]);

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({
          estimatedDuration: '30 seconds',
          difficulty: 'beginner',
          tags: [],
          category: 'Test'
        })}
      });

      const shortGuide = await service.generateGuide(shortSteps, mockOptions);
      expect(shortGuide.metadata.estimatedDuration).toBeDefined();
    });

    it('should estimate difficulty correctly', async () => {
      const complexSteps = [
        ...mockSteps,
        {
          id: 'step-3',
          sessionId: 'session-123',
          timestamp: 3000,
          action: 'navigate',
          actionDescription: 'Navigate to dashboard',
          confidence: 0.7,
          processedAt: new Date(),
          createdAt: new Date()
        }
      ];

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({
          estimatedDuration: '5 minutes',
          difficulty: 'intermediate',
          tags: ['navigation'],
          category: 'Navigation'
        })}
      });

      const guide = await service.generateGuide(complexSteps, mockOptions);
      expect(['beginner', 'intermediate', 'advanced']).toContain(guide.metadata.difficulty);
    });

    it('should generate basic tags', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({
          estimatedDuration: '2 minutes',
          difficulty: 'beginner',
          tags: ['login', 'form-filling'],
          category: 'Authentication'
        })}
      });

      const guide = await service.generateGuide(mockSteps, mockOptions);
      expect(Array.isArray(guide.metadata.tags)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Invalid JSON response' }
      });

      const title = await service.generateTitle(mockSteps, mockOptions);
      expect(title).toBe('Step-by-Step Guide'); // Fallback
    });

    it('should handle network timeouts', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Request timeout'));

      await expect(service.generateGuide(mockSteps, mockOptions)).rejects.toThrow('Failed to generate guide');
    });

    it('should handle API rate limits', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(service.generateGuide(mockSteps, mockOptions)).rejects.toThrow('Failed to generate guide');
    });
  });
});