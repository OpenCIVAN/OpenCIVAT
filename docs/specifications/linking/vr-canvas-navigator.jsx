/**
 * VR Canvas Navigator Interactions
 * 
 * Extends CanvasNavigator for VR environments with tap-based interactions
 * replacing mouse drag operations.
 * 
 * VR Interactions:
 * - Tap cell to select → Tap destination to move/swap
 * - Long-press cell for context menu (radial)
 * - D-pad via thumbstick
 * - Multi-select with grip modifier
 * - Pinch-to-zoom minimap (hand tracking)
 * 
 * Desktop Equivalents:
 * - Drag cell → Drop on target = Tap cell → Tap target
 * - Right-click context menu = Long-press radial menu
 * - Arrow keys / D-pad buttons = Thumbstick
 * - Shift+click multi-select = Grip+tap
 * - Scroll to zoom = Pinch gesture
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
// CONSTANTS
// =============================================================================

// Navigator operation modes
const NAV_OPERATIONS = {
  IDLE: 'idle',
  SELECTING: 'selecting',      // Single cell selected, awaiting action
  MULTI_SELECTING: 'multi',    // Multi-select mode (grip held)
  MOVING: 'moving',            // Cell selected, awaiting move target
  CONTEXT_MENU: 'context',     // Radial menu open
};

// Cell actions available in context menu
const CELL_ACTIONS = {
  MOVE: 'move',
  SWAP: 'swap',
  DUPLICATE: 'duplicate',
  DELETE: 'delete',
  MERGE: 'merge',
  SPLIT: 'split',
  SET_HOME: 'setHome',
  NAVIGATE: 'navigate',
  LOCK: 'lock',
  PROPERTIES: 'properties',
};

// Design tokens
const tokens = {
  // Colors
  accent: '#2dd4bf',
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentRed: '#f87171',
  accentPurple: '#a78bfa',
  bgPanel: 'rgba(12, 18, 32, 0.95)',
  borderDefault: 'rgba(255, 255, 255, 0.15)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  // Cell colors in minimap
  cellEmpty: 'rgba(255, 255, 255, 0.05)',
  cellOccupied: 'rgba(96, 165, 250, 0.3)',
  cellSelected: 'rgba(45, 212, 191, 0.4)',
  cellTarget: 'rgba(74, 222, 128, 0.3)',
  cellInvalid: 'rgba(248, 113, 113, 0.2)',
  
  // Dimensions
  minTouchTarget: 44,
  cellSize: 48,        // VR minimap cell size (larger than desktop)
  cellGap: 4,
  radialMenuRadius: 120,
};

// =============================================================================
// PART 1: VR NAVIGATOR CONTEXT
// =============================================================================

const VRNavigatorContext = createContext(null);

/**
 * VRNavigatorProvider - Manages VR navigator state
 */
export function VRNavigatorProvider({ 
  children,
  cells,
  canvasSize,
  onMovePlacement,
  onSwapPlacements,
  onDeletePlacement,
  onMergeCells,
  onSplitCell,
  onSetHomepoint,
  onNavigateToCell,
}) {
  // Current operation mode
  const [operation, setOperation] = useState(NAV_OPERATIONS.IDLE);
  
  // Selected cells
  const [selectedCells, setSelectedCells] = useState([]); // Array of {row, col}
  
  // Primary selected cell (for move/swap source)
  const [sourceCell, setSourceCell] = useState(null);
  
  // Hover/pointed cell
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { cell, position }
  
  // Grip modifier (for multi-select)
  const [gripHeld, setGripHeld] = useState(false);
  
  // Long-press timer
  const longPressTimer = useRef(null);
  
  // Helper to get cell at position
  const getCellAt = useCallback((row, col) => {
    return cells?.find(c => {
      const rowSpan = c.rowSpan || 1;
      const colSpan = c.colSpan || 1;
      return row >= c.row && row < c.row + rowSpan &&
             col >= c.col && col < c.col + colSpan;
    }) || null;
  }, [cells]);
  
  /**
   * Toggle cell selection (for multi-select)
   */
  const toggleCellSelection = useCallback((row, col) => {
    setSelectedCells(prev => {
      const existing = prev.findIndex(c => c.row === row && c.col === col);
      if (existing >= 0) {
        return prev.filter((_, i) => i !== existing);
      } else {
        return [...prev, { row, col }];
      }
    });
  }, []);
  
  /**
   * Cancel current operation
   */
  const cancelOperation = useCallback(() => {
    setOperation(NAV_OPERATIONS.IDLE);
    setSourceCell(null);
    setContextMenu(null);
  }, []);
  
  /**
   * Handle cell tap
   */
  const handleCellTap = useCallback((row, col) => {
    const cell = getCellAt(row, col);
    
    // Clear any long-press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    switch (operation) {
      case NAV_OPERATIONS.IDLE:
        if (gripHeld) {
          // Multi-select mode
          setOperation(NAV_OPERATIONS.MULTI_SELECTING);
          toggleCellSelection(row, col);
        } else if (cell) {
          // Select cell and enter moving mode
          setSourceCell({ row, col, cell });
          setOperation(NAV_OPERATIONS.MOVING);
        }
        break;
        
      case NAV_OPERATIONS.MOVING:
        if (sourceCell) {
          // Tap on target - execute move or swap
          if (row === sourceCell.row && col === sourceCell.col) {
            // Tapped same cell - cancel
            cancelOperation();
          } else {
            const targetCell = getCellAt(row, col);
            if (targetCell) {
              // Swap with existing cell
              onSwapPlacements?.(sourceCell.cell.id, targetCell.id);
            } else {
              // Move to empty cell
              onMovePlacement?.(sourceCell.cell.id, row, col);
            }
            cancelOperation();
          }
        }
        break;
        
      case NAV_OPERATIONS.MULTI_SELECTING:
        toggleCellSelection(row, col);
        break;
        
      case NAV_OPERATIONS.CONTEXT_MENU:
        // Tap outside menu closes it
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      default:
        break;
    }
  }, [operation, gripHeld, sourceCell, getCellAt, onMovePlacement, onSwapPlacements, toggleCellSelection, cancelOperation]);
  
  /**
   * Handle cell long-press (opens context menu)
   */
  const handleCellPressStart = useCallback((row, col, screenPosition) => {
    const cell = getCellAt(row, col);
    if (!cell) return;
    
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ 
        cell: { row, col, ...cell }, 
        position: screenPosition 
      });
      setOperation(NAV_OPERATIONS.CONTEXT_MENU);
    }, 500); // 500ms long-press threshold
  }, [getCellAt]);
  
  /**
   * Handle cell press end (cancel long-press if not triggered)
   */
  const handleCellPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);
  
  /**
   * Handle context menu action
   */
  const handleContextAction = useCallback((action) => {
    if (!contextMenu?.cell) return;
    
    const { cell } = contextMenu;
    
    switch (action) {
      case CELL_ACTIONS.MOVE:
        setSourceCell({ row: cell.row, col: cell.col, cell });
        setOperation(NAV_OPERATIONS.MOVING);
        setContextMenu(null);
        break;
        
      case CELL_ACTIONS.DELETE:
        onDeletePlacement?.(cell.id);
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      case CELL_ACTIONS.SET_HOME:
        onSetHomepoint?.(cell.row, cell.col);
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      case CELL_ACTIONS.NAVIGATE:
        onNavigateToCell?.(cell.row, cell.col);
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      case CELL_ACTIONS.DUPLICATE:
        // Would need to find empty cell and copy
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      case CELL_ACTIONS.SPLIT:
        onSplitCell?.(cell.id);
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
        break;
        
      default:
        setContextMenu(null);
        setOperation(NAV_OPERATIONS.IDLE);
    }
  }, [contextMenu, onDeletePlacement, onSetHomepoint, onNavigateToCell, onSplitCell]);
  
  /**
   * Handle merge action (requires multi-select)
   */
  const handleMerge = useCallback(() => {
    if (selectedCells.length >= 2) {
      onMergeCells?.(selectedCells);
      setSelectedCells([]);
      setOperation(NAV_OPERATIONS.IDLE);
    }
  }, [selectedCells, onMergeCells]);
  
  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedCells([]);
    setSourceCell(null);
    setOperation(NAV_OPERATIONS.IDLE);
  }, []);
  
  /**
   * Handle grip button (modifier for multi-select)
   */
  const handleGripChange = useCallback((pressed) => {
    setGripHeld(pressed);
    if (!pressed && operation === NAV_OPERATIONS.MULTI_SELECTING) {
      // Grip released - exit multi-select but keep selection
      setOperation(NAV_OPERATIONS.IDLE);
    }
  }, [operation]);
  
  /**
   * Check if a cell is a valid move target
   */
  const isValidMoveTarget = useCallback((row, col) => {
    if (!sourceCell) return false;
    if (row === sourceCell.row && col === sourceCell.col) return false;
    
    // Check bounds
    if (row < 0 || col < 0) return false;
    if (row >= canvasSize.rows || col >= canvasSize.cols) return false;
    
    return true;
  }, [sourceCell, canvasSize]);
  
  /**
   * Get cell visual state for rendering
   */
  const getCellState = useCallback((row, col) => {
    const isSource = sourceCell?.row === row && sourceCell?.col === col;
    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
    const isValidTarget = operation === NAV_OPERATIONS.MOVING && isValidMoveTarget(row, col);
    
    return {
      isSource,
      isSelected,
      isHovered,
      isValidTarget,
      isMoving: operation === NAV_OPERATIONS.MOVING,
    };
  }, [sourceCell, selectedCells, hoveredCell, operation, isValidMoveTarget]);
  
  const contextValue = {
    // State
    operation,
    selectedCells,
    sourceCell,
    hoveredCell,
    contextMenu,
    gripHeld,
    cells,
    canvasSize,
    
    // Actions
    handleCellTap,
    handleCellPressStart,
    handleCellPressEnd,
    handleContextAction,
    handleMerge,
    cancelOperation,
    clearSelection,
    handleGripChange,
    setHoveredCell,
    
    // Utilities
    getCellState,
    isValidMoveTarget,
    getCellAt,
  };
  
  return (
    <VRNavigatorContext.Provider value={contextValue}>
      {children}
    </VRNavigatorContext.Provider>
  );
}

export function useVRNavigator() {
  const context = useContext(VRNavigatorContext);
  if (!context) {
    throw new Error('useVRNavigator must be used within VRNavigatorProvider');
  }
  return context;
}

// =============================================================================
// PART 2: VR MINIMAP CELL
// =============================================================================

/**
 * VRMinimapCell - Individual cell in the VR minimap
 */
export const VRMinimapCell = memo(function VRMinimapCell({
  row,
  col,
  cell,
  color,
  label,
  isInViewport,
  isHome,
  collaborators,
}) {
  const {
    handleCellTap,
    handleCellPressStart,
    handleCellPressEnd,
    getCellState,
    setHoveredCell,
  } = useVRNavigator();
  
  const cellRef = useRef(null);
  
  const state = getCellState(row, col);
  const isEmpty = !cell;
  
  // Handle pointer down (start long-press timer)
  const handlePointerDown = (e) => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect) {
      handleCellPressStart(row, col, { x: rect.left + rect.width / 2, y: rect.top - 150 });
    }
  };
  
  // Handle pointer up
  const handlePointerUp = () => {
    handleCellPressEnd();
    handleCellTap(row, col);
  };
  
  // Handle pointer leave (cancel long-press)
  const handlePointerLeave = () => {
    handleCellPressEnd();
    setHoveredCell(null);
  };
  
  // Determine background color
  const getBgColor = () => {
    if (state.isSource) return tokens.cellSelected;
    if (state.isValidTarget) return tokens.cellTarget;
    if (state.isSelected) return `${tokens.accent}30`;
    if (isEmpty) return tokens.cellEmpty;
    return color ? `${color}40` : tokens.cellOccupied;
  };
  
  // Determine border
  const getBorder = () => {
    if (state.isSource) return `2px solid ${tokens.accent}`;
    if (state.isValidTarget && state.isHovered) return `2px solid ${tokens.accentGreen}`;
    if (state.isValidTarget) return `2px dashed ${tokens.accentGreen}`;
    if (state.isSelected) return `2px solid ${tokens.accent}`;
    if (isInViewport) return `2px solid ${tokens.accentBlue}`;
    return `1px solid ${tokens.borderDefault}`;
  };
  
  return (
    <div
      ref={cellRef}
      className="vr-minimap-cell"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setHoveredCell({ row, col })}
      onPointerLeave={handlePointerLeave}
      style={{
        position: 'relative',
        width: tokens.cellSize * (cell?.colSpan || 1) + tokens.cellGap * ((cell?.colSpan || 1) - 1),
        height: tokens.cellSize * (cell?.rowSpan || 1) + tokens.cellGap * ((cell?.rowSpan || 1) - 1),
        minWidth: tokens.minTouchTarget,
        minHeight: tokens.minTouchTarget,
        background: getBgColor(),
        border: getBorder(),
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        transition: '0.15s ease',
        boxShadow: state.isSource 
          ? `0 0 15px ${tokens.accent}50`
          : state.isValidTarget && state.isHovered
            ? `0 0 10px ${tokens.accentGreen}50`
            : 'none',
        gridColumn: cell?.colSpan > 1 ? `span ${cell.colSpan}` : 'span 1',
        gridRow: cell?.rowSpan > 1 ? `span ${cell.rowSpan}` : 'span 1',
      }}
    >
      {/* Color indicator */}
      {!isEmpty && color && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }} />
      )}
      
      {/* Label */}
      {label && (
        <span style={{
          fontSize: '9px',
          fontWeight: 500,
          color: tokens.textSecondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '90%',
          textAlign: 'center',
        }}>
          {label}
        </span>
      )}
      
      {/* Home indicator */}
      {isHome && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          fontSize: '10px',
        }}>
          🏠
        </div>
      )}
      
      {/* Collaborator indicators */}
      {collaborators?.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '2px',
          display: 'flex',
          gap: '2px',
        }}>
          {collaborators.slice(0, 3).map((c, i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: c.color || tokens.accentPurple,
              }}
              title={c.name}
            />
          ))}
          {collaborators.length > 3 && (
            <span style={{ fontSize: '8px', color: tokens.textMuted }}>
              +{collaborators.length - 3}
            </span>
          )}
        </div>
      )}
      
      {/* Move source indicator */}
      {state.isSource && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 6px',
          background: tokens.accent,
          borderRadius: '4px',
          fontSize: '8px',
          fontWeight: 600,
          color: '#000',
          whiteSpace: 'nowrap',
        }}>
          MOVING
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 3: VR MINIMAP GRID
// =============================================================================

/**
 * VRMinimapGrid - The complete minimap grid for VR
 */
export const VRMinimapGrid = memo(function VRMinimapGrid({
  viewport,
  homepoint,
  collaborators,
  displayMode = 'names',
}) {
  const { operation, cells, canvasSize } = useVRNavigator();
  
  // Build grid cells
  const gridCells = useMemo(() => {
    const result = [];
    const processedCells = new Set();
    
    for (let row = 0; row < canvasSize.rows; row++) {
      for (let col = 0; col < canvasSize.cols; col++) {
        const key = `${row}-${col}`;
        if (processedCells.has(key)) continue;
        
        const cell = cells?.find(c => {
          const rowSpan = c.rowSpan || 1;
          const colSpan = c.colSpan || 1;
          return row >= c.row && row < c.row + rowSpan &&
                 col >= c.col && col < c.col + colSpan;
        });
        
        // Skip non-origin cells of spanning placements
        if (cell && (cell.row !== row || cell.col !== col)) {
          processedCells.add(key);
          continue;
        }
        
        // Mark spanned cells as processed
        if (cell) {
          for (let r = row; r < row + (cell.rowSpan || 1); r++) {
            for (let c = col; c < col + (cell.colSpan || 1); c++) {
              processedCells.add(`${r}-${c}`);
            }
          }
        } else {
          processedCells.add(key);
        }
        
        // Check viewport
        const inVP = viewport && 
          row >= viewport.row && 
          row < viewport.row + viewport.rows &&
          col >= viewport.col && 
          col < viewport.col + viewport.cols;
        
        // Check homepoint
        const isHome = homepoint && row === homepoint.row && col === homepoint.col;
        
        // Get collaborators at cell
        const cellCollabs = collaborators?.filter(c => 
          c.position?.row === row && c.position?.col === col
        );
        
        // Determine label based on display mode
        let label = '';
        if (cell) {
          switch (displayMode) {
            case 'names':
              label = cell.name || cell.label || '';
              break;
            case 'numbers':
              label = String((cells?.indexOf(cell) || 0) + 1);
              break;
            case 'colors':
              label = '';
              break;
            default:
              break;
          }
        }
        
        result.push({
          row,
          col,
          cell,
          color: cell?.color,
          label,
          inVP,
          isHome,
          collaborators: cellCollabs,
          key,
        });
      }
    }
    
    return result;
  }, [cells, canvasSize, viewport, homepoint, collaborators, displayMode]);
  
  return (
    <div
      className="vr-minimap-grid"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${canvasSize.cols}, ${tokens.cellSize}px)`,
        gridTemplateRows: `repeat(${canvasSize.rows}, ${tokens.cellSize}px)`,
        gap: tokens.cellGap,
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '12px',
        border: `1px solid ${tokens.borderDefault}`,
      }}
    >
      {gridCells.map(cellData => (
        <VRMinimapCell
          key={cellData.key}
          row={cellData.row}
          col={cellData.col}
          cell={cellData.cell}
          color={cellData.color}
          label={cellData.label}
          isInViewport={cellData.inVP}
          isHome={cellData.isHome}
          collaborators={cellData.collaborators}
        />
      ))}
      
      {/* Operation instruction overlay */}
      {operation === NAV_OPERATIONS.MOVING && (
        <div style={{
          position: 'absolute',
          bottom: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          background: tokens.bgPanel,
          border: `1px solid ${tokens.accent}`,
          borderRadius: '20px',
          fontSize: '11px',
          color: tokens.textPrimary,
          whiteSpace: 'nowrap',
        }}>
          Tap destination cell • 🎮 B to cancel
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 4: VR CELL CONTEXT MENU (Radial)
// =============================================================================

/**
 * VRCellContextMenu - Radial menu for cell actions
 */
export const VRCellContextMenu = memo(function VRCellContextMenu({
  isOpen,
  cell,
  position,
  onClose,
}) {
  const { handleContextAction } = useVRNavigator();
  
  if (!isOpen || !cell) return null;
  
  const actions = [
    { id: CELL_ACTIONS.MOVE, icon: '↔️', label: 'Move', color: tokens.accent },
    { id: CELL_ACTIONS.DUPLICATE, icon: '📋', label: 'Copy', color: tokens.accentBlue },
    { id: CELL_ACTIONS.DELETE, icon: '🗑️', label: 'Delete', color: tokens.accentRed },
    { id: CELL_ACTIONS.SET_HOME, icon: '🏠', label: 'Set Home', color: tokens.accentAmber },
    { id: CELL_ACTIONS.NAVIGATE, icon: '🎯', label: 'Go To', color: tokens.accentGreen },
    { id: CELL_ACTIONS.SPLIT, icon: '✂️', label: 'Split', color: tokens.accentPurple },
  ];
  
  const angleStep = (2 * Math.PI) / actions.length;
  const startAngle = -Math.PI / 2; // Start at top
  
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
      
      {/* Radial menu */}
      <div
        className="vr-cell-context-menu"
        style={{
          position: 'fixed',
          left: position?.x || '50%',
          top: position?.y || '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
        }}
      >
        {/* Center indicator */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: tokens.bgPanel,
          border: `2px solid ${tokens.borderDefault}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: cell?.color || tokens.accentBlue,
          }} />
          <span style={{
            fontSize: '8px',
            color: tokens.textMuted,
            marginTop: '2px',
          }}>
            [{cell?.row}, {cell?.col}]
          </span>
        </div>
        
        {/* Action buttons */}
        {actions.map((action, index) => {
          const angle = startAngle + index * angleStep;
          const x = Math.cos(angle) * tokens.radialMenuRadius;
          const y = Math.sin(angle) * tokens.radialMenuRadius;
          
          return (
            <button
              key={action.id}
              onClick={() => handleContextAction(action.id)}
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                width: '70px',
                height: '70px',
                minWidth: tokens.minTouchTarget,
                minHeight: tokens.minTouchTarget,
                borderRadius: '50%',
                background: tokens.bgPanel,
                border: `2px solid ${action.color}40`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: '0.15s ease',
              }}
            >
              <span style={{ fontSize: '20px' }}>{action.icon}</span>
              <span style={{
                fontSize: '9px',
                fontWeight: 500,
                color: action.color,
              }}>
                {action.label}
              </span>
            </button>
          );
        })}
        
        {/* Cancel hint */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: `calc(50% + ${tokens.radialMenuRadius + 60}px)`,
          transform: 'translateX(-50%)',
          padding: '6px 12px',
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          fontSize: '10px',
          color: tokens.textMuted,
        }}>
          🎮 B to cancel
        </div>
      </div>
    </>
  );
});

// =============================================================================
// PART 5: VR NAVIGATION CONTROLS
// =============================================================================

/**
 * VRNavigationControls - D-pad and zoom controls for VR
 */
export const VRNavigationControls = memo(function VRNavigationControls({
  onNavigate,
  onZoom,
  currentPosition,
}) {
  const { canvasSize } = useVRNavigator();
  
  // Direction buttons
  const directions = [
    { id: 'up', icon: '⬆️', dx: 0, dy: -1, pos: { top: 0, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'down', icon: '⬇️', dx: 0, dy: 1, pos: { bottom: 0, left: '50%', transform: 'translateX(-50%)' } },
    { id: 'left', icon: '⬅️', dx: -1, dy: 0, pos: { left: 0, top: '50%', transform: 'translateY(-50%)' } },
    { id: 'right', icon: '➡️', dx: 1, dy: 0, pos: { right: 0, top: '50%', transform: 'translateY(-50%)' } },
  ];
  
  // Check if direction is valid
  const canNavigate = (dx, dy) => {
    const newRow = currentPosition.row + dy;
    const newCol = currentPosition.col + dx;
    return newRow >= 0 && newCol >= 0 && 
           newRow < canvasSize.rows && newCol < canvasSize.cols;
  };
  
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
    }}>
      {/* D-pad */}
      <div style={{
        position: 'relative',
        width: '130px',
        height: '130px',
      }}>
        {/* Center display */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: `1px solid ${tokens.borderDefault}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: tokens.textSecondary,
        }}>
          {currentPosition.row},{currentPosition.col}
        </div>
        
        {/* Direction buttons */}
        {directions.map(dir => {
          const enabled = canNavigate(dir.dx, dir.dy);
          return (
            <button
              key={dir.id}
              onClick={() => enabled && onNavigate?.(dir.dx, dir.dy)}
              disabled={!enabled}
              style={{
                position: 'absolute',
                ...dir.pos,
                width: tokens.minTouchTarget,
                height: tokens.minTouchTarget,
                borderRadius: '8px',
                background: enabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${enabled ? tokens.borderDefault : 'transparent'}`,
                fontSize: '18px',
                cursor: enabled ? 'pointer' : 'not-allowed',
                opacity: enabled ? 1 : 0.3,
                transition: '0.15s ease',
              }}
            >
              {dir.icon}
            </button>
          );
        })}
      </div>
      
      {/* Zoom controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <button
          onClick={() => onZoom?.(1)}
          style={{
            width: tokens.minTouchTarget,
            height: tokens.minTouchTarget,
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${tokens.borderDefault}`,
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          🔍+
        </button>
        <button
          onClick={() => onZoom?.(-1)}
          style={{
            width: tokens.minTouchTarget,
            height: tokens.minTouchTarget,
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${tokens.borderDefault}`,
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          🔍−
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// PART 6: VR MULTI-SELECT TOOLBAR
// =============================================================================

/**
 * VRMultiSelectToolbar - Actions for selected cells
 */
export const VRMultiSelectToolbar = memo(function VRMultiSelectToolbar() {
  const { selectedCells, handleMerge, clearSelection } = useVRNavigator();
  
  if (selectedCells.length === 0) return null;
  
  const canMerge = selectedCells.length >= 2;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      background: tokens.bgPanel,
      border: `1px solid ${tokens.accent}40`,
      borderRadius: '24px',
    }}>
      <span style={{
        fontSize: '11px',
        color: tokens.textSecondary,
      }}>
        {selectedCells.length} selected
      </span>
      
      <div style={{ width: '1px', height: '20px', background: tokens.borderDefault }} />
      
      <button
        onClick={handleMerge}
        disabled={!canMerge}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          minHeight: tokens.minTouchTarget,
          background: canMerge ? `${tokens.accent}20` : 'transparent',
          border: `1px solid ${canMerge ? tokens.accent : tokens.borderDefault}`,
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 500,
          color: canMerge ? tokens.accent : tokens.textMuted,
          cursor: canMerge ? 'pointer' : 'not-allowed',
          opacity: canMerge ? 1 : 0.5,
        }}
      >
        🔗 Merge
      </button>
      
      <button
        onClick={clearSelection}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          minHeight: tokens.minTouchTarget,
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: '8px',
          fontSize: '11px',
          color: tokens.textSecondary,
          cursor: 'pointer',
        }}
      >
        ✕ Clear
      </button>
    </div>
  );
});

// =============================================================================
// PART 7: VR CANVAS NAVIGATOR (Complete)
// =============================================================================

/**
 * VRCanvasNavigator - Complete VR canvas navigator component
 */
export const VRCanvasNavigator = memo(function VRCanvasNavigator({
  cells,
  canvasSize,
  viewport,
  homepoint,
  collaborators,
  displayMode = 'names',
  onMovePlacement,
  onSwapPlacements,
  onDeletePlacement,
  onMergeCells,
  onSplitCell,
  onSetHomepoint,
  onNavigateToCell,
  onNavigate,
  onZoom,
}) {
  return (
    <VRNavigatorProvider
      cells={cells}
      canvasSize={canvasSize}
      onMovePlacement={onMovePlacement}
      onSwapPlacements={onSwapPlacements}
      onDeletePlacement={onDeletePlacement}
      onMergeCells={onMergeCells}
      onSplitCell={onSplitCell}
      onSetHomepoint={onSetHomepoint}
      onNavigateToCell={onNavigateToCell}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: tokens.textPrimary,
          }}>
            Canvas Navigator
          </span>
          
          <span style={{
            fontSize: '11px',
            color: tokens.textMuted,
          }}>
            {canvasSize.rows}×{canvasSize.cols} grid
          </span>
        </div>
        
        {/* Minimap */}
        <VRMinimapGrid
          viewport={viewport}
          homepoint={homepoint}
          collaborators={collaborators}
          displayMode={displayMode}
        />
        
        {/* Multi-select toolbar */}
        <VRMultiSelectToolbar />
        
        {/* Navigation controls */}
        <VRNavigationControls
          onNavigate={onNavigate}
          onZoom={onZoom}
          currentPosition={viewport || { row: 0, col: 0 }}
        />
        
        {/* Instructions */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '10px',
          color: tokens.textMuted,
          lineHeight: 1.5,
        }}>
          <strong style={{ color: tokens.textSecondary }}>Controls:</strong><br />
          • Tap cell → Tap destination to move<br />
          • Long-press for context menu<br />
          • Hold Grip + tap for multi-select<br />
          • Thumbstick to navigate viewport
        </div>
      </div>
      
      {/* Context menu (rendered via portal in real impl) */}
      <VRCellContextMenuPortal />
    </VRNavigatorProvider>
  );
});

/**
 * Portal component for context menu
 */
const VRCellContextMenuPortal = memo(function VRCellContextMenuPortal() {
  const { contextMenu, cancelOperation } = useVRNavigator();
  
  return (
    <VRCellContextMenu
      isOpen={!!contextMenu}
      cell={contextMenu?.cell}
      position={contextMenu?.position}
      onClose={cancelOperation}
    />
  );
});

// =============================================================================
// PART 8: CONTROLLER INTEGRATION HOOK
// =============================================================================

/**
 * useVRNavigatorController - Handle VR controller input for navigator
 */
export function useVRNavigatorController({
  onNavigate,
  onZoom,
}) {
  const { 
    handleGripChange, 
    cancelOperation,
  } = useVRNavigator();
  
  useEffect(() => {
    // This would integrate with actual WebXR controller events
    const handleControllerInput = (event) => {
      switch (event.type) {
        case 'grip':
          handleGripChange(event.pressed);
          break;
          
        case 'thumbstick':
          // Use thumbstick for navigation
          if (Math.abs(event.x) > 0.5 || Math.abs(event.y) > 0.5) {
            const dx = event.x > 0.5 ? 1 : event.x < -0.5 ? -1 : 0;
            const dy = event.y > 0.5 ? 1 : event.y < -0.5 ? -1 : 0;
            onNavigate?.(dx, dy);
          }
          break;
          
        case 'button_b':
          if (event.pressed) {
            cancelOperation();
          }
          break;
          
        default:
          break;
      }
    };
    
    // Would subscribe to XR controller events
    // window.addEventListener('xr-controller-input', handleControllerInput);
    
    return () => {
      // window.removeEventListener('xr-controller-input', handleControllerInput);
    };
  }, [handleGripChange, cancelOperation, onNavigate]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  NAV_OPERATIONS,
  CELL_ACTIONS,
  tokens as VR_NAVIGATOR_TOKENS,
};

export default {
  VRNavigatorProvider,
  useVRNavigator,
  VRCanvasNavigator,
  VRMinimapGrid,
  VRMinimapCell,
  VRCellContextMenu,
  VRNavigationControls,
  VRMultiSelectToolbar,
  useVRNavigatorController,
};
