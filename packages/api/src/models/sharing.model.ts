import { z } from 'zod';

// Share Permission Schema
export const SharePermissionSchema = z.object({
  id: z.string().uuid(),
  guideId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
  grantedBy: z.string().uuid(),
  grantedAt: z.date(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
});

// Sharing Settings Schema
export const SharingSettingsSchema = z.object({
  id: z.string().uuid(),
  guideId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  shareUrl: z.string().url(),
  embedCode: z.string(),
  allowedDomains: z.array(z.string().url()).default([]),
  passwordProtected: z.boolean().default(false),
  passwordHash: z.string().optional(),
  requireAuth: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  allowDownload: z.boolean().default(false),
  trackAnalytics: z.boolean().default(true),
  customBranding: z.boolean().default(false),
  expiresAt: z.date().optional(),
  maxViews: z.number().min(1).optional(),
  currentViews: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Share Access Log Schema
export const ShareAccessLogSchema = z.object({
  id: z.string().uuid(),
  guideId: z.string().uuid(),
  sharingSettingsId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  ipAddress: z.string(),
  userAgent: z.string(),
  referrer: z.string().optional(),
  accessedAt: z.date(),
  sessionDuration: z.number().min(0).optional(), // in seconds
  stepsViewed: z.array(z.string().uuid()).default([]),
  completedGuide: z.boolean().default(false),
});

// Create Sharing Settings Input Schema
export const CreateSharingSettingsSchema = z.object({
  guideId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  allowedDomains: z.array(z.string().url()).default([]),
  passwordProtected: z.boolean().default(false),
  password: z.string().optional(),
  requireAuth: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  allowDownload: z.boolean().default(false),
  trackAnalytics: z.boolean().default(true),
  customBranding: z.boolean().default(false),
  expiresAt: z.date().optional(),
  maxViews: z.number().min(1).optional(),
});

// Update Sharing Settings Schema
export const UpdateSharingSettingsSchema = z.object({
  isPublic: z.boolean().optional(),
  allowedDomains: z.array(z.string().url()).optional(),
  passwordProtected: z.boolean().optional(),
  password: z.string().optional(),
  requireAuth: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  trackAnalytics: z.boolean().optional(),
  customBranding: z.boolean().optional(),
  expiresAt: z.date().optional(),
  maxViews: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

// Create Share Permission Input Schema
export const CreateSharePermissionSchema = z.object({
  guideId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
  expiresAt: z.date().optional(),
}).refine(
  (data) => data.userId || data.email,
  {
    message: "Either userId or email must be provided",
    path: ["userId", "email"],
  }
);

// Update Share Permission Schema
export const UpdateSharePermissionSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']).optional(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().optional(),
});

// Share Access Input Schema
export const ShareAccessInputSchema = z.object({
  guideId: z.string().uuid(),
  password: z.string().optional(),
  referrer: z.string().optional(),
});

// Embed Configuration Schema
export const EmbedConfigurationSchema = z.object({
  width: z.number().min(300).max(2000).default(800),
  height: z.number().min(200).max(1500).default(600),
  showTitle: z.boolean().default(true),
  showProgress: z.boolean().default(true),
  showControls: z.boolean().default(true),
  autoPlay: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  customCss: z.string().optional(),
});

// TypeScript Types
export type SharingSettings = z.infer<typeof SharingSettingsSchema>;
export type SharePermission = z.infer<typeof SharePermissionSchema>;
export type ShareAccessLog = z.infer<typeof ShareAccessLogSchema>;
export type CreateSharingSettingsInput = z.infer<typeof CreateSharingSettingsSchema>;
export type UpdateSharingSettingsInput = z.infer<typeof UpdateSharingSettingsSchema>;
export type CreateSharePermissionInput = z.infer<typeof CreateSharePermissionSchema>;
export type UpdateSharePermissionInput = z.infer<typeof UpdateSharePermissionSchema>;
export type ShareAccessInput = z.infer<typeof ShareAccessInputSchema>;
export type EmbedConfiguration = z.infer<typeof EmbedConfigurationSchema>;