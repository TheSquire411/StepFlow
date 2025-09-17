import { z } from 'zod';

// Plan Configuration Schema
export const PlanConfigSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  price: z.number(),
  currency: z.string().default('usd'),
  interval: z.enum(['month', 'year']),
  features: z.object({
    maxRecordings: z.number().nullable(), // null means unlimited
    maxStorageGB: z.number().nullable(),
    aiEnhancements: z.boolean(),
    customBranding: z.boolean(),
    analytics: z.boolean(),
    teamCollaboration: z.boolean(),
    prioritySupport: z.boolean(),
    apiAccess: z.boolean(),
  }),
  stripePriceId: z.string().optional(),
});

// Subscription Schema
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planType: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['active', 'cancelled', 'expired', 'past_due', 'trialing']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Usage Tracking Schema
export const UsageTrackingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  period: z.string(), // YYYY-MM format
  recordingsCount: z.number().default(0),
  storageUsedGB: z.number().default(0),
  aiEnhancementsUsed: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Billing Event Schema
export const BillingEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  eventType: z.enum([
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'payment_succeeded',
    'payment_failed',
    'invoice_created',
    'invoice_paid',
    'invoice_payment_failed'
  ]),
  stripeEventId: z.string().optional(),
  data: z.record(z.any()),
  createdAt: z.date(),
});

// Create Subscription Schema
export const CreateSubscriptionSchema = z.object({
  planType: z.enum(['pro', 'enterprise']),
  paymentMethodId: z.string(),
  interval: z.enum(['month', 'year']).default('month'),
});

// Update Subscription Schema
export const UpdateSubscriptionSchema = z.object({
  planType: z.enum(['free', 'pro', 'enterprise']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

// TypeScript Types
export type PlanConfig = z.infer<typeof PlanConfigSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type UsageTracking = z.infer<typeof UsageTrackingSchema>;
export type BillingEvent = z.infer<typeof BillingEventSchema>;
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;

// Plan Configurations
export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRecordings: 5,
      maxStorageGB: 1,
      aiEnhancements: false,
      customBranding: false,
      analytics: false,
      teamCollaboration: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 29,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRecordings: null, // unlimited
      maxStorageGB: 100,
      aiEnhancements: true,
      customBranding: true,
      analytics: true,
      teamCollaboration: false,
      prioritySupport: true,
      apiAccess: true,
    },
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 99,
    currency: 'usd',
    interval: 'month',
    features: {
      maxRecordings: null, // unlimited
      maxStorageGB: null, // unlimited
      aiEnhancements: true,
      customBranding: true,
      analytics: true,
      teamCollaboration: true,
      prioritySupport: true,
      apiAccess: true,
    },
    stripePriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
  },
};