/**
 * VR Canvas Interactions
 * 
 * Completes the VR interaction coverage for canvas-specific operations:
 * - TRANSFER: Dragging datasets/views to canvas cells
 * - ZONE_DROP: Push zones (up/down/left/right) selection in VR
 * - CANVAS_EXPAND: Adding rows/columns at canvas edges
 * - MODIFIER_KEYS: VR alternatives to Shift/Ctrl/Alt behaviors
 * 
 * These patterns integrate with the existing:
 * - useDragSource / useDropTarget hooks
 * - dragDropTypes.js (DRAG_TYPES, DROP_ZONES)
 * - CanvasCell zone detection
 * - CanvasEdgeDropZone
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
  createContext,
  useContext,
} from 'react';

// =============================================================================
// CONSTANTS (Matching existing dragDropTypes.js)
// =============================================================================

// These should be imported from dragDropTypes.js in real implementation
const DROP_ZONES = {
  NONE: 'none',
  PLACE: 'place',
  SWAP: 'swap',
  PUSH_UP: 'push-up',
  PUSH_DOWN: 'push-down',
  PUSH_LEFT: 'push-left',
  PUSH_RIGHT: 'push-right',
};

const EDGE_POSITIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
};

// VR-specific tokens
const tokens = {
  minTouchTarget: 44,
  panelWidth: 420,
  accent: '#2dd4bf',
  accentGreen: '#4ade80',
  accentBlue: '#60a5fa',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  bgPanel: 'rgba(12, 18, 32, 0.95)',
  borderDefault: 'rgba(255, 255, 255, 0.15)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

// =============================================================================
// PART 1: VR TRANSFER INTERACTION
// Placing datasets/views onto canvas cells
// =============================================================================

/**
 * VR Transfer Flow:
 * 
 * 1. User taps dataset/view in sidebar (enters transfer mode)
 * 2. Source highlights, canvas cells become targets
 * 3. User points at canvas cell
 * 4. Cell highlights with zone options
 * 5. User taps cell OR opens zone picker
 * 6. Item placed/pushed/swapped
 * 
 * Desktop equivalent: Drag from sidebar → Drop on canvas cell
 */

const TransferContext = createContext(null);

export function TransferProvider({ children, onTransfer }) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSource, setTransferSource] = useState(null);
  const [targetCell, setTargetCell] = useState(null);
  const [selectedZone, setSelectedZone] = useState(DROP_ZONES.PLACE);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [modifiers, setModifiers] = useState({ wrap: false, closeOther: false, createLinked: false });
  
  // Start transfer from a source
  const startTransfer = useCallback((sourceType, sourceData) => {
    setIsTransferring(true);
    setTransferSource({ type: sourceType, ...sourceData });
    setTargetCell(null);
    setSelectedZone(DROP_ZONES.PLACE);
  }, []);
  
  // Select a target cell
  const selectTargetCell = useCallback((row, col, isEmpty, existingPlacement) => {
    setTargetCell({ row, col, isEmpty, existingPlacement });
    // If cell is occupied, show zone picker for push/swap options
    if (!isEmpty) {
      setShowZonePicker(true);
      setSelectedZone(DROP_ZONES.SWAP); // Default to swap for occupied
    }
  }, []);
  
  // Confirm the transfer
  const confirmTransfer = useCallback(() => {
    if (transferSource && targetCell) {
      onTransfer?.({
        source: transferSource,
        target: targetCell,
        zone: selectedZone,
        modifiers,
      });
    }
    cancelTransfer();
  }, [transferSource, targetCell, selectedZone, modifiers, onTransfer]);
  
  // Cancel transfer
  const cancelTransfer = useCallback(() => {
    setIsTransferring(false);
    setTransferSource(null);
    setTargetCell(null);
    setSelectedZone(DROP_ZONES.PLACE);
    setShowZonePicker(false);
    setModifiers({ wrap: false, closeOther: false, createLinked: false });
  }, []);
  
  // Toggle a modifier
  const toggleModifier = useCallback((key) => {
    setModifiers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  
  const contextValue = {
    isTransferring,
    transferSource,
    targetCell,
    selectedZone,
    setSelectedZone,
    showZonePicker,
    setShowZonePicker,
    modifiers,
    toggleModifier,
    startTransfer,
    selectTargetCell,
    confirmTransfer,
    cancelTransfer,
  };
  
  return (
    <TransferContext.Provider value={contextValue}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfer() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error('useTransfer must be used within TransferProvider');
  }
  return context;
}

// =============================================================================
// PART 2: VR TRANSFERABLE SOURCE
// Makes sidebar items tappable to start transfer
// =============================================================================

/**
 * VRTransferableSource - Wrapper for datasets/views in sidebar
 * 
 * In desktop: These are draggable
 * In VR: Tap to select, then tap canvas cell
 */
export const VRTransferableSource = memo(function VRTransferableSource({
  type, // 'dataset' | 'view'
  data, // { id, name, color, ... }
  children,
  disabled = false,
}) {
  const { isTransferring, transferSource, startTransfer, cancelTransfer } = useTransfer();
  
  const isActive = transferSource?.id === data.id && transferSource?.type === type;
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    if (disabled) return;
    
    if (isActive) {
      cancelTransfer();
    } else {
      startTransfer(type, data);
    }
  };
  
  return (
    <div
      onClick={handleClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : isTransferring && !isActive ? 0.6 : 1,
        outline: isActive ? `2px solid ${tokens.accent}` : 'none',
        outlineOffset: '2px',
        borderRadius: '8px',
        transition: '0.15s ease',
      }}
    >
      {children}
      
      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.accent,
          borderRadius: '50%',
          fontSize: '12px',
          color: '#000',
          fontWeight: 700,
          boxShadow: `0 0 10px ${tokens.accent}`,
        }}>
          ✓
        </div>
      )}
      
      {/* Hint on hover (VR: shown when pointed at) */}
      {isHovered && !isTransferring && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          padding: '6px 12px',
          background: tokens.bgPanel,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: '6px',
          fontSize: '11px',
          color: tokens.textSecondary,
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          Tap to place on canvas
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 3: VR CANVAS CELL TARGET
// Makes canvas cells tappable during transfer
// =============================================================================

/**
 * VRCanvasCellTarget - Overlay for canvas cells during transfer mode
 * 
 * Shows:
 * - Valid/invalid visual states
 * - Zone indicators
 * - Tap to place/show zone picker
 */
export const VRCanvasCellTarget = memo(function VRCanvasCellTarget({
  row,
  col,
  isEmpty,
  existingPlacement,
  children,
}) {
  const { 
    isTransferring, 
    targetCell, 
    selectedZone,
    selectTargetCell, 
    confirmTransfer,
    setShowZonePicker,
  } = useTransfer();
  
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = targetCell?.row === row && targetCell?.col === col;
  
  const handleClick = () => {
    if (!isTransferring) return;
    
    if (isSelected) {
      // Already selected - confirm or open zone picker
      if (isEmpty) {
        confirmTransfer();
      } else {
        setShowZonePicker(true);
      }
    } else {
      selectTargetCell(row, col, isEmpty, existingPlacement);
      if (isEmpty) {
        // Empty cell - can confirm immediately with another tap
      }
    }
  };
  
  if (!isTransferring) {
    return children;
  }
  
  // Get zone color
  const getZoneColor = () => {
    if (isEmpty) return tokens.accentGreen; // Place
    switch (selectedZone) {
      case DROP_ZONES.SWAP: return tokens.accentBlue;
      case DROP_ZONES.PUSH_UP:
      case DROP_ZONES.PUSH_DOWN:
      case DROP_ZONES.PUSH_LEFT:
      case DROP_ZONES.PUSH_RIGHT:
        return tokens.accentAmber;
      default: return tokens.accentGreen;
    }
  };
  
  const zoneColor = getZoneColor();
  
  return (
    <div
      onClick={handleClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '8px',
        outline: isSelected 
          ? `3px solid ${zoneColor}` 
          : isHovered 
            ? `2px solid ${zoneColor}60`
            : 'none',
        outlineOffset: '-2px',
        boxShadow: isSelected ? `0 0 20px ${zoneColor}40` : 'none',
        transition: '0.15s ease',
      }}
    >
      {children}
      
      {/* Hover prompt */}
      {isHovered && !isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${zoneColor}20`,
          borderRadius: '8px',
          pointerEvents: 'none',
        }}>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: zoneColor,
          }}>
            {isEmpty ? 'Tap to place here' : 'Tap for options'}
          </div>
        </div>
      )}
      
      {/* Selected state */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${zoneColor}15`,
          borderRadius: '8px',
          pointerEvents: 'none',
        }}>
          <div style={{
            padding: '10px 20px',
            background: zoneColor,
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#000',
          }}>
            {isEmpty ? 'Tap again to confirm' : 'Tap for placement options'}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 4: VR ZONE PICKER
// Explicit zone selection for occupied cells
// =============================================================================

/**
 * VRZonePicker - Zone selection panel for VR
 * 
 * Shows when placing into an occupied cell.
 * Provides explicit buttons for:
 * - Swap (replace existing)
 * - Push Up/Down/Left/Right
 * 
 * Desktop equivalent: Mouse position determines zone automatically
 */
export const VRZonePicker = memo(function VRZonePicker({
  isOpen,
  onClose,
  existingViewName,
  existingViewColor,
}) {
  const { selectedZone, setSelectedZone, modifiers, toggleModifier, confirmTransfer } = useTransfer();
  
  if (!isOpen) return null;
  
  const zones = [
    { id: DROP_ZONES.SWAP, icon: '↔️', label: 'Replace', desc: 'Swap with existing view', color: tokens.accentBlue },
    { id: DROP_ZONES.PUSH_UP, icon: '⬆️', label: 'Push Up', desc: 'Insert above', color: tokens.accentAmber },
    { id: DROP_ZONES.PUSH_DOWN, icon: '⬇️', label: 'Push Down', desc: 'Insert below', color: tokens.accentAmber },
    { id: DROP_ZONES.PUSH_LEFT, icon: '⬅️', label: 'Push Left', desc: 'Insert to left', color: tokens.accentAmber },
    { id: DROP_ZONES.PUSH_RIGHT, icon: '➡️', label: 'Push Right', desc: 'Insert to right', color: tokens.accentAmber },
  ];
  
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
        }}
      />
      
      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: tokens.panelWidth,
        background: tokens.bgPanel,
        border: `2px solid ${tokens.borderDefault}`,
        borderRadius: '16px',
        overflow: 'hidden',
        zIndex: 9999,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.borderDefault}`,
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: tokens.textPrimary,
            marginBottom: '8px',
          }}>
            Placement Options
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: tokens.textSecondary,
          }}>
            <span>Cell contains:</span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: existingViewColor || '#60a5fa',
              }} />
              {existingViewName || 'Existing view'}
            </span>
          </div>
        </div>
        
        {/* Zone buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          padding: '16px 20px',
        }}>
          {zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                minHeight: tokens.minTouchTarget,
                background: selectedZone === zone.id 
                  ? `${zone.color}20`
                  : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${selectedZone === zone.id ? zone.color : 'transparent'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: '0.15s ease',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>{zone.icon}</span>
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: selectedZone === zone.id ? zone.color : tokens.textPrimary,
                }}>
                  {zone.label}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: tokens.textMuted,
                }}>
                  {zone.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {/* Modifier toggles (VR alternative to keyboard modifiers) */}
        <div style={{
          padding: '0 20px 16px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: tokens.textMuted,
            marginBottom: '10px',
          }}>
            Additional Options
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ModifierToggle
              label="Wrap to next row"
              hint="Desktop: Hold Shift"
              isActive={modifiers.wrap}
              onToggle={() => toggleModifier('wrap')}
            />
            <ModifierToggle
              label="Close last view"
              hint="Desktop: Hold Ctrl/Cmd"
              isActive={modifiers.closeOther}
              onToggle={() => toggleModifier('closeOther')}
            />
            <ModifierToggle
              label="Create linked view"
              hint="Desktop: Hold Alt/Option"
              isActive={modifiers.createLinked}
              onToggle={() => toggleModifier('createLinked')}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '16px 20px',
          borderTop: `1px solid ${tokens.borderDefault}`,
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              minHeight: tokens.minTouchTarget,
              fontSize: '13px',
              fontWeight: 500,
              background: 'transparent',
              border: `2px solid ${tokens.borderDefault}`,
              borderRadius: '10px',
              color: tokens.textSecondary,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmTransfer}
            style={{
              flex: 1,
              padding: '14px',
              minHeight: tokens.minTouchTarget,
              fontSize: '13px',
              fontWeight: 600,
              background: tokens.accent,
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            Place View
          </button>
        </div>
      </div>
    </>
  );
});

const ModifierToggle = memo(function ModifierToggle({ label, hint, isActive, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: isActive ? `${tokens.accent}15` : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${isActive ? tokens.accent : tokens.borderDefault}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: '0.15s ease',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: isActive ? tokens.accent : tokens.textPrimary,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '9px',
          color: tokens.textMuted,
        }}>
          {hint}
        </div>
      </div>
      <div style={{
        width: '40px',
        height: '22px',
        background: isActive ? tokens.accent : 'rgba(255, 255, 255, 0.2)',
        borderRadius: '11px',
        position: 'relative',
        transition: '0.15s ease',
      }}>
        <div style={{
          position: 'absolute',
          top: '2px',
          left: isActive ? '20px' : '2px',
          width: '18px',
          height: '18px',
          background: '#fff',
          borderRadius: '50%',
          transition: '0.15s ease',
        }} />
      </div>
    </button>
  );
});

// =============================================================================
// PART 5: VR CANVAS EDGE EXPANSION
// Adding rows/columns at canvas edges
// =============================================================================

/**
 * VRCanvasEdgeTarget - Shows at canvas edges during transfer
 * 
 * In desktop: CanvasEdgeDropZone appears on drag
 * In VR: Permanent buttons at edges (or appears during transfer)
 */
export const VRCanvasEdgeTarget = memo(function VRCanvasEdgeTarget({
  position, // 'top' | 'bottom' | 'left' | 'right'
  canExpand,
  onExpand,
}) {
  const { isTransferring, transferSource, confirmTransfer } = useTransfer();
  const [isHovered, setIsHovered] = useState(false);
  
  // Only show during transfer or can be always visible with lower opacity
  const showExpanded = isTransferring && canExpand;
  
  if (!canExpand) return null;
  
  const isVertical = position === 'left' || position === 'right';
  const label = isVertical ? 'Add Column' : 'Add Row';
  const icon = isVertical ? (position === 'left' ? '⬅️' : '➡️') : (position === 'top' ? '⬆️' : '⬇️');
  
  const handleClick = () => {
    if (isTransferring && transferSource) {
      onExpand?.(position, transferSource);
    }
  };
  
  // Position styles
  const positionStyles = {
    top: { top: 0, left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
    left: { left: 0, top: '50%', transform: 'translateY(-50%)' },
    right: { right: 0, top: '50%', transform: 'translateY(-50%)' },
  };
  
  return (
    <button
      onClick={handleClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        ...positionStyles[position],
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isVertical ? '20px 12px' : '12px 20px',
        background: showExpanded 
          ? isHovered ? `${tokens.accentPurple}40` : `${tokens.accentPurple}20`
          : 'rgba(255, 255, 255, 0.05)',
        border: `2px dashed ${showExpanded ? tokens.accentPurple : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '8px',
        cursor: showExpanded ? 'pointer' : 'default',
        opacity: showExpanded ? 1 : 0.3,
        transition: '0.2s ease',
        zIndex: 5,
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        color: showExpanded ? tokens.accentPurple : tokens.textMuted,
        writingMode: isVertical ? 'vertical-lr' : 'horizontal-tb',
        textOrientation: isVertical ? 'mixed' : 'unset',
      }}>
        {label}
      </span>
    </button>
  );
});

// =============================================================================
// PART 6: VR TRANSFER INSTRUCTIONS OVERLAY
// =============================================================================

/**
 * VRTransferInstructions - HUD showing transfer state
 */
export const VRTransferInstructions = memo(function VRTransferInstructions() {
  const { isTransferring, transferSource, targetCell, cancelTransfer } = useTransfer();
  
  if (!isTransferring) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      padding: '16px 28px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: `2px solid ${tokens.accent}50`,
      borderRadius: '14px',
      zIndex: 9990,
    }}>
      {/* Source info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          fontSize: '18px',
        }}>
          {transferSource?.type === 'dataset' ? '📊' : '🖼️'}
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: tokens.textPrimary,
        }}>
          {transferSource?.name || 'Item'}
        </span>
      </div>
      
      {/* Instruction */}
      <div style={{
        fontSize: '12px',
        color: tokens.textSecondary,
      }}>
        {targetCell 
          ? 'Tap again to confirm placement'
          : 'Point at a canvas cell and tap to place'
        }
      </div>
      
      {/* Cancel */}
      <button
        onClick={cancelTransfer}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          fontSize: '11px',
          color: tokens.textSecondary,
          cursor: 'pointer',
        }}
      >
        <span>🎮 B</span>
        Cancel
      </button>
    </div>
  );
});

// =============================================================================
// PART 7: COMPLETE TRANSFER HOOK
// =============================================================================

/**
 * useVRTransfer - Complete hook for VR canvas transfer
 * 
 * Usage:
 * const {
 *   isTransferring,
 *   createSourceProps,
 *   createCellProps,
 *   createEdgeProps,
 * } = useVRTransfer({
 *   onPlace: (sourceData, row, col) => { ... },
 *   onSwap: (sourceData, row, col, existingPlacement) => { ... },
 *   onPush: (sourceData, row, col, direction) => { ... },
 *   onExpand: (position, sourceData) => { ... },
 * });
 */
export function useVRTransfer({
  onPlace,
  onSwap,
  onPush,
  onExpand,
}) {
  const handleTransfer = useCallback(({ source, target, zone, modifiers }) => {
    const { row, col, isEmpty, existingPlacement } = target;
    
    switch (zone) {
      case DROP_ZONES.PLACE:
        onPlace?.(source, row, col, modifiers);
        break;
        
      case DROP_ZONES.SWAP:
        onSwap?.(source, row, col, existingPlacement, modifiers);
        break;
        
      case DROP_ZONES.PUSH_UP:
      case DROP_ZONES.PUSH_DOWN:
      case DROP_ZONES.PUSH_LEFT:
      case DROP_ZONES.PUSH_RIGHT:
        const direction = zone.replace('push-', '');
        onPush?.(source, row, col, direction, modifiers);
        break;
    }
  }, [onPlace, onSwap, onPush]);
  
  const handleExpand = useCallback((position, source) => {
    onExpand?.(position, source);
  }, [onExpand]);
  
  return {
    TransferProvider: ({ children }) => (
      <TransferProvider onTransfer={handleTransfer}>
        {children}
      </TransferProvider>
    ),
    // Expose for direct usage
    handleTransfer,
    handleExpand,
  };
}

// =============================================================================
// PART 8: INTEGRATION WITH EXISTING HOOKS
// =============================================================================

/**
 * Migration Guide: Existing Hooks → VR Support
 * 
 * The existing useDragSource and useDropTarget hooks can be EXTENDED
 * rather than replaced. Here's how:
 * 
 * 1. Add `isVR` check from useInteraction context
 * 2. Return different handlers based on mode
 * 3. Keep MIME types and data structures identical
 * 
 * Example extension for useDragSource:
 */
export function useAdaptiveDragSource(options) {
  // This would import from vr-interaction-patterns.jsx
  const isVR = false; // useInteraction().isVR
  
  if (isVR) {
    // Return click handlers for VR
    const { startTransfer } = useTransfer();
    
    return {
      dragProps: {
        onClick: () => startTransfer(options.type, options.data),
        style: { cursor: 'pointer' },
      },
      isDragging: false, // VR doesn't have dragging state
    };
  }
  
  // Return standard drag handlers for desktop
  // This would use the existing useDragSource implementation
  return {
    dragProps: {
      draggable: true,
      onDragStart: (e) => {
        // Standard drag start...
      },
      onDragEnd: () => {
        // Standard drag end...
      },
    },
    isDragging: false,
  };
}

/**
 * Example extension for useDropTarget:
 */
export function useAdaptiveDropTarget(options) {
  const isVR = false; // useInteraction().isVR
  
  if (isVR) {
    // Return click handlers for VR
    const { isTransferring, selectTargetCell } = useTransfer();
    
    return {
      dropRef: null,
      dropProps: {
        onClick: () => {
          if (isTransferring) {
            selectTargetCell(options.row, options.col, options.isEmpty, options.existingPlacement);
          }
        },
      },
      activeZone: null,
      isOver: false,
    };
  }
  
  // Return standard drop handlers for desktop
  // This would use the existing useDropTarget implementation
  return {
    dropRef: null,
    dropProps: {
      onDragOver: (e) => { /* ... */ },
      onDrop: (e) => { /* ... */ },
    },
    activeZone: null,
    isOver: false,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DROP_ZONES,
  EDGE_POSITIONS,
  tokens as VR_CANVAS_TOKENS,
};

export default {
  TransferProvider,
  useTransfer,
  VRTransferableSource,
  VRCanvasCellTarget,
  VRZonePicker,
  VRCanvasEdgeTarget,
  VRTransferInstructions,
  useVRTransfer,
  useAdaptiveDragSource,
  useAdaptiveDropTarget,
};
