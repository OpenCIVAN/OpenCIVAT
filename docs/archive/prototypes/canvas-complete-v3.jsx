import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_CELL_SIZE = 300; // Minimum for usable focus mode
const MIN_SUBSET_CANVAS = { width: 600, height: 500 }; // Minimum for 2x2 subset
const MAX_GRID = 10;
const GRID_PRESETS = ['1x2', '2x2', '2x3', '3x3', '3x4', '4x4', '5x5', '10x10'];
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '96, 165, 250';
};

// =============================================================================
// ICON COMPONENT
// =============================================================================

const Icon = ({ name, size = 16, style = {} }) => {
  const paths = {
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    focus: <><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    panelLeft: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></>,
    panelRight: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></>,
    glasses: <><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0"/><path d="M2.5 13 2 10l3-1"/><path d="M21.5 13l.5-3-3-1"/></>,
    maximize: <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    minimize: <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    undo: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    redo: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    zoomIn: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    zoomOut: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || paths.box}
    </svg>
  );
};

// =============================================================================
// ICON BUTTON
// =============================================================================

const IconButton = ({ icon, title, onClick, active, danger, disabled, size = 18, badge, style = {} }) => (
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
      opacity: disabled ? 0.4 : 1,
      position: 'relative',
      flexShrink: 0,
      ...style,
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
        fontSize: 8,
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

// =============================================================================
// NUMBER STEPPER
// =============================================================================

const NumberStepper = ({ value, onChange, min = 1, max = 10, label, width = 70 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    {label && <span style={{ fontSize: 10, color: tokens.textMuted, marginRight: 4 }}>{label}</span>}
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      style={{
        width: 20,
        height: 22,
        padding: 0,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: `${tokens.radiusSm}px 0 0 ${tokens.radiusSm}px`,
        color: tokens.textTertiary,
        cursor: value <= min ? 'not-allowed' : 'pointer',
        opacity: value <= min ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="minus" size={10} />
    </button>
    <div style={{
      width: width - 40,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: tokens.bgSecondary,
      borderTop: `1px solid ${tokens.borderDefault}`,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      fontSize: 11,
      fontFamily: 'monospace',
      color: tokens.textPrimary,
    }}>
      {value}
    </div>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      style={{
        width: 20,
        height: 22,
        padding: 0,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: `0 ${tokens.radiusSm}px ${tokens.radiusSm}px 0`,
        color: tokens.textTertiary,
        cursor: value >= max ? 'not-allowed' : 'pointer',
        opacity: value >= max ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="plus" size={10} />
    </button>
  </div>
);

// =============================================================================
// TOGGLE BUTTON GROUP
// =============================================================================

const ToggleGroup = ({ options, value, onChange, size = 'sm' }) => (
  <div style={{ display: 'flex', gap: 1 }}>
    {options.map((opt, i) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        title={opt.title}
        style={{
          padding: size === 'sm' ? '4px 8px' : '6px 12px',
          fontSize: size === 'sm' ? 10 : 11,
          background: value === opt.value ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${value === opt.value ? 'rgba(96, 165, 250, 0.3)' : tokens.borderDefault}`,
          borderRadius: i === 0 ? `${tokens.radiusSm}px 0 0 ${tokens.radiusSm}px` : 
                        i === options.length - 1 ? `0 ${tokens.radiusSm}px ${tokens.radiusSm}px 0` : 0,
          color: value === opt.value ? tokens.accentBlue : tokens.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {opt.icon && <Icon name={opt.icon} size={12} />}
        {opt.label}
      </button>
    ))}
  </div>
);

// =============================================================================
// DROPDOWN SELECT
// =============================================================================

const Dropdown = ({ value, options, onChange, width = 80 }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '4px 8px',
      fontSize: 11,
      background: tokens.bgSecondary,
      border: `1px solid ${tokens.borderDefault}`,
      borderRadius: tokens.radiusSm,
      color: tokens.textPrimary,
      width,
      cursor: 'pointer',
    }}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// =============================================================================
// SEPARATOR
// =============================================================================

const Separator = ({ vertical = true }) => (
  <div style={{
    width: vertical ? 1 : '100%',
    height: vertical ? 20 : 1,
    background: tokens.borderDefault,
    margin: vertical ? '0 8px' : '8px 0',
    flexShrink: 0,
  }} />
);

// =============================================================================
// INSTANCE HEADER
// =============================================================================

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
      <div style={{ display: 'flex', alignItems: 'center', gap: isUltraCompact ? 2 : 4, minWidth: 0, flex: 1 }}>
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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: isUltraCompact ? 1 : 2 }}>
        {!isUltraCompact && <IconButton icon="more" title="More" size={buttonSize} onClick={(e) => e.stopPropagation()} />}
        <IconButton icon="focus" title="Focus" size={buttonSize} onClick={(e) => { e.stopPropagation(); onFocus?.(); }} />
        <IconButton icon="x" title="Close" size={buttonSize} onClick={(e) => { e.stopPropagation(); onClose?.(); }} danger />
      </div>
    </div>
  );
};

// =============================================================================
// INSTANCE VIEWPORT
// =============================================================================

const InstanceViewport = ({ viewConfig, isActive, cellWidth, cellHeight, onActivate, onClose, onFocus, collaborators = [], style = {} }) => {
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
        boxShadow: isActive ? `0 0 0 1px ${color}, 0 0 16px rgba(${colorRgb}, 0.2)` : 'inset 0 0 40px rgba(0,0,0,0.4)',
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
          <Icon name="box" size={Math.min(40, Math.max(16, cellWidth * 0.12))} style={{ color }} />
          {cellWidth > 120 && <span style={{ fontSize: 10, opacity: 0.6 }}>Double-click to focus</span>}
        </div>
        
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

// =============================================================================
// EMPTY CELL
// =============================================================================

const EmptyCell = ({ row, col, cellWidth, onAdd }) => {
  const [hovering, setHovering] = useState(false);
  const buttonSize = Math.min(36, Math.max(16, cellWidth * 0.15));
  
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onAdd}
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
      
      {cellWidth > 60 && (
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
      )}
    </div>
  );
};

// =============================================================================
// SUBSET CARD
// =============================================================================

const SubsetCard = ({ subset, cellWidth, canOpenSubset, onFocus, onClose, onSendToVR }) => {
  const [hovering, setHovering] = useState(false);
  const colorRgb = hexToRgb(subset.color);
  const gridSize = subset.layout === '2x2' ? 2 : 3;
  
  return (
    <div
      onDoubleClick={canOpenSubset ? onFocus : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: `rgba(${colorRgb}, 0.06)`,
        borderRadius: tokens.radiusLg,
        border: `2px dashed ${canOpenSubset ? `rgba(${colorRgb}, 0.3)` : tokens.borderDefault}`,
        overflow: 'hidden',
        cursor: canOpenSubset ? 'pointer' : 'default',
        position: 'relative',
        opacity: canOpenSubset ? 1 : 0.6,
      }}
    >
      <InstanceHeader
        name={subset.name}
        color={subset.color}
        cellWidth={cellWidth}
        onClose={onClose}
        onFocus={canOpenSubset ? onFocus : undefined}
      />
      
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
            <Icon name="box" size={10} />
          </div>
        ))}
      </div>
      
      {hovering && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: tokens.radiusLg,
        }}>
          {canOpenSubset ? (
            <button onClick={onFocus} style={{
              padding: '8px 16px',
              background: subset.color,
              borderRadius: tokens.radiusMd,
              border: 'none',
              color: '#000',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}>
              Open Subset
            </button>
          ) : (
            <>
              <div style={{ fontSize: 10, color: tokens.textMuted, textAlign: 'center', padding: '0 12px' }}>
                Canvas too small for subset view
              </div>
              <button onClick={onSendToVR} style={{
                padding: '6px 12px',
                background: tokens.accentPurple,
                borderRadius: tokens.radiusMd,
                border: 'none',
                color: '#fff',
                fontWeight: 500,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Icon name="glasses" size={14} />
                Send to VR
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CANVAS HEADER
// =============================================================================

const CanvasHeader = ({
  viewStack, currentViewIndex, onBack, onHome,
  flowDirection, onFlowDirectionChange,
  gridSize, onGridSizeChange,
  viewportSize, onViewportSizeChange,
  zoom, onZoomChange,
  editMode, onEditModeToggle,
  onUndo, onRedo, canUndo, canRedo,
  isFullscreen, onFullscreenToggle,
}) => {
  const canGoBack = currentViewIndex > 0;
  const currentView = viewStack[currentViewIndex];
  const isGridView = currentView?.type === 'grid';
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px',
      background: tokens.bgTertiary,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      minHeight: 40,
      gap: 12,
    }}>
      {/* Left Section - Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton icon="arrowLeft" title="Back (Esc)" size={18} onClick={onBack} disabled={!canGoBack} />
        <IconButton icon="home" title="Home" size={18} onClick={onHome} active={currentViewIndex === 0} />
        <IconButton icon="bookmark" title="Bookmarks" size={18} />
        
        <Separator />
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {viewStack.map((view, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="chevronRight" size={12} style={{ color: tokens.textMuted }} />}
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
      
      {/* Center Section - Layout Controls (only in grid view) */}
      {isGridView && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Flow Direction */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: tokens.textMuted }}>Flow:</span>
            <ToggleGroup
              options={[
                { value: 'row', icon: 'arrowRight', title: 'Row-first' },
                { value: 'column', icon: 'arrowDown', title: 'Column-first' },
              ]}
              value={flowDirection}
              onChange={onFlowDirectionChange}
            />
          </div>
          
          <Separator />
          
          {/* Canvas Size (Grid Dimensions) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: tokens.textMuted }}>Canvas:</span>
            <NumberStepper value={gridSize.rows} onChange={(v) => onGridSizeChange({ ...gridSize, rows: v })} min={1} max={MAX_GRID} width={60} />
            <span style={{ fontSize: 10, color: tokens.textMuted }}>×</span>
            <NumberStepper value={gridSize.cols} onChange={(v) => onGridSizeChange({ ...gridSize, cols: v })} min={1} max={MAX_GRID} width={60} />
            <Dropdown
              value={`${gridSize.rows}x${gridSize.cols}`}
              options={GRID_PRESETS.map(p => ({ value: p, label: p }))}
              onChange={(v) => {
                const [r, c] = v.split('x').map(Number);
                onGridSizeChange({ rows: r, cols: c });
              }}
              width={70}
            />
          </div>
          
          <Separator />
          
          {/* Viewport Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: tokens.textMuted }}>View:</span>
            <NumberStepper value={viewportSize.rows} onChange={(v) => onViewportSizeChange({ ...viewportSize, rows: v })} min={1} max={gridSize.rows} width={60} />
            <span style={{ fontSize: 10, color: tokens.textMuted }}>×</span>
            <NumberStepper value={viewportSize.cols} onChange={(v) => onViewportSizeChange({ ...viewportSize, cols: v })} min={1} max={gridSize.cols} width={60} />
          </div>
          
          <Separator />
          
          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconButton icon="zoomOut" size={16} onClick={() => onZoomChange(Math.max(50, zoom - 25))} disabled={zoom <= 50} />
            <Dropdown
              value={zoom.toString()}
              options={ZOOM_PRESETS.map(z => ({ value: z.toString(), label: `${z}%` }))}
              onChange={(v) => onZoomChange(parseInt(v))}
              width={65}
            />
            <IconButton icon="zoomIn" size={16} onClick={() => onZoomChange(Math.min(200, zoom + 25))} disabled={zoom >= 200} />
          </div>
        </div>
      )}
      
      {/* Right Section - Edit Tools & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isGridView && (
          <>
            <IconButton icon="edit" title="Edit Mode" size={18} active={editMode} onClick={onEditModeToggle} />
            <Separator />
            <IconButton icon="undo" title="Undo" size={18} onClick={onUndo} disabled={!canUndo} />
            <IconButton icon="redo" title="Redo" size={18} onClick={onRedo} disabled={!canRedo} />
            <Separator />
          </>
        )}
        <IconButton 
          icon={isFullscreen ? "minimize" : "maximize"} 
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} 
          size={18} 
          onClick={onFullscreenToggle} 
        />
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS FOOTER
// =============================================================================

const CanvasFooter = ({
  activeView,
  cellSize,
  canvasSize,
  collaboratorCount,
  syncStatus,
  subsetEnabled,
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: tokens.bgTertiary,
    borderTop: `1px solid ${tokens.borderDefault}`,
    minHeight: 32,
  }}>
    {/* Left - View Context */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
      {activeView ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: activeView.color,
              boxShadow: `0 0 6px ${activeView.color}`,
            }} />
            <span style={{ fontSize: 11, color: tokens.textPrimary, fontWeight: 500 }}>{activeView.name}</span>
          </div>
          <span style={{ fontSize: 10, color: tokens.textMuted }}>
            {activeView.type === 'vtk' ? '3D Volume' : activeView.type === 'chart' ? 'Chart' : 'View'}
          </span>
          {activeView.dataset && (
            <>
              <span style={{ color: tokens.textMuted }}>•</span>
              <span style={{ fontSize: 10, color: tokens.textTertiary }}>{activeView.dataset}</span>
            </>
          )}
        </>
      ) : (
        <span style={{ fontSize: 11, color: tokens.textMuted }}>No view selected</span>
      )}
    </div>
    
    {/* Center - Status */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 10, color: tokens.textMuted }}>
        Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px
      </span>
      <span style={{ fontSize: 10, color: tokens.textMuted }}>
        Canvas: {canvasSize.width}×{canvasSize.height}
      </span>
      {!subsetEnabled && (
        <span style={{ fontSize: 10, color: tokens.accentAmber, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="info" size={12} />
          Subset mode disabled (canvas too small)
        </span>
      )}
    </div>
    
    {/* Right - Collaboration & Sync */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="users" size={12} style={{ color: tokens.textMuted }} />
        <span style={{ fontSize: 10, color: tokens.textSecondary }}>{collaboratorCount} online</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: syncStatus === 'synced' ? tokens.accentGreen : tokens.accentAmber,
        }} />
        <span style={{ fontSize: 10, color: tokens.textMuted }}>
          {syncStatus === 'synced' ? 'Synced' : 'Syncing...'}
        </span>
      </div>
      <IconButton icon="glasses" title="VR Mode" size={16} />
    </div>
  </div>
);

// =============================================================================
// EDGE TRIGGER
// =============================================================================

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
        width: hovering ? 28 : 8,
        height: 60,
        background: hovering ? tokens.bgTertiary : 'transparent',
        borderRadius: isLeft ? '0 6px 6px 0' : '6px 0 0 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        zIndex: 50,
      }}
    >
      {hovering && <Icon name={isLeft ? 'panelLeft' : 'panelRight'} size={14} />}
    </div>
  );
};

// =============================================================================
// FLOATING PANEL
// =============================================================================

const FloatingPanel = ({ side, visible, onClose }) => {
  if (!visible) return null;
  const isLeft = side === 'left';
  
  return (
    <div style={{
      position: 'absolute',
      [side]: 0,
      top: 0,
      bottom: 0,
      width: 240,
      background: tokens.bgSecondary,
      borderRight: isLeft ? `1px solid ${tokens.borderDefault}` : undefined,
      borderLeft: isLeft ? undefined : `1px solid ${tokens.borderDefault}`,
      boxShadow: `${isLeft ? '' : '-'}4px 0 16px rgba(0,0,0,0.3)`,
      zIndex: 60,
      display: 'flex',
      flexDirection: 'column',
      animation: `slideIn${isLeft ? 'Left' : 'Right'} 0.2s ease`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: `1px solid ${tokens.borderDefault}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{isLeft ? 'Tools' : 'Properties'}</span>
        <IconButton icon="x" size={14} onClick={onClose} />
      </div>
      <div style={{ flex: 1, padding: 12, fontSize: 11, color: tokens.textMuted }}>
        Panel content...
      </div>
    </div>
  );
};

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  // App state
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Canvas navigation
  const [viewStack, setViewStack] = useState([{ type: 'grid', label: 'Canvas' }]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  
  // Canvas settings
  const [flowDirection, setFlowDirection] = useState('row');
  const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });
  const [viewportSize, setViewportSize] = useState({ rows: 3, cols: 3 });
  const [viewportPosition, setViewportPosition] = useState({ row: 0, col: 0 });
  const [zoom, setZoom] = useState(100);
  const [editMode, setEditMode] = useState(false);
  
  // Panel state
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  
  // Selection
  const [activeViewId, setActiveViewId] = useState('view-1');
  
  // Data
  const [placements, setPlacements] = useState([
    { id: 'view-1', type: 'vtk', name: 'Brain MRI', color: tokens.accentBlue, row: 0, col: 0, dataset: 'patient_001.nii' },
    { id: 'view-2', type: 'vtk', name: 'CT Chest', color: tokens.accentPurple, row: 0, col: 1, dataset: 'chest_scan.dcm' },
    { id: 'view-3', type: 'vtk', name: 'Skull Mesh', color: tokens.accentTeal, row: 0, col: 2, dataset: 'skull.stl' },
    { id: 'view-4', type: 'chart', name: 'Histogram', color: tokens.accentGreen, row: 1, col: 0 },
    { id: 'subset-1', type: 'subset', name: 'Comparison', color: tokens.accentAmber, row: 1, col: 1, layout: '2x2', viewIds: ['view-1', 'view-2', 'view-3', 'view-4'] },
  ]);
  
  // Calculate sizes
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 500 });
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const gap = tokens.gap;
  const scaledContainerWidth = containerSize.width * (zoom / 100);
  const scaledContainerHeight = containerSize.height * (zoom / 100);
  const cellWidth = (scaledContainerWidth - gap * (viewportSize.cols + 1)) / viewportSize.cols;
  const cellHeight = (scaledContainerHeight - gap * (viewportSize.rows + 1)) / viewportSize.rows;
  
  // Check if subset mode is available
  const canOpenSubset = containerSize.width >= MIN_SUBSET_CANVAS.width && containerSize.height >= MIN_SUBSET_CANVAS.height;
  
  // Navigation
  const pushView = (view) => {
    setLeftPanelVisible(false);
    setRightPanelVisible(false);
    const newStack = [...viewStack.slice(0, currentViewIndex + 1), view];
    setViewStack(newStack);
    setCurrentViewIndex(newStack.length - 1);
  };
  
  const goBack = () => {
    if (currentViewIndex > 0) {
      setCurrentViewIndex(currentViewIndex - 1);
    } else {
      setActiveViewId(null);
    }
  };
  
  const goHome = () => setCurrentViewIndex(0);
  
  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentViewIndex]);
  
  const handleFocus = (item) => {
    if (item.type === 'subset') {
      if (canOpenSubset) {
        pushView({ type: 'subset', label: item.name, data: item });
      }
    } else {
      pushView({ type: 'focus', label: item.name, data: item });
    }
  };
  
  const handleAddContent = (row, col) => {
    const id = `view-${Date.now()}`;
    const colors = [tokens.accentBlue, tokens.accentPurple, tokens.accentTeal, tokens.accentGreen, tokens.accentPink];
    setPlacements(prev => [...prev, { id, type: 'vtk', name: `View ${prev.length + 1}`, color: colors[Math.floor(Math.random() * colors.length)], row, col }]);
  };
  
  const handleClose = (id) => setPlacements(prev => prev.filter(p => p.id !== id));
  const getPlacement = (row, col) => placements.find(p => p.row === row && p.col === col);
  const getCollaborators = (id) => id === 'view-2' ? [{ name: 'Alice' }, { name: 'Bob' }] : [];
  
  const activeView = placements.find(p => p.id === activeViewId);
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
      {!isFullscreen && (
        headerVisible ? (
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
              <IconButton icon="users" title="Online" badge="2" size={18} />
              <IconButton icon="glasses" title="VR" size={18} />
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
        )
      )}
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Activity Bar */}
        {!isFullscreen && (
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
            <IconButton icon="settings" title="Tools (T)" size={18} />
            <div style={{ flex: 1 }} />
            <IconButton icon="bookmark" title="Subsets" size={18} />
          </div>
        )}
        
        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Canvas Header */}
          <CanvasHeader
            viewStack={viewStack}
            currentViewIndex={currentViewIndex}
            onBack={goBack}
            onHome={goHome}
            flowDirection={flowDirection}
            onFlowDirectionChange={setFlowDirection}
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
            viewportSize={viewportSize}
            onViewportSizeChange={setViewportSize}
            zoom={zoom}
            onZoomChange={setZoom}
            editMode={editMode}
            onEditModeToggle={() => setEditMode(!editMode)}
            onUndo={() => {}}
            onRedo={() => {}}
            canUndo={false}
            canRedo={false}
            isFullscreen={isFullscreen}
            onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          />
          
          {/* Canvas Content */}
          <div 
            ref={containerRef}
            style={{ 
              flex: 1, 
              position: 'relative', 
              overflow: 'hidden', 
              background: tokens.bgCanvas,
            }}
          >
            <EdgeTrigger side="left" onClick={() => setLeftPanelVisible(!leftPanelVisible)} />
            <EdgeTrigger side="right" onClick={() => setRightPanelVisible(!rightPanelVisible)} />
            
            <FloatingPanel side="left" visible={leftPanelVisible} onClose={() => setLeftPanelVisible(false)} />
            <FloatingPanel side="right" visible={rightPanelVisible} onClose={() => setRightPanelVisible(false)} />
            
            {/* Grid View */}
            {currentView.type === 'grid' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`,
                gap,
                padding: gap,
                width: '100%',
                height: '100%',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}>
                {Array.from({ length: viewportSize.rows * viewportSize.cols }).map((_, i) => {
                  const row = Math.floor(i / viewportSize.cols) + viewportPosition.row;
                  const col = i % viewportSize.cols + viewportPosition.col;
                  const placement = getPlacement(row, col);
                  
                  if (!placement) {
                    return <EmptyCell key={`${row}-${col}`} row={row} col={col} cellWidth={cellWidth} onAdd={() => handleAddContent(row, col)} />;
                  }
                  
                  if (placement.type === 'subset') {
                    return (
                      <SubsetCard
                        key={placement.id}
                        subset={placement}
                        cellWidth={cellWidth}
                        canOpenSubset={canOpenSubset}
                        onFocus={() => handleFocus(placement)}
                        onClose={() => handleClose(placement.id)}
                        onSendToVR={() => console.log('Send to VR:', placement)}
                      />
                    );
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
                  cellWidth={containerSize.width}
                  cellHeight={containerSize.height}
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
                      cellWidth={containerSize.width / 2}
                      cellHeight={containerSize.height / 2}
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
          <CanvasFooter
            activeView={activeView}
            cellSize={{ width: cellWidth, height: cellHeight }}
            canvasSize={gridSize}
            collaboratorCount={2}
            syncStatus="synced"
            subsetEnabled={canOpenSubset}
          />
        </div>
      </div>
      
      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.92); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .live-pulse { animation: pulse 1.5s ease-in-out infinite; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        select:focus, input:focus { outline: 1px solid ${tokens.accentBlue}; }
      `}</style>
    </div>
  );
}
