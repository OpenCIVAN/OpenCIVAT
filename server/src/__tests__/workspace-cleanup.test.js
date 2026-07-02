// server/src/__tests__/workspace-cleanup.test.js
// Unit tests for workspaceCleanupService.
// No database required — pool is mocked.

'use strict';

// Set env before requiring the module so config constants are evaluated correctly
const originalEnabled = process.env.WORKSPACE_CLEANUP_ENABLED;
beforeAll(() => { process.env.WORKSPACE_CLEANUP_ENABLED = 'false'; });
afterAll(() => {
  if (originalEnabled === undefined) delete process.env.WORKSPACE_CLEANUP_ENABLED;
  else process.env.WORKSPACE_CLEANUP_ENABLED = originalEnabled;
});

const { archiveExpiredWorkspaces, startCleanupSchedule } = require('../services/workspaceCleanupService');

// ============================================================================
// HELPERS
// ============================================================================

function makePool(returnedRows = []) {
  return {
    query: jest.fn().mockResolvedValue({ rows: returnedRows, rowCount: returnedRows.length }),
  };
}

// ============================================================================
// archiveExpiredWorkspaces()
// ============================================================================

describe('archiveExpiredWorkspaces()', () => {
  test('returns empty array when no expired workspaces', async () => {
    const pool = makePool([]);
    const result = await archiveExpiredWorkspaces(pool);
    expect(result).toEqual([]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('returns archived workspace rows', async () => {
    const rows = [
      { id: 'ws-1', name: 'Breakout A', project_id: 'proj-1' },
      { id: 'ws-2', name: 'Breakout B', project_id: 'proj-1' },
    ];
    const pool = makePool(rows);
    const result = await archiveExpiredWorkspaces(pool);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('ws-1');
  });

  test('SQL targets only breakout type with expires_at < NOW()', async () => {
    const pool = makePool([]);
    await archiveExpiredWorkspaces(pool);

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/type\s*=\s*'breakout'/);
    expect(sql).toMatch(/expires_at\s*<\s*NOW\(\)/);
    expect(sql).toMatch(/is_archived\s*=\s*false/);
    // Must NOT target personal or project types
    expect(sql).not.toMatch(/type\s*=\s*'personal'/);
    expect(sql).not.toMatch(/type\s*=\s*'project'/);
  });

  test('respects custom batchSize', async () => {
    const pool = makePool([]);
    await archiveExpiredWorkspaces(pool, { batchSize: 7 });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe(7);
  });

  test('uses is_archived=true for soft-delete (no hard DELETE)', async () => {
    const pool = makePool([]);
    await archiveExpiredWorkspaces(pool);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/is_archived\s*=\s*true/);
    expect(sql).not.toMatch(/DELETE FROM workspaces/i);
  });

  test('propagates DB errors', async () => {
    const pool = { query: jest.fn().mockRejectedValue(new Error('DB down')) };
    await expect(archiveExpiredWorkspaces(pool)).rejects.toThrow('DB down');
  });
});

// ============================================================================
// startCleanupSchedule()
// ============================================================================

describe('startCleanupSchedule()', () => {
  test('returns null when WORKSPACE_CLEANUP_ENABLED is not true', () => {
    process.env.WORKSPACE_CLEANUP_ENABLED = 'false';
    // Need to re-read the module's CLEANUP_ENABLED constant
    // The function checks the env at require time, so we test the exported constant
    const { CLEANUP_ENABLED } = require('../services/workspaceCleanupService');
    expect(CLEANUP_ENABLED).toBe(false);
    const handle = startCleanupSchedule(makePool([]));
    expect(handle).toBeNull();
  });

  test('does not call pool.query when disabled', () => {
    process.env.WORKSPACE_CLEANUP_ENABLED = 'false';
    const pool = makePool([]);
    startCleanupSchedule(pool);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
