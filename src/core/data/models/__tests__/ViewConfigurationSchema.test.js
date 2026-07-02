// src/core/data/models/__tests__/ViewConfigurationSchema.test.js
// DR2: Unit tests for ViewConfigurationSchema pure functions.
// No mocks needed — the module has no external dependencies.

import { describe, test, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  normalizeViewConfiguration,
  validateViewConfiguration,
  migrateDatasetIdToRef,
} from '@Core/data/models/ViewConfigurationSchema.js';

// ─── normalizeViewConfiguration ───────────────────────────────────────────────

describe('normalizeViewConfiguration', () => {
  test('returns input unchanged if null or non-object', () => {
    expect(normalizeViewConfiguration(null)).toBeNull();
    expect(normalizeViewConfiguration(undefined)).toBeUndefined();
    expect(normalizeViewConfiguration(42)).toBe(42);
  });

  test('defaults schemaVersion to SCHEMA_VERSION when absent', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  });

  test('preserves existing schemaVersion', () => {
    const out = normalizeViewConfiguration({ id: 'v1', schemaVersion: 99 });
    expect(out.schemaVersion).toBe(99);
  });

  test('builds datasetRefs from legacy datasetId', () => {
    const out = normalizeViewConfiguration({ id: 'v1', datasetId: 'ds-1' });
    expect(out.datasetRefs).toHaveLength(1);
    expect(out.datasetRefs[0].datasetId).toBe('ds-1');
    expect(out.datasetRefs[0].contentHash).toBeNull();
    expect(out.datasetRefs[0].role).toBe('primary');
  });

  test('leaves datasetRefs empty when no datasetId and no datasetRefs', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.datasetRefs).toEqual([]);
  });

  test('preserves existing datasetRefs without overwriting', () => {
    const refs = [{ datasetId: 'ds-42', contentHash: 'abc', format: 'vtp', sizeBytes: 1000, role: 'primary' }];
    const out = normalizeViewConfiguration({ id: 'v1', datasetId: 'ds-OLD', datasetRefs: refs });
    expect(out.datasetRefs).toEqual(refs);
  });

  test('defaults time to null when absent', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.time).toBeNull();
  });

  test('preserves time object when present', () => {
    const time = { enabled: true, currentStep: 3, totalSteps: 10, playbackMode: 'playing' };
    const out = normalizeViewConfiguration({ id: 'v1', time });
    expect(out.time).toEqual(time);
  });

  test('defaults composition to empty array when absent', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.composition).toEqual([]);
  });

  test('preserves composition array when present', () => {
    const comp = [{ datasetId: 'ds-2', role: 'overlay', visible: true, opacity: 0.5, order: 1 }];
    const out = normalizeViewConfiguration({ id: 'v1', composition: comp });
    expect(out.composition).toEqual(comp);
  });

  test('defaults compatibility to empty object when absent', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.compatibility).toEqual({});
  });

  test('defaults renderMode to "auto" when absent', () => {
    const out = normalizeViewConfiguration({ id: 'v1' });
    expect(out.renderMode).toBe('auto');
  });

  test('preserves renderMode when already set', () => {
    const out = normalizeViewConfiguration({ id: 'v1', renderMode: 'remote' });
    expect(out.renderMode).toBe('remote');
  });

  test('passes unknown extra fields through unchanged', () => {
    const out = normalizeViewConfiguration({ id: 'v1', futureProp: 'hello' });
    expect(out.futureProp).toBe('hello');
  });
});

// ─── validateViewConfiguration ────────────────────────────────────────────────

describe('validateViewConfiguration', () => {
  test('returns valid for a well-formed config', () => {
    const cfg = normalizeViewConfiguration({ id: 'v1', datasetId: 'ds-1' });
    const result = validateViewConfiguration(cfg);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns error when id is missing', () => {
    const result = validateViewConfiguration({ datasetId: 'ds-1' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('id is required'))).toBe(true);
  });

  test('returns error when a datasetRefs entry has no datasetId', () => {
    const result = validateViewConfiguration({
      id: 'v1',
      datasetRefs: [{ contentHash: 'abc', role: 'primary' }], // missing datasetId
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing datasetId'))).toBe(true);
  });

  test('returns warning when schemaVersion exceeds current SCHEMA_VERSION', () => {
    const result = validateViewConfiguration({ id: 'v1', schemaVersion: SCHEMA_VERSION + 1 });
    expect(result.valid).toBe(true); // still valid, just a warning
    expect(result.warnings.some(w => w.includes('exceeds current'))).toBe(true);
  });

  test('does NOT warn when schemaVersion equals current SCHEMA_VERSION', () => {
    const result = validateViewConfiguration({ id: 'v1', schemaVersion: SCHEMA_VERSION });
    expect(result.warnings.filter(w => w.includes('schemaVersion'))).toHaveLength(0);
  });

  test('returns warning for unknown renderMode', () => {
    const result = validateViewConfiguration({ id: 'v1', renderMode: 'turbo' });
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('renderMode'))).toBe(true);
  });

  test('accepts valid renderModes without warning', () => {
    for (const mode of ['local', 'remote', 'auto']) {
      const result = validateViewConfiguration({ id: 'v1', renderMode: mode });
      expect(result.warnings.filter(w => w.includes('renderMode'))).toHaveLength(0);
    }
  });
});

// ─── migrateDatasetIdToRef ────────────────────────────────────────────────────

describe('migrateDatasetIdToRef', () => {
  test('returns correct ref shape', () => {
    const ref = migrateDatasetIdToRef('ds-99');
    expect(ref.datasetId).toBe('ds-99');
    expect(ref.contentHash).toBeNull();
    expect(ref.format).toBeNull();
    expect(ref.sizeBytes).toBeNull();
    expect(ref.role).toBe('primary');
  });
});

// ─── ViewConfiguration round-trip (integration) ───────────────────────────────

describe('ViewConfiguration round-trip with DR2 fields', () => {
  test('toJSON → fromJSON → toJSON is stable', async () => {
    // Dynamic import so this test file has no hard dep on the class constructor
    const { ViewConfiguration } = await import('@Core/data/models/ViewConfiguration.js');

    const view = new ViewConfiguration({
      id:        'round-trip-1',
      datasetId: 'ds-rt',
      name:      'RT Test',
      time:      { enabled: true, currentStep: 2, fps: 10 },
      composition: [{ datasetId: 'ds-overlay', role: 'overlay', visible: false, opacity: 0.3 }],
      compatibility: { requiresWebGL2: true },
      renderMode: 'local',
    });

    const json1 = view.toJSON();
    const restored = ViewConfiguration.fromJSON(json1);
    const json2 = restored.toJSON();

    expect(json2.schemaVersion).toBe(SCHEMA_VERSION);
    expect(json2.datasetRefs).toHaveLength(1);
    expect(json2.datasetRefs[0].datasetId).toBe('ds-rt');
    expect(json2.time).toEqual({ enabled: true, currentStep: 2, fps: 10 });
    expect(json2.composition[0].datasetId).toBe('ds-overlay');
    expect(json2.compatibility.requiresWebGL2).toBe(true);
    expect(json2.renderMode).toBe('local');

    // Stability: second serialization equals first
    expect(json2.schemaVersion).toBe(json1.schemaVersion);
    expect(json2.renderMode).toBe(json1.renderMode);
  });

  test('fromJSON on legacy object (no schemaVersion) adds default schemaVersion', async () => {
    const { ViewConfiguration } = await import('@Core/data/models/ViewConfiguration.js');

    const legacy = {
      id:        'legacy-1',
      datasetId: 'ds-old',
      name:      'Old View',
      camera:    null,
      filters:   [],
      widgets:   [],
      colorMaps: null,
      snapshots: [],
      // no schemaVersion, no datasetRefs, no time, no composition
    };

    const view = ViewConfiguration.fromJSON(legacy);
    expect(view.schemaVersion).toBe(SCHEMA_VERSION);
    expect(view.datasetRefs).toHaveLength(1);
    expect(view.datasetRefs[0].datasetId).toBe('ds-old');
    expect(view.time).toBeNull();
    expect(view.composition).toEqual([]);
    expect(view.renderMode).toBe('auto');
  });
});
