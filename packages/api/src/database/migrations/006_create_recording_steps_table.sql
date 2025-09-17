-- Create recording_steps table for storing captured interaction steps
CREATE TABLE IF NOT EXISTS recording_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('click', 'type', 'navigate', 'scroll', 'hover', 'focus', 'submit')),
    element TEXT,
    coordinates JSONB,
    text TEXT,
    url TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recording_steps_session_id ON recording_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_recording_steps_timestamp ON recording_steps(timestamp);
CREATE INDEX IF NOT EXISTS idx_recording_steps_action ON recording_steps(action);
CREATE INDEX IF NOT EXISTS idx_recording_steps_created_at ON recording_steps(created_at);

-- Add comments for documentation
COMMENT ON TABLE recording_steps IS 'Stores individual interaction steps captured during recording sessions';
COMMENT ON COLUMN recording_steps.id IS 'Unique identifier for the step';
COMMENT ON COLUMN recording_steps.session_id IS 'Reference to the recording session';
COMMENT ON COLUMN recording_steps.timestamp IS 'Timestamp of the step relative to recording start (milliseconds)';
COMMENT ON COLUMN recording_steps.action IS 'Type of user interaction (click, type, navigate, etc.)';
COMMENT ON COLUMN recording_steps.element IS 'CSS selector or description of the target element';
COMMENT ON COLUMN recording_steps.coordinates IS 'Mouse coordinates as JSON {x, y}';
COMMENT ON COLUMN recording_steps.text IS 'Text content for input actions or element text';
COMMENT ON COLUMN recording_steps.url IS 'URL where the action occurred';
COMMENT ON COLUMN recording_steps.screenshot_url IS 'URL to screenshot captured at this step';
COMMENT ON COLUMN recording_steps.created_at IS 'When this step record was created';