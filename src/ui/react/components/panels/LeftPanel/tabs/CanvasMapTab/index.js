/**
 * @file CanvasMapTab/index.js
 * @description Canvas Map Tab - Unified navigation and editing control
 *
 * Features:
 * - Four modes: Navigate, Layout, Links, Collaborate
 * - VG vs View display modes
 * - Grid-based minimap with Excel-style coordinates
 * - Collaborator presence visualization
 * - ViewGroup and View link management
 *
 * Usage:
 * ```jsx
 * import { CanvasMapTab } from './tabs/CanvasMapTab';
 *
 * // With default mock data
 * <CanvasMapTab />
 *
 * // With real data
 * <CanvasMapTab
 *   canvas={canvasConfig}
 *   viewGroups={activeVGs}
 *   inactiveVGs={closedVGs}
 *   viewports={userViewports}
 *   collaborators={teamMembers}
 *   vgLinks={vgLinkConfigs}
 *   viewLinks={viewLinkConfigs}
 *   bookmarks={savedBookmarks}
 *   callbacks={{ onModeChange, onVGSelect, ... }}
 * />
 * ```
 */

export { CanvasMapTab, CanvasMapTab as default } from './CanvasMapTab';
export { useCanvasMapTab } from './CanvasMapTab.logic';
export {
  MAP_MODES,
  MODE_CONFIG,
  DISPLAY_MODES,
  LAYOUTS,
  VIEW_TYPES,
  colToLetter,
  formatCellRef,
  formatRangeRef,
  getVGDisplayName,
} from './CanvasMapTab.logic';
