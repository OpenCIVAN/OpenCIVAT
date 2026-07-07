// server/src/__tests__/replay-route.test.js
// Integration test for GET /api/workspaces/:id/replay-events.
//
// ─── AUTO-SKIP ────────────────────────────────────────────────────────────
//  If TEST_DATABASE_URL / DATABASE_URL is not set, the suite skips (not fails).
//  To run:
//    docker-compose up -d cia-postgres
//    ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//    TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//    DEV_BYPASS_AUTH=true \
//    cd server && npm test -- --testPathPattern "replay-route" --runInBand
// ──────────────────────────────────────────────────────────────────────────

'use strict';

const request = require('supertest');
const { createTestPool, SEED, DEV_AUTH_HEADERS } = require('./helpers/dbFixture');
const { createTestApp } = require('./helpers/testApp');

const pool = createTestPool();
const app = pool ? createTestApp(pool) : null;
const maybeDescribe = pool ? describe : describe.skip;

// Deterministic entity ids for this suite (workspace id is created at runtime).
const ENTITY_A = '11111111-1111-1111-1111-111111111111';
const ENTITY_B = '22222222-2222-2222-2222-222222222222';

maybeDescribe('GET /api/workspaces/:id/replay-events', () => {
  let workspaceId;

  beforeAll(async () => {
    // Create an isolated workspace under the seeded project.
    const ws = await pool.query(
      `INSERT INTO workspaces (project_id, name, type, owner_id)
       VALUES ($1, $2, 'shared', $3)
       RETURNING id`,
      [SEED.PROJECT_ID, 'Replay Test WS', SEED.USER_ADMIN]
    );
    workspaceId = ws.rows[0].id;

    // Seed a small ordered event history.
    await pool.query(
      `INSERT INTO sync_events
         (workspace_id, entity_type, entity_id, operation, next_revision, snapshot, actor_user_id, created_at)
       VALUES
         ($1, 'view_configuration', $2, 'create', 1, '{"name":"v1"}', $4, NOW() - interval '3 minutes'),
         ($1, 'annotation',         $3, 'create', 1, '{"label":"a1"}', $4, NOW() - interval '2 minutes'),
         ($1, 'view_configuration', $2, 'update', 2, '{"name":"v2"}', $4, NOW() - interval '1 minute')`,
      [workspaceId, ENTITY_A, ENTITY_B, SEED.USER_ADMIN]
    );
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM sync_events WHERE workspace_id = $1`, [workspaceId]);
    await pool.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]);
    await pool.end();
  });

  test('returns events ordered ascending', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.workspaceId).toBe(workspaceId);
    expect(res.body.count).toBe(3);
    const ids = res.body.events.map((e) => Number(e.id));
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    // First event is the earliest create
    expect(res.body.events[0].operation).toBe('create');
  });

  test('respects the limit and returns a cursor + hasMore', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events?limit=2`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.nextCursor).toBe(Number(res.body.events[1].id));

    // Second page via the cursor.
    const res2 = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events?limit=2&cursor=${res.body.nextCursor}`)
      .set(DEV_AUTH_HEADERS);
    expect(res2.status).toBe(200);
    expect(res2.body.count).toBe(1);
    expect(res2.body.hasMore).toBe(false);
    // No overlap with first page.
    expect(Number(res2.body.events[0].id)).toBeGreaterThan(res.body.nextCursor);
  });

  test('filters by entity type', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events?entityTypes=annotation`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.events[0].entity_type).toBe('annotation');
  });

  test('rejects an invalid entity type with 400', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events?entityTypes=bogus`)
      .set(DEV_AUTH_HEADERS);
    expect(res.status).toBe(400);
  });

  test('rejects a bad cursor with 400', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/replay-events?cursor=-5`)
      .set(DEV_AUTH_HEADERS);
    expect(res.status).toBe(400);
  });
});
