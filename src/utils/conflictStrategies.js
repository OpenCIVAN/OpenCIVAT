// src/utils/conflictStrategies.js
// Per-entity conflict configuration for the generalized ConflictResolutionDialog.
//
// Each entry describes:
//   displayName          — human-readable entity type name (used in dialog title)
//   entityLabel          — singular noun for descriptions ("view", "annotation", …)
//   supportsDuplication  — whether "Save mine as copy" is a safe option
//   safeFields           — Set of top-level field names safe for auto-merge
//   resolverId           — key on window.CIA pointing to the manager with resolve methods
//   mergeWarning         — shown in the merge button tooltip when merge is unavailable
//   duplicationUnsupportedReason — shown when supportsDuplication is false

import { VIEW_SAFE_MERGE_FIELDS } from './jsonPatch.js';

// Re-export for consumers that import safe-merge sets from this module
export { VIEW_SAFE_MERGE_FIELDS };

// ============================================================================
// ANNOTATION safe-merge fields
//
// Only truly independent display metadata qualifies.
// NOT safe: text, content, position, normal — these affect analytical meaning.
// ============================================================================
export const ANNOTATION_SAFE_MERGE_FIELDS = new Set([
  'visibility', // public/private toggle — independent of geometry and content
]);

// ============================================================================
// VIEWGROUP safe-merge fields
//
// Only cosmetic display metadata qualifies.
// NOT safe: slots, canvas_position, layout_id, visibility — layout-affecting.
// ============================================================================
export const VIEWGROUP_SAFE_MERGE_FIELDS = new Set([
  'name',  // display name — independent of layout or membership
  'color', // visual colour chip — independent of layout
]);

// ============================================================================
// WORKSPACE_ANNOTATION safe-merge fields
//
// Only independent display metadata qualifies.
// NOT safe: text_content, label, path_data, screen_coordinates, style,
//           linked_datasets, linked_view_ids, linked_grid_slots, locked
// (all affect what the annotation represents, where it appears, or what it links)
// ============================================================================
export const WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS = new Set([
  'visibility', // public/project/private — independent of content or geometry
  'z_index',    // stacking order — independent of content
]);

// ============================================================================
// CONFLICT_STRATEGIES
//
// Add an entry here whenever a new persistent entity type participates in OCC.
// The ConflictResolutionDialog reads this map keyed by conflict.entityType.
// ============================================================================
export const CONFLICT_STRATEGIES = {
  view_configuration: {
    displayName: 'View Configuration',
    entityLabel: 'view',
    supportsDuplication: true,
    safeFields: VIEW_SAFE_MERGE_FIELDS,
    resolverId: 'viewConfigurationManager',
    mergeWarning: 'Camera and display settings can be safely merged. Layout, filter, and colour-map settings require manual resolution.',
    duplicationUnsupportedReason: null,
  },

  annotation: {
    displayName: 'Annotation',
    entityLabel: 'annotation',
    supportsDuplication: false,
    safeFields: ANNOTATION_SAFE_MERGE_FIELDS,
    resolverId: 'annotationManager',
    mergeWarning: 'Position, text, and content changes affect analytical meaning and cannot be auto-merged.',
    duplicationUnsupportedReason: 'Annotations are anchored to 3D geometry. Creating a duplicate requires re-positioning, which must be done manually.',
  },

  viewgroup: {
    displayName: 'View Group',
    entityLabel: 'view group',
    supportsDuplication: false,
    safeFields: VIEWGROUP_SAFE_MERGE_FIELDS,
    resolverId: 'viewGroupManager',
    mergeWarning: 'Layout, slot, and membership changes cannot be auto-merged safely. Only name and colour are safe to merge.',
    duplicationUnsupportedReason: 'Duplicating a view group with its current views requires careful slot mapping to avoid orphaned placements. Use the ViewGroup editor to create a copy.',
  },

  workspace_annotation: {
    displayName: 'Workspace Annotation',
    entityLabel: 'workspace annotation',
    supportsDuplication: false,
    safeFields: WORKSPACE_ANNOTATION_SAFE_MERGE_FIELDS,
    resolverId: 'workspaceAnnotationManager',
    mergeWarning: 'Path, content, position, and link changes cannot be auto-merged. Only visibility and z-index are safe to merge.',
    duplicationUnsupportedReason: 'Workspace annotations are positioned on the canvas grid. Duplicating requires re-positioning, which must be done manually.',
  },
};
