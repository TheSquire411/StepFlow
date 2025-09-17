-- Create processed_steps table for storing analyzed and enhanced interaction steps
CREATE TABLE IF NOT EXISTS processed_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('click', 'type', 'navigate', 'scroll', 'hover', 'focus', 'submit')),
    element TEXT,
    coordinates JSONB,
    text TEXT,
    url TEXT,
    screenshot_url TEXT,
    element_type VARCHAR(100),
    element_text TEXT,
    element_attributes JSONB,
    action_description TEXT NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    bounding_box JSONB,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_processed_steps_session_id ON processed_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_processed_steps_timestamp ON processed_steps(timestamp);
CREATE INDEX IF NOT EXISTS idx_processed_steps_action ON processed_steps(action);
CREATE INDEX IF NOT EXISTS idx_processed_steps_confidence ON processed_steps(confidence);
CREATE INDEX IF NOT EXISTS idx_processed_steps_processed_at ON processed_steps(processed_at);
CREATE INDEX IF NOT EXISTS idx_processed_steps_created_at ON processed_steps(created_at);

-- Create GIN index for JSONB columns for better search performance
CREATE INDEX IF NOT EXISTS idx_processed_steps_coordinates_gin ON processed_steps USING GIN (coordinates);
CREATE INDEX IF NOT EXISTS idx_processed_steps_element_attributes_gin ON processed_steps USING GIN (element_attributes);
CREATE INDEX IF NOT EXISTS idx_processed_steps_bounding_box_gin ON processed_steps USING GIN (bounding_box);

-- Create full-text search index for text content
CREATE INDEX IF NOT EXISTS idx_processed_steps_text_search ON processed_steps USING GIN (
    to_tsvector('english', COALESCE(element_text, '') || ' ' || COALESCE(action_description, '') || ' ' || COALESCE(text, ''))
);

-- Add comments for documentation
COMMENT ON TABLE processed_steps IS 'Stores processed and analyzed interaction steps with enhanced metadata';
COMMENT ON COLUMN processed_steps.id IS 'Unique identifier for the processed step';
COMMENT ON COLUMN processed_steps.session_id IS 'Reference to the recording session';
COMMENT ON COLUMN processed_steps.timestamp IS 'Timestamp of the step relative to recording start (milliseconds)';
COMMENT ON COLUMN processed_steps.action IS 'Type of user interaction (click, type, navigate, etc.)';
COMMENT ON COLUMN processed_steps.element IS 'CSS selector or description of the target element';
COMMENT ON COLUMN processed_steps.coordinates IS 'Mouse coordinates as JSON {x, y}';
COMMENT ON COLUMN processed_steps.text IS 'Text content for input actions or element text';
COMMENT ON COLUMN processed_steps.url IS 'URL where the action occurred';
COMMENT ON COLUMN processed_steps.screenshot_url IS 'URL to screenshot captured at this step';
COMMENT ON COLUMN processed_steps.element_type IS 'Detected type of the target element (button, input, link, etc.)';
COMMENT ON COLUMN processed_steps.element_text IS 'Extracted text content from the element';
COMMENT ON COLUMN processed_steps.element_attributes IS 'Parsed element attributes as JSON';
COMMENT ON COLUMN processed_steps.action_description IS 'Human-readable description of the action';
COMMENT ON COLUMN processed_steps.confidence IS 'Confidence score of the step detection (0.0 to 1.0)';
COMMENT ON COLUMN processed_steps.bounding_box IS 'Element bounding box as JSON {x, y, width, height}';
COMMENT ON COLUMN processed_steps.processed_at IS 'When this step was processed by the detection service';
COMMENT ON COLUMN processed_steps.created_at IS 'When this step record was created';