// src/utils/__tests__/conflictStrategies.test.js
import { describe, test, expect } from 'vitest';
import {
  CONFLICT_STRATEGIES,
  ANNOTATION_SAFE_MERGE_FIELDS,
  VIEWGROUP_SAFE_MERGE_FIELDS,
  WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS,
} from '../conflictStrategies.js';

// ============================================================================
// CONFLICT_STRATEGIES structure
// ============================================================================

describe('CONFLICT_STRATEGIES — structure', () => {
  test('defines all four entity types', () => {
    expect(CONFLICT_STRATEGIES).toHaveProperty('view_configuration');
    expect(CONFLICT_STRATEGIES).toHaveProperty('annotation');
    expect(CONFLICT_STRATEGIES).toHaveProperty('viewgroup');
    expect(CONFLICT_STRATEGIES).toHaveProperty('workspace_annotation');
  });

  test.each(['view_configuration', 'annotation', 'viewgroup', 'workspace_annotation'])(
    '%s has required fields',
    (entityType) => {
      const s = CONFLICT_STRATEGIES[entityType];
      expect(typeof s.displayName).toBe('string');
      expect(typeof s.entityLabel).toBe('string');
      expect(typeof s.supportsDuplication).toBe('boolean');
      expect(s.safeFields).toBeInstanceOf(Set);
      expect(typeof s.resolverId).toBe('string');
      expect(typeof s.mergeWarning).toBe('string');
    }
  );
});

describe('CONFLICT_STRATEGIES — resolverId', () => {
  test('view_configuration resolves via viewConfigurationManager', () => {
    expect(CONFLICT_STRATEGIES.view_configuration.resolverId).toBe('viewConfigurationManager');
  });

  test('annotation resolves via annotationManager', () => {
    expect(CONFLICT_STRATEGIES.annotation.resolverId).toBe('annotationManager');
  });

  test('viewgroup resolves via viewGroupManager', () => {
    expect(CONFLICT_STRATEGIES.viewgroup.resolverId).toBe('viewGroupManager');
  });

  test('workspace_annotation resolves via workspaceAnnotationManager', () => {
    expect(CONFLICT_STRATEGIES.workspace_annotation.resolverId).toBe('workspaceAnnotationManager');
  });
});

describe('CONFLICT_STRATEGIES — supportsDuplication', () => {
  test('view_configuration supports duplication', () => {
    expect(CONFLICT_STRATEGIES.view_configuration.supportsDuplication).toBe(true);
  });

  test('annotation does NOT support duplication', () => {
    expect(CONFLICT_STRATEGIES.annotation.supportsDuplication).toBe(false);
  });

  test('viewgroup does NOT support duplication', () => {
    expect(CONFLICT_STRATEGIES.viewgroup.supportsDuplication).toBe(false);
  });

  test('annotation has a duplicationUnsupportedReason explaining why', () => {
    expect(CONFLICT_STRATEGIES.annotation.duplicationUnsupportedReason).toBeTruthy();
    expect(typeof CONFLICT_STRATEGIES.annotation.duplicationUnsupportedReason).toBe('string');
  });

  test('viewgroup has a duplicationUnsupportedReason', () => {
    expect(CONFLICT_STRATEGIES.viewgroup.duplicationUnsupportedReason).toBeTruthy();
  });

  test('workspace_annotation does NOT support duplication', () => {
    expect(CONFLICT_STRATEGIES.workspace_annotation.supportsDuplication).toBe(false);
  });

  test('workspace_annotation has a duplicationUnsupportedReason', () => {
    expect(CONFLICT_STRATEGIES.workspace_annotation.duplicationUnsupportedReason).toBeTruthy();
  });
});

// ============================================================================
// ANNOTATION_SAFE_MERGE_FIELDS — conservative whitelist
// ============================================================================

describe('ANNOTATION_SAFE_MERGE_FIELDS — whitelist', () => {
  test('contains visibility', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS.has('visibility')).toBe(true);
  });

  test('does NOT include text (analytical meaning)', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS.has('text')).toBe(false);
  });

  test('does NOT include content (analytical meaning)', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS.has('content')).toBe(false);
  });

  test('does NOT include position (geometry)', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS.has('position')).toBe(false);
  });

  test('does NOT include normal (geometry)', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS.has('normal')).toBe(false);
  });

  test('is a Set instance', () => {
    expect(ANNOTATION_SAFE_MERGE_FIELDS).toBeInstanceOf(Set);
  });
});

// ============================================================================
// VIEWGROUP_SAFE_MERGE_FIELDS — conservative whitelist
// ============================================================================

describe('VIEWGROUP_SAFE_MERGE_FIELDS — whitelist', () => {
  test('contains name', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('name')).toBe(true);
  });

  test('contains color', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('color')).toBe(true);
  });

  test('does NOT include slots (layout-affecting)', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('slots')).toBe(false);
  });

  test('does NOT include canvas_position (layout-affecting)', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('canvas_position')).toBe(false);
  });

  test('does NOT include layout_id (layout-affecting)', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('layout_id')).toBe(false);
  });

  test('does NOT include visibility (membership-affecting)', () => {
    expect(VIEWGROUP_SAFE_MERGE_FIELDS.has('visibility')).toBe(false);
  });
});

// ============================================================================
// WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS — conservative whitelist
// ============================================================================

describe("WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS — whitelist", () => {
  test("contains visibility", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("visibility")).toBe(true);
  });

  test("contains z_index", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("z_index")).toBe(true);
  });

  test("does NOT include text_content (content-affecting)", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("text_content")).toBe(false);
  });

  test("does NOT include path_data (geometry)", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("path_data")).toBe(false);
  });

  test("does NOT include screen_coordinates (position)", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("screen_coordinates")).toBe(false);
  });

  test("does NOT include linked_datasets", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("linked_datasets")).toBe(false);
  });

  test("does NOT include label", () => {
    expect(WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS.has("label")).toBe(false);
  });
});
