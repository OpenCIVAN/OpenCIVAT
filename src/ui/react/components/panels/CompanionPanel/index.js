/**
 * @file CompanionPanel/index.js
 * @description Exports for the shared CompanionPanel component
 *
 * This panel is reusable across multiple contexts:
 * - Canvas Map: Adding content to canvas
 * - VG Editor: Adding views to layout slots
 * - LinkManager: Selecting views to link
 */

export { CompanionPanel } from './CompanionPanel';
export { UnifiedCompanionPanel, useCompanionMode } from './UnifiedCompanionPanel';
export { UnifiedCompanionPanelShell, COMPANION_PANEL_ID } from './UnifiedCompanionPanelShell';
export { ViewListItem } from './ViewListItem';
export { DatasetItem } from './DatasetItem';
export { CollapsibleSection } from './CollapsibleSection';
export { VGItem } from './VGItem';
export { LayoutMiniPreview } from './LayoutMiniPreview';
export { GridSizePicker } from './GridSizePicker';
export { default } from './CompanionPanel';
