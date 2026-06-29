// server/src/__tests__/workspace-permissions.test.js
// Integration tests for DR5 workspace permission enforcement.
//
// ─── HOW TO RUN ────────────────────────────────────────────────────────────
//  Requirements:
//    • Node 20+
//    • Docker with PostgreSQL running
//    • DR1 migration applied
//
//  Steps:
//    1. docker-compose up -d cia-postgres
//    2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//    3. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//       DEV_BYPASS_AUTH=true \
//       cd server && npm test -- --testPathPattern "workspace-permissions" --runInBand
//
// ─── AUTO-SKIP ────────────────────────────────────────────────────────────
//  Tests skip automatically when TEST_DATABASE_URL is not set.
// ──────────────────────────────────────────────────────────────────────────

'use strict';

const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');
const { createTestPool, SEED, DEV_AUTH_HEADERS, TEST_DB_URL } = require('./helpers/dbFixture');

const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

// ============================================================================
// TEST APP FACTORY (extends the existing createTestApp with workspace routes)
// ============================================================================

function createWorkspaceTestApp(pool) {
  // Force dev bypass for the test environment
  process.env.DEV_BYPASS_AUTH = 'true';
  process.env.NODE_ENV = 'development';

  const app = express();
  app.use(express.json());

  app.locals.pool = pool;
  app.locals.wsManager = {
    broadcastToProject: () => {},
    broadcastToRoom: () => {},
    broadcastToUsers: () => {},
    broadcast: () => {},
  };

  const { authenticate } = require('../middleware/auth');
  const workspacesRouter = require('../routes/workspaces');
  const roomsRouter = require('../routes/rooms');

  app.use('/api/workspaces', authenticate, workspacesRouter);
  app.use('/api/projects/:projectId/rooms', authenticate, roomsRouter);

  return app;
}

// ============================================================================
// HELPERS
// ============================================================================

let app;
const createdWorkspaceIds = [];
const createdRoomIds = [];

async function createWorkspaceWithOwner(projectId, ownerId) {
  const result = await pool.query(
    `INSERT INTO workspaces (name, type, project_id, owner_id, created_by)
     VALUES ('Test WS', 'project', $1, $2, $2)
     RETURNING id`,
    [projectId, ownerId]
  );
  const id = result.rows[0].id;
  createdWorkspaceIds.push(id);
  return id;
}

async function addWorkspaceMember(workspaceId, userId, permission) {
  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, permission)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET permission = $3`,
    [workspaceId, userId, permission]
  );
}

// ============================================================================
// TESTS
// ============================================================================

maybeDescribe('workspace-permissions integration', () => {
  beforeAll(() => {
    app = createWorkspaceTestApp(pool);
  });

  afterAll(async () => {
    if (pool) {
      if (createdWorkspaceIds.length) {
        await pool.query(
          `DELETE FROM workspaces WHERE id = ANY($1::uuid[])`,
          [createdWorkspaceIds]
        );
      }
      if (createdRoomIds.length) {
        await pool.query(
          `DELETE FROM rooms WHERE id = ANY($1::uuid[]) AND is_main = false`,
          [createdRoomIds]
        );
      }
      await pool.end();
    }
  });

  // ── GET /api/workspaces/:id/my-permission ──────────────────────────────

  describe('GET /api/workspaces/:id/my-permission', () => {
    test('owner gets role=owner', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      const res = await request(app)
        .get(`/api/workspaces/${wsId}/my-permission`)
        .set(DEV_AUTH_HEADERS);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('owner');
      expect(res.body.workspaceId).toBe(wsId);
    });

    test('editor gets role=editor', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      await addWorkspaceMember(wsId, SEED.USER_ALICE, 'editor');

      const res = await request(app)
        .get(`/api/workspaces/${wsId}/my-permission`)
        .set({ 'x-user-id': SEED.USER_ALICE, 'Content-Type': 'application/json' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('editor');
    });

    test('non-member gets 403', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      // USER_BOB is not a member

      const res = await request(app)
        .get(`/api/workspaces/${wsId}/my-permission`)
        .set({ 'x-user-id': SEED.USER_BOB, 'Content-Type': 'application/json' });

      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/workspaces/:id ─────────────────────────────────────────────

  describe('PUT /api/workspaces/:id', () => {
    test('owner can update workspace', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      const res = await request(app)
        .put(`/api/workspaces/${wsId}`)
        .set(DEV_AUTH_HEADERS)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    test('viewer cannot update workspace (403)', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      await addWorkspaceMember(wsId, SEED.USER_ALICE, 'viewer');

      const res = await request(app)
        .put(`/api/workspaces/${wsId}`)
        .set({ 'x-user-id': SEED.USER_ALICE, 'Content-Type': 'application/json' })
        .send({ name: 'Hijacked Name' });

      expect(res.status).toBe(403);
    });

    test('editor can update workspace', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      await addWorkspaceMember(wsId, SEED.USER_ALICE, 'editor');

      const res = await request(app)
        .put(`/api/workspaces/${wsId}`)
        .set({ 'x-user-id': SEED.USER_ALICE, 'Content-Type': 'application/json' })
        .send({ name: 'Editor Updated' });

      expect(res.status).toBe(200);
    });

    test('non-member gets 403', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      const res = await request(app)
        .put(`/api/workspaces/${wsId}`)
        .set({ 'x-user-id': SEED.USER_BOB, 'Content-Type': 'application/json' })
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/workspaces/:id/members ─────────────────────────────────

  describe('POST /api/workspaces/:id/members', () => {
    test('owner can manage members', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      const res = await request(app)
        .post(`/api/workspaces/${wsId}/members`)
        .set(DEV_AUTH_HEADERS)
        .send({ user_id: SEED.USER_ALICE, permission: 'viewer' });

      expect(res.status).toBe(201);
    });

    test('viewer cannot manage members (403)', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      await addWorkspaceMember(wsId, SEED.USER_ALICE, 'viewer');

      const res = await request(app)
        .post(`/api/workspaces/${wsId}/members`)
        .set({ 'x-user-id': SEED.USER_ALICE, 'Content-Type': 'application/json' })
        .send({ user_id: SEED.USER_BOB, permission: 'editor' });

      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/workspaces/:id/merge ──────────────────────────────────

  describe('POST /api/workspaces/:id/merge', () => {
    test('non-breakout workspace returns 400', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);
      // workspace type is 'project' by default

      const res = await request(app)
        .post(`/api/workspaces/${wsId}/merge`)
        .set(DEV_AUTH_HEADERS);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/breakout/i);
    });

    test('breakout with no parent_id returns 400', async () => {
      const result = await pool.query(
        `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, auto_merge)
         VALUES ('Orphan Breakout', 'breakout', $1, $2, $2, true)
         RETURNING id`,
        [SEED.PROJECT_ID, SEED.USER_ADMIN]
      );
      const wsId = result.rows[0].id;
      createdWorkspaceIds.push(wsId);

      const res = await request(app)
        .post(`/api/workspaces/${wsId}/merge`)
        .set(DEV_AUTH_HEADERS);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('no_parent');
    });

    test('breakout with valid parent returns 200 and sync event', async () => {
      // Create parent workspace
      const parentId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      // Create child breakout workspace
      const childResult = await pool.query(
        `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, parent_id, auto_merge)
         VALUES ('Breakout WS', 'breakout', $1, $2, $2, $3, true)
         RETURNING id`,
        [SEED.PROJECT_ID, SEED.USER_ADMIN, parentId]
      );
      const childId = childResult.rows[0].id;
      createdWorkspaceIds.push(childId);

      const res = await request(app)
        .post(`/api/workspaces/${childId}/merge`)
        .set(DEV_AUTH_HEADERS);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sourceWorkspaceId).toBe(childId);
      expect(res.body.targetWorkspaceId).toBe(parentId);
      expect(res.body.counts).toBeDefined();
    });
  });

  // ── Rooms: main room protection ─────────────────────────────────────

  describe('Rooms: main room cannot be deleted', () => {
    test('DELETE on main room returns 4xx', async () => {
      // Find the main room for the seeded project
      const mainRoomResult = await pool.query(
        `SELECT id FROM rooms WHERE project_id = $1 AND is_main = true LIMIT 1`,
        [SEED.PROJECT_ID]
      );

      if (!mainRoomResult.rows.length) {
        // No main room in seed — skip gracefully
        return;
      }

      const mainRoomId = mainRoomResult.rows[0].id;

      const res = await request(app)
        .delete(`/api/projects/${SEED.PROJECT_ID}/rooms/${mainRoomId}`)
        .set(DEV_AUTH_HEADERS);

      // rooms.js returns 400 "Cannot delete the main room"
      expect([400, 403]).toContain(res.status);
    });
  });

  // ── DEV_BYPASS_AUTH ─────────────────────────────────────────────────

  describe('DEV_BYPASS_AUTH compatibility', () => {
    test('bypass allows workspace access without membership', async () => {
      const wsId = await createWorkspaceWithOwner(SEED.PROJECT_ID, SEED.USER_ADMIN);

      // USER_BOB is not a member but bypass is enabled
      const res = await request(app)
        .get(`/api/workspaces/${wsId}/my-permission`)
        .set({ 'x-user-id': SEED.USER_BOB, 'Content-Type': 'application/json' });

      // In bypass mode, checkWorkspaceAccess always returns allowed=true
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('owner');
    });
  });
});
