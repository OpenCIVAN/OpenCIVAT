/**
 * CanvasMapPanel - Public API
 *
 * NOTE: The CanvasMapPanel component tree (CanvasMapPanel.jsx, CanvasMapContent.jsx,
 * and their sub-components/hooks) was removed as dead code — it was never mounted
 * anywhere in the app. Only utils/gridUtils.js survives because it is imported
 * directly by UnifiedCompanionPanelShell.jsx.
 */

export {
  colToLetter,
  formatCellRef,
  formatRangeRef,
  getVGDisplayName,
  getGridPosition,
  getGridCenter,
  getGridDimensions,
  pixelToGrid,
  clamp,
} from './utils/gridUtils';
