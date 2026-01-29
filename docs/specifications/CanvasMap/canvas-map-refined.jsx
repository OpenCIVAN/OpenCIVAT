import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Map, Eye, EyeOff, ZoomIn, ZoomOut, Home, Bookmark, BookmarkPlus,
  ChevronDown, ChevronRight, ChevronUp, Plus, Trash2, X, 
  ArrowLeft, Combine, Split, Copy, Link2, Unlink2, Grid3X3,
  Pencil, Share2, Users, User, Maximize2, Minimize2, Move,
  LayoutGrid, Package, Frame, Settings, MoreHorizontal,
  Radio, Crosshair, Lock, Unlock, Layers, Filter,
  ArrowUpRight, ArrowDownLeft, RefreshCw, Save, Download, Upload,
  Compass, Navigation, GitBranch, MousePointer, Hand, Target,
  Grip, Move3D, SquareDashedBottom, Scan, Search, SortAsc, SortDesc,
  Clock, History, CheckCircle, AlertCircle, ChevronLeft, Columns,
  PanelRightOpen, PanelRightClose, Database, FileBox, List, Hash
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#12121a',
      tertiary: '#1a1a24',
      glass: 'rgba(255,255,255,0.03)',
      glassHover: 'rgba(255,255,255,0.06)',
      grid: 'rgba(255,255,255,0.02)',
      gridLine: 'rgba(255,255,255,0.04)',
    },
    border: {
      subtle: 'rgba(255,255,255,0.06)',
      default: 'rgba(255,255,255,0.1)',
      strong: 'rgba(255,255,255,0.15)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
      muted: 'rgba(255,255,255,0.4)',
    },
    accent: {
      purple: '#a855f7',
      blue: '#3b82f6',
      cyan: '#22d3ee',
      green: '#22c55e',
      amber: '#f59e0b',
      red: '#ef4444',
      orange: '#f97316',
      pink: '#ec4899',
      teal: '#14b8a6',
    },
    mode: {
      navigate: '#3b82f6',
      layout: '#22c55e',
      links: '#a855f7',
      collaborate: '#f59e0b',
    },
  },
  text: {
    xs: '10px',
    sm: '11px',
    md: '12px',
    lg: '13px',
  },
};

// =============================================================================
// MODE DEFINITIONS
// =============================================================================
const MAP_MODES = {
  navigate: {
    id: 'navigate',
    name: 'Navigate',
    icon: Compass,
    color: tokens.colors.mode.navigate,
    description: 'Move around, find locations',
  },
  layout: {
    id: 'layout',
    name: 'Layout',
    icon: LayoutGrid,
    color: tokens.colors.mode.layout,
    description: 'Build and edit canvas',
  },
  links: {
    id: 'links',
    name: 'Links',
    icon: GitBranch,
    color: tokens.colors.mode.links,
    description: 'Manage connections',
  },
  collaborate: {
    id: 'collaborate',
    name: 'Team',
    icon: Users,
    color: tokens.colors.mode.collaborate,
    description: 'See teammates',
  },
};

// =============================================================================
// MOCK DATA
// =============================================================================
const INITIAL_VIEWGROUPS = [
  { 
    id: 'vg-1', 
    name: 'Brain Analysis', 
    color: '#a855f7',
    isExplicit: true,
    layoutId: '1+2',
    position: { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
    views: [
      { id: 'v-1', type: 'volume', name: 'Main Volume', cell: 0 },
      { id: 'v-2', type: 'slice', name: 'Axial Slice', cell: 1 },
      { id: 'v-3', type: 'data', name: 'Stats Table', cell: 2 },
    ],
  },
  { 
    id: 'vg-2', 
    name: 'Tumor Review', 
    color: '#ec4899',
    isExplicit: true,
    layoutId: '2x2',
    position: { row: 0, col: 2, rowSpan: 2, colSpan: 2 },
    views: [
      { id: 'v-4', type: 'slice', name: 'Sagittal', cell: 0 },
      { id: 'v-5', type: 'slice', name: 'Coronal', cell: 1 },
      { id: 'v-6', type: 'volume', name: 'Overlay', cell: 2 },
      { id: 'v-7', type: 'chart', name: 'Growth Chart', cell: 3 },
    ],
  },
  { 
    id: 'vg-3', 
    name: null, // Implicit - name from view
    color: '#22c55e',
    isExplicit: false,
    layoutId: 'single',
    position: { row: 2, col: 0, rowSpan: 1, colSpan: 1 },
    views: [
      { id: 'v-8', type: 'notes', name: 'Session Notes', cell: 0 },
    ],
  },
  { 
    id: 'vg-4', 
    name: 'Comparison', 
    color: '#3b82f6',
    isExplicit: true,
    layoutId: 'side-by-side',
    position: { row: 2, col: 1, rowSpan: 1, colSpan: 2 },
    views: [
      { id: 'v-9', type: 'slice', name: 'Pre-op', cell: 0 },
      { id: 'v-10', type: 'slice', name: 'Post-op', cell: 1 },
    ],
  },
  { 
    id: 'vg-5', 
    name: null,
    color: '#f59e0b',
    isExplicit: false,
    layoutId: 'single',
    position: { row: 2, col: 3, rowSpan: 1, colSpan: 1 },
    views: [
      { id: 'v-11', type: 'chart', name: 'Timeline', cell: 0 },
    ],
  },
  { 
    id: 'vg-6', 
    name: 'Reference', 
    color: '#22d3ee',
    isExplicit: true,
    layoutId: 'stacked',
    position: { row: 3, col: 0, rowSpan: 1, colSpan: 2 },
    views: [
      { id: 'v-12', type: 'slice', name: 'Atlas Ref', cell: 0 },
      { id: 'v-13', type: 'data', name: 'Labels', cell: 1 },
    ],
  },
];

// VG Links
const VG_LINKS = [
  { id: 'vgl-1', from: 'vg-1', to: 'vg-2', type: 'camera', mode: 'bidirectional' },
  { id: 'vgl-2', from: 'vg-1', to: 'vg-4', type: 'camera', mode: 'unidirectional' },
  { id: 'vgl-3', from: 'vg-4', to: 'vg-6', type: 'filters', mode: 'bidirectional' },
];

// View Links (separate, can get complex)
const VIEW_LINKS = [
  { id: 'vl-1', views: ['v-2', 'v-4', 'v-9'], type: 'windowLevel', mode: 'bidirectional' },
  { id: 'vl-2', views: ['v-1', 'v-6'], type: 'camera', mode: 'bidirectional' },
  { id: 'vl-3', views: ['v-9', 'v-10'], type: 'windowLevel', mode: 'bidirectional' },
  { id: 'vl-4', views: ['v-2', 'v-5', 'v-9', 'v-10', 'v-12'], type: 'slice', mode: 'bidirectional' },
];

const INITIAL_CANVAS = {
  rows: 4,
  cols: 4,
  homePosition: { row: 0, col: 0 },
};

const INITIAL_VIEWPORTS = [
  { 
    id: 'vp-1', 
    name: 'Main', 
    position: { row: 0, col: 0 },
    size: { rows: 2, cols: 2 },
    mode: 'snap',
    isPrimary: true,
  },
  { 
    id: 'vp-2', 
    name: 'Detail', 
    position: { row: 2, col: 1 },
    size: { rows: 2, cols: 2 },
    mode: 'free',
    isPrimary: false,
  },
];

const COLLABORATORS = [
  { 
    id: 'user-1', 
    name: 'Dr. Sarah Chen', 
    avatar: '👩‍⚕️',
    color: '#22c55e',
    viewport: { row: 0, col: 2, rows: 2, cols: 2 },
    isBroadcasting: true,
    isOnline: true,
  },
  { 
    id: 'user-2', 
    name: 'Dr. James Wilson', 
    avatar: '👨‍⚕️',
    color: '#f59e0b',
    viewport: { row: 2, col: 0, rows: 1, cols: 2 },
    isBroadcasting: false,
    isOnline: true,
  },
  { 
    id: 'user-3', 
    name: 'Resident Kim', 
    avatar: '👨‍🎓',
    color: '#ec4899',
    viewport: { row: 3, col: 2, rows: 1, cols: 2 },
    isBroadcasting: false,
    isOnline: true,
  },
  { 
    id: 'user-4', 
    name: 'Dr. Emily Park', 
    avatar: '👩‍🔬',
    color: '#8b5cf6',
    viewport: null,
    isBroadcasting: false,
    isOnline: true,
  },
  { 
    id: 'user-5', 
    name: 'Dr. Michael Torres', 
    avatar: '👨‍⚕️',
    color: '#06b6d4',
    viewport: { row: 1, col: 0, rows: 1, cols: 1 },
    isBroadcasting: true,
    isOnline: true,
  },
  { 
    id: 'user-6', 
    name: 'Dr. Lisa Wang', 
    avatar: '👩‍⚕️',
    color: '#f43f5e',
    viewport: null,
    isBroadcasting: false,
    isOnline: false,
  },
  { 
    id: 'user-7', 
    name: 'Prof. Anderson', 
    avatar: '👨‍🏫',
    color: '#64748b',
    viewport: null,
    isBroadcasting: false,
    isOnline: false,
  },
  { 
    id: 'user-8', 
    name: 'Resident Patel', 
    avatar: '👩‍🎓',
    color: '#84cc16',
    viewport: null,
    isBroadcasting: false,
    isOnline: false,
  },
];

const BOOKMARKS = [
  { id: 'bm-1', name: 'Pre-surgery baseline', position: { row: 0, col: 0 } },
  { id: 'bm-2', name: 'Tumor boundary', position: { row: 0, col: 2 } },
  { id: 'bm-3', name: 'Comparison', position: { row: 2, col: 1 } },
];

const DATASETS = [
  { id: 'ds-1', name: 'patient_brain_mri.nii.gz', type: 'nifti', size: '256MB' },
  { id: 'ds-2', name: 'tumor_segmentation.nii.gz', type: 'nifti', size: '12MB' },
  { id: 'ds-3', name: 'measurements.csv', type: 'csv', size: '24KB' },
  { id: 'ds-4', name: 'atlas_reference.nii.gz', type: 'nifti', size: '128MB' },
];

const ALL_VIEWS = INITIAL_VIEWGROUPS.flatMap(vg => 
  vg.views.map(v => ({ ...v, vgId: vg.id, vgName: vg.name, vgColor: vg.color }))
);

// Inactive VGs (closed but not deleted, can be restored)
const INACTIVE_VIEWGROUPS = [
  { 
    id: 'vg-inactive-1', 
    name: 'Old Comparison', 
    color: '#6366f1',
    isExplicit: true,
    layoutId: '2x2',
    position: null, // No position when inactive
    views: [
      { id: 'vi-1', type: 'slice', name: 'Jan Scan', cell: 0 },
      { id: 'vi-2', type: 'slice', name: 'Feb Scan', cell: 1 },
      { id: 'vi-3', type: 'slice', name: 'Mar Scan', cell: 2 },
      { id: 'vi-4', type: 'chart', name: 'Progress', cell: 3 },
    ],
  },
  { 
    id: 'vg-inactive-2', 
    name: null, // Was implicit
    color: '#f43f5e',
    isExplicit: false,
    layoutId: 'single',
    position: null,
    views: [
      { id: 'vi-5', type: 'notes', name: 'Draft Notes', cell: 0 },
    ],
  },
];

const LAYOUTS = {
  'single': { rows: 1, cols: 1, cells: 1 },
  'side-by-side': { rows: 1, cols: 2, cells: 2 },
  'stacked': { rows: 2, cols: 1, cells: 2 },
  '2x2': { rows: 2, cols: 2, cells: 4 },
  '1+2': { rows: 2, cols: 2, cells: 3, merged: 'top' },
  '2+1': { rows: 2, cols: 2, cells: 3, merged: 'right' },
};

const VIEW_TYPES = {
  volume: { icon: '🧊', color: '#a855f7', name: 'Volume' },
  slice: { icon: '🔲', color: '#3b82f6', name: 'Slice' },
  data: { icon: '📊', color: '#22c55e', name: 'Data' },
  chart: { icon: '📈', color: '#f59e0b', name: 'Chart' },
  notes: { icon: '📝', color: '#ec4899', name: 'Notes' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const CanvasMapRefined = () => {
  // State
  const [viewGroups, setViewGroups] = useState(INITIAL_VIEWGROUPS);
  const [inactiveVGs, setInactiveVGs] = useState(INACTIVE_VIEWGROUPS);
  const [canvas, setCanvas] = useState(INITIAL_CANVAS);
  const [viewports, setViewports] = useState(INITIAL_VIEWPORTS);
  const [vgLinks] = useState(VG_LINKS);
  const [viewLinks] = useState(VIEW_LINKS);
  
  // Mode state
  const [mapMode, setMapMode] = useState('navigate');
  const [minimapZoom, setMinimapZoom] = useState(100);
  const [linksSubTab, setLinksSubTab] = useState('vg'); // 'vg' | 'view'
  const [collaborateSubTab, setCollaborateSubTab] = useState('me'); // 'me' | 'team'
  
  // Selection
  const [selectedVGId, setSelectedVGId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState('vp-1');
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [focusedVGId, setFocusedVGId] = useState(null);
  
  // Visibility toggles
  const [showViewports, setShowViewports] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showInternals, setShowInternals] = useState(true);
  const [showGridLabels, setShowGridLabels] = useState(true);
  const [displayMode, setDisplayMode] = useState('vg'); // 'vg' | 'view' - VG containers vs flat views
  
  // Side panel
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState('views'); // 'datasets' | 'views'
  
  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Derived
  const currentMode = MAP_MODES[mapMode];
  const selectedVG = viewGroups.find(vg => vg.id === selectedVGId);
  const focusedVG = viewGroups.find(vg => vg.id === focusedVGId);
  
  // Get display name for VG (implicit uses view name)
  const getVGDisplayName = (vg) => {
    if (vg.isExplicit && vg.name) return vg.name;
    if (vg.views.length === 1) return vg.views[0].name;
    return `Group (${vg.views.length} views)`;
  };
  
  // Convert column index to Excel-style letter (0->A, 1->B, ... 25->Z, 26->AA)
  const colToLetter = (col) => {
    let result = '';
    let c = col;
    while (c >= 0) {
      result = String.fromCharCode((c % 26) + 65) + result;
      c = Math.floor(c / 26) - 1;
    }
    return result;
  };
  
  // Format cell position as Excel-style (row, col) -> "A1"
  const formatCellRef = (row, col) => `${colToLetter(col)}${row + 1}`;
  
  // Format range as Excel-style "A1:B2"
  const formatRangeRef = (row, col, rowSpan, colSpan) => {
    const start = formatCellRef(row, col);
    if (rowSpan === 1 && colSpan === 1) return start;
    const end = formatCellRef(row + rowSpan - 1, col + colSpan - 1);
    return `${start}:${end}`;
  };
  
  // Compute flattened view positions for "View" mode
  // Each view = exactly 1 cell, positioned within its VG's canvas area
  const flattenedViews = useMemo(() => {
    if (displayMode !== 'view') return [];
    
    const views = [];
    viewGroups.forEach(vg => {
      const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;
      
      vg.views.forEach((view, idx) => {
        // Calculate internal position based on layout
        const internalRow = Math.floor(idx / layout.cols);
        const internalCol = idx % layout.cols;
        
        // Map internal position to canvas position within VG's span
        // Example: VG at (0,0) spanning 2×2 with 2×2 internal layout
        // Internal (1,1) → Canvas (0+1, 0+1) = (1,1)
        const canvasRow = vg.position.row + Math.floor(internalRow * vg.position.rowSpan / layout.rows);
        const canvasCol = vg.position.col + Math.floor(internalCol * vg.position.colSpan / layout.cols);
        
        views.push({
          ...view,
          vgId: vg.id,
          vgName: vg.name,
          vgColor: vg.color,
          canvasRow,
          canvasCol,
          rowSpan: 1, // Always 1×1
          colSpan: 1,
        });
      });
    });
    return views;
  }, [displayMode, viewGroups]);
  
  // Grid size is always canvas size (no expansion needed)
  const currentGridSize = useMemo(() => {
    return { rows: canvas.rows, cols: canvas.cols };
  }, [canvas]);
  
  const minimapCellSize = useMemo(() => {
    const baseSize = focusedVGId ? 60 : 42;
    return Math.floor(baseSize * (minimapZoom / 100));
  }, [minimapZoom, focusedVGId]);

  // Handlers
  const handleModeChange = (mode) => {
    setMapMode(mode);
    setHighlightedLinkId(null);
  };
  
  const handleVGClick = (vgId) => setSelectedVGId(vgId);
  const handleVGDoubleClick = (vgId) => {
    setFocusedVGId(vgId);
    setMapMode('layout');
  };
  const handleBackFromFocus = () => setFocusedVGId(null);
  const handleLinkClick = (linkId) => setHighlightedLinkId(highlightedLinkId === linkId ? null : linkId);

  // Get VG center for link lines
  const getVGCenter = (vgId) => {
    const vg = viewGroups.find(v => v.id === vgId);
    if (!vg) return null;
    return {
      x: (vg.position.col + vg.position.colSpan / 2) * (minimapCellSize + 4),
      y: (vg.position.row + vg.position.rowSpan / 2) * (minimapCellSize + 4),
    };
  };

  // Filter items based on search
  const filteredVGs = viewGroups.filter(vg => 
    getVGDisplayName(vg).toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredBookmarks = BOOKMARKS.filter(bm =>
    bm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bg.primary,
      color: tokens.colors.text.primary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          Canvas Map - Refined Design
        </h1>
        <p style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary }}>
          Grid background, search/filter, companion panels, improved navigation
        </p>
      </div>

      {/* Main Layout - 3 columns */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        
        {/* === CANVAS MAP PANEL === */}
        <div style={{
          width: '400px',
          background: tokens.colors.bg.secondary,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Breadcrumb / Back navigation (when focused) */}
          {focusedVGId && focusedVG && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: `${focusedVG.color}15`,
              borderBottom: `1px solid ${focusedVG.color}30`,
            }}>
              <button
                onClick={handleBackFromFocus}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  border: 'none',
                  borderRadius: '4px',
                  background: tokens.colors.bg.glass,
                  color: tokens.colors.text.secondary,
                  fontSize: tokens.text.sm,
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={14} />
                Canvas
              </button>
              <ChevronRight size={14} style={{ color: tokens.colors.text.muted }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: focusedVG.color,
                }} />
                <span style={{ fontWeight: 600, color: focusedVG.color }}>
                  {getVGDisplayName(focusedVG)}
                </span>
              </div>
            </div>
          )}
          
          {/* Mode Tabs */}
          <div style={{
            display: 'flex',
            background: tokens.colors.bg.tertiary,
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          }}>
            {Object.values(MAP_MODES).map(mode => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  border: 'none',
                  background: mapMode === mode.id ? tokens.colors.bg.secondary : 'transparent',
                  borderBottom: mapMode === mode.id ? `2px solid ${mode.color}` : '2px solid transparent',
                  color: mapMode === mode.id ? mode.color : tokens.colors.text.muted,
                  fontSize: tokens.text.sm,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <mode.icon size={15} />
                {mode.name}
              </button>
            ))}
          </div>
          
          {/* Toolbar - extends to edges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 8px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            background: tokens.colors.bg.tertiary,
          }}>
            {/* Zoom - always visible */}
            <ToolbarBtn icon={ZoomOut} onClick={() => setMinimapZoom(z => Math.max(50, z - 25))} />
            <span style={{ fontSize: '9px', color: tokens.colors.text.muted, minWidth: '28px', textAlign: 'center' }}>
              {minimapZoom}%
            </span>
            <ToolbarBtn icon={ZoomIn} onClick={() => setMinimapZoom(z => Math.min(200, z + 25))} />
            <ToolbarBtn icon={Maximize2} onClick={() => setMinimapZoom(100)} title="Reset" />
            
            <Separator />
            
            {/* Grid labels toggle - always visible */}
            <ToolbarBtn 
              icon={Hash}
              active={showGridLabels}
              onClick={() => setShowGridLabels(!showGridLabels)}
              title="Grid labels (A1, B2...)"
              activeColor={tokens.colors.accent.purple}
            />
            
            {/* VG vs View display mode toggle */}
            <div style={{ 
              display: 'flex', 
              background: tokens.colors.bg.glass, 
              borderRadius: '4px', 
              padding: '2px',
              marginLeft: '2px',
            }}>
              <button
                onClick={() => setDisplayMode('vg')}
                title="Show ViewGroups (containers)"
                style={{
                  padding: '4px 6px',
                  border: 'none',
                  borderRadius: '3px',
                  background: displayMode === 'vg' ? tokens.colors.accent.green : 'transparent',
                  color: displayMode === 'vg' ? 'white' : tokens.colors.text.muted,
                  fontSize: '9px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Package size={10} /> VG
              </button>
              <button
                onClick={() => setDisplayMode('view')}
                title="Show individual Views (flat)"
                style={{
                  padding: '4px 6px',
                  border: 'none',
                  borderRadius: '3px',
                  background: displayMode === 'view' ? tokens.colors.accent.teal : 'transparent',
                  color: displayMode === 'view' ? 'white' : tokens.colors.text.muted,
                  fontSize: '9px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Layers size={10} /> View
              </button>
            </div>
            
            <Separator />
            
            {/* Mode-specific toggles */}
            {(mapMode === 'navigate' || mapMode === 'layout') && (
              <>
                <ToolbarBtn 
                  icon={Frame}
                  active={showViewports}
                  onClick={() => setShowViewports(!showViewports)}
                  title="Viewports"
                  activeColor={tokens.colors.accent.cyan}
                />
              </>
            )}
            
            {mapMode === 'navigate' && (
              <>
                <ToolbarBtn 
                  icon={Users}
                  active={showCollaborators}
                  onClick={() => setShowCollaborators(!showCollaborators)}
                  title="Collaborators"
                  activeColor={tokens.colors.accent.green}
                />
                <ToolbarBtn 
                  icon={Bookmark}
                  active={showBookmarks}
                  onClick={() => setShowBookmarks(!showBookmarks)}
                  title="Bookmarks"
                  activeColor={tokens.colors.accent.amber}
                />
              </>
            )}
            
            {mapMode === 'layout' && (
              <>
                <ToolbarBtn 
                  icon={Grid3X3}
                  active={showInternals}
                  onClick={() => setShowInternals(!showInternals)}
                  title="Internal layouts"
                  activeColor={tokens.colors.accent.green}
                />
                <Separator />
                <ToolbarBtn icon={Plus} title="Add VG" />
                <ToolbarBtn icon={Combine} title="Merge" />
                <ToolbarBtn icon={Split} title="Split" />
              </>
            )}
            
            {mapMode === 'links' && (
              <>
                <div style={{ display: 'flex', background: tokens.colors.bg.glass, borderRadius: '4px', padding: '2px' }}>
                  <button
                    onClick={() => setLinksSubTab('vg')}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '3px',
                      background: linksSubTab === 'vg' ? tokens.colors.accent.purple : 'transparent',
                      color: linksSubTab === 'vg' ? 'white' : tokens.colors.text.muted,
                      fontSize: tokens.text.xs,
                      cursor: 'pointer',
                    }}
                  >
                    VG
                  </button>
                  <button
                    onClick={() => setLinksSubTab('view')}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '3px',
                      background: linksSubTab === 'view' ? tokens.colors.accent.blue : 'transparent',
                      color: linksSubTab === 'view' ? 'white' : tokens.colors.text.muted,
                      fontSize: tokens.text.xs,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                </div>
                <Separator />
                <ToolbarBtn icon={Link2} title="Create link" />
                <ToolbarBtn icon={Unlink2} title="Break link" />
              </>
            )}
            
            {mapMode === 'collaborate' && (
              <>
                <div style={{ display: 'flex', background: tokens.colors.bg.glass, borderRadius: '4px', padding: '2px' }}>
                  <button
                    onClick={() => setCollaborateSubTab('me')}
                    style={{
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '3px',
                      background: collaborateSubTab === 'me' ? tokens.colors.accent.cyan : 'transparent',
                      color: collaborateSubTab === 'me' ? 'white' : tokens.colors.text.muted,
                      fontSize: tokens.text.xs,
                      cursor: 'pointer',
                    }}
                  >
                    Me
                  </button>
                  <button
                    onClick={() => setCollaborateSubTab('team')}
                    style={{
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '3px',
                      background: collaborateSubTab === 'team' ? tokens.colors.accent.amber : 'transparent',
                      color: collaborateSubTab === 'team' ? 'white' : tokens.colors.text.muted,
                      fontSize: tokens.text.xs,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Team
                    <span style={{
                      padding: '0 4px',
                      background: collaborateSubTab === 'team' ? 'rgba(255,255,255,0.3)' : tokens.colors.bg.glass,
                      borderRadius: '6px',
                      fontSize: '9px',
                    }}>
                      {COLLABORATORS.filter(c => c.isOnline).length}
                    </span>
                  </button>
                </div>
                <Separator />
                <ToolbarBtn 
                  icon={Radio}
                  title="Show broadcasts only"
                  activeColor={tokens.colors.accent.red}
                />
              </>
            )}
            
            <div style={{ flex: 1 }} />
            
            {/* Views/Datasets panel toggle */}
            <ToolbarBtn 
              icon={sidePanelOpen ? PanelRightClose : PanelRightOpen}
              active={sidePanelOpen}
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              title="Views & Datasets"
              activeColor={tokens.colors.accent.teal}
            />
          </div>
          
          {/* === MINIMAP with grid background === */}
          <div style={{
            padding: '16px',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'auto',
            // Grid paper background - scales with cell size
            background: tokens.colors.bg.tertiary,
            backgroundImage: `
              linear-gradient(${tokens.colors.bg.gridLine} 1px, transparent 1px),
              linear-gradient(90deg, ${tokens.colors.bg.gridLine} 1px, transparent 1px)
            `,
            // Each grid square = 1 cell (cellSize + gap)
            backgroundSize: `${minimapCellSize + 4}px ${minimapCellSize + 4}px`,
          }}>
            {/* Focused VG Editor */}
            {focusedVGId && focusedVG ? (
              <FocusedVGEditor 
                vg={focusedVG}
                cellSize={minimapCellSize}
                showInternals={showInternals}
                getVGDisplayName={getVGDisplayName}
              />
            ) : (
              /* Canvas Overview */
              <div style={{ position: 'relative' }}>
                {/* Link lines (Links mode) */}
                {mapMode === 'links' && linksSubTab === 'vg' && displayMode === 'vg' && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: showGridLabels ? 20 : 0,
                      left: showGridLabels ? 24 : 0,
                      width: currentGridSize.cols * (minimapCellSize + 4),
                      height: currentGridSize.rows * (minimapCellSize + 4),
                      pointerEvents: 'none',
                      zIndex: 100,
                    }}
                  >
                    {vgLinks.map(link => {
                      const from = getVGCenter(link.from);
                      const to = getVGCenter(link.to);
                      if (!from || !to) return null;
                      
                      const isHighlighted = highlightedLinkId === link.id;
                      const linkColor = link.type === 'camera' 
                        ? tokens.colors.accent.cyan 
                        : tokens.colors.accent.purple;
                      
                      return (
                        <g key={link.id} style={{ cursor: 'pointer' }} onClick={() => handleLinkClick(link.id)}>
                          <line
                            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke={linkColor}
                            strokeWidth={isHighlighted ? 4 : 2}
                            strokeOpacity={isHighlighted ? 1 : 0.5}
                            strokeDasharray={link.mode === 'unidirectional' ? '6,4' : 'none'}
                            style={{ filter: isHighlighted ? `drop-shadow(0 0 6px ${linkColor})` : 'none' }}
                          />
                          {link.mode === 'unidirectional' && (
                            <circle cx={to.x} cy={to.y} r={5} fill={linkColor} opacity={isHighlighted ? 1 : 0.5} />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
                
                {/* Grid with labels */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Column headers (A, B, C, D...) */}
                  {showGridLabels && (
                    <div style={{ 
                      display: 'flex', 
                      marginLeft: '24px', // Space for row labels
                      marginBottom: '2px',
                    }}>
                      {Array.from({ length: currentGridSize.cols }).map((_, col) => (
                        <div
                          key={`col-${col}`}
                          style={{
                            width: minimapCellSize,
                            marginRight: '4px',
                            textAlign: 'center',
                            fontSize: minimapCellSize > 40 ? '10px' : '8px',
                            fontWeight: 600,
                            color: tokens.colors.text.muted,
                            fontFamily: 'monospace',
                          }}
                        >
                          {colToLetter(col)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Main grid area with row labels */}
                  <div style={{ display: 'flex' }}>
                    {/* Row labels (1, 2, 3, 4...) */}
                    {showGridLabels && (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        marginRight: '2px',
                      }}>
                        {Array.from({ length: currentGridSize.rows }).map((_, row) => (
                          <div
                            key={`row-${row}`}
                            style={{
                              height: minimapCellSize,
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              paddingRight: '4px',
                              fontSize: minimapCellSize > 40 ? '10px' : '8px',
                              fontWeight: 600,
                              color: tokens.colors.text.muted,
                              fontFamily: 'monospace',
                              minWidth: '20px',
                            }}
                          >
                            {row + 1}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Grid cells */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${currentGridSize.cols}, ${minimapCellSize}px)`,
                      gridTemplateRows: `repeat(${currentGridSize.rows}, ${minimapCellSize}px)`,
                      gap: '4px',
                      position: 'relative',
                    }}>
                  {/* Background cells */}
                  {Array.from({ length: currentGridSize.rows * currentGridSize.cols }).map((_, i) => {
                    const row = Math.floor(i / currentGridSize.cols);
                    const col = i % currentGridSize.cols;
                    // Only show home/bookmarks in VG mode (they use original canvas coords)
                    const isHome = displayMode === 'vg' && row === canvas.homePosition.row && col === canvas.homePosition.col;
                    const bookmark = displayMode === 'vg' ? BOOKMARKS.find(b => b.position.row === row && b.position.col === col) : null;
                    
                    return (
                      <div
                        key={`cell-${row}-${col}`}
                        style={{
                          gridRow: row + 1,
                          gridColumn: col + 1,
                          background: tokens.colors.bg.primary,
                          border: `1px solid ${tokens.colors.border.subtle}`,
                          borderRadius: '4px',
                          position: 'relative',
                        }}
                      >
                        {isHome && mapMode === 'navigate' && (
                          <Home size={10} style={{ position: 'absolute', top: 2, left: 2, color: tokens.colors.accent.amber, opacity: 0.6 }} />
                        )}
                        {bookmark && mapMode === 'navigate' && showBookmarks && (
                          <Bookmark size={10} fill={tokens.colors.accent.amber} style={{ position: 'absolute', top: 2, right: 2, color: tokens.colors.accent.amber }} />
                        )}
                      </div>
                    );
                  })}
                  
                  {/* ViewGroups (VG mode) */}
                  {displayMode === 'vg' && viewGroups.map(vg => {
                    const isSelected = selectedVGId === vg.id;
                    const isInvolvedInHighlightedLink = highlightedLinkId && (
                      vgLinks.find(l => l.id === highlightedLinkId)?.from === vg.id ||
                      vgLinks.find(l => l.id === highlightedLinkId)?.to === vg.id
                    );
                    const isGhosted = mapMode === 'links' && highlightedLinkId && !isInvolvedInHighlightedLink;
                    
                    return (
                      <VGBlock
                        key={vg.id}
                        vg={vg}
                        displayName={getVGDisplayName(vg)}
                        cellSize={minimapCellSize}
                        isSelected={isSelected}
                        isGhosted={isGhosted}
                        showInternals={mapMode === 'layout' && showInternals}
                        onClick={() => handleVGClick(vg.id)}
                        onDoubleClick={() => handleVGDoubleClick(vg.id)}
                      />
                    );
                  })}
                  
                  {/* Individual Views (View mode) - like current Navigator */}
                  {displayMode === 'view' && flattenedViews.map(view => (
                    <ViewCell
                      key={view.id}
                      view={view}
                      cellSize={minimapCellSize}
                      isSelected={selectedVGId === view.vgId}
                      onClick={() => handleVGClick(view.vgId)}
                      formatCellRef={formatCellRef}
                    />
                  ))}
                  
                  {/* Viewports */}
                  {showViewports && (mapMode === 'navigate' || mapMode === 'layout' || mapMode === 'collaborate') && 
                    viewports.map(vp => (
                      <ViewportIndicator
                        key={vp.id}
                        viewport={vp}
                        cellSize={minimapCellSize}
                        isSelected={selectedViewportId === vp.id}
                      />
                    ))
                  }
                  
                  {/* Collaborators */}
                  {showCollaborators && (mapMode === 'navigate' || mapMode === 'collaborate') && 
                    COLLABORATORS.filter(c => c.isOnline && c.viewport).map(collab => (
                      <CollaboratorIndicator
                        key={collab.id}
                        collaborator={collab}
                        cellSize={minimapCellSize}
                        showName={mapMode === 'collaborate'}
                      />
                    ))
                  }
                </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* === CONTEXTUAL PANEL === */}
          <div style={{
            borderTop: `1px solid ${tokens.colors.border.subtle}`,
            maxHeight: '240px',
            overflow: 'auto',
            flex: 1,
          }}>
            {/* Navigate mode */}
            {mapMode === 'navigate' && !focusedVGId && (
              <div style={{ padding: '12px' }}>
                {/* Quick Navigation - FIRST */}
                <SectionHeader title="Quick Navigation" icon={Navigation} color={tokens.colors.accent.blue} />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <ActionBtn icon={Home} label="Go Home" />
                  <ActionBtn icon={Crosshair} label="Set Home" />
                  <ActionBtn icon={Scan} label="Fit All" />
                  <ActionBtn icon={BookmarkPlus} label="Add Bookmark" />
                </div>
                
                {/* Bookmarks - SECOND */}
                <SectionHeader 
                  title="Bookmarks" 
                  icon={Bookmark} 
                  color={tokens.colors.accent.amber}
                  count={BOOKMARKS.length}
                />
                {/* Search */}
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                  placeholder="Search bookmarks..."
                />
                {filteredBookmarks.map(bm => (
                  <BookmarkItem key={bm.id} bookmark={bm} formatCellRef={formatCellRef} />
                ))}
              </div>
            )}
            
            {/* Layout mode */}
            {mapMode === 'layout' && !focusedVGId && (
              <div style={{ padding: '12px' }}>
                <SectionHeader 
                  title="On Canvas" 
                  icon={Package} 
                  color={tokens.colors.accent.green}
                  count={viewGroups.length}
                  action={<ToolbarBtn icon={Plus} size={14} />}
                />
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                  placeholder="Search groups..."
                />
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <FilterChip label="All" active />
                  <FilterChip label="Explicit" count={viewGroups.filter(v => v.isExplicit).length} />
                  <FilterChip label="Implicit" count={viewGroups.filter(v => !v.isExplicit).length} />
                </div>
                <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                  Drag VGs to reposition on canvas
                </p>
                {filteredVGs.map(vg => (
                  <VGListItem 
                    key={vg.id}
                    vg={vg}
                    displayName={getVGDisplayName(vg)}
                    isSelected={selectedVGId === vg.id}
                    onClick={() => handleVGClick(vg.id)}
                    onDoubleClick={() => handleVGDoubleClick(vg.id)}
                    formatRangeRef={formatRangeRef}
                  />
                ))}
                
                {/* Inactive VGs Section */}
                {inactiveVGs.length > 0 && (
                  <>
                    <SectionHeader 
                      title="Inactive" 
                      icon={EyeOff} 
                      color={tokens.colors.text.muted}
                      count={inactiveVGs.length}
                      style={{ marginTop: '16px' }}
                    />
                    <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                      Drag to canvas to restore, or click Restore
                    </p>
                    {inactiveVGs.map(vg => (
                      <VGListItem 
                        key={vg.id}
                        vg={vg}
                        displayName={getVGDisplayName(vg)}
                        isSelected={false}
                        onClick={() => {}}
                        onDoubleClick={() => {}}
                        formatRangeRef={formatRangeRef}
                        isInactive={true}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
            
            {/* Layout mode - Focused */}
            {mapMode === 'layout' && focusedVGId && focusedVG && (
              <div style={{ padding: '12px' }}>
                <SectionHeader 
                  title="Edit ViewGroup" 
                  icon={Pencil} 
                  color={focusedVG.color}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <ActionBtn icon={Grid3X3} label="Change Layout" />
                  <ActionBtn icon={Plus} label="Add View" />
                  <ActionBtn icon={Copy} label="Duplicate" />
                  <ActionBtn icon={Link2} label="Link" />
                  <ActionBtn icon={Save} label="Save Template" />
                </div>
                
                {!focusedVG.isExplicit && (
                  <div style={{
                    padding: '10px',
                    background: `${tokens.colors.accent.amber}12`,
                    border: `1px solid ${tokens.colors.accent.amber}30`,
                    borderRadius: '6px',
                    fontSize: tokens.text.xs,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tokens.colors.accent.amber, marginBottom: '4px' }}>
                      <AlertCircle size={12} />
                      <span style={{ fontWeight: 600 }}>Implicit Group</span>
                    </div>
                    <p style={{ color: tokens.colors.text.muted, margin: 0 }}>
                      Give this group a name to save or share it.
                    </p>
                    <button style={{
                      marginTop: '8px',
                      padding: '4px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      background: tokens.colors.accent.amber,
                      color: 'white',
                      fontSize: tokens.text.xs,
                      cursor: 'pointer',
                    }}>
                      Name this group
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Links mode */}
            {mapMode === 'links' && (
              <div style={{ padding: '12px' }}>
                {linksSubTab === 'vg' ? (
                  <>
                    <SectionHeader 
                      title="ViewGroup Links" 
                      icon={GitBranch} 
                      color={tokens.colors.accent.purple}
                      count={vgLinks.length}
                    />
                    <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                      Click a link line on the map to highlight
                    </p>
                    {vgLinks.map(link => {
                      const fromVG = viewGroups.find(v => v.id === link.from);
                      const toVG = viewGroups.find(v => v.id === link.to);
                      return (
                        <LinkItem
                          key={link.id}
                          link={link}
                          fromName={fromVG ? getVGDisplayName(fromVG) : '?'}
                          toName={toVG ? getVGDisplayName(toVG) : '?'}
                          fromColor={fromVG?.color}
                          toColor={toVG?.color}
                          isHighlighted={highlightedLinkId === link.id}
                          onClick={() => handleLinkClick(link.id)}
                        />
                      );
                    })}
                  </>
                ) : (
                  <>
                    <SectionHeader 
                      title="View Links" 
                      icon={Layers} 
                      color={tokens.colors.accent.blue}
                      count={viewLinks.length}
                    />
                    <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                      Links between individual views across VGs
                    </p>
                    {viewLinks.map(link => (
                      <ViewLinkItem key={link.id} link={link} allViews={ALL_VIEWS} />
                    ))}
                  </>
                )}
              </div>
            )}
            
            {/* Collaborate mode */}
            {mapMode === 'collaborate' && (
              <div style={{ padding: '12px' }}>
                {/* ME SUB-TAB */}
                {collaborateSubTab === 'me' && (
                  <>
                    <SectionHeader 
                      title="My Viewports" 
                      icon={Frame} 
                      color={tokens.colors.accent.cyan}
                      count={viewports.length}
                      action={<ToolbarBtn icon={Plus} size={14} title="New viewport" />}
                    />
                    {viewports.map(vp => (
                      <ViewportItem 
                        key={vp.id} 
                        viewport={vp} 
                        isSelected={selectedViewportId === vp.id}
                        onClick={() => setSelectedViewportId(vp.id)}
                        formatRangeRef={formatRangeRef}
                      />
                    ))}
                    
                    <SectionHeader 
                      title="My Status" 
                      icon={Radio} 
                      color={tokens.colors.accent.red}
                      style={{ marginTop: '16px' }}
                    />
                    <div style={{
                      padding: '10px',
                      background: tokens.colors.bg.glass,
                      borderRadius: '8px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginBottom: '8px',
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: tokens.colors.text.muted,
                        }} />
                        <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>
                          Not broadcasting
                        </span>
                      </div>
                      <button style={{
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        borderRadius: '6px',
                        background: `${tokens.colors.accent.red}20`,
                        color: tokens.colors.accent.red,
                        fontSize: tokens.text.sm,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}>
                        <Radio size={14} /> Start Broadcasting
                      </button>
                    </div>
                    
                    <div style={{
                      padding: '10px',
                      background: tokens.colors.bg.glass,
                      borderRadius: '8px',
                    }}>
                      <div style={{ 
                        fontSize: tokens.text.xs, 
                        color: tokens.colors.text.muted,
                        marginBottom: '6px',
                      }}>
                        Following
                      </div>
                      <div style={{ 
                        fontSize: tokens.text.sm, 
                        color: tokens.colors.text.secondary,
                        fontStyle: 'italic',
                      }}>
                        Nobody — click Follow on a team member
                      </div>
                    </div>
                  </>
                )}
                
                {/* TEAM SUB-TAB */}
                {collaborateSubTab === 'team' && (
                  <>
                    <SearchBar placeholder="Search team..." />
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <FilterChip 
                        label={`Online ${COLLABORATORS.filter(c => c.isOnline).length}`} 
                        active 
                      />
                      <FilterChip 
                        label={`All ${COLLABORATORS.length}`} 
                      />
                      <FilterChip 
                        label={`📡 Live ${COLLABORATORS.filter(c => c.isBroadcasting).length}`} 
                      />
                    </div>
                    
                    {/* Online & Broadcasting first */}
                    {COLLABORATORS.filter(c => c.isBroadcasting).length > 0 && (
                      <>
                        <div style={{ 
                          fontSize: tokens.text.xs, 
                          color: tokens.colors.accent.red,
                          fontWeight: 600,
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <Radio size={10} /> BROADCASTING
                        </div>
                        {COLLABORATORS.filter(c => c.isBroadcasting).map(collab => (
                          <CollaboratorItem 
                            key={collab.id} 
                            collaborator={collab} 
                            formatCellRef={formatCellRef}
                          />
                        ))}
                      </>
                    )}
                    
                    {/* Online but not broadcasting */}
                    {COLLABORATORS.filter(c => c.isOnline && !c.isBroadcasting).length > 0 && (
                      <>
                        <div style={{ 
                          fontSize: tokens.text.xs, 
                          color: tokens.colors.accent.green,
                          fontWeight: 600,
                          marginTop: '12px',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tokens.colors.accent.green }} />
                          ONLINE
                        </div>
                        {COLLABORATORS.filter(c => c.isOnline && !c.isBroadcasting).map(collab => (
                          <CollaboratorItem 
                            key={collab.id} 
                            collaborator={collab} 
                            formatCellRef={formatCellRef}
                          />
                        ))}
                      </>
                    )}
                    
                    {/* Offline */}
                    {COLLABORATORS.filter(c => !c.isOnline).length > 0 && (
                      <>
                        <div style={{ 
                          fontSize: tokens.text.xs, 
                          color: tokens.colors.text.muted,
                          fontWeight: 600,
                          marginTop: '12px',
                          marginBottom: '6px',
                        }}>
                          OFFLINE
                        </div>
                        {COLLABORATORS.filter(c => !c.isOnline).map(collab => (
                          <CollaboratorItem 
                            key={collab.id} 
                            collaborator={collab} 
                            formatCellRef={formatCellRef}
                            isOffline
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div style={{
            padding: '8px 12px',
            borderTop: `1px solid ${tokens.colors.border.subtle}`,
            background: tokens.colors.bg.tertiary,
            fontSize: tokens.text.xs,
            color: tokens.colors.text.muted,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ flex: 1 }}>
              {focusedVGId ? `Editing: ${getVGDisplayName(focusedVG)}` : `${currentMode.name} • ${currentMode.description}`}
            </span>
            {/* Show current viewport position */}
            {selectedViewportId && viewports.find(v => v.id === selectedViewportId) && (
              <span style={{ 
                fontFamily: 'monospace', 
                color: tokens.colors.accent.cyan,
                padding: '2px 6px',
                background: `${tokens.colors.accent.cyan}15`,
                borderRadius: '3px',
              }}>
                {formatRangeRef(
                  viewports.find(v => v.id === selectedViewportId).position.row,
                  viewports.find(v => v.id === selectedViewportId).position.col,
                  viewports.find(v => v.id === selectedViewportId).size.rows,
                  viewports.find(v => v.id === selectedViewportId).size.cols
                )}
              </span>
            )}
            <Settings size={12} style={{ cursor: 'pointer' }} />
          </div>
        </div>
        
        {/* === SIDE PANEL (Views/Datasets) === */}
        {sidePanelOpen && (
          <div style={{
            width: '280px',
            background: tokens.colors.bg.secondary,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}>
              <button
                onClick={() => setSidePanelTab('views')}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  background: sidePanelTab === 'views' ? tokens.colors.bg.tertiary : 'transparent',
                  borderBottom: sidePanelTab === 'views' ? `2px solid ${tokens.colors.accent.teal}` : '2px solid transparent',
                  color: sidePanelTab === 'views' ? tokens.colors.accent.teal : tokens.colors.text.muted,
                  fontSize: tokens.text.sm,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Layers size={14} /> Views
                <span style={{
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: sidePanelTab === 'views' ? tokens.colors.accent.teal : tokens.colors.bg.glass,
                  color: sidePanelTab === 'views' ? 'white' : tokens.colors.text.muted,
                  fontSize: '9px',
                }}>
                  {ALL_VIEWS.length}
                </span>
              </button>
              <button
                onClick={() => setSidePanelTab('datasets')}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  background: sidePanelTab === 'datasets' ? tokens.colors.bg.tertiary : 'transparent',
                  borderBottom: sidePanelTab === 'datasets' ? `2px solid ${tokens.colors.accent.blue}` : '2px solid transparent',
                  color: sidePanelTab === 'datasets' ? tokens.colors.accent.blue : tokens.colors.text.muted,
                  fontSize: tokens.text.sm,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Database size={14} /> Datasets
                <span style={{
                  padding: '1px 5px',
                  borderRadius: '8px',
                  background: sidePanelTab === 'datasets' ? tokens.colors.accent.blue : tokens.colors.bg.glass,
                  color: sidePanelTab === 'datasets' ? 'white' : tokens.colors.text.muted,
                  fontSize: '9px',
                }}>
                  {DATASETS.length}
                </span>
              </button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '12px', maxHeight: '500px', overflow: 'auto' }}>
              {sidePanelTab === 'views' && (
                <>
                  <SearchBar placeholder="Search views..." />
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <FilterChip label="All" active />
                    <FilterChip label="Slice" count={ALL_VIEWS.filter(v => v.type === 'slice').length} />
                    <FilterChip label="Volume" count={ALL_VIEWS.filter(v => v.type === 'volume').length} />
                  </div>
                  <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                    Drag views to the canvas map
                  </p>
                  {ALL_VIEWS.map(view => (
                    <ViewListItem key={view.id} view={view} />
                  ))}
                </>
              )}
              
              {sidePanelTab === 'datasets' && (
                <>
                  <SearchBar placeholder="Search datasets..." />
                  <p style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: '8px' }}>
                    Drag to create a new view
                  </p>
                  {DATASETS.map(ds => (
                    <DatasetItem key={ds.id} dataset={ds} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* === CANVAS OPERATIONS PANEL === */}
        <div style={{
          width: '340px',
          background: tokens.colors.bg.secondary,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            background: tokens.colors.bg.tertiary,
          }}>
            <LayoutGrid size={16} style={{ color: tokens.colors.accent.teal }} />
            <span style={{ fontSize: tokens.text.lg, fontWeight: 600 }}>Canvas Operations</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>—</span>
            <X size={14} style={{ color: tokens.colors.text.muted, cursor: 'pointer' }} />
          </div>
          
          {/* Tabs */}
          <div style={{
            display: 'flex',
            padding: '0 12px',
            gap: '4px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          }}>
            {[
              { id: 'transaction', label: 'Transaction', icon: LayoutGrid, color: tokens.colors.accent.purple },
              { id: 'audit', label: 'Audit Log', icon: History, color: tokens.colors.accent.teal, badge: 1 },
              { id: 'users', label: 'Users', icon: Users, color: null },
              { id: 'savepoints', label: 'Save Points', icon: Save, color: null },
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: tab.color || tokens.colors.text.muted,
                  fontSize: tokens.text.sm,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    right: '4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: tokens.colors.accent.blue,
                    color: 'white',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Sub-toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          }}>
            <div style={{ display: 'flex', background: tokens.colors.bg.glass, borderRadius: '4px', padding: '2px' }}>
              <button style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '3px',
                background: tokens.colors.bg.glassHover,
                color: tokens.colors.text.primary,
                fontSize: tokens.text.xs,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Hash size={12} /> Grouped
              </button>
              <button style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '3px',
                background: 'transparent',
                color: tokens.colors.text.muted,
                fontSize: tokens.text.xs,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <List size={12} /> Timeline
              </button>
            </div>
            
            <div style={{ flex: 1 }} />
            
            <button style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '4px',
              background: tokens.colors.bg.glass,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}>
              <SortDesc size={14} />
            </button>
            <button style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: '4px',
              background: 'transparent',
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}>
              <SortAsc size={14} />
            </button>
          </div>
          
          {/* Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          }}>
            <User size={14} style={{ color: tokens.colors.text.muted }} />
            <select style={{
              padding: '6px 10px',
              background: tokens.colors.bg.glass,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: '6px',
              color: tokens.colors.text.primary,
              fontSize: tokens.text.sm,
            }}>
              <option>All users</option>
            </select>
            
            <div style={{
              padding: '6px 10px',
              background: `${tokens.colors.accent.blue}20`,
              border: `1px solid ${tokens.colors.accent.blue}40`,
              borderRadius: '6px',
              color: tokens.colors.text.primary,
              fontSize: tokens.text.sm,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              Type
              <span style={{
                padding: '1px 6px',
                background: tokens.colors.accent.blue,
                borderRadius: '4px',
                color: 'white',
                fontSize: '10px',
              }}>
                9
              </span>
            </div>
            
            <select style={{
              padding: '6px 10px',
              background: tokens.colors.bg.glass,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: '6px',
              color: tokens.colors.text.primary,
              fontSize: tokens.text.sm,
            }}>
              <option>All time</option>
            </select>
          </div>
          
          {/* Content placeholder */}
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center',
            color: tokens.colors.text.muted,
            fontSize: tokens.text.sm,
          }}>
            <History size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Operations will appear here</p>
            <p style={{ fontSize: tokens.text.xs }}>Track changes, undo/redo, save points</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const ToolbarBtn = ({ icon: Icon, onClick, active, activeColor, title, size = 14 }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      border: 'none',
      borderRadius: '4px',
      background: active ? `${activeColor || tokens.colors.accent.blue}20` : 'transparent',
      color: active ? (activeColor || tokens.colors.accent.blue) : tokens.colors.text.muted,
      cursor: 'pointer',
    }}
  >
    <Icon size={size} />
  </button>
);

// Tiny pixel-art style layout preview (max 10x10 pixels per cell)
const LayoutMiniPreview = ({ layoutId, color, viewCount = 0, size = 16 }) => {
  const layout = LAYOUTS[layoutId] || LAYOUTS.single;
  const cellSize = Math.floor(size / Math.max(layout.rows, layout.cols));
  const gap = 1;
  
  // Generate cell positions based on layout type
  const getCells = () => {
    if (layout.merged === 'top') {
      // 1+2 layout: top spans full width, bottom has 2 cells
      return [
        { row: 0, col: 0, rowSpan: 1, colSpan: 2 },
        { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
        { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      ];
    }
    if (layout.merged === 'right') {
      // 2+1 layout: left has 2 stacked, right spans full height
      return [
        { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
        { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
        { row: 0, col: 1, rowSpan: 2, colSpan: 1 },
      ];
    }
    // Regular grid
    const cells = [];
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        cells.push({ row: r, col: c, rowSpan: 1, colSpan: 1 });
      }
    }
    return cells;
  };
  
  const cells = getCells();
  const totalWidth = layout.cols * cellSize + (layout.cols - 1) * gap;
  const totalHeight = layout.rows * cellSize + (layout.rows - 1) * gap;
  
  return (
    <div style={{
      width: totalWidth,
      height: totalHeight,
      position: 'relative',
      flexShrink: 0,
    }}>
      {cells.map((cell, i) => {
        const hasView = i < viewCount;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cell.col * (cellSize + gap),
              top: cell.row * (cellSize + gap),
              width: cell.colSpan * cellSize + (cell.colSpan - 1) * gap,
              height: cell.rowSpan * cellSize + (cell.rowSpan - 1) * gap,
              background: hasView ? color : `${color}40`,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
};

const Separator = () => (
  <div style={{ width: '1px', height: '16px', background: tokens.colors.border.default, margin: '0 2px' }} />
);

const SectionHeader = ({ title, icon: Icon, color, count, action, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', ...style }}>
    {Icon && <Icon size={12} style={{ color }} />}
    <span style={{ fontSize: tokens.text.xs, fontWeight: 600, color: tokens.colors.text.muted, textTransform: 'uppercase', flex: 1 }}>
      {title}
    </span>
    {count !== undefined && (
      <span style={{ fontSize: '9px', padding: '1px 5px', background: tokens.colors.bg.glass, borderRadius: '8px', color: tokens.colors.text.muted }}>
        {count}
      </span>
    )}
    {action}
  </div>
);

const ActionBtn = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    background: tokens.colors.bg.glass,
    color: tokens.colors.text.secondary,
    fontSize: tokens.text.xs,
    cursor: 'pointer',
  }}>
    <Icon size={12} />
    {label}
  </button>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: tokens.colors.bg.glass,
    border: `1px solid ${tokens.colors.border.subtle}`,
    borderRadius: '6px',
    marginBottom: '8px',
  }}>
    <Search size={12} style={{ color: tokens.colors.text.muted }} />
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        border: 'none',
        background: 'transparent',
        color: tokens.colors.text.primary,
        fontSize: tokens.text.sm,
        outline: 'none',
      }}
    />
  </div>
);

const FilterChip = ({ label, count, active }) => (
  <button style={{
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    background: active ? tokens.colors.accent.teal : tokens.colors.bg.glass,
    color: active ? 'white' : tokens.colors.text.muted,
    fontSize: tokens.text.xs,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }}>
    {label}
    {count !== undefined && <span style={{ opacity: 0.7 }}>{count}</span>}
  </button>
);

const VGBlock = ({ vg, displayName, cellSize, isSelected, isGhosted, showInternals, onClick, onDoubleClick }) => {
  const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;
  
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        gridRow: `${vg.position.row + 1} / span ${vg.position.rowSpan}`,
        gridColumn: `${vg.position.col + 1} / span ${vg.position.colSpan}`,
        background: `${vg.color}${isGhosted ? '10' : isSelected ? '40' : '25'}`,
        border: `2px ${vg.isExplicit ? 'solid' : 'dashed'} ${vg.color}${isGhosted ? '30' : isSelected ? 'ff' : '80'}`,
        borderRadius: '6px',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 12px ${vg.color}50` : 'none',
        opacity: isGhosted ? 0.4 : 1,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <div style={{
        fontSize: cellSize > 40 ? tokens.text.xs : '8px',
        fontWeight: 600,
        color: vg.color,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: showInternals ? '4px' : 0,
      }}>
        {displayName}
      </div>
      
      {showInternals && cellSize > 35 && (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gap: '2px',
        }}>
          {vg.views.map((view, i) => {
            const viewType = VIEW_TYPES[view.type];
            return (
              <div key={view.id} style={{
                background: `${viewType.color}30`,
                border: `1px solid ${viewType.color}50`,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
              }}>
                {cellSize > 50 && viewType.icon}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, layout.cells - vg.views.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              background: tokens.colors.bg.glass,
              border: `1px dashed ${tokens.colors.border.subtle}`,
              borderRadius: '2px',
            }} />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual View cell for "Views" mode (like the current Navigator)
const ViewCell = ({ view, cellSize, isSelected, onClick, formatCellRef }) => {
  const viewType = VIEW_TYPES[view.type];
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        gridRow: view.canvasRow + 1,
        gridColumn: view.canvasCol + 1,
        // No span - each view is exactly 1×1
        background: isSelected ? `${viewType.color}40` : `${viewType.color}25`,
        border: `2px solid ${isSelected ? viewType.color : `${viewType.color}60`}`,
        borderRadius: '6px',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 12px ${viewType.color}50` : 'none',
        zIndex: isSelected ? 10 : 1,
        position: 'relative',
      }}
    >
      {/* View icon */}
      <span style={{ fontSize: cellSize > 40 ? '16px' : '12px' }}>
        {viewType.icon}
      </span>
      
      {/* View name (only if cell is big enough) */}
      {cellSize > 50 && (
        <div style={{
          fontSize: '8px',
          fontWeight: 500,
          color: viewType.color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          textAlign: 'center',
        }}>
          {view.name.length > 10 ? view.name.substring(0, 8) + '...' : view.name}
        </div>
      )}
      
      {/* Hover tooltip */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '6px',
          padding: '8px 10px',
          background: tokens.colors.bg.secondary,
          border: `1px solid ${viewType.color}50`,
          borderRadius: '6px',
          fontSize: tokens.text.xs,
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: 600, color: viewType.color, marginBottom: '4px' }}>
            {view.name}
          </div>
          <div style={{ color: tokens.colors.text.muted, marginBottom: '2px' }}>
            Dataset: {view.name.replace('View of ', '')}
          </div>
          <div style={{ 
            color: tokens.colors.accent.amber, 
            fontFamily: 'monospace',
            fontWeight: 600,
          }}>
            {formatCellRef(view.canvasRow, view.canvasCol)}
          </div>
        </div>
      )}
    </div>
  );
};

const ViewportIndicator = ({ viewport, cellSize, isSelected }) => (
  <div style={{
    gridRow: `${viewport.position.row + 1} / span ${viewport.size.rows}`,
    gridColumn: `${viewport.position.col + 1} / span ${viewport.size.cols}`,
    border: `2px ${viewport.mode === 'snap' ? 'solid' : 'dashed'} ${tokens.colors.accent.cyan}`,
    borderRadius: '6px',
    background: `${tokens.colors.accent.cyan}10`,
    boxShadow: isSelected ? `0 0 12px ${tokens.colors.accent.cyan}50` : `0 0 6px ${tokens.colors.accent.cyan}30`,
    pointerEvents: 'none',
    zIndex: 15,
    position: 'relative',
  }}>
    <div style={{
      position: 'absolute',
      top: '3px',
      left: '3px',
      padding: '2px 5px',
      background: tokens.colors.accent.cyan,
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: 600,
      color: 'white',
    }}>
      {viewport.isPrimary && '★ '}{viewport.name}
    </div>
  </div>
);

const CollaboratorIndicator = ({ collaborator, cellSize, showName }) => (
  <div style={{
    gridRow: `${collaborator.viewport.row + 1} / span ${collaborator.viewport.rows}`,
    gridColumn: `${collaborator.viewport.col + 1} / span ${collaborator.viewport.cols}`,
    border: `1px dashed ${collaborator.color}`,
    borderRadius: '6px',
    background: `${collaborator.color}08`,
    pointerEvents: 'none',
    zIndex: 5,
    position: 'relative',
  }}>
    <div style={{
      position: 'absolute',
      top: '-8px',
      left: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      padding: '1px 5px',
      background: collaborator.color,
      borderRadius: '8px',
      fontSize: '9px',
      color: 'white',
    }}>
      {collaborator.avatar}
      {showName && collaborator.name.split(' ')[1]}
      {collaborator.isBroadcasting && <Radio size={8} />}
    </div>
  </div>
);

// Flat view block for "Views" mode - shows individual views on the grid
const FlatViewBlock = ({ view, viewType, cellSize, isSelected, formatCellRef }) => {
  // Using a ref for hover state to avoid useState in a component that may remount
  const [hovered, setHovered] = React.useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridRow: `${Math.floor(view.canvasRow) + 1} / span ${Math.max(1, Math.round(view.canvasRowSpan))}`,
        gridColumn: `${Math.floor(view.canvasCol) + 1} / span ${Math.max(1, Math.round(view.canvasColSpan))}`,
        background: `${viewType.color}30`,
        border: `2px solid ${isSelected ? viewType.color : `${viewType.color}60`}`,
        borderRadius: '6px',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 10px ${viewType.color}50` : 'none',
        position: 'relative',
        zIndex: isSelected || hovered ? 10 : 1,
      }}
    >
      {/* View icon */}
      <span style={{ fontSize: cellSize > 40 ? '14px' : '10px' }}>
        {viewType.icon}
      </span>
      
      {/* View name (if space permits) */}
      {cellSize > 45 && (
        <div style={{
          fontSize: '8px',
          fontWeight: 600,
          color: viewType.color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          textAlign: 'center',
        }}>
          {view.name.length > 12 ? view.name.substring(0, 10) + '...' : view.name}
        </div>
      )}
      
      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '6px',
          padding: '6px 10px',
          background: tokens.colors.bg.secondary,
          border: `1px solid ${viewType.color}60`,
          borderRadius: '6px',
          fontSize: tokens.text.xs,
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: 600, color: viewType.color, marginBottom: '2px' }}>
            {view.name}
          </div>
          <div style={{ color: tokens.colors.text.muted, fontSize: '9px' }}>
            {viewType.name} • {view.vgName || 'Implicit VG'}
          </div>
          <div style={{ 
            color: tokens.colors.text.muted, 
            fontSize: '9px',
            fontFamily: 'monospace',
            marginTop: '2px',
          }}>
            {formatCellRef(Math.floor(view.canvasRow), Math.floor(view.canvasCol))}
          </div>
        </div>
      )}
    </div>
  );
};

const FocusedVGEditor = ({ vg, cellSize, showInternals, getVGDisplayName }) => {
  const layout = LAYOUTS[vg.layoutId] || LAYOUTS.single;
  const editorCellSize = Math.max(65, cellSize);
  
  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${layout.rows}, ${editorCellSize}px)`,
        gridTemplateColumns: `repeat(${layout.cols}, ${editorCellSize}px)`,
        gap: '6px',
      }}>
        {vg.views.map((view) => {
          const viewType = VIEW_TYPES[view.type];
          return (
            <div key={view.id} style={{
              background: `${viewType.color}20`,
              border: `2px solid ${viewType.color}`,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'grab',
            }}>
              <span style={{ fontSize: '20px' }}>{viewType.icon}</span>
              <span style={{ fontSize: tokens.text.xs, fontWeight: 500, color: viewType.color, textAlign: 'center', padding: '0 4px' }}>
                {view.name}
              </span>
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, layout.cells - vg.views.length) }).map((_, i) => (
          <div key={`empty-${i}`} style={{
            background: tokens.colors.bg.glass,
            border: `2px dashed ${tokens.colors.border.default}`,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: tokens.colors.text.muted,
          }}>
            <Plus size={20} />
            <span style={{ fontSize: tokens.text.xs }}>Add View</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BookmarkItem = ({ bookmark, formatCellRef }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    marginBottom: '4px',
    background: tokens.colors.bg.glass,
    borderRadius: '6px',
    cursor: 'pointer',
  }}>
    <Bookmark size={12} style={{ color: tokens.colors.accent.amber }} />
    <span style={{ flex: 1, fontSize: tokens.text.sm }}>{bookmark.name}</span>
    <span style={{ 
      fontSize: tokens.text.xs, 
      color: tokens.colors.accent.amber,
      fontFamily: 'monospace',
      fontWeight: 600,
      padding: '2px 6px',
      background: `${tokens.colors.accent.amber}15`,
      borderRadius: '3px',
    }}>
      {formatCellRef ? formatCellRef(bookmark.position.row, bookmark.position.col) : `(${bookmark.position.col}, ${bookmark.position.row})`}
    </span>
  </div>
);

const VGListItem = ({ vg, displayName, isSelected, onClick, onDoubleClick, formatRangeRef, isInactive = false }) => (
  <div 
    onClick={onClick} 
    onDoubleClick={onDoubleClick} 
    draggable={!isInactive}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      marginBottom: '4px',
      background: isSelected ? `${vg.color}15` : tokens.colors.bg.glass,
      border: `1px solid ${isSelected ? vg.color : 'transparent'}`,
      borderRadius: '6px',
      cursor: isInactive ? 'default' : 'grab',
      opacity: isInactive ? 0.5 : 1,
    }}
  >
    {/* Tiny layout preview */}
    <LayoutMiniPreview 
      layoutId={vg.layoutId} 
      color={vg.color} 
      viewCount={vg.views.length}
      size={18}
    />
    <span style={{ flex: 1, fontSize: tokens.text.sm }}>{displayName}</span>
    <span style={{ 
      fontSize: '9px', 
      color: tokens.colors.text.muted,
      fontFamily: 'monospace',
    }}>
      {formatRangeRef && !isInactive ? formatRangeRef(vg.position.row, vg.position.col, vg.position.rowSpan, vg.position.colSpan) : ''}
    </span>
    {!isInactive && (
      <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>{vg.views.length}v</span>
    )}
    {!vg.isExplicit && !isInactive && (
      <span style={{ fontSize: '8px', padding: '1px 4px', background: `${tokens.colors.accent.amber}20`, color: tokens.colors.accent.amber, borderRadius: '3px' }}>
        implicit
      </span>
    )}
    {isInactive && (
      <button 
        onClick={(e) => { e.stopPropagation(); /* TODO: restore */ }}
        style={{
          padding: '2px 6px',
          border: 'none',
          borderRadius: '3px',
          background: `${tokens.colors.accent.green}20`,
          color: tokens.colors.accent.green,
          fontSize: '9px',
          cursor: 'pointer',
        }}
      >
        Restore
      </button>
    )}
  </div>
);

const LinkItem = ({ link, fromName, toName, fromColor, toColor, isHighlighted, onClick }) => (
  <div onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    marginBottom: '4px',
    background: isHighlighted ? `${tokens.colors.accent.purple}15` : tokens.colors.bg.glass,
    border: `1px solid ${isHighlighted ? tokens.colors.accent.purple : 'transparent'}`,
    borderRadius: '6px',
    cursor: 'pointer',
  }}>
    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: fromColor }} />
    <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.secondary }}>{fromName}</span>
    <span style={{ color: tokens.colors.text.muted }}>{link.mode === 'bidirectional' ? '↔' : '→'}</span>
    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: toColor }} />
    <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.secondary }}>{toName}</span>
    <span style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 6px', background: `${tokens.colors.accent.purple}20`, color: tokens.colors.accent.purple, borderRadius: '3px' }}>
      {link.type}
    </span>
  </div>
);

const ViewLinkItem = ({ link, allViews }) => {
  const linkedViews = link.views.map(vId => allViews.find(v => v.id === vId)).filter(Boolean);
  
  return (
    <div style={{
      padding: '8px',
      marginBottom: '4px',
      background: tokens.colors.bg.glass,
      borderRadius: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <Link2 size={10} style={{ color: tokens.colors.accent.blue }} />
        <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.secondary, fontWeight: 600 }}>{link.type}</span>
        <span style={{ fontSize: '9px', color: tokens.colors.text.muted }}>• {link.mode}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {linkedViews.map(view => (
          <span key={view.id} style={{
            padding: '2px 6px',
            background: `${VIEW_TYPES[view.type].color}20`,
            color: VIEW_TYPES[view.type].color,
            borderRadius: '3px',
            fontSize: '9px',
          }}>
            {view.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const CollaboratorItem = ({ collaborator, formatCellRef, isOffline = false }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    marginBottom: '6px',
    background: tokens.colors.bg.glass,
    border: `1px solid ${isOffline ? tokens.colors.border.subtle : `${collaborator.color}30`}`,
    borderRadius: '8px',
    opacity: isOffline ? 0.5 : 1,
  }}>
    <span style={{ fontSize: '18px' }}>{collaborator.avatar}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: tokens.text.sm, fontWeight: 500 }}>{collaborator.name}</div>
      <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
        {collaborator.viewport && formatCellRef ? (
          <>at <span style={{ fontFamily: 'monospace', color: collaborator.color }}>
            {formatCellRef(collaborator.viewport.row, collaborator.viewport.col)}
          </span></>
        ) : isOffline ? (
          'Last seen 2h ago'
        ) : (
          'No viewport open'
        )}
      </div>
    </div>
    {collaborator.isBroadcasting && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: `${tokens.colors.accent.red}20`,
        borderRadius: '4px',
        color: tokens.colors.accent.red,
        fontSize: tokens.text.xs,
      }}>
        <Radio size={10} /> Live
      </div>
    )}
    {!isOffline && (
      <button style={{
        padding: '5px 8px',
        border: 'none',
        borderRadius: '4px',
        background: `${collaborator.color}20`,
        color: collaborator.color,
        fontSize: tokens.text.xs,
        cursor: 'pointer',
      }}>
        Follow
      </button>
    )}
  </div>
);

const ViewportItem = ({ viewport, isSelected, onClick, formatRangeRef }) => (
  <div onClick={onClick} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    marginBottom: '4px',
    background: isSelected ? `${tokens.colors.accent.cyan}15` : tokens.colors.bg.glass,
    border: `1px solid ${isSelected ? tokens.colors.accent.cyan : 'transparent'}`,
    borderRadius: '6px',
    cursor: 'pointer',
  }}>
    <div style={{
      width: '18px',
      height: '12px',
      border: `2px ${viewport.mode === 'snap' ? 'solid' : 'dashed'} ${tokens.colors.accent.cyan}`,
      borderRadius: '2px',
    }} />
    <span style={{ flex: 1, fontSize: tokens.text.sm }}>
      {viewport.isPrimary && '★ '}{viewport.name}
    </span>
    <span style={{ 
      fontSize: '9px', 
      color: tokens.colors.accent.cyan,
      fontFamily: 'monospace',
      fontWeight: 600,
    }}>
      {formatRangeRef ? formatRangeRef(viewport.position.row, viewport.position.col, viewport.size.rows, viewport.size.cols) : ''}
    </span>
  </div>
);

const ViewListItem = ({ view }) => {
  const viewType = VIEW_TYPES[view.type];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      marginBottom: '4px',
      background: tokens.colors.bg.glass,
      borderRadius: '6px',
      cursor: 'grab',
    }}>
      <span style={{ fontSize: '14px' }}>{viewType.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: tokens.text.sm }}>{view.name}</div>
        <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
          in {view.vgName || 'Implicit'}
        </div>
      </div>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '2px',
        background: view.vgColor,
      }} />
    </div>
  );
};

const DatasetItem = ({ dataset }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    marginBottom: '4px',
    background: tokens.colors.bg.glass,
    borderRadius: '6px',
    cursor: 'grab',
  }}>
    <Database size={14} style={{ color: tokens.colors.accent.blue }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: tokens.text.sm }}>{dataset.name}</div>
      <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
        {dataset.type} • {dataset.size}
      </div>
    </div>
  </div>
);

export default CanvasMapRefined;
