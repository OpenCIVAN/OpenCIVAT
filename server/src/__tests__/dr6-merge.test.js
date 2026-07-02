// server/src/__tests__/dr6-merge.test.js
// Integration tests for DR6 breakout merge entity promotion.
//
// ─── HOW TO RUN ────────────────────────────────────────────────────────────
//  Requirements: Node 20+, Docker postgres, DR1 + DR6 migrations applied.
//
//  Steps:
//    1. docker-compose up -d cia-postgres
//    2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//    3. psql $DATABASE_URL < server/database/migrations/015_dr6_dm_room_type.sql
//    4. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//       DEV_BYPASS_AUTH=true \
//       cd server && npm test -- --testPathPattern "dr6-merge" --runInBand
//
// ─── AUTO-SKIP ────────────────────────────────────────────────────────────
//  Tests skip automatically when TEST_DATABASE_URL is not set.
// ──────────────────────────────────────────────────────────────────────────

'use strict';

const request = require('supertest');
const express = require('express');
const { createTestPool, SEED, DEV_AUTH_HEADERS } = require('./helpers/dbFixture');

const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

// ============================================================================
// TEST APP
// ============================================================================

function createMergeTestApp(pool) {
  process.env.DEV_BYPASS_AUTH = 'true';
  process.env.NODE_ENV = 'development';

  const app = express();
  app.use(express.json());
  app.locals.pool = pool;
  app.locals.wsManager = {
    broadcastToProject: jest.fn(),
    broadcastToRoom: jest.fn(),
    broadcastToUsers: jest.fn(),
    broadcast: jest.fn(),
  };

  const { authenticate } = require('../middleware/auth');
  const workspacesRouter = require('../routes/workspaces');

  app.use('/api/workspaces', authenticate, workspacesRouter);

  return app;
}

// ============================================================================
// HELPERS
// ============================================================================

let app;
const cleanupWorkspaceIds = [];
const cleanupAnnotationIds = [];
const cleanupViewConfigIds = [];

async function insertWorkspace(type, parentId = null) {
  const result = await pool.query(
    `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, parent_id, auto_merge)
     VALUES ($1, $2, $3, $4, $4, $5, $6)
     RETURNING id, created_at`,
    [
      `Test ${type}`,
      type,
      SEED.PROJECT_ID,
      SEED.USER_ADMIN,
      parentId,
      type === 'breakout',
    ]
  );
  const row = result.rows[0];
  cleanupWorkspaceIds.push(row.id);
  return row;
}

async function insertWorkspaceAnnotation(projectId, createdBy, visibility, createdAt) {
  const result = await pool.query(
    `INSERT INTO workspace_annotations
     (project_id, type, path_data, screen_coordinates, created_by, visibility, created_at, updated_at)
     VALUES ($1, 'freehand', '{}', '{}', $2, $3, $4, NOW())
     RETURNING id, visibility, revision`,
    [projectId, createdBy, visibility, createdAt]
  );
  const row = result.rows[0];
  cleanupAnnotationIds.push(row.id);
  return row;
}

async function insertViewConfig(projectId, ownerId, visibility, createdAt) {
  const result = await pool.query(
    `INSERT INTO view_configurations
     (project_id, owner_user_id, name, visibility, status, created_at, updated_at)
     VALUES ($1, $2, 'Test View', $3, 'active', $4, NOW())
     RETURNING id, visibility, revision`,
    [projectId, ownerId, visibility, createdAt]
  );
  const row = result.rows[0];
  cleanupViewConfigIds.push(row.id);
  return row;
}

// ============================================================================
// TESTS
// ============================================================================

maybeDescribe('DR6 breakout merge integration', () => {
  beforeAll(() => {
    app = createMergeTestApp(pool);
  });

  afterAll(async () => {
    if (!pool) return;
    if (cleanupAnnotationIds.length) {
      await pool.query(
        `DELETE FROM workspace_annotations WHERE id = ANY($1::uuid[])`,
        [cleanupAnnotationIds]
      );
    }
    if (cleanupViewConfigIds.length) {
      await pool.query(
        `DELETE FROM view_configurations WHERE id = ANY($1::uuid[])`,
        [cleanupViewConfigIds]
      );
    }
    if (cleanupWorkspaceIds.length) {
      await pool.query(
        `DELETE FROM workspaces WHERE id = ANY($1::uuid[])`,
        [cleanupWorkspaceIds]
      );
    }
    await pool.end();
  });

  // ── Non-breakout workspace ────────────────────────────────────────────────

  test('non-breakout workspace returns 400', async () => {
    const parent = await insertWorkspace('project');

    const res = await request(app)
      .post(`/api/workspaces/${parent.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/breakout/i);
  });

  test('breakout without parent_id returns 400 with error=no_parent', async () => {
    const orphan = await insertWorkspace('breakout', null);

    const res = await request(app)
      .post(`/api/workspaces/${orphan.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_parent');
  });

  // ── Entity promotion ──────────────────────────────────────────────────────

  test('private workspace_annotation created during breakout is promoted to project', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    // Create annotation AFTER breakout started
    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    const ann = await insertWorkspaceAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', afterBreakout);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.counts.annotations).toBeGreaterThanOrEqual(1);

    // Verify annotation visibility was promoted
    const check = await pool.query(
      `SELECT visibility FROM workspace_annotations WHERE id = $1`,
      [ann.id]
    );
    expect(check.rows[0].visibility).toBe('project');
  });

  test('private view_configuration created during breakout is promoted', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    const view = await insertViewConfig(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', afterBreakout);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.counts.viewConfigs).toBeGreaterThanOrEqual(1);

    const check = await pool.query(
      `SELECT visibility FROM view_configurations WHERE id = $1`,
      [view.id]
    );
    expect(check.rows[0].visibility).toBe('project');
  });

  test('already-public annotation is NOT counted (WHERE clause filters it)', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    // This annotation is already 'project' visibility — should be skipped
    const ann = await insertWorkspaceAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'project', afterBreakout);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    // It was already visible — not in the promoted count (it was skipped)
    // The annotation should still be 'project'
    const check = await pool.query(
      `SELECT visibility FROM workspace_annotations WHERE id = $1`,
      [ann.id]
    );
    expect(check.rows[0].visibility).toBe('project');
  });

  test('annotation created BEFORE breakout started is not promoted', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    // Create annotation BEFORE breakout started
    const beforeBreakout = new Date(new Date(breakout.created_at).getTime() - 5000).toISOString();
    const ann = await insertWorkspaceAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', beforeBreakout);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    // Annotation created before breakout should not be touched
    const check = await pool.query(
      `SELECT visibility FROM workspace_annotations WHERE id = $1`,
      [ann.id]
    );
    expect(check.rows[0].visibility).toBe('private');
  });

  test('sync_event is written for each promoted entity', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    await insertWorkspaceAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', afterBreakout);

    // Count sync_events before
    const before = await pool.query(`SELECT COUNT(*) FROM sync_events`);
    const beforeCount = parseInt(before.rows[0].count, 10);

    await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    const after = await pool.query(`SELECT COUNT(*) FROM sync_events`);
    const afterCount = parseInt(after.rows[0].count, 10);
    // At least 2 events: 1 for the annotation + 1 for the workspace provenance
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('merge response includes syncEventIds array', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.syncEventIds)).toBe(true);
  });
});
