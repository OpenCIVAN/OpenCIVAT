import React, { useState, createContext, useContext, useMemo } from 'react';

// =============================================================================
// ADAPTIVE CONTEXT - Controls desktop vs VR mode
// =============================================================================

const AdaptiveContext = createContext({
  mode: 'desktop',
  density: 'comfortable',
  setMode: () => {},
  setDensity: () => {},
});

const useAdaptive = () => useContext(AdaptiveContext);

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  desktop: {
    comfortable: {
      itemHeight: 36,
      itemPadding: '8px 12px',
      iconSize: 14,
      fontSize: 11,
      metaFontSize: 9,
      gap: 8,
      borderRadius: 6,
      actionSize: 24,
    },
    compact: {
      itemHeight: 28,
      itemPadding: '4px 8px',
      iconSize: 12,
      fontSize: 10,
      metaFontSize: 8,
      gap: 6,
      borderRadius: 4,
      actionSize: 20,
    },
  },
  vr: {
    comfortable: {
      itemHeight: 64,
      itemPadding: '16px 20px',
      iconSize: 24,
      fontSize: 16,
      metaFontSize: 12,
      gap: 16,
      borderRadius: 12,
      actionSize: 48,
    },
    compact: {
      itemHeight: 52,
      itemPadding: '12px 16px',
      iconSize: 20,
      fontSize: 14,
      metaFontSize: 11,
      gap: 12,
      borderRadius: 10,
      actionSize: 40,
    },
  },
};

// =============================================================================
// MOCK ICONS (simplified SVG icons)
// =============================================================================

const Icons = {
  chevronDown: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  chevronRight: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  chevronUp: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ),
  database: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  box: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
  add: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  settings: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  moreHorizontal: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  ),
  eye: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  close: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  grid: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  target: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  link: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  copy: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  camera: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  place: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  trash: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  restore: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  deletePermanent: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  gripVertical: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="19" r="1" fill="currentColor" />
    </svg>
  ),
  arrowRight: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  arrowDown: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
};

// =============================================================================
// ADAPTIVE ICON BUTTON
// =============================================================================

function AdaptiveIconButton({ icon, onClick, title, variant = 'ghost', color, stretch = false }) {
  const { mode, density } = useAdaptive();
  const t = tokens[mode][density];
  
  const Icon = Icons[icon];
  
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: stretch ? t.actionSize : t.actionSize,
    minWidth: t.actionSize,
    height: stretch ? 'auto' : t.actionSize,
    minHeight: stretch ? 0 : t.actionSize,
    flex: stretch ? 1 : 'none',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    color: color || 'rgba(255,255,255,0.6)',
    background: variant === 'ghost' ? 'transparent' : 'rgba(255,255,255,0.05)',
    borderBottom: stretch && mode !== 'vr' ? '1px solid rgba(255,255,255,0.05)' : 'none',
    borderRight: stretch && mode === 'vr' ? '1px solid rgba(255,255,255,0.05)' : 'none',
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <button
      style={baseStyles}
      onClick={handleClick}
      title={title}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = variant === 'ghost' ? 'transparent' : 'rgba(255,255,255,0.05)';
        e.currentTarget.style.color = color || 'rgba(255,255,255,0.6)';
      }}
    >
      {Icon && <Icon size={t.iconSize} />}
    </button>
  );
}

// =============================================================================
// ADAPTIVE VIEW ITEM - Enhanced for VR with expandable toolbar and drag support
// =============================================================================

function AdaptiveViewItem({ 
  view, 
  onFocus, 
  onClose, 
  onPlace,
  onTrash,
  onRestore,
  onDeletePermanently,
  onRename,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  dragOverIndex,
  totalItems,
  showDatasetBadge = false, // Show dataset name badge in grouped views
}) {
  const { mode, density } = useAdaptive();
  const t = tokens[mode][density];
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragHandle, setIsDragHandle] = useState(false);

  const isVR = mode === 'vr';
  const isBeingDragged = isDragging === index;
  const isDropTarget = dragOverIndex === index;
  const isDropAfterTarget = dragOverIndex === index + 0.5;

  // Determine view state: 'active' (on canvas), 'inactive' (not on canvas), 'trashed'
  const viewState = view.status === 'trashed' 
    ? 'trashed' 
    : view.position 
      ? 'active' 
      : 'inactive';

  // Tool definitions based on state
  const getTools = () => {
    const commonTools = [
      { id: 'link', icon: 'link', label: 'Link', color: '#a78bfa' },
      { id: 'duplicate', icon: 'copy', label: 'Duplicate', color: '#f472b6' },
      { id: 'snapshot', icon: 'camera', label: 'Snapshot', color: '#fbbf24' },
      { id: 'settings', icon: 'settings', label: 'Settings', color: '#6b7280' },
    ];

    switch (viewState) {
      case 'active':
        return {
          quick: [
            { id: 'focus', icon: 'target', label: 'Focus', color: '#60a5fa' },
            { id: 'visibility', icon: view.visible !== false ? 'eye' : 'eyeOff', label: view.visible !== false ? 'Hide' : 'Show', color: view.visible !== false ? '#4ade80' : '#6b7280' },
            { id: 'close', icon: 'close', label: 'Close', color: '#ef4444' },
          ],
          more: commonTools,
        };
      case 'inactive':
        return {
          quick: [
            { id: 'place', icon: 'place', label: 'Place', color: '#60a5fa' },
            { id: 'trash', icon: 'trash', label: 'Trash', color: '#ef4444' },
          ],
          more: commonTools,
        };
      case 'trashed':
        return {
          quick: [
            { id: 'restore', icon: 'restore', label: 'Restore', color: '#4ade80' },
            { id: 'deletePermanently', icon: 'deletePermanent', label: 'Delete', color: '#ef4444' },
          ],
          more: [], // No additional tools for trashed items
        };
      default:
        return { quick: [], more: [] };
    }
  };

  const { quick: quickTools, more: moreTools } = getTools();

  // Drop indicator styles - always column layout
  const dropIndicatorStyles = {
    position: 'absolute',
    background: '#6366f1',
    borderRadius: 2,
    zIndex: 10,
    transition: 'opacity 0.15s ease',
    boxShadow: '0 0 8px #6366f180',
  };

  const dropIndicatorBefore = { 
    ...dropIndicatorStyles, 
    top: -2, 
    left: 12, 
    right: 12, 
    height: 4, 
    opacity: isDropTarget ? 1 : 0 
  };

  const dropIndicatorAfter = { 
    ...dropIndicatorStyles, 
    bottom: -2, 
    left: 12, 
    right: 12, 
    height: 4, 
    opacity: isDropAfterTarget ? 1 : 0 
  };

  // Container styles - always column layout now
  const containerStyles = {
    position: 'relative',
    marginLeft: isVR ? 0 : 12,
    marginBottom: isVR ? 8 : 2,
    borderRadius: t.borderRadius,
    overflow: 'visible',
    background: isVR 
      ? viewState === 'trashed'
        ? 'linear-gradient(145deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)'
        : 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      : isExpanded 
        ? 'rgba(255,255,255,0.04)' 
        : 'transparent',
    border: isVR 
      ? viewState === 'trashed'
        ? '1px solid rgba(239,68,68,0.2)'
        : '1px solid rgba(255,255,255,0.1)' 
      : 'none',
    boxShadow: isBeingDragged 
      ? '0 8px 32px rgba(99,102,241,0.4)' 
      : (isVR && isHovered) || isExpanded 
        ? '0 4px 16px rgba(0,0,0,0.3)' 
        : 'none',
    transition: 'all 0.2s ease',
    opacity: isBeingDragged ? 0.5 : viewState === 'trashed' ? 0.7 : 1,
    transform: isBeingDragged ? 'scale(1.02)' : 'scale(1)',
    cursor: isDragHandle ? 'grab' : 'pointer',
  };

  // Drag handle styles
  const dragHandleStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isVR ? 24 : 16,
    color: isDragHandle ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
    cursor: 'grab',
    flexShrink: 0,
    transition: 'color 0.15s ease',
    marginRight: isVR ? 8 : 4,
  };

  // Main row
  const mainRowStyles = {
    display: 'flex',
    alignItems: 'stretch',
    minHeight: t.itemHeight,
    overflow: 'hidden', // Clip slide-in animation
  };

  // Color strip (VR) or border (desktop)
  const colorStripStyles = isVR ? {
    width: 6,
    background: viewState === 'trashed' ? '#6b7280' : view.color,
    flexShrink: 0,
    boxShadow: viewState === 'active' ? `0 0 12px ${view.color}60` : 'none',
    opacity: viewState === 'trashed' ? 0.5 : 1,
  } : null;

  // Content area
  const contentStyles = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: t.gap,
    padding: t.itemPadding,
    paddingRight: isVR ? t.itemPadding : 8, // Less right padding on desktop for slide-over
    borderLeft: !isVR 
      ? `3px solid ${viewState === 'active' ? view.color : viewState === 'trashed' ? '#6b7280' : isExpanded ? 'rgba(255,255,255,0.2)' : 'transparent'}` 
      : 'none',
    background: !isVR && viewState === 'active' 
      ? `linear-gradient(90deg, ${view.color}15 0%, transparent 100%)`
      : !isVR && isHovered && !isExpanded
        ? 'rgba(255,255,255,0.03)'
        : 'transparent',
    transition: 'all 0.15s ease',
    borderRadius: !isVR ? `0 ${t.borderRadius}px ${t.borderRadius}px 0` : 0,
    overflow: 'hidden',
    position: 'relative', // For absolute positioned slide-over
  };

  // Color dot (desktop)
  const colorDotStyles = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: viewState === 'trashed' ? '#6b7280' : view.color,
    flexShrink: 0,
    boxShadow: viewState === 'active' ? `0 0 8px ${view.color}80` : 'none',
    opacity: viewState === 'trashed' ? 0.5 : 1,
  };

  // Thumbnail (VR)
  const thumbnailStyles = {
    width: 56,
    height: 40,
    borderRadius: t.borderRadius / 2,
    background: `linear-gradient(135deg, ${view.color}30 0%, ${view.color}10 100%)`,
    border: `1px solid ${view.color}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: view.color,
  };

  // Info
  const infoStyles = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const nameStyles = {
    fontSize: t.fontSize,
    fontWeight: viewState === 'active' ? 600 : 500,
    color: viewState === 'active' ? '#fff' : viewState === 'trashed' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textDecoration: viewState === 'trashed' ? 'line-through' : 'none',
  };

  const metaStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: t.metaFontSize,
    color: 'rgba(255,255,255,0.5)',
  };

  // Position badge
  const positionBadgeStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: isVR ? '4px 10px' : '2px 6px',
    background: view.position ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.08)',
    borderRadius: t.borderRadius / 2,
    fontSize: t.metaFontSize,
    color: view.position ? '#60a5fa' : 'rgba(255,255,255,0.4)',
    fontWeight: 500,
  };

  // Status indicator with state-based styling
  const getStatusConfig = () => {
    switch (viewState) {
      case 'active':
        return { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Active', glow: true };
      case 'inactive':
        return { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Inactive', glow: false };
      case 'trashed':
        return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Trashed', glow: false };
      default:
        return { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', label: 'Unknown', glow: false };
    }
  };
  const statusConfig = getStatusConfig();

  const statusStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: isVR ? '6px 12px' : '2px 8px',
    background: statusConfig.bg,
    borderRadius: t.borderRadius / 2,
    fontSize: t.metaFontSize,
    color: statusConfig.color,
    fontWeight: 600,
  };

  const statusDotStyles = {
    width: isVR ? 8 : 6,
    height: isVR ? 8 : 6,
    borderRadius: '50%',
    background: statusConfig.color,
    boxShadow: statusConfig.glow ? `0 0 8px ${statusConfig.color}` : 'none',
  };

  // Expand button (desktop only)
  const expandButtonStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    background: isExpanded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
    color: isExpanded ? '#818cf8' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  };

  // Quick actions container (desktop) - slides in from right on hover
  const quickActionsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: `translateY(-50%) translateX(${isHovered || isExpanded ? '0' : 'calc(100% + 8px)'})`,
    opacity: isHovered || isExpanded ? 1 : 0,
    transition: 'all 0.2s ease',
    background: 'linear-gradient(90deg, transparent 0%, rgba(30,30,35,0.98) 30%)',
    paddingLeft: 20,
    paddingRight: 4,
    height: 'calc(100% - 4px)',
    pointerEvents: isHovered || isExpanded ? 'auto' : 'none',
    zIndex: 5,
  };

  // Right content wrapper (status, position) - fades/slides on hover
  const rightContentWrapperStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
    paddingRight: 4,
    transition: 'all 0.2s ease',
    opacity: !isVR && (isHovered || isExpanded) ? 0 : 1,
    transform: !isVR && (isHovered || isExpanded) ? 'translateX(-20px)' : 'translateX(0)',
  };

  // VR Actions bar (horizontal, below main content)
  const vrActionsBarStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
  };

  // Expanded toolbar (desktop)
  const expandedToolbarStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    paddingLeft: 23,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.15)',
  };

  // VR expanded toolbar (more tools)
  const vrExpandedToolbarStyles = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.1)',
  };

  // VR Action button component
  const VRActionButton = ({ tool, showLabel = true }) => {
    const Icon = Icons[tool.icon];
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 48,
          minWidth: 48,
          padding: showLabel ? '0 16px' : '0 12px',
          border: 'none',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          color: tool.color || 'rgba(255,255,255,0.7)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title={tool.label}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Tool:', tool.id, 'View:', view.id);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {Icon && <Icon size={20} />}
        {showLabel && <span>{tool.label}</span>}
      </button>
    );
  };

  // Tool button component
  const ToolButton = ({ tool, showLabel = false, size = 'normal' }) => {
    const Icon = Icons[tool.icon];
    const btnSize = size === 'large' ? t.actionSize : (isVR ? 40 : 24);
    
    return (
      <button
        style={{
          display: 'flex',
          flexDirection: showLabel ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: showLabel ? 4 : 0,
          width: showLabel ? 'auto' : btnSize,
          height: btnSize,
          minWidth: btnSize,
          padding: showLabel ? '8px 12px' : 0,
          border: 'none',
          borderRadius: t.borderRadius / 2,
          background: 'rgba(255,255,255,0.06)',
          color: tool.color || 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flex: size === 'stretch' ? 1 : 'none',
        }}
        title={tool.label}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Tool:', tool.id, 'View:', view.id);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = tool.color || 'rgba(255,255,255,0.6)';
        }}
      >
        {Icon && <Icon size={isVR ? 18 : 12} />}
        {showLabel && (
          <span style={{ fontSize: isVR ? 11 : 9, fontWeight: 500 }}>{tool.label}</span>
        )}
      </button>
    );
  };

  // Drag handlers
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart?.(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate if dropping before or after based on vertical mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const mousePos = e.clientY;
    
    if (mousePos < midpoint) {
      onDragOver?.(index);
    } else {
      onDragOver?.(index + 0.5);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      onDragOver?.(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    let toIndex = dragOverIndex;
    
    // Adjust index if dropping after
    if (toIndex % 1 !== 0) {
      toIndex = Math.ceil(toIndex);
    }
    
    onDrop?.(fromIndex, toIndex);
  };

  return (
    <div 
      style={containerStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drop indicator - before */}
      <div style={dropIndicatorBefore} />
      
      {/* Drop indicator - after (only for last item) */}
      {index === totalItems - 1 && <div style={dropIndicatorAfter} />}

      {/* Main row */}
      <div style={mainRowStyles}>
        {/* Color strip - VR only */}
        {isVR && <div style={colorStripStyles} />}

        {/* Content */}
        <div 
          style={contentStyles}
          onClick={() => isVR ? onFocus?.(view.id) : setIsExpanded(!isExpanded)}
        >
          {/* Drag handle */}
          <div 
            style={dragHandleStyles}
            onMouseEnter={() => setIsDragHandle(true)}
            onMouseLeave={() => setIsDragHandle(false)}
          >
            <Icons.gripVertical size={isVR ? 16 : 12} />
          </div>

          {/* Color dot - desktop only */}
          {!isVR && <div style={colorDotStyles} />}

          {/* Thumbnail - VR only */}
          {isVR && (
            <div style={thumbnailStyles}>
              <Icons.eye size={20} />
            </div>
          )}

          {/* View info */}
          <div style={infoStyles}>
            <div style={nameStyles}>{view.name}</div>
            <div style={metaStyles}>
              {isVR && (
                <>
                  <span style={{ 
                    padding: '1px 6px', 
                    background: `${view.color}25`, 
                    color: view.color,
                    borderRadius: 3,
                    fontWeight: 500,
                  }}>
                    {view.handlerType}
                  </span>
                  <span>â€¢</span>
                </>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {view.datasetName}
              </span>
            </div>
          </div>

          {/* Right side content - position badge and status (desktop: fades on hover) */}
          <div style={rightContentWrapperStyles}>
            {/* Position badge */}
            {view.position && (
              <div style={positionBadgeStyles}>
                <Icons.grid size={isVR ? 12 : 8} />
                <span>{view.position.row},{view.position.col}</span>
              </div>
            )}

            {/* Status */}
            <div style={statusStyles}>
              <div style={statusDotStyles} />
              {isVR && <span>{statusConfig.label}</span>}
            </div>
          </div>

          {/* Desktop: Slide-in quick actions */}
          {!isVR && (
            <div style={quickActionsStyles}>
              {quickTools.map(tool => (
                <ToolButton key={tool.id} tool={tool} />
              ))}
              <button 
                style={expandButtonStyles}
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                title={isExpanded ? 'Collapse tools' : 'Expand tools'}
              >
                <Icons.chevronDown size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VR: Horizontal action bar below content */}
      {isVR && (
        <div style={vrActionsBarStyles}>
          {quickTools.map(tool => (
            <VRActionButton key={tool.id} tool={tool} />
          ))}
          {moreTools.length > 0 && (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 48,
                padding: '0 14px',
                marginLeft: 'auto',
                border: 'none',
                borderRadius: 10,
                background: isExpanded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                color: isExpanded ? '#818cf8' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            >
              <Icons.moreHorizontal size={18} />
              <span>{isExpanded ? 'Less' : 'More'}</span>
            </button>
          )}
        </div>
      )}

      {/* Expanded toolbar - desktop */}
      {isExpanded && !isVR && (
        <div style={expandedToolbarStyles}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tools
          </span>
          {moreTools.map(tool => (
            <ToolButton key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* VR expanded toolbar */}
      {isExpanded && isVR && (
        <div style={vrExpandedToolbarStyles}>
          {moreTools.map(tool => (
            <VRActionButton key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ADAPTIVE DATASET PARENT
// =============================================================================

function AdaptiveDatasetParent({ dataset, views, isExpanded, onToggle, onReorderViews }) {
  const { mode, density } = useAdaptive();
  const t = tokens[mode][density];
  const [isHovered, setIsHovered] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const activeCount = views.filter(v => v.status === 'active').length;
  const typeColor = dataset.color || '#c084fc';

  const handleDragStart = (index) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (index) => {
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (fromIndex, toIndex) => {
    if (fromIndex !== toIndex && fromIndex !== toIndex - 1) {
      onReorderViews?.(dataset.id, fromIndex, toIndex);
    }
    handleDragEnd();
  };

  // Always column layout within dataset

  // Card container
  const cardStyles = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: t.borderRadius,
    marginBottom: t.gap,
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
  };

  // Header row
  const headerStyles = {
    display: 'flex',
    alignItems: 'stretch',
  };

  // Main content area
  const contentStyles = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: t.gap,
    padding: t.itemPadding,
    minHeight: t.itemHeight,
    cursor: 'pointer',
  };

  // Chevron
  const chevronStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
    transition: 'transform 0.15s ease',
    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  };

  // Type icon container
  const typeIconStyles = {
    width: mode === 'vr' ? 44 : 28,
    height: mode === 'vr' ? 44 : 28,
    borderRadius: t.borderRadius / 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${typeColor}25`,
    color: typeColor,
    flexShrink: 0,
  };

  // Info area
  const infoStyles = {
    flex: 1,
    minWidth: 0,
  };

  const nameStyles = {
    fontSize: t.fontSize,
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: mode === 'vr' ? 4 : 2,
  };

  const metaStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: t.gap,
    fontSize: t.metaFontSize,
    color: 'rgba(255,255,255,0.5)',
  };

  const badgeStyles = {
    padding: mode === 'vr' ? '2px 8px' : '1px 5px',
    borderRadius: 3,
    background: `${typeColor}30`,
    color: typeColor,
    fontSize: t.metaFontSize,
    fontWeight: 500,
  };

  // View count
  const viewCountStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: mode === 'vr' ? '8px 14px' : '4px 8px',
    background: activeCount > 0 ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
    borderRadius: t.borderRadius / 2,
  };

  const viewCountNumberStyles = {
    fontSize: mode === 'vr' ? 18 : 13,
    fontWeight: 700,
    color: activeCount > 0 ? '#4ade80' : 'rgba(255,255,255,0.6)',
    lineHeight: 1,
  };

  // Action buttons column - stretches to match content height
  const actionsColumnStyles = {
    display: 'flex',
    flexDirection: mode === 'vr' ? 'row' : 'column',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
    width: mode === 'vr' ? 'auto' : tokens[mode][density].actionSize,
  };

  // Children container
  const childrenStyles = {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.1)',
    padding: mode === 'vr' ? '8px 0' : '4px 0',
  };

  return (
    <div style={cardStyles}>
      <div style={headerStyles}>
        {/* Main clickable content */}
        <div
          style={contentStyles}
          onClick={onToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Chevron */}
          <div style={chevronStyles}>
            <Icons.chevronDown size={t.iconSize} />
          </div>

          {/* Type icon */}
          <div style={typeIconStyles}>
            <Icons.box size={t.iconSize + 2} />
          </div>

          {/* Dataset info */}
          <div style={infoStyles}>
            <div style={nameStyles}>{dataset.name}</div>
            <div style={metaStyles}>
              <span style={badgeStyles}>{dataset.handlerType}</span>
              <span>{dataset.size}</span>
              {mode === 'vr' && <span>â€¢ {dataset.loadedAt}</span>}
            </div>
          </div>

          {/* View count */}
          <div style={viewCountStyles}>
            <span style={viewCountNumberStyles}>{activeCount}</span>
            {views.length !== activeCount && (
              <span style={{ fontSize: t.metaFontSize - 1, color: 'rgba(255,255,255,0.4)' }}>
                /{views.length}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons - stretch to fill height */}
        <div style={actionsColumnStyles}>
          <AdaptiveIconButton icon="add" title="Create View" variant="filled" stretch />
          <AdaptiveIconButton icon="settings" title="Settings" variant="filled" stretch />
          <AdaptiveIconButton icon="moreHorizontal" title="More" variant="filled" stretch />
        </div>
      </div>

      {/* Children (views) - always column layout within dataset */}
      {isExpanded && (
        <div style={{ 
          ...childrenStyles,
          display: 'flex',
          flexDirection: 'column',
          padding: mode === 'vr' ? '8px 0' : '4px 0',
        }}>
          {views.length > 0 ? (
            views.map((view, index) => (
              <AdaptiveViewItem
                key={view.id}
                view={view}
                index={index}
                totalItems={views.length}
                onFocus={() => console.log('Focus view:', view.id)}
                onClose={() => console.log('Close view:', view.id)}
                onPlace={() => console.log('Place view:', view.id)}
                onTrash={() => console.log('Trash view:', view.id)}
                onRestore={() => console.log('Restore view:', view.id)}
                onDeletePermanently={() => console.log('Delete permanently:', view.id)}
                isDragging={draggingIndex}
                dragOverIndex={dragOverIndex}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))
          ) : (
            <div style={{
              padding: mode === 'vr' ? '16px 20px' : '8px 12px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: t.metaFontSize,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>No views</span>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 4,
                color: 'rgba(255,255,255,0.6)',
                fontSize: t.metaFontSize,
                cursor: 'pointer',
              }}>
                <Icons.add size={10} />
                Create view
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GROUPED VIEWS SECTION - Shows views grouped by row, column, or ungrouped
// =============================================================================

function GroupedViewsSection({ allViews, groupBy, expandedGroups, onToggleGroup, onReorderViews }) {
  const { mode, density } = useAdaptive();
  const t = tokens[mode][density];
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Group views based on groupBy prop
  const groupedViews = useMemo(() => {
    if (groupBy === 'none') {
      // Split into active/inactive and trashed
      const active = allViews.filter(v => v.status !== 'trashed');
      const trashed = allViews.filter(v => v.status === 'trashed');
      const result = {};
      if (active.length > 0) result['All Views'] = active;
      if (trashed.length > 0) result['Trashed'] = trashed;
      return result;
    }

    const groups = {};
    
    allViews.forEach(view => {
      if (view.status === 'trashed') {
        if (!groups['Trashed']) groups['Trashed'] = [];
        groups['Trashed'].push(view);
      } else if (view.position) {
        const key = groupBy === 'row' 
          ? `Row ${view.position.row}`
          : `Column ${view.position.col}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(view);
      } else {
        if (!groups['Not on Canvas']) groups['Not on Canvas'] = [];
        groups['Not on Canvas'].push(view);
      }
    });

    return groups;
  }, [allViews, groupBy]);

  // Sort groups by number
  const sortedGroupKeys = Object.keys(groupedViews).sort((a, b) => {
    if (a === 'All Views') return -1;
    if (b === 'All Views') return 1;
    if (a === 'Trashed') return 1;
    if (b === 'Trashed') return -1;
    if (a === 'Not on Canvas') return 1;
    if (b === 'Not on Canvas') return -1;
    const numA = parseInt(a.split(' ')[1]) || 0;
    const numB = parseInt(b.split(' ')[1]) || 0;
    return numA - numB;
  });

  const handleDragStart = (index) => setDraggingIndex(index);
  const handleDragOver = (index) => setDragOverIndex(index);
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (fromIndex, toIndex) => {
    if (fromIndex !== toIndex && fromIndex !== toIndex - 1) {
      onReorderViews?.(fromIndex, toIndex);
    }
    handleDragEnd();
  };

  // Flatten for drag indices
  let flatIndex = 0;

  return (
    <div style={{ marginTop: 8 }}>
      {sortedGroupKeys.map(groupKey => {
        const views = groupedViews[groupKey];
        const isUnplaced = groupKey === 'Not on Canvas';
        const isTrashed = groupKey === 'Trashed';
        const isAllViews = groupKey === 'All Views';
        const isExpanded = isAllViews || expandedGroups?.has(groupKey);
        const activeCount = views.filter(v => v.status === 'active').length;
        
        return (
          <div key={groupKey} style={{ marginBottom: 8 }}>
            {/* Group header - clickable to expand/collapse (except for "All Views") */}
            {!isAllViews && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: mode === 'vr' ? '10px 14px' : '6px 10px',
                  background: isTrashed
                    ? 'rgba(239,68,68,0.1)'
                    : isUnplaced 
                      ? 'rgba(251,191,36,0.1)' 
                      : 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)',
                  borderRadius: 6,
                  marginBottom: 4,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onToggleGroup?.(groupKey)}
              >
                <span style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  <Icons.chevronRight size={mode === 'vr' ? 16 : 12} />
                </span>
                {isTrashed ? <Icons.trash size={mode === 'vr' ? 16 : 12} /> : <Icons.grid size={mode === 'vr' ? 16 : 12} />}
                <span style={{
                  fontSize: mode === 'vr' ? 14 : 11,
                  fontWeight: 600,
                  color: isTrashed ? '#ef4444' : isUnplaced ? '#fbbf24' : '#818cf8',
                }}>
                  {groupKey}
                </span>
                {activeCount > 0 && !isTrashed && (
                  <span style={{
                    padding: '2px 6px',
                    background: 'rgba(74,222,128,0.15)',
                    borderRadius: 4,
                    fontSize: mode === 'vr' ? 11 : 9,
                    color: '#4ade80',
                    fontWeight: 600,
                  }}>
                    {activeCount} active
                  </span>
                )}
                <span style={{
                  fontSize: mode === 'vr' ? 11 : 9,
                  color: 'rgba(255,255,255,0.4)',
                  marginLeft: 'auto',
                }}>
                  {views.length} view{views.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Views in this group */}
            {isExpanded && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                paddingLeft: isAllViews ? 0 : 8,
              }}>
                {views.map((view, localIndex) => {
                  const globalIndex = flatIndex++;
                  return (
                    <AdaptiveViewItem
                      key={view.id}
                      view={view}
                      index={globalIndex}
                      totalItems={allViews.length}
                      showDatasetBadge
                      onFocus={() => console.log('Focus view:', view.id)}
                      onClose={() => console.log('Close view:', view.id)}
                      onPlace={() => console.log('Place view:', view.id)}
                      onTrash={() => console.log('Trash view:', view.id)}
                      onRestore={() => console.log('Restore view:', view.id)}
                      onDeletePermanently={() => console.log('Delete permanently:', view.id)}
                      isDragging={draggingIndex}
                      dragOverIndex={dragOverIndex}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// DEMO APP
// =============================================================================

export default function App() {
  const [mode, setMode] = useState('desktop');
  const [density, setDensity] = useState('comfortable');
  const [viewMode, setViewMode] = useState('datasets'); // 'datasets', 'byRow', 'byColumn', 'allViews'
  const [expandedDatasets, setExpandedDatasets] = useState(new Set(['ds-1']));
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Row 0', 'Row 1', 'Column 0', 'Column 1', 'Not on Canvas']));

  // Mock data with state for reordering
  const mockDatasets = [
    {
      id: 'ds-1',
      name: 'brain_mri_scan.nii',
      handlerType: 'VTK',
      size: '256 MB',
      loadedAt: '2 min ago',
      color: '#c084fc',
    },
    {
      id: 'ds-2',
      name: 'heart_model.vtp',
      handlerType: 'VTK',
      size: '45 MB',
      loadedAt: '15 min ago',
      color: '#f472b6',
    },
  ];

  const [mockViews, setMockViews] = useState({
    'ds-1': [
      { id: 'v-1', name: 'Axial Slice', color: '#60a5fa', status: 'active', position: { row: 0, col: 0 }, handlerType: 'VTK', datasetName: 'brain_mri_scan.nii' },
      { id: 'v-2', name: 'Sagittal View', color: '#4ade80', status: 'active', position: { row: 0, col: 1 }, handlerType: 'VTK', datasetName: 'brain_mri_scan.nii' },
      { id: 'v-3', name: '3D Volume Render', color: '#f472b6', status: 'active', position: { row: 1, col: 0 }, handlerType: 'VTK', datasetName: 'brain_mri_scan.nii' },
      { id: 'v-5', name: 'Coronal Section', color: '#fbbf24', status: 'inactive', position: null, handlerType: 'VTK', datasetName: 'brain_mri_scan.nii' },
      { id: 'v-6', name: 'Old Render (deleted)', color: '#6b7280', status: 'trashed', position: null, handlerType: 'VTK', datasetName: 'brain_mri_scan.nii' },
    ],
    'ds-2': [
      { id: 'v-4', name: 'Surface Render', color: '#fb923c', status: 'active', position: { row: 1, col: 1 }, handlerType: 'VTK', datasetName: 'heart_model.vtp' },
    ],
  });

  // Flatten all views
  const allViews = useMemo(() => {
    return Object.values(mockViews).flat();
  }, [mockViews]);

  const handleReorderViews = (datasetId, fromIndex, toIndex) => {
    setMockViews(prev => {
      const views = [...prev[datasetId]];
      const [moved] = views.splice(fromIndex, 1);
      const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
      views.splice(adjustedTo, 0, moved);
      return { ...prev, [datasetId]: views };
    });
  };

  const handleReorderAllViews = (fromIndex, toIndex) => {
    console.log('Reorder all views:', fromIndex, 'â†’', toIndex);
  };

  const toggleDataset = (id) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const containerStyles = {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    padding: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const controlsStyles = {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    padding: 16,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const buttonGroupStyles = {
    display: 'flex',
    gap: 4,
    background: 'rgba(0,0,0,0.2)',
    padding: 4,
    borderRadius: 8,
  };

  const buttonStyles = (isActive) => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    background: isActive ? '#6366f1' : 'transparent',
    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
    transition: 'all 0.15s ease',
  });

  const labelStyles = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const panelStyles = {
    maxWidth: mode === 'vr' ? 600 : 340,
    margin: '0 auto',
    transition: 'max-width 0.3s ease',
  };

  const headerStyles = {
    fontSize: mode === 'vr' ? 18 : 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: mode === 'vr' ? 16 : 12,
    padding: mode === 'vr' ? '12px 16px' : '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <AdaptiveContext.Provider value={{ mode, density, setMode, setDensity }}>
      <div style={containerStyles}>
        {/* Controls */}
        <div style={controlsStyles}>
          <div>
            <div style={labelStyles}>Mode</div>
            <div style={buttonGroupStyles}>
              <button style={buttonStyles(mode === 'desktop')} onClick={() => setMode('desktop')}>
                ðŸ–¥ï¸ Desktop
              </button>
              <button style={buttonStyles(mode === 'vr')} onClick={() => setMode('vr')}>
                ðŸ¥½ VR
              </button>
            </div>
          </div>

          <div>
            <div style={labelStyles}>Density</div>
            <div style={buttonGroupStyles}>
              <button style={buttonStyles(density === 'comfortable')} onClick={() => setDensity('comfortable')}>
                Comfortable
              </button>
              <button style={buttonStyles(density === 'compact')} onClick={() => setDensity('compact')}>
                Compact
              </button>
            </div>
          </div>

          <div>
            <div style={labelStyles}>Group Views By</div>
            <div style={{ ...buttonGroupStyles, flexWrap: 'wrap', gap: 4 }}>
              <button style={buttonStyles(viewMode === 'datasets')} onClick={() => setViewMode('datasets')}>
                ðŸ“ Dataset
              </button>
              <button style={buttonStyles(viewMode === 'byRow')} onClick={() => setViewMode('byRow')}>
                â¬Œ Row
              </button>
              <button style={buttonStyles(viewMode === 'byColumn')} onClick={() => setViewMode('byColumn')}>
                â¬ Column
              </button>
              <button style={buttonStyles(viewMode === 'allViews')} onClick={() => setViewMode('allViews')}>
                â˜° None
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ 
            padding: '8px 16px', 
            background: mode === 'vr' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', 
            borderRadius: 8,
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
          }}>
            {viewMode === 'datasets' && (
              <>
                <strong style={{ color: '#c084fc' }}>By Dataset:</strong> Views grouped under parent dataset. 
                Drag to reorder within dataset.
              </>
            )}
            {viewMode === 'byRow' && (
              <>
                <strong style={{ color: '#60a5fa' }}>By Row:</strong> Views grouped by canvas row (Row 0, Row 1...). 
                Drag to reorder across all views.
              </>
            )}
            {viewMode === 'byColumn' && (
              <>
                <strong style={{ color: '#4ade80' }}>By Column:</strong> Views grouped by canvas column (Col 0, Col 1...). 
                Drag to reorder across all views.
              </>
            )}
            {viewMode === 'allViews' && (
              <>
                <strong style={{ color: '#f472b6' }}>All Views:</strong> Flat list, no grouping. 
                Drag to reorder across all views.
              </>
            )}
          </div>
        </div>

        {/* Panel Preview */}
        <div style={panelStyles}>
          <div style={headerStyles}>
            <Icons.database size={mode === 'vr' ? 20 : 14} />
            {viewMode === 'datasets' && 'Loaded Datasets'}
            {viewMode === 'byRow' && 'Views by Row'}
            {viewMode === 'byColumn' && 'Views by Column'}
            {viewMode === 'allViews' && 'All Views'}
          </div>

          {viewMode === 'datasets' ? (
            // Dataset view - hierarchical
            mockDatasets.map(dataset => (
              <AdaptiveDatasetParent
                key={dataset.id}
                dataset={dataset}
                views={mockViews[dataset.id] || []}
                isExpanded={expandedDatasets.has(dataset.id)}
                onToggle={() => toggleDataset(dataset.id)}
                onReorderViews={handleReorderViews}
              />
            ))
          ) : (
            // Grouped or flat views
            <GroupedViewsSection 
              allViews={allViews}
              groupBy={viewMode === 'byRow' ? 'row' : viewMode === 'byColumn' ? 'column' : 'none'}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
              onReorderViews={handleReorderAllViews}
            />
          )}
        </div>

        {/* Design Notes */}
        <div style={{ 
          maxWidth: 800, 
          margin: '32px auto 0', 
          padding: 20, 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: 12,
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6,
        }}>
          <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 12 }}>ðŸŽ¯ VR-Friendly Design Principles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <strong style={{ color: '#4ade80' }}>Touch Targets</strong>
              <p style={{ margin: '4px 0 0' }}>Min 48px in VR (vs 24px desktop). Larger buttons, more padding.</p>
            </div>
            <div>
              <strong style={{ color: '#60a5fa' }}>Typography</strong>
              <p style={{ margin: '4px 0 0' }}>16px+ base font in VR. Bold weights for readability at distance.</p>
            </div>
            <div>
              <strong style={{ color: '#f472b6' }}>Actions</strong>
              <p style={{ margin: '4px 0 0' }}>Always visible in VR (no hover states). Clear iconography.</p>
            </div>
            <div>
              <strong style={{ color: '#fbbf24' }}>Contrast</strong>
              <p style={{ margin: '4px 0 0' }}>Higher contrast, glowing active states, distinct color coding.</p>
            </div>
          </div>
          
          <h4 style={{ color: '#fff', marginTop: 20, marginBottom: 10 }}>ðŸ“ View Grouping Modes</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
            <div>
              <strong style={{ color: '#c084fc' }}>By Dataset</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li>Views under parent dataset</li>
                <li>Reorder within dataset only</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#60a5fa' }}>By Row</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li>Row 0, Row 1, Row 2...</li>
                <li>Reorder across all views</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#4ade80' }}>By Column</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li>Column 0, Column 1...</li>
                <li>Reorder across all views</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#f472b6' }}>None (All Views)</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li>Flat list, no grouping</li>
                <li>Reorder across all views</li>
              </ul>
            </div>
          </div>

          <h4 style={{ color: '#fff', marginTop: 20, marginBottom: 10 }}>ðŸš¦ View States & Actions</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 12 }}>
            <div>
              <strong style={{ color: '#4ade80' }}>Active (On Canvas)</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li><strong>Focus</strong> - Navigate to view</li>
                <li><strong>Show/Hide</strong> - Toggle visibility</li>
                <li><strong>Close</strong> - Remove from canvas</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#fbbf24' }}>Inactive (Not on Canvas)</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li><strong>Place</strong> - Add to canvas</li>
                <li><strong>Trash</strong> - Move to trash</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#ef4444' }}>Trashed</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li><strong>Restore</strong> - Recover view</li>
                <li><strong>Delete</strong> - Permanent removal</li>
              </ul>
            </div>
          </div>

          <h4 style={{ color: '#fff', marginTop: 20, marginBottom: 10 }}>ðŸ“‹ ViewItem Interaction Design</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
            <div>
              <strong style={{ color: '#c084fc' }}>Desktop Mode</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li><strong>Default:</strong> Full title + status/position on right</li>
                <li><strong>Hover:</strong> Actions slide in, status fades out</li>
                <li><strong>Click row:</strong> Expand toolbar below</li>
                <li>Maximizes title space when not interacting</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#818cf8' }}>VR Mode</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                <li><strong>Horizontal action bar</strong> below content</li>
                <li>48px touch targets with labels</li>
                <li>"More" button expands additional tools</li>
                <li>No hover states - everything visible</li>
              </ul>
            </div>
          </div>
          
          <h4 style={{ color: '#fff', marginTop: 20, marginBottom: 10 }}>ðŸ”§ Available Tools</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
            {[
              { name: 'Focus', color: '#60a5fa', desc: 'Navigate to view', state: 'active' },
              { name: 'Show/Hide', color: '#4ade80', desc: 'Toggle visibility', state: 'active' },
              { name: 'Close', color: '#ef4444', desc: 'Remove from canvas', state: 'active' },
              { name: 'Place', color: '#60a5fa', desc: 'Add to canvas', state: 'inactive' },
              { name: 'Trash', color: '#ef4444', desc: 'Move to trash', state: 'inactive' },
              { name: 'Restore', color: '#4ade80', desc: 'Recover view', state: 'trashed' },
              { name: 'Delete', color: '#ef4444', desc: 'Permanent removal', state: 'trashed' },
              { name: 'Link', color: '#a78bfa', desc: 'Link camera/filters', state: 'all' },
              { name: 'Duplicate', color: '#f472b6', desc: 'Clone view config', state: 'all' },
              { name: 'Snapshot', color: '#fbbf24', desc: 'Capture state', state: 'all' },
              { name: 'Settings', color: '#6b7280', desc: 'View properties', state: 'all' },
            ].map(tool => (
              <div key={tool.name} style={{ 
                padding: '4px 10px', 
                background: `${tool.color}20`, 
                borderRadius: 4,
                borderLeft: `3px solid ${tool.color}`,
              }}>
                <span style={{ color: tool.color, fontWeight: 600 }}>{tool.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 6 }}>{tool.desc}</span>
                <span style={{ 
                  marginLeft: 6, 
                  fontSize: 9, 
                  padding: '1px 4px', 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 3,
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {tool.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdaptiveContext.Provider>
  );
}
