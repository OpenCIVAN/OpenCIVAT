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
-- SERVER INSTANCE TRACKING
-- ============================================================================
-- This table has exactly ONE row that identifies this database instance.
-- The instance_id changes whenever the database is recreated (docker-compose down -v).
-- Clients use this to detect when they need to clear stale local state.

CREATE TABLE IF NOT EXISTS server_instance (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Enforce single row
    instance_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    schema_version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    last_migration VARCHAR(100),
    notes TEXT
);

-- Insert the single row (only if it doesn't exist)
INSERT INTO server_instance (id, instance_id, schema_version, notes)
VALUES (1, uuid_generate_v4(), '2.0.0', 'Initial database creation')
ON CONFLICT (id) DO NOTHING;

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

    -- Derivation tracking (for computed/processed results)
    derived_from UUID REFERENCES datasets(id) ON DELETE SET NULL,
    derivation_info JSONB,  -- {operation, params, jobId, computeTimeMs, workerType}

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
-- ROOMS TABLE (if not exists - needed for star scoping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Room type
    is_main BOOLEAN DEFAULT FALSE,  -- Each project has one main room
    room_type VARCHAR(20) DEFAULT 'breakout' CHECK (room_type IN ('main', 'breakout')),
    
    -- Access control
    is_public BOOLEAN DEFAULT TRUE,  -- Can anyone join, or invite-only?
    max_members INTEGER DEFAULT 50,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT one_main_room_per_project UNIQUE (project_id, is_main) 
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_rooms_project ON rooms(project_id);

-- Room members
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);


-- ============================================================================
-- FOLDERS (File Organization)
-- ============================================================================

-- Folders within a project for file organization
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate folder names in same parent
    CONSTRAINT unique_folder_name_in_parent UNIQUE NULLS NOT DISTINCT (project_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- Add folder_id to file_project_access if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file_project_access' AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE file_project_access 
        ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_file_project_access_folder ON file_project_access(folder_id);
    END IF;
END $$;

-- ============================================================================
-- STARS (User Favorites - Workspace Scoped)
-- ============================================================================

-- Stars are scoped to workspace, allowing different starred items per context
-- scope: 'personal' | 'room' | 'project'
-- - personal: Only visible in user's personal workspace
-- - room: Visible to everyone in the room's workspaces  
-- - project: Visible project-wide (like a team favorite)

CREATE TABLE IF NOT EXISTS stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Scope determines visibility
    scope VARCHAR(20) NOT NULL DEFAULT 'personal' 
        CHECK (scope IN ('personal', 'room', 'project')),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,  -- Required if scope='room'
    
    -- Polymorphic reference: 'file' or 'folder'
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('file', 'folder')),
    target_id UUID NOT NULL,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One star per user per target per scope
    -- User can star same file in personal AND room contexts
    CONSTRAINT unique_star_per_scope UNIQUE (user_id, target_type, target_id, scope, room_id)
);

CREATE INDEX IF NOT EXISTS idx_stars_user ON stars(user_id);
CREATE INDEX IF NOT EXISTS idx_stars_project ON stars(project_id);
CREATE INDEX IF NOT EXISTS idx_stars_scope ON stars(scope);
CREATE INDEX IF NOT EXISTS idx_stars_room ON stars(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stars_target ON stars(target_type, target_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get full folder path
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    current_id UUID := folder_uuid;
    folder_name TEXT;
    parent UUID;
BEGIN
    IF folder_uuid IS NULL THEN
        RETURN '/';
    END IF;
    
    WHILE current_id IS NOT NULL LOOP
        SELECT f.name, f.parent_id INTO folder_name, parent
        FROM folders f WHERE f.id = current_id;
        
        IF folder_name IS NOT NULL THEN
            result := '/' || folder_name || result;
        END IF;
        
        current_id := parent;
    END LOOP;
    
    IF result = '' THEN
        result := '/';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to count files in a folder (including subfolders)
CREATE OR REPLACE FUNCTION count_files_in_folder(folder_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    file_count INTEGER;
BEGIN
    IF folder_uuid IS NULL THEN
        RETURN 0;
    END IF;
    
    WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = folder_uuid
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
    )
    SELECT COUNT(*) INTO file_count
    FROM file_project_access fpa
    WHERE fpa.folder_id IN (SELECT id FROM folder_tree);
    
    RETURN COALESCE(file_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps on folder modification
CREATE OR REPLACE FUNCTION update_folder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_folder_updated ON folders;
CREATE TRIGGER trigger_folder_updated
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_timestamp();

-- Cascade delete stars when folder is deleted
CREATE OR REPLACE FUNCTION delete_folder_stars()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM stars 
    WHERE target_type = 'folder' AND target_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_folder_stars ON folders;
CREATE TRIGGER trigger_delete_folder_stars
    BEFORE DELETE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION delete_folder_stars();

-- Auto-create main room when project is created
CREATE OR REPLACE FUNCTION create_main_room_for_project()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO rooms (project_id, name, is_main, room_type, created_by)
    VALUES (NEW.id, 'Main Room', TRUE, 'main', NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_main_room ON projects;
CREATE TRIGGER trigger_create_main_room
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_main_room_for_project();

-- Update room timestamps
CREATE OR REPLACE FUNCTION update_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_room_updated ON rooms;
CREATE TRIGGER trigger_room_updated
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_room_timestamp();

-- ============================================================================
-- VIEW CONFIGURATIONS
-- Server-authoritative view state for v2.0 architecture
-- ============================================================================

CREATE TABLE view_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- =========================================================================
    -- RELATIONSHIPS
    -- =========================================================================
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES project_branches(id),
    file_version_id UUID REFERENCES file_versions(id),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    group_id UUID,  -- Future: FK to groups table

    -- =========================================================================
    -- IDENTIFICATION
    -- =========================================================================
    name VARCHAR(255) DEFAULT 'Untitled View',
    description TEXT,

    -- =========================================================================
    -- OWNERSHIP & SHARING
    -- =========================================================================
    owner_user_id UUID REFERENCES users(id),
    owner_user_name VARCHAR(255),
    visibility VARCHAR(50) DEFAULT 'private',  -- private, group, specific, public
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]',  -- [{ userId, userName, role, canEdit, canDuplicate, addedAt }]
    saved_by_user BOOLEAN DEFAULT FALSE,

    -- =========================================================================
    -- VISUALIZATION STATE (Type-agnostic - interpreted by InstanceTypeHandler)
    -- =========================================================================
    camera JSONB,
    filters JSONB DEFAULT '[]',
    widgets JSONB DEFAULT '[]',
    color_maps JSONB,
    cursor_config JSONB DEFAULT '{"showOtherUsers": true, "cursorStyle": "crosshair", "showCursorTrails": false}',
    annotation_display JSONB DEFAULT '{"visible": true, "showLabels": true, "opacity": 1.0}',
    annotations_visible BOOLEAN DEFAULT TRUE,

    -- =========================================================================
    -- SELECTIVE LINKING (Property-level links to other views)
    -- =========================================================================
    links JSONB DEFAULT '{}',  -- { camera: LinkConfiguration, filters: LinkConfiguration, ... }

    -- =========================================================================
    -- LINEAGE TRACKING (Audit Trail)
    -- =========================================================================
    forked_from JSONB,  -- { viewId, serverId, viewName, ownerUserId, ownerUserName, timestamp, reason }
    fork_count INTEGER DEFAULT 0,
    merged_from JSONB,  -- [{ viewId, viewName, ownerUserId, properties, timestamp }]

    -- =========================================================================
    -- BROADCAST CONFIGURATION (Source-side: one-to-many presentation mode)
    -- =========================================================================
    broadcast JSONB DEFAULT '{"state": "off", "startedAt": null, "followerCount": 0, "allowDuplication": false, "allowChat": true, "allowAnnotations": false}',

    -- =========================================================================
    -- FOLLOWING CONFIGURATION (Follower-side)
    -- =========================================================================
    following JSONB,  -- { sourceViewId, sourceServerId, sourceViewName, sourceOwnerName, startedAt, ... }

    -- =========================================================================
    -- SNAPSHOTS (Named save points)
    -- =========================================================================
    snapshots JSONB DEFAULT '[]',  -- [ViewSnapshot objects]
    max_snapshots INTEGER DEFAULT 50,

    -- =========================================================================
    -- APPLIED PRESETS
    -- =========================================================================
    applied_presets JSONB DEFAULT '[]',  -- [{ presetId, presetName, appliedAt, appliedBy, properties }]

    -- =========================================================================
    -- LIFECYCLE
    -- =========================================================================
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, archived
    active_instance_count INTEGER DEFAULT 0,
    last_active_timestamp TIMESTAMPTZ DEFAULT NOW(),
    server_version INTEGER DEFAULT 1,

    -- =========================================================================
    -- TIMESTAMPS
    -- =========================================================================
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
    cache_key VARCHAR(255),
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
-- Y.JS PERSISTENCE (Phase 2E)
-- ============================================================================
-- Three-table design for collaborative state:
-- 1. yjs_documents: Snapshots for fast client hydration on reconnect
-- 2. yjs_updates: Incremental updates for session recording/playback (Sprint 5)
-- 3. chat_messages: Denormalized audit log (queryable, searchable, Matrix-ready)
--
-- Architecture note: Y.js handles only presence data (cursors, avatars, chat).
-- Datasets, views, annotations use REST API + WebSocket broadcasts.

-- Y.js document snapshots (efficient loading on reconnect)
CREATE TABLE yjs_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    document_state BYTEA NOT NULL,          -- Encoded Y.Doc state vector
    snapshot_version INTEGER DEFAULT 1,      -- Increments on each snapshot
    last_update_id UUID,                     -- Reference to last applied update
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Y.js incremental updates (for recording and playback)
CREATE TABLE yjs_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL,
    update_data BYTEA NOT NULL,              -- Binary Y.js update
    update_origin VARCHAR(50),               -- 'chat', 'cursor', 'camera', 'avatar', 'presence'
    user_id UUID REFERENCES users(id),
    client_id INTEGER,                       -- Y.js awareness client ID
    sequence_num BIGSERIAL,                  -- Monotonic ordering for playback
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_yjs_room FOREIGN KEY (room_id)
        REFERENCES yjs_documents(room_id) ON DELETE CASCADE
);

-- Chat messages (denormalized for audit queries)
-- Mirrors Y.js yText in queryable form; ready for future Matrix integration
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),                   -- Denormalized for query convenience
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Threading support (future Matrix integration)
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    thread_root_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

    -- Message metadata
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'system', 'file_share', 'annotation_ref'
    metadata JSONB DEFAULT '{}',             -- { mentionedUsers: [], attachments: [], reactions: {} }

    -- Moderation
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),

    -- Y.js correlation (links audit to recording)
    yjs_update_id UUID REFERENCES yjs_updates(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Datasets
CREATE INDEX idx_datasets_hash ON datasets(hash);
CREATE INDEX idx_datasets_org ON datasets(organization_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_derived_from ON datasets(derived_from);

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
CREATE INDEX idx_views_dataset ON view_configurations(dataset_id);
CREATE INDEX idx_views_owner ON view_configurations(owner_user_id);
CREATE INDEX idx_views_shared ON view_configurations(is_shared);
CREATE INDEX idx_views_status ON view_configurations(status);
CREATE INDEX idx_views_visibility ON view_configurations(visibility);
CREATE INDEX idx_views_updated ON view_configurations(updated_at DESC);

-- Computation
CREATE INDEX idx_cache_key ON computation_cache(cache_key);
CREATE INDEX idx_cache_file ON computation_cache(file_id);
CREATE INDEX idx_jobs_status ON computation_jobs(status);
CREATE INDEX idx_jobs_file ON computation_jobs(file_id);
CREATE INDEX idx_jobs_cache_key ON computation_jobs(cache_key);

-- Audit
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_org ON audit_log(organization_id, timestamp DESC);
CREATE INDEX idx_audit_project ON audit_log(project_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_log(action);

-- Y.js documents
CREATE INDEX idx_yjs_docs_project ON yjs_documents(project_id);
CREATE INDEX idx_yjs_docs_updated ON yjs_documents(updated_at DESC);

-- Y.js updates (optimized for playback)
CREATE INDEX idx_yjs_updates_room_seq ON yjs_updates(room_id, sequence_num);
CREATE INDEX idx_yjs_updates_room_time ON yjs_updates(room_id, timestamp);
CREATE INDEX idx_yjs_updates_origin ON yjs_updates(update_origin) WHERE update_origin IS NOT NULL;
CREATE INDEX idx_yjs_updates_user ON yjs_updates(user_id) WHERE user_id IS NOT NULL;

-- Chat messages (optimized for history queries and audit)
CREATE INDEX idx_chat_room_time ON chat_messages(room_id, timestamp DESC);
CREATE INDEX idx_chat_project_time ON chat_messages(project_id, timestamp DESC);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_thread ON chat_messages(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX idx_chat_not_deleted ON chat_messages(room_id, timestamp) WHERE deleted_at IS NULL;
CREATE INDEX idx_chat_type ON chat_messages(message_type) WHERE message_type != 'text';

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
-- CANVAS SYSTEM (Workspaces, Canvases, Placements, Subsets, Notes, Images)
-- ============================================================================

-- Workspaces - Container for canvases with hierarchy (Personal, Project, Breakout)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Workspace',
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'project', 'breakout')),

    -- Hierarchy
    parent_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Ownership
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),

    -- State
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,

    -- Breakout specific
    expires_at TIMESTAMPTZ,
    auto_merge BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);

-- Workspace members for shared workspaces
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (permission IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Canvases - Infinite pinboard of placements
CREATE TABLE canvases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Canvas',

    -- Dimensions (can grow infinitely, this is the initial/current size)
    dimensions JSONB NOT NULL DEFAULT '{"rows": 3, "cols": 3}',

    -- Viewport state (optional, for persistence)
    viewport JSONB DEFAULT '{"row": 0, "col": 0, "rows": 3, "cols": 3}',

    -- Layout configuration
    layout_mode VARCHAR(20) NOT NULL DEFAULT 'grid' CHECK (layout_mode IN ('grid', 'flow')),
    flow_direction VARCHAR(20) NOT NULL DEFAULT 'row' CHECK (flow_direction IN ('row', 'column')),
    homepoint JSONB, -- { row: number, col: number }

    -- Ownership (for personal canvases)
    ownership JSONB NOT NULL DEFAULT '{"type": "personal", "ownerId": null}',

    -- State
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvases_workspace ON canvases(workspace_id);
CREATE INDEX idx_canvases_project ON canvases(project_id);

-- Placements - Positioned items on canvas (views, notes, images)
CREATE TABLE placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,

    -- Position
    row_index INT NOT NULL DEFAULT 0,
    col_index INT NOT NULL DEFAULT 0,
    row_span INT NOT NULL DEFAULT 1 CHECK (row_span BETWEEN 1 AND 3),
    col_span INT NOT NULL DEFAULT 1 CHECK (col_span BETWEEN 1 AND 3),

    -- Content reference
    content_type VARCHAR(20) NOT NULL DEFAULT 'empty' CHECK (content_type IN ('view', 'note', 'image', 'empty')),
    content_id UUID, -- References view_configurations, notes, or images depending on type

    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_placements_canvas ON placements(canvas_id);
CREATE INDEX idx_placements_content ON placements(content_type, content_id);
CREATE INDEX idx_placements_position ON placements(canvas_id, row_index, col_index);

-- Subsets - Saved selections for focus mode
CREATE TABLE subsets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Focus Group',
    description TEXT,

    -- Selection
    placement_ids UUID[] DEFAULT '{}',

    -- Attached content
    attached_notes UUID[] DEFAULT '{}',
    attached_images UUID[] DEFAULT '{}',

    -- Visibility
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    shared_with UUID[] DEFAULT '{}', -- User IDs

    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subsets_canvas ON subsets(canvas_id);
CREATE INDEX idx_subsets_project ON subsets(project_id);
CREATE INDEX idx_subsets_visibility ON subsets(visibility);

-- Notes - Text annotations on canvas
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) DEFAULT '',
    content TEXT DEFAULT '',
    format VARCHAR(20) DEFAULT 'markdown' CHECK (format IN ('markdown', 'plain', 'rich')),

    -- Position (if placed directly on canvas)
    position JSONB, -- { x, y } or null
    width INT DEFAULT 1,
    height INT DEFAULT 1,

    -- Styling
    color VARCHAR(20) DEFAULT 'default',
    pinned BOOLEAN DEFAULT FALSE,

    -- Visibility
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),

    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_canvas ON notes(canvas_id);

-- Canvas Images - Image attachments on canvas
CREATE TABLE canvas_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,

    -- Storage
    storage_key VARCHAR(500), -- MinIO key
    original_name VARCHAR(255),
    mime_type VARCHAR(100) DEFAULT 'image/png',
    file_size BIGINT DEFAULT 0,

    -- Dimensions
    natural_width INT DEFAULT 0,
    natural_height INT DEFAULT 0,

    -- Position (if placed directly on canvas)
    position JSONB, -- { x, y } or null
    width INT DEFAULT 1,
    height INT DEFAULT 1,

    -- Display
    fit VARCHAR(20) DEFAULT 'contain' CHECK (fit IN ('contain', 'cover', 'fill')),
    caption TEXT DEFAULT '',
    alt_text TEXT DEFAULT '',

    -- Visibility
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),

    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_canvas_images_canvas ON canvas_images(canvas_id);

-- Apply updated_at triggers to canvas system tables
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON placements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subsets_updated_at BEFORE UPDATE ON subsets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_images_updated_at BEFORE UPDATE ON canvas_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Main room for demo project (auto-created for every project)
INSERT INTO rooms (id, project_id, name, is_main, room_type, is_public, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Main Room',
    TRUE,
    'main',
    TRUE,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- Demo user as room member (admin of main room)
INSERT INTO room_members (room_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Demo files: Run ./scripts/load-demo-files.sh to upload VTP samples to MinIO

-- ============================================================================
-- DONE
-- ============================================================================