// src/ui/react/hooks/index.js
// React hook exports
//
// UPDATED: Added useAsyncData, useWebSocketEvents, and refactored hooks

// =============================================================================
// SHARED DATA FETCHING UTILITIES (NEW)
// =============================================================================

export { useAsyncData, useAsyncMutation } from "./useAsyncData.js";

export {
  useWebSocketEvents,
  useWebSocketEvent,
  useServerSyncEvents,
  dispatchMockWSEvent,
} from "./useWebSocketEvents.js";

// =============================================================================
// AUTHENTICATION
// =============================================================================

export { useAuth } from "./useAuth.js";

// =============================================================================
// CANVAS & VIEWPORT
// =============================================================================

export { useCanvas, useViewport, useSubsets } from "./useCanvas.js";
export { useCanvasSelection } from "./useCanvasSelection.js";
export { useCanvasDimensions } from "./useCanvasDimensions.js";
export {
  useViewportSize,
  STORAGE_KEY as VIEWPORT_SIZE_STORAGE_KEY,
  EVENT_NAME as VIEWPORT_SIZE_EVENT,
  DEFAULT_VIEWPORT_SIZE,
  SIZE_PRESETS as VIEWPORT_SIZE_PRESETS,
} from "./useViewportSize.js";

// =============================================================================
// DATA MANAGEMENT (REFACTORED)
// =============================================================================

export { useDatasets } from "./useDatasets.js";
export { useInstances } from "./useInstances.js";
export { useProjectFiles, useAllAccessibleFiles } from "./useProjectFiles.js";

// =============================================================================
// COMPUTE JOBS
// =============================================================================

export {
  useComputeJobs,
  useComputeOperations,
  JobStatus,
} from "./useComputeJobs.js";

// =============================================================================
// UI UTILITIES
// =============================================================================

export { useSmartDropdownPosition } from "./useSmartDropdownPosition.js";
export { useLogging } from "./useLogging.js";

// =============================================================================
// DATASET MANAGER (LOW-LEVEL)
// =============================================================================

export { useDatasetManager } from "./useDatasetManager.js";

// =============================================================================
// FEATURES (REFACTORED - use shared patterns internally)
// =============================================================================

export { useFilters } from "./useFilters.js";
export { useBookmarks } from "./useBookmarks.js";
export { useAnnotations } from "./useAnnotations.js";
