-- Create guide analytics table
CREATE TABLE IF NOT EXISTS guide_analytics (
    guide_id UUID PRIMARY KEY REFERENCES guides(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    unique_view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    total_completion_time BIGINT DEFAULT 0,
    average_completion_time FLOAT DEFAULT 0,
    bounce_rate FLOAT DEFAULT 0,
    last_viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create guide view events table
CREATE TABLE IF NOT EXISTS guide_view_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    session_id UUID,
    user_agent TEXT,
    referrer TEXT,
    viewport JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create guide step events table
CREATE TABLE IF NOT EXISTS guide_step_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'time', 'interaction'
    data JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create guide completion events table
CREATE TABLE IF NOT EXISTS guide_completion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    session_id UUID,
    total_time BIGINT NOT NULL,
    completed_steps INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create guide engagement events table
CREATE TABLE IF NOT EXISTS guide_engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'share', 'fullscreen', 'speed_change', etc.
    data JSONB,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guide_view_events_guide_id ON guide_view_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_view_events_timestamp ON guide_view_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_guide_id ON guide_step_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_step_index ON guide_step_events(step_index);
CREATE INDEX IF NOT EXISTS idx_guide_step_events_timestamp ON guide_step_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_guide_completion_events_guide_id ON guide_completion_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_completion_events_timestamp ON guide_completion_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_guide_id ON guide_engagement_events(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_action ON guide_engagement_events(action);
CREATE INDEX IF NOT EXISTS idx_guide_engagement_events_timestamp ON guide_engagement_events(timestamp);

-- Create trigger to automatically create analytics record when guide is created
CREATE OR REPLACE FUNCTION create_guide_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO guide_analytics (guide_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_guide_analytics
    AFTER INSERT ON guides
    FOR EACH ROW
    EXECUTE FUNCTION create_guide_analytics();

-- Create function to update analytics aggregates
CREATE OR REPLACE FUNCTION update_guide_analytics_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Update average completion time
    UPDATE guide_analytics 
    SET 
        average_completion_time = CASE 
            WHEN completion_count > 0 THEN total_completion_time::FLOAT / completion_count 
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE guide_id = NEW.guide_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analytics_on_completion
    AFTER INSERT ON guide_completion_events
    FOR EACH ROW
    EXECUTE FUNCTION update_guide_analytics_aggregates();