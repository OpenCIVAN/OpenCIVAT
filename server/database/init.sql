-- CIA Web Analytics Platform - Consolidated Database Schema
-- v2.0 Server-Authority Architecture
--
-- This is the SINGLE source of truth for the database schema.
-- Run this on a fresh database to set up everything.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations (multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    storage_quota_bytes BIGINT DEFAULT 10737418240,  -- 10 GB
    storage_used_bytes BIGINT DEFAULT 0,
    audit_config JSONB DEFAULT '{"level": "standard"}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    UNIQUE(organization_id, user_id)
);

-- Projects (collaboration rooms)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    visibility VARCHAR(20) DEFAULT 'private',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug)
);

-- Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project branches (git-like branching for annotations)
CREATE TABLE project_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_branch_id UUID REFERENCES project_branches(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    merged_by UUID REFERENCES users(id),
    UNIQUE(project_id, name)
);

-- ============================================================================
-- FILES (Datasets)
-- ============================================================================

-- Datasets (files) table
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_type VARCHAR(50) NOT NULL DEFAULT 'unknown',
    hash VARCHAR(64),
    storage_key VARCHAR(500),
    public_path VARCHAR(500),

    -- Metadata
    point_count INTEGER,
    cell_count INTEGER,
    bounds JSONB,
    data_arrays JSONB,

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active',
    current_version_id UUID,  -- FK added after file_versions created

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File versions (tracks history when file content changes)
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    change_note TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- Add FK for current version (after file_versions exists)
ALTER TABLE datasets
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id) REFERENCES file_versions(id);

-- File project access (links files to projects)
CREATE TABLE file_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    access_level VARCHAR(20) NOT NULL DEFAULT 'read',
    visibility VARCHAR(20) DEFAULT 'all_members',
    visible_to_users UUID[] DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, project_id)
);

-- ============================================================================
-- VIEW CONFIGURATIONS
-- ============================================================================

CREATE TABLE view_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES project_branches(id),
    file_version_id UUID REFERENCES file_versions(id),
    dataset_ids UUID[],

    name VARCHAR(255),
    camera JSONB,
    widgets JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',

    is_shared BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(50) DEFAULT 'private',

    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANNOTATIONS (Dataset-level)
-- ============================================================================

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    branch_id UUID REFERENCES project_branches(id),

    -- Spatial data
    position DOUBLE PRECISION[3],
    normal DOUBLE PRECISION[3],

    -- Content
    type VARCHAR(50) NOT NULL DEFAULT 'point',
    text TEXT,
    content JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Visibility
    visibility VARCHAR(50) DEFAULT 'public',
    visibility_group UUID[],

    -- Status
    status VARCHAR(50) DEFAULT 'active',
    migrated_from UUID REFERENCES annotations(id),

    -- Legacy fields
    user_id VARCHAR(255),

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WORKSPACE ANNOTATIONS (Grid-level, spanning multiple datasets)
-- ============================================================================

CREATE TABLE workspace_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    view_id UUID REFERENCES view_configurations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES project_branches(id) ON DELETE SET NULL,

    type VARCHAR(50) NOT NULL,
    path_data JSONB NOT NULL,
    screen_coordinates JSONB NOT NULL,

    linked_datasets UUID[],
    linked_grid_slots VARCHAR(50)[],
    linked_view_ids UUID[],

    style JSONB DEFAULT '{"strokeColor": "#ffffff", "strokeWidth": 2, "opacity": 1.0}',
    text_content TEXT,
    label VARCHAR(255),
    metadata JSONB DEFAULT '{}',

    visibility VARCHAR(50) DEFAULT 'project',
    visibility_users UUID[],

    status VARCHAR(50) DEFAULT 'active',
    locked BOOLEAN DEFAULT FALSE,
    z_index INTEGER DEFAULT 0,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_annotation_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_annotation_id UUID NOT NULL REFERENCES workspace_annotations(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    version_number INTEGER NOT NULL,
    change_note TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_annotation_id, version_number)
);

-- ============================================================================
-- COMPUTATION
-- ============================================================================

CREATE TABLE computation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    result_storage_key VARCHAR(500),
    result_metadata JSONB,
    compute_time_ms BIGINT,
    result_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ
);

CREATE TABLE computation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    cache_id UUID REFERENCES computation_cache(id),
    result_metadata JSONB,
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requested_by UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id)
);

-- ============================================================================
-- SESSION RECORDINGS (For audit/playback)
-- ============================================================================

CREATE TABLE session_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,
    storage_key VARCHAR(500),
    file_size BIGINT,
    frame_count INTEGER,
    metadata JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'recording',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    room_id UUID,
    session_recording_id UUID REFERENCES session_recordings(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Datasets
CREATE INDEX idx_datasets_hash ON datasets(hash);
CREATE INDEX idx_datasets_org ON datasets(organization_id);
CREATE INDEX idx_datasets_status ON datasets(status);

-- File versions
CREATE INDEX idx_file_versions_file ON file_versions(file_id);
CREATE INDEX idx_file_versions_hash ON file_versions(hash);

-- File project access
CREATE INDEX idx_file_access_project ON file_project_access(project_id);
CREATE INDEX idx_file_access_file ON file_project_access(file_id);

-- Project branches
CREATE INDEX idx_branches_project ON project_branches(project_id);
CREATE INDEX idx_branches_status ON project_branches(status);

-- Annotations
CREATE INDEX idx_annotations_dataset ON annotations(dataset_id);
CREATE INDEX idx_annotations_branch ON annotations(branch_id);
CREATE INDEX idx_annotations_status ON annotations(status);

-- Workspace annotations
CREATE INDEX idx_workspace_ann_project ON workspace_annotations(project_id);
CREATE INDEX idx_workspace_ann_view ON workspace_annotations(view_id);
CREATE INDEX idx_workspace_ann_status ON workspace_annotations(status);
CREATE INDEX idx_workspace_ann_linked_datasets ON workspace_annotations USING GIN(linked_datasets);

-- View configurations
CREATE INDEX idx_views_project ON view_configurations(project_id);
CREATE INDEX idx_views_shared ON view_configurations(is_shared);

-- Computation
CREATE INDEX idx_cache_key ON computation_cache(cache_key);
CREATE INDEX idx_cache_file ON computation_cache(file_id);
CREATE INDEX idx_jobs_status ON computation_jobs(status);
CREATE INDEX idx_jobs_file ON computation_jobs(file_id);

-- Audit
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_org ON audit_log(organization_id, timestamp DESC);
CREATE INDEX idx_audit_project ON audit_log(project_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_view_configs_updated_at BEFORE UPDATE ON view_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_ann_updated_at BEFORE UPDATE ON workspace_annotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Create new file version
CREATE OR REPLACE FUNCTION create_file_version(
    p_file_id UUID,
    p_hash VARCHAR(64),
    p_storage_key VARCHAR(500),
    p_uploaded_by UUID,
    p_change_note TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id UUID;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM file_versions WHERE file_id = p_file_id;

    INSERT INTO file_versions (file_id, version_number, hash, storage_key, uploaded_by, change_note)
    VALUES (p_file_id, v_version_number, p_hash, p_storage_key, p_uploaded_by, p_change_note)
    RETURNING id INTO v_version_id;

    UPDATE datasets SET current_version_id = v_version_id, updated_at = NOW()
    WHERE id = p_file_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_org_id UUID,
    p_project_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_email VARCHAR(255);
BEGIN
    SELECT email INTO v_user_email FROM users WHERE id = p_user_id;

    INSERT INTO audit_log (
        user_id, user_email, organization_id, project_id,
        action, entity_type, entity_id, before_state, after_state, details
    ) VALUES (
        p_user_id, v_user_email, p_org_id, p_project_id,
        p_action, p_entity_type, p_entity_id, p_before_state, p_after_state, p_details
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- System organization
INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'system', 1099511627776)
ON CONFLICT (id) DO NOTHING;

-- Demo user
INSERT INTO users (id, external_id, email, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-user', 'demo@cia-web.local', 'Demo User')
ON CONFLICT (id) DO NOTHING;

-- Demo project
INSERT INTO projects (id, organization_id, name, slug, description, visibility, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'Sample Files',
    'sample-files',
    'Demo project with sample VTK files',
    'public',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Main branch for demo project
INSERT INTO project_branches (project_id, name, description, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'main', 'Default branch', 'active')
ON CONFLICT (project_id, name) DO NOTHING;

-- Demo user as project member
INSERT INTO project_members (project_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Demo files: Run ./scripts/load-demo-files.sh to upload VTP samples to MinIO

-- ============================================================================
-- DONE
-- ============================================================================