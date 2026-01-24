import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  LayoutGrid, Package, Frame, Map, Eye, EyeOff, ZoomIn, ZoomOut,
  ChevronDown, ChevronRight, Plus, Trash2, Columns, Rows, Shrink,
  ArrowLeft, Combine, SquareSplitHorizontal, Check, Sparkles,
  Library, GripVertical, Magnet, Move3D, X, AlertTriangle,
  ChevronUp, MoreHorizontal, Save, Grid3X3, Copy, Settings,
  Link2, Unlink, AlignHorizontalSpaceBetween, ArrowLeftRight,
  CheckSquare, Square, Pencil, Share2, Users
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS (with accessible text sizes)
// =============================================================================
const tokens = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#12121a',
      tertiary: '#1a1a24',
      glass: 'rgba(255,255,255,0.03)',
      glassHover: 'rgba(255,255,255,0.06)',
      glassActive: 'rgba(255,255,255,0.09)',
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
  },
  // Accessible text sizes (minimum 12px for body)
  text: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '15px',
  },
};

// =============================================================================
// DATA: View Types
// =============================================================================
const VIEW_TYPES = {
  vtk: { name: 'VTK', color: '#22d3ee', icon: ({ size }) => <div style={{ width: size, height: size, borderRadius: 2, background: '#22d3ee' }} /> },
  slice: { name: 'Slice', color: '#3b82f6', icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/></svg> },
  volume: { name: 'Volume', color: '#a855f7', icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
  data: { name: 'Data', color: '#22c55e', icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  chart: { name: 'Chart', color: '#f59e0b', icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  notes: { name: 'Notes', color: '#ec4899', icon: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
};

// =============================================================================
// DATA: Built-in Layouts
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

const VIEWGROUP_COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#22d3ee'];

// =============================================================================
// DATA: Initial State
// =============================================================================
const createViewGroup = (id, name, layoutId, views = [], color, linkedTo = null) => ({ id, name, layoutId, views, color, linkedTo });
const createView = (id, type, name) => ({ id, type, name });

const INITIAL_VIEWGROUPS = [
  createViewGroup('vg-1', 'Brain Analysis', '1+2', [
    createView('v-1', 'volume', 'Main View'),
    createView('v-2', 'slice', 'Axial'),
    createView('v-3', 'data', 'Stats'),
  ], '#a855f7'),
  createViewGroup('vg-2', 'Data Explorer', 'side-by-side', [
    createView('v-4', 'chart', 'Timeline'),
    createView('v-5', 'data', 'Table'),
  ], '#f59e0b'),
  createViewGroup('vg-3', 'Empty Group', 'single', [], '#22c55e'),
  createViewGroup('vg-4', 'Comparison', '3-up', [
    createView('v-6', 'slice', 'Pre-op'),
    createView('v-7', 'slice', 'Post-op'),
    createView('v-8', 'slice', 'Diff'),
  ], '#3b82f6'),
];

const INITIAL_CANVAS = {
  rows: 4, cols: 4,
  viewGroupPositions: [
    { viewGroupId: 'vg-1', row: 0, col: 0, rowSpan: 2, colSpan: 2 },
    { viewGroupId: 'vg-2', row: 0, col: 2, rowSpan: 1, colSpan: 2 },
    { viewGroupId: 'vg-3', row: 1, col: 2, rowSpan: 1, colSpan: 1 },
    { viewGroupId: 'vg-4', row: 2, col: 0, rowSpan: 2, colSpan: 3 },
  ],
};

const INITIAL_VIEWPORTS = [
  { id: 'vp-1', name: 'Main View', position: { row: 0, col: 0 }, size: { rows: 3, cols: 3 }, mode: 'snap', isPrimary: true, isShared: false },
  { id: 'vp-2', name: 'Secondary', position: { row: 0, col: 3 }, size: { rows: 2, cols: 1 }, mode: 'free', isPrimary: false, isShared: false },
  { id: 'vp-3', name: 'Overview', position: { row: 3, col: 0 }, size: { rows: 1, cols: 2 }, mode: 'snap', isPrimary: false, isShared: true },
];

const INITIAL_CUSTOM_LAYOUTS = [
  { id: 'custom-1', name: 'Neuro Setup', rows: 2, cols: 3, isCustom: true },
  { id: 'custom-2', name: 'Comparison View', rows: 1, cols: 4, isCustom: true },
];

const INITIAL_SAVED_TEMPLATES = [
  { id: 'tpl-1', name: 'Brain Analysis Workspace', type: 'full', scope: 'personal', preview: ['1+2', '2x2'] },
  { id: 'tpl-2', name: 'Quick Compare', type: 'structure', scope: 'workspace', preview: ['3-up'] },
];

// =============================================================================
// UTILITY
// =============================================================================
const getLayoutCapacity = (layout) => {
  if (!layout) return 1;
  if (layout.merged === 'top' || layout.merged === 'right') return 3;
  return layout.rows * layout.cols;
};

// =============================================================================
// COMPONENTS: Layout Preview
// =============================================================================
const LayoutPreview = ({ layout, size = 'sm', active = false, color = null }) => {
  const dim = { xs: 22, sm: 32, md: 44 }[size] || 32;
  const gap = 2;
  const bg = active ? `${color || tokens.colors.accent.purple}20` : tokens.colors.bg.glass;
  const border = active ? (color || tokens.colors.accent.purple) : tokens.colors.border.subtle;
  const cellBg = (i) => active ? `${color || tokens.colors.accent.purple}${50 + (i % 3) * 15}` : `${tokens.colors.text.muted}40`;

  const baseStyle = { display: 'grid', gap, width: dim, height: dim, padding: 3, borderRadius: 4, background: bg, border: `1px solid ${border}` };
  
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
      {Array.from({ length: layout.rows * layout.cols }, (_, i) => <div key={i} style={{ background: cellBg(i), borderRadius: 2 }} />)}
    </div>
  );
};

// =============================================================================
// COMPONENTS: Editable Name
// =============================================================================
const EditableName = ({ value, onChange, color, size = 'md' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);
  
  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isEditing]);
  useEffect(() => { setEditValue(value); }, [value]);
  
  const handleSubmit = () => { if (editValue.trim()) onChange(editValue.trim()); else setEditValue(value); setIsEditing(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') { setEditValue(value); setIsEditing(false); } };
  
  const fontSize = size === 'lg' ? tokens.text.lg : tokens.text.md;
  
  if (isEditing) {
    return <input ref={inputRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSubmit} onKeyDown={handleKeyDown} className="font-semibold bg-transparent border-b outline-none" style={{ fontSize, color: tokens.colors.text.primary, borderColor: color || tokens.colors.accent.purple, minWidth: 80 }} />;
  }
  return <span onDoubleClick={() => setIsEditing(true)} className="font-semibold cursor-text hover:opacity-80" style={{ fontSize, color: tokens.colors.text.primary }} title="Double-click to rename">{value}</span>;
};

// =============================================================================
// COMPONENTS: Floating Action Bar (ViewGroup Editor)
// =============================================================================
const FloatingActionBar = ({ selectedCount, onMerge, onSplit, onAddView, onRemove }) => {
  if (selectedCount === 0) return null;
  return (
    <div className="absolute z-30 flex items-center gap-2 px-3 py-2.5 rounded-lg shadow-xl" style={{ left: '50%', bottom: 16, transform: 'translateX(-50%)', background: `${tokens.colors.bg.secondary}f0`, border: `1px solid ${tokens.colors.border.strong}`, backdropFilter: 'blur(12px)' }}>
      <span style={{ fontSize: tokens.text.md, fontWeight: 600, color: tokens.colors.accent.amber }}>{selectedCount} selected</span>
      <div className="w-px h-5" style={{ background: tokens.colors.border.default }} />
      <button onClick={onMerge} disabled={selectedCount < 2} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium disabled:opacity-30 min-h-[36px]" style={{ fontSize: tokens.text.sm, background: tokens.colors.bg.glass, color: tokens.colors.text.secondary }}><Combine size={14} /> Merge</button>
      <button onClick={onSplit} disabled={selectedCount !== 1} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium disabled:opacity-30 min-h-[36px]" style={{ fontSize: tokens.text.sm, background: tokens.colors.bg.glass, color: tokens.colors.text.secondary }}><SquareSplitHorizontal size={14} /> Split</button>
      <button onClick={onAddView} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium min-h-[36px]" style={{ fontSize: tokens.text.sm, background: `${tokens.colors.accent.green}20`, color: tokens.colors.accent.green }}><Plus size={14} /> Add View</button>
      <button onClick={onRemove} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium min-h-[36px]" style={{ fontSize: tokens.text.sm, background: `${tokens.colors.accent.red}20`, color: tokens.colors.accent.red }}><Trash2 size={14} /></button>
    </div>
  );
};

// =============================================================================
// COMPONENTS: ViewGroup Multi-Select Action Bar
// =============================================================================
const ViewGroupMultiSelectBar = ({ selectedCount, viewGroups, selectedIds, onCombine, onLink, onSwap, onMatch, onDelete, onExit }) => {
  const hasLinked = selectedIds.some(id => viewGroups.find(v => v.id === id)?.linkedTo);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mx-2 mb-2" style={{ background: `${tokens.colors.accent.purple}10`, border: `1px solid ${tokens.colors.accent.purple}40` }}>
      <span style={{ fontSize: tokens.text.md, fontWeight: 600, color: tokens.colors.accent.purple }}>{selectedCount} selected</span>
      <div className="flex-1" />
      <button onClick={onCombine} disabled={selectedCount < 2} className="flex items-center gap-1 px-2 py-1.5 rounded font-medium disabled:opacity-30 min-h-[32px]" style={{ fontSize: tokens.text.sm, background: tokens.colors.bg.glass, color: tokens.colors.text.secondary }}><Combine size={13} /> Combine</button>
      <button onClick={onLink} disabled={selectedCount < 2} className="flex items-center gap-1 px-2 py-1.5 rounded font-medium disabled:opacity-30 min-h-[32px]" style={{ fontSize: tokens.text.sm, background: hasLinked ? `${tokens.colors.accent.blue}20` : tokens.colors.bg.glass, color: hasLinked ? tokens.colors.accent.blue : tokens.colors.text.secondary }}>{hasLinked ? <Unlink size={13} /> : <Link2 size={13} />} {hasLinked ? 'Unlink' : 'Link'}</button>
      <button onClick={onSwap} disabled={selectedCount !== 2} className="flex items-center gap-1 px-2 py-1.5 rounded font-medium disabled:opacity-30 min-h-[32px]" style={{ fontSize: tokens.text.sm, background: tokens.colors.bg.glass, color: tokens.colors.text.secondary }}><ArrowLeftRight size={13} /> Swap</button>
      <button onClick={onMatch} disabled={selectedCount < 2} className="flex items-center gap-1 px-2 py-1.5 rounded font-medium disabled:opacity-30 min-h-[32px]" style={{ fontSize: tokens.text.sm, background: tokens.colors.bg.glass, color: tokens.colors.text.secondary }}><AlignHorizontalSpaceBetween size={13} /> Match</button>
      <button onClick={onDelete} className="flex items-center gap-1 px-2 py-1.5 rounded font-medium min-h-[32px]" style={{ fontSize: tokens.text.sm, background: `${tokens.colors.accent.red}20`, color: tokens.colors.accent.red }}><Trash2 size={13} /></button>
      <div className="w-px h-5 mx-1" style={{ background: tokens.colors.border.default }} />
      <button onClick={onExit} className="px-2.5 py-1.5 rounded font-medium hover:bg-white/10 min-h-[32px]" style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>Done</button>
    </div>
  );
};

// =============================================================================
// COMPONENTS: View Removal Confirmation
// =============================================================================
const ViewRemovalConfirmation = ({ isOpen, onClose, onConfirm, currentViews, newCapacity, viewGroupName, newLayoutName }) => {
  const viewsToRemove = currentViews.length - newCapacity;
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  
  useEffect(() => { if (isOpen && viewsToRemove > 0) setSelectedToRemove(currentViews.slice(-viewsToRemove).map(v => v.id)); }, [isOpen, viewsToRemove, currentViews]);
  
  if (!isOpen || viewsToRemove <= 0) return null;
  
  const toggleView = (id) => setSelectedToRemove(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const canConfirm = selectedToRemove.length === viewsToRemove;
  
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 380, background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.strong}` }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: `${tokens.colors.accent.amber}15`, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <AlertTriangle size={20} style={{ color: tokens.colors.accent.amber }} />
          <span style={{ fontSize: tokens.text.xl, fontWeight: 600, color: tokens.colors.text.primary }}>Views Will Be Removed</span>
        </div>
        <div className="p-4">
          <p style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary, marginBottom: 16 }}>Changing <strong>"{viewGroupName}"</strong> to <strong>{newLayoutName}</strong> will remove <span style={{ color: tokens.colors.accent.red, fontWeight: 600 }}>{viewsToRemove} view{viewsToRemove > 1 ? 's' : ''}</span>. Select which to remove:</p>
          <div className="space-y-2 mb-4">
            {currentViews.map(view => {
              const viewType = VIEW_TYPES[view.type];
              const isSelected = selectedToRemove.includes(view.id);
              return (
                <button key={view.id} onClick={() => toggleView(view.id)} className="w-full flex items-center gap-3 p-3 rounded-lg min-h-[48px]" style={{ background: isSelected ? `${tokens.colors.accent.red}15` : tokens.colors.bg.glass, border: `1px solid ${isSelected ? tokens.colors.accent.red : tokens.colors.border.subtle}` }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: isSelected ? tokens.colors.accent.red : 'transparent', border: `2px solid ${isSelected ? tokens.colors.accent.red : tokens.colors.border.default}` }}>{isSelected && <X size={14} color="white" strokeWidth={3} />}</div>
                  {viewType && <viewType.icon size={18} />}
                  <span className="flex-1 text-left" style={{ fontSize: tokens.text.md, color: tokens.colors.text.primary }}>{view.name}</span>
                  <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{viewType?.name}</span>
                  {isSelected && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: `${tokens.colors.accent.red}30`, color: tokens.colors.accent.red }}>REMOVE</span>}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: tokens.text.sm, color: canConfirm ? tokens.colors.accent.green : tokens.colors.accent.amber }}>{canConfirm ? `✓ ${viewsToRemove} view${viewsToRemove > 1 ? 's' : ''} selected` : `Select ${viewsToRemove - selectedToRemove.length} more`}</div>
        </div>
        <div className="flex gap-3 px-4 py-3" style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium hover:bg-white/5 min-h-[44px]" style={{ fontSize: tokens.text.md, border: `1px solid ${tokens.colors.border.default}`, color: tokens.colors.text.secondary }}>Cancel</button>
          <button onClick={() => onConfirm(selectedToRemove)} disabled={!canConfirm} className="flex-1 py-2.5 rounded-lg font-medium disabled:opacity-40 min-h-[44px]" style={{ fontSize: tokens.text.md, background: canConfirm ? tokens.colors.accent.red : tokens.colors.bg.glass, color: canConfirm ? 'white' : tokens.colors.text.muted }}>Remove & Apply</button>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// COMPONENTS: Layout Picker Panel
// =============================================================================
const LayoutPickerPanel = ({ isOpen, onClose, builtinLayouts, customLayouts, currentLayoutId, viewGroupColor, onSelectLayout, onSaveAsCurrent }) => {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 rounded-lg shadow-2xl overflow-hidden" style={{ top: '100%', left: 0, marginTop: 4, width: 320, background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.strong}` }}>
        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
          <span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Choose Layout</span>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 min-w-[36px] min-h-[36px] flex items-center justify-center"><X size={16} style={{ color: tokens.colors.text.muted }} /></button>
        </div>
        <div className="p-3">
          <div style={{ fontSize: tokens.text.sm, fontWeight: 500, color: tokens.colors.text.muted, marginBottom: 10 }}>BUILT-IN</div>
          <div className="grid grid-cols-4 gap-2">
            {builtinLayouts.map(layout => (
              <button key={layout.id} onClick={() => onSelectLayout(layout)} className="flex flex-col items-center p-2 rounded hover:bg-white/5 min-h-[60px]" style={{ background: currentLayoutId === layout.id ? `${viewGroupColor}20` : 'transparent', border: `1px solid ${currentLayoutId === layout.id ? viewGroupColor : 'transparent'}` }}>
                <LayoutPreview layout={layout} size="sm" active={currentLayoutId === layout.id} color={viewGroupColor} />
                <span style={{ fontSize: tokens.text.xs, marginTop: 6, color: tokens.colors.text.secondary }} className="truncate w-full text-center">{layout.name}</span>
              </button>
            ))}
          </div>
        </div>
        {customLayouts.length > 0 && (
          <div className="p-3" style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
            <div style={{ fontSize: tokens.text.sm, fontWeight: 500, color: tokens.colors.text.muted, marginBottom: 10 }}>CUSTOM</div>
            <div className="grid grid-cols-4 gap-2">
              {customLayouts.map(layout => (
                <button key={layout.id} onClick={() => onSelectLayout(layout)} className="flex flex-col items-center p-2 rounded hover:bg-white/5 min-h-[60px]" style={{ background: currentLayoutId === layout.id ? `${viewGroupColor}20` : 'transparent', border: `1px solid ${currentLayoutId === layout.id ? viewGroupColor : 'transparent'}` }}>
                  <LayoutPreview layout={layout} size="sm" active={currentLayoutId === layout.id} color={viewGroupColor} />
                  <span style={{ fontSize: tokens.text.xs, marginTop: 6, color: tokens.colors.accent.purple }} className="truncate w-full text-center">{layout.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="p-3" style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <button onClick={onSaveAsCurrent} className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-medium hover:bg-white/5 min-h-[44px]" style={{ fontSize: tokens.text.md, border: `1px dashed ${tokens.colors.border.default}`, color: tokens.colors.text.secondary }}><Save size={16} /> Save current as template...</button>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// COMPONENTS: Canvas View
// =============================================================================
const CanvasView = ({ canvas, viewGroups, viewports, selectedViewGroupId, selectedViewportId, showViewGroups, showViewports, onSelectViewGroup, onSelectViewport, onDoubleClickViewGroup, onDropLayout, zoom }) => {
  const containerRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);
  const cellSize = Math.max(32, (40 * zoom) / 100);
  const gap = 4;
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); const rect = containerRef.current?.getBoundingClientRect(); if (rect) { const col = Math.max(0, Math.min(canvas.cols - 1, Math.floor((e.clientX - rect.left) / (cellSize + gap)))); const row = Math.max(0, Math.min(canvas.rows - 1, Math.floor((e.clientY - rect.top) / (cellSize + gap)))); setDropPosition({ row, col }); } };
  const handleDrop = (e) => { e.preventDefault(); const layoutId = e.dataTransfer.getData('layoutId'); if (layoutId && dropPosition) onDropLayout(layoutId, dropPosition); setIsDragOver(false); setDropPosition(null); };
  
  return (
    <div ref={containerRef} className="flex-1 overflow-auto" style={{ padding: 12, background: isDragOver ? `${tokens.colors.accent.green}08` : tokens.colors.bg.tertiary }} onDragOver={handleDragOver} onDragLeave={() => { setIsDragOver(false); setDropPosition(null); }} onDrop={handleDrop}>
      <div className="relative mx-auto" style={{ width: canvas.cols * (cellSize + gap) - gap, height: canvas.rows * (cellSize + gap) - gap, border: isDragOver ? `2px dashed ${tokens.colors.accent.green}` : `1px solid ${tokens.colors.border.subtle}`, borderRadius: 6, background: tokens.colors.bg.secondary }}>
        <div className="absolute inset-0 opacity-30 rounded overflow-hidden" style={{ backgroundImage: `linear-gradient(${tokens.colors.border.subtle} 1px, transparent 1px), linear-gradient(90deg, ${tokens.colors.border.subtle} 1px, transparent 1px)`, backgroundSize: `${cellSize + gap}px ${cellSize + gap}px` }} />
        {isDragOver && dropPosition && <div className="absolute rounded pointer-events-none z-20" style={{ left: dropPosition.col * (cellSize + gap), top: dropPosition.row * (cellSize + gap), width: cellSize, height: cellSize, background: `${tokens.colors.accent.green}30`, border: `2px dashed ${tokens.colors.accent.green}` }} />}
        {showViewGroups && canvas.viewGroupPositions.map(pos => {
          const vg = viewGroups.find(g => g.id === pos.viewGroupId);
          if (!vg) return null;
          const isSelected = selectedViewGroupId === vg.id;
          return (
            <div key={pos.viewGroupId} onClick={(e) => { e.stopPropagation(); onSelectViewGroup(vg.id); }} onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickViewGroup(vg.id); }} className="absolute rounded cursor-pointer overflow-hidden" style={{ left: pos.col * (cellSize + gap), top: pos.row * (cellSize + gap), width: pos.colSpan * cellSize + (pos.colSpan - 1) * gap, height: pos.rowSpan * cellSize + (pos.rowSpan - 1) * gap, background: vg.views.length === 0 ? `${vg.color}10` : `${vg.color}20`, border: `2px ${vg.views.length === 0 ? 'dashed' : 'solid'} ${isSelected ? vg.color : `${vg.color}60`}`, boxShadow: isSelected ? `0 0 12px ${vg.color}50` : 'none', zIndex: isSelected ? 5 : 1 }}>
              <div className="absolute px-1.5 py-0.5 rounded-br flex items-center gap-1" style={{ top: 0, left: 0, background: vg.color, fontSize: tokens.text.xs, color: '#000', fontWeight: 600, maxWidth: '90%' }}>
                {vg.linkedTo && <Link2 size={10} />}<span className="truncate">{vg.name}</span>
              </div>
            </div>
          );
        })}
        {showViewports && viewports.map(vp => {
          const isSelected = selectedViewportId === vp.id;
          return (
            <div key={vp.id} onClick={(e) => { e.stopPropagation(); onSelectViewport(vp.id); }} className="absolute rounded-sm cursor-pointer" style={{ left: vp.position.col * (cellSize + gap) - 3, top: vp.position.row * (cellSize + gap) - 3, width: vp.size.cols * (cellSize + gap) - gap + 6, height: vp.size.rows * (cellSize + gap) - gap + 6, border: `2px ${vp.mode === 'snap' ? 'solid' : 'dashed'} ${isSelected ? tokens.colors.accent.cyan : `${tokens.colors.accent.cyan}50`}`, background: isSelected ? `${tokens.colors.accent.cyan}10` : 'transparent', zIndex: 10 }}>
              <div className="absolute px-1.5 py-0.5 rounded-br flex items-center gap-1" style={{ top: 0, left: 0, background: tokens.colors.accent.cyan, fontSize: tokens.text.xs, color: '#000', fontWeight: 600 }}>
                {vp.isShared && <Users size={10} />}{vp.name} {vp.isPrimary && '★'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTS: ViewGroup Detail Editor
// =============================================================================
const ViewGroupDetailEditor = ({ viewGroup, layout, allLayouts, customLayouts, onBack, onUpdateViewGroup, onChangeLayout, onSaveAsCustomLayout }) => {
  const [selectedCells, setSelectedCells] = useState([]);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [pendingLayoutChange, setPendingLayoutChange] = useState(null);
  
  const handleCellClick = (i) => setSelectedCells(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const handleLayoutSelect = (newLayout) => { const cap = getLayoutCapacity(newLayout); if (viewGroup.views.length > cap) setPendingLayoutChange(newLayout); else onChangeLayout(newLayout.id); setShowLayoutPicker(false); };
  const handleConfirmLayoutChange = (idsToRemove) => { if (pendingLayoutChange) { onUpdateViewGroup({ ...viewGroup, views: viewGroup.views.filter(v => !idsToRemove.includes(v.id)), layoutId: pendingLayoutChange.id }); setPendingLayoutChange(null); } };
  
  const renderCell = (index) => {
    const view = viewGroup.views[index];
    const viewType = view ? VIEW_TYPES[view.type] : null;
    const isSelected = selectedCells.includes(index);
    return (
      <div key={index} onClick={() => handleCellClick(index)} className="rounded-lg flex flex-col items-center justify-center cursor-pointer min-h-[70px] relative" style={{ background: view ? `${viewType?.color}15` : tokens.colors.bg.glass, border: `2px ${view ? 'solid' : 'dashed'} ${isSelected ? tokens.colors.accent.amber : (view ? `${viewType?.color}40` : tokens.colors.border.default)}`, boxShadow: isSelected ? `0 0 0 3px ${tokens.colors.accent.amber}40` : 'none' }}>
        {view ? (<>{viewType && <viewType.icon size={24} />}<span className="mt-1.5 text-center px-2" style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>{view.name}</span></>) : (<><Plus size={20} style={{ color: tokens.colors.text.muted, opacity: 0.4 }} /><span className="mt-1" style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>Empty</span></>)}
        {isSelected && <div className="absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center" style={{ background: tokens.colors.accent.amber }}><Check size={12} color="white" strokeWidth={3} /></div>}
      </div>
    );
  };
  
  const renderGrid = () => {
    const capacity = getLayoutCapacity(layout);
    if (layout.merged === 'top') return <div className="grid gap-3 flex-1" style={{ gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr' }}><div className="col-span-2">{renderCell(0)}</div>{renderCell(1)}{renderCell(2)}</div>;
    if (layout.merged === 'right') return <div className="grid gap-3 flex-1" style={{ gridTemplateRows: '1fr 1fr', gridTemplateColumns: '1fr 1fr' }}>{renderCell(0)}<div className="row-span-2">{renderCell(1)}</div>{renderCell(2)}</div>;
    return <div className="grid gap-3 flex-1" style={{ gridTemplateRows: `repeat(${layout.rows}, 1fr)`, gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>{Array.from({ length: capacity }, (_, i) => renderCell(i))}</div>;
  };
  
  const quickLayouts = BUILTIN_LAYOUTS.slice(0, 7);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: tokens.colors.bg.tertiary }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: `${viewGroup.color}15`, borderBottom: `1px solid ${viewGroup.color}40` }}>
        <button onClick={onBack} className="p-2 rounded hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center" style={{ color: tokens.colors.text.secondary }}><ArrowLeft size={18} /></button>
        <div className="w-4 h-4 rounded-full" style={{ background: viewGroup.color }} />
        <EditableName value={viewGroup.name} onChange={(name) => onUpdateViewGroup({ ...viewGroup, name })} color={viewGroup.color} size="lg" />
        {viewGroup.linkedTo && <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: `${tokens.colors.accent.blue}20`, color: tokens.colors.accent.blue }}><Link2 size={12} /> Linked</span>}
        <div className="flex-1" />
        <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{layout.name} • {viewGroup.views.length} views</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 relative" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>Layout:</span>
        <div className="flex items-center gap-1.5">
          {quickLayouts.map(l => <button key={l.id} onClick={() => handleLayoutSelect(l)} className="p-1 rounded hover:bg-white/10 min-w-[36px] min-h-[36px] flex items-center justify-center" title={l.name}><LayoutPreview layout={l} size="xs" active={layout.id === l.id} color={viewGroup.color} /></button>)}
        </div>
        <div className="relative">
          <button onClick={() => setShowLayoutPicker(!showLayoutPicker)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium hover:bg-white/10 min-h-[36px]" style={{ fontSize: tokens.text.sm, background: showLayoutPicker ? `${viewGroup.color}20` : 'transparent', border: `1px solid ${showLayoutPicker ? viewGroup.color : tokens.colors.border.subtle}`, color: tokens.colors.text.secondary }}><Grid3X3 size={14} /> More <ChevronDown size={14} /></button>
          <LayoutPickerPanel isOpen={showLayoutPicker} onClose={() => setShowLayoutPicker(false)} builtinLayouts={BUILTIN_LAYOUTS} customLayouts={customLayouts} currentLayoutId={layout.id} viewGroupColor={viewGroup.color} onSelectLayout={handleLayoutSelect} onSaveAsCurrent={onSaveAsCustomLayout} />
        </div>
      </div>
      <div className="flex-1 p-4 relative">{renderGrid()}<FloatingActionBar selectedCount={selectedCells.length} onMerge={() => { console.log('Merge:', selectedCells); setSelectedCells([]); }} onSplit={() => { console.log('Split:', selectedCells); setSelectedCells([]); }} onAddView={() => console.log('Add view to:', selectedCells)} onRemove={() => { console.log('Remove:', selectedCells); setSelectedCells([]); }} /></div>
      <ViewRemovalConfirmation isOpen={!!pendingLayoutChange} onClose={() => setPendingLayoutChange(null)} onConfirm={handleConfirmLayoutChange} currentViews={viewGroup.views} newCapacity={pendingLayoutChange ? getLayoutCapacity(pendingLayoutChange) : 0} viewGroupName={viewGroup.name} newLayoutName={pendingLayoutChange?.name || ''} />
    </div>
  );
};

// =============================================================================
// COMPONENTS: Canvas Map Container
// =============================================================================
const CanvasMapContainer = ({ canvas, viewGroups, viewports, selectedViewGroupId, selectedViewportId, onSelectViewGroup, onSelectViewport, drillInViewGroupId, onDrillIn, onDrillOut, isCollapsed, onToggleCollapse, height, onResize, zoom, onZoomChange, showViewGroups, onToggleViewGroups, showViewports, onToggleViewports, onDropLayout, onUpdateCanvas, onUpdateViewGroup, onChangeLayout, allLayouts, customLayouts, onSaveAsCustomLayout }) => {
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const drillInViewGroup = viewGroups.find(vg => vg.id === drillInViewGroupId);
  const drillInLayout = drillInViewGroup ? allLayouts.find(l => l.id === drillInViewGroup.layoutId) : null;
  
  const handleResizeStart = (e) => { e.preventDefault(); setIsDraggingResize(true); const startY = e.clientY; const startH = height; const move = (ev) => onResize(Math.max(120, Math.min(400, startH + (ev.clientY - startY)))); const up = () => { setIsDraggingResize(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); };
  
  return (
    <div className="flex-shrink-0 flex flex-col" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
      <div className="flex items-center gap-2 px-3 py-2 select-none" style={{ background: tokens.colors.bg.glass }}>
        <div className="flex items-center gap-2 cursor-pointer min-h-[36px]" onClick={onToggleCollapse}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <Map size={14} style={{ color: drillInViewGroupId ? drillInViewGroup?.color : tokens.colors.accent.teal }} />
          <span style={{ fontSize: tokens.text.lg, fontWeight: 500, color: tokens.colors.text.primary }}>{drillInViewGroupId ? 'ViewGroup Editor' : 'Canvas Map'}</span>
        </div>
        {!drillInViewGroupId && <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{canvas.cols}×{canvas.rows}</span>}
        <div className="flex-1" />
        {!isCollapsed && !drillInViewGroupId && (
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleViewGroups} className="flex items-center gap-1 px-2 py-1.5 rounded min-h-[36px]" style={{ fontSize: tokens.text.sm, background: showViewGroups ? `${tokens.colors.accent.purple}20` : 'transparent', color: showViewGroups ? tokens.colors.accent.purple : tokens.colors.text.muted, border: `1px solid ${showViewGroups ? tokens.colors.accent.purple : 'transparent'}` }}>{showViewGroups ? <Eye size={14} /> : <EyeOff size={14} />}<Package size={14} /></button>
            <button onClick={onToggleViewports} className="flex items-center gap-1 px-2 py-1.5 rounded min-h-[36px]" style={{ fontSize: tokens.text.sm, background: showViewports ? `${tokens.colors.accent.cyan}20` : 'transparent', color: showViewports ? tokens.colors.accent.cyan : tokens.colors.text.muted, border: `1px solid ${showViewports ? tokens.colors.accent.cyan : 'transparent'}` }}>{showViewports ? <Eye size={14} /> : <EyeOff size={14} />}<Frame size={14} /></button>
            <div className="w-px h-5 mx-1" style={{ background: tokens.colors.border.default }} />
            <button onClick={() => onZoomChange(Math.max(50, zoom - 25))} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }}><ZoomOut size={14} /></button>
            <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => onZoomChange(Math.min(150, zoom + 25))} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }}><ZoomIn size={14} /></button>
          </div>
        )}
      </div>
      {!isCollapsed && !drillInViewGroupId && (
        <div className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.glass }}>
          <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>Size:</span>
          <div className="flex items-center gap-1"><Columns size={14} style={{ color: tokens.colors.text.muted }} /><button onClick={() => onUpdateCanvas({ ...canvas, cols: Math.max(1, canvas.cols - 1) })} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary }}>−</button><span style={{ fontSize: tokens.text.md, fontFamily: 'monospace', minWidth: 20, textAlign: 'center', color: tokens.colors.text.primary }}>{canvas.cols}</span><button onClick={() => onUpdateCanvas({ ...canvas, cols: Math.min(10, canvas.cols + 1) })} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary }}>+</button></div>
          <span style={{ fontSize: tokens.text.md, color: tokens.colors.text.muted }}>×</span>
          <div className="flex items-center gap-1"><Rows size={14} style={{ color: tokens.colors.text.muted }} /><button onClick={() => onUpdateCanvas({ ...canvas, rows: Math.max(1, canvas.rows - 1) })} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary }}>−</button><span style={{ fontSize: tokens.text.md, fontFamily: 'monospace', minWidth: 20, textAlign: 'center', color: tokens.colors.text.primary }}>{canvas.rows}</span><button onClick={() => onUpdateCanvas({ ...canvas, rows: Math.min(10, canvas.rows + 1) })} className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10" style={{ fontSize: tokens.text.md, color: tokens.colors.text.secondary }}>+</button></div>
          <button className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/10 ml-2 min-h-[32px]" style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}><Shrink size={14} /> Fit</button>
        </div>
      )}
      {!isCollapsed && <div style={{ height, overflow: 'hidden' }}>{drillInViewGroupId && drillInViewGroup && drillInLayout ? <ViewGroupDetailEditor viewGroup={drillInViewGroup} layout={drillInLayout} allLayouts={allLayouts} customLayouts={customLayouts} onBack={onDrillOut} onUpdateViewGroup={onUpdateViewGroup} onChangeLayout={(id) => onChangeLayout(drillInViewGroup.id, id)} onSaveAsCustomLayout={onSaveAsCustomLayout} /> : <CanvasView canvas={canvas} viewGroups={viewGroups} viewports={viewports} selectedViewGroupId={selectedViewGroupId} selectedViewportId={selectedViewportId} showViewGroups={showViewGroups} showViewports={showViewports} onSelectViewGroup={onSelectViewGroup} onSelectViewport={onSelectViewport} onDoubleClickViewGroup={onDrillIn} onDropLayout={onDropLayout} zoom={zoom} />}</div>}
      {!isCollapsed && <div className="h-3 cursor-ns-resize flex items-center justify-center" style={{ background: isDraggingResize ? tokens.colors.bg.glassActive : 'transparent' }} onMouseDown={handleResizeStart}><div className="w-10 h-1 rounded-full" style={{ background: isDraggingResize ? tokens.colors.accent.purple : tokens.colors.border.default }} /></div>}
    </div>
  );
};

// =============================================================================
// COMPONENTS: Tab Selector
// =============================================================================
const TabSelector = ({ activeTab, onChange, viewGroupCount, viewportCount, drillInMode, drillInColor }) => (
  <div className="flex" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
    {[{ id: 'viewgroups', icon: Package, label: drillInMode ? 'Views' : 'ViewGroups', count: viewGroupCount, color: tokens.colors.accent.purple, showDot: drillInMode },
      { id: 'viewports', icon: Frame, label: 'Viewports', count: viewportCount, color: tokens.colors.accent.cyan },
      { id: 'templates', icon: Sparkles, label: 'Templates', color: tokens.colors.accent.amber }
    ].map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 font-medium min-h-[44px]" style={{ fontSize: tokens.text.md, background: activeTab === tab.id ? `${tab.color}15` : 'transparent', color: activeTab === tab.id ? tab.color : tokens.colors.text.muted, borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent' }}>
        {tab.showDot && drillInColor && <div className="w-2.5 h-2.5 rounded-full" style={{ background: drillInColor }} />}
        <tab.icon size={14} />{tab.label}
        {tab.count !== undefined && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: activeTab === tab.id ? `${tab.color}30` : tokens.colors.bg.glass }}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

// =============================================================================
// COMPONENTS: ViewGroup List Item
// =============================================================================
const ViewGroupListItem = ({ viewGroup, layout, isSelected, isMultiSelectMode, isChecked, onClick, onDoubleClick, onToggleCheck, onDuplicate, onDelete, onSettings }) => (
  <div onClick={isMultiSelectMode ? onToggleCheck : onClick} onDoubleClick={!isMultiSelectMode ? onDoubleClick : undefined} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group" style={{ background: isSelected || isChecked ? `${viewGroup.color}15` : tokens.colors.bg.glass, border: `1px solid ${isSelected || isChecked ? viewGroup.color : tokens.colors.border.subtle}` }}>
    {isMultiSelectMode && <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: isChecked ? viewGroup.color : 'transparent', border: `2px solid ${isChecked ? viewGroup.color : tokens.colors.border.default}` }}>{isChecked && <Check size={14} color="white" strokeWidth={3} />}</div>}
    <LayoutPreview layout={layout} size="sm" active={isSelected} color={viewGroup.color} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2"><span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>{viewGroup.name}</span>{viewGroup.linkedTo && <Link2 size={12} style={{ color: tokens.colors.accent.blue }} />}</div>
      <div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, marginTop: 2 }}>{layout.name} • {viewGroup.views.length} views • dbl-click to edit</div>
    </div>
    {viewGroup.views.length === 0 && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: `${tokens.colors.accent.amber}20`, color: tokens.colors.accent.amber }}>empty</span>}
    {!isMultiSelectMode && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
      <button onClick={(e) => { e.stopPropagation(); onDuplicate(viewGroup); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }} title="Duplicate"><Copy size={14} /></button>
      <button onClick={(e) => { e.stopPropagation(); onSettings(viewGroup); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }} title="Settings"><Settings size={14} /></button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(viewGroup); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.accent.red }} title="Delete"><Trash2 size={14} /></button>
    </div>}
  </div>
);

// =============================================================================
// COMPONENTS: Viewport List Item
// =============================================================================
const ViewportListItem = ({ viewport, isSelected, onClick, onDuplicate, onDelete, onSettings, onToggleShare }) => (
  <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group" style={{ background: isSelected ? `${tokens.colors.accent.cyan}15` : tokens.colors.bg.glass, border: `1px solid ${isSelected ? tokens.colors.accent.cyan : tokens.colors.border.subtle}` }}>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>{viewport.name}</span>
        {viewport.isPrimary && <span className="px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: `${tokens.colors.accent.amber}30`, color: tokens.colors.accent.amber }}>Primary</span>}
        {viewport.isShared && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: `${tokens.colors.accent.green}20`, color: tokens.colors.accent.green }}><Users size={10} /> Shared</span>}
      </div>
      <div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, marginTop: 2 }}>{viewport.size.cols}×{viewport.size.rows} • {viewport.mode === 'snap' ? 'Snap' : 'Free'}</div>
    </div>
    <div className="p-1.5 rounded" style={{ background: viewport.mode === 'snap' ? `${tokens.colors.accent.purple}20` : `${tokens.colors.accent.green}20` }}>{viewport.mode === 'snap' ? <Magnet size={14} style={{ color: tokens.colors.accent.purple }} /> : <Move3D size={14} style={{ color: tokens.colors.accent.green }} />}</div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
      <button onClick={(e) => { e.stopPropagation(); onToggleShare(viewport); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: viewport.isShared ? tokens.colors.accent.green : tokens.colors.text.muted }} title={viewport.isShared ? 'Stop sharing' : 'Share'}><Share2 size={14} /></button>
      <button onClick={(e) => { e.stopPropagation(); onDuplicate(viewport); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }} title="Duplicate"><Copy size={14} /></button>
      <button onClick={(e) => { e.stopPropagation(); onSettings(viewport); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }} title="Settings"><Settings size={14} /></button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(viewport); }} className="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.accent.red }} title="Delete"><Trash2 size={14} /></button>
    </div>
  </div>
);

// =============================================================================
// COMPONENTS: View List Item
// =============================================================================
const ViewListItem = ({ view, isSelected, onClick }) => {
  const viewType = VIEW_TYPES[view.type];
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ background: isSelected ? `${viewType?.color}15` : tokens.colors.bg.glass, border: `1px solid ${isSelected ? viewType?.color : tokens.colors.border.subtle}` }}>
      {viewType && <viewType.icon size={20} />}
      <div className="flex-1"><div style={{ fontSize: tokens.text.lg, fontWeight: 500, color: tokens.colors.text.primary }}>{view.name}</div><div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{viewType?.name}</div></div>
    </div>
  );
};

// =============================================================================
// COMPONENTS: Templates Tab Content
// =============================================================================
const TemplatesTabContent = ({ builtinLayouts, customLayouts, savedTemplates, onAddViewGroup, onApplyToViewGroup, onDeleteCustomLayout, onSaveAsCustomLayout, onLoadTemplate, onSaveCurrentAsTemplate, drillInMode, drillInViewGroup }) => {
  const [quickCollapsed, setQuickCollapsed] = useState(false);
  const [savedCollapsed, setSavedCollapsed] = useState(false);
  const [savedFilter, setSavedFilter] = useState('all');
  const filtered = savedTemplates.filter(t => savedFilter === 'all' || t.type === savedFilter);
  const handleDrag = (e, l) => { e.dataTransfer.setData('layoutId', l.id); };
  const handleClick = (l) => drillInMode && onApplyToViewGroup ? onApplyToViewGroup(l) : onAddViewGroup(l.id);
  
  return (
    <div className="flex-1 overflow-auto">
      {drillInMode && drillInViewGroup && <div className="mx-2 mt-2 p-3 rounded-lg" style={{ background: `${drillInViewGroup.color}10`, border: `1px solid ${drillInViewGroup.color}40` }}><div className="flex items-center gap-2" style={{ fontSize: tokens.text.md, color: drillInViewGroup.color }}><div className="w-3 h-3 rounded-full" style={{ background: drillInViewGroup.color }} />Click to apply layout to "{drillInViewGroup.name}"</div></div>}
      <div style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer min-h-[44px]" style={{ background: tokens.colors.bg.glass }} onClick={() => setQuickCollapsed(!quickCollapsed)}>{quickCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}<Sparkles size={14} style={{ color: tokens.colors.accent.amber }} /><span style={{ fontSize: tokens.text.md, fontWeight: 500, color: tokens.colors.text.primary }}>Quick Layouts</span><span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{drillInMode ? 'click to apply' : 'drag to canvas'}</span></div>
        {!quickCollapsed && (
          <div className="px-3 py-3 space-y-3">
            <div><div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, marginBottom: 8 }}>Built-in</div><div className="flex flex-wrap gap-2">{builtinLayouts.map(l => <div key={l.id} draggable={!drillInMode} onDragStart={(e) => handleDrag(e, l)} onClick={() => handleClick(l)} className="flex flex-col items-center p-2 rounded cursor-pointer hover:bg-white/5 min-w-[52px]" title={l.name}><LayoutPreview layout={l} size="sm" /><span style={{ fontSize: tokens.text.xs, marginTop: 4, color: tokens.colors.text.muted }}>{l.name}</span></div>)}</div></div>
            {customLayouts.length > 0 && <div><div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, marginBottom: 8 }}>Custom</div><div className="flex flex-wrap gap-2">{customLayouts.map(l => <div key={l.id} draggable={!drillInMode} onDragStart={(e) => handleDrag(e, l)} onClick={() => handleClick(l)} className="flex flex-col items-center p-2 rounded cursor-pointer hover:bg-white/5 group relative min-w-[52px]" title={l.name}><LayoutPreview layout={l} size="sm" color={tokens.colors.accent.purple} /><span style={{ fontSize: tokens.text.xs, marginTop: 4, color: tokens.colors.accent.purple }}>{l.name}</span><button onClick={(e) => { e.stopPropagation(); onDeleteCustomLayout(l.id); }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center" style={{ background: tokens.colors.accent.red, color: 'white' }}><X size={10} /></button></div>)}</div></div>}
            <button onClick={onSaveAsCustomLayout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded hover:bg-white/5 min-h-[44px]" style={{ fontSize: tokens.text.md, border: `1px dashed ${tokens.colors.border.default}`, color: tokens.colors.text.muted }}><Plus size={16} /> New Custom Layout</button>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer min-h-[44px]" style={{ background: tokens.colors.bg.glass }} onClick={() => setSavedCollapsed(!savedCollapsed)}>{savedCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}<Library size={14} style={{ color: tokens.colors.accent.blue }} /><span style={{ fontSize: tokens.text.md, fontWeight: 500, color: tokens.colors.text.primary }}>Saved Layouts</span><span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{savedTemplates.length}</span></div>
        {!savedCollapsed && (
          <div className="px-3 py-3">
            <div className="flex gap-1.5 mb-3">{[{ id: 'all', label: 'All' }, { id: 'full', label: 'Full' }, { id: 'structure', label: 'Structure' }].map(f => <button key={f.id} onClick={() => setSavedFilter(f.id)} className="px-2.5 py-1.5 rounded min-h-[32px]" style={{ fontSize: tokens.text.sm, background: savedFilter === f.id ? `${tokens.colors.accent.blue}20` : 'transparent', color: savedFilter === f.id ? tokens.colors.accent.blue : tokens.colors.text.muted }}>{f.label}</button>)}</div>
            <div className="space-y-2">{filtered.map(tpl => <button key={tpl.id} onClick={() => onLoadTemplate(tpl)} className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-white/5 min-h-[56px]" style={{ border: `1px solid ${tokens.colors.border.subtle}` }}><div className="flex gap-1">{tpl.preview.slice(0, 2).map((id, i) => { const l = builtinLayouts.find(x => x.id === id); return l ? <LayoutPreview key={i} layout={l} size="xs" /> : null; })}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span style={{ fontSize: tokens.text.md, fontWeight: 500, color: tokens.colors.text.primary }}>{tpl.name}</span><span className="px-1.5 py-0.5 rounded" style={{ fontSize: tokens.text.xs, background: tpl.type === 'full' ? `${tokens.colors.accent.blue}20` : `${tokens.colors.accent.orange}20`, color: tpl.type === 'full' ? tokens.colors.accent.blue : tokens.colors.accent.orange }}>{tpl.type}</span></div><div style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{tpl.scope}</div></div></button>)}</div>
            <button onClick={onSaveCurrentAsTemplate} className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded hover:bg-white/5 min-h-[44px]" style={{ fontSize: tokens.text.md, border: `1px dashed ${tokens.colors.border.default}`, color: tokens.colors.text.muted }}><Save size={16} /> Save Current Canvas</button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTS: Panel Footer
// =============================================================================
const PanelFooter = ({ onHelp, onSave }) => (
  <div className="flex items-center justify-between px-3 py-2 flex-shrink-0" style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
    <button onClick={onHelp} className="w-9 h-9 rounded flex items-center justify-center hover:bg-white/10" style={{ color: tokens.colors.text.muted }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>
    <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium min-h-[40px]" style={{ fontSize: tokens.text.md, background: `${tokens.colors.accent.green}20`, color: tokens.colors.accent.green }}><Save size={16} /> Save Layout</button>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function LayoutTabV4_6() {
  const [viewGroups, setViewGroups] = useState(INITIAL_VIEWGROUPS);
  const [canvas, setCanvas] = useState(INITIAL_CANVAS);
  const [viewports, setViewports] = useState(INITIAL_VIEWPORTS);
  const [customLayouts, setCustomLayouts] = useState(INITIAL_CUSTOM_LAYOUTS);
  const [savedTemplates] = useState(INITIAL_SAVED_TEMPLATES);
  const [selectedViewGroupId, setSelectedViewGroupId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [drillInViewGroupId, setDrillInViewGroupId] = useState(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedViewGroupIds, setSelectedViewGroupIds] = useState([]);
  const [activeTab, setActiveTab] = useState('viewgroups');
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapHeight, setMapHeight] = useState(220);
  const [mapZoom, setMapZoom] = useState(100);
  const [showViewGroups, setShowViewGroups] = useState(true);
  const [showViewports, setShowViewports] = useState(true);
  const [containerWidth, setContainerWidth] = useState(420);
  const [containerHeight, setContainerHeight] = useState(750);
  
  const allLayouts = [...BUILTIN_LAYOUTS, ...customLayouts];
  const drillInViewGroup = viewGroups.find(vg => vg.id === drillInViewGroupId);
  
  const handleSelectViewGroup = useCallback((id) => { setSelectedViewGroupId(id); setSelectedViewportId(null); if (!drillInViewGroupId) setActiveTab('viewgroups'); }, [drillInViewGroupId]);
  const handleSelectViewport = useCallback((id) => { setSelectedViewportId(id); setSelectedViewGroupId(null); setActiveTab('viewports'); }, []);
  const handleDrillIn = useCallback((id) => { setDrillInViewGroupId(id); setSelectedViewGroupId(id); setActiveTab('viewgroups'); setMultiSelectMode(false); setSelectedViewGroupIds([]); }, []);
  const handleDrillOut = useCallback(() => setDrillInViewGroupId(null), []);
  const handleUpdateViewGroup = useCallback((u) => setViewGroups(prev => prev.map(vg => vg.id === u.id ? u : vg)), []);
  const handleChangeLayout = useCallback((vgId, layoutId) => setViewGroups(prev => prev.map(vg => vg.id === vgId ? { ...vg, layoutId } : vg)), []);
  
  const handleAddViewGroup = useCallback((layoutId) => {
    const newId = `vg-${Date.now()}`;
    const color = VIEWGROUP_COLORS[viewGroups.length % VIEWGROUP_COLORS.length];
    const newVG = createViewGroup(newId, `ViewGroup ${viewGroups.length + 1}`, layoutId, [], color);
    let maxRow = 0;
    canvas.viewGroupPositions.forEach(p => { maxRow = Math.max(maxRow, p.row + p.rowSpan); });
    setViewGroups(prev => [...prev, newVG]);
    setCanvas(prev => ({ ...prev, rows: Math.max(prev.rows, maxRow + 1), viewGroupPositions: [...prev.viewGroupPositions, { viewGroupId: newId, row: maxRow, col: 0, rowSpan: 1, colSpan: 1 }] }));
    handleSelectViewGroup(newId);
  }, [viewGroups, canvas, handleSelectViewGroup]);
  
  const handleDropLayout = useCallback((layoutId, pos) => {
    const newId = `vg-${Date.now()}`;
    const color = VIEWGROUP_COLORS[viewGroups.length % VIEWGROUP_COLORS.length];
    const newVG = createViewGroup(newId, `ViewGroup ${viewGroups.length + 1}`, layoutId, [], color);
    setViewGroups(prev => [...prev, newVG]);
    setCanvas(prev => ({ ...prev, viewGroupPositions: [...prev.viewGroupPositions, { viewGroupId: newId, row: pos.row, col: pos.col, rowSpan: 1, colSpan: 1 }] }));
    handleSelectViewGroup(newId);
  }, [viewGroups, handleSelectViewGroup]);
  
  const handleDeleteViewGroup = useCallback((vg) => { setViewGroups(prev => prev.filter(v => v.id !== vg.id)); setCanvas(prev => ({ ...prev, viewGroupPositions: prev.viewGroupPositions.filter(p => p.viewGroupId !== vg.id) })); if (selectedViewGroupId === vg.id) setSelectedViewGroupId(null); if (drillInViewGroupId === vg.id) setDrillInViewGroupId(null); }, [selectedViewGroupId, drillInViewGroupId]);
  const handleDuplicateViewGroup = useCallback((vg) => { const newId = `vg-${Date.now()}`; const newVG = { ...vg, id: newId, name: `${vg.name} Copy`, linkedTo: null }; const pos = canvas.viewGroupPositions.find(p => p.viewGroupId === vg.id); setViewGroups(prev => [...prev, newVG]); if (pos) setCanvas(prev => ({ ...prev, viewGroupPositions: [...prev.viewGroupPositions, { ...pos, viewGroupId: newId, row: pos.row + pos.rowSpan }] })); handleSelectViewGroup(newId); }, [canvas, handleSelectViewGroup]);
  
  // Multi-select handlers
  const handleToggleCheck = useCallback((id) => setSelectedViewGroupIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]), []);
  const handleCombine = useCallback(() => { console.log('Combine:', selectedViewGroupIds); setSelectedViewGroupIds([]); setMultiSelectMode(false); }, [selectedViewGroupIds]);
  const handleLink = useCallback(() => { console.log('Link:', selectedViewGroupIds); setSelectedViewGroupIds([]); setMultiSelectMode(false); }, [selectedViewGroupIds]);
  const handleSwap = useCallback(() => { if (selectedViewGroupIds.length === 2) { const [a, b] = selectedViewGroupIds; setCanvas(prev => ({ ...prev, viewGroupPositions: prev.viewGroupPositions.map(p => p.viewGroupId === a ? { ...p, viewGroupId: b } : p.viewGroupId === b ? { ...p, viewGroupId: a } : p) })); } setSelectedViewGroupIds([]); setMultiSelectMode(false); }, [selectedViewGroupIds]);
  const handleMatch = useCallback(() => { console.log('Match:', selectedViewGroupIds); setSelectedViewGroupIds([]); setMultiSelectMode(false); }, [selectedViewGroupIds]);
  const handleDeleteSelected = useCallback(() => { setViewGroups(prev => prev.filter(vg => !selectedViewGroupIds.includes(vg.id))); setCanvas(prev => ({ ...prev, viewGroupPositions: prev.viewGroupPositions.filter(p => !selectedViewGroupIds.includes(p.viewGroupId)) })); setSelectedViewGroupIds([]); setMultiSelectMode(false); }, [selectedViewGroupIds]);
  
  // Viewport handlers
  const handleDuplicateViewport = useCallback((vp) => { const newId = `vp-${Date.now()}`; setViewports(prev => [...prev, { ...vp, id: newId, name: `${vp.name} Copy`, isPrimary: false }]); }, []);
  const handleDeleteViewport = useCallback((vp) => { setViewports(prev => prev.filter(v => v.id !== vp.id)); if (selectedViewportId === vp.id) setSelectedViewportId(null); }, [selectedViewportId]);
  const handleToggleShare = useCallback((vp) => setViewports(prev => prev.map(v => v.id === vp.id ? { ...v, isShared: !v.isShared } : v)), []);
  
  const handleDeleteCustomLayout = useCallback((id) => setCustomLayouts(prev => prev.filter(l => l.id !== id)), []);
  const handleApplyLayoutToViewGroup = useCallback((l) => { if (drillInViewGroupId && drillInViewGroup && drillInViewGroup.views.length <= getLayoutCapacity(l)) handleChangeLayout(drillInViewGroupId, l.id); }, [drillInViewGroupId, drillInViewGroup, handleChangeLayout]);
  
  return (
    <div className="min-h-screen p-4" style={{ fontFamily: "'Inter', sans-serif", background: tokens.colors.bg.primary }}>
      <div className="mb-4 text-center">
        <h1 className="font-bold mb-1" style={{ fontSize: '18px', color: tokens.colors.text.primary }}>Layout Tab V4.6 - Accessible + Multi-Select + Full Actions</h1>
        <p style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>12px min text • ViewGroup multi-select • Combine/Link/Swap • Share viewport</p>
      </div>
      
      <div className="mb-4 p-3 rounded-lg max-w-[900px] mx-auto" style={{ background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}` }}>
        <label className="flex items-center gap-2" style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>
          Panel: {containerWidth}×{containerHeight}
          <input type="range" min={380} max={500} value={containerWidth} onChange={(e) => setContainerWidth(Number(e.target.value))} className="w-20" />
          <input type="range" min={600} max={900} value={containerHeight} onChange={(e) => setContainerHeight(Number(e.target.value))} className="w-20" />
        </label>
      </div>
      
      <div className="flex gap-4 justify-center items-start flex-wrap">
        <div className="overflow-hidden flex flex-col rounded-lg" style={{ width: containerWidth, height: containerHeight, background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.default}` }}>
          <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
            <LayoutGrid size={18} style={{ color: tokens.colors.accent.teal }} />
            <span style={{ fontSize: tokens.text.xl, fontWeight: 600, color: tokens.colors.text.primary }}>Layout</span>
            <div className="flex-1" />
            <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted }}>{viewGroups.length} groups • {viewports.length} viewports</span>
          </div>
          
          <CanvasMapContainer canvas={canvas} viewGroups={viewGroups} viewports={viewports} selectedViewGroupId={selectedViewGroupId} selectedViewportId={selectedViewportId} onSelectViewGroup={handleSelectViewGroup} onSelectViewport={handleSelectViewport} drillInViewGroupId={drillInViewGroupId} onDrillIn={handleDrillIn} onDrillOut={handleDrillOut} isCollapsed={mapCollapsed} onToggleCollapse={() => setMapCollapsed(!mapCollapsed)} height={mapHeight} onResize={setMapHeight} zoom={mapZoom} onZoomChange={setMapZoom} showViewGroups={showViewGroups} onToggleViewGroups={() => setShowViewGroups(!showViewGroups)} showViewports={showViewports} onToggleViewports={() => setShowViewports(!showViewports)} onDropLayout={handleDropLayout} onUpdateCanvas={setCanvas} onUpdateViewGroup={handleUpdateViewGroup} onChangeLayout={handleChangeLayout} allLayouts={allLayouts} customLayouts={customLayouts} onSaveAsCustomLayout={() => console.log('Save custom')} />
          
          <TabSelector activeTab={activeTab} onChange={setActiveTab} viewGroupCount={drillInViewGroupId ? drillInViewGroup?.views.length || 0 : viewGroups.length} viewportCount={viewports.length} drillInMode={!!drillInViewGroupId} drillInColor={drillInViewGroup?.color} />
          
          <div className="flex-1 overflow-auto flex flex-col">
            {activeTab === 'viewgroups' && (
              <>
                {!drillInViewGroupId && (
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
                    <button onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedViewGroupIds([]); }} className="flex items-center gap-2 px-3 py-1.5 rounded font-medium min-h-[36px]" style={{ fontSize: tokens.text.sm, background: multiSelectMode ? `${tokens.colors.accent.purple}20` : 'transparent', color: multiSelectMode ? tokens.colors.accent.purple : tokens.colors.text.secondary, border: `1px solid ${multiSelectMode ? tokens.colors.accent.purple : tokens.colors.border.subtle}` }}>{multiSelectMode ? <CheckSquare size={14} /> : <Square size={14} />} Select Multiple</button>
                    <div className="flex-1" />
                    {!multiSelectMode && <button onClick={() => handleAddViewGroup('single')} className="flex items-center gap-1.5 px-3 py-1.5 rounded font-medium min-h-[36px]" style={{ fontSize: tokens.text.sm, background: `${tokens.colors.accent.green}20`, color: tokens.colors.accent.green }}><Plus size={14} /> Add ViewGroup</button>}
                  </div>
                )}
                {multiSelectMode && selectedViewGroupIds.length > 0 && <ViewGroupMultiSelectBar selectedCount={selectedViewGroupIds.length} viewGroups={viewGroups} selectedIds={selectedViewGroupIds} onCombine={handleCombine} onLink={handleLink} onSwap={handleSwap} onMatch={handleMatch} onDelete={handleDeleteSelected} onExit={() => { setMultiSelectMode(false); setSelectedViewGroupIds([]); }} />}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {drillInViewGroupId && drillInViewGroup ? (drillInViewGroup.views.length > 0 ? drillInViewGroup.views.map(v => <ViewListItem key={v.id} view={v} isSelected={false} onClick={() => {}} />) : <div className="text-center py-6" style={{ fontSize: tokens.text.md, color: tokens.colors.text.muted }}>No views yet. Click cells above to add.</div>) : viewGroups.map(vg => <ViewGroupListItem key={vg.id} viewGroup={vg} layout={allLayouts.find(l => l.id === vg.layoutId) || BUILTIN_LAYOUTS[0]} isSelected={selectedViewGroupId === vg.id} isMultiSelectMode={multiSelectMode} isChecked={selectedViewGroupIds.includes(vg.id)} onClick={() => handleSelectViewGroup(vg.id)} onDoubleClick={() => handleDrillIn(vg.id)} onToggleCheck={() => handleToggleCheck(vg.id)} onDuplicate={handleDuplicateViewGroup} onDelete={handleDeleteViewGroup} onSettings={() => console.log('Settings:', vg.id)} />)}
                </div>
              </>
            )}
            {activeTab === 'viewports' && <div className="flex-1 overflow-auto p-2 space-y-2">{viewports.map(vp => <ViewportListItem key={vp.id} viewport={vp} isSelected={selectedViewportId === vp.id} onClick={() => handleSelectViewport(vp.id)} onDuplicate={handleDuplicateViewport} onDelete={handleDeleteViewport} onSettings={() => console.log('VP Settings:', vp.id)} onToggleShare={handleToggleShare} />)}<button className="w-full py-3 rounded-lg flex items-center justify-center gap-2 min-h-[48px]" style={{ fontSize: tokens.text.md, border: `1px dashed ${tokens.colors.border.default}`, color: tokens.colors.text.muted }}><Plus size={16} /> Add Viewport</button></div>}
            {activeTab === 'templates' && <TemplatesTabContent builtinLayouts={BUILTIN_LAYOUTS} customLayouts={customLayouts} savedTemplates={savedTemplates} onAddViewGroup={handleAddViewGroup} onApplyToViewGroup={handleApplyLayoutToViewGroup} onDeleteCustomLayout={handleDeleteCustomLayout} onSaveAsCustomLayout={() => console.log('Save custom')} onLoadTemplate={(t) => console.log('Load:', t)} onSaveCurrentAsTemplate={() => console.log('Save current')} drillInMode={!!drillInViewGroupId} drillInViewGroup={drillInViewGroup} />}
          </div>
          
          <PanelFooter onHelp={() => console.log('Help')} onSave={() => console.log('Save')} />
        </div>
        
        <div className="p-4 rounded-lg" style={{ width: 300, background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.subtle}` }}>
          <div style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary, marginBottom: 12 }}>V4.6 Features</div>
          <div className="space-y-2" style={{ fontSize: tokens.text.sm }}>
            <div className="p-3 rounded-lg" style={{ background: `${tokens.colors.accent.green}10` }}><div className="font-medium mb-1" style={{ color: tokens.colors.accent.green }}>✓ Accessible Text</div><div style={{ color: tokens.colors.text.secondary }}>12px minimum • 36px+ touch targets</div></div>
            <div className="p-3 rounded-lg" style={{ background: `${tokens.colors.accent.purple}10` }}><div className="font-medium mb-1" style={{ color: tokens.colors.accent.purple }}>📦 ViewGroup Multi-Select</div><div style={{ color: tokens.colors.text.secondary }}>Toggle mode • Checkboxes • Action bar</div></div>
            <div className="p-3 rounded-lg" style={{ background: `${tokens.colors.accent.blue}10` }}><div className="font-medium mb-1" style={{ color: tokens.colors.accent.blue }}>🔗 Multi-Select Actions</div><div style={{ color: tokens.colors.text.secondary }}>Combine • Link • Swap • Match • Delete</div></div>
            <div className="p-3 rounded-lg" style={{ background: `${tokens.colors.accent.amber}10` }}><div className="font-medium mb-1" style={{ color: tokens.colors.accent.amber }}>⚙️ Single-Item Actions</div><div style={{ color: tokens.colors.text.secondary }}>Hover for: Duplicate, Settings, Delete</div></div>
            <div className="p-3 rounded-lg" style={{ background: `${tokens.colors.accent.cyan}10` }}><div className="font-medium mb-1" style={{ color: tokens.colors.accent.cyan }}>👥 Share Viewport</div><div style={{ color: tokens.colors.text.secondary }}>Toggle sharing • Collaborators see your view</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
