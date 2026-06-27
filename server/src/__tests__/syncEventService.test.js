// server/src/__tests__/syncEventService.test.js
// Unit tests for syncEventService.
//
// Non-DB tests run without any setup.
// DB integration tests require:
//   1. docker-compose up -d cia-postgres
//   2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//   3. DATABASE_URL=postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics npx jest --testPathPattern syncEventService
//   Node 18+ required for jest / vitest.
//
// Run non-DB tests only:
//   npx jest server/src/__tests__/syncEventService.test.js --testNamePattern "^buildSnapshot"

const { buildSnapshot } = require('../services/syncEventService');

describe('buildSnapshot', () => {
  test('strips heavy fields from a row', () => {
    const row = {
      id: 'abc',
      name: 'Test View',
      camera: { position: [0, 0, 5] },
      document_state: Buffer.from('large binary'),
      update_data: 'more binary',
      snapshot_data: 'also heavy',
    };
    const snap = buildSnapshot(row);
    expect(snap.id).toBe('abc');
    expect(snap.name).toBe('Test View');
    expect(snap.camera).toEqual({ position: [0, 0, 5] });
    expect(snap.document_state).toBeUndefined();
    expect(snap.update_data).toBeUndefined();
    expect(snap.snapshot_data).toBeUndefined();
  });

  test('strips custom omit fields', () => {
    const row = { id: '1', secret: 'top-secret', name: 'Foo' };
    const snap = buildSnapshot(row, ['secret']);
    expect(snap.id).toBe('1');
    expect(snap.name).toBe('Foo');
    expect(snap.secret).toBeUndefined();
  });

  test('returns all safe fields when nothing to strip', () => {
    const row = { id: '2', name: 'Bar', revision: 3 };
    expect(buildSnapshot(row)).toEqual({ id: '2', name: 'Bar', revision: 3 });
  });
});

// ============================================================================
// writeSyncEvent integration test template (requires live DB)
// ============================================================================
// These tests are marked .skip to avoid requiring a running database.
// To run: start PostgreSQL, apply migrations, remove .skip.

describe('writeSyncEvent (integration — requires DB)', () => {
  const { writeSyncEvent } = require('../services/syncEventService');

  test.skip('inserts a row and returns id', async () => {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await writeSyncEvent(client, {
        workspaceId: null,
        entityType: 'view_configuration',
        entityId: '00000000-0000-0000-0000-000000000099',
        operation: 'update',
        baseRevision: 1,
        nextRevision: 2,
        snapshot: { name: 'test' },
        actorUserId: null,
      });
      expect(typeof result.id).toBe('bigint');
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await pool.end();
    }
  });

  // This test does NOT require a DB: writeSyncEvent validates inputs before any query.
  test('rejects missing required fields (no DB needed)', async () => {
    await expect(writeSyncEvent({}, {})).rejects.toThrow('required');
  });
});
