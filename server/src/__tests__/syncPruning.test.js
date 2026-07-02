// server/src/__tests__/syncPruning.test.js
// Tests for sync_events pruning service.
//
// Pure unit tests (mock pool) run without a database.
// Integration tests (real pool) use TEST_DATABASE_URL if available.

'use strict';

// Temporarily override env so pruneOldSyncEvents can be tested in both modes
const originalEnv = { ...process.env };

afterEach(() => {
  // Restore env after each test
  Object.keys(process.env).forEach((k) => {
    if (!(k in originalEnv)) delete process.env[k];
  });
  Object.assign(process.env, originalEnv);
});

// ============================================================================
// UNIT TESTS (no DB required)
// ============================================================================

describe('pruneOldSyncEvents — unit tests (no DB)', () => {
  beforeEach(() => {
    // Re-require after each env change to pick up new config values
    jest.resetModules();
  });

  test('returns skipped:true when PRUNING_ENABLED is not set', async () => {
    delete process.env.SYNC_EVENTS_PRUNING_ENABLED;
    const { pruneOldSyncEvents } = require('../services/syncEventPruning');
    const pool = { query: jest.fn() };
    const result = await pruneOldSyncEvents(pool);
    expect(result.skipped).toBe(true);
    expect(result.deleted).toBe(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns skipped:true when PRUNING_ENABLED=false', async () => {
    process.env.SYNC_EVENTS_PRUNING_ENABLED = 'false';
    const { pruneOldSyncEvents } = require('../services/syncEventPruning');
    const pool = { query: jest.fn() };
    const result = await pruneOldSyncEvents(pool);
    expect(result.skipped).toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('calls DELETE when PRUNING_ENABLED=true', async () => {
    process.env.SYNC_EVENTS_PRUNING_ENABLED = 'true';
    process.env.SYNC_EVENTS_RETENTION_DAYS = '90';
    process.env.SYNC_EVENTS_PRUNING_BATCH_SIZE = '100';
    const { pruneOldSyncEvents } = require('../services/syncEventPruning');

    const pool = {
      query: jest.fn().mockResolvedValue({ rowCount: 5 }),
    };

    const result = await pruneOldSyncEvents(pool);
    expect(result.skipped).toBe(false);
    expect(result.deleted).toBe(5);
    expect(pool.query).toHaveBeenCalledTimes(1);
    // Query must include retention interval
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/DELETE FROM sync_events/i);
    expect(sql).toMatch(/ORDER BY id ASC/i);
    expect(sql).toMatch(/LIMIT/i);
  });

  test('uses RETENTION_DAYS and BATCH_SIZE from env', async () => {
    process.env.SYNC_EVENTS_PRUNING_ENABLED = 'true';
    process.env.SYNC_EVENTS_RETENTION_DAYS = '30';
    process.env.SYNC_EVENTS_PRUNING_BATCH_SIZE = '500';
    const { pruneOldSyncEvents, RETENTION_DAYS, BATCH_SIZE } = require('../services/syncEventPruning');

    expect(RETENTION_DAYS).toBe(30);
    expect(BATCH_SIZE).toBe(500);

    const pool = { query: jest.fn().mockResolvedValue({ rowCount: 0 }) };
    await pruneOldSyncEvents(pool);

    const args = pool.query.mock.calls[0][1];
    expect(args[0]).toBe('30');  // retention days
    expect(args[1]).toBe(500);   // batch size
  });
});

describe('getMinimumAvailableEventId — unit tests (no DB)', () => {
  beforeEach(() => { jest.resetModules(); });

  test('returns null when table is empty', async () => {
    const { getMinimumAvailableEventId } = require('../services/syncEventPruning');
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ min_id: null }] }),
    };
    const result = await getMinimumAvailableEventId(pool);
    expect(result).toBeNull();
  });

  test('returns numeric id when events exist', async () => {
    const { getMinimumAvailableEventId } = require('../services/syncEventPruning');
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ min_id: '42' }] }),
    };
    const result = await getMinimumAvailableEventId(pool);
    expect(result).toBe(42);
  });

  test('returns null on query error', async () => {
    const { getMinimumAvailableEventId } = require('../services/syncEventPruning');
    const pool = {
      query: jest.fn().mockRejectedValue(new Error('DB error')),
    };
    const result = await getMinimumAvailableEventId(pool);
    expect(result).toBeNull();
  });
});

describe('startPruningSchedule — unit tests (no DB)', () => {
  beforeEach(() => { jest.resetModules(); });

  test('does not start when no schedule set', () => {
    delete process.env.SYNC_EVENTS_PRUNING_SCHEDULE;
    const { startPruningSchedule } = require('../services/syncEventPruning');
    const pool = { query: jest.fn() };
    startPruningSchedule(pool); // should not throw
  });

  test('starts interval when schedule=daily and PRUNING_ENABLED=true', () => {
    process.env.SYNC_EVENTS_PRUNING_ENABLED = 'true';
    process.env.SYNC_EVENTS_PRUNING_SCHEDULE = 'daily';
    const { startPruningSchedule, stopPruningSchedule } = require('../services/syncEventPruning');

    const pool = { query: jest.fn().mockResolvedValue({ rowCount: 0 }) };
    startPruningSchedule(pool);
    stopPruningSchedule(); // clean up immediately
  });
});

// ============================================================================
// INTEGRATION TESTS (optional — require TEST_DATABASE_URL)
// ============================================================================

const { createTestPool, TEST_DB_URL } = require('./helpers/dbFixture');
const integrationPool = createTestPool();
const maybeDescribe = integrationPool ? describe : describe.skip;

maybeDescribe('delta endpoint WATERMARK_EXPIRED reason (integration)', () => {
  // These tests directly query the DB and use the sync route
  const { createTestApp } = require('./helpers/testApp');
  const request = require('supertest');
  const app = integrationPool ? createTestApp(integrationPool) : null;

  let workspaceId = null;
  let insertedEventId = null;

  beforeAll(async () => {
    if (!integrationPool) return;

    const ws = await integrationPool.query(
      `SELECT id FROM workspaces LIMIT 1`
    );
    workspaceId = ws.rows[0]?.id || null;
    if (!workspaceId) return;

    // Insert a synthetic sync_event with an old timestamp to simulate pruning
    const ins = await integrationPool.query(
      `INSERT INTO sync_events
         (workspace_id, entity_type, entity_id, operation, next_revision, created_at)
       VALUES ($1, 'view_configuration', uuid_generate_v4(), 'update', 1, NOW() - INTERVAL '91 days')
       RETURNING id`,
      [workspaceId]
    );
    insertedEventId = Number(ins.rows[0].id);
  });

  afterAll(async () => {
    if (integrationPool && insertedEventId) {
      await integrationPool.query('DELETE FROM sync_events WHERE id = $1', [insertedEventId]);
    }
    if (integrationPool) await integrationPool.end();
  });

  test('minimumAvailableEventId is included in delta response', async () => {
    if (!workspaceId || !app) return;
    const res = await request(app)
      .get(`/api/sync/delta?workspaceId=${workspaceId}&since=0`)
      .set({ 'x-user-id': '00000000-0000-0000-0000-000000000002', 'Content-Type': 'application/json' });

    expect(res.status).toBe(200);
    expect('minimumAvailableEventId' in res.body).toBe(true);
  });
});
