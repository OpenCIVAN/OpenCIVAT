// server/src/__tests__/effective-permissions.test.js
// Unit tests for getEffectivePermissions() — JSONB permission overrides.
// No database required — pool is mocked.

'use strict';

const { PERMISSIONS, getEffectivePermissions } = require('../utils/permissions');

// ============================================================================
// HELPERS
// ============================================================================

function makePool(role = 'member', jsonb = {}) {
  return {
    query: jest.fn().mockResolvedValue({
      rows: [{ role, permissions: jsonb }],
    }),
  };
}

function makeEmptyPool() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  };
}

const PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID    = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// TESTS
// ============================================================================

describe('getEffectivePermissions()', () => {
  // ── Role-only (no JSONB) ──────────────────────────────────────────────────

  test('member role grants annotation:create', async () => {
    const pool = makePool('member', {});
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });

  test('viewer role does NOT grant annotation:create', async () => {
    const pool = makePool('viewer', {});
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(false);
  });

  test('admin role grants breakout:merge', async () => {
    const pool = makePool('admin', {});
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.BREAKOUT_MERGE)).toBe(true);
  });

  // ── JSONB grant ───────────────────────────────────────────────────────────

  test('JSONB grant adds a permission viewer does not normally have', async () => {
    const pool = makePool('viewer', { grant: ['annotation:create'] });
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });

  test('JSONB grant with full permission name (annotation:create)', async () => {
    const pool = makePool('viewer', { grant: ['annotation:create'] });
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has('annotation:create')).toBe(true);
  });

  // ── JSONB deny ────────────────────────────────────────────────────────────

  test('JSONB deny removes a permission the role normally has', async () => {
    // admin normally has dataset:upload — deny it
    const pool = makePool('admin', { deny: ['dataset:upload'] });
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.DATASET_UPLOAD)).toBe(false);
  });

  test('JSONB deny on permission not in role set is harmless', async () => {
    // viewer doesn't have annotation:create; denying it is a no-op
    const pool = makePool('viewer', { deny: ['annotation:create'] });
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(false);
  });

  // ── Unknown JSONB keys ────────────────────────────────────────────────────

  test('unknown permission key in grant is ignored safely', async () => {
    const pool = makePool('viewer', { grant: ['nonexistent:action', 'workspace:read'] });
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.has('nonexistent:action')).toBe(false);
    expect(perms.has(PERMISSIONS.WORKSPACE_READ)).toBe(true);
  });

  test('unknown keys in JSONB object are ignored', async () => {
    const pool = makePool('member', { grant: [], deny: [], foo: 'bar' });
    // Should not throw
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms instanceof Set).toBe(true);
  });

  // ── Non-member / edge cases ───────────────────────────────────────────────

  test('non-member returns empty Set', async () => {
    const pool = makeEmptyPool();
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    expect(perms.size).toBe(0);
  });

  test('null userId returns viewer-level permissions', async () => {
    const pool = makePool('viewer', {});
    const perms = await getEffectivePermissions(pool, PROJECT_ID, null);
    // Hits the guard: returns _VIEWER_PERMS copy without querying
    expect(perms.has(PERMISSIONS.WORKSPACE_READ)).toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('null projectId returns viewer-level permissions', async () => {
    const pool = makePool('member', {});
    const perms = await getEffectivePermissions(pool, null, USER_ID);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('null jsonb field is handled gracefully', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [{ role: 'member', permissions: null }] }) };
    const perms = await getEffectivePermissions(pool, PROJECT_ID, USER_ID);
    // null jsonb → no overrides; base member permissions apply
    expect(perms.has(PERMISSIONS.ANNOTATION_CREATE)).toBe(true);
  });
});
