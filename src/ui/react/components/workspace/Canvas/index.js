// src/ui/react/components/workspace/Canvas/index.js
// Canvas component exports

// Canvas components
export { CanvasGrid } from "./CanvasGrid/CanvasGrid.jsx";
export { CanvasCell } from "./CanvasCell/CanvasCell.jsx";

// Canvas chrome components (new architecture)
export { CanvasHeader } from "./CanvasHeader/CanvasHeader.jsx";
export { CanvasHeaderBar } from "./CanvasHeaderBar/CanvasHeaderBar.jsx";
// CanvasToolbar now integrates canvas controls + status info
export { CanvasToolbar } from "./CanvasToolbar/CanvasToolbar.jsx";
// CanvasStatusBar kept for standalone use if needed
export { CanvasStatusBar } from "./CanvasStatusBar/CanvasStatusBar.jsx";
export { SubsetCard } from "./SubsetCard/SubsetCard.jsx";
export { EdgeTrigger, FloatingPanel } from "./EdgePanels";
export { LinksDropdown, LINK_TYPES, LINK_DIRECTIONS } from "./LinksDropdown/LinksDropdown.jsx";

// Floating canvas (dock/float/fullscreen modes)
export {
  FloatingCanvasWrapper,
  CanvasControlsBar,
  CANVAS_MODES,
  ASPECT_RATIOS,
} from "./FloatingCanvas";

// Full canvas workspace integration
export { CanvasWorkspace } from "./CanvasWorkspace/CanvasWorkspace.jsx";
export {
  IsolationOverlay,
  useIsolationMode,
} from "./IsolationOverlay/IsolationOverlay.jsx";
