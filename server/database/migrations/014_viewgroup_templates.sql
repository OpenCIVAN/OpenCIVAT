-- =============================================================================
-- ViewGroup Templates (Server-side persistence)
-- =============================================================================

CREATE TABLE IF NOT EXISTS viewgroup_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_id VARCHAR(50) DEFAULT 'single',
    color VARCHAR(20) DEFAULT '#a855f7',
    view_slots INTEGER DEFAULT 1,
    scope VARCHAR(20) DEFAULT 'personal' CHECK (scope IN ('personal', 'project')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewgroup_templates_project ON viewgroup_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_viewgroup_templates_workspace ON viewgroup_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_viewgroup_templates_owner ON viewgroup_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_viewgroup_templates_scope ON viewgroup_templates(scope);

CREATE TRIGGER update_viewgroup_templates_updated_at
BEFORE UPDATE ON viewgroup_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
