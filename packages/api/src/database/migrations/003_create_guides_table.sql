-- Create guides table
CREATE TABLE IF NOT EXISTS guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'processing')),
    language VARCHAR(10) DEFAULT 'en',
    estimated_duration INTEGER, -- in seconds
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create processed_steps table
CREATE TABLE IF NOT EXISTS processed_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_url TEXT NOT NULL,
    audio_url TEXT,
    duration INTEGER, -- audio duration in seconds
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create annotations table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES processed_steps(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('highlight', 'arrow', 'blur', 'text', 'circle', 'rectangle')),
    coordinates_x INTEGER NOT NULL,
    coordinates_y INTEGER NOT NULL,
    coordinates_width INTEGER,
    coordinates_height INTEGER,
    style JSONB DEFAULT '{}',
    text_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guide_analytics table
CREATE TABLE IF NOT EXISTS guide_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    total_views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (completion_rate >= 0 AND completion_rate <= 100),
    average_time_spent INTEGER DEFAULT 0, -- in seconds
    step_analytics JSONB DEFAULT '[]',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guides_user_id ON guides(user_id);
CREATE INDEX IF NOT EXISTS idx_guides_recording_id ON guides(recording_id);
CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status);
CREATE INDEX IF NOT EXISTS idx_guides_category ON guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_language ON guides(language);
CREATE INDEX IF NOT EXISTS idx_guides_created_at ON guides(created_at);
CREATE INDEX IF NOT EXISTS idx_guides_published_at ON guides(published_at);

-- Create GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_guides_tags ON guides USING GIN(tags);

-- Create full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_guides_search ON guides USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_processed_steps_guide_id ON processed_steps(guide_id);
CREATE INDEX IF NOT EXISTS idx_processed_steps_order ON processed_steps(step_order);

CREATE INDEX IF NOT EXISTS idx_annotations_step_id ON annotations(step_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);

CREATE INDEX IF NOT EXISTS idx_guide_analytics_guide_id ON guide_analytics(guide_id);

-- Create unique constraint for guide analytics (one record per guide)
ALTER TABLE guide_analytics ADD CONSTRAINT unique_guide_analytics_guide_id UNIQUE (guide_id);

-- Create unique constraint for step order within a guide
ALTER TABLE processed_steps ADD CONSTRAINT unique_guide_step_order UNIQUE (guide_id, step_order);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON guides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processed_steps_updated_at BEFORE UPDATE ON processed_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();