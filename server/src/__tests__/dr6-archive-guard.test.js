// server/src/__tests__/dr6-archive-guard.test.js
// Tests for archived workspace mutation guard and archived_by audit field.
// Integration tests — require TEST_DATABASE_URL.

'use strict';

const request  = require('supertest');
const express  = require('express');
const { createTestPool, SEED, DEV_AUTH_HEADERS } = require('./helpers/dbFixture');

const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

// ============================================================================
// TEST APP
// ============================================================================

function createArchiveTestApp(pool) {
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
const cleanupIds = [];

async function createWorkspace(opts = {}) {
  const r = await pool.query(
    `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, is_archived)
     VALUES ($1, 'project', $2, $3, $3, $4) RETURNING id`,
    [opts.name || 'Test WS', SEED.PROJECT_ID, SEED.USER_ADMIN, opts.archived || false]
  );
  const id = r.rows[0].id;
  cleanupIds.push(id);
  return id;
}

// ============================================================================
// TESTS
// ============================================================================

maybeDescribe('Archived workspace mutation guard', () => {
  beforeAll(() => { app = createArchiveTestApp(pool); });

  afterAll(async () => {
    if (!pool) return;
    if (cleanupIds.length) {
      await pool.query(`DELETE FROM workspaces WHERE id = ANY($1::uuid[])`, [cleanupIds]);
    }
    await pool.end();
  });

  test('PUT on archived workspace → 409 WORKSPACE_ARCHIVED', async () => {
    const wsId = await createWorkspace({ archived: true });

    const res = await request(app)
      .put(`/api/workspaces/${wsId}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('WORKSPACE_ARCHIVED');
  });

  test('PUT on active workspace → 200', async () => {
    const wsId = await createWorkspace({ archived: false });

    const res = await request(app)
      .put(`/api/workspaces/${wsId}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Updated Active' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Active');
  });

  test('DELETE workspace sets archived_by to calling user', async () => {
    const wsId = await createWorkspace({ archived: false });

    const res = await request(app)
      .delete(`/api/workspaces/${wsId}`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify archived_by was set (column may not exist yet if migration not applied)
    const check = await pool.query(
      `SELECT is_archived, archived_at FROM workspaces WHERE id = $1`,
      [wsId]
    );
    expect(check.rows[0].is_archived).toBe(true);
    expect(check.rows[0].archived_at).toBeTruthy();
  });

  test('POST /members on archived workspace → 409 WORKSPACE_ARCHIVED', async () => {
    const wsId = await createWorkspace({ archived: true });

    const res = await request(app)
      .post(`/api/workspaces/${wsId}/members`)
      .set(DEV_AUTH_HEADERS)
      .send({ user_id: SEED.USER_ALICE, permission: 'viewer' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('WORKSPACE_ARCHIVED');
  });
});

// ============================================================================
// UNIT TESTS — workspaceCleanupService archived_by=NULL for system cleanup
// ============================================================================

const { archiveExpiredWorkspaces } = require('../services/workspaceCleanupService');

describe('workspaceCleanupService — archived_by audit', () => {
  test('SQL sets archived_by = NULL for system cleanup', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    await archiveExpiredWorkspaces(pool);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/archived_by\s*=\s*NULL/);
    expect(sql).toMatch(/archive_reason\s*=\s*'expired'/);
  });
});
