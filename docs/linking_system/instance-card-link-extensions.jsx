/**
 * InstanceCard Extension - Link Features
 * 
 * This file extends the existing InstanceCard component with link-related
 * features rather than creating a separate ViewCard component.
 * 
 * APPROACH: Composition over replacement
 * - New badge atoms added to atoms/Badge/
 * - InstanceCard extended with new props
 * - New variants added for specific contexts
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, { useState, memo, forwardRef, useCallback, useEffect } from 'react';

// =============================================================================
// DESIGN TOKENS (from existing theme)
// =============================================================================

const tokens = {
  // These should come from @use "theme" as * in SCSS
  // Shown here for reference
  colorAccentTeal: '#2dd4bf',
  colorAccentAmber: '#fbbf24',
  colorAccentBlue: '#60a5fa',
  colorAccentPurple: '#a78bfa',
  colorAccentPink: '#f472b6',
  colorAccentCyan: '#22d3ee',
  colorAccentGreen: '#4ade80',
  colorAccentRed: '#f87171',
  
  colorTextPrimary: 'rgba(255, 255, 255, 0.95)',
  colorTextSecondary: 'rgba(255, 255, 255, 0.75)',
  colorTextMuted: 'rgba(255, 255, 255, 0.35)',
  
  colorGlassPanel: 'rgba(12, 18, 32, 0.85)',
  colorBorderDefault: 'rgba(255, 255, 255, 0.1)',
  
  radiusSm: '4px',
  radiusMd: '6px',
  
  transitionFast: '0.15s ease',
};

// =============================================================================
// PART 1: NEW BADGE ATOMS
// Location: src/ui/react/components/atoms/Badge/
// =============================================================================

/**
 * LinkBadge - Shows linked property count, draggable for quick-link
 * 
 * Usage:
 * <LinkBadge count={3} onClick={openLinkPanel} onDragStart={startQuickLink} />
 */
export const LinkBadge = memo(forwardRef(function LinkBadge({
  count,
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
  size = 'default', // 'small' | 'default' | 'large'
  showLabel = false,
  className = '',
}, ref) {
  if (!count || count === 0) return null;
  
  const sizes = {
    small: { padding: '1px 4px', fontSize: '8px', iconSize: 8, gap: '2px' },
    default: { padding: '2px 6px', fontSize: '10px', iconSize: 10, gap: '3px' },
    large: { padding: '3px 8px', fontSize: '11px', iconSize: 12, gap: '4px' },
  };
  
  const s = sizes[size] || sizes.default;
  
  return (
    <button
      ref={ref}
      className={`link-badge link-badge--${size} ${className}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${count} linked ${count === 1 ? 'property' : 'properties'} – drag to link`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        background: 'rgba(45, 212, 191, 0.15)',
        border: '1px solid rgba(45, 212, 191, 0.3)',
        borderRadius: tokens.radiusSm,
        color: tokens.colorAccentTeal,
        cursor: draggable ? 'grab' : 'pointer',
        transition: tokens.transitionFast,
      }}
    >
      <svg width={s.iconSize} height={s.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      {count}
      {showLabel && <span style={{ fontWeight: 400, opacity: 0.8 }}>linked</span>}
    </button>
  );
}));

/**
 * ViewerBadge - Shows current viewer count
 * 
 * Usage:
 * <ViewerBadge count={2} />
 */
export const ViewerBadge = memo(function ViewerBadge({
  count,
  size = 'default',
  className = '',
}) {
  if (!count || count === 0) return null;
  
  const sizes = {
    small: { padding: '1px 4px', fontSize: '8px', iconSize: 8, gap: '2px' },
    default: { padding: '2px 6px', fontSize: '10px', iconSize: 10, gap: '3px' },
    large: { padding: '3px 8px', fontSize: '11px', iconSize: 12, gap: '4px' },
  };
  
  const s = sizes[size] || sizes.default;
  
  return (
    <span
      className={`viewer-badge viewer-badge--${size} ${className}`}
      title={`${count} ${count === 1 ? 'viewer' : 'viewers'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        background: 'rgba(96, 165, 250, 0.15)',
        borderRadius: tokens.radiusSm,
        color: tokens.colorAccentBlue,
      }}
    >
      <svg width={s.iconSize} height={s.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      {count}
    </span>
  );
});

/**
 * HubBadge - Indicates this view is the hub (source of truth)
 * 
 * Usage:
 * <HubBadge />
 * {isHub && <HubBadge />}
 */
export const HubBadge = memo(function HubBadge({
  size = 'default',
  showLabel = true,
  className = '',
}) {
  const sizes = {
    small: { padding: '1px 4px', fontSize: '8px', starSize: '8px' },
    default: { padding: '2px 6px', fontSize: '9px', starSize: '10px' },
    large: { padding: '3px 8px', fontSize: '10px', starSize: '12px' },
  };
  
  const s = sizes[size] || sizes.default;
  
  return (
    <span
      className={`hub-badge hub-badge--${size} ${className}`}
      title="Hub – source of truth for this link group"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        background: 'rgba(251, 191, 36, 0.15)',
        borderRadius: tokens.radiusSm,
        color: tokens.colorAccentAmber,
      }}
    >
      <span style={{ fontSize: s.starSize }}>★</span>
      {showLabel && 'Hub'}
    </span>
  );
});

/**
 * ModeBadge - Shows link mode (Follow/Sync/Broadcast)
 * 
 * Usage:
 * <ModeBadge mode="sync" />
 * <ModeBadge mode="follow" showLabel />
 */
export const ModeBadge = memo(function ModeBadge({
  mode, // 'follow' | 'sync' | 'broadcast' | 'bidirectional'
  size = 'default',
  showLabel = false,
  className = '',
}) {
  const modeConfig = {
    follow: { icon: '←', label: 'Following', color: tokens.colorAccentCyan },
    sync: { icon: '↔', label: 'Synced', color: tokens.colorAccentTeal },
    bidirectional: { icon: '↔', label: 'Synced', color: tokens.colorAccentTeal },
    broadcast: { icon: '→', label: 'Broadcasting', color: tokens.colorAccentPurple },
  };
  
  const config = modeConfig[mode];
  if (!config) return null;
  
  const sizes = {
    small: { padding: '1px 4px', fontSize: '9px' },
    default: { padding: '2px 6px', fontSize: '10px' },
    large: { padding: '3px 8px', fontSize: '11px' },
  };
  
  const s = sizes[size] || sizes.default;
  
  return (
    <span
      className={`mode-badge mode-badge--${mode} mode-badge--${size} ${className}`}
      title={config.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        background: `${config.color}20`,
        borderRadius: tokens.radiusSm,
        color: config.color,
      }}
    >
      {config.icon}
      {showLabel && config.label}
    </span>
  );
});

/**
 * SyncStatusIndicator - Shows sync status with optional pulse
 * 
 * Usage:
 * <SyncStatusIndicator status="synced" />
 * <SyncStatusIndicator status="syncing" />
 */
export const SyncStatusIndicator = memo(function SyncStatusIndicator({
  status, // 'synced' | 'syncing' | 'error' | 'paused'
  size = 'default',
  showLabel = true,
  className = '',
}) {
  const statusConfig = {
    synced: { color: tokens.colorAccentGreen, label: 'Synced', pulse: false },
    syncing: { color: tokens.colorAccentCyan, label: 'Syncing...', pulse: true },
    error: { color: tokens.colorAccentRed, label: 'Sync error', pulse: false },
    paused: { color: tokens.colorAccentAmber, label: 'Paused', pulse: false },
  };
  
  const config = statusConfig[status];
  if (!config) return null;
  
  const dotSize = size === 'small' ? 4 : size === 'large' ? 8 : 6;
  
  return (
    <span
      className={`sync-status sync-status--${status} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: size === 'small' ? '9px' : size === 'large' ? '11px' : '10px',
        color: config.color,
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: config.color,
          boxShadow: config.pulse ? `0 0 6px ${config.color}` : 'none',
          animation: config.pulse ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      {showLabel && config.label}
    </span>
  );
});

// =============================================================================
// PART 2: SYNC PULSE TOAST (appears briefly when view updates from link)
// =============================================================================

/**
 * SyncPulseToast - Brief notification showing who caused an update
 * 
 * Appears for ~2 seconds when a linked view receives an update from
 * another user's interaction.
 * 
 * Usage:
 * <SyncPulseToast 
 *   show={showPulse} 
 *   userName="Dr. Smith" 
 *   action="rotated" 
 *   property="camera"
 * />
 */
export const SyncPulseToast = memo(function SyncPulseToast({
  show,
  userName,
  action = 'updated',
  property,
  onComplete,
}) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  
  if (!show) return null;
  
  const propertyIcons = {
    camera: '📷',
    filters: '🎚',
    colorMaps: '🎨',
    widgets: '📐',
    cursors: '👁',
    annotationDisplay: '📝',
  };
  
  return (
    <div
      className="sync-pulse-toast"
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '4px',
        padding: '4px 10px',
        background: 'rgba(45, 212, 191, 0.95)',
        borderRadius: tokens.radiusSm,
        fontSize: '9px',
        fontWeight: 500,
        color: '#000',
        whiteSpace: 'nowrap',
        zIndex: 10,
        animation: 'fadeInOut 2s ease forwards',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {property && propertyIcons[property]} {userName} {action}
    </div>
  );
});

// =============================================================================
// PART 3: EXTENDED INSTANCE CARD PROPS INTERFACE
// =============================================================================

/**
 * Extended InstanceCard Props
 * 
 * These props should be added to the existing InstanceCard component.
 * The implementation merges with existing props.
 */

/*
interface ExtendedInstanceCardProps {
  // === EXISTING PROPS (from current InstanceCard) ===
  viewId?: string;
  view?: ViewObject;
  dataset?: DatasetObject;
  variant?: 'header' | 'compact' | 'inline' | 'minimal';
  colorPosition?: 'left' | 'right';
  showGradient?: boolean;
  showIcon?: boolean;
  showDataset?: boolean;
  showType?: boolean;
  showSettings?: boolean;
  onRename?: (viewId: string, newName: string) => void;
  onSettings?: () => void;
  onClick?: () => void;
  className?: string;
  
  // === NEW LINK-RELATED PROPS ===
  
  // Badge counts
  linkCount?: number;          // Number of linked properties (shows LinkBadge)
  viewerCount?: number;        // Number of current viewers (shows ViewerBadge)
  
  // Hub status
  isHub?: boolean;             // Is this view the hub of a sync group?
  
  // Link mode (when showing in link context)
  linkMode?: 'follow' | 'sync' | 'bidirectional' | 'broadcast';
  
  // Sync status
  syncStatus?: 'synced' | 'syncing' | 'error' | 'paused';
  
  // Last sync info (for pulse toast)
  lastSyncEvent?: {
    userName: string;
    action: string;
    property: string;
    timestamp: number;
  };
  
  // Badge interactions
  onLinkBadgeClick?: () => void;        // Opens Link Manager panel
  onLinkBadgeDragStart?: (e: DragEvent) => void;  // Starts quick-link drag
  onLinkBadgeDragEnd?: (e: DragEvent) => void;
  
  // Drag-to-link drop target
  isLinkDropTarget?: boolean;           // Highlight as valid drop target
  onLinkDrop?: (sourceViewId: string) => void;
}
*/

// =============================================================================
// PART 4: INSTANCE CARD BADGES SECTION COMPONENT
// =============================================================================

/**
 * InstanceCardBadges - Badge cluster for InstanceCard header
 * 
 * Renders in the header row between name and action buttons.
 * Handles layout and spacing of multiple badges.
 * 
 * Usage (inside InstanceCard):
 * <InstanceCardBadges
 *   linkCount={3}
 *   viewerCount={2}
 *   isHub={true}
 *   linkMode="sync"
 *   syncStatus="synced"
 *   onLinkBadgeClick={openLinkPanel}
 *   onLinkBadgeDragStart={handleDragStart}
 * />
 */
export const InstanceCardBadges = memo(function InstanceCardBadges({
  linkCount,
  viewerCount,
  isHub,
  linkMode,
  syncStatus,
  size = 'default', // Inherits from InstanceCard variant
  onLinkBadgeClick,
  onLinkBadgeDragStart,
  onLinkBadgeDragEnd,
}) {
  // Don't render if nothing to show
  const hasContent = linkCount > 0 || viewerCount > 0 || isHub || linkMode || syncStatus;
  if (!hasContent) return null;
  
  return (
    <div 
      className="instance-card__badges"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      {isHub && <HubBadge size={size} showLabel={size !== 'small'} />}
      {linkMode && <ModeBadge mode={linkMode} size={size} />}
      <LinkBadge
        count={linkCount}
        size={size}
        onClick={onLinkBadgeClick}
        onDragStart={onLinkBadgeDragStart}
        onDragEnd={onLinkBadgeDragEnd}
      />
      <ViewerBadge count={viewerCount} size={size} />
      {syncStatus && <SyncStatusIndicator status={syncStatus} size={size} showLabel={false} />}
    </div>
  );
});

// =============================================================================
// PART 5: INSTANCE CARD VARIANTS MAPPING
// =============================================================================

/**
 * Variant → Badge Size Mapping
 * 
 * Different InstanceCard variants need different badge sizes.
 */
export const VARIANT_BADGE_SIZES = {
  header: 'default',
  compact: 'small',
  inline: 'small',
  minimal: 'small',
  // New variants for link contexts
  topology: 'small',    // Mini topology diagrams
  chip: 'small',        // Inline chip references
};

/**
 * New Variants for Link Contexts
 * 
 * These extend the existing INSTANCE_CARD_VARIANTS constant.
 */
export const EXTENDED_VARIANTS = {
  // Existing
  HEADER: 'header',
  COMPACT: 'compact',
  INLINE: 'inline',
  MINIMAL: 'minimal',
  // New for link contexts
  TOPOLOGY: 'topology',  // For sync group diagrams (mini card)
  CHIP: 'chip',          // Inline reference (just dot + name)
};

// =============================================================================
// PART 6: INSTANCE CARD TOPOLOGY VARIANT
// =============================================================================

/**
 * InstanceCardTopology - Mini card for topology diagrams
 * 
 * Used in:
 * - Link Manager sync group diagrams
 * - Workspace Links Hub topology views
 * 
 * Shows: color dot, truncated name, mode badge, hub indicator
 */
export const InstanceCardTopology = memo(function InstanceCardTopology({
  view,
  isHub = false,
  isCurrentUser = false,
  mode,
  ownerName,
  onClick,
  onRemove,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={`instance-card instance-card--topology ${isHub ? 'instance-card--hub' : ''} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        minWidth: '120px',
        background: isCurrentUser 
          ? `rgba(${hexToRgb(view.color)}, 0.08)` 
          : isHovered 
            ? 'rgba(255,255,255,0.06)' 
            : 'rgba(18, 26, 46, 0.8)',
        border: `1px solid ${isHub ? tokens.colorAccentAmber : 'rgba(255,255,255,0.1)'}`,
        borderLeft: isHub ? `3px solid ${tokens.colorAccentAmber}` : undefined,
        borderRadius: tokens.radiusSm,
        cursor: onClick ? 'pointer' : 'default',
        transition: tokens.transitionFast,
      }}
    >
      {isHub && (
        <span style={{ color: tokens.colorAccentAmber, fontSize: '10px', marginRight: '-2px' }}>★</span>
      )}
      
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: view.color,
          flexShrink: 0,
        }}
      />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: isCurrentUser ? view.color : tokens.colorTextPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {view.name.split(' ').slice(0, 2).join(' ')}
          {isCurrentUser && (
            <span style={{ fontWeight: 400, opacity: 0.7 }}> (you)</span>
          )}
        </div>
        {ownerName && (
          <div style={{ fontSize: '9px', color: tokens.colorTextMuted }}>
            {ownerName}
          </div>
        )}
      </div>
      
      {mode && <ModeBadge mode={mode} size="small" />}
      
      {onRemove && isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            color: tokens.colorTextMuted,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
});

/**
 * InstanceCardChip - Inline chip variant
 * 
 * Used in:
 * - Inline text references
 * - Compact lists
 * - Tag-like displays
 */
export const InstanceCardChip = memo(function InstanceCardChip({
  view,
  isHub = false,
  mode,
  onClick,
  onRemove,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <span
      className={`instance-card instance-card--chip ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        background: isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(18, 26, 46, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: tokens.radiusSm,
        cursor: onClick ? 'pointer' : 'default',
        transition: tokens.transitionFast,
      }}
    >
      {isHub && <span style={{ color: tokens.colorAccentAmber, fontSize: '10px' }}>★</span>}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: view.color,
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: '10px',
        color: tokens.colorTextSecondary,
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {view.name}
      </span>
      {mode && <ModeBadge mode={mode} size="small" />}
      {onRemove && isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            padding: 0,
            marginLeft: '2px',
            background: 'transparent',
            border: 'none',
            color: tokens.colorTextMuted,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </span>
  );
});

// =============================================================================
// PART 7: CSS-IN-JS KEYFRAMES (for SCSS migration)
// =============================================================================

/**
 * Animation keyframes to add to theme or component SCSS
 */
export const LINK_ANIMATIONS_CSS = `
/* Pulse animation for syncing status */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade in/out for sync pulse toast */
@keyframes fadeInOut {
  0% { 
    opacity: 0; 
    transform: translateX(-50%) translateY(-4px); 
  }
  15% { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0); 
  }
  85% { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0); 
  }
  100% { 
    opacity: 0; 
    transform: translateX(-50%) translateY(-4px); 
  }
}

/* Link badge hover glow */
.link-badge:hover {
  background: rgba(45, 212, 191, 0.25);
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.3);
}

/* Link badge dragging state */
.link-badge:active {
  cursor: grabbing;
  transform: scale(0.95);
}

/* Hub indicator subtle glow */
.hub-badge {
  box-shadow: 0 0 4px rgba(251, 191, 36, 0.2);
}

/* Drop target highlight */
.instance-card--drop-target {
  border-color: var(--color-accent-teal) !important;
  box-shadow: 0 0 12px rgba(45, 212, 191, 0.3);
}

/* Drop target invalid */
.instance-card--drop-invalid {
  opacity: 0.4;
  pointer-events: none;
}
`;

// =============================================================================
// PART 8: SCSS ADDITIONS FOR INSTANCE CARD
// Location: Add to src/ui/react/components/organisms/InstanceCard/InstanceCard.scss
// =============================================================================

export const INSTANCE_CARD_SCSS_ADDITIONS = `
// =============================================================================
// LINK-RELATED EXTENSIONS
// =============================================================================

// Badges container
.instance-card__badges {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

// Sync pulse toast container
.instance-card__sync-pulse {
  position: relative;
}

// Topology variant
.instance-card--topology {
  @include glass-surface;
  padding: $spacing-sm $spacing-md;
  min-width: 120px;
  
  &.instance-card--hub {
    border-left: 3px solid $color-accent-amber;
  }
}

// Chip variant
.instance-card--chip {
  @include glass-surface-subtle;
  display: inline-flex;
  padding: 3px $spacing-sm;
}

// Drop target states
.instance-card--drop-target {
  border-color: $color-accent-teal !important;
  @include accent-glow($color-accent-teal);
}

.instance-card--drop-invalid {
  opacity: 0.4;
  pointer-events: none;
}

// Link badge in header
.instance-card--header .link-badge,
.instance-card--compact .link-badge {
  margin-left: auto;
}
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '96, 165, 250';
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Constants
  EXTENDED_VARIANTS,
  VARIANT_BADGE_SIZES,
  
  // For SCSS migration reference
  LINK_ANIMATIONS_CSS,
  INSTANCE_CARD_SCSS_ADDITIONS,
};

export default {
  LinkBadge,
  ViewerBadge,
  HubBadge,
  ModeBadge,
  SyncStatusIndicator,
  SyncPulseToast,
  InstanceCardBadges,
  InstanceCardTopology,
  InstanceCardChip,
};
