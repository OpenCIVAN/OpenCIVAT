# CIA Web — Dual-Channel Synchronization Architecture

> **DR1 — Dual-Channel Real-Time Synchronization (Hardened)**
> Initial implementation: 2026-06 · Hardening pass: 2026-06

---

## 1. Overview

CIA Web uses **two separate synchronization channels** that serve different roles.

| Channel | Technology | Consistency | Purpose |
|---|---|---|---|
| **Presence** | Y.js CRDT over WebSocket | Eventually consistent | Cursors, cameras, avatars, VR controllers, chat |
| **Persistent** | REST + PostgreSQL + WebSocket broadcast | Server-authoritative | Views, annotations, viewgroups, workspaces |

The persistent channel is the **source of truth** for application state. The presence channel carries high-frequency, ephemeral data that does not need to survive a page reload.

**Rule:** never move durable application state (view configs, annotations) into Y.js.

---

## 2. Presence Channel (Y.js)

Y.js shared objects managed by `src/collaboration/yjs/yjsSetup.js`:

| Map key | Contents |
|---|---|
| `yCursors` | `userId → {position, color, name, viewId, lastUpdate}` |
| `yCameras` | `viewId → {camera, userId, clientId, lastUpdate}` |
| `yViewPresence` | `viewId → {viewers, lastUpdate}` |
| `yAvatars` | `userId → {position, rotation, headPose, …}` |
| `yVRControllers` | `${userId}_${hand} → {position, rotation, …}` |
| `yText` | Chat messages (Array) |

Y.js snapshots are persisted to PostgreSQL through `server/src/services/yjsPersistence.js`. This is separate from the persistent sync channel.

---

## 3. Persistent Channel — Write Path

```
UI component
  ↓
ViewConfigurationManager._syncToServer(view)
  ↓  PUT /api/views/:id  { ...fields, base_revision: N }
Server route (views.js)
  ↓  BEGIN TRANSACTION
  ↓  UPDATE view_configurations SET revision = revision + 1
       WHERE id = $1 AND revision = $base_revision   ← OCC check
  ↓  INSERT INTO sync_events (...)
  ↓  COMMIT
  ↓
wsManager.viewUpdated(projectId, view, syncEventId, actorUserId)
  ↓  WebSocket broadcast to all clients in the project
Other clients receive view:updated → apply to local state → advance watermark
```

### 3.1 WebSocket broadcast payload

After DR1, all persistent-entity WS broadcasts include:

```json
{
  "type": "view:updated",
  "projectId": "...",
  "view": { /* full view row including revision */ },
  "revision": 4,
  "syncEventId": "123",
  "actorUserId": "user-uuid",
  "timestamp": "..."
}
```

- `actorUserId`: lets the originating client skip its own echoed mutation (no double-apply)
- `syncEventId`: the `sync_events.id` — used to advance the client watermark

---

## 4. Persistent Channel — Startup / Reconnect Path

```
App starts
  ↓
Read local in-memory cache
  ↓
performStartupHydration(workspaceId, managers, userId)   ← src/services/syncService.js
  ├── watermark = getSyncWatermark(workspaceId, userId)
  ├── if watermark > 0:
  │     GET /api/sync/delta?workspaceId=X&since=watermark
  │     if requiresFullResync → clearWatermark → full reconciliation
  │     else applyDeltaEvents(events) → saveSyncWatermark(lastAppliedEventId)
  │          (watermark advances only to lastAppliedEventId, not toWatermark)
  │          (stops at first failure — does not skip events)
  └── if watermark = 0:
        existing full REST reconciliation (performReconciliation)
  ↓
Subscribe to WebSocket broadcasts (serverSync.js)
  ↓  each view:updated event → three-case gap check → apply → advance watermark
```

---

## 5. Revision Model (Optimistic Concurrency Control)

Every durable collaborative entity has a `revision BIGINT NOT NULL DEFAULT 1` column.

### 5.1 Tables with revision

- `view_configurations.revision`
- `viewgroups.revision`
- `annotations.revision`
- `workspace_annotations.revision`

### 5.2 OCC write protocol

**Client** reads an entity at `revision = N`, stores it locally.

**Client** submits an update:
```http
PUT /api/views/<id>
{ "name": "New Name", "base_revision": 3 }
```

**Server** runs:
```sql
UPDATE view_configurations
SET name = $1, revision = revision + 1, updated_at = NOW()
WHERE id = $id AND revision = $base_revision
RETURNING *
```

| rowCount | Meaning |
|---|---|
| 1 | Accepted — write succeeds, sync_event inserted in same transaction |
| 0 (base_revision supplied) | Conflict — 409 returned with current server state |
| 0 (no base_revision) | Entity not found — 404 |

**Omitting `base_revision`** skips the revision check (last-write-wins, backward-compatible).

**Supplying `force_overwrite: true`** also skips the check — used after explicit conflict resolution. Recorded as `operation: conflict_resolved` in sync_events.

### 5.3 Conflict response (409)

```json
{
  "error": "conflict",
  "entityType": "view_configuration",
  "entityId": "uuid",
  "clientBaseRevision": 3,
  "serverRevision": 5,
  "serverObject": { /* current server row */ },
  "updatedBy": "user-uuid-or-null",
  "updatedAt": "2024-06-01T12:00:00Z"
}
```

---

## 6. Conflict Resolution

### 6.1 ViewConfiguration — interactive resolution

`ViewConfigurationManager._syncToServer()` sends `base_revision: view.revision` in every PUT.

On 409, the manager:
1. Sets `view.hasConflict = true` (blocks further syncs for this view)
2. Creates `view.conflict` with a **deep copy** of the client state at conflict time
3. Emits `conflictDetected` manager event
4. Dispatches `window` event `cia:sync-conflict`

The `ConflictResolutionDialog` component (`src/ui/react/components/organisms/ConflictResolutionDialog.jsx`) listens for `cia:sync-conflict` and shows four options:

| Option | Behaviour |
|---|---|
| **Use server version** | Adopt server object, clear conflict; no further PUT |
| **Keep mine (overwrite)** | Resend with `force_overwrite: true` (requires confirmation click) |
| **Save mine as copy** | POST duplicate, then revert original to server state |
| **Merge** | Conservative auto-merge — see §6.2 |

### 6.2 Safe auto-merge (`canAutoMergeSafe`)

Merge is only offered when **both** of the following are true:

1. The server-side diff and client-side diff touch **no overlapping top-level paths** (`canAutoMerge` check).
2. Every changed top-level path is listed in `VIEW_SAFE_MERGE_FIELDS` (semantic whitelist).

```javascript
// src/utils/jsonPatch.js
export const VIEW_SAFE_MERGE_FIELDS = new Set([
  'camera', 'cursor_config', 'annotation_display', 'annotations_visible',
  'active_instance_count', 'last_active_timestamp', 'broadcast',
  'name', 'description', 'visibility',
]);
```

Fields **not** in this set (`filters`, `widgets`, `color_maps`, `links`, `snapshots`, `applied_presets`, `dataset_id`, `file_version_id`, etc.) are treated as potentially dependent on the render pipeline and always require explicit user resolution.

`canAutoMergeSafe(patchA, patchB, VIEW_SAFE_MERGE_FIELDS)` is exported from `src/utils/jsonPatch.js`.

### 6.3 Annotations — interactive conflict resolution

`AnnotationManager.updateAnnotation()` sends `base_revision` on every PUT. On 409:

1. Sets `annotation.hasConflict = true` and populates `annotation.conflict`.
2. Dispatches `cia:sync-conflict` window event with `entityType: "annotation"`.
3. `ConflictResolutionDialog` renders an Annotation Conflict dialog.

**Conflict resolution options for annotations:**

| Option | Behaviour |
|---|---|
| Use server version | Adopt server annotation, clear conflict |
| Keep mine (overwrite) | PUT with `force_overwrite: true` (requires confirmation) |
| Save as copy | **Disabled** — annotations are anchored to 3D geometry; re-positioning must be done manually |
| Merge | Enabled only if diffs touch non-overlapping fields from `ANNOTATION_SAFE_MERGE_FIELDS` (currently: `visibility` only) |

**Safe merge fields for annotations (`ANNOTATION_SAFE_MERGE_FIELDS`):** `visibility`

**NOT safe:** `text`, `content`, `position`, `normal` — these affect analytical meaning.

### 6.4 ViewGroups — interactive conflict resolution

`ViewGroupManager._syncToServer()` sends `base_revision` on every PUT. On 409:

1. Sets `viewGroup.hasConflict = true`, populates `viewGroup.conflict`.
2. Dispatches `cia:sync-conflict` with `entityType: "viewgroup"`.
3. `ConflictResolutionDialog` renders a View Group Conflict dialog.

**Conflict resolution options for viewgroups:**

| Option | Behaviour |
|---|---|
| Use server version | Adopt server viewgroup, clear conflict |
| Keep mine (overwrite) | PUT with `force_overwrite: true` (requires confirmation) |
| Save as copy | **Disabled** — requires intentional slot mapping to avoid orphaned placements |
| Merge | Enabled only for `VIEWGROUP_SAFE_MERGE_FIELDS` (currently: `name`, `color`) |

**Safe merge fields for viewgroups (`VIEWGROUP_SAFE_MERGE_FIELDS`):** `name`, `color`

**NOT safe:** `slots`, `canvas_position`, `layout_id`, `visibility` — layout-affecting.

### 6.5 Workspace Annotations — interactive conflict resolution

`WorkspaceAnnotationManager.updateWorkspaceAnnotation()` sends `base_revision` on every PUT. On 409:

1. Sets `annotation.hasConflict = true`, populates `annotation.conflict`.
2. Dispatches `cia:sync-conflict` with `entityType: "workspace_annotation"`.
3. `ConflictResolutionDialog` renders a Workspace Annotation Conflict dialog.

**Conflict resolution options for workspace annotations:**

| Option | Behaviour |
|---|---|
| Use server version | Adopt server annotation, clear conflict |
| Keep mine (overwrite) | PUT with `force_overwrite: true` (requires confirmation) |
| Save as copy | **Disabled** — canvas-grid annotations require manual re-positioning |
| Merge | Enabled only for `WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS` (currently: `visibility`, `z_index`) |

**Safe merge fields (`WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS`):** `visibility`, `z_index`

**NOT safe:** `text_content`, `label`, `path_data`, `screen_coordinates`, `style`, `linked_datasets`, `linked_view_ids`, `linked_grid_slots` — all affect what the annotation represents or where it renders.

### 6.6 Conflict infrastructure — how it generalizes

All entity conflicts route through `CONFLICT_STRATEGIES` in `src/utils/conflictStrategies.js`. To add a new entity type:

1. Add an entry to `CONFLICT_STRATEGIES` with `displayName`, `resolverId`, `supportsDuplication`, `safeFields`, `mergeWarning`.
2. Add `resolveConflictUseServer` and `resolveConflictOverwrite` to the entity's manager.
3. Expose the manager on `window.CIA` via `src/init/appInitializer.js`.
4. The `ConflictResolutionDialog` picks up the new entity automatically.

---

## 7. Live WebSocket Gap Handling

Every live `view:updated` event carries a `syncEventId` (monotonically increasing).

Client applies **three-case logic** (implemented in `src/services/serverSync.js`):

| Condition | Action |
|---|---|
| `incoming <= lastWatermark` | Duplicate or already-applied — skip silently |
| `incoming === lastWatermark + 1` | Expected next event — apply, advance watermark |
| `incoming > lastWatermark + 1` | **Any gap > 1** — schedule debounced delta back-fill |

Gap of any size > 1 triggers a back-fill because any missed `sync_events` row may represent a persistent state mutation. The old behaviour (threshold of 50) silently missed gaps 1-49.

Back-fill calls are **debounced** (`DELTA_BACKFILL_DEBOUNCE_MS = 500`) so multiple gap triggers from rapid WS events collapse into a single fetch.

If `handleServerBroadcast` throws, the watermark is **not** advanced — the next event's gap detection triggers a back-fill to recover.

---

## 8. Sync Watermark Storage

### 8.1 Storage location

Watermarks are stored in **`localStorage`**, matching the existing `cia_sync_state` pattern.

### 8.2 Key format

```
cia_sync_watermark_<userId>_<workspaceId>
```

- Scoped by **both `userId` and `workspaceId`** to prevent cross-user reuse on a shared browser.
- When `userId` is unknown (e.g. before auth completes), key uses `cia_sync_watermark__<workspaceId>` (double-underscore). This differs from pre-hardening keys, so old unscoped watermarks are not accidentally reused.

### 8.3 Watermark advance rules

- Watermark is advanced **only after** the corresponding event has been successfully applied.
- If `applyDeltaEvents` fails partway through a batch, the watermark is advanced only to `lastAppliedEventId` (the last event that succeeded), not to `toWatermark`.
- If the first event in a batch fails, the watermark is not advanced at all, and startup falls back to full REST hydration.

### 8.4 Accessing watermarks

All watermark operations are wrapped behind functions in `src/services/syncService.js`:

```javascript
getSyncWatermark(workspaceId, userId)
saveSyncWatermark(workspaceId, eventId, userId)
clearSyncWatermark(workspaceId, userId)
```

Do not use raw `localStorage` key strings outside these functions.

---

## 9. Sync Event Log

### 9.1 Schema

```sql
CREATE TABLE sync_events (
  id               BIGSERIAL    PRIMARY KEY,   -- client watermark
  workspace_id     UUID         REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type      VARCHAR(50)  NOT NULL,
  entity_id        UUID         NOT NULL,
  operation        VARCHAR(30)  NOT NULL,       -- create | update | delete | restore | conflict_resolved
  base_revision    BIGINT,                      -- NULL for creates
  next_revision    BIGINT       NOT NULL,
  patch            JSONB,                       -- JSON Patch ops (populated for OCC updates)
  snapshot         JSONB,                       -- compact entity snapshot after mutation
  actor_user_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
  correlation_id   UUID,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

`sync_events.id` (BIGSERIAL) is the **client sync watermark**.

### 9.2 Indexes

```sql
CREATE INDEX idx_sync_events_workspace ON sync_events (workspace_id, id);  -- primary delta query
CREATE INDEX idx_sync_events_entity ON sync_events (entity_type, entity_id, id);
CREATE INDEX idx_sync_events_created_at ON sync_events (created_at);       -- compaction
```

---

## 10. Delta Hydration Endpoint

```
GET /api/sync/delta?workspaceId=<uuid>&since=<watermark>
```

**Auth:** same `authenticate` middleware as all routes. Caller must be a workspace member or project member.

### 10.1 Response

```json
{
  "workspaceId": "...",
  "fromWatermark": 42,
  "toWatermark": 47,
  "events": [
    {
      "id": "123",
      "entity_type": "view_configuration",
      "entity_id": "...",
      "operation": "update",
      "next_revision": 5,
      "patch": [ {"op": "replace", "path": "/name", "value": "New Name"} ],
      "snapshot": { /* full entity row */ },
      "payload_type": "patch",   // "patch" | "snapshot" | "tombstone"
      "actor_user_id": "...",
      "created_at": "..."
    }
  ],
  "minimumAvailableEventId": 1,
  "requiresFullResync": false,
  "mode": "snapshot"    // reflects requested mode
}
```

`minimumAvailableEventId` is the oldest `sync_events.id` currently in the table. Clients can use this field to determine whether their saved watermark is still valid before making a delta request.

### 10.2 Delta payload modes

Add `?mode=` to control event payload shape:

| Mode | Behaviour |
|---|---|
| `snapshot` *(default)* | All events include full `snapshot` JSONB. Backward-compatible. |
| `patch` | Events with a stored `patch` omit `snapshot`; tombstone for deletes; snapshot fallback otherwise |
| `auto` | Same as `patch` — uses patch when available, snapshot when not |

Each event includes a `payload_type` field: `"patch"` \| `"snapshot"` \| `"tombstone"`.

Patches are populated for OCC updates (when `base_revision` is supplied). LWW writes and create events still use full snapshots.

**Client behavior for patch events:** Apply JSON Patch ops (`patch` field) on top of the current local state. If local state is missing or patch application fails, stop processing and do not advance the watermark — the failure will be detected as a gap on the next incoming event and trigger a delta back-fill.

### 10.3 `requiresFullResync: true` conditions

| Condition | reason |
|---|---|
| `since` absent or ≤ 0 | `"no_watermark"` |
| Client watermark predates the pruning floor | `"WATERMARK_EXPIRED"` |
| Gap detected — oldest event is newer than sinceId+1 | `"watermark_compacted"` |
| Client fetch error | `"fetch_error"` (client-side only) |

`WATERMARK_EXPIRED` is distinct from `watermark_compacted`: the former means events were pruned intentionally by the retention job; the latter means there is an unexpected gap.

---

## 11. Sync Event Retention / Compaction

**Implementation:** `server/src/services/syncEventPruning.js`  
**Manual script:** `server/scripts/prune-sync-events.js`

### 11.1 Safety guarantees

- **Disabled by default.** Pruning only runs when `SYNC_EVENTS_PRUNING_ENABLED=true`.
- **Expired watermark detection.** Before deleting events, the `/api/sync/delta` endpoint checks whether the client's `since` watermark predates the oldest retained event. If so, it returns `requiresFullResync: true, reason: "WATERMARK_EXPIRED"`. The client then falls back to full REST hydration automatically.
- **Batch deletes.** Events are deleted in bounded batches (`BATCH_SIZE`) to avoid long table locks.
- **After database reset.** All `sync_events` are wiped. On the next delta request, `minimumAvailableEventId` will be `null` and gap detection fires, returning `requiresFullResync: true`. No manual action needed.

### 11.2 Environment variables

| Variable | Default | Description |
|---|---|---|
| `SYNC_EVENTS_PRUNING_ENABLED` | `"false"` | Set to `"true"` to allow deletion |
| `SYNC_EVENTS_RETENTION_DAYS` | `90` | Keep events created within this many days |
| `SYNC_EVENTS_PRUNING_BATCH_SIZE` | `1000` | Max rows deleted per job run |
| `SYNC_EVENTS_PRUNING_SCHEDULE` | _(unset)_ | `"daily"` or `"hourly"` to auto-run on server startup |

### 11.3 Manual pruning

```bash
SYNC_EVENTS_PRUNING_ENABLED=true \
SYNC_EVENTS_RETENTION_DAYS=90 \
DATABASE_URL=postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics \
node server/scripts/prune-sync-events.js
```

Run the script multiple times to continue pruning in batches.

### 11.4 Scheduled pruning (optional)

To run pruning automatically on server startup:

```bash
SYNC_EVENTS_PRUNING_ENABLED=true
SYNC_EVENTS_PRUNING_SCHEDULE=daily
```

The interval uses `setInterval` with `unref()` so it does not keep the server process alive. Default: not started.

### 11.5 minimumAvailableEventId

The `/api/sync/status` and `/api/sync/delta` responses both include `minimumAvailableEventId` — the smallest `sync_events.id` currently in the table. Clients can use this to pre-check whether their watermark is still valid.

---

## 12. Adding a New Persistent Synchronized Entity

### 12.1 Database

1. Add `revision BIGINT NOT NULL DEFAULT 1` to the new table.
2. Add the column to `server/database/migrations/` (next numbered file).
3. Also add to `server/database/init.sql` for fresh installs.

### 12.2 Server route (PUT handler)

Follow the pattern in `server/src/routes/views.js`:

```javascript
const { writeSyncEvent, buildSnapshot } = require('../services/syncEventService');

const { base_revision, force_overwrite, ...updates } = req.body;
const hasRevisionCheck = base_revision != null && !force_overwrite;
const actorUserId = user?.id || req.headers['x-user-id'] || null;

const client = await pool.connect();
await client.query('BEGIN');

const result = await client.query(
  `UPDATE my_table SET ..., revision = revision + 1, updated_at = NOW()
   WHERE id = $id${hasRevisionCheck ? ' AND revision = $baseRev' : ''}
   RETURNING *`,
  values
);

if (result.rowCount === 0 && hasRevisionCheck) {
  await client.query('ROLLBACK');
  client.release();
  const current = await pool.query('SELECT * FROM my_table WHERE id = $1', [id]);
  return res.status(409).json({
    error: 'conflict', entityType: 'my_entity', entityId: id,
    clientBaseRevision: Number(base_revision),
    serverRevision: Number(current.rows[0]?.revision),
    serverObject: current.rows[0],
    updatedBy: current.rows[0]?.updated_by || null,
    updatedAt: current.rows[0]?.updated_at,
  });
}

const entity = result.rows[0];
const syncEvent = await writeSyncEvent(client, {
  workspaceId, entityType: 'my_entity', entityId: id,
  operation: force_overwrite ? 'conflict_resolved' : 'update',
  baseRevision: base_revision != null ? Number(base_revision) : null,
  nextRevision: Number(entity.revision),
  snapshot: buildSnapshot(entity),
  actorUserId, correlationId,
});

await client.query('COMMIT');
client.release();
```

### 12.3 Client

- Add the entity type to `applyDeltaEvents` in `src/services/syncService.js`.
- In the relevant manager's sync method, send `base_revision: entity.revision` in PUT requests.
- Handle 409 responses and surface structured conflict objects.
- For interactive resolution, extend `ConflictResolutionDialog` or create a similar component.

### 12.4 Tests

- Add backend OCC test (stale revision → 409, accepted write → sync_event row).
- Add frontend unit test for conflict detection and watermark advance.

---

## 13. Troubleshooting Stale Client State

### Clear sync watermarks (browser console)

```javascript
// Clear all CIA watermarks for all users/workspaces
Object.keys(localStorage)
  .filter(k => k.startsWith('cia_sync_watermark_'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

### Force full reconciliation

```javascript
window.CIA.syncService.clearSyncState();
location.reload();
```

### After a database reset

```javascript
// Required after ./scripts/reset-database.sh
indexedDB.deleteDatabase('cia-datasets');
Object.keys(localStorage)
  .filter(k => k.startsWith('cia_sync_'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## 14. Node Runtime and Test Setup

### Node version requirement

| Runtime | Minimum | Recommended |
|---|---|---|
| Frontend Vitest tests | Node 20 | Node 22 LTS |
| Backend server (API) | Node 18 (Docker) | Node 18 (unchanged) |

**Why Node 20+ for Vitest?** Vitest 4 uses Vite 5 ESM internals. Node 16 cannot load them (`ERR_REQUIRE_ESM`). Node 18 is technically sufficient for basic Vite 5 use, but Node 20+ has improved ESM loader stability. The project `.nvmrc` targets Node 22 LTS.

```bash
# Install Node 22 via nvm
nvm install 22
nvm use 22
node -v  # v22.x.x
```

### Frontend tests (Vitest 4)

```bash
npm run test:run
```

Test files:
- `src/utils/__tests__/jsonPatch.test.js` — diff/patch/canAutoMerge/canAutoMergeSafe/VIEW_SAFE_MERGE_FIELDS
- `src/utils/__tests__/conflictStrategies.test.js` — entity strategy config, safe-merge whitelists for all four entity types
- `src/services/__tests__/syncService.watermark.test.js` — watermark scoping, gap logic, partial failure
- `src/core/data/managers/__tests__/ViewConfigurationManager.conflict.test.js` — conflict detection, deep copy
- `src/core/data/managers/__tests__/AnnotationManager.deltaApply.test.js` — patch/snapshot/tombstone, idempotency, failed-patch stops batch
- `src/core/data/managers/__tests__/ViewGroupManager.deltaApply.test.js` — patch/snapshot/tombstone, idempotency, failed-patch stops batch
- `src/core/data/managers/__tests__/WorkspaceAnnotationManager.conflict.test.js` — conflict + `applyDeltaEvent` patch/snapshot/tombstone
- `src/ui/react/components/organisms/__tests__/ConflictResolutionDialog.test.jsx` — dialog for all four entity types

### Backend tests (Jest 29)

Pure unit tests run without any DB:
```bash
cd server && npm test -- --testPathPattern "syncEventService|syncPruning|jsonDiff"
```

Integration tests require PostgreSQL with the DR1 migration applied. The `test:integration` npm script enforces the `TEST_DATABASE_URL` guard — it exits with an error if the variable is not set:
```bash
# 1. Start PostgreSQL
docker-compose up -d cia-postgres

# 2. Apply DR1 migration (if not already applied)
./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql

# 3. Run integration tests (views OCC + delta + WS broadcast)
cd server
TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
DEV_BYPASS_AUTH=true \
npm run test:integration
```

The `test:integration` script uses `--runInBand` for deterministic DB test ordering and matches `views-concurrency|ws-broadcast`.

If `TEST_DATABASE_URL` is not set, `npm run test:integration` exits immediately with a clear error (rather than silently skipping).

### CI status

A minimal GitHub Actions workflow exists at `.github/workflows/ci.yml`. It runs:
- **Frontend unit tests** (Vitest, Node 22) — on every push and pull request
- **Backend unit tests** (Jest, no DB, Node 22) — on every push and pull request

**Not included in CI** (manual-only):
- Backend integration tests (OCC, delta, WS broadcast) — require PostgreSQL
- Docker GPU build — requires NVIDIA runtime
- LiveKit, Keycloak, MinIO, Redis, Apple Vision Pro

A future `backend-integration` CI job can be added with a Postgres service container — see `.github/workflows/ci.yml` for the recommended structure.

---

## 15. Client Patch Application Support

All four persistent entity types now support client-side patch event application via `applyDeltaEvent(event)`:

| Entity type | Patch events | Snapshot events | Tombstone events | Manager |
|---|---|---|---|---|
| `view_configuration` | ✅ `_clientToServerFormat` → apply → `handleServerBroadcast` | ✅ | ✅ `removeView` | `ViewConfigurationManager` |
| `annotation` | ✅ `_annotationToServerFormat` → apply → update model | ✅ via `handleServerBroadcast` | ✅ `dataset.removeAnnotation` | `AnnotationManager` |
| `viewgroup` | ✅ `_viewGroupToServerFormat` → apply → `_handleRemoteUpdated` | ✅ | ✅ `_handleRemoteDeleted` | `ViewGroupManager` |
| `workspace_annotation` | ✅ apply directly (stored as snake_case plain object) | ✅ `registerAnnotation` | ✅ `_annotations.delete` | `WorkspaceAnnotationManager` |

**Patch safety rules** (same for all entity types):
- Idempotent: if local revision ≥ event's `next_revision`, skip without failing
- Failed patch (throws) → return `false` → batch stops → watermark not advanced
- No local state to patch against → return `false` → watermark not advanced → next startup hydration does a full REST fetch

**Server-side patch generation** is now computed for **all writes** (OCC and LWW):
- Before the UPDATE, a transactional SELECT fetches old state
- `diffObjects(buildSnapshot(old), buildSnapshot(new))` computes the patch
- Stored in `sync_events.patch` as JSONB
- LWW writes: old state is best-effort (no revision lock) — patch may reflect wrong base if a concurrent write intervenes, but clients fall back to snapshot on failure

---

## 16. Remaining Limitations

| Limitation | Status |
|---|---|
| LWW patch non-atomicity — LWW old-state SELECT has no revision lock; concurrent writes can produce a patch with wrong base | By design — clients always fall back to snapshot on patch failure |
| Y.js late-joiner efficiency via state-vector sync | Future optimization |
| CI does not run integration tests — manual setup required | Documented in §14 |
| `Annotation` model uses camelCase fields; patch ops are snake_case — format conversion done in `_annotationToServerFormat` / `_applyServerFormatToAnnotation`; unmapped fields (rare) silently pass through | Monitor if new annotation DB columns are added |
