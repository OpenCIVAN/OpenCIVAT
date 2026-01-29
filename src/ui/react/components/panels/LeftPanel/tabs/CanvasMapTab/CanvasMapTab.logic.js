/**
 * @file CanvasMapTab.logic.js
 * @description Headless logic hook for CanvasMap component
 *
 * Provides all state management and computed values for the Canvas Map panel.
 * This enables both the default CanvasMapTab UI and custom implementations.
 */

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map operation modes
 */
export const MAP_MODES = {
  NAVIGATE: 'navigate',
  LAYOUT: 'layout',
  LINKS: 'links',
  COLLABORATE: 'collaborate',
};

/**
 * Mode metadata for UI rendering
 */
export const MODE_CONFIG = {
  [MAP_MODES.NAVIGATE]: {
    id: MAP_MODES.NAVIGATE,
    name: 'Navigate',
    icon: 'compass',
    color: 'blue',
    description: 'Move around, find locations',
  },
  [MAP_MODES.LAYOUT]: {
    id: MAP_MODES.LAYOUT,
    name: 'Layout',
    icon: 'layoutGrid',
    color: 'green',
    description: 'Build and edit canvas',
  },
  [MAP_MODES.LINKS]: {
    id: MAP_MODES.LINKS,
    name: 'Links',
    icon: 'gitBranch',
    color: 'purple',
    description: 'Manage connections',
  },
  [MAP_MODES.COLLABORATE]: {
    id: MAP_MODES.COLLABORATE,
    name: 'Team',
    icon: 'users',
    color: 'amber',
    description: 'See teammates',
  },
};

/**
 * Display modes for minimap
 */
export const DISPLAY_MODES = {
  VG: 'vg',
  VIEW: 'view',
};

/**
 * Sub-tab options
 */
export const LINKS_SUB_TABS = {
  VG: 'vg',
  VIEW: 'view',
};

export const COLLABORATE_SUB_TABS = {
  ME: 'me',
  TEAM: 'team',
};

/**
 * Layout configurations for ViewGroups
 */
export const LAYOUTS = {
  'single': { rows: 1, cols: 1, cells: 1 },
  'side-by-side': { rows: 1, cols: 2, cells: 2 },
  'stacked': { rows: 2, cols: 1, cells: 2 },
  '2x2': { rows: 2, cols: 2, cells: 4 },
  '1+2': { rows: 2, cols: 2, cells: 3, merged: 'top' },
  '2+1': { rows: 2, cols: 2, cells: 3, merged: 'right' },
};

/**
 * View type icons and colors
 */
export const VIEW_TYPES = {
  volume: { icon: 'box', color: 'purple', name: 'Volume' },
  slice: { icon: 'layers', color: 'blue', name: 'Slice' },
  data: { icon: 'barChart', color: 'green', name: 'Data' },
  chart: { icon: 'lineChart', color: 'amber', name: 'Chart' },
  notes: { icon: 'fileText', color: 'pink', name: 'Notes' },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert column index to Excel-style letter (0->A, 25->Z, 26->AA)
 */
export function colToLetter(col) {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

/**
 * Format cell position as Excel-style (row, col) -> "A1"
 */
export function formatCellRef(row, col) {
  return `${colToLetter(col)}${row + 1}`;
}

/**
 * Format range as Excel-style "A1:B2"
 */
export function formatRangeRef(row, col, rowSpan, colSpan) {
  const start = formatCellRef(row, col);
  if (rowSpan === 1 && colSpan === 1) return start;
  const end = formatCellRef(row + rowSpan - 1, col + colSpan - 1);
  return `${start}:${end}`;
}

/**
 * Get display name for a ViewGroup
 * Implicit VGs show view name (if single) or "Group (n views)"
 */
export function getVGDisplayName(vg) {
  if (vg.isExplicit && vg.name) return vg.name;
  if (vg.views?.length === 1) return vg.views[0].name;
  return `Group (${vg.views?.length || 0} views)`;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useCanvasMapTab - Headless logic hook for Canvas Map
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.canvas - Canvas configuration { rows, cols, homePosition }
 * @param {Array} options.viewGroups - Active ViewGroups on canvas
 * @param {Array} options.inactiveVGs - Closed ViewGroups (can be restored)
 * @param {Array} options.viewports - User viewports
 * @param {Array} options.collaborators - Team member presence data
 * @param {Array} options.vgLinks - ViewGroup link configurations
 * @param {Array} options.viewLinks - View link configurations
 * @param {Array} options.bookmarks - Saved bookmark positions
 * @param {Object} options.callbacks - Event callbacks
 */
export function useCanvasMapTab({
  canvas = { rows: 4, cols: 4, homePosition: { row: 0, col: 0 } },
  viewGroups = [],
  inactiveVGs = [],
  viewports = [],
  collaborators = [],
  vgLinks = [],
  viewLinks = [],
  bookmarks = [],
  callbacks = {},
} = {}) {
  // -------------------------------------------------------------------------
  // UI State
  // -------------------------------------------------------------------------
  const [mapMode, setMapMode] = useState(MAP_MODES.NAVIGATE);
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.VG);
  const [minimapZoom, setMinimapZoom] = useState(100);

  // Visibility toggles
  const [showGridLabels, setShowGridLabels] = useState(true);
  const [showViewports, setShowViewports] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showInternals, setShowInternals] = useState(true);

  // Sub-tabs
  const [linksSubTab, setLinksSubTab] = useState(LINKS_SUB_TABS.VG);
  const [collaborateSubTab, setCollaborateSubTab] = useState(COLLABORATE_SUB_TABS.ME);

  // Selection
  const [selectedVGId, setSelectedVGId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [focusedVGId, setFocusedVGId] = useState(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------
  const currentMode = MODE_CONFIG[mapMode];
  const selectedVG = useMemo(
    () => viewGroups.find(vg => vg.id === selectedVGId),
    [viewGroups, selectedVGId]
  );
  const focusedVG = useMemo(
    () => viewGroups.find(vg => vg.id === focusedVGId),
    [viewGroups, focusedVGId]
  );

  /**
   * Flattened views for View display mode
   * Each view = exactly 1 cell, positioned within its VG's canvas area
   */
  const flattenedViews = useMemo(() => {
    if (displayMode !== DISPLAY_MODES.VIEW) return [];

    const views = [];
    viewGroups.forEach(vg => {
      if (!vg.position) return; // Skip inactive VGs

      const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;

      vg.views?.forEach((view, idx) => {
        // Calculate internal position based on layout
        const internalRow = Math.floor(idx / layout.cols);
        const internalCol = idx % layout.cols;

        // Map internal position to canvas position within VG's span
        const canvasRow = vg.position.row + Math.floor(internalRow * vg.position.rowSpan / layout.rows);
        const canvasCol = vg.position.col + Math.floor(internalCol * vg.position.colSpan / layout.cols);

        views.push({
          ...view,
          vgId: vg.id,
          vgName: vg.name,
          vgColor: vg.color,
          canvasRow,
          canvasCol,
          rowSpan: 1,
          colSpan: 1,
        });
      });
    });
    return views;
  }, [displayMode, viewGroups]);

  /**
   * Calculate minimap cell size based on zoom and focus state
   */
  const minimapCellSize = useMemo(() => {
    const baseSize = focusedVGId ? 60 : 42;
    return Math.floor(baseSize * (minimapZoom / 100));
  }, [minimapZoom, focusedVGId]);

  /**
   * Current grid size (canvas size)
   */
  const currentGridSize = useMemo(() => {
    return { rows: canvas.rows, cols: canvas.cols };
  }, [canvas.rows, canvas.cols]);

  /**
   * Filter VGs based on search query
   */
  const filteredVGs = useMemo(() => {
    if (!searchQuery) return viewGroups;
    const query = searchQuery.toLowerCase();
    return viewGroups.filter(vg =>
      getVGDisplayName(vg).toLowerCase().includes(query)
    );
  }, [viewGroups, searchQuery]);

  /**
   * Filter bookmarks based on search query
   */
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery) return bookmarks;
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(bm =>
      bm.name.toLowerCase().includes(query)
    );
  }, [bookmarks, searchQuery]);

  /**
   * Online collaborators count
   */
  const onlineCollaboratorsCount = useMemo(() => {
    return collaborators.filter(c => c.isOnline).length;
  }, [collaborators]);

  /**
   * Broadcasting collaborators
   */
  const broadcastingCollaborators = useMemo(() => {
    return collaborators.filter(c => c.isOnline && c.isBroadcasting);
  }, [collaborators]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleModeChange = useCallback((mode) => {
    setMapMode(mode);
    setHighlightedLinkId(null);
    callbacks.onModeChange?.(mode);
  }, [callbacks]);

  const handleVGClick = useCallback((vgId) => {
    setSelectedVGId(vgId);
    callbacks.onVGSelect?.(vgId);
  }, [callbacks]);

  const handleVGDoubleClick = useCallback((vgId) => {
    setFocusedVGId(vgId);
    setMapMode(MAP_MODES.LAYOUT);
    callbacks.onVGFocus?.(vgId);
  }, [callbacks]);

  const handleBackFromFocus = useCallback(() => {
    setFocusedVGId(null);
    callbacks.onVGFocus?.(null);
  }, [callbacks]);

  const handleLinkClick = useCallback((linkId) => {
    setHighlightedLinkId(prev => prev === linkId ? null : linkId);
    callbacks.onLinkHighlight?.(linkId);
  }, [callbacks]);

  const handleViewportClick = useCallback((viewportId) => {
    setSelectedViewportId(viewportId);
    callbacks.onViewportSelect?.(viewportId);
  }, [callbacks]);

  const handleZoomIn = useCallback(() => {
    setMinimapZoom(z => Math.min(200, z + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setMinimapZoom(z => Math.max(50, z - 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setMinimapZoom(100);
  }, []);

  const toggleShowGridLabels = useCallback(() => {
    setShowGridLabels(prev => !prev);
  }, []);

  const toggleShowViewports = useCallback(() => {
    setShowViewports(prev => !prev);
  }, []);

  const toggleShowCollaborators = useCallback(() => {
    setShowCollaborators(prev => !prev);
  }, []);

  const toggleShowBookmarks = useCallback(() => {
    setShowBookmarks(prev => !prev);
  }, []);

  const toggleShowInternals = useCallback(() => {
    setShowInternals(prev => !prev);
  }, []);

  /**
   * Get VG center position for link lines
   */
  const getVGCenter = useCallback((vgId) => {
    const vg = viewGroups.find(v => v.id === vgId);
    if (!vg?.position) return null;
    const gap = 4;
    return {
      x: (vg.position.col + vg.position.colSpan / 2) * (minimapCellSize + gap),
      y: (vg.position.row + vg.position.rowSpan / 2) * (minimapCellSize + gap),
    };
  }, [viewGroups, minimapCellSize]);

  // -------------------------------------------------------------------------
  // Return API
  // -------------------------------------------------------------------------
  return {
    // State
    mapMode,
    displayMode,
    minimapZoom,
    showGridLabels,
    showViewports,
    showCollaborators,
    showBookmarks,
    showInternals,
    linksSubTab,
    collaborateSubTab,
    selectedVGId,
    selectedViewportId,
    highlightedLinkId,
    focusedVGId,
    searchQuery,
    sortOrder,

    // Setters
    setMapMode: handleModeChange,
    setDisplayMode,
    setLinksSubTab,
    setCollaborateSubTab,
    setSearchQuery,
    setSortOrder,

    // Derived
    currentMode,
    selectedVG,
    focusedVG,
    flattenedViews,
    minimapCellSize,
    currentGridSize,
    filteredVGs,
    filteredBookmarks,
    onlineCollaboratorsCount,
    broadcastingCollaborators,

    // Handlers
    handleModeChange,
    handleVGClick,
    handleVGDoubleClick,
    handleBackFromFocus,
    handleLinkClick,
    handleViewportClick,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    toggleShowGridLabels,
    toggleShowViewports,
    toggleShowCollaborators,
    toggleShowBookmarks,
    toggleShowInternals,
    getVGCenter,

    // Utils (re-export for convenience)
    formatCellRef,
    formatRangeRef,
    getVGDisplayName,
  };
}

export default useCanvasMapTab;
