# CIA Platform Architecture

> **Version**: 2.0 (Server-Authority Architecture)
> **Status**: Draft
> **Last Updated**: 2025-11

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [System Architecture](#system-architecture)
4. [Data Model](#data-model)
5. [API Design](#api-design)
6. [Real-time Communication](#real-time-communication)
7. [Computation Workers](#computation-workers)
8. [VR/Desktop Collaboration](#vrdesktop-collaboration)
9. [File Management](#file-management)
10. [Audit & Compliance](#audit--compliance)
11. [Security](#security)
12. [Deployment](#deployment)
13. [Extension Points](#extension-points)

---

## Overview

CIA (Collaborative Immersive Analytics) is a research platform for collaborative data visualization and analysis. It supports both VR and desktop users working together in shared virtual spaces.

### Key Characteristics

- **VR-First**: Designed primarily for immersive VR experiences, with full desktop support
- **Collaborative**: Multiple users can work together in real-time
- **Research-Grade**: Full audit trails, reproducibility, compliance-ready
- **Server-Authoritative**: Server is the single source of truth for all persistent state
- **Open Source**: Accommodates various deployment scenarios (single-tenant, multi-tenant)

### Target Users

- Research teams analyzing volumetric/spatial data
- Medical imaging collaborators
- Scientific visualization groups
- Any team needing collaborative 3D data analysis

---

## Core Principles

### 1. Server is the Single Source of Truth

```
WRONG (Client-First):
  Client generates ID → Syncs to peers → Eventually reaches server

RIGHT (Server-First):
  Client requests action → Server validates & executes → Broadcasts to all clients
```

All persistent state lives on the server:
- Files and versions
- Annotations
- View configurations
- Project membership
- Audit logs

Clients maintain only:
- Local cache (for performance)
- Ephemeral UI state
- Presence information (via Y.js)

### 2. Y.js for Presence Only

Y.js excels at real-time ephemeral data. We use it exclusively for:
- Cursor positions (3D space)
- User presence (who's online, what they're viewing)
- VR avatar positions
- Temporary selections

Y.js does NOT store:
- File metadata
- Annotations
- View configurations
- Anything that needs persistence or audit

### 3. Audit Everything

For research compliance:
- Every mutation is logged with user, timestamp, before/after
- Session recordings capture complete interaction history
- Logs are immutable (append-only)
- Configurable granularity per organization

### 4. Handler-Agnostic Core

The core system knows nothing about specific file formats. Handlers (VTK, Plotly, etc.) register capabilities:
- What file types they support
- How to render cursors
- What computations they need
- VR vs desktop rendering differences

### 5. Computation on Server

Heavy processing happens server-side:
- Keeps VR headsets lightweight
- Ensures consistent results across clients
- Enables result caching
- Supports resource-constrained devices

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Desktop   │  │  Quest 3    │  │  Quest 3    │  │   Desktop   │       │
│  │   Browser   │  │ Standalone  │  │  + PC VR    │  │   Browser   │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
│                                   │                                         │
│                        WebSocket + REST API                                 │
│                                   │                                         │
├───────────────────────────────────┼─────────────────────────────────────────┤
│                              SERVER TIER                                     │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                         NODE.JS SERVER                               │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  REST API    │  │  WebSocket   │  │    Auth      │              │   │
│  │  │  Controller  │  │   Manager    │  │  (Keycloak)  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Audit      │  │     Job      │  │   Session    │              │   │
│  │  │   Logger     │  │    Queue     │  │  Recorder    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│         ┌─────────────────────────┼─────────────────────────┐              │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│  │    Redis    │          │ PostgreSQL  │          │   MinIO     │        │
│  │             │          │             │          │             │        │
│  │ - Job Queue │          │ - All data  │          │ - Files     │        │
│  │ - Pub/Sub   │          │ - Audit log │          │ - Results   │        │
│  │ - Cache     │          │ - Sessions  │          │ - Recordings│        │
│  └─────────────┘          └─────────────┘          └─────────────┘        │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      COMPUTATION WORKERS                             │  │
│  │                                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │  Python  │  │   Rust   │  │  Python  │  │   Any    │           │  │
│  │  │   VTK    │  │   Mesh   │  │    ML    │  │  Worker  │           │  │
│  │  │  Worker  │  │  Worker  │  │  Worker  │  │          │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐
│  ORGANIZATION   │
│─────────────────│
│  id             │
│  name           │
│  settings       │
│  audit_config   │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│    PROJECT      │       │  ORG_MEMBER     │
│─────────────────│       │─────────────────│
│  id             │       │  org_id (FK)    │
│  org_id (FK)    │       │  user_id (FK)   │
│  name           │       │  role           │
│  settings       │       └─────────────────┘
│  created_by     │
│  created_at     │
└────────┬────────┘
         │
    ┌────┴────┬─────────────────┐
    │         │                 │
    ▼         ▼                 ▼
┌─────────┐ ┌─────────────┐ ┌─────────────────┐
│ PROJECT │ │ PROJECT     │ │ PROJECT_BRANCH  │
│ _MEMBER │ │ _FILE       │ │                 │
│─────────│ │─────────────│ │─────────────────│
│proj (FK)│ │ proj (FK)   │ │  id             │
│user (FK)│ │ file (FK)   │ │  project_id(FK) │
│ role    │ │ added_by    │ │  parent_id (FK) │
└─────────┘ │ added_at    │ │  name           │
            └──────┬──────┘ │  status         │
                   │        └─────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │      FILE       │
         │─────────────────│
         │  id             │
         │  hash           │◄─────── Content-addressable
         │  filename       │
         │  file_type      │
         │  storage_key    │
         │  uploaded_by    │
         │  uploaded_at    │
         │  current_version│
         └────────┬────────┘
                  │ 1:N
                  ▼
         ┌─────────────────┐
         │  FILE_VERSION   │
         │─────────────────│
         │  id             │
         │  file_id (FK)   │
         │  version_num    │
         │  hash           │
         │  storage_key    │
         │  uploaded_by    │
         │  change_note    │
         └────────┬────────┘
                  │ 1:N
                  ▼
         ┌─────────────────┐
         │   ANNOTATION    │
         │─────────────────│
         │  id             │
         │  file_id (FK)   │
         │  version_id(FK) │
         │  branch_id (FK) │
         │  position       │
         │  normal         │
         │  type           │
         │  text           │
         │  visibility     │◄─────── public|private|group
         │  status         │◄─────── active|archived|migrated
         │  created_by     │
         │  created_at     │
         └─────────────────┘
```

### PostgreSQL Schema

```sql
-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    audit_config JSONB DEFAULT '{"level": "standard"}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (synced from Keycloak)
CREATE TABLE users (
    id UUID PRIMARY KEY,  -- Keycloak ID
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization membership
CREATE TABLE org_members (
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- admin, member, viewer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (org_id, user_id)
);

-- Projects (collaboration rooms)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project membership
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',  -- owner, admin, member, viewer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- Project branches (git-like)
CREATE TABLE project_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_branch_id UUID REFERENCES project_branches(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, merged, archived
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merged_at TIMESTAMPTZ,
    merged_by UUID REFERENCES users(id)
);

-- Files (deduplicated by hash)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash VARCHAR(64) NOT NULL,  -- SHA-256
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL,
    storage_key VARCHAR(255) NOT NULL,  -- MinIO object key
    current_version_id UUID,  -- FK added after file_versions created
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hash)  -- Deduplication
);

-- File versions
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    hash VARCHAR(64) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    change_note TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, version_number)
);

-- Add FK for current version
ALTER TABLE files
ADD CONSTRAINT fk_current_version
FOREIGN KEY (current_version_id) REFERENCES file_versions(id);

-- Project-file association
CREATE TABLE project_files (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, file_id)
);

-- Annotations
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    file_version_id UUID REFERENCES file_versions(id),
    branch_id UUID REFERENCES project_branches(id),

    -- Spatial data
    position DOUBLE PRECISION[3] NOT NULL,
    normal DOUBLE PRECISION[3],

    -- Content
    type VARCHAR(50) NOT NULL DEFAULT 'point',  -- point, region, measurement
    text TEXT,
    metadata JSONB DEFAULT '{}',

    -- Visibility
    visibility VARCHAR(50) DEFAULT 'public',  -- public, private, group
    visibility_group UUID[],  -- User IDs for group visibility

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- active, archived, migrated, invalid
    migrated_from UUID REFERENCES annotations(id),

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- View configurations (saved camera positions, render settings, etc.)
CREATE TABLE view_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id),
    name VARCHAR(255),

    -- Camera state
    camera_position DOUBLE PRECISION[3],
    camera_focal_point DOUBLE PRECISION[3],
    camera_up DOUBLE PRECISION[3],

    -- Render settings (handler-specific)
    settings JSONB DEFAULT '{}',

    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (immutable)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    org_id UUID REFERENCES organizations(id),
    project_id UUID,
    user_id UUID,

    -- Action details
    action VARCHAR(100) NOT NULL,  -- e.g., 'annotation:create', 'file:upload'
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Change data
    before_state JSONB,
    after_state JSONB,
    metadata JSONB DEFAULT '{}',

    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id UUID
);

-- Session recordings
CREATE TABLE session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    storage_key VARCHAR(255),  -- MinIO key for recording data
    metadata JSONB DEFAULT '{}'
);

-- Computation cache
CREATE TABLE computation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,  -- Hash of (file_id, version, operation, params)
    file_id UUID REFERENCES files(id),
    file_version_id UUID REFERENCES file_versions(id),
    operation VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    result_storage_key VARCHAR(255),  -- MinIO key for result
    result_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX idx_files_hash ON files(hash);
CREATE INDEX idx_annotations_file ON annotations(file_id);
CREATE INDEX idx_annotations_branch ON annotations(branch_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_computation_cache_key ON computation_cache(cache_key);
```

---

## API Design

### REST Endpoints

#### Authentication
```
POST   /api/auth/login              # Keycloak redirect
POST   /api/auth/logout
GET    /api/auth/me                 # Current user info
POST   /api/auth/refresh            # Refresh token
```

#### Organizations
```
GET    /api/orgs                    # List user's organizations
POST   /api/orgs                    # Create organization
GET    /api/orgs/:id                # Get organization details
PATCH  /api/orgs/:id                # Update organization
DELETE /api/orgs/:id                # Delete organization
GET    /api/orgs/:id/members        # List members
POST   /api/orgs/:id/members        # Add member
DELETE /api/orgs/:id/members/:uid   # Remove member
```

#### Projects
```
GET    /api/projects                     # List user's projects
POST   /api/projects                     # Create project
GET    /api/projects/:id                 # Get project details
PATCH  /api/projects/:id                 # Update project
DELETE /api/projects/:id                 # Delete project
GET    /api/projects/:id/members         # List members
POST   /api/projects/:id/members         # Add member
DELETE /api/projects/:id/members/:uid    # Remove member
```

#### Project Branches
```
GET    /api/projects/:id/branches             # List branches
POST   /api/projects/:id/branches             # Create branch
GET    /api/projects/:id/branches/:bid        # Get branch
PATCH  /api/projects/:id/branches/:bid        # Update branch
POST   /api/projects/:id/branches/:bid/merge  # Merge branch
DELETE /api/projects/:id/branches/:bid        # Delete branch
```

#### Files
```
POST   /api/files/check             # Check if file exists (by hash)
POST   /api/files                   # Upload new file
GET    /api/files/:id               # Get file metadata
GET    /api/files/:id/download      # Download file content
GET    /api/files/:id/versions      # List versions
POST   /api/files/:id/versions      # Upload new version
GET    /api/files/:id/versions/:vid # Get specific version

# Project-file association
GET    /api/projects/:id/files           # List project files
POST   /api/projects/:id/files           # Add file to project
DELETE /api/projects/:id/files/:fid      # Remove file from project
```

#### Annotations
```
GET    /api/files/:fid/annotations            # List annotations
POST   /api/files/:fid/annotations            # Create annotation
GET    /api/files/:fid/annotations/:aid       # Get annotation
PATCH  /api/files/:fid/annotations/:aid       # Update annotation
DELETE /api/files/:fid/annotations/:aid       # Delete annotation
POST   /api/files/:fid/annotations/:aid/migrate  # Migrate to new version
```

#### View Configurations
```
GET    /api/projects/:id/views           # List views
POST   /api/projects/:id/views           # Create view
GET    /api/projects/:id/views/:vid      # Get view
PATCH  /api/projects/:id/views/:vid      # Update view
DELETE /api/projects/:id/views/:vid      # Delete view
```

#### Computation
```
POST   /api/compute                 # Request computation
GET    /api/compute/:jobId          # Get job status
GET    /api/compute/:jobId/result   # Get job result
```

#### Audit
```
GET    /api/audit                   # Query audit log (admin)
GET    /api/projects/:id/audit      # Project audit log
GET    /api/sessions                # List session recordings
GET    /api/sessions/:id            # Get session recording
```

### Request/Response Examples

#### Upload File
```javascript
// POST /api/files
// Content-Type: multipart/form-data

const formData = new FormData();
formData.append('file', fileBlob);
formData.append('projectId', 'proj-123');

// Response
{
  "file": {
    "id": "file-456",
    "hash": "a1b2c3d4...",
    "filename": "brain_scan.vtp",
    "fileType": "vtp",
    "fileSize": 15728640,
    "currentVersion": {
      "id": "ver-789",
      "versionNumber": 1
    },
    "uploadedBy": "user-001",
    "uploadedAt": "2024-12-01T10:30:00Z"
  },
  "deduplicated": false
}
```

#### Create Annotation
```javascript
// POST /api/files/file-456/annotations

{
  "fileVersionId": "ver-789",
  "branchId": "branch-main",
  "position": [1.5, 2.3, -0.8],
  "normal": [0, 1, 0],
  "type": "point",
  "text": "Interesting region - possible anomaly",
  "visibility": "public"
}

// Response
{
  "annotation": {
    "id": "ann-123",
    "fileId": "file-456",
    "fileVersionId": "ver-789",
    "position": [1.5, 2.3, -0.8],
    "normal": [0, 1, 0],
    "type": "point",
    "text": "Interesting region - possible anomaly",
    "visibility": "public",
    "status": "active",
    "createdBy": "user-001",
    "createdAt": "2024-12-01T10:35:00Z"
  }
}
```

#### Request Computation
```javascript
// POST /api/compute

{
  "fileId": "file-456",
  "fileVersionId": "ver-789",
  "operation": "isosurface",
  "params": {
    "threshold": 0.5,
    "smoothing": true
  }
}

// Response (immediate)
{
  "jobId": "job-abc",
  "status": "queued",
  "estimatedTime": 5000
}

// GET /api/compute/job-abc (polling or via WebSocket)
{
  "jobId": "job-abc",
  "status": "complete",
  "result": {
    "url": "/api/compute/job-abc/result",
    "metadata": {
      "vertices": 15000,
      "faces": 30000,
      "bounds": [[0,0,0], [10,10,10]]
    }
  }
}
```

---

## Real-time Communication

### WebSocket Events

#### Connection
```javascript
// Client connects with auth token
const ws = new WebSocket('wss://api.example.com/ws?token=...');

// Server confirms and sends initial state
// → { type: 'connected', userId: '...', serverTime: '...' }

// Client joins project room
// ← { type: 'join:project', projectId: '...' }

// Server confirms and sends project state
// → { type: 'project:state', files: [...], annotations: [...], members: [...] }
```

#### Server → Client Events
```javascript
// File events
{ type: 'file:added', projectId, file }
{ type: 'file:removed', projectId, fileId }
{ type: 'file:version-added', fileId, version }

// Annotation events
{ type: 'annotation:created', fileId, annotation }
{ type: 'annotation:updated', fileId, annotation }
{ type: 'annotation:deleted', fileId, annotationId }

// View events
{ type: 'view:created', projectId, view }
{ type: 'view:updated', projectId, view }
{ type: 'view:deleted', projectId, viewId }

// Member events
{ type: 'member:joined', projectId, user }
{ type: 'member:left', projectId, userId }

// Computation events
{ type: 'compute:progress', jobId, progress }
{ type: 'compute:complete', jobId, result }
{ type: 'compute:failed', jobId, error }
```

#### Client → Server Events
```javascript
// Heartbeat
{ type: 'ping' }

// Room management
{ type: 'join:project', projectId }
{ type: 'leave:project', projectId }
```

### Y.js Presence (Separate Connection)

Y.js handles only ephemeral presence data:

```javascript
// Y.js document structure (per project room)
{
  presence: Y.Map({
    'user-001': {
      displayName: 'Dr. Smith',
      color: '#FF5733',
      device: 'desktop',  // or 'vr-quest3'

      // Current focus
      activeFileId: 'file-456',
      activeViewId: 'view-789',

      // Cursor (handler-specific interpretation)
      cursor: {
        position: [1.2, 0.5, -3.4],
        direction: [0, 0, -1],
        type: 'pointer'
      },

      // VR-specific (if applicable)
      vr: {
        headPosition: [0, 1.6, 0],
        headRotation: [0, 0, 0, 1],
        leftHand: { position: [...], rotation: [...], gesture: 'point' },
        rightHand: { position: [...], rotation: [...], gesture: 'grab' }
      },

      lastUpdate: 1701234567890
    }
  })
}
```

---

## Computation Workers

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    JOB QUEUE (BullMQ + Redis)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Queue: 'computation'                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Job { id, type, fileId, versionId, operation, params }   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Priority Queues:                                               │
│  - high: Interactive requests (user waiting)                    │
│  - normal: Background processing                                │
│  - low: Batch jobs, cache warming                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  Python   │   │   Rust    │   │  Python   │
       │  Worker   │   │  Worker   │   │ ML Worker │
       │           │   │           │   │           │
       │ Operations│   │ Operations│   │ Operations│
       │ - vtk.*   │   │ - mesh.*  │   │ - ml.*    │
       │ - numpy.* │   │ - fast.*  │   │ - torch.* │
       └───────────┘   └───────────┘   └───────────┘
```

### Worker Interface

All workers implement a standard interface:

```python
# Python worker example
from abc import ABC, abstractmethod

class ComputationWorker(ABC):
    """Base class for computation workers"""

    @abstractmethod
    def get_supported_operations(self) -> list[str]:
        """Return list of operations this worker handles"""
        pass

    @abstractmethod
    def process(self, job: dict) -> dict:
        """
        Process a computation job.

        Args:
            job: {
                'id': 'job-123',
                'operation': 'isosurface',
                'input': {
                    'fileUrl': 's3://bucket/file.vtp',
                    'params': { 'threshold': 0.5 }
                }
            }

        Returns:
            {
                'status': 'complete',  # or 'failed'
                'output': {
                    'resultUrl': 's3://bucket/results/job-123.vtp',
                    'metadata': { 'vertices': 10000 }
                },
                'error': None  # or error message
            }
        """
        pass
```

### Computation Caching

```javascript
// Cache key generation
function getCacheKey(fileId, versionId, operation, params) {
  const normalized = JSON.stringify(
    { fileId, versionId, operation, params },
    Object.keys(params).sort()
  );
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

---

## VR/Desktop Collaboration

### Device Capability Detection

```javascript
// Client reports capabilities on connect
{
  device: {
    type: 'vr',  // 'desktop', 'vr', 'mobile'
    model: 'quest3',

    // Rendering capabilities
    gpu: 'Adreno 740',
    maxTextureSize: 4096,
    supportsWebGL2: true,

    // For adaptive streaming
    estimatedGPUPower: 'medium',  // 'low', 'medium', 'high'
    networkBandwidth: 50,  // Mbps estimate

    // VR-specific
    vr: {
      hasHandTracking: true,
      hasEyeTracking: false,
      refreshRate: 90,
      resolution: [1832, 1920]  // per eye
    }
  }
}
```

### Handler Cursor Interface

Each visualization handler implements cursor rendering:

```javascript
interface VisualizationHandler {
  /**
   * Project screen coordinates to 3D world position
   * Used for desktop mouse → 3D cursor
   */
  projectToWorld(screenPos: {x: number, y: number}, camera: Camera): Vector3 | null;

  /**
   * Render a remote user's cursor/avatar
   */
  renderRemoteCursor(presence: UserPresence, renderer: Renderer): void;

  /**
   * Get cursor display settings for this handler
   */
  getCursorSettings(): CursorSettings;
}
```

### Adaptive Streaming Strategy

```javascript
interface StreamingStrategy {
  prepareForClient(file: File, clientCapabilities: ClientCapabilities): Promise<StreamPlan>;
  stream(plan: StreamPlan, socket: WebSocket): Promise<void>;
}

// Strategy selection based on client capabilities
function selectStreamingStrategy(file, client) {
  const fileSize = file.fileSize;
  const clientPower = client.device.estimatedGPUPower;

  // Very large files + low-power client = cloud rendering
  if (fileSize > 100_000_000 && clientPower === 'low') {
    return new CloudRenderStrategy();
  }

  // Large files = progressive streaming
  if (fileSize > 10_000_000) {
    return new ProgressiveMeshStrategy();
  }

  // Small files = direct transfer
  return new DirectTransferStrategy();
}
```

---

## File Management

### Upload Flow

```
1. CLIENT: Calculate hash (SHA-256)
2. CLIENT: POST /api/files/check { hash, filename, projectId }
   - If exists: Return file ID, link to project
   - If not: Continue upload
3. SERVER: Validate file (magic bytes, structure, virus scan)
4. SERVER: Store in MinIO
5. SERVER: Create database records (files, file_versions, project_files, audit_log)
6. SERVER: Broadcast to project members via WebSocket
7. CLIENT: Cache file locally in IndexedDB
```

### File Type Detection

```javascript
// Server-side validation using magic bytes + structure validation
import { fileTypeFromBuffer } from 'file-type';

async function validateFile(buffer, filename) {
  // 1. Get extension
  const ext = filename.split('.').pop()?.toLowerCase();

  // 2. Detect actual type from magic bytes
  const detected = await fileTypeFromBuffer(buffer);

  // 3. Run format-specific validator
  const validator = FILE_VALIDATORS[ext];
  if (!validator) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  return await validator(buffer);
}
```

### Version Management

- Same hash = exact same file (deduplicated)
- Different hash, same name = prompt for new version
- Different hash, different name = new file
- Annotations tied to specific versions
- Migration workflow when version changes

---

## Audit & Compliance

### Audit Levels

| Level | Events | Changes | Recording |
|-------|--------|---------|-----------|
| minimal | auth, upload, delete | No | No |
| standard | + updates, sharing | Yes | No |
| detailed | + access, presence | Yes | Yes (1 FPS) |
| forensic | Everything | Yes | Yes (10 FPS) |

### Session Recording

- Captures user interactions at configurable intervals
- Stored compressed in MinIO
- Indexed in PostgreSQL for querying
- Supports playback for review/audit

---

## Security

### Authentication
- Keycloak for identity management
- JWT tokens for API access
- Refresh token rotation

### Authorization
- Role-based access control (RBAC)
- Per-project permissions
- Annotation visibility (public/private/group)

### Input Validation
- Zod schemas for all API inputs
- File type validation via magic bytes
- Size limits enforced

---

## Deployment

### Development
- Docker Compose for local development
- Hot reload for client and server
- Seeded test data

### Production
- Kubernetes for orchestration
- Horizontal scaling for workers
- Managed PostgreSQL recommended
- S3-compatible storage (MinIO or cloud)

### Multi-tenancy
- Single codebase supports both modes
- All queries include org_id
- Storage paths include org_id
- Config flag: `MULTI_TENANT=true/false`

---

## Extension Points

### Adding a New Visualization Handler

1. Create handler class extending `BaseHandler`
2. Implement required methods (file types, cursor, VR support)
3. Register in `instanceTypesInit.js`
4. Add computation worker if needed

### Adding a New Computation Operation

1. Create worker implementing `ComputationWorker` interface
2. Register supported operations
3. Deploy worker alongside existing workers

### Custom Audit Events

1. Register event type with schema
2. Specify minimum audit level
3. Log events through `AuditLogger`

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Handler** | Visualization type implementation (VTK, Plotly, etc.) |
| **Branch** | Git-like project branch for annotation isolation |
| **View Config** | Saved camera position and render settings |
| **Computation** | Server-side data processing job |
| **Presence** | Real-time user state (cursor, position) |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-11 | Server-authority architecture redesign |
| 1.0 | 2025-10 | Initial client-first architecture |
