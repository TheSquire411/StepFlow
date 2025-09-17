-- Create sharing_settings table
CREATE TABLE IF NOT EXISTS sharing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    share_url TEXT NOT NULL UNIQUE,
    embed_code TEXT NOT NULL,
    allowed_domains TEXT[] DEFAULT '{}',
    password_protected BOOLEAN DEFAULT FALSE,
    password_hash TEXT,
    require_auth BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_download BOOLEAN DEFAULT FALSE,
    track_analytics BOOLEAN DEFAULT TRUE,
    custom_branding BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_views INTEGER,
    current_views INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create share_permissions table
CREATE TABLE IF NOT EXISTS share_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create share_access_logs table
CREATE TABLE IF NOT EXISTS share_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    sharing_settings_id UUID NOT NULL REFERENCES sharing_settings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    referrer TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_duration INTEGER, -- in seconds
    steps_viewed UUID[] DEFAULT '{}',
    completed_guide BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sharing_settings_guide_id ON sharing_settings(guide_id);
CREATE INDEX IF NOT EXISTS idx_sharing_settings_share_url ON sharing_settings(share_url);
CREATE INDEX IF NOT EXISTS idx_sharing_settings_is_public ON sharing_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_sharing_settings_expires_at ON sharing_settings(expires_at);

CREATE INDEX IF NOT EXISTS idx_share_permissions_guide_id ON share_permissions(guide_id);
CREATE INDEX IF NOT EXISTS idx_share_permissions_user_id ON share_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_share_permissions_email ON share_permissions(email);
CREATE INDEX IF NOT EXISTS idx_share_permissions_role ON share_permissions(role);
CREATE INDEX IF NOT EXISTS idx_share_permissions_granted_by ON share_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_guide_id ON share_access_logs(guide_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_sharing_settings_id ON share_access_logs(sharing_settings_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_user_id ON share_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_accessed_at ON share_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_ip_address ON share_access_logs(ip_address);

-- Create unique constraint for sharing settings (one record per guide)
ALTER TABLE sharing_settings ADD CONSTRAINT unique_sharing_settings_guide_id UNIQUE (guide_id);

-- Create constraint to ensure either user_id or email is provided for permissions
ALTER TABLE share_permissions ADD CONSTRAINT check_user_or_email 
    CHECK ((user_id IS NOT NULL) OR (email IS NOT NULL));

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_sharing_settings_updated_at BEFORE UPDATE ON sharing_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate unique share URLs
CREATE OR REPLACE FUNCTION generate_share_url()
RETURNS TEXT AS $$
DECLARE
    url_id TEXT;
BEGIN
    -- Generate a random 12-character string
    url_id := encode(gen_random_bytes(9), 'base64');
    -- Remove URL-unsafe characters
    url_id := replace(replace(replace(url_id, '+', ''), '/', ''), '=', '');
    -- Ensure it's exactly 12 characters
    url_id := left(url_id, 12);
    
    RETURN 'https://stepflow.app/share/' || url_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate embed code
CREATE OR REPLACE FUNCTION generate_embed_code(share_url TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN '<iframe src="' || share_url || '/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>';
END;
$$ LANGUAGE plpgsql;