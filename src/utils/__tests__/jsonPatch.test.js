// src/utils/__tests__/jsonPatch.test.js
import { describe, test, expect } from 'vitest';
import { diff, patch, canAutoMerge, merge, canAutoMergeSafe, VIEW_SAFE_MERGE_FIELDS } from '../jsonPatch.js';

// ============================================================================
// diff
// ============================================================================

describe('diff', () => {
  test('returns empty array for identical objects', () => {
    expect(diff({ a: 1 }, { a: 1 })).toEqual([]);
  });

  test('detects added key', () => {
    const ops = diff({}, { a: 1 });
    expect(ops).toContainEqual({ op: 'add', path: '/a', value: 1 });
  });

  test('detects removed key', () => {
    const ops = diff({ a: 1 }, {});
    expect(ops).toContainEqual({ op: 'remove', path: '/a' });
  });

  test('detects replaced value', () => {
    const ops = diff({ a: 1 }, { a: 2 });
    expect(ops).toContainEqual({ op: 'replace', path: '/a', value: 2 });
  });

  test('recurses into nested objects', () => {
    const ops = diff({ camera: { fov: 60 } }, { camera: { fov: 90 } });
    expect(ops).toContainEqual({ op: 'replace', path: '/camera/fov', value: 90 });
  });

  test('treats arrays atomically (replace, not element diff)', () => {
    const ops = diff({ arr: [1, 2] }, { arr: [1, 2, 3] });
    expect(ops.some((o) => o.op === 'replace' && o.path === '/arr')).toBe(true);
  });

  test('handles null values', () => {
    const ops = diff({ a: null }, { a: 5 });
    expect(ops).toContainEqual({ op: 'replace', path: '/a', value: 5 });
  });
});

// ============================================================================
// patch
// ============================================================================

describe('patch', () => {
  test('applies add operation', () => {
    const result = patch({}, [{ op: 'add', path: '/x', value: 42 }]);
    expect(result.x).toBe(42);
  });

  test('applies replace operation', () => {
    const result = patch({ x: 1 }, [{ op: 'replace', path: '/x', value: 99 }]);
    expect(result.x).toBe(99);
  });

  test('applies remove operation', () => {
    const result = patch({ x: 1, y: 2 }, [{ op: 'remove', path: '/x' }]);
    expect(result.x).toBeUndefined();
    expect(result.y).toBe(2);
  });

  test('does not mutate the original object', () => {
    const original = { a: 1 };
    patch(original, [{ op: 'replace', path: '/a', value: 2 }]);
    expect(original.a).toBe(1);
  });

  test('applies nested path', () => {
    const result = patch({ cam: { fov: 60 } }, [
      { op: 'replace', path: '/cam/fov', value: 90 },
    ]);
    expect(result.cam.fov).toBe(90);
  });
});

// ============================================================================
// canAutoMerge
// ============================================================================

describe('canAutoMerge', () => {
  test('returns true for disjoint patches', () => {
    const pA = [{ op: 'replace', path: '/camera', value: {} }];
    const pB = [{ op: 'replace', path: '/filters', value: [] }];
    expect(canAutoMerge(pA, pB)).toBe(true);
  });

  test('returns false for overlapping patches', () => {
    const pA = [{ op: 'replace', path: '/camera/fov', value: 90 }];
    const pB = [{ op: 'replace', path: '/camera/position', value: [0, 0, 5] }];
    // both touch '/camera' at top level
    expect(canAutoMerge(pA, pB)).toBe(false);
  });

  test('returns true for empty patches', () => {
    expect(canAutoMerge([], [])).toBe(true);
  });
});

// ============================================================================
// merge
// ============================================================================

describe('merge', () => {
  test('merges disjoint patches', () => {
    const base = { camera: { fov: 60 }, filters: [] };
    const pA = [{ op: 'replace', path: '/camera/fov', value: 90 }];
    // pA touches /camera; pB touches /filters — but at top level both different
    const pB = [{ op: 'add', path: '/filters', value: [{ id: 1 }] }];

    // canAutoMerge should be true here
    expect(canAutoMerge(pA, pB)).toBe(true);
    const result = merge(base, pA, pB);
    expect(result.camera.fov).toBe(90);
    expect(result.filters).toEqual([{ id: 1 }]);
  });

  test('throws when patches overlap', () => {
    const pA = [{ op: 'replace', path: '/camera', value: 'a' }];
    const pB = [{ op: 'replace', path: '/camera', value: 'b' }];
    expect(() => merge({}, pA, pB)).toThrow('Cannot auto-merge');
  });
});

// ============================================================================
// canAutoMergeSafe — semantic whitelist check
// ============================================================================

describe('canAutoMergeSafe', () => {
  test('returns true when paths disjoint AND all paths in whitelist', () => {
    // camera and annotations_visible are both in VIEW_SAFE_MERGE_FIELDS
    const pA = [{ op: 'replace', path: '/camera', value: {} }];
    const pB = [{ op: 'replace', path: '/annotations_visible', value: true }];
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(true);
  });

  test('returns false when paths overlap (even if both in whitelist)', () => {
    const pA = [{ op: 'replace', path: '/camera/fov', value: 90 }];
    const pB = [{ op: 'replace', path: '/camera/position', value: [0, 0, 1] }];
    // Both touch /camera at top level → overlap
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });

  test('returns false when a path is NOT in the whitelist (even if disjoint)', () => {
    // filters is NOT in VIEW_SAFE_MERGE_FIELDS (dependent on color_maps, render pipeline)
    const pA = [{ op: 'replace', path: '/camera', value: {} }];
    const pB = [{ op: 'replace', path: '/filters', value: [] }];
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });

  test('returns false when widgets changed (not in whitelist)', () => {
    const pA = [{ op: 'replace', path: '/name', value: 'New Name' }];
    const pB = [{ op: 'replace', path: '/widgets', value: [] }];
    // name is safe, widgets is NOT → overall unsafe
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });

  test('returns false when links changed (not in whitelist)', () => {
    const pA = [{ op: 'replace', path: '/camera', value: {} }];
    const pB = [{ op: 'replace', path: '/links', value: {} }];
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });

  test('returns false when color_maps changed (semantically dependent)', () => {
    const pA = [{ op: 'replace', path: '/camera', value: {} }];
    const pB = [{ op: 'replace', path: '/color_maps', value: null }];
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });

  test('returns true for empty patches (nothing changed on either side)', () => {
    expect(canAutoMergeSafe([], [], VIEW_SAFE_MERGE_FIELDS)).toBe(true);
  });

  test('returns false when same safe field changed on both sides', () => {
    // Both changed camera → overlap
    const pA = [{ op: 'replace', path: '/camera', value: { fov: 90 } }];
    const pB = [{ op: 'replace', path: '/camera', value: { fov: 45 } }];
    expect(canAutoMergeSafe(pA, pB, VIEW_SAFE_MERGE_FIELDS)).toBe(false);
  });
});

// ============================================================================
// VIEW_SAFE_MERGE_FIELDS — structure check
// ============================================================================

describe('VIEW_SAFE_MERGE_FIELDS', () => {
  test('includes camera', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('camera')).toBe(true);
  });

  test('does NOT include filters', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('filters')).toBe(false);
  });

  test('does NOT include widgets', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('widgets')).toBe(false);
  });

  test('does NOT include color_maps', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('color_maps')).toBe(false);
  });

  test('does NOT include links', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('links')).toBe(false);
  });

  test('does NOT include snapshots', () => {
    expect(VIEW_SAFE_MERGE_FIELDS.has('snapshots')).toBe(false);
  });
});
