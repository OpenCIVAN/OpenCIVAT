-- CIA Web Analytics Platform - Database Schema
-- This runs automatically when the PostgreSQL container first starts

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
-- A session represents a collaborative workspace where users share datasets and views
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Datasets table
-- Stores metadata about uploaded datasets
-- The actual VTK polydata will be stored as binary files
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(20) NOT NULL DEFAULT 'unknown',
    mime_type VARCHAR(100),
    storage_key VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Annotations table
-- Annotations are spatially anchored to dataset coordinates
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    position JSONB NOT NULL,
    content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View Configurations table
-- ViewConfigurations define filters, camera positions, and widget states
CREATE TABLE view_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    dataset_ids UUID[] NOT NULL,
    name VARCHAR(255),
    camera JSONB NOT NULL,
    widgets JSONB DEFAULT '[]'::jsonb,
    annotation_filters JSONB DEFAULT '{}'::jsonb,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Jobs table
-- Track long-running computations like PCA, t-SNE, UMAP
CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    algorithm VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns
CREATE INDEX idx_datasets_session ON datasets(session_id);
CREATE INDEX idx_annotations_dataset ON annotations(dataset_id);
CREATE INDEX idx_view_configs_session ON view_configurations(session_id);
CREATE INDEX idx_analysis_dataset ON analysis_jobs(dataset_id);
CREATE INDEX idx_analysis_status ON analysis_jobs(status);

-- Create a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_view_configs_updated_at BEFORE UPDATE ON view_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create the default development session
-- This ensures the DEFAULT_SESSION_ID used by the React app exists in the database
INSERT INTO sessions (id, name, settings)

VALUES ('00000000-0000-0000-0000-000000000001', 'Default Development Session', '{}')

ON CONFLICT (id) DO NOTHING;

-- ============================================================================

-- MULTI-TENANT ARCHITECTURE (from migration 002)

-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    storage_quota_bytes BIGINT DEFAULT 10737418240,
    storage_used_bytes BIGINT DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}'::jsonb,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Projects table (evolution of sessions)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    visibility VARCHAR(20) DEFAULT 'private',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    UNIQUE(organization_id, slug)
);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}'::jsonb,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Extend datasets table with new columns
ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
    ADD COLUMN IF NOT EXISTS hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS public_path VARCHAR(500);

-- File project access table
CREATE TABLE IF NOT EXISTS file_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    access_level VARCHAR(20) NOT NULL DEFAULT 'read',
    visibility VARCHAR(20) DEFAULT 'all_members',
    visible_to_users UUID[] DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, project_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    room_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT
);

-- Add project_id to view_configurations
ALTER TABLE view_configurations
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_datasets_hash ON datasets(hash);
CREATE INDEX IF NOT EXISTS idx_datasets_org ON datasets(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_access_project ON file_project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_file_access_file ON file_project_access(file_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- Apply triggers to new tables
CREATE TRIGGER IF NOT EXISTS update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo organization and project
INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000000', 'CIA Web Demo', 'demo', 107374182400)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, organization_id, name, slug, visibility, description)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'Sample Files',
    'samples',
    'public',
    'Demo datasets for exploring CIA Web features'
)
ON CONFLICT (id) DO NOTHING;

-- Create default organization for existing data
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000002', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- Update existing datasets to belong to default organization
UPDATE datasets
SET organization_id = '00000000-0000-0000-0000-000000000002'
WHERE organization_id IS NULL;