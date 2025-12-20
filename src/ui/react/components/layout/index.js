// src/ui/react/components/layout/index.js
// =============================================================================
// HEADER/FOOTER BAR COMPONENTS (per design spec)
// =============================================================================
export { Header } from "./Header";
export { SecondaryHeader } from "./SecondaryHeader";
export { SecondaryFooter } from "./SecondaryFooter";
export { StatusBar } from "./StatusBar";

// =============================================================================
// LAYOUT INFRASTRUCTURE
// =============================================================================
export { ActivityBar } from "./ActivityBar";
export {
  ThreeEdgeLayout,
  LayoutContext,
  useLayoutContext,
  useSecondaryBarZoneWidths,
  PANEL_CONSTRAINTS,
  SECONDARY_BAR_MIN_WIDTHS,
} from "./ThreeEdgeLayout";
export { ResizablePanel } from "@UI/react/common/ResizablePanel";
export {
  SecondaryBar,
  SecondaryBarZone,
  SecondaryBarDivider,
  SecondaryBarSpacer,
} from "./SecondaryBarZone";

// =============================================================================
// RE-EXPORTS FROM HOOKS (for convenience)
// =============================================================================
export {
  useWorkspaceSelector,
  useViewMode,
  useWorkspacePresence,
  useSecondaryTopBar,
  VIEW_MODES,
  WORKSPACE_TYPES,
} from "@UI/react/hooks/useWorkspaceBar.js";

export {
  useCanvasViewport,
  useVoiceControls,
  useWorkspaceIndicator,
  useSecondaryBottomBar,
} from "@UI/react/hooks/useVoiceBar.js";
