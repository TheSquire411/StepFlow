-- Migration: Create recording_sessions table
-- This table stores active recording sessions before they are completed and converted to recordings

CREATE TABLE IF NOT EXISTS recording_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_started_at ON recording_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_last_activity ON recording_sessions(last_activity_at);

-- Create a composite index for user queries
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_status ON recording_sessions(user_id, status);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recording_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recording_sessions_updated_at
    BEFORE UPDATE ON recording_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_recording_sessions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recording_sessions IS 'Stores active recording sessions before completion';
COMMENT ON COLUMN recording_sessions.id IS 'Unique identifier for the recording session';
COMMENT ON COLUMN recording_sessions.user_id IS 'ID of the user who owns this recording session';
COMMENT ON COLUMN recording_sessions.title IS 'Title of the recording session';
COMMENT ON COLUMN recording_sessions.description IS 'Optional description of what is being recorded';
COMMENT ON COLUMN recording_sessions.status IS 'Current status of the recording session';
COMMENT ON COLUMN recording_sessions.started_at IS 'When the recording session was started';
COMMENT ON COLUMN recording_sessions.last_activity_at IS 'Last time there was activity in this session';
COMMENT ON COLUMN recording_sessions.metadata IS 'Additional metadata about the recording session (browser info, settings, etc.)';