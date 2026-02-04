import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  X, ChevronRight, ChevronDown, GripVertical, Plus, Search,
  Box, BarChart3, Table2, Image, Activity, Layers2, Database,
  FileText, Grid3X3, Sparkles, Filter, SortAsc, Check, Package,
  Users, User, Globe, ArrowLeft, Trash2, Link2, Unlink,
  Combine, SquareSplitHorizontal, Save, Settings, Copy,
  MoreHorizontal, Palette, Eye, AlertTriangle, ChevronUp,
  LayoutGrid, Move, Pencil, Share2, FolderOpen, List
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  colors: {
    bg: {
      primary: '#060a12',
      secondary: '#0c1220',
      tertiary: '#121a2e',
      elevated: '#1a2240',
    },
    glass: {
      subtle: 'rgba(96, 165, 250, 0.03)',
      medium: 'rgba(96, 165, 250, 0.08)',
      strong: 'rgba(96, 165, 250, 0.12)',
    },
    border: {
      subtle: 'rgba(96, 165, 250, 0.08)',
      default: 'rgba(96, 165, 250, 0.15)',
      strong: 'rgba(96, 165, 250, 0.25)',
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.8)',
      muted: 'rgba(148, 163, 184, 0.6)',
    },
    accent: {
      blue: '#3b82f6',
      cyan: '#22d3ee',
      amber: '#f59e0b',
      purple: '#a855f7',
      green: '#22c55e',
      red: '#ef4444',
      pink: '#ec4899',
      teal: '#14b8a6',
    },
  },
  radius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  fontSize: { xxs: '9px', xs: '10px', sm: '12px', md: '13px', lg: '14px' },
};

// =============================================================================
// VG EDITOR CONTEXT (Multi-Editor State Management)
// =============================================================================
// This context tracks all open VG Editors and which one is "active".
// The companion panel subscribes to this to know where to send drops.

const VGEditorContext = React.createContext(null);

const useVGEditorContext = () => {
  const ctx = React.useContext(VGEditorContext);
  if (!ctx) throw new Error('useVGEditorContext must be used within VGEditorProvider');
  return ctx;
};

const VGEditorProvider = ({ children }) => {
  // Map of panelId -> editor info
  const [openEditors, setOpenEditors] = useState(new Map());
  const [activeEditorId, setActiveEditorId] = useState(null);

  // Register an editor when it opens
  const registerEditor = useCallback((panelId, vgData) => {
    setOpenEditors(prev => {
      const next = new Map(prev);
      next.set(panelId, {
        panelId,
        vgId: vgData.id,
        vgName: vgData.name,
        vgColor: vgData.color,
        isNew: vgData.isNew || false,
      });
      return next;
    });
    // New editor becomes active
    setActiveEditorId(panelId);
  }, []);

  // Unregister an editor when it closes
  const unregisterEditor = useCallback((panelId) => {
    setOpenEditors(prev => {
      const next = new Map(prev);
      next.delete(panelId);
      return next;
    });
    // If this was the active editor, switch to another (or null)
    setActiveEditorId(prev => {
      if (prev !== panelId) return prev;
      // Find another open editor
      const remaining = Array.from(openEditors.keys()).filter(id => id !== panelId);
      return remaining.length > 0 ? remaining[0] : null;
    });
  }, [openEditors]);

  // Update editor info (e.g., when VG name/color changes)
  const updateEditor = useCallback((panelId, updates) => {
    setOpenEditors(prev => {
      const next = new Map(prev);
      const existing = next.get(panelId);
      if (existing) {
        next.set(panelId, { ...existing, ...updates });
      }
      return next;
    });
  }, []);

  // Set an editor as active (on focus/click)
  const setActive = useCallback((panelId) => {
    if (openEditors.has(panelId)) {
      setActiveEditorId(panelId);
    }
  }, [openEditors]);

  // Get active editor info
  const activeEditor = activeEditorId ? openEditors.get(activeEditorId) : null;

  const value = useMemo(() => ({
    openEditors,
    activeEditorId,
    activeEditor,
    registerEditor,
    unregisterEditor,
    updateEditor,
    setActive,
    editorCount: openEditors.size,
  }), [openEditors, activeEditorId, activeEditor, registerEditor, unregisterEditor, updateEditor, setActive]);

  return (
    <VGEditorContext.Provider value={value}>
      {children}
    </VGEditorContext.Provider>
  );
};

// =============================================================================
// CANVAS MAP CONTEXT (for canvas-level editing)
// =============================================================================
// Tracks when the user is actively editing the canvas map layout.
// The companion panel uses this to switch to canvas-appropriate tabs.

const CanvasMapContext = React.createContext(null);

const CanvasMapProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [placedVGIds, setPlacedVGIds] = useState(['vg-1', 'vg-2']); // VGs already on canvas

  const activateCanvasMap = useCallback(() => setIsActive(true), []);
  const deactivateCanvasMap = useCallback(() => setIsActive(false), []);
  
  const placeVG = useCallback((vgId) => {
    setPlacedVGIds(prev => prev.includes(vgId) ? prev : [...prev, vgId]);
  }, []);
  
  const removeVG = useCallback((vgId) => {
    setPlacedVGIds(prev => prev.filter(id => id !== vgId));
  }, []);

  const value = useMemo(() => ({
    isActive,
    placedVGIds,
    activateCanvasMap,
    deactivateCanvasMap,
    placeVG,
    removeVG,
  }), [isActive, placedVGIds, activateCanvasMap, deactivateCanvasMap, placeVG, removeVG]);

  return (
    <CanvasMapContext.Provider value={value}>
      {children}
    </CanvasMapContext.Provider>
  );
};

// =============================================================================
// VIEW TYPE CONFIG
// =============================================================================

const VIEW_TYPE_CONFIG = {
  volume:     { label: 'Volume',     icon: Box,      color: tokens.colors.accent.purple },
  slice:      { label: 'Slice',      icon: Layers2,  color: tokens.colors.accent.blue },
  mesh:       { label: 'Mesh',       icon: Activity,  color: tokens.colors.accent.cyan },
  chart:      { label: 'Chart',      icon: BarChart3, color: tokens.colors.accent.amber },
  table:      { label: 'Table',      icon: Table2,    color: tokens.colors.accent.green },
  stats:      { label: 'Stats',      icon: FileText,  color: tokens.colors.accent.teal },
  image:      { label: 'Image',      icon: Image,     color: tokens.colors.accent.pink },
  pointcloud: { label: 'Point Cloud', icon: Sparkles,  color: tokens.colors.accent.red },
};

// =============================================================================
// SCOPE CONFIG
// =============================================================================

const SCOPE_CONFIG = {
  personal: { icon: User, label: 'Personal', color: tokens.colors.accent.cyan },
  team:     { icon: Users, label: 'Team', color: tokens.colors.accent.amber },
  project:  { icon: Globe, label: 'Project', color: tokens.colors.accent.purple },
};

// =============================================================================
// BUILT-IN LAYOUTS
// =============================================================================

const BUILTIN_LAYOUTS = [
  { id: 'single', name: 'Single', rows: 1, cols: 1 },
  { id: 'side-by-side', name: 'Side by Side', rows: 1, cols: 2 },
  { id: 'stacked', name: 'Stacked', rows: 2, cols: 1 },
  { id: '2x2', name: '2×2 Grid', rows: 2, cols: 2 },
  { id: '1+2', name: '1 + 2', rows: 2, cols: 2, merged: 'top' },
  { id: '2+1', name: '2 + 1', rows: 2, cols: 2, merged: 'right' },
  { id: '3-up', name: '3-up', rows: 1, cols: 3 },
  { id: '3x3', name: '3×3 Grid', rows: 3, cols: 3 },
];

const CUSTOM_LAYOUTS = [
  { id: 'custom-1', name: 'Neuro Setup', rows: 2, cols: 3, isCustom: true },
  { id: 'custom-2', name: 'Wide Compare', rows: 1, cols: 4, isCustom: true },
];

const ALL_LAYOUTS = [...BUILTIN_LAYOUTS, ...CUSTOM_LAYOUTS];

const getLayoutCapacity = (layout) => {
  if (!layout) return 1;
  if (layout.merged === 'top' || layout.merged === 'right') return 3;
  return layout.rows * layout.cols;
};

const VIEWGROUP_COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#22d3ee', '#14b8a6', '#ef4444'];

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_DATASETS = [
  {
    id: 'ds-1', name: 'brain_scan.nii', type: 'volume', color: '#a855f7',
    views: [
      { id: 'v1', name: 'Main Volume', type: 'volume' },
      { id: 'v2', name: 'Axial Slice', type: 'slice' },
      { id: 'v3', name: 'Sagittal Slice', type: 'slice' },
      { id: 'v4', name: 'Coronal Slice', type: 'slice' },
      { id: 'v5', name: 'Histogram', type: 'chart' },
      { id: 'v6', name: 'ROI Statistics', type: 'stats' },
    ],
  },
  {
    id: 'ds-2', name: 'heart_mesh.vtk', type: 'mesh', color: '#3b82f6',
    views: [
      { id: 'v7', name: 'Surface Mesh', type: 'mesh' },
      { id: 'v8', name: 'Wireframe', type: 'mesh' },
      { id: 'v9', name: 'Point Cloud', type: 'pointcloud' },
    ],
  },
  {
    id: 'ds-3', name: 'patient_metrics.csv', type: 'tabular', color: '#22c55e',
    views: [
      { id: 'v10', name: 'Data Table', type: 'table' },
      { id: 'v11', name: 'Vitals Chart', type: 'chart' },
      { id: 'v12', name: 'Summary Stats', type: 'stats' },
    ],
  },
];

// The VG currently being edited
const MOCK_VIEWGROUP = {
  id: 'vg-1',
  name: 'Brain Analysis',
  layoutId: '1+2',
  color: '#a855f7',
  scope: 'personal',
  description: 'Primary workspace for brain scan analysis with tri-plane views.',
  linkedTo: null,
  canvasPosition: { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
  views: [
    { id: 'v1', name: 'Main Volume', type: 'volume', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
    { id: 'v2', name: 'Axial Slice', type: 'slice', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
    { id: 'v6', name: 'ROI Statistics', type: 'stats', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
  ],
};

const MOCK_EMPTY_VG = {
  id: 'vg-new',
  name: 'New ViewGroup',
  layoutId: '2x2',
  color: '#22c55e',
  scope: 'personal',
  description: '',
  linkedTo: null,
  canvasPosition: { row: 2, col: 0, rowSpan: 2, colSpan: 2 },
  views: [],
};

const MOCK_LINKED_VG = {
  id: 'vg-2',
  name: 'Data Explorer',
  layoutId: 'side-by-side',
  color: '#f59e0b',
  scope: 'team',
  description: 'Shared workspace for team data exploration.',
  linkedTo: 'vg-4',
  canvasPosition: { row: 0, col: 2, rowSpan: 1, colSpan: 2 },
  views: [
    { id: 'v11', name: 'Vitals Chart', type: 'chart', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
    { id: 'v10', name: 'Data Table', type: 'table', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
  ],
};

// All VGs on the canvas (for VGs tab in companion panel)
const MOCK_CANVAS_VGS = [
  {
    id: 'vg-1',
    name: 'Brain Analysis',
    color: '#a855f7',
    layoutId: '1+2',
    views: [
      { id: 'v1', name: 'Main Volume', type: 'volume', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
      { id: 'v2', name: 'Axial Slice', type: 'slice', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
      { id: 'v6', name: 'ROI Statistics', type: 'stats', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
    ],
  },
  {
    id: 'vg-2',
    name: 'Data Explorer',
    color: '#f59e0b',
    layoutId: 'side-by-side',
    views: [
      { id: 'v11', name: 'Vitals Chart', type: 'chart', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
      { id: 'v10', name: 'Data Table', type: 'table', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
    ],
  },
  {
    id: 'vg-3',
    name: 'Heart Study',
    color: '#3b82f6',
    layoutId: '2x2',
    views: [
      { id: 'v7', name: 'Surface Mesh', type: 'mesh', datasetId: 'ds-2', datasetName: 'heart_mesh.vtk' },
      { id: 'v8', name: 'Wireframe', type: 'mesh', datasetId: 'ds-2', datasetName: 'heart_mesh.vtk' },
      { id: 'v9', name: 'Point Cloud', type: 'pointcloud', datasetId: 'ds-2', datasetName: 'heart_mesh.vtk' },
      { id: 'v12', name: 'Summary Stats', type: 'stats', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
    ],
  },
  {
    id: 'vg-4',
    name: 'Patient Overview',
    color: '#22c55e',
    layoutId: 'stacked',
    views: [
      { id: 'v10-copy', name: 'Data Table', type: 'table', datasetId: 'ds-3', datasetName: 'patient_metrics.csv' },
      { id: 'v5', name: 'Histogram', type: 'chart', datasetId: 'ds-1', datasetName: 'brain_scan.nii' },
    ],
  },
];

// VG Templates (for canvas map templates tab)
const MOCK_VG_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Standard Review',
    description: '2x2 grid for routine analysis',
    layoutId: '2x2',
    color: '#6366f1',
    viewSlots: 4,
    scope: 'team',
  },
  {
    id: 'tpl-2', 
    name: 'Neuro Workup',
    description: 'Tri-plane with stats panel',
    layoutId: '1+2',
    color: '#8b5cf6',
    viewSlots: 3,
    scope: 'personal',
  },
  {
    id: 'tpl-3',
    name: 'Comparison View',
    description: 'Side-by-side for A/B analysis',
    layoutId: 'side-by-side',
    color: '#06b6d4',
    viewSlots: 2,
    scope: 'project',
  },
  {
    id: 'tpl-4',
    name: 'Deep Dive',
    description: 'Single view for focused analysis',
    layoutId: 'single',
    color: '#10b981',
    viewSlots: 1,
    scope: 'personal',
  },
];

// =============================================================================
// EDITABLE NAME
// =============================================================================

const EditableName = ({ value, onChange, color }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
  useEffect(() => { setEditValue(value); }, [value]);

  const handleSubmit = () => { if (editValue.trim()) onChange(editValue.trim()); else setEditValue(value); setIsEditing(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') { setEditValue(value); setIsEditing(false); } };

  if (isEditing) {
    return (
      <input ref={inputRef} type="text" value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit} onKeyDown={handleKeyDown}
        style={{
          fontSize: tokens.fontSize.lg, fontWeight: 600,
          color: tokens.colors.text.primary, background: 'transparent',
          border: 'none', borderBottom: `2px solid ${color}`,
          outline: 'none', padding: '2px 0', minWidth: 100,
        }}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => setIsEditing(true)}
      style={{ fontSize: tokens.fontSize.lg, fontWeight: 600, color: tokens.colors.text.primary, cursor: 'text' }}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
};

// =============================================================================
// LAYOUT PREVIEW (small thumbnail)
// =============================================================================

const LayoutPreview = ({ layout, size = 32, active = false, color = null }) => {
  const gap = 2;
  const bg = active ? `${color || '#a855f7'}15` : tokens.colors.glass.subtle;
  const border = active ? (color || '#a855f7') : tokens.colors.border.subtle;
  const cellBg = (i) => active ? `${color || '#a855f7'}${55 + (i % 3) * 15}` : `${tokens.colors.text.muted}35`;

  const baseStyle = {
    display: 'grid', gap, width: size, height: size, padding: 3,
    borderRadius: tokens.radius.sm, background: bg,
    border: `1px solid ${border}`, flexShrink: 0,
  };

  if (layout.merged === 'top') {
    return (
      <div style={{ ...baseStyle, gridTemplateRows: 'repeat(2, 1fr)', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div style={{ gridColumn: '1 / -1', background: cellBg(0), borderRadius: 2 }} />
        <div style={{ background: cellBg(1), borderRadius: 2 }} />
        <div style={{ background: cellBg(2), borderRadius: 2 }} />
      </div>
    );
  }
  if (layout.merged === 'right') {
    return (
      <div style={{ ...baseStyle, gridTemplateRows: 'repeat(2, 1fr)', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div style={{ background: cellBg(0), borderRadius: 2 }} />
        <div style={{ gridRow: '1 / -1', background: cellBg(1), borderRadius: 2 }} />
        <div style={{ background: cellBg(2), borderRadius: 2 }} />
      </div>
    );
  }
  return (
    <div style={{ ...baseStyle, gridTemplateRows: `repeat(${layout.rows}, 1fr)`, gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
      {Array.from({ length: layout.rows * layout.cols }, (_, i) => (
        <div key={i} style={{ background: cellBg(i), borderRadius: 2 }} />
      ))}
    </div>
  );
};

// =============================================================================
// LAYOUT PICKER PANEL (floating, anchored to "More" button)
// =============================================================================

const LayoutPickerPanel = ({ isOpen, onClose, currentLayoutId, vgColor, onSelectLayout, onSaveAsCurrent, anchorRef }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (isOpen && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen, anchorRef]);
  
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
      <div style={{
        position: 'fixed', top: position.top, left: position.left,
        width: 300, background: tokens.colors.bg.secondary,
        border: `1px solid ${tokens.colors.border.strong}`,
        borderRadius: tokens.radius.lg, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 201, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <span style={{ fontSize: tokens.fontSize.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Choose Layout</span>
          <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.colors.text.muted }}>
            <X size={16} />
          </button>
        </div>

        {/* Built-in */}
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8, letterSpacing: '0.5px' }}>BUILT-IN</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {BUILTIN_LAYOUTS.map(layout => (
              <button key={layout.id} onClick={() => onSelectLayout(layout)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: 6, background: currentLayoutId === layout.id ? `${vgColor}15` : 'transparent',
                border: `1px solid ${currentLayoutId === layout.id ? vgColor : 'transparent'}`,
                borderRadius: tokens.radius.md, cursor: 'pointer', minHeight: 56,
              }}>
                <LayoutPreview layout={layout} size={28} active={currentLayoutId === layout.id} color={vgColor} />
                <span style={{ fontSize: tokens.fontSize.xxs, color: tokens.colors.text.secondary, textAlign: 'center' }}>{layout.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        {CUSTOM_LAYOUTS.length > 0 && (
          <div style={{ padding: 12, borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
            <div style={{ fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8, letterSpacing: '0.5px' }}>CUSTOM</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CUSTOM_LAYOUTS.map(layout => (
                <button key={layout.id} onClick={() => onSelectLayout(layout)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: 6, background: currentLayoutId === layout.id ? `${vgColor}15` : 'transparent',
                  border: `1px solid ${currentLayoutId === layout.id ? vgColor : 'transparent'}`,
                  borderRadius: tokens.radius.md, cursor: 'pointer', minHeight: 56,
                }}>
                  <LayoutPreview layout={layout} size={28} active={currentLayoutId === layout.id} color={vgColor} />
                  <span style={{ fontSize: tokens.fontSize.xxs, color: tokens.colors.accent.purple, textAlign: 'center' }}>{layout.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* From Templates (VG templates as layout sources) */}
        <div style={{ padding: 12, borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8, letterSpacing: '0.5px' }}>FROM TEMPLATES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { name: 'Tri-Plane View', layout: '1+2', views: 3 },
              { name: 'Clinical Dashboard', layout: '2x2', views: 4 },
            ].map((t, i) => {
              const tLayout = ALL_LAYOUTS.find(l => l.id === t.layout) || BUILTIN_LAYOUTS[0];
              return (
                <button key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  background: tokens.colors.glass.subtle, border: 'none',
                  borderRadius: tokens.radius.sm, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}>
                  <LayoutPreview layout={tLayout} size={22} color={tokens.colors.accent.teal} />
                  <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary }}>{t.name}</span>
                  <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{t.views}v</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save current */}
        <div style={{ padding: 12, borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <button onClick={onSaveAsCurrent} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', background: 'none', border: `1px dashed ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.md, cursor: 'pointer', color: tokens.colors.text.secondary,
            fontSize: tokens.fontSize.sm, minHeight: 40,
          }}>
            <Save size={14} /> Save current as template…
          </button>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// FLOATING ACTION BAR (cell operations)
// =============================================================================

const FloatingActionBar = ({ selectedCount, hasView, onMerge, onSplit, onAddView, onRemove, onClear }) => {
  if (selectedCount === 0) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', background: `${tokens.colors.bg.secondary}f0`,
      border: `1px solid ${tokens.colors.border.strong}`,
      borderRadius: tokens.radius.lg, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(12px)', zIndex: 50,
    }}>
      <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.accent.amber }}>
        {selectedCount} selected
      </span>
      <div style={{ width: 1, height: 20, background: tokens.colors.border.default }} />
      <ActionButton icon={Combine} label="Merge" onClick={onMerge} disabled={selectedCount < 2} />
      <ActionButton icon={SquareSplitHorizontal} label="Split" onClick={onSplit} disabled={selectedCount !== 1} />
      <ActionButton icon={Plus} label="Add View" onClick={onAddView} color={tokens.colors.accent.green} />
      {hasView && <ActionButton icon={Trash2} label="" onClick={onRemove} color={tokens.colors.accent.red} />}
      <div style={{ width: 1, height: 20, background: tokens.colors.border.default }} />
      <button onClick={onClear} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, padding: '4px 6px',
      }}>Clear</button>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, onClick, disabled = false, color }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
    background: color ? `${color}15` : tokens.colors.glass.subtle,
    border: 'none', borderRadius: tokens.radius.sm, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1, fontSize: tokens.fontSize.sm, fontWeight: 500,
    color: color || tokens.colors.text.secondary, minHeight: 36,
  }}>
    <Icon size={14} /> {label}
  </button>
);

// =============================================================================
// VIEW REMOVAL CONFIRMATION (floating card)
// =============================================================================

const ViewRemovalConfirmation = ({ isOpen, onClose, onConfirm, views, newCapacity, vgName, layoutName }) => {
  const toRemove = views.length - newCapacity;
  const [selectedToRemove, setSelectedToRemove] = useState([]);

  useEffect(() => {
    if (isOpen && toRemove > 0) setSelectedToRemove(views.slice(-toRemove).map(v => v.id));
  }, [isOpen, toRemove, views]);

  if (!isOpen || toRemove <= 0) return null;

  const toggleView = (id) => {
    setSelectedToRemove(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 320, background: tokens.colors.bg.secondary,
        border: `1px solid ${tokens.colors.border.strong}`,
        borderRadius: tokens.radius.xl, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        zIndex: 301, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <AlertTriangle size={18} style={{ color: tokens.colors.accent.amber }} />
          <span style={{ fontSize: tokens.fontSize.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Views Will Be Removed</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary, margin: '0 0 12px' }}>
            Changing <strong style={{ color: tokens.colors.text.primary }}>{vgName}</strong> to <strong style={{ color: tokens.colors.text.primary }}>{layoutName}</strong> requires removing {toRemove} view{toRemove > 1 ? 's' : ''}. Select which to remove:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {views.map(view => {
              const config = VIEW_TYPE_CONFIG[view.type];
              const Icon = config?.icon || Box;
              const isSelected = selectedToRemove.includes(view.id);
              return (
                <button key={view.id} onClick={() => toggleView(view.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: isSelected ? `${tokens.colors.accent.red}10` : tokens.colors.glass.subtle,
                  border: `1px solid ${isSelected ? tokens.colors.accent.red + '40' : 'transparent'}`,
                  borderRadius: tokens.radius.sm, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: tokens.radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? tokens.colors.accent.red : 'transparent',
                    border: `2px solid ${isSelected ? tokens.colors.accent.red : tokens.colors.border.default}`,
                  }}>
                    {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                  </div>
                  <Icon size={14} style={{ color: config?.color }} />
                  <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{view.name}</span>
                  <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{view.datasetName}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
            {selectedToRemove.length} of {toRemove} selected to remove
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 8, padding: '12px 16px',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 0', background: tokens.colors.glass.subtle,
            border: `1px solid ${tokens.colors.border.default}`, borderRadius: tokens.radius.md,
            cursor: 'pointer', color: tokens.colors.text.secondary, fontSize: tokens.fontSize.sm, fontWeight: 500,
          }}>Cancel</button>
          <button onClick={() => onConfirm(selectedToRemove)} disabled={selectedToRemove.length !== toRemove} style={{
            flex: 1, padding: '10px 0',
            background: selectedToRemove.length === toRemove ? `${tokens.colors.accent.red}20` : tokens.colors.glass.subtle,
            border: `1px solid ${selectedToRemove.length === toRemove ? tokens.colors.accent.red : tokens.colors.border.default}`,
            borderRadius: tokens.radius.md, cursor: selectedToRemove.length === toRemove ? 'pointer' : 'default',
            color: selectedToRemove.length === toRemove ? tokens.colors.accent.red : tokens.colors.text.muted,
            fontSize: tokens.fontSize.sm, fontWeight: 600,
            opacity: selectedToRemove.length === toRemove ? 1 : 0.5,
          }}>Remove & Apply</button>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// CANVAS POSITION MINI-PREVIEW
// =============================================================================

const CanvasPositionPreview = ({ canvasPosition, vgColor, canvasSize = { rows: 4, cols: 4 } }) => {
  const cellSize = 8;
  const gap = 1;
  return (
    <div style={{
      display: 'grid', gap, padding: 2,
      gridTemplateRows: `repeat(${canvasSize.rows}, ${cellSize}px)`,
      gridTemplateColumns: `repeat(${canvasSize.cols}, ${cellSize}px)`,
      background: tokens.colors.glass.subtle,
      border: `1px solid ${tokens.colors.border.subtle}`,
      borderRadius: tokens.radius.sm,
    }}>
      {Array.from({ length: canvasSize.rows * canvasSize.cols }, (_, i) => {
        const row = Math.floor(i / canvasSize.cols);
        const col = i % canvasSize.cols;
        const inVG = row >= canvasPosition.row && row < canvasPosition.row + canvasPosition.rowSpan &&
                     col >= canvasPosition.col && col < canvasPosition.col + canvasPosition.colSpan;
        return (
          <div key={i} style={{
            background: inVG ? `${vgColor}60` : 'rgba(255,255,255,0.04)',
            borderRadius: 1,
          }} />
        );
      })}
    </div>
  );
};

// =============================================================================
// COLOR PICKER
// =============================================================================

const ColorPicker = ({ value, onChange, isOpen, onToggle }) => (
  <div style={{ position: 'relative' }}>
    <button onClick={onToggle} style={{
      width: 24, height: 24, borderRadius: '50%', background: value,
      border: `2px solid ${tokens.colors.border.default}`, cursor: 'pointer',
    }} title="Change color" />
    {isOpen && (
      <>
        <div onClick={onToggle} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 6, display: 'flex', gap: 6, padding: 8,
          background: tokens.colors.bg.secondary,
          border: `1px solid ${tokens.colors.border.strong}`,
          borderRadius: tokens.radius.md, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 101,
        }}>
          {VIEWGROUP_COLORS.map(c => (
            <button key={c} onClick={() => { onChange(c); onToggle(); }} style={{
              width: 22, height: 22, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
              outline: value === c ? `2px solid ${tokens.colors.text.primary}` : 'none',
              outlineOffset: 2,
            }} />
          ))}
        </div>
      </>
    )}
  </div>
);


// =============================================================================
// VG EDITOR PANEL CONTENT
// =============================================================================
// NOTE: In implementation, this component is wrapped by PanelShell:
//
// <PanelShell
//   panelId={`vg-editor-${viewGroup.id}`}  // Unique per VG for multi-editor support
//   title={isNewVG ? "New ViewGroup" : `Edit: ${viewGroup.name}`}
//   icon="layoutGrid"
//   chrome={CHROME_LEVELS.FULL}
//   color={viewGroup.color}
//   defaultWidth={480}                      // Narrower - companion is separate
//   defaultHeight={600}
//   minWidth={400}
//   minHeight={480}
//   onClose={handleClose}
//   onFocus={() => editorContext.setActive(panelId)}  // Register as active when focused
// >
//   {({ width, height, sizeMode }) => (
//     <VGEditorPanelContent viewGroup={viewGroup} sizeMode={sizeMode} ... />
//   )}
// </PanelShell>
//
// The header below (with color picker, editable name, etc.) is the VG identity
// bar — it's CONTENT, not chrome. PanelShell provides the outer chrome with
// drag handle, minimize, and close buttons.

const VGEditorPanelContent = ({ initialVG, isNewVG = false, panelId, onClose, onFocus }) => {
  // ViewGroup state
  const [viewGroup, setViewGroup] = useState(initialVG);
  const layout = useMemo(() => ALL_LAYOUTS.find(l => l.id === viewGroup.layoutId) || BUILTIN_LAYOUTS[0], [viewGroup.layoutId]);

  // Context for multi-editor support (may not be available in standalone usage)
  const editorContext = React.useContext(VGEditorContext);
  const isContextAvailable = !!editorContext;
  
  // The panelId uniquely identifies this editor instance
  const editorPanelId = panelId || `vg-editor-${viewGroup.id}`;

  // Register/unregister with context on mount/unmount
  useEffect(() => {
    if (isContextAvailable && editorContext) {
      editorContext.registerEditor(editorPanelId, { 
        id: viewGroup.id,
        name: viewGroup.name,
        color: viewGroup.color,
        isNew: isNewVG 
      });
      return () => editorContext.unregisterEditor(editorPanelId);
    }
  }, [editorPanelId, isContextAvailable]);  // Register on mount

  // Update context when VG name/color changes
  useEffect(() => {
    if (isContextAvailable && editorContext) {
      editorContext.updateEditor(editorPanelId, {
        vgName: viewGroup.name,
        vgColor: viewGroup.color,
      });
    }
  }, [viewGroup.name, viewGroup.color, editorPanelId, isContextAvailable]);

  // Handle focus (for multi-editor active state)
  const handlePanelFocus = useCallback(() => {
    if (isContextAvailable) {
      editorContext.setActive(editorPanelId);
    }
    onFocus?.();
  }, [editorPanelId, isContextAvailable, onFocus]);
  
  // Check if this editor is active
  const isActive = isContextAvailable && editorContext.activeEditorId === editorPanelId;

  // UI state
  const [selectedCells, setSelectedCells] = useState([]);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingLayoutChange, setPendingLayoutChange] = useState(null);
  const [bottomTab, setBottomTab] = useState('views'); // 'views' | 'settings'
  const [dragOverCell, setDragOverCell] = useState(null);
  const moreButtonRef = useRef(null);

  const capacity = getLayoutCapacity(layout);
  const quickLayouts = BUILTIN_LAYOUTS.slice(0, 7);

  // Handlers
  const handleNameChange = (name) => setViewGroup(prev => ({ ...prev, name }));
  const handleColorChange = (color) => setViewGroup(prev => ({ ...prev, color }));
  const handleScopeChange = (scope) => setViewGroup(prev => ({ ...prev, scope }));
  const handleDescriptionChange = (description) => setViewGroup(prev => ({ ...prev, description }));

  const handleCellClick = (i) => {
    setSelectedCells(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  };

  const handleLayoutSelect = (newLayout) => {
    const newCap = getLayoutCapacity(newLayout);
    if (viewGroup.views.length > newCap) {
      setPendingLayoutChange(newLayout);
    } else {
      setViewGroup(prev => ({ ...prev, layoutId: newLayout.id }));
      setSelectedCells([]);
    }
    setShowLayoutPicker(false);
  };

  const handleConfirmLayoutChange = (idsToRemove) => {
    if (pendingLayoutChange) {
      setViewGroup(prev => ({
        ...prev,
        views: prev.views.filter(v => !idsToRemove.includes(v.id)),
        layoutId: pendingLayoutChange.id,
      }));
      setPendingLayoutChange(null);
      setSelectedCells([]);
    }
  };

  const handleRemoveView = () => {
    const viewIndicesToRemove = selectedCells.filter(i => viewGroup.views[i]);
    if (viewIndicesToRemove.length > 0) {
      setViewGroup(prev => ({
        ...prev,
        views: prev.views.filter((_, i) => !viewIndicesToRemove.includes(i)),
      }));
      setSelectedCells([]);
    }
  };

  const handleCellDrop = (cellIndex, e) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.view) {
        setViewGroup(prev => {
          const newViews = [...prev.views];
          // Fill the cell — pad with nulls if needed, then replace
          while (newViews.length <= cellIndex) newViews.push(null);
          newViews[cellIndex] = {
            ...data.view,
            datasetId: data.datasetId,
            datasetName: data.datasetName,
          };
          return { ...prev, views: newViews.filter(Boolean) };
        });
      }
    } catch (err) { /* ignore parse errors */ }
  };

  // Render a single cell
  const renderCell = (index) => {
    const view = viewGroup.views[index];
    const config = view ? VIEW_TYPE_CONFIG[view.type] : null;
    const Icon = config?.icon || Box;
    const isSelected = selectedCells.includes(index);
    const isDragOver = dragOverCell === index && !view;

    return (
      <div key={index}
        onClick={() => handleCellClick(index)}
        onDragOver={(e) => { if (!view) { e.preventDefault(); setDragOverCell(index); } }}
        onDragLeave={() => setDragOverCell(null)}
        onDrop={(e) => handleCellDrop(index, e)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: 12, borderRadius: tokens.radius.lg, cursor: 'pointer',
          minHeight: 80, position: 'relative',
          background: isDragOver
            ? `${tokens.colors.accent.green}12`
            : view
              ? `${config?.color}10`
              : tokens.colors.glass.subtle,
          border: `2px ${view ? 'solid' : 'dashed'} ${
            isSelected ? tokens.colors.accent.amber
            : isDragOver ? tokens.colors.accent.green
            : view ? `${config?.color}35` : tokens.colors.border.default
          }`,
          boxShadow: isSelected ? `0 0 0 3px ${tokens.colors.accent.amber}30` : 'none',
          transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        }}
      >
        {view ? (
          <>
            <Icon size={28} style={{ color: config?.color }} />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary, fontWeight: 500, textAlign: 'center' }}>{view.name}</span>
            <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, textAlign: 'center' }}>{view.datasetName}</span>
          </>
        ) : (
          <>
            <Plus size={24} style={{ color: isDragOver ? tokens.colors.accent.green : tokens.colors.text.muted, opacity: isDragOver ? 0.8 : 0.3 }} />
            <span style={{ fontSize: tokens.fontSize.sm, color: isDragOver ? tokens.colors.accent.green : tokens.colors.text.muted }}>
              {isDragOver ? 'Drop here' : 'Empty'}
            </span>
          </>
        )}
        {isSelected && (
          <div style={{
            position: 'absolute', top: 8, left: 8, width: 22, height: 22,
            borderRadius: tokens.radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tokens.colors.accent.amber,
          }}>
            <Check size={14} color="white" strokeWidth={3} />
          </div>
        )}
      </div>
    );
  };

  // Render the grid
  const renderGrid = () => {
    if (layout.merged === 'top') {
      return (
        <div style={{ display: 'grid', gap: 10, gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
          <div style={{ gridColumn: '1 / -1' }}>{renderCell(0)}</div>
          {renderCell(1)}
          {renderCell(2)}
        </div>
      );
    }
    if (layout.merged === 'right') {
      return (
        <div style={{ display: 'grid', gap: 10, gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
          {renderCell(0)}
          <div style={{ gridRow: '1 / -1' }}>{renderCell(1)}</div>
          {renderCell(2)}
        </div>
      );
    }
    return (
      <div style={{
        display: 'grid', gap: 10, flex: 1,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      }}>
        {Array.from({ length: capacity }, (_, i) => renderCell(i))}
      </div>
    );
  };

  const hasViewInSelection = selectedCells.some(i => viewGroup.views[i]);
  const ScopeIcon = SCOPE_CONFIG[viewGroup.scope]?.icon || User;

  return (
    <div 
      onMouseDown={handlePanelFocus}
      style={{
        display: 'flex', height: '100%', overflow: 'hidden',
        background: tokens.colors.bg.primary,
        // Note: borderRadius, border, boxShadow removed - PanelShell provides these
      }}
    >
      {/* Main Editor - No embedded companion, it's now a separate panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ─── Header ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: `${viewGroup.color}08`,
          borderBottom: `1px solid ${viewGroup.color}30`,
        }}>
          <ColorPicker value={viewGroup.color} onChange={handleColorChange} isOpen={showColorPicker} onToggle={() => setShowColorPicker(!showColorPicker)} />
          <EditableName value={viewGroup.name} onChange={handleNameChange} color={viewGroup.color} />

          {viewGroup.linkedTo && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: tokens.radius.sm, background: `${tokens.colors.accent.blue}15`,
              color: tokens.colors.accent.blue, fontSize: tokens.fontSize.xs,
            }}>
              <Link2 size={12} /> Linked
            </span>
          )}

          {isNewVG && (
            <span style={{
              padding: '2px 8px', borderRadius: tokens.radius.sm,
              background: `${tokens.colors.accent.green}15`, color: tokens.colors.accent.green,
              fontSize: tokens.fontSize.xs, fontWeight: 600,
            }}>New</span>
          )}

          <div style={{ flex: 1 }} />

          {/* Canvas position mini-preview */}
          <CanvasPositionPreview canvasPosition={viewGroup.canvasPosition} vgColor={viewGroup.color} />

          {/* Scope badge */}
          <button onClick={() => {
            const scopes = ['personal', 'team', 'project'];
            const next = scopes[(scopes.indexOf(viewGroup.scope) + 1) % scopes.length];
            handleScopeChange(next);
          }} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
            background: `${SCOPE_CONFIG[viewGroup.scope]?.color}15`,
            border: `1px solid ${SCOPE_CONFIG[viewGroup.scope]?.color}30`,
            borderRadius: tokens.radius.sm, cursor: 'pointer',
            color: SCOPE_CONFIG[viewGroup.scope]?.color,
            fontSize: tokens.fontSize.xs, fontWeight: 500,
          }} title="Click to cycle scope">
            <ScopeIcon size={12} /> {SCOPE_CONFIG[viewGroup.scope]?.label}
          </button>

          {/* Meta info */}
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
            {layout.name} · {viewGroup.views.length}/{capacity}v
          </span>

          {/* Active editor indicator (multi-editor context) */}
          {isContextAvailable && isActive && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: tokens.radius.sm, background: `${tokens.colors.accent.green}15`,
              color: tokens.colors.accent.green, fontSize: tokens.fontSize.xs, fontWeight: 600,
            }}>
              <Check size={10} /> Active
            </span>
          )}
          {/* Note: Close button removed - PanelShell chrome provides this */}
        </div>

        {/* ─── Layout Picker Bar ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        }}>
          <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted, flexShrink: 0 }}>Layout:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {quickLayouts.map(l => (
              <button key={l.id} onClick={() => handleLayoutSelect(l)} style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: layout.id === l.id ? `${viewGroup.color}15` : 'transparent',
                border: `1px solid ${layout.id === l.id ? viewGroup.color : 'transparent'}`,
                borderRadius: tokens.radius.sm, cursor: 'pointer',
              }} title={l.name}>
                <LayoutPreview layout={l} size={22} active={layout.id === l.id} color={viewGroup.color} />
              </button>
            ))}
          </div>
          <button ref={moreButtonRef} onClick={() => setShowLayoutPicker(!showLayoutPicker)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
            background: showLayoutPicker ? `${viewGroup.color}15` : 'transparent',
            border: `1px solid ${showLayoutPicker ? viewGroup.color : tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.colors.text.secondary,
            fontSize: tokens.fontSize.sm, fontWeight: 500, minHeight: 36,
          }}>
            <Grid3X3 size={14} /> More <ChevronDown size={12} />
          </button>
          <LayoutPickerPanel
            isOpen={showLayoutPicker} onClose={() => setShowLayoutPicker(false)}
            currentLayoutId={layout.id} vgColor={viewGroup.color}
            onSelectLayout={handleLayoutSelect}
            onSaveAsCurrent={() => console.log('Save as template')}
            anchorRef={moreButtonRef}
          />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
            {layout.rows}×{layout.cols} · {capacity} cells
          </span>
        </div>

        {/* ─── Cell Grid (main area) ─── */}
        <div style={{ flex: 1, padding: 16, position: 'relative', display: 'flex', overflow: 'hidden' }}>
          {renderGrid()}
          <FloatingActionBar
            selectedCount={selectedCells.length}
            hasView={hasViewInSelection}
            onMerge={() => { console.log('Merge cells:', selectedCells); setSelectedCells([]); }}
            onSplit={() => { console.log('Split cell:', selectedCells); setSelectedCells([]); }}
            onAddView={() => console.log('Add View clicked - companion panel should be open')}
            onRemove={handleRemoveView}
            onClear={() => setSelectedCells([])}
          />
        </div>

        {/* ─── Bottom Section: Tabs ─── */}
        <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            {[
              { id: 'views', label: 'Views', icon: Eye, count: viewGroup.views.filter(Boolean).length },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => (
              <button key={tab.id} onClick={() => setBottomTab(tab.id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', background: 'none', border: 'none',
                borderBottom: `2px solid ${bottomTab === tab.id ? viewGroup.color : 'transparent'}`,
                color: bottomTab === tab.id ? tokens.colors.text.primary : tokens.colors.text.muted,
                fontSize: tokens.fontSize.sm, fontWeight: 500, cursor: 'pointer',
              }}>
                <tab.icon size={13} /> {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    fontSize: tokens.fontSize.xxs, padding: '1px 5px',
                    background: bottomTab === tab.id ? `${viewGroup.color}20` : tokens.colors.glass.medium,
                    borderRadius: tokens.radius.sm,
                  }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {bottomTab === 'views' && (
              <div style={{ padding: 8 }}>
                {viewGroup.views.length === 0 ? (
                  <div style={{
                    padding: '20px 0', textAlign: 'center',
                    fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted,
                  }}>
                    No views yet. Drag from companion panel or click empty cells.
                  </div>
                ) : (
                  viewGroup.views.filter(Boolean).map((view, i) => {
                    const config = VIEW_TYPE_CONFIG[view.type];
                    const Icon = config?.icon || Box;
                    return (
                      <div key={view.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderRadius: tokens.radius.sm, marginBottom: 2,
                      }}
                        onMouseOver={(e) => e.currentTarget.style.background = tokens.colors.glass.medium}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{
                          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: tokens.fontSize.xxs, fontWeight: 600, color: tokens.colors.text.muted,
                          background: tokens.colors.glass.subtle, borderRadius: tokens.radius.sm,
                        }}>{i + 1}</span>
                        <Icon size={14} style={{ color: config?.color }} />
                        <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{view.name}</span>
                        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{view.datasetName}</span>
                        <button onClick={() => {
                          setViewGroup(prev => ({ ...prev, views: prev.views.filter((_, idx) => idx !== i) }));
                        }} style={{
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'none', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer',
                          color: tokens.colors.text.muted, opacity: 0,
                        }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
                        ><X size={12} /></button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {bottomTab === 'settings' && (
              <div style={{ padding: 12 }}>
                {/* Description */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginBottom: 4, fontWeight: 600 }}>DESCRIPTION</label>
                  <textarea
                    value={viewGroup.description} onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Optional description for this ViewGroup…"
                    rows={2}
                    style={{
                      width: '100%', padding: '8px 10px', background: tokens.colors.glass.subtle,
                      border: `1px solid ${tokens.colors.border.subtle}`, borderRadius: tokens.radius.sm,
                      color: tokens.colors.text.primary, fontSize: tokens.fontSize.sm,
                      resize: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Scope */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginBottom: 4, fontWeight: 600 }}>SCOPE</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(SCOPE_CONFIG).map(([key, cfg]) => {
                      const SIcon = cfg.icon;
                      const isActive = viewGroup.scope === key;
                      return (
                        <button key={key} onClick={() => handleScopeChange(key)} style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                          background: isActive ? `${cfg.color}15` : tokens.colors.glass.subtle,
                          border: `1px solid ${isActive ? cfg.color : tokens.colors.border.subtle}`,
                          borderRadius: tokens.radius.sm, cursor: 'pointer',
                          color: isActive ? cfg.color : tokens.colors.text.muted,
                          fontSize: tokens.fontSize.sm, fontWeight: isActive ? 600 : 400,
                        }}>
                          <SIcon size={13} /> {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Linked status */}
                {viewGroup.linkedTo && (
                  <div>
                    <label style={{ display: 'block', fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginBottom: 4, fontWeight: 600 }}>LINKED TO</label>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      background: `${tokens.colors.accent.blue}08`,
                      border: `1px solid ${tokens.colors.accent.blue}25`,
                      borderRadius: tokens.radius.sm,
                    }}>
                      <Link2 size={14} style={{ color: tokens.colors.accent.blue }} />
                      <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{viewGroup.linkedTo}</span>
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                        background: `${tokens.colors.accent.red}10`, border: `1px solid ${tokens.colors.accent.red}30`,
                        borderRadius: tokens.radius.sm, cursor: 'pointer',
                        color: tokens.colors.accent.red, fontSize: tokens.fontSize.xs,
                      }}><Unlink size={12} /> Unlink</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
        }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tokens.colors.text.muted, fontSize: tokens.fontSize.xs,
          }}>
            <AlertTriangle size={12} /> Help
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: `${viewGroup.color}15`, border: `1px solid ${viewGroup.color}40`,
            borderRadius: tokens.radius.md, cursor: 'pointer',
            color: viewGroup.color, fontSize: tokens.fontSize.sm, fontWeight: 600,
          }}>
            <Save size={14} /> Save as Template
          </button>
        </div>
      </div>

      {/* Note: Companion Panel is now a separate PanelShell - see VGEditorCompanionPanel */}

      {/* View Removal Confirmation */}
      <ViewRemovalConfirmation
        isOpen={!!pendingLayoutChange}
        onClose={() => setPendingLayoutChange(null)}
        onConfirm={handleConfirmLayoutChange}
        views={viewGroup.views.filter(Boolean)}
        newCapacity={pendingLayoutChange ? getLayoutCapacity(pendingLayoutChange) : 0}
        vgName={viewGroup.name}
        layoutName={pendingLayoutChange?.name || ''}
      />
    </div>
  );
};

// =============================================================================
// UNIFIED COMPANION PANEL (Context-Aware)
// =============================================================================
// This companion panel adapts its tabs based on the active editing context:
// - VG Editor active: [Datasets] [Views] [VGs] — for adding views to a VG
// - Canvas Map active: [VGs] [Templates] — for placing VGs on the canvas
// - Neither active: [Datasets] [Views] — browsing mode
//
// <PanelShell
//   panelId="companion"
//   title={mode === 'canvas-map' ? 'Add ViewGroups' : 'Add Views'}
//   icon="package"
//   chrome={CHROME_LEVELS.COMPACT}
//   defaultWidth={280}
//   defaultHeight={520}
// >
//   <UnifiedCompanionPanel />
// </PanelShell>

const UnifiedCompanionPanel = ({ 
  datasets = MOCK_DATASETS, 
  canvasVGs = MOCK_CANVAS_VGS,
  templates = MOCK_VG_TEMPLATES,
}) => {
  // Get both contexts
  const vgEditorContext = React.useContext(VGEditorContext);
  const canvasMapContext = React.useContext(CanvasMapContext);
  
  const { activeEditor, editorCount } = vgEditorContext || { activeEditor: null, editorCount: 0 };
  const { isActive: canvasMapActive, placedVGIds } = canvasMapContext || { isActive: false, placedVGIds: [] };
  
  // Determine mode: vg-editor takes priority over canvas-map
  const mode = editorCount > 0 ? 'vg-editor' : canvasMapActive ? 'canvas-map' : 'idle';
  
  // Tab configuration based on mode
  const tabConfigs = {
    'vg-editor': [
      { id: 'datasets', label: 'Datasets', icon: FolderOpen },
      { id: 'views', label: 'Views', icon: List },
      { id: 'vgs', label: 'VGs', icon: LayoutGrid },
    ],
    'canvas-map': [
      { id: 'vgs', label: 'VGs', icon: LayoutGrid },
      { id: 'templates', label: 'Templates', icon: Copy },
    ],
    'idle': [
      { id: 'datasets', label: 'Datasets', icon: FolderOpen },
      { id: 'views', label: 'Views', icon: List },
    ],
  };
  
  const tabs = tabConfigs[mode];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDatasets, setExpandedDatasets] = useState([datasets[0]?.id]);
  const [expandedVGs, setExpandedVGs] = useState([]);

  // Reset to first tab when mode changes
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [mode]);

  // Get the VG being edited (to mark it in VGs tab)
  const editingVgId = activeEditor?.vgId;
  
  // Accent color based on mode
  const accentColor = mode === 'vg-editor' 
    ? (activeEditor?.vgColor || tokens.colors.accent.cyan)
    : tokens.colors.accent.teal;

  // Filtered data
  const allViews = useMemo(() => datasets.flatMap(ds => ds.views.map(v => ({ ...v, dataset: ds }))), [datasets]);
  
  const filteredViews = useMemo(() => {
    if (!searchQuery) return allViews;
    const q = searchQuery.toLowerCase();
    return allViews.filter(v => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.dataset.name.toLowerCase().includes(q));
  }, [allViews, searchQuery]);

  const filteredDatasets = useMemo(() => {
    if (!searchQuery) return datasets;
    const q = searchQuery.toLowerCase();
    return datasets.map(ds => ({
      ...ds,
      views: ds.views.filter(v => v.name.toLowerCase().includes(q) || v.type.includes(q) || ds.name.toLowerCase().includes(q)),
    })).filter(ds => ds.views.length > 0);
  }, [datasets, searchQuery]);

  const filteredVGs = useMemo(() => {
    if (!searchQuery) return canvasVGs;
    const q = searchQuery.toLowerCase();
    return canvasVGs.map(vg => ({
      ...vg,
      views: vg.views.filter(v => v.name.toLowerCase().includes(q) || v.type.includes(q)),
    })).filter(vg => vg.name.toLowerCase().includes(q) || vg.views.length > 0);
  }, [canvasVGs, searchQuery]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [templates, searchQuery]);

  // Drag handlers
  const handleVGDragStart = (e, vg) => {
    if (mode === 'vg-editor') {
      // Dragging VG to import all views
      e.dataTransfer.setData('application/json', JSON.stringify({ 
        type: 'vg-import',
        vgId: vg.id,
        vgName: vg.name,
        views: vg.views,
      }));
    } else {
      // Dragging VG to place on canvas
      e.dataTransfer.setData('application/json', JSON.stringify({ 
        type: 'vg-place',
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
      }));
    }
  };

  const handleTemplateDragStart = (e, template) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ 
      type: 'template-create',
      templateId: template.id,
      templateName: template.name,
      layoutId: template.layoutId,
      color: template.color,
    }));
  };

  // Check if can drag (based on mode)
  const canDrag = mode !== 'idle';

  // Mode indicator config
  const modeConfig = {
    'vg-editor': {
      icon: Pencil,
      label: activeEditor?.vgName || 'VG Editor',
      color: activeEditor?.vgColor || tokens.colors.accent.cyan,
    },
    'canvas-map': {
      icon: Grid3X3,
      label: 'Canvas Map',
      color: tokens.colors.accent.teal,
    },
    'idle': {
      icon: Package,
      label: 'Browse',
      color: tokens.colors.text.muted,
    },
  };
  
  const currentMode = modeConfig[mode];
  const ModeIcon = currentMode.icon;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: tokens.colors.bg.primary,
    }}>
      {/* Mode Indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: mode !== 'idle' ? `${currentMode.color}08` : tokens.colors.glass.subtle,
        borderBottom: `1px solid ${mode !== 'idle' ? `${currentMode.color}30` : tokens.colors.border.subtle}`,
      }}>
        {mode !== 'idle' ? (
          <>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: currentMode.color }} />
            <ModeIcon size={12} style={{ color: currentMode.color }} />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary, fontWeight: 500 }}>
              {currentMode.label}
            </span>
            {mode === 'vg-editor' && editorCount > 1 && (
              <span style={{
                fontSize: tokens.fontSize.xs, padding: '1px 6px',
                background: tokens.colors.glass.medium, borderRadius: tokens.radius.sm,
                color: tokens.colors.text.muted,
              }}>
                {editorCount} open
              </span>
            )}
          </>
        ) : (
          <>
            <Package size={14} style={{ color: tokens.colors.text.muted }} />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>
              Select an editor to add content
            </span>
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '8px 0', background: 'none', border: 'none',
            borderBottom: `2px solid ${activeTab === tab.id ? accentColor : 'transparent'}`,
            color: activeTab === tab.id ? accentColor : tokens.colors.text.muted,
            fontSize: tokens.fontSize.sm, fontWeight: 500, cursor: 'pointer',
          }}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
          background: tokens.colors.glass.subtle, borderRadius: tokens.radius.sm,
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}>
          <Search size={12} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
          <input
            type="text" 
            placeholder={activeTab === 'templates' ? "Search templates…" : activeTab === 'vgs' ? "Search VGs…" : "Search views…"} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: tokens.colors.text.primary, fontSize: tokens.fontSize.sm,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 6, opacity: canDrag ? 1 : 0.5 }}>
        
        {/* ═══ DATASETS TAB ═══ */}
        {activeTab === 'datasets' && filteredDatasets.map(ds => {
          const isExpanded = expandedDatasets.includes(ds.id);
          return (
            <div key={ds.id} style={{ marginBottom: 4 }}>
              <button onClick={() => setExpandedDatasets(prev =>
                prev.includes(ds.id) ? prev.filter(id => id !== ds.id) : [...prev, ds.id]
              )} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px', background: 'none', border: 'none',
                borderRadius: tokens.radius.sm, cursor: 'pointer',
                color: tokens.colors.text.primary, fontSize: tokens.fontSize.sm,
              }}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ds.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ds.name}</span>
                <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{ds.views.length}</span>
              </button>
              {isExpanded && (
                <div style={{ paddingLeft: 18, borderLeft: `2px solid ${ds.color}30`, marginLeft: 14 }}>
                  {ds.views.map(view => {
                    const config = VIEW_TYPE_CONFIG[view.type];
                    const Icon = config?.icon || Box;
                    return (
                      <div key={view.id} draggable={canDrag}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({ view, datasetId: ds.id, datasetName: ds.name }));
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 8px', cursor: canDrag ? 'grab' : 'default',
                          borderRadius: tokens.radius.sm,
                          fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary,
                        }}
                        onMouseOver={(e) => canDrag && (e.currentTarget.style.background = tokens.colors.glass.medium)}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0, opacity: canDrag ? 1 : 0.3 }} />
                        <Icon size={13} style={{ color: config?.color, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ═══ VIEWS TAB ═══ */}
        {activeTab === 'views' && filteredViews.map(view => {
          const config = VIEW_TYPE_CONFIG[view.type];
          const Icon = config?.icon || Box;
          return (
            <div key={view.id} draggable={canDrag}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ view, datasetId: view.dataset.id, datasetName: view.dataset.name }));
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px', cursor: canDrag ? 'grab' : 'default',
                borderRadius: tokens.radius.sm, marginBottom: 2,
              }}
              onMouseOver={(e) => canDrag && (e.currentTarget.style.background = tokens.colors.glass.medium)}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0, opacity: canDrag ? 1 : 0.3 }} />
              <Icon size={13} style={{ color: config?.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.name}</div>
                <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.dataset.name}</div>
              </div>
              <span style={{
                fontSize: tokens.fontSize.xxs, padding: '1px 5px', borderRadius: tokens.radius.sm,
                background: `${config?.color}15`, color: config?.color,
              }}>{config?.label}</span>
            </div>
          );
        })}

        {/* ═══ VGs TAB ═══ */}
        {activeTab === 'vgs' && (
          <>
            {filteredVGs.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>
                No ViewGroups available
              </div>
            ) : (
              filteredVGs.map(vg => {
                const isExpanded = expandedVGs.includes(vg.id);
                const isBeingEdited = mode === 'vg-editor' && vg.id === editingVgId;
                const isOnCanvas = placedVGIds.includes(vg.id);
                const vgCanDrag = canDrag && !isBeingEdited && !(mode === 'canvas-map' && isOnCanvas);
                
                return (
                  <div key={vg.id} style={{ marginBottom: 6 }}>
                    {/* VG Header */}
                    <div 
                      draggable={vgCanDrag}
                      onDragStart={(e) => handleVGDragStart(e, vg)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 8px', 
                        background: isBeingEdited ? `${vg.color}12` : isOnCanvas && mode === 'canvas-map' ? `${vg.color}08` : 'transparent',
                        border: isBeingEdited ? `1px dashed ${vg.color}50` : '1px solid transparent',
                        borderRadius: tokens.radius.sm, 
                        cursor: vgCanDrag ? 'grab' : 'default',
                        opacity: isBeingEdited || (isOnCanvas && mode === 'canvas-map') ? 0.6 : 1,
                      }}
                      onMouseOver={(e) => vgCanDrag && (e.currentTarget.style.background = tokens.colors.glass.medium)}
                      onMouseOut={(e) => {
                        if (isBeingEdited) e.currentTarget.style.background = `${vg.color}12`;
                        else if (isOnCanvas && mode === 'canvas-map') e.currentTarget.style.background = `${vg.color}08`;
                        else e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Expand/collapse (only in vg-editor mode) */}
                      {mode === 'vg-editor' && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVGs(prev =>
                            prev.includes(vg.id) ? prev.filter(id => id !== vg.id) : [...prev, vg.id]
                          );
                        }} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: tokens.colors.text.muted, display: 'flex',
                        }}>
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      )}
                      
                      {vgCanDrag && (
                        <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                      )}
                      
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: vg.color, flexShrink: 0 }} />
                      
                      <span style={{ 
                        flex: 1, fontSize: tokens.fontSize.sm, fontWeight: 500,
                        color: (isBeingEdited || (isOnCanvas && mode === 'canvas-map')) ? tokens.colors.text.muted : tokens.colors.text.primary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {vg.name}
                      </span>
                      
                      {/* Status badges */}
                      {isBeingEdited ? (
                        <span style={{
                          fontSize: tokens.fontSize.xxs, padding: '1px 5px', borderRadius: tokens.radius.sm,
                          background: `${vg.color}20`, color: vg.color, fontWeight: 600,
                        }}>Editing</span>
                      ) : isOnCanvas && mode === 'canvas-map' ? (
                        <span style={{
                          fontSize: tokens.fontSize.xxs, padding: '1px 5px', borderRadius: tokens.radius.sm,
                          background: `${tokens.colors.accent.green}20`, color: tokens.colors.accent.green, fontWeight: 600,
                        }}>On Canvas</span>
                      ) : (
                        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
                          {vg.views.length}v
                        </span>
                      )}
                    </div>
                    
                    {/* VG Views (only in vg-editor mode, collapsible) */}
                    {mode === 'vg-editor' && isExpanded && (
                      <div style={{ paddingLeft: 18, borderLeft: `2px solid ${vg.color}30`, marginLeft: 14, marginTop: 2 }}>
                        {vg.views.length === 0 ? (
                          <div style={{ padding: '6px 8px', fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, fontStyle: 'italic' }}>
                            No views
                          </div>
                        ) : (
                          vg.views.map(view => {
                            const config = VIEW_TYPE_CONFIG[view.type];
                            const Icon = config?.icon || Box;
                            const viewCanDrag = vgCanDrag;
                            
                            return (
                              <div key={view.id} 
                                draggable={viewCanDrag}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('application/json', JSON.stringify({ 
                                    view, 
                                    datasetId: view.datasetId, 
                                    datasetName: view.datasetName,
                                    sourceVgId: vg.id,
                                    sourceVgName: vg.name,
                                  }));
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '5px 8px', 
                                  cursor: viewCanDrag ? 'grab' : 'default',
                                  borderRadius: tokens.radius.sm,
                                  fontSize: tokens.fontSize.sm, 
                                  color: isBeingEdited ? tokens.colors.text.muted : tokens.colors.text.secondary,
                                  opacity: isBeingEdited ? 0.6 : 1,
                                }}
                                onMouseOver={(e) => viewCanDrag && (e.currentTarget.style.background = tokens.colors.glass.medium)}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                {viewCanDrag && (
                                  <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                                )}
                                <Icon size={13} style={{ color: config?.color, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {view.name}
                                </span>
                                <span style={{
                                  fontSize: tokens.fontSize.xxs, padding: '1px 5px', borderRadius: tokens.radius.sm,
                                  background: `${config?.color}15`, color: config?.color,
                                }}>{config?.label}</span>
                              </div>
                            );
                          })
                        )}
                        
                        {vgCanDrag && vg.views.length > 1 && (
                          <div style={{ 
                            padding: '4px 8px', marginTop: 4,
                            fontSize: tokens.fontSize.xxs, color: tokens.colors.text.muted,
                            fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <Copy size={9} /> Drag VG header to import all
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ═══ TEMPLATES TAB (Canvas Map mode only) ═══ */}
        {activeTab === 'templates' && (
          <>
            {filteredTemplates.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: tokens.colors.text.muted, fontSize: tokens.fontSize.sm }}>
                No templates available
              </div>
            ) : (
              filteredTemplates.map(template => {
                const ScopeIcon = SCOPE_CONFIG[template.scope]?.icon || User;
                return (
                  <div 
                    key={template.id}
                    draggable={canDrag}
                    onDragStart={(e) => handleTemplateDragStart(e, template)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 10px', marginBottom: 6,
                      background: tokens.colors.glass.subtle,
                      border: `1px solid ${tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                      cursor: canDrag ? 'grab' : 'default',
                    }}
                    onMouseOver={(e) => canDrag && (e.currentTarget.style.borderColor = template.color)}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = tokens.colors.border.subtle}
                  >
                    {/* Template color indicator */}
                    <div style={{
                      width: 32, height: 32, borderRadius: tokens.radius.sm,
                      background: `${template.color}20`, border: `1px solid ${template.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <LayoutGrid size={14} style={{ color: template.color }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: tokens.fontSize.sm, fontWeight: 600, 
                        color: tokens.colors.text.primary, marginBottom: 2,
                      }}>
                        {template.name}
                      </div>
                      <div style={{ 
                        fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted,
                        marginBottom: 4,
                      }}>
                        {template.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: tokens.fontSize.xxs, padding: '1px 5px', borderRadius: tokens.radius.sm,
                          background: `${template.color}15`, color: template.color,
                        }}>
                          {template.viewSlots} slots
                        </span>
                        <span style={{
                          fontSize: tokens.fontSize.xxs, display: 'flex', alignItems: 'center', gap: 3,
                          color: SCOPE_CONFIG[template.scope]?.color,
                        }}>
                          <ScopeIcon size={9} /> {SCOPE_CONFIG[template.scope]?.label}
                        </span>
                      </div>
                    </div>
                    
                    {canDrag && (
                      <GripVertical size={12} style={{ color: tokens.colors.text.muted, flexShrink: 0, marginTop: 2 }} />
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 10px', borderTop: `1px solid ${tokens.colors.border.subtle}`,
        fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted,
      }}>
        {mode === 'vg-editor' 
          ? (activeTab === 'vgs' 
              ? 'Drag views or VG headers to compose' 
              : 'Drag views to editor cells')
          : mode === 'canvas-map'
            ? (activeTab === 'templates'
                ? 'Drag template to create new VG'
                : 'Drag VGs to canvas cells')
            : 'Open an editor to add content'
        }
      </div>
    </div>
  );
};

// =============================================================================
// SIMULATED PANELSHELL CHROME (for demo purposes)
// =============================================================================

const SimulatedPanelShellChrome = ({ title, color, onClose, children }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', height: '100%',
    background: tokens.colors.bg.primary, borderRadius: tokens.radius.xl,
    border: `1px solid ${tokens.colors.border.default}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
  }}>
    {/* PanelShell Chrome Header */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: tokens.colors.bg.tertiary, borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      cursor: 'grab', flexShrink: 0,
    }}>
      <GripVertical size={12} style={{ color: tokens.colors.text.muted }} />
      <LayoutGrid size={14} style={{ color }} />
      <span style={{ fontSize: tokens.fontSize.xs, fontWeight: 600, letterSpacing: '0.5px', color: tokens.colors.text.secondary, textTransform: 'uppercase' }}>
        {title}
      </span>
      <div style={{ flex: 1 }} />
      <button style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.colors.text.muted }}
        title="Minimize"><ChevronDown size={12} /></button>
      <button onClick={onClose} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.colors.text.muted }}
        title="Close"><X size={12} /></button>
    </div>
    {/* Panel Content */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

// =============================================================================
// SIMULATED COMPANION PANEL CHROME (for demo)
// =============================================================================

const SimulatedCompanionChrome = ({ title, color, children }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', height: '100%',
    background: tokens.colors.bg.primary, borderRadius: tokens.radius.lg,
    border: `1px solid ${tokens.colors.border.default}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
  }}>
    {/* COMPACT Chrome Header */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      background: tokens.colors.bg.tertiary, borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      cursor: 'grab', flexShrink: 0,
    }}>
      <Package size={12} style={{ color }} />
      <span style={{ fontSize: tokens.fontSize.xs, fontWeight: 600, letterSpacing: '0.5px', color: tokens.colors.text.secondary, textTransform: 'uppercase' }}>
        {title}
      </span>
      <div style={{ flex: 1 }} />
      <button style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: tokens.radius.sm, cursor: 'pointer', color: tokens.colors.text.muted }}>
        <X size={10} />
      </button>
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

// =============================================================================
// DEMO WRAPPER — MULTI-EDITOR VERSION
// =============================================================================

const VGEditorDemo = () => {
  // Which VGs have editors open
  const [openVGs, setOpenVGs] = useState(['vg-1']); // Start with one open
  const [canvasMapMode, setCanvasMapMode] = useState(false);
  const [editorWidth, setEditorWidth] = useState(440);
  const [editorHeight, setEditorHeight] = useState(580);
  const [companionHeight, setCompanionHeight] = useState(540);

  const allVGs = [
    { vg: MOCK_VIEWGROUP, isNew: false, key: 'vg-1' },
    { vg: MOCK_EMPTY_VG, isNew: true, key: 'vg-new' },
    { vg: MOCK_LINKED_VG, isNew: false, key: 'vg-2' },
  ];

  const toggleVG = (key) => {
    setOpenVGs(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const openEditorsData = allVGs.filter(v => openVGs.includes(v.key));

  // When canvas map mode is on, close all VG editors (they take priority)
  const effectiveOpenVGs = canvasMapMode ? [] : openVGs;
  const effectiveOpenEditorsData = canvasMapMode ? [] : openEditorsData;

  return (
    <VGEditorProvider>
      <CanvasMapProvider>
        {/* Canvas Map Mode Controller */}
        <CanvasMapModeController isActive={canvasMapMode} />
        
        <div style={{
          minHeight: '100vh', background: '#030508', padding: 24,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button 
              onClick={() => setCanvasMapMode(false)}
              style={{
                padding: '8px 20px', borderRadius: tokens.radius.md, cursor: 'pointer',
                background: !canvasMapMode ? `${tokens.colors.accent.purple}20` : 'transparent',
                border: `1px solid ${!canvasMapMode ? tokens.colors.accent.purple : tokens.colors.border.subtle}`,
                color: !canvasMapMode ? tokens.colors.accent.purple : tokens.colors.text.muted,
                fontSize: 13, fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pencil size={14} /> VG Editor Mode
              </span>
            </button>
            <button 
              onClick={() => setCanvasMapMode(true)}
              style={{
                padding: '8px 20px', borderRadius: tokens.radius.md, cursor: 'pointer',
                background: canvasMapMode ? `${tokens.colors.accent.teal}20` : 'transparent',
                border: `1px solid ${canvasMapMode ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
                color: canvasMapMode ? tokens.colors.accent.teal : tokens.colors.text.muted,
                fontSize: 13, fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Grid3X3 size={14} /> Canvas Map Mode
              </span>
            </button>
          </div>

          {/* VG Editor Controls (only in VG Editor mode) */}
          {!canvasMapMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: tokens.colors.text.muted }}>Open Editors:</span>
              {allVGs.map(({ vg, isNew, key }) => (
                <button key={key} onClick={() => toggleVG(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: tokens.radius.md, cursor: 'pointer',
                  background: openVGs.includes(key) ? `${vg.color}20` : 'transparent',
                  border: `1px solid ${openVGs.includes(key) ? vg.color : tokens.colors.border.subtle}`,
                  color: openVGs.includes(key) ? vg.color : tokens.colors.text.muted,
                  fontSize: 12, fontWeight: 500,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: vg.color }} />
                  {vg.name}
                  {isNew && <span style={{ fontSize: 9, opacity: 0.7 }}>(new)</span>}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: tokens.colors.border.subtle }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: tokens.colors.text.muted }}>W:</span>
                <input type="range" min="360" max="560" value={editorWidth} onChange={(e) => setEditorWidth(Number(e.target.value))} style={{ width: 60 }} />
                <span style={{ fontSize: 10, color: tokens.colors.text.secondary, minWidth: 32 }}>{editorWidth}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: tokens.colors.text.muted }}>H:</span>
                <input type="range" min="400" max="700" value={editorHeight} onChange={(e) => setEditorHeight(Number(e.target.value))} style={{ width: 60 }} />
                <span style={{ fontSize: 10, color: tokens.colors.text.secondary, minWidth: 32 }}>{editorHeight}</span>
              </div>
            </div>
          )}

          {/* Canvas Map placeholder (in Canvas Map mode) */}
          {canvasMapMode && (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 12, background: tokens.colors.glass.subtle,
              borderRadius: tokens.radius.md, border: `1px dashed ${tokens.colors.accent.teal}40`,
            }}>
              <span style={{ fontSize: 12, color: tokens.colors.text.muted }}>
                Canvas Map active — Companion shows [VGs] [Templates] tabs
              </span>
            </div>
          )}

          {/* Panels Container */}
          <div style={{ 
            display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start',
            flexWrap: 'wrap', flex: 1,
          }}>
            {/* VG Editor Panels (only in VG Editor mode) */}
            {effectiveOpenEditorsData.map(({ vg, isNew, key }) => (
              <div key={key} style={{ width: editorWidth, height: editorHeight }}>
                <SimulatedPanelShellChrome
                  title={isNew ? 'New ViewGroup' : `Edit: ${vg.name}`}
                  color={vg.color}
                  onClose={() => toggleVG(key)}
                >
                  <VGEditorPanelContent
                    initialVG={vg}
                    isNewVG={isNew}
                    panelId={`vg-editor-${key}`}
                    onClose={() => toggleVG(key)}
                  />
                </SimulatedPanelShellChrome>
              </div>
            ))}

            {/* Unified Companion Panel */}
            <div style={{ width: 280, height: companionHeight }}>
              <SimulatedCompanionChrome
                title={canvasMapMode ? "Add VGs" : "Add Views"}
                color={canvasMapMode ? tokens.colors.accent.teal : tokens.colors.accent.cyan}
              >
                <UnifiedCompanionPanel 
                  datasets={MOCK_DATASETS} 
                  canvasVGs={MOCK_CANVAS_VGS}
                  templates={MOCK_VG_TEMPLATES}
                />
              </SimulatedCompanionChrome>
            </div>
          </div>

          {/* Info */}
          <div style={{
            maxWidth: 950, padding: 16, background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg, margin: '0 auto',
          }}>
            <h3 style={{ color: tokens.colors.text.primary, fontSize: 13, marginBottom: 10 }}>
              Unified Companion Panel — Context-Aware Tabs
            </h3>
            <ul style={{ color: tokens.colors.text.secondary, fontSize: 11, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
              <li><strong style={{ color: tokens.colors.accent.purple }}>VG Editor Mode</strong> — Companion shows [Datasets] [Views] [VGs] tabs. Drag views to populate the active VG's cells.</li>
              <li><strong style={{ color: tokens.colors.accent.teal }}>Canvas Map Mode</strong> — Companion shows [VGs] [Templates] tabs. Drag VGs to place on canvas, or templates to create new VGs.</li>
              <li><strong style={{ color: tokens.colors.accent.cyan }}>VGs Tab (dual purpose)</strong> — In VG Editor: shows views within VGs for composition. In Canvas Map: shows which VGs are placed ("On Canvas" badge).</li>
              <li><strong style={{ color: tokens.colors.accent.amber }}>Templates Tab</strong> — Drag to create a new VG from a template layout. Shows slot count and scope.</li>
              <li><strong style={{ color: tokens.colors.accent.green }}>Mode Indicator</strong> — Header shows current context (VG name when editing, "Canvas Map" when arranging).</li>
              <li><strong style={{ color: tokens.colors.accent.pink }}>Idle State</strong> — When nothing is active, companion shows browse-only [Datasets] [Views] tabs.</li>
            </ul>
          </div>
        </div>
      </CanvasMapProvider>
    </VGEditorProvider>
  );
};

// Helper component to sync canvas map mode with context
const CanvasMapModeController = ({ isActive }) => {
  const ctx = React.useContext(CanvasMapContext);
  useEffect(() => {
    if (ctx) {
      if (isActive) ctx.activateCanvasMap();
      else ctx.deactivateCanvasMap();
    }
  }, [isActive, ctx]);
  return null;
};

export default VGEditorDemo;
