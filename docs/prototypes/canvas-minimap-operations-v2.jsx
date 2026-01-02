import React, { useState, createContext, useContext, useCallback, useMemo, useRef } from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  bgCanvas: '#06060a',
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  bgPanel: 'rgba(12, 12, 18, 0.95)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderDefault: 'rgba(255,255,255,0.1)',
  borderMedium: 'rgba(255,255,255,0.15)',
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textMuted: '#606070',
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentTeal: '#2dd4bf',
  accentPurple: '#a78bfa',
  accentRed: '#f87171',
  accentPink: '#f472b6',
};

const INSTANCE_COLORS = [
  tokens.accentBlue, tokens.accentGreen, tokens.accentPink,
  tokens.accentAmber, tokens.accentTeal, tokens.accentPurple, tokens.accentRed,
];

// =============================================================================
// DROP ZONE TYPES
// =============================================================================
const DROP_ZONES = {
  NONE: 'none',
  PLACE: 'place',
  SWAP: 'swap',
  PUSH_UP: 'push_up',
  PUSH_DOWN: 'push_down',
  PUSH_LEFT: 'push_left',
  PUSH_RIGHT: 'push_right',
};

// =============================================================================
// OPERATION MODES
// =============================================================================
const MODES = {
  NAVIGATE: 'navigate',
  SELECT: 'select',
  DRAG: 'drag',
};

// =============================================================================
// VIEWPORT DISPLAY MODES
// =============================================================================
const VIEWPORT_DISPLAY = {
  FULL: 'full',       // Show full viewport indicator with border
  SUBTLE: 'subtle',   // Just brightness difference
  HIDDEN: 'hidden',   // Completely hidden
};

// =============================================================================
// MODE CONTEXT
// =============================================================================
const modeSizing = {
  desktop: { cellBase: { w: 48, h: 36 }, cellGap: 3, fontSize: { xs: 8, sm: 10 }, iconSize: 12, radius: 4, padding: 12 },
  vr: { cellBase: { w: 64, h: 48 }, cellGap: 4, fontSize: { xs: 10, sm: 12 }, iconSize: 16, radius: 6, padding: 16 },
};

const ModeContext = createContext({ mode: 'desktop', sizing: modeSizing.desktop });
const useModeContext = () => useContext(ModeContext);

// =============================================================================
// ICONS
// =============================================================================
const Icon = ({ name, size = 16, color }) => {
  const paths = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    merge: <><path d="M8 6L12 2L16 6"/><path d="M12 2v10"/><rect x="4" y="12" width="16" height="10" rx="2"/></>,
    split: <><rect x="4" y="2" width="16" height="10" rx="2"/><path d="M8 18L12 22L16 18"/><path d="M12 12v10"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    move: <><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></>,
    swap: <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    grip: <><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></>,
    pointer: <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    unlock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    maximize: <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    minimize: <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" 
      stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// =============================================================================
// UTILITY: Calculate drop zone from mouse position
// =============================================================================
const getDropZone = (e, cellRect, hasContent) => {
  const x = e.clientX - cellRect.left;
  const y = e.clientY - cellRect.top;
  const w = cellRect.width;
  const h = cellRect.height;
  
  const edgeX = w * 0.2;
  const edgeY = h * 0.2;
  
  if (y < edgeY) return DROP_ZONES.PUSH_UP;
  if (y > h - edgeY) return DROP_ZONES.PUSH_DOWN;
  if (x < edgeX) return DROP_ZONES.PUSH_LEFT;
  if (x > w - edgeX) return DROP_ZONES.PUSH_RIGHT;
  
  return hasContent ? DROP_ZONES.SWAP : DROP_ZONES.PLACE;
};

// =============================================================================
// DROP ZONE INDICATOR
// =============================================================================
const DropZoneIndicator = ({ zone, cellSize }) => {
  if (zone === DROP_ZONES.NONE) return null;
  
  const config = {
    [DROP_ZONES.PLACE]: { color: tokens.accentGreen, label: 'Place', icon: 'plus', full: true },
    [DROP_ZONES.SWAP]: { color: tokens.accentAmber, label: 'Swap', icon: 'swap', full: true },
    [DROP_ZONES.PUSH_UP]: { color: tokens.accentTeal, label: 'â†‘ Push', icon: 'chevronUp', edge: 'top' },
    [DROP_ZONES.PUSH_DOWN]: { color: tokens.accentTeal, label: 'â†“ Push', icon: 'chevronDown', edge: 'bottom' },
    [DROP_ZONES.PUSH_LEFT]: { color: tokens.accentTeal, label: 'â† Push', icon: 'chevronLeft', edge: 'left' },
    [DROP_ZONES.PUSH_RIGHT]: { color: tokens.accentTeal, label: 'â†’ Push', icon: 'chevronRight', edge: 'right' },
  }[zone];
  
  if (!config) return null;
  
  const edgeStyle = config.edge ? {
    position: 'absolute',
    background: `${config.color}30`,
    border: `2px solid ${config.color}`,
    ...(config.edge === 'top' && { top: 0, left: 0, right: 0, height: '30%', borderRadius: '4px 4px 0 0' }),
    ...(config.edge === 'bottom' && { bottom: 0, left: 0, right: 0, height: '30%', borderRadius: '0 0 4px 4px' }),
    ...(config.edge === 'left' && { top: 0, bottom: 0, left: 0, width: '30%', borderRadius: '4px 0 0 4px' }),
    ...(config.edge === 'right' && { top: 0, bottom: 0, right: 0, width: '30%', borderRadius: '0 4px 4px 0' }),
  } : null;
  
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: config.full ? `${config.color}20` : 'transparent',
      border: config.full ? `2px solid ${config.color}` : 'none',
      borderRadius: 4, pointerEvents: 'none', zIndex: 10,
    }}>
      {edgeStyle && <div style={edgeStyle} />}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        color: config.color, fontSize: 9, fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}>
        <Icon name={config.icon} size={14} color={config.color} />
        <span>{config.label}</span>
      </div>
    </div>
  );
};

// =============================================================================
// MINIMAP CELL
// =============================================================================
const MinimapCell = ({
  row, col, cell, cellIndex, 
  isInViewport, isHome, isSelected, isSelectable,
  viewportDisplay, // NEW: viewport display mode
  cellSize, gap,
  mode, dropZone,
  onMouseDown, onMouseEnter, onMouseLeave,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}) => {
  const { sizing } = useModeContext();
  const cellRef = useRef(null);
  const cellColor = cell ? INSTANCE_COLORS[cellIndex % INSTANCE_COLORS.length] : null;
  const colSpan = cell?.colSpan || 1;
  const rowSpan = cell?.rowSpan || 1;
  
  const handleDragOver = (e) => {
    e.preventDefault();
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const zone = getDropZone(e, rect, !!cell);
      onDragOver?.(e, row, col, zone);
    }
  };
  
  const isDragging = mode === MODES.DRAG;
  const showDropZone = isDragging && dropZone !== DROP_ZONES.NONE;
  
  // Subtle viewport indication: slightly brighter background
  const subtleViewportBg = isInViewport && viewportDisplay === VIEWPORT_DISPLAY.SUBTLE;
  
  return (
    <div
      ref={cellRef}
      draggable={!!cell}
      onMouseDown={(e) => onMouseDown?.(e, row, col, cell)}
      onMouseEnter={() => onMouseEnter?.(row, col)}
      onMouseLeave={onMouseLeave}
      onDragStart={(e) => onDragStart?.(e, row, col, cell)}
      onDragOver={handleDragOver}
      onDragLeave={(e) => onDragLeave?.(e, row, col)}
      onDrop={(e) => onDrop?.(e, row, col)}
      onDragEnd={onDragEnd}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        width: cellSize.w * colSpan + gap * (colSpan - 1),
        height: cellSize.h * rowSpan + gap * (rowSpan - 1),
        background: cell
          ? `linear-gradient(135deg, ${cellColor}18, ${cellColor}08)`
          : subtleViewportBg 
            ? 'rgba(255,255,255,0.06)' // Brighter for "you are here"
            : isInViewport && viewportDisplay === VIEWPORT_DISPLAY.FULL
              ? 'rgba(255,255,255,0.02)' 
              : 'transparent',
        border: isSelected
          ? `2px solid ${tokens.accentBlue}`
          : cell ? `1px solid ${cellColor}50` : `1px dashed ${tokens.borderSubtle}`,
        borderRadius: sizing.radius,
        cursor: cell ? 'grab' : isSelectable ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.1s ease',
        opacity: isDragging && !showDropZone ? 0.5 : 1,
        boxShadow: isSelected ? `0 0 0 1px ${tokens.accentBlue}40, inset 0 0 0 1px ${tokens.accentBlue}20` : 'none',
      }}
    >
      {/* Home indicator */}
      {isHome && (
        <div style={{ position: 'absolute', top: 2, left: 2, color: tokens.accentAmber }}>
          <Icon name="home" size={sizing.iconSize} />
        </div>
      )}
      
      {/* Merged indicator */}
      {cell && (colSpan > 1 || rowSpan > 1) && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          fontSize: 7, color: cellColor, opacity: 0.7,
          background: 'rgba(0,0,0,0.3)', padding: '1px 3px', borderRadius: 2,
        }}>
          {colSpan}Ã—{rowSpan}
        </div>
      )}
      
      {/* Cell label */}
      {cell && (
        <span style={{
          fontSize: sizing.fontSize.xs, fontWeight: 500,
          color: cellColor, opacity: 0.9,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 4px', maxWidth: '100%',
        }}>
          {cell.name?.substring(0, Math.floor(cellSize.w * colSpan / 7)) || `View ${cellIndex + 1}`}
        </span>
      )}
      
      {/* Selection checkbox */}
      {isSelectable && !cell && (
        <div style={{
          width: 14, height: 14,
          border: `2px solid ${isSelected ? tokens.accentBlue : tokens.borderMedium}`,
          borderRadius: 3,
          background: isSelected ? tokens.accentBlue : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected && <Icon name="check" size={10} color="#fff" />}
        </div>
      )}
      
      {/* Drag handle */}
      {cell && mode === MODES.NAVIGATE && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          color: tokens.textMuted, opacity: 0.4,
        }}>
          <Icon name="grip" size={8} />
        </div>
      )}
      
      {/* Drop zone indicator */}
      {showDropZone && <DropZoneIndicator zone={dropZone} cellSize={cellSize} />}
    </div>
  );
};

// =============================================================================
// VIEWPORT INDICATOR (when FULL mode)
// =============================================================================
const ViewportIndicator = ({ viewport, viewportSize, cellSize, gap, padding, locked }) => (
  <div style={{
    position: 'absolute',
    left: padding + viewport.col * (cellSize.w + gap),
    top: padding + viewport.row * (cellSize.h + gap),
    width: viewportSize.cols * (cellSize.w + gap) - gap,
    height: viewportSize.rows * (cellSize.h + gap) - gap,
    border: `2px solid ${locked ? tokens.accentAmber : tokens.accentTeal}`,
    borderRadius: 4,
    pointerEvents: 'none',
    boxShadow: `0 0 0 1px ${locked ? tokens.accentAmber : tokens.accentTeal}30`,
    background: `${locked ? tokens.accentAmber : tokens.accentTeal}05`,
    transition: 'all 0.15s ease',
    zIndex: 5,
  }}>
    {/* Lock indicator */}
    {locked && (
      <div style={{
        position: 'absolute', top: -8, right: -8,
        width: 16, height: 16, borderRadius: '50%',
        background: tokens.accentAmber,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="lock" size={10} color="#000" />
      </div>
    )}
  </div>
);

// =============================================================================
// COLLABORATOR CURSOR
// =============================================================================
const CollaboratorCursor = ({ row, col, user, cellSize, gap, padding }) => {
  const left = padding + col * (cellSize.w + gap) + cellSize.w / 2;
  const top = padding + row * (cellSize.h + gap) + cellSize.h / 2;
  
  return (
    <div style={{
      position: 'absolute', left, top,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      animation: 'pulse 2s ease-in-out infinite',
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: user.color,
        boxShadow: `0 0 0 2px ${tokens.bgPrimary}, 0 0 8px ${user.color}60`,
      }} />
      <div style={{
        fontSize: 8, color: user.color,
        background: tokens.bgSecondary, padding: '1px 4px',
        borderRadius: 3, whiteSpace: 'nowrap',
        border: `1px solid ${user.color}40`,
      }}>
        {user.name}
      </div>
    </div>
  );
};

// =============================================================================
// SELECTION RECTANGLE
// =============================================================================
const SelectionRectangle = ({ bounds, cellSize, gap, padding }) => {
  if (!bounds) return null;
  
  const { minRow, maxRow, minCol, maxCol } = bounds;
  const left = padding + minCol * (cellSize.w + gap);
  const top = padding + minRow * (cellSize.h + gap);
  const width = (maxCol - minCol + 1) * (cellSize.w + gap) - gap;
  const height = (maxRow - minRow + 1) * (cellSize.h + gap) - gap;
  
  return (
    <div style={{
      position: 'absolute', left, top, width, height,
      border: `2px dashed ${tokens.accentPurple}`,
      borderRadius: 4, background: `${tokens.accentPurple}10`,
      pointerEvents: 'none', zIndex: 15,
    }}>
      <div style={{
        position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, color: tokens.accentPurple, fontWeight: 600,
        background: tokens.bgSecondary, padding: '2px 6px', borderRadius: 3,
        whiteSpace: 'nowrap',
      }}>
        {maxCol - minCol + 1}Ã—{maxRow - minRow + 1} cells
      </div>
    </div>
  );
};

// =============================================================================
// TOOLBAR
// =============================================================================
const Toolbar = ({ 
  mode, setMode, selectedCells, 
  canMerge, canUnmerge, onMerge, onUnmerge, onDelete, onClearSelection,
  viewportLocked, setViewportLocked,
  viewportDisplay, setViewportDisplay,
  showCollaborators, setShowCollaborators,
}) => {
  const ToolButton = ({ icon, label, onClick, disabled, active, color = tokens.textSecondary, small }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: small ? 2 : 4,
        padding: small ? '4px 6px' : '6px 10px', borderRadius: 6,
        background: active ? `${color}20` : 'transparent',
        border: `1px solid ${active ? color + '50' : tokens.borderSubtle}`,
        color: disabled ? tokens.textMuted : active ? color : tokens.textSecondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: small ? 10 : 11, fontWeight: 500,
        transition: 'all 0.15s ease',
      }}
    >
      <Icon name={icon} size={small ? 12 : 14} />
      {!small && <span>{label}</span>}
    </button>
  );
  
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 12, background: tokens.bgSecondary, borderRadius: 8,
      border: `1px solid ${tokens.borderSubtle}`,
    }}>
      {/* Top Row: Mode + Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 2, background: tokens.bgTertiary, borderRadius: 6 }}>
          <ToolButton 
            icon="pointer" label="Navigate" 
            onClick={() => setMode(MODES.NAVIGATE)} 
            active={mode === MODES.NAVIGATE}
            color={tokens.accentTeal}
          />
          <ToolButton 
            icon="edit" label="Select" 
            onClick={() => setMode(MODES.SELECT)} 
            active={mode === MODES.SELECT}
            color={tokens.accentBlue}
          />
        </div>
        
        <div style={{ width: 1, height: 24, background: tokens.borderSubtle }} />
        
        {selectedCells.length > 0 && (
          <span style={{ fontSize: 11, color: tokens.accentBlue }}>
            {selectedCells.length} selected
          </span>
        )}
        
        <ToolButton icon="merge" label="Merge" onClick={onMerge} disabled={!canMerge} color={tokens.accentPurple} />
        <ToolButton icon="split" label="Unmerge" onClick={onUnmerge} disabled={!canUnmerge} color={tokens.accentAmber} />
        <ToolButton icon="trash" label="Delete" onClick={onDelete} disabled={selectedCells.length === 0} color={tokens.accentRed} />
        
        {selectedCells.length > 0 && (
          <ToolButton icon="x" label="Clear" onClick={onClearSelection} color={tokens.textMuted} />
        )}
      </div>
      
      {/* Bottom Row: View Options */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Viewport Display Toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 2, background: tokens.bgTertiary, borderRadius: 6 }}>
          <ToolButton 
            icon="maximize" label="Full" small
            onClick={() => setViewportDisplay(VIEWPORT_DISPLAY.FULL)} 
            active={viewportDisplay === VIEWPORT_DISPLAY.FULL}
            color={tokens.accentTeal}
          />
          <ToolButton 
            icon="layers" label="Subtle" small
            onClick={() => setViewportDisplay(VIEWPORT_DISPLAY.SUBTLE)} 
            active={viewportDisplay === VIEWPORT_DISPLAY.SUBTLE}
            color={tokens.accentTeal}
          />
          <ToolButton 
            icon="eyeOff" label="Hidden" small
            onClick={() => setViewportDisplay(VIEWPORT_DISPLAY.HIDDEN)} 
            active={viewportDisplay === VIEWPORT_DISPLAY.HIDDEN}
            color={tokens.textMuted}
          />
        </div>
        
        {/* Viewport Lock */}
        <ToolButton 
          icon={viewportLocked ? "lock" : "unlock"} 
          label={viewportLocked ? "Locked" : "Unlocked"} 
          onClick={() => setViewportLocked(!viewportLocked)}
          active={viewportLocked}
          color={tokens.accentAmber}
          small
        />
        
        <div style={{ width: 1, height: 20, background: tokens.borderSubtle }} />
        
        {/* Collaborators Toggle */}
        <ToolButton 
          icon="users" 
          label={showCollaborators ? "Collabs On" : "Collabs Off"} 
          onClick={() => setShowCollaborators(!showCollaborators)}
          active={showCollaborators}
          color={tokens.accentPink}
          small
        />
      </div>
    </div>
  );
};

// =============================================================================
// OPERATION LOG
// =============================================================================
const OperationLog = ({ operations }) => (
  <div style={{
    padding: 12, background: tokens.bgSecondary, borderRadius: 8,
    border: `1px solid ${tokens.borderSubtle}`,
    maxHeight: 180, overflow: 'auto',
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: tokens.textMuted, marginBottom: 8 }}>
      Operation Log
    </div>
    {operations.length === 0 ? (
      <div style={{ fontSize: 11, color: tokens.textMuted, fontStyle: 'italic' }}>
        Try dragging cells or merging selections.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {operations.map((op, i) => (
          <div key={i} style={{
            fontSize: 10, padding: '4px 8px', borderRadius: 4,
            background: tokens.bgTertiary, color: tokens.textSecondary,
            fontFamily: 'monospace',
          }}>
            <span style={{ color: op.color }}>{op.type}</span>: {op.detail}
          </div>
        ))}
      </div>
    )}
  </div>
);

// =============================================================================
// MERGE CONFLICT DIALOG (with Keep All option)
// =============================================================================
const MergeConflictDialog = ({ isOpen, views, onResolve, onCancel }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [displacedAction, setDisplacedAction] = useState('autoflow');
  const [keepAll, setKeepAll] = useState(false);
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (keepAll) {
      onResolve(selectedId, 'keep_all');
    } else {
      onResolve(selectedId, displacedAction);
    }
  };
  
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: tokens.bgPanel, borderRadius: 12,
        border: `1px solid ${tokens.borderDefault}`,
        padding: 20, maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
          Merge Conflict
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: tokens.textSecondary }}>
          {views.length} views are in the selected cells. Choose a primary view:
        </p>
        
        {/* View options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {views.map((view, i) => (
            <button
              key={view.id}
              onClick={() => setSelectedId(view.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 10, borderRadius: 6,
                background: selectedId === view.id ? `${INSTANCE_COLORS[i]}20` : tokens.bgTertiary,
                border: `1px solid ${selectedId === view.id ? INSTANCE_COLORS[i] : tokens.borderSubtle}`,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 3, background: INSTANCE_COLORS[i] }} />
              <span style={{ fontSize: 12, color: tokens.textPrimary, flex: 1 }}>{view.name}</span>
              {selectedId === view.id && (
                <span style={{ fontSize: 10, color: INSTANCE_COLORS[i] }}>Primary</span>
              )}
            </button>
          ))}
        </div>
        
        {/* Keep All Toggle */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setKeepAll(!keepAll)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: 10, borderRadius: 6,
              background: keepAll ? `${tokens.accentGreen}15` : tokens.bgTertiary,
              border: `1px solid ${keepAll ? tokens.accentGreen : tokens.borderSubtle}`,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 3,
              border: `2px solid ${keepAll ? tokens.accentGreen : tokens.borderMedium}`,
              background: keepAll ? tokens.accentGreen : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {keepAll && <Icon name="check" size={10} color="#fff" />}
            </div>
            <div>
              <div style={{ fontSize: 12, color: tokens.textPrimary }}>Keep All Views</div>
              <div style={{ fontSize: 10, color: tokens.textMuted }}>
                Primary expands, others autoflow to available cells
              </div>
            </div>
          </button>
        </div>
        
        {/* Displaced action (only if not Keep All) */}
        {!keepAll && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 6 }}>
              Other views will be:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'close', label: 'Closed (Not Placed)' },
                { value: 'autoflow', label: 'Autoflow to empty cells' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDisplacedAction(opt.value)}
                  style={{
                    flex: 1, padding: 8, borderRadius: 6,
                    background: displacedAction === opt.value ? `${tokens.accentBlue}20` : tokens.bgTertiary,
                    border: `1px solid ${displacedAction === opt.value ? tokens.accentBlue : tokens.borderSubtle}`,
                    color: tokens.textSecondary, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: 6,
            background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
            color: tokens.textSecondary, cursor: 'pointer', fontSize: 12,
          }}>
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedId}
            style={{
              padding: '8px 16px', borderRadius: 6,
              background: selectedId ? tokens.accentPurple : tokens.bgTertiary,
              border: 'none', color: '#fff', cursor: selectedId ? 'pointer' : 'not-allowed',
              opacity: selectedId ? 1 : 0.5, fontSize: 12, fontWeight: 500,
            }}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const CanvasMinimapOperations = () => {
  const [uiMode, setUiMode] = useState('desktop');
  const { sizing } = { sizing: modeSizing[uiMode] };
  
  // Grid state
  const [canvasSize, setCanvasSize] = useState({ rows: 5, cols: 6 });
  const [viewport, setViewport] = useState({ row: 0, col: 0 });
  const [viewportSize] = useState({ rows: 2, cols: 3 });
  const [homepoint] = useState({ row: 0, col: 0 });
  
  // Cells
  const [cells, setCells] = useState([
    { id: 'v1', row: 0, col: 0, name: 'Brain MRI', colSpan: 1, rowSpan: 1 },
    { id: 'v2', row: 0, col: 1, name: 'CT Scan', colSpan: 2, rowSpan: 1 },
    { id: 'v3', row: 0, col: 4, name: 'Notes', colSpan: 1, rowSpan: 1 },
    { id: 'v4', row: 1, col: 0, name: 'Heart US', colSpan: 1, rowSpan: 2 },
    { id: 'v5', row: 1, col: 2, name: 'Spine', colSpan: 1, rowSpan: 1 },
    { id: 'v6', row: 1, col: 4, name: 'Diff Plot', colSpan: 2, rowSpan: 1 },
    { id: 'v7', row: 2, col: 1, name: 'Lung CT', colSpan: 1, rowSpan: 1 },
    { id: 'v8', row: 3, col: 2, name: 'Timeline', colSpan: 2, rowSpan: 1 },
  ]);
  
  // Interaction state
  const [mode, setMode] = useState(MODES.NAVIGATE);
  const [selectedCells, setSelectedCells] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [dropZones, setDropZones] = useState({});
  const [operations, setOperations] = useState([]);
  const [mergeConflict, setMergeConflict] = useState(null);
  
  // NEW: Viewport & collaborator visibility options
  const [viewportLocked, setViewportLocked] = useState(false);
  const [viewportDisplay, setViewportDisplay] = useState(VIEWPORT_DISPLAY.FULL);
  const [showCollaborators, setShowCollaborators] = useState(true);
  
  // Sample collaborators
  const collaborators = [
    { row: 1, col: 3, name: 'Alice', color: tokens.accentPink },
    { row: 3, col: 4, name: 'Bob', color: tokens.accentGreen },
  ];
  
  // Sizing
  const zoom = 1;
  const cellSize = { w: sizing.cellBase.w * zoom, h: sizing.cellBase.h * zoom };
  const gap = sizing.cellGap;
  const padding = sizing.padding;
  
  // Helpers
  const getCellAt = useCallback((row, col) => {
    return cells.find(cell =>
      row >= cell.row && row < cell.row + (cell.rowSpan || 1) &&
      col >= cell.col && col < cell.col + (cell.colSpan || 1)
    );
  }, [cells]);
  
  const isInViewport = useCallback((row, col) => (
    row >= viewport.row && row < viewport.row + viewportSize.rows &&
    col >= viewport.col && col < viewport.col + viewportSize.cols
  ), [viewport, viewportSize]);
  
  const logOperation = useCallback((type, detail, color) => {
    setOperations(prev => [...prev.slice(-9), { type, detail, color }]);
  }, []);
  
  // Generate grid cells
  const gridCells = useMemo(() => {
    const result = [];
    let viewIndex = 0;
    
    for (let row = 0; row < canvasSize.rows; row++) {
      for (let col = 0; col < canvasSize.cols; col++) {
        const cell = getCellAt(row, col);
        if (cell && (cell.row !== row || cell.col !== col)) continue;
        
        result.push({
          row, col, cell,
          cellIndex: cell ? viewIndex++ : -1,
          key: `${row}-${col}`,
        });
      }
    }
    return result;
  }, [canvasSize, getCellAt]);
  
  // Selection bounds
  const selectionBounds = useMemo(() => {
    if (selectedCells.length < 2) return null;
    const coords = selectedCells.map(k => {
      const [r, c] = k.split('-').map(Number);
      return { row: r, col: c };
    });
    return {
      minRow: Math.min(...coords.map(c => c.row)),
      maxRow: Math.max(...coords.map(c => c.row)),
      minCol: Math.min(...coords.map(c => c.col)),
      maxCol: Math.max(...coords.map(c => c.col)),
    };
  }, [selectedCells]);
  
  const canMerge = useMemo(() => {
    if (!selectionBounds || selectedCells.length < 2) return false;
    const { minRow, maxRow, minCol, maxCol } = selectionBounds;
    const expectedCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return selectedCells.length === expectedCount;
  }, [selectedCells, selectionBounds]);
  
  const canUnmerge = useMemo(() => {
    if (selectedCells.length !== 1) return false;
    const [row, col] = selectedCells[0].split('-').map(Number);
    const cell = getCellAt(row, col);
    return cell && ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1);
  }, [selectedCells, getCellAt]);
  
  // Drag handlers
  const handleDragStart = useCallback((e, row, col, cell) => {
    if (!cell) return;
    setDragState({ row, col, cell });
    setMode(MODES.DRAG);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: cell.id, row, col }));
    e.dataTransfer.effectAllowed = 'move';
    logOperation('DRAG_START', `"${cell.name}" from (${col}, ${row})`, tokens.accentTeal);
  }, [logOperation]);
  
  const handleDragOver = useCallback((e, row, col, zone) => {
    e.preventDefault();
    setDropZones(prev => ({ ...prev, [`${row}-${col}`]: zone }));
  }, []);
  
  const handleDragLeave = useCallback((e, row, col) => {
    setDropZones(prev => {
      const next = { ...prev };
      delete next[`${row}-${col}`];
      return next;
    });
  }, []);
  
  const handleDrop = useCallback((e, targetRow, targetCol) => {
    e.preventDefault();
    if (!dragState) return;
    
    const { cell: draggedCell, row: srcRow, col: srcCol } = dragState;
    const targetCell = getCellAt(targetRow, targetCol);
    const zone = dropZones[`${targetRow}-${targetCol}`] || DROP_ZONES.PLACE;
    
    switch (zone) {
      case DROP_ZONES.PLACE:
        setCells(prev => prev.map(c => 
          c.id === draggedCell.id ? { ...c, row: targetRow, col: targetCol } : c
        ));
        logOperation('MOVE', `"${draggedCell.name}" to (${targetCol}, ${targetRow})`, tokens.accentGreen);
        break;
        
      case DROP_ZONES.SWAP:
        if (targetCell) {
          setCells(prev => prev.map(c => {
            if (c.id === draggedCell.id) return { ...c, row: targetRow, col: targetCol };
            if (c.id === targetCell.id) return { ...c, row: srcRow, col: srcCol };
            return c;
          }));
          logOperation('SWAP', `"${draggedCell.name}" â†” "${targetCell.name}"`, tokens.accentAmber);
        }
        break;
        
      case DROP_ZONES.PUSH_UP:
      case DROP_ZONES.PUSH_DOWN:
      case DROP_ZONES.PUSH_LEFT:
      case DROP_ZONES.PUSH_RIGHT:
        const direction = zone.replace('push_', '');
        logOperation('PUSH', `"${draggedCell.name}" â†’ ${direction} at (${targetCol}, ${targetRow})`, tokens.accentTeal);
        setCells(prev => prev.map(c => 
          c.id === draggedCell.id ? { ...c, row: targetRow, col: targetCol } : c
        ));
        break;
    }
    
    setDragState(null);
    setDropZones({});
    setMode(MODES.NAVIGATE);
  }, [dragState, dropZones, getCellAt, logOperation]);
  
  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropZones({});
    if (mode === MODES.DRAG) setMode(MODES.NAVIGATE);
  }, [mode]);
  
  // Click handler
  const handleCellClick = useCallback((e, row, col, cell) => {
    if (mode === MODES.SELECT) {
      const key = `${row}-${col}`;
      if (e.ctrlKey || e.metaKey) {
        setSelectedCells(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
      } else if (e.shiftKey && selectedCells.length > 0) {
        const lastKey = selectedCells[selectedCells.length - 1];
        const [lastRow, lastCol] = lastKey.split('-').map(Number);
        const minR = Math.min(row, lastRow), maxR = Math.max(row, lastRow);
        const minC = Math.min(col, lastCol), maxC = Math.max(col, lastCol);
        const rangeKeys = [];
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            rangeKeys.push(`${r}-${c}`);
          }
        }
        setSelectedCells(rangeKeys);
      } else {
        setSelectedCells([key]);
      }
    } else if (!viewportLocked) {
      // Navigate mode - only if viewport not locked
      setViewport({
        row: Math.min(row, canvasSize.rows - viewportSize.rows),
        col: Math.min(col, canvasSize.cols - viewportSize.cols),
      });
      logOperation('NAVIGATE', `Viewport to (${col}, ${row})`, tokens.accentTeal);
    } else {
      logOperation('LOCKED', `Viewport locked - unlock to navigate`, tokens.accentAmber);
    }
  }, [mode, selectedCells, canvasSize, viewportSize, viewportLocked, logOperation]);
  
  // Merge handler
  const handleMerge = useCallback(() => {
    if (!canMerge || !selectionBounds) return;
    
    const { minRow, maxRow, minCol, maxCol } = selectionBounds;
    const viewsInArea = cells.filter(cell =>
      cell.row >= minRow && cell.row <= maxRow &&
      cell.col >= minCol && cell.col <= maxCol
    );
    
    if (viewsInArea.length > 1) {
      setMergeConflict({ views: viewsInArea, bounds: selectionBounds });
    } else if (viewsInArea.length === 1) {
      const view = viewsInArea[0];
      setCells(prev => prev.map(c => 
        c.id === view.id 
          ? { ...c, row: minRow, col: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 }
          : c
      ));
      logOperation('MERGE', `"${view.name}" expanded to ${maxCol - minCol + 1}Ã—${maxRow - minRow + 1}`, tokens.accentPurple);
    } else {
      logOperation('MERGE', `Empty area ${maxCol - minCol + 1}Ã—${maxRow - minRow + 1}`, tokens.accentPurple);
    }
    setSelectedCells([]);
  }, [canMerge, selectionBounds, cells, logOperation]);
  
  // Merge conflict resolution (with Keep All)
  const handleMergeConflictResolve = useCallback((keepId, action) => {
    if (!mergeConflict) return;
    
    const { views, bounds } = mergeConflict;
    const { minRow, maxRow, minCol, maxCol } = bounds;
    const keepView = views.find(v => v.id === keepId);
    const displacedViews = views.filter(v => v.id !== keepId);
    
    if (action === 'keep_all') {
      // Find empty cells for autoflow
      const occupiedCells = new Set();
      cells.forEach(c => {
        for (let r = c.row; r < c.row + (c.rowSpan || 1); r++) {
          for (let col = c.col; col < c.col + (c.colSpan || 1); col++) {
            occupiedCells.add(`${r}-${col}`);
          }
        }
      });
      
      // Merge area will be occupied by keepView
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          occupiedCells.add(`${r}-${c}`);
        }
      }
      
      // Find empty cells
      const emptyCells = [];
      for (let r = 0; r < canvasSize.rows; r++) {
        for (let c = 0; c < canvasSize.cols; c++) {
          if (!occupiedCells.has(`${r}-${c}`)) {
            emptyCells.push({ row: r, col: c });
          }
        }
      }
      
      setCells(prev => {
        let flowIndex = 0;
        return prev.map(c => {
          if (c.id === keepId) {
            return { ...c, row: minRow, col: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
          }
          if (displacedViews.some(v => v.id === c.id)) {
            if (flowIndex < emptyCells.length) {
              const target = emptyCells[flowIndex++];
              return { ...c, row: target.row, col: target.col, rowSpan: 1, colSpan: 1 };
            }
            return { ...c, row: -1, col: -1 }; // No room, mark as not placed
          }
          return c;
        }).filter(c => c.row >= 0);
      });
      
      logOperation('MERGE', `Kept all: "${keepView.name}" primary, ${displacedViews.length} autoflowed`, tokens.accentGreen);
    } else {
      setCells(prev => {
        return prev.map(c => {
          if (c.id === keepId) {
            return { ...c, row: minRow, col: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
          }
          if (displacedViews.some(v => v.id === c.id)) {
            return action === 'close' ? null : { ...c, row: -1, col: -1 };
          }
          return c;
        }).filter(Boolean).filter(c => c.row >= 0);
      });
      
      logOperation('MERGE', `"${keepView.name}" kept, ${displacedViews.length} ${action === 'close' ? 'closed' : 'autoflowed'}`, tokens.accentPurple);
    }
    
    setMergeConflict(null);
    setSelectedCells([]);
  }, [mergeConflict, cells, canvasSize, logOperation]);
  
  const handleUnmerge = useCallback(() => {
    if (!canUnmerge) return;
    const [row, col] = selectedCells[0].split('-').map(Number);
    const cell = getCellAt(row, col);
    if (cell) {
      setCells(prev => prev.map(c => c.id === cell.id ? { ...c, rowSpan: 1, colSpan: 1 } : c));
      logOperation('UNMERGE', `"${cell.name}" back to 1Ã—1`, tokens.accentAmber);
    }
    setSelectedCells([]);
  }, [canUnmerge, selectedCells, getCellAt, logOperation]);
  
  const handleDelete = useCallback(() => {
    if (selectedCells.length === 0) return;
    const cellsToRemove = selectedCells.map(k => {
      const [r, c] = k.split('-').map(Number);
      return getCellAt(r, c);
    }).filter(Boolean);
    const uniqueIds = [...new Set(cellsToRemove.map(c => c.id))];
    setCells(prev => prev.filter(c => !uniqueIds.includes(c.id)));
    logOperation('DELETE', `Removed ${uniqueIds.length} view(s)`, tokens.accentRed);
    setSelectedCells([]);
  }, [selectedCells, getCellAt, logOperation]);
  
  // Grid dimensions
  const gridWidth = canvasSize.cols * cellSize.w + (canvasSize.cols - 1) * gap + padding * 2;
  const gridHeight = canvasSize.rows * cellSize.h + (canvasSize.rows - 1) * gap + padding * 2;
  
  return (
    <ModeContext.Provider value={{ mode: uiMode, sizing }}>
      <div style={{
        minHeight: '100vh', background: tokens.bgCanvas, color: tokens.textPrimary,
        fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
        padding: 24,
      }}>
        {/* Header */}
        <div style={{ maxWidth: 950, margin: '0 auto 16px' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            Canvas Minimap â€“ Full Operations
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: tokens.textMuted }}>
            Drag to move/swap, select cells to merge, lock viewport to prevent accidental navigation.
          </p>
        </div>
        
        {/* UI Mode Toggle */}
        <div style={{ maxWidth: 950, margin: '0 auto 12px', display: 'flex', gap: 8 }}>
          {['desktop', 'vr'].map(m => (
            <button key={m} onClick={() => setUiMode(m)} style={{
              padding: '6px 12px', borderRadius: 6,
              background: uiMode === m ? `${tokens.accentBlue}20` : tokens.bgSecondary,
              border: `1px solid ${uiMode === m ? tokens.accentBlue : tokens.borderSubtle}`,
              color: uiMode === m ? tokens.accentBlue : tokens.textMuted,
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>
              {m === 'vr' ? 'ðŸ¥½ VR' : 'ðŸ–¥ï¸ Desktop'}
            </button>
          ))}
        </div>
        
        {/* Toolbar */}
        <div style={{ maxWidth: 950, margin: '0 auto 16px' }}>
          <Toolbar
            mode={mode} setMode={setMode}
            selectedCells={selectedCells}
            canMerge={canMerge} canUnmerge={canUnmerge}
            onMerge={handleMerge} onUnmerge={handleUnmerge}
            onDelete={handleDelete} onClearSelection={() => setSelectedCells([])}
            viewportLocked={viewportLocked} setViewportLocked={setViewportLocked}
            viewportDisplay={viewportDisplay} setViewportDisplay={setViewportDisplay}
            showCollaborators={showCollaborators} setShowCollaborators={setShowCollaborators}
          />
        </div>
        
        {/* Main Layout */}
        <div style={{
          maxWidth: 950, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16,
        }}>
          {/* Minimap */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: 16, background: tokens.bgSecondary, borderRadius: 12,
            border: `1px solid ${tokens.borderSubtle}`,
          }}>
            <div style={{
              position: 'relative', width: gridWidth, height: gridHeight,
              background: tokens.bgPrimary, borderRadius: sizing.radius * 2,
              border: `1px solid ${tokens.borderSubtle}`,
            }}>
              {/* Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${canvasSize.cols}, ${cellSize.w}px)`,
                gridTemplateRows: `repeat(${canvasSize.rows}, ${cellSize.h}px)`,
                gap, padding,
              }}>
                {gridCells.map(({ row, col, cell, cellIndex, key }) => (
                  <MinimapCell
                    key={key}
                    row={row} col={col} cell={cell} cellIndex={cellIndex}
                    isInViewport={isInViewport(row, col)}
                    isHome={homepoint && row === homepoint.row && col === homepoint.col}
                    isSelected={selectedCells.includes(key)}
                    isSelectable={mode === MODES.SELECT}
                    viewportDisplay={viewportDisplay}
                    cellSize={cellSize} gap={gap}
                    mode={mode}
                    dropZone={dropZones[key] || DROP_ZONES.NONE}
                    onMouseDown={handleCellClick}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
              
              {/* Viewport indicator (only in FULL mode) */}
              {viewportDisplay === VIEWPORT_DISPLAY.FULL && (
                <ViewportIndicator
                  viewport={viewport} viewportSize={viewportSize}
                  cellSize={cellSize} gap={gap} padding={padding}
                  locked={viewportLocked}
                />
              )}
              
              {/* Selection rectangle */}
              <SelectionRectangle
                bounds={selectionBounds}
                cellSize={cellSize} gap={gap} padding={padding}
              />
              
              {/* Collaborators */}
              {showCollaborators && collaborators.map((collab, i) => (
                <CollaboratorCursor
                  key={i}
                  row={collab.row} col={collab.col} user={collab}
                  cellSize={cellSize} gap={gap} padding={padding}
                />
              ))}
            </div>
          </div>
          
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <OperationLog operations={operations} />
            
            {/* Legend */}
            <div style={{
              padding: 12, background: tokens.bgSecondary, borderRadius: 8,
              border: `1px solid ${tokens.borderSubtle}`, fontSize: 10,
            }}>
              <div style={{ fontWeight: 600, color: tokens.textMuted, marginBottom: 6 }}>Viewport Display</div>
              {[
                { mode: 'Full', desc: 'Border + lock indicator', color: tokens.accentTeal },
                { mode: 'Subtle', desc: 'Just brighter cells', color: tokens.textSecondary },
                { mode: 'Hidden', desc: 'No visual indicator', color: tokens.textMuted },
              ].map(({ mode, desc, color }) => (
                <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, background: color, borderRadius: 2 }} />
                  <span style={{ color: tokens.textSecondary }}><strong>{mode}</strong> â€“ {desc}</span>
                </div>
              ))}
            </div>
            
            {/* Instructions */}
            <div style={{
              padding: 12, background: tokens.bgSecondary, borderRadius: 8,
              border: `1px solid ${tokens.borderSubtle}`, fontSize: 10, color: tokens.textSecondary,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: tokens.textMuted }}>Tips</div>
              <ul style={{ margin: 0, paddingLeft: 14, lineHeight: 1.6 }}>
                <li><strong>Lock viewport</strong> to rearrange without jumping</li>
                <li><strong>Subtle mode</strong> shows "you are here" without distraction</li>
                <li><strong>Keep All</strong> in merge preserves all views</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Merge Conflict Dialog */}
        <MergeConflictDialog
          isOpen={!!mergeConflict}
          views={mergeConflict?.views || []}
          onResolve={handleMergeConflictResolve}
          onCancel={() => setMergeConflict(null)}
        />
        
        <style>{`
          button:hover:not(:disabled) { filter: brightness(1.1); }
          button:active:not(:disabled) { transform: scale(0.98); }
          * { box-sizing: border-box; }
          [draggable]:active { cursor: grabbing; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    </ModeContext.Provider>
  );
};

export default CanvasMinimapOperations;
