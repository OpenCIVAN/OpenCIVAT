/**
 * ViewCard Component System
 * 
 * Unified component for displaying view references throughout CIA Web.
 * Supports multiple variants for different contexts while maintaining
 * consistent visual language and interaction patterns.
 * 
 * Variants:
 * - full: Canvas viewport with 3D content area
 * - compact: Left panel list item with expandable details
 * - mini: Topology diagrams in link panels
 * - chip: Inline references in flowing text
 * - dot: Minimal colored indicator with tooltip
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useMemo, forwardRef } from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  bgCanvas: '#030303',
  bgPrimary: '#060a12',
  bgSecondary: '#0c1220',
  bgTertiary: '#121a2e',
  bgElevated: '#18223c',
  bgHover: 'rgba(255, 255, 255, 0.06)',
  bgActive: 'rgba(255, 255, 255, 0.08)',
  
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
  borderStrong: 'rgba(255, 255, 255, 0.25)',
  
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textTertiary: 'rgba(255, 255, 255, 0.55)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentTeal: '#2dd4bf',
  accentPurple: '#a78bfa',
  accentPink: '#f472b6',
  accentRed: '#f87171',
  accentCyan: '#22d3ee',
  accentOrange: '#fb923c',
  
  radiusSm: 4,
  radiusMd: 6,
  radiusLg: 8,
  radiusXl: 12,
  
  transitionFast: '0.1s ease',
  transitionBase: '0.15s ease',
  transitionSlow: '0.25s ease',
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '96, 165, 250';
};

// =============================================================================
// LINK MODE CONFIGURATION
// =============================================================================

const LINK_MODES = {
  follow: { icon: '←', label: 'Following', color: tokens.accentCyan },
  sync: { icon: '↔', label: 'Synced', color: tokens.accentTeal },
  broadcast: { icon: '→', label: 'Broadcasting', color: tokens.accentPurple },
};

// =============================================================================
// ICON COMPONENT
// =============================================================================

const Icon = ({ name, size = 16, style = {} }) => {
  const paths = {
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    moreVertical: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    focus: <><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></>,
    maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></>,
    minimize: <><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    starFilled: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    grip: <><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></>,
    move: <><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    unlock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    externalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
  };
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={style}
    >
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// =============================================================================
// TOOLTIP COMPONENT
// =============================================================================

const Tooltip = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  
  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top - 8 : rect.bottom + 8,
      });
    }
    setShow(true);
  };
  
  return (
    <div 
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {show && (
        <div style={{
          position: 'fixed',
          left: coords.x,
          top: coords.y,
          transform: `translate(-50%, ${position === 'top' ? '-100%' : '0'})`,
          padding: '6px 10px',
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusSm,
          fontSize: 10,
          color: tokens.textSecondary,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {content}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BADGE COMPONENTS
// =============================================================================

const Badge = ({ children, color, size = 'default', glow = false }) => {
  const sizes = {
    small: { padding: '1px 4px', fontSize: 8, minWidth: 12, height: 12 },
    default: { padding: '2px 6px', fontSize: 9, minWidth: 16, height: 16 },
    large: { padding: '3px 8px', fontSize: 10, minWidth: 20, height: 20 },
  };
  
  const sizeStyle = sizes[size] || sizes.default;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...sizeStyle,
      borderRadius: 999,
      background: `rgba(${hexToRgb(color)}, 0.15)`,
      color: color,
      fontWeight: 600,
      boxShadow: glow ? `0 0 8px ${color}40` : 'none',
    }}>
      {children}
    </span>
  );
};

const LinkBadge = ({ count, onClick, draggable, onDragStart }) => {
  if (!count || count === 0) return null;
  
  return (
    <Tooltip content={`${count} linked ${count === 1 ? 'property' : 'properties'}`}>
      <button
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 6px',
          background: `rgba(${hexToRgb(tokens.accentTeal)}, 0.15)`,
          border: `1px solid rgba(${hexToRgb(tokens.accentTeal)}, 0.3)`,
          borderRadius: tokens.radiusSm,
          color: tokens.accentTeal,
          fontSize: 10,
          fontWeight: 600,
          cursor: draggable ? 'grab' : 'pointer',
          transition: tokens.transitionBase,
        }}
      >
        <Icon name="link" size={10} />
        {count}
      </button>
    </Tooltip>
  );
};

const ViewerBadge = ({ count }) => {
  if (!count || count === 0) return null;
  
  return (
    <Tooltip content={`${count} ${count === 1 ? 'viewer' : 'viewers'}`}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        background: `rgba(${hexToRgb(tokens.accentBlue)}, 0.15)`,
        borderRadius: tokens.radiusSm,
        color: tokens.accentBlue,
        fontSize: 10,
        fontWeight: 500,
      }}>
        <Icon name="eye" size={10} />
        {count}
      </span>
    </Tooltip>
  );
};

const HubBadge = () => (
  <Tooltip content="Hub (source of truth)">
    <span style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '2px 6px',
      background: `rgba(${hexToRgb(tokens.accentAmber)}, 0.15)`,
      borderRadius: tokens.radiusSm,
      color: tokens.accentAmber,
      fontSize: 9,
      fontWeight: 600,
    }}>
      ★ Hub
    </span>
  </Tooltip>
);

const ModeBadge = ({ mode }) => {
  const config = LINK_MODES[mode];
  if (!config) return null;
  
  return (
    <Tooltip content={config.label}>
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        background: `rgba(${hexToRgb(config.color)}, 0.1)`,
        borderRadius: tokens.radiusSm,
        color: config.color,
        fontSize: 10,
        fontWeight: 500,
      }}>
        {config.icon}
      </span>
    </Tooltip>
  );
};

const StatusDot = ({ status = 'active' }) => {
  const colors = {
    active: tokens.accentGreen,
    idle: tokens.accentAmber,
    away: tokens.textMuted,
    syncing: tokens.accentCyan,
  };
  
  return (
    <span style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: colors[status] || colors.active,
      boxShadow: status === 'syncing' ? `0 0 6px ${colors.syncing}` : 'none',
      animation: status === 'syncing' ? 'pulse 1.5s infinite' : 'none',
    }} />
  );
};

// =============================================================================
// COLOR DOT COMPONENT
// =============================================================================

const ColorDot = ({ color, size = 8, glow = false, ring = false, ringColor }) => (
  <span style={{
    width: size,
    height: size,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    boxShadow: glow ? `0 0 8px ${color}` : 'none',
    border: ring ? `2px solid ${ringColor || tokens.accentAmber}` : 'none',
    boxSizing: 'border-box',
  }} />
);

// =============================================================================
// ICON BUTTON COMPONENT
// =============================================================================

const IconButton = ({ 
  icon, 
  title, 
  onClick, 
  active, 
  disabled, 
  size = 18,
  color,
  hoverColor,
  style = {} 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size + 8,
        height: size + 8,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active 
          ? `rgba(${hexToRgb(color || tokens.accentBlue)}, 0.15)` 
          : isHovered 
            ? tokens.bgHover 
            : 'transparent',
        border: `1px solid ${active ? (color || tokens.accentBlue) : 'transparent'}`,
        borderRadius: tokens.radiusSm,
        color: active 
          ? (color || tokens.accentBlue) 
          : isHovered 
            ? (hoverColor || tokens.textSecondary) 
            : tokens.textTertiary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: tokens.transitionBase,
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name={icon} size={size - 4} />
    </button>
  );
};

// =============================================================================
// VIEW CARD - DOT VARIANT
// =============================================================================

const ViewCardDot = forwardRef(({ 
  view, 
  isHub = false,
  onClick,
  size = 8,
}, ref) => (
  <Tooltip content={
    <div>
      <div style={{ fontWeight: 600 }}>{view.name}</div>
      {view.ownerName && <div style={{ opacity: 0.7 }}>{view.ownerName}</div>}
    </div>
  }>
    <button
      ref={ref}
      onClick={onClick}
      style={{
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-flex',
      }}
    >
      <ColorDot 
        color={view.color} 
        size={size} 
        ring={isHub}
        ringColor={tokens.accentAmber}
      />
    </button>
  </Tooltip>
));

ViewCardDot.displayName = 'ViewCardDot';

// =============================================================================
// VIEW CARD - CHIP VARIANT
// =============================================================================

const ViewCardChip = forwardRef(({ 
  view,
  isHub = false,
  mode,
  onClick,
  onRemove,
  interactive = true,
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <span
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        background: isHovered && interactive ? tokens.bgHover : tokens.bgTertiary,
        border: `1px solid ${tokens.borderSubtle}`,
        borderRadius: tokens.radiusSm,
        cursor: interactive ? 'pointer' : 'default',
        transition: tokens.transitionBase,
      }}
    >
      {isHub && <span style={{ color: tokens.accentAmber, fontSize: 10 }}>★</span>}
      <ColorDot color={view.color} size={6} />
      <span style={{
        fontSize: 10,
        color: tokens.textSecondary,
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {view.name}
      </span>
      {mode && <ModeBadge mode={mode} />}
      {onRemove && isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            display: 'flex',
            marginLeft: 2,
          }}
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </span>
  );
});

ViewCardChip.displayName = 'ViewCardChip';

// =============================================================================
// VIEW CARD - MINI VARIANT
// =============================================================================

const ViewCardMini = forwardRef(({
  view,
  isHub = false,
  isCurrentUser = false,
  mode,
  ownerName,
  onClick,
  onRemove,
  showMode = true,
  showOwner = true,
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: isCurrentUser 
          ? `rgba(${hexToRgb(view.color)}, 0.08)` 
          : isHovered 
            ? tokens.bgHover 
            : tokens.bgTertiary,
        border: `1px solid ${isHub ? tokens.accentAmber : tokens.borderSubtle}`,
        borderLeft: isHub ? `3px solid ${tokens.accentAmber}` : `1px solid ${tokens.borderSubtle}`,
        borderRadius: tokens.radiusSm,
        cursor: onClick ? 'pointer' : 'default',
        transition: tokens.transitionBase,
        minWidth: 120,
      }}
    >
      {isHub && <span style={{ color: tokens.accentAmber, fontSize: 10, marginRight: -2 }}>★</span>}
      <ColorDot color={view.color} size={8} />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 500,
          color: isCurrentUser ? view.color : tokens.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {view.name.split(' ').slice(0, 2).join(' ')}
          {isCurrentUser && <span style={{ fontWeight: 400, opacity: 0.7 }}> (you)</span>}
        </div>
        {showOwner && ownerName && (
          <div style={{ fontSize: 9, color: tokens.textMuted }}>
            {ownerName}
          </div>
        )}
      </div>
      
      {showMode && mode && <ModeBadge mode={mode} />}
      
      {onRemove && isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: 2,
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
});

ViewCardMini.displayName = 'ViewCardMini';

// =============================================================================
// VIEW CARD - COMPACT VARIANT
// =============================================================================

const ViewCardCompact = forwardRef(({
  view,
  isActive = false,
  isExpanded = false,
  isStarred = false,
  isShared = false,
  isOnCanvas = false,
  linkCount = 0,
  viewerCount = 0,
  isHub = false,
  mode,
  onClick,
  onDoubleClick,
  onToggleExpand,
  onStar,
  onShare,
  onDuplicate,
  onSettings,
  onTrash,
  onLinkClick,
  onSpawnToCanvas,
  draggable = true,
  onDragStart,
  onDragEnd,
  children, // For expanded content
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const colorRgb = hexToRgb(view.color);
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: isActive 
          ? `rgba(${colorRgb}, 0.08)` 
          : isHovered 
            ? tokens.bgHover 
            : tokens.bgTertiary,
        border: `1px solid ${isActive ? view.color : tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: tokens.transitionBase,
      }}
    >
      {/* Main Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
      }}>
        {/* Drag Handle */}
        {draggable && (
          <div style={{ 
            color: tokens.textMuted, 
            cursor: 'grab',
            opacity: isHovered ? 1 : 0,
            transition: tokens.transitionBase,
          }}>
            <Icon name="grip" size={12} />
          </div>
        )}
        
        {/* Color Dot */}
        <ColorDot color={view.color} size={10} glow={isActive} />
        
        {/* Name & Dataset */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: tokens.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {view.name}
            </span>
            {isHub && <HubBadge />}
          </div>
          <div style={{ 
            fontSize: 10, 
            color: tokens.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {view.datasetName}
            {view.ownerName && view.ownerName !== 'You' && (
              <>
                <span>•</span>
                <span>{view.ownerName}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <LinkBadge 
            count={linkCount} 
            onClick={(e) => { e.stopPropagation(); onLinkClick?.(); }}
            draggable
            onDragStart={onDragStart}
          />
          <ViewerBadge count={viewerCount} />
        </div>
        
        {/* Quick Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          opacity: isHovered ? 1 : 0,
          transition: tokens.transitionBase,
        }}>
          <IconButton 
            icon={isStarred ? 'starFilled' : 'star'} 
            title={isStarred ? 'Unstar' : 'Star'}
            size={14}
            color={isStarred ? tokens.accentAmber : undefined}
            onClick={(e) => { e.stopPropagation(); onStar?.(); }}
          />
          {!isOnCanvas && (
            <IconButton 
              icon="externalLink" 
              title="Spawn to Canvas"
              size={14}
              onClick={(e) => { e.stopPropagation(); onSpawnToCanvas?.(); }}
            />
          )}
          <IconButton 
            icon="moreVertical" 
            title="More"
            size={14}
            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          />
        </div>
        
        {/* Expand Chevron */}
        {onToggleExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            style={{
              padding: 4,
              background: 'transparent',
              border: 'none',
              color: tokens.textMuted,
              cursor: 'pointer',
              display: 'flex',
              transition: tokens.transitionBase,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <Icon name="chevronDown" size={14} />
          </button>
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '0 12px 12px',
          borderTop: `1px solid ${tokens.borderSubtle}`,
          marginTop: -4,
          paddingTop: 12,
        }}>
          {children || (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <IconButton icon="copy" title="Duplicate" size={16} onClick={onDuplicate} />
              <IconButton icon="share" title="Share" size={16} onClick={onShare} />
              <IconButton icon="settings" title="Settings" size={16} onClick={onSettings} />
              <div style={{ flex: 1 }} />
              <IconButton icon="trash" title="Delete" size={16} color={tokens.accentRed} onClick={onTrash} />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ViewCardCompact.displayName = 'ViewCardCompact';

// =============================================================================
// VIEW CARD - FULL VARIANT (Canvas Viewport)
// =============================================================================

const ViewCardFull = forwardRef(({
  view,
  isActive = false,
  isCompact = false, // For small viewport cells
  linkCount = 0,
  viewerCount = 0,
  isHub = false,
  syncStatus, // 'synced' | 'syncing' | null
  lastSyncInfo, // { userName, action, timeAgo }
  onClick,
  onDoubleClick,
  onClose,
  onFocus,
  onMore,
  onLinkClick,
  onLinkDragStart,
  children, // 3D content
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSyncPulse, setShowSyncPulse] = useState(false);
  const colorRgb = hexToRgb(view.color);
  
  // Simulate sync pulse when lastSyncInfo changes
  React.useEffect(() => {
    if (lastSyncInfo) {
      setShowSyncPulse(true);
      const timer = setTimeout(() => setShowSyncPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncInfo]);
  
  return (
    <div
      ref={ref}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: tokens.bgPrimary,
        border: `1px solid ${isActive ? view.color : tokens.borderDefault}`,
        borderRadius: tokens.radiusMd,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isActive ? `0 0 0 1px ${view.color}, 0 0 20px ${view.color}20` : 'none',
        transition: tokens.transitionBase,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCompact ? 4 : 8,
        padding: isCompact ? '4px 6px' : '6px 10px',
        background: isActive ? `rgba(${colorRgb}, 0.1)` : tokens.bgSecondary,
        borderBottom: `1px solid ${isActive ? view.color : tokens.borderSubtle}`,
      }}>
        {/* Color Dot */}
        <ColorDot color={view.color} size={isCompact ? 6 : 8} />
        
        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: isCompact ? 10 : 11,
          fontWeight: 500,
          color: tokens.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {view.name}
        </span>
        
        {/* Badges */}
        {!isCompact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LinkBadge 
              count={linkCount} 
              onClick={(e) => { e.stopPropagation(); onLinkClick?.(); }}
              draggable
              onDragStart={onLinkDragStart}
            />
            <ViewerBadge count={viewerCount} />
          </div>
        )}
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          opacity: isCompact ? (isHovered ? 1 : 0) : 1,
          transition: tokens.transitionBase,
        }}>
          {!isCompact && (
            <IconButton icon="more" title="More" size={14} onClick={(e) => { e.stopPropagation(); onMore?.(); }} />
          )}
          <IconButton icon="focus" title="Focus" size={14} onClick={(e) => { e.stopPropagation(); onFocus?.(); }} />
          <IconButton icon="x" title="Close" size={14} onClick={(e) => { e.stopPropagation(); onClose?.(); }} />
        </div>
      </div>
      
      {/* Sync Pulse Indicator */}
      {showSyncPulse && lastSyncInfo && (
        <div style={{
          position: 'absolute',
          top: isCompact ? 28 : 36,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 10px',
          background: `rgba(${hexToRgb(tokens.accentTeal)}, 0.9)`,
          borderRadius: tokens.radiusSm,
          fontSize: 9,
          color: '#fff',
          whiteSpace: 'nowrap',
          zIndex: 10,
          animation: 'fadeInOut 2s ease',
        }}>
          📷 {lastSyncInfo.userName} {lastSyncInfo.action}
        </div>
      )}
      
      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, rgba(${colorRgb}, 0.05) 0%, transparent 100%)`,
        position: 'relative',
      }}>
        {children || (
          <Icon name="grid" size={48} style={{ color: `rgba(${colorRgb}, 0.2)` }} />
        )}
        
        {/* Link/Hub indicator in corner */}
        {(isHub || linkCount > 0) && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {isHub && <HubBadge />}
          </div>
        )}
        
        {/* Sync status indicator */}
        {syncStatus && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            background: tokens.bgSecondary,
            borderRadius: tokens.radiusSm,
            fontSize: 9,
            color: syncStatus === 'synced' ? tokens.accentGreen : tokens.accentCyan,
          }}>
            <StatusDot status={syncStatus === 'synced' ? 'active' : 'syncing'} />
            {syncStatus === 'synced' ? 'Synced' : 'Syncing...'}
          </div>
        )}
      </div>
    </div>
  );
});

ViewCardFull.displayName = 'ViewCardFull';

// =============================================================================
// UNIFIED VIEW CARD COMPONENT
// =============================================================================

const ViewCard = forwardRef(({ variant = 'compact', ...props }, ref) => {
  switch (variant) {
    case 'dot':
      return <ViewCardDot ref={ref} {...props} />;
    case 'chip':
      return <ViewCardChip ref={ref} {...props} />;
    case 'mini':
      return <ViewCardMini ref={ref} {...props} />;
    case 'compact':
      return <ViewCardCompact ref={ref} {...props} />;
    case 'full':
      return <ViewCardFull ref={ref} {...props} />;
    default:
      return <ViewCardCompact ref={ref} {...props} />;
  }
});

ViewCard.displayName = 'ViewCard';

// =============================================================================
// DEMO APPLICATION
// =============================================================================

export default function ViewCardDemo() {
  const [activeViewId, setActiveViewId] = useState('v1');
  const [expandedViewId, setExpandedViewId] = useState(null);
  const [starredViews, setStarredViews] = useState(['v1']);
  
  const sampleViews = [
    { 
      id: 'v1', 
      name: 'View of Skull.vtp', 
      datasetName: 'Skull.vtp', 
      color: tokens.accentTeal,
      ownerName: 'You',
    },
    { 
      id: 'v2', 
      name: 'View of Bones.vtp', 
      datasetName: 'Bones.vtp', 
      color: tokens.accentGreen,
      ownerName: 'Dr. Smith',
    },
    { 
      id: 'v3', 
      name: 'Vessels Analysis', 
      datasetName: 'dsa_vessels_extracted_perf.vtp', 
      color: tokens.accentPurple,
      ownerName: 'Dr. Jones',
    },
    { 
      id: 'v4', 
      name: 'Heart Model', 
      datasetName: 'Heart.vtp', 
      color: tokens.accentPink,
      ownerName: 'Dr. Martinez',
    },
  ];
  
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.bgCanvas,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: 40,
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
      
      <h1 style={{ color: tokens.textPrimary, fontSize: 24, marginBottom: 8 }}>
        ViewCard Component System
      </h1>
      <p style={{ color: tokens.textMuted, fontSize: 13, marginBottom: 40 }}>
        Unified component for displaying views throughout CIA Web
      </p>
      
      {/* DOT VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Dot Variant
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          Minimal indicator for connection diagrams. Hover for tooltip.
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 20,
          background: tokens.bgTertiary,
          borderRadius: tokens.radiusMd,
        }}>
          {sampleViews.map((view, i) => (
            <React.Fragment key={view.id}>
              {i > 0 && <span style={{ color: tokens.textMuted }}>─</span>}
              <ViewCard variant="dot" view={view} isHub={i === 0} />
            </React.Fragment>
          ))}
        </div>
      </section>
      
      {/* CHIP VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Chip Variant
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          Inline references for flowing text or tight spaces.
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: 20,
          background: tokens.bgTertiary,
          borderRadius: tokens.radiusMd,
        }}>
          <ViewCard variant="chip" view={sampleViews[0]} isHub />
          <ViewCard variant="chip" view={sampleViews[1]} mode="sync" />
          <ViewCard variant="chip" view={sampleViews[2]} mode="follow" onRemove={() => {}} />
          <ViewCard variant="chip" view={sampleViews[3]} mode="broadcast" />
        </div>
      </section>
      
      {/* MINI VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Mini Variant
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          For topology diagrams in link panels. Shows name, owner, mode.
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 20,
          background: tokens.bgTertiary,
          borderRadius: tokens.radiusMd,
          maxWidth: 280,
        }}>
          <ViewCard variant="mini" view={sampleViews[0]} isHub isCurrentUser ownerName="You" mode="sync" />
          <ViewCard variant="mini" view={sampleViews[1]} ownerName="Dr. Smith" mode="sync" onRemove={() => {}} />
          <ViewCard variant="mini" view={sampleViews[2]} ownerName="Dr. Jones" mode="follow" onRemove={() => {}} />
        </div>
      </section>
      
      {/* COMPACT VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Compact Variant
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          Left panel list item with badges, quick actions, and expandable details.
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 20,
          background: tokens.bgSecondary,
          borderRadius: tokens.radiusMd,
          maxWidth: 340,
        }}>
          {sampleViews.map((view) => (
            <ViewCard
              key={view.id}
              variant="compact"
              view={view}
              isActive={activeViewId === view.id}
              isExpanded={expandedViewId === view.id}
              isStarred={starredViews.includes(view.id)}
              linkCount={view.id === 'v1' ? 3 : view.id === 'v2' ? 2 : 0}
              viewerCount={view.id === 'v1' ? 2 : 0}
              isHub={view.id === 'v1'}
              isOnCanvas={view.id === 'v1' || view.id === 'v2'}
              onClick={() => setActiveViewId(view.id)}
              onToggleExpand={() => setExpandedViewId(expandedViewId === view.id ? null : view.id)}
              onStar={() => {
                setStarredViews(prev => 
                  prev.includes(view.id) 
                    ? prev.filter(id => id !== view.id)
                    : [...prev, view.id]
                );
              }}
              onLinkClick={() => console.log('Link clicked:', view.id)}
            />
          ))}
        </div>
      </section>
      
      {/* FULL VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Full Variant (Canvas Viewport)
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          Complete viewport with header, badges, sync status, and content area.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          padding: 20,
          background: tokens.bgCanvas,
          borderRadius: tokens.radiusMd,
        }}>
          {sampleViews.slice(0, 4).map((view, i) => (
            <div key={view.id} style={{ height: 200 }}>
              <ViewCard
                variant="full"
                view={view}
                isActive={activeViewId === view.id}
                isCompact={false}
                linkCount={i === 0 ? 3 : i === 1 ? 2 : 0}
                viewerCount={i === 0 ? 2 : 0}
                isHub={i === 0}
                syncStatus={i === 0 ? 'synced' : i === 1 ? 'syncing' : null}
                lastSyncInfo={i === 1 ? { userName: 'Dr. Smith', action: 'rotated' } : null}
                onClick={() => setActiveViewId(view.id)}
                onClose={() => console.log('Close:', view.id)}
                onFocus={() => console.log('Focus:', view.id)}
                onMore={() => console.log('More:', view.id)}
                onLinkClick={() => console.log('Link clicked:', view.id)}
              />
            </div>
          ))}
        </div>
      </section>
      
      {/* COMPACT FULL VARIANT */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Full Variant - Compact Mode
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          For small viewport cells with reduced header and hidden elements.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          padding: 20,
          background: tokens.bgCanvas,
          borderRadius: tokens.radiusMd,
        }}>
          {sampleViews.map((view) => (
            <div key={view.id} style={{ height: 120 }}>
              <ViewCard
                variant="full"
                view={view}
                isActive={activeViewId === view.id}
                isCompact={true}
                onClick={() => setActiveViewId(view.id)}
                onClose={() => console.log('Close:', view.id)}
                onFocus={() => console.log('Focus:', view.id)}
              />
            </div>
          ))}
        </div>
      </section>
      
      {/* BADGES SHOWCASE */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Badge Components
        </h2>
        <p style={{ color: tokens.textMuted, fontSize: 11, marginBottom: 16 }}>
          Individual badge components used across all variants.
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          padding: 20,
          background: tokens.bgTertiary,
          borderRadius: tokens.radiusMd,
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <LinkBadge count={3} />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Link Badge</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <ViewerBadge count={5} />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Viewer Badge</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <HubBadge />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Hub Badge</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <ModeBadge mode="follow" />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Follow</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <ModeBadge mode="sync" />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Sync</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <ModeBadge mode="broadcast" />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Broadcast</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <Badge color={tokens.accentGreen} size="small">New</Badge>
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Generic Badge</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusDot status="active" />
              <StatusDot status="idle" />
              <StatusDot status="away" />
              <StatusDot status="syncing" />
            </div>
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Status Dots</span>
          </div>
        </div>
      </section>
      
      {/* Usage Guide */}
      <section style={{
        padding: 20,
        background: tokens.bgTertiary,
        borderRadius: tokens.radiusMd,
        border: `1px solid ${tokens.borderSubtle}`,
      }}>
        <h2 style={{ color: tokens.textSecondary, fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Usage Guide
        </h2>
        <div style={{ fontSize: 11, color: tokens.textMuted, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: tokens.textSecondary }}>Import:</strong>
            <code style={{ 
              display: 'block',
              padding: '8px 12px',
              marginTop: 4,
              background: tokens.bgCanvas,
              borderRadius: tokens.radiusSm,
              fontFamily: 'monospace',
            }}>
              {`import { ViewCard } from '@UI/react/components/molecules/ViewCard';`}
            </code>
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: tokens.textSecondary }}>Basic Usage:</strong>
            <code style={{ 
              display: 'block',
              padding: '8px 12px',
              marginTop: 4,
              background: tokens.bgCanvas,
              borderRadius: tokens.radiusSm,
              fontFamily: 'monospace',
              whiteSpace: 'pre',
            }}>
{`<ViewCard
  variant="compact"  // 'dot' | 'chip' | 'mini' | 'compact' | 'full'
  view={{ id, name, color, datasetName, ownerName }}
  isActive={true}
  linkCount={3}
  viewerCount={2}
  isHub={true}
  mode="sync"  // 'follow' | 'sync' | 'broadcast'
  onClick={() => {}}
  onLinkClick={() => {}}
/>`}
            </code>
          </p>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ViewCard,
  ViewCardDot,
  ViewCardChip,
  ViewCardMini,
  ViewCardCompact,
  ViewCardFull,
  // Badges
  Badge,
  LinkBadge,
  ViewerBadge,
  HubBadge,
  ModeBadge,
  StatusDot,
  ColorDot,
  // Utilities
  Icon,
  IconButton,
  Tooltip,
  // Constants
  LINK_MODES,
  tokens,
  hexToRgb,
};
