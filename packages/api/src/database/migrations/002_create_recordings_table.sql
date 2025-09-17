-- Create recording_sessions table for active recordings
CREATE TABLE IF NOT EXISTS recording_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES recording_sessions(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 0, -- in seconds
    file_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0, -- in bytes
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
    processing_progress INTEGER DEFAULT 0 CHECK (processing_progress >= 0 AND processing_progress <= 100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create captured_steps table
CREATE TABLE IF NOT EXISTS captured_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    timestamp_ms BIGINT NOT NULL, -- timestamp in milliseconds from start of recording
    action VARCHAR(20) NOT NULL CHECK (action IN ('click', 'type', 'navigate', 'scroll', 'hover', 'focus', 'blur')),
    element TEXT,
    coordinates_x INTEGER,
    coordinates_y INTEGER,
    text_content TEXT,
    url TEXT,
    screenshot_url TEXT NOT NULL,
    element_selector TEXT,
    element_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);

CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);

CREATE INDEX IF NOT EXISTS idx_captured_steps_recording_id ON captured_steps(recording_id);
CREATE INDEX IF NOT EXISTS idx_captured_steps_timestamp ON captured_steps(timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_captured_steps_action ON captured_steps(action);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();