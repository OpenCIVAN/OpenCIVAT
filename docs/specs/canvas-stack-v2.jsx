import React, { useState, useRef, useEffect } from 'react';

// Design Tokens
const tokens = {
  bgCanvas: '#030303',
  bgPrimary: '#060a12',
  bgSecondary: '#0c1220',
  bgTertiary: '#121a2e',
  bgElevated: '#18223c',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
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
  gap: 8,
  radiusSm: 4,
  radiusMd: 6,
  radiusLg: 8,
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '96, 165, 250';
};

// Icons as simple components
const Icon = ({ name, size = 16 }) => {
  const icons = {
    box: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    focus: <><circle cx="12" cy="12" r="3"/><path d="M3 12h2m14 0h2M12 3v2m0 14v2"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    panelLeft: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></>,
    panelRight: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></>,
    glasses: <><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0"/><path d="M2.5 13 2 10l3-1"/><path d="M21.5 13l.5-3-3-1"/></>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// Icon Button
const IconButton = ({ icon, title, onClick, active, danger, disabled, size = 20, badge }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      width: size + 8,
      height: size + 8,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 255, 255, 0.04)',
      border: `1px solid ${active ? 'rgba(96, 165, 250, 0.3)' : tokens.borderDefault}`,
      borderRadius: tokens.radiusSm,
      color: danger ? tokens.accentRed : (active ? tokens.accentBlue : tokens.textTertiary),
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      position: 'relative',
      flexShrink: 0,
    }}
  >
    <Icon name={icon} size={size - 4} />
    {badge && (
      <span style={{
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        background: tokens.accentGreen,
        fontSize: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
        fontWeight: 'bold',
      }}>
        {badge}
      </span>
    )}
  </button>
);

// Responsive Instance Header - ALWAYS visible
const InstanceHeader = ({ name, color, cellWidth, onClose, onFocus, collaborators = [] }) => {
  const colorRgb = hexToRgb(color);
  const isUltraCompact = cellWidth < 100;
  const isCompact = cellWidth < 150;
  
  const headerHeight = isUltraCompact ? 24 : (isCompact ? 28 : 32);
  const padding = isUltraCompact ? 3 : (isCompact ? 4 : 6);
  const fontSize = isUltraCompact ? 9 : (isCompact ? 10 : 12);
  const buttonSize = isUltraCompact ? 14 : (isCompact ? 16 : 18);
  const dotSize = isUltraCompact ? 4 : (isCompact ? 5 : 6);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${padding}px ${padding + 2}px`,
      background: tokens.bgSecondary,
      borderBottom: `1px solid ${tokens.borderSubtle}`,
      height: headerHeight,
      flexShrink: 0,
      gap: isUltraCompact ? 2 : 4,
    }}>
      {/* Left - Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isUltraCompact ? 2 : 4, minWidth: 0, flex: 1 }}>
        {/* Live indicator */}
        {!isCompact && collaborators.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '2px 5px',
            background: 'rgba(74, 222, 128, 0.12)',
            borderRadius: 8,
          }}>
            <div className="live-pulse" style={{ width: 4, height: 4, borderRadius: '50%', background: tokens.accentGreen }} />
            <span style={{ fontSize: 8, color: tokens.accentGreen }}>{collaborators.length}</span>
          </div>
        )}
        
        {/* Label Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isUltraCompact ? 2 : 4,
          padding: `2px ${isUltraCompact ? 4 : 6}px`,
          background: `rgba(${colorRgb}, 0.12)`,
          border: `1px solid rgba(${colorRgb}, 0.25)`,
          borderRadius: tokens.radiusSm,
          minWidth: 0,
          flex: 1,
        }}>
          <div style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 4px ${color}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize,
            fontWeight: 500,
            color: color,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
        </div>
      </div>
      
      {/* Right - Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isUltraCompact ? 1 : 2 }}>
        {!isUltraCompact && <IconButton icon="more" title="More" size={buttonSize} onClick={(e) => e.stopPropagation()} />}
        <IconButton icon="focus" title="Focus (Enter)" size={buttonSize} onClick={(e) => { e.stopPropagation(); onFocus?.(); }} />
        <IconButton icon="x" title="Close" size={buttonSize} onClick={(e) => { e.stopPropagation(); onClose?.(); }} danger />
      </div>
    </div>
  );
};

// Instance Viewport
const InstanceViewport = ({ viewConfig, isActive, cellWidth, cellHeight, onActivate, onClose, onFocus, collaborators = [], style }) => {
  const color = viewConfig.color || tokens.accentBlue;
  const colorRgb = hexToRgb(color);
  
  return (
    <div
      onClick={onActivate}
      onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: tokens.bgSecondary,
        borderRadius: tokens.radiusLg,
        border: `1px solid ${isActive ? color : tokens.borderDefault}`,
        boxShadow: isActive 
          ? `0 0 0 1px ${color}, 0 0 16px rgba(${colorRgb}, 0.2)`
          : 'inset 0 0 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.2s',
        ...style,
      }}
    >
      <InstanceHeader
        name={viewConfig.name}
        color={color}
        cellWidth={cellWidth}
        collaborators={collaborators}
        onClose={onClose}
        onFocus={onFocus}
      />
      
      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.bgCanvas,
        position: 'relative',
        minHeight: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: tokens.textMuted }}>
          <Icon name="box" size={Math.min(40, cellWidth * 0.15)} />
          {cellWidth > 120 && <span style={{ fontSize: 10, opacity: 0.6 }}>Double-click to focus</span>}
        </div>
        
        {/* Live indicator for small cells */}
        {cellWidth < 120 && collaborators.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 4,
            left: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            background: 'rgba(74, 222, 128, 0.2)',
            borderRadius: 8,
          }}>
            <div className="live-pulse" style={{ width: 4, height: 4, borderRadius: '50%', background: tokens.accentGreen }} />
            <span style={{ fontSize: 8, color: tokens.accentGreen }}>{collaborators.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Empty Cell
const EmptyCell = ({ row, col, cellWidth, onAddContent }) => {
  const [hovering, setHovering] = useState(false);
  const buttonSize = Math.min(36, cellWidth * 0.2);
  
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => onAddContent?.('view')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px dashed ${hovering ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: tokens.radiusMd,
        background: hovering ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <button style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: '50%',
        border: `2px solid ${hovering ? tokens.accentBlue : tokens.borderSubtle}`,
        background: hovering ? 'rgba(96, 165, 250, 0.15)' : tokens.bgSecondary,
        color: hovering ? tokens.accentBlue : tokens.textMuted,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon name="plus" size={buttonSize * 0.45} />
      </button>
      
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 4,
        fontSize: 8,
        fontFamily: 'monospace',
        color: tokens.textMuted,
        opacity: hovering ? 0.8 : 0.4,
      }}>
        [{row},{col}]
      </div>
    </div>
  );
};

// Subset Card
const SubsetCard = ({ subset, cellWidth, onFocus, onClose }) => {
  const [hovering, setHovering] = useState(false);
  const colorRgb = hexToRgb(subset.color);
  const gridSize = subset.layout === '2x2' ? 2 : 3;
  
  return (
    <div
      onDoubleClick={onFocus}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: `rgba(${colorRgb}, 0.06)`,
        borderRadius: tokens.radiusLg,
        border: `2px dashed rgba(${colorRgb}, 0.3)`,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <InstanceHeader
        name={subset.name}
        color={subset.color}
        cellWidth={cellWidth}
        onClose={onClose}
        onFocus={onFocus}
      />
      
      {/* Preview Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        gap: 3,
        padding: 6,
        minHeight: 0,
      }}>
        {Array.from({ length: gridSize * gridSize }).map((_, i) => (
          <div key={i} style={{
            background: tokens.bgCanvas,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${tokens.borderSubtle}`,
          }}>
            <Icon name="box" size={12} />
          </div>
        ))}
      </div>
      
      {hovering && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radiusLg,
        }}>
          <div style={{
            padding: '8px 16px',
            background: subset.color,
            borderRadius: tokens.radiusMd,
            color: '#000',
            fontWeight: 600,
            fontSize: 12,
          }}>
            Open Subset
          </div>
        </div>
      )}
    </div>
  );
};

// Canvas Header
const CanvasHeader = ({ viewStack, currentViewIndex, onBack, onHome, viewport, gridSize, onViewportChange, onGridSizeChange }) => {
  const canGoBack = currentViewIndex > 0;
  const currentView = viewStack[currentViewIndex];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 10px',
      background: tokens.bgTertiary,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      minHeight: 36,
    }}>
      {/* Left - Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton icon="arrowLeft" title="Back (Esc)" size={18} onClick={onBack} disabled={!canGoBack} />
        <IconButton icon="home" title="Home" size={18} onClick={onHome} active={currentViewIndex === 0} />
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {viewStack.map((view, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="chevronRight" size={12} />}
              <span style={{
                fontSize: 11,
                color: i === currentViewIndex ? tokens.accentBlue : tokens.textMuted,
                fontWeight: i === currentViewIndex ? 500 : 400,
              }}>
                {view.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Center - Viewport Navigation */}
      {currentView?.type === 'grid' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconButton icon="chevronLeft" size={16} onClick={() => onViewportChange?.('left')} />
          <IconButton icon="chevronUp" size={16} onClick={() => onViewportChange?.('up')} />
          <div style={{
            padding: '3px 10px',
            background: tokens.bgSecondary,
            border: `1px solid ${tokens.borderDefault}`,
            borderRadius: tokens.radiusSm,
            fontSize: 11,
            fontFamily: 'monospace',
          }}>
            {viewport.col}, {viewport.row}
          </div>
          <IconButton icon="chevronDown" size={16} onClick={() => onViewportChange?.('down')} />
          <IconButton icon="chevronRight" size={16} onClick={() => onViewportChange?.('right')} />
        </div>
      )}
      
      {/* Right - Grid Controls */}
      {currentView?.type === 'grid' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: tokens.textMuted }}>Grid:</span>
          <select
            value={`${gridSize.rows}x${gridSize.cols}`}
            onChange={(e) => {
              const [r, c] = e.target.value.split('x').map(Number);
              onGridSizeChange?.({ rows: r, cols: c });
            }}
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: tokens.bgSecondary,
              border: `1px solid ${tokens.borderDefault}`,
              borderRadius: tokens.radiusSm,
              color: tokens.textPrimary,
            }}
          >
            <option value="1x2">1×2</option>
            <option value="2x2">2×2</option>
            <option value="2x3">2×3</option>
            <option value="3x3">3×3</option>
            <option value="3x4">3×4</option>
            <option value="4x4">4×4</option>
          </select>
        </div>
      )}
    </div>
  );
};

// Canvas Footer
const CanvasFooter = ({ cellWidth, cellHeight, viewStackDepth }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 10px',
    background: tokens.bgTertiary,
    borderTop: `1px solid ${tokens.borderDefault}`,
    fontSize: 10,
    color: tokens.textMuted,
  }}>
    <span>Cell: {Math.round(cellWidth)}×{Math.round(cellHeight)}px</span>
    <span>
      {cellWidth < 100 ? '⚠️ Small cells - use Focus mode' : 
       cellWidth < 150 ? 'Compact mode' :
       cellWidth < 200 ? 'Medium mode' : 'Full mode'}
    </span>
    <span>Depth: {viewStackDepth}</span>
  </div>
);

// Edge Trigger
const EdgeTrigger = ({ side, onClick }) => {
  const [hovering, setHovering] = useState(false);
  const isLeft = side === 'left';
  
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
      style={{
        position: 'absolute',
        [side]: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: hovering ? 32 : 12,
        height: 80,
        background: hovering ? tokens.bgTertiary : 'transparent',
        borderRadius: isLeft ? '0 8px 8px 0' : '8px 0 0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        zIndex: 60,
        border: hovering ? `1px solid ${tokens.borderDefault}` : 'none',
      }}
    >
      {hovering && <Icon name={isLeft ? 'panelLeft' : 'panelRight'} size={16} />}
    </div>
  );
};

// Floating Panel
const FloatingPanel = ({ side, visible, onClose, children }) => {
  if (!visible) return null;
  const isLeft = side === 'left';
  
  return (
    <div style={{
      position: 'absolute',
      [side]: 0,
      top: 0,
      bottom: 0,
      width: 260,
      background: tokens.bgSecondary,
      borderRight: isLeft ? `1px solid ${tokens.borderDefault}` : undefined,
      borderLeft: isLeft ? undefined : `1px solid ${tokens.borderDefault}`,
      boxShadow: isLeft ? '4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.3)',
      zIndex: 70,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderDefault}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{isLeft ? 'Views & Tools' : 'Properties'}</span>
        <IconButton icon="x" size={16} onClick={onClose} />
      </div>
      <div style={{ flex: 1, padding: 12, color: tokens.textMuted, fontSize: 11 }}>
        {children || 'Panel content...'}
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [viewStack, setViewStack] = useState([{ type: 'grid', label: 'Canvas' }]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });
  const [viewport, setViewport] = useState({ row: 0, col: 0 });
  const [activeViewId, setActiveViewId] = useState('view-1');
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [transition, setTransition] = useState(null); // For zoom animation
  
  const [placements, setPlacements] = useState([
    { id: 'view-1', type: 'vtk', name: 'Brain MRI', color: tokens.accentBlue, row: 0, col: 0 },
    { id: 'view-2', type: 'vtk', name: 'CT Chest', color: tokens.accentPurple, row: 0, col: 1 },
    { id: 'view-3', type: 'vtk', name: 'Skull Mesh', color: tokens.accentTeal, row: 0, col: 2 },
    { id: 'view-4', type: 'chart', name: 'Histogram', color: tokens.accentGreen, row: 1, col: 0 },
    { id: 'subset-1', type: 'subset', name: 'Comparison', color: tokens.accentAmber, row: 1, col: 1, layout: '2x2', viewIds: ['view-1', 'view-2', 'view-3', 'view-4'] },
  ]);
  
  // Container size (simplified for demo)
  const containerSize = { width: 800, height: 450 };
  const gap = tokens.gap;
  const cellWidth = (containerSize.width - gap * (gridSize.cols + 1)) / gridSize.cols;
  const cellHeight = (containerSize.height - gap * (gridSize.rows + 1)) / gridSize.rows;
  
  // Navigation
  const pushView = (view, sourceRect) => {
    // Collapse panels when focusing
    setLeftPanelVisible(false);
    setRightPanelVisible(false);
    
    // Start zoom animation
    if (sourceRect) {
      setTransition({ from: sourceRect, to: { x: 0, y: 0, width: '100%', height: '100%' } });
      setTimeout(() => setTransition(null), 300);
    }
    
    const newStack = [...viewStack.slice(0, currentViewIndex + 1), view];
    setViewStack(newStack);
    setCurrentViewIndex(newStack.length - 1);
  };
  
  const goBack = () => {
    if (currentViewIndex > 0) {
      setCurrentViewIndex(currentViewIndex - 1);
    } else {
      // At root - deselect active cell
      setActiveViewId(null);
    }
  };
  
  const goHome = () => setCurrentViewIndex(0);
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        goBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentViewIndex]);
  
  const handleFocus = (item) => {
    if (item.type === 'subset') {
      pushView({ type: 'subset', label: item.name, data: item });
    } else {
      pushView({ type: 'focus', label: item.name, data: item });
    }
  };
  
  const handleViewportChange = (dir) => {
    setViewport(prev => ({
      left: { ...prev, col: Math.max(0, prev.col - 1) },
      right: { ...prev, col: prev.col + 1 },
      up: { ...prev, row: Math.max(0, prev.row - 1) },
      down: { ...prev, row: prev.row + 1 },
    }[dir]));
  };
  
  const handleAddContent = (row, col) => {
    const id = `view-${Date.now()}`;
    const colors = [tokens.accentBlue, tokens.accentPurple, tokens.accentTeal, tokens.accentGreen];
    setPlacements(prev => [...prev, { id, type: 'vtk', name: 'New View', color: colors[Math.floor(Math.random() * colors.length)], row, col }]);
  };
  
  const handleClose = (id) => setPlacements(prev => prev.filter(p => p.id !== id));
  
  const getCollaborators = (id) => id === 'view-2' ? [{ name: 'Alice' }, { name: 'Bob' }] : [];
  const getPlacement = (row, col) => placements.find(p => p.row === row && p.col === col);
  const currentView = viewStack[currentViewIndex];
  
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: tokens.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: tokens.textPrimary,
    }}>
      {/* App Header */}
      {headerVisible ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: tokens.bgSecondary,
          borderBottom: `1px solid ${tokens.borderDefault}`,
          height: 44,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>CIA Web</div>
            <span style={{ color: tokens.textMuted }}>|</span>
            <span style={{ fontSize: 12, color: tokens.textSecondary }}>Project Alpha → Main Room</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconButton icon="users" title="2 online" badge="2" size={18} />
            <IconButton icon="glasses" title="Enter VR" size={18} />
            <IconButton icon="chevronUp" title="Hide header" size={18} onClick={() => setHeaderVisible(false)} />
          </div>
        </div>
      ) : (
        <div onClick={() => setHeaderVisible(true)} style={{
          height: 6,
          background: tokens.bgTertiary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ width: 40, height: 2, background: tokens.borderMedium, borderRadius: 1 }} />
        </div>
      )}
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Activity Bar */}
        <div style={{
          width: 44,
          background: tokens.bgSecondary,
          borderRight: `1px solid ${tokens.borderDefault}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: 6,
        }}>
          <IconButton icon="grid" title="Views" size={18} active />
          <IconButton icon="layers" title="Datasets" size={18} />
          <IconButton icon="settings" title="Instance Tools (T)" size={18} onClick={() => {
            // Auto-focus if cell too small
            if (cellWidth < 200 && activeViewId) {
              const view = placements.find(p => p.id === activeViewId);
              if (view) handleFocus(view);
            }
          }} />
          <div style={{ flex: 1 }} />
          <IconButton icon="bookmark" title="Subsets" size={18} />
        </div>
        
        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Canvas Header */}
          <CanvasHeader
            viewStack={viewStack}
            currentViewIndex={currentViewIndex}
            onBack={goBack}
            onHome={goHome}
            viewport={viewport}
            gridSize={gridSize}
            onViewportChange={handleViewportChange}
            onGridSizeChange={setGridSize}
          />
          
          {/* Canvas Content */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: tokens.bgCanvas }}>
            {/* Edge Triggers */}
            <EdgeTrigger side="left" onClick={() => setLeftPanelVisible(!leftPanelVisible)} />
            <EdgeTrigger side="right" onClick={() => setRightPanelVisible(!rightPanelVisible)} />
            
            {/* Panels */}
            <FloatingPanel side="left" visible={leftPanelVisible} onClose={() => setLeftPanelVisible(false)} />
            <FloatingPanel side="right" visible={rightPanelVisible} onClose={() => setRightPanelVisible(false)} />
            
            {/* Grid View */}
            {currentView.type === 'grid' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
                gap,
                padding: gap,
                width: '100%',
                height: '100%',
              }}>
                {Array.from({ length: gridSize.rows * gridSize.cols }).map((_, i) => {
                  const row = Math.floor(i / gridSize.cols);
                  const col = i % gridSize.cols;
                  const placement = getPlacement(row, col);
                  
                  if (!placement) {
                    return <EmptyCell key={`${row}-${col}`} row={row} col={col} cellWidth={cellWidth} onAddContent={() => handleAddContent(row, col)} />;
                  }
                  
                  if (placement.type === 'subset') {
                    return <SubsetCard key={placement.id} subset={placement} cellWidth={cellWidth} onFocus={() => handleFocus(placement)} onClose={() => handleClose(placement.id)} />;
                  }
                  
                  return (
                    <InstanceViewport
                      key={placement.id}
                      viewConfig={placement}
                      cellWidth={cellWidth}
                      cellHeight={cellHeight}
                      isActive={activeViewId === placement.id}
                      collaborators={getCollaborators(placement.id)}
                      onActivate={() => setActiveViewId(placement.id)}
                      onClose={() => handleClose(placement.id)}
                      onFocus={() => handleFocus(placement)}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Focus View */}
            {currentView.type === 'focus' && (
              <div style={{ width: '100%', height: '100%', padding: gap, animation: 'zoomIn 0.25s ease-out' }}>
                <InstanceViewport
                  viewConfig={currentView.data}
                  cellWidth={800}
                  cellHeight={600}
                  isActive={true}
                  onClose={goBack}
                  onFocus={() => {}}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
            
            {/* Subset View */}
            {currentView.type === 'subset' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${currentView.data.layout === '2x2' ? 2 : 3}, 1fr)`,
                gridTemplateRows: `repeat(${currentView.data.layout === '2x2' ? 2 : 3}, 1fr)`,
                gap,
                padding: gap,
                width: '100%',
                height: '100%',
                animation: 'zoomIn 0.25s ease-out',
              }}>
                {currentView.data.viewIds.map((viewId, i) => {
                  const view = placements.find(p => p.id === viewId);
                  if (!view) return <div key={i} style={{ border: `2px dashed ${tokens.borderDefault}`, borderRadius: tokens.radiusLg }} />;
                  return (
                    <InstanceViewport
                      key={view.id}
                      viewConfig={view}
                      cellWidth={300}
                      cellHeight={250}
                      isActive={i === 0}
                      onClose={() => {}}
                      onFocus={() => pushView({ type: 'focus', label: view.name, data: view })}
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Canvas Footer */}
          <CanvasFooter cellWidth={cellWidth} cellHeight={cellHeight} viewStackDepth={viewStack.length} />
        </div>
      </div>
      
      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.9); opacity: 0.5; }
          to { transform: scale(1); opacity: 1; }
        }
        .live-pulse { animation: pulse 1.5s ease-in-out infinite; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
        select:focus { outline: 1px solid ${tokens.accentBlue}; }
      `}</style>
    </div>
  );
}
