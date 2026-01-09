/**
 * Drag-to-Link Interaction System
 * 
 * Enables quick view linking by dragging from one view's link badge
 * to another view. Provides visual feedback during drag and a 
 * Quick Link Popup on drop for property/mode selection.
 * 
 * INTEGRATION POINTS:
 * - LinkBadge component (drag source)
 * - InstanceCard / ViewItem (drop targets)
 * - ViewConfigurationManager (link creation)
 * - Canvas overlay (connection line during drag)
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, { 
  useState, 
  useCallback, 
  useRef, 
  useEffect,
  createContext,
  useContext,
  memo 
} from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  colorAccentTeal: '#2dd4bf',
  colorAccentAmber: '#fbbf24',
  colorAccentPurple: '#a78bfa',
  colorAccentBlue: '#60a5fa',
  colorAccentGreen: '#4ade80',
  colorAccentRed: '#f87171',
  
  colorBgSecondary: '#0c1220',
  colorBgTertiary: '#121a2e',
  colorBgElevated: '#18223c',
  colorBorderDefault: 'rgba(255, 255, 255, 0.1)',
  colorBorderMedium: 'rgba(255, 255, 255, 0.15)',
  
  colorTextPrimary: 'rgba(255, 255, 255, 0.95)',
  colorTextSecondary: 'rgba(255, 255, 255, 0.75)',
  colorTextMuted: 'rgba(255, 255, 255, 0.35)',
  
  radiusSm: '4px',
  radiusMd: '6px',
  radiusLg: '8px',
  
  transitionFast: '0.15s ease',
  transitionBase: '0.2s ease',
};

// =============================================================================
// LINK PROPERTIES CONFIGURATION
// =============================================================================

const LINK_PROPERTIES = [
  { id: 'camera', icon: '📷', iconName: 'camera', label: 'Camera', color: tokens.colorAccentTeal },
  { id: 'filters', icon: '🎚', iconName: 'sliders', label: 'Filters', color: tokens.colorAccentPurple },
  { id: 'colorMaps', icon: '🎨', iconName: 'palette', label: 'Colors', color: '#f472b6' },
  { id: 'widgets', icon: '📐', iconName: 'layout', label: 'Widgets', color: tokens.colorAccentAmber },
  { id: 'cursors', icon: '👁', iconName: 'crosshair', label: 'Cursors', color: tokens.colorAccentBlue },
  { id: 'annotationDisplay', icon: '📝', iconName: 'eye', label: 'Annot.', color: '#fb923c' },
];

const LINK_MODES = [
  { id: 'follow', icon: '←', label: 'Follow', desc: 'Receive updates only' },
  { id: 'sync', icon: '↔', label: 'Sync', desc: 'Two-way sync' },
  { id: 'broadcast', icon: '→', label: 'Broadcast', desc: 'Send updates only' },
];

// =============================================================================
// PART 1: DRAG LINK CONTEXT
// Provides global state for drag-to-link operations
// =============================================================================

const DragLinkContext = createContext(null);

/**
 * DragLinkProvider - Wraps the canvas/workspace to enable drag-to-link
 * 
 * Usage:
 * <DragLinkProvider onCreateLink={handleCreateLink}>
 *   <Canvas />
 * </DragLinkProvider>
 */
export function DragLinkProvider({ children, onCreateLink }) {
  const [dragState, setDragState] = useState({
    isDragging: false,
    sourceView: null,
    sourceRect: null,
    currentPosition: { x: 0, y: 0 },
    targetView: null,
    isValidTarget: false,
  });
  
  const [showQuickLinkPopup, setShowQuickLinkPopup] = useState(false);
  const [quickLinkPosition, setQuickLinkPosition] = useState({ x: 0, y: 0 });
  const [pendingLink, setPendingLink] = useState(null);
  
  // Start drag operation
  const startDrag = useCallback((sourceView, sourceRect, startPosition) => {
    setDragState({
      isDragging: true,
      sourceView,
      sourceRect,
      currentPosition: startPosition,
      targetView: null,
      isValidTarget: false,
    });
  }, []);
  
  // Update drag position (called on mousemove)
  const updateDrag = useCallback((position, targetView, isValidTarget) => {
    setDragState(prev => ({
      ...prev,
      currentPosition: position,
      targetView,
      isValidTarget,
    }));
  }, []);
  
  // End drag operation
  const endDrag = useCallback((dropped, dropPosition) => {
    if (dropped && dragState.targetView && dragState.isValidTarget) {
      // Show Quick Link Popup at drop position
      setPendingLink({
        sourceView: dragState.sourceView,
        targetView: dragState.targetView,
      });
      setQuickLinkPosition(dropPosition);
      setShowQuickLinkPopup(true);
    }
    
    setDragState({
      isDragging: false,
      sourceView: null,
      sourceRect: null,
      currentPosition: { x: 0, y: 0 },
      targetView: null,
      isValidTarget: false,
    });
  }, [dragState]);
  
  // Cancel drag (Escape key)
  const cancelDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      sourceView: null,
      sourceRect: null,
      currentPosition: { x: 0, y: 0 },
      targetView: null,
      isValidTarget: false,
    });
  }, []);
  
  // Handle Quick Link confirmation
  const confirmQuickLink = useCallback((property, mode) => {
    if (pendingLink && onCreateLink) {
      onCreateLink(
        pendingLink.sourceView.id,
        pendingLink.targetView.id,
        property,
        mode
      );
    }
    setShowQuickLinkPopup(false);
    setPendingLink(null);
  }, [pendingLink, onCreateLink]);
  
  // Cancel Quick Link
  const cancelQuickLink = useCallback(() => {
    setShowQuickLinkPopup(false);
    setPendingLink(null);
  }, []);
  
  // Keyboard handler for Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showQuickLinkPopup) {
          cancelQuickLink();
        } else if (dragState.isDragging) {
          cancelDrag();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragState.isDragging, showQuickLinkPopup, cancelDrag, cancelQuickLink]);
  
  const contextValue = {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    showQuickLinkPopup,
    quickLinkPosition,
    pendingLink,
    confirmQuickLink,
    cancelQuickLink,
  };
  
  return (
    <DragLinkContext.Provider value={contextValue}>
      {children}
      
      {/* Drag Line Overlay */}
      {dragState.isDragging && (
        <DragLinkOverlay 
          sourceRect={dragState.sourceRect}
          currentPosition={dragState.currentPosition}
          isValidTarget={dragState.isValidTarget}
          targetView={dragState.targetView}
        />
      )}
      
      {/* Quick Link Popup */}
      {showQuickLinkPopup && pendingLink && (
        <QuickLinkPopup
          sourceView={pendingLink.sourceView}
          targetView={pendingLink.targetView}
          position={quickLinkPosition}
          onConfirm={confirmQuickLink}
          onCancel={cancelQuickLink}
        />
      )}
    </DragLinkContext.Provider>
  );
}

export function useDragLink() {
  const context = useContext(DragLinkContext);
  if (!context) {
    throw new Error('useDragLink must be used within DragLinkProvider');
  }
  return context;
}

// =============================================================================
// PART 2: DRAG LINK OVERLAY
// SVG overlay showing connection line during drag
// =============================================================================

const DragLinkOverlay = memo(function DragLinkOverlay({
  sourceRect,
  currentPosition,
  isValidTarget,
  targetView,
}) {
  if (!sourceRect) return null;
  
  // Calculate source center point
  const sourceX = sourceRect.left + sourceRect.width / 2;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  
  // Line color based on validity
  const lineColor = isValidTarget ? tokens.colorAccentTeal : tokens.colorTextMuted;
  
  return (
    <svg
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      <defs>
        {/* Animated dash pattern */}
        <pattern
          id="dragLineDash"
          patternUnits="userSpaceOnUse"
          width="12"
          height="1"
        >
          <line
            x1="0"
            y1="0"
            x2="8"
            y2="0"
            stroke={lineColor}
            strokeWidth="2"
          />
        </pattern>
        
        {/* Glow filter */}
        <filter id="dragLineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Connection line */}
      <line
        x1={sourceX}
        y1={sourceY}
        x2={currentPosition.x}
        y2={currentPosition.y}
        stroke={lineColor}
        strokeWidth="2"
        strokeDasharray="8 4"
        strokeLinecap="round"
        filter={isValidTarget ? 'url(#dragLineGlow)' : undefined}
        style={{
          animation: 'dashMove 0.5s linear infinite',
        }}
      />
      
      {/* Source indicator (circle) */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r="6"
        fill={tokens.colorAccentTeal}
        stroke="#fff"
        strokeWidth="2"
      />
      
      {/* Target indicator (when valid) */}
      {isValidTarget && (
        <circle
          cx={currentPosition.x}
          cy={currentPosition.y}
          r="8"
          fill="none"
          stroke={tokens.colorAccentTeal}
          strokeWidth="2"
          style={{
            animation: 'pulseRing 1s ease infinite',
          }}
        />
      )}
      
      {/* Link icon following cursor */}
      <g transform={`translate(${currentPosition.x + 12}, ${currentPosition.y - 12})`}>
        <circle
          r="12"
          fill={tokens.colorBgElevated}
          stroke={lineColor}
          strokeWidth="1"
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="12"
          fill={lineColor}
        >
          🔗
        </text>
      </g>
      
      {/* CSS animations (inline for portability) */}
      <style>{`
        @keyframes dashMove {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -12; }
        }
        @keyframes pulseRing {
          0% { r: 8; opacity: 1; }
          100% { r: 20; opacity: 0; }
        }
      `}</style>
    </svg>
  );
});

// =============================================================================
// PART 3: QUICK LINK POPUP
// Property and mode selector that appears on drop
// =============================================================================

const QuickLinkPopup = memo(function QuickLinkPopup({
  sourceView,
  targetView,
  position,
  onConfirm,
  onCancel,
}) {
  const [selectedProperty, setSelectedProperty] = useState('camera');
  const [selectedMode, setSelectedMode] = useState('sync');
  const popupRef = useRef(null);
  
  // Click outside to cancel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onCancel();
      }
    };
    
    // Delay to prevent immediate close from drop click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        onConfirm(selectedProperty, selectedMode);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedProperty, selectedMode, onConfirm]);
  
  // Position popup (constrain to viewport)
  const popupStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 280),
    width: '300px',
    background: tokens.colorBgSecondary,
    border: `1px solid ${tokens.colorBorderDefault}`,
    borderRadius: tokens.radiusLg,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)',
    zIndex: 9999,
    overflow: 'hidden',
    animation: 'popupFadeIn 0.15s ease',
  };
  
  return (
    <>
      <style>{`
        @keyframes popupFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      <div ref={popupRef} style={popupStyle}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${tokens.colorBorderDefault}`,
          background: tokens.colorBgTertiary,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: tokens.colorTextPrimary,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: sourceView.color,
            }} />
            {sourceView.name.split(' ').slice(0, 2).join(' ')}
            <span style={{ color: tokens.colorTextMuted }}>→</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: targetView.color,
            }} />
            {targetView.name.split(' ').slice(0, 2).join(' ')}
          </div>
        </div>
        
        {/* Property Selection */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{
            fontSize: '9px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: tokens.colorTextMuted,
            marginBottom: '8px',
          }}>
            Property
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {LINK_PROPERTIES.map(prop => (
              <button
                key={prop.id}
                onClick={() => setSelectedProperty(prop.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: selectedProperty === prop.id 
                    ? `${prop.color}20` 
                    : tokens.colorBgTertiary,
                  border: `1px solid ${selectedProperty === prop.id ? prop.color : tokens.colorBorderDefault}`,
                  borderRadius: tokens.radiusSm,
                  color: selectedProperty === prop.id ? prop.color : tokens.colorTextSecondary,
                  cursor: 'pointer',
                  transition: tokens.transitionFast,
                }}
              >
                <span>{prop.icon}</span>
                {prop.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mode Selection */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            fontSize: '9px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: tokens.colorTextMuted,
            marginBottom: '8px',
          }}>
            Mode
          </div>
          
          <div style={{
            display: 'flex',
            gap: '6px',
          }}>
            {LINK_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 8px',
                  background: selectedMode === mode.id 
                    ? `${tokens.colorAccentTeal}20` 
                    : tokens.colorBgTertiary,
                  border: `1px solid ${selectedMode === mode.id ? tokens.colorAccentTeal : tokens.colorBorderDefault}`,
                  borderRadius: tokens.radiusSm,
                  cursor: 'pointer',
                  transition: tokens.transitionFast,
                }}
              >
                <span style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: selectedMode === mode.id ? tokens.colorAccentTeal : tokens.colorTextMuted,
                }}>
                  {mode.icon}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: selectedMode === mode.id ? tokens.colorAccentTeal : tokens.colorTextSecondary,
                }}>
                  {mode.label}
                </span>
                <span style={{
                  fontSize: '9px',
                  color: tokens.colorTextMuted,
                  textAlign: 'center',
                }}>
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          borderTop: `1px solid ${tokens.colorBorderDefault}`,
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '11px',
              fontWeight: 500,
              background: 'transparent',
              border: `1px solid ${tokens.colorBorderDefault}`,
              borderRadius: tokens.radiusSm,
              color: tokens.colorTextSecondary,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedProperty, selectedMode)}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '11px',
              fontWeight: 600,
              background: tokens.colorAccentTeal,
              border: 'none',
              borderRadius: tokens.radiusSm,
              color: '#000',
              cursor: 'pointer',
            }}
          >
            Create Link
          </button>
        </div>
        
        {/* Keyboard hint */}
        <div style={{
          padding: '8px 16px',
          fontSize: '9px',
          color: tokens.colorTextMuted,
          textAlign: 'center',
          borderTop: `1px solid ${tokens.colorBorderDefault}`,
        }}>
          Press <kbd style={{ 
            padding: '2px 4px', 
            background: tokens.colorBgTertiary, 
            borderRadius: '2px',
            fontSize: '8px',
          }}>Enter</kbd> to confirm · <kbd style={{ 
            padding: '2px 4px', 
            background: tokens.colorBgTertiary, 
            borderRadius: '2px',
            fontSize: '8px',
          }}>Esc</kbd> to cancel
        </div>
      </div>
    </>
  );
});

// =============================================================================
// PART 4: DRAG SOURCE HOOK (for LinkBadge)
// =============================================================================

/**
 * useLinkDragSource - Hook for making LinkBadge draggable
 * 
 * Usage in LinkBadge:
 * const { dragHandlers, isDragging } = useLinkDragSource(view);
 * <button {...dragHandlers} className={isDragging ? 'dragging' : ''}>
 */
export function useLinkDragSource(view) {
  const { startDrag, updateDrag, endDrag, cancelDrag, dragState } = useDragLink();
  const [isDragging, setIsDragging] = useState(false);
  const sourceRef = useRef(null);
  
  const handleDragStart = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const startPos = { x: e.clientX, y: e.clientY };
    
    // Set drag image (transparent)
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // Store view ID in drag data
    e.dataTransfer.setData('application/x-cia-view-link', JSON.stringify({
      viewId: view.id,
      viewName: view.name,
      viewColor: view.color,
    }));
    e.dataTransfer.effectAllowed = 'link';
    
    startDrag(view, rect, startPos);
    setIsDragging(true);
  }, [view, startDrag]);
  
  const handleDrag = useCallback((e) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore final drag event
    updateDrag({ x: e.clientX, y: e.clientY }, dragState.targetView, dragState.isValidTarget);
  }, [updateDrag, dragState.targetView, dragState.isValidTarget]);
  
  const handleDragEnd = useCallback((e) => {
    const dropped = e.dataTransfer.dropEffect !== 'none';
    endDrag(dropped, { x: e.clientX, y: e.clientY });
    setIsDragging(false);
  }, [endDrag]);
  
  return {
    dragHandlers: {
      draggable: true,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
    isDragging,
    sourceRef,
  };
}

// =============================================================================
// PART 5: DROP TARGET HOOK (for InstanceCard/ViewItem)
// =============================================================================

/**
 * useLinkDropTarget - Hook for making views drop targets
 * 
 * Usage in InstanceCard:
 * const { dropHandlers, isOver, isValid } = useLinkDropTarget(view, canAcceptLink);
 * <div {...dropHandlers} className={isOver ? (isValid ? 'valid' : 'invalid') : ''}>
 */
export function useLinkDropTarget(view, canAcceptLink) {
  const { updateDrag, dragState } = useDragLink();
  const [isOver, setIsOver] = useState(false);
  
  // Determine if this is a valid drop target
  const isValidTarget = useCallback(() => {
    if (!dragState.sourceView) return false;
    if (dragState.sourceView.id === view.id) return false; // Can't link to self
    if (canAcceptLink && !canAcceptLink(dragState.sourceView, view)) return false;
    return true;
  }, [dragState.sourceView, view, canAcceptLink]);
  
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    const valid = isValidTarget();
    setIsOver(true);
    updateDrag(dragState.currentPosition, view, valid);
  }, [isValidTarget, updateDrag, dragState.currentPosition, view]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    const valid = isValidTarget();
    e.dataTransfer.dropEffect = valid ? 'link' : 'none';
    updateDrag({ x: e.clientX, y: e.clientY }, view, valid);
  }, [isValidTarget, updateDrag, view]);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsOver(false);
    updateDrag(dragState.currentPosition, null, false);
  }, [updateDrag, dragState.currentPosition]);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsOver(false);
    // Drop is handled by DragLinkProvider via endDrag
  }, []);
  
  return {
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    isOver,
    isValid: isOver && isValidTarget(),
  };
}

// =============================================================================
// PART 6: MODIFIER KEY SHORTCUTS
// =============================================================================

/**
 * Modifier key behavior during drag-to-link:
 * 
 * - Default drop: Opens Quick Link Popup (property + mode selection)
 * - Shift+Drop: Link ALL properties with Sync mode
 * - Alt/Option+Drop: Link Camera only with Sync mode (quick camera sync)
 * - Ctrl/Cmd+Drop: Opens full Link Manager panel instead
 */
export function useModifierKeys() {
  const [modifiers, setModifiers] = useState({
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  });
  
  useEffect(() => {
    const handleKeyChange = (e) => {
      setModifiers({
        shift: e.shiftKey,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
      });
    };
    
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, []);
  
  return modifiers;
}

/**
 * Determine link behavior based on modifier keys
 */
export function getLinkBehavior(modifiers) {
  if (modifiers.shift) {
    return {
      type: 'all_properties',
      properties: LINK_PROPERTIES.map(p => p.id),
      mode: 'sync',
      skipPopup: true,
    };
  }
  
  if (modifiers.alt) {
    return {
      type: 'camera_only',
      properties: ['camera'],
      mode: 'sync',
      skipPopup: true,
    };
  }
  
  if (modifiers.ctrl || modifiers.meta) {
    return {
      type: 'open_panel',
      skipPopup: true,
      openPanel: true,
    };
  }
  
  return {
    type: 'default',
    skipPopup: false,
  };
}

// =============================================================================
// PART 7: INTEGRATION EXAMPLE
// =============================================================================

/**
 * Example: Integrating drag-to-link with existing InstanceCard
 * 
 * This shows how to wrap InstanceCard with drag-to-link capabilities.
 */
export const LinkedInstanceCard = memo(function LinkedInstanceCard({
  view,
  canAcceptLink,
  onLinkClick,
  ...instanceCardProps
}) {
  const { dragHandlers, isDragging } = useLinkDragSource(view);
  const { dropHandlers, isOver, isValid } = useLinkDropTarget(view, canAcceptLink);
  
  // Combine class names based on drag/drop state
  const className = [
    instanceCardProps.className,
    isDragging && 'instance-card--dragging',
    isOver && isValid && 'instance-card--drop-target',
    isOver && !isValid && 'instance-card--drop-invalid',
  ].filter(Boolean).join(' ');
  
  return (
    <div {...dropHandlers}>
      {/* 
        In real implementation, this would be the actual InstanceCard.
        The LinkBadge inside would use dragHandlers.
        
        <InstanceCard
          {...instanceCardProps}
          view={view}
          className={className}
          linkBadgeProps={dragHandlers}
          onLinkBadgeClick={onLinkClick}
        />
      */}
      <div 
        className={className}
        style={{
          padding: '12px',
          background: isOver && isValid 
            ? `${tokens.colorAccentTeal}10` 
            : tokens.colorBgTertiary,
          border: `1px solid ${isOver && isValid ? tokens.colorAccentTeal : tokens.colorBorderDefault}`,
          borderRadius: tokens.radiusMd,
          transition: tokens.transitionFast,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: view.color,
          }} />
          <span style={{ color: tokens.colorTextPrimary, fontSize: '12px' }}>
            {view.name}
          </span>
          
          {/* Link Badge with drag handlers */}
          <button
            {...dragHandlers}
            onClick={(e) => { e.stopPropagation(); onLinkClick?.(); }}
            style={{
              marginLeft: 'auto',
              padding: '2px 6px',
              fontSize: '10px',
              background: `${tokens.colorAccentTeal}20`,
              border: `1px solid ${tokens.colorAccentTeal}40`,
              borderRadius: tokens.radiusSm,
              color: tokens.colorAccentTeal,
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isDragging ? 0.5 : 1,
            }}
          >
            🔗 {view.linkCount || 0}
          </button>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// PART 8: USAGE EXAMPLE
// =============================================================================

/**
 * Full usage example showing DragLinkProvider with multiple views
 */
export function DragToLinkDemo() {
  const sampleViews = [
    { id: 'v1', name: 'View of Skull.vtp', color: '#2dd4bf', linkCount: 2 },
    { id: 'v2', name: 'View of Bones.vtp', color: '#4ade80', linkCount: 1 },
    { id: 'v3', name: 'Vessels Analysis', color: '#a78bfa', linkCount: 0 },
    { id: 'v4', name: 'Heart Model', color: '#f472b6', linkCount: 0 },
  ];
  
  const handleCreateLink = (sourceId, targetId, property, mode) => {
    console.log('Creating link:', { sourceId, targetId, property, mode });
    // Call ViewConfigurationManager.linkProperty() here
  };
  
  return (
    <DragLinkProvider onCreateLink={handleCreateLink}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        padding: '20px',
        background: '#030303',
        minHeight: '400px',
      }}>
        {sampleViews.map(view => (
          <LinkedInstanceCard
            key={view.id}
            view={view}
            canAcceptLink={(source, target) => source.id !== target.id}
            onLinkClick={() => console.log('Open link panel for:', view.id)}
          />
        ))}
      </div>
    </DragLinkProvider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DragLinkOverlay,
  QuickLinkPopup,
  LINK_PROPERTIES,
  LINK_MODES,
};

export default {
  DragLinkProvider,
  useDragLink,
  useLinkDragSource,
  useLinkDropTarget,
  useModifierKeys,
  getLinkBehavior,
  LinkedInstanceCard,
};
