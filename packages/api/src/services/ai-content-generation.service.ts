import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ProcessedStep } from './step-detection.service.js';

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

export class AIContentGenerationService {
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
   * Generate a complete step-by-step guide from processed steps
   */
  async generateGuide(
    steps: ProcessedStep[], 
    options: ContentGenerationOptions,
    title?: string,
    description?: string
  ): Promise<GeneratedGuide> {
    try {
      if (steps.length === 0) {
        throw new Error('No steps provided for guide generation');
      }

      // Generate guide metadata
      const metadata = await this.generateGuideMetadata(steps, options);

      // Generate individual step content
      const generatedSteps = await this.generateStepContent(steps, options);

      // Generate title and description if not provided
      const generatedTitle = title || await this.generateTitle(steps, options);
      const generatedDescription = description || await this.generateDescription(steps, options);

      const guide: GeneratedGuide = {
        id: this.generateGuideId(),
        title: generatedTitle,
        description: generatedDescription,
        steps: generatedSteps,
        metadata,
        generatedAt: new Date(),
        confidence: this.calculateOverallConfidence(steps, generatedSteps)
      };

      return guide;
    } catch (error) {
      throw new Error(`Failed to generate guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content for individual steps
   */
  async generateStepContent(steps: ProcessedStep[], options: ContentGenerationOptions): Promise<GeneratedStep[]> {
    const generatedSteps: GeneratedStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const generatedStep = await this.generateSingleStepContent(step, i + 1, options, steps);
      generatedSteps.push(generatedStep);
    }

    return generatedSteps;
  }

  /**
   * Generate content for a single step
   */
  private async generateSingleStepContent(
    step: ProcessedStep, 
    stepNumber: number, 
    options: ContentGenerationOptions,
    allSteps: ProcessedStep[]
  ): Promise<GeneratedStep> {
    const prompt = this.buildStepContentPrompt(step, stepNumber, options, allSteps);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      const parsedContent = this.parseStepContent(content);

      return {
        stepNumber,
        title: parsedContent.title || `Step ${stepNumber}`,
        description: parsedContent.description || step.actionDescription,
        detailedInstructions: parsedContent.detailedInstructions || step.actionDescription,
        tips: options.includeTips ? parsedContent.tips : undefined,
        warnings: options.includeWarnings ? parsedContent.warnings : undefined,
        expectedResult: parsedContent.expectedResult,
        troubleshooting: options.includeTroubleshooting ? parsedContent.troubleshooting : undefined,
        originalStep: step
      };
    } catch (error) {
      console.error(`Failed to generate content for step ${stepNumber}:`, error);
      
      // Fallback to basic content
      return {
        stepNumber,
        title: `Step ${stepNumber}`,
        description: step.actionDescription,
        detailedInstructions: step.actionDescription,
        originalStep: step
      };
    }
  }

  /**
   * Generate guide title
   */
  async generateTitle(steps: ProcessedStep[], options: ContentGenerationOptions): Promise<string> {
    const prompt = `
Based on the following user workflow steps, generate a clear and descriptive title for a step-by-step guide.

Steps:
${steps.map((step, i) => `${i + 1}. ${step.actionDescription}`).join('\n')}

Requirements:
- Keep it concise (under 60 characters)
- Make it descriptive and actionable
- Use ${options.tone} tone
- Target audience: ${options.targetAudience}

Generate only the title, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Failed to generate title:', error);
      return 'Step-by-Step Guide';
    }
  }

  /**
   * Generate guide description
   */
  async generateDescription(steps: ProcessedStep[], options: ContentGenerationOptions): Promise<string> {
    const prompt = `
Based on the following user workflow steps, generate a clear and helpful description for a step-by-step guide.

Steps:
${steps.map((step, i) => `${i + 1}. ${step.actionDescription}`).join('\n')}

Requirements:
- Keep it between 100-200 characters
- Explain what the user will accomplish
- Use ${options.tone} tone
- Target audience: ${options.targetAudience}
- Mention the number of steps (${steps.length})

Generate only the description, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Failed to generate description:', error);
      return `A ${steps.length}-step guide to complete this workflow.`;
    }
  }

  /**
   * Generate guide metadata
   */
  private async generateGuideMetadata(steps: ProcessedStep[], options: ContentGenerationOptions) {
    const prompt = `
Analyze the following workflow steps and generate metadata:

Steps:
${steps.map((step, i) => `${i + 1}. ${step.actionDescription} (${step.action})`).join('\n')}

Generate metadata in JSON format with:
- estimatedDuration: estimated time to complete (e.g., "5 minutes", "30 seconds")
- difficulty: "beginner", "intermediate", or "advanced"
- tags: array of relevant tags (max 5)
- category: main category (e.g., "Web Navigation", "Form Filling", "Account Setup")

Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      // Clean up the response to ensure it's valid JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const metadata = JSON.parse(jsonMatch[0]);
        return {
          totalSteps: steps.length,
          estimatedDuration: metadata.estimatedDuration || '5 minutes',
          difficulty: metadata.difficulty || 'beginner',
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          category: metadata.category || 'General'
        };
      }
    } catch (error) {
      console.error('Failed to generate metadata:', error);
    }

    // Fallback metadata
    return {
      totalSteps: steps.length,
      estimatedDuration: this.estimateDuration(steps),
      difficulty: this.estimateDifficulty(steps),
      tags: this.generateBasicTags(steps),
      category: 'General'
    };
  }

  /**
   * Summarize a workflow into key points
   */
  async summarizeWorkflow(steps: ProcessedStep[], maxLength: number = 200): Promise<StepSummary> {
    const prompt = `
Summarize this workflow in ${maxLength} characters or less:

Steps:
${steps.map((step, i) => `${i + 1}. ${step.actionDescription}`).join('\n')}

Provide:
1. A brief summary of what this workflow accomplishes
2. Key actions performed (max 5)
3. Estimated duration
4. Complexity score (1-10, where 1 is very simple and 10 is very complex)

Format as JSON with keys: summary, keyActions (array), duration, complexity
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        return {
          summary: summary.summary || 'Workflow summary',
          keyActions: Array.isArray(summary.keyActions) ? summary.keyActions : [],
          duration: summary.duration || '5 minutes',
          complexity: typeof summary.complexity === 'number' ? summary.complexity : 5
        };
      }
    } catch (error) {
      console.error('Failed to summarize workflow:', error);
    }

    // Fallback summary
    return {
      summary: `A ${steps.length}-step workflow`,
      keyActions: steps.slice(0, 3).map(step => step.actionDescription),
      duration: this.estimateDuration(steps),
      complexity: this.estimateComplexity(steps)
    };
  }

  /**
   * Assess the quality of a generated guide
   */
  async assessGuideQuality(guide: GeneratedGuide): Promise<GuideQualityAssessment> {
    const prompt = `
Assess the quality of this step-by-step guide:

Title: ${guide.title}
Description: ${guide.description}
Steps: ${guide.steps.length}

Steps:
${guide.steps.map(step => `${step.stepNumber}. ${step.title}\n   ${step.description}`).join('\n\n')}

Evaluate on a scale of 1-10:
1. Clarity - How clear and understandable are the instructions?
2. Completeness - Are all necessary steps included?
3. Accuracy - Do the steps make logical sense?
4. Usability - How easy would it be for someone to follow?

Also provide:
- Overall score (average of the 4 scores)
- Suggestions for improvement (max 5)
- Issues found (categorize as error, warning, or suggestion)

Format as JSON with keys: overallScore, clarity, completeness, accuracy, usability, suggestions (array), issues (array with type and message)
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
          clarity: assessment.clarity || 7,
          completeness: assessment.completeness || 7,
          accuracy: assessment.accuracy || 7,
          usability: assessment.usability || 7,
          suggestions: Array.isArray(assessment.suggestions) ? assessment.suggestions : [],
          issues: Array.isArray(assessment.issues) ? assessment.issues : []
        };
      }
    } catch (error) {
      console.error('Failed to assess guide quality:', error);
    }

    // Fallback assessment
    return {
      overallScore: 7,
      clarity: 7,
      completeness: 7,
      accuracy: 7,
      usability: 7,
      suggestions: [],
      issues: []
    };
  }

  /**
   * Improve guide content based on feedback
   */
  async improveGuideContent(guide: GeneratedGuide, feedback: string): Promise<GeneratedGuide> {
    const prompt = `
Improve this step-by-step guide based on the feedback provided:

Current Guide:
Title: ${guide.title}
Description: ${guide.description}

Steps:
${guide.steps.map(step => `${step.stepNumber}. ${step.title}\n   ${step.description}\n   Instructions: ${step.detailedInstructions}`).join('\n\n')}

Feedback: ${feedback}

Provide improved content maintaining the same structure. Focus on addressing the specific feedback while keeping the guide clear and actionable.

Format the response as JSON with the same structure as the original guide.
Return only valid JSON, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text().trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const improvedContent = JSON.parse(jsonMatch[0]);
        
        return {
          ...guide,
          title: improvedContent.title || guide.title,
          description: improvedContent.description || guide.description,
          steps: improvedContent.steps || guide.steps,
          generatedAt: new Date()
        };
      }
    } catch (error) {
      console.error('Failed to improve guide content:', error);
    }

    return guide; // Return original if improvement fails
  }

  /**
   * Private helper methods
   */
  private buildStepContentPrompt(
    step: ProcessedStep, 
    stepNumber: number, 
    options: ContentGenerationOptions,
    allSteps: ProcessedStep[]
  ): string {
    const context = allSteps.length > 1 ? `
Context: This is step ${stepNumber} of ${allSteps.length} in a workflow.
Previous steps: ${allSteps.slice(0, stepNumber - 1).map(s => s.actionDescription).join(', ')}
Next steps: ${allSteps.slice(stepNumber).map(s => s.actionDescription).join(', ')}
` : '';

    return `
Generate detailed content for this step in a user guide:

Step: ${step.actionDescription}
Action Type: ${step.action}
Element: ${step.element || 'N/A'}
Element Type: ${step.elementType || 'N/A'}
Confidence: ${step.confidence}
${context}

Requirements:
- Tone: ${options.tone}
- Length: ${options.length}
- Target audience: ${options.targetAudience}
- Language: ${options.language}
${options.customInstructions ? `- Custom instructions: ${options.customInstructions}` : ''}

Generate content in JSON format with:
- title: Short, descriptive title for this step
- description: Brief description of what this step accomplishes
- detailedInstructions: Detailed, step-by-step instructions
${options.includeTips ? '- tips: Array of helpful tips (optional)' : ''}
${options.includeWarnings ? '- warnings: Array of important warnings (optional)' : ''}
- expectedResult: What the user should see after completing this step
${options.includeTroubleshooting ? '- troubleshooting: Array of common issues and solutions (optional)' : ''}

Return only valid JSON, no additional text.
`;
  }

  private parseStepContent(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse step content:', error);
    }

    // Fallback parsing
    return {
      title: 'Step',
      description: content.substring(0, 100),
      detailedInstructions: content
    };
  }

  private calculateOverallConfidence(steps: ProcessedStep[], generatedSteps: GeneratedStep[]): number {
    const stepConfidences = steps.map(step => step.confidence);
    const avgStepConfidence = stepConfidences.reduce((sum, conf) => sum + conf, 0) / stepConfidences.length;
    
    // Factor in generation success rate
    const generationSuccessRate = generatedSteps.length / steps.length;
    
    return Math.min(avgStepConfidence * generationSuccessRate, 1);
  }

  private estimateDuration(steps: ProcessedStep[]): string {
    const baseTimePerStep = 30; // seconds
    const totalSeconds = steps.length * baseTimePerStep;
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)} minutes`;
    } else {
      return `${Math.ceil(totalSeconds / 3600)} hours`;
    }
  }

  private estimateDifficulty(steps: ProcessedStep[]): 'beginner' | 'intermediate' | 'advanced' {
    const complexActions = ['navigate', 'submit'];
    const complexCount = steps.filter(step => complexActions.includes(step.action)).length;
    const complexityRatio = complexCount / steps.length;
    
    if (complexityRatio > 0.5 || steps.length > 15) return 'advanced';
    if (complexityRatio > 0.2 || steps.length > 8) return 'intermediate';
    return 'beginner';
  }

  private estimateComplexity(steps: ProcessedStep[]): number {
    const actionWeights = {
      click: 1,
      type: 2,
      navigate: 3,
      submit: 3,
      scroll: 1,
      hover: 1,
      focus: 1
    };

    const totalWeight = steps.reduce((sum, step) => {
      return sum + (actionWeights[step.action] || 1);
    }, 0);

    return Math.min(Math.ceil(totalWeight / steps.length * 2), 10);
  }

  private generateBasicTags(steps: ProcessedStep[]): string[] {
    const tags = new Set<string>();
    
    steps.forEach(step => {
      if (step.action === 'type') tags.add('form-filling');
      if (step.action === 'click') tags.add('navigation');
      if (step.action === 'submit') tags.add('form-submission');
      if (step.url?.includes('login')) tags.add('authentication');
      if (step.elementType === 'input') tags.add('data-entry');
    });

    return Array.from(tags).slice(0, 5);
  }

  private generateGuideId(): string {
    return `guide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}