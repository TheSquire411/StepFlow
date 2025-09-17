import { Request, Response } from 'express';
import { AIEnhancementService, FormatConversionOptions } from '../services/ai-enhancement.service.js';
import { GuideService } from '../services/guide.service.js';

export class AIEnhancementController {
  private aiEnhancementService: AIEnhancementService;
  private guideService: GuideService;

  constructor() {
    this.aiEnhancementService = new AIEnhancementService();
    this.guideService = new GuideService();
  }

  /**
   * Generate a summary of a guide
   */
  async summarizeGuide(req: Request, res: Response): Promise<void> {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get the guide
      const guide = await this.guideService.getGuide(guideId, userId);
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      // Generate summary
      const summary = await this.aiEnhancementService.summarizeGuide(guide);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error summarizing guide:', error);
      res.status(500).json({
        error: 'Failed to generate guide summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert guide to different format
   */
  async convertGuideFormat(req: Request, res: Response): Promise<void> {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;
      const options: FormatConversionOptions = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate format
      const supportedFormats = ['video', 'pdf', 'text', 'html', 'markdown'];
      if (!supportedFormats.includes(options.format)) {
        res.status(400).json({ 
          error: 'Invalid format', 
          supportedFormats 
        });
        return;
      }

      // Get the guide
      const guide = await this.guideService.getGuide(guideId, userId);
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      // Convert format
      const convertedContent = await this.aiEnhancementService.convertGuideFormat(guide, options);

      // Set appropriate headers based on format
      switch (options.format) {
        case 'pdf':
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${guide.title}.pdf"`);
          res.send(convertedContent);
          break;
        case 'html':
          res.setHeader('Content-Type', 'text/html');
          res.send(convertedContent);
          break;
        case 'text':
        case 'markdown':
        case 'video':
          res.setHeader('Content-Type', 'text/plain');
          res.send(convertedContent);
          break;
        default:
          res.json({
            success: true,
            data: {
              format: options.format,
              content: convertedContent
            }
          });
      }
    } catch (error) {
      console.error('Error converting guide format:', error);
      res.status(500).json({
        error: 'Failed to convert guide format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Translate guide to different language
   */
  async translateGuide(req: Request, res: Response): Promise<void> {
    try {
      const { guideId } = req.params;
      const { targetLanguage } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!targetLanguage) {
        res.status(400).json({ error: 'Target language is required' });
        return;
      }

      // Get the guide
      const guide = await this.guideService.getGuide(guideId, userId);
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      // Translate guide
      const translationResult = await this.aiEnhancementService.translateGuide(guide, targetLanguage);

      res.json({
        success: true,
        data: translationResult
      });
    } catch (error) {
      console.error('Error translating guide:', error);
      res.status(500).json({
        error: 'Failed to translate guide',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Assess content quality and get improvement suggestions
   */
  async assessContentQuality(req: Request, res: Response): Promise<void> {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get the guide
      const guide = await this.guideService.getGuide(guideId, userId);
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      // Assess quality
      const qualityReport = await this.aiEnhancementService.assessContentQuality(guide);

      // Generate improvement suggestions
      const suggestions = await this.aiEnhancementService.generateImprovementSuggestions(guide, qualityReport);

      res.json({
        success: true,
        data: {
          qualityReport,
          suggestions
        }
      });
    } catch (error) {
      console.error('Error assessing content quality:', error);
      res.status(500).json({
        error: 'Failed to assess content quality',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get improvement suggestions for a guide
   */
  async getImprovementSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get the guide
      const guide = await this.guideService.getGuide(guideId, userId);
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      // First assess quality to get baseline
      const qualityReport = await this.aiEnhancementService.assessContentQuality(guide);

      // Generate specific improvement suggestions
      const suggestions = await this.aiEnhancementService.generateImprovementSuggestions(guide, qualityReport);

      res.json({
        success: true,
        data: {
          overallScore: qualityReport.overallScore,
          suggestions,
          priorityCount: {
            high: suggestions.filter(s => s.priority === 'high').length,
            medium: suggestions.filter(s => s.priority === 'medium').length,
            low: suggestions.filter(s => s.priority === 'low').length
          }
        }
      });
    } catch (error) {
      console.error('Error getting improvement suggestions:', error);
      res.status(500).json({
        error: 'Failed to get improvement suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get supported languages for translation
   */
  async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    try {
      // Common languages supported by most AI translation services
      const supportedLanguages = [
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' },
        { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
        { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
        { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
        { code: 'da', name: 'Danish', nativeName: 'Dansk' },
        { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
        { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
        { code: 'pl', name: 'Polish', nativeName: 'Polski' },
        { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
        { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
      ];

      res.json({
        success: true,
        data: supportedLanguages
      });
    } catch (error) {
      console.error('Error getting supported languages:', error);
      res.status(500).json({
        error: 'Failed to get supported languages',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get supported export formats
   */
  async getSupportedFormats(req: Request, res: Response): Promise<void> {
    try {
      const supportedFormats = [
        {
          format: 'pdf',
          name: 'PDF Document',
          description: 'Portable document format with professional formatting',
          features: ['Print-ready', 'Professional layout', 'Embedded images']
        },
        {
          format: 'html',
          name: 'HTML Web Page',
          description: 'Interactive web page with custom styling',
          features: ['Interactive', 'Custom branding', 'Responsive design']
        },
        {
          format: 'markdown',
          name: 'Markdown',
          description: 'Plain text format for documentation platforms',
          features: ['Version control friendly', 'Platform agnostic', 'Easy editing']
        },
        {
          format: 'text',
          name: 'Plain Text',
          description: 'Simple text format for basic documentation',
          features: ['Universal compatibility', 'Lightweight', 'Easy sharing']
        },
        {
          format: 'video',
          name: 'Video Script',
          description: 'Script for creating video tutorials',
          features: ['Narration ready', 'Timing cues', 'Scene descriptions']
        }
      ];

      res.json({
        success: true,
        data: supportedFormats
      });
    } catch (error) {
      console.error('Error getting supported formats:', error);
      res.status(500).json({
        error: 'Failed to get supported formats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}