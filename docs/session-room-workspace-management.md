# Session, Room, and Workspace Management (DR5 + DR6)

This document describes the permission model, workspace/room lifecycle, session routing, breakout merge behavior, WebSocket channel scoping, Y.js auth enforcement, JSONB permission overrides, and DM room creation introduced in DR5 and DR6.

---

## 1. Workspace Types

| Type | Created by | Scope | Notes |
|------|-----------|-------|-------|
| `personal` | Auto-created per user | Private to owner | Cannot be joined by others unless explicitly shared |
| `project` | Any project member | Shared multi-user | Membership controlled by role |
| `breakout` | Project member with `breakout:create` permission | Temporary sub-space | Linked to parent via `workspaces.parent_id`; has `expires_at` and `auto_merge` flags |

### Lifecycle rules

- A personal workspace is auto-created when `GET /api/workspaces/personal` is called for the first time.
- A project workspace requires the caller to be a project member.
- A breakout workspace stores its parent in `workspaces.parent_id`. Merge is explicit via `POST /api/workspaces/:id/merge` (see §8).

---

## 2. Room Types

| Type | Created by | Deletable | Discovery |
|------|-----------|-----------|-----------|
| `main` | Auto-created per project | No — enforced by route guard | Visible to all project members |
| `breakout` | Any project member via `POST /api/projects/:id/rooms` | Yes — requires room `admin` role | Visible to project members |
| `dm` | (future) | Yes | Private to participants only |

### Main room protection

`DELETE /api/projects/:projectId/rooms/:roomId` rejects requests targeting a room with `is_main = true` with `400 Bad Request`. This is enforced server-side; it cannot be bypassed through the UI.

---

## 3. Membership Roles and Permission Sets

### Workspace roles (`workspace_members.permission`)

| Role | Assigned when |
|------|-------------|
| `owner` | Creator of workspace, or when `workspaces.owner_id = user.id` |
| `editor` | Explicitly granted via `POST /api/workspaces/:id/members` |
| `viewer` | Default for workspace members with read-only access |

### Room roles (`room_members.role`)

| Role | Assigned when |
|------|-------------|
| `admin` | User who created the room |
| `member` | User who joined the room |

### Project roles (`project_members.role`)

| Role | Notes |
|------|-------|
| `admin` | Can manage project members and rooms |
| `member` | Default contributor access |
| `viewer` | Read-only access |

### Role hierarchy

```
owner  >  admin  >  editor / member  >  viewer  >  observer
```

`member` is a backward-compatible alias for `editor` — they share the same permission set.

---

## 4. Action-Level Permissions

The complete permission set is defined in `server/src/utils/permissions.js` (backend) and mirrored in `src/services/permissionService.js` (frontend). Both files must be updated together.

### Permission → Minimum Role

| Permission | Minimum role |
|-----------|-------------|
| `workspace:read` | viewer |
| `workspace:update` | editor |
| `workspace:manage_members` | owner |
| `workspace:delete` | owner |
| `room:read` | viewer |
| `room:create` | editor |
| `room:update` | admin (room) |
| `room:delete` | admin (room) |
| `room:manage_members` | admin (room) |
| `room:join` | viewer |
| `room:leave` | viewer |
| `view:read` | viewer |
| `view:create` | editor |
| `view:update` | editor |
| `view:delete` | editor (own only) |
| `view:control_camera` | editor |
| `view:modify_configuration` | editor |
| `annotation:create` | editor |
| `annotation:update` | editor (own only) |
| `annotation:delete` | editor (own only) |
| `dataset:read` | viewer |
| `dataset:upload` | editor |
| `dataset:delete` | owner |
| `breakout:create` | editor |
| `breakout:merge` | owner |
| `breakout:delete` | owner |

---

## 5. Backend Permission Enforcement

### Middleware

Two new middleware factories in `server/src/middleware/auth.js`:

```js
// Express middleware — adds permission gate to a workspace route
requireWorkspacePermission(permission)

// Express middleware — adds permission gate to a room route
requireRoomPermission(permission)
```

Both accept a `PERMISSIONS.*` constant string and call `checkWorkspaceAccess` / `checkRoomAccess` respectively. They set `req.workspaceRole` / `req.roomRole` on success.

**DEV_BYPASS_AUTH**: When `DEV_BYPASS_AUTH=true` and `NODE_ENV=development`, all permission middleware passes immediately (returns `role='owner'`). This preserves the dev workflow.

### Helper functions

```js
// Resolve role for a user in a given context (waterfall: workspaceId → roomId → projectId)
getRoleForUser(pool, { workspaceId?, roomId?, projectId? }, userId) → Promise<string|null>

// Check workspace access
checkWorkspaceAccess(pool, workspaceId, userId) → Promise<{ allowed, role }>

// Check room access
checkRoomAccess(pool, roomId, userId) → Promise<{ allowed, role, room }>
```

### Adding a new permission-protected endpoint

1. Import the middleware:
   ```js
   const { requireWorkspacePermission } = require('../middleware/auth');
   const { PERMISSIONS } = require('../utils/permissions');
   ```

2. Apply it to the route:
   ```js
   router.post('/my-action', requireWorkspacePermission(PERMISSIONS.VIEW_CREATE), async (req, res, next) => {
     // req.workspaceRole is available here
     ...
   });
   ```

3. Add the permission constant to both `server/src/utils/permissions.js` AND `src/services/permissionService.js` (client mirror).

4. Add the permission to the appropriate role sets in both files.

5. Add a unit test in `server/src/__tests__/permissions.test.js` and a UI test in `src/utils/__tests__/permissions.test.js`.

---

## 6. Frontend Permission Awareness

### permissionService

```js
import { permissionService, PERMISSIONS } from '@Services/permissionService.js';

// Fetch and cache user's role for a workspace
const role = await permissionService.fetchWorkspaceRole(workspaceId);

// Synchronous check (use after fetch)
const canAnnotate = permissionService.hasPermission(workspaceId, PERMISSIONS.ANNOTATION_CREATE);

// Invalidate cache (e.g. on role change event)
permissionService.invalidate(workspaceId);
```

The service caches roles for 5 minutes. In dev bypass mode (`config.devBypassAuth = true`), it returns `'owner'` without making an HTTP call.

### usePermissions hook

```jsx
import { usePermissions } from '@UI/react/hooks';

function MyComponent({ workspaceId }) {
  const { permissions, loading, role } = usePermissions(workspaceId);

  if (loading) return null;

  return (
    <button
      disabled={!permissions.canCreateAnnotation}
      title={!permissions.canCreateAnnotation ? 'Viewer access — cannot annotate' : undefined}
    >
      Add Annotation
    </button>
  );
}
```

Available convenience booleans from `usePermissions`:

| Property | Permission checked |
|----------|-------------------|
| `canEdit` | `workspace:update` |
| `canDelete` | `workspace:delete` |
| `canManageMembers` | `workspace:manage_members` |
| `canCreateView` | `view:create` |
| `canDeleteView` | `view:delete` |
| `canModifyViewConfiguration` | `view:modify_configuration` |
| `canCreateAnnotation` | `annotation:create` |
| `canUploadDataset` | `dataset:upload` |
| `canCreateBreakout` | `breakout:create` |
| `canMergeBreakout` | `breakout:merge` |
| `canCreateRoom` | `room:create` |
| `canDeleteRoom` | `room:delete` |
| `canManageRoomMembers` | `room:manage_members` |

The hook subscribes to `ws:workspace:role-changed` window events so permissions refresh immediately when the server pushes a role change.

---

## 7. Session Routing Priority

The active room is resolved by `sessionManager.initializeFromURL()` / `initializeFromURLAsync()` in the following order:

1. **URL path** — `/rooms/{id}` (highest priority)
2. **URL query parameter** — `?room={id}`
3. **localStorage** — `cia_last_room` key (returning users)
4. **Config default** — `config.defaultSessionId` (development/fallback)

### Validated startup (recommended)

Use `initializeFromURLAsync(projectId)` during authenticated boot:

- Validates the resolved room against `GET /api/projects/:projectId/rooms/:roomId`.
- On `404` or `403`: falls back to the project's main room.
- On network error: proceeds offline-friendly with unvalidated room.
- **localStorage is updated only after successful validation** — unauthorized rooms are never persisted.

```js
const roomId = await sessionManager.initializeFromURLAsync(projectId);
```

---

## 8. Breakout Room Lifecycle

1. **Create** — `POST /api/workspaces/:projectId/breakout`
   - Requires project membership.
   - Creates workspace with `type='breakout'`, `auto_merge=true`, `expires_at` (default +2h).
   - The creator should set `parent_id` explicitly if linking to a specific parent workspace.

2. **Work** — Members can create views, annotations, draw on canvases within the breakout.

3. **Merge** — `POST /api/workspaces/:id/merge`
   - Requires `breakout:merge` permission (owner-level by default).
   - Conservative scope in DR5: records a provenance entry in `sync_events` with counts of mergeable entities.
   - Does **not** bulk-copy annotation or view_configuration rows (deferred to DR6).
   - Emits `workspace:merged` WebSocket event to all project members.

4. **Archive** — `DELETE /api/workspaces/:id` archives the breakout workspace.

### DR6 merge behavior (entity promotion)

The merge promotes visibility on the actor's own private entities created after the breakout started:

```sql
-- workspace_annotations created during breakout by this user
UPDATE workspace_annotations SET visibility = 'project' WHERE created_by = :userId AND created_at >= :breakout.created_at AND visibility = 'private';

-- view_configurations created during breakout by this user
UPDATE view_configurations SET visibility = 'project' WHERE owner_user_id = :userId AND created_at >= :breakout.created_at AND visibility = 'private';
```

Each promoted entity receives a `sync_event` with `operation='update'` so late-joining clients can hydrate.

A provenance `sync_event` is written with `operation='breakout_merge'` and full audit metadata.

**Merge response shape:**
```json
{
  "success": true,
  "sourceWorkspaceId": "...",
  "targetWorkspaceId": "...",
  "counts": { "annotations": 3, "viewConfigs": 1, "skipped": 0, "conflicts": 0 },
  "syncEventIds": ["101", "102", "103", "104"]
}
```

### What is NOT merged (intentional limitations)

- Entities created before the breakout started are not touched.
- Other users' private entities require per-user consent and are deferred.
- Parent entity is never overwritten — promotion only touches `visibility`, not content.
- Dataset uploads/deletions are never auto-merged.
- Room membership is never inherited by parent.

### Workspace expiry cleanup (DR6)

Expired breakout workspaces are soft-archived (not hard-deleted) by `server/src/services/workspaceCleanupService.js`.

**Config (all disabled by default):**
```
WORKSPACE_CLEANUP_ENABLED=true      # enable background cleanup
WORKSPACE_CLEANUP_INTERVAL_MS=3600000  # check every hour (default)
WORKSPACE_CLEANUP_BATCH_SIZE=50     # workspaces per run (default)
```

Manual one-shot cleanup:
```bash
WORKSPACE_CLEANUP_ENABLED=true DATABASE_URL=... node server/scripts/cleanup-expired-workspaces.js
```

---

## 9. WebSocket Broadcast Channels

| Event type | Channel | Audience |
|-----------|---------|---------|
| `file:added`, `file:removed` | Project | All project members |
| `annotation:created`, `annotation:updated`, `annotation:deleted` | Project | All project members |
| `view:created`, `view:updated`, `view:deleted` | Project | All project members |
| `room:created`, `room:updated`, `room:deleted` | Project | All project members |
| `room:member_joined`, `room:member_left` | **Room** | Clients subscribed to that room via `join:room` |
| `workspace:merged` | Project | All project members |
| DM events (future) | Users | Participants only via `broadcastToUsers([...])` |

### Room channel subscription

Clients subscribe by sending:
```json
{ "type": "join:room", "roomId": "<uuid>" }
```

The server validates room membership before admitting the client. Clients in DEV_BYPASS_AUTH mode are always admitted.

---

## 10. DM Room Privacy

DM rooms (type `dm`) are private to their participants. In DR5:

- DM room events use `broadcastToUsers(participantIds, message)` — non-participants receive no payload.
- DM room GET endpoints should verify `room_members` membership before returning metadata (enforced via `checkRoomAccess`).
- DM room creation UI is not yet implemented — groundwork is in the WebSocket service.

---

## 11. Contributing: Adding a New Permission-Protected Action

1. **Add the permission constant** to `server/src/utils/permissions.js` (`PERMISSIONS` object) and to `src/services/permissionService.js` (`PERMISSIONS` mirror).

2. **Add the permission to the correct role sets** in both files. Follow the existing hierarchy.

3. **Gate the backend route**:
   ```js
   router.post('/action', requireWorkspacePermission(PERMISSIONS.MY_NEW_PERMISSION), handler);
   ```

4. **Gate the frontend control**:
   ```jsx
   const { hasPermission } = usePermissions(workspaceId);
   <Button disabled={!hasPermission(PERMISSIONS.MY_NEW_PERMISSION)}>Do Action</Button>
   ```

5. **Add unit tests**:
   - `server/src/__tests__/permissions.test.js` — role mapping test
   - `src/utils/__tests__/permissions.test.js` — frontend service test

6. **Update this document** — add the permission to the table in §4.

---

## 12. Y.js WebSocket Auth Enforcement (DR6)

The Y.js server (`server.js`) validates:
1. **JWT token** (production) — extracted from URL param `?token=...`
2. **DEV_BYPASS_AUTH** (development) — `?userId=...&username=...` URL params accepted
3. **Room membership** — after auth, checks `room_members` OR public room + project membership

A client that fails the room membership check receives `socket.close(1008, 'Access denied to room document')`.

DEV_BYPASS_AUTH bypasses the room membership check entirely (safe for local dev).

The client (`src/collaboration/yjs/yjsSetup.js`) now calls `authService.getAccessToken()` and passes the token as `params.token` in the `WebsocketProvider` constructor. In dev bypass mode, `userId` and `username` are passed instead.

---

## 13. project_members.permissions JSONB (DR6)

`project_members.permissions` column accepts a JSONB object with optional `grant` and `deny` arrays:

```json
{ "grant": ["dataset:upload"], "deny": ["room:delete"] }
```

The function `getEffectivePermissions(pool, projectId, userId)` in `server/src/utils/permissions.js` computes the final permission set:
1. Start with base permissions from role (admin/member/viewer)
2. Add any permissions in `grant` that are valid `PERMISSIONS.*` values
3. Remove any permissions in `deny`

Unknown permission strings are silently ignored.

**Middleware**: `requireProjectPermission(permission)` in `auth.js` applies this logic to route guards.

**Endpoint**: `GET /api/projects/:projectId/rooms/my-permissions` returns `{ permissions: [...] }`.

**Frontend**: `permissionService.fetchProjectPermissions(projectId)` fetches the effective set.

---

## 14. DM Room Creation UI (DR6)

DM rooms use `room_type='dm'` and are always `is_public=false`.

**Backend**: `POST /api/projects/:projectId/rooms` with `{ room_type: 'dm', participants: [userId, ...] }`.

**Frontend hook**: `useDMRooms(projectId, currentUserId)` from `src/ui/react/hooks/useDMRooms.js`.

**Modal**: `<DMRoomCreate>` from `src/ui/react/components/organisms/DMRoomCreate/DMRoomCreate.jsx`.

DM rooms are excluded from the public room list (`GET /api/projects/:projectId/rooms`) for non-members.

DM rooms appear only in the participant's room list (`is_member=true`).

**Schema migration** required: `server/database/migrations/015_dr6_dm_room_type.sql` adds `'dm'` to the `rooms.room_type` CHECK constraint.

---

## 15. Running DR5 + DR6 Tests

```bash
# Apply DR6 migration (one-time)
psql $DATABASE_URL < server/database/migrations/015_dr6_dm_room_type.sql

# Backend unit tests (no DB required)
cd server && npm test -- --testPathPattern "permissions|workspace-cleanup|effective-permissions"

# Backend integration tests (requires Docker PostgreSQL)
docker-compose up -d cia-postgres
TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
DEV_BYPASS_AUTH=true \
cd server && npm test -- --testPathPattern "workspace-permissions|dr6-merge" --runInBand

# Frontend unit tests
npm run test:run -- src/utils/__tests__/permissions.test.js
npm run test:run -- src/core/session/__tests__/sessionManager.test.js
npm run test:run -- src/core/session/__tests__/yjsAuth.test.js

# Full frontend suite (regression check)
npm run test:run
```

---

## 16. DR6.5 — Additional Hardening

### Breakout merge consent (DR6.5)

Breakout merge now supports a per-user opt-in consent model.

**Endpoints:**
- `POST /api/workspaces/:id/consent` — grant consent for your own private entities to be promoted during merge
- `DELETE /api/workspaces/:id/consent` — revoke consent
- `GET /api/workspaces/:id/merge-eligibility` — list who has consented (merge-actor only)

**Merge behavior:**
- Merge actor's own private entities are always promoted (unchanged from DR6)
- Other users' private entities are promoted ONLY if they have active (non-revoked) consent
- Users with private entities and no consent are counted as `skippedNoConsent` in the merge response
- Consent is self-grant only — no one can grant consent on behalf of another user

**Schema:** `breakout_merge_consents(id, workspace_id, user_id, granted_at, revoked_at, entity_types)` — migration 016.

### Admin self-lockout prevention (DR6.5)

`server/src/utils/permissions.js` exports `hasRemainingAdmin(pool, context, excludeUserId)`.

Applied to:
- `DELETE /api/workspaces/:id/members/:userId` — rejects with `409 LAST_ADMIN_LOCKOUT` if removing the last admin
- `POST /api/workspaces/:id/members` when downgrading last editor/owner to viewer — same error

Response shape:
```json
{ "error": "LAST_ADMIN_LOCKOUT", "reason": "...", "userId": "..." }
```

### Y.js auth boundary (DR6.5 — documented)

- **Y.js document access is room-level, not per-field.**
- Users admitted to a Y.js document can read all presence state in that document (cursors, cameras, awareness).
- Sensitive persistent state (datasets, annotations, view configurations) must remain in REST/PostgreSQL.
- The Y.js server validates JWT token (or DEV_BYPASS_AUTH params) then checks room membership before sync step 1.
- DM Y.js documents are restricted to DM participants.
- Breakout Y.js documents are restricted to authorized breakout members.
- Room name sanitization (UUID or safe alphanumeric key only) prevents doc key injection.
- **Per-field authorization and encrypted Y.js channels are NOT implemented.** These are future security enhancements requiring a dedicated architecture design.

### DM room scoping (DR6.5)

DM rooms are **project-scoped**. All participants must be project members.

- Backend: `POST /api/projects/:projectId/rooms` validates each DM participant against `project_members` before adding them to `room_members`. Non-members get `400 PARTICIPANT_NOT_PROJECT_MEMBER`.
- UI: The DM creation modal is labeled "New Project Direct Message" with a scope note.

**Cross-project DMs are not supported.** They would require:
- Global user addressing independent of project membership
- Privacy rules not tied to project roles
- A separate notification and retention model
- Possibly a global DM workspace scope

### Soft-archive audit (DR6.5)

`workspaces` table now has `archived_by UUID` and `archive_reason VARCHAR(255)` columns (migration 016).

- Manual archive (`DELETE /api/workspaces/:id`) sets `archived_by = calling userId` and `archive_reason = 'expired'`
- System cleanup (`workspaceCleanupService.js`) sets `archived_by = NULL` and `archive_reason = 'expired'`
- Archived workspaces reject mutations (`PUT`, `POST /members`, `DELETE /members`, `POST /merge`) with `409 WORKSPACE_ARCHIVED`
- Archived workspaces are excluded from `GET /api/workspaces` (already filtered by `is_archived = false`)
- **Hard-delete remains deferred.** Admin tooling for permanent workspace deletion is a future work item.

---

## 17. Remaining Limitations (after DR6.5)

| Item | Status | Notes |
|------|--------|-------|
| Y.js per-field authorization | Deferred — by design | Requires encrypted channel architecture |
| Y.js E2E encrypted channels | Deferred — by design | Major security architecture change |
| Cross-project DMs | Unsupported — by design | Requires global identity and privacy model |
| Hard-delete of archived workspaces | Deferred | Admin tooling; retention policy design |
| Frontend consent UI for merge | Deferred | Backend and hook ready; UI panel deferred |
| `project_members.permissions` JSONB admin UI | Deferred | No safe self-service UI without more guard design |
