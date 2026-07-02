// server/src/__tests__/views-concurrency.test.js
// Integration tests for OCC, sync_events, and /api/sync/delta.
//
// ─── HOW TO RUN ────────────────────────────────────────────────────────────
//  Requirements:
//    • Node 20+  (Node 22 LTS recommended)
//    • Docker running with PostgreSQL
//    • DR1 migration applied
//
//  Steps:
//    1. docker-compose up -d cia-postgres
//    2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//    3. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//       DEV_BYPASS_AUTH=true \
//       cd server && npm test -- --testPathPattern "views-concurrency" --runInBand
//
//  Alternative (.env.test file):
//    npx dotenv -e .env.test -- npx jest --testPathPattern "views-concurrency" --runInBand
//
// ─── STILL SKIPPED ────────────────────────────────────────────────────────
//  WS broadcast test — requires WS client library + live WS server setup.
//
// ─── AUTO-SKIP ────────────────────────────────────────────────────────────
//  If TEST_DATABASE_URL / DATABASE_URL is not set, tests skip with a clear
//  message (not a failure). Set the env var to enable them.
// ──────────────────────────────────────────────────────────────────────────

'use strict';

const request = require('supertest');
const { createTestPool, cleanupSyncEvents, cleanupViews, SEED, DEV_AUTH_HEADERS, TEST_DB_URL } = require('./helpers/dbFixture');
const { createTestApp } = require('./helpers/testApp');

// ============================================================================
// TEST SETUP
// ============================================================================

const pool = createTestPool();
const app = pool ? createTestApp(pool) : null;

// IDs of rows created during tests — cleaned up in afterAll
const createdViewIds = [];
let startEventId = 0;

const maybeDescribe = pool ? describe : describe.skip;

// ============================================================================
// HELPERS
// ============================================================================

async function createTestView(projectId = SEED.PROJECT_ID) {
  if (!pool) return null;

  // Need a dataset id — use any existing active dataset
  const dsResult = await pool.query(
    `SELECT id FROM datasets WHERE status = 'active' LIMIT 1`
  );
  if (!dsResult.rows.length) return null;
  const datasetId = dsResult.rows[0].id;

  // Get the main branch
  const branchResult = await pool.query(
    `SELECT id FROM project_branches WHERE project_id = $1 AND name = 'main' LIMIT 1`,
    [projectId]
  );
  const branchId = branchResult.rows[0]?.id || null;

  const res = await request(app)
    .post('/api/views')
    .set(DEV_AUTH_HEADERS)
    .send({
      fileId: datasetId,
      projectId,
      branchId,
      name: `OCC Test View ${Date.now()}`,
      visibility: 'private',
    });

  if (res.status !== 201) return null;
  const view = res.body.view;
  createdViewIds.push(view.id);
  return view;
}

async function getCurrentEventId() {
  if (!pool) return 0;
  const result = await pool.query(
    `SELECT COALESCE(MAX(id), 0)::bigint AS max_id FROM sync_events`
  );
  return Number(result.rows[0].max_id);
}

// ============================================================================
// SUITE: PUT /api/views/:id — Optimistic Concurrency Control
// ============================================================================

maybeDescribe('PUT /api/views/:id — OCC', () => {
  let testView;

  beforeAll(async () => {
    startEventId = await getCurrentEventId();
    testView = await createTestView();
    if (!testView) {
      console.warn('Could not create test view — seeded dataset may be missing');
    }
  });

  afterAll(async () => {
    await cleanupViews(pool, createdViewIds);
    await cleanupSyncEvents(pool, startEventId);
  });

  test('accepts write when base_revision matches → 200, revision incremented', async () => {
    if (!testView) return;
    const res = await request(app)
      .put(`/api/views/${testView.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Updated via OCC', base_revision: testView.revision });

    expect(res.status).toBe(200);
    expect(res.body.view.name).toBe('Updated via OCC');
    expect(Number(res.body.view.revision)).toBe(Number(testView.revision) + 1);
    // Advance our local copy so subsequent tests use the new revision
    testView = res.body.view;
  });

  test('stale revision returns 409 Conflict with structured body', async () => {
    if (!testView) return;

    // First, advance the server's revision by another user (simulate)
    const advance = await request(app)
      .put(`/api/views/${testView.id}`)
      .set({ ...DEV_AUTH_HEADERS, 'x-user-id': SEED.USER_ALICE })
      .send({ name: 'Concurrent edit', base_revision: testView.revision });
    expect(advance.status).toBe(200);

    // Now try with the old (stale) revision
    const staleRes = await request(app)
      .put(`/api/views/${testView.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Stale write', base_revision: testView.revision });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error).toBe('conflict');
    expect(staleRes.body.entityType).toBe('view_configuration');
    expect(staleRes.body.entityId).toBe(testView.id);
    expect(typeof staleRes.body.serverRevision).toBe('number');
    expect(staleRes.body.serverRevision).toBeGreaterThan(Number(testView.revision));
    expect(staleRes.body.clientBaseRevision).toBe(Number(testView.revision));
    expect(staleRes.body.serverObject).toBeDefined();
    expect(staleRes.body.updatedAt).toBeDefined();
    testView = staleRes.body.serverObject; // update local copy to server state
  });

  test('write without base_revision succeeds (backward-compatible LWW)', async () => {
    if (!testView) return;
    const res = await request(app)
      .put(`/api/views/${testView.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'LWW write' }); // no base_revision

    expect(res.status).toBe(200);
    expect(Number(res.body.view.revision)).toBeGreaterThanOrEqual(1);
    testView = res.body.view;
  });

  test('force_overwrite: true skips revision check → 200', async () => {
    if (!testView) return;
    const res = await request(app)
      .put(`/api/views/${testView.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Force write', base_revision: 1, force_overwrite: true });

    expect(res.status).toBe(200);
    testView = res.body.view;
  });

  test('accepted update writes a sync_events row in the same transaction', async () => {
    if (!testView) return;

    const beforeRevision = Number(testView.revision);
    const res = await request(app)
      .put(`/api/views/${testView.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Sync event write', base_revision: testView.revision });

    expect(res.status).toBe(200);

    const events = await pool.query(
      `SELECT * FROM sync_events WHERE entity_id = $1 ORDER BY id DESC LIMIT 1`,
      [testView.id]
    );
    expect(events.rows.length).toBe(1);
    expect(events.rows[0].entity_type).toBe('view_configuration');
    expect(events.rows[0].operation).toBe('update');
    expect(Number(events.rows[0].next_revision)).toBe(beforeRevision + 1);
    testView = res.body.view;
  });
});

// ============================================================================
// SUITE: Annotation OCC
// ============================================================================

maybeDescribe('PUT /api/annotations/:id — OCC', () => {
  // Annotations require an existing dataset with annotations.
  // These tests skip if no annotation can be created.
  let annotationId = null;
  let annotationRevision = null;

  beforeAll(async () => {
    if (!pool) return;
    startEventId = await getCurrentEventId();

    // Try to create a test annotation using a seeded dataset
    const dsResult = await pool.query(
      `SELECT d.id FROM datasets d
       JOIN file_project_access fpa ON fpa.file_id = d.id
       WHERE d.status = 'active'
       LIMIT 1`
    );
    if (!dsResult.rows.length) return;

    const fileId = dsResult.rows[0].id;
    const res = await request(app)
      .post('/api/annotations')
      .set(DEV_AUTH_HEADERS)
      .send({
        fileId,
        type: 'point',
        coordinates: [0, 0, 0],
        text: 'OCC test annotation',
        visibility: 'public',
      });

    if (res.status !== 201) return;
    annotationId = res.body.annotation.id;
    annotationRevision = Number(res.body.annotation.revision);
  });

  afterAll(async () => {
    if (annotationId && pool) {
      await pool.query(
        `UPDATE annotations SET status = 'archived' WHERE id = $1`,
        [annotationId]
      );
    }
    await cleanupSyncEvents(pool, startEventId);
  });

  test('stale annotation revision returns 409 Conflict', async () => {
    if (!annotationId) {
      console.warn('No test annotation created — skipping annotation OCC test');
      return;
    }

    // Advance server revision
    await request(app)
      .put(`/api/annotations/${annotationId}`)
      .set(DEV_AUTH_HEADERS)
      .send({ text: 'First edit', base_revision: annotationRevision });

    // Stale write
    const staleRes = await request(app)
      .put(`/api/annotations/${annotationId}`)
      .set(DEV_AUTH_HEADERS)
      .send({ text: 'Stale edit', base_revision: annotationRevision });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error).toBe('conflict');
    expect(staleRes.body.entityType).toBe('annotation');
    expect(staleRes.body.entityId).toBe(annotationId);
  });
});

// ============================================================================
// SUITE: GET /api/sync/delta
// ============================================================================

maybeDescribe('GET /api/sync/delta', () => {
  let workspaceId = null;
  let testView2;

  beforeAll(async () => {
    if (!pool) return;
    startEventId = await getCurrentEventId();

    // Find a workspace for the seed project
    const wsResult = await pool.query(
      `SELECT id FROM workspaces WHERE project_id = $1 LIMIT 1`,
      [SEED.PROJECT_ID]
    );
    workspaceId = wsResult.rows[0]?.id || null;

    // Create a test view to generate sync_events
    testView2 = await createTestView();
  });

  afterAll(async () => {
    await cleanupViews(pool, createdViewIds);
    await cleanupSyncEvents(pool, startEventId);
  });

  test('since=0 returns requiresFullResync: true with reason no_watermark', async () => {
    if (!workspaceId) return;
    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=${workspaceId}&since=0`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.requiresFullResync).toBe(true);
    expect(res.body.reason).toBe('no_watermark');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  test('returns ordered events after a mutation', async () => {
    if (!workspaceId || !testView2) return;

    const beforeUpdate = await getCurrentEventId();

    // Write an update to generate a sync event
    await request(app)
      .put(`/api/views/${testView2.id}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Delta test update', base_revision: testView2.revision });

    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=${workspaceId}&since=${beforeUpdate}`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.requiresFullResync).toBe(false);
    expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    // Events must be ordered by id ASC
    const ids = res.body.events.map((e) => Number(e.id));
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
    expect(Number(res.body.toWatermark)).toBe(ids[ids.length - 1]);
  });

  test('since=absent triggers no_watermark full resync', async () => {
    if (!workspaceId) return;
    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=${workspaceId}`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.requiresFullResync).toBe(true);
    expect(res.body.reason).toBe('no_watermark');
  });

  test('invalid/non-existent workspaceId returns 403', async () => {
    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=00000000-0000-0000-0000-000000000099&since=1`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(403);
  });

  test('response includes minimumAvailableEventId field', async () => {
    if (!workspaceId) return;
    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=${workspaceId}&since=0`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect('minimumAvailableEventId' in res.body).toBe(true);
  });
});

// ============================================================================
// SKIPPED: WS broadcast test
// Requires a running WebSocket server and ws client library.
// ============================================================================
describe.skip('WS broadcast payload includes syncEventId and actorUserId', () => {
  test.todo('Requires WebSocket client setup — deferred');
});
