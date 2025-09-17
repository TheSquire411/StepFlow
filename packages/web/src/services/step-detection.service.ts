import { apiClient } from './api.service';

export interface ProcessedStep {
  id: string;
  sessionId: string;
  timestamp: number;
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'focus' | 'submit';
  element?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  url?: string;
  screenshotUrl?: string;
  elementType?: string;
  elementText?: string;
  elementAttributes?: Record<string, string>;
  actionDescription: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processedAt: Date;
  createdAt: Date;
}

export interface StepDetectionResult {
  steps: ProcessedStep[];
  totalSteps: number;
  processingTime: number;
  confidence: number;
}

export interface DetectedElement {
  type: 'button' | 'input' | 'link' | 'image' | 'text' | 'container' | 'unknown';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  text?: string;
  attributes?: Record<string, string>;
}

export interface ImageAnalysisResult {
  elements: DetectedElement[];
  text: Array<{
    text: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  confidence: number;
  processingTime: number;
}

export interface ClickAnalysisResult {
  targetElement?: DetectedElement;
  nearbyElements: DetectedElement[];
  confidence: number;
  elementType: string;
  actionContext: string;
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface AnnotationOptions {
  type: 'highlight' | 'arrow' | 'blur' | 'text';
  coordinates: { x: number; y: number; width?: number; height?: number };
  color?: string;
  text?: string;
}

class StepDetectionService {
  /**
   * Process captured steps for a recording session
   */
  async processSessionSteps(sessionId: string): Promise<StepDetectionResult> {
    try {
      const response = await apiClient.post<{ data: StepDetectionResult }>(
        `/step-detection/sessions/${sessionId}/process`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to process session steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get processed steps for a session
   */
  async getProcessedSteps(sessionId: string): Promise<ProcessedStep[]> {
    try {
      const response = await apiClient.get<{ data: ProcessedStep[] }>(
        `/step-detection/sessions/${sessionId}/steps`
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to get processed steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete processed steps for a session
   */
  async deleteProcessedSteps(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/step-detection/sessions/${sessionId}/steps`);
    } catch (error) {
      throw new Error(`Failed to delete processed steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze screenshot for UI elements
   */
  async analyzeScreenshot(imageFile: File): Promise<ImageAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append('screenshot', imageFile);

      const response = await apiClient.post<{ data: ImageAnalysisResult }>(
        '/step-detection/analyze-screenshot',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to analyze screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze click coordinates on screenshot
   */
  async analyzeClick(imageFile: File, coordinates: { x: number; y: number }): Promise<ClickAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append('screenshot', imageFile);
      formData.append('x', coordinates.x.toString());
      formData.append('y', coordinates.y.toString());

      const response = await apiClient.post<{ data: ClickAnalysisResult }>(
        '/step-detection/analyze-click',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to analyze click: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance screenshot with annotations
   */
  async enhanceScreenshot(imageFile: File, annotations: AnnotationOptions[]): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('screenshot', imageFile);
      formData.append('annotations', JSON.stringify(annotations));

      const response = await apiClient.post(
        '/step-detection/enhance-screenshot',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to enhance screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize image for web delivery
   */
  async optimizeImage(imageFile: File, options: ImageOptimizationOptions = {}): Promise<Blob> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      if (options.width) formData.append('width', options.width.toString());
      if (options.height) formData.append('height', options.height.toString());
      if (options.quality) formData.append('quality', options.quality.toString());
      if (options.format) formData.append('format', options.format);

      const response = await apiClient.post(
        '/step-detection/optimize-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          responseType: 'blob'
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract dominant colors from image
   */
  async extractColors(imageFile: File, count: number = 5): Promise<string[]> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('count', count.toString());

      const response = await apiClient.post<{ data: { colors: string[] } }>(
        '/step-detection/extract-colors',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.data.colors;
    } catch (error) {
      throw new Error(`Failed to extract colors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility methods
   */

  /**
   * Convert confidence score to human-readable text
   */
  getConfidenceText(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    if (confidence >= 0.3) return 'Low';
    return 'Very Low';
  }

  /**
   * Get confidence color for UI display
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return '#10b981'; // green-500
    if (confidence >= 0.7) return '#3b82f6'; // blue-500
    if (confidence >= 0.5) return '#f59e0b'; // amber-500
    if (confidence >= 0.3) return '#ef4444'; // red-500
    return '#6b7280'; // gray-500
  }

  /**
   * Format processing time for display
   */
  formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  /**
   * Group steps by action type
   */
  groupStepsByAction(steps: ProcessedStep[]): Record<string, ProcessedStep[]> {
    return steps.reduce((groups, step) => {
      const action = step.action;
      if (!groups[action]) {
        groups[action] = [];
      }
      groups[action].push(step);
      return groups;
    }, {} as Record<string, ProcessedStep[]>);
  }

  /**
   * Calculate step statistics
   */
  calculateStepStatistics(steps: ProcessedStep[]): {
    totalSteps: number;
    averageConfidence: number;
    actionCounts: Record<string, number>;
    timeSpan: number;
  } {
    if (steps.length === 0) {
      return {
        totalSteps: 0,
        averageConfidence: 0,
        actionCounts: {},
        timeSpan: 0
      };
    }

    const totalConfidence = steps.reduce((sum, step) => sum + step.confidence, 0);
    const averageConfidence = totalConfidence / steps.length;

    const actionCounts = steps.reduce((counts, step) => {
      counts[step.action] = (counts[step.action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const timestamps = steps.map(step => step.timestamp);
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);

    return {
      totalSteps: steps.length,
      averageConfidence,
      actionCounts,
      timeSpan
    };
  }

  /**
   * Filter steps by confidence threshold
   */
  filterStepsByConfidence(steps: ProcessedStep[], minConfidence: number): ProcessedStep[] {
    return steps.filter(step => step.confidence >= minConfidence);
  }

  /**
   * Sort steps by timestamp
   */
  sortStepsByTimestamp(steps: ProcessedStep[]): ProcessedStep[] {
    return [...steps].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Find steps within a time range
   */
  findStepsInTimeRange(steps: ProcessedStep[], startTime: number, endTime: number): ProcessedStep[] {
    return steps.filter(step => step.timestamp >= startTime && step.timestamp <= endTime);
  }
}

export const stepDetectionService = new StepDetectionService();