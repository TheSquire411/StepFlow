import { z } from 'zod';

// Annotation Schema
export const AnnotationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['highlight', 'arrow', 'blur', 'text', 'circle', 'rectangle']),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  style: z.object({
    color: z.string().default('#ff0000'),
    thickness: z.number().min(1).max(10).default(2),
    opacity: z.number().min(0).max(1).default(1),
  }).default({}),
  text: z.string().optional(),
  createdAt: z.date(),
});

// Processed Step Schema
export const ProcessedStepSchema = z.object({
  id: z.string().uuid(),
  order: z.number().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  screenshotUrl: z.string().url(),
  annotations: z.array(AnnotationSchema).default([]),
  audioUrl: z.string().url().optional(),
  duration: z.number().min(0).optional(), // audio duration in seconds
  isVisible: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Guide Settings Schema
export const GuideSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  brandColors: z.array(z.string()).default([]),
  logoUrl: z.string().url().optional(),
  showStepNumbers: z.boolean().default(true),
  autoPlay: z.boolean().default(false),
  autoPlayDelay: z.number().min(1).max(30).default(3), // seconds between steps
  showProgress: z.boolean().default(true),
  allowFullscreen: z.boolean().default(true),
  customCss: z.string().optional(),
});

// Guide Analytics Schema
export const GuideAnalyticsSchema = z.object({
  id: z.string().uuid(),
  guideId: z.string().uuid(),
  totalViews: z.number().min(0).default(0),
  uniqueViews: z.number().min(0).default(0),
  completionRate: z.number().min(0).max(100).default(0),
  averageTimeSpent: z.number().min(0).default(0), // in seconds
  stepAnalytics: z.array(z.object({
    stepId: z.string().uuid(),
    views: z.number().min(0).default(0),
    timeSpent: z.number().min(0).default(0),
    dropoffRate: z.number().min(0).max(100).default(0),
  })).default([]),
  lastUpdated: z.date(),
});

// Guide Schema
export const GuideSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  recordingId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
  steps: z.array(ProcessedStepSchema).default([]),
  settings: GuideSettingsSchema.default({}),
  status: z.enum(['draft', 'published', 'archived', 'processing']).default('draft'),
  language: z.string().default('en'),
  estimatedDuration: z.number().min(0).optional(), // in seconds
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().optional(),
});

// Create Guide Input Schema
export const CreateGuideSchema = z.object({
  recordingId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).default([]),
  settings: GuideSettingsSchema.partial().optional(),
  language: z.string().default('en'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// Update Guide Schema
export const UpdateGuideSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  settings: GuideSettingsSchema.partial().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  language: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

// Guide Filters Schema
export const GuideFiltersSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  language: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'views']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// TypeScript Types
export type Guide = z.infer<typeof GuideSchema>;
export type ProcessedStep = z.infer<typeof ProcessedStepSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type GuideSettings = z.infer<typeof GuideSettingsSchema>;
export type GuideAnalytics = z.infer<typeof GuideAnalyticsSchema>;
export type CreateGuideInput = z.infer<typeof CreateGuideSchema>;
export type UpdateGuideInput = z.infer<typeof UpdateGuideSchema>;
export type GuideFilters = z.infer<typeof GuideFiltersSchema>;