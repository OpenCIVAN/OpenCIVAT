// src/ui/react/components/workspace/index.js
// Workspace component exports

// Canvas components
export { CanvasGrid } from "./CanvasGrid/CanvasGrid.jsx";
export { CanvasCell } from "./CanvasCell/CanvasCell.jsx";
export {
  CanvasMinimap,
  CanvasMinimap as MiniMap,
} from "./CanvasMinimap/CanvasMinimap.jsx";
export { ViewportNavigator } from "./ViewportNavigator/ViewportNavigator.jsx";

// Full canvas workspace integration
export { CanvasWorkspace } from "./CanvasWorkspace/CanvasWorkspace.jsx";
export {
  IsolationOverlay,
  useIsolationMode,
} from "./IsolationOverlay/IsolationOverlay.jsx";
