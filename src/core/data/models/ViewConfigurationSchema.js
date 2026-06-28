// src/core/data/models/ViewConfigurationSchema.js
// DR2: Pure schema normalization and validation for ViewConfiguration.
//
// LAYER BOUNDARY: This module is pure (no side effects, no React, no managers).
// It may be imported by any layer without creating circular dependencies.

export const SCHEMA_VERSION = 1;

/**
 * Normalize a raw ViewConfiguration-shaped object into the current schema.
 *
 * Safe to call with untrusted or legacy data. Does not throw.
 * Returns a shallow copy with all DR2 fields defaulted.
 *
 * Migration handled:
 *   - Missing schemaVersion → 1
 *   - Legacy datasetId with no datasetRefs → synthesize one-entry datasetRefs
 *   - Missing time / composition / compatibility / renderMode → safe defaults
 *
 * @param {object} raw - Raw config object (from server, IndexedDB, or memory)
 * @returns {object} Normalized copy (same reference if already current)
 */
export function normalizeViewConfiguration(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const out = { ...raw };

  out.schemaVersion = raw.schemaVersion ?? SCHEMA_VERSION;
  out.renderMode    = raw.renderMode    ?? 'auto';
  out.composition   = raw.composition   ?? [];
  out.compatibility = raw.compatibility ?? {};
  out.time          = raw.time          ?? null;

  // Migrate legacy single datasetId → datasetRefs array
  if (!Array.isArray(out.datasetRefs) || out.datasetRefs.length === 0) {
    out.datasetRefs = raw.datasetId
      ? [migrateDatasetIdToRef(raw.datasetId)]
      : [];
  }

  return out;
}

/**
 * Validate critical field integrity of a (potentially normalized) config.
 *
 * Distinguishes:
 *   errors   — invalid critical references that would prevent safe reconstruction
 *   warnings — schema mismatches or unknown values that may degrade behavior
 *
 * Does NOT validate ephemeral runtime state (presence, activeInstanceCount, etc.).
 *
 * @param {object} config - Config object to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateViewConfiguration(config) {
  const errors   = [];
  const warnings = [];

  if (!config?.id) {
    errors.push('id is required');
  }

  for (const ref of (config?.datasetRefs ?? [])) {
    if (!ref.datasetId) {
      errors.push('datasetRefs entry missing datasetId');
    }
  }

  if (
    typeof config?.schemaVersion === 'number' &&
    config.schemaVersion > SCHEMA_VERSION
  ) {
    warnings.push(
      `schemaVersion ${config.schemaVersion} exceeds current ${SCHEMA_VERSION} — ` +
      'this client may not support all features'
    );
  }

  const validRenderModes = ['local', 'remote', 'auto'];
  if (
    config?.renderMode &&
    !validRenderModes.includes(config.renderMode)
  ) {
    warnings.push(`unknown renderMode: "${config.renderMode}" — expected one of: ${validRenderModes.join(', ')}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Build a minimal datasetRef entry from a bare datasetId.
 * Used when migrating configs that only have datasetId.
 *
 * @param {string} datasetId
 * @returns {{ datasetId: string, contentHash: null, format: null, sizeBytes: null, role: 'primary' }}
 */
export function migrateDatasetIdToRef(datasetId) {
  return {
    datasetId,
    contentHash: null,
    format:      null,
    sizeBytes:   null,
    role:        'primary',
  };
}
