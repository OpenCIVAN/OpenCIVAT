/**
 * Canvas Link Indicators System
 * 
 * Visual feedback layer showing link relationships directly on the canvas.
 * Makes the invisible sync connections visible and intuitive.
 * 
 * Components:
 * 1. ViewportLinkBorder - Colored border/glow around linked viewports
 * 2. LinkConnectionLines - SVG overlay showing connections between views
 * 3. SyncPulseRipple - Animation when sync events propagate
 * 4. LinkStatusCornerBadge - Compact status in viewport corner
 * 5. MiniMapLinkOverlay - Link topology in the navigator minimap
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  useCallback,
  memo,
  createContext,
  useContext 
} from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  // Link property colors (consistent with badges)
  linkColors: {
    camera: '#2dd4bf',           // Teal
    filters: '#a78bfa',          // Purple
    colorMaps: '#f472b6',        // Pink
    widgets: '#fbbf24',          // Amber
    cursors: '#60a5fa',          // Blue
    annotationDisplay: '#fb923c', // Orange
  },
  
  // Status colors
  statusColors: {
    synced: '#4ade80',    // Green
    syncing: '#22d3ee',   // Cyan (animated)
    paused: '#fbbf24',    // Amber
    broken: '#f87171',    // Red
  },
  
  // Role colors
  roleColors: {
    hub: '#fbbf24',       // Amber - source of truth
    member: '#2dd4bf',    // Teal - participant
  },
  
  // UI colors
  bgCanvas: '#030303',
  bgOverlay: 'rgba(3, 3, 3, 0.8)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  // Dimensions
  borderWidth: {
    default: 2,
    active: 3,
    hub: 4,
  },
  
  // Animation
  transitionFast: '0.15s ease',
  transitionBase: '0.25s ease',
  pulseDecay: 2000, // ms for sync pulse to fade
};

// Property icons for compact display
const PROPERTY_ICONS = {
  camera: '📷',
  filters: '🎚',
  colorMaps: '🎨',
  widgets: '📐',
  cursors: '👁',
  annotationDisplay: '📝',
};

// =============================================================================
// PART 1: LINK INDICATORS CONTEXT
// Provides centralized state for all link visualization
// =============================================================================

const LinkIndicatorsContext = createContext(null);

/**
 * LinkIndicatorsProvider - Manages link visualization state
 * 
 * Tracks:
 * - Which views are linked and how
 * - Recent sync events (for pulse animations)
 * - User preferences (show lines, show borders, etc.)
 * 
 * Usage:
 * <LinkIndicatorsProvider viewConfigManager={vcm}>
 *   <Canvas />
 * </LinkIndicatorsProvider>
 */
export function LinkIndicatorsProvider({ 
  children, 
  viewConfigManager,
  initialSettings = {} 
}) {
  // User preferences for visualization
  const [settings, setSettings] = useState({
    showBorders: true,           // Show colored borders on linked views
    showConnectionLines: false,  // Show SVG lines between views (toggle)
    showSyncPulse: true,         // Show ripple on sync events
    showCornerBadges: true,      // Show compact badge in corner
    showInMiniMap: true,         // Show links in navigator
    lineStyle: 'curved',         // 'curved' | 'straight' | 'orthogonal'
    borderStyle: 'glow',         // 'solid' | 'glow' | 'gradient'
    ...initialSettings,
  });
  
  // Track recent sync events for pulse animations
  // Map<viewId, { property, sourceUserId, sourceUserName, timestamp }>
  const [recentSyncs, setRecentSyncs] = useState(new Map());
  
  // Track viewport positions for connection lines
  // Map<viewId, DOMRect>
  const [viewportRects, setViewportRects] = useState(new Map());
  
  // Register a viewport's position
  const registerViewport = useCallback((viewId, rect) => {
    setViewportRects(prev => {
      const next = new Map(prev);
      next.set(viewId, rect);
      return next;
    });
  }, []);
  
  // Unregister a viewport
  const unregisterViewport = useCallback((viewId) => {
    setViewportRects(prev => {
      const next = new Map(prev);
      next.delete(viewId);
      return next;
    });
  }, []);
  
  // Record a sync event (triggers pulse animation)
  const recordSyncEvent = useCallback((viewId, property, sourceUserId, sourceUserName) => {
    const event = {
      property,
      sourceUserId,
      sourceUserName,
      timestamp: Date.now(),
    };
    
    setRecentSyncs(prev => {
      const next = new Map(prev);
      next.set(viewId, event);
      return next;
    });
    
    // Auto-clear after decay time
    setTimeout(() => {
      setRecentSyncs(prev => {
        const next = new Map(prev);
        const current = next.get(viewId);
        if (current && current.timestamp === event.timestamp) {
          next.delete(viewId);
        }
        return next;
      });
    }, tokens.pulseDecay);
  }, []);
  
  // Listen to ViewConfigurationManager events
  useEffect(() => {
    if (!viewConfigManager) return;
    
    const handleSyncPropagated = (event) => {
      const { targetViewIds, property, sourceViewId, sourceOwnerName } = event;
      for (const viewId of targetViewIds) {
        recordSyncEvent(viewId, property, sourceViewId, sourceOwnerName);
      }
    };
    
    viewConfigManager.on('syncGroupSyncPropagated', handleSyncPropagated);
    
    return () => {
      viewConfigManager.off('syncGroupSyncPropagated', handleSyncPropagated);
    };
  }, [viewConfigManager, recordSyncEvent]);
  
  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);
  
  const contextValue = {
    settings,
    updateSettings,
    recentSyncs,
    recordSyncEvent,
    viewportRects,
    registerViewport,
    unregisterViewport,
    viewConfigManager,
  };
  
  return (
    <LinkIndicatorsContext.Provider value={contextValue}>
      {children}
    </LinkIndicatorsContext.Provider>
  );
}

export function useLinkIndicators() {
  const context = useContext(LinkIndicatorsContext);
  if (!context) {
    throw new Error('useLinkIndicators must be used within LinkIndicatorsProvider');
  }
  return context;
}

// =============================================================================
// PART 2: VIEWPORT LINK BORDER
// Colored border/glow around linked viewports
// =============================================================================

/**
 * ViewportLinkBorder - Wraps a viewport with link-indicating border
 * 
 * Visual states:
 * - No links: No special border
 * - Single property linked: Solid color of that property
 * - Multiple properties linked: Gradient or segmented border
 * - Hub: Thicker border with subtle glow
 * - Syncing: Animated pulse on the border
 * 
 * Usage:
 * <ViewportLinkBorder viewId="v1" isHub={false} linkedProperties={['camera', 'filters']}>
 *   <ViewportContent />
 * </ViewportLinkBorder>
 */
export const ViewportLinkBorder = memo(function ViewportLinkBorder({
  viewId,
  linkedProperties = [],  // Array of property names that are linked
  isHub = false,
  syncStatus = 'synced', // 'synced' | 'syncing' | 'paused' | 'broken'
  children,
  className = '',
}) {
  const { settings, recentSyncs, registerViewport, unregisterViewport } = useLinkIndicators();
  const containerRef = useRef(null);
  
  // Track position for connection lines
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateRect = () => {
      const rect = containerRef.current.getBoundingClientRect();
      registerViewport(viewId, rect);
    };
    
    updateRect();
    
    // Update on resize
    const observer = new ResizeObserver(updateRect);
    observer.observe(containerRef.current);
    
    // Update on scroll (if in scrollable container)
    window.addEventListener('scroll', updateRect, true);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      unregisterViewport(viewId);
    };
  }, [viewId, registerViewport, unregisterViewport]);
  
  // Check for recent sync (for pulse)
  const recentSync = recentSyncs.get(viewId);
  const isPulsing = recentSync && (Date.now() - recentSync.timestamp < tokens.pulseDecay);
  
  // Don't render special border if no links or borders disabled
  if (!settings.showBorders || linkedProperties.length === 0) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    );
  }
  
  // Calculate border style
  const borderStyle = useMemo(() => {
    const propertyCount = linkedProperties.length;
    
    if (propertyCount === 0) return {};
    
    // Single property: solid color
    if (propertyCount === 1) {
      const color = tokens.linkColors[linkedProperties[0]];
      
      if (settings.borderStyle === 'glow') {
        return {
          border: `${isHub ? tokens.borderWidth.hub : tokens.borderWidth.default}px solid ${color}`,
          boxShadow: `0 0 ${isHub ? 16 : 10}px ${color}40, inset 0 0 ${isHub ? 8 : 4}px ${color}20`,
        };
      }
      
      if (settings.borderStyle === 'gradient') {
        return {
          border: `${isHub ? tokens.borderWidth.hub : tokens.borderWidth.default}px solid transparent`,
          background: `linear-gradient(${tokens.bgCanvas}, ${tokens.bgCanvas}) padding-box, 
                       linear-gradient(135deg, ${color}, ${color}80) border-box`,
        };
      }
      
      // solid
      return {
        border: `${isHub ? tokens.borderWidth.hub : tokens.borderWidth.default}px solid ${color}`,
      };
    }
    
    // Multiple properties: gradient border
    const colors = linkedProperties.map(p => tokens.linkColors[p]);
    const gradientStops = colors.map((c, i) => 
      `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
    ).join(', ');
    
    return {
      border: `${isHub ? tokens.borderWidth.hub : tokens.borderWidth.default}px solid transparent`,
      background: `linear-gradient(${tokens.bgCanvas}, ${tokens.bgCanvas}) padding-box, 
                   linear-gradient(135deg, ${gradientStops}) border-box`,
      boxShadow: isHub ? `0 0 12px ${colors[0]}30` : 'none',
    };
  }, [linkedProperties, isHub, settings.borderStyle]);
  
  // Hub indicator corner
  const hubCorner = isHub && (
    <div style={{
      position: 'absolute',
      top: -1,
      left: -1,
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: '20px 20px 0 0',
      borderColor: `${tokens.roleColors.hub} transparent transparent transparent`,
      zIndex: 2,
    }}>
      <span style={{
        position: 'absolute',
        top: -18,
        left: 2,
        fontSize: '10px',
        color: '#000',
        fontWeight: 700,
      }}>★</span>
    </div>
  );
  
  return (
    <div
      ref={containerRef}
      className={`viewport-link-border ${className}`}
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        ...borderStyle,
        transition: tokens.transitionBase,
      }}
    >
      {hubCorner}
      
      {/* Sync pulse overlay */}
      {settings.showSyncPulse && isPulsing && (
        <SyncPulseRipple 
          color={tokens.linkColors[recentSync.property]} 
          userName={recentSync.sourceUserName}
        />
      )}
      
      {children}
    </div>
  );
});

// =============================================================================
// PART 3: SYNC PULSE RIPPLE
// Animation when sync events propagate
// =============================================================================

/**
 * SyncPulseRipple - Animated ripple effect when view receives sync
 * 
 * Shows a brief colored pulse emanating from the border,
 * with optional user attribution.
 */
export const SyncPulseRipple = memo(function SyncPulseRipple({
  color,
  userName,
}) {
  return (
    <>
      {/* Ripple animation */}
      <div
        className="sync-pulse-ripple"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          border: `2px solid ${color}`,
          animation: 'syncPulseExpand 0.6s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      
      {/* Inner glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`,
          animation: 'syncPulseFade 0.8s ease-out forwards',
          pointerEvents: 'none',
          zIndex: 9,
        }}
      />
      
      {/* User attribution toast */}
      {userName && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            background: color,
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 600,
            color: '#000',
            whiteSpace: 'nowrap',
            animation: 'syncToastFade 2s ease-out forwards',
            zIndex: 11,
          }}
        >
          ↓ {userName}
        </div>
      )}
      
      <style>{`
        @keyframes syncPulseExpand {
          0% { 
            transform: scale(0.98);
            opacity: 1;
          }
          100% { 
            transform: scale(1.02);
            opacity: 0;
          }
        }
        
        @keyframes syncPulseFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes syncToastFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </>
  );
});

// =============================================================================
// PART 4: LINK STATUS CORNER BADGE
// Compact status indicator in viewport corner
// =============================================================================

/**
 * LinkStatusCornerBadge - Minimal link indicator in viewport corner
 * 
 * Shows:
 * - Number of linked properties
 * - Hub status
 * - Quick property icons on hover
 * - Click to open Link Manager
 * 
 * Position: Bottom-left or configurable
 */
export const LinkStatusCornerBadge = memo(function LinkStatusCornerBadge({
  viewId,
  linkedProperties = [],
  isHub = false,
  position = 'bottom-left', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onClick,
}) {
  const { settings } = useLinkIndicators();
  const [isHovered, setIsHovered] = useState(false);
  
  if (!settings.showCornerBadges || linkedProperties.length === 0) {
    return null;
  }
  
  const positionStyles = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  };
  
  // Primary color (first linked property or hub color)
  const primaryColor = isHub 
    ? tokens.roleColors.hub 
    : tokens.linkColors[linkedProperties[0]];
  
  return (
    <div
      className="link-status-corner-badge"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: isHovered ? '4px 8px' : '4px 6px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${primaryColor}50`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: tokens.transitionFast,
        zIndex: 5,
      }}
    >
      {/* Hub star */}
      {isHub && (
        <span style={{ color: tokens.roleColors.hub, fontSize: '10px' }}>★</span>
      )}
      
      {/* Link icon + count */}
      <span style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '3px',
        color: primaryColor,
        fontSize: '10px',
        fontWeight: 600,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        {linkedProperties.length}
      </span>
      
      {/* Expanded: show property icons */}
      {isHovered && (
        <div style={{ 
          display: 'flex', 
          gap: '2px',
          marginLeft: '2px',
        }}>
          {linkedProperties.map(prop => (
            <span 
              key={prop}
              title={prop}
              style={{ 
                fontSize: '9px',
                opacity: 0.9,
              }}
            >
              {PROPERTY_ICONS[prop]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 5: LINK CONNECTION LINES OVERLAY
// SVG layer showing connections between views
// =============================================================================

/**
 * LinkConnectionLinesOverlay - SVG overlay showing link connections
 * 
 * Renders lines between linked viewports. Can show:
 * - All links
 * - Links for a specific property
 * - Links for a specific view (on hover)
 * 
 * Line styles:
 * - Curved (bezier) - default, elegant
 * - Straight - simple, clear
 * - Orthogonal - follows grid, technical
 */
export const LinkConnectionLinesOverlay = memo(function LinkConnectionLinesOverlay({
  syncGroups = [],      // Array of SyncGroup objects
  highlightViewId,      // View to highlight connections for
  highlightProperty,    // Property to highlight
}) {
  const { settings, viewportRects } = useLinkIndicators();
  
  if (!settings.showConnectionLines) {
    return null;
  }
  
  // Calculate lines for each sync group
  const lines = useMemo(() => {
    const result = [];
    
    for (const group of syncGroups) {
      const hubRect = viewportRects.get(group.hubViewId);
      if (!hubRect) continue;
      
      const hubCenter = {
        x: hubRect.left + hubRect.width / 2,
        y: hubRect.top + hubRect.height / 2,
      };
      
      // Check if this group should be highlighted
      const isHighlighted = !highlightViewId || 
        group.hubViewId === highlightViewId ||
        group.members.has(highlightViewId);
      
      const isPropertyHighlighted = !highlightProperty || 
        group.property === highlightProperty;
      
      const opacity = (isHighlighted && isPropertyHighlighted) ? 1 : 0.2;
      const color = tokens.linkColors[group.property];
      
      // Create line from hub to each member
      for (const [memberId, membership] of group.members) {
        const memberRect = viewportRects.get(memberId);
        if (!memberRect) continue;
        
        const memberCenter = {
          x: memberRect.left + memberRect.width / 2,
          y: memberRect.top + memberRect.height / 2,
        };
        
        result.push({
          id: `${group.id}-${memberId}`,
          from: hubCenter,
          to: memberCenter,
          color,
          opacity,
          mode: membership.mode,
          property: group.property,
          isHub: false,
        });
      }
    }
    
    return result;
  }, [syncGroups, viewportRects, highlightViewId, highlightProperty]);
  
  if (lines.length === 0) {
    return null;
  }
  
  return (
    <svg
      className="link-connection-lines-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        {/* Arrow marker for directional links */}
        <marker
          id="linkArrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
        </marker>
        
        {/* Glow filter */}
        <filter id="linkLineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {lines.map(line => (
        <LinkConnectionLine
          key={line.id}
          from={line.from}
          to={line.to}
          color={line.color}
          opacity={line.opacity}
          mode={line.mode}
          style={settings.lineStyle}
        />
      ))}
    </svg>
  );
});

/**
 * LinkConnectionLine - Single connection line between two points
 */
const LinkConnectionLine = memo(function LinkConnectionLine({
  from,
  to,
  color,
  opacity = 1,
  mode = 'sync',
  style = 'curved',
}) {
  // Calculate path based on style
  const pathD = useMemo(() => {
    if (style === 'straight') {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }
    
    if (style === 'orthogonal') {
      const midX = (from.x + to.x) / 2;
      return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
    }
    
    // curved (bezier)
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx1 = from.x + dx * 0.4;
    const cy1 = from.y;
    const cx2 = to.x - dx * 0.4;
    const cy2 = to.y;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
  }, [from, to, style]);
  
  // Arrow marker for directional modes
  const showArrow = mode === 'follow' || mode === 'broadcast';
  
  // Line style based on mode
  const strokeDasharray = mode === 'follow' ? '6 4' : 'none';
  
  return (
    <g style={{ color, opacity }}>
      {/* Glow under line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeOpacity="0.2"
        filter="url(#linkLineGlow)"
      />
      
      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        markerEnd={showArrow ? 'url(#linkArrow)' : undefined}
      />
    </g>
  );
});

// =============================================================================
// PART 6: MINIMAP LINK OVERLAY
// Link topology visualization in navigator minimap
// =============================================================================

/**
 * MiniMapLinkOverlay - Shows link connections in the navigator minimap
 * 
 * Renders:
 * - Colored borders on linked cells matching the canvas
 * - Simplified connection lines
 * - Hub indicators (stars)
 * - Property color coding
 */
export const MiniMapLinkOverlay = memo(function MiniMapLinkOverlay({
  cells,              // Array of { viewId, x, y, width, height } in minimap coords
  syncGroups = [],    // Array of SyncGroup objects
  scale = 1,          // Minimap scale factor
}) {
  const { settings } = useLinkIndicators();
  
  if (!settings.showInMiniMap) {
    return null;
  }
  
  // Build map of viewId → linkedProperties for quick lookup
  const viewLinkInfo = useMemo(() => {
    const info = new Map();
    
    for (const group of syncGroups) {
      // Hub
      const hubInfo = info.get(group.hubViewId) || { properties: [], isHub: false };
      hubInfo.properties.push(group.property);
      hubInfo.isHub = true;
      info.set(group.hubViewId, hubInfo);
      
      // Members
      for (const [memberId] of group.members) {
        const memberInfo = info.get(memberId) || { properties: [], isHub: false };
        memberInfo.properties.push(group.property);
        info.set(memberId, memberInfo);
      }
    }
    
    return info;
  }, [syncGroups]);
  
  return (
    <g className="minimap-link-overlay">
      {cells.map(cell => {
        const linkInfo = viewLinkInfo.get(cell.viewId);
        if (!linkInfo || linkInfo.properties.length === 0) return null;
        
        const primaryColor = linkInfo.isHub 
          ? tokens.roleColors.hub 
          : tokens.linkColors[linkInfo.properties[0]];
        
        return (
          <g key={cell.viewId}>
            {/* Colored border */}
            <rect
              x={cell.x}
              y={cell.y}
              width={cell.width}
              height={cell.height}
              fill="none"
              stroke={primaryColor}
              strokeWidth={linkInfo.isHub ? 2 : 1}
              rx={2}
            />
            
            {/* Hub star indicator */}
            {linkInfo.isHub && (
              <text
                x={cell.x + 3}
                y={cell.y + 8}
                fontSize="8"
                fill={tokens.roleColors.hub}
              >
                ★
              </text>
            )}
            
            {/* Property dots */}
            {linkInfo.properties.length > 1 && (
              <g transform={`translate(${cell.x + cell.width - 4}, ${cell.y + 3})`}>
                {linkInfo.properties.slice(0, 3).map((prop, i) => (
                  <circle
                    key={prop}
                    cx={0}
                    cy={i * 4}
                    r={1.5}
                    fill={tokens.linkColors[prop]}
                  />
                ))}
              </g>
            )}
          </g>
        );
      })}
      
      {/* Connection lines (simplified) */}
      {syncGroups.map(group => {
        const hubCell = cells.find(c => c.viewId === group.hubViewId);
        if (!hubCell) return null;
        
        const hubCenter = {
          x: hubCell.x + hubCell.width / 2,
          y: hubCell.y + hubCell.height / 2,
        };
        
        return Array.from(group.members.keys()).map(memberId => {
          const memberCell = cells.find(c => c.viewId === memberId);
          if (!memberCell) return null;
          
          const memberCenter = {
            x: memberCell.x + memberCell.width / 2,
            y: memberCell.y + memberCell.height / 2,
          };
          
          return (
            <line
              key={`${group.id}-${memberId}`}
              x1={hubCenter.x}
              y1={hubCenter.y}
              x2={memberCenter.x}
              y2={memberCenter.y}
              stroke={tokens.linkColors[group.property]}
              strokeWidth={0.5}
              strokeOpacity={0.5}
            />
          );
        });
      })}
    </g>
  );
});

// =============================================================================
// PART 7: LINK INDICATORS SETTINGS PANEL
// User preferences for visualization
// =============================================================================

/**
 * LinkIndicatorsSettingsPanel - Settings UI for link visualization
 * 
 * Typically shown in:
 * - View menu → Link Display Settings
 * - Workspace Links Hub panel
 * - Right-click context menu
 */
export const LinkIndicatorsSettingsPanel = memo(function LinkIndicatorsSettingsPanel({
  onClose,
}) {
  const { settings, updateSettings } = useLinkIndicators();
  
  const settingRows = [
    { 
      key: 'showBorders', 
      label: 'Show link borders', 
      desc: 'Colored borders on linked viewports' 
    },
    { 
      key: 'showConnectionLines', 
      label: 'Show connection lines', 
      desc: 'SVG lines between linked views' 
    },
    { 
      key: 'showSyncPulse', 
      label: 'Show sync animations', 
      desc: 'Pulse effect when views sync' 
    },
    { 
      key: 'showCornerBadges', 
      label: 'Show corner badges', 
      desc: 'Compact link status in viewport corner' 
    },
    { 
      key: 'showInMiniMap', 
      label: 'Show in navigator', 
      desc: 'Link indicators in minimap' 
    },
  ];
  
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(12, 18, 32, 0.95)',
      borderRadius: '8px',
      border: `1px solid ${tokens.borderDefault}`,
      minWidth: '280px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '12px', 
          fontWeight: 600,
          color: tokens.textPrimary,
        }}>
          Link Display Settings
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: tokens.textMuted,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {settingRows.map(({ key, label, desc }) => (
          <label 
            key={key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => updateSettings({ [key]: e.target.checked })}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontSize: '11px', color: tokens.textPrimary }}>
                {label}
              </div>
              <div style={{ fontSize: '9px', color: tokens.textMuted }}>
                {desc}
              </div>
            </div>
          </label>
        ))}
      </div>
      
      {/* Border style selector */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${tokens.borderDefault}` }}>
        <div style={{ fontSize: '10px', color: tokens.textMuted, marginBottom: '8px' }}>
          Border Style
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['solid', 'glow', 'gradient'].map(style => (
            <button
              key={style}
              onClick={() => updateSettings({ borderStyle: style })}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '10px',
                background: settings.borderStyle === style 
                  ? 'rgba(45, 212, 191, 0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${settings.borderStyle === style 
                  ? tokens.linkColors.camera 
                  : tokens.borderDefault}`,
                borderRadius: '4px',
                color: settings.borderStyle === style 
                  ? tokens.linkColors.camera 
                  : tokens.textSecondary,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
      
      {/* Line style selector */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '10px', color: tokens.textMuted, marginBottom: '8px' }}>
          Connection Line Style
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['curved', 'straight', 'orthogonal'].map(style => (
            <button
              key={style}
              onClick={() => updateSettings({ lineStyle: style })}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '10px',
                background: settings.lineStyle === style 
                  ? 'rgba(45, 212, 191, 0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${settings.lineStyle === style 
                  ? tokens.linkColors.camera 
                  : tokens.borderDefault}`,
                borderRadius: '4px',
                color: settings.lineStyle === style 
                  ? tokens.linkColors.camera 
                  : tokens.textSecondary,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// PART 8: KEYBOARD SHORTCUTS FOR LINK INDICATORS
// =============================================================================

/**
 * Suggested keyboard shortcuts for link visualization:
 * 
 * L - Toggle connection lines
 * Shift+L - Cycle border style (solid → glow → gradient)
 * Ctrl/Cmd+L - Open Link Manager for active view
 * Alt+L - Toggle all link indicators
 */
export const LINK_INDICATOR_SHORTCUTS = {
  toggleLines: 'l',
  cycleBorderStyle: 'shift+l',
  openLinkManager: 'mod+l',
  toggleAll: 'alt+l',
};

/**
 * useLinkIndicatorShortcuts - Hook to handle keyboard shortcuts
 */
export function useLinkIndicatorShortcuts(onOpenLinkManager) {
  const { settings, updateSettings } = useLinkIndicators();
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      
      if (key === 'l') {
        if (mod) {
          e.preventDefault();
          onOpenLinkManager?.();
        } else if (shift) {
          e.preventDefault();
          const styles = ['solid', 'glow', 'gradient'];
          const currentIndex = styles.indexOf(settings.borderStyle);
          const nextStyle = styles[(currentIndex + 1) % styles.length];
          updateSettings({ borderStyle: nextStyle });
        } else if (alt) {
          e.preventDefault();
          const allOff = !settings.showBorders && !settings.showConnectionLines && !settings.showCornerBadges;
          updateSettings({
            showBorders: allOff,
            showConnectionLines: allOff,
            showCornerBadges: allOff,
            showSyncPulse: allOff,
            showInMiniMap: allOff,
          });
        } else {
          e.preventDefault();
          updateSettings({ showConnectionLines: !settings.showConnectionLines });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, updateSettings, onOpenLinkManager]);
}

// =============================================================================
// PART 9: INTEGRATION EXAMPLE
// =============================================================================

/**
 * Example showing full integration with canvas viewports
 */
export function CanvasWithLinkIndicatorsExample() {
  // Sample data
  const sampleViews = [
    { id: 'v1', name: 'Skull', color: '#2dd4bf' },
    { id: 'v2', name: 'Bones', color: '#4ade80' },
    { id: 'v3', name: 'Vessels', color: '#a78bfa' },
    { id: 'v4', name: 'Heart', color: '#f472b6' },
  ];
  
  const sampleSyncGroups = [
    {
      id: 'sg1',
      property: 'camera',
      hubViewId: 'v1',
      members: new Map([
        ['v2', { mode: 'sync' }],
        ['v3', { mode: 'follow' }],
      ]),
    },
    {
      id: 'sg2',
      property: 'filters',
      hubViewId: 'v2',
      members: new Map([
        ['v4', { mode: 'sync' }],
      ]),
    },
  ];
  
  // Build linked properties map
  const getLinkedProperties = (viewId) => {
    const props = [];
    for (const group of sampleSyncGroups) {
      if (group.hubViewId === viewId || group.members.has(viewId)) {
        props.push(group.property);
      }
    }
    return props;
  };
  
  const isHub = (viewId) => {
    return sampleSyncGroups.some(g => g.hubViewId === viewId);
  };
  
  return (
    <LinkIndicatorsProvider>
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        padding: '20px',
        background: tokens.bgCanvas,
        minHeight: '500px',
      }}>
        {/* Connection lines overlay */}
        <LinkConnectionLinesOverlay syncGroups={sampleSyncGroups} />
        
        {/* Viewports */}
        {sampleViews.map(view => (
          <ViewportLinkBorder
            key={view.id}
            viewId={view.id}
            linkedProperties={getLinkedProperties(view.id)}
            isHub={isHub(view.id)}
          >
            <div style={{
              height: '200px',
              background: 'rgba(12, 18, 32, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <span style={{ color: view.color, fontSize: '14px', fontWeight: 600 }}>
                {view.name}
              </span>
              
              <LinkStatusCornerBadge
                viewId={view.id}
                linkedProperties={getLinkedProperties(view.id)}
                isHub={isHub(view.id)}
                onClick={() => console.log('Open link manager for', view.id)}
              />
            </div>
          </ViewportLinkBorder>
        ))}
        
        {/* Settings panel (for demo) */}
        <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
          <LinkIndicatorsSettingsPanel />
        </div>
      </div>
    </LinkIndicatorsProvider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  tokens as LINK_INDICATOR_TOKENS,
  PROPERTY_ICONS,
};

export default {
  LinkIndicatorsProvider,
  useLinkIndicators,
  ViewportLinkBorder,
  SyncPulseRipple,
  LinkStatusCornerBadge,
  LinkConnectionLinesOverlay,
  MiniMapLinkOverlay,
  LinkIndicatorsSettingsPanel,
  useLinkIndicatorShortcuts,
  LINK_INDICATOR_SHORTCUTS,
};
