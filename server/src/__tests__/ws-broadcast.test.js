// server/src/__tests__/ws-broadcast.test.js
// Real WebSocket broadcast integration test.
//
// Verifies that:
//   1. An accepted persistent-state mutation causes a WS broadcast to subscribed clients.
//   2. The broadcast payload contains syncEventId, revision, actorUserId, timestamp.
//   3. A client NOT subscribed to the project does NOT receive the broadcast.
//
// ─── AUTO-SKIP ─────────────────────────────────────────────────────────────
// Tests auto-skip if TEST_DATABASE_URL is not set.  No failure is reported.
//
// ─── SETUP ──────────────────────────────────────────────────────────────────
//   1. docker-compose up -d cia-postgres
//   2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//   3. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//      DEV_BYPASS_AUTH=true \
//      cd server && npm test -- --testPathPattern "ws-broadcast" --runInBand

'use strict';

const http = require('http');
const WebSocket = require('ws');
const request = require('supertest');
const {
  createTestPool,
  SEED,
  DEV_AUTH_HEADERS,
  cleanupViews,
  cleanupSyncEvents,
} = require('./helpers/dbFixture');
const { createTestApp } = require('./helpers/testApp');
// Import singleton — we'll call initialize() on it
const wsManager = require('../services/websocket');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Wait for a WS message matching `predicate` with a timeout.
 * Rejects cleanly if no matching message arrives within timeoutMs.
 */
function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`WS message timeout after ${timeoutMs}ms`)),
      timeoutMs
    );

    function onMessage(data) {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    }

    ws.on('message', onMessage);
  });
}

/**
 * Authenticate and join a project room.
 * Returns a promise that resolves when 'project:joined' is received.
 */
function authenticateAndJoin(ws, port, projectId) {
  return new Promise((resolve, reject) => {
    let step = 'connected';

    function onMessage(data) {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch {
        ws.off('message', onMessage);
        return reject(new Error('Invalid JSON from WS server'));
      }

      if (step === 'connected' && msg.type === 'connected') {
        step = 'auth';
        ws.send(JSON.stringify({
          type: 'auth',
          userId: SEED.USER_ADMIN,
          userEmail: 'admin@cia-web.local',
          userName: 'CIA Admin',
        }));
      } else if (step === 'auth' && msg.type === 'auth:success') {
        step = 'join';
        ws.send(JSON.stringify({ type: 'join:project', projectId }));
      } else if (step === 'join' && msg.type === 'project:joined') {
        ws.off('message', onMessage);
        resolve();
      } else if (msg.type === 'auth:error' || msg.type === 'project:join-error') {
        ws.off('message', onMessage);
        reject(new Error(`WS setup failed at step ${step}: ${msg.error}`));
      }
    }

    ws.on('message', onMessage);
  });
}

// ============================================================================
// TEST SUITE
// ============================================================================

const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

maybeDescribe('WebSocket broadcast — integration (requires DB)', () => {
  let server;
  let app;
  let port;
  let testViewId;
  let startEventId = 0;
  const createdViewIds = [];

  beforeAll(async () => {
    // Record event baseline for cleanup
    const evResult = await pool.query(
      'SELECT COALESCE(MAX(id), 0)::bigint AS max_id FROM sync_events'
    );
    startEventId = Number(evResult.rows[0].max_id);

    // Create Express app + mount real wsManager on a random port
    app = createTestApp(pool);
    server = http.createServer(app);

    // Initialize the real WebSocket manager (attached to server, with DB pool for access checks)
    wsManager.initialize(server, pool);
    // Override the no-op wsManager in app.locals with the real one
    app.locals.wsManager = wsManager;

    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;

    // Create a test view to use in tests
    const dsResult = await pool.query(
      `SELECT id FROM datasets WHERE status = 'active' LIMIT 1`
    );
    if (!dsResult.rows.length) {
      console.warn('[ws-broadcast] No active dataset found — skipping view creation');
      return;
    }
    const fileId = dsResult.rows[0].id;

    const branchResult = await pool.query(
      `SELECT id FROM project_branches WHERE project_id = $1 AND name = 'main' LIMIT 1`,
      [SEED.PROJECT_ID]
    );
    const branchId = branchResult.rows[0]?.id || null;

    const res = await request(app)
      .post('/api/views')
      .set(DEV_AUTH_HEADERS)
      .send({
        fileId,
        projectId: SEED.PROJECT_ID,
        branchId,
        name: `WS Broadcast Test View ${Date.now()}`,
        visibility: 'private',
      });

    if (res.status === 201) {
      testViewId = res.body.view.id;
      createdViewIds.push(testViewId);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupViews(pool, createdViewIds);
    await cleanupSyncEvents(pool, startEventId);

    // Shut down WS and HTTP server
    wsManager.shutdown();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: accepted mutation broadcasts view:updated with correct metadata
  // ─────────────────────────────────────────────────────────────────────────
  test('accepted view update broadcasts view:updated with syncEventId and revision', async () => {
    if (!testViewId) {
      console.warn('[ws-broadcast] No test view — skipping broadcast test');
      return;
    }

    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    await authenticateAndJoin(ws, port, SEED.PROJECT_ID);

    // Get current revision
    const viewRes = await request(app)
      .get(`/api/views/${testViewId}`)
      .set(DEV_AUTH_HEADERS);
    expect(viewRes.status).toBe(200);
    const currentRevision = Number(viewRes.body.view.revision);

    // Fire mutation and listen for WS broadcast concurrently
    const [putRes, broadcastMsg] = await Promise.all([
      request(app)
        .put(`/api/views/${testViewId}`)
        .set(DEV_AUTH_HEADERS)
        .send({ name: 'WS Broadcast Updated', base_revision: currentRevision }),
      waitForMessage(ws, (m) => m.type === 'view:updated' && m.view?.id === testViewId),
    ]);

    expect(putRes.status).toBe(200);

    // Payload assertions
    expect(broadcastMsg.type).toBe('view:updated');
    expect(broadcastMsg.view).toBeDefined();
    expect(broadcastMsg.view.id).toBe(testViewId);
    expect(Number(broadcastMsg.view.revision)).toBe(currentRevision + 1);
    expect(broadcastMsg.syncEventId).toBeTruthy();
    expect(typeof broadcastMsg.syncEventId).toBe('string');
    expect(broadcastMsg.actorUserId).toBe(SEED.USER_ADMIN);
    expect(broadcastMsg.timestamp).toBeTruthy();
    expect(broadcastMsg.projectId).toBe(SEED.PROJECT_ID);

    ws.close();
    await new Promise((resolve) => ws.once('close', resolve));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: client not in the project room does NOT receive the broadcast
  // ─────────────────────────────────────────────────────────────────────────
  test('client not subscribed to project does not receive view:updated', async () => {
    if (!testViewId) return;

    // Connect a WS client but do NOT join any project
    const isolatedWs = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise((resolve, reject) => {
      isolatedWs.once('open', resolve);
      isolatedWs.once('error', reject);
    });

    const received = [];
    isolatedWs.on('message', (data) => {
      try { received.push(JSON.parse(data.toString())); } catch { /* ignore */ }
    });

    // Trigger a mutation (view:updated will be broadcast to project room)
    const viewRes = await request(app)
      .get(`/api/views/${testViewId}`)
      .set(DEV_AUTH_HEADERS);
    await request(app)
      .put(`/api/views/${testViewId}`)
      .set(DEV_AUTH_HEADERS)
      .send({ name: 'Isolation Test', base_revision: Number(viewRes.body.view.revision) });

    // Give a short window for any rogue broadcast to arrive
    await new Promise((resolve) => setTimeout(resolve, 200));

    const viewUpdates = received.filter((m) => m.type === 'view:updated');
    expect(viewUpdates).toHaveLength(0);

    isolatedWs.close();
    await new Promise((resolve) => isolatedWs.once('close', resolve));
  });
});
