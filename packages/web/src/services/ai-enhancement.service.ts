import { apiClient } from './api.service';

export interface GuideSummary {
  id: string;
  originalGuideId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  quickReference: string[];
  estimatedReadTime: string;
  createdAt: Date;
}

export interface FormatConversionOptions {
  format: 'video' | 'pdf' | 'text' | 'html' | 'markdown';
  includeImages: boolean;
  includeAnnotations: boolean;
  customStyling?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  };
  videoOptions?: {
    duration: number; // seconds per step
    voiceOver: boolean;
    transitions: boolean;
  };
}

export interface TranslationResult {
  id: string;
  originalGuideId: string;
  targetLanguage: string;
  translatedGuide: any; // GeneratedGuide type
  confidence: number;
  warnings: string[];
  createdAt: Date;
}

export interface QualityImprovementSuggestion {
  type: 'clarity' | 'completeness' | 'accuracy' | 'usability' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
  description: string;
  suggestedFix: string;
  stepNumber?: number;
  impact: string;
}

export interface ContentQualityReport {
  overallScore: number;
  scores: {
    clarity: number;
    completeness: number;
    accuracy: number;
    usability: number;
    accessibility: number;
  };
  suggestions: QualityImprovementSuggestion[];
  strengths: string[];
  weaknesses: string[];
  readabilityScore: number;
  estimatedCompletionTime: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface SupportedFormat {
  format: string;
  name: string;
  description: string;
  features: string[];
}

export class AIEnhancementService {
  private baseUrl = '/api/v1/ai-enhancement';

  /**
   * Generate a summary of a guide
   */
  async summarizeGuide(guideId: string): Promise<GuideSummary> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/guides/${guideId}/summarize`);
      return response.data;
    } catch (error) {
      console.error('Failed to summarize guide:', error);
      throw new Error('Failed to generate guide summary');
    }
  }

  /**
   * Convert guide to different format
   */
  async convertGuideFormat(guideId: string, options: FormatConversionOptions): Promise<Blob | string> {
    try {
      const config: any = {
        responseType: options.format === 'pdf' ? 'blob' : 'json'
      };

      const response = await apiClient.post(
        `${this.baseUrl}/guides/${guideId}/convert`,
        options,
        config
      );

      if (options.format === 'pdf') {
        return response.data as Blob;
      } else if (options.format === 'html' || options.format === 'text' || 
                 options.format === 'markdown' || options.format === 'video') {
        return response.data as string;
      } else {
        return response.data.content;
      }
    } catch (error) {
      console.error('Failed to convert guide format:', error);
      throw new Error(`Failed to convert guide to ${options.format} format`);
    }
  }

  /**
   * Translate guide to different language
   */
  async translateGuide(guideId: string, targetLanguage: string): Promise<TranslationResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/guides/${guideId}/translate`, {
        targetLanguage
      });
      return response.data;
    } catch (error) {
      console.error('Failed to translate guide:', error);
      throw new Error(`Failed to translate guide to ${targetLanguage}`);
    }
  }

  /**
   * Assess content quality and get improvement suggestions
   */
  async assessContentQuality(guideId: string): Promise<{
    qualityReport: ContentQualityReport;
    suggestions: QualityImprovementSuggestion[];
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/guides/${guideId}/quality-assessment`);
      return response.data;
    } catch (error) {
      console.error('Failed to assess content quality:', error);
      throw new Error('Failed to assess content quality');
    }
  }

  /**
   * Get improvement suggestions for a guide
   */
  async getImprovementSuggestions(guideId: string): Promise<{
    overallScore: number;
    suggestions: QualityImprovementSuggestion[];
    priorityCount: {
      high: number;
      medium: number;
      low: number;
    };
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/guides/${guideId}/improvement-suggestions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get improvement suggestions:', error);
      throw new Error('Failed to get improvement suggestions');
    }
  }

  /**
   * Get supported languages for translation
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/supported-languages`);
      return response.data;
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      throw new Error('Failed to get supported languages');
    }
  }

  /**
   * Get supported export formats
   */
  async getSupportedFormats(): Promise<SupportedFormat[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/supported-formats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get supported formats:', error);
      throw new Error('Failed to get supported formats');
    }
  }

  /**
   * Download converted guide as file
   */
  async downloadGuide(guideId: string, options: FormatConversionOptions, filename?: string): Promise<void> {
    try {
      const content = await this.convertGuideFormat(guideId, options);
      
      let blob: Blob;
      let defaultFilename: string;
      
      if (content instanceof Blob) {
        blob = content;
        defaultFilename = `guide.${options.format}`;
      } else {
        const mimeTypes = {
          html: 'text/html',
          text: 'text/plain',
          markdown: 'text/markdown',
          video: 'text/plain'
        };
        
        blob = new Blob([content], { 
          type: mimeTypes[options.format as keyof typeof mimeTypes] || 'text/plain' 
        });
        defaultFilename = `guide.${options.format === 'video' ? 'txt' : options.format}`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download guide:', error);
      throw new Error('Failed to download guide');
    }
  }

  /**
   * Get quality score color based on score value
   */
  getQualityScoreColor(score: number): string {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * Get priority badge color
   */
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Format quality score as percentage
   */
  formatScore(score: number): string {
    return `${Math.round(score * 10)}%`;
  }

  /**
   * Get suggestion type icon
   */
  getSuggestionTypeIcon(type: string): string {
    const icons = {
      clarity: '🔍',
      completeness: '📋',
      accuracy: '✅',
      usability: '👤',
      accessibility: '♿'
    };
    return icons[type as keyof typeof icons] || '💡';
  }
}

export const aiEnhancementService = new AIEnhancementService();