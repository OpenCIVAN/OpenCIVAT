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
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '96, 165, 250';
};

// =============================================================================
// ICON COMPONENT
// =============================================================================

const Icon = ({ name, size = 16, style = {} }) => {
  const paths = {
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronUp: <polyline points="18 15 12 9 6 15"/>,
    
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    focus: <><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    
    mousePointer: <><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></>,
    hand: <><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></>,
    merge: <><path d="M8 6v12"/><path d="M16 6v12"/><path d="M8 12h8"/></>,
    pencil: <><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></>,
    undo: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    redo: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    crosshair: <><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    move: <><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></>,
    sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    glasses: <><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0"/><path d="M2.5 13 2 10l3-1"/><path d="M21.5 13l.5-3-3-1"/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    stickyNote: <><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
    headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>,
    
    layoutGrid: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></>,
    maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></>,
    folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    messageSquare: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    
    flowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    flowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    
    doorOpen: <><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// =============================================================================
// BASIC UI COMPONENTS
// =============================================================================

const IconButton = ({ icon, title, onClick, active, disabled, size = 18, badge, style = {} }) => (
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
      background: active ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
      border: `1px solid ${active ? 'rgba(96, 165, 250, 0.3)' : 'transparent'}`,
      borderRadius: tokens.radiusSm,
      color: active ? tokens.accentBlue : tokens.textTertiary,
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

const Separator = ({ vertical = true, margin = 8 }) => (
  <div style={{
    width: vertical ? 1 : '100%',
    height: vertical ? 20 : 1,
    background: tokens.borderDefault,
    flexShrink: 0,
    margin: vertical ? `0 ${margin}px` : `${margin}px 0`,
  }} />
);

const ToolButton = ({ icon, label, active, color = tokens.accentBlue, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} title={label} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28,
    background: active ? `rgba(${hexToRgb(color)}, 0.15)` : 'transparent',
    border: `1px solid ${active ? color : 'transparent'}`,
    borderRadius: tokens.radiusSm,
    color: active ? color : tokens.textMuted,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s ease',
  }}>
    <Icon name={icon} size={14} />
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

// Vertical separator for label bars
const LabelSeparator = () => (
  <div style={{ width: 1, height: 10, background: tokens.borderSubtle, flexShrink: 0 }} />
);

// =============================================================================
// ACTIVITY BARS
// =============================================================================

const LeftActivityBar = ({ activeTab, onTabChange, onPopoutClick }) => {
  const tabs = [
    { id: 'files', icon: 'folder', label: 'Files' },
    { id: 'datasets', icon: 'database', label: 'Datasets' },
    { id: 'views', icon: 'layers', label: 'Views' },
    { id: 'layout', icon: 'layoutGrid', label: 'Layout' },
  ];
  
  const popouts = [
    { id: 'navigator', icon: 'map', label: 'Canvas Navigator' },
    { id: 'scratchpad', icon: 'stickyNote', label: 'Scratchpad' },
  ];
  
  return (
    <div style={{
      width: 44, background: tokens.bgSecondary,
      borderRight: `1px solid ${tokens.borderDefault}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tabs.map(tab => (
          <IconButton key={tab.id} icon={tab.icon} title={tab.label} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} size={18} />
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${tokens.borderSubtle}`, paddingTop: 8 }}>
        {popouts.map(popout => (
          <IconButton key={popout.id} icon={popout.icon} title={popout.label} onClick={() => onPopoutClick(popout.id)} size={18} style={{ color: tokens.textMuted }} />
        ))}
      </div>
    </div>
  );
};

const RightActivityBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'people', icon: 'users', label: 'People', badge: '3' },
    { id: 'chat', icon: 'messageSquare', label: 'Chat' },
  ];
  
  return (
    <div style={{
      width: 44, background: tokens.bgSecondary,
      borderLeft: `1px solid ${tokens.borderDefault}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tabs.map(tab => (
          <IconButton key={tab.id} icon={tab.icon} title={tab.label} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} size={18} badge={tab.badge} />
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${tokens.borderSubtle}`, paddingTop: 8 }}>
        <IconButton icon="mic" title="Microphone" size={18} style={{ color: tokens.accentGreen }} />
        <IconButton icon="headphones" title="Audio" size={18} style={{ color: tokens.textMuted }} />
      </div>
    </div>
  );
};

// =============================================================================
// SECONDARY HEADER - Room > Workspace > Flow > Size > Edit Tools
// =============================================================================

const SecondaryHeader = ({
  room, rooms, onRoomChange,
  workspace, workspaces, onWorkspaceChange,
  collaborators,
  editMode, onEditModeToggle,
  activeTool, onToolChange,
  flowDirection, onFlowDirectionChange,
  canvasSize, onCanvasSizeChange,
  viewportSize, onViewportSizeChange,
}) => {
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  
  // Zone definitions with consistent widths for label and content alignment
  const zones = {
    room: { width: 160, label: 'Room' },
    workspace: { width: 150, label: 'Workspace' },
    flow: { width: 75, label: 'Flow' },
    size: { width: 150, label: 'Size' },
    editTools: { width: 160, label: 'Edit Tools' },
  };
  
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: tokens.bgSecondary,
      borderBottom: `1px solid ${tokens.borderDefault}`,
    }}>
      {/* Zone Label Bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 18,
        background: tokens.bgLabelBar,
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        padding: '0 12px',
        gap: 12,
      }}>
        {/* Left zones */}
        <div style={{ width: zones.room.width, display: 'flex', alignItems: 'center' }}>
          <ZoneLabel>{zones.room.label}</ZoneLabel>
        </div>
        <LabelSeparator />
        <div style={{ width: zones.workspace.width, display: 'flex', alignItems: 'center' }}>
          <ZoneLabel>{zones.workspace.label}</ZoneLabel>
        </div>
        
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        
        {/* Right zones */}
        <div style={{ width: zones.flow.width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ZoneLabel>{zones.flow.label}</ZoneLabel>
        </div>
        <LabelSeparator />
        <div style={{ width: zones.size.width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ZoneLabel>{zones.size.label}</ZoneLabel>
        </div>
        <LabelSeparator />
        <div style={{ width: zones.editTools.width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ZoneLabel>{zones.editTools.label}</ZoneLabel>
        </div>
      </div>
      
      {/* Content Bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '6px 12px',
        height: 44,
        gap: 12,
      }}>
        {/* Room Zone */}
        <div style={{ width: zones.room.width, position: 'relative' }}>
          <button 
            onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              background: roomDropdownOpen ? tokens.bgElevated : tokens.bgTertiary,
              border: `1px solid ${roomDropdownOpen ? tokens.accentGreen : tokens.borderSubtle}`,
              borderRadius: tokens.radiusMd,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <Icon name="doorOpen" size={14} style={{ color: tokens.accentGreen }} />
            <span style={{ fontSize: 11, color: tokens.textPrimary, fontWeight: 500, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {collaborators.slice(0, 3).map((c, i) => (
                <div key={c.id} title={c.name} style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: c.color, border: `2px solid ${tokens.bgTertiary}`,
                  marginLeft: i > 0 ? -5 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 7, fontWeight: 600, color: '#000',
                }}>{c.name.charAt(0)}</div>
              ))}
            </div>
            <Icon name="chevronDown" size={10} style={{ color: tokens.textMuted }} />
          </button>
          
          {roomDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              width: 220, background: tokens.bgSecondary,
              border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusLg,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 1000,
            }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
                <ZoneLabel>Switch Room</ZoneLabel>
              </div>
              <div style={{ padding: 8 }}>
                {rooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { onRoomChange(r); setRoomDropdownOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 10px',
                      background: r.id === room.id ? `rgba(${hexToRgb(tokens.accentGreen)}, 0.1)` : 'transparent',
                      border: r.id === room.id ? `1px solid ${tokens.accentGreen}` : '1px solid transparent',
                      borderRadius: tokens.radiusSm, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon name="doorOpen" size={14} style={{ color: r.id === room.id ? tokens.accentGreen : tokens.textMuted }} />
                    <span style={{ fontSize: 11, color: tokens.textPrimary, flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: 10, color: tokens.textMuted }}>{r.memberCount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Workspace Zone */}
        <div style={{ width: zones.workspace.width, position: 'relative' }}>
          <button
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              background: workspaceDropdownOpen ? tokens.bgElevated : tokens.bgTertiary,
              border: `1px solid ${workspaceDropdownOpen ? tokens.accentBlue : tokens.borderSubtle}`,
              borderRadius: tokens.radiusMd,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <Icon name="folder" size={14} style={{ color: tokens.accentBlue }} />
            <span style={{ fontSize: 11, color: tokens.textPrimary, fontWeight: 500, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspace.name}</span>
            <Icon name="chevronDown" size={10} style={{ color: tokens.textMuted }} />
          </button>
          
          {workspaceDropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              width: 200, background: tokens.bgSecondary,
              border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusLg,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 1000,
            }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
                <ZoneLabel>Switch Workspace</ZoneLabel>
              </div>
              <div style={{ padding: 8 }}>
                {workspaces.map(w => (
                  <button
                    key={w.id}
                    onClick={() => { onWorkspaceChange(w); setWorkspaceDropdownOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 10px',
                      background: w.id === workspace.id ? `rgba(${hexToRgb(tokens.accentBlue)}, 0.1)` : 'transparent',
                      border: w.id === workspace.id ? `1px solid ${tokens.accentBlue}` : '1px solid transparent',
                      borderRadius: tokens.radiusSm, cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon name="folder" size={14} style={{ color: w.id === workspace.id ? tokens.accentBlue : tokens.textMuted }} />
                    <span style={{ fontSize: 11, color: tokens.textPrimary }}>{w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        
        {/* Flow Zone */}
        <div style={{ width: zones.flow.width, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', background: tokens.bgCanvas, border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusSm, padding: 2 }}>
            <ToolButton icon="flowRight" label="Flow: Row" active={flowDirection === 'row'} color={tokens.accentGreen} onClick={() => onFlowDirectionChange('row')} />
            <ToolButton icon="flowDown" label="Flow: Column" active={flowDirection === 'column'} color={tokens.accentGreen} onClick={() => onFlowDirectionChange('column')} />
          </div>
        </div>
        
        <Separator />
        
        {/* Size Zone */}
        <div style={{ width: zones.size.width, display: 'flex', justifyContent: 'center', gap: 6 }}>
          <button
            onClick={() => onCanvasSizeChange && onCanvasSizeChange()}
            title="Canvas Grid Size"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px',
              background: tokens.bgTertiary,
              border: `1px solid ${tokens.borderSubtle}`,
              borderRadius: tokens.radiusSm,
              cursor: 'pointer',
              fontSize: 11,
              color: tokens.textSecondary,
            }}
          >
            <Icon name="layoutGrid" size={12} style={{ color: tokens.accentBlue }} />
            <span>{canvasSize.cols}×{canvasSize.rows}</span>
          </button>
          
          <button
            onClick={() => onViewportSizeChange && onViewportSizeChange()}
            title="Viewport Size"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px',
              background: tokens.bgTertiary,
              border: `1px solid ${tokens.borderSubtle}`,
              borderRadius: tokens.radiusSm,
              cursor: 'pointer',
              fontSize: 11,
              color: tokens.textSecondary,
            }}
          >
            <Icon name="maximize" size={12} style={{ color: tokens.accentTeal }} />
            <span>{viewportSize.cols}×{viewportSize.rows}</span>
          </button>
        </div>
        
        <Separator />
        
        {/* Edit Tools Zone */}
        <div style={{ width: zones.editTools.width, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, opacity: editMode ? 1 : 0.4, pointerEvents: editMode ? 'auto' : 'none' }}>
            <ToolButton icon="mousePointer" label="Select" active={activeTool === 'select'} color={tokens.accentBlue} onClick={() => onToolChange('select')} />
            <ToolButton icon="hand" label="Pan" active={activeTool === 'pan'} color={tokens.accentTeal} onClick={() => onToolChange('pan')} />
            <ToolButton icon="merge" label="Merge Cells" active={activeTool === 'merge'} color={tokens.accentPurple} onClick={() => onToolChange('merge')} />
          </div>
          
          <Separator margin={4} />
          
          <ToolButton icon="pencil" label={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'} active={editMode} color={tokens.accentAmber} onClick={onEditModeToggle} />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// VIEW MODE TOGGLE
// =============================================================================

const VIEW_MODES = [
  { id: 'grid', icon: 'grid', label: 'Grid', color: tokens.accentBlue },
  { id: 'focus', icon: 'focus', label: 'Focus', color: tokens.accentAmber },
  { id: 'subset', icon: 'layers', label: 'Subset', color: tokens.accentPurple },
];

const ViewModeToggle = ({ mode, onChange, focusDisabled, subsetDisabled }) => (
  <div style={{ display: 'flex', background: tokens.bgCanvas, border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusMd, padding: 2 }}>
    {VIEW_MODES.map(({ id, icon, label, color }) => {
      const isActive = mode === id;
      const isDisabled = (id === 'focus' && focusDisabled) || (id === 'subset' && subsetDisabled);
      return (
        <button key={id} onClick={() => !isDisabled && onChange(id)} disabled={isDisabled} title={isDisabled ? `${label} unavailable` : label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 28,
          background: isActive ? `rgba(${hexToRgb(color)}, 0.15)` : 'transparent',
          border: isActive ? `1px solid ${color}` : '1px solid transparent',
          borderRadius: tokens.radiusSm,
          color: isActive ? color : tokens.textMuted,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.35 : 1,
          transition: 'all 0.15s ease',
        }}>
          <Icon name={icon} size={14} />
        </button>
      );
    })}
  </div>
);

// =============================================================================
// SUBSET PICKER
// =============================================================================

const SubsetPicker = ({ views, selectedIds, onToggle, onSelectAll, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: isOpen ? tokens.bgElevated : tokens.bgTertiary,
        border: `1px solid ${isOpen ? tokens.accentPurple : tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        color: tokens.accentPurple,
        cursor: 'pointer', fontSize: 11,
      }}>
        <Icon name="layers" size={12} />
        <span>Subset ({selectedIds.length})</span>
        <Icon name="chevronDown" size={10} />
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          width: 220, background: tokens.bgSecondary,
          border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusLg,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 1000,
        }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
            <ZoneLabel>Select views for subset</ZoneLabel>
          </div>
          <div style={{ padding: 8, maxHeight: 200, overflowY: 'auto' }}>
            {views.filter(v => v.onCanvas).map(view => (
              <button key={view.id} onClick={() => onToggle(view.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 8px', background: 'transparent', border: 'none',
                borderRadius: tokens.radiusSm, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: selectedIds.includes(view.id) ? tokens.accentPurple : 'transparent',
                  border: `1.5px solid ${selectedIds.includes(view.id) ? tokens.accentPurple : tokens.borderMedium}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selectedIds.includes(view.id) && <Icon name="check" size={10} style={{ color: '#000' }} />}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: view.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.name}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.borderSubtle}`, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={onSelectAll} style={{ fontSize: 10, color: tokens.accentBlue, background: 'none', border: 'none', cursor: 'pointer' }}>Select All</button>
            <button onClick={onClear} style={{ fontSize: 10, color: tokens.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ACTIVE VIEW WIDGET
// =============================================================================

const ActiveViewWidget = ({ view, views, onSelect, isOpen, onToggleOpen, subsetMode, subsetIds }) => {
  const availableViews = subsetMode ? views.filter(v => subsetIds.includes(v.id)) : views.filter(v => v.onCanvas);
  
  if (!view) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', background: tokens.bgTertiary,
        borderRadius: tokens.radiusMd, border: `1px solid ${tokens.borderSubtle}`,
        flex: 1, minWidth: 0,
      }}>
        <span style={{ fontSize: 11, color: tokens.textMuted }}>No active view</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button onClick={onToggleOpen} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px',
        background: isOpen ? tokens.bgElevated : tokens.bgTertiary,
        border: `1px solid ${isOpen ? view.color : tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.15s ease',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: view.color, flexShrink: 0 }} />
        <span style={{ 
          fontSize: 12, fontWeight: 500, color: tokens.textPrimary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, textAlign: 'left',
        }}>{view.name}</span>
        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={12} style={{ color: tokens.textMuted, flexShrink: 0 }} />
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, width: 320, background: tokens.bgSecondary,
          border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusLg,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 1000,
        }}>
          <div style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ padding: '4px 8px' }}>
              <ZoneLabel>{subsetMode ? `In Subset (${availableViews.length})` : `On Canvas (${availableViews.length})`}</ZoneLabel>
            </div>
            {availableViews.map(v => (
              <button key={v.id} onClick={() => { onSelect(v.id); onToggleOpen(); }} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: v.id === view.id ? `rgba(${hexToRgb(v.color)}, 0.1)` : 'transparent',
                border: v.id === view.id ? `1px solid ${v.color}` : '1px solid transparent',
                borderRadius: tokens.radiusMd,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: tokens.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: tokens.textMuted, padding: '1px 4px', background: tokens.bgCanvas, borderRadius: 2, flexShrink: 0 }}>
                  {v.position?.col},{v.position?.row}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LINKS DROPDOWN
// =============================================================================

const LINK_TYPES = [
  { id: 'camera', icon: 'camera', label: 'Camera', color: tokens.accentTeal },
  { id: 'filters', icon: 'filter', label: 'Filters', color: tokens.accentAmber },
  { id: 'selection', icon: 'crosshair', label: 'Selection', color: tokens.accentPurple },
  { id: 'annotations', icon: 'edit', label: 'Annotations', color: tokens.accentPink },
  { id: 'transforms', icon: 'move', label: 'Transforms', color: tokens.accentCyan },
  { id: 'params', icon: 'sliders', label: 'Parameters', color: tokens.accentOrange },
];

const LINK_DIRECTIONS = [
  { id: 'bidirectional', label: '↔', title: 'Bidirectional' },
  { id: 'push', label: '→', title: 'Push (parent)' },
  { id: 'receive', label: '←', title: 'Receive (child)' },
];

const LinksDropdown = ({ activeView, allViews, links, recentUnlinks, onUpdateLink, onRestoreLink }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedType, setExpandedType] = useState(null);
  
  if (!activeView) return null;
  
  const otherViews = allViews.filter(v => v.id !== activeView.id && v.onCanvas);
  const activeLinks = Object.values(links).filter(l => l.targetId).length;
  
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        background: isOpen ? tokens.bgElevated : tokens.bgTertiary,
        border: `1px solid ${isOpen ? tokens.accentTeal : tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        color: isOpen ? tokens.accentTeal : tokens.textSecondary,
        cursor: 'pointer', fontSize: 12,
      }}>
        <Icon name="link" size={14} />
        <span>Links</span>
        {activeLinks > 0 && (
          <span style={{
            minWidth: 16, height: 16, padding: '0 4px',
            background: tokens.accentTeal, borderRadius: 8,
            fontSize: 10, fontWeight: 600, color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{activeLinks}</span>
        )}
        <Icon name="chevronDown" size={10} />
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          width: 300, background: tokens.bgSecondary,
          border: `1px solid ${tokens.borderDefault}`, borderRadius: tokens.radiusLg,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: tokens.bgTertiary }}>
            <ZoneLabel>Links for</ZoneLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeView.color }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeView.name}</span>
            </div>
          </div>
          
          {/* Link types */}
          <div style={{ padding: 8, maxHeight: 280, overflowY: 'auto' }}>
            {LINK_TYPES.map(linkType => {
              const link = links[linkType.id] || {};
              const targetView = link.targetId ? allViews.find(v => v.id === link.targetId) : null;
              const isExpanded = expandedType === linkType.id;
              
              return (
                <div key={linkType.id} style={{ marginBottom: 4 }}>
                  <button onClick={() => setExpandedType(isExpanded ? null : linkType.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px',
                    background: isExpanded ? tokens.bgTertiary : 'transparent',
                    border: 'none', borderRadius: tokens.radiusSm,
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Icon name={linkType.icon} size={14} style={{ color: targetView ? linkType.color : tokens.textMuted }} />
                    <span style={{ fontSize: 12, color: tokens.textPrimary, flex: 1 }}>{linkType.label}</span>
                    
                    {targetView ? (
                      <>
                        <span style={{ fontSize: 11, color: tokens.textMuted }}>
                          {link.direction === 'push' ? '→' : link.direction === 'receive' ? '←' : '↔'}
                        </span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: targetView.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: tokens.textSecondary, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {targetView.name}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateLink(linkType.id, null, null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.textMuted, padding: 2 }} title="Unlink">
                          <Icon name="x" size={12} />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: tokens.textMuted }}>Not linked</span>
                    )}
                    <Icon name={isExpanded ? 'chevronUp' : 'chevronRight'} size={12} style={{ color: tokens.textMuted }} />
                  </button>
                  
                  {isExpanded && (
                    <div style={{ padding: '8px 12px 8px 32px', background: tokens.bgCanvas, borderRadius: tokens.radiusSm, marginTop: 4 }}>
                      <ZoneLabel style={{ marginBottom: 6, display: 'block' }}>Link to</ZoneLabel>
                      {otherViews.map(v => (
                        <button key={v.id} onClick={() => onUpdateLink(linkType.id, v.id, link.direction || 'bidirectional')} style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                          padding: '6px 8px',
                          background: link.targetId === v.id ? `rgba(${hexToRgb(linkType.color)}, 0.1)` : 'transparent',
                          border: link.targetId === v.id ? `1px solid ${linkType.color}` : '1px solid transparent',
                          borderRadius: tokens.radiusSm, cursor: 'pointer', textAlign: 'left',
                        }}>
                          <span style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: `1.5px solid ${link.targetId === v.id ? linkType.color : tokens.borderMedium}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {link.targetId === v.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: linkType.color }} />}
                          </span>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                        </button>
                      ))}
                      
                      {link.targetId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                          <ZoneLabel>Direction</ZoneLabel>
                          <div style={{ marginLeft: 8, display: 'flex', gap: 2 }}>
                            {LINK_DIRECTIONS.map(dir => (
                              <button key={dir.id} onClick={() => onUpdateLink(linkType.id, link.targetId, dir.id)} title={dir.title} style={{
                                width: 28, height: 22,
                                background: link.direction === dir.id ? `rgba(${hexToRgb(linkType.color)}, 0.2)` : tokens.bgTertiary,
                                border: `1px solid ${link.direction === dir.id ? linkType.color : tokens.borderSubtle}`,
                                borderRadius: tokens.radiusSm,
                                color: link.direction === dir.id ? linkType.color : tokens.textMuted,
                                cursor: 'pointer', fontSize: 12,
                              }}>{dir.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Recent Unlinks */}
          {recentUnlinks.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.borderSubtle}`, background: tokens.bgCanvas }}>
              <ZoneLabel style={{ marginBottom: 6, display: 'block' }}>Recent (double-click to re-link)</ZoneLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {recentUnlinks.map((unlink, i) => {
                  const linkType = LINK_TYPES.find(t => t.id === unlink.typeId);
                  const targetView = allViews.find(v => v.id === unlink.targetId);
                  if (!linkType || !targetView) return null;
                  
                  return (
                    <button
                      key={i}
                      onDoubleClick={() => onRestoreLink(unlink.typeId, unlink.targetId, unlink.direction)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 6px',
                        background: tokens.bgTertiary,
                        border: `1px solid ${tokens.borderSubtle}`,
                        borderRadius: tokens.radiusSm,
                        cursor: 'pointer', opacity: 0.6,
                      }}
                      title={`${linkType.label} → ${targetView.name}`}
                    >
                      <Icon name={linkType.icon} size={10} style={{ color: linkType.color }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: targetView.color }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CANVAS TOOLBAR FOOTER
// =============================================================================

const CanvasToolbarFooter = ({
  viewMode, onViewModeChange, focusDisabled, subsetDisabled,
  activeView, views, onSelectView,
  subsetSelection, onSubsetToggle, onSubsetSelectAll, onSubsetClear,
  links, recentUnlinks, onUpdateLink, onRestoreLink,
  canUndo, canRedo, onUndo, onRedo,
  homePosition, viewportPosition, onNavigate, onGoHome,
}) => {
  const [viewExplorerOpen, setViewExplorerOpen] = useState(false);
  const isSubsetMode = viewMode === 'subset';
  
  // Zone definitions for footer
  const zones = {
    viewMode: { width: 110, label: 'View Mode' },
    navigation: { width: 160, label: 'Navigation' },
    history: { width: 70, label: 'History' },
    subset: { width: 100, label: 'Subset' },
    activeView: { label: isSubsetMode ? 'Active in Subset' : 'Active View' },
    actions: { width: 160, label: 'View Actions' },
  };
  
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: tokens.bgSecondary,
      borderTop: `1px solid ${tokens.borderDefault}`,
    }}>
      {/* Zone Label Bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 18,
        background: tokens.bgLabelBar,
        borderBottom: `1px solid ${tokens.borderSubtle}`,
        padding: '0 12px',
        gap: 12,
      }}>
        {/* Left zones */}
        <div style={{ width: zones.viewMode.width, display: 'flex', alignItems: 'center' }}>
          <ZoneLabel>{zones.viewMode.label}</ZoneLabel>
        </div>
        <LabelSeparator />
        <div style={{ width: zones.navigation.width, display: 'flex', alignItems: 'center' }}>
          <ZoneLabel>{zones.navigation.label}</ZoneLabel>
        </div>
        <LabelSeparator />
        <div style={{ width: zones.history.width, display: 'flex', alignItems: 'center' }}>
          <ZoneLabel>{zones.history.label}</ZoneLabel>
        </div>
        
        {/* Center - flexible zones */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {isSubsetMode && (
            <>
              <div style={{ width: zones.subset.width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoneLabel>{zones.subset.label}</ZoneLabel>
              </div>
              <LabelSeparator />
            </>
          )}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ZoneLabel>{zones.activeView.label}</ZoneLabel>
          </div>
        </div>
        
        <LabelSeparator />
        
        {/* Right zone */}
        <div style={{ width: zones.actions.width, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <ZoneLabel>{zones.actions.label}</ZoneLabel>
        </div>
      </div>
      
      {/* Content Bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '6px 12px',
        height: 48,
        gap: 12,
      }}>
        {/* View Mode Zone */}
        <div style={{ width: zones.viewMode.width, display: 'flex', alignItems: 'center' }}>
          <ViewModeToggle mode={viewMode} onChange={onViewModeChange} focusDisabled={focusDisabled} subsetDisabled={subsetDisabled} />
        </div>
        
        <Separator />
        
        {/* Navigation Zone */}
        <div style={{ width: zones.navigation.width, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon="home" title="Go to Home Position" size={14} active={viewportPosition.col === homePosition.col && viewportPosition.row === homePosition.row} style={{ color: tokens.accentAmber }} onClick={onGoHome} />
          <IconButton icon="bookmark" title="Save Position" size={14} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton icon="arrowLeft" title="Pan Left" size={12} onClick={() => onNavigate('left')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <IconButton icon="arrowUp" title="Pan Up" size={12} onClick={() => onNavigate('up')} />
              <IconButton icon="arrowDown" title="Pan Down" size={12} onClick={() => onNavigate('down')} />
            </div>
            <IconButton icon="arrowRight" title="Pan Right" size={12} onClick={() => onNavigate('right')} />
          </div>
          
          <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: tokens.textMuted, padding: '2px 4px', background: tokens.bgCanvas, borderRadius: tokens.radiusSm }}>
            {viewportPosition.col},{viewportPosition.row}
          </span>
        </div>
        
        <Separator />
        
        {/* History Zone */}
        <div style={{ width: zones.history.width, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon="undo" title="Undo (Ctrl+Z)" size={14} disabled={!canUndo} onClick={onUndo} />
          <IconButton icon="redo" title="Redo (Ctrl+Shift+Z)" size={14} disabled={!canRedo} onClick={onRedo} />
        </div>
        
        {/* Center - Subset + Active View */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {isSubsetMode && (
            <>
              <div style={{ width: zones.subset.width, display: 'flex', justifyContent: 'center' }}>
                <SubsetPicker
                  views={views}
                  selectedIds={subsetSelection}
                  onToggle={onSubsetToggle}
                  onSelectAll={onSubsetSelectAll}
                  onClear={onSubsetClear}
                />
              </div>
              <Separator />
            </>
          )}
          
          <ActiveViewWidget
            view={activeView}
            views={views}
            onSelect={onSelectView}
            isOpen={viewExplorerOpen}
            onToggleOpen={() => setViewExplorerOpen(!viewExplorerOpen)}
            subsetMode={isSubsetMode}
            subsetIds={subsetSelection}
          />
        </div>
        
        <Separator />
        
        {/* View Actions Zone */}
        <div style={{ width: zones.actions.width, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          <LinksDropdown
            activeView={activeView}
            allViews={views}
            links={links}
            recentUnlinks={recentUnlinks}
            onUpdateLink={onUpdateLink}
            onRestoreLink={onRestoreLink}
          />
          
          <Separator margin={4} />
          
          <IconButton icon="camera" title="Snapshot" size={14} />
          <IconButton icon="copy" title="Duplicate View" size={14} />
          <IconButton icon="settings" title="View Settings" size={14} />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS INFO FOOTER
// =============================================================================

const CanvasInfoFooter = ({ canvasSize, viewportSize, cellSize, collaboratorCount, syncStatus, onOpenNavigator }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '3px 12px',
    background: tokens.bgTertiary,
    borderTop: `1px solid ${tokens.borderSubtle}`,
    fontSize: 10, color: tokens.textMuted, height: 24,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onOpenNavigator} title="Open Canvas Navigator" style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none',
        color: tokens.textMuted, cursor: 'pointer',
        padding: '2px 4px', margin: '-2px -4px',
        borderRadius: tokens.radiusSm,
        transition: 'all 0.15s ease',
      }}
        onMouseEnter={(e) => { e.target.style.background = tokens.bgHover; e.target.style.color = tokens.textSecondary; }}
        onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.color = tokens.textMuted; }}
      >
        <Icon name="map" size={10} />
        Canvas: {canvasSize.cols}×{canvasSize.rows}
      </button>
      <span>Viewport: {viewportSize.cols}×{viewportSize.rows}</span>
      <span>Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="users" size={10} />
        {collaboratorCount}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: syncStatus === 'synced' ? tokens.accentGreen : tokens.accentAmber }} />
        {syncStatus === 'synced' ? 'Synced' : 'Syncing...'}
      </span>
    </div>
  </div>
);

// =============================================================================
// INSTANCE VIEWPORT
// =============================================================================

const InstanceViewport = ({ viewConfig, cellWidth, isActive, onActivate, onClose, onFocus }) => {
  const colorRgb = hexToRgb(viewConfig.color);
  const isCompact = cellWidth < 150;
  
  return (
    <div onClick={onActivate} onDoubleClick={onFocus} style={{
      display: 'flex', flexDirection: 'column',
      background: tokens.bgPrimary,
      border: `1px solid ${isActive ? viewConfig.color : tokens.borderDefault}`,
      borderRadius: tokens.radiusMd, overflow: 'hidden', cursor: 'pointer',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isCompact ? '3px 6px' : '4px 8px',
        background: isActive ? `rgba(${colorRgb}, 0.1)` : tokens.bgSecondary,
        borderBottom: `1px solid ${isActive ? viewConfig.color : tokens.borderSubtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: viewConfig.color, flexShrink: 0 }} />
          <span style={{ fontSize: isCompact ? 10 : 11, color: tokens.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {viewConfig.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isCompact && <IconButton icon="more" title="More" size={14} />}
          <IconButton icon="focus" title="Focus" onClick={(e) => { e.stopPropagation(); onFocus(); }} size={14} />
          <IconButton icon="x" title="Close" onClick={(e) => { e.stopPropagation(); onClose(); }} size={14} />
        </div>
      </div>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, rgba(${colorRgb}, 0.05) 0%, transparent 100%)`,
      }}>
        <Icon name="grid" size={48} style={{ color: `rgba(${colorRgb}, 0.2)` }} />
      </div>
    </div>
  );
};

const EmptyCell = ({ onAdd }) => (
  <div onClick={onAdd} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: tokens.bgCanvas, border: `1px dashed ${tokens.borderDefault}`,
    borderRadius: tokens.radiusMd, cursor: 'pointer',
  }}>
    <Icon name="plus" size={24} style={{ color: tokens.textMuted }} />
    <span style={{ fontSize: 10, color: tokens.textMuted, marginTop: 4 }}>Add View</span>
  </div>
);

// =============================================================================
// MAIN APP
// =============================================================================

export default function CanvasChromeV12() {
  // Canvas is the full virtual grid, viewport is what's visible
  const [canvasSize, setCanvasSize] = useState({ rows: 20, cols: 20 });
  const [viewportSize, setViewportSize] = useState({ rows: 2, cols: 2 });
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  const [viewStack, setViewStack] = useState([{ type: 'grid', data: null }]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const currentView = viewStack[currentViewIndex];
  const viewMode = currentView.type;
  
  const [editMode, setEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [flowDirection, setFlowDirection] = useState('row');
  const [viewportPosition, setViewportPosition] = useState({ col: 0, row: 0 });
  const [homePosition] = useState({ col: 0, row: 0 });
  
  const [activeViewId, setActiveViewId] = useState('v1');
  const [subsetSelection, setSubsetSelection] = useState(['v1', 'v2', 'v3']);
  
  // Room state
  const [room, setRoom] = useState({ id: 'r1', name: 'Main Room', memberCount: 4 });
  const rooms = [
    { id: 'r1', name: 'Main Room', memberCount: 4 },
    { id: 'r2', name: 'Breakout A', memberCount: 2 },
    { id: 'r3', name: 'Breakout B', memberCount: 1 },
  ];
  
  // Workspace state
  const [workspace, setWorkspace] = useState({ id: 'w1', name: 'Project Alpha' });
  const workspaces = [
    { id: 'w1', name: 'Project Alpha' },
    { id: 'w2', name: 'Analysis 2024' },
    { id: 'w3', name: 'Shared Research' },
  ];
  
  const [links, setLinks] = useState({
    camera: { targetId: 'v2', direction: 'bidirectional' },
    filters: { targetId: null, direction: null },
    selection: { targetId: 'v3', direction: 'push' },
    annotations: { targetId: null, direction: null },
    transforms: { targetId: null, direction: null },
    params: { targetId: null, direction: null },
  });
  
  const [recentUnlinks, setRecentUnlinks] = useState([
    { typeId: 'filters', targetId: 'v4', direction: 'bidirectional' },
  ]);
  
  const [leftTab, setLeftTab] = useState('views');
  const [rightTab, setRightTab] = useState('people');
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  
  const collaborators = [
    { id: 'u1', name: 'Alice', color: tokens.accentBlue },
    { id: 'u2', name: 'Bob', color: tokens.accentGreen },
    { id: 'u3', name: 'Carol', color: tokens.accentPurple },
    { id: 'u4', name: 'Dan', color: tokens.accentAmber },
  ];
  
  const [views, setViews] = useState([
    { id: 'v1', name: 'View of diskout.vtp (Primary Analysis)', color: tokens.accentBlue, position: { col: 0, row: 0 }, onCanvas: true },
    { id: 'v2', name: 'View of diskout.vtp (Secondary Copy)', color: tokens.accentGreen, position: { col: 1, row: 0 }, onCanvas: true },
    { id: 'v3', name: 'View of Skull.vtp', color: tokens.accentTeal, position: { col: 0, row: 1 }, onCanvas: true },
    { id: 'v4', name: 'Sagittal Slice Analysis', color: tokens.accentAmber, position: { col: 1, row: 1 }, onCanvas: true },
  ]);
  
  const activeView = views.find(v => v.id === activeViewId);
  
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
  
  const gap = 8;
  const cellWidth = (containerSize.width - gap * (viewportSize.cols + 1)) / viewportSize.cols;
  const cellHeight = (containerSize.height - gap * (viewportSize.rows + 1)) / viewportSize.rows;
  
  const goBack = useCallback(() => {
    if (currentViewIndex > 0) setCurrentViewIndex(currentViewIndex - 1);
  }, [currentViewIndex]);
  
  const goHome = useCallback(() => {
    setViewStack([{ type: 'grid', data: null }]);
    setCurrentViewIndex(0);
  }, []);
  
  const handleFocus = useCallback((viewConfig) => {
    const newStack = [...viewStack.slice(0, currentViewIndex + 1), { type: 'focus', data: viewConfig }];
    setViewStack(newStack);
    setCurrentViewIndex(newStack.length - 1);
  }, [viewStack, currentViewIndex]);
  
  const handleViewModeChange = useCallback((mode) => {
    if (mode === 'grid') goHome();
    else if (mode === 'focus' && activeView) handleFocus(activeView);
    else if (mode === 'subset') {
      const newStack = [...viewStack.slice(0, currentViewIndex + 1), { type: 'subset', data: subsetSelection }];
      setViewStack(newStack);
      setCurrentViewIndex(newStack.length - 1);
    }
  }, [goHome, handleFocus, activeView, viewStack, currentViewIndex, subsetSelection]);
  
  const handleNavigate = (direction) => {
    setViewportPosition(prev => {
      switch (direction) {
        case 'left': return { ...prev, col: Math.max(0, prev.col - 1) };
        case 'right': return { ...prev, col: prev.col + 1 };
        case 'up': return { ...prev, row: Math.max(0, prev.row - 1) };
        case 'down': return { ...prev, row: prev.row + 1 };
        default: return prev;
      }
    });
  };
  
  const handleUpdateLink = (typeId, targetId, direction) => {
    const currentLink = links[typeId];
    if (currentLink?.targetId && !targetId) {
      setRecentUnlinks(prev => [
        { typeId, targetId: currentLink.targetId, direction: currentLink.direction },
        ...prev.filter(u => !(u.typeId === typeId && u.targetId === currentLink.targetId)).slice(0, 4)
      ]);
    }
    if (targetId) {
      setRecentUnlinks(prev => prev.filter(u => !(u.typeId === typeId && u.targetId === targetId)));
    }
    setLinks(prev => ({ ...prev, [typeId]: { targetId, direction } }));
  };
  
  const handleRestoreLink = (typeId, targetId, direction) => {
    handleUpdateLink(typeId, targetId, direction);
  };
  
  const getViewAt = (row, col) => views.find(v => v.onCanvas && v.position?.row === row && v.position?.col === col);
  
  const handleCloseView = (viewId) => {
    setViews(views.map(v => v.id === viewId ? { ...v, onCanvas: false } : v));
    if (activeViewId === viewId) {
      const remaining = views.filter(v => v.id !== viewId && v.onCanvas);
      setActiveViewId(remaining[0]?.id || null);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') goBack(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack]);
  
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: tokens.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: tokens.textPrimary,
    }}>
      {/* App Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: tokens.bgSecondary,
        borderBottom: `1px solid ${tokens.borderDefault}`, height: 48,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>CIA Web</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton icon="glasses" title="VR Mode" size={18} />
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: tokens.accentBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>B</div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftActivityBar activeTab={leftTab} onTabChange={setLeftTab} onPopoutClick={(id) => { if (id === 'navigator') setNavigatorOpen(true); }} />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SecondaryHeader
            room={room}
            rooms={rooms}
            onRoomChange={setRoom}
            workspace={workspace}
            workspaces={workspaces}
            onWorkspaceChange={setWorkspace}
            collaborators={collaborators}
            editMode={editMode}
            onEditModeToggle={() => setEditMode(!editMode)}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            flowDirection={flowDirection}
            onFlowDirectionChange={setFlowDirection}
            canvasSize={canvasSize}
            onCanvasSizeChange={() => console.log('Open canvas size picker')}
            viewportSize={viewportSize}
            onViewportSizeChange={() => console.log('Open viewport size picker')}
          />
          
          <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: tokens.bgCanvas }}>
            {currentView.type === 'grid' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`,
                gap, padding: gap, width: '100%', height: '100%',
              }}>
                {Array.from({ length: viewportSize.rows * viewportSize.cols }).map((_, i) => {
                  const row = Math.floor(i / viewportSize.cols);
                  const col = i % viewportSize.cols;
                  const viewAtCell = getViewAt(row, col);
                  
                  if (!viewAtCell) return <EmptyCell key={`${row}-${col}`} onAdd={() => console.log('Add at', row, col)} />;
                  
                  return (
                    <InstanceViewport
                      key={viewAtCell.id}
                      viewConfig={viewAtCell}
                      cellWidth={cellWidth}
                      isActive={activeViewId === viewAtCell.id}
                      onActivate={() => setActiveViewId(viewAtCell.id)}
                      onClose={() => handleCloseView(viewAtCell.id)}
                      onFocus={() => handleFocus(viewAtCell)}
                    />
                  );
                })}
              </div>
            )}
            
            {currentView.type === 'focus' && currentView.data && (
              <div style={{ width: '100%', height: '100%', padding: gap }}>
                <InstanceViewport
                  viewConfig={currentView.data}
                  cellWidth={containerSize.width - gap * 2}
                  isActive={true}
                  onActivate={() => {}}
                  onClose={goBack}
                  onFocus={() => {}}
                />
              </div>
            )}
            
            {navigatorOpen && (
              <div style={{
                position: 'absolute', bottom: 80, left: 20,
                width: 300, height: 200,
                background: tokens.bgSecondary,
                border: `1px solid ${tokens.borderDefault}`,
                borderRadius: tokens.radiusLg,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 500,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Canvas Navigator</span>
                  <IconButton icon="x" size={14} onClick={() => setNavigatorOpen(false)} />
                </div>
                <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 40px)', color: tokens.textMuted, fontSize: 11 }}>
                  Minimap + Controls
                </div>
              </div>
            )}
          </div>
          
          <CanvasToolbarFooter
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            focusDisabled={!activeView}
            subsetDisabled={false}
            activeView={activeView}
            views={views}
            onSelectView={setActiveViewId}
            subsetSelection={subsetSelection}
            onSubsetToggle={(id) => setSubsetSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
            onSubsetSelectAll={() => setSubsetSelection(views.filter(v => v.onCanvas).map(v => v.id))}
            onSubsetClear={() => setSubsetSelection([])}
            links={links}
            recentUnlinks={recentUnlinks}
            onUpdateLink={handleUpdateLink}
            onRestoreLink={handleRestoreLink}
            canUndo={true}
            canRedo={false}
            onUndo={() => console.log('Undo')}
            onRedo={() => console.log('Redo')}
            homePosition={homePosition}
            viewportPosition={viewportPosition}
            onNavigate={handleNavigate}
            onGoHome={() => setViewportPosition(homePosition)}
          />
          
          <CanvasInfoFooter
            canvasSize={canvasSize}
            viewportSize={viewportSize}
            cellSize={{ width: cellWidth, height: cellHeight }}
            collaboratorCount={collaborators.length}
            syncStatus="synced"
            onOpenNavigator={() => setNavigatorOpen(true)}
          />
        </div>
        
        <RightActivityBar activeTab={rightTab} onTabChange={setRightTab} />
      </div>
      
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
        button:active:not(:disabled) { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.borderMedium}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
