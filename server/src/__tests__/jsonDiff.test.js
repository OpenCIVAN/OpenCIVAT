// server/src/__tests__/jsonDiff.test.js
// Unit tests for server/src/utils/jsonDiff.js (no DB required)

'use strict';

const { diffObjects } = require('../utils/jsonDiff');

describe('diffObjects', () => {
  test('returns empty array for identical objects', () => {
    expect(diffObjects({ a: 1 }, { a: 1 })).toEqual([]);
  });

  test('detects added key', () => {
    const ops = diffObjects({}, { a: 1 });
    expect(ops).toContainEqual({ op: 'add', path: '/a', value: 1 });
  });

  test('detects removed key', () => {
    const ops = diffObjects({ a: 1 }, {});
    expect(ops).toContainEqual({ op: 'remove', path: '/a' });
  });

  test('detects replaced value', () => {
    const ops = diffObjects({ a: 1 }, { a: 2 });
    expect(ops).toContainEqual({ op: 'replace', path: '/a', value: 2 });
  });

  test('treats nested object as atomic replace (flat diff)', () => {
    const ops = diffObjects({ camera: { fov: 60 } }, { camera: { fov: 90 } });
    expect(ops).toContainEqual({ op: 'replace', path: '/camera', value: { fov: 90 } });
  });

  test('returns full replace for null base', () => {
    const ops = diffObjects(null, { a: 1 });
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('replace');
  });

  test('returns full replace for null next', () => {
    const ops = diffObjects({ a: 1 }, null);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('replace');
  });

  test('handles array values as atomic', () => {
    const ops = diffObjects({ arr: [1, 2] }, { arr: [1, 2, 3] });
    expect(ops).toContainEqual({ op: 'replace', path: '/arr', value: [1, 2, 3] });
  });

  test('no ops when nested objects are deep-equal', () => {
    const ops = diffObjects(
      { camera: { fov: 60, pos: [0, 0, 5] } },
      { camera: { fov: 60, pos: [0, 0, 5] } }
    );
    expect(ops).toEqual([]);
  });

  test('detects change in deeply nested field as parent replace', () => {
    const ops = diffObjects(
      { filters: [{ id: 1, active: true }] },
      { filters: [{ id: 1, active: false }] }
    );
    expect(ops.some(o => o.op === 'replace' && o.path === '/filters')).toBe(true);
  });
});
