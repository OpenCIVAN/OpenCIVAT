-- server/database/migrations/003_seed_sample_files.sql
-- Seeds the sample VTP files into the database
-- These files are served from /vtp_files/ in development
-- 
-- Run after: 002_projects_and_file_access.sql
-- Run with: docker exec -it cia-postgres psql -U ciauser -d cia_analytics -f /tmp/003_seed_sample_files.sql

BEGIN;

-- ============================================================================
-- ENSURE DEMO ORGANIZATION AND PROJECT EXIST
-- (Should already exist from 002, but be safe)
-- ============================================================================

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
    'Demo datasets for exploring CIA Web features. These files are available to all users.'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT SAMPLE FILES
-- These match the files in /public/vtp_files/
-- Note: storage_key is the relative path, public_path is the URL path
-- ============================================================================

-- Skull.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'Skull.vtp',
    20447232,  -- ~19.5 MB
    'vtp',
    'application/octet-stream',
    'samples/Skull.vtp',
    '/vtp_files/Skull.vtp',
    'system',
    '{"description": "Human skull model", "category": "anatomy", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- Bones.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'Bones.vtp',
    27262976,  -- ~26 MB
    'vtp',
    'application/octet-stream',
    'samples/Bones.vtp',
    '/vtp_files/Bones.vtp',
    'system',
    '{"description": "Skeletal system model", "category": "anatomy", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- Diskout.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'Diskout.vtp',
    483328,  -- ~472 KB
    'vtp',
    'application/octet-stream',
    'samples/Diskout.vtp',
    '/vtp_files/Diskout.vtp',
    'system',
    '{"description": "Disk output visualization", "category": "scientific", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- Lungs.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'Lungs.vtp',
    10485760,  -- ~10 MB
    'vtp',
    'application/octet-stream',
    'samples/Lungs.vtp',
    '/vtp_files/Lungs.vtp',
    'system',
    '{"description": "Lung tissue model", "category": "anatomy", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- LungVessels.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'LungVessels.vtp',
    28311552,  -- ~27 MB
    'vtp',
    'application/octet-stream',
    'samples/LungVessels.vtp',
    '/vtp_files/LungVessels.vtp',
    'system',
    '{"description": "Pulmonary vessel network", "category": "anatomy", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- Earth.vtp
INSERT INTO datasets (
    id, 
    organization_id, 
    filename, 
    file_size, 
    file_type, 
    mime_type,
    storage_key, 
    public_path, 
    uploaded_by,
    metadata
)
VALUES (
    '00000000-0000-0000-0001-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'Earth.vtp',
    1258291,  -- ~1.2 MB
    'vtp',
    'application/octet-stream',
    'samples/Earth.vtp',
    '/vtp_files/Earth.vtp',
    'system',
    '{"description": "Earth globe model", "category": "geography", "isDemo": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    public_path = EXCLUDED.public_path,
    metadata = EXCLUDED.metadata;

-- ============================================================================
-- ADD SAMPLE FILES TO DEMO PROJECT
-- This makes them accessible via /api/projects/{demo-project}/files
-- ============================================================================

INSERT INTO file_project_access (file_id, project_id, access_level, visibility)
VALUES 
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'read', 'all_members'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'read', 'all_members'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'read', 'all_members'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'read', 'all_members'),
    ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'read', 'all_members'),
    ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 'read', 'all_members')
ON CONFLICT (file_id, project_id) DO NOTHING;

-- ============================================================================
-- UPDATE STORAGE USAGE
-- ============================================================================

UPDATE organizations 
SET storage_used_bytes = (
    SELECT COALESCE(SUM(file_size), 0) 
    FROM datasets 
    WHERE organization_id = '00000000-0000-0000-0000-000000000000'
)
WHERE id = '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- VERIFICATION QUERIES (Comment out in production)
-- ============================================================================

-- Show inserted sample files
SELECT id, filename, file_size, public_path 
FROM datasets 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
ORDER BY filename;

-- Show file access in demo project
SELECT d.filename, fpa.access_level, fpa.visibility
FROM file_project_access fpa
JOIN datasets d ON d.id = fpa.file_id
WHERE fpa.project_id = '00000000-0000-0000-0000-000000000001';

-- Show organization storage usage
SELECT name, storage_used_bytes, 
       pg_size_pretty(storage_used_bytes) as human_readable
FROM organizations;

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- 
-- After running this migration:
-- 
-- 1. The sample files will appear in the "Sample Files" project
-- 2. They're served from /vtp_files/ via your static file server
-- 3. The public_path field tells the client where to fetch them
-- 4. For production, you'd upload these to S3/MinIO and update storage_key
--
-- To verify in the app:
-- - GET /api/projects/00000000-0000-0000-0000-000000000001/files
-- - Should return 6 sample files
-- 
-- To add more sample files:
-- 1. Add the .vtp file to /public/vtp_files/
-- 2. Insert a new row following the pattern above
-- 3. Add file_project_access row to include in demo project