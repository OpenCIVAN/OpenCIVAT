/**
 * VR Floating Panel System
 * 
 * Extends the existing FloatingPanel system to work in VR environments.
 * Panels can exist in 3D space with multiple positioning modes.
 * 
 * Positioning Modes:
 * - HUD: Fixed to user's view (follows head rotation)
 * - WORLD: Locked to world position (stays in place)
 * - HAND: Attached near controller (easy access)
 * - DASHBOARD: Curved arrangement around user
 * 
 * VR Interactions:
 * - Grip to grab and move panels
 * - Thumbstick to resize when grabbed
 * - Trigger to interact with panel contents
 * - B button to dismiss/minimize
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
  createContext,
  useContext,
} from 'react';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

/**
 * Panel positioning modes in VR
 */
export const VR_PANEL_MODES = {
  /** Fixed to user's view, follows head rotation */
  HUD: 'hud',
  /** Locked to world position, stays in place */
  WORLD: 'world',
  /** Attached near a controller */
  HAND: 'hand',
  /** Arranged in curved dashboard around user */
  DASHBOARD: 'dashboard',
};

/**
 * Predefined snap positions for panels
 */
export const VR_SNAP_POSITIONS = {
  // HUD positions (relative to head)
  HUD_CENTER: { mode: 'hud', offset: { x: 0, y: 0, z: -0.8 } },
  HUD_LEFT: { mode: 'hud', offset: { x: -0.4, y: 0, z: -0.7 } },
  HUD_RIGHT: { mode: 'hud', offset: { x: 0.4, y: 0, z: -0.7 } },
  HUD_TOP: { mode: 'hud', offset: { x: 0, y: 0.3, z: -0.8 } },
  HUD_BOTTOM: { mode: 'hud', offset: { x: 0, y: -0.3, z: -0.8 } },
  
  // Hand positions (relative to controller)
  LEFT_WRIST: { mode: 'hand', hand: 'left', offset: { x: 0, y: 0.1, z: 0 } },
  RIGHT_WRIST: { mode: 'hand', hand: 'right', offset: { x: 0, y: 0.1, z: 0 } },
  
  // Dashboard arc positions (world space, arranged around user)
  DASHBOARD_LEFT: { mode: 'dashboard', angle: -45, distance: 1.2, height: 1.2 },
  DASHBOARD_CENTER: { mode: 'dashboard', angle: 0, distance: 1.0, height: 1.4 },
  DASHBOARD_RIGHT: { mode: 'dashboard', angle: 45, distance: 1.2, height: 1.2 },
};

/**
 * Panel size presets for VR (in meters)
 */
export const VR_PANEL_SIZES = {
  SMALL: { width: 0.3, height: 0.25 },
  MEDIUM: { width: 0.45, height: 0.35 },
  LARGE: { width: 0.6, height: 0.5 },
  WIDE: { width: 0.7, height: 0.35 },
  TALL: { width: 0.35, height: 0.6 },
};

// Design tokens
const tokens = {
  // Colors
  bgPanel: 'rgba(12, 18, 32, 0.95)',
  bgHeader: 'rgba(0, 0, 0, 0.4)',
  borderDefault: 'rgba(255, 255, 255, 0.15)',
  borderActive: 'rgba(45, 212, 191, 0.6)',
  accent: '#2dd4bf',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  // VR-specific
  grabHighlight: 'rgba(45, 212, 191, 0.3)',
  snapIndicator: '#fbbf24',
  
  // Dimensions (screen pixels for 2D fallback)
  minTouchTarget: 44,
  headerHeight: 48,
  controlButtonSize: 40,
  
  // 3D dimensions (meters)
  panelDepth: 0.02,
  grabHandleWidth: 0.08,
  cornerRadius: 0.01,
};

// =============================================================================
// PART 1: VR PANEL CONTEXT
// Extends FloatingPanelContext with VR-specific state
// =============================================================================

const VRPanelContext = createContext(null);

/**
 * VRPanelProvider - Manages VR panel state
 * 
 * Works alongside existing FloatingPanelContext.
 * In VR mode, panels use 3D positioning.
 * In desktop mode, falls back to standard 2D positioning.
 */
export function VRPanelProvider({ children, isVR = false }) {
  // Panel 3D states: Map<panelId, VRPanelState>
  const [vrPanelStates, setVRPanelStates] = useState(new Map());
  
  // Currently grabbed panel
  const [grabbedPanel, setGrabbedPanel] = useState(null);
  
  // Active snap zone (for visual feedback)
  const [activeSnapZone, setActiveSnapZone] = useState(null);
  
  // Panel arrangement mode
  const [arrangementMode, setArrangementMode] = useState('free'); // 'free' | 'dashboard' | 'stacked'
  
  /**
   * Set VR state for a panel
   */
  const setVRPanelState = useCallback((panelId, state) => {
    setVRPanelStates(prev => {
      const next = new Map(prev);
      next.set(panelId, { ...next.get(panelId), ...state });
      return next;
    });
  }, []);
  
  /**
   * Get VR state for a panel
   */
  const getVRPanelState = useCallback((panelId) => {
    return vrPanelStates.get(panelId) || getDefaultVRState(panelId);
  }, [vrPanelStates]);
  
  /**
   * Initialize a panel for VR
   */
  const initializeVRPanel = useCallback((panelId, options = {}) => {
    const defaultState = getDefaultVRState(panelId);
    setVRPanelStates(prev => {
      const next = new Map(prev);
      next.set(panelId, {
        ...defaultState,
        ...options,
        initialized: true,
      });
      return next;
    });
  }, []);
  
  /**
   * Start grabbing a panel
   */
  const startGrab = useCallback((panelId, controllerId, grabPoint) => {
    setGrabbedPanel({
      panelId,
      controllerId,
      grabPoint,
      startTime: Date.now(),
    });
  }, []);
  
  /**
   * Update grabbed panel position
   */
  const updateGrab = useCallback((controllerPosition, controllerRotation) => {
    if (!grabbedPanel) return;
    
    // Calculate new panel position based on controller movement
    // This would use actual WebXR controller data
    setVRPanelStates(prev => {
      const next = new Map(prev);
      const panel = next.get(grabbedPanel.panelId);
      if (panel) {
        next.set(grabbedPanel.panelId, {
          ...panel,
          position: controllerPosition,
          rotation: controllerRotation,
          mode: VR_PANEL_MODES.WORLD, // Grabbed panels become world-locked
        });
      }
      return next;
    });
    
    // Check for snap zones
    const snapZone = detectSnapZone(controllerPosition);
    setActiveSnapZone(snapZone);
  }, [grabbedPanel]);
  
  /**
   * End grab and optionally snap to zone
   */
  const endGrab = useCallback((snapToZone = true) => {
    if (!grabbedPanel) return;
    
    if (snapToZone && activeSnapZone) {
      // Snap panel to the detected zone
      const snapPosition = getSnapPosition(activeSnapZone);
      setVRPanelStates(prev => {
        const next = new Map(prev);
        const panel = next.get(grabbedPanel.panelId);
        if (panel) {
          next.set(grabbedPanel.panelId, {
            ...panel,
            ...snapPosition,
            snappedTo: activeSnapZone,
          });
        }
        return next;
      });
    }
    
    setGrabbedPanel(null);
    setActiveSnapZone(null);
  }, [grabbedPanel, activeSnapZone]);
  
  /**
   * Move panel to a specific snap position
   */
  const snapPanelTo = useCallback((panelId, snapPosition) => {
    const position = VR_SNAP_POSITIONS[snapPosition];
    if (!position) return;
    
    setVRPanelStates(prev => {
      const next = new Map(prev);
      const panel = next.get(panelId);
      if (panel) {
        next.set(panelId, {
          ...panel,
          ...position,
          snappedTo: snapPosition,
        });
      }
      return next;
    });
  }, []);
  
  /**
   * Resize panel via thumbstick
   */
  const resizePanel = useCallback((panelId, delta) => {
    setVRPanelStates(prev => {
      const next = new Map(prev);
      const panel = next.get(panelId);
      if (panel) {
        const newWidth = Math.max(0.2, Math.min(1.0, panel.width + delta.x * 0.01));
        const newHeight = Math.max(0.15, Math.min(0.8, panel.height + delta.y * 0.01));
        next.set(panelId, {
          ...panel,
          width: newWidth,
          height: newHeight,
        });
      }
      return next;
    });
  }, []);
  
  /**
   * Arrange all panels in dashboard mode
   */
  const arrangeDashboard = useCallback(() => {
    const panelIds = Array.from(vrPanelStates.keys());
    const positions = ['DASHBOARD_LEFT', 'DASHBOARD_CENTER', 'DASHBOARD_RIGHT'];
    
    panelIds.forEach((panelId, index) => {
      if (index < positions.length) {
        snapPanelTo(panelId, positions[index]);
      }
    });
    
    setArrangementMode('dashboard');
  }, [vrPanelStates, snapPanelTo]);
  
  /**
   * Stack all panels at center
   */
  const stackPanels = useCallback(() => {
    const panelIds = Array.from(vrPanelStates.keys());
    
    panelIds.forEach((panelId, index) => {
      setVRPanelStates(prev => {
        const next = new Map(prev);
        const panel = next.get(panelId);
        if (panel) {
          next.set(panelId, {
            ...panel,
            mode: VR_PANEL_MODES.HUD,
            offset: { x: 0, y: 0, z: -0.8 - (index * 0.05) },
            snappedTo: null,
          });
        }
        return next;
      });
    });
    
    setArrangementMode('stacked');
  }, [vrPanelStates]);
  
  const contextValue = {
    isVR,
    vrPanelStates,
    getVRPanelState,
    setVRPanelState,
    initializeVRPanel,
    grabbedPanel,
    startGrab,
    updateGrab,
    endGrab,
    activeSnapZone,
    snapPanelTo,
    resizePanel,
    arrangementMode,
    arrangeDashboard,
    stackPanels,
  };
  
  return (
    <VRPanelContext.Provider value={contextValue}>
      {children}
    </VRPanelContext.Provider>
  );
}

export function useVRPanels() {
  const context = useContext(VRPanelContext);
  if (!context) {
    throw new Error('useVRPanels must be used within VRPanelProvider');
  }
  return context;
}

// Helper to get default VR state for a panel
function getDefaultVRState(panelId) {
  return {
    panelId,
    mode: VR_PANEL_MODES.HUD,
    position: { x: 0, y: 0, z: -0.8 },
    rotation: { x: 0, y: 0, z: 0 },
    offset: { x: 0, y: 0, z: -0.8 },
    width: VR_PANEL_SIZES.MEDIUM.width,
    height: VR_PANEL_SIZES.MEDIUM.height,
    scale: 1,
    opacity: 1,
    minimized: false,
    snappedTo: null,
    initialized: false,
  };
}

// Detect if position is near a snap zone
function detectSnapZone(position) {
  // This would check actual 3D positions
  // For now, return null (no snap)
  return null;
}

// Get 3D position for a snap zone
function getSnapPosition(snapZone) {
  return VR_SNAP_POSITIONS[snapZone] || VR_SNAP_POSITIONS.HUD_CENTER;
}

// =============================================================================
// PART 2: VR FLOATING PANEL COMPONENT
// The actual panel rendered in VR
// =============================================================================

/**
 * VRFloatingPanel - Panel component for VR environments
 * 
 * Renders as a 3D object in VR space.
 * In desktop fallback, renders as standard floating panel.
 * 
 * Features:
 * - Grabbable header for repositioning
 * - Resize handles
 * - Snap zones with visual feedback
 * - Minimize/maximize
 * - Mode switching (HUD/World/Hand)
 */
export const VRFloatingPanel = memo(function VRFloatingPanel({
  panelId,
  title,
  icon,
  color = 'blue',
  children,
  initialMode = VR_PANEL_MODES.HUD,
  initialSize = 'MEDIUM',
  onClose,
  onMinimize,
}) {
  const { 
    isVR,
    getVRPanelState, 
    initializeVRPanel,
    grabbedPanel,
    startGrab,
    endGrab,
    snapPanelTo,
  } = useVRPanels();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  
  const panelState = getVRPanelState(panelId);
  const isGrabbed = grabbedPanel?.panelId === panelId;
  
  // Initialize panel on mount
  useEffect(() => {
    if (!panelState.initialized) {
      const size = VR_PANEL_SIZES[initialSize] || VR_PANEL_SIZES.MEDIUM;
      initializeVRPanel(panelId, {
        mode: initialMode,
        ...size,
      });
    }
  }, [panelId, panelState.initialized, initialMode, initialSize, initializeVRPanel]);
  
  // Handle grab start
  const handleGrabStart = useCallback((e) => {
    if (!isVR) return; // Desktop uses standard drag
    
    // In actual VR, this would use controller data
    startGrab(panelId, 'right', { x: 0, y: 0, z: 0 });
  }, [isVR, panelId, startGrab]);
  
  // Handle grab end
  const handleGrabEnd = useCallback(() => {
    if (!isVR) return;
    endGrab(true);
  }, [isVR, endGrab]);
  
  // Mode switch handler
  const handleModeSwitch = useCallback((mode) => {
    const { setVRPanelState } = useVRPanels();
    setVRPanelState(panelId, { mode });
    setShowModeMenu(false);
  }, [panelId]);
  
  // For desktop fallback, delegate to existing FloatingPanel
  if (!isVR) {
    return (
      <DesktopFallbackPanel
        panelId={panelId}
        title={title}
        icon={icon}
        color={color}
        onClose={onClose}
      >
        {children}
      </DesktopFallbackPanel>
    );
  }
  
  // VR Panel render
  return (
    <div
      className={`vr-floating-panel ${isGrabbed ? 'vr-floating-panel--grabbed' : ''}`}
      data-panel-id={panelId}
      data-mode={panelState.mode}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        // In actual VR, position would be handled by WebXR/Three.js
        // This CSS is for 2D preview/testing
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${panelState.width * 1000}px`, // Convert meters to pixels for preview
        background: tokens.bgPanel,
        border: `2px solid ${isGrabbed ? tokens.borderActive : tokens.borderDefault}`,
        borderRadius: '12px',
        boxShadow: isGrabbed 
          ? `0 0 40px ${tokens.accent}40`
          : '0 8px 32px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        transition: isGrabbed ? 'none' : '0.2s ease',
      }}
    >
      {/* Header with grab handle */}
      <VRPanelHeader
        title={title}
        icon={icon}
        color={color}
        isGrabbed={isGrabbed}
        mode={panelState.mode}
        onGrabStart={handleGrabStart}
        onGrabEnd={handleGrabEnd}
        onModeClick={() => setShowModeMenu(!showModeMenu)}
        onSnapClick={() => setShowSnapMenu(!showSnapMenu)}
        onMinimize={onMinimize}
        onClose={onClose}
      />
      
      {/* Mode selection menu */}
      {showModeMenu && (
        <VRPanelModeMenu
          currentMode={panelState.mode}
          onSelect={handleModeSwitch}
          onClose={() => setShowModeMenu(false)}
        />
      )}
      
      {/* Snap position menu */}
      {showSnapMenu && (
        <VRPanelSnapMenu
          panelId={panelId}
          currentSnap={panelState.snappedTo}
          onSelect={(snap) => {
            snapPanelTo(panelId, snap);
            setShowSnapMenu(false);
          }}
          onClose={() => setShowSnapMenu(false)}
        />
      )}
      
      {/* Content */}
      {!panelState.minimized && (
        <div 
          className="vr-floating-panel__content"
          style={{
            padding: '16px',
            maxHeight: `${panelState.height * 1000 - 60}px`,
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
      )}
      
      {/* Grab indicator when hovering header in VR */}
      {isHovered && !isGrabbed && (
        <div style={{
          position: 'absolute',
          top: tokens.headerHeight + 4,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 12px',
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          fontSize: '10px',
          color: tokens.textMuted,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          Grip to move • Thumbstick to resize
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 3: VR PANEL HEADER
// Grabbable header with controls
// =============================================================================

const VRPanelHeader = memo(function VRPanelHeader({
  title,
  icon,
  color,
  isGrabbed,
  mode,
  onGrabStart,
  onGrabEnd,
  onModeClick,
  onSnapClick,
  onMinimize,
  onClose,
}) {
  // Mode icons
  const modeIcons = {
    [VR_PANEL_MODES.HUD]: '👁',
    [VR_PANEL_MODES.WORLD]: '🌍',
    [VR_PANEL_MODES.HAND]: '✋',
    [VR_PANEL_MODES.DASHBOARD]: '📊',
  };
  
  return (
    <div
      className="vr-panel-header"
      onPointerDown={onGrabStart}
      onPointerUp={onGrabEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        height: tokens.headerHeight,
        padding: '0 12px',
        background: isGrabbed ? tokens.grabHighlight : tokens.bgHeader,
        borderBottom: `1px solid ${tokens.borderDefault}`,
        cursor: isGrabbed ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: '0.15s ease',
      }}
    >
      {/* Grab handle indicator */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        opacity: 0.4,
      }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff' }} />
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff' }} />
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>
      
      {/* Icon */}
      {icon && (
        <span style={{ fontSize: '16px' }}>{icon}</span>
      )}
      
      {/* Title */}
      <span style={{
        flex: 1,
        fontSize: '13px',
        fontWeight: 600,
        color: tokens.textPrimary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      
      {/* Mode indicator button */}
      <button
        onClick={(e) => { e.stopPropagation(); onModeClick?.(); }}
        title={`Mode: ${mode}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tokens.controlButtonSize,
          height: tokens.controlButtonSize - 8,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        {modeIcons[mode] || '📍'}
      </button>
      
      {/* Snap button */}
      <button
        onClick={(e) => { e.stopPropagation(); onSnapClick?.(); }}
        title="Snap to position"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tokens.controlButtonSize,
          height: tokens.controlButtonSize - 8,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        📌
      </button>
      
      {/* Minimize button */}
      <button
        onClick={(e) => { e.stopPropagation(); onMinimize?.(); }}
        title="Minimize"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tokens.controlButtonSize,
          height: tokens.controlButtonSize - 8,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        ➖
      </button>
      
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose?.(); }}
        title="Close"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tokens.controlButtonSize,
          height: tokens.controlButtonSize - 8,
          background: 'rgba(248, 113, 113, 0.2)',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
});

// =============================================================================
// PART 4: VR PANEL MODE MENU
// Switch between HUD/World/Hand modes
// =============================================================================

const VRPanelModeMenu = memo(function VRPanelModeMenu({
  currentMode,
  onSelect,
  onClose,
}) {
  const modes = [
    { 
      id: VR_PANEL_MODES.HUD, 
      icon: '👁', 
      label: 'HUD Mode', 
      desc: 'Follows your view' 
    },
    { 
      id: VR_PANEL_MODES.WORLD, 
      icon: '🌍', 
      label: 'World Mode', 
      desc: 'Fixed in space' 
    },
    { 
      id: VR_PANEL_MODES.HAND, 
      icon: '✋', 
      label: 'Hand Mode', 
      desc: 'Near your controller' 
    },
    { 
      id: VR_PANEL_MODES.DASHBOARD, 
      icon: '📊', 
      label: 'Dashboard', 
      desc: 'Curved arrangement' 
    },
  ];
  
  return (
    <div
      className="vr-panel-mode-menu"
      style={{
        position: 'absolute',
        top: tokens.headerHeight,
        right: 100,
        width: '200px',
        background: tokens.bgPanel,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderDefault}`,
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: tokens.textMuted,
      }}>
        Panel Mode
      </div>
      
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onSelect(mode.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px',
            background: currentMode === mode.id 
              ? `${tokens.accent}20`
              : 'transparent',
            border: 'none',
            borderLeft: currentMode === mode.id 
              ? `3px solid ${tokens.accent}`
              : '3px solid transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: '0.15s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>{mode.icon}</span>
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: currentMode === mode.id ? tokens.accent : tokens.textPrimary,
            }}>
              {mode.label}
            </div>
            <div style={{
              fontSize: '10px',
              color: tokens.textMuted,
            }}>
              {mode.desc}
            </div>
          </div>
        </button>
      ))}
      
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${tokens.borderDefault}`,
        fontSize: '9px',
        color: tokens.textMuted,
        textAlign: 'center',
      }}>
        Grip + move to reposition
      </div>
    </div>
  );
});

// =============================================================================
// PART 5: VR PANEL SNAP MENU
// Quick snap to predefined positions
// =============================================================================

const VRPanelSnapMenu = memo(function VRPanelSnapMenu({
  panelId,
  currentSnap,
  onSelect,
  onClose,
}) {
  const snapGroups = [
    {
      label: 'HUD Positions',
      snaps: [
        { id: 'HUD_CENTER', label: 'Center', icon: '⬤' },
        { id: 'HUD_LEFT', label: 'Left', icon: '◀' },
        { id: 'HUD_RIGHT', label: 'Right', icon: '▶' },
        { id: 'HUD_TOP', label: 'Top', icon: '▲' },
        { id: 'HUD_BOTTOM', label: 'Bottom', icon: '▼' },
      ],
    },
    {
      label: 'Hand Positions',
      snaps: [
        { id: 'LEFT_WRIST', label: 'Left Wrist', icon: '🤚' },
        { id: 'RIGHT_WRIST', label: 'Right Wrist', icon: '✋' },
      ],
    },
    {
      label: 'Dashboard',
      snaps: [
        { id: 'DASHBOARD_LEFT', label: 'Left Arc', icon: '↙' },
        { id: 'DASHBOARD_CENTER', label: 'Center Arc', icon: '↓' },
        { id: 'DASHBOARD_RIGHT', label: 'Right Arc', icon: '↘' },
      ],
    },
  ];
  
  return (
    <div
      className="vr-panel-snap-menu"
      style={{
        position: 'absolute',
        top: tokens.headerHeight,
        right: 60,
        width: '220px',
        background: tokens.bgPanel,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderDefault}`,
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: tokens.textMuted,
      }}>
        Snap to Position
      </div>
      
      {snapGroups.map(group => (
        <div key={group.label}>
          <div style={{
            padding: '6px 12px',
            fontSize: '9px',
            fontWeight: 600,
            color: tokens.textMuted,
            background: 'rgba(0, 0, 0, 0.2)',
          }}>
            {group.label}
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
            gap: '4px',
            padding: '8px',
          }}>
            {group.snaps.map(snap => (
              <button
                key={snap.id}
                onClick={() => onSelect(snap.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px',
                  minHeight: tokens.minTouchTarget,
                  background: currentSnap === snap.id 
                    ? `${tokens.accent}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${currentSnap === snap.id 
                    ? tokens.accent 
                    : 'transparent'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: '0.15s ease',
                }}
              >
                <span style={{ fontSize: '16px' }}>{snap.icon}</span>
                <span style={{
                  fontSize: '8px',
                  color: currentSnap === snap.id ? tokens.accent : tokens.textMuted,
                  textAlign: 'center',
                }}>
                  {snap.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

// =============================================================================
// PART 6: VR PANEL ARRANGEMENT CONTROLS
// Global controls for arranging multiple panels
// =============================================================================

/**
 * VRPanelArrangementControls - Controls for arranging all panels
 * 
 * Appears as a small floating toolbar in VR.
 */
export const VRPanelArrangementControls = memo(function VRPanelArrangementControls() {
  const { arrangementMode, arrangeDashboard, stackPanels, vrPanelStates } = useVRPanels();
  
  const panelCount = vrPanelStates.size;
  
  if (panelCount < 2) return null; // Only show when multiple panels
  
  return (
    <div
      className="vr-panel-arrangement"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        padding: '8px 12px',
        background: tokens.bgPanel,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      <span style={{
        fontSize: '11px',
        color: tokens.textMuted,
        alignSelf: 'center',
        marginRight: '8px',
      }}>
        {panelCount} panels
      </span>
      
      <button
        onClick={arrangeDashboard}
        title="Arrange as dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: arrangementMode === 'dashboard' 
            ? `${tokens.accent}20`
            : 'rgba(255, 255, 255, 0.1)',
          border: `1px solid ${arrangementMode === 'dashboard' 
            ? tokens.accent 
            : 'transparent'}`,
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: 500,
          color: arrangementMode === 'dashboard' ? tokens.accent : tokens.textPrimary,
          cursor: 'pointer',
        }}
      >
        📊 Dashboard
      </button>
      
      <button
        onClick={stackPanels}
        title="Stack at center"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: arrangementMode === 'stacked' 
            ? `${tokens.accent}20`
            : 'rgba(255, 255, 255, 0.1)',
          border: `1px solid ${arrangementMode === 'stacked' 
            ? tokens.accent 
            : 'transparent'}`,
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: 500,
          color: arrangementMode === 'stacked' ? tokens.accent : tokens.textPrimary,
          cursor: 'pointer',
        }}
      >
        📚 Stack
      </button>
    </div>
  );
});

// =============================================================================
// PART 7: DESKTOP FALLBACK
// Renders standard 2D panel when not in VR
// =============================================================================

const DesktopFallbackPanel = memo(function DesktopFallbackPanel({
  panelId,
  title,
  icon,
  color,
  onClose,
  children,
}) {
  // This would integrate with existing FloatingPanel/FloatingPanelContext
  // For now, render a simple panel
  
  return (
    <div
      className="desktop-fallback-panel"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        maxHeight: '80vh',
        background: tokens.bgPanel,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        background: tokens.bgHeader,
        borderBottom: `1px solid ${tokens.borderDefault}`,
      }}>
        {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
        <span style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 600,
          color: tokens.textPrimary,
        }}>
          {title}
        </span>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      
      {/* Content */}
      <div style={{
        padding: '16px',
        overflowY: 'auto',
        maxHeight: 'calc(80vh - 50px)',
      }}>
        {children}
      </div>
    </div>
  );
});

// =============================================================================
// PART 8: VR CONTROLLER INTEGRATION
// Hooks for handling VR controller input on panels
// =============================================================================

/**
 * useVRPanelController - Hook for handling controller input on panels
 * 
 * Integrates with WebXR to handle:
 * - Grip to grab
 * - Thumbstick to resize
 * - Trigger to interact
 * - B button to close
 */
export function useVRPanelController(panelId) {
  const { 
    isVR,
    grabbedPanel, 
    startGrab, 
    updateGrab, 
    endGrab,
    resizePanel,
  } = useVRPanels();
  
  const isGrabbed = grabbedPanel?.panelId === panelId;
  
  // This would integrate with actual WebXR controller events
  // Placeholder implementation for design spec
  
  useEffect(() => {
    if (!isVR) return;
    
    const handleControllerInput = (event) => {
      // Handle grip
      if (event.type === 'grip' && event.pressed) {
        if (event.target === panelId && !isGrabbed) {
          startGrab(panelId, event.controllerId, event.position);
        }
      }
      
      if (event.type === 'grip' && !event.pressed) {
        if (isGrabbed) {
          endGrab(true);
        }
      }
      
      // Handle thumbstick for resize while grabbed
      if (event.type === 'thumbstick' && isGrabbed) {
        resizePanel(panelId, { x: event.x, y: event.y });
      }
    };
    
    // Would subscribe to XR controller events
    // window.addEventListener('xr-controller-input', handleControllerInput);
    
    return () => {
      // window.removeEventListener('xr-controller-input', handleControllerInput);
    };
  }, [isVR, panelId, isGrabbed, startGrab, updateGrab, endGrab, resizePanel]);
  
  return {
    isGrabbed,
  };
}

// =============================================================================
// PART 9: USAGE EXAMPLE
// =============================================================================

/**
 * Example showing VR panel usage
 */
export function VRPanelExample() {
  const [panels, setPanels] = useState([
    { id: 'links', title: 'View Links', icon: '🔗' },
    { id: 'users', title: 'Following', icon: '👥' },
  ]);
  
  const handleClosePanel = (panelId) => {
    setPanels(prev => prev.filter(p => p.id !== panelId));
  };
  
  return (
    <VRPanelProvider isVR={true}>
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#030303',
        position: 'relative',
      }}>
        {/* Panels */}
        {panels.map(panel => (
          <VRFloatingPanel
            key={panel.id}
            panelId={panel.id}
            title={panel.title}
            icon={panel.icon}
            onClose={() => handleClosePanel(panel.id)}
          >
            <div style={{ color: '#fff', fontSize: '12px' }}>
              Panel content for {panel.title}
            </div>
          </VRFloatingPanel>
        ))}
        
        {/* Arrangement controls */}
        <VRPanelArrangementControls />
      </div>
    </VRPanelProvider>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  tokens as VR_PANEL_TOKENS,
};

export default {
  VRPanelProvider,
  useVRPanels,
  VRFloatingPanel,
  VRPanelArrangementControls,
  useVRPanelController,
  VR_PANEL_MODES,
  VR_SNAP_POSITIONS,
  VR_PANEL_SIZES,
};
