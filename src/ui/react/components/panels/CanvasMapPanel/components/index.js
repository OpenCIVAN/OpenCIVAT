/**
 * @file components/index.js
 * @description Exports for all Canvas Map Panel V2 components
 */

// ModeTabs
export { ModeTabs } from "./ModeTabs";

// MapToolbar
export { MapToolbar } from "./MapToolbar";

// Minimap
export {
  Minimap,
  MinimapGrid,
  VGBlock,
  ViewCell,
  ViewportIndicator,
  CollaboratorIndicator,
  CursorIndicator,
  LinkLines,
} from "./Minimap";

// QuickNavToolbar
export { QuickNavToolbar } from "./QuickNavToolbar";

// CompanionPanel (re-exported from shared location)
export {
  CompanionPanel,
  ViewListItem,
  DatasetItem,
} from "../../CompanionPanel";

// BottomPanel
export { CanvasMapBottomPanel } from "./BottomPanel/CanvasMapBottomPanel";

// ContextualPanels
export {
  NavigatePanel,
  ViewportsPanel,
  LayoutPanel,
  LinksPanel,
  TeamPanel,
  MeSubTab,
  TeamSubTab,
} from "./ContextualPanels";

// Shared components (domain-specific)
export {
  PanelSection,
  VGListItem,
  BookmarkItem,
  CollaboratorItem,
  ViewportItem,
  LinkItem,
  FloatingDPad,
} from "./shared";

// Re-exports from molecules (for backwards compatibility)
export { SectionHeader } from "@UI/react/components/molecules/HeaderSection";
export { ChipGroup as FilterChips } from "@UI/react/components/molecules/ChipGroup";
