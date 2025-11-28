// src/core/data/models/index.js
// Data model exports for CIA Web
//
// These models follow the Three-Layer Data Model:
// - Layer 1: Dataset (raw data + annotations) - defined elsewhere
// - Layer 2: ViewConfiguration (how to view data) - defined elsewhere
// - Layer 3: InstanceWindow (ephemeral renderer) - defined elsewhere
//
// Canvas System Models:
// - WorkspaceCanvas: Infinite pinboard of placements
// - CanvasPlacement: Positioned item on canvas
// - Subset: Saved selection for focus mode

// Canvas System
export { WorkspaceCanvas } from './WorkspaceCanvas.js';
export {
  CanvasPlacement,
  PlacementContentType
} from './CanvasPlacement.js';
export {
  Subset,
  SubsetVisibility
} from './Subset.js';
