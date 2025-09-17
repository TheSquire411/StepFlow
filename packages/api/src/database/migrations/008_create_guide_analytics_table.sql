-- Create guide_analytics table for tracking guide metrics
CREATE TABLE IF NOT EXISTS guide_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guide_analytics_guide_id ON guide_analytics(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_view_count ON guide_analytics(view_count);
CREATE INDEX IF NOT EXISTS idx_guide_analytics_last_viewed ON guide_analytics(last_viewed_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guide_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guide_analytics_updated_at
    BEFORE UPDATE ON guide_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_guide_analytics_updated_at();