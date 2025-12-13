// src/ui/react/components/panels/LayoutPanel/index.js
// Layout Panel exports

// =============================================================================
// MAIN COMPONENTS
// =============================================================================

import { LayoutPanel } from "./LayoutPanel";

export { LayoutPanel } from "./LayoutPanel";
export { FloatingCanvasNavigator } from "./FloatingCanvasNavigator";
export default LayoutPanel;

// =============================================================================
// CONTEXT & HOOKS (for shared state)
// =============================================================================

export {
  LayoutPanelProvider,
  useLayoutPanelContext,
  useLayoutPanelLogic,
  useNavigatorDocked,
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
  DOCK_POSITIONS,
  parseSpawnSize,
} from "./LayoutPanel.logic";

export {
  useCanvasNavigator,
  usePressAndHold,
  useViewportDrag,
} from "./components/CanvasNavigator/CanvasNavigator.logic";

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

export { CanvasNavigator } from "./components/CanvasNavigator/CanvasNavigator";
export { SpawnSizePicker } from "./components/SpawnSizePicker";
export { FilterChips } from "./components/FilterChips";

// =============================================================================
// SUBTABS
// =============================================================================

export { CanvasSubtab } from "./subtabs/CanvasSubtab";
export { ViewsSubtab } from "./subtabs/ViewsSubtab";
