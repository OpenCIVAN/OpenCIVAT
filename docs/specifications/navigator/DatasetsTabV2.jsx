import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Database, Eye, EyeOff, ChevronDown, ChevronRight, Plus, Trash2,
  X, AlertTriangle, MoreHorizontal, Settings, Link2, Copy, Search,
  Snowflake, Thermometer, HardDrive, Clock, ArrowRight, Play, Pause,
  CheckCircle, XCircle, Loader2, AlertOctagon, FileBox, GitBranch,
  Layers, LayoutTemplate, User, Users, FolderOpen, Download, Upload,
  RefreshCw, HelpCircle, Filter, SortDesc, Cpu, Activity, Zap,
  ChevronUp, Archive, Star, StarOff, Share2, Lock, Unlock, ExternalLink,
  BarChart3, Box, FileText, Image, Table2, Sparkles, Scissors, Wand2,
  TrendingDown, Grid3X3, Maximize2, History, BookTemplate, Save, Import,
  GripVertical, Pencil, RotateCcw, Trash, Camera, Bookmark, BookmarkPlus,
  Link, Unlink, Move, PanelRightOpen, ChevronLeft, Check, Globe, Folder,
  MoreVertical, Focus, Navigation, LayoutGrid, Crosshair, SlidersHorizontal,
  Palette, ListFilter, ChevronsUpDown, ChevronsDownUp
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS (VR-First, matching Layout Tab V4.6)
// =============================================================================
const tokens = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#12121a',
      tertiary: '#1a1a24',
      elevated: '#1e1e2a',
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
      lime: '#84cc16',
    },
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      processing: '#a855f7',
    },
    memory: {
      safe: '#22c55e',
      moderate: '#f59e0b',
      warning: '#f97316',
      critical: '#ef4444',
    },
  },
  text: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '15px',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
  },
};

// =============================================================================
// FILE TYPE CONFIGURATIONS
// =============================================================================
const FILE_TYPES = {
  nifti: { icon: Box, color: tokens.colors.accent.teal, label: 'NIfTI', category: 'volumetric' },
  dicom: { icon: Layers, color: tokens.colors.accent.teal, label: 'DICOM', category: 'volumetric' },
  stl: { icon: Box, color: tokens.colors.accent.green, label: 'STL', category: 'mesh' },
  obj: { icon: Box, color: tokens.colors.accent.green, label: 'OBJ', category: 'mesh' },
  csv: { icon: Table2, color: tokens.colors.accent.orange, label: 'CSV', category: 'tabular' },
  json: { icon: FileText, color: tokens.colors.accent.blue, label: 'JSON', category: 'data' },
  png: { icon: Image, color: tokens.colors.accent.purple, label: 'PNG', category: 'image' },
};

// =============================================================================
// VIEW TYPES (for thumbnails and icons)
// =============================================================================
const VIEW_TYPES = {
  slice: { icon: Layers, color: tokens.colors.accent.blue, label: 'Slice' },
  volume: { icon: Box, color: tokens.colors.accent.purple, label: 'Volume' },
  mesh: { icon: Box, color: tokens.colors.accent.green, label: 'Mesh' },
  table: { icon: Table2, color: tokens.colors.accent.orange, label: 'Table' },
  chart: { icon: BarChart3, color: tokens.colors.accent.amber, label: 'Chart' },
};

// =============================================================================
// COMPUTE OPERATIONS
// =============================================================================
const COMPUTE_OPERATIONS = {
  'mesh-decimation': { id: 'mesh-decimation', name: 'Mesh Decimation', icon: TrendingDown, color: tokens.colors.accent.orange, description: 'Reduce polygon count', estimatedTime: '2-5 min' },
  'mesh-smoothing': { id: 'mesh-smoothing', name: 'Mesh Smoothing', icon: Wand2, color: tokens.colors.accent.purple, description: 'Laplacian smoothing', estimatedTime: '1-3 min' },
  'compute-statistics': { id: 'compute-statistics', name: 'Statistics', icon: BarChart3, color: tokens.colors.accent.blue, description: 'Compute bounds, histogram', estimatedTime: '30s-1 min' },
  'lod-generation': { id: 'lod-generation', name: 'LOD Generation', icon: Grid3X3, color: tokens.colors.accent.cyan, description: 'Level-of-detail versions', estimatedTime: '3-8 min' },
  'isosurface': { id: 'isosurface', name: 'Isosurface', icon: Layers, color: tokens.colors.accent.pink, description: 'Extract surface from volume', estimatedTime: '5-15 min' },
};

// =============================================================================
// MOCK DATA: Comprehensive scenario
// =============================================================================
const MOCK_DATASETS = [
  {
    id: 'ds-1',
    name: 'patient_brain_mri.nii.gz',
    fileType: 'nifti',
    fileSize: 1.8 * 1024 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 45 * 60000),
    status: 'loaded',
    isPinned: true,
    accessCount: 23,
    lastAccessedAt: new Date(Date.now() - 2 * 60000),
    loadedBy: 'You',
  },
  {
    id: 'ds-2',
    name: 'tumor_segmentation.nii.gz',
    fileType: 'nifti',
    fileSize: 1.2 * 1024 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 30 * 60000),
    status: 'loaded',
    isPinned: false,
    accessCount: 15,
    lastAccessedAt: new Date(Date.now() - 5 * 60000),
    loadedBy: 'You',
  },
  {
    id: 'ds-3',
    name: 'skull_reconstruction.stl',
    fileType: 'stl',
    fileSize: 523 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 60 * 60000),
    status: 'loaded',
    isPinned: false,
    accessCount: 8,
    lastAccessedAt: new Date(Date.now() - 25 * 60000),
    loadedBy: 'Alice',
  },
  {
    id: 'ds-4',
    name: 'vessel_network.obj',
    fileType: 'obj',
    fileSize: 892 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 90 * 60000),
    status: 'cold',
    isPinned: false,
    accessCount: 3,
    lastAccessedAt: new Date(Date.now() - 60 * 60000),
    loadedBy: 'You',
    coldThumbnail: true,
  },
  {
    id: 'ds-5',
    name: 'treatment_plan.csv',
    fileType: 'csv',
    fileSize: 2.4 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 15 * 60000),
    status: 'loaded',
    isPinned: true,
    accessCount: 42,
    lastAccessedAt: new Date(Date.now() - 1 * 60000),
    loadedBy: 'You',
  },
  {
    id: 'ds-6',
    name: 'cardiac_ct.nii.gz',
    fileType: 'nifti',
    fileSize: 2.1 * 1024 * 1024 * 1024,
    loadedAt: new Date(Date.now() - 120 * 60000),
    status: 'loaded',
    isPinned: false,
    accessCount: 5,
    lastAccessedAt: new Date(Date.now() - 45 * 60000),
    loadedBy: 'Bob',
  },
];

// Views with full feature set
const MOCK_VIEWS = [
  // Views for patient_brain_mri.nii.gz
  { 
    id: 'v-1', datasetId: 'ds-1', name: 'Axial Slice', type: 'slice', 
    status: 'active', color: '#a855f7', position: { row: 0, col: 0 }, 
    scope: 'workspace', sharedWith: ['Alice', 'Bob'],
    isStarredWorkspace: true, isStarredPersonal: false,
    isLocked: false, linkedTo: ['v-2'], filterCount: 2,
    hasSavedState: true, thumbnailUrl: null,
  },
  { 
    id: 'v-2', datasetId: 'ds-1', name: 'Sagittal Slice', type: 'slice', 
    status: 'active', color: '#3b82f6', position: { row: 0, col: 1 }, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: true,
    isLocked: false, linkedTo: ['v-1'], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
  },
  { 
    id: 'v-3', datasetId: 'ds-1', name: '3D Volume', type: 'volume', 
    status: 'active', color: '#22c55e', position: { row: 1, col: 0 }, 
    scope: 'workspace', sharedWith: ['Alice'],
    isStarredWorkspace: true, isStarredPersonal: false,
    isLocked: true, linkedTo: [], filterCount: 1,
    hasSavedState: true, thumbnailUrl: null,
  },
  { 
    id: 'v-4', datasetId: 'ds-1', name: 'Coronal View', type: 'slice', 
    status: 'inactive', color: '#f59e0b', position: null, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
  },
  
  // Views for tumor_segmentation
  { 
    id: 'v-5', datasetId: 'ds-2', name: 'Tumor Overlay', type: 'volume', 
    status: 'active', color: '#ec4899', position: { row: 1, col: 1 }, 
    scope: 'shared', sharedWith: ['Alice', 'Bob', 'Carol'],
    isStarredWorkspace: true, isStarredPersonal: true,
    isLocked: false, linkedTo: [], filterCount: 3,
    hasSavedState: true, thumbnailUrl: null,
  },
  { 
    id: 'v-6', datasetId: 'ds-2', name: 'Segmentation Mask', type: 'slice', 
    status: 'inactive', color: '#14b8a6', position: null, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
  },
  
  // Views for skull_reconstruction
  { 
    id: 'v-7', datasetId: 'ds-3', name: 'Full Skull', type: 'mesh', 
    status: 'active', color: '#f97316', position: { row: 2, col: 0 }, 
    scope: 'workspace', sharedWith: ['Bob'],
    isStarredWorkspace: false, isStarredPersonal: true,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
  },
  
  // Cold view
  { 
    id: 'v-9', datasetId: 'ds-4', name: 'Vessel Tree', type: 'mesh', 
    status: 'cold', color: '#6366f1', position: { row: 2, col: 1 }, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: true, thumbnailUrl: null,
  },
  
  // Views for treatment_plan
  { 
    id: 'v-10', datasetId: 'ds-5', name: 'Data Table', type: 'table', 
    status: 'active', color: '#22d3ee', position: { row: 0, col: 2 }, 
    scope: 'workspace', sharedWith: ['Alice', 'Bob'],
    isStarredWorkspace: true, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
  },
  { 
    id: 'v-11', datasetId: 'ds-5', name: 'Dose Chart', type: 'chart', 
    status: 'active', color: '#f472b6', position: { row: 1, col: 2 }, 
    scope: 'shared', sharedWith: ['Carol'],
    isStarredWorkspace: false, isStarredPersonal: true,
    isLocked: false, linkedTo: [], filterCount: 1,
    hasSavedState: true, thumbnailUrl: null,
  },
  
  // Trashed views
  { 
    id: 'v-trash-1', datasetId: 'ds-1', name: 'Old Analysis', type: 'slice', 
    status: 'trashed', color: '#64748b', position: null, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
    trashedAt: new Date(Date.now() - 2 * 24 * 60 * 60000),
  },
  { 
    id: 'v-trash-2', datasetId: 'ds-2', name: 'Test View', type: 'volume', 
    status: 'trashed', color: '#64748b', position: null, 
    scope: 'personal', sharedWith: [],
    isStarredWorkspace: false, isStarredPersonal: false,
    isLocked: false, linkedTo: [], filterCount: 0,
    hasSavedState: false, thumbnailUrl: null,
    trashedAt: new Date(Date.now() - 5 * 24 * 60 * 60000),
  },
];

// Derived datasets (abbreviated for space)
const MOCK_DERIVED = [
  { id: 'derived-1', sourceId: 'ds-1', name: 'patient_brain_smoothed.nii.gz', operation: 'mesh-smoothing', status: 'complete', progress: 100, fileSize: 1.7 * 1024 * 1024 * 1024, cached: true },
  { id: 'derived-2', sourceId: 'ds-1', name: 'patient_brain_decimated.nii.gz', operation: 'mesh-decimation', status: 'complete', progress: 100, fileSize: 920 * 1024 * 1024, cached: true },
  { id: 'derived-4', sourceId: 'ds-2', name: 'tumor_lod_levels.nii.gz', operation: 'lod-generation', status: 'processing', progress: 67, message: 'Generating LOD level 3 of 4...', estimatedRemaining: '2-3 min' },
  { id: 'derived-5', sourceId: 'ds-3', name: 'skull_decimated_50.stl', operation: 'mesh-decimation', status: 'processing', progress: 34, message: 'Processing triangles...', estimatedRemaining: '4-5 min' },
  { id: 'derived-9', sourceId: 'ds-6', name: 'cardiac_decimated.nii.gz', operation: 'mesh-decimation', status: 'failed', progress: 45, error: 'Out of memory: requested 3.2GB, available 1.1GB' },
];

// Templates (abbreviated)
const MOCK_TEMPLATES = [
  { id: 'tpl-1', name: 'Brain Analysis Pipeline', type: 'full', scope: 'project', views: [{ type: 'slice' }, { type: 'slice' }, { type: 'volume' }], usageCount: 34, isStarred: true },
  { id: 'tpl-2', name: 'Mesh Comparison', type: 'quick', scope: 'workspace', views: [{ type: 'mesh' }, { type: 'mesh' }], usageCount: 12, isStarred: false },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const formatRelativeTime = (date) => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatPosition = (pos) => {
  if (!pos) return null;
  const col = String.fromCharCode(65 + pos.col); // A, B, C...
  const row = pos.row + 1;
  return `${col}${row}`;
};

const getMemoryColor = (percentage) => {
  if (percentage < 70) return tokens.colors.memory.safe;
  if (percentage < 85) return tokens.colors.memory.moderate;
  if (percentage < 95) return tokens.colors.memory.warning;
  return tokens.colors.memory.critical;
};

const calculateMemoryUsage = (datasets) => {
  const loaded = datasets.filter(d => d.status === 'loaded');
  const totalUsed = loaded.reduce((sum, d) => sum + d.fileSize, 0);
  const totalAvailable = 8 * 1024 * 1024 * 1024;
  return { used: totalUsed, available: totalAvailable, percentage: (totalUsed / totalAvailable) * 100 };
};

// =============================================================================
// COMMON UI COMPONENTS
// =============================================================================

const IconButton = ({ icon: Icon, onClick, title, variant = 'ghost', size = 'md', disabled = false, active = false, badge = null, color = null }) => {
  const sizeMap = { sm: 28, md: 36, lg: 44 };
  const iconSizeMap = { sm: 12, md: 14, lg: 16 };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizeMap[size],
        height: sizeMap[size],
        minWidth: 36,
        minHeight: 36,
        borderRadius: tokens.radius.md,
        border: 'none',
        background: active ? `${color || tokens.colors.accent.purple}20` : variant === 'ghost' ? 'transparent' : tokens.colors.bg.glass,
        color: active ? (color || tokens.colors.accent.purple) : disabled ? tokens.colors.text.muted : tokens.colors.text.secondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={iconSizeMap[size]} />
      {badge && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: tokens.colors.accent.red, color: '#fff',
          fontSize: '10px', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
};

const Badge = ({ children, color = tokens.colors.accent.purple, variant = 'filled', size = 'sm' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: size === 'xs' ? '1px 4px' : '2px 6px',
    borderRadius: tokens.radius.sm,
    fontSize: size === 'xs' ? '10px' : tokens.text.xs,
    fontWeight: 500,
    background: variant === 'filled' ? `${color}30` : 'transparent',
    color: color,
    border: variant === 'outline' ? `1px solid ${color}40` : 'none',
  }}>{children}</span>
);

const ProgressBar = ({ progress, color = tokens.colors.accent.purple, height = 4 }) => (
  <div style={{ flex: 1, height, borderRadius: height / 2, background: tokens.colors.bg.tertiary, overflow: 'hidden' }}>
    <div style={{ width: `${progress}%`, height: '100%', borderRadius: height / 2, background: color, transition: 'width 0.3s ease' }} />
  </div>
);

const ColorDot = ({ color, size = 8, glow = false }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    borderRadius: '50%', background: color,
    boxShadow: glow ? `0 0 8px ${color}` : 'none',
    flexShrink: 0,
  }} />
);

const ScopeIndicator = ({ scope, showLabel = false }) => {
  const config = {
    ephemeral: { icon: Clock, color: tokens.colors.text.muted, label: 'Ephemeral' },
    personal: { icon: User, color: tokens.colors.accent.blue, label: 'Personal' },
    shared: { icon: Users, color: tokens.colors.accent.purple, label: 'Shared' },
    workspace: { icon: Folder, color: tokens.colors.accent.green, label: 'Workspace' },
    project: { icon: Database, color: tokens.colors.accent.teal, label: 'Project' },
  }[scope] || { icon: User, color: tokens.colors.text.muted, label: scope };
  const Icon = config.icon;
  return (
    <span title={config.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={12} color={config.color} />
      {showLabel && <span style={{ fontSize: tokens.text.xs, color: config.color }}>{config.label}</span>}
    </span>
  );
};

const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', background: tokens.colors.bg.glass,
    borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.border.subtle}`,
  }}>
    <Search size={14} color={tokens.colors.text.muted} />
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: tokens.colors.text.primary, fontSize: tokens.text.sm }}
    />
    {value && (
      <button onClick={() => onChange('')} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%', border: 'none',
        background: tokens.colors.bg.tertiary, color: tokens.colors.text.muted, cursor: 'pointer',
      }}><X size={10} /></button>
    )}
  </div>
);

const FilterChip = ({ label, count, active, onClick, color = tokens.colors.accent.purple }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: tokens.radius.md,
    border: `1px solid ${active ? color : tokens.colors.border.subtle}`,
    background: active ? `${color}20` : 'transparent',
    color: active ? color : tokens.colors.text.secondary,
    fontSize: tokens.text.sm, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.15s ease', minHeight: 36,
  }}>
    {label}
    {count !== undefined && (
      <span style={{
        padding: '1px 5px', borderRadius: 10,
        background: active ? `${color}40` : tokens.colors.bg.tertiary,
        fontSize: tokens.text.xs,
      }}>{count}</span>
    )}
  </button>
);

const TabButton = ({ icon: Icon, label, active, onClick, badge = null, color = tokens.colors.accent.teal }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 14px', borderRadius: `${tokens.radius.md}px ${tokens.radius.md}px 0 0`,
    border: 'none', borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
    background: active ? tokens.colors.bg.glass : 'transparent',
    color: active ? color : tokens.colors.text.secondary,
    fontSize: tokens.text.sm, fontWeight: active ? 600 : 500,
    cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 44, position: 'relative',
  }}>
    <Icon size={14} />
    <span>{label}</span>
    {badge && (
      <span style={{
        padding: '1px 5px', borderRadius: 10,
        background: badge.color || tokens.colors.accent.amber,
        color: '#fff', fontSize: '10px', fontWeight: 600,
      }}>{badge.value}</span>
    )}
  </button>
);

// =============================================================================
// THUMBNAIL COMPONENT (Placeholder with type icon)
// =============================================================================
const Thumbnail = ({ view, size = 'sm' }) => {
  const sizeMap = { xs: 24, sm: 32, md: 44, lg: 56 };
  const dim = sizeMap[size];
  const typeConfig = VIEW_TYPES[view.type] || { icon: Eye, color: tokens.colors.text.muted };
  const TypeIcon = typeConfig.icon;
  const isCold = view.status === 'cold';
  
  return (
    <div style={{
      width: dim, height: dim, borderRadius: tokens.radius.sm,
      background: isCold ? tokens.colors.bg.tertiary : `${view.color}20`,
      border: `2px solid ${isCold ? tokens.colors.accent.cyan : view.color}`,
      borderStyle: view.status === 'inactive' ? 'dashed' : 'solid',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      filter: isCold ? 'grayscale(0.5)' : 'none',
    }}>
      <TypeIcon size={dim * 0.5} color={isCold ? tokens.colors.accent.cyan : view.color} />
      {isCold && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          background: tokens.colors.accent.cyan, borderRadius: 4, padding: 2,
        }}>
          <Snowflake size={10} color="#fff" />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CONTEXT MENU COMPONENT
// =============================================================================
const ContextMenu = ({ position, items, onClose }) => {
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <div ref={menuRef} style={{
      position: 'fixed', top: position.y, left: position.x,
      minWidth: 180, background: tokens.colors.bg.elevated,
      borderRadius: tokens.radius.lg, border: `1px solid ${tokens.colors.border.default}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 1000,
      padding: '4px 0', overflow: 'hidden',
    }}>
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} style={{ height: 1, background: tokens.colors.border.subtle, margin: '4px 8px' }} />;
        }
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => { item.onClick?.(); onClose(); }}
            disabled={item.disabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 16px',
              border: 'none', background: 'transparent',
              color: item.danger ? tokens.colors.accent.red : item.disabled ? tokens.colors.text.muted : tokens.colors.text.primary,
              fontSize: tokens.text.sm, textAlign: 'left',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = tokens.colors.bg.glassHover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {Icon && <Icon size={14} />}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// VIEW ITEM COMPONENT (Full featured)
// =============================================================================
const ViewItemFull = ({
  view,
  dataset,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  // Actions
  onFocus,
  onPlace,
  onRemove,
  onTrash,
  onRestore,
  onDeletePermanent,
  onRename,
  onDuplicate,
  onLink,
  onSnapshot,
  onToggleVisibility,
  onShare,
  onStarWorkspace,
  onStarPersonal,
  onSaveState,
  onLoadState,
  onLock,
  onSettings,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(view.name);
  const [contextMenu, setContextMenu] = useState(null);
  const inputRef = useRef(null);
  
  const isActive = view.status === 'active';
  const isInactive = view.status === 'inactive';
  const isTrashed = view.status === 'trashed';
  const isCold = view.status === 'cold';
  
  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleDoubleClick = useCallback(() => {
    if (!isTrashed) setIsEditing(true);
  }, [isTrashed]);
  
  const handleFinishEditing = useCallback(() => {
    if (editedName.trim() && editedName !== view.name) {
      onRename?.(view.id, editedName.trim());
    }
    setIsEditing(false);
  }, [editedName, view.name, view.id, onRename]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleFinishEditing();
    else if (e.key === 'Escape') { setEditedName(view.name); setIsEditing(false); }
  }, [handleFinishEditing, view.name]);
  
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  
  // Build context menu items based on state
  const contextMenuItems = useMemo(() => {
    if (isTrashed) {
      return [
        { id: 'restore', icon: RotateCcw, label: 'Restore', onClick: () => onRestore?.(view.id) },
        { divider: true },
        { id: 'delete', icon: Trash, label: 'Delete Permanently', danger: true, onClick: () => onDeletePermanent?.(view.id) },
      ];
    }
    
    const items = [
      { id: 'focus', icon: Crosshair, label: 'Focus', shortcut: 'Enter', onClick: () => onFocus?.(view.id) },
    ];
    
    if (isActive) {
      items.push({ id: 'remove', icon: EyeOff, label: 'Remove from Canvas', onClick: () => onRemove?.(view.id) });
    } else {
      items.push({ id: 'place', icon: LayoutGrid, label: 'Place on Canvas', onClick: () => onPlace?.(view.id) });
    }
    
    items.push(
      { divider: true },
      { id: 'rename', icon: Pencil, label: 'Rename', shortcut: 'F2', onClick: () => setIsEditing(true) },
      { id: 'duplicate', icon: Copy, label: 'Duplicate', shortcut: '⌘D', onClick: () => onDuplicate?.(view.id) },
      { id: 'snapshot', icon: Camera, label: 'Save Snapshot', onClick: () => onSnapshot?.(view.id) },
      { divider: true },
      { id: 'link', icon: Link2, label: view.linkedTo?.length ? 'Manage Links' : 'Link to View...', onClick: () => onLink?.(view.id) },
      { id: 'share', icon: Share2, label: 'Share...', onClick: () => onShare?.(view.id) },
      { divider: true },
      { id: 'starWorkspace', icon: view.isStarredWorkspace ? Star : StarOff, label: view.isStarredWorkspace ? 'Unstar from Workspace' : 'Star to Workspace', onClick: () => onStarWorkspace?.(view.id) },
      { id: 'starPersonal', icon: view.isStarredPersonal ? Bookmark : BookmarkPlus, label: view.isStarredPersonal ? 'Remove from Personal' : 'Add to Personal', onClick: () => onStarPersonal?.(view.id) },
      { divider: true },
      { id: 'lock', icon: view.isLocked ? Unlock : Lock, label: view.isLocked ? 'Unlock' : 'Lock', onClick: () => onLock?.(view.id) },
      { id: 'settings', icon: Settings, label: 'Settings...', onClick: () => onSettings?.(view.id) },
      { divider: true },
      { id: 'trash', icon: Trash2, label: 'Move to Trash', danger: true, onClick: () => onTrash?.(view.id) },
    );
    
    return items;
  }, [view, isActive, isTrashed, onFocus, onPlace, onRemove, onDuplicate, onSnapshot, onLink, onShare, onStarWorkspace, onStarPersonal, onLock, onSettings, onTrash, onRestore, onDeletePermanent]);
  
  // Status icons
  const statusIcons = useMemo(() => {
    const icons = [];
    if (view.isStarredWorkspace) icons.push({ icon: Star, color: tokens.colors.accent.amber, key: 'starW' });
    if (view.isStarredPersonal) icons.push({ icon: Bookmark, color: tokens.colors.accent.blue, key: 'starP' });
    if (view.hasSavedState) icons.push({ icon: Save, color: tokens.colors.accent.green, key: 'saved' });
    if (view.sharedWith?.length > 0) icons.push({ icon: Users, color: tokens.colors.accent.purple, key: 'shared', count: view.sharedWith.length });
    if (view.isLocked) icons.push({ icon: Lock, color: tokens.colors.accent.amber, key: 'locked' });
    if (view.linkedTo?.length > 0) icons.push({ icon: Link2, color: tokens.colors.accent.teal, key: 'linked' });
    if (view.filterCount > 0) icons.push({ icon: ListFilter, color: tokens.colors.accent.purple, key: 'filters', count: view.filterCount });
    return icons;
  }, [view]);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        display: 'flex', flexDirection: 'column',
        background: isSelected ? `${view.color}15` : 'transparent',
        borderLeft: isSelected ? `3px solid ${view.color}` : '3px solid transparent',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Main row */}
      <div
        onClick={() => onSelect?.(view.id)}
        draggable={!isTrashed}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', paddingLeft: 24,
          cursor: 'pointer',
          opacity: isTrashed ? 0.6 : isCold ? 0.8 : 1,
        }}
      >
        {/* Drag handle */}
        {!isTrashed && (
          <span style={{ color: tokens.colors.text.muted, cursor: 'grab' }}>
            <GripVertical size={12} />
          </span>
        )}
        
        {/* Thumbnail */}
        <Thumbnail view={view} size="sm" />
        
        {/* Name and info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1, background: tokens.colors.bg.tertiary,
                  border: `1px solid ${view.color}`, borderRadius: tokens.radius.sm,
                  padding: '2px 6px', color: tokens.colors.text.primary,
                  fontSize: tokens.text.sm, outline: 'none',
                }}
              />
            ) : (
              <span
                onDoubleClick={handleDoubleClick}
                style={{
                  fontSize: tokens.text.sm, fontWeight: 500,
                  color: isTrashed ? tokens.colors.text.muted : tokens.colors.text.primary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: isTrashed ? 'line-through' : 'none',
                }}
              >
                {view.name}
              </span>
            )}
            <ScopeIndicator scope={view.scope} />
          </div>
          
          {/* Subtitle */}
          <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginTop: 2 }}>
            {dataset?.name || 'Unknown dataset'}
            {isTrashed && view.trashedAt && ` • Trashed ${formatRelativeTime(view.trashedAt)}`}
          </div>
        </div>
        
        {/* Status icons (when not hovered) */}
        {!isHovered && statusIcons.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {statusIcons.slice(0, 3).map(({ icon: Icon, color, key, count }) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 2, color }}>
                <Icon size={12} />
                {count && <span style={{ fontSize: '10px' }}>{count}</span>}
              </span>
            ))}
            {statusIcons.length > 3 && (
              <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
                +{statusIcons.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Position badge */}
        {view.position && (
          <Badge color={view.color}>{formatPosition(view.position)}</Badge>
        )}
        
        {/* Status badge */}
        {isActive && <Badge color={tokens.colors.accent.green} variant="outline">Active</Badge>}
        {isCold && <Badge color={tokens.colors.accent.cyan} variant="outline"><Snowflake size={10} style={{ marginRight: 3 }} />Cold</Badge>}
        
        {/* Hover actions */}
        {isHovered && !isTrashed && (
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton icon={Crosshair} size="sm" title="Focus" onClick={(e) => { e.stopPropagation(); onFocus?.(view.id); }} />
            {isActive ? (
              <IconButton icon={EyeOff} size="sm" title="Remove from Canvas" onClick={(e) => { e.stopPropagation(); onRemove?.(view.id); }} />
            ) : (
              <IconButton icon={LayoutGrid} size="sm" title="Place on Canvas" onClick={(e) => { e.stopPropagation(); onPlace?.(view.id); }} />
            )}
            <IconButton icon={Settings} size="sm" title="Settings" onClick={(e) => { e.stopPropagation(); onSettings?.(view.id); }} />
            <IconButton icon={MoreVertical} size="sm" title="More" onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }} />
          </div>
        )}
        
        {/* Trashed hover actions */}
        {isHovered && isTrashed && (
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton icon={RotateCcw} size="sm" title="Restore" color={tokens.colors.accent.green} onClick={(e) => { e.stopPropagation(); onRestore?.(view.id); }} />
            <IconButton icon={Trash} size="sm" title="Delete Permanently" color={tokens.colors.accent.red} onClick={(e) => { e.stopPropagation(); onDeletePermanent?.(view.id); }} />
          </div>
        )}
      </div>
      
      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// DATASET ITEM COMPONENT (Full featured)
// =============================================================================
const DatasetItemFull = ({
  dataset,
  views,
  isExpanded,
  isSelected,
  memory,
  onToggle,
  onSelect,
  onCreateView,
  onUnload,
  onSettings,
  onRefresh,
  // View action handlers (passed through)
  viewActions,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  
  const TypeIcon = FILE_TYPES[dataset.fileType]?.icon || Database;
  const typeColor = FILE_TYPES[dataset.fileType]?.color || tokens.colors.text.muted;
  const isCold = dataset.status === 'cold';
  
  const activeViewCount = views.filter(v => v.status === 'active').length;
  const totalViewCount = views.length;
  
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);
  
  const handleDragStart = useCallback((e) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/cia-dataset', JSON.stringify({
      datasetId: dataset.id,
      fileType: dataset.fileType,
      name: dataset.name,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, [dataset]);
  
  const contextMenuItems = [
    { id: 'createView', icon: Plus, label: 'Create View', onClick: () => onCreateView?.(dataset.id) },
    { divider: true },
    { id: 'settings', icon: Settings, label: 'Dataset Settings...', onClick: () => onSettings?.(dataset.id) },
    { id: 'refresh', icon: RefreshCw, label: 'Refresh', onClick: () => onRefresh?.(dataset.id) },
    { divider: true },
    { id: 'copyPath', icon: Copy, label: 'Copy File Path', onClick: () => navigator.clipboard?.writeText(dataset.name) },
    { id: 'export', icon: Download, label: 'Export...', onClick: () => {} },
    { divider: true },
    { id: 'unload', icon: Archive, label: isCold ? 'Reload into Memory' : 'Unload from Memory', onClick: () => onUnload?.(dataset.id) },
  ];
  
  return (
    <div style={{ marginBottom: 2 }}>
      {/* Dataset header */}
      <div
        onClick={onToggle}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setIsDragging(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          cursor: 'pointer',
          background: isSelected ? `${typeColor}10` : isDragging ? tokens.colors.bg.glassActive : 'transparent',
          borderLeft: isSelected ? `3px solid ${typeColor}` : '3px solid transparent',
          opacity: isCold ? 0.7 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Expand chevron */}
        <span style={{ color: tokens.colors.text.muted }}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        
        {/* Type icon */}
        <TypeIcon size={16} color={typeColor} />
        
        {/* Cold indicator */}
        {isCold && <Snowflake size={14} color={tokens.colors.accent.cyan} />}
        
        {/* Pinned indicator */}
        {dataset.isPinned && <Star size={12} color={tokens.colors.accent.amber} fill={tokens.colors.accent.amber} />}
        
        {/* Dataset info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: tokens.text.sm, fontWeight: 500,
            color: isCold ? tokens.colors.text.secondary : tokens.colors.text.primary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {dataset.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 2, fontSize: tokens.text.xs, color: tokens.colors.text.muted,
          }}>
            <span>{FILE_TYPES[dataset.fileType]?.label || dataset.fileType}</span>
            <span>•</span>
            <span>{formatFileSize(dataset.fileSize)}</span>
            <span>•</span>
            <span>{formatRelativeTime(dataset.lastAccessedAt)}</span>
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
          display: 'flex', alignItems: 'center', gap: 4,
          color: tokens.colors.text.muted, fontSize: tokens.text.xs,
        }}>
          <Eye size={12} />
          <span>{activeViewCount}/{totalViewCount}</span>
        </div>
        
        {/* Memory bar */}
        <div style={{ width: 60 }}>
          <ProgressBar progress={(dataset.fileSize / memory.available) * 100} color={typeColor} height={4} />
        </div>
        
        {/* Hover actions */}
        {isHovered && (
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton icon={Plus} size="sm" title="Create View" onClick={(e) => { e.stopPropagation(); onCreateView?.(dataset.id); }} />
            <IconButton icon={Settings} size="sm" title="Settings" onClick={(e) => { e.stopPropagation(); onSettings?.(dataset.id); }} />
            <IconButton icon={MoreVertical} size="sm" title="More" onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }} />
          </div>
        )}
      </div>
      
      {/* Expanded views */}
      {isExpanded && (
        <div style={{ borderLeft: `1px solid ${tokens.colors.border.subtle}`, marginLeft: 30 }}>
          {views.length > 0 ? (
            views.map(view => (
              <ViewItemFull
                key={view.id}
                view={view}
                dataset={dataset}
                isSelected={false}
                {...viewActions}
              />
            ))
          ) : (
            <div style={{
              padding: '12px 24px',
              fontSize: tokens.text.sm, color: tokens.colors.text.muted,
              fontStyle: 'italic',
            }}>
              No views created
            </div>
          )}
          
          {/* Create view button */}
          <button
            onClick={(e) => { e.stopPropagation(); onCreateView?.(dataset.id); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', width: '100%',
              border: 'none', background: 'transparent',
              color: tokens.colors.accent.teal,
              fontSize: tokens.text.sm, cursor: 'pointer', textAlign: 'left',
              minHeight: 40,
            }}
          >
            <Plus size={12} />
            Create View
          </button>
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// VIEWS TAB (with full functionality)
// =============================================================================
const ViewsTabFull = ({ views, datasets, memory, onAction }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViewId, setSelectedViewId] = useState(null);
  const [allExpanded, setAllExpanded] = useState(true);
  const [showTrashed, setShowTrashed] = useState(false);
  
  const activeViews = views.filter(v => v.status === 'active');
  const inactiveViews = views.filter(v => v.status === 'inactive');
  const coldViews = views.filter(v => v.status === 'cold');
  const sharedViews = views.filter(v => v.sharedWith?.length > 0 && v.status !== 'trashed');
  const trashedViews = views.filter(v => v.status === 'trashed');
  
  const filteredViews = useMemo(() => {
    let result = views.filter(v => v.status !== 'trashed');
    
    switch (filter) {
      case 'active': result = activeViews; break;
      case 'inactive': result = inactiveViews; break;
      case 'cold': result = coldViews; break;
      case 'shared': result = sharedViews; break;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(query));
    }
    
    return result;
  }, [filter, views, activeViews, inactiveViews, coldViews, sharedViews, searchQuery]);
  
  const getDataset = (datasetId) => datasets.find(d => d.id === datasetId);
  
  // View action handlers
  const viewActions = {
    onSelect: setSelectedViewId,
    onFocus: (id) => { console.log('Focus view:', id); onAction?.('focus', id); },
    onPlace: (id) => { console.log('Place view:', id); onAction?.('place', id); },
    onRemove: (id) => { console.log('Remove view:', id); onAction?.('remove', id); },
    onTrash: (id) => { console.log('Trash view:', id); onAction?.('trash', id); },
    onRestore: (id) => { console.log('Restore view:', id); onAction?.('restore', id); },
    onDeletePermanent: (id) => { console.log('Delete permanently:', id); onAction?.('deletePermanent', id); },
    onRename: (id, name) => { console.log('Rename view:', id, name); onAction?.('rename', id, name); },
    onDuplicate: (id) => { console.log('Duplicate view:', id); onAction?.('duplicate', id); },
    onLink: (id) => { console.log('Link view:', id); onAction?.('link', id); },
    onSnapshot: (id) => { console.log('Snapshot view:', id); onAction?.('snapshot', id); },
    onShare: (id) => { console.log('Share view:', id); onAction?.('share', id); },
    onStarWorkspace: (id) => { console.log('Star workspace:', id); onAction?.('starWorkspace', id); },
    onStarPersonal: (id) => { console.log('Star personal:', id); onAction?.('starPersonal', id); },
    onLock: (id) => { console.log('Lock view:', id); onAction?.('lock', id); },
    onSettings: (id) => { console.log('Settings view:', id); onAction?.('settings', id); },
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search views..." />
      </div>
      
      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 12px',
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <FilterChip label="All" count={views.filter(v => v.status !== 'trashed').length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip label="Active" count={activeViews.length} active={filter === 'active'} onClick={() => setFilter('active')} color={tokens.colors.accent.green} />
        <FilterChip label="Inactive" count={inactiveViews.length} active={filter === 'inactive'} onClick={() => setFilter('inactive')} color={tokens.colors.text.muted} />
        {coldViews.length > 0 && <FilterChip label="Cold" count={coldViews.length} active={filter === 'cold'} onClick={() => setFilter('cold')} color={tokens.colors.accent.cyan} />}
        <FilterChip label="Shared" count={sharedViews.length} active={filter === 'shared'} onClick={() => setFilter('shared')} color={tokens.colors.accent.purple} />
        
        <div style={{ flex: 1 }} />
        
        {/* Expand/Collapse all */}
        <IconButton
          icon={allExpanded ? ChevronsDownUp : ChevronsUpDown}
          title={allExpanded ? 'Collapse All' : 'Expand All'}
          size="sm"
          onClick={() => setAllExpanded(!allExpanded)}
        />
      </div>
      
      {/* View list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filteredViews.map(view => (
          <ViewItemFull
            key={view.id}
            view={view}
            dataset={getDataset(view.datasetId)}
            isSelected={selectedViewId === view.id}
            {...viewActions}
          />
        ))}
        
        {filteredViews.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: tokens.colors.text.muted }}>
            <EyeOff size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: tokens.text.sm }}>No views match the current filter</div>
          </div>
        )}
      </div>
      
      {/* Trashed section */}
      {trashedViews.length > 0 && (
        <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
          <button
            onClick={() => setShowTrashed(!showTrashed)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 16px',
              border: 'none', background: tokens.colors.bg.tertiary,
              color: tokens.colors.text.secondary,
              fontSize: tokens.text.sm, cursor: 'pointer', textAlign: 'left',
            }}
          >
            {showTrashed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Trash2 size={14} />
            <span>Trash</span>
            <Badge color={tokens.colors.text.muted}>{trashedViews.length}</Badge>
          </button>
          
          {showTrashed && (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {trashedViews.map(view => (
                <ViewItemFull
                  key={view.id}
                  view={view}
                  dataset={getDataset(view.datasetId)}
                  isSelected={selectedViewId === view.id}
                  {...viewActions}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderTop: `1px solid ${tokens.colors.border.subtle}`,
        background: tokens.colors.bg.secondary,
      }}>
        <IconButton icon={HelpCircle} title="Help" />
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: tokens.radius.md,
          border: 'none', background: tokens.colors.accent.teal,
          color: '#fff', fontSize: tokens.text.sm, fontWeight: 500,
          cursor: 'pointer', minHeight: 36,
        }}>
          <Plus size={14} />
          Create View
        </button>
        <IconButton icon={Link2} title="Link Views" />
      </div>
    </div>
  );
};

// =============================================================================
// DATASETS TAB (with full functionality)
// =============================================================================
const DatasetsTabFull = ({ datasets, views, memory, onAction }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('memory');
  const [expanded, setExpanded] = useState(new Set(['ds-1', 'ds-2']));
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);
  const [showMemoryWarning, setShowMemoryWarning] = useState(false);
  
  const toggleExpand = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  
  const expandAll = () => setExpanded(new Set(datasets.map(d => d.id)));
  const collapseAll = () => setExpanded(new Set());
  
  const getViewsForDataset = (datasetId) => views.filter(v => v.datasetId === datasetId && v.status !== 'trashed');
  
  const sortedDatasets = useMemo(() => {
    let result = [...datasets];
    if (searchQuery) {
      result = result.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    switch (sortBy) {
      case 'memory': result.sort((a, b) => b.fileSize - a.fileSize); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'recent': result.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt); break;
    }
    return result;
  }, [datasets, searchQuery, sortBy]);
  
  const viewActions = {
    onSelect: () => {},
    onFocus: (id) => onAction?.('focus', id),
    onPlace: (id) => onAction?.('place', id),
    onRemove: (id) => onAction?.('remove', id),
    onTrash: (id) => onAction?.('trash', id),
    onRestore: (id) => onAction?.('restore', id),
    onDeletePermanent: (id) => onAction?.('deletePermanent', id),
    onRename: (id, name) => onAction?.('rename', id, name),
    onDuplicate: (id) => onAction?.('duplicate', id),
    onLink: (id) => onAction?.('link', id),
    onSnapshot: (id) => onAction?.('snapshot', id),
    onShare: (id) => onAction?.('share', id),
    onStarWorkspace: (id) => onAction?.('starWorkspace', id),
    onStarPersonal: (id) => onAction?.('starPersonal', id),
    onLock: (id) => onAction?.('lock', id),
    onSettings: (id) => onAction?.('settings', id),
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search datasets..." />
      </div>
      
      {/* Sort options */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 12px',
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        alignItems: 'center',
      }}>
        <FilterChip label="By Memory" active={sortBy === 'memory'} onClick={() => setSortBy('memory')} color={tokens.colors.accent.orange} />
        <FilterChip label="By Name" active={sortBy === 'name'} onClick={() => setSortBy('name')} />
        <FilterChip label="Recent" active={sortBy === 'recent'} onClick={() => setSortBy('recent')} />
        
        <div style={{ flex: 1 }} />
        
        <IconButton icon={ChevronsUpDown} title="Expand All" size="sm" onClick={expandAll} />
        <IconButton icon={ChevronsDownUp} title="Collapse All" size="sm" onClick={collapseAll} />
      </div>
      
      {/* Dataset list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {sortedDatasets.map(dataset => (
          <DatasetItemFull
            key={dataset.id}
            dataset={dataset}
            views={getViewsForDataset(dataset.id)}
            isExpanded={expanded.has(dataset.id)}
            isSelected={selectedDatasetId === dataset.id}
            memory={memory}
            onToggle={() => toggleExpand(dataset.id)}
            onSelect={() => setSelectedDatasetId(dataset.id)}
            onCreateView={(id) => onAction?.('createView', id)}
            onUnload={(id) => onAction?.('unload', id)}
            onSettings={(id) => onAction?.('datasetSettings', id)}
            onRefresh={(id) => onAction?.('refresh', id)}
            viewActions={viewActions}
          />
        ))}
      </div>
      
      {/* Memory section */}
      <div
        onClick={() => setShowMemoryWarning(true)}
        style={{
          padding: '16px', cursor: 'pointer',
          borderTop: `1px solid ${tokens.colors.border.subtle}`,
          background: memory.percentage > 85 ? `${getMemoryColor(memory.percentage)}10` : tokens.colors.bg.secondary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <HardDrive size={14} color={getMemoryColor(memory.percentage)} />
          <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.secondary }}>Memory</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: tokens.text.sm, fontWeight: 600, color: getMemoryColor(memory.percentage) }}>
            {formatFileSize(memory.used)} / {formatFileSize(memory.available)}
          </span>
        </div>
        <ProgressBar progress={memory.percentage} color={getMemoryColor(memory.percentage)} height={6} />
        {memory.percentage > 85 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 8, fontSize: tokens.text.xs, color: getMemoryColor(memory.percentage),
          }}>
            <AlertTriangle size={12} />
            <span>Memory pressure - click to manage</span>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderTop: `1px solid ${tokens.colors.border.subtle}`,
        background: tokens.colors.bg.secondary,
      }}>
        <IconButton icon={HelpCircle} title="Help" />
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: tokens.radius.md,
          border: 'none', background: tokens.colors.accent.blue,
          color: '#fff', fontSize: tokens.text.sm, fontWeight: 500,
          cursor: 'pointer', minHeight: 36,
        }}>
          <ExternalLink size={14} />
          Load from Files
        </button>
        <IconButton icon={RefreshCw} title="Refresh" />
      </div>
    </div>
  );
};

// =============================================================================
// DERIVED TAB (abbreviated - same as V1 but with action handlers)
// =============================================================================
const DerivedTabFull = ({ datasets, derived, onAction }) => {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  
  const processingJobs = derived.filter(d => d.status === 'processing');
  const completedJobs = derived.filter(d => d.status === 'complete');
  const failedJobs = derived.filter(d => d.status === 'failed');
  
  const filteredDerived = useMemo(() => {
    switch (filter) {
      case 'processing': return processingJobs;
      case 'complete': return completedJobs;
      case 'failed': return failedJobs;
      default: return derived;
    }
  }, [filter, derived, processingJobs, completedJobs, failedJobs]);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${tokens.colors.border.subtle}`, flexWrap: 'wrap' }}>
        <FilterChip label="All" count={derived.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip label="Processing" count={processingJobs.length} active={filter === 'processing'} onClick={() => setFilter('processing')} color={tokens.colors.status.processing} />
        <FilterChip label="Complete" count={completedJobs.length} active={filter === 'complete'} onClick={() => setFilter('complete')} color={tokens.colors.status.success} />
        <FilterChip label="Failed" count={failedJobs.length} active={filter === 'failed'} onClick={() => setFilter('failed')} color={tokens.colors.status.error} />
      </div>
      
      {/* Processing banner */}
      {processingJobs.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: `${tokens.colors.status.processing}15`,
          borderBottom: `1px solid ${tokens.colors.status.processing}30`,
        }}>
          <Loader2 size={16} color={tokens.colors.status.processing} className="spin" />
          <span style={{ fontSize: tokens.text.sm }}><strong>{processingJobs.length}</strong> job{processingJobs.length !== 1 ? 's' : ''} processing</span>
        </div>
      )}
      
      {/* Derived list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filteredDerived.map(item => {
          const source = datasets.find(d => d.id === item.sourceId);
          const op = COMPUTE_OPERATIONS[item.operation];
          const OpIcon = op?.icon || Cpu;
          const StatusIcon = item.status === 'complete' ? CheckCircle : item.status === 'processing' ? Loader2 : item.status === 'failed' ? XCircle : Clock;
          const statusColor = item.status === 'complete' ? tokens.colors.status.success : item.status === 'processing' ? tokens.colors.status.processing : item.status === 'failed' ? tokens.colors.status.error : tokens.colors.text.muted;
          
          return (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedId === item.id ? `${op?.color || tokens.colors.accent.purple}10` : 'transparent',
              }}
            >
              <StatusIcon size={14} color={statusColor} className={item.status === 'processing' ? 'spin' : ''} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: tokens.text.sm, fontWeight: 500, color: item.status === 'failed' ? tokens.colors.status.error : tokens.colors.text.primary }}>
                    {item.name}
                  </span>
                  {item.cached && <Badge color={tokens.colors.accent.cyan} size="xs"><Zap size={8} /> Cached</Badge>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
                  <OpIcon size={10} color={op?.color} />
                  <span>{op?.name || item.operation}</span>
                  <span>•</span>
                  <span>from {source?.name || 'Unknown'}</span>
                </div>
                {item.status === 'processing' && (
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar progress={item.progress} color={tokens.colors.status.processing} height={4} />
                    <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted, marginTop: 4 }}>{item.message}</div>
                  </div>
                )}
                {item.status === 'failed' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 6, padding: '6px 8px',
                    borderRadius: tokens.radius.sm,
                    background: `${tokens.colors.status.error}15`,
                    border: `1px solid ${tokens.colors.status.error}30`,
                  }}>
                    <AlertOctagon size={12} color={tokens.colors.status.error} />
                    <span style={{ fontSize: tokens.text.xs, color: tokens.colors.status.error }}>{item.error}</span>
                  </div>
                )}
              </div>
              {item.status === 'complete' && <span style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>{formatFileSize(item.fileSize)}</span>}
              {item.status === 'failed' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAction?.('retry', item.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 8px', borderRadius: tokens.radius.sm,
                    border: `1px solid ${tokens.colors.status.error}50`,
                    background: 'transparent', color: tokens.colors.status.error,
                    fontSize: tokens.text.xs, cursor: 'pointer', minHeight: 28,
                  }}
                >
                  <RefreshCw size={10} />
                  Retry
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderTop: `1px solid ${tokens.colors.border.subtle}`,
        background: tokens.colors.bg.secondary,
      }}>
        <IconButton icon={HelpCircle} title="Help" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.default}`,
            background: 'transparent', color: tokens.colors.text.secondary,
            fontSize: tokens.text.sm, cursor: 'pointer', minHeight: 36,
          }}>
            <Clock size={14} />
            View Queue
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.default}`,
            background: 'transparent', color: tokens.colors.text.secondary,
            fontSize: tokens.text.sm, cursor: 'pointer', minHeight: 36,
          }}>
            <Trash2 size={14} />
            Clear Completed
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TEMPLATES TAB (abbreviated)
// =============================================================================
const TemplatesTabFull = ({ templates, onAction }) => {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        <FilterChip label="All" count={templates.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip label="Starred" count={templates.filter(t => t.isStarred).length} active={filter === 'starred'} onClick={() => setFilter('starred')} color={tokens.colors.accent.amber} />
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => setSelectedId(template.id)}
            style={{
              padding: 16, marginBottom: 12,
              borderRadius: tokens.radius.lg,
              border: `1px solid ${selectedId === template.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
              background: selectedId === template.id ? `${tokens.colors.accent.teal}10` : tokens.colors.bg.glass,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {template.isStarred && <Star size={14} color={tokens.colors.accent.amber} fill={tokens.colors.accent.amber} />}
              <span style={{ fontSize: tokens.text.md, fontWeight: 600, color: tokens.colors.text.primary }}>{template.name}</span>
              <Badge color={tokens.colors.accent.cyan}>{template.type}</Badge>
              <ScopeIndicator scope={template.scope} />
            </div>
            <div style={{ fontSize: tokens.text.xs, color: tokens.colors.text.muted }}>
              {template.views.length} views • Used {template.usageCount}×
            </div>
            {selectedId === template.id && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
                <button style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: tokens.radius.md,
                  border: 'none', background: tokens.colors.accent.teal,
                  color: '#fff', fontSize: tokens.text.sm, fontWeight: 500,
                  cursor: 'pointer', minHeight: 40,
                }}>
                  <Play size={14} />
                  Apply
                </button>
                <IconButton icon={Settings} title="Edit" variant="subtle" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderTop: `1px solid ${tokens.colors.border.subtle}`,
        background: tokens.colors.bg.secondary,
      }}>
        <IconButton icon={HelpCircle} title="Help" />
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: tokens.radius.md,
          border: 'none', background: tokens.colors.accent.teal,
          color: '#fff', fontSize: tokens.text.sm, fontWeight: 500,
          cursor: 'pointer', minHeight: 36,
        }}>
          <Save size={14} />
          Save Current
        </button>
        <IconButton icon={Import} title="Import" />
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const DatasetsTabV2 = () => {
  const [activeTab, setActiveTab] = useState('views');
  
  const memory = useMemo(() => calculateMemoryUsage(MOCK_DATASETS), []);
  const processingCount = MOCK_DERIVED.filter(d => d.status === 'processing').length;
  
  const handleAction = useCallback((action, ...args) => {
    console.log('Action:', action, args);
    // This would integrate with actual services:
    // viewLifecycleService, datasetManager, etc.
  }, []);
  
  return (
    <div style={{
      width: 400, height: 750,
      display: 'flex', flexDirection: 'column',
      background: tokens.colors.bg.primary,
      borderRadius: tokens.radius.lg, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
      
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${tokens.colors.accent.teal}20, transparent)`,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        <Database size={16} color={tokens.colors.accent.teal} />
        <span style={{ fontSize: tokens.text.lg, fontWeight: 600, color: tokens.colors.text.primary }}>Datasets</span>
        <span style={{ fontSize: tokens.text.sm, color: tokens.colors.text.muted, marginLeft: 'auto' }}>
          {MOCK_DATASETS.filter(d => d.status === 'loaded').length} loaded
        </span>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: tokens.radius.sm,
            background: `${getMemoryColor(memory.percentage)}20`, cursor: 'pointer',
          }}
        >
          <HardDrive size={12} color={getMemoryColor(memory.percentage)} />
          <span style={{ fontSize: tokens.text.xs, fontWeight: 600, color: getMemoryColor(memory.percentage) }}>
            {memory.percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
        <TabButton icon={Eye} label="Views" active={activeTab === 'views'} onClick={() => setActiveTab('views')} color={tokens.colors.accent.purple} />
        <TabButton icon={Database} label="Datasets" active={activeTab === 'datasets'} onClick={() => setActiveTab('datasets')} color={tokens.colors.accent.teal} />
        <TabButton icon={GitBranch} label="Derived" active={activeTab === 'derived'} onClick={() => setActiveTab('derived')} color={tokens.colors.accent.orange} badge={processingCount > 0 ? { value: processingCount, color: tokens.colors.status.processing } : null} />
        <TabButton icon={BookTemplate} label="Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} color={tokens.colors.accent.cyan} />
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'views' && <ViewsTabFull views={MOCK_VIEWS} datasets={MOCK_DATASETS} memory={memory} onAction={handleAction} />}
        {activeTab === 'datasets' && <DatasetsTabFull datasets={MOCK_DATASETS} views={MOCK_VIEWS} memory={memory} onAction={handleAction} />}
        {activeTab === 'derived' && <DerivedTabFull datasets={MOCK_DATASETS} derived={MOCK_DERIVED} onAction={handleAction} />}
        {activeTab === 'templates' && <TemplatesTabFull templates={MOCK_TEMPLATES} onAction={handleAction} />}
      </div>
    </div>
  );
};

export default DatasetsTabV2;
