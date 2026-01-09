/**
 * VR Interaction Patterns - Drag-and-Drop Alternatives
 * 
 * This document defines a unified interaction system that works across
 * both desktop (mouse/keyboard) and VR (controllers/hand tracking).
 * 
 * PROBLEM:
 * Drag-and-drop is a desktop-native pattern that doesn't translate to VR:
 * - No mouse cursor in VR
 * - Controller ray-casting is imprecise for small targets
 * - Holding grip while moving is fatiguing
 * - Users can't see their keyboard for modifier keys
 * 
 * SOLUTION:
 * Abstract interactions into "intents" that can be fulfilled by
 * different input methods depending on the platform.
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
// PART 1: INTERACTION TAXONOMY
// =============================================================================

/**
 * All drag-and-drop operations in the app can be categorized into these intents:
 * 
 * | Intent          | Desktop Pattern        | VR Alternative              |
 * |-----------------|------------------------|-----------------------------|
 * | LINK            | Drag badge to target   | Select source → Select target |
 * | REORDER         | Drag item in list      | Select item → Up/Down buttons |
 * | MOVE            | Drag window/panel      | Grip + move controller      |
 * | RESIZE          | Drag edge/corner       | Select edge → Thumbstick    |
 * | TRANSFER        | Drag between containers| Select → Context menu → Move to |
 * | SELECT_REGION   | Drag marquee           | Point corners / Radial select |
 * | PAN             | Drag canvas            | Thumbstick / Grip + move    |
 * | FILE_DROP       | Drag from OS           | File browser panel          |
 */

export const INTERACTION_INTENTS = {
  LINK: 'link',           // Connect two items
  REORDER: 'reorder',     // Change order in a list
  MOVE: 'move',           // Reposition an element
  RESIZE: 'resize',       // Change size of an element
  TRANSFER: 'transfer',   // Move item between containers
  SELECT_REGION: 'select_region', // Select multiple items
  PAN: 'pan',             // Pan/scroll the view
  FILE_DROP: 'file_drop', // Import files
};

/**
 * Input modes available
 */
export const INPUT_MODES = {
  DESKTOP: 'desktop',     // Mouse + keyboard
  VR_CONTROLLER: 'vr_controller', // VR hand controllers
  VR_HAND: 'vr_hand',     // Hand tracking (no controllers)
  TOUCH: 'touch',         // Tablet/touch screen
};

// =============================================================================
// PART 2: UNIFIED INTERACTION CONTEXT
// =============================================================================

const InteractionContext = createContext(null);

/**
 * InteractionProvider - Manages cross-platform interaction state
 * 
 * Provides:
 * - Current input mode detection
 * - Active interaction tracking
 * - Platform-appropriate handlers
 * 
 * Usage:
 * <InteractionProvider>
 *   <App />
 * </InteractionProvider>
 */
export function InteractionProvider({ children }) {
  // Current input mode (detected from environment)
  const [inputMode, setInputMode] = useState(INPUT_MODES.DESKTOP);
  
  // Active interaction state
  const [activeInteraction, setActiveInteraction] = useState(null);
  // Shape: { intent, source, sourceData, step, startTime }
  
  // Selection state for two-step interactions
  const [selection, setSelection] = useState(null);
  // Shape: { type, id, data }
  
  // Detect input mode
  useEffect(() => {
    const detectInputMode = () => {
      // Check for WebXR session
      if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then(supported => {
          // Only switch to VR mode when actually in XR session
          // This would be set by the XR session start handler
        });
      }
      
      // Check for touch
      if ('ontouchstart' in window && window.matchMedia('(pointer: coarse)').matches) {
        setInputMode(INPUT_MODES.TOUCH);
        return;
      }
      
      setInputMode(INPUT_MODES.DESKTOP);
    };
    
    detectInputMode();
  }, []);
  
  // Start an interaction
  const startInteraction = useCallback((intent, source, sourceData) => {
    setActiveInteraction({
      intent,
      source,
      sourceData,
      step: 1,
      startTime: Date.now(),
    });
  }, []);
  
  // Complete/cancel an interaction
  const endInteraction = useCallback(() => {
    setActiveInteraction(null);
  }, []);
  
  // Update interaction step
  const advanceInteraction = useCallback((step, additionalData) => {
    setActiveInteraction(prev => prev ? {
      ...prev,
      ...additionalData,
      step,
    } : null);
  }, []);
  
  // Select an item (for two-step operations)
  const select = useCallback((type, id, data) => {
    setSelection({ type, id, data });
  }, []);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);
  
  // Set VR mode (called by XR session manager)
  const setVRMode = useCallback((isVR, hasControllers = true) => {
    if (isVR) {
      setInputMode(hasControllers ? INPUT_MODES.VR_CONTROLLER : INPUT_MODES.VR_HAND);
    } else {
      setInputMode(INPUT_MODES.DESKTOP);
    }
  }, []);
  
  // Check if we're in VR
  const isVR = inputMode === INPUT_MODES.VR_CONTROLLER || inputMode === INPUT_MODES.VR_HAND;
  
  const contextValue = {
    inputMode,
    isVR,
    setVRMode,
    activeInteraction,
    startInteraction,
    endInteraction,
    advanceInteraction,
    selection,
    select,
    clearSelection,
  };
  
  return (
    <InteractionContext.Provider value={contextValue}>
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within InteractionProvider');
  }
  return context;
}

// =============================================================================
// PART 3: PLATFORM-ADAPTIVE HOOKS
// =============================================================================

/**
 * useLinkInteraction - Unified hook for linking views
 * 
 * Desktop: Drag badge → Drop on target
 * VR: Select source → Select target → Confirm
 * 
 * Usage:
 * const { 
 *   sourceHandlers,   // Apply to source element
 *   targetHandlers,   // Apply to potential targets
 *   isLinking,        // Currently in link operation
 *   linkSource,       // The source being linked
 * } = useLinkInteraction({
 *   onLink: (sourceId, targetId) => { ... }
 * });
 */
export function useLinkInteraction({ onLink, onCancel }) {
  const { inputMode, isVR, activeInteraction, startInteraction, endInteraction, advanceInteraction } = useInteraction();
  
  const isLinking = activeInteraction?.intent === INTERACTION_INTENTS.LINK;
  const linkSource = isLinking ? activeInteraction.sourceData : null;
  const linkStep = isLinking ? activeInteraction.step : 0;
  
  // Desktop: Drag handlers
  const createDesktopSourceHandlers = useCallback((sourceId, sourceData) => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData('application/x-cia-link', JSON.stringify({ sourceId, ...sourceData }));
      e.dataTransfer.effectAllowed = 'link';
      startInteraction(INTERACTION_INTENTS.LINK, sourceId, sourceData);
    },
    onDragEnd: () => {
      endInteraction();
    },
  }), [startInteraction, endInteraction]);
  
  const createDesktopTargetHandlers = useCallback((targetId, canAccept) => ({
    onDragOver: (e) => {
      if (canAccept && canAccept(linkSource)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
      }
    },
    onDrop: (e) => {
      e.preventDefault();
      if (canAccept && canAccept(linkSource)) {
        onLink?.(linkSource?.sourceId, targetId);
      }
      endInteraction();
    },
  }), [linkSource, onLink, endInteraction]);
  
  // VR: Two-step select handlers
  const createVRSourceHandlers = useCallback((sourceId, sourceData) => ({
    onClick: () => {
      if (!isLinking) {
        // Start link operation
        startInteraction(INTERACTION_INTENTS.LINK, sourceId, sourceData);
      } else if (linkSource?.sourceId === sourceId) {
        // Clicking same source cancels
        endInteraction();
        onCancel?.();
      }
    },
    // Visual feedback
    'data-link-source': true,
    'data-link-active': linkSource?.sourceId === sourceId,
  }), [isLinking, linkSource, startInteraction, endInteraction, onCancel]);
  
  const createVRTargetHandlers = useCallback((targetId, canAccept) => ({
    onClick: () => {
      if (isLinking && linkStep === 1) {
        if (canAccept && canAccept(linkSource) && targetId !== linkSource?.sourceId) {
          // Valid target selected - advance to confirmation or complete
          advanceInteraction(2, { targetId });
          // For simplicity, complete immediately (could show confirmation UI)
          onLink?.(linkSource?.sourceId, targetId);
          endInteraction();
        }
      }
    },
    // Visual feedback
    'data-link-target': true,
    'data-link-valid': isLinking && canAccept?.(linkSource) && targetId !== linkSource?.sourceId,
  }), [isLinking, linkStep, linkSource, advanceInteraction, onLink, endInteraction]);
  
  // Return platform-appropriate handlers
  const createSourceHandlers = isVR ? createVRSourceHandlers : createDesktopSourceHandlers;
  const createTargetHandlers = isVR ? createVRTargetHandlers : createDesktopTargetHandlers;
  
  return {
    createSourceHandlers,
    createTargetHandlers,
    isLinking,
    linkSource,
    linkStep,
    cancelLink: () => {
      endInteraction();
      onCancel?.();
    },
  };
}

/**
 * useReorderInteraction - Unified hook for reordering lists
 * 
 * Desktop: Drag item up/down in list
 * VR: Select item → Use up/down buttons or thumbstick
 * 
 * Usage:
 * const {
 *   itemHandlers,
 *   reorderControls,  // Render these for VR
 *   activeItemId,
 * } = useReorderInteraction({
 *   items: [...],
 *   onReorder: (itemId, newIndex) => { ... }
 * });
 */
export function useReorderInteraction({ items, onReorder }) {
  const { inputMode, isVR, selection, select, clearSelection } = useInteraction();
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  const selectedItemId = selection?.type === 'reorder' ? selection.id : null;
  const selectedIndex = selectedItemId ? items.findIndex(item => item.id === selectedItemId) : -1;
  
  // Desktop: Drag handlers
  const createDesktopHandlers = useCallback((itemId, index) => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', itemId);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    onDragLeave: () => {
      setDragOverIndex(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId !== itemId) {
        onReorder?.(draggedId, index);
      }
      setDragOverIndex(null);
    },
  }), [onReorder]);
  
  // VR: Click to select, then use controls
  const createVRHandlers = useCallback((itemId, index) => ({
    onClick: () => {
      if (selectedItemId === itemId) {
        clearSelection();
      } else {
        select('reorder', itemId, { index });
      }
    },
    'data-reorder-selected': selectedItemId === itemId,
  }), [selectedItemId, select, clearSelection]);
  
  // VR reorder controls (render near selected item)
  const moveUp = useCallback(() => {
    if (selectedIndex > 0) {
      onReorder?.(selectedItemId, selectedIndex - 1);
      select('reorder', selectedItemId, { index: selectedIndex - 1 });
    }
  }, [selectedItemId, selectedIndex, onReorder, select]);
  
  const moveDown = useCallback(() => {
    if (selectedIndex < items.length - 1) {
      onReorder?.(selectedItemId, selectedIndex + 1);
      select('reorder', selectedItemId, { index: selectedIndex + 1 });
    }
  }, [selectedItemId, selectedIndex, items.length, onReorder, select]);
  
  const reorderControls = selectedItemId ? {
    canMoveUp: selectedIndex > 0,
    canMoveDown: selectedIndex < items.length - 1,
    moveUp,
    moveDown,
    done: clearSelection,
  } : null;
  
  return {
    createItemHandlers: isVR ? createVRHandlers : createDesktopHandlers,
    reorderControls,
    selectedItemId,
    dragOverIndex,
  };
}

/**
 * useMoveInteraction - Unified hook for moving/positioning elements
 * 
 * Desktop: Drag to move
 * VR: Grip + move controller, or select + thumbstick
 */
export function useMoveInteraction({ onMove, onMoveEnd, bounds }) {
  const { inputMode, isVR } = useInteraction();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const startMouseRef = useRef({ x: 0, y: 0 });
  
  // Desktop: Mouse drag
  const handleMouseDown = useCallback((e) => {
    if (isVR) return;
    setIsDragging(true);
    startPosRef.current = { ...position };
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    
    const handleMouseMove = (e) => {
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;
      const newPos = {
        x: startPosRef.current.x + dx,
        y: startPosRef.current.y + dy,
      };
      
      // Apply bounds if provided
      if (bounds) {
        newPos.x = Math.max(bounds.minX, Math.min(bounds.maxX, newPos.x));
        newPos.y = Math.max(bounds.minY, Math.min(bounds.maxY, newPos.y));
      }
      
      setPosition(newPos);
      onMove?.(newPos);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      onMoveEnd?.(position);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isVR, position, bounds, onMove, onMoveEnd]);
  
  // VR: Would integrate with controller grip events
  // This is a placeholder - actual VR implementation depends on XR framework
  const vrMoveHandlers = useMemo(() => ({
    onSelectStart: () => setIsDragging(true),
    onSelectEnd: () => {
      setIsDragging(false);
      onMoveEnd?.(position);
    },
    onMove: (controllerPosition) => {
      // Transform controller position to screen/world position
      // This is highly dependent on the VR setup
      setPosition(controllerPosition);
      onMove?.(controllerPosition);
    },
  }), [position, onMove, onMoveEnd]);
  
  return {
    position,
    setPosition,
    isDragging,
    handlers: isVR ? vrMoveHandlers : { onMouseDown: handleMouseDown },
  };
}

/**
 * useResizeInteraction - Unified hook for resizing elements
 * 
 * Desktop: Drag edge/corner
 * VR: Select edge → Thumbstick to resize
 */
export function useResizeInteraction({ initialSize, onResize, onResizeEnd, minSize, maxSize }) {
  const { inputMode, isVR, selection, select, clearSelection } = useInteraction();
  const [size, setSize] = useState(initialSize || { width: 200, height: 200 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeEdge, setActiveEdge] = useState(null); // 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  
  const selectedEdge = selection?.type === 'resize' ? selection.data?.edge : null;
  
  // Desktop: Edge drag handlers
  const createEdgeHandlers = useCallback((edge) => {
    if (isVR) {
      return {
        onClick: () => {
          if (selectedEdge === edge) {
            clearSelection();
          } else {
            select('resize', 'current', { edge });
          }
        },
        'data-resize-edge': edge,
        'data-resize-selected': selectedEdge === edge,
      };
    }
    
    return {
      onMouseDown: (e) => {
        e.preventDefault();
        setIsResizing(true);
        setActiveEdge(edge);
        
        const startSize = { ...size };
        const startMouse = { x: e.clientX, y: e.clientY };
        
        const handleMouseMove = (e) => {
          const dx = e.clientX - startMouse.x;
          const dy = e.clientY - startMouse.y;
          
          let newSize = { ...startSize };
          
          if (edge.includes('e')) newSize.width = startSize.width + dx;
          if (edge.includes('w')) newSize.width = startSize.width - dx;
          if (edge.includes('s')) newSize.height = startSize.height + dy;
          if (edge.includes('n')) newSize.height = startSize.height - dy;
          
          // Apply constraints
          if (minSize) {
            newSize.width = Math.max(minSize.width, newSize.width);
            newSize.height = Math.max(minSize.height, newSize.height);
          }
          if (maxSize) {
            newSize.width = Math.min(maxSize.width, newSize.width);
            newSize.height = Math.min(maxSize.height, newSize.height);
          }
          
          setSize(newSize);
          onResize?.(newSize);
        };
        
        const handleMouseUp = () => {
          setIsResizing(false);
          setActiveEdge(null);
          onResizeEnd?.(size);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      style: { cursor: getCursorForEdge(edge) },
    };
  }, [isVR, selectedEdge, size, minSize, maxSize, onResize, onResizeEnd, select, clearSelection]);
  
  // VR resize controls (thumbstick)
  const resizeControls = selectedEdge ? {
    edge: selectedEdge,
    increase: () => {
      const delta = 20;
      let newSize = { ...size };
      if (selectedEdge.includes('e') || selectedEdge.includes('w')) {
        newSize.width = Math.min(maxSize?.width || Infinity, size.width + delta);
      }
      if (selectedEdge.includes('s') || selectedEdge.includes('n')) {
        newSize.height = Math.min(maxSize?.height || Infinity, size.height + delta);
      }
      setSize(newSize);
      onResize?.(newSize);
    },
    decrease: () => {
      const delta = 20;
      let newSize = { ...size };
      if (selectedEdge.includes('e') || selectedEdge.includes('w')) {
        newSize.width = Math.max(minSize?.width || 0, size.width - delta);
      }
      if (selectedEdge.includes('s') || selectedEdge.includes('n')) {
        newSize.height = Math.max(minSize?.height || 0, size.height - delta);
      }
      setSize(newSize);
      onResize?.(newSize);
    },
    done: () => {
      clearSelection();
      onResizeEnd?.(size);
    },
  } : null;
  
  return {
    size,
    setSize,
    isResizing,
    activeEdge: isVR ? selectedEdge : activeEdge,
    createEdgeHandlers,
    resizeControls,
  };
}

function getCursorForEdge(edge) {
  const cursors = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
  };
  return cursors[edge] || 'default';
}

// =============================================================================
// PART 4: VR INTERACTION UI COMPONENTS
// =============================================================================

/**
 * VRInteractionOverlay - Shows current interaction state in VR
 * 
 * Displays:
 * - What's currently selected
 * - Available actions
 * - Instruction text
 */
export const VRInteractionOverlay = memo(function VRInteractionOverlay() {
  const { isVR, activeInteraction, selection } = useInteraction();
  
  if (!isVR) return null;
  
  const showOverlay = activeInteraction || selection;
  if (!showOverlay) return null;
  
  return (
    <div
      className="vr-interaction-overlay"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '16px 24px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '12px',
        border: '2px solid rgba(45, 212, 191, 0.5)',
        color: '#fff',
        textAlign: 'center',
        zIndex: 9999,
      }}
    >
      {activeInteraction?.intent === INTERACTION_INTENTS.LINK && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            🔗 Linking Mode
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {activeInteraction.step === 1 
              ? 'Point at a view and press trigger to link'
              : 'Confirm link target'
            }
          </div>
          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
            Press B to cancel
          </div>
        </div>
      )}
      
      {selection?.type === 'reorder' && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            📋 Reordering
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Use thumbstick up/down to move item
          </div>
          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
            Press A to confirm • Press B to cancel
          </div>
        </div>
      )}
      
      {selection?.type === 'resize' && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            ↔️ Resizing ({selection.data?.edge})
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Use thumbstick to adjust size
          </div>
          <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
            Press A to confirm • Press B to cancel
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * VRReorderControls - Floating up/down buttons for reordering in VR
 */
export const VRReorderControls = memo(function VRReorderControls({
  controls,
  position, // Position near the selected item
}) {
  if (!controls) return null;
  
  return (
    <div
      className="vr-reorder-controls"
      style={{
        position: 'absolute',
        ...position,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100,
      }}
    >
      <VRButton
        onClick={controls.moveUp}
        disabled={!controls.canMoveUp}
        icon="↑"
        label="Move Up"
      />
      <VRButton
        onClick={controls.moveDown}
        disabled={!controls.canMoveDown}
        icon="↓"
        label="Move Down"
      />
      <VRButton
        onClick={controls.done}
        icon="✓"
        label="Done"
        variant="primary"
      />
    </div>
  );
});

/**
 * VRResizeControls - Controls for resizing in VR
 */
export const VRResizeControls = memo(function VRResizeControls({
  controls,
  position,
}) {
  if (!controls) return null;
  
  const isHorizontal = controls.edge.includes('e') || controls.edge.includes('w');
  const isVertical = controls.edge.includes('n') || controls.edge.includes('s');
  
  return (
    <div
      className="vr-resize-controls"
      style={{
        position: 'absolute',
        ...position,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100,
      }}
    >
      {isHorizontal && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <VRButton onClick={controls.decrease} icon="←" label="Narrower" />
          <VRButton onClick={controls.increase} icon="→" label="Wider" />
        </div>
      )}
      {isVertical && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <VRButton onClick={controls.decrease} icon="↑" label="Shorter" />
          <VRButton onClick={controls.increase} icon="↓" label="Taller" />
        </div>
      )}
      <VRButton
        onClick={controls.done}
        icon="✓"
        label="Done"
        variant="primary"
      />
    </div>
  );
});

/**
 * VRButton - Large touch target button for VR
 */
export const VRButton = memo(function VRButton({
  onClick,
  disabled,
  icon,
  label,
  variant = 'default',
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: '120px',
        minHeight: '44px', // VR minimum touch target
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: 600,
        background: variant === 'primary' 
          ? 'rgba(45, 212, 191, 0.9)' 
          : 'rgba(255, 255, 255, 0.1)',
        border: '2px solid',
        borderColor: variant === 'primary'
          ? 'rgba(45, 212, 191, 1)'
          : 'rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: variant === 'primary' ? '#000' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: '0.15s ease',
      }}
    >
      {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
      {label}
    </button>
  );
});

// =============================================================================
// PART 5: VR RADIAL MENU (For Context Actions)
// =============================================================================

/**
 * VRRadialMenu - Circular menu for VR context actions
 * 
 * Appears on long-press or secondary button press.
 * Provides quick access to actions that would be in desktop context menu.
 */
export const VRRadialMenu = memo(function VRRadialMenu({
  isOpen,
  onClose,
  items, // Array of { icon, label, onClick, disabled }
  position, // Center position { x, y }
}) {
  if (!isOpen || !items?.length) return null;
  
  const radius = 100;
  const angleStep = (2 * Math.PI) / items.length;
  
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />
      
      {/* Menu */}
      <div
        className="vr-radial-menu"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
        }}
      >
        {/* Center indicator */}
        <div
          style={{
            position: 'absolute',
            left: -20,
            top: -20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(45, 212, 191, 0.2)',
            border: '2px solid rgba(45, 212, 191, 0.5)',
          }}
        />
        
        {/* Menu items */}
        {items.map((item, index) => {
          const angle = angleStep * index - Math.PI / 2; // Start from top
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <button
              key={index}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              disabled={item.disabled}
              style={{
                position: 'absolute',
                left: x - 40,
                top: y - 40,
                width: 80,
                height: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'rgba(12, 18, 32, 0.95)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                color: '#fff',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.4 : 1,
                transition: '0.15s ease',
              }}
            >
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
});

// =============================================================================
// PART 6: CONTROLLER INPUT MAPPING
// =============================================================================

/**
 * VR Controller Button Mapping
 * 
 * Standard mapping for Oculus/Meta Quest controllers:
 * 
 * | Button      | Primary Action           | With Selection Active |
 * |-------------|--------------------------|------------------------|
 * | Trigger     | Select / Confirm         | Confirm action         |
 * | Grip        | Grab / Move              | -                      |
 * | A Button    | Confirm / Accept         | Complete interaction   |
 * | B Button    | Cancel / Back            | Cancel interaction     |
 * | Thumbstick  | Navigate / Scroll        | Adjust value           |
 * | Menu        | Open menu                | -                      |
 * 
 * The actual binding would be done in the XR session setup.
 */
export const VR_CONTROLLER_MAPPING = {
  // Right controller
  right: {
    trigger: 'select',
    grip: 'grab',
    a: 'confirm',
    b: 'cancel',
    thumbstick: 'navigate',
    thumbstickPress: 'contextMenu',
  },
  // Left controller
  left: {
    trigger: 'selectSecondary',
    grip: 'grabSecondary',
    x: 'toggleMenu',
    y: 'home',
    thumbstick: 'move',
    thumbstickPress: 'recenter',
  },
};

/**
 * useVRControllerInput - Hook to handle VR controller events
 * 
 * This is a conceptual hook - actual implementation depends on
 * the WebXR framework being used (Three.js XR, A-Frame, etc.)
 */
export function useVRControllerInput(handlers) {
  const { isVR } = useInteraction();
  
  useEffect(() => {
    if (!isVR) return;
    
    // This would integrate with WebXR input sources
    // Example structure:
    /*
    const session = xrSession;
    
    session.inputSources.forEach(inputSource => {
      inputSource.gamepad?.buttons.forEach((button, index) => {
        if (button.pressed) {
          const action = getActionForButton(inputSource.handedness, index);
          handlers[action]?.();
        }
      });
    });
    */
    
    // Placeholder - would need XR session integration
  }, [isVR, handlers]);
}

// =============================================================================
// PART 7: USAGE EXAMPLES
// =============================================================================

/**
 * Example: Link interaction that works on both desktop and VR
 */
export function LinkInteractionExample() {
  const { isVR } = useInteraction();
  const { createSourceHandlers, createTargetHandlers, isLinking, linkSource } = useLinkInteraction({
    onLink: (sourceId, targetId) => {
      console.log(`Linked ${sourceId} to ${targetId}`);
    },
  });
  
  const views = [
    { id: 'v1', name: 'Skull', color: '#2dd4bf' },
    { id: 'v2', name: 'Bones', color: '#4ade80' },
    { id: 'v3', name: 'Vessels', color: '#a78bfa' },
  ];
  
  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {views.map(view => (
        <div
          key={view.id}
          style={{
            padding: '20px',
            background: 'rgba(12, 18, 32, 0.8)',
            border: `2px solid ${
              linkSource?.sourceId === view.id 
                ? '#2dd4bf' 
                : isLinking && linkSource?.sourceId !== view.id
                  ? 'rgba(45, 212, 191, 0.3)'
                  : 'rgba(255,255,255,0.1)'
            }`,
            borderRadius: '8px',
          }}
        >
          <div style={{ color: view.color, marginBottom: '10px' }}>{view.name}</div>
          
          {/* Link badge - source of drag/tap */}
          <button
            {...createSourceHandlers(view.id, { viewName: view.name, color: view.color })}
            style={{
              padding: '8px 12px',
              background: 'rgba(45, 212, 191, 0.2)',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              borderRadius: '4px',
              color: '#2dd4bf',
              cursor: isVR ? 'pointer' : 'grab',
            }}
          >
            🔗 Link
          </button>
          
          {/* Drop target area */}
          <div
            {...createTargetHandlers(view.id, (source) => source?.sourceId !== view.id)}
            style={{
              marginTop: '10px',
              padding: '20px',
              background: 'rgba(255,255,255,0.05)',
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '4px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '11px',
            }}
          >
            {isVR ? 'Tap to link here' : 'Drop to link here'}
          </div>
        </div>
      ))}
      
      {/* VR interaction overlay */}
      <VRInteractionOverlay />
    </div>
  );
}

/**
 * Example: Reorderable list that works on both desktop and VR
 */
export function ReorderListExample() {
  const [items, setItems] = useState([
    { id: '1', label: 'First Item' },
    { id: '2', label: 'Second Item' },
    { id: '3', label: 'Third Item' },
    { id: '4', label: 'Fourth Item' },
  ]);
  
  const handleReorder = (itemId, newIndex) => {
    setItems(prev => {
      const itemIndex = prev.findIndex(i => i.id === itemId);
      const newItems = [...prev];
      const [removed] = newItems.splice(itemIndex, 1);
      newItems.splice(newIndex, 0, removed);
      return newItems;
    });
  };
  
  const { createItemHandlers, reorderControls, selectedItemId, dragOverIndex } = useReorderInteraction({
    items,
    onReorder: handleReorder,
  });
  
  return (
    <div style={{ padding: '20px', maxWidth: '300px' }}>
      <h3>Reorderable List</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item, index) => (
          <li
            key={item.id}
            {...createItemHandlers(item.id, index)}
            style={{
              padding: '12px 16px',
              marginBottom: '8px',
              background: selectedItemId === item.id 
                ? 'rgba(45, 212, 191, 0.2)' 
                : dragOverIndex === index
                  ? 'rgba(45, 212, 191, 0.1)'
                  : 'rgba(255,255,255,0.05)',
              border: `2px solid ${
                selectedItemId === item.id 
                  ? '#2dd4bf' 
                  : 'rgba(255,255,255,0.1)'
              }`,
              borderRadius: '6px',
              cursor: 'grab',
              position: 'relative',
            }}
          >
            {item.label}
            
            {/* VR controls appear next to selected item */}
            {selectedItemId === item.id && reorderControls && (
              <VRReorderControls 
                controls={reorderControls}
                position={{ right: -140, top: 0 }}
              />
            )}
          </li>
        ))}
      </ul>
      
      <VRInteractionOverlay />
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  INTERACTION_INTENTS,
  INPUT_MODES,
  VR_CONTROLLER_MAPPING,
};

export default {
  InteractionProvider,
  useInteraction,
  useLinkInteraction,
  useReorderInteraction,
  useMoveInteraction,
  useResizeInteraction,
  useVRControllerInput,
  VRInteractionOverlay,
  VRReorderControls,
  VRResizeControls,
  VRRadialMenu,
  VRButton,
};
