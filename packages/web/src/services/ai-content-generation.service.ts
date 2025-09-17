import { apiClient } from './api.service';
import { ProcessedStep } from './step-detection.service';

export interface GeneratedGuide {
  id: string;
  title: string;
  description: string;
  steps: GeneratedStep[];
  metadata: {
    totalSteps: number;
    estimatedDuration: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    category: string;
  };
  generatedAt: Date;
  confidence: number;
}

export interface GeneratedStep {
  stepNumber: number;
  title: string;
  description: string;
  detailedInstructions: string;
  tips?: string[];
  warnings?: string[];
  expectedResult?: string;
  troubleshooting?: string[];
  originalStep: ProcessedStep;
}

export interface ContentGenerationOptions {
  tone: 'professional' | 'casual' | 'technical' | 'beginner-friendly';
  length: 'concise' | 'detailed' | 'comprehensive';
  includeScreenshots: boolean;
  includeTips: boolean;
  includeWarnings: boolean;
  includeTroubleshooting: boolean;
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'general';
  language: string;
  customInstructions?: string;
}

export interface StepSummary {
  summary: string;
  keyActions: string[];
  duration: string;
  complexity: number;
}

export interface GuideQualityAssessment {
  overallScore: number;
  clarity: number;
  completeness: number;
  accuracy: number;
  usability: number;
  suggestions: string[];
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    stepNumber?: number;
  }>;
}

export interface ContentGenerationOptionsConfig {
  tones: string[];
  lengths: string[];
  targetAudiences: string[];
  languages: string[];
  features: Record<string, string>;
}

class AIContentGenerationService {
  /**
   * Generate a complete guide from a recording session
   */
  async generateGuideFromSession(
    sessionId: string,
    options: Partial<ContentGenerationOptions> & { title?: string; description?: string }
  ): Promise<GeneratedGuide> {
    try {
      const response = await apiClient.post<{ data: GeneratedGuide }>(
        `/ai-content/sessions/${sessionId}/generate-guide`,
        options
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to generate guide from session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content for specific steps
   */
  async generateStepContent(steps: ProcessedStep[], options: ContentGenerationOptions): Promise<GeneratedStep[]> {
    try {
      const response = await apiClient.post<{ data: GeneratedStep[] }>(
        '/ai-content/generate-step-content',
        { steps, options }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to generate step content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a title for a workflow
   */
  async generateTitle(steps: ProcessedStep[], options: Partial<ContentGenerationOptions> = {}): Promise<string> {
    try {
      const response = await apiClient.post<{ data: { title: string } }>(
        '/ai-content/generate-title',
        { steps, options }
      );
      return response.data.data.title;
    } catch (error) {
      throw new Error(`Failed to generate title: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a description for a workflow
   */
  async generateDescription(steps: ProcessedStep[], options: Partial<ContentGenerationOptions> = {}): Promise<string> {
    try {
      const response = await apiClient.post<{ data: { description: string } }>(
        '/ai-content/generate-description',
        { steps, options }
      );
      return response.data.data.description;
    } catch (error) {
      throw new Error(`Failed to generate description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Summarize a workflow
   */
  async summarizeWorkflow(steps: ProcessedStep[], maxLength: number = 200): Promise<StepSummary> {
    try {
      const response = await apiClient.post<{ data: StepSummary }>(
        '/ai-content/summarize-workflow',
        { steps, maxLength }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to summarize workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assess guide quality
   */
  async assessGuideQuality(guide: GeneratedGuide): Promise<GuideQualityAssessment> {
    try {
      const response = await apiClient.post<{ data: GuideQualityAssessment }>(
        '/ai-content/assess-quality',
        { guide }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to assess guide quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Improve guide content based on feedback
   */
  async improveGuideContent(guide: GeneratedGuide, feedback: string): Promise<GeneratedGuide> {
    try {
      const response = await apiClient.post<{ data: GeneratedGuide }>(
        '/ai-content/improve-guide',
        { guide, feedback }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to improve guide content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available content generation options
   */
  async getContentOptions(): Promise<ContentGenerationOptionsConfig> {
    try {
      const response = await apiClient.get<{ data: ContentGenerationOptionsConfig }>('/ai-content/options');
      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to get content options: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      const response = await apiClient.get<{ status: string; message: string }>('/ai-content/health');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to check AI service health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility methods
   */

  /**
   * Get default content generation options
   */
  getDefaultOptions(): ContentGenerationOptions {
    return {
      tone: 'professional',
      length: 'detailed',
      includeScreenshots: true,
      includeTips: true,
      includeWarnings: true,
      includeTroubleshooting: true,
      targetAudience: 'general',
      language: 'en'
    };
  }

  /**
   * Validate content generation options
   */
  validateOptions(options: Partial<ContentGenerationOptions>): string[] {
    const errors: string[] = [];

    if (options.tone && !['professional', 'casual', 'technical', 'beginner-friendly'].includes(options.tone)) {
      errors.push('Invalid tone. Must be one of: professional, casual, technical, beginner-friendly');
    }

    if (options.length && !['concise', 'detailed', 'comprehensive'].includes(options.length)) {
      errors.push('Invalid length. Must be one of: concise, detailed, comprehensive');
    }

    if (options.targetAudience && !['beginner', 'intermediate', 'advanced', 'general'].includes(options.targetAudience)) {
      errors.push('Invalid target audience. Must be one of: beginner, intermediate, advanced, general');
    }

    if (options.language && typeof options.language !== 'string') {
      errors.push('Language must be a string');
    }

    return errors;
  }

  /**
   * Get confidence level description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.8) return 'Very Good';
    if (confidence >= 0.7) return 'Good';
    if (confidence >= 0.6) return 'Fair';
    if (confidence >= 0.5) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get confidence color for UI
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981'; // green-500
    if (confidence >= 0.6) return '#3b82f6'; // blue-500
    if (confidence >= 0.4) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  }

  /**
   * Format quality score for display
   */
  formatQualityScore(score: number): string {
    return `${Math.round(score * 10)}/10`;
  }

  /**
   * Get quality score color
   */
  getQualityScoreColor(score: number): string {
    if (score >= 8) return '#10b981'; // green-500
    if (score >= 6) return '#3b82f6'; // blue-500
    if (score >= 4) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  }

  /**
   * Estimate reading time for guide
   */
  estimateReadingTime(guide: GeneratedGuide): string {
    const wordsPerMinute = 200;
    const totalWords = guide.steps.reduce((total, step) => {
      const stepWords = (step.title + ' ' + step.description + ' ' + step.detailedInstructions).split(' ').length;
      return total + stepWords;
    }, 0);

    const minutes = Math.ceil(totalWords / wordsPerMinute);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  /**
   * Get difficulty badge color
   */
  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'beginner': return '#10b981'; // green-500
      case 'intermediate': return '#f59e0b'; // amber-500
      case 'advanced': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  }

  /**
   * Format step count
   */
  formatStepCount(count: number): string {
    return count === 1 ? '1 step' : `${count} steps`;
  }

  /**
   * Get category icon (for UI display)
   */
  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'Authentication': '🔐',
      'Navigation': '🧭',
      'Form Filling': '📝',
      'Account Management': '👤',
      'Settings': '⚙️',
      'Shopping': '🛒',
      'Communication': '💬',
      'File Management': '📁',
      'General': '📋'
    };

    return iconMap[category] || '📋';
  }

  /**
   * Generate guide preview text
   */
  generatePreviewText(guide: GeneratedGuide, maxLength: number = 150): string {
    let preview = guide.description;
    
    if (preview.length <= maxLength) {
      return preview;
    }

    // Truncate at word boundary
    const truncated = preview.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Check if guide needs improvement
   */
  needsImprovement(assessment: GuideQualityAssessment): boolean {
    return assessment.overallScore < 7 || assessment.issues.some(issue => issue.type === 'error');
  }

  /**
   * Get improvement priority
   */
  getImprovementPriority(assessment: GuideQualityAssessment): 'low' | 'medium' | 'high' {
    const errorCount = assessment.issues.filter(issue => issue.type === 'error').length;
    const warningCount = assessment.issues.filter(issue => issue.type === 'warning').length;

    if (errorCount > 0 || assessment.overallScore < 5) return 'high';
    if (warningCount > 2 || assessment.overallScore < 7) return 'medium';
    return 'low';
  }

  /**
   * Generate improvement suggestions summary
   */
  generateImprovementSummary(assessment: GuideQualityAssessment): string {
    const priority = this.getImprovementPriority(assessment);
    const issueCount = assessment.issues.length;
    const suggestionCount = assessment.suggestions.length;

    if (priority === 'high') {
      return `This guide needs significant improvement. ${issueCount} issues found.`;
    } else if (priority === 'medium') {
      return `This guide could be improved. ${suggestionCount} suggestions available.`;
    } else {
      return 'This guide is in good shape with minor improvements possible.';
    }
  }
}

export const aiContentGenerationService = new AIContentGenerationService();