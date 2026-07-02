// server/src/utils/jsonDiff.js
// Minimal flat JSON diff for sync_events patch computation.
// CommonJS — server uses require(), not ESM import.
//
// Computes a flat diff (top-level keys only) in RFC 6902 style.
// Nested objects that differ are represented as a single 'replace' op on the
// parent key — this is safe and avoids complex recursive diff logic.
//
// Used by route handlers to populate sync_events.patch for OCC updates.
// Clients that receive a patch apply it on top of their current local state.

'use strict';

/**
 * Compute a flat JSON Patch (add/remove/replace) from `base` to `next`.
 *
 * @param {object} base  Snapshot before mutation (snake_case server format).
 * @param {object} next  Snapshot after mutation (snake_case server format).
 * @returns {{ op: string, path: string, value?: unknown }[]}
 */
function diffObjects(base, next) {
  if (!base || !next) {
    return [{ op: 'replace', path: '/', value: next }];
  }

  const ops = [];
  const baseKeys = new Set(Object.keys(base));
  const nextKeys = new Set(Object.keys(next));

  for (const key of baseKeys) {
    if (!nextKeys.has(key)) {
      ops.push({ op: 'remove', path: `/${key}` });
    }
  }

  for (const key of nextKeys) {
    const path = `/${key}`;
    if (!baseKeys.has(key)) {
      ops.push({ op: 'add', path, value: next[key] });
    } else {
      // Use JSON serialisation for deep equality (handles nested objects and arrays)
      if (JSON.stringify(base[key]) !== JSON.stringify(next[key])) {
        ops.push({ op: 'replace', path, value: next[key] });
      }
    }
  }

  return ops;
}

module.exports = { diffObjects };
