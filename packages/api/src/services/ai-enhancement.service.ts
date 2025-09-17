import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GeneratedGuide, GuideQualityAssessment } from './ai-content-generation.service.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  translatedGuide: GeneratedGuide;
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

export class AIEnhancementService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  /**
   * Generate a concise summary of a guide for quick reference
   */
  async summarizeGuide(guide: GeneratedGuide): Promise<GuideSummary> {
    const prompt = `
Create a concise summary of this step-by-step guide:

Title: ${guide.title}
Description: ${guide.description}
Total Steps: ${guide.steps.length}

Steps:
${guide.steps.map(step => `${step.stepNumber}. ${step.title}: ${step.description}`).join('\n')}

Generate a summary with:
1. A brief overview (2-3 sentences) of what this guide accomplishes
2. Key points (3-5 main actions or concepts)
3. Quick reference checklist (simplified step list)
4. Estimated read time

Format as JSON with keys: summary, keyPoints (array), quickReference (array), estimatedReadTime
Keep the summary under 200 words total.
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summaryData = JSON.parse(jsonMatch[0]);
        
        return {
          id: this.generateId('summary'),
          originalGuideId: guide.id,
          title: `${guide.title} - Summary`,
          summary: summaryData.summary || 'Guide summary',
          keyPoints: Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints : [],
          quickReference: Array.isArray(summaryData.quickReference) ? summaryData.quickReference : [],
          estimatedReadTime: summaryData.estimatedReadTime || '2 minutes',
          createdAt: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to generate guide summary:', error);
    }

    // Fallback summary
    return {
      id: this.generateId('summary'),
      originalGuideId: guide.id,
      title: `${guide.title} - Summary`,
      summary: `A ${guide.steps.length}-step guide covering the main workflow.`,
      keyPoints: guide.steps.slice(0, 3).map(step => step.title),
      quickReference: guide.steps.map(step => `${step.stepNumber}. ${step.title}`),
      estimatedReadTime: this.estimateReadTime(guide),
      createdAt: new Date()
    };
  }

  /**
   * Convert guide to different formats
   */
  async convertGuideFormat(guide: GeneratedGuide, options: FormatConversionOptions): Promise<Buffer | string> {
    switch (options.format) {
      case 'pdf':
        return this.convertToPDF(guide, options);
      case 'text':
        return this.convertToText(guide, options);
      case 'html':
        return this.convertToHTML(guide, options);
      case 'markdown':
        return this.convertToMarkdown(guide, options);
      case 'video':
        return this.generateVideoScript(guide, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Translate guide to different language
   */
  async translateGuide(guide: GeneratedGuide, targetLanguage: string): Promise<TranslationResult> {
    const prompt = `
Translate this step-by-step guide to ${targetLanguage}. Maintain the structure and formatting.

Original Guide:
Title: ${guide.title}
Description: ${guide.description}

Steps:
${guide.steps.map(step => `
${step.stepNumber}. ${step.title}
Description: ${step.description}
Instructions: ${step.detailedInstructions}
${step.tips ? `Tips: ${step.tips.join(', ')}` : ''}
${step.warnings ? `Warnings: ${step.warnings.join(', ')}` : ''}
${step.expectedResult ? `Expected Result: ${step.expectedResult}` : ''}
`).join('\n')}

Requirements:
- Maintain technical accuracy
- Keep UI element names in original language if they appear in English in the interface
- Adapt cultural context appropriately
- Preserve formatting and structure
- Flag any terms that might need localization review

Format as JSON with the same structure as the original guide, plus a 'warnings' array for any translation concerns.
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const translatedData = JSON.parse(jsonMatch[0]);
        
        const translatedGuide: GeneratedGuide = {
          ...guide,
          id: this.generateId('translated'),
          title: translatedData.title || guide.title,
          description: translatedData.description || guide.description,
          steps: translatedData.steps || guide.steps,
          generatedAt: new Date()
        };

        return {
          id: this.generateId('translation'),
          originalGuideId: guide.id,
          targetLanguage,
          translatedGuide,
          confidence: this.calculateTranslationConfidence(guide, translatedGuide),
          warnings: Array.isArray(translatedData.warnings) ? translatedData.warnings : [],
          createdAt: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to translate guide:', error);
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    throw new Error('Translation failed: Invalid response format');
  }

  /**
   * Assess content quality and provide improvement suggestions
   */
  async assessContentQuality(guide: GeneratedGuide): Promise<ContentQualityReport> {
    const prompt = `
Perform a comprehensive quality assessment of this step-by-step guide:

Title: ${guide.title}
Description: ${guide.description}
Total Steps: ${guide.steps.length}

Steps:
${guide.steps.map(step => `
${step.stepNumber}. ${step.title}
Description: ${step.description}
Instructions: ${step.detailedInstructions}
${step.tips ? `Tips: ${step.tips.join(', ')}` : ''}
${step.warnings ? `Warnings: ${step.warnings.join(', ')}` : ''}
`).join('\n')}

Evaluate on a scale of 1-10:
1. Clarity - How clear and understandable are the instructions?
2. Completeness - Are all necessary steps and information included?
3. Accuracy - Do the steps make logical sense and follow proper sequence?
4. Usability - How easy would it be for someone to follow these instructions?
5. Accessibility - How well does this accommodate users with different abilities?

Also provide:
- Overall score (weighted average)
- Specific improvement suggestions with priority levels
- Strengths of the current guide
- Weaknesses that need attention
- Readability score (1-10, where 10 is most readable)
- Estimated completion time

Format as JSON with keys: overallScore, scores (object with individual scores), suggestions (array with type, priority, description, suggestedFix, stepNumber, impact), strengths (array), weaknesses (array), readabilityScore, estimatedCompletionTime
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const assessment = JSON.parse(jsonMatch[0]);
        
        return {
          overallScore: assessment.overallScore || 7,
          scores: {
            clarity: assessment.scores?.clarity || 7,
            completeness: assessment.scores?.completeness || 7,
            accuracy: assessment.scores?.accuracy || 7,
            usability: assessment.scores?.usability || 7,
            accessibility: assessment.scores?.accessibility || 6
          },
          suggestions: Array.isArray(assessment.suggestions) ? assessment.suggestions : [],
          strengths: Array.isArray(assessment.strengths) ? assessment.strengths : [],
          weaknesses: Array.isArray(assessment.weaknesses) ? assessment.weaknesses : [],
          readabilityScore: assessment.readabilityScore || 7,
          estimatedCompletionTime: assessment.estimatedCompletionTime || this.estimateCompletionTime(guide)
        };
      }
    } catch (error) {
      console.error('Failed to assess content quality:', error);
    }

    // Fallback assessment
    return {
      overallScore: 7,
      scores: {
        clarity: 7,
        completeness: 7,
        accuracy: 7,
        usability: 7,
        accessibility: 6
      },
      suggestions: [],
      strengths: ['Clear step-by-step structure'],
      weaknesses: ['Could benefit from more detailed analysis'],
      readabilityScore: 7,
      estimatedCompletionTime: this.estimateCompletionTime(guide)
    };
  }

  /**
   * Generate improvement suggestions based on quality assessment
   */
  async generateImprovementSuggestions(guide: GeneratedGuide, qualityReport: ContentQualityReport): Promise<QualityImprovementSuggestion[]> {
    const lowScoreAreas = Object.entries(qualityReport.scores)
      .filter(([_, score]) => score < 7)
      .map(([area, _]) => area);

    if (lowScoreAreas.length === 0) {
      return [];
    }

    const prompt = `
Based on this quality assessment, generate specific improvement suggestions for the guide:

Guide: ${guide.title}
Low-scoring areas: ${lowScoreAreas.join(', ')}
Current weaknesses: ${qualityReport.weaknesses.join(', ')}

Steps that might need improvement:
${guide.steps.map(step => `${step.stepNumber}. ${step.title}: ${step.description}`).join('\n')}

For each low-scoring area, provide specific, actionable suggestions with:
- Type of improvement needed
- Priority level (high/medium/low)
- Clear description of the issue
- Specific suggested fix
- Which step(s) are affected (if applicable)
- Expected impact of the improvement

Focus on the most impactful improvements first.

Format as JSON array of suggestion objects with keys: type, priority, description, suggestedFix, stepNumber, impact
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return Array.isArray(suggestions) ? suggestions : [];
      }
    } catch (error) {
      console.error('Failed to generate improvement suggestions:', error);
    }

    return [];
  }

  /**
   * Private helper methods for format conversion
   */
  private async convertToPDF(guide: GeneratedGuide, options: FormatConversionOptions): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    // Title
    page.drawText(guide.title, {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Description
    page.drawText(guide.description, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: width - 100
    });
    yPosition -= 60;

    // Steps
    for (const step of guide.steps) {
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = height - 50;
      }

      // Step title
      page.drawText(`${step.stepNumber}. ${step.title}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= 25;

      // Step description
      const lines = this.wrapText(step.detailedInstructions, 80);
      for (const line of lines) {
        if (yPosition < 50) {
          page = pdfDoc.addPage();
          yPosition = height - 50;
        }
        page.drawText(line, {
          x: 70,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0.3, 0.3, 0.3)
        });
        yPosition -= 15;
      }
      yPosition -= 10;
    }

    return Buffer.from(await pdfDoc.save());
  }

  private convertToText(guide: GeneratedGuide, options: FormatConversionOptions): string {
    let text = `${guide.title}\n`;
    text += '='.repeat(guide.title.length) + '\n\n';
    text += `${guide.description}\n\n`;
    
    for (const step of guide.steps) {
      text += `${step.stepNumber}. ${step.title}\n`;
      text += `${step.detailedInstructions}\n`;
      
      if (step.tips && step.tips.length > 0) {
        text += `Tips: ${step.tips.join(', ')}\n`;
      }
      
      if (step.warnings && step.warnings.length > 0) {
        text += `⚠️ Warnings: ${step.warnings.join(', ')}\n`;
      }
      
      text += '\n';
    }
    
    return text;
  }

  private convertToHTML(guide: GeneratedGuide, options: FormatConversionOptions): string {
    const styling = options.customStyling || {};
    const primaryColor = styling.primaryColor || '#2563eb';
    const fontFamily = styling.fontFamily || 'Arial, sans-serif';

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guide.title}</title>
    <style>
        body { font-family: ${fontFamily}; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; }
        .step { margin: 20px 0; padding: 15px; border-left: 4px solid ${primaryColor}; }
        .step-title { font-weight: bold; color: ${primaryColor}; }
        .tips { background: #f0f9ff; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .warnings { background: #fef2f2; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>${guide.title}</h1>
    <p>${guide.description}</p>
`;

    for (const step of guide.steps) {
      html += `
    <div class="step">
        <div class="step-title">${step.stepNumber}. ${step.title}</div>
        <p>${step.detailedInstructions}</p>
`;
      
      if (step.tips && step.tips.length > 0) {
        html += `<div class="tips"><strong>💡 Tips:</strong> ${step.tips.join(', ')}</div>`;
      }
      
      if (step.warnings && step.warnings.length > 0) {
        html += `<div class="warnings"><strong>⚠️ Warnings:</strong> ${step.warnings.join(', ')}</div>`;
      }
      
      html += '</div>';
    }

    html += '</body></html>';
    return html;
  }

  private convertToMarkdown(guide: GeneratedGuide, options: FormatConversionOptions): string {
    let markdown = `# ${guide.title}\n\n`;
    markdown += `${guide.description}\n\n`;
    
    for (const step of guide.steps) {
      markdown += `## ${step.stepNumber}. ${step.title}\n\n`;
      markdown += `${step.detailedInstructions}\n\n`;
      
      if (step.tips && step.tips.length > 0) {
        markdown += `> 💡 **Tips:** ${step.tips.join(', ')}\n\n`;
      }
      
      if (step.warnings && step.warnings.length > 0) {
        markdown += `> ⚠️ **Warnings:** ${step.warnings.join(', ')}\n\n`;
      }
    }
    
    return markdown;
  }

  private async generateVideoScript(guide: GeneratedGuide, options: FormatConversionOptions): Promise<string> {
    const prompt = `
Create a video script for this step-by-step guide:

Title: ${guide.title}
Description: ${guide.description}

Steps:
${guide.steps.map(step => `${step.stepNumber}. ${step.title}: ${step.detailedInstructions}`).join('\n')}

Generate a video script with:
- Introduction (30 seconds)
- Step-by-step narration (${options.videoOptions?.duration || 10} seconds per step)
- Conclusion (15 seconds)
- Scene descriptions for each segment
- Timing cues
- Transition suggestions

Format as a structured script with timestamps and scene descriptions.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Failed to generate video script:', error);
      return `Video script for: ${guide.title}\n\nSteps:\n${guide.steps.map(step => `${step.stepNumber}. ${step.title}`).join('\n')}`;
    }
  }

  /**
   * Helper methods
   */
  private calculateTranslationConfidence(original: GeneratedGuide, translated: GeneratedGuide): number {
    // Simple confidence calculation based on structure preservation
    const structureScore = translated.steps.length === original.steps.length ? 1 : 0.8;
    const contentScore = translated.title && translated.description ? 1 : 0.7;
    return Math.min(structureScore * contentScore, 1);
  }

  private estimateReadTime(guide: GeneratedGuide): string {
    const wordsPerMinute = 200;
    const totalWords = guide.steps.reduce((count, step) => {
      return count + step.title.split(' ').length + step.description.split(' ').length;
    }, 0);
    
    const minutes = Math.ceil(totalWords / wordsPerMinute);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  private estimateCompletionTime(guide: GeneratedGuide): string {
    const baseTimePerStep = 2; // minutes
    const totalMinutes = guide.steps.length * baseTimePerStep;
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}