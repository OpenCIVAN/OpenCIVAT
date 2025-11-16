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