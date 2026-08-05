// server/src/__tests__/checkProjectAccess.test.js
// Unit tests for checkProjectAccess (server/src/middleware/auth.js).
// No database required — pool.query is mocked.
//
// Regression coverage for the public-project bypass bug: a public project
// with no project_members row for the caller must return a truthy 'viewer'
// role, not null, or every route gating on checkProjectAccess incorrectly
// rejects non-members from projects that are supposed to be open to them.

'use strict';

const { checkProjectAccess } = require('../middleware/auth');

function mockPool(rows) {
  return { query: jest.fn().mockResolvedValue({ rows }) };
}

describe('checkProjectAccess', () => {
  test('private project, explicit member → returns the member role', async () => {
    const pool = mockPool([{ visibility: 'private', role: 'admin' }]);
    await expect(checkProjectAccess(pool, 'proj-1', 'user-1')).resolves.toBe('admin');
  });

  test('private project, non-member → returns null (WHERE excludes the row)', async () => {
    const pool = mockPool([]);
    await expect(checkProjectAccess(pool, 'proj-1', 'user-1')).resolves.toBeNull();
  });

  test('public project, explicit member → returns the member role, not the public fallback', async () => {
    const pool = mockPool([{ visibility: 'public', role: 'editor' }]);
    await expect(checkProjectAccess(pool, 'proj-1', 'user-1')).resolves.toBe('editor');
  });

  test('public project, non-member → returns "viewer" instead of null', async () => {
    const pool = mockPool([{ visibility: 'public', role: null }]);
    await expect(checkProjectAccess(pool, 'proj-1', 'user-1')).resolves.toBe('viewer');
  });

  test('project does not exist → returns null', async () => {
    const pool = mockPool([]);
    await expect(checkProjectAccess(pool, 'missing-proj', 'user-1')).resolves.toBeNull();
  });
});
