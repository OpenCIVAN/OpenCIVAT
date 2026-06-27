// src/utils/jsonPatch.js
// Minimal JSON Patch utilities (RFC 6902 subset: add / remove / replace).
// Pure functions, no external dependencies.
//
// Limitations (intentional):
//   - Shallow-only by default; nested paths use "/" separator.
//   - No support for "move", "copy", or "test" operations.
//   - Array element diffing is not position-aware; arrays are treated as atomic.

/**
 * Compute the patch (list of operations) needed to transform `base` into `next`.
 * Only enumerable own properties are considered.
 *
 * @param {object} base
 * @param {object} next
 * @param {string} [prefix=""] Internal use for recursive calls.
 * @returns {{ op: string, path: string, value?: unknown }[]}
 */
export function diff(base, next, prefix = "") {
  if (base === next) return [];
  if (
    base === null || next === null ||
    typeof base !== "object" || typeof next !== "object" ||
    Array.isArray(base) !== Array.isArray(next)
  ) {
    return [{ op: "replace", path: prefix || "/", value: next }];
  }

  const ops = [];
  const baseKeys = new Set(Object.keys(base));
  const nextKeys = new Set(Object.keys(next));

  // Removed keys
  for (const key of baseKeys) {
    if (!nextKeys.has(key)) {
      ops.push({ op: "remove", path: `${prefix}/${key}` });
    }
  }

  for (const key of nextKeys) {
    const path = `${prefix}/${key}`;
    if (!baseKeys.has(key)) {
      // Added key
      ops.push({ op: "add", path, value: next[key] });
    } else {
      const bv = base[key];
      const nv = next[key];
      if (bv === nv) continue;

      if (
        bv !== null && nv !== null &&
        typeof bv === "object" && typeof nv === "object" &&
        !Array.isArray(bv) && !Array.isArray(nv)
      ) {
        // Recurse into nested objects
        ops.push(...diff(bv, nv, path));
      } else {
        ops.push({ op: "replace", path, value: nv });
      }
    }
  }

  return ops;
}

/**
 * Apply a list of JSON Patch operations to `obj`, returning a new object.
 * The original `obj` is not mutated.
 *
 * @param {object} obj
 * @param {{ op: string, path: string, value?: unknown }[]} ops
 * @returns {object}
 */
export function patch(obj, ops) {
  let result = JSON.parse(JSON.stringify(obj));

  for (const { op, path, value } of ops) {
    const segments = path.split("/").slice(1); // strip leading ""
    if (segments.length === 0) continue;

    const last = segments[segments.length - 1];
    let target = result;

    for (let i = 0; i < segments.length - 1; i++) {
      if (target == null || typeof target !== "object") break;
      target = target[segments[i]];
    }

    if (target == null || typeof target !== "object") continue;

    if (op === "add" || op === "replace") {
      target[last] = value;
    } else if (op === "remove") {
      delete target[last];
    }
  }

  return result;
}

/**
 * Extract the top-level path segments touched by a patch.
 * e.g. "/camera/position" → "camera"
 *
 * @param {{ path: string }[]} ops
 * @returns {Set<string>}
 */
export function topLevelPaths(ops) {
  return new Set(ops.map((o) => o.path.split("/")[1]).filter(Boolean));
}

/**
 * Return true if patchA and patchB touch no overlapping paths.
 * When true, merging them is safe without manual conflict resolution.
 *
 * @param {{ path: string }[]} patchA
 * @param {{ path: string }[]} patchB
 * @returns {boolean}
 */
export function canAutoMerge(patchA, patchB) {
  const pathsA = topLevelPaths(patchA);
  const pathsB = topLevelPaths(patchB);
  for (const p of pathsA) {
    if (pathsB.has(p)) return false;
  }
  return true;
}

/**
 * Merge two patches applied to the same base object.
 * Only call this when `canAutoMerge(patchA, patchB)` is true.
 *
 * @param {object} base   The common ancestor object.
 * @param {{ op, path, value? }[]} patchA
 * @param {{ op, path, value? }[]} patchB
 * @returns {object} Merged result.
 */
export function merge(base, patchA, patchB) {
  if (!canAutoMerge(patchA, patchB)) {
    throw new Error("Cannot auto-merge: patches overlap on at least one path");
  }
  return patch(patch(base, patchA), patchB);
}

// ============================================================================
// SEMANTIC SAFE-MERGE SUPPORT
// ============================================================================

/**
 * ViewConfiguration fields that are safe to auto-merge because they control
 * independent rendering parameters with no shared render pipeline.
 *
 * Fields NOT in this set (filters, widgets, color_maps, links, snapshots,
 * applied_presets, dataset_id, file_version_id, composition, time, etc.) are
 * treated as potentially dependent and always require explicit user resolution.
 *
 * This is a conservative whitelist.  Add a field only when you are certain it
 * cannot affect the same rendered output path as any other field.
 */
export const VIEW_SAFE_MERGE_FIELDS = new Set([
  "camera",               // camera position/orientation — independent of data
  "cursor_config",        // cursor display settings — purely cosmetic
  "annotation_display",   // annotation visibility settings — purely cosmetic
  "annotations_visible",  // global annotation toggle
  "active_instance_count", // usage tracking metadata
  "last_active_timestamp", // timing metadata
  "broadcast",            // broadcast state flags
  "name",                 // display name
  "description",          // free-text description
  "visibility",           // sharing visibility ('private' / 'project' / 'public')
]);

/**
 * Conservative safe-merge check.
 *
 * Returns true only when ALL of the following conditions hold:
 *   1. patchA and patchB touch no overlapping top-level paths (path-disjoint), AND
 *   2. every top-level path changed by either patch is listed in `safeFields`.
 *
 * Use this instead of bare `canAutoMerge` to prevent accidental auto-merges on
 * semantically dependent fields like `filters` and `color_maps`.
 *
 * @param {{ path: string }[]} patchA
 * @param {{ path: string }[]} patchB
 * @param {Set<string>}        safeFields  e.g. VIEW_SAFE_MERGE_FIELDS
 * @returns {boolean}
 */
export function canAutoMergeSafe(patchA, patchB, safeFields) {
  // Structural check: no overlapping paths
  if (!canAutoMerge(patchA, patchB)) return false;
  // Semantic check: every changed path must be whitelisted
  const allPaths = [...topLevelPaths(patchA), ...topLevelPaths(patchB)];
  return allPaths.every((p) => safeFields.has(p));
}
