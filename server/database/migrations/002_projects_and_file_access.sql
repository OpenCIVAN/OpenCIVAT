-- server/database/migrations/002_projects_and_file_access.sql
-- CIA Web Analytics Platform - Multi-tenant Projects & File Access
-- 
-- This migration evolves the schema to support:
-- 1. Organizations (labs, companies) that own storage
-- 2. Projects (war rooms) that organize work
-- 3. File access control (files can be shared across projects)
-- 4. Audit trail for compliance
--
-- Run with: psql -U ciauser -d cia_analytics -f 002_projects_and_file_access.sql

BEGIN;

-- ============================================================================
-- ORGANIZATIONS
-- Labs, companies, research groups that own storage and billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    
    -- Storage configuration
    storage_quota_bytes BIGINT DEFAULT 10737418240, -- 10GB default
    storage_used_bytes BIGINT DEFAULT 0,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    -- settings might include:
    -- { "allowPublicProjects": false, "requireMFA": true, "retentionDays": 365 }
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USERS
-- Individual users who can belong to organizations
-- Note: Authentication handled by external provider (Auth0/Keycloak)
-- This table stores app-specific user data
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- External auth provider ID (from Auth0, Keycloak, etc.)
    external_id VARCHAR(255) UNIQUE,
    
    -- Profile info (may sync from auth provider)
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    
    -- App-specific settings
    preferences JSONB DEFAULT '{}'::jsonb,
    -- preferences might include:
    -- { "theme": "dark", "showCursors": true, "defaultProject": "uuid" }
    
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ORGANIZATION MEMBERS
-- Links users to organizations with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role within organization
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    -- Roles: 'owner', 'admin', 'member', 'viewer'
    
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP,
    
    UNIQUE(organization_id, user_id)
);

-- ============================================================================
-- PROJECTS (Evolution of sessions)
-- War rooms / workspaces where analysis happens
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Project info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-friendly, unique within org
    description TEXT,
    
    -- Hierarchy for branching rooms
    parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    -- If set, this is a "branch" or "breakout room"
    
    -- Visibility
    visibility VARCHAR(20) DEFAULT 'private',
    -- 'private' = members only, 'organization' = all org members, 'public' = anyone with link
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    -- 'active', 'archived', 'merged'
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    -- settings might include:
    -- { "allowAnonymous": false, "recordAllSessions": true }
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    
    UNIQUE(organization_id, slug)
);

-- ============================================================================
-- PROJECT MEMBERS
-- Who has access to each project and what role
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role within project
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    -- Roles: 'owner', 'admin', 'editor', 'commenter', 'viewer'
    
    -- Permissions (fine-grained, optional override of role)
    permissions JSONB DEFAULT '{}'::jsonb,
    -- { "canUpload": true, "canAnnotate": true, "canInvite": false }
    
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, user_id)
);

-- ============================================================================
-- FILES (Evolution of datasets)
-- Physical files stored in S3/MinIO, owned by organization
-- ============================================================================

-- First, let's add organization_id to existing datasets table
-- and prepare for the transition

ALTER TABLE datasets 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
    ADD COLUMN IF NOT EXISTS hash VARCHAR(64), -- SHA-256 for deduplication
    ADD COLUMN IF NOT EXISTS public_path VARCHAR(500); -- For sample/demo files

-- Create index for hash lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_datasets_hash ON datasets(hash);
CREATE INDEX IF NOT EXISTS idx_datasets_org ON datasets(organization_id);

-- ============================================================================
-- FILE PROJECT ACCESS
-- Junction table: which projects can access which files
-- This enables sharing files across projects without duplication
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    file_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Access level
    access_level VARCHAR(20) NOT NULL DEFAULT 'read',
    -- 'read' = view/download, 'annotate' = add annotations, 'admin' = manage access
    
    -- Visibility within project
    visibility VARCHAR(20) DEFAULT 'all_members',
    -- 'all_members', 'admins_only', 'specific_users'
    
    -- If visibility = 'specific_users', list them here
    visible_to_users UUID[] DEFAULT '{}',
    
    -- Audit
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(file_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_file_access_project ON file_project_access(project_id);
CREATE INDEX IF NOT EXISTS idx_file_access_file ON file_project_access(file_id);

-- ============================================================================
-- AUDIT LOG
-- Immutable record of all significant actions for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- When
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Who
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255), -- Denormalized for historical record
    
    -- Where
    organization_id UUID REFERENCES organizations(id),
    project_id UUID REFERENCES projects(id),
    room_id UUID, -- For breakout rooms (future)
    
    -- What
    action VARCHAR(100) NOT NULL,
    -- Actions: 'file.uploaded', 'file.downloaded', 'file.deleted',
    --          'annotation.created', 'annotation.deleted',
    --          'view.created', 'view.shared',
    --          'project.created', 'project.archived',
    --          'member.invited', 'member.removed',
    --          'session.started', 'session.ended'
    
    -- On what
    entity_type VARCHAR(50), -- 'file', 'annotation', 'view', 'project', 'user'
    entity_id UUID,
    
    -- Details (action-specific data)
    details JSONB DEFAULT '{}'::jsonb,
    -- For file.uploaded: { filename, size, hash }
    -- For annotation.created: { position, content }
    -- For view.created: { camera, filters }
    
    -- Client info (for compliance)
    ip_address INET,
    user_agent TEXT
);

-- Audit log is append-only, optimize for time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_project ON audit_log(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- ============================================================================
-- SAMPLE/DEMO FILES
-- Pre-seeded files for new users and demos
-- These belong to a system organization
-- ============================================================================

-- Create system organization for demo content
INSERT INTO organizations (id, name, slug, storage_quota_bytes)
VALUES ('00000000-0000-0000-0000-000000000000', 'CIA Web Demo', 'demo', 107374182400)
ON CONFLICT (id) DO NOTHING;

-- Create demo project
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

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has access to a file in a project context
CREATE OR REPLACE FUNCTION user_can_access_file(
    p_user_id UUID,
    p_file_id UUID,
    p_project_id UUID,
    p_required_level VARCHAR DEFAULT 'read'
) RETURNS BOOLEAN AS $$
DECLARE
    v_access_level VARCHAR;
    v_visibility VARCHAR;
    v_visible_to UUID[];
    v_user_role VARCHAR;
BEGIN
    -- Get file access record
    SELECT access_level, visibility, visible_to_users
    INTO v_access_level, v_visibility, v_visible_to
    FROM file_project_access
    WHERE file_id = p_file_id AND project_id = p_project_id;
    
    -- No access record = no access
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check access level hierarchy
    IF p_required_level = 'admin' AND v_access_level != 'admin' THEN
        RETURN FALSE;
    END IF;
    IF p_required_level = 'annotate' AND v_access_level NOT IN ('annotate', 'admin') THEN
        RETURN FALSE;
    END IF;
    
    -- Check visibility
    IF v_visibility = 'all_members' THEN
        -- User must be project member
        RETURN EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = p_project_id AND user_id = p_user_id
        );
    ELSIF v_visibility = 'admins_only' THEN
        -- User must be project admin/owner
        SELECT role INTO v_user_role
        FROM project_members
        WHERE project_id = p_project_id AND user_id = p_user_id;
        RETURN v_user_role IN ('owner', 'admin');
    ELSIF v_visibility = 'specific_users' THEN
        -- User must be in the list
        RETURN p_user_id = ANY(v_visible_to);
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get all files accessible to a user in a project
CREATE OR REPLACE FUNCTION get_project_files(
    p_user_id UUID,
    p_project_id UUID
) RETURNS TABLE (
    file_id UUID,
    filename VARCHAR,
    file_size BIGINT,
    file_type VARCHAR,
    uploaded_by VARCHAR,
    uploaded_at TIMESTAMP,
    access_level VARCHAR,
    is_own_upload BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as file_id,
        d.filename,
        d.file_size,
        d.file_type,
        d.uploaded_by,
        d.uploaded_at,
        fpa.access_level,
        (d.uploaded_by = p_user_id::text) as is_own_upload
    FROM datasets d
    JOIN file_project_access fpa ON d.id = fpa.file_id
    WHERE fpa.project_id = p_project_id
    AND user_can_access_file(p_user_id, d.id, p_project_id, 'read')
    ORDER BY d.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION: Link existing data to new structure
-- ============================================================================

-- Create default organization for existing data
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000002', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- Update existing datasets to belong to default organization
UPDATE datasets 
SET organization_id = '00000000-0000-0000-0000-000000000002'
WHERE organization_id IS NULL;

-- Convert existing sessions to projects
INSERT INTO projects (id, organization_id, name, slug, created_at, settings)
SELECT 
    s.id,
    '00000000-0000-0000-0000-000000000002',
    s.name,
    LOWER(REPLACE(s.name, ' ', '-')),
    s.created_at,
    s.settings
FROM sessions s
ON CONFLICT (id) DO NOTHING;

-- Link existing datasets to their projects via file_project_access
INSERT INTO file_project_access (file_id, project_id, access_level, visibility)
SELECT 
    d.id,
    d.session_id,
    'admin',
    'all_members'
FROM datasets d
WHERE d.session_id IS NOT NULL
ON CONFLICT (file_id, project_id) DO NOTHING;

-- Update view_configurations to reference projects
ALTER TABLE view_configurations 
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

UPDATE view_configurations 
SET project_id = session_id 
WHERE project_id IS NULL AND session_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- NOTES FOR FUTURE MIGRATIONS
-- ============================================================================
-- 
-- After this migration is stable and tested:
-- 1. Add NOT NULL constraint to datasets.organization_id
-- 2. Drop datasets.session_id column (replaced by file_project_access)
-- 3. Drop sessions table (replaced by projects)
-- 4. Add Row-Level Security policies for multi-tenant isolation
--
-- Example RLS policy:
-- ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY datasets_org_isolation ON datasets
--     USING (organization_id IN (
--         SELECT organization_id FROM organization_members 
--         WHERE user_id = current_user_id()
--     ));