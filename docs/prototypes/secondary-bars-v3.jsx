import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// DESIGN TOKENS - Glassmorphism Theme (matching app)
// ============================================================================
const tokens = {
  // Backgrounds
  bgBase: '#050505',
  bgPrimary: '#0a0a0a',
  bgSecondary: '#121216',
  bgTertiary: '#1a1a20',
  bgElevated: '#242430',
  bgHover: '#2a2a38',
  
  // Glass
  glassSubtle: 'rgba(255, 255, 255, 0.03)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassMedium: 'rgba(255, 255, 255, 0.08)',
  glassStrong: 'rgba(255, 255, 255, 0.12)',
  
  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
  
  // Text
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  // Accents
  accentBlue: '#60a5fa',
  accentTeal: '#2dd4bf',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  accentGreen: '#4ade80',
  accentRed: '#f87171',
  accentPink: '#f472b6',
  accentCyan: '#22d3ee',
  accentOrange: '#fb923c',
};

// RGB values for rgba usage
const rgb = {
  blue: '96, 165, 250',
  purple: '167, 139, 250',
  green: '74, 222, 128',
  teal: '45, 212, 191',
  amber: '251, 191, 36',
  cyan: '34, 211, 238',
};

// ============================================================================
// SVG ICONS
// ============================================================================
const Icons = {
  chevronUp: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>,
  chevronDown: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>,
  chevronLeft: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>,
  chevronRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>,
  home: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
  bookmark: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  arrowRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  arrowDown: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  pointer: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>,
  hand: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>,
  merge: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="14" y="14" width="8" height="8" rx="2" /><rect x="2" y="2" width="8" height="8" rx="2" /><path d="M7 14v1a2 2 0 0 0 2 2h1M14 7h1a2 2 0 0 1 2 2v1" /></svg>,
  pencil: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>,
  undo: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
  redo: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>,
  grid: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  maximize: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  layers: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  map: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /></svg>,
  stickyNote: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" /></svg>,
  eye: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  mic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>,
  micOff: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /></svg>,
  headphones: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>,
  headphonesOff: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3" /><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v1" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  phone: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  phoneOff: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="23" y1="1" x2="1" y2="23" /><path d="M16.5 16.5l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07M8.09 9.91a16 16 0 0 0 6 6" /></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  gitBranch: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  sliders: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  copy: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  camera: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>,
  search: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  filter: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  x: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  plus: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  arrowUpDown: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>,
  cube: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
  slice: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg>,
  chart: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  points: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="6" cy="6" r="1" fill="currentColor" /><circle cx="18" cy="6" r="1" fill="currentColor" /><circle cx="6" cy="18" r="1" fill="currentColor" /><circle cx="18" cy="18" r="1" fill="currentColor" /></svg>,
};

const viewTypeIcons = { volume: Icons.cube, slice: Icons.slice, chart: Icons.chart, points: Icons.points };

// Workspace type configs (matching app)
const WORKSPACE_TYPES = {
  project: { icon: Icons.globe, color: tokens.accentBlue, rgb: rgb.blue, label: 'Project' },
  breakout: { icon: Icons.gitBranch, color: tokens.accentPurple, rgb: rgb.purple, label: 'Breakout' },
  personal: { icon: Icons.user, color: tokens.accentGreen, rgb: rgb.green, label: 'Personal' },
};

// Mock data
const mockViews = [
  { id: 'v1', name: 'Brain Volume Primary Scan Analysis', type: 'volume', color: tokens.accentBlue, position: { col: 0, row: 0 } },
  { id: 'v2', name: 'Sagittal Slice View', type: 'slice', color: tokens.accentTeal, position: { col: 1, row: 0 } },
  { id: 'v3', name: 'Axial Slice Analysis with Extended Title', type: 'slice', color: tokens.accentAmber, position: { col: 0, row: 1 } },
  { id: 'v4', name: 'Cell Distribution Histogram', type: 'chart', color: tokens.accentPurple, position: { col: 1, row: 1 } },
  { id: 'v5', name: 'Correlation Matrix Visualization', type: 'chart', color: tokens.accentCyan, position: { col: 2, row: 0 } },
];
const availableViews = [
  { id: 'a1', name: 'Coronal Slice View', type: 'slice', color: tokens.accentPink },
  { id: 'a2', name: 'Point Cloud Data Analysis', type: 'points', color: tokens.accentOrange },
];

// ============================================================================
// GLASSMORPHISM WORKSPACE SELECTOR (matching app styles)
// ============================================================================
const WorkspaceSelector = ({ workspace, type = 'project' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const cfg = WORKSPACE_TYPES[type];
  
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        minWidth: '180px',
        background: `rgba(${cfg.rgb}, 0.08)`,
        border: `1px solid rgba(${cfg.rgb}, 0.25)`,
        borderRadius: '8px',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${cfg.rgb}, 0.12)`;
        e.currentTarget.style.borderColor = `rgba(${cfg.rgb}, 0.4)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `rgba(${cfg.rgb}, 0.08)`;
        e.currentTarget.style.borderColor = `rgba(${cfg.rgb}, 0.25)`;
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontSize: '9px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {workspace.name}
        </div>
      </div>
      <span style={{ color: tokens.textMuted, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
        {Icons.chevronDown}
      </span>
    </button>
  );
};

// ============================================================================
// GLASSMORPHISM ROOM PRESENCE INDICATOR (matching app)
// ============================================================================
const RoomPresenceIndicator = ({ room, members = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = [tokens.accentBlue, tokens.accentPink, tokens.accentGreen, tokens.accentAmber];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: tokens.glassLight,
          border: `1px solid ${tokens.borderSubtle}`,
          borderRadius: '8px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <span style={{ color: tokens.accentTeal }}>{Icons.users}</span>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: '9px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>
            Currently In
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: tokens.textPrimary }}>
            {room.name}
          </div>
        </div>
        <span style={{ color: tokens.textMuted }}>{Icons.chevronDown}</span>
      </button>
      
      {/* Avatar stack */}
      <div style={{ display: 'flex' }}>
        {members.slice(0, 4).map((m, i) => (
          <div key={m.id || i} style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: colors[i % colors.length],
            border: `2px solid ${tokens.bgSecondary}`,
            marginLeft: i > 0 ? '-8px' : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, color: '#fff',
            zIndex: members.length - i,
          }} title={m.name}>
            {m.name?.charAt(0) || String.fromCharCode(65 + i)}
          </div>
        ))}
        {members.length > 4 && (
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: tokens.bgElevated, border: `2px solid ${tokens.bgSecondary}`,
            marginLeft: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: tokens.textMuted,
          }}>+{members.length - 4}</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// NAVIGATION BLOCK (compact)
// ============================================================================
const NavigationBlock = ({ position, isAtOrigin, onNavigate, onHome }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    <button style={{ ...S.iconBtn(24), color: tokens.accentAmber }} title="Bookmarks">{Icons.bookmark}</button>
    <button style={{ ...S.iconBtn(24), color: isAtOrigin ? tokens.accentAmber : tokens.textSecondary }} onClick={onHome} title="Home">{Icons.home}</button>
    <div style={{ display: 'flex', gap: '1px', background: tokens.bgTertiary, borderRadius: '4px', padding: '2px' }}>
      {['left', 'up', 'down', 'right'].map(d => (
        <button key={d} style={{ ...S.iconBtn(20), background: 'transparent', border: 'none' }} onClick={() => onNavigate(d)}>
          {d === 'left' ? Icons.chevronLeft : d === 'right' ? Icons.chevronRight : d === 'up' ? Icons.chevronUp : Icons.chevronDown}
        </button>
      ))}
    </div>
    <div style={{ padding: '4px 10px', background: tokens.bgTertiary, borderRadius: '4px', fontFamily: 'ui-monospace', fontSize: '11px' }}>
      <span style={{ color: tokens.textPrimary }}>{position.col}</span>
      <span style={{ color: tokens.textMuted }}>,</span>
      <span style={{ color: tokens.textPrimary }}>{position.row}</span>
    </div>
  </div>
);

// ============================================================================
// FLOW + SIZE
// ============================================================================
const FlowToggle = ({ direction, onChange }) => (
  <div style={{ display: 'flex', background: tokens.bgTertiary, borderRadius: '6px', padding: '2px' }}>
    {[{ id: 'row', icon: Icons.arrowRight, label: 'Row' }, { id: 'column', icon: Icons.arrowDown, label: 'Col' }].map(o => (
      <button key={o.id} onClick={() => onChange(o.id)} style={{
        display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
        background: direction === o.id ? tokens.accentTeal : 'transparent',
        border: 'none', borderRadius: '4px',
        color: direction === o.id ? '#fff' : tokens.textMuted, cursor: 'pointer', fontSize: '11px',
      }}>{o.icon} {o.label}</button>
    ))}
  </div>
);

const SizeDisplay = ({ canvas, viewport }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '11px' }}>
      {Icons.grid}<span style={{ color: tokens.accentGreen, fontWeight: 500 }}>{canvas}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '11px', color: tokens.textMuted }}>
      {Icons.eye}<span>{viewport}</span>
    </div>
  </div>
);

// ============================================================================
// POPOUT BUTTONS
// ============================================================================
const PopoutBtn = ({ icon, label, active, accent, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '6px 12px', minWidth: '48px',
    background: active ? `${accent}22` : tokens.bgTertiary,
    border: `1px solid ${active ? accent : tokens.borderSubtle}`,
    borderRadius: '6px', color: active ? accent : tokens.textSecondary, cursor: 'pointer',
  }}>{icon}<span style={{ fontSize: '9px', fontWeight: 500 }}>{label}</span></button>
);

// ============================================================================
// EDIT BLOCK
// ============================================================================
const EditBlock = ({ isEditMode, activeTool, onToolChange, onToggleEditMode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <button onClick={onToggleEditMode} style={{
      display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 14px',
      background: isEditMode ? tokens.accentAmber : tokens.bgTertiary,
      border: `1px solid ${isEditMode ? tokens.accentAmber : tokens.borderSubtle}`,
      borderRadius: '4px', color: isEditMode ? '#000' : tokens.textSecondary,
      cursor: 'pointer', fontSize: '10px', fontWeight: isEditMode ? 600 : 400,
    }}>{Icons.pencil} {isEditMode ? 'Editing' : 'Edit'}</button>
    <div style={{ display: 'flex', gap: '2px' }}>
      {[
        { id: 'select', icon: Icons.pointer, c: tokens.accentBlue },
        { id: 'pan', icon: Icons.hand, c: tokens.accentTeal },
        { id: 'merge', icon: Icons.merge, c: tokens.accentPurple },
      ].map(t => (
        <button key={t.id} onClick={() => onToolChange(t.id)} style={{
          ...S.iconBtn(24), opacity: isEditMode ? 1 : 0.4,
          ...(isEditMode && activeTool === t.id ? { background: `${t.c}22`, borderColor: t.c, color: t.c } : {}),
        }}>{t.icon}</button>
      ))}
    </div>
  </div>
);

// ============================================================================
// UNDO/REDO
// ============================================================================
const UndoRedo = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    <button style={{ ...S.iconBtn(26), opacity: canUndo ? 1 : 0.4 }} onClick={onUndo} title="Undo">{Icons.undo}</button>
    <button style={{ ...S.iconBtn(26), opacity: canRedo ? 1 : 0.4 }} onClick={onRedo} title="Redo">{Icons.redo}</button>
  </div>
);

// ============================================================================
// ADVANCED VIEW HUB FLYOUT
// ============================================================================
const ViewHubFlyout = ({ views, available, activeView, isSubset, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const all = [...views, ...available];
  const types = [...new Set(all.map(v => v.type))];
  
  const sortFn = (arr) => [...arr].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'type') return a.type.localeCompare(b.type);
    return (a.position?.col || 0) - (b.position?.col || 0);
  });
  
  const filterFn = (arr) => arr.filter(v => 
    (!search || v.name.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || v.type === typeFilter)
  );
  
  const filtered = sortFn(filterFn(views));
  const filteredAvail = sortFn(filterFn(available));
  const hasFilters = search || typeFilter;

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px',
      width: '340px', maxWidth: 'calc(100vw - 32px)',
      background: tokens.bgSecondary,
      border: `1px solid ${tokens.borderDefault}`,
      borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      overflow: 'hidden', zIndex: 1000,
    }}>
      {/* Header for subset mode */}
      {isSubset && (
        <div style={{ padding: '10px 14px', background: `rgba(${rgb.purple}, 0.1)`, borderBottom: `1px solid rgba(${rgb.purple}, 0.2)`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
          <span style={{ fontSize: '12px', color: tokens.accentPurple, fontWeight: 500 }}>Subset Mode</span>
          <span style={{ fontSize: '11px', color: tokens.textMuted }}>• {views.length} views</span>
        </div>
      )}
      
      {/* Search + Filter + Sort */}
      <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: tokens.bgTertiary, borderRadius: '8px' }}>
            <span style={{ color: tokens.textMuted }}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search views..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: tokens.textPrimary, fontSize: '13px' }}
              autoFocus
            />
            {search && <button style={{ background: 'none', border: 'none', color: tokens.textMuted, cursor: 'pointer', padding: 0 }} onClick={() => setSearch('')}>{Icons.x}</button>}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...S.iconBtn(36),
              background: showFilters || typeFilter ? `rgba(${rgb.teal}, 0.15)` : tokens.bgTertiary,
              borderColor: showFilters || typeFilter ? tokens.accentTeal : tokens.borderSubtle,
              color: showFilters || typeFilter ? tokens.accentTeal : tokens.textMuted,
              position: 'relative',
            }}
          >
            {Icons.filter}
            {typeFilter && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: tokens.accentTeal }} />}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSort(!showSort)}
              style={{
                ...S.iconBtn(36),
                background: showSort ? `rgba(${rgb.amber}, 0.15)` : tokens.bgTertiary,
                borderColor: showSort ? tokens.accentAmber : tokens.borderSubtle,
                color: showSort ? tokens.accentAmber : tokens.textMuted,
              }}
            >
              {Icons.arrowUpDown}
            </button>
            {showSort && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: tokens.bgElevated, border: `1px solid ${tokens.borderDefault}`, borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 10, minWidth: '130px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>Sort by</div>
                {[{ id: 'name', label: 'Name' }, { id: 'type', label: 'Type' }, { id: 'position', label: 'Position' }].map(o => (
                  <button key={o.id} onClick={() => { setSortBy(o.id); setShowSort(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px',
                    background: sortBy === o.id ? `rgba(${rgb.amber}, 0.1)` : 'transparent',
                    border: 'none', color: sortBy === o.id ? tokens.accentAmber : tokens.textSecondary,
                    cursor: 'pointer', fontSize: '12px', textAlign: 'left',
                  }}>
                    <span style={{ width: '14px', color: sortBy === o.id ? tokens.accentAmber : 'transparent' }}>✓</span>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Type filter chips */}
        {showFilters && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setTypeFilter(null)} style={{ ...S.chip, background: !typeFilter ? tokens.accentTeal : tokens.bgTertiary, color: !typeFilter ? '#fff' : tokens.textMuted }}>All</button>
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)} style={{
                ...S.chip,
                background: typeFilter === t ? tokens.accentTeal : tokens.bgTertiary,
                color: typeFilter === t ? '#fff' : tokens.textMuted,
              }}>
                {viewTypeIcons[t]} {t}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* View lists */}
      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        <div style={{ padding: '8px' }}>
          <div style={{ padding: '6px 10px', fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isSubset ? 'In Subset' : 'On Canvas'} ({filtered.length})</span>
            {hasFilters && <button style={{ fontSize: '9px', color: tokens.accentTeal, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setSearch(''); setTypeFilter(null); }}>Clear</button>}
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: tokens.textMuted, fontSize: '12px' }}>
              {hasFilters ? 'No views match filters' : 'No views'}
            </div>
          ) : filtered.map(v => (
            <button key={v.id} onClick={() => { onSelect(v); onClose(); }} style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px',
              background: activeView?.id === v.id ? `rgba(${rgb.purple}, 0.12)` : 'transparent',
              border: activeView?.id === v.id ? `1px solid rgba(${rgb.purple}, 0.25)` : '1px solid transparent',
              borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (activeView?.id !== v.id) e.currentTarget.style.background = tokens.glassLight; }}
            onMouseLeave={e => { if (activeView?.id !== v.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: tokens.textPrimary, fontWeight: activeView?.id === v.id ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                <div style={{ fontSize: '11px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>{viewTypeIcons[v.type]} {v.type}</span>
                  {v.position && <span style={{ padding: '1px 6px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '10px' }}>{v.position.col},{v.position.row}</span>}
                </div>
              </div>
              {activeView?.id === v.id && <span style={{ color: tokens.accentPurple, fontSize: '16px' }}>●</span>}
            </button>
          ))}
        </div>
        
        {!isSubset && filteredAvail.length > 0 && (
          <div style={{ padding: '8px', borderTop: `1px solid ${tokens.borderSubtle}` }}>
            <div style={{ padding: '6px 10px', fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Available ({filteredAvail.length})
            </div>
            {filteredAvail.map(v => (
              <button key={v.id} onClick={() => { onSelect(v); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px',
                background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', opacity: 0.7,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = tokens.glassLight; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: tokens.textPrimary }}>{v.name}</div>
                  <div style={{ fontSize: '11px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>{viewTypeIcons[v.type]} {v.type}</div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: tokens.accentGreen, fontSize: '11px' }}>{Icons.plus} Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// VIEW CONTEXT BLOCK (full featured, takes remaining space)
// ============================================================================
const ViewContextBlock = ({ viewMode, onModeChange }) => {
  const [showHub, setShowHub] = useState(false);
  const [showSubset, setShowSubset] = useState(false);
  const [activeView, setActiveView] = useState(mockViews[0]);
  const [subsetIds, setSubsetIds] = useState(['v1', 'v2', 'v3']);
  const hubRef = useRef(null);
  const subsetRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (hubRef.current && !hubRef.current.contains(e.target)) setShowHub(false);
      if (subsetRef.current && !subsetRef.current.contains(e.target)) setShowSubset(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isSubset = viewMode === 'subset';
  const subsetViews = mockViews.filter(v => subsetIds.includes(v.id));
  const viewsForHub = isSubset ? subsetViews : mockViews;
  const modeColor = isSubset ? tokens.accentPurple : viewMode === 'isolation' ? tokens.accentAmber : tokens.accentBlue;
  const modeRgb = isSubset ? rgb.purple : viewMode === 'isolation' ? rgb.amber : rgb.blue;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
      {/* Row 1: Mode + ViewHub + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', background: tokens.bgPrimary, borderRadius: '6px', padding: '3px', flexShrink: 0 }}>
          {[
            { id: 'normal', icon: Icons.grid, c: tokens.accentBlue },
            { id: 'isolation', icon: Icons.maximize, c: tokens.accentAmber },
            { id: 'subset', icon: Icons.layers, c: tokens.accentPurple },
          ].map(m => (
            <button key={m.id} onClick={() => onModeChange(m.id)} title={m.id.charAt(0).toUpperCase() + m.id.slice(1)} style={{
              width: '30px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: viewMode === m.id ? `${m.c}22` : 'transparent',
              border: viewMode === m.id ? `1px solid ${m.c}` : '1px solid transparent',
              borderRadius: '4px', color: viewMode === m.id ? m.c : tokens.textMuted, cursor: 'pointer',
            }}>{m.icon}</button>
          ))}
        </div>
        
        <div style={{ width: '1px', height: '28px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        {/* Active view selector - FLEXIBLE WIDTH */}
        <div ref={hubRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <button onClick={() => setShowHub(!showHub)} style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '8px 14px',
            background: showHub ? tokens.bgHover : `rgba(${modeRgb}, 0.06)`,
            border: `1px solid ${showHub ? modeColor : `rgba(${modeRgb}, 0.2)`}`,
            borderRadius: '8px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeView?.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: '9px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '1px' }}>Active View</div>
              <div style={{ fontSize: '13px', color: tokens.textPrimary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeView?.name || 'Select view...'}
              </div>
            </div>
            <span style={{ color: tokens.textMuted, flexShrink: 0 }}>{viewTypeIcons[activeView?.type]}</span>
            <span style={{ color: tokens.textMuted, flexShrink: 0 }}>{showHub ? Icons.chevronUp : Icons.chevronDown}</span>
          </button>
          {showHub && <ViewHubFlyout views={viewsForHub} available={isSubset ? [] : availableViews} activeView={activeView} isSubset={isSubset} onSelect={setActiveView} onClose={() => setShowHub(false)} />}
        </div>
        
        <div style={{ width: '1px', height: '28px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button style={S.iconBtn(28)} title="Links">{Icons.link}</button>
          <button style={S.iconBtn(28)} title="Snapshot">{Icons.camera}</button>
          <button style={S.iconBtn(28)} title="Duplicate">{Icons.copy}</button>
        </div>
      </div>
      
      {/* Row 2: Context info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '24px' }}>
        <div style={{ width: '102px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {viewMode === 'normal' && <span style={{ fontSize: '10px', color: tokens.accentBlue, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>{Icons.grid} All Views</span>}
          {viewMode === 'isolation' && <span style={{ fontSize: '10px', color: tokens.accentAmber, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>{Icons.maximize} Focus</span>}
          {viewMode === 'subset' && <span style={{ fontSize: '10px', color: tokens.accentPurple, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>{Icons.layers} Compare</span>}
        </div>
        
        <div style={{ width: '1px', height: '16px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {viewMode === 'normal' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '3px 8px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '11px', fontFamily: 'ui-monospace', color: tokens.textSecondary }}>
                {activeView?.position?.col},{activeView?.position?.row}
              </span>
              <span style={{ fontSize: '11px', color: tokens.textMuted }}>{mockViews.length} views on canvas</span>
            </div>
          )}
          {viewMode === 'isolation' && (
            <span style={{ fontSize: '11px', color: tokens.textMuted }}>
              Press <kbd style={{ padding: '2px 6px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '10px', fontFamily: 'ui-monospace' }}>Esc</kbd> to exit
            </span>
          )}
          {viewMode === 'subset' && (
            <div ref={subsetRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowSubset(!showSubset)} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px',
                background: `rgba(${rgb.purple}, 0.06)`,
                border: `1px solid ${showSubset ? tokens.accentPurple : `rgba(${rgb.purple}, 0.3)`}`,
                borderRadius: '6px', cursor: 'pointer',
              }}>
                <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
                <span style={{ fontSize: '11px', color: tokens.textSecondary }}>{subsetIds.length} in subset</span>
                <div style={{ display: 'flex' }}>
                  {subsetViews.slice(0, 4).map((v, i) => (
                    <span key={v.id} style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.color, marginLeft: i > 0 ? '-4px' : 0, border: `2px solid ${tokens.bgSecondary}` }} />
                  ))}
                </div>
                <span style={{ color: tokens.textMuted }}>{showSubset ? Icons.chevronUp : Icons.chevronDown}</span>
              </button>
              
              {showSubset && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', width: '340px', maxWidth: 'calc(100vw - 32px)', background: tokens.bgSecondary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 1000 }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: `rgba(${rgb.purple}, 0.08)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: tokens.accentPurple, fontWeight: 500 }}>Select Subset Views</div>
                    <span style={{ fontSize: '11px', color: tokens.textMuted }}>{subsetIds.length} selected</span>
                  </div>
                  <div style={{ padding: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {mockViews.map(v => {
                      const sel = subsetIds.includes(v.id);
                      return (
                        <div key={v.id} onClick={() => setSubsetIds(p => sel ? p.filter(id => id !== v.id) : [...p, v.id])} style={{
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                          borderRadius: '8px', cursor: 'pointer',
                          background: sel ? `rgba(${rgb.purple}, 0.12)` : 'transparent',
                          border: sel ? `1px solid rgba(${rgb.purple}, 0.25)` : '1px solid transparent',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = tokens.glassLight; }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.background = sel ? `rgba(${rgb.purple}, 0.12)` : 'transparent'; }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '5px',
                            border: `2px solid ${sel ? tokens.accentPurple : tokens.borderSubtle}`,
                            background: sel ? tokens.accentPurple : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            transition: 'all 0.15s', flexShrink: 0,
                          }}>{sel && Icons.check}</div>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                            <div style={{ fontSize: '11px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>{viewTypeIcons[v.type]} {v.type}</span>
                              {v.position && <span style={{ padding: '1px 6px', background: tokens.bgTertiary, borderRadius: '4px', fontSize: '10px' }}>{v.position.col},{v.position.row}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VOICE ZONE (Discord-style with room selector and settings)
// ============================================================================
const VoiceZone = ({ muted, deafened, inChannel, speaking, onMute, onDeafen, onJoinLeave, room = 'Main Room' }) => {
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(room);
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [inputDevice, setInputDevice] = useState('Default Microphone');
  const [outputDevice, setOutputDevice] = useState('Default Speakers');
  
  const roomRef = useRef(null);
  const settingsRef = useRef(null);
  
  const rooms = [
    { id: 'main', name: 'Main Room', users: 4 },
    { id: 'breakout1', name: 'Breakout A', users: 2 },
    { id: 'breakout2', name: 'Breakout B', users: 0 },
    { id: 'quiet', name: 'Quiet Focus', users: 1 },
  ];
  
  const inputDevices = ['Default Microphone', 'MacBook Pro Microphone', 'External USB Mic'];
  const outputDevices = ['Default Speakers', 'MacBook Pro Speakers', 'AirPods Pro', 'External Headphones'];
  
  useEffect(() => {
    const close = (e) => {
      if (roomRef.current && !roomRef.current.contains(e.target)) setShowRoomPicker(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!inChannel) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <button onClick={onJoinLeave} style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
        background: `linear-gradient(135deg, rgba(${rgb.green}, 0.2), rgba(${rgb.teal}, 0.2))`,
        border: `1px solid ${tokens.accentGreen}`,
        borderRadius: '8px', color: tokens.accentGreen, cursor: 'pointer', fontSize: '12px', fontWeight: 600,
      }}>{Icons.phone} Join Voice</button>
      <span style={{ fontSize: '10px', color: tokens.textMuted }}>Not connected</span>
    </div>
  );
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Room selector */}
      <div ref={roomRef} style={{ position: 'relative' }}>
        <button onClick={() => setShowRoomPicker(!showRoomPicker)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px',
          padding: '6px 10px', minWidth: '90px',
          background: showRoomPicker ? tokens.bgHover : 'transparent',
          border: `1px solid ${showRoomPicker ? tokens.borderMedium : 'transparent'}`,
          borderRadius: '6px', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tokens.accentGreen, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '9px', color: tokens.accentGreen, fontWeight: 500 }}>VOICE CONNECTED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: tokens.textPrimary, fontWeight: 500 }}>{selectedRoom}</span>
            <span style={{ color: tokens.textMuted }}>{Icons.chevronDown}</span>
          </div>
        </button>
        
        {showRoomPicker && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '6px', width: '200px', background: tokens.bgSecondary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 1000 }}>
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
              <div style={{ fontSize: '11px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voice Channels</div>
            </div>
            <div style={{ padding: '6px' }}>
              {rooms.map(r => (
                <button key={r.id} onClick={() => { setSelectedRoom(r.name); setShowRoomPicker(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px',
                  background: selectedRoom === r.name ? `rgba(${rgb.green}, 0.15)` : 'transparent',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ color: tokens.textMuted }}>{Icons.users}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: selectedRoom === r.name ? tokens.accentGreen : tokens.textPrimary }}>{r.name}</span>
                  {r.users > 0 && <span style={{ fontSize: '10px', color: tokens.textMuted, padding: '2px 6px', background: tokens.bgTertiary, borderRadius: '10px' }}>{r.users}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ width: '1px', height: '32px', background: tokens.borderSubtle }} />
      
      {/* Mic button */}
      <button onClick={onMute} title={muted ? 'Unmute' : 'Mute'} style={{
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: muted ? `rgba(${rgb.amber}, 0.15)` : speaking ? `rgba(${rgb.green}, 0.15)` : tokens.bgTertiary,
        border: `2px solid ${muted ? tokens.accentRed : speaking ? tokens.accentGreen : tokens.borderSubtle}`,
        borderRadius: '50%', color: muted ? tokens.accentRed : speaking ? tokens.accentGreen : tokens.textSecondary, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>{muted ? Icons.micOff : Icons.mic}</button>
      
      {/* Deafen button */}
      <button onClick={onDeafen} title={deafened ? 'Undeafen' : 'Deafen'} style={{
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: deafened ? `rgba(${rgb.amber}, 0.15)` : tokens.bgTertiary,
        border: `2px solid ${deafened ? tokens.accentRed : tokens.borderSubtle}`,
        borderRadius: '50%', color: deafened ? tokens.accentRed : tokens.textSecondary, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>{deafened ? Icons.headphonesOff : Icons.headphones}</button>
      
      {/* Settings button */}
      <div ref={settingsRef} style={{ position: 'relative' }}>
        <button onClick={() => setShowSettings(!showSettings)} title="Voice Settings" style={{
          width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showSettings ? `rgba(${rgb.blue}, 0.15)` : tokens.bgTertiary,
          border: `2px solid ${showSettings ? tokens.accentBlue : tokens.borderSubtle}`,
          borderRadius: '50%', color: showSettings ? tokens.accentBlue : tokens.textSecondary, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>{Icons.sliders}</button>
        
        {showSettings && (
          <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', width: '280px', background: tokens.bgSecondary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 1000 }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: `rgba(${rgb.blue}, 0.06)` }}>
              <div style={{ fontSize: '13px', color: tokens.textPrimary, fontWeight: 500 }}>Voice Settings</div>
            </div>
            
            <div style={{ padding: '12px' }}>
              {/* Input Device */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Input Device</label>
                <select value={inputDevice} onChange={e => setInputDevice(e.target.value)} style={{
                  width: '100%', padding: '8px 10px',
                  background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: '6px', color: tokens.textPrimary, fontSize: '12px',
                  cursor: 'pointer', outline: 'none',
                }}>
                  {inputDevices.map(d => <option key={d} value={d} style={{ background: tokens.bgSecondary }}>{d}</option>)}
                </select>
              </div>
              
              {/* Input Volume */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Input Volume</label>
                  <span style={{ fontSize: '11px', color: tokens.textSecondary }}>{inputVolume}%</span>
                </div>
                <input type="range" min="0" max="100" value={inputVolume} onChange={e => setInputVolume(e.target.value)} style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  background: `linear-gradient(to right, ${tokens.accentGreen} ${inputVolume}%, ${tokens.bgTertiary} ${inputVolume}%)`,
                  appearance: 'none', cursor: 'pointer',
                }} />
              </div>
              
              <div style={{ height: '1px', background: tokens.borderSubtle, margin: '12px 0' }} />
              
              {/* Output Device */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Output Device</label>
                <select value={outputDevice} onChange={e => setOutputDevice(e.target.value)} style={{
                  width: '100%', padding: '8px 10px',
                  background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: '6px', color: tokens.textPrimary, fontSize: '12px',
                  cursor: 'pointer', outline: 'none',
                }}>
                  {outputDevices.map(d => <option key={d} value={d} style={{ background: tokens.bgSecondary }}>{d}</option>)}
                </select>
              </div>
              
              {/* Output Volume */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Output Volume</label>
                  <span style={{ fontSize: '11px', color: tokens.textSecondary }}>{outputVolume}%</span>
                </div>
                <input type="range" min="0" max="100" value={outputVolume} onChange={e => setOutputVolume(e.target.value)} style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  background: `linear-gradient(to right, ${tokens.accentBlue} ${outputVolume}%, ${tokens.bgTertiary} ${outputVolume}%)`,
                  appearance: 'none', cursor: 'pointer',
                }} />
              </div>
            </div>
            
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.borderSubtle}`, background: tokens.bgTertiary }}>
              <button style={{
                width: '100%', padding: '8px',
                background: 'transparent', border: `1px solid ${tokens.borderSubtle}`,
                borderRadius: '6px', color: tokens.textSecondary, fontSize: '11px', cursor: 'pointer',
              }}>
                Advanced Settings...
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Disconnect button */}
      <button onClick={onJoinLeave} title="Disconnect" style={{
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `rgba(${rgb.amber}, 0.1)`,
        border: `2px solid rgba(${rgb.amber}, 0.3)`,
        borderRadius: '50%', color: tokens.accentRed, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>{Icons.phoneOff}</button>
    </div>
  );
};

// ============================================================================
// SHARED STYLES
// ============================================================================
const S = {
  iconBtn: (size = 26) => ({
    width: `${size}px`, height: `${size}px`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`,
    borderRadius: '6px', color: tokens.textSecondary, cursor: 'pointer', padding: 0,
    transition: 'all 0.15s',
  }),
  chip: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 12px', border: 'none', borderRadius: '16px',
    fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s',
  },
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function SecondaryBarsV3() {
  const [flow, setFlow] = useState('row');
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState('select');
  const [viewMode, setViewMode] = useState('normal');
  const [pos, setPos] = useState({ col: 2, row: 1 });
  const [nav, setNav] = useState(false);
  const [notes, setNotes] = useState(true);
  const [ops, setOps] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [inChannel, setInChannel] = useState(true);
  const [speaking, setSpeaking] = useState(true);

  const members = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }, { id: '3', name: 'Carol' }, { id: '4', name: 'Dave' }];

  return (
    <div style={{ minHeight: '100vh', background: tokens.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: tokens.textPrimary, padding: '20px' }}>
      {/* SECONDARY HEADER */}
      <div style={{ background: tokens.bgSecondary, borderRadius: '12px 12px 0 0', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <div style={{ height: '52px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '16px' }}>
          <WorkspaceSelector workspace={{ name: 'Brain Study Analysis' }} type="project" />
          
          <div style={{ width: '1px', height: '32px', background: tokens.borderSubtle }} />
          
          <NavigationBlock
            position={pos}
            isAtOrigin={pos.col === 0 && pos.row === 0}
            onNavigate={d => setPos(p => ({ col: Math.max(0, p.col + (d === 'right' ? 1 : d === 'left' ? -1 : 0)), row: Math.max(0, p.row + (d === 'down' ? 1 : d === 'up' ? -1 : 0)) }))}
            onHome={() => setPos({ col: 0, row: 0 })}
          />
          
          <div style={{ width: '1px', height: '32px', background: tokens.borderSubtle }} />
          
          <FlowToggle direction={flow} onChange={setFlow} />
          
          <SizeDisplay canvas="4×3" viewport="3×2" />
          
          <div style={{ flex: 1 }} />
          
          <RoomPresenceIndicator room={{ name: 'Main Room' }} members={members} />
        </div>
      </div>

      {/* Canvas */}
      <div style={{ height: '240px', background: `linear-gradient(135deg, ${tokens.bgSecondary}, ${tokens.bgPrimary})`, border: `1px dashed ${tokens.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted, fontSize: '14px' }}>
        Canvas Area
      </div>

      {/* SECONDARY FOOTER */}
      <div style={{ background: tokens.bgSecondary, borderRadius: '0 0 12px 12px', borderTop: `1px solid ${tokens.borderSubtle}`, overflow: 'visible' }}>
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '16px' }}>
          {/* Popouts */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <PopoutBtn icon={Icons.map} label="Nav" active={nav} accent={tokens.accentTeal} onClick={() => setNav(!nav)} />
            <PopoutBtn icon={Icons.stickyNote} label="Notes" active={notes} accent={tokens.accentAmber} onClick={() => setNotes(!notes)} />
            <PopoutBtn icon={Icons.sliders} label="Ops" active={ops} accent={tokens.accentBlue} onClick={() => setOps(!ops)} />
          </div>
          
          <div style={{ width: '1px', height: '48px', background: tokens.borderSubtle, flexShrink: 0 }} />
          
          {/* Edit */}
          <EditBlock isEditMode={editMode} activeTool={tool} onToolChange={t => { setTool(t); if (!editMode) setEditMode(true); }} onToggleEditMode={() => setEditMode(!editMode)} />
          
          <div style={{ width: '1px', height: '48px', background: tokens.borderSubtle, flexShrink: 0 }} />
          
          {/* History */}
          <UndoRedo canUndo={true} canRedo={false} onUndo={() => {}} onRedo={() => {}} />
          
          <div style={{ width: '1px', height: '48px', background: tokens.borderSubtle, flexShrink: 0 }} />
          
          {/* View Context - TAKES REMAINING SPACE */}
          <ViewContextBlock viewMode={viewMode} onModeChange={setViewMode} />
          
          <div style={{ width: '1px', height: '48px', background: tokens.borderSubtle, flexShrink: 0 }} />
          
          {/* Voice */}
          <div style={{ padding: '8px 16px', background: `rgba(${rgb.blue}, 0.04)`, borderRadius: '10px', border: `1px solid rgba(${rgb.blue}, 0.15)`, flexShrink: 0 }}>
            <VoiceZone muted={muted} deafened={deafened} inChannel={inChannel} speaking={speaking} onMute={() => { setMuted(!muted); if (!muted) setSpeaking(false); }} onDeafen={() => setDeafened(!deafened)} onJoinLeave={() => setInChannel(!inChannel)} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {['normal', 'isolation', 'subset'].map(m => (
          <button key={m} onClick={() => setViewMode(m)} style={{
            padding: '10px 20px',
            background: viewMode === m ? tokens.accentPurple : tokens.bgSecondary,
            border: `1px solid ${viewMode === m ? tokens.accentPurple : tokens.borderSubtle}`,
            borderRadius: '8px', color: viewMode === m ? '#fff' : tokens.textSecondary,
            cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize', fontWeight: 500,
          }}>{m}</button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', fontSize: '12px', color: tokens.textMuted }}>
          <input type="checkbox" checked={speaking} onChange={e => setSpeaking(e.target.checked)} disabled={muted || !inChannel} style={{ accentColor: tokens.accentGreen }} />
          Simulate Speaking
        </label>
      </div>
    </div>
  );
}
