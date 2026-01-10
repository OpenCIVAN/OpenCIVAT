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
export { useViewportSize } from "./useViewportSize.js";
export { useViewportConstraints } from "./useViewportConstraints.js";
export {
  useViewStack,
  ViewStackProvider,
  VIEW_TYPES as CANVAS_VIEW_TYPES,
} from "./useViewStack.js";
export {
  VIEWPORT_STORAGE_KEY,
  VIEWPORT_SIZE_EVENT,
  DEFAULT_VIEWPORT_SIZE,
  VIEWPORT_SIZE_PRESETS,
} from "./viewportState.js";
export {
  CANVAS_SIZE_STORAGE_KEY,
  loadCanvasSize,
  saveCanvasSize,
} from "./canvasState.js";

// =============================================================================
// DRAG AND DROP (CENTRALIZED)
// =============================================================================

export {
  DRAG_TYPES,
  DROP_ZONES,
  parseDragData,
  serializeDragData,
  setDragData,
  getDropZone,
  hasDragType,
  hasAnyCIADragType,
} from "./dragDropTypes.js";

export {
  useDragSource,
  useViewItemDragSource,
  useDatasetDragSource,
} from "./useDragSource.js";

export {
  useDropTarget,
  useSimpleDropTarget,
  useCanvasCellDropTarget,
} from "./useDropTarget.js";

// Link drag-and-drop hooks
export { useLinkDragSource } from "./useLinkDragSource.js";
export { useLinkDropTarget } from "./useLinkDropTarget.js";

// =============================================================================
// MANAGER SUBSCRIPTIONS (CENTRALIZED)
// =============================================================================

export {
  useManagerSubscription,
  useManagerEvent,
  useManagerSubscriptionWithInit,
} from "./useManagerSubscription.js";

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

export {
  useThumbnail,
  useThumbnailUrl,
  THUMBNAIL_STATUS,
} from "./useThumbnail.js";

export {
  useViewMetadata,
  useViewDisplayName,
  useViewColor,
} from "./useViewMetadata.js";

// =============================================================================
// WORKSPACE & VOICE BAR HOOKS
// =============================================================================

export {
  useWorkspaceSelector,
  useViewMode,
  useWorkspacePresence,
  useSecondaryTopBar,
  VIEW_MODES as WORKSPACE_VIEW_MODES,
  WORKSPACE_TYPES,
} from "./useWorkspaceBar.js";

export {
  useCanvasViewport,
  useVoiceControls,
  useWorkspaceIndicator,
  useSecondaryBottomBar,
} from "./useVoiceBar.js";

export { useRoomIndicator } from "./useRoomIndicator.js";

export { useViewContextLogic } from "./useViewContextLogic.js";

// =============================================================================
// VR EXPLORATION
// =============================================================================

export { useVRSession } from "./useVRSession.js";
export {
  useVRPreprocessing,
  PreprocessingStatus,
} from "./useVRPreprocessing.js";
