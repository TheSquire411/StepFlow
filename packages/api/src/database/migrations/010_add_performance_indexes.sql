-- Performance optimization indexes for StepFlow platform

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Recordings table indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_recordings_user_status ON recordings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recordings_duration ON recordings(duration);

-- Guides table indexes
CREATE INDEX IF NOT EXISTS idx_guides_user_id ON guides(user_id);
CREATE INDEX IF NOT EXISTS idx_guides_recording_id ON guides(recording_id);
CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status);
CREATE INDEX IF NOT EXISTS idx_guides_category ON guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_language ON guides(language);
CREATE INDEX IF NOT EXISTS idx_guides_difficulty ON guides(difficulty);
CREATE INDEX IF NOT EXISTS idx_guides_created_at ON guides(created_at);
CREATE INDEX IF NOT EXISTS idx_guides_updated_at ON guides(updated_at);
CREATE INDEX IF NOT EXISTS idx_guides_user_status ON guides(user_id, status);
CREATE INDEX IF NOT EXISTS idx_guides_user_category ON guides(user_id, category);

-- Full-text search index for guides
CREATE INDEX IF NOT EXISTS idx_guides_search ON guides USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Tags array index for guides
CREATE INDEX IF NOT EXISTS idx_guides_tags ON guides USING gin(tags);

-- Processed steps table indexes
CREATE INDEX IF NOT EXISTS idx_processed_steps_guide_id ON processed_steps(guide_id);
CREATE INDEX IF NOT EXISTS idx_processed_steps_order ON processed_steps(guide_id, step_order);

-- Sharing table indexes
CREATE INDEX IF NOT EXISTS idx_sharing_guide_id ON sharing(guide_id);
CREATE INDEX IF NOT EXISTS idx_sharing_share_url ON sharing(share_url);
CREATE INDEX IF NOT EXISTS idx_sharing_is_public ON sharing(is_public);
CREATE INDEX IF NOT EXISTS idx_sharing_expires_at ON sharing(expires_at) WHERE expires_at IS NOT NULL;

-- Analytics tables indexes
CREATE INDEX IF NOT EXISTS idx_guide_analytics_guide_id ON guide_analytics(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_view_count ON guide_analytics(view_count);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_completion_count ON guide_analytics(completion_count);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_last_viewed ON guide_analytics(last_viewed_at);

CREATE INDEX IF NOT EXISTS idx_guide_view_events_guide_id ON guide_view_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_view_events_timestamp ON guide_view_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_guide_view_events_guide_timestamp ON guide_view_events(guide_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_guide_step_events_guide_id ON guide_step_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_step_index ON guide_step_events(guide_id, step_index);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_event_type ON guide_step_events(event_type);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_timestamp ON guide_step_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_guide_completion_events_guide_id ON guide_completion_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_completion_events_timestamp ON guide_completion_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_guide_id ON guide_engagement_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_action ON guide_engagement_events(action);
CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_timestamp ON guide_engagement_events(timestamp);

-- Billing tables indexes (if they exist)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_guides_user_status_updated ON guides(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_guides_public_category ON guides(status, category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_guides_popular ON guides(status) INCLUDE (id, title, created_at) WHERE status = 'published';

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_guides_published ON guides(created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_guides_draft ON guides(updated_at DESC) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_recordings_completed ON recordings(created_at DESC) WHERE status = 'completed';

-- Recording sessions indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_created_at ON recording_sessions(created_at);

-- Recording steps indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_recording_steps_session_id ON recording_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_recording_steps_timestamp ON recording_steps(session_id, timestamp);

-- Add constraints for data integrity
ALTER TABLE guides ADD CONSTRAINT chk_guides_status CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE recordings ADD CONSTRAINT chk_recordings_status CHECK (status IN ('processing', 'completed', 'failed'));
ALTER TABLE guides ADD CONSTRAINT chk_guides_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced') OR difficulty IS NULL);

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE recordings;
ANALYZE guides;
ANALYZE processed_steps;
ANALYZE sharing;
ANALYZE guide_analytics;
ANALYZE guide_view_events;
ANALYZE guide_step_events;
ANALYZE guide_completion_events;
ANALYZE guide_engagement_events;