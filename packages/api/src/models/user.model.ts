import { z } from 'zod';

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  defaultVoice: z.string().default('en-US-standard'),
  defaultLanguage: z.string().default('en'),
  brandColors: z.array(z.string()).default([]),
  logoUrl: z.string().url().optional(),
  autoGenerateNarration: z.boolean().default(true),
});

// Subscription Schema
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planType: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['active', 'cancelled', 'expired', 'past_due']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  stripeSubscriptionId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  planType: z.enum(['free', 'pro', 'enterprise']).default('free'),
  emailVerified: z.boolean().default(false),
  emailVerificationToken: z.string().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpires: z.date().optional(),
  preferences: UserPreferencesSchema.default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create User Input Schema (for registration)
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

// Update User Schema
export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  preferences: UserPreferencesSchema.partial().optional(),
});

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Password Reset Request Schema
export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

// Password Reset Schema
export const PasswordResetSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

// TypeScript Types
export type User = z.infer<typeof UserSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;