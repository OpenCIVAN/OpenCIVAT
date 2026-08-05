// server/src/__tests__/annotations-broadcast.test.js
// Unit tests for resolveBroadcastProjects in server/src/routes/annotations.js (no DB required)

'use strict';

const { resolveBroadcastProjects } = require('../routes/annotations');

describe('resolveBroadcastProjects', () => {
  test('body projectId only, empty file_project_access table', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const result = await resolveBroadcastProjects(pool, 'file-1', 'project-body');
    expect(result).toEqual(new Set(['project-body']));
  });

  test('no body projectId, table returns two rows', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ project_id: 'project-a' }, { project_id: 'project-b' }],
      }),
    };
    const result = await resolveBroadcastProjects(pool, 'file-1', null);
    expect(result).toEqual(new Set(['project-a', 'project-b']));
  });

  test('body projectId also appears in table — deduped to size 1', async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ project_id: 'project-x' }] }),
    };
    const result = await resolveBroadcastProjects(pool, 'file-1', 'project-x');
    expect(result.size).toBe(1);
    expect(result).toEqual(new Set(['project-x']));
  });

  test('no body projectId, empty table — empty Set', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const result = await resolveBroadcastProjects(pool, 'file-1', null);
    expect(result.size).toBe(0);
  });

  test('pool.query rejects — falls back to body projectId, does not throw', async () => {
    const pool = { query: jest.fn().mockRejectedValue(new Error('db down')) };
    await expect(
      resolveBroadcastProjects(pool, 'file-1', 'project-body')
    ).resolves.toEqual(new Set(['project-body']));
  });
});
