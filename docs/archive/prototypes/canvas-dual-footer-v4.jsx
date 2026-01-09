import React, { useState, useRef, useEffect } from 'react';

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
  borderFocus: 'rgba(251, 191, 36, 0.5)',
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

const MAX_GRID = 10;
const GRID_PRESETS = ['1x2', '2x2', '2x3', '3x3', '3x4', '4x4', '5x5', '10x10'];
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];
const MIN_SUBSET_CANVAS = { width: 600, height: 500 };

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
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    panelLeft: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></>,
    panelRight: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="15" y2="21"/></>,
    glasses: <><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0"/><path d="M2.5 13 2 10l3-1"/><path d="M21.5 13l.5-3-3-1"/></>,
    maximize: <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    minimize: <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    undo: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    redo: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    zoomIn: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    zoomOut: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    columns: <><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || paths.box}
    </svg>
  );
};

// =============================================================================
// BASIC COMPONENTS
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

const NumberStepper = ({ value, onChange, min = 1, max = 10, width = 55 }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      style={{
        width: 16,
        height: 20,
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
      <Icon name="minus" size={8} />
    </button>
    <div style={{
      width: width - 32,
      height: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: tokens.bgSecondary,
      borderTop: `1px solid ${tokens.borderDefault}`,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      fontSize: 10,
      fontFamily: 'monospace',
      color: tokens.textPrimary,
    }}>
      {value}
    </div>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      style={{
        width: 16,
        height: 20,
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
      <Icon name="plus" size={8} />
    </button>
  </div>
);

const Dropdown = ({ value, options, onChange, width = 60 }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '2px 4px',
      fontSize: 10,
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

const Separator = ({ vertical = true }) => (
  <div style={{
    width: vertical ? 1 : '100%',
    height: vertical ? 18 : 1,
    background: tokens.borderDefault,
    margin: vertical ? '0 6px' : '6px 0',
    flexShrink: 0,
  }} />
);

// =============================================================================
// VIEW MODE TOGGLE (Grid / Focus / Subset)
// =============================================================================

const ViewModeToggle = ({ mode, onChange, subsetDisabled }) => {
  const modes = [
    { id: 'grid', icon: 'grid' },
    { id: 'focus', icon: 'focus' },
    { id: 'subset', icon: 'columns', disabled: subsetDisabled },
  ];
  
  return (
    <div style={{ display: 'flex' }}>
      {modes.map((m, i) => (
        <button
          key={m.id}
          onClick={() => !m.disabled && onChange(m.id)}
          disabled={m.disabled}
          title={m.disabled ? 'Canvas too small' : m.id}
          style={{
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: mode === m.id ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.04)',
            border: mode === m.id ? `1px solid ${tokens.borderFocus}` : `1px solid ${tokens.borderDefault}`,
            borderRadius: i === 0 ? `${tokens.radiusSm}px 0 0 ${tokens.radiusSm}px` : 
                          i === modes.length - 1 ? `0 ${tokens.radiusSm}px ${tokens.radiusSm}px 0` : 0,
            color: mode === m.id ? tokens.accentAmber : (m.disabled ? tokens.textMuted : tokens.textSecondary),
            cursor: m.disabled ? 'not-allowed' : 'pointer',
            opacity: m.disabled ? 0.5 : 1,
            marginLeft: i > 0 ? -1 : 0,
          }}
        >
          <Icon name={m.icon} size={14} />
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// ACTIVE VIEW WIDGET
// =============================================================================

const ActiveViewWidget = ({ view, views, onSelect }) => {
  const [open, setOpen] = useState(false);
  
  if (!view) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        background: tokens.bgSecondary,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: tokens.radiusMd,
        minWidth: 180,
      }}>
        <span style={{ fontSize: 11, color: tokens.textMuted }}>No view selected</span>
      </div>
    );
  }
  
  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: tokens.bgSecondary,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusMd,
          cursor: 'pointer',
          minWidth: 200,
        }}
      >
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: view.color,
          boxShadow: `0 0 6px ${view.color}`,
          flexShrink: 0,
        }} />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 9, color: tokens.textMuted, textTransform: 'uppercase' }}>Active View</span>
          <div style={{ fontSize: 11, color: tokens.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {view.name}
          </div>
        </div>
        
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: tokens.textTertiary,
            cursor: 'pointer',
          }}
        >
          <Icon name="eye" size={12} />
        </button>
        
        <Icon name="chevronDown" size={12} style={{ color: tokens.textMuted }} />
      </div>
      
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: 4,
          width: 260,
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusMd,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <div style={{ maxHeight: 180, overflow: 'auto', padding: '4px 0' }}>
            {views.filter(v => v.type !== 'subset').map(v => (
              <div
                key={v.id}
                onClick={() => { onSelect(v.id); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: v.id === view.id ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                }}
                className="menu-item"
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color }} />
                <span style={{ flex: 1, fontSize: 11, color: v.id === view.id ? tokens.accentBlue : tokens.textSecondary }}>
                  {v.name}
                </span>
                {v.id === view.id && <Icon name="check" size={12} style={{ color: tokens.accentBlue }} />}
              </div>
            ))}
          </div>
          
          <div style={{ height: 1, background: tokens.borderDefault }} />
          
          <div style={{ padding: '4px 0' }}>
            <div className="menu-item" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
              <Icon name="copy" size={12} />
              Duplicate View
            </div>
            <div className="menu-item" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11, color: tokens.accentRed }}>
              <Icon name="x" size={12} />
              Close View
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LINKS DROPDOWN
// =============================================================================

const LinksDropdown = () => {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState({ camera: true, filters: false, widgets: false, cursors: true });
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusSm,
          color: tokens.textSecondary,
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        <Icon name="link" size={12} />
        Links
        <Icon name="chevronDown" size={10} />
      </button>
      
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 4,
          width: 160,
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusMd,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          padding: '6px 0',
        }}>
          {Object.entries(links).map(([key, enabled]) => (
            <div
              key={key}
              onClick={() => setLinks(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 11,
              }}
              className="menu-item"
            >
              <span style={{ textTransform: 'capitalize' }}>{key}</span>
              <div style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: enabled ? tokens.accentBlue : 'transparent',
                border: `1px solid ${enabled ? tokens.accentBlue : tokens.borderDefault}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {enabled && <Icon name="check" size={8} style={{ color: '#fff' }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUBSET PICKER
// =============================================================================

const SubsetPicker = ({ views, selectedIds, onSelect, onCreateSubset }) => {
  const [open, setOpen] = useState(false);
  const nonSubsetViews = views.filter(v => v.type !== 'subset');
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 8px',
          background: selectedIds.length > 0 ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selectedIds.length > 0 ? 'rgba(96, 165, 250, 0.3)' : tokens.borderDefault}`,
          borderRadius: tokens.radiusSm,
          color: selectedIds.length > 0 ? tokens.accentBlue : tokens.textSecondary,
          cursor: 'pointer',
          fontSize: 10,
        }}
      >
        <Icon name="columns" size={12} />
        {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Pick'}
        <Icon name="chevronDown" size={10} />
      </button>
      
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 4,
          width: 200,
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusMd,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{ padding: '6px 10px', borderBottom: `1px solid ${tokens.borderDefault}`, fontSize: 10, color: tokens.textMuted }}>
            Select 2-9 views for subset
          </div>
          
          <div style={{ maxHeight: 160, overflow: 'auto', padding: '4px 0' }}>
            {nonSubsetViews.map(v => {
              const isSelected = selectedIds.includes(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                  }}
                  className="menu-item"
                >
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: isSelected ? tokens.accentBlue : 'transparent',
                    border: `1px solid ${isSelected ? tokens.accentBlue : tokens.borderDefault}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isSelected && <Icon name="check" size={8} style={{ color: '#fff' }} />}
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color }} />
                  <span style={{ flex: 1, fontSize: 10 }}>{v.name}</span>
                </div>
              );
            })}
          </div>
          
          {selectedIds.length >= 2 && (
            <div style={{ padding: 6, borderTop: `1px solid ${tokens.borderDefault}` }}>
              <button
                onClick={() => { onCreateSubset(); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: tokens.accentBlue,
                  border: 'none',
                  borderRadius: tokens.radiusSm,
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Create Subset ({selectedIds.length})
              </button>
            </div>
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
      padding: '5px 10px',
      background: tokens.bgTertiary,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      minHeight: 36,
      gap: 8,
    }}>
      {/* Left - Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconButton icon="arrowLeft" title="Back (Esc)" size={16} onClick={onBack} disabled={!canGoBack} />
        <IconButton icon="home" title="Home" size={16} onClick={onHome} active={currentViewIndex === 0} />
        <IconButton icon="bookmark" title="Bookmarks" size={16} />
        
        <Separator />
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {viewStack.map((view, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="chevronRight" size={10} style={{ color: tokens.textMuted }} />}
              <span style={{
                fontSize: 10,
                color: i === currentViewIndex ? tokens.accentBlue : tokens.textMuted,
                fontWeight: i === currentViewIndex ? 500 : 400,
              }}>
                {view.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Center - Layout Controls */}
      {isGridView && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Flow:</span>
            <div style={{ display: 'flex' }}>
              {['row', 'column'].map((dir, i) => (
                <button
                  key={dir}
                  onClick={() => onFlowDirectionChange(dir)}
                  style={{
                    padding: '3px 6px',
                    background: flowDirection === dir ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${flowDirection === dir ? 'rgba(96, 165, 250, 0.3)' : tokens.borderDefault}`,
                    borderRadius: i === 0 ? `${tokens.radiusSm}px 0 0 ${tokens.radiusSm}px` : `0 ${tokens.radiusSm}px ${tokens.radiusSm}px 0`,
                    color: flowDirection === dir ? tokens.accentBlue : tokens.textSecondary,
                    cursor: 'pointer',
                    marginLeft: i > 0 ? -1 : 0,
                  }}
                >
                  <Icon name={dir === 'row' ? 'arrowRight' : 'arrowDown'} size={10} />
                </button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Canvas Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9, color: tokens.textMuted }}>Canvas:</span>
            <NumberStepper value={gridSize.rows} onChange={(v) => onGridSizeChange({ ...gridSize, rows: v })} min={1} max={MAX_GRID} width={50} />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>×</span>
            <NumberStepper value={gridSize.cols} onChange={(v) => onGridSizeChange({ ...gridSize, cols: v })} min={1} max={MAX_GRID} width={50} />
            <Dropdown
              value={`${gridSize.rows}x${gridSize.cols}`}
              options={GRID_PRESETS.map(p => ({ value: p, label: p }))}
              onChange={(v) => {
                const [r, c] = v.split('x').map(Number);
                onGridSizeChange({ rows: r, cols: c });
              }}
              width={55}
            />
          </div>
          
          <Separator />
          
          {/* Viewport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 9, color: tokens.textMuted }}>View:</span>
            <NumberStepper value={viewportSize.rows} onChange={(v) => onViewportSizeChange({ ...viewportSize, rows: v })} min={1} max={gridSize.rows} width={50} />
            <span style={{ fontSize: 9, color: tokens.textMuted }}>×</span>
            <NumberStepper value={viewportSize.cols} onChange={(v) => onViewportSizeChange({ ...viewportSize, cols: v })} min={1} max={gridSize.cols} width={50} />
          </div>
          
          <Separator />
          
          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton icon="zoomOut" size={14} onClick={() => onZoomChange(Math.max(50, zoom - 25))} disabled={zoom <= 50} />
            <Dropdown
              value={zoom.toString()}
              options={ZOOM_PRESETS.map(z => ({ value: z.toString(), label: `${z}%` }))}
              onChange={(v) => onZoomChange(parseInt(v))}
              width={50}
            />
            <IconButton icon="zoomIn" size={14} onClick={() => onZoomChange(Math.min(200, zoom + 25))} disabled={zoom >= 200} />
          </div>
        </div>
      )}
      
      {/* Right */}
      <IconButton 
        icon={isFullscreen ? "minimize" : "maximize"} 
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} 
        size={16} 
        onClick={onFullscreenToggle} 
      />
    </div>
  );
};

// =============================================================================
// CANVAS INFO FOOTER
// =============================================================================

const CanvasInfoFooter = ({ cellSize, canvasSize, collaboratorCount, syncStatus, subsetEnabled }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 10px',
    background: tokens.bgTertiary,
    borderTop: `1px solid ${tokens.borderDefault}`,
    fontSize: 9,
    color: tokens.textMuted,
    minHeight: 22,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span>Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px</span>
      <span>Canvas: {canvasSize.rows}×{canvasSize.cols}</span>
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {!subsetEnabled && (
        <span style={{ color: tokens.accentAmber, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Icon name="info" size={10} />
          Subset disabled
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon name="users" size={10} />
        {collaboratorCount}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: syncStatus === 'synced' ? tokens.accentGreen : tokens.accentAmber }} />
        {syncStatus === 'synced' ? 'Synced' : 'Syncing'}
      </span>
    </div>
  </div>
);

// =============================================================================
// CANVAS TOOLBAR FOOTER
// =============================================================================

const CanvasToolbarFooter = ({
  viewMode, onViewModeChange, subsetDisabled,
  activeView, views, onSelectView,
  canUndo, canRedo, onUndo, onRedo,
  subsetSelection, onSubsetSelect, onCreateSubset,
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 10px',
    background: tokens.bgSecondary,
    borderTop: `1px solid ${tokens.borderDefault}`,
    minHeight: 40,
    gap: 10,
  }}>
    {/* Left */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <IconButton icon="undo" size={16} onClick={onUndo} disabled={!canUndo} />
      <IconButton icon="redo" size={16} onClick={onRedo} disabled={!canRedo} />
      
      <Separator />
      
      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} subsetDisabled={subsetDisabled} />
      
      {viewMode === 'focus' && (
        <span style={{ fontSize: 9, color: tokens.accentAmber, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <Icon name="focus" size={10} />
          Focus
          <span style={{ color: tokens.textMuted }}>· Esc to exit</span>
        </span>
      )}
    </div>
    
    {/* Center */}
    <ActiveViewWidget view={activeView} views={views} onSelect={onSelectView} />
    
    {/* Right */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {viewMode === 'subset' && (
        <>
          <SubsetPicker
            views={views}
            selectedIds={subsetSelection}
            onSelect={onSubsetSelect}
            onCreateSubset={onCreateSubset}
          />
          <Separator />
        </>
      )}
      
      <LinksDropdown />
      <Separator />
      <IconButton icon="camera" title="Snapshot" size={16} />
      <IconButton icon="copy" title="Duplicate" size={16} />
      <IconButton icon="settings" title="Settings" size={16} />
    </div>
  </div>
);

// =============================================================================
// INSTANCE COMPONENTS
// =============================================================================

const InstanceHeader = ({ name, color, cellWidth, onClose, onFocus }) => {
  const colorRgb = hexToRgb(color);
  const isCompact = cellWidth < 150;
  const isUltraCompact = cellWidth < 100;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isUltraCompact ? '2px 4px' : '4px 6px',
      background: tokens.bgSecondary,
      borderBottom: `1px solid ${tokens.borderSubtle}`,
      height: isUltraCompact ? 22 : (isCompact ? 26 : 30),
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isUltraCompact ? 2 : 5,
        padding: `2px ${isUltraCompact ? 3 : 6}px`,
        background: `rgba(${colorRgb}, 0.12)`,
        border: `1px solid rgba(${colorRgb}, 0.25)`,
        borderRadius: tokens.radiusSm,
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{
          width: isUltraCompact ? 4 : 5,
          height: isUltraCompact ? 4 : 5,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: isUltraCompact ? 8 : (isCompact ? 9 : 11),
          fontWeight: 500,
          color: color,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginLeft: 3 }}>
        <IconButton icon="focus" size={isUltraCompact ? 12 : 14} onClick={(e) => { e.stopPropagation(); onFocus?.(); }} />
        <IconButton icon="x" size={isUltraCompact ? 12 : 14} onClick={(e) => { e.stopPropagation(); onClose?.(); }} danger />
      </div>
    </div>
  );
};

const InstanceViewport = ({ viewConfig, isActive, cellWidth, cellHeight, onActivate, onClose, onFocus, style = {} }) => {
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
        boxShadow: isActive ? `0 0 0 1px ${color}, 0 0 12px rgba(${colorRgb}, 0.2)` : 'none',
        overflow: 'hidden',
        cursor: 'pointer',
        ...style,
      }}
    >
      <InstanceHeader name={viewConfig.name} color={color} cellWidth={cellWidth} onClose={onClose} onFocus={onFocus} />
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.bgCanvas,
        minHeight: 0,
      }}>
        <Icon name="box" size={Math.min(36, Math.max(14, cellWidth * 0.1))} style={{ color }} />
      </div>
    </div>
  );
};

const EmptyCell = ({ row, col, cellWidth, onAdd }) => {
  const [hovering, setHovering] = useState(false);
  
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
        background: hovering ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{
        width: Math.min(28, cellWidth * 0.12),
        height: Math.min(28, cellWidth * 0.12),
        borderRadius: '50%',
        border: `2px solid ${hovering ? tokens.accentBlue : tokens.borderSubtle}`,
        background: hovering ? 'rgba(96, 165, 250, 0.15)' : tokens.bgSecondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: hovering ? tokens.accentBlue : tokens.textMuted,
      }}>
        <Icon name="plus" size={12} />
      </div>
      {cellWidth > 50 && (
        <span style={{
          position: 'absolute',
          bottom: 3,
          right: 3,
          fontSize: 7,
          fontFamily: 'monospace',
          color: tokens.textMuted,
          opacity: 0.4,
        }}>
          [{row},{col}]
        </span>
      )}
    </div>
  );
};

// =============================================================================
// EDGE TRIGGER & PANEL
// =============================================================================

const EdgeTrigger = ({ side, onClick }) => {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={onClick}
      style={{
        position: 'absolute',
        [side]: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: h ? 20 : 5,
        height: 50,
        background: h ? tokens.bgTertiary : 'transparent',
        borderRadius: side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px',
        cursor: 'pointer',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {h && <Icon name={side === 'left' ? 'panelLeft' : 'panelRight'} size={10} />}
    </div>
  );
};

const FloatingPanel = ({ side, visible, onClose }) => {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute',
      [side]: 0,
      top: 0,
      bottom: 0,
      width: 200,
      background: tokens.bgSecondary,
      borderRight: side === 'left' ? `1px solid ${tokens.borderDefault}` : undefined,
      borderLeft: side === 'right' ? `1px solid ${tokens.borderDefault}` : undefined,
      boxShadow: `${side === 'left' ? '' : '-'}4px 0 12px rgba(0,0,0,0.3)`,
      zIndex: 60,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderBottom: `1px solid ${tokens.borderDefault}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 500 }}>{side === 'left' ? 'Tools' : 'Properties'}</span>
        <IconButton icon="x" size={12} onClick={onClose} />
      </div>
    </div>
  );
};

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewStack, setViewStack] = useState([{ type: 'grid', label: 'Canvas' }]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [flowDirection, setFlowDirection] = useState('row');
  const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });
  const [viewportSize, setViewportSize] = useState({ rows: 3, cols: 3 });
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState('grid');
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [activeViewId, setActiveViewId] = useState('view-1');
  const [subsetSelection, setSubsetSelection] = useState([]);
  
  const [placements, setPlacements] = useState([
    { id: 'view-1', type: 'vtk', name: 'View of diskout.vtp', color: tokens.accentBlue, row: 0, col: 0 },
    { id: 'view-2', type: 'vtk', name: 'View of diskout.vtp (copy)', color: tokens.accentGreen, row: 0, col: 1 },
    { id: 'view-3', type: 'vtk', name: 'View of Skull.vtp', color: tokens.accentTeal, row: 0, col: 2 },
    { id: 'view-4', type: 'chart', name: 'Histogram', color: tokens.accentPurple, row: 1, col: 0 },
  ]);
  
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
  const cellWidth = (containerSize.width - gap * (viewportSize.cols + 1)) / viewportSize.cols;
  const cellHeight = (containerSize.height - gap * (viewportSize.rows + 1)) / viewportSize.rows;
  const canOpenSubset = containerSize.width >= MIN_SUBSET_CANVAS.width && containerSize.height >= MIN_SUBSET_CANVAS.height;
  
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
      if (viewMode === 'focus') setViewMode('grid');
    }
  };
  
  const goHome = () => { setCurrentViewIndex(0); setViewMode('grid'); };
  
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') goBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentViewIndex, viewMode]);
  
  const handleFocus = (item) => {
    setViewMode('focus');
    pushView({ type: 'focus', label: item.name, data: item });
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'grid') goHome();
    else if (mode === 'focus' && activeViewId) {
      const view = placements.find(p => p.id === activeViewId);
      if (view) handleFocus(view);
    }
  };
  
  const handleSubsetSelect = (id) => {
    setSubsetSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const handleAddContent = (row, col) => {
    const id = `view-${Date.now()}`;
    const colors = [tokens.accentBlue, tokens.accentPurple, tokens.accentTeal, tokens.accentGreen, tokens.accentPink];
    setPlacements(prev => [...prev, { id, type: 'vtk', name: `New View`, color: colors[Math.floor(Math.random() * colors.length)], row, col }]);
  };
  
  const handleClose = (id) => setPlacements(prev => prev.filter(p => p.id !== id));
  const getPlacement = (row, col) => placements.find(p => p.row === row && p.col === col);
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
            padding: '6px 14px',
            background: tokens.bgSecondary,
            borderBottom: `1px solid ${tokens.borderDefault}`,
            height: 40,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>CIA Web</div>
              <span style={{ color: tokens.textMuted }}>|</span>
              <span style={{ fontSize: 11, color: tokens.textSecondary }}>Project Alpha → Main Room</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconButton icon="users" badge="2" size={16} />
              <IconButton icon="glasses" size={16} />
              <IconButton icon="chevronUp" size={16} onClick={() => setHeaderVisible(false)} />
            </div>
          </div>
        ) : (
          <div onClick={() => setHeaderVisible(true)} style={{
            height: 5,
            background: tokens.bgTertiary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: 36, height: 2, background: tokens.borderMedium, borderRadius: 1 }} />
          </div>
        )
      )}
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Activity Bar */}
        {!isFullscreen && (
          <div style={{
            width: 40,
            background: tokens.bgSecondary,
            borderRight: `1px solid ${tokens.borderDefault}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 0',
            gap: 5,
          }}>
            <IconButton icon="grid" size={16} active />
            <IconButton icon="layers" size={16} />
            <IconButton icon="settings" size={16} />
            <div style={{ flex: 1 }} />
            <IconButton icon="bookmark" size={16} />
          </div>
        )}
        
        {/* Canvas Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            isFullscreen={isFullscreen}
            onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
          />
          
          <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: tokens.bgCanvas }}>
            <EdgeTrigger side="left" onClick={() => setLeftPanelVisible(!leftPanelVisible)} />
            <EdgeTrigger side="right" onClick={() => setRightPanelVisible(!rightPanelVisible)} />
            <FloatingPanel side="left" visible={leftPanelVisible} onClose={() => setLeftPanelVisible(false)} />
            <FloatingPanel side="right" visible={rightPanelVisible} onClose={() => setRightPanelVisible(false)} />
            
            {currentView.type === 'grid' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`,
                gap,
                padding: gap,
                width: '100%',
                height: '100%',
              }}>
                {Array.from({ length: viewportSize.rows * viewportSize.cols }).map((_, i) => {
                  const row = Math.floor(i / viewportSize.cols);
                  const col = i % viewportSize.cols;
                  const placement = getPlacement(row, col);
                  
                  if (!placement) return <EmptyCell key={`${row}-${col}`} row={row} col={col} cellWidth={cellWidth} onAdd={() => handleAddContent(row, col)} />;
                  
                  return (
                    <InstanceViewport
                      key={placement.id}
                      viewConfig={placement}
                      cellWidth={cellWidth}
                      cellHeight={cellHeight}
                      isActive={activeViewId === placement.id}
                      onActivate={() => setActiveViewId(placement.id)}
                      onClose={() => handleClose(placement.id)}
                      onFocus={() => handleFocus(placement)}
                    />
                  );
                })}
              </div>
            )}
            
            {currentView.type === 'focus' && (
              <div style={{ width: '100%', height: '100%', padding: gap }}>
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
          </div>
          
          <CanvasInfoFooter
            cellSize={{ width: cellWidth, height: cellHeight }}
            canvasSize={gridSize}
            collaboratorCount={2}
            syncStatus="synced"
            subsetEnabled={canOpenSubset}
          />
          
          <CanvasToolbarFooter
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            subsetDisabled={!canOpenSubset}
            activeView={activeView}
            views={placements}
            onSelectView={setActiveViewId}
            canUndo={false}
            canRedo={false}
            onUndo={() => {}}
            onRedo={() => {}}
            subsetSelection={subsetSelection}
            onSubsetSelect={handleSubsetSelect}
            onCreateSubset={() => setSubsetSelection([])}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .live-pulse { animation: pulse 1.5s ease-in-out infinite; }
        .menu-item:hover { background: rgba(255, 255, 255, 0.06); }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        select:focus { outline: 1px solid ${tokens.accentBlue}; }
      `}</style>
    </div>
  );
}
