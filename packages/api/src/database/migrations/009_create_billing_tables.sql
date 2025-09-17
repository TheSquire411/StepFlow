-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    recordings_count INTEGER DEFAULT 0,
    storage_used_gb DECIMAL(10,2) DEFAULT 0,
    ai_enhancements_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, period)
);

-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'subscription_created',
        'subscription_updated', 
        'subscription_cancelled',
        'payment_succeeded',
        'payment_failed',
        'invoice_created',
        'invoice_paid',
        'invoice_payment_failed'
    )),
    stripe_event_id VARCHAR(255),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stripe_customer_id to subscriptions table if not exists
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Update subscription status enum to include 'trialing'
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_id ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Create triggers for updated_at
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();