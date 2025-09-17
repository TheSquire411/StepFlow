import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { StepDetectionService, CapturedStep, ProcessedStep } from '../step-detection.service';

// Mock database
const mockDb = {
  query: vi.fn()
} as unknown as Pool;

describe('StepDetectionService', () => {
  let service: StepDetectionService;

  beforeEach(() => {
    service = new StepDetectionService(mockDb);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processSessionSteps', () => {
    it('should process session steps successfully', async () => {
      const mockRawSteps: CapturedStep[] = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'click',
          element: '#submit-button',
          coordinates: { x: 100, y: 200 },
          text: 'Submit',
          url: 'https://example.com'
        },
        {
          id: 'step-2',
          sessionId: 'session-123',
          timestamp: 2000,
          action: 'type',
          element: '#email-input',
          text: 'user@example.com',
          url: 'https://example.com'
        }
      ];

      // Mock database query for getting raw steps
      vi.mocked(mockDb.query).mockResolvedValueOnce({
        rows: mockRawSteps.map(step => ({
          id: step.id,
          session_id: step.sessionId,
          timestamp: step.timestamp,
          action: step.action,
          element: step.element,
          coordinates: step.coordinates,
          text: step.text,
          url: step.url,
          screenshot_url: step.screenshotUrl,
          created_at: new Date()
        }))
      } as any);

      // Mock database query for storing processed steps
      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.processSessionSteps('session-123');

      expect(result.steps).toHaveLength(2);
      expect(result.totalSteps).toBe(2);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle empty session', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.processSessionSteps('empty-session');

      expect(result.steps).toHaveLength(0);
      expect(result.totalSteps).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(mockDb.query).mockRejectedValueOnce(new Error('Database error'));

      await expect(service.processSessionSteps('session-123')).rejects.toThrow('Failed to process session steps');
    });
  });

  describe('processStep', () => {
    it('should process click step correctly', async () => {
      const rawStep: CapturedStep = {
        id: 'step-1',
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: '#submit-button',
        coordinates: { x: 100, y: 200 },
        text: 'Submit',
        url: 'https://example.com'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.id).toBe('step-1');
      expect(processedStep.action).toBe('click');
      expect(processedStep.elementType).toBe('element');
      expect(processedStep.actionDescription).toContain('Click');
      expect(processedStep.confidence).toBeGreaterThan(0);
      expect(processedStep.processedAt).toBeInstanceOf(Date);
    });

    it('should process type step correctly', async () => {
      const rawStep: CapturedStep = {
        id: 'step-2',
        sessionId: 'session-123',
        timestamp: 2000,
        action: 'type',
        element: 'input.email',
        text: 'user@example.com',
        url: 'https://example.com'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.action).toBe('type');
      expect(processedStep.elementType).toBe('input');
      expect(processedStep.actionDescription).toContain('Type "user@example.com"');
      expect(processedStep.elementAttributes?.class).toBe('email');
    });

    it('should handle sensitive input', async () => {
      const rawStep: CapturedStep = {
        id: 'step-3',
        sessionId: 'session-123',
        timestamp: 3000,
        action: 'type',
        element: '#password',
        text: 'secretpassword123',
        url: 'https://example.com'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.actionDescription).toBe('Enter text in the input field');
      expect(processedStep.actionDescription).not.toContain('secretpassword123');
    });

    it('should process navigation step correctly', async () => {
      const rawStep: CapturedStep = {
        id: 'step-4',
        sessionId: 'session-123',
        timestamp: 4000,
        action: 'navigate',
        url: 'https://example.com/dashboard'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.action).toBe('navigate');
      expect(processedStep.actionDescription).toContain('Navigate to example.com');
    });
  });

  describe('element selector parsing', () => {
    it('should parse ID selectors', async () => {
      const rawStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: '#submit-button'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.elementType).toBe('element');
      expect(processedStep.elementAttributes?.id).toBe('submit-button');
    });

    it('should parse class selectors', async () => {
      const rawStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: 'button.primary.large'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.elementType).toBe('button');
      expect(processedStep.elementAttributes?.class).toBe('primary large');
    });

    it('should parse attribute selectors', async () => {
      const rawStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: '[data-testid="submit-btn"]'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.elementType).toBe('element');
      expect(processedStep.elementAttributes?.['data-testid']).toBe('submit-btn');
    });

    it('should parse text-based selectors', async () => {
      const rawStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: 'button[text="Click me"]'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.elementType).toBe('button');
      expect(processedStep.elementAttributes?.text).toBe('Click me');
    });

    it('should parse nth-child selectors', async () => {
      const rawStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'click',
        element: 'button:nth-child(2)'
      };

      const processedStep = await service.processStep(rawStep);

      expect(processedStep.elementType).toBe('button');
      expect(processedStep.elementAttributes?.position).toBe('2');
    });
  });

  describe('step optimization', () => {
    it('should merge consecutive typing actions', async () => {
      const mockRawSteps: CapturedStep[] = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'type',
          element: '#email',
          text: 'user'
        },
        {
          id: 'step-2',
          sessionId: 'session-123',
          timestamp: 2000,
          action: 'type',
          element: '#email',
          text: '@example.com'
        }
      ];

      vi.mocked(mockDb.query).mockResolvedValueOnce({
        rows: mockRawSteps.map(step => ({
          id: step.id,
          session_id: step.sessionId,
          timestamp: step.timestamp,
          action: step.action,
          element: step.element,
          text: step.text,
          created_at: new Date()
        }))
      } as any);

      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.processSessionSteps('session-123');

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].text).toBe('user@example.com');
      expect(result.steps[0].actionDescription).toContain('Type "user@example.com"');
    });

    it('should merge consecutive scroll actions', async () => {
      const mockRawSteps: CapturedStep[] = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'scroll',
          coordinates: { x: 0, y: 100 }
        },
        {
          id: 'step-2',
          sessionId: 'session-123',
          timestamp: 1500,
          action: 'scroll',
          coordinates: { x: 0, y: 200 }
        }
      ];

      vi.mocked(mockDb.query).mockResolvedValueOnce({
        rows: mockRawSteps.map(step => ({
          id: step.id,
          session_id: step.sessionId,
          timestamp: step.timestamp,
          action: step.action,
          coordinates: step.coordinates,
          created_at: new Date()
        }))
      } as any);

      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.processSessionSteps('session-123');

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].actionDescription).toBe('Scroll the page');
    });

    it('should not merge different actions', async () => {
      const mockRawSteps: CapturedStep[] = [
        {
          id: 'step-1',
          sessionId: 'session-123',
          timestamp: 1000,
          action: 'click',
          element: '#button1'
        },
        {
          id: 'step-2',
          sessionId: 'session-123',
          timestamp: 2000,
          action: 'type',
          element: '#input1',
          text: 'test'
        }
      ];

      vi.mocked(mockDb.query).mockResolvedValueOnce({
        rows: mockRawSteps.map(step => ({
          id: step.id,
          session_id: step.sessionId,
          timestamp: step.timestamp,
          action: step.action,
          element: step.element,
          text: step.text,
          created_at: new Date()
        }))
      } as any);

      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.processSessionSteps('session-123');

      expect(result.steps).toHaveLength(2);
    });
  });

  describe('getProcessedSteps', () => {
    it('should retrieve processed steps successfully', async () => {
      const mockProcessedSteps = [
        {
          id: 'step-1',
          session_id: 'session-123',
          timestamp: 1000,
          action: 'click',
          element: '#button',
          action_description: 'Click the button',
          confidence: 0.8,
          processed_at: new Date(),
          created_at: new Date()
        }
      ];

      vi.mocked(mockDb.query).mockResolvedValueOnce({ rows: mockProcessedSteps } as any);

      const steps = await service.getProcessedSteps('session-123');

      expect(steps).toHaveLength(1);
      expect(steps[0].id).toBe('step-1');
      expect(steps[0].actionDescription).toBe('Click the button');
      expect(steps[0].confidence).toBe(0.8);
    });
  });

  describe('deleteProcessedSteps', () => {
    it('should delete processed steps successfully', async () => {
      vi.mocked(mockDb.query).mockResolvedValueOnce({ rowCount: 3 } as any);

      await service.deleteProcessedSteps('session-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM processed_steps WHERE session_id = $1',
        ['session-123']
      );
    });
  });

  describe('utility functions', () => {
    it('should detect sensitive input', async () => {
      const sensitiveStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'type',
        text: 'mypassword123'
      };

      const processedStep = await service.processStep(sensitiveStep);
      expect(processedStep.actionDescription).toBe('Enter text in the input field');
    });

    it('should detect email format', async () => {
      const emailStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'type',
        element: 'input',
        text: 'user@example.com'
      };

      const processedStep = await service.processStep(emailStep);
      expect(processedStep.elementAttributes?.inputType).toBe('email');
    });

    it('should extract domain from URL', async () => {
      const navStep: CapturedStep = {
        sessionId: 'session-123',
        timestamp: 1000,
        action: 'navigate',
        url: 'https://subdomain.example.com/path?query=1'
      };

      const processedStep = await service.processStep(navStep);
      expect(processedStep.actionDescription).toContain('subdomain.example.com');
    });
  });
});