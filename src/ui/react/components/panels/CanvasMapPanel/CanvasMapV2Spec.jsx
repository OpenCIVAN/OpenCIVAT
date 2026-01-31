/**
 * @file CanvasMapV2Spec.jsx
 * @description Spec-driven Canvas Map V2 design prototype (storybook-only).
 */

import React, { useState, useMemo, useCallback, useEffect, useId, useRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useListFilter } from '@UI/react/hooks/useListFilter';

const makeIcon = (name, extraStyle = {}) => {
  const SpecIcon = ({ style, ...props }) => (
    <Icon name={name} style={{ ...extraStyle, ...style }} {...props} />
  );
  SpecIcon.displayName = `SpecIcon(${name})`;
  return SpecIcon;
};

const Search = makeIcon('search');
const X = makeIcon('close');
const ChevronDown = makeIcon('chevronDown');
const Check = makeIcon('check');
const ArrowDownAZ = makeIcon('sort');
const ArrowUpDown = makeIcon('arrowUpDown');
const Filter = makeIcon('filter');
const Tag = makeIcon('tag');
const Star = makeIcon('star');
const CheckCircle = makeIcon('checkCircle');
const Users = makeIcon('users');
const Link2 = makeIcon('link');
const Compass = makeIcon('compass');
const Grid3X3 = makeIcon('grid3x3');
const Layers = makeIcon('layers');
const Layers2 = makeIcon('layers');
const Home = makeIcon('home');
const Minus = makeIcon('remove');
const Plus = makeIcon('add');
const PanelRightClose = makeIcon('panelRightClose');
const PanelRightOpen = makeIcon('panelRightClose', { transform: 'rotate(180deg)' });
const Database = makeIcon('database');
const Box = makeIcon('box');
const BarChart3 = makeIcon('barChart');
const Table2 = makeIcon('grid');
const Image = makeIcon('image');
const FileText = makeIcon('fileText');
const Radio = makeIcon('radio');
const Circle = makeIcon('circle');
const Move = makeIcon('move');
const GripVertical = makeIcon('gripVertical');
const Grip = makeIcon('grip');
const MousePointer2 = makeIcon('mousePointer');
const Bookmark = makeIcon('bookmark');
const ChevronLeft = makeIcon('chevronLeft');
const ChevronRight = makeIcon('chevronRight');
const ChevronUp = makeIcon('chevronUp');
const Activity = makeIcon('activity');
const Scan = makeIcon('scan');
const Crosshair = makeIcon('crosshair');
const ArrowLeftRight = makeIcon('arrowLeftRight');

const tokens = {
  colors: {
    bg: {
      base: '#020406',
      primary: '#060a12',
      secondary: '#0c1220',
      tertiary: '#121a2e',
      hover: 'rgba(96, 165, 250, 0.08)',
      active: 'rgba(96, 165, 250, 0.15)',
    },
    glass: {
      subtle: 'rgba(96, 165, 250, 0.03)',
      light: 'rgba(96, 165, 250, 0.05)',
      medium: 'rgba(96, 165, 250, 0.08)',
      strong: 'rgba(96, 165, 250, 0.12)',
    },
    border: {
      subtle: 'rgba(96, 165, 250, 0.08)',
      default: 'rgba(96, 165, 250, 0.15)',
      focus: 'rgba(59, 130, 246, 0.5)',
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.8)',
      muted: 'rgba(148, 163, 184, 0.6)',
    },
    accent: {
      blue: '#3b82f6',
      cyan: '#22d3ee',
      purple: '#a855f7',
      amber: '#f59e0b',
      green: '#22c55e',
      red: '#ef4444',
      teal: '#14b8a6',
      pink: '#ec4899',
    },
    canvas: {
      bg: '#030303',
      cell: '#080808',
      cellHover: '#0f0f12',
      gridLine: 'rgba(96, 165, 250, 0.12)',
      gridLineMajor: 'rgba(96, 165, 250, 0.22)',
    },
  },
  radius: { xs: '2px', sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  fontSize: { xs: '9px', sm: '10px', md: '11px', lg: '12px', xl: '13px' },
  spacing: { xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px' },
};

const VIEW_TYPES = {
  volume: { icon: Box, color: '#a855f7', label: 'Volume', category: 'analysis' },
  slice: { icon: Layers2, color: '#3b82f6', label: 'Slice', category: 'analysis' },
  mpr: { icon: Grid3X3, color: '#22d3ee', label: 'MPR', category: 'analysis' },
  mesh: { icon: Box, color: '#14b8a6', label: '3D Mesh', category: 'visualization' },
  surface: { icon: Layers, color: '#22c55e', label: 'Surface', category: 'visualization' },
  pointcloud: { icon: Circle, color: '#8b5cf6', label: 'Point Cloud', category: 'visualization' },
  chart: { icon: BarChart3, color: '#f59e0b', label: 'Chart', category: 'data' },
  table: { icon: Table2, color: '#3b82f6', label: 'Table', category: 'data' },
  stats: { icon: Activity, color: '#22c55e', label: 'Statistics', category: 'data' },
  image: { icon: Image, color: '#ec4899', label: 'Image', category: 'media' },
  annotation: { icon: FileText, color: '#f59e0b', label: 'Annotation', category: 'media' },
};

const QUICK_FILTERS = [
  { id: 'active', label: 'Active', icon: CheckCircle, predicate: (item) => item.isActive !== false },
  { id: 'linked', label: 'Linked', icon: Link2, predicate: (item) => item.isLinked },
  { id: 'shared', label: 'Shared', icon: Users, predicate: (item) => item.isShared },
  { id: 'starred', label: 'Starred', icon: Star, predicate: (item) => item.isStarred },
];

const SORT_OPTIONS = [
  {
    value: 'position',
    label: 'Position (A1->)',
    shortLabel: 'Position',
    icon: Grid3X3,
    comparator: (a, b) => {
      const ap = (a.position?.row ?? a.canvasRow ?? 99) * 100 + (a.position?.col ?? a.canvasCol ?? 99);
      const bp = (b.position?.row ?? b.canvasRow ?? 99) * 100 + (b.position?.col ?? b.canvasCol ?? 99);
      return ap - bp;
    },
  },
  {
    value: 'name-asc',
    label: 'Name (A->Z)',
    shortLabel: 'Name up',
    icon: ArrowDownAZ,
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z->A)',
    shortLabel: 'Name down',
    icon: ArrowDownAZ,
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'type',
    label: 'By Type',
    shortLabel: 'Type',
    icon: Layers,
    comparator: (a, b) => {
      const at = (a.type || a.views?.[0]?.type || '');
      const bt = (b.type || b.views?.[0]?.type || '');
      return at.localeCompare(bt);
    },
  },
  {
    value: 'recent',
    label: 'Recently Modified',
    shortLabel: 'Recent',
    icon: ArrowUpDown,
    comparator: () => 0,
  },
];

const CANVAS = { rows: 10, cols: 10 };

const MOCK_VIEWGROUPS = [
  {
    id: 'vg-1',
    name: 'Brain Analysis',
    color: '#a855f7',
    isExplicit: true,
    layoutId: '1+2',
    position: { row: 0, col: 0, rowSpan: 3, colSpan: 4 },
    views: [
      { id: 'v-1', type: 'volume', name: 'Main Volume', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-2', type: 'slice', name: 'Axial Slice', gridPos: { row: 0, col: 2, rowSpan: 1, colSpan: 2 } },
      { id: 'v-3', type: 'stats', name: 'ROI Statistics', gridPos: { row: 1, col: 2, rowSpan: 1, colSpan: 2 } },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: true,
    tags: ['brain', 'mri'],
  },
  {
    id: 'vg-2',
    name: 'Data Explorer',
    color: '#22c55e',
    isExplicit: true,
    layoutId: 'side-by-side',
    position: { row: 0, col: 5, rowSpan: 2, colSpan: 4 },
    views: [
      { id: 'v-4', type: 'chart', name: 'Timeline Chart', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-5', type: 'table', name: 'Data Table', gridPos: { row: 0, col: 2, rowSpan: 2, colSpan: 2 } },
    ],
    isActive: true,
    isLinked: false,
    isShared: false,
    isStarred: false,
    tags: ['analysis'],
  },
  {
    id: 'vg-3',
    name: 'Heart Mesh',
    color: '#ef4444',
    isExplicit: false,
    layoutId: 'single',
    position: { row: 4, col: 1, rowSpan: 3, colSpan: 3 },
    views: [
      { id: 'v-6', type: 'mesh', name: 'Heart 3D Model', gridPos: { row: 0, col: 0, rowSpan: 3, colSpan: 3 } },
    ],
    isActive: true,
    isLinked: true,
    isShared: true,
    isStarred: false,
    tags: ['cardiac'],
  },
  {
    id: 'vg-4',
    name: 'Reference Images',
    color: '#f59e0b',
    isExplicit: true,
    layoutId: '2x2',
    position: { row: 5, col: 5, rowSpan: 4, colSpan: 4 },
    views: [
      { id: 'v-7', type: 'image', name: 'X-Ray Chest', gridPos: { row: 0, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-8', type: 'image', name: 'CT Slice', gridPos: { row: 0, col: 2, rowSpan: 2, colSpan: 2 } },
      { id: 'v-9', type: 'image', name: 'MRI T1', gridPos: { row: 2, col: 0, rowSpan: 2, colSpan: 2 } },
      { id: 'v-10', type: 'annotation', name: 'Clinical Notes', gridPos: { row: 2, col: 2, rowSpan: 2, colSpan: 2 } },
    ],
    isActive: false,
    isLinked: false,
    isShared: false,
    isStarred: true,
    tags: ['ct', 'mri', 'reference'],
  },
];

const MOCK_DATASETS = [
  { id: 'ds-1', name: 'brain_scan_001.nii', type: 'nifti', size: '52 MB', isLoaded: true },
  { id: 'ds-2', name: 'patient_metrics.csv', type: 'csv', size: '1.2 MB', isLoaded: true },
  { id: 'ds-3', name: 'heart_mesh.vtk', type: 'vtk', size: '15 MB', isLoaded: true },
  { id: 'ds-4', name: 'xray_chest.png', type: 'image', size: '2 MB', isLoaded: false },
  { id: 'ds-5', name: 'ct_series.dcm', type: 'dicom', size: '125 MB', isLoaded: false },
];

const MOCK_UNPLACED_VIEWS = [
  { id: 'uv-1', type: 'volume', name: 'Spine Volume', datasetId: 'ds-7', isActive: true, isLinked: false, isShared: false, isStarred: false },
  { id: 'uv-2', type: 'chart', name: 'Trend Analysis', datasetId: null, isActive: true, isLinked: false, isShared: false, isStarred: true },
];

const MOCK_VIEWPORT = {
  id: 'main',
  name: 'Main',
  position: { row: 0, col: 0 },
  size: { rows: 5, cols: 5 },
  isPrimary: true,
};

const MOCK_VIEWPORTS = [
  {
    id: 'main',
    name: 'Main',
    position: { row: 0, col: 0 },
    size: { rows: 5, cols: 5 },
    isPrimary: true,
  },
  {
    id: 'detail',
    name: 'Detail',
    position: { row: 3, col: 4 },
    size: { rows: 3, cols: 3 },
    isPrimary: false,
  },
];

const MOCK_COLLABORATORS = [
  { id: 'u-1', name: 'Alice Chen', color: '#22c55e', avatar: 'AC', viewportPos: { row: 2, col: 3 }, cursorPos: { row: 2.5, col: 4.2 }, isOnline: true, isBroadcasting: true },
  { id: 'u-2', name: 'Bob Smith', color: '#3b82f6', avatar: 'BS', viewportPos: { row: 5, col: 5 }, cursorPos: { row: 6.1, col: 7.3 }, isOnline: true, isBroadcasting: false },
  { id: 'u-3', name: 'Carol Davis', color: '#f59e0b', avatar: 'CD', viewportPos: null, cursorPos: null, isOnline: false, isBroadcasting: false },
];

const MOCK_BOOKMARKS = [
  { id: 'bm-1', name: 'Brain Overview', position: { row: 0, col: 0 }, isStarred: true, isActive: true },
  { id: 'bm-2', name: 'Heart Detail', position: { row: 4, col: 1 }, isStarred: false, isActive: true },
  { id: 'bm-3', name: 'Reference Gallery', position: { row: 5, col: 5 }, isStarred: true, isActive: true },
];

const MOCK_VG_LINKS = [
  { id: 'link-1', from: 'vg-1', to: 'vg-3', type: 'camera', mode: 'bidirectional' },
  { id: 'link-2', from: 'vg-1', to: 'vg-2', type: 'filter', mode: 'unidirectional' },
];

const MAP_MODES = { NAVIGATE: 'navigate', LAYOUT: 'layout', LINKS: 'links', TEAM: 'team' };
const DISPLAY_MODES = { VG: 'vg', VIEW: 'view' };
const COMPANION_TABS = { VIEWS: 'views', DATASETS: 'datasets' };

const MODE_CONFIG = {
  [MAP_MODES.NAVIGATE]: { label: 'Navigate', icon: Compass, color: tokens.colors.accent.blue },
  [MAP_MODES.LAYOUT]: { label: 'Layout', icon: Grid3X3, color: tokens.colors.accent.purple },
  [MAP_MODES.LINKS]: { label: 'Links', icon: Link2, color: tokens.colors.accent.cyan },
  [MAP_MODES.TEAM]: { label: 'Team', icon: Users, color: tokens.colors.accent.green },
};

const colToLetter = (col) => String.fromCharCode(65 + col);
const formatCellRef = (row, col) => `${colToLetter(col)}${row + 1}`;

const flattenViewsToCanvas = (viewGroups) => {
  const views = [];
  viewGroups.forEach((vg) => {
    if (!vg.position) return;
    (vg.views || []).forEach((view) => {
      const gp = view.gridPos || { row: 0, col: 0, rowSpan: 1, colSpan: 1 };
      views.push({
        ...view,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
        canvasRow: vg.position.row + gp.row,
        canvasCol: vg.position.col + gp.col,
        rowSpan: gp.rowSpan || 1,
        colSpan: gp.colSpan || 1,
      });
    });
  });
  return views;
};

const FilterToolbar = ({
  filter,
  sizeMode,
  tagOptions = [],
  showQuickFilters = true,
  dense = false,
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const isCompact = sizeMode === 'compact';
  const isMinimal = sizeMode === 'minimal';
  const currentSort = filter.currentSortOption || SORT_OPTIONS.find((o) => o.value === filter.sortBy);
  const paddingY = dense ? tokens.spacing.xs : tokens.spacing.sm;
  const controlFontSize = dense ? tokens.fontSize.xs : tokens.fontSize.sm;
  const quickCount = filter.quickFilters.length;
  const tagCount = filter.selectedTags.length;
  const hasTags = tagOptions.length > 0;

  return (
    <div style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          padding: `${paddingY} ${tokens.spacing.md}`,
          background: tokens.colors.bg.secondary,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            background: tokens.colors.bg.tertiary,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.subtle}`,
            minWidth: 0,
          }}
        >
          <Search size={12} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => filter.setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.colors.text.primary,
              fontSize: controlFontSize,
              minWidth: 0,
            }}
          />
          {filter.searchQuery && (
            <button
              type="button"
              onClick={() => filter.setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
            >
              <X size={10} style={{ color: tokens.colors.text.muted }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'filters' ? null : 'filters')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                background: quickCount ? tokens.colors.glass.strong : 'transparent',
                border: `1px solid ${quickCount ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.md,
                color: quickCount ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: controlFontSize,
              }}
            >
              <Filter size={12} />
              {!isMinimal && !dense && <span>Filter</span>}
              {quickCount > 0 && (
                <span
                  style={{
                    padding: '0 6px',
                    borderRadius: tokens.radius.lg,
                    background: 'rgba(59,130,246,0.2)',
                    color: tokens.colors.accent.blue,
                    fontSize: tokens.fontSize.xs,
                    fontWeight: 600,
                  }}
                >
                  {quickCount}
                </span>
              )}
            </button>
            {activeDropdown === 'filters' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  zIndex: 1000,
                  width: 180,
                  background: tokens.colors.bg.primary,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.lg,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  padding: tokens.spacing.xs,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {QUICK_FILTERS.map((qf) => {
                    const isActive = filter.quickFilters.includes(qf.id);
                    const QfIcon = qf.icon;
                    return (
                      <button
                        key={qf.id}
                        type="button"
                        onClick={() => filter.toggleQuickFilter(qf.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          borderRadius: tokens.radius.md,
                          border: `1px solid ${isActive ? tokens.colors.accent.blue : 'transparent'}`,
                          background: isActive ? tokens.colors.glass.strong : 'transparent',
                          color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                          cursor: 'pointer',
                          fontSize: tokens.fontSize.sm,
                        }}
                      >
                        <QfIcon size={12} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{qf.label}</span>
                        {isActive && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {hasTags && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'tags' ? null : 'tags')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  background: tagCount ? tokens.colors.glass.strong : 'transparent',
                  border: `1px solid ${tagCount ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.md,
                  color: tagCount ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: controlFontSize,
                }}
              >
                <Tag size={12} />
                {!isMinimal && !dense && <span>Tags</span>}
                {tagCount > 0 && (
                  <span
                    style={{
                      padding: '0 6px',
                      borderRadius: tokens.radius.lg,
                      background: 'rgba(34,211,238,0.18)',
                      color: tokens.colors.accent.cyan,
                      fontSize: tokens.fontSize.xs,
                      fontWeight: 600,
                    }}
                  >
                    {tagCount}
                  </span>
                )}
              </button>
              {activeDropdown === 'tags' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    zIndex: 1000,
                    width: 200,
                    background: tokens.colors.bg.primary,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.lg,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    padding: tokens.spacing.sm,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: tokens.spacing.xs,
                  }}
                >
                  {tagOptions.map((tag) => {
                    const isActive = filter.selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => filter.toggleTag(tag)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: tokens.radius.lg,
                          border: `1px solid ${isActive ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                          background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                          color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                          fontSize: tokens.fontSize.xs,
                          cursor: 'pointer',
                        }}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${tokens.colors.border.subtle}`,
                borderRadius: tokens.radius.md,
                color: tokens.colors.text.secondary,
                cursor: 'pointer',
                fontSize: controlFontSize,
              }}
            >
              <ArrowUpDown size={12} />
              {!isCompact && !isMinimal && <span>{currentSort?.shortLabel}</span>}
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'sort' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  zIndex: 1000,
                  width: 180,
                  background: tokens.colors.bg.primary,
                  border: `1px solid ${tokens.colors.border.default}`,
                  borderRadius: tokens.radius.lg,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  padding: tokens.spacing.xs,
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const isActive = filter.sortBy === opt.value;
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        filter.setSortBy(opt.value);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.sm,
                        width: '100%',
                        padding: '8px 10px',
                        background: isActive ? tokens.colors.glass.medium : 'transparent',
                        border: 'none',
                        borderRadius: tokens.radius.sm,
                        color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <OptIcon size={12} />
                      <span style={{ flex: 1, fontSize: tokens.fontSize.sm }}>{opt.label}</span>
                      {isActive && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {filter.hasActiveFilters && (
          <button
            type="button"
            onClick={filter.clearAll}
            style={{
              padding: tokens.spacing.xs,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: tokens.colors.text.muted,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showQuickFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
            background: tokens.colors.glass.subtle,
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, flexShrink: 0 }}>
            Quick:
          </span>
          {QUICK_FILTERS.map((qf) => {
            const isActive = filter.quickFilters.includes(qf.id);
            const QfIcon = qf.icon;
            return (
              <button
                key={qf.id}
                type="button"
                onClick={() => filter.toggleQuickFilter(qf.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 8px',
                  background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                  border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.lg,
                  color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: tokens.fontSize.xs,
                  whiteSpace: 'nowrap',
                }}
              >
                <QfIcon size={10} />
                {!isCompact && <span>{qf.label}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GridPaperBackground = ({ rows, cols, cellSize, gap, visible, minorColor, majorColor, offsetX = 0, offsetY = 0 }) => {
  const patternId = useId();
  if (!visible) return null;
  const gridWidth = cols * (cellSize + gap) - gap;
  const gridHeight = rows * (cellSize + gap) - gap;
  const majorInterval = 5;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        shapeRendering: 'crispEdges',
      }}
    >
      <defs>
        <pattern
          id={`${patternId}-minor`}
          width={cellSize + gap}
          height={cellSize + gap}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <path
            d={`M ${cellSize + gap} 0 L 0 0 0 ${cellSize + gap}`}
            fill="none"
            stroke={minorColor || tokens.colors.canvas.gridLine}
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          id={`${patternId}-major`}
          width={(cellSize + gap) * majorInterval}
          height={(cellSize + gap) * majorInterval}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offsetX} ${offsetY})`}
        >
          <rect
            width={(cellSize + gap) * majorInterval}
            height={(cellSize + gap) * majorInterval}
            fill={`url(#${patternId}-minor)`}
          />
          <path
            d={`M ${(cellSize + gap) * majorInterval} 0 L 0 0 0 ${(cellSize + gap) * majorInterval}`}
            fill="none"
            stroke={majorColor || tokens.colors.canvas.gridLineMajor}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={gridWidth} height={gridHeight} fill={`url(#${patternId}-major)`} />
      <rect x="0" y="0" width={gridWidth} height={gridHeight} fill="none" stroke={tokens.colors.canvas.gridLineMajor} strokeWidth="1" />
    </svg>
  );
};

const DPadControls = ({ position, onMove, onGoHome, homePosition, compact }) => {
  const isAtHome = position.row === homePosition.row && position.col === homePosition.col;
  const size = compact ? 24 : 28;

  const btnStyle = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.colors.glass.medium,
    border: `1px solid ${tokens.colors.border.subtle}`,
    borderRadius: tokens.radius.sm,
    color: tokens.colors.text.secondary,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <button type="button" onClick={() => onMove('up')} style={btnStyle}>
        <ChevronUp size={compact ? 12 : 14} />
      </button>
      <div style={{ display: 'flex', gap: '2px' }}>
        <button type="button" onClick={() => onMove('left')} style={btnStyle}>
          <ChevronLeft size={compact ? 12 : 14} />
        </button>
        <button
          type="button"
          onClick={onGoHome}
          style={{
            ...btnStyle,
            background: isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.glass.medium,
            color: isAtHome ? tokens.colors.accent.amber : tokens.colors.text.muted,
            border: isAtHome ? `1px solid ${tokens.colors.accent.amber}` : btnStyle.border,
          }}
        >
          <Home size={compact ? 10 : 12} />
        </button>
        <button type="button" onClick={() => onMove('right')} style={btnStyle}>
          <ChevronRight size={compact ? 12 : 14} />
        </button>
      </div>
      <button type="button" onClick={() => onMove('down')} style={btnStyle}>
        <ChevronDown size={compact ? 12 : 14} />
      </button>
    </div>
  );
};

const FloatingDPad = ({
  sizeMode,
  position,
  zIndex = 30,
  docked = false,
  showHandle = true,
  centerContent,
  onMove,
  onGoHome,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}) => {
  const size = sizeMode === 'minimal' ? 70 : sizeMode === 'compact' ? 82 : 96;
  const centerSize = sizeMode === 'minimal' ? 34 : sizeMode === 'compact' ? 38 : 42;
  const handleSize = sizeMode === 'minimal' ? 18 : 20;
  const iconSize = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;
  const wedgeInset = sizeMode === 'minimal' ? 3 : sizeMode === 'compact' ? 4 : 5;
  const rotation = 0;
  const iconOffset = sizeMode === 'minimal' ? 14 : sizeMode === 'compact' ? 16 : 18;

  const wedgeStyle = {
    position: 'absolute',
    inset: wedgeInset,
    borderRadius: '50%',
    border: `1px solid rgba(96,165,250,0.18)`,
    background: 'linear-gradient(160deg, rgba(96,165,250,0.22), rgba(10,16,28,0.65))',
    color: 'rgba(248, 250, 252, 0.95)',
    textShadow: '0 1px 6px rgba(15,23,42,0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    transition: 'all 0.18s ease',
  };

  return (
    <div
      style={{
        position: docked ? 'relative' : 'absolute',
        left: docked ? undefined : position?.x,
        top: docked ? undefined : position?.y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.18), rgba(2,6,16,0.92))',
        border: '1px solid rgba(96,165,250,0.2)',
        boxShadow: '0 0 0 2px rgba(15,23,42,0.6), 0 12px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(96,165,250,0.18)',
          boxShadow: 'inset 0 0 0 1px rgba(2,6,16,0.65)',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => onMove('up')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 0% 0%, 100% 0%)',
        }}
      >
        <ChevronUp
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateY(-${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('right')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)',
        }}
      >
        <ChevronRight
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateX(${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('down')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 100% 100%, 0% 100%)',
        }}
      >
        <ChevronDown
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateY(${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <button
        type="button"
        onClick={() => onMove('left')}
        style={{
          ...wedgeStyle,
          clipPath: 'polygon(50% 50%, 0% 100%, 0% 0%)',
        }}
      >
        <ChevronLeft
          size={iconSize}
          style={{
            transform: `rotate(-${rotation}deg) translateX(-${iconOffset}px)`,
            color: 'rgba(248, 250, 252, 0.95)',
          }}
        />
      </button>
      <div
        style={{
          position: 'absolute',
          top: wedgeInset + 1,
          bottom: wedgeInset + 1,
          left: '50%',
          width: 1,
          transform: 'translateX(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: wedgeInset + 1,
          right: wedgeInset + 1,
          top: '50%',
          height: 1,
          transform: 'translateY(-0.5px)',
          background: 'rgba(5, 8, 16, 0.6)',
          pointerEvents: 'none',
        }}
      />
      <button
        type="button"
        onClick={onGoHome}
        style={{
          width: centerSize,
          height: centerSize,
          borderRadius: '50%',
          border: `1px solid rgba(96,165,250,0.45)`,
          background: 'radial-gradient(circle at 35% 35%, rgba(96,165,250,0.4), rgba(8,14,24,0.95))',
          color: tokens.colors.accent.amber,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 18px rgba(59,130,246,0.45)',
          zIndex: 2,
          transform: `rotate(-${rotation}deg)`,
        }}
      >
        {centerContent || <Home size={iconSize} style={{ color: tokens.colors.accent.amber }} />}
      </button>
      {showHandle && (
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerLeave={onHandlePointerUp}
          style={{
            position: 'absolute',
            right: -4,
            top: -4,
            width: handleSize,
            height: handleSize,
            borderRadius: '50%',
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.subtle}`,
            color: tokens.colors.text.muted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
          }}
        >
          <Grip size={10} />
        </div>
      )}
    </div>
  );
};

const SquareDPad = ({ sizeMode, onMove, onGoHome, centerLabel, isAtHome }) => {
  const size = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const centerSize = Math.round(size * 0.38);
  const cornerRadius = 6;
  const gap = 2;
  const cx = size / 2;
  const cy = size / 2;

  const [hoveredQuadrant, setHoveredQuadrant] = useState(null);
  const [activeQuadrant, setActiveQuadrant] = useState(null);

  const getQuadrantColor = (quadrant) => {
    if (activeQuadrant === quadrant) return tokens.colors.accent.cyan;
    if (hoveredQuadrant === quadrant) return tokens.colors.accent.blue;
    return tokens.colors.glass.medium;
  };

  const getIconColor = (quadrant) => {
    if (hoveredQuadrant === quadrant || activeQuadrant === quadrant) return 'white';
    return tokens.colors.text.muted;
  };

  const handleClick = (direction) => {
    setActiveQuadrant(direction);
    setTimeout(() => setActiveQuadrant(null), 150);
    onMove(direction);
  };

  const quadrants = [
    {
      id: 'up',
      points: `${gap},${gap} ${size - gap},${gap} ${cx + centerSize / 2 + gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy - centerSize / 2 - gap}`,
      iconX: cx,
      iconY: (gap + cy - centerSize / 2 - gap) / 2 + 2,
    },
    {
      id: 'right',
      points: `${size - gap},${gap} ${size - gap},${size - gap} ${cx + centerSize / 2 + gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy - centerSize / 2 - gap}`,
      iconX: (size - gap + cx + centerSize / 2 + gap) / 2 - 2,
      iconY: cy,
    },
    {
      id: 'down',
      points: `${size - gap},${size - gap} ${gap},${size - gap} ${cx - centerSize / 2 - gap},${cy + centerSize / 2 + gap} ${
        cx + centerSize / 2 + gap
      },${cy + centerSize / 2 + gap}`,
      iconX: cx,
      iconY: (size - gap + cy + centerSize / 2 + gap) / 2 - 2,
    },
    {
      id: 'left',
      points: `${gap},${size - gap} ${gap},${gap} ${cx - centerSize / 2 - gap},${cy - centerSize / 2 - gap} ${
        cx - centerSize / 2 - gap
      },${cy + centerSize / 2 + gap}`,
      iconX: (gap + cx - centerSize / 2 - gap) / 2 + 2,
      iconY: cy,
    },
  ];

  const getChevronPath = (direction) => {
    const s = Math.max(6, size * 0.09);
    switch (direction) {
      case 'up':
        return `M ${-s} ${s / 2} L 0 ${-s / 2} L ${s} ${s / 2}`;
      case 'down':
        return `M ${-s} ${-s / 2} L 0 ${s / 2} L ${s} ${-s / 2}`;
      case 'left':
        return `M ${s / 2} ${-s} L ${-s / 2} 0 L ${s / 2} ${s}`;
      case 'right':
        return `M ${-s / 2} ${-s} L ${s / 2} 0 L ${-s / 2} ${s}`;
      default:
        return '';
    }
  };

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <rect
        x={1}
        y={1}
        width={size - 2}
        height={size - 2}
        rx={cornerRadius}
        fill={tokens.colors.bg.tertiary}
        stroke={tokens.colors.border.default}
        strokeWidth={1}
      />

      {quadrants.map((q) => (
        <g key={q.id}>
          <polygon
            points={q.points}
            fill={getQuadrantColor(q.id)}
            stroke={tokens.colors.border.subtle}
            strokeWidth={0.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredQuadrant(q.id)}
            onMouseLeave={() => setHoveredQuadrant(null)}
            onClick={() => handleClick(q.id)}
          />
          <path
            d={getChevronPath(q.id)}
            transform={`translate(${q.iconX}, ${q.iconY})`}
            fill="none"
            stroke={getIconColor(q.id)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        </g>
      ))}

      <rect
        x={cx - centerSize / 2}
        y={cy - centerSize / 2}
        width={centerSize}
        height={centerSize}
        rx={4}
        fill={isAtHome ? `${tokens.colors.accent.amber}30` : tokens.colors.bg.secondary}
        stroke={isAtHome ? tokens.colors.accent.amber : tokens.colors.border.default}
        strokeWidth={1.5}
        style={{ cursor: 'pointer' }}
        onClick={onGoHome}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isAtHome ? tokens.colors.accent.amber : tokens.colors.text.primary}
        fontSize={Math.max(11, size * 0.16)}
        fontWeight="700"
        fontFamily="monospace"
        style={{ pointerEvents: 'none' }}
      >
        {centerLabel || 'A1'}
      </text>
    </svg>
  );
};

  const MapSidebar = ({
    side,
    onToggleSide,
    showItems = [],
  }) => {
  const btnStyle = {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border.subtle}`,
    background: 'transparent',
    color: tokens.colors.text.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        width: 56,
        display: 'flex',
        justifyContent: 'center',
        overflow: 'visible',
        background:
          side === 'left'
            ? 'linear-gradient(90deg, rgba(6,10,18,0.0), rgba(6,10,18,0.55))'
            : 'linear-gradient(270deg, rgba(6,10,18,0.0), rgba(6,10,18,0.55))',
      }}
    >
      <div
        style={{
          padding: 4,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          background: tokens.colors.glass.subtle,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {showItems.length > 0 && (
          <>
            <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>Show</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {showItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={`${item.label}-${idx}`}
                    type="button"
                    onClick={item.onClick}
                    title={item.label}
                    style={{
                      ...btnStyle,
                      border: `1px solid ${item.active ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                      background: item.active ? tokens.colors.glass.medium : 'transparent',
                      color: item.active ? tokens.colors.accent.blue : tokens.colors.text.muted,
                    }}
                  >
                    <ItemIcon size={14} />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={{ width: '100%', height: 1, background: tokens.colors.border.subtle }} />
        <button type="button" onClick={onToggleSide} title={`Move to ${side === 'left' ? 'right' : 'left'}`} style={btnStyle}>
          <ArrowLeftRight size={14} />
        </button>
      </div>
    </div>
  );
};

const CompanionPanel = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  viewGroups,
  unplacedViews,
  datasets,
  sizeMode,
  width = 180,
  showToolbar = true,
  onDragStart,
}) => {
  if (!isOpen) return null;

  const companionFilter = useListFilter({
    searchFields: (item) => [item.name, item.type, ...(item.tags || [])],
    quickFilterDefs: QUICK_FILTERS,
    sortOptions: SORT_OPTIONS,
  });

  const allViews = useMemo(() => {
    const placed = viewGroups.flatMap((vg) =>
      (vg.views || []).map((view) => ({
        ...view,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
        isPlaced: true,
        isActive: vg.isActive,
        isLinked: vg.isLinked,
        isShared: vg.isShared,
        isStarred: vg.isStarred,
      }))
    );
    const unplaced = unplacedViews.map((view) => ({ ...view, isPlaced: false }));
    return [...placed, ...unplaced];
  }, [viewGroups, unplacedViews]);

  const datasetsWithTags = useMemo(
    () => datasets.map((ds) => ({ ...ds, tags: [ds.type] })),
    [datasets]
  );
  const viewTags = useMemo(() => Array.from(new Set(allViews.flatMap((view) => view.tags || []))), [allViews]);
  const datasetTags = useMemo(() => Array.from(new Set(datasets.map((ds) => ds.type))), [datasets]);
  const tagOptions = activeTab === COMPANION_TABS.DATASETS ? datasetTags : viewTags;

  const filteredViews = companionFilter.applyFilters(allViews);
  const filteredDatasets = companionFilter.applyFilters(datasetsWithTags);

  return (
    <div
      style={{
        width,
        background: tokens.colors.bg.secondary,
        borderLeft: `1px solid ${tokens.colors.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        {[
          { id: COMPANION_TABS.VIEWS, label: 'Views', icon: Layers, count: allViews.length },
          { id: COMPANION_TABS.DATASETS, label: 'Data', icon: Database, count: datasets.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: tokens.spacing.sm,
                background: isActive ? tokens.colors.glass.medium : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? tokens.colors.accent.blue : 'transparent'}`,
                color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                cursor: 'pointer',
                fontSize: tokens.fontSize.xs,
              }}
            >
              <TabIcon size={12} />
              <span>{tab.count}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}
        >
          <X size={12} />
        </button>
      </div>

      {showToolbar && (
        <FilterToolbar
          filter={companionFilter}
          sizeMode={sizeMode}
          tagOptions={tagOptions}
          showQuickFilters={false}
          dense
        />
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: tokens.spacing.xs }}>
        {activeTab === COMPANION_TABS.VIEWS && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            <div style={{ fontSize: '9px', color: tokens.colors.text.muted, padding: '2px 4px' }}>
              Drag to place on canvas
            </div>
            {filteredViews.map((view) => {
              const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.image;
              const ViewIcon = viewType.icon;
              return (
                <div
                  key={view.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'view', view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: tokens.spacing.xs,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.sm,
                    borderLeft: `3px solid ${view.vgColor || viewType.color}`,
                    cursor: 'grab',
                    opacity: view.isPlaced ? 1 : 0.7,
                  }}
                >
                  <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                  <ViewIcon size={12} style={{ color: viewType.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: tokens.fontSize.xs,
                        color: tokens.colors.text.primary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {view.name}
                    </div>
                    {view.vgName && (
                      <div
                        style={{
                          fontSize: '8px',
                          color: tokens.colors.text.muted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {view.vgName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === COMPANION_TABS.DATASETS && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            <div style={{ fontSize: '9px', color: tokens.colors.text.muted, padding: '2px 4px' }}>
              Drag to create new view
            </div>
            {filteredDatasets.map((ds) => (
              <div
                key={ds.id}
                draggable
                onDragStart={(e) => onDragStart(e, 'dataset', ds)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs,
                  padding: tokens.spacing.xs,
                  background: tokens.colors.glass.subtle,
                  border: `1px solid ${tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.sm,
                  cursor: 'grab',
                  opacity: ds.isLoaded ? 1 : 0.6,
                }}
              >
                <GripVertical size={10} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
                <Database size={12} style={{ color: ds.isLoaded ? tokens.colors.accent.green : tokens.colors.text.muted, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color: tokens.colors.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ds.name}
                  </div>
                  <div style={{ fontSize: '8px', color: tokens.colors.text.muted }}>
                    {ds.type} - {ds.size}
                  </div>
                </div>
                {ds.isLoaded && <CheckCircle size={10} style={{ color: tokens.colors.accent.green, flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const VGBlock = ({ vg, cellSize, gap, isSelected, onClick }) => {
  const { position, color, name, isExplicit, views } = vg;
  const width = position.colSpan * cellSize + (position.colSpan - 1) * gap;
  const height = position.rowSpan * cellSize + (position.rowSpan - 1) * gap;
  const left = position.col * (cellSize + gap);
  const top = position.row * (cellSize + gap);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: `${color}20`,
        border: `2px ${isExplicit ? 'solid' : 'dashed'} ${color}80`,
        borderRadius: tokens.radius.md,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 16px ${color}50, inset 0 0 24px ${color}10` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        zIndex: isSelected ? 10 : 1,
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <span
        style={{
          fontSize: cellSize > 35 ? tokens.fontSize.sm : tokens.fontSize.xs,
          fontWeight: 600,
          color: tokens.colors.text.primary,
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          textAlign: 'center',
          padding: '2px 4px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      {cellSize > 40 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
          <span style={{ fontSize: tokens.fontSize.xs, color, fontFamily: 'monospace', fontWeight: 600 }}>
            {formatCellRef(position.row, position.col)}
          </span>
          <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>
            {views?.length || 0}v
          </span>
        </div>
      )}
    </div>
  );
};

const ViewCell = ({ view, cellSize, gap, isSelected, onClick }) => {
  const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.image;
  const ViewIcon = viewType.icon;
  const left = view.canvasCol * (cellSize + gap);
  const top = view.canvasRow * (cellSize + gap);
  const width = (view.colSpan || 1) * cellSize + ((view.colSpan || 1) - 1) * gap;
  const height = (view.rowSpan || 1) * cellSize + ((view.rowSpan || 1) - 1) * gap;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        background: `${viewType.color}20`,
        border: `1px solid ${viewType.color}60`,
        borderRadius: tokens.radius.sm,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 8px ${viewType.color}50` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <ViewIcon size={Math.min(16, cellSize * 0.4)} style={{ color: viewType.color }} />
      {cellSize > 40 && (
        <span
          style={{
            fontSize: '8px',
            color: tokens.colors.text.secondary,
            textAlign: 'center',
            maxWidth: '100%',
            padding: '0 2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {view.name}
        </span>
      )}
    </div>
  );
};

const ViewportIndicator = ({ viewport, cellSize, gap, isDragging, onMouseDown }) => {
  const { position, size, name, isPrimary } = viewport;
  const width = size.cols * cellSize + (size.cols - 1) * gap;
  const height = size.rows * cellSize + (size.rows - 1) * gap;
  const left = position.col * (cellSize + gap);
  const top = position.row * (cellSize + gap);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: `2px solid ${tokens.colors.accent.cyan}`,
        borderRadius: tokens.radius.md,
        background: `${tokens.colors.accent.cyan}08`,
        boxShadow: `0 0 12px ${tokens.colors.accent.cyan}30`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 50,
      }}
    >
      <span
        style={{
          position: 'absolute',
          bottom: 4,
          left: 6,
          fontSize: tokens.fontSize.xs,
          fontWeight: 600,
          color: tokens.colors.accent.cyan,
          background: `${tokens.colors.bg.primary}dd`,
          padding: '1px 6px',
          borderRadius: tokens.radius.sm,
          textTransform: 'uppercase',
        }}
      >
        {name}
      </span>
      {isPrimary && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 12,
            height: 12,
            background: tokens.colors.accent.amber,
            borderRadius: '50%',
            border: `2px solid ${tokens.colors.bg.primary}`,
            boxShadow: `0 0 6px ${tokens.colors.accent.amber}`,
          }}
        />
      )}
      <div style={{ position: 'absolute', top: 4, right: 6, color: tokens.colors.accent.cyan, opacity: 0.7 }}>
        <Move size={10} />
      </div>
    </div>
  );
};

const CollaboratorIndicators = ({ collaborators, cellSize, gap, showCursors }) => (
  <>
    {collaborators.filter((c) => c.isOnline && c.viewportPos).map((collab) => {
      const vpLeft = collab.viewportPos.col * (cellSize + gap);
      const vpTop = collab.viewportPos.row * (cellSize + gap);

      return (
        <React.Fragment key={collab.id}>
          <div
            style={{
              position: 'absolute',
              left: vpLeft,
              top: vpTop,
              width: cellSize * 3 + gap * 2,
              height: cellSize * 3 + gap * 2,
              border: `2px dashed ${collab.color}50`,
              borderRadius: tokens.radius.md,
              pointerEvents: 'none',
              zIndex: 45,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: vpLeft + cellSize * 3 + gap * 2 - 10,
              top: vpTop - 10,
              width: 20,
              height: 20,
              background: collab.color,
              borderRadius: '50%',
              border: `2px solid ${tokens.colors.bg.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 700,
              color: 'white',
              zIndex: 60,
              boxShadow: collab.isBroadcasting
                ? `0 0 8px ${collab.color}, 0 0 16px ${collab.color}`
                : `0 0 6px ${collab.color}`,
            }}
            title={collab.name}
          >
            {collab.avatar}
            {collab.isBroadcasting && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  background: tokens.colors.accent.red,
                  borderRadius: '50%',
                  border: `1px solid ${tokens.colors.bg.primary}`,
                }}
              />
            )}
          </div>
          {showCursors && collab.cursorPos && (
            <div
              style={{
                position: 'absolute',
                left: collab.cursorPos.col * (cellSize + gap) - 4,
                top: collab.cursorPos.row * (cellSize + gap) - 4,
                color: collab.color,
                zIndex: 65,
                pointerEvents: 'none',
                filter: `drop-shadow(0 0 4px ${collab.color})`,
              }}
            >
              <MousePointer2 size={12} style={{ color: collab.color }} />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </>
);

const LinkLines = ({ links, viewGroups, cellSize, gap, highlightedId, onLinkClick }) => {
  const getCenter = (vgId) => {
    const vg = viewGroups.find((v) => v.id === vgId);
    if (!vg?.position) return null;
    return {
      x: vg.position.col * (cellSize + gap) + (vg.position.colSpan * cellSize + (vg.position.colSpan - 1) * gap) / 2,
      y: vg.position.row * (cellSize + gap) + (vg.position.rowSpan * cellSize + (vg.position.rowSpan - 1) * gap) / 2,
    };
  };

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {links.map((link) => {
        const from = getCenter(link.from);
        const to = getCenter(link.to);
        if (!from || !to) return null;
        const isHighlighted = highlightedId === link.id;
        const color = link.type === 'camera' ? tokens.colors.accent.cyan : tokens.colors.accent.purple;
        return (
          <g
            key={link.id}
            onClick={() => onLinkClick(link.id)}
            style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          >
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isHighlighted ? 4 : 2}
              strokeOpacity={isHighlighted ? 1 : 0.6}
              strokeDasharray={link.mode === 'unidirectional' ? '6,4' : 'none'}
            />
            {link.mode === 'bidirectional' && (
              <>
                <circle cx={from.x} cy={from.y} r={4} fill={color} opacity={0.8} />
                <circle cx={to.x} cy={to.y} r={4} fill={color} opacity={0.8} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const ModeTabs = ({ activeMode, onModeChange, sizeMode }) => {
  const isCompact = sizeMode === 'compact';
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${tokens.colors.border.subtle}`, background: tokens.colors.bg.secondary }}>
      {Object.entries(MODE_CONFIG).map(([mode, config]) => {
        const isActive = activeMode === mode;
        const ModeIcon = config.icon;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.xs,
              padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
              background: isActive ? tokens.colors.glass.medium : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? config.color : 'transparent'}`,
              color: isActive ? config.color : tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.sm,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <ModeIcon size={14} />
            {!isCompact && <span>{config.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

const ModeTabsPill = ({ activeMode, onModeChange }) => (
  <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
    {Object.entries(MODE_CONFIG).map(([mode, config]) => {
      const isActive = activeMode === mode;
      const ModeIcon = config.icon;
      return (
        <button
          key={mode}
          type="button"
          onClick={() => onModeChange(mode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: '6px 8px',
            borderRadius: tokens.radius.sm,
            border: 'none',
            borderBottom: `2px solid ${isActive ? config.color : 'transparent'}`,
            background: 'transparent',
            color: isActive ? config.color : tokens.colors.text.muted,
            cursor: 'pointer',
            fontSize: tokens.fontSize.xs,
            fontWeight: isActive ? 600 : 500,
          }}
        >
          <ModeIcon size={12} />
          <span>{config.label}</span>
        </button>
      );
    })}
  </div>
);

const LayoutSearchRow = ({ filter, tagOptions = [] }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const tagCount = filter.selectedTags.length;
  const quickCount = filter.quickFilters.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexWrap: 'nowrap' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.subtle}`,
            minWidth: 140,
          }}
        >
          <Search size={12} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => filter.setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.colors.text.primary,
              fontSize: tokens.fontSize.sm,
              minWidth: 0,
            }}
          />
          {filter.searchQuery && (
            <button
              type="button"
              onClick={() => filter.setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
            >
              <X size={10} style={{ color: tokens.colors.text.muted }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'filters' ? null : 'filters')}
            title="Filters"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${quickCount ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
              background: quickCount ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
              color: quickCount ? tokens.colors.accent.blue : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Filter size={12} />
          </button>
          {activeDropdown === 'filters' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 180,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.xs,
              }}
            >
              {QUICK_FILTERS.map((qf) => {
                const isActive = filter.quickFilters.includes(qf.id);
                const QfIcon = qf.icon;
                return (
                  <button
                    key={qf.id}
                    type="button"
                    onClick={() => filter.toggleQuickFilter(qf.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 8px',
                      background: isActive ? tokens.colors.glass.medium : 'transparent',
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <QfIcon size={12} />
                    <span style={{ flex: 1 }}>{qf.label}</span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'tags' ? null : 'tags')}
            title="Tags"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tagCount ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
              background: tagCount ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
              color: tagCount ? tokens.colors.accent.cyan : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Tag size={12} />
          </button>
          {activeDropdown === 'tags' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 200,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.sm,
                display: 'flex',
                flexWrap: 'wrap',
                gap: tokens.spacing.xs,
              }}
            >
              {tagOptions.map((tag) => {
                const isActive = filter.selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => filter.toggleTag(tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: tokens.radius.lg,
                      border: `1px solid ${isActive ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                      background: isActive ? tokens.colors.glass.strong : tokens.colors.glass.subtle,
                      color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                      fontSize: tokens.fontSize.xs,
                      cursor: 'pointer',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
            title="Sort"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.colors.border.subtle}`,
              background: tokens.colors.bg.secondary,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <ArrowUpDown size={12} />
          </button>
          {activeDropdown === 'sort' && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 1000,
                width: 180,
                background: tokens.colors.bg.primary,
                border: `1px solid ${tokens.colors.border.default}`,
                borderRadius: tokens.radius.lg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: tokens.spacing.xs,
              }}
            >
              {SORT_OPTIONS.map((opt) => {
                const isActive = filter.sortBy === opt.value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      filter.setSortBy(opt.value);
                      setActiveDropdown(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 8px',
                      background: isActive ? tokens.colors.glass.medium : 'transparent',
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: isActive ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <OptIcon size={12} />
                    <span style={{ flex: 1 }}>{opt.label}</span>
                    {isActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs, flexWrap: 'wrap' }}>
        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, flexShrink: 0 }}>Quick:</span>
        {QUICK_FILTERS.map((qf) => {
          const isActive = filter.quickFilters.includes(qf.id);
          const QfIcon = qf.icon;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => filter.toggleQuickFilter(qf.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: tokens.radius.lg,
                border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                background: isActive ? tokens.colors.glass.medium : tokens.colors.bg.secondary,
                color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                cursor: 'pointer',
                fontSize: tokens.fontSize.xs,
              }}
            >
              <QfIcon size={10} />
              <span>{qf.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LayoutControlDeck = ({
  minimapZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  companionOpen,
  toggleCompanion,
  currentPositionLabel,
  isAtHome,
  canvasSizeLabel,
  openViewportCount,
  onMove,
  onGoHome,
  onSetHome,
  onFitAll,
  onAddBookmark,
  sizeMode,
  deckWidth,
}) => {
  const dpadSize = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const leftWidth = deckWidth ?? dpadSize + 24;
  const actions = [
    { icon: Home, title: 'Go Home', onClick: onGoHome },
    { icon: Crosshair, title: 'Set Home', onClick: onSetHome },
    { icon: Scan, title: 'Fit All', onClick: onFitAll },
    { icon: Star, title: 'Bookmark', onClick: onAddBookmark },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.sm,
        padding: tokens.spacing.sm,
        background: tokens.colors.bg.tertiary,
        borderRight: `1px solid ${tokens.colors.border.subtle}`,
        width: leftWidth,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            color: tokens.colors.text.muted,
            textAlign: 'center',
            width: '100%',
          }}
        >
          Zoom
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.xs,
            width: '100%',
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.colors.border.subtle}`,
            padding: tokens.spacing.xs,
          }}
        >
          <button
            type="button"
            onClick={onZoomOut}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            style={{
              flex: 1,
              minWidth: 0,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.xs,
            }}
          >
            {minimapZoom}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Plus size={10} />
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: dpadSize + 6,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: tokens.spacing.sm,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.border.subtle}`,
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacing.xs }}>
          <SquareDPad
            sizeMode={sizeMode}
            onMove={onMove}
            onGoHome={onGoHome}
            centerLabel={currentPositionLabel}
            isAtHome={isAtHome}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: tokens.spacing.xs,
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
        }}
      >
        {actions.map((action, idx) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={`${action.title}-${idx}`}
              type="button"
              onClick={action.onClick}
              title={action.title}
              style={{
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.border.subtle}`,
                background: 'transparent',
                color: tokens.colors.text.muted,
                cursor: 'pointer',
              }}
            >
              <ActionIcon size={14} />
            </button>
          );
        })}
      </div>

    </div>
  );
};

const MapToolbar = ({
  displayMode,
  setDisplayMode,
  showViewports,
  toggleViewports,
  showCollaborators,
  toggleCollaborators,
  minimapZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  companionOpen,
  toggleCompanion,
  sizeMode,
}) => {
  const isCompact = sizeMode === 'compact';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: tokens.spacing.md,
        padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
        background: tokens.colors.bg.tertiary,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.md,
          padding: '2px',
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        {[
          { mode: DISPLAY_MODES.VG, label: 'VG', icon: Grid3X3 },
          { mode: DISPLAY_MODES.VIEW, label: 'View', icon: Layers },
        ].map(({ mode, label, icon: DisplayIcon }) => {
          const isActive = displayMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setDisplayMode(mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: isActive ? tokens.colors.glass.medium : 'transparent',
                border: 'none',
                borderRadius: tokens.radius.sm,
                color: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted,
                cursor: 'pointer',
                fontSize: tokens.fontSize.sm,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <DisplayIcon size={12} />
              {!isCompact && <span>{label}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { active: showViewports, toggle: toggleViewports, icon: Scan, label: 'Viewport' },
          { active: showCollaborators, toggle: toggleCollaborators, icon: Users, label: 'Team' },
        ].map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={item.toggle}
            title={item.label}
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: item.active ? tokens.colors.glass.medium : 'transparent',
              border: `1px solid ${item.active ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: item.active ? tokens.colors.accent.blue : tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <item.icon size={12} />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={onZoomOut}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            style={{
              minWidth: 36,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
              fontSize: tokens.fontSize.xs,
            }}
          >
            {minimapZoom}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: `1px solid ${tokens.colors.border.subtle}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <Plus size={10} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleCompanion}
          title={companionOpen ? 'Hide panel' : 'Show Views and Datasets'}
          style={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: companionOpen ? tokens.colors.glass.medium : 'transparent',
            border: `1px solid ${companionOpen ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
            borderRadius: tokens.radius.sm,
            color: companionOpen ? tokens.colors.accent.blue : tokens.colors.text.muted,
            cursor: 'pointer',
          }}
        >
          {companionOpen ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xs,
          background: tokens.colors.bg.secondary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.subtle}`,
          padding: tokens.spacing.xs,
        }}
      >
        <div style={{ display: 'flex', gap: tokens.spacing.xs, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: tokens.radius.md,
              background: tokens.colors.glass.subtle,
              border: `1px solid ${tokens.colors.border.subtle}`,
              color: tokens.colors.text.muted,
              fontSize: tokens.fontSize.xs,
              fontWeight: 600,
            }}
          >
            Canvas {canvasSizeLabel}
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: tokens.radius.md,
              background: tokens.colors.glass.subtle,
              border: `1px solid ${tokens.colors.border.subtle}`,
              color: tokens.colors.text.muted,
              fontSize: tokens.fontSize.xs,
              fontWeight: 600,
            }}
          >
            {openViewportCount} Viewports
          </span>
        </div>
      </div>
    </div>
  );
};

const ContextualPanelContent = ({
  mode,
  viewport,
  setViewport,
  homePosition,
  viewGroups,
  selectedVGId,
  setSelectedVGId,
  links,
  highlightedLinkId,
  setHighlightedLinkId,
  collaborators,
  showCursors,
  setShowCursors,
  bookmarks,
  filter,
  sizeMode,
  showToolbar = true,
}) => {
  const handleMove = (dir) => {
    setViewport((prev) => ({
      ...prev,
      position: {
        row: Math.max(0, Math.min(CANVAS.rows - prev.size.rows, prev.position.row + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0))),
        col: Math.max(0, Math.min(CANVAS.cols - prev.size.cols, prev.position.col + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0))),
      },
    }));
  };

  const filteredVGs = filter.applyFilters(viewGroups);
  const activeVGs = filteredVGs.filter((vg) => vg.position);
  const availableTags = useMemo(
    () => Array.from(new Set(viewGroups.flatMap((vg) => vg.tags || []))),
    [viewGroups]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {showToolbar && <FilterToolbar filter={filter} sizeMode={sizeMode} tagOptions={availableTags} />}

      <div style={{ flex: 1, overflow: 'auto', padding: showToolbar ? tokens.spacing.md : tokens.spacing.sm }}>
        {mode === MAP_MODES.NAVIGATE && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted, marginBottom: '2px' }}>Current Position</div>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: tokens.colors.accent.amber,
                  }}
                >
                  {formatCellRef(viewport.position.row, viewport.position.col)}
                </div>
                <div style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted, marginTop: '2px' }}>
                  Viewport: {viewport.size.cols}x{viewport.size.rows}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: tokens.spacing.lg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>Viewports</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.cyan,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={10} /> New
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '2px 8px',
                      background: tokens.colors.glass.subtle,
                      border: 'none',
                      borderRadius: tokens.radius.md,
                      color: tokens.colors.accent.blue,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle size={10} /> Save
                  </button>
                </div>
              </div>
              {MOCK_VIEWPORTS.map((vp) => {
                const isActive = vp.id === viewport.id;
                return (
                  <div
                    key={vp.id}
                    onClick={() => setViewport(vp)}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      padding: tokens.spacing.sm,
                      marginBottom: tokens.spacing.xs,
                      background: isActive ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                      border: `1px solid ${isActive ? tokens.colors.accent.blue : tokens.colors.border.subtle}`,
                      borderRadius: tokens.radius.md,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? tokens.colors.accent.blue : tokens.colors.text.muted }} />
                    <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{vp.name}</span>
                    <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{vp.size.cols}x{vp.size.rows}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
                <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>Bookmarks</span>
                <button
                  type="button"
                  style={{
                    padding: '2px 8px',
                    background: tokens.colors.glass.subtle,
                    border: 'none',
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.accent.cyan,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={10} /> Add
                </button>
              </div>
              {filter.applyFilters(bookmarks).map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => setViewport((p) => ({ ...p, position: bm.position }))}
                  role="button"
                  tabIndex={0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    padding: tokens.spacing.sm,
                    marginBottom: tokens.spacing.xs,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  {bm.isStarred ? (
                    <Star size={12} fill={tokens.colors.accent.amber} style={{ color: tokens.colors.accent.amber }} />
                  ) : (
                    <Bookmark size={12} style={{ color: tokens.colors.text.muted }} />
                  )}
                  <span style={{ flex: 1, fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{bm.name}</span>
                  <span
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color: tokens.colors.accent.amber,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {formatCellRef(bm.position.row, bm.position.col)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === MAP_MODES.LAYOUT && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
              <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>On Canvas</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                <button
                  type="button"
                  style={{
                    padding: '2px 8px',
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: tokens.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Scan size={10} /> Fit All
                </button>
                <span
                  style={{
                    fontSize: tokens.fontSize.xs,
                    color: tokens.colors.text.muted,
                    background: tokens.colors.glass.medium,
                    padding: '2px 8px',
                    borderRadius: tokens.radius.lg,
                  }}
                >
                  {activeVGs.length}
                </span>
              </div>
            </div>
            {activeVGs.map((vg) => (
              <div
                key={vg.id}
                onClick={() => setSelectedVGId(vg.id)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  padding: tokens.spacing.sm,
                  marginBottom: tokens.spacing.xs,
                  background: selectedVGId === vg.id ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                  border: `1px solid ${selectedVGId === vg.id ? vg.color : tokens.colors.border.subtle}`,
                  borderRadius: tokens.radius.md,
                  borderLeft: `3px solid ${vg.color}`,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: tokens.fontSize.sm,
                    color: tokens.colors.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {vg.name}
                </span>
                <span style={{ fontSize: tokens.fontSize.xs, color: vg.color, fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatCellRef(vg.position.row, vg.position.col)}
                </span>
                <span style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.text.muted }}>{vg.views?.length || 0}v</span>
              </div>
            ))}
          </>
        )}

        {mode === MAP_MODES.LINKS && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.sm }}>
              <span style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary }}>VG Links</span>
              <button
                type="button"
                style={{
                  padding: '2px 8px',
                  background: tokens.colors.glass.subtle,
                  border: 'none',
                  borderRadius: tokens.radius.md,
                  color: tokens.colors.accent.cyan,
                  cursor: 'pointer',
                  fontSize: tokens.fontSize.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={10} /> Create
              </button>
            </div>
            {links.map((link) => {
              const fromVG = viewGroups.find((v) => v.id === link.from);
              const toVG = viewGroups.find((v) => v.id === link.to);
              const isHighlighted = highlightedLinkId === link.id;
              const color = link.type === 'camera' ? tokens.colors.accent.cyan : tokens.colors.accent.purple;
              return (
                <div
                  key={link.id}
                  onClick={() => setHighlightedLinkId(isHighlighted ? null : link.id)}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: tokens.spacing.sm,
                    marginBottom: tokens.spacing.xs,
                    background: isHighlighted ? tokens.colors.glass.medium : tokens.colors.glass.subtle,
                    border: `1px solid ${isHighlighted ? color : tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: '4px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: fromVG?.color }} />
                    <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{fromVG?.name}</span>
                    <span style={{ color }}>{link.mode === 'bidirectional' ? '<->' : '->'}</span>
                    <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{toVG?.name}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: toVG?.color }} />
                  </div>
                  <span
                    style={{
                      fontSize: tokens.fontSize.xs,
                      padding: '2px 6px',
                      background: `${color}20`,
                      color,
                      borderRadius: tokens.radius.sm,
                    }}
                  >
                    {link.type}
                  </span>
                </div>
              );
            })}
          </>
        )}

        {mode === MAP_MODES.TEAM && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: tokens.spacing.sm,
                marginBottom: tokens.spacing.lg,
                background: tokens.colors.glass.subtle,
                borderRadius: tokens.radius.md,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
                <MousePointer2 size={14} style={{ color: tokens.colors.text.muted }} />
                <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>Show cursors</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCursors(!showCursors)}
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: showCursors ? tokens.colors.accent.green : tokens.colors.bg.tertiary,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: showCursors ? 20 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            <div style={{ fontSize: tokens.fontSize.sm, fontWeight: 600, color: tokens.colors.text.secondary, marginBottom: tokens.spacing.sm }}>
              Online ({collaborators.filter((c) => c.isOnline).length})
            </div>
            {collaborators
              .filter((c) => c.isOnline)
              .map((collab) => (
                <div
                  key={collab.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    padding: tokens.spacing.sm,
                    marginBottom: tokens.spacing.xs,
                    background: tokens.colors.glass.subtle,
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    borderRadius: tokens.radius.md,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: collab.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {collab.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.primary }}>{collab.name}</div>
                    {collab.isBroadcasting && (
                      <div
                        style={{
                          fontSize: tokens.fontSize.xs,
                          color: tokens.colors.accent.red,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Radio size={10} /> Broadcasting
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      padding: '4px 8px',
                      background: tokens.colors.glass.medium,
                      border: 'none',
                      borderRadius: tokens.radius.sm,
                      color: tokens.colors.accent.blue,
                      cursor: 'pointer',
                      fontSize: tokens.fontSize.xs,
                    }}
                  >
                    Follow
                  </button>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export const CanvasMapV2Spec = ({ width = 480, height = 650, onClose, showDebugControls = false }) => {
  const [mapMode, setMapMode] = useState(MAP_MODES.LAYOUT);
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.VG);
  const [selectedVGId, setSelectedVGId] = useState('vg-1');
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [showGridLabels] = useState(true);
  const showGridPaper = true;
  const [showViewports, setShowViewports] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showCursors, setShowCursors] = useState(true);
  const [lockLabels] = useState(true);
  const [minimapZoom, setMinimapZoom] = useState(100);
  const [companionOpen, setCompanionOpen] = useState(true);
  const [companionTab, setCompanionTab] = useState(COMPANION_TABS.VIEWS);
  const [viewport, setViewport] = useState(MOCK_VIEWPORT);
  const [homePosition, setHomePosition] = useState({ row: 0, col: 0 });
  const [isDraggingViewport] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [sidebarSide, setSidebarSide] = useState('left');
  const [minimapHeightOverride, setMinimapHeightOverride] = useState(null);
  const [isResizingMinimap, setIsResizingMinimap] = useState(false);
  const panStartRef = useRef(null);
  const resizeStartRef = useRef(null);

  const filter = useListFilter({
    searchFields: (item) => [item.name, ...(item.views?.map((v) => v.name) || []), ...(item.tags || [])],
    quickFilterDefs: QUICK_FILTERS,
    sortOptions: SORT_OPTIONS,
  });

  const sidebarShowItems = useMemo(() => {
    const isVGMode = displayMode === DISPLAY_MODES.VG;
    return [
      {
        icon: isVGMode ? Grid3X3 : Layers,
        label: isVGMode ? 'VG' : 'View',
        active: true,
        onClick: () => setDisplayMode(isVGMode ? DISPLAY_MODES.VIEW : DISPLAY_MODES.VG),
      },
      { icon: Scan, label: 'Viewport', active: showViewports, onClick: () => setShowViewports((p) => !p) },
      { icon: Users, label: 'Team', active: showCollaborators, onClick: () => setShowCollaborators((p) => !p) },
      {
        icon: companionOpen ? PanelRightClose : PanelRightOpen,
        label: 'Panel',
        active: companionOpen,
        onClick: () => setCompanionOpen((p) => !p),
      },
    ];
  }, [displayMode, showViewports, showCollaborators, companionOpen]);


  const sizeMode = width < 320 ? 'minimal' : width < 400 ? 'compact' : 'standard';
  const dpadSize = sizeMode === 'minimal' ? 76 : sizeMode === 'compact' ? 88 : 100;
  const controlDeckWidth = dpadSize + 32;
  const companionWidth = companionOpen ? (width < 420 ? 160 : 200) : 0;
  const labelSize = sizeMode === 'minimal' ? 16 : 20;
  const mapOuterPadding = 8;
  const mapInset = sizeMode === 'minimal' ? 6 : 8;
  const spacingXs = parseFloat(tokens.spacing.xs) || 4;
  const spacingSm = parseFloat(tokens.spacing.sm) || 6;
  const fontXs = parseFloat(tokens.fontSize.xs) || 9;
  const zoomLabelHeight = fontXs + 4;
  const zoomRowHeight = 22;
  const zoomBlockHeight = zoomLabelHeight + spacingXs + zoomRowHeight;
  const dpadBlockHeight = dpadSize + 6;
  const actionRowHeight = 26 + spacingXs * 2;
  const deckMinHeight = zoomBlockHeight + dpadBlockHeight + actionRowHeight + spacingSm * 2 + spacingSm * 3;
  const bottomMinHeight = Math.max(220, Math.ceil(deckMinHeight));
  const headerHeightEstimate = 40;
  const resizerHeight = 6;
  const innerHeight = Math.max(0, height - headerHeightEstimate);
  const desiredTopHeight = Math.floor(height * 0.55);
  const sidebarButtonHeight = 30;
  const sidebarGap = 6;
  const sidebarPadding = 12;
  const sidebarLabelHeight = fontXs + 4;
  const sidebarButtonCount = sidebarShowItems.length + 1;
  const sidebarMinHeight =
    sidebarPadding + sidebarLabelHeight + sidebarButtonCount * sidebarButtonHeight + sidebarGap * (sidebarButtonCount + 1);
  const availableTopHeight = Math.max(0, innerHeight - bottomMinHeight - resizerHeight);
  const minTopHeight = Math.min(availableTopHeight, Math.max(160, sidebarMinHeight + mapOuterPadding * 2));
  const clampedTopHeight = Math.max(minTopHeight, Math.min(desiredTopHeight, availableTopHeight));
  const topSectionHeight =
    minimapHeightOverride != null
      ? Math.max(minTopHeight, Math.min(availableTopHeight, minimapHeightOverride))
      : clampedTopHeight;
  const bottomSectionHeight = Math.max(bottomMinHeight, innerHeight - topSectionHeight - resizerHeight);
  const gap = sizeMode === 'minimal' ? 2 : 3;
  const sidebarWidth = 56;
  const sidebarVisible = true;
  const rowInnerWidth = Math.max(0, width - mapOuterPadding * 2);
  const mapViewportWidth = Math.max(
    0,
    rowInnerWidth -
      (sidebarVisible ? sidebarWidth + mapOuterPadding : 0) -
      (companionOpen ? companionWidth + mapOuterPadding : 0)
  );
  const mapViewportHeight = Math.max(0, topSectionHeight - mapOuterPadding * 2);
  const viewportInnerWidth = Math.max(0, mapViewportWidth - mapInset * 2);
  const viewportInnerHeight = Math.max(0, mapViewportHeight - mapInset * 2);
  const labelOffset = showGridLabels ? labelSize : 0;
  const labelLocked = showGridLabels && lockLabels;
  const gridOffset = labelLocked ? 0 : labelOffset;
  const panContainerOffset = mapInset + (labelLocked ? labelOffset : 0);
  const gridAvailableWidth = Math.max(0, viewportInnerWidth - labelOffset);
  const gridAvailableHeight = Math.max(0, viewportInnerHeight - labelOffset);

  const cellSizeW = Math.floor((gridAvailableWidth - (CANVAS.cols - 1) * gap) / CANVAS.cols);
  const cellSizeH = Math.floor((gridAvailableHeight - (CANVAS.rows - 1) * gap) / CANVAS.rows);
  const cellSize = Math.min(64, Math.max(18, Math.min(cellSizeW, cellSizeH)));
  const zoomScale = minimapZoom / 100;
  const renderCellSize = Math.max(10, cellSize * zoomScale);
  const renderGap = Math.max(1, gap * zoomScale);
  const tileSize = renderCellSize + renderGap;
  const gridWidth = CANVAS.cols * (renderCellSize + renderGap) - renderGap;
  const gridHeight = CANVAS.rows * (renderCellSize + renderGap) - renderGap;
  const contentWidth = gridWidth + (labelLocked ? 0 : labelOffset);
  const contentHeight = gridHeight + (labelLocked ? 0 : labelOffset);
  const gridViewportWidth = Math.max(0, viewportInnerWidth - (labelLocked ? labelOffset : 0));
  const gridViewportHeight = Math.max(0, viewportInnerHeight - (labelLocked ? labelOffset : 0));
  const panMinX = Math.min(0, gridViewportWidth - contentWidth);
  const panMinY = Math.min(0, gridViewportHeight - contentHeight);
  const safePanOffset = {
    x: Math.min(0, Math.max(panMinX, panOffset.x)),
    y: Math.min(0, Math.max(panMinY, panOffset.y)),
  };
  const showHorizontalFade = contentWidth > gridViewportWidth + 1;
  const showVerticalFade = contentHeight > gridViewportHeight + 1;
  const gridPatternOffsetX = ((panContainerOffset + safePanOffset.x) % tileSize + tileSize) % tileSize;
  const gridPatternOffsetY = ((panContainerOffset + safePanOffset.y) % tileSize + tileSize) % tileSize;

  const flattenedViews = useMemo(() => flattenViewsToCanvas(MOCK_VIEWGROUPS), []);
  const filteredVGs = useMemo(() => filter.applyFilters(MOCK_VIEWGROUPS), [filter]);
  const visibleVGs = useMemo(() => filteredVGs.filter((vg) => vg.position), [filteredVGs]);
  const currentPositionLabel = formatCellRef(viewport.position.row, viewport.position.col);
  const isAtHome = viewport.position.row === homePosition.row && viewport.position.col === homePosition.col;
  const canvasSizeLabel = `${CANVAS.cols}x${CANVAS.rows}`;
  const openViewportCount = flattenedViews.length;
  const availableTags = useMemo(
    () => Array.from(new Set(MOCK_VIEWGROUPS.flatMap((vg) => vg.tags || []))),
    []
  );
  const handleMove = useCallback(
    (dir) => {
      setViewport((prev) => ({
        ...prev,
        position: {
          row: Math.max(0, Math.min(CANVAS.rows - prev.size.rows, prev.position.row + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0))),
          col: Math.max(0, Math.min(CANVAS.cols - prev.size.cols, prev.position.col + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0))),
        },
      }));
    },
    [setViewport]
  );

  const handleDragStart = useCallback((e, type, data) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, data }));
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarSide((prev) => (prev === 'left' ? 'right' : 'left'));
  }, []);

  const clamp = useCallback((value, min, max) => Math.min(max, Math.max(min, value)), []);

  const handleMinimapResizeStart = useCallback(
    (event) => {
      resizeStartRef.current = { startY: event.clientY, startHeight: topSectionHeight };
      setIsResizingMinimap(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [topSectionHeight]
  );

  const handlePanStart = useCallback(
    (event) => {
      if (event.button !== 0) return;
      panStartRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: safePanOffset.x,
        originY: safePanOffset.y,
        minX: panMinX,
        minY: panMinY,
      };
      setIsPanning(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [panMinX, panMinY, safePanOffset]
  );

  const handlePanMove = useCallback(
    (event) => {
      const start = panStartRef.current;
      if (!start) return;
      const nextX = start.originX + (event.clientX - start.startX);
      const nextY = start.originY + (event.clientY - start.startY);
      const clampedX = clamp(nextX, start.minX, 0);
      const clampedY = clamp(nextY, start.minY, 0);
      setPanOffset({ x: clampedX, y: clampedY });
    },
    [clamp]
  );

  const handlePanEnd = useCallback((event) => {
    if (!panStartRef.current) return;
    panStartRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    if (!isResizingMinimap) return;

    const handleMove = (event) => {
      if (!resizeStartRef.current) return;
      const next = resizeStartRef.current.startHeight + (event.clientY - resizeStartRef.current.startY);
      setMinimapHeightOverride(clamp(next, minTopHeight, availableTopHeight));
    };

    const handleUp = () => {
      setIsResizingMinimap(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isResizingMinimap, clamp, minTopHeight, availableTopHeight]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg, padding: tokens.spacing.xl, background: tokens.colors.bg.base }}>
      {showDebugControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.lg,
            flexWrap: 'wrap',
            padding: tokens.spacing.md,
            background: tokens.colors.bg.secondary,
            borderRadius: tokens.radius.lg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>Width:</span>
            <input
              type="range"
              min="300"
              max="700"
              value={width}
              onChange={() => {}}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary, minWidth: 45 }}>{width}px</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.muted }}>Height:</span>
            <input
              type="range"
              min="500"
              max="900"
              value={height}
              onChange={() => {}}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.text.secondary, minWidth: 45 }}>{height}px</span>
          </div>
          <span
            style={{
              padding: '4px 12px',
              background: tokens.colors.glass.medium,
              borderRadius: tokens.radius.md,
              fontSize: tokens.fontSize.sm,
              color: tokens.colors.accent.blue,
            }}
          >
            {sizeMode}
          </span>
        </div>
      )}

      <div
        style={{
          width,
          height,
          background: tokens.colors.bg.primary,
          borderRadius: tokens.radius.lg,
          border: `1px solid ${tokens.colors.border.default}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            background: tokens.colors.bg.tertiary,
            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
          }}
        >
          <Grip size={12} style={{ color: tokens.colors.text.muted }} />
          <Compass size={14} style={{ color: tokens.colors.accent.blue }} />
          <span
            style={{
              flex: 1,
              fontSize: tokens.fontSize.md,
              fontWeight: 600,
              color: tokens.colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Canvas
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: tokens.colors.text.muted,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              flex: '0 0 auto',
              height: topSectionHeight,
              display: 'flex',
              background: tokens.colors.canvas.bg,
              minHeight: 0,
              padding: mapOuterPadding,
              gap: mapOuterPadding,
            }}
          >
            {sidebarVisible && sidebarSide === 'left' && (
              <MapSidebar side={sidebarSide} onToggleSide={handleSidebarToggle} showItems={sidebarShowItems} />
            )}

            <div
              style={{
                flex: 1,
                position: 'relative',
                minHeight: 0,
                overflow: 'visible',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: tokens.colors.canvas.cell,
                  borderRadius: tokens.radius.md,
                  overflow: 'hidden',
                  cursor: isPanning ? 'grabbing' : 'grab',
                }}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerLeave={handlePanEnd}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  <GridPaperBackground
                    rows={Math.ceil(mapViewportHeight / (renderCellSize + renderGap))}
                    cols={Math.ceil(mapViewportWidth / (renderCellSize + renderGap))}
                    cellSize={renderCellSize}
                    gap={renderGap}
                    visible={showGridPaper}
                    minorColor="rgba(96, 165, 250, 0.04)"
                    majorColor="rgba(96, 165, 250, 0.08)"
                    offsetX={gridPatternOffsetX}
                    offsetY={gridPatternOffsetY}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: panContainerOffset,
                    left: panContainerOffset,
                    transform: `translate(${safePanOffset.x}px, ${safePanOffset.y}px)`,
                  }}
                >
                  <div style={{ position: 'relative', width: contentWidth, height: contentHeight }}>
                    {showGridLabels && !labelLocked && (
                      <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: labelOffset,
                      height: labelOffset,
                      background: 'linear-gradient(135deg, rgba(6,10,18,0.95), rgba(6,10,18,0.7))',
                    }}
                  />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: labelOffset,
                            height: labelOffset,
                            width: gridWidth,
                            display: 'flex',
                            background: 'rgba(6, 10, 18, 0.92)',
                            borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                          }}
                        >
                          {Array.from({ length: CANVAS.cols }).map((_, col) => (
                            <div
                              key={col}
                              style={{
                                width: renderCellSize,
                                marginRight: col < CANVAS.cols - 1 ? renderGap : 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: tokens.fontSize.xs,
                                fontWeight: 600,
                                color: tokens.colors.accent.amber,
                                fontFamily: 'monospace',
                              }}
                            >
                              {colToLetter(col)}
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            top: labelOffset,
                            left: 0,
                            width: labelOffset,
                            height: gridHeight,
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'rgba(6, 10, 18, 0.92)',
                            borderRight: `1px solid ${tokens.colors.border.subtle}`,
                          }}
                        >
                          {Array.from({ length: CANVAS.rows }).map((_, row) => (
                            <div
                              key={row}
                              style={{
                                height: renderCellSize,
                                marginBottom: row < CANVAS.rows - 1 ? renderGap : 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: tokens.fontSize.xs,
                                fontWeight: 600,
                                color: tokens.colors.accent.amber,
                                fontFamily: 'monospace',
                              }}
                            >
                              {row + 1}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: gridWidth,
                        height: gridHeight,
                      }}
                    >
                      <GridPaperBackground
                        rows={CANVAS.rows}
                        cols={CANVAS.cols}
                        cellSize={renderCellSize}
                        gap={renderGap}
                        visible={showGridPaper}
                        offsetX={0}
                        offsetY={0}
                      />

                      {mapMode === MAP_MODES.LINKS && (
                        <LinkLines
                          links={MOCK_VG_LINKS}
                          viewGroups={MOCK_VIEWGROUPS}
                          cellSize={renderCellSize}
                          gap={renderGap}
                          highlightedId={highlightedLinkId}
                          onLinkClick={setHighlightedLinkId}
                        />
                      )}

                      {displayMode === DISPLAY_MODES.VG &&
                        visibleVGs.map((vg) => (
                          <VGBlock
                            key={vg.id}
                            vg={vg}
                            cellSize={renderCellSize}
                            gap={renderGap}
                            isSelected={selectedVGId === vg.id}
                            onClick={() => setSelectedVGId(vg.id)}
                          />
                        ))}

                      {displayMode === DISPLAY_MODES.VIEW &&
                        flattenedViews.map((view) => (
                          <ViewCell
                            key={view.id}
                            view={view}
                            cellSize={renderCellSize}
                            gap={renderGap}
                            isSelected={selectedVGId === view.vgId}
                            onClick={() => setSelectedVGId(view.vgId)}
                          />
                        ))}

                      {showViewports && (
                        <ViewportIndicator
                          viewport={viewport}
                          cellSize={renderCellSize}
                          gap={renderGap}
                          isDragging={isDraggingViewport}
                          onMouseDown={() => {}}
                        />
                      )}

                      {showCollaborators && (
                        <CollaboratorIndicators
                          collaborators={MOCK_COLLABORATORS}
                          cellSize={renderCellSize}
                          gap={renderGap}
                          showCursors={showCursors}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {showGridLabels && labelLocked && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: mapViewportWidth,
                      height: mapViewportHeight,
                      pointerEvents: 'none',
                      zIndex: 18,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: labelOffset,
                        height: labelOffset,
                        background: '#000000',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: labelOffset,
                        width: mapViewportWidth - labelOffset,
                        height: labelOffset,
                        display: 'flex',
                        overflow: 'hidden',
                        background: 'rgba(6, 10, 18, 0.92)',
                        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          transform: `translateX(${safePanOffset.x + mapInset}px)`,
                        }}
                      >
                        {Array.from({ length: CANVAS.cols }).map((_, col) => (
                          <div
                            key={col}
                            style={{
                              width: renderCellSize,
                              marginRight: col < CANVAS.cols - 1 ? renderGap : 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: tokens.fontSize.xs,
                              fontWeight: 600,
                              color: tokens.colors.accent.amber,
                              fontFamily: 'monospace',
                            }}
                          >
                            {colToLetter(col)}
                          </div>
                        ))}
                      </div>
                  </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: labelOffset,
                        left: 0,
                        width: labelOffset,
                        height: mapViewportHeight - labelOffset,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        background: 'rgba(6, 10, 18, 0.92)',
                        borderRight: `1px solid ${tokens.colors.border.subtle}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          transform: `translateY(${safePanOffset.y + mapInset}px)`,
                        }}
                      >
                        {Array.from({ length: CANVAS.rows }).map((_, row) => (
                          <div
                            key={row}
                            style={{
                              height: renderCellSize,
                              marginBottom: row < CANVAS.rows - 1 ? renderGap : 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: tokens.fontSize.xs,
                              fontWeight: 600,
                              color: tokens.colors.accent.amber,
                              fontFamily: 'monospace',
                            }}
                          >
                            {row + 1}
                          </div>
                        ))}
                      </div>
                  </div>
                  </div>
                )}

                {(showHorizontalFade || showVerticalFade) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: labelLocked ? labelOffset : 0,
                      left: labelLocked ? labelOffset : 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                      zIndex: 14,
                      borderRadius: tokens.radius.md,
                    }}
                  >
                    {showHorizontalFade && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 28,
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 36,
                            height: '100%',
                            background: 'linear-gradient(270deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                      </>
                    )}
                    {showVerticalFade && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: 28,
                            background: 'linear-gradient(180deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '100%',
                            height: 36,
                            background: 'linear-gradient(0deg, rgba(6,10,18,0.9), rgba(6,10,18,0))',
                          }}
                        />
                      </>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: tokens.radius.md,
                        background: 'rgba(2, 6, 16, 0.65)',
                        border: `1px solid ${tokens.colors.border.subtle}`,
                        color: tokens.colors.text.muted,
                        fontSize: tokens.fontSize.xs,
                        letterSpacing: '0.2px',
                      }}
                    >
                      <Move size={12} />
                      Drag to pan
                    </div>
                  </div>
                )}
              </div>

            </div>

            {sidebarVisible && sidebarSide === 'right' && (
              <MapSidebar side={sidebarSide} onToggleSide={handleSidebarToggle} showItems={sidebarShowItems} />
            )}

            <CompanionPanel
              isOpen={companionOpen}
              onClose={() => setCompanionOpen(false)}
              activeTab={companionTab}
              setActiveTab={setCompanionTab}
              viewGroups={MOCK_VIEWGROUPS}
              unplacedViews={MOCK_UNPLACED_VIEWS}
              datasets={MOCK_DATASETS}
              sizeMode={sizeMode}
              width={companionWidth}
              showToolbar
              onDragStart={handleDragStart}
            />
          </div>

          <div
            onPointerDown={handleMinimapResizeStart}
            style={{
              height: resizerHeight,
              cursor: 'row-resize',
              background: tokens.colors.bg.tertiary,
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}
          />

          <div
            style={{
              flex: '0 0 auto',
              height: bottomSectionHeight,
              minHeight: bottomMinHeight,
              borderTop: `1px solid ${tokens.colors.border.subtle}`,
              background: tokens.colors.bg.secondary,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
              <LayoutControlDeck
                minimapZoom={minimapZoom}
                onZoomIn={() => setMinimapZoom((p) => Math.min(150, p + 10))}
                onZoomOut={() => setMinimapZoom((p) => Math.max(50, p - 10))}
                onZoomReset={() => setMinimapZoom(100)}
                companionOpen={companionOpen}
                toggleCompanion={() => setCompanionOpen((p) => !p)}
                currentPositionLabel={currentPositionLabel}
                isAtHome={isAtHome}
                canvasSizeLabel={canvasSizeLabel}
                openViewportCount={openViewportCount}
                onMove={handleMove}
                onGoHome={() => setViewport((p) => ({ ...p, position: homePosition }))}
                onSetHome={() => setHomePosition(viewport.position)}
                onFitAll={() => {}}
                onAddBookmark={() => {}}
                sizeMode={sizeMode}
                deckWidth={controlDeckWidth}
              />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ padding: tokens.spacing.sm, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
                  <LayoutSearchRow filter={filter} tagOptions={availableTags} />
                  <div style={{ marginTop: tokens.spacing.xs }}>
                    <ModeTabsPill activeMode={mapMode} onModeChange={setMapMode} />
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <ContextualPanelContent
                    mode={mapMode}
                    viewport={viewport}
                    setViewport={setViewport}
                    homePosition={homePosition}
                    viewGroups={MOCK_VIEWGROUPS}
                    selectedVGId={selectedVGId}
                    setSelectedVGId={setSelectedVGId}
                    links={MOCK_VG_LINKS}
                    highlightedLinkId={highlightedLinkId}
                    setHighlightedLinkId={setHighlightedLinkId}
                    collaborators={MOCK_COLLABORATORS}
                    showCursors={showCursors}
                    setShowCursors={setShowCursors}
                    bookmarks={MOCK_BOOKMARKS}
                    filter={filter}
                    sizeMode={sizeMode}
                    showToolbar={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasMapV2Spec;
