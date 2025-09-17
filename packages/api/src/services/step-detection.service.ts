import { Pool } from 'pg';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface CapturedStep {
  id?: string;
  sessionId: string;
  timestamp: number;
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'focus' | 'submit';
  element?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  url?: string;
  screenshotUrl?: string;
  createdAt?: Date;
}

export interface ProcessedStep extends CapturedStep {
  id: string;
  elementType?: string;
  elementText?: string;
  elementAttributes?: Record<string, string>;
  actionDescription?: string;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  processedAt: Date;
}

export interface StepDetectionResult {
  steps: ProcessedStep[];
  totalSteps: number;
  processingTime: number;
  confidence: number;
}

export class StepDetectionService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Process captured steps for a recording session
   */
  async processSessionSteps(sessionId: string): Promise<StepDetectionResult> {
    const startTime = Date.now();

    try {
      // Get all captured steps for the session
      const rawSteps = await this.getRawSteps(sessionId);
      
      if (rawSteps.length === 0) {
        return {
          steps: [],
          totalSteps: 0,
          processingTime: Date.now() - startTime,
          confidence: 0
        };
      }

      // Process each step
      const processedSteps: ProcessedStep[] = [];
      let totalConfidence = 0;

      for (const rawStep of rawSteps) {
        const processedStep = await this.processStep(rawStep);
        processedSteps.push(processedStep);
        totalConfidence += processedStep.confidence || 0;
      }

      // Calculate average confidence
      const averageConfidence = totalConfidence / processedSteps.length;

      // Store processed steps
      await this.storeProcessedSteps(processedSteps);

      // Group and merge similar steps
      const optimizedSteps = this.optimizeSteps(processedSteps);

      return {
        steps: optimizedSteps,
        totalSteps: optimizedSteps.length,
        processingTime: Date.now() - startTime,
        confidence: averageConfidence
      };
    } catch (error) {
      throw new Error(`Failed to process session steps: ${error.message}`);
    }
  }

  /**
   * Process a single captured step
   */
  async processStep(rawStep: CapturedStep): Promise<ProcessedStep> {
    const processedStep: ProcessedStep = {
      ...rawStep,
      id: rawStep.id || uuidv4(),
      processedAt: new Date(),
      confidence: 0.8 // Default confidence
    };

    try {
      // Extract element information from selector
      if (rawStep.element) {
        const elementInfo = this.parseElementSelector(rawStep.element);
        processedStep.elementType = elementInfo.type;
        processedStep.elementAttributes = elementInfo.attributes;
      }

      // Process screenshot if available
      if (rawStep.screenshotUrl) {
        const imageAnalysis = await this.analyzeScreenshot(rawStep.screenshotUrl, rawStep.coordinates);
        processedStep.boundingBox = imageAnalysis.boundingBox;
        processedStep.elementText = imageAnalysis.elementText;
        processedStep.confidence = imageAnalysis.confidence;
      }

      // Generate action description
      processedStep.actionDescription = this.generateActionDescription(processedStep);

      // Enhance step based on context
      await this.enhanceStepContext(processedStep);

      return processedStep;
    } catch (error) {
      console.error(`Failed to process step ${rawStep.id}:`, error);
      // Return step with lower confidence if processing fails
      processedStep.confidence = 0.3;
      processedStep.actionDescription = this.generateBasicActionDescription(rawStep);
      return processedStep;
    }
  }

  /**
   * Get raw steps from database
   */
  private async getRawSteps(sessionId: string): Promise<CapturedStep[]> {
    const query = `
      SELECT id, session_id, timestamp, action, element, coordinates, text, url, screenshot_url, created_at
      FROM recording_steps
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.db.query(query, [sessionId]);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      action: row.action,
      element: row.element,
      coordinates: row.coordinates,
      text: row.text,
      url: row.url,
      screenshotUrl: row.screenshot_url,
      createdAt: row.created_at
    }));
  }

  /**
   * Parse element selector to extract type and attributes
   */
  private parseElementSelector(selector: string): { type: string; attributes: Record<string, string> } {
    const attributes: Record<string, string> = {};
    let type = 'unknown';

    try {
      // Handle ID selectors (#id)
      if (selector.startsWith('#')) {
        type = 'element';
        attributes.id = selector.substring(1);
        return { type, attributes };
      }

      // Handle class selectors (.class)
      if (selector.includes('.')) {
        const parts = selector.split('.');
        type = parts[0] || 'element';
        attributes.class = parts.slice(1).join(' ');
        return { type, attributes };
      }

      // Handle attribute selectors ([attr="value"])
      const attrMatch = selector.match(/\[([^=]+)="([^"]+)"\]/);
      if (attrMatch) {
        type = 'element';
        attributes[attrMatch[1]] = attrMatch[2];
        return { type, attributes };
      }

      // Handle text-based selectors (button[text="Click me"])
      const textMatch = selector.match(/(\w+)\[text="([^"]+)"\]/);
      if (textMatch) {
        type = textMatch[1];
        attributes.text = textMatch[2];
        return { type, attributes };
      }

      // Handle nth-child selectors
      const nthMatch = selector.match(/(\w+):nth-child\((\d+)\)/);
      if (nthMatch) {
        type = nthMatch[1];
        attributes.position = nthMatch[2];
        return { type, attributes };
      }

      // Default to tag name
      type = selector.toLowerCase();
    } catch (error) {
      console.error('Failed to parse element selector:', selector, error);
    }

    return { type, attributes };
  }

  /**
   * Analyze screenshot to extract element information
   */
  private async analyzeScreenshot(screenshotUrl: string, coordinates?: { x: number; y: number }): Promise<{
    boundingBox?: { x: number; y: number; width: number; height: number };
    elementText?: string;
    confidence: number;
  }> {
    try {
      // For now, return basic analysis based on coordinates
      // In a real implementation, this would use computer vision APIs
      // like Google Vision API, AWS Rekognition, or custom ML models
      
      if (coordinates) {
        // Estimate bounding box around click coordinates
        const estimatedSize = 100; // Default element size
        const boundingBox = {
          x: Math.max(0, coordinates.x - estimatedSize / 2),
          y: Math.max(0, coordinates.y - estimatedSize / 2),
          width: estimatedSize,
          height: estimatedSize
        };

        return {
          boundingBox,
          confidence: 0.7
        };
      }

      return { confidence: 0.5 };
    } catch (error) {
      console.error('Failed to analyze screenshot:', error);
      return { confidence: 0.3 };
    }
  }

  /**
   * Generate human-readable action description
   */
  private generateActionDescription(step: ProcessedStep): string {
    const { action, elementType, elementText, text, url } = step;

    switch (action) {
      case 'click':
        if (elementText) {
          return `Click on "${elementText}"`;
        }
        if (elementType === 'button') {
          return 'Click the button';
        }
        if (elementType === 'a') {
          return 'Click the link';
        }
        return 'Click on the element';

      case 'type':
        if (text) {
          // Don't expose sensitive information
          if (this.isSensitiveInput(text)) {
            return 'Enter text in the input field';
          }
          return `Type "${text}"`;
        }
        return 'Enter text';

      case 'navigate':
        if (url) {
          const domain = this.extractDomain(url);
          return `Navigate to ${domain}`;
        }
        return 'Navigate to a new page';

      case 'scroll':
        return 'Scroll the page';

      case 'hover':
        if (elementText) {
          return `Hover over "${elementText}"`;
        }
        return 'Hover over the element';

      case 'focus':
        return 'Focus on the input field';

      case 'submit':
        return 'Submit the form';

      default:
        return `Perform ${action} action`;
    }
  }

  /**
   * Generate basic action description for fallback
   */
  private generateBasicActionDescription(step: CapturedStep): string {
    return `${step.action.charAt(0).toUpperCase() + step.action.slice(1)} action`;
  }

  /**
   * Enhance step with additional context
   */
  private async enhanceStepContext(step: ProcessedStep): Promise<void> {
    try {
      // Add context based on previous steps
      // This could include detecting workflows, form filling patterns, etc.
      
      // For now, just add basic enhancements
      if (step.action === 'type' && step.elementType === 'input') {
        // Try to determine input type from context
        if (step.text && this.isEmailFormat(step.text)) {
          step.elementAttributes = { ...step.elementAttributes, inputType: 'email' };
        }
      }

      if (step.action === 'click' && step.elementType === 'button') {
        // Enhance button context
        if (step.elementText?.toLowerCase().includes('submit')) {
          step.elementAttributes = { ...step.elementAttributes, buttonType: 'submit' };
        }
      }
    } catch (error) {
      console.error('Failed to enhance step context:', error);
    }
  }

  /**
   * Store processed steps in database
   */
  private async storeProcessedSteps(steps: ProcessedStep[]): Promise<void> {
    if (steps.length === 0) return;

    const query = `
      INSERT INTO processed_steps (
        id, session_id, timestamp, action, element, coordinates, text, url, screenshot_url,
        element_type, element_text, element_attributes, action_description, confidence,
        bounding_box, processed_at, created_at
      ) VALUES ${steps.map((_, i) => `($${i * 17 + 1}, $${i * 17 + 2}, $${i * 17 + 3}, $${i * 17 + 4}, $${i * 17 + 5}, $${i * 17 + 6}, $${i * 17 + 7}, $${i * 17 + 8}, $${i * 17 + 9}, $${i * 17 + 10}, $${i * 17 + 11}, $${i * 17 + 12}, $${i * 17 + 13}, $${i * 17 + 14}, $${i * 17 + 15}, $${i * 17 + 16}, $${i * 17 + 17})`).join(', ')}
      ON CONFLICT (id) DO UPDATE SET
        element_type = EXCLUDED.element_type,
        element_text = EXCLUDED.element_text,
        element_attributes = EXCLUDED.element_attributes,
        action_description = EXCLUDED.action_description,
        confidence = EXCLUDED.confidence,
        bounding_box = EXCLUDED.bounding_box,
        processed_at = EXCLUDED.processed_at
    `;

    const values: any[] = [];
    steps.forEach(step => {
      values.push(
        step.id,
        step.sessionId,
        step.timestamp,
        step.action,
        step.element,
        step.coordinates ? JSON.stringify(step.coordinates) : null,
        step.text,
        step.url,
        step.screenshotUrl,
        step.elementType,
        step.elementText,
        step.elementAttributes ? JSON.stringify(step.elementAttributes) : null,
        step.actionDescription,
        step.confidence,
        step.boundingBox ? JSON.stringify(step.boundingBox) : null,
        step.processedAt,
        step.createdAt || new Date()
      );
    });

    await this.db.query(query, values);
  }

  /**
   * Optimize steps by grouping and merging similar actions
   */
  private optimizeSteps(steps: ProcessedStep[]): ProcessedStep[] {
    if (steps.length === 0) return steps;

    const optimized: ProcessedStep[] = [];
    let currentGroup: ProcessedStep[] = [steps[0]];

    for (let i = 1; i < steps.length; i++) {
      const currentStep = steps[i];
      const lastStep = currentGroup[currentGroup.length - 1];

      // Check if steps can be grouped
      if (this.canGroupSteps(lastStep, currentStep)) {
        currentGroup.push(currentStep);
      } else {
        // Process current group and start new one
        const mergedStep = this.mergeStepGroup(currentGroup);
        optimized.push(mergedStep);
        currentGroup = [currentStep];
      }
    }

    // Process final group
    if (currentGroup.length > 0) {
      const mergedStep = this.mergeStepGroup(currentGroup);
      optimized.push(mergedStep);
    }

    return optimized;
  }

  /**
   * Check if two steps can be grouped together
   */
  private canGroupSteps(step1: ProcessedStep, step2: ProcessedStep): boolean {
    // Group consecutive typing actions in the same element
    if (step1.action === 'type' && step2.action === 'type' && 
        step1.element === step2.element &&
        step2.timestamp - step1.timestamp < 5000) { // Within 5 seconds
      return true;
    }

    // Group rapid scroll actions
    if (step1.action === 'scroll' && step2.action === 'scroll' &&
        step2.timestamp - step1.timestamp < 1000) { // Within 1 second
      return true;
    }

    return false;
  }

  /**
   * Merge a group of similar steps into one
   */
  private mergeStepGroup(steps: ProcessedStep[]): ProcessedStep {
    if (steps.length === 1) return steps[0];

    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];

    // For typing actions, combine the text
    if (firstStep.action === 'type') {
      const combinedText = steps
        .map(s => s.text)
        .filter(Boolean)
        .join('');

      return {
        ...firstStep,
        text: combinedText,
        actionDescription: combinedText ? `Type "${combinedText}"` : 'Enter text',
        timestamp: lastStep.timestamp, // Use last timestamp
        confidence: Math.max(...steps.map(s => s.confidence || 0))
      };
    }

    // For scroll actions, just use the last position
    if (firstStep.action === 'scroll') {
      return {
        ...lastStep,
        actionDescription: 'Scroll the page',
        confidence: Math.max(...steps.map(s => s.confidence || 0))
      };
    }

    return firstStep;
  }

  /**
   * Utility functions
   */
  private isSensitiveInput(text: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /\d{4}-\d{4}-\d{4}-\d{4}/, // Credit card pattern
      /\d{3}-\d{2}-\d{4}/, // SSN pattern
    ];

    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  private isEmailFormat(text: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text);
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Get processed steps for a session
   */
  async getProcessedSteps(sessionId: string): Promise<ProcessedStep[]> {
    const query = `
      SELECT * FROM processed_steps
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.db.query(query, [sessionId]);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      action: row.action,
      element: row.element,
      coordinates: row.coordinates,
      text: row.text,
      url: row.url,
      screenshotUrl: row.screenshot_url,
      elementType: row.element_type,
      elementText: row.element_text,
      elementAttributes: row.element_attributes,
      actionDescription: row.action_description,
      confidence: row.confidence,
      boundingBox: row.bounding_box,
      processedAt: row.processed_at,
      createdAt: row.created_at
    }));
  }

  /**
   * Delete processed steps for a session
   */
  async deleteProcessedSteps(sessionId: string): Promise<void> {
    const query = 'DELETE FROM processed_steps WHERE session_id = $1';
    await this.db.query(query, [sessionId]);
  }
}