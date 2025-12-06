// src/ui/react/hooks/index.js
// React hook exports

// Authentication
export { useAuth } from "./useAuth.js";

// Canvas & Viewport
export { useCanvas, useViewport, useSubsets } from "./useCanvas.js";
export { useCanvasSelection } from "./useCanvasSelection.js";
export {
  useViewportSize,
  STORAGE_KEY as VIEWPORT_SIZE_STORAGE_KEY,
  EVENT_NAME as VIEWPORT_SIZE_EVENT,
  DEFAULT_VIEWPORT_SIZE,
  SIZE_PRESETS as VIEWPORT_SIZE_PRESETS,
} from "./useViewportSize.js";

// Data Management
export { useDatasets } from "./useDatasets.js";
export { useInstances } from "./useInstances.js";
export { useProjectFiles } from "./useProjectFiles.js";

// Compute Jobs
export {
  useComputeJobs,
  useComputeOperations,
  JobStatus,
} from "./useComputeJobs.js";

// UI Utilities
export { useSmartDropdownPosition } from "./useSmartDropdownPosition.js";
export { useLogging } from "./useLogging.js";

// Dataset Manager (low-level)
export { useDatasetManager } from "./useDatasetManager.js";

export { useFilters } from "./useFilters.js";
export { useBookmarks } from "./useBookmarks.js";
