import React, { useState, useMemo } from 'react';
import {
  Database, Eye, EyeOff, ChevronDown, ChevronRight, Plus, AlertTriangle,
  Settings, Search, HardDrive, Clock, CheckCircle, XCircle, Loader2,
  GitBranch, User, Users, RefreshCw, HelpCircle, Zap, Star, Box,
  Table2, Wand2, TrendingDown, BookTemplate, Save, Compass, Map,
  Bookmark, BookmarkPlus, Crosshair, ZoomIn, ZoomOut, RotateCcw,
  Home, Grid, ExternalLink, MoreVertical, Snowflake, Play, MapPin,
  History, Focus, Maximize2, X, BarChart3, ArrowRight, Layers,
  ChevronsUpDown, ChevronsDownUp, Pin
} from 'lucide-react';

// Design Tokens
const tokens = {
  colors: {
    bg: { primary: '#0a0a0f', secondary: '#12121a', tertiary: '#1a1a24', glass: 'rgba(255,255,255,0.03)', glassHover: 'rgba(255,255,255,0.06)' },
    border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.1)' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
    accent: { purple: '#a855f7', blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e', amber: '#f59e0b', red: '#ef4444', orange: '#f97316', teal: '#14b8a6', pink: '#ec4899' },
    status: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', processing: '#a855f7' },
  },
  text: { xs: '11px', sm: '12px', md: '13px', lg: '14px' },
  radius: { sm: 4, md: 6, lg: 8 },
};

const FILE_TYPES = {
  nifti: { icon: Box, color: tokens.colors.accent.teal, label: 'NIfTI' },
  stl: { icon: Box, color: tokens.colors.accent.green, label: 'STL' },
  obj: { icon: Box, color: tokens.colors.accent.green, label: 'OBJ' },
  csv: { icon: Table2, color: tokens.colors.accent.orange, label: 'CSV' },
};

const VIEW_TYPES = {
  slice: { icon: Layers, color: tokens.colors.accent.blue },
  volume: { icon: Box, color: tokens.colors.accent.purple },
  mesh: { icon: Box, color: tokens.colors.accent.green },
  table: { icon: Table2, color: tokens.colors.accent.orange },
  chart: { icon: BarChart3, color: tokens.colors.accent.amber },
};

// Mock Data
const DATASETS = [
  { id: 'ds-1', name: 'patient_brain_mri.nii.gz', fileType: 'nifti', fileSize: 1.8e9, status: 'loaded', isPinned: true, lastAccessedAt: new Date(Date.now() - 2 * 60000), loadedBy: 'You' },
  { id: 'ds-2', name: 'tumor_segmentation.nii.gz', fileType: 'nifti', fileSize: 1.2e9, status: 'loaded', isPinned: false, lastAccessedAt: new Date(Date.now() - 5 * 60000), loadedBy: 'You' },
  { id: 'ds-3', name: 'skull_reconstruction.stl', fileType: 'stl', fileSize: 523e6, status: 'loaded', isPinned: false, lastAccessedAt: new Date(Date.now() - 25 * 60000), loadedBy: 'Alice' },
  { id: 'ds-4', name: 'vessel_network.obj', fileType: 'obj', fileSize: 892e6, status: 'cold', isPinned: false, lastAccessedAt: new Date(Date.now() - 60 * 60000), loadedBy: 'You' },
  { id: 'ds-5', name: 'treatment_plan.csv', fileType: 'csv', fileSize: 2.4e6, status: 'loaded', isPinned: true, lastAccessedAt: new Date(Date.now() - 60000), loadedBy: 'You' },
];

const VIEWS = [
  // Views for patient_brain_mri.nii.gz
  { id: 'v-1', datasetId: 'ds-1', name: 'Axial Slice', type: 'slice', status: 'active', color: '#a855f7', position: { row: 0, col: 0 }, viewGroup: 'Brain Analysis' },
  { id: 'v-2', datasetId: 'ds-1', name: 'Sagittal Slice', type: 'slice', status: 'active', color: '#3b82f6', position: { row: 0, col: 1 }, viewGroup: 'Brain Analysis' },
  { id: 'v-3', datasetId: 'ds-1', name: '3D Volume', type: 'volume', status: 'active', color: '#22c55e', position: { row: 1, col: 0 }, viewGroup: 'Brain Analysis' },
  { id: 'v-4', datasetId: 'ds-1', name: 'Coronal View', type: 'slice', status: 'inactive', color: '#f59e0b', position: null, viewGroup: null },
  
  // Views for tumor_segmentation
  { id: 'v-5', datasetId: 'ds-2', name: 'Tumor Overlay', type: 'volume', status: 'active', color: '#ec4899', position: { row: 1, col: 1 }, viewGroup: 'Tumor Review' },
  { id: 'v-6', datasetId: 'ds-2', name: 'Segmentation Mask', type: 'slice', status: 'inactive', color: '#14b8a6', position: null, viewGroup: null },
  
  // Views for skull_reconstruction
  { id: 'v-7', datasetId: 'ds-3', name: 'Full Skull', type: 'mesh', status: 'active', color: '#f97316', position: { row: 2, col: 0 }, viewGroup: 'Comparison' },
  
  // Cold view for vessel_network
  { id: 'v-8', datasetId: 'ds-4', name: 'Vessel Tree', type: 'mesh', status: 'cold', color: '#6366f1', position: { row: 2, col: 1 }, viewGroup: 'Comparison' },
  
  // Views for treatment_plan
  { id: 'v-9', datasetId: 'ds-5', name: 'Data Table', type: 'table', status: 'active', color: '#22d3ee', position: { row: 0, col: 2 }, viewGroup: 'Data Tables' },
  { id: 'v-10', datasetId: 'ds-5', name: 'Dose Chart', type: 'chart', status: 'active', color: '#f472b6', position: { row: 1, col: 2 }, viewGroup: 'Data Tables' },
];

const DERIVED = [
  { id: 'd-1', sourceId: 'ds-1', name: 'brain_smoothed.nii.gz', operation: 'Smoothing', status: 'complete', progress: 100, fileSize: 1.7e9, cached: true },
  { id: 'd-2', sourceId: 'ds-1', name: 'brain_decimated.nii.gz', operation: 'Decimation', status: 'complete', progress: 100, fileSize: 920e6, cached: true },
  { id: 'd-3', sourceId: 'ds-2', name: 'tumor_lod.nii.gz', operation: 'LOD Gen', status: 'processing', progress: 67, message: 'Generating LOD 3/4...' },
  { id: 'd-4', sourceId: 'ds-3', name: 'skull_decimated.stl', operation: 'Decimation', status: 'processing', progress: 34, message: 'Processing triangles...' },
  { id: 'd-5', sourceId: 'ds-1', name: 'brain_stats.json', operation: 'Statistics', status: 'failed', progress: 45, error: 'Out of memory' },
];

const VIEWGROUPS = [
  { id: 'vg-1', name: 'Brain Analysis', color: '#a855f7', position: { row: 0, col: 0, rowSpan: 2, colSpan: 2 }, views: ['Axial', 'Sagittal', '3D'], isFocused: true },
  { id: 'vg-2', name: 'Tumor Review', color: '#ec4899', position: { row: 0, col: 2, rowSpan: 1, colSpan: 2 }, views: ['Overlay', 'Mask'], isFocused: false },
  { id: 'vg-3', name: 'Data Tables', color: '#22d3ee', position: { row: 1, col: 2, rowSpan: 1, colSpan: 2 }, views: ['Treatment'], isFocused: false },
  { id: 'vg-4', name: 'Comparison', color: '#f59e0b', position: { row: 2, col: 0, rowSpan: 2, colSpan: 3 }, views: ['Pre-op', 'Post-op'], isFocused: false },
];

const BOOKMARKS = [
  { id: 'bm-1', name: 'Pre-surgery baseline', viewGroupId: 'vg-1', isStarred: true },
  { id: 'bm-2', name: 'Tumor boundary', viewGroupId: 'vg-2', isStarred: true },
  { id: 'bm-3', name: 'Final approval', viewGroupId: 'vg-1', isStarred: false },
];

// Utilities
const formatSize = (bytes) => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
const formatTime = (date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};
const formatPosition = (pos) => pos ? `${String.fromCharCode(65 + pos.col)}${pos.row + 1}` : null;
const getMemoryColor = (pct) => pct < 70 ? tokens.colors.accent.green : pct < 85 ? tokens.colors.accent.amber : pct < 95 ? tokens.colors.accent.orange : tokens.colors.accent.red;

// Common Components
const IconButton = ({ icon: Icon, onClick, title, size = 14, active, color, disabled }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, minWidth: 28, borderRadius: tokens.radius.sm, border: 'none',
    background: active ? `${color || tokens.colors.accent.purple}20` : 'transparent',
    color: disabled ? tokens.colors.text.muted : active ? (color || tokens.colors.accent.purple) : tokens.colors.text.secondary,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  }}><Icon size={size} /></button>
);

const Badge = ({ children, color = tokens.colors.accent.purple, variant = 'filled' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 5px',
    borderRadius: tokens.radius.sm, fontSize: '10px', fontWeight: 500,
    background: variant === 'filled' ? `${color}30` : 'transparent',
    color, border: variant === 'outline' ? `1px solid ${color}40` : 'none',
  }}>{children}</span>
);

const ProgressBar = ({ progress, color = tokens.colors.accent.purple, height = 4 }) => (
  <div style={{ flex: 1, height, borderRadius: height / 2, background: tokens.colors.bg.tertiary, overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', borderRadius: height / 2, background: color, transition: 'width 0.3s' }} />
  </div>
);

const TabButton = ({ icon: Icon, label, active, onClick, badge, color = tokens.colors.accent.teal }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 5, padding: '9px 10px', flex: 1, justifyContent: 'center',
    borderRadius: `${tokens.radius.md}px ${tokens.radius.md}px 0 0`, border: 'none',
    borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
    background: active ? tokens.colors.bg.glass : 'transparent',
    color: active ? color : tokens.colors.text.secondary,
    fontSize: tokens.text.sm, fontWeight: active ? 600 : 500, cursor: 'pointer', minHeight: 38,
  }}>
    <Icon size={13} />
    <span>{label}</span>
    {badge && <span style={{ padding: '1px 5px', borderRadius: 10, background: badge.color, color: '#fff', fontSize: '10px', fontWeight: 600 }}>{badge.value}</span>}
  </button>
);

const ColorDot = ({ color, size = 8, glow = false, style = {} }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    borderRadius: '50%', background: color,
    boxShadow: glow ? `0 0 6px ${color}` : 'none',
    flexShrink: 0, ...style,
  }} />
);

// =============================================================================
// LIGHTWEIGHT VIEW ITEM (for Datasets Tab - just info + jump action)
// =============================================================================
const LightweightViewItem = ({ view, onJumpToLayout }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const isActive = view.status === 'active';
  const isInactive = view.status === 'inactive';
  const isCold = view.status === 'cold';
  const TypeIcon = VIEW_TYPES[view.type]?.icon || Eye;
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onJumpToLayout?.(view.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px 8px 24px',
        marginLeft: 16,
        borderLeft: `1px solid ${tokens.colors.border.subtle}`,
        background: isHovered ? tokens.colors.bg.glassHover : 'transparent',
        cursor: 'pointer',
        opacity: isCold ? 0.6 : isInactive ? 0.8 : 1,
      }}
    >
      {/* Color dot with glow if active */}
      <ColorDot color={view.color} size={8} glow={isActive} />
      
      {/* Type icon */}
      <TypeIcon size={12} color={tokens.colors.text.muted} />
      
      {/* View name */}
      <span style={{
        flex: 1, fontSize: tokens.text.sm,
        color: isCold ? tokens.colors.text.muted : tokens.colors.text.primary,
        fontWeight: isActive ? 500 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {view.name}
      </span>
      
      {/* Cold indicator */}
      {isCold && <Snowflake size={12} color={tokens.colors.accent.cyan} />}
      
      {/* ViewGroup badge (if assigned) */}
      {view.viewGroup && (
        <span style={{ fontSize: '10px', color: tokens.colors.text.muted }}>
          {view.viewGroup}
        </span>
      )}
      
      {/* Position badge (if on canvas) */}
      {view.position && (
        <Badge color={view.color}>{formatPosition(view.position)}</Badge>
      )}
      
      {/* Status badge */}
      {isActive && !view.position && <Badge color={tokens.colors.accent.green} variant="outline">Active</Badge>}
      {isInactive && <Badge color={tokens.colors.text.muted} variant="outline">Off</Badge>}
      
      {/* Jump arrow (always visible on hover) */}
      {isHovered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: tokens.colors.accent.teal }}>
          <span style={{ fontSize: '10px' }}>Layout</span>
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DATASET PARENT (Expandable with lightweight views)
// =============================================================================
const DatasetParent = ({ dataset, views, isExpanded, onToggle, memory, onCreateView, onJumpToLayout, onSettings }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const TypeIcon = FILE_TYPES[dataset.fileType]?.icon || Database;
  const typeColor = FILE_TYPES[dataset.fileType]?.color || tokens.colors.text.muted;
  const isCold = dataset.status === 'cold';
  
  const activeCount = views.filter(v => v.status === 'active').length;
  const totalCount = views.length;
  
  return (
    <div style={{ marginBottom: 2 }}>
      {/* Dataset Header */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: isHovered ? tokens.colors.bg.glassHover : 'transparent',
          borderLeft: `3px solid ${isExpanded ? typeColor : 'transparent'}`,
          cursor: 'pointer', opacity: isCold ? 0.7 : 1,
        }}
      >
        {/* Expand chevron */}
        <span style={{ color: tokens.colors.text.muted }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        
        {/* Type icon */}
        <TypeIcon size={16} color={typeColor} />
        
        {/* Pinned indicator */}
        {dataset.isPinned && <Star size={10} color={tokens.colors.accent.amber} fill={tokens.colors.accent.amber} />}
        
        {/* Cold indicator */}
        {isCold && <Snowflake size={12} color={tokens.colors.accent.cyan} />}
        
        {/* Dataset info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: tokens.text.sm, fontWeight: 500,
            color: isCold ? tokens.colors.text.secondary : tokens.colors.text.primary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {dataset.name}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2, fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
            <span>{FILE_TYPES[dataset.fileType]?.label}</span>
            <span>•</span>
            <span>{formatSize(dataset.fileSize)}</span>
            <span>•</span>
            <span>{formatTime(dataset.lastAccessedAt)}</span>
            {dataset.loadedBy !== 'You' && (
              <>
                <span>•</span>
                <span style={{ color: tokens.colors.accent.purple }}>by {dataset.loadedBy}</span>
              </>
            )}
          </div>
        </div>
        
        {/* View count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px',
          borderRadius: tokens.radius.sm, background: tokens.colors.bg.tertiary,
          color: activeCount > 0 ? tokens.colors.accent.green : tokens.colors.text.muted,
          fontSize: '10px', fontWeight: 500,
        }}>
          <Eye size={10} />
          <span>{activeCount}/{totalCount}</span>
        </div>
        
        {/* Memory bar */}
        <div style={{ width: 40 }}>
          <ProgressBar progress={(dataset.fileSize / memory.available) * 100} color={typeColor} height={3} />
        </div>
        
        {/* Hover actions */}
        {isHovered && (
          <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
            <IconButton icon={Plus} title="Create View" size={12} onClick={() => onCreateView?.(dataset.id)} />
            <IconButton icon={Settings} title="Dataset Settings" size={12} onClick={() => onSettings?.(dataset.id)} />
          </div>
        )}
      </div>
      
      {/* Expanded: Lightweight View List */}
      {isExpanded && (
        <div>
          {views.length > 0 ? (
            views.map(view => (
              <LightweightViewItem
                key={view.id}
                view={view}
                onJumpToLayout={onJumpToLayout}
              />
            ))
          ) : (
            <div style={{
              padding: '12px 24px 12px 52px',
              fontSize: tokens.text.xs, color: tokens.colors.text.muted, fontStyle: 'italic',
            }}>
              No views created
            </div>
          )}
          
          {/* Create View button */}
          <button
            onClick={() => onCreateView?.(dataset.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px 8px 52px', width: '100%',
              border: 'none', background: 'transparent',
              color: tokens.colors.accent.teal,
              fontSize: tokens.text.xs, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <Plus size={12} />
            Create View
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DATASETS TAB (with DatasetParent)
// =============================================================================
const DatasetsTab = () => {
  const [activeTab, setActiveTab] = useState('loaded');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set(['ds-1', 'ds-2']));
  
  const memory = useMemo(() => {
    const used = DATASETS.filter(d => d.status === 'loaded').reduce((s, d) => s + d.fileSize, 0);
    return { used, available: 8e9, percentage: (used / 8e9) * 100 };
  }, []);
  
  const processingCount = DERIVED.filter(d => d.status === 'processing').length;
  
  const toggleExpand = (id) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };
  
  const expandAll = () => setExpandedIds(new Set(DATASETS.map(d => d.id)));
  const collapseAll = () => setExpandedIds(new Set());
  
  const getViewsForDataset = (datasetId) => VIEWS.filter(v => v.datasetId === datasetId);
  
  const filteredDatasets = useMemo(() => {
    if (!searchQuery) return DATASETS;
    const q = searchQuery.toLowerCase();
    return DATASETS.filter(d => 
      d.name.toLowerCase().includes(q) ||
      VIEWS.filter(v => v.datasetId === d.id).some(v => v.name.toLowerCase().includes(q))
    );
  }, [searchQuery]);
  
  const handleJumpToLayout = (viewId) => {
    console.log('Jump to Layout Tab, focus view:', viewId);
    // This would navigate to Layout Tab and focus the view
  };
  
  const handleCreateView = (datasetId) => {
    console.log('Create view for dataset:', datasetId);
    // This would open view creation modal/panel
  };
  
  return (
    <div style={{
      width: 360, height: 650, display: 'flex', flexDirection: 'column',
      background: tokens.colors.bg.primary, borderRadius: tokens.radius.lg, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
      
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: `linear-gradient(135deg, ${tokens.colors.accent.teal}20, transparent)`,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        <Database size={16} color={tokens.colors.accent.teal} />
        <span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Datasets</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
          {DATASETS.filter(d => d.status === 'loaded').length} loaded
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px',
          borderRadius: tokens.radius.sm, background: `${getMemoryColor(memory.percentage)}20`, cursor: 'pointer',
        }}>
          <HardDrive size={11} color={getMemoryColor(memory.percentage)} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: getMemoryColor(memory.percentage) }}>
            {memory.percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
        <TabButton icon={Database} label="Loaded" active={activeTab === 'loaded'} onClick={() => setActiveTab('loaded')} color={tokens.colors.accent.teal} />
        <TabButton icon={GitBranch} label="Derived" active={activeTab === 'derived'} onClick={() => setActiveTab('derived')} color={tokens.colors.accent.orange} badge={processingCount > 0 ? { value: processingCount, color: tokens.colors.status.processing } : null} />
        <TabButton icon={BookTemplate} label="Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} color={tokens.colors.accent.purple} />
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'loaded' && (
          <>
            {/* Search + Expand/Collapse */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                background: tokens.colors.bg.glass, borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.border.subtle}`,
              }}>
                <Search size={12} color={tokens.colors.text.muted} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search datasets & views..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: tokens.colors.text.primary, fontSize: tokens.text.xs,
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    width: 16, height: 16, borderRadius: '50%', border: 'none',
                    background: tokens.colors.bg.tertiary, color: tokens.colors.text.muted,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><X size={8} /></button>
                )}
              </div>
              <IconButton icon={ChevronsUpDown} title="Expand All" size={12} onClick={expandAll} />
              <IconButton icon={ChevronsDownUp} title="Collapse All" size={12} onClick={collapseAll} />
            </div>
            
            {/* Dataset List with DatasetParent */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredDatasets.map(dataset => (
                <DatasetParent
                  key={dataset.id}
                  dataset={dataset}
                  views={getViewsForDataset(dataset.id)}
                  isExpanded={expandedIds.has(dataset.id)}
                  onToggle={() => toggleExpand(dataset.id)}
                  memory={memory}
                  onCreateView={handleCreateView}
                  onJumpToLayout={handleJumpToLayout}
                  onSettings={(id) => console.log('Settings for:', id)}
                />
              ))}
              
              {filteredDatasets.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: tokens.colors.text.muted }}>
                  <Search size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
                  <div style={{ fontSize: tokens.text.sm }}>No matches found</div>
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'derived' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {DERIVED.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px' }}>
                {item.status === 'complete' && <CheckCircle size={14} color={tokens.colors.status.success} />}
                {item.status === 'processing' && <Loader2 size={14} color={tokens.colors.status.processing} className="spin" />}
                {item.status === 'failed' && <XCircle size={14} color={tokens.colors.status.error} />}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: tokens.text.sm, fontWeight: 500, color: item.status === 'failed' ? tokens.colors.status.error : tokens.colors.text.primary }}>
                      {item.name}
                    </span>
                    {item.cached && <Badge color={tokens.colors.accent.cyan}><Zap size={8} style={{ marginRight: 2 }} />Cached</Badge>}
                  </div>
                  <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginTop: 2 }}>
                    {item.operation} • from {DATASETS.find(d => d.id === item.sourceId)?.name.slice(0, 20)}...
                  </div>
                  {item.status === 'processing' && (
                    <div style={{ marginTop: 6 }}>
                      <ProgressBar progress={item.progress} color={tokens.colors.status.processing} />
                      <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginTop: 3 }}>{item.message}</div>
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
                      padding: '4px 6px', borderRadius: tokens.radius.sm,
                      background: `${tokens.colors.status.error}15`, fontSize: tokens.text.xs, color: tokens.colors.status.error,
                    }}>
                      {item.error}
                    </div>
                  )}
                </div>
                
                {item.status === 'complete' && <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>{formatSize(item.fileSize)}</span>}
                {item.status === 'failed' && (
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px',
                    borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.status.error}50`,
                    background: 'transparent', color: tokens.colors.status.error,
                    fontSize: '10px', cursor: 'pointer',
                  }}>
                    <RefreshCw size={10} />
                    Retry
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div style={{ padding: 24, textAlign: 'center', color: tokens.colors.text.muted }}>
            <BookTemplate size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div style={{ fontSize: tokens.text.sm }}>2 templates available</div>
            <div style={{ fontSize: tokens.text.xs, marginTop: 4 }}>Brain Analysis Pipeline, Mesh Comparison</div>
          </div>
        )}
      </div>
      
      {/* Memory Footer */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <HardDrive size={12} color={getMemoryColor(memory.percentage)} />
          <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.secondary }}>Memory</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: tokens.text.xs, fontWeight: 600, color: getMemoryColor(memory.percentage) }}>
            {formatSize(memory.used)} / {formatSize(memory.available)}
          </span>
        </div>
        <ProgressBar progress={memory.percentage} color={getMemoryColor(memory.percentage)} height={5} />
        {memory.percentage > 85 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: tokens.text.xs, color: getMemoryColor(memory.percentage) }}>
            <AlertTriangle size={10} />
            <span>Memory pressure</span>
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderTop: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary,
      }}>
        <IconButton icon={HelpCircle} title="Help" />
        <button style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
          borderRadius: tokens.radius.md, border: 'none',
          background: tokens.colors.accent.blue, color: '#fff',
          fontSize: tokens.text.xs, fontWeight: 500, cursor: 'pointer',
        }}>
          <ExternalLink size={12} />
          Load from Files
        </button>
        <IconButton icon={RefreshCw} title="Refresh" />
      </div>
    </div>
  );
};

// =============================================================================
// NAVIGATOR TAB (NEW)
// =============================================================================
const NavigatorTab = () => {
  const [activeTab, setActiveTab] = useState('minimap');
  const [selectedGroupId, setSelectedGroupId] = useState('vg-1');
  
  const gridRows = 4;
  const gridCols = 4;
  
  const getGroupAtCell = (row, col) => VIEWGROUPS.find(vg =>
    row >= vg.position.row && row < vg.position.row + vg.position.rowSpan &&
    col >= vg.position.col && col < vg.position.col + vg.position.colSpan
  );
  
  const isTopLeft = (row, col, group) => group && row === group.position.row && col === group.position.col;
  const selectedGroup = VIEWGROUPS.find(g => g.id === selectedGroupId);
  
  return (
    <div style={{
      width: 360, height: 650, display: 'flex', flexDirection: 'column',
      background: tokens.colors.bg.primary, borderRadius: tokens.radius.lg, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        background: `linear-gradient(135deg, ${tokens.colors.accent.blue}20, transparent)`,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        <Compass size={16} color={tokens.colors.accent.blue} />
        <span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Navigator</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
          {VIEWGROUPS.length} groups • {BOOKMARKS.length} bookmarks
        </span>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
        <TabButton icon={Map} label="Minimap" active={activeTab === 'minimap'} onClick={() => setActiveTab('minimap')} color={tokens.colors.accent.blue} />
        <TabButton icon={Grid} label="Jump" active={activeTab === 'jump'} onClick={() => setActiveTab('jump')} color={tokens.colors.accent.purple} />
        <TabButton icon={Bookmark} label="Bookmarks" active={activeTab === 'bookmarks'} onClick={() => setActiveTab('bookmarks')} color={tokens.colors.accent.amber} badge={{ value: BOOKMARKS.length, color: tokens.colors.accent.amber }} />
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'minimap' && (
          <div style={{ padding: 12 }}>
            {/* Interactive Minimap */}
            <div style={{
              display: 'grid',
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 3, aspectRatio: '1',
              background: tokens.colors.bg.tertiary,
              borderRadius: tokens.radius.lg, padding: 8,
            }}>
              {Array.from({ length: gridRows * gridCols }).map((_, idx) => {
                const row = Math.floor(idx / gridCols);
                const col = idx % gridCols;
                const group = getGroupAtCell(row, col);
                const isTopLeftCell = isTopLeft(row, col, group);
                
                if (group && !isTopLeftCell) return null;
                
                const isSelected = group?.id === selectedGroupId;
                
                return (
                  <div
                    key={idx}
                    onClick={() => group && setSelectedGroupId(group.id)}
                    style={{
                      gridRow: group ? `span ${group.position.rowSpan}` : 'span 1',
                      gridColumn: group ? `span ${group.position.colSpan}` : 'span 1',
                      background: group ? `${group.color}${isSelected ? '40' : '20'}` : tokens.colors.bg.glass,
                      border: `2px solid ${group ? (isSelected ? group.color : `${group.color}50`) : tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: group ? 'pointer' : 'default',
                      position: 'relative', transition: 'all 0.15s',
                    }}
                  >
                    {group && (
                      <>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: group.color, textAlign: 'center' }}>{group.name}</span>
                        <span style={{ fontSize: '8px', color: tokens.colors.text.muted }}>{group.views.length} views</span>
                        {group.isFocused && (
                          <div style={{
                            position: 'absolute', top: 3, right: 3,
                            width: 6, height: 6, borderRadius: '50%',
                            background: tokens.colors.accent.green,
                            boxShadow: `0 0 6px ${tokens.colors.accent.green}`,
                          }} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Selected Group Info */}
            {selectedGroup && (
              <div style={{
                marginTop: 12, padding: 12,
                borderRadius: tokens.radius.lg,
                background: `${selectedGroup.color}10`,
                border: `1px solid ${selectedGroup.color}30`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ColorDot color={selectedGroup.color} size={10} />
                  <span style={{ fontSize: tokens.text.sm, fontWeight: 600, color: tokens.colors.text.primary }}>{selectedGroup.name}</span>
                  {selectedGroup.isFocused && <Badge color={tokens.colors.accent.green}>Focused</Badge>}
                </div>
                <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginBottom: 10 }}>
                  Views: {selectedGroup.views.join(', ')}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '7px', borderRadius: tokens.radius.md, border: 'none',
                    background: selectedGroup.color, color: '#fff',
                    fontSize: tokens.text.xs, fontWeight: 500, cursor: 'pointer',
                  }}>
                    <Focus size={12} />
                    Focus
                  </button>
                  <IconButton icon={Maximize2} title="Maximize" />
                  <IconButton icon={BookmarkPlus} title="Bookmark" />
                </div>
              </div>
            )}
            
            {/* Navigation Controls */}
            <div style={{ marginTop: 12, display: 'flex', gap: 4, justifyContent: 'center' }}>
              <IconButton icon={Home} title="Reset View" />
              <IconButton icon={ZoomIn} title="Zoom In" />
              <IconButton icon={ZoomOut} title="Zoom Out" />
              <IconButton icon={RotateCcw} title="Reset Camera" />
              <IconButton icon={Maximize2} title="Fit All" />
            </div>
          </div>
        )}
        
        {activeTab === 'jump' && (
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: tokens.text.xs, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8 }}>VIEWGROUPS</div>
            {VIEWGROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 12px', marginBottom: 6, borderRadius: tokens.radius.md,
                  border: `1px solid ${selectedGroupId === group.id ? group.color : tokens.colors.border.subtle}`,
                  background: selectedGroupId === group.id ? `${group.color}15` : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <ColorDot color={group.color} size={10} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: tokens.text.sm, fontWeight: 500, color: tokens.colors.text.primary }}>{group.name}</div>
                  <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>{group.views.length} views</div>
                </div>
                {group.isFocused && <Badge color={tokens.colors.accent.green}>Active</Badge>}
                <Crosshair size={12} color={tokens.colors.text.muted} />
              </button>
            ))}
            
            <div style={{ fontSize: tokens.text.xs, fontWeight: 600, color: tokens.colors.text.muted, marginTop: 16, marginBottom: 8 }}>INDIVIDUAL VIEWS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {VIEWS.filter(v => v.status === 'active').map(view => (
                <button
                  key={view.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                    borderRadius: tokens.radius.sm, border: `1px solid ${tokens.colors.border.subtle}`,
                    background: 'transparent', color: tokens.colors.text.secondary,
                    fontSize: '10px', cursor: 'pointer',
                  }}
                >
                  <ColorDot color={view.color} size={6} />
                  {view.name}
                  {view.position && <span style={{ color: tokens.colors.text.muted }}>{formatPosition(view.position)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'bookmarks' && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '8px 12px', fontSize: tokens.text.xs, fontWeight: 600, color: tokens.colors.text.muted }}>★ STARRED</div>
            {BOOKMARKS.filter(b => b.isStarred).map(bookmark => {
              const group = VIEWGROUPS.find(g => g.id === bookmark.viewGroupId);
              return (
                <div key={bookmark.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}>
                  <Star size={12} color={tokens.colors.accent.amber} fill={tokens.colors.accent.amber} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: tokens.text.sm, fontWeight: 500, color: tokens.colors.text.primary }}>{bookmark.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
                      <ColorDot color={group?.color} size={5} />
                      {group?.name}
                    </div>
                  </div>
                  <IconButton icon={Play} title="Restore" size={12} />
                </div>
              );
            })}
            
            <div style={{ padding: '12px 12px 8px', fontSize: tokens.text.xs, fontWeight: 600, color: tokens.colors.text.muted }}>ALL</div>
            {BOOKMARKS.filter(b => !b.isStarred).map(bookmark => {
              const group = VIEWGROUPS.find(g => g.id === bookmark.viewGroupId);
              return (
                <div key={bookmark.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}>
                  <MapPin size={12} color={tokens.colors.text.muted} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: tokens.text.sm, fontWeight: 500, color: tokens.colors.text.primary }}>{bookmark.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
                      <ColorDot color={group?.color} size={5} />
                      {group?.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {activeTab === 'bookmarks' && (
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary, display: 'flex', justifyContent: 'center' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
            borderRadius: tokens.radius.md, border: 'none',
            background: tokens.colors.accent.amber, color: '#fff',
            fontSize: tokens.text.xs, fontWeight: 500, cursor: 'pointer',
          }}>
            <BookmarkPlus size={12} />
            New Bookmark
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PanelRestructure = () => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 20, padding: 20,
      background: '#08080c', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Panel Restructure V2</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: 4, maxWidth: 600 }}>
          <strong>Datasets Tab:</strong> DatasetParent with lightweight nested views (info + jump to Layout)<br />
          <strong>Navigator Tab:</strong> Minimap, Quick Jump, Bookmarks
        </p>
      </div>
      
      {/* Panels side by side */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            DATASETS TAB
          </div>
          <DatasetsTab />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            NAVIGATOR TAB (New)
          </div>
          <NavigatorTab />
        </div>
      </div>
      
      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        padding: 12, background: tokens.colors.bg.secondary,
        borderRadius: tokens.radius.lg, maxWidth: 760, fontSize: '11px',
      }}>
        <div>
          <span style={{ color: tokens.colors.accent.green, fontWeight: 600 }}>Lightweight ViewItem:</span>
          <span style={{ color: tokens.colors.text.muted, marginLeft: 6 }}>Name, color, position, status, "→ Layout" jump</span>
        </div>
        <div>
          <span style={{ color: tokens.colors.accent.purple, fontWeight: 600 }}>Full ViewItem:</span>
          <span style={{ color: tokens.colors.text.muted, marginLeft: 6 }}>Layout Tab handles rename, settings, link, trash, etc.</span>
        </div>
      </div>
    </div>
  );
};

export default PanelRestructure;
