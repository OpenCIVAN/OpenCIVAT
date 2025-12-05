# CIA Web: Documentation Status Tracker

This document tracks the status of all guides and what needs updating as the architecture evolves.

**Last Updated:** December 2025

---

## 📚 Guide Status

### ✅ Contributor Guide (Comprehensive)

**File:** `docs/guides/CONTRIBUTOR_GUIDE.md`  
**Status:** Needs update for v2.0 architecture  
**Last Updated:** November 2025

**Completed items:**

- [x] yInstances → yViews refactor complete
- [x] Server-generated view IDs implemented
- [x] Backend authentication added (Keycloak + dev bypass)

**Still needs updating for:**

- [ ] Recording system (when backend logic implemented)
- [ ] Canvas Unification (when complete)

### ✅ Developer Quick Reference

**File:** `docs/guides/QUICK_REFERENCE.md`  
**Status:** Complete for current architecture  
**Last Updated:** November 2025

**Notes:**

- Already documents that `yInstances` is deprecated
- Already shows server-authority pattern
- Update when Canvas Unification adds new manager APIs

### ✅ VR Implementation Guide

**File:** `docs/guides/VR_IMPLEMENTATION.md`  
**Status:** Foundational (guide only, not yet implemented)  
**Last Updated:** November 2025

**Needs updating when:**

- [ ] VR actually implemented (will need code review)
- [ ] Collaborative VR features added
- [ ] VR recording implemented
- [ ] Testing results documented

### ✅ Backend Setup Guide

**File:** `docs/guides/BACKEND_SETUP.md`  
**Status:** Needs update for completed features  
**Last Updated:** November 2025

**Completed features to document:**

- [x] Basic PostgreSQL setup
- [x] Basic API server
- [x] Dataset upload/download
- [x] Multi-tenant projects table
- [x] User authentication (Keycloak + JWT)
- [x] Y.js persistence to database
- [x] MinIO/S3 storage
- [x] View configurations (v2.0 server-authority)
- [x] Canvases & Workspaces tables
- [x] Folders & Stars

**Still pending:**

- [ ] Session recording backend logic
- [ ] LinkConfiguration dedicated endpoints

---

## ✅ Completed Architecture Changes

### v2.0 Server-Authority Architecture (COMPLETE)

**Completed:** December 2024

**What changed:**

- ViewConfigurationManager now uses REST API + WebSocket broadcasts
- Y.js used ONLY for presence data (cursors, avatars, chat)
- Server generates view IDs for auditing
- Instances (Layer 3) are ephemeral, client-generated, don't sync

**Files updated:**

- `src/core/data/managers/ViewConfigurationManager.js` - Server-authority
- `src/core/data/models/ViewConfiguration.js` - v2.0 header
- `src/collaboration/yjs/yjsSetup.js` - yInstances removed
- `server.js` - Y.js persistence service

### Database & Backend Infrastructure (COMPLETE)

**Completed:** December 2024

**Current schema includes:**

```
✅ organizations          ✅ users
✅ projects               ✅ project_members
✅ datasets               ✅ file_versions
✅ file_project_access    ✅ annotations
✅ view_configurations    ✅ computation_jobs
✅ computation_cache      ✅ audit_log
✅ yjs_documents          ✅ yjs_updates
✅ chat_messages          ✅ session_recordings (table only)
✅ folders                ✅ stars
✅ canvases               ✅ workspaces
✅ canvas_placements      ✅ subsets
```

### Y.js Persistence (COMPLETE)

**Completed:** December 2024

**Three-table design:**

1. `yjs_documents` - Snapshots for fast client hydration
2. `yjs_updates` - Incremental updates for recording/playback
3. `chat_messages` - Denormalized audit trail

**Service:** `server/src/services/yjsPersistence.js`

### Authentication & Multi-Tenancy (COMPLETE)

**Completed:** December 2024

**Implementation:**

- Keycloak JWT validation with dev bypass mode
- `server/src/middleware/auth.js` - Auth middleware
- `server/src/routes/auth.js` - Auth endpoints
- `server/src/routes/projects.js` - Project CRUD with RBAC
- Organization-scoped queries throughout

---

## 🚧 In-Progress Architecture Changes

### Canvas Unification (IN PROGRESS)

**Status:** UI Prototyping Phase  
**Tracking:** `docs/Canvas Unification Progress Log.md`

**Goal:** Merge `WorkspaceGrid` and `CanvasWorkspace` into unified system with:

- **Flow Mode** (default): Auto-layout, fills viewport
- **Grid Mode**: Manual placement, cell merging

**Affects:**

- Contributor Guide (workspace section)
- Quick Reference (new manager APIs)

**Implementation phases:**

1. Make CanvasWorkspace default
2. Implement Flow Mode (FlowLayoutEngine)
3. Layout Mode Toggle UI
4. Grid Mode features
5. Datasets Panel redesign
6. Visual polish
7. Delete WorkspaceGrid

---

## 📋 Pending Features

### Session Recording Backend (PARTIAL)

**Status:** Schema + UI exist, backend logic NOT implemented

**What exists:**

- `session_recordings` table in database
- `RecordingsTab.jsx` UI components (with mock data)
- `useRecordings.js` hook (stub implementation)

**What's needed:**

- [ ] Recording service to capture Y.js events
- [ ] REST endpoints: start/stop/list/playback
- [ ] MinIO storage for recording data
- [ ] Playback reconstruction logic

### VR Implementation (NOT STARTED)

**Status:** Comprehensive guide exists, no code

**Guide:** `docs/guides/VR_IMPLEMENTATION.md`

**What's needed:**

- [ ] WebXR integration with VTK.js
- [ ] InstanceTypeHandler VR methods
- [ ] Collaborative VR (avatars, controllers)
- [ ] Spatial audio integration

---

## 📊 Sprint History

| Sprint   | Description                        | Status                      |
| -------- | ---------------------------------- | --------------------------- |
| Sprint 1 | Database Migration & MinIO         | ✅ Complete                 |
| Sprint 2 | Projects & Multi-Tenancy           | ✅ Complete                 |
| Sprint 3 | Y.js Persistence                   | ✅ Complete                 |
| Sprint 4 | ViewConfigurations Refactor (v2.0) | ✅ Complete                 |
| Sprint 5 | Recording System                   | 🚧 Partial (schema/UI only) |
| Sprint 6 | Voice Integration                  | 🚧 Partial (basic LiveKit)  |
| Current  | Canvas Unification                 | 🚧 In Progress              |

---

## 🔄 When to Update This Document

Update this tracker when:

1. A major feature is completed
2. A new sprint begins
3. Database schema changes
4. New guides are added
5. Existing guides need revision

**Maintainer:** Update after each significant PR merge.
