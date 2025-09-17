import { z } from 'zod';

// Recording Metadata Schema
export const RecordingMetadataSchema = z.object({
  browserInfo: z.object({
    name: z.string(),
    version: z.string(),
    userAgent: z.string(),
  }).optional(),
  screenResolution: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  recordingSettings: z.object({
    quality: z.enum(['low', 'medium', 'high']).default('medium'),
    fps: z.number().min(10).max(60).default(30),
    includeAudio: z.boolean().default(false),
  }).default({}),
});

// Captured Step Schema
export const CapturedStepSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().min(0),
  action: z.enum(['click', 'type', 'navigate', 'scroll', 'hover', 'focus', 'blur']),
  element: z.string().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  screenshotUrl: z.string().url(),
  elementSelector: z.string().optional(),
  elementText: z.string().optional(),
});

// Recording Session Schema (for active recordings)
export const RecordingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'stopped']),
  startedAt: z.date(),
  lastActivityAt: z.date(),
  metadata: RecordingMetadataSchema.default({}),
});

// Recording Schema
export const RecordingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  duration: z.number().min(0), // in seconds
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  fileSize: z.number().min(0), // in bytes
  metadata: RecordingMetadataSchema.default({}),
  steps: z.array(CapturedStepSchema).default([]),
  status: z.enum(['processing', 'completed', 'failed', 'deleted']),
  processingProgress: z.number().min(0).max(100).default(0),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Recording Input Schema
export const CreateRecordingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  metadata: RecordingMetadataSchema.optional(),
});

// Update Recording Schema
export const UpdateRecordingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['processing', 'completed', 'failed', 'deleted']).optional(),
  processingProgress: z.number().min(0).max(100).optional(),
  errorMessage: z.string().optional(),
});

// Recording Upload Chunk Schema
export const RecordingChunkSchema = z.object({
  sessionId: z.string().uuid(),
  chunkIndex: z.number().min(0),
  totalChunks: z.number().min(1),
  data: z.instanceof(Buffer),
});

// TypeScript Types
export type Recording = z.infer<typeof RecordingSchema>;
export type RecordingMetadata = z.infer<typeof RecordingMetadataSchema>;
export type CapturedStep = z.infer<typeof CapturedStepSchema>;
export type RecordingSession = z.infer<typeof RecordingSessionSchema>;
export type CreateRecordingInput = z.infer<typeof CreateRecordingSchema>;
export type UpdateRecordingInput = z.infer<typeof UpdateRecordingSchema>;
export type RecordingChunk = z.infer<typeof RecordingChunkSchema>;