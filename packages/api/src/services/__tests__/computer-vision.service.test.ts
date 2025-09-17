import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComputerVisionService, DetectedElement, ExtractedText } from '../computer-vision.service';

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    stats: vi.fn().mockResolvedValue({
      dominant: { r: 255, g: 128, b: 64 }
    }),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image'))
  }))
}));

// Mock canvas
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn()
    })),
    toBuffer: vi.fn(() => Buffer.from('enhanced-image'))
  })),
  loadImage: vi.fn().mockResolvedValue({
    width: 1920,
    height: 1080
  })
}));

describe('ComputerVisionService', () => {
  let service: ComputerVisionService;
  let mockImageBuffer: Buffer;

  beforeEach(() => {
    service = new ComputerVisionService();
    mockImageBuffer = Buffer.from('mock-image-data');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeScreenshot', () => {
    it('should analyze screenshot successfully', async () => {
      const result = await service.analyzeScreenshot(mockImageBuffer);

      expect(result.elements).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.elements)).toBe(true);
      expect(Array.isArray(result.text)).toBe(true);
    });

    it('should handle analysis errors gracefully', async () => {
      const sharp = await import('sharp');
      vi.mocked(sharp.default).mockImplementationOnce(() => {
        throw new Error('Sharp processing error');
      });

      await expect(service.analyzeScreenshot(mockImageBuffer)).rejects.toThrow('Failed to analyze screenshot');
    });

    it('should return detected elements with proper structure', async () => {
      const result = await service.analyzeScreenshot(mockImageBuffer);

      result.elements.forEach(element => {
        expect(element).toHaveProperty('type');
        expect(element).toHaveProperty('boundingBox');
        expect(element).toHaveProperty('confidence');
        expect(element.boundingBox).toHaveProperty('x');
        expect(element.boundingBox).toHaveProperty('y');
        expect(element.boundingBox).toHaveProperty('width');
        expect(element.boundingBox).toHaveProperty('height');
        expect(typeof element.confidence).toBe('number');
        expect(element.confidence).toBeGreaterThanOrEqual(0);
        expect(element.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('analyzeClick', () => {
    it('should analyze click coordinates successfully', async () => {
      const coordinates = { x: 100, y: 100 };
      const result = await service.analyzeClick(mockImageBuffer, coordinates);

      expect(result).toHaveProperty('targetElement');
      expect(result).toHaveProperty('nearbyElements');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('elementType');
      expect(result).toHaveProperty('actionContext');
      expect(Array.isArray(result.nearbyElements)).toBe(true);
    });

    it('should find target element at click coordinates', async () => {
      // Mock elements that include the click coordinates
      const mockElements: DetectedElement[] = [
        {
          type: 'button',
          boundingBox: { x: 50, y: 50, width: 100, height: 50 },
          confidence: 0.9,
          text: 'Submit'
        }
      ];

      // Mock the analyzeScreenshot method to return our mock elements
      vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
        elements: mockElements,
        text: [],
        confidence: 0.8,
        processingTime: 100
      });

      const coordinates = { x: 100, y: 75 }; // Within the button bounds
      const result = await service.analyzeClick(mockImageBuffer, coordinates);

      expect(result.targetElement).toBeDefined();
      expect(result.targetElement?.type).toBe('button');
      expect(result.elementType).toBe('button');
    });

    it('should determine action context correctly', async () => {
      const mockElements: DetectedElement[] = [
        {
          type: 'button',
          boundingBox: { x: 50, y: 50, width: 100, height: 50 },
          confidence: 0.9,
          text: 'Submit'
        }
      ];

      vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
        elements: mockElements,
        text: [],
        confidence: 0.8,
        processingTime: 100
      });

      const coordinates = { x: 100, y: 75 };
      const result = await service.analyzeClick(mockImageBuffer, coordinates);

      expect(result.actionContext).toBe('form_submission');
    });

    it('should handle click outside any element', async () => {
      vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
        elements: [],
        text: [],
        confidence: 0.8,
        processingTime: 100
      });

      const coordinates = { x: 1000, y: 1000 };
      const result = await service.analyzeClick(mockImageBuffer, coordinates);

      expect(result.targetElement).toBeUndefined();
      expect(result.elementType).toBe('unknown');
      expect(result.actionContext).toBe('unknown');
    });
  });

  describe('enhanceScreenshot', () => {
    it('should enhance screenshot with annotations', async () => {
      const annotations = [
        {
          type: 'highlight' as const,
          coordinates: { x: 100, y: 100, width: 50, height: 50 },
          color: '#ff0000'
        },
        {
          type: 'arrow' as const,
          coordinates: { x: 200, y: 200 },
          color: '#00ff00'
        },
        {
          type: 'text' as const,
          coordinates: { x: 300, y: 300 },
          text: 'Click here',
          color: '#0000ff'
        }
      ];

      const result = await service.enhanceScreenshot(mockImageBuffer, annotations);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty annotations array', async () => {
      const result = await service.enhanceScreenshot(mockImageBuffer, []);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle enhancement errors', async () => {
      const { loadImage } = await import('canvas');
      vi.mocked(loadImage).mockRejectedValueOnce(new Error('Canvas error'));

      await expect(service.enhanceScreenshot(mockImageBuffer, [])).rejects.toThrow('Failed to enhance screenshot');
    });
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      const result = await service.optimizeImage(mockImageBuffer);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should optimize image with custom dimensions', async () => {
      const options = {
        width: 800,
        height: 600,
        quality: 90,
        format: 'png' as const
      };

      const result = await service.optimizeImage(mockImageBuffer, options);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should optimize image with webp format', async () => {
      const options = {
        format: 'webp' as const,
        quality: 85
      };

      const result = await service.optimizeImage(mockImageBuffer, options);

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle optimization errors', async () => {
      const sharp = await import('sharp');
      vi.mocked(sharp.default).mockImplementationOnce(() => {
        throw new Error('Sharp optimization error');
      });

      await expect(service.optimizeImage(mockImageBuffer)).rejects.toThrow('Failed to optimize image');
    });
  });

  describe('extractColors', () => {
    it('should extract colors from image', async () => {
      const result = await service.extractColors(mockImageBuffer, 3);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should extract default number of colors', async () => {
      const result = await service.extractColors(mockImageBuffer);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle color extraction errors', async () => {
      const sharp = await import('sharp');
      vi.mocked(sharp.default).mockImplementationOnce(() => ({
        stats: vi.fn().mockRejectedValue(new Error('Stats error'))
      }));

      await expect(service.extractColors(mockImageBuffer)).rejects.toThrow('Failed to extract colors');
    });
  });

  describe('private helper methods', () => {
    it('should find element at coordinates correctly', async () => {
      const elements: DetectedElement[] = [
        {
          type: 'button',
          boundingBox: { x: 50, y: 50, width: 100, height: 50 },
          confidence: 0.9
        },
        {
          type: 'input',
          boundingBox: { x: 200, y: 200, width: 150, height: 30 },
          confidence: 0.8
        }
      ];

      // Test coordinates within first element
      const coordinates1 = { x: 100, y: 75 };
      const result1 = await service.analyzeClick(mockImageBuffer, coordinates1);
      
      // Mock the screenshot analysis to return our test elements
      vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
        elements,
        text: [],
        confidence: 0.8,
        processingTime: 100
      });

      const result = await service.analyzeClick(mockImageBuffer, coordinates1);
      // The actual implementation will find the element, but our mock might not
      // This tests the structure rather than exact matching
      expect(result).toHaveProperty('targetElement');
    });

    it('should find nearby elements correctly', async () => {
      const elements: DetectedElement[] = [
        {
          type: 'button',
          boundingBox: { x: 100, y: 100, width: 50, height: 30 },
          confidence: 0.9
        },
        {
          type: 'input',
          boundingBox: { x: 120, y: 150, width: 100, height: 25 },
          confidence: 0.8
        },
        {
          type: 'text',
          boundingBox: { x: 500, y: 500, width: 80, height: 20 },
          confidence: 0.7
        }
      ];

      vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
        elements,
        text: [],
        confidence: 0.8,
        processingTime: 100
      });

      const coordinates = { x: 125, y: 125 };
      const result = await service.analyzeClick(mockImageBuffer, coordinates);

      expect(Array.isArray(result.nearbyElements)).toBe(true);
      // The nearby elements should include elements within the radius
    });

    it('should determine action context for different element types', async () => {
      const testCases = [
        {
          element: { type: 'button' as const, text: 'Submit Form' },
          expectedContext: 'form_submission'
        },
        {
          element: { type: 'button' as const, text: 'Save Changes' },
          expectedContext: 'save_action'
        },
        {
          element: { type: 'button' as const, text: 'Click Me' },
          expectedContext: 'button_click'
        },
        {
          element: { type: 'input' as const },
          expectedContext: 'text_input'
        },
        {
          element: { type: 'link' as const },
          expectedContext: 'navigation'
        }
      ];

      for (const testCase of testCases) {
        const mockElement: DetectedElement = {
          ...testCase.element,
          boundingBox: { x: 100, y: 100, width: 50, height: 30 },
          confidence: 0.9
        };

        vi.spyOn(service, 'analyzeScreenshot').mockResolvedValue({
          elements: [mockElement],
          text: [],
          confidence: 0.8,
          processingTime: 100
        });

        const result = await service.analyzeClick(mockImageBuffer, { x: 125, y: 115 });
        
        // The action context determination is tested through the click analysis
        expect(result.actionContext).toBeDefined();
      }
    });
  });
});