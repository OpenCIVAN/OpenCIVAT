/**
 * CIA Web - Link Manager Panels
 * 
 * Three interconnected floating panels for managing view synchronization:
 * 1. ViewLinkManager - Configure links for a specific view
 * 2. UserFollowingPanel - Follow collaborators' viewports
 * 3. WorkspaceLinksHub - Bird's-eye view of all link groups
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// =============================================================================
// DESIGN TOKENS (matching canvas-chrome-v12.jsx)
// =============================================================================

const tokens = {
  bgCanvas: '#030303',
  bgPrimary: '#060a12',
  bgSecondary: '#0c1220',
  bgTertiary: '#121a2e',
  bgElevated: '#18223c',
  bgHover: 'rgba(255, 255, 255, 0.06)',
  bgLabelBar: '#080c14',
  
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
  
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.75)',
  textTertiary: 'rgba(255, 255, 255, 0.55)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  textLabel: 'rgba(255, 255, 255, 0.4)',
  
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentTeal: '#2dd4bf',
  accentPurple: '#a78bfa',
  accentPink: '#f472b6',
  accentRed: '#f87171',
  accentCyan: '#22d3ee',
  accentOrange: '#fb923c',
  
  gap: 8,
  radiusSm: 4,
  radiusMd: 6,
  radiusLg: 8,
  radiusXl: 12,
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '96, 165, 250';
};

// =============================================================================
// CONSTANTS - LINK PROPERTIES
// =============================================================================

const LINK_PROPERTIES = [
  { id: 'camera', icon: 'camera', label: 'Camera', color: tokens.accentTeal, desc: 'View angle & zoom' },
  { id: 'filters', icon: 'filter', label: 'Filters', color: tokens.accentPurple, desc: 'Active filters' },
  { id: 'colorMaps', icon: 'palette', label: 'Colors', color: tokens.accentPink, desc: 'Color mapping' },
  { id: 'widgets', icon: 'layout', label: 'Widgets', color: tokens.accentAmber, desc: 'Widget states' },
  { id: 'cursors', icon: 'crosshair', label: 'Cursors', color: tokens.accentCyan, desc: 'Cursor positions' },
  { id: 'annotationDisplay', icon: 'edit', label: 'Annot.', color: tokens.accentOrange, desc: 'Annotation visibility' },
];

const LINK_MODES = {
  FOLLOW: { id: 'follow', label: 'Follow', icon: '←', desc: 'Receive updates only' },
  SYNC: { id: 'sync', label: 'Sync', icon: '↔', desc: 'Two-way sync' },
  BROADCAST: { id: 'broadcast', label: 'Broadcast', icon: '→', desc: 'Send updates only' },
};

// =============================================================================
// ICON COMPONENT
// =============================================================================

const Icon = ({ name, size = 16, style = {} }) => {
  const paths = {
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    unlink: <><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    palette: <><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
    crosshair: <><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    radio: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowLeftRight: <><polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/><polyline points="7 21 3 17 7 13"/><line x1="15" y1="17" x2="3" y2="17"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// =============================================================================
// BASE UI COMPONENTS
// =============================================================================

const IconButton = ({ icon, title, onClick, active, disabled, size = 18, badge, style = {}, color }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      width: size + 10,
      height: size + 10,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active ? `rgba(${hexToRgb(color || tokens.accentBlue)}, 0.15)` : 'transparent',
      border: `1px solid ${active ? (color || tokens.accentBlue) : 'transparent'}`,
      borderRadius: tokens.radiusSm,
      color: active ? (color || tokens.accentBlue) : tokens.textTertiary,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      position: 'relative',
      flexShrink: 0,
      transition: 'all 0.15s ease',
      ...style,
    }}
  >
    <Icon name={icon} size={size - 2} />
    {badge && (
      <span style={{
        position: 'absolute', top: -4, right: -4,
        minWidth: 14, height: 14, borderRadius: 7,
        background: tokens.accentGreen,
        fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#000', fontWeight: 'bold',
      }}>{badge}</span>
    )}
  </button>
);

const ZoneLabel = ({ children, style = {} }) => (
  <span style={{
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: tokens.textLabel,
    whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </span>
);

const Separator = ({ vertical = true, margin = 8 }) => (
  <div style={{
    width: vertical ? 1 : '100%',
    height: vertical ? 20 : 1,
    background: tokens.borderDefault,
    flexShrink: 0,
    margin: vertical ? `0 ${margin}px` : `${margin}px 0`,
  }} />
);

const Chip = ({ children, color, active, onClick, small }) => (
  <button
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: small ? '2px 6px' : '4px 10px',
      fontSize: small ? 10 : 11,
      fontWeight: 500,
      background: active ? `rgba(${hexToRgb(color)}, 0.15)` : tokens.bgTertiary,
      border: `1px solid ${active ? color : tokens.borderSubtle}`,
      borderRadius: tokens.radiusSm,
      color: active ? color : tokens.textSecondary,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: tokens.bgCanvas,
    border: `1px solid ${tokens.borderDefault}`,
    borderRadius: tokens.radiusMd,
    flex: 1,
  }}>
    <Icon name="search" size={14} style={{ color: tokens.textMuted }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        fontSize: 11,
        color: tokens.textPrimary,
      }}
    />
  </div>
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      padding: '6px 10px',
      fontSize: 11,
      background: tokens.bgTertiary,
      border: `1px solid ${tokens.borderSubtle}`,
      borderRadius: tokens.radiusSm,
      color: tokens.textSecondary,
      cursor: 'pointer',
      outline: 'none',
    }}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const Avatar = ({ name, color, size = 24, showStatus, status = 'active' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const statusColors = { active: tokens.accentGreen, idle: tokens.accentAmber, away: tokens.textMuted };
  
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || tokens.accentBlue,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: '#000',
      }}>
        {initials}
      </div>
      {showStatus && (
        <div style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: '50%',
          background: statusColors[status],
          border: `2px solid ${tokens.bgSecondary}`,
        }} />
      )}
    </div>
  );
};

// =============================================================================
// FLOATING PANEL WRAPPER
// =============================================================================

const FloatingPanel = ({ title, icon, color = tokens.accentBlue, onClose, onMinimize, children, width = 380 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const dragRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  }, [isDragging]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  return (
    <div
      ref={dragRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width,
        background: tokens.bgSecondary,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: tokens.radiusLg,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${tokens.borderSubtle}`,
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: `linear-gradient(180deg, ${tokens.bgTertiary} 0%, ${tokens.bgSecondary} 100%)`,
          borderBottom: `1px solid ${tokens.borderDefault}`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          borderRadius: tokens.radiusSm,
          background: `rgba(${hexToRgb(color)}, 0.15)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}>
          <Icon name={icon} size={14} />
        </div>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: tokens.textPrimary }}>{title}</span>
        <IconButton icon="minus" title="Minimize" size={14} onClick={onMinimize} />
        <IconButton icon="x" title="Close" size={14} onClick={onClose} />
      </div>
      
      {/* Content */}
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// TAB NAVIGATION
// =============================================================================

const TabNav = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: 2,
    padding: '8px 12px',
    background: tokens.bgCanvas,
    borderBottom: `1px solid ${tokens.borderSubtle}`,
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: activeTab === tab.id ? 600 : 500,
          background: activeTab === tab.id ? tokens.bgTertiary : 'transparent',
          border: `1px solid ${activeTab === tab.id ? tokens.borderMedium : 'transparent'}`,
          borderRadius: tokens.radiusSm,
          color: activeTab === tab.id ? tokens.textPrimary : tokens.textMuted,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// =============================================================================
// VIEW LINK MANAGER - PROPERTY SELECTOR
// =============================================================================

const PropertySelector = ({ selectedProperty, onSelect, linkStats }) => (
  <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
    <ZoneLabel style={{ marginBottom: 8, display: 'block' }}>Property</ZoneLabel>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {LINK_PROPERTIES.map(prop => {
        const stats = linkStats[prop.id] || { count: 0 };
        const isActive = selectedProperty === prop.id;
        
        return (
          <button
            key={prop.id}
            onClick={() => onSelect(prop.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 10px',
              minWidth: 52,
              background: isActive ? `rgba(${hexToRgb(prop.color)}, 0.15)` : tokens.bgTertiary,
              border: `1px solid ${isActive ? prop.color : tokens.borderSubtle}`,
              borderRadius: tokens.radiusMd,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name={prop.icon} size={14} style={{ color: isActive ? prop.color : tokens.textMuted }} />
            <span style={{ fontSize: 9, color: isActive ? prop.color : tokens.textSecondary, fontWeight: 500 }}>
              {prop.label}
            </span>
            <div style={{ display: 'flex', gap: 2, height: 6 }}>
              {stats.count > 0 ? (
                [...Array(Math.min(stats.count, 4))].map((_, i) => (
                  <span key={i} style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: prop.color,
                  }} />
                ))
              ) : (
                <span style={{ fontSize: 8, color: tokens.textMuted }}>—</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// =============================================================================
// VIEW LINK MANAGER - MODE SELECTOR
// =============================================================================

const ModeSelector = ({ currentMode, onChange, color }) => (
  <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
    <ZoneLabel style={{ marginBottom: 8, display: 'block' }}>Your Mode in This Group</ZoneLabel>
    <div style={{ display: 'flex', gap: 4 }}>
      {Object.values(LINK_MODES).map(mode => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 8px',
            background: currentMode === mode.id ? `rgba(${hexToRgb(color)}, 0.15)` : tokens.bgTertiary,
            border: `1px solid ${currentMode === mode.id ? color : tokens.borderSubtle}`,
            borderRadius: tokens.radiusMd,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{
            fontSize: 16,
            color: currentMode === mode.id ? color : tokens.textMuted,
            fontWeight: 600,
          }}>
            {mode.icon}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: currentMode === mode.id ? color : tokens.textSecondary,
          }}>
            {mode.label}
          </span>
          <span style={{
            fontSize: 9,
            color: tokens.textMuted,
            textAlign: 'center',
          }}>
            {mode.desc}
          </span>
        </button>
      ))}
    </div>
  </div>
);

// =============================================================================
// VIEW LINK MANAGER - GROUP MEMBERS
// =============================================================================

const GroupMembersList = ({ members, currentViewId, hubViewId, onRemove, propertyColor }) => (
  <div style={{ padding: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <ZoneLabel>Group Members</ZoneLabel>
      <span style={{ fontSize: 10, color: tokens.textMuted }}>{members.length} views</span>
    </div>
    
    <div style={{
      background: tokens.bgCanvas,
      border: `1px solid ${tokens.borderSubtle}`,
      borderRadius: tokens.radiusMd,
      overflow: 'hidden',
    }}>
      {members.map((member, index) => {
        const isHub = member.id === hubViewId;
        const isCurrentView = member.id === currentViewId;
        
        return (
          <div
            key={member.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderBottom: index < members.length - 1 ? `1px solid ${tokens.borderSubtle}` : 'none',
              background: isCurrentView ? `rgba(${hexToRgb(propertyColor)}, 0.05)` : 'transparent',
              borderLeft: isHub ? `3px solid ${tokens.accentAmber}` : '3px solid transparent',
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: member.color,
              flexShrink: 0,
            }} />
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 500,
                color: tokens.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {member.name}
                {isCurrentView && <span style={{ color: tokens.textMuted, fontWeight: 400 }}> (you)</span>}
              </div>
              <div style={{ fontSize: 10, color: tokens.textMuted }}>
                {member.datasetName}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isHub && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '2px 6px',
                  background: `rgba(${hexToRgb(tokens.accentAmber)}, 0.15)`,
                  color: tokens.accentAmber,
                  borderRadius: tokens.radiusSm,
                }}>
                  ★ Hub
                </span>
              )}
              
              <span style={{
                fontSize: 10,
                padding: '2px 6px',
                background: `rgba(${hexToRgb(propertyColor)}, 0.1)`,
                color: propertyColor,
                borderRadius: tokens.radiusSm,
              }}>
                {member.mode === 'sync' ? '↔' : member.mode === 'follow' ? '←' : '→'} {member.mode}
              </span>
              
              {!isCurrentView && (
                <IconButton
                  icon="x"
                  title="Remove from group"
                  size={14}
                  onClick={() => onRemove(member.id)}
                  style={{ opacity: 0.5 }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// =============================================================================
// VIEW LINK MANAGER - ADD TO GROUP
// =============================================================================

const AddToGroupSection = ({ availableViews, onAdd, propertyColor, searchQuery, onSearchChange, filterMode, onFilterChange }) => (
  <div style={{ padding: '12px', borderTop: `1px solid ${tokens.borderSubtle}` }}>
    <ZoneLabel style={{ marginBottom: 8, display: 'block' }}>Add to Group</ZoneLabel>
    
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search views..."
      />
      <Select
        value={filterMode}
        onChange={onFilterChange}
        options={[
          { value: 'compatible', label: 'Compatible' },
          { value: 'sameDataset', label: 'Same dataset' },
          { value: 'all', label: 'All views' },
        ]}
      />
    </div>
    
    {availableViews.length === 0 ? (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: tokens.textMuted,
        fontSize: 11,
      }}>
        No compatible views found
      </div>
    ) : (
      <div style={{
        background: tokens.bgCanvas,
        border: `1px solid ${tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        maxHeight: 180,
        overflowY: 'auto',
      }}>
        {availableViews.map((view, index) => (
          <div
            key={view.id}
            style={{
              padding: '10px 12px',
              borderBottom: index < availableViews.length - 1 ? `1px solid ${tokens.borderSubtle}` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: view.color,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: tokens.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {view.name}
                </div>
                <div style={{ fontSize: 10, color: tokens.textMuted }}>
                  {view.datasetName} • {view.ownerName}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
              {Object.values(LINK_MODES).map(mode => (
                <button
                  key={mode.id}
                  onClick={() => onAdd(view.id, mode.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    fontSize: 10,
                    background: tokens.bgTertiary,
                    border: `1px solid ${tokens.borderSubtle}`,
                    borderRadius: tokens.radiusSm,
                    color: tokens.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = propertyColor;
                    e.target.style.color = propertyColor;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = tokens.borderSubtle;
                    e.target.style.color = tokens.textSecondary;
                  }}
                >
                  {mode.icon} {mode.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// =============================================================================
// VIEW LINK MANAGER - OVERVIEW TAB
// =============================================================================

const LinkOverviewTab = ({ links, currentViewId, onPropertyClick }) => {
  const activeLinks = LINK_PROPERTIES.filter(prop => links[prop.id]?.members?.length > 0);
  const inactiveProps = LINK_PROPERTIES.filter(prop => !links[prop.id]?.members?.length);
  
  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <ZoneLabel>Active Links</ZoneLabel>
        <span style={{ fontSize: 10, color: tokens.textMuted }}>
          {activeLinks.length} of {LINK_PROPERTIES.length}
        </span>
      </div>
      
      {activeLinks.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          background: tokens.bgCanvas,
          borderRadius: tokens.radiusMd,
          border: `1px solid ${tokens.borderSubtle}`,
        }}>
          <Icon name="unlink" size={24} style={{ color: tokens.textMuted, marginBottom: 8 }} />
          <div style={{ fontSize: 11, color: tokens.textMuted }}>
            No active links
          </div>
          <div style={{ fontSize: 10, color: tokens.textMuted, marginTop: 4 }}>
            Use the Configure tab to link properties
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeLinks.map(prop => {
            const linkData = links[prop.id];
            const memberCount = linkData.members?.length || 0;
            const isHub = linkData.hubViewId === currentViewId;
            const currentMode = linkData.members?.find(m => m.id === currentViewId)?.mode || 'sync';
            
            return (
              <button
                key={prop.id}
                onClick={() => onPropertyClick(prop.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px',
                  background: tokens.bgTertiary,
                  border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: tokens.radiusMd,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name={prop.icon} size={14} style={{ color: prop.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: tokens.textPrimary }}>
                      {prop.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: tokens.textMuted }}>
                    {memberCount} views
                  </span>
                </div>
                
                {/* Mini topology */}
                <div style={{
                  padding: '8px 10px',
                  background: tokens.bgCanvas,
                  borderRadius: tokens.radiusSm,
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {linkData.members?.slice(0, 4).map((member, i) => (
                      <React.Fragment key={member.id}>
                        {i > 0 && (
                          <span style={{ color: tokens.textMuted, fontSize: 10 }}>
                            {currentMode === 'sync' ? '↔' : '→'}
                          </span>
                        )}
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          background: member.id === currentViewId ? `rgba(${hexToRgb(prop.color)}, 0.1)` : 'transparent',
                          borderRadius: tokens.radiusSm,
                        }}>
                          {member.id === linkData.hubViewId && (
                            <span style={{ color: tokens.accentAmber, fontSize: 10 }}>★</span>
                          )}
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: member.color,
                          }} />
                          <span style={{
                            fontSize: 9,
                            color: member.id === currentViewId ? prop.color : tokens.textSecondary,
                            maxWidth: 60,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {member.name.split(' ')[0]}
                          </span>
                        </span>
                      </React.Fragment>
                    ))}
                    {memberCount > 4 && (
                      <span style={{ fontSize: 9, color: tokens.textMuted }}>+{memberCount - 4}</span>
                    )}
                  </div>
                </div>
                
                {/* Mode indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10,
                  color: tokens.textMuted,
                }}>
                  <span style={{
                    padding: '2px 6px',
                    background: `rgba(${hexToRgb(prop.color)}, 0.1)`,
                    color: prop.color,
                    borderRadius: tokens.radiusSm,
                    fontWeight: 500,
                  }}>
                    {currentMode === 'sync' ? '↔ SYNC' : currentMode === 'follow' ? '← FOLLOW' : '→ BROADCAST'}
                  </span>
                  {isHub && (
                    <span style={{ color: tokens.accentAmber }}>• You are hub</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Inactive properties */}
      {inactiveProps.length > 0 && (
        <>
          <Separator vertical={false} margin={16} />
          <ZoneLabel style={{ marginBottom: 8, display: 'block' }}>Not Linked</ZoneLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {inactiveProps.map(prop => (
              <Chip
                key={prop.id}
                color={prop.color}
                onClick={() => onPropertyClick(prop.id)}
                small
              >
                <Icon name={prop.icon} size={10} style={{ color: tokens.textMuted }} />
                {prop.label}
              </Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// VIEW LINK MANAGER - MAIN COMPONENT
// =============================================================================

const ViewLinkManager = ({ view, allViews, links, onClose, onUpdateLink, onLeaveGroup }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProperty, setSelectedProperty] = useState('camera');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('compatible');
  
  const selectedProp = LINK_PROPERTIES.find(p => p.id === selectedProperty);
  const currentLinkData = links[selectedProperty] || { members: [], hubViewId: null };
  
  const linkStats = useMemo(() => {
    const stats = {};
    LINK_PROPERTIES.forEach(prop => {
      stats[prop.id] = { count: links[prop.id]?.members?.length || 0 };
    });
    return stats;
  }, [links]);
  
  const availableViews = useMemo(() => {
    const memberIds = new Set(currentLinkData.members?.map(m => m.id) || []);
    return allViews
      .filter(v => v.id !== view.id && !memberIds.has(v.id))
      .filter(v => {
        if (filterMode === 'sameDataset') return v.datasetId === view.datasetId;
        if (searchQuery) return v.name.toLowerCase().includes(searchQuery.toLowerCase());
        return true;
      });
  }, [allViews, view, currentLinkData, filterMode, searchQuery]);
  
  const handlePropertyClick = (propId) => {
    setSelectedProperty(propId);
    setActiveTab('configure');
  };
  
  const handleAddToGroup = (viewId, mode) => {
    onUpdateLink(selectedProperty, viewId, mode);
  };
  
  const handleRemoveFromGroup = (viewId) => {
    onUpdateLink(selectedProperty, viewId, null);
  };
  
  const handleModeChange = (mode) => {
    onUpdateLink(selectedProperty, view.id, mode);
  };
  
  return (
    <FloatingPanel
      title="View Links"
      icon="link"
      color={tokens.accentTeal}
      onClose={onClose}
      width={400}
    >
      {/* View Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: tokens.bgTertiary,
        borderBottom: `1px solid ${tokens.borderSubtle}`,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: view.color }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: tokens.textPrimary }}>
          {view.name}
        </span>
        <span style={{ fontSize: 10, color: tokens.textMuted }}>
          {view.datasetName}
        </span>
      </div>
      
      <TabNav
        tabs={[
          { id: 'overview', label: '📊 Overview' },
          { id: 'configure', label: '⚙️ Configure' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      
      {activeTab === 'overview' ? (
        <LinkOverviewTab
          links={links}
          currentViewId={view.id}
          onPropertyClick={handlePropertyClick}
        />
      ) : (
        <>
          <PropertySelector
            selectedProperty={selectedProperty}
            onSelect={setSelectedProperty}
            linkStats={linkStats}
          />
          
          {currentLinkData.members?.length > 0 ? (
            <>
              <ModeSelector
                currentMode={currentLinkData.members?.find(m => m.id === view.id)?.mode || 'sync'}
                onChange={handleModeChange}
                color={selectedProp.color}
              />
              
              <GroupMembersList
                members={currentLinkData.members}
                currentViewId={view.id}
                hubViewId={currentLinkData.hubViewId}
                onRemove={handleRemoveFromGroup}
                propertyColor={selectedProp.color}
              />
            </>
          ) : (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: tokens.textMuted,
            }}>
              <Icon name="unlink" size={24} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 11 }}>
                Not linked for {selectedProp.label}
              </div>
              <div style={{ fontSize: 10, marginTop: 4 }}>
                Add a view below to create a link group
              </div>
            </div>
          )}
          
          <AddToGroupSection
            availableViews={availableViews}
            onAdd={handleAddToGroup}
            propertyColor={selectedProp.color}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterMode={filterMode}
            onFilterChange={setFilterMode}
          />
          
          {currentLinkData.members?.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px',
              borderTop: `1px solid ${tokens.borderSubtle}`,
              background: tokens.bgCanvas,
            }}>
              <button
                onClick={() => onLeaveGroup(selectedProperty)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  background: 'transparent',
                  border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: tokens.radiusSm,
                  color: tokens.textSecondary,
                  cursor: 'pointer',
                }}
              >
                <Icon name="logout" size={12} />
                Leave Group
              </button>
              
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  background: 'transparent',
                  border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: tokens.radiusSm,
                  color: tokens.textMuted,
                  cursor: 'pointer',
                }}
              >
                <Icon name="settings" size={12} />
                Link Settings
              </button>
            </div>
          )}
        </>
      )}
    </FloatingPanel>
  );
};

// =============================================================================
// USER FOLLOWING PANEL
// =============================================================================

const UserFollowingPanel = ({ currentUser, workspaceMembers, following, followers, onFollow, onStopFollowing, onStartPresenting, onClose }) => {
  const [followOptions, setFollowOptions] = useState({
    jumpToView: true,
    showCursor: true,
    mirrorCamera: false,
    autoFollowViews: false,
  });
  
  return (
    <FloatingPanel
      title="Following"
      icon="users"
      color={tokens.accentPurple}
      onClose={onClose}
      width={360}
    >
      {following ? (
        <div style={{ padding: '16px' }}>
          <ZoneLabel style={{ marginBottom: 12, display: 'block' }}>You Are Following</ZoneLabel>
          
          <div style={{
            padding: '16px',
            background: `linear-gradient(135deg, rgba(${hexToRgb(tokens.accentPurple)}, 0.1) 0%, transparent 100%)`,
            border: `1px solid ${tokens.accentPurple}`,
            borderRadius: tokens.radiusMd,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name={following.name} color={following.color} size={40} showStatus status={following.status} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tokens.textPrimary }}>
                  {following.name}
                </div>
                <div style={{ fontSize: 10, color: tokens.textMuted }}>
                  Viewing: {following.activeView}
                </div>
              </div>
            </div>
            
            <div style={{
              background: tokens.bgCanvas,
              borderRadius: tokens.radiusSm,
              padding: '10px',
            }}>
              {[
                { id: 'jumpToView', label: 'Jump to their active view', icon: 'eye' },
                { id: 'showCursor', label: 'Show their cursor', icon: 'crosshair' },
                { id: 'mirrorCamera', label: 'Mirror their camera angle', icon: 'camera' },
                { id: 'autoFollowViews', label: 'Auto-follow view changes', icon: 'layers' },
              ].map(option => (
                <label
                  key={option.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 0',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={followOptions[option.id]}
                    onChange={(e) => setFollowOptions(prev => ({ ...prev, [option.id]: e.target.checked }))}
                    style={{ accentColor: tokens.accentPurple }}
                  />
                  <Icon name={option.icon} size={12} style={{ color: tokens.textMuted }} />
                  <span style={{ fontSize: 11, color: tokens.textSecondary }}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            
            <button
              onClick={onStopFollowing}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '10px',
                fontSize: 11,
                fontWeight: 600,
                background: tokens.bgTertiary,
                border: `1px solid ${tokens.borderSubtle}`,
                borderRadius: tokens.radiusSm,
                color: tokens.textSecondary,
                cursor: 'pointer',
              }}
            >
              Stop Following
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{
            padding: '16px',
            textAlign: 'center',
            background: tokens.bgCanvas,
            borderRadius: tokens.radiusMd,
            border: `1px solid ${tokens.borderSubtle}`,
            marginBottom: 16,
          }}>
            <Icon name="eye" size={24} style={{ color: tokens.textMuted, marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: tokens.textMuted }}>
              Not following anyone
            </div>
          </div>
        </div>
      )}
      
      <Separator vertical={false} margin={0} />
      
      {/* Workspace Members */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <ZoneLabel>Workspace Members</ZoneLabel>
          <span style={{ fontSize: 10, color: tokens.accentGreen }}>
            {workspaceMembers.filter(m => m.status === 'active').length} online
          </span>
        </div>
        
        <div style={{
          background: tokens.bgCanvas,
          border: `1px solid ${tokens.borderSubtle}`,
          borderRadius: tokens.radiusMd,
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {workspaceMembers.filter(m => m.id !== currentUser.id).map((member, index) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderBottom: index < workspaceMembers.length - 2 ? `1px solid ${tokens.borderSubtle}` : 'none',
              }}
            >
              <Avatar name={member.name} color={member.color} size={28} showStatus status={member.status} />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: tokens.textPrimary,
                }}>
                  {member.name}
                </div>
                <div style={{ fontSize: 10, color: tokens.textMuted }}>
                  {member.activeView || 'No active view'}
                </div>
              </div>
              
              <button
                onClick={() => onFollow(member)}
                disabled={following?.id === member.id}
                style={{
                  padding: '6px 10px',
                  fontSize: 10,
                  fontWeight: 500,
                  background: following?.id === member.id
                    ? `rgba(${hexToRgb(tokens.accentPurple)}, 0.15)`
                    : tokens.bgTertiary,
                  border: `1px solid ${following?.id === member.id ? tokens.accentPurple : tokens.borderSubtle}`,
                  borderRadius: tokens.radiusSm,
                  color: following?.id === member.id ? tokens.accentPurple : tokens.textSecondary,
                  cursor: following?.id === member.id ? 'default' : 'pointer',
                  opacity: following?.id === member.id ? 0.6 : 1,
                }}
              >
                {following?.id === member.id ? 'Following' : 'Follow →'}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Followers */}
      {followers.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <ZoneLabel>Following You</ZoneLabel>
            <span style={{ fontSize: 10, color: tokens.textMuted }}>
              {followers.length} {followers.length === 1 ? 'person' : 'people'}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {followers.map(follower => (
              <div
                key={follower.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  background: tokens.bgTertiary,
                  borderRadius: tokens.radiusSm,
                }}
              >
                <Avatar name={follower.name} color={follower.color} size={16} />
                <span style={{ fontSize: 10, color: tokens.textSecondary }}>
                  {follower.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Start Presenting */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${tokens.borderSubtle}`,
        background: tokens.bgCanvas,
      }}>
        <button
          onClick={onStartPresenting}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px',
            fontSize: 11,
            fontWeight: 600,
            background: `linear-gradient(135deg, ${tokens.accentPurple} 0%, ${tokens.accentPink} 100%)`,
            border: 'none',
            borderRadius: tokens.radiusMd,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <Icon name="radio" size={14} />
          Start Presenting
        </button>
        <div style={{
          marginTop: 6,
          fontSize: 10,
          color: tokens.textMuted,
          textAlign: 'center',
        }}>
          Followers will see what you see
        </div>
      </div>
    </FloatingPanel>
  );
};

// =============================================================================
// WORKSPACE LINKS HUB
// =============================================================================

const WorkspaceLinksHub = ({ workspaceName, linkGroups, allViews, onExpandGroup, onClose }) => {
  const [expandedGroup, setExpandedGroup] = useState(null);
  
  const groupsByProperty = useMemo(() => {
    const groups = {};
    LINK_PROPERTIES.forEach(prop => {
      groups[prop.id] = linkGroups.filter(g => g.propertyId === prop.id);
    });
    return groups;
  }, [linkGroups]);
  
  const totalGroups = linkGroups.length;
  
  return (
    <FloatingPanel
      title="Workspace Links"
      icon="layers"
      color={tokens.accentBlue}
      onClose={onClose}
      width={420}
    >
      <div style={{
        padding: '10px 12px',
        background: tokens.bgTertiary,
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: tokens.textSecondary }}>
          {workspaceName}
        </span>
        <span style={{ fontSize: 10, color: tokens.textMuted }}>
          {totalGroups} link {totalGroups === 1 ? 'group' : 'groups'}
        </span>
      </div>
      
      <div style={{ padding: '12px' }}>
        <ZoneLabel style={{ marginBottom: 12, display: 'block' }}>Link Groups</ZoneLabel>
        
        {totalGroups === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            background: tokens.bgCanvas,
            borderRadius: tokens.radiusMd,
            border: `1px solid ${tokens.borderSubtle}`,
          }}>
            <Icon name="unlink" size={32} style={{ color: tokens.textMuted, marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 4 }}>
              No link groups yet
            </div>
            <div style={{ fontSize: 10, color: tokens.textMuted }}>
              Link views together to sync properties like camera, filters, and colors
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linkGroups.map(group => {
              const prop = LINK_PROPERTIES.find(p => p.id === group.propertyId);
              const isExpanded = expandedGroup === group.id;
              
              return (
                <div
                  key={group.id}
                  style={{
                    background: tokens.bgTertiary,
                    border: `1px solid ${isExpanded ? prop.color : tokens.borderSubtle}`,
                    borderRadius: tokens.radiusMd,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: tokens.radiusSm,
                      background: `rgba(${hexToRgb(prop.color)}, 0.15)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon name={prop.icon} size={14} style={{ color: prop.color }} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: tokens.textPrimary }}>
                        {prop.label} Sync Group
                      </div>
                      <div style={{ fontSize: 10, color: tokens.textMuted }}>
                        {group.members.length} views • Created by {group.creatorName}
                      </div>
                    </div>
                    
                    {/* Mini topology preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {group.members.slice(0, 3).map((member, i) => (
                        <React.Fragment key={member.id}>
                          {i > 0 && <span style={{ color: tokens.textMuted, fontSize: 10 }}>─</span>}
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: member.color,
                            border: member.id === group.hubViewId ? `2px solid ${tokens.accentAmber}` : 'none',
                          }} />
                        </React.Fragment>
                      ))}
                      {group.members.length > 3 && (
                        <span style={{ fontSize: 9, color: tokens.textMuted }}>+{group.members.length - 3}</span>
                      )}
                    </div>
                    
                    <Icon
                      name={isExpanded ? 'chevronUp' : 'chevronDown'}
                      size={14}
                      style={{ color: tokens.textMuted }}
                    />
                  </button>
                  
                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 12px 12px',
                      borderTop: `1px solid ${tokens.borderSubtle}`,
                    }}>
                      {/* Topology diagram */}
                      <div style={{
                        padding: '16px',
                        margin: '12px 0',
                        background: tokens.bgCanvas,
                        borderRadius: tokens.radiusSm,
                        textAlign: 'center',
                      }}>
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                          {/* Hub */}
                          {group.hubViewId && (
                            <>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                background: `rgba(${hexToRgb(tokens.accentAmber)}, 0.1)`,
                                border: `1px solid ${tokens.accentAmber}`,
                                borderRadius: tokens.radiusSm,
                              }}>
                                <span style={{ color: tokens.accentAmber, fontSize: 10 }}>★</span>
                                <span style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: group.members.find(m => m.id === group.hubViewId)?.color,
                                }} />
                                <span style={{ fontSize: 10, color: tokens.textPrimary }}>
                                  {group.members.find(m => m.id === group.hubViewId)?.name}
                                </span>
                              </div>
                              
                              {/* Connection lines */}
                              <div style={{
                                width: 1,
                                height: 16,
                                background: tokens.borderDefault,
                              }} />
                            </>
                          )}
                          
                          {/* Members */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {group.members
                              .filter(m => m.id !== group.hubViewId)
                              .map(member => (
                                <div
                                  key={member.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    background: tokens.bgTertiary,
                                    borderRadius: tokens.radiusSm,
                                  }}
                                >
                                  <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: member.color,
                                  }} />
                                  <span style={{ fontSize: 9, color: tokens.textSecondary }}>
                                    {member.name.split(' ')[0]}
                                  </span>
                                  <span style={{ fontSize: 8, color: tokens.textMuted }}>
                                    {member.mode === 'sync' ? '↔' : member.mode === 'follow' ? '←' : '→'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 10,
                        color: tokens.textMuted,
                      }}>
                        <span>Last activity: 2 min ago</span>
                        <button
                          onClick={() => onExpandGroup(group)}
                          style={{
                            padding: '6px 10px',
                            fontSize: 10,
                            background: tokens.bgTertiary,
                            border: `1px solid ${tokens.borderSubtle}`,
                            borderRadius: tokens.radiusSm,
                            color: tokens.textSecondary,
                            cursor: 'pointer',
                          }}
                        >
                          Edit Group
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Views with most links */}
      {totalGroups > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <Separator vertical={false} margin={0} />
          <ZoneLabel style={{ margin: '12px 0 8px', display: 'block' }}>Most Connected Views</ZoneLabel>
          
          <div style={{
            background: tokens.bgCanvas,
            border: `1px solid ${tokens.borderSubtle}`,
            borderRadius: tokens.radiusMd,
          }}>
            {allViews
              .map(view => ({
                ...view,
                linkCount: linkGroups.filter(g => g.members.some(m => m.id === view.id)).length,
              }))
              .filter(v => v.linkCount > 0)
              .sort((a, b) => b.linkCount - a.linkCount)
              .slice(0, 3)
              .map((view, index, arr) => (
                <div
                  key={view.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderBottom: index < arr.length - 1 ? `1px solid ${tokens.borderSubtle}` : 'none',
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: view.color,
                  }} />
                  <span style={{
                    flex: 1,
                    fontSize: 11,
                    color: tokens.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {view.name}
                  </span>
                  <span style={{ fontSize: 10, color: tokens.textMuted }}>
                    {view.ownerName}
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    background: tokens.bgTertiary,
                    borderRadius: tokens.radiusSm,
                    color: tokens.accentTeal,
                  }}>
                    {view.linkCount} links
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Topology Map Button */}
      <div style={{
        padding: '12px',
        borderTop: `1px solid ${tokens.borderSubtle}`,
        background: tokens.bgCanvas,
      }}>
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px',
            fontSize: 11,
            fontWeight: 500,
            background: tokens.bgTertiary,
            border: `1px solid ${tokens.borderSubtle}`,
            borderRadius: tokens.radiusSm,
            color: tokens.textSecondary,
            cursor: 'pointer',
          }}
        >
          <Icon name="grid" size={14} />
          View Link Topology Map
        </button>
      </div>
    </FloatingPanel>
  );
};

// =============================================================================
// DEMO APP
// =============================================================================

export default function LinkManagerPanelsDemo() {
  const [activePanel, setActivePanel] = useState('viewLinks');
  
  // Sample data
  const currentUser = { id: 'u1', name: 'Beth Chen', color: tokens.accentBlue };
  
  const sampleView = {
    id: 'v1',
    name: 'View of Skull.vtp',
    datasetId: 'd1',
    datasetName: 'Skull.vtp',
    color: tokens.accentTeal,
    ownerName: 'Beth Chen',
  };
  
  const allViews = [
    sampleView,
    { id: 'v2', name: 'View of Bones.vtp', datasetId: 'd2', datasetName: 'Bones.vtp', color: tokens.accentGreen, ownerName: 'Dr. Smith' },
    { id: 'v3', name: 'Vessels Analysis', datasetId: 'd3', datasetName: 'dsa_vessels.vtp', color: tokens.accentPurple, ownerName: 'Dr. Jones' },
    { id: 'v4', name: 'View of Lungs.vtp', datasetId: 'd1', datasetName: 'Lungs.vtp', color: tokens.accentAmber, ownerName: 'Dr. Chen' },
    { id: 'v5', name: 'Heart Model', datasetId: 'd4', datasetName: 'Heart.vtp', color: tokens.accentPink, ownerName: 'Dr. Martinez' },
  ];
  
  const [links, setLinks] = useState({
    camera: {
      hubViewId: 'v2',
      members: [
        { id: 'v1', name: 'Skull', color: tokens.accentTeal, datasetName: 'Skull.vtp', mode: 'sync' },
        { id: 'v2', name: 'Bones', color: tokens.accentGreen, datasetName: 'Bones.vtp', mode: 'sync' },
        { id: 'v3', name: 'Vessels', color: tokens.accentPurple, datasetName: 'dsa_vessels.vtp', mode: 'follow' },
      ],
    },
    colorMaps: {
      hubViewId: 'v2',
      members: [
        { id: 'v1', name: 'Skull', color: tokens.accentTeal, datasetName: 'Skull.vtp', mode: 'follow' },
        { id: 'v2', name: 'Bones', color: tokens.accentGreen, datasetName: 'Bones.vtp', mode: 'broadcast' },
      ],
    },
    filters: { members: [] },
    widgets: { members: [] },
    cursors: { members: [] },
    annotationDisplay: { members: [] },
  });
  
  const workspaceMembers = [
    { id: 'u1', name: 'Beth Chen', color: tokens.accentBlue, status: 'active', activeView: 'View of Skull.vtp' },
    { id: 'u2', name: 'Dr. Sarah Smith', color: tokens.accentGreen, status: 'active', activeView: 'View of Bones.vtp' },
    { id: 'u3', name: 'Dr. Michael Jones', color: tokens.accentPurple, status: 'active', activeView: 'Vessels Analysis' },
    { id: 'u4', name: 'Dr. Lisa Chen', color: tokens.accentAmber, status: 'idle', activeView: 'Heart Model' },
  ];
  
  const [following, setFollowing] = useState(null);
  const [followers] = useState([
    { id: 'u4', name: 'Dr. Chen', color: tokens.accentAmber },
  ]);
  
  const linkGroups = [
    {
      id: 'g1',
      propertyId: 'camera',
      hubViewId: 'v2',
      creatorName: 'Dr. Smith',
      members: [
        { id: 'v1', name: 'View of Skull.vtp', color: tokens.accentTeal, mode: 'sync' },
        { id: 'v2', name: 'View of Bones.vtp', color: tokens.accentGreen, mode: 'sync' },
        { id: 'v3', name: 'Vessels Analysis', color: tokens.accentPurple, mode: 'follow' },
      ],
    },
    {
      id: 'g2',
      propertyId: 'colorMaps',
      hubViewId: 'v2',
      creatorName: 'Dr. Smith',
      members: [
        { id: 'v1', name: 'View of Skull.vtp', color: tokens.accentTeal, mode: 'follow' },
        { id: 'v2', name: 'View of Bones.vtp', color: tokens.accentGreen, mode: 'broadcast' },
      ],
    },
  ];
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: tokens.bgCanvas,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
      
      {/* Panel selector buttons */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 100,
      }}>
        {[
          { id: 'viewLinks', label: 'View Links', icon: 'link', color: tokens.accentTeal },
          { id: 'userFollowing', label: 'User Following', icon: 'users', color: tokens.accentPurple },
          { id: 'workspaceHub', label: 'Workspace Hub', icon: 'layers', color: tokens.accentBlue },
        ].map(panel => (
          <button
            key={panel.id}
            onClick={() => setActivePanel(panel.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              background: activePanel === panel.id
                ? `rgba(${hexToRgb(panel.color)}, 0.15)`
                : tokens.bgSecondary,
              border: `1px solid ${activePanel === panel.id ? panel.color : tokens.borderDefault}`,
              borderRadius: tokens.radiusMd,
              color: activePanel === panel.id ? panel.color : tokens.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name={panel.icon} size={14} />
            {panel.label}
          </button>
        ))}
      </div>
      
      {/* Panels */}
      {activePanel === 'viewLinks' && (
        <ViewLinkManager
          view={sampleView}
          allViews={allViews}
          links={links}
          onClose={() => setActivePanel(null)}
          onUpdateLink={(prop, viewId, mode) => console.log('Update link:', prop, viewId, mode)}
          onLeaveGroup={(prop) => console.log('Leave group:', prop)}
        />
      )}
      
      {activePanel === 'userFollowing' && (
        <UserFollowingPanel
          currentUser={currentUser}
          workspaceMembers={workspaceMembers}
          following={following}
          followers={followers}
          onFollow={(member) => setFollowing(member)}
          onStopFollowing={() => setFollowing(null)}
          onStartPresenting={() => console.log('Start presenting')}
          onClose={() => setActivePanel(null)}
        />
      )}
      
      {activePanel === 'workspaceHub' && (
        <WorkspaceLinksHub
          workspaceName="Tumor Analysis Project"
          linkGroups={linkGroups}
          allViews={allViews}
          onExpandGroup={(group) => console.log('Expand group:', group)}
          onClose={() => setActivePanel(null)}
        />
      )}
      
      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 20px',
        background: tokens.bgSecondary,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: tokens.radiusMd,
        fontSize: 11,
        color: tokens.textMuted,
        textAlign: 'center',
      }}>
        <strong style={{ color: tokens.textSecondary }}>CIA Web - Link Manager Panels Demo</strong>
        <br />
        Drag panels by their header • Click tabs to switch views • Explore the full UI
      </div>
    </div>
  );
}
