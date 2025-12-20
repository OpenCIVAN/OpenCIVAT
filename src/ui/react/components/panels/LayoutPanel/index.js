// src/ui/react/components/panels/LayoutPanel/index.js
// Layout Panel exports
//
// IMPORTANT NOTES:
// 1. DOCK_POSITIONS should ONLY be imported from LayoutPanelContext
// 2. FloatingCanvasNavigator is a SEPARATE component from LayoutPanel
// 3. Both LayoutPanel and FloatingCanvasNavigator consume the same context

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

import { LayoutPanel } from "./LayoutPanel";

export { LayoutPanel };
export { FloatingCanvasNavigator } from "./FloatingCanvasNavigator";
export default LayoutPanel;

// =============================================================================
// CONTEXT & HOOKS
// =============================================================================

// DOCK_POSITIONS - ALWAYS import from LayoutPanelContext to avoid comparison bugs
export {
  LayoutPanelProvider,
  useLayoutPanelContext,
  useLayoutPanelLogic,
  useNavigatorDocked,
  DOCK_POSITIONS, // Single source of truth!
} from "./LayoutPanelContext";

// =============================================================================
// LOGIC HOOKS
// =============================================================================

export {
  useLayoutPanel,
  LAYOUT_MODES,
  FLOW_DIRECTIONS,
  TOOLS,
  DROP_MODES,
  VIEW_MODES,
  SPAWN_SIZES,
  parseSpawnSize,
  // NOTE: DOCK_POSITIONS is NOT exported from LayoutPanel.logic.js
  // Use the one from LayoutPanelContext instead
} from "./LayoutPanel.logic";

export {
  useCanvasNavigator,
  // Constants
  CONTEXT_MODES,
  DISPLAY_MODES,
  NAV_MODES,
  INSTANCE_COLORS,
  // NOTE: usePressAndHold and useViewportDrag were removed
  // NOTE: DOCK_POSITIONS is NOT exported from CanvasNavigator.logic.js
  // Use the one from LayoutPanelContext instead
} from "./components/CanvasNavigator/CanvasNavigator.logic";

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

export { CanvasNavigator } from "./components/CanvasNavigator/CanvasNavigator";
export { SpawnSizePicker } from "./components/SpawnSizePicker";

// =============================================================================
// SUBTABS
// =============================================================================

export { CanvasSubtab } from "./subtabs/CanvasSubtab";
export { ViewsSubtab } from "./subtabs/ViewsSubtab";
