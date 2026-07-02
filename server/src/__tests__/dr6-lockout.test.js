// server/src/__tests__/dr6-lockout.test.js
// Tests for admin self-lockout prevention.
// Unit tests use a mock pool (no DB). Integration tests use TEST_DATABASE_URL.

'use strict';

const { hasRemainingAdmin } = require('../utils/permissions');

// ============================================================================
// UNIT TESTS — hasRemainingAdmin() (no DB needed)
// ============================================================================

describe('hasRemainingAdmin() — unit', () => {
  test('returns false when only this user is an admin', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })  // no other workspace member with owner/editor
        .mockResolvedValueOnce({ rows: [] }),  // workspace owner_id is same user
    };
    const result = await hasRemainingAdmin(pool, { workspaceId: 'ws-1' }, 'user-1');
    expect(result).toBe(false);
  });

  test('returns true when another workspace editor exists', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-2' }] }), // another editor
    };
    const result = await hasRemainingAdmin(pool, { workspaceId: 'ws-1' }, 'user-1');
    expect(result).toBe(true);
  });

  test('returns true when workspace owner_id is a different user', async () => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })             // no other member
        .mockResolvedValueOnce({ rows: [{ id: 'ws-1' }] }), // different owner
    };
    const result = await hasRemainingAdmin(pool, { workspaceId: 'ws-1' }, 'user-1');
    expect(result).toBe(true);
  });

  test('returns false for project when only this user is admin', async () => {
    const pool = {
      query: jest.fn().mockResolvedValueOnce({ rows: [] }),
    };
    const result = await hasRemainingAdmin(pool, { projectId: 'proj-1' }, 'user-1');
    expect(result).toBe(false);
  });

  test('returns true for project when another admin exists', async () => {
    const pool = {
      query: jest.fn().mockResolvedValueOnce({ rows: [{ user_id: 'user-2' }] }),
    };
    const result = await hasRemainingAdmin(pool, { projectId: 'proj-1' }, 'user-1');
    expect(result).toBe(true);
  });

  test('returns true (conservative) when no context provided', async () => {
    const pool = { query: jest.fn() };
    const result = await hasRemainingAdmin(pool, {}, 'user-1');
    expect(result).toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns true (conservative) when DB throws', async () => {
    const pool = { query: jest.fn().mockRejectedValue(new Error('DB error')) };
    const result = await hasRemainingAdmin(pool, { workspaceId: 'ws-1' }, 'user-1');
    expect(result).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS — route enforcement (needs TEST_DATABASE_URL)
// ============================================================================

const { createTestPool, SEED, DEV_AUTH_HEADERS } = require('./helpers/dbFixture');
const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

const request = require('supertest');
const express = require('express');

function createLockoutTestApp(pool) {
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

maybeDescribe('Admin self-lockout route enforcement', () => {
  let app;
  const cleanupWsIds = [];

  beforeAll(() => { app = createLockoutTestApp(pool); });

  afterAll(async () => {
    if (!pool) return;
    if (cleanupWsIds.length) {
      await pool.query(`DELETE FROM workspaces WHERE id = ANY($1::uuid[])`, [cleanupWsIds]);
    }
    await pool.end();
  });

  async function createWorkspace() {
    const r = await pool.query(
      `INSERT INTO workspaces (name, type, project_id, owner_id, created_by)
       VALUES ('Test WS', 'project', $1, $2, $2) RETURNING id`,
      [SEED.PROJECT_ID, SEED.USER_ADMIN]
    );
    const id = r.rows[0].id;
    cleanupWsIds.push(id);
    return id;
  }

  async function addMember(wsId, userId, permission) {
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, permission)
       VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET permission = $3`,
      [wsId, userId, permission]
    );
  }

  test('DELETE last admin member → 409 LAST_ADMIN_LOCKOUT', async () => {
    const wsId = await createWorkspace();
    // Only admin is ADMIN (owner_id = ADMIN, but no other member)
    await addMember(wsId, SEED.USER_ALICE, 'viewer'); // viewer doesn't count as admin

    const res = await request(app)
      .delete(`/api/workspaces/${wsId}/members/${SEED.USER_ADMIN}`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('LAST_ADMIN_LOCKOUT');
  });

  test('DELETE non-last admin member → 200 (another editor exists)', async () => {
    const wsId = await createWorkspace();
    await addMember(wsId, SEED.USER_ADMIN, 'owner');
    await addMember(wsId, SEED.USER_ALICE, 'editor'); // second admin

    const res = await request(app)
      .delete(`/api/workspaces/${wsId}/members/${SEED.USER_ALICE}`)
      .set(DEV_AUTH_HEADERS);

    // DEV_BYPASS_AUTH → allowed; admin check passes because workspace owner_id = ADMIN
    expect([200, 404]).toContain(res.status); // 404 if member not found
  });

  test('Downgrade last editor to viewer → 409 LAST_ADMIN_LOCKOUT', async () => {
    const wsId = await createWorkspace();
    await addMember(wsId, SEED.USER_ALICE, 'editor');
    // Only editor (no owner besides workspace owner_id = ADMIN who isn't in workspace_members here)
    // Actually since owner_id = ADMIN, hasRemainingAdmin will find owner != ALICE → safe
    // Let's test with a workspace where owner is Alice and only she is editor
    const r = await pool.query(
      `INSERT INTO workspaces (name, type, project_id, owner_id, created_by)
       VALUES ('Test WS2', 'project', $1, $2, $2) RETURNING id`,
      [SEED.PROJECT_ID, SEED.USER_ALICE]
    );
    const ws2 = r.rows[0].id;
    cleanupWsIds.push(ws2);
    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, permission) VALUES ($1, $2, 'editor')`,
      [ws2, SEED.USER_ALICE]
    );

    // Try to downgrade Alice to viewer in ws2 (she is the only admin)
    const res = await request(app)
      .post(`/api/workspaces/${ws2}/members`)
      .set({ 'x-user-id': SEED.USER_ALICE, 'Content-Type': 'application/json' })
      .send({ user_id: SEED.USER_ALICE, permission: 'viewer' });

    // Alice is owner_id → hasRemainingAdmin will see owner != excludeUserId is false
    // Actually owner_id = ALICE and we exclude ALICE → owner check fails → returns false
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('LAST_ADMIN_LOCKOUT');
  });
});
