import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const tokens = {
  bgPrimary: '#0d0d12',
  bgSecondary: '#16161f',
  bgTertiary: '#1e1e2a',
  bgHover: '#252532',
  bgLabelBar: '#0a0a0f',
  borderDefault: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  textPrimary: '#f0f0f5',
  textSecondary: '#9090a0',
  textMuted: '#606070',
  accentBlue: '#60a5fa',
  accentTeal: '#2dd4bf',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  accentGreen: '#4ade80',
  accentRed: '#f87171',
  accentPink: '#f472b6',
  accentCyan: '#22d3ee',
};

// ============================================================================
// SVG ICONS
// ============================================================================
const Icons = {
  chevronUp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>,
  chevronDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>,
  chevronLeft: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>,
  chevronRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
  home: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
  bookmark: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  arrowRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  arrowDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
  pointer: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>,
  hand: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>,
  merge: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="14" y="14" width="8" height="8" rx="2" /><rect x="2" y="2" width="8" height="8" rx="2" /><path d="M7 14v1a2 2 0 0 0 2 2h1M14 7h1a2 2 0 0 1 2 2v1" /></svg>,
  pencil: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>,
  undo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
  redo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>,
  grid: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  maximize: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  layers: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  map: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /></svg>,
  stickyNote: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" /></svg>,
  eye: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  mic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>,
  micOff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /></svg>,
  headphones: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>,
  headphonesOff: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3" /><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v1" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  phoneOff: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>,
  folder: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  sliders: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  copy: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  snapshot: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
  crosshair: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>,
  camera: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  filter: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  target: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  settings: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  waveform: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h2l2-6 2 12 2-8 2 4 2-2 2 6 2-10 2 8h2" /></svg>,
};

// ============================================================================
// SHARED STYLES
// ============================================================================
const styles = {
  iconButton: (size = 24) => ({
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.bgTertiary,
    border: `1px solid ${tokens.borderSubtle}`,
    borderRadius: '4px',
    color: tokens.textSecondary,
    cursor: 'pointer',
    padding: 0,
  }),
  iconButtonMuted: (size = 24) => ({
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.bgTertiary,
    border: `1px solid ${tokens.borderSubtle}`,
    borderRadius: '4px',
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 0,
    opacity: 0.5,
  }),
  buttonActive: (color) => ({
    background: `${color}22`,
    borderColor: color,
    color: color,
    opacity: 1,
  }),
  colorDot: (color, size = 8) => ({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  divider: {
    width: '1px',
    alignSelf: 'stretch',
    background: tokens.borderSubtle,
    margin: '0 8px',
    flexShrink: 0,
  },
  popover: {
    background: tokens.bgSecondary,
    border: `1px solid ${tokens.borderDefault}`,
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 9999,
    overflow: 'hidden',
  },
  dropdownButton: (isOpen, accentColor = null) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: isOpen ? tokens.bgHover : tokens.bgTertiary,
    border: `1px solid ${isOpen ? (accentColor || tokens.accentPurple) : tokens.borderSubtle}`,
    borderRadius: '5px',
    color: tokens.textPrimary,
    cursor: 'pointer',
    fontSize: '11px',
  }),
  sizeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: tokens.textSecondary,
  },
};

// ============================================================================
// POPOVER - Simple absolute positioning (parent needs overflow:visible)
// ============================================================================
const Popover = ({ children, isOpen }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
      ...styles.popover,
    }}>
      {children}
    </div>
  );
};

// ============================================================================
// LABEL BAR - Each zone has its own label directly above
// ============================================================================
const LabelBar = ({ zones }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    height: '18px',
    background: tokens.bgLabelBar,
    borderBottom: `1px solid ${tokens.borderSubtle}`,
  }}>
    {zones.map((zone, i) => (
      <div
        key={i}
        style={{
          flex: zone.flex || '0 0 auto',
          minWidth: zone.minWidth,
          width: zone.width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: zone.borderRight ? `1px solid ${tokens.borderSubtle}` : 'none',
          borderLeft: zone.borderLeft ? `1px solid ${tokens.borderSubtle}` : 'none',
          background: zone.background || 'transparent',
        }}
      >
        {zone.label && (
          <span style={{
            fontSize: '8px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: zone.label.color,
            opacity: 0.8,
          }}>
            {zone.label.text}
          </span>
        )}
      </div>
    ))}
  </div>
);

// ============================================================================
// CONTENT ROW - Matching zones below label bar
// ============================================================================
const ContentRow = ({ zones, children }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {children}
  </div>
);

// Zone wrapper for consistent styling
const Zone = ({ minWidth, width, flex, borderRight, borderLeft, background, children, align = 'center', padding = '0 12px' }) => (
  <div style={{
    flex: flex || '0 0 auto',
    minWidth,
    width,
    padding,
    display: 'flex',
    alignItems: 'center',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    borderRight: borderRight ? `1px solid ${tokens.borderSubtle}` : 'none',
    borderLeft: borderLeft ? `1px solid ${tokens.borderSubtle}` : 'none',
    background: background || 'transparent',
    height: '100%',
  }}>
    {children}
  </div>
);

// ============================================================================
// HEADER: Workspace Selector (compact)
// ============================================================================
const WorkspaceSelector = ({ workspace }) => (
  <button style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    background: tokens.bgTertiary,
    border: `1px solid ${tokens.borderSubtle}`,
    borderRadius: '5px',
    color: tokens.textPrimary,
    cursor: 'pointer',
    fontSize: '11px',
  }}>
    <span style={{
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      background: `linear-gradient(135deg, ${tokens.accentPurple}, ${tokens.accentBlue})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '9px',
      fontWeight: 700,
    }}>
      B
    </span>
    <span style={{ fontWeight: 500 }}>{workspace.name}</span>
    {Icons.chevronDown}
  </button>
);

// ============================================================================
// HEADER: Canvas Navigation (compact single line)
// ============================================================================
const NavigationBlock = ({ position, isAtOrigin, onNavigate, onHome }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    {/* Bookmarks */}
    <button style={{ ...styles.iconButton(22), color: tokens.accentAmber }} title="Bookmarks">
      {Icons.bookmark}
    </button>
    
    <div style={{ width: '1px', height: '16px', background: tokens.borderSubtle }} />
    
    {/* Home */}
    <button
      style={{ ...styles.iconButton(22), color: isAtOrigin ? tokens.accentAmber : tokens.textSecondary }}
      onClick={onHome}
      title="Home (0,0)"
    >
      {Icons.home}
    </button>
    
    {/* Arrow buttons - horizontal row */}
    <div style={{ display: 'flex', gap: '2px' }}>
      <button style={{ ...styles.iconButton(20), borderRadius: '3px' }} onClick={() => onNavigate('left')} title="Left">{Icons.chevronLeft}</button>
      <button style={{ ...styles.iconButton(20), borderRadius: '3px' }} onClick={() => onNavigate('up')} title="Up">{Icons.chevronUp}</button>
      <button style={{ ...styles.iconButton(20), borderRadius: '3px' }} onClick={() => onNavigate('down')} title="Down">{Icons.chevronDown}</button>
      <button style={{ ...styles.iconButton(20), borderRadius: '3px' }} onClick={() => onNavigate('right')} title="Right">{Icons.chevronRight}</button>
    </div>
    
    {/* Position display */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      padding: '3px 6px',
      background: tokens.bgTertiary,
      borderRadius: '4px',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '10px',
      color: tokens.textSecondary,
    }}>
      <span style={{ color: tokens.textPrimary }}>{position.col}</span>,
      <span style={{ color: tokens.textPrimary }}>{position.row}</span>
    </div>
  </div>
);

// ============================================================================
// HEADER: Flow Direction (compact)
// ============================================================================
const FlowDirectionBlock = ({ direction, onChange }) => (
  <div style={{ display: 'flex', background: tokens.bgTertiary, borderRadius: '4px', padding: '2px', gap: '1px' }}>
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 6px',
        background: direction === 'row' ? tokens.accentTeal : 'transparent',
        border: 'none', borderRadius: '3px',
        color: direction === 'row' ? '#fff' : tokens.textSecondary,
        cursor: 'pointer', fontSize: '9px',
      }}
      onClick={() => onChange('row')}
    >
      {Icons.arrowRight} Row
    </button>
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 6px',
        background: direction === 'column' ? tokens.accentTeal : 'transparent',
        border: 'none', borderRadius: '3px',
        color: direction === 'column' ? '#fff' : tokens.textSecondary,
        cursor: 'pointer', fontSize: '9px',
      }}
      onClick={() => onChange('column')}
    >
      {Icons.arrowDown} Col
    </button>
  </div>
);

// ============================================================================
// HEADER: Canvas Size (compact)
// ============================================================================
const CanvasSizeBlock = ({ canvasSize, viewportSize }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ ...styles.sizeRow, padding: '2px 5px', background: tokens.bgTertiary, borderRadius: '3px', fontSize: '9px' }} title="Canvas Size">
      {Icons.grid}
      <span style={{ color: tokens.accentGreen, fontWeight: 500 }}>{canvasSize}</span>
    </div>
    <div style={{ ...styles.sizeRow, padding: '2px 5px', background: tokens.bgTertiary, borderRadius: '3px', fontSize: '9px' }} title="Viewport Size">
      {Icons.eye}
      <span>{viewportSize}</span>
    </div>
  </div>
);

// ============================================================================
// HEADER: Room Selector (compact)
// ============================================================================
const RoomSelector = ({ room, memberCount }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <button style={{
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 8px',
      background: tokens.bgTertiary,
      border: `1px solid ${tokens.borderSubtle}`,
      borderRadius: '5px',
      color: tokens.textPrimary,
      cursor: 'pointer',
      fontSize: '10px',
    }}>
      <span style={{ color: tokens.accentTeal }}>{Icons.users}</span>
      <span>{room.name}</span>
      {Icons.chevronDown}
    </button>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {[tokens.accentBlue, tokens.accentPink, tokens.accentGreen].slice(0, memberCount).map((c, i) => (
        <div key={i} style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: c,
          border: `2px solid ${tokens.bgSecondary}`,
          marginLeft: i > 0 ? '-5px' : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 600,
          color: '#fff',
        }}>
          {String.fromCharCode(65 + i)}
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// FOOTER: Popout Button
// ============================================================================
const PopoutButton = ({ icon, label, active, accent, onClick }) => (
  <button
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
      padding: '6px 10px', background: active ? `${accent}22` : tokens.bgTertiary,
      border: `1px solid ${active ? accent : tokens.borderSubtle}`,
      borderRadius: '6px', color: active ? accent : tokens.textSecondary, cursor: 'pointer', minWidth: '44px',
    }}
    onClick={onClick}
  >
    {icon}
    <span style={{ fontSize: '9px', fontWeight: 500 }}>{label}</span>
  </button>
);

// ============================================================================
// FOOTER: Edit Block (stacked - toggle on top, tools below)
// ============================================================================
const EditBlock = ({ isEditMode, activeTool, onToolChange, onToggleEditMode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <button
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '3px 12px', width: '100%',
        background: isEditMode ? tokens.accentAmber : tokens.bgTertiary,
        border: `1px solid ${isEditMode ? tokens.accentAmber : tokens.borderSubtle}`,
        borderRadius: '4px', color: isEditMode ? '#000' : tokens.textSecondary,
        cursor: 'pointer', fontSize: '10px', fontWeight: isEditMode ? 600 : 400,
      }}
      onClick={onToggleEditMode}
    >
      {Icons.pencil}
      <span>{isEditMode ? 'Editing' : 'Edit'}</span>
    </button>
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[
        { id: 'select', icon: Icons.pointer, color: tokens.accentBlue },
        { id: 'pan', icon: Icons.hand, color: tokens.accentTeal },
        { id: 'merge', icon: Icons.merge, color: tokens.accentPurple },
      ].map(tool => (
        <button
          key={tool.id}
          style={{
            ...(isEditMode ? styles.iconButton(24) : styles.iconButtonMuted(24)),
            ...(isEditMode && activeTool === tool.id ? styles.buttonActive(tool.color) : {}),
          }}
          onClick={() => onToolChange(tool.id)}
        >{tool.icon}</button>
      ))}
    </div>
  </div>
);

// ============================================================================
// FOOTER: Undo/Redo Block (separate from edit mode)
// ============================================================================
const UndoRedoBlock = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
    <span style={{ fontSize: '9px', color: tokens.textMuted }}>History</span>
    <div style={{ display: 'flex', gap: '3px' }}>
      <button style={{ ...styles.iconButton(24), opacity: canUndo ? 1 : 0.4 }} onClick={onUndo} disabled={!canUndo} title="Undo">{Icons.undo}</button>
      <button style={{ ...styles.iconButton(24), opacity: canRedo ? 1 : 0.4 }} onClick={onRedo} disabled={!canRedo} title="Redo">{Icons.redo}</button>
    </div>
  </div>
);

// ============================================================================
// FOOTER: Voice Zone (redesigned - more prominent)
// ============================================================================
const VoiceZone = ({ isMuted, isDeafened, isInChannel, isSpeaking, onToggleMute, onToggleDeafen, onJoinLeave }) => {
  if (!isInChannel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px',
            background: `linear-gradient(135deg, ${tokens.accentGreen}22, ${tokens.accentTeal}22)`,
            border: `1px solid ${tokens.accentGreen}`,
            borderRadius: '8px',
            color: tokens.accentGreen,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
          onClick={onJoinLeave}
        >
          {Icons.phone}
          <span>Join Voice</span>
        </button>
        <span style={{ fontSize: '9px', color: tokens.textMuted }}>Main Room</span>
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
      {/* Mic + Deafen controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Mic button */}
          <button
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isMuted ? `${tokens.accentRed}22` : isSpeaking ? `${tokens.accentGreen}22` : tokens.bgTertiary,
              border: `2px solid ${isMuted ? tokens.accentRed : isSpeaking ? tokens.accentGreen : tokens.borderSubtle}`,
              borderRadius: '50%',
              color: isMuted ? tokens.accentRed : isSpeaking ? tokens.accentGreen : tokens.textSecondary,
              cursor: 'pointer',
            }}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? Icons.micOff : Icons.mic}
          </button>
          
          {/* Deafen button */}
          <button
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDeafened ? `${tokens.accentRed}22` : tokens.bgTertiary,
              border: `2px solid ${isDeafened ? tokens.accentRed : tokens.borderSubtle}`,
              borderRadius: '50%',
              color: isDeafened ? tokens.accentRed : tokens.textSecondary,
              cursor: 'pointer',
            }}
            onClick={onToggleDeafen}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {isDeafened ? Icons.headphonesOff : Icons.headphones}
          </button>
        </div>
        
        {/* Speaking indicator */}
        {isSpeaking && !isMuted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: tokens.accentGreen }}>{Icons.waveform}</span>
            <span style={{ fontSize: '9px', color: tokens.accentGreen, fontWeight: 500 }}>Speaking</span>
          </div>
        )}
      </div>
      
      {/* Divider */}
      <div style={{ width: '1px', height: '40px', background: tokens.borderSubtle }} />
      
      {/* Room info + Leave */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: tokens.textSecondary }}>Main Room</span>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px',
            background: `${tokens.accentRed}15`,
            border: `1px solid ${tokens.accentRed}50`,
            borderRadius: '4px',
            color: tokens.accentRed,
            cursor: 'pointer',
            fontSize: '10px',
          }}
          onClick={onJoinLeave}
        >
          {Icons.phoneOff}
          Leave
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// FOOTER: View Context Block
// ============================================================================
const mockViews = [
  { id: 'v1', name: 'Brain Volume', type: 'volume', color: tokens.accentBlue, position: { col: 0, row: 0 } },
  { id: 'v2', name: 'Sagittal Slice', type: 'slice', color: tokens.accentTeal, position: { col: 1, row: 0 } },
  { id: 'v3', name: 'Axial Slice', type: 'slice', color: tokens.accentAmber, position: { col: 0, row: 1 } },
  { id: 'v4', name: 'Cell Histogram', type: 'chart', color: tokens.accentPurple, position: { col: 1, row: 1 } },
];

const ViewContextBlock = ({ viewMode, onViewModeChange }) => {
  const [showViewHub, setShowViewHub] = useState(false);
  const [showSubsetPicker, setShowSubsetPicker] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [activeView, setActiveView] = useState(mockViews[0]);
  const [selectedSubsetIds, setSelectedSubsetIds] = useState(['v1', 'v2', 'v3']);
  
  const viewHubRef = useRef(null);
  const subsetRef = useRef(null);
  const linksRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewHubRef.current && !viewHubRef.current.contains(e.target)) setShowViewHub(false);
      if (subsetRef.current && !subsetRef.current.contains(e.target)) setShowSubsetPicker(false);
      if (linksRef.current && !linksRef.current.contains(e.target)) setShowLinks(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSubsetMode = viewMode === 'subset';
  const isIsolationMode = viewMode === 'isolation';
  const subsetViews = mockViews.filter(v => selectedSubsetIds.includes(v.id));
  const viewsForHub = isSubsetMode ? subsetViews : mockViews;

  const getModeColor = () => {
    if (isSubsetMode) return tokens.accentPurple;
    if (isIsolationMode) return tokens.accentAmber;
    return tokens.accentBlue;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', background: tokens.bgSecondary, borderRadius: '4px', padding: '2px', gap: '1px' }}>
          {[
            { id: 'normal', icon: Icons.grid, color: tokens.accentBlue },
            { id: 'isolation', icon: Icons.maximize, color: tokens.accentAmber },
            { id: 'subset', icon: Icons.layers, color: tokens.accentPurple },
          ].map(m => (
            <button
              key={m.id}
              style={{
                width: '22px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: viewMode === m.id ? `${m.color}22` : 'transparent',
                border: viewMode === m.id ? `1px solid ${m.color}` : '1px solid transparent',
                borderRadius: '3px', color: viewMode === m.id ? m.color : tokens.textMuted, cursor: 'pointer',
              }}
              onClick={() => onViewModeChange(m.id)}
            >
              {m.icon}
            </button>
          ))}
        </div>
        
        <div style={{ width: '1px', height: '20px', background: tokens.borderSubtle }} />
        
        {/* Active View */}
        <div ref={viewHubRef} style={{ position: 'relative' }}>
          <button style={{ ...styles.dropdownButton(showViewHub), minWidth: '100px' }} onClick={() => setShowViewHub(!showViewHub)}>
            <span style={styles.colorDot(activeView?.color, 7)} />
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 500, fontSize: '10px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeView?.name}</span>
            {showViewHub ? Icons.chevronUp : Icons.chevronDown}
          </button>
          
          <Popover isOpen={showViewHub}>
            <div style={{ width: '220px' }}>
              {isSubsetMode && (
                <div style={{ padding: '6px 10px', background: `${tokens.accentPurple}15`, borderBottom: `1px solid ${tokens.accentPurple}30`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
                  <span style={{ fontSize: '9px', color: tokens.accentPurple, fontWeight: 500 }}>{viewsForHub.length} subset views</span>
                </div>
              )}
              <div style={{ padding: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {viewsForHub.map(view => (
                  <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', background: activeView?.id === view.id ? `${getModeColor()}15` : 'transparent' }} onClick={() => { setActiveView(view); setShowViewHub(false); }}>
                    <span style={styles.colorDot(view.color)} />
                    <span style={{ flex: 1, fontSize: '11px', color: tokens.textPrimary }}>{view.name}</span>
                    {activeView?.id === view.id && <span style={{ color: getModeColor(), fontSize: '10px' }}>●</span>}
                  </div>
                ))}
              </div>
            </div>
          </Popover>
        </div>
        
        <div style={{ width: '1px', height: '20px', background: tokens.borderSubtle }} />
        
        {/* Links + Actions */}
        <div ref={linksRef} style={{ position: 'relative' }}>
          <button style={{ ...styles.iconButton(22), color: showLinks ? tokens.accentTeal : tokens.textSecondary, borderColor: showLinks ? tokens.accentTeal : tokens.borderSubtle }} onClick={() => setShowLinks(!showLinks)}>{Icons.link}</button>
          <Popover isOpen={showLinks}>
            <div style={{ width: '160px', padding: '8px' }}>
              <div style={{ fontSize: '10px', color: tokens.textMuted, marginBottom: '6px' }}>Links for {activeView?.name}</div>
              {[{ id: 'camera', icon: Icons.camera, label: 'Camera', color: tokens.accentTeal }, { id: 'filter', icon: Icons.filter, label: 'Filters', color: tokens.accentAmber }, { id: 'selection', icon: Icons.target, label: 'Selection', color: tokens.accentPurple }].map(lt => (
                <div key={lt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', borderRadius: '3px' }}>
                  <span style={{ color: tokens.textMuted }}>{lt.icon}</span>
                  <span style={{ fontSize: '10px', color: tokens.textSecondary, flex: 1 }}>{lt.label}</span>
                  <span style={{ fontSize: '9px', color: tokens.textMuted }}>—</span>
                </div>
              ))}
            </div>
          </Popover>
        </div>
        <button style={styles.iconButton(22)} title="Snapshot">{Icons.snapshot}</button>
        <button style={styles.iconButton(22)} title="Duplicate">{Icons.copy}</button>
      </div>
      
      {/* Row 2 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '22px' }}>
        <div style={{ width: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {viewMode === 'normal' && <span style={{ fontSize: '9px', color: tokens.accentBlue, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>{Icons.grid} All Views</span>}
          {viewMode === 'isolation' && <span style={{ fontSize: '9px', color: tokens.accentAmber, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>{Icons.crosshair} Focus</span>}
          {viewMode === 'subset' && <span style={{ fontSize: '9px', color: tokens.accentPurple, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>{Icons.layers} Compare</span>}
        </div>
        
        <div style={{ width: '1px', height: '16px', background: tokens.borderSubtle }} />
        
        {viewMode === 'normal' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontFamily: 'ui-monospace, monospace', color: tokens.textMuted, background: tokens.bgTertiary, padding: '2px 5px', borderRadius: '3px' }}>{activeView?.position.col},{activeView?.position.row}</span>
            <span style={{ fontSize: '9px', color: tokens.textMuted }}>{mockViews.length} views</span>
          </div>
        )}
        
        {viewMode === 'isolation' && (
          <span style={{ fontSize: '9px', color: tokens.textMuted }}>Press <kbd style={{ padding: '1px 4px', background: tokens.bgTertiary, borderRadius: '3px', fontSize: '8px' }}>Esc</kbd> to exit</span>
        )}
        
        {viewMode === 'subset' && (
          <div ref={subsetRef} style={{ position: 'relative' }}>
            <button style={{ ...styles.dropdownButton(showSubsetPicker, tokens.accentPurple), background: `${tokens.accentPurple}08`, padding: '3px 8px' }} onClick={() => setShowSubsetPicker(!showSubsetPicker)}>
              <span style={{ color: tokens.accentPurple, fontSize: '9px' }}>{Icons.layers}</span>
              <span style={{ color: tokens.textSecondary, fontSize: '9px' }}>{selectedSubsetIds.length} in subset</span>
              <div style={{ display: 'flex' }}>
                {subsetViews.slice(0, 4).map((v, i) => <span key={v.id} style={{ ...styles.colorDot(v.color, 5), marginLeft: i > 0 ? '-2px' : 0, border: `1px solid ${tokens.bgTertiary}` }} />)}
              </div>
              {showSubsetPicker ? Icons.chevronUp : Icons.chevronDown}
            </button>
            
            <Popover isOpen={showSubsetPicker}>
              <div style={{ width: '200px' }}>
                <div style={{ padding: '6px 10px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: `${tokens.accentPurple}10` }}>
                  <div style={{ fontSize: '10px', color: tokens.accentPurple, fontWeight: 500 }}>Select Subset Views</div>
                </div>
                <div style={{ padding: '6px' }}>
                  {mockViews.map(view => {
                    const isSelected = selectedSubsetIds.includes(view.id);
                    return (
                      <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 6px', borderRadius: '4px', cursor: 'pointer', background: isSelected ? `${tokens.accentPurple}15` : 'transparent' }} onClick={() => setSelectedSubsetIds(prev => isSelected ? prev.filter(id => id !== view.id) : [...prev, view.id])}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${isSelected ? tokens.accentPurple : tokens.borderSubtle}`, background: isSelected ? tokens.accentPurple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {isSelected && Icons.check}
                        </div>
                        <span style={styles.colorDot(view.color, 7)} />
                        <span style={{ fontSize: '10px', color: tokens.textPrimary }}>{view.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function SecondaryBarsV2() {
  const [flowDirection, setFlowDirection] = useState('row');
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const [viewMode, setViewMode] = useState('normal');
  const [canvasPosition, setCanvasPosition] = useState({ col: 2, row: 1 });
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isInChannel, setIsInChannel] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(true);

  const isAtOrigin = canvasPosition.col === 0 && canvasPosition.row === 0;

  return (
    <div style={{ minHeight: '100vh', background: tokens.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: tokens.textPrimary, padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Secondary Bars V2</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: tokens.textSecondary }}>
          Label bar above • Dimensions → header • Portals for popouts • Redesigned voice • Undo/Redo separate
        </p>
      </div>

      {/* SECONDARY HEADER */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ background: tokens.bgSecondary, borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
          {/* Label Bar - zones must match content zones exactly */}
          <LabelBar zones={[
            { minWidth: '180px', borderRight: true, label: { text: 'Workspace', color: tokens.accentPurple } },
            { flex: '1 1 auto', label: { text: 'Canvas Navigation', color: tokens.accentBlue } },
            { width: '100px', label: { text: 'Flow', color: tokens.accentTeal } },
            { width: '120px', label: { text: 'Size', color: tokens.accentGreen } },
            { minWidth: '180px', borderLeft: true, label: { text: 'Room', color: tokens.accentCyan } },
          ]} />
          
          {/* Content Row - zones match label bar */}
          <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
            <Zone minWidth="180px" borderRight align="left">
              <WorkspaceSelector workspace={{ name: 'Brain Study' }} />
            </Zone>
            
            <Zone flex="1 1 auto">
              <NavigationBlock
                position={canvasPosition}
                isAtOrigin={isAtOrigin}
                onNavigate={(dir) => setCanvasPosition(p => ({
                  col: Math.max(0, p.col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)),
                  row: Math.max(0, p.row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0))
                }))}
                onHome={() => setCanvasPosition({ col: 0, row: 0 })}
              />
            </Zone>
            
            <Zone width="100px">
              <FlowDirectionBlock direction={flowDirection} onChange={setFlowDirection} />
            </Zone>
            
            <Zone width="120px">
              <CanvasSizeBlock canvasSize="4×3" viewportSize="3×2" />
            </Zone>
            
            <Zone minWidth="180px" borderLeft align="right">
              <RoomSelector room={{ name: 'Main Room' }} memberCount={3} />
            </Zone>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ height: '160px', background: `linear-gradient(135deg, ${tokens.bgSecondary}, ${tokens.bgPrimary})`, border: `1px dashed ${tokens.borderSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.textMuted, fontSize: '14px' }}>
        Canvas Area
      </div>

      {/* SECONDARY FOOTER */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ background: tokens.bgSecondary, borderRadius: '0 0 8px 8px', overflow: 'visible' }}>
          {/* Label Bar - each zone matches content zone below */}
          <LabelBar zones={[
            { minWidth: '160px', borderRight: true, label: { text: 'Panels', color: tokens.accentTeal } },
            { width: '100px', label: { text: 'Editing', color: tokens.accentAmber } },
            { width: '70px', label: { text: 'History', color: tokens.textSecondary } },
            { flex: '1 1 auto', label: { text: 'View Context', color: tokens.accentPurple } },
            { minWidth: '200px', borderLeft: true, label: { text: 'Voice', color: tokens.accentBlue }, background: 'rgba(96, 165, 250, 0.03)' },
          ]} />
          
          {/* Content Row - zones match label bar exactly */}
          <div style={{ minHeight: '72px', display: 'flex', alignItems: 'center' }}>
            <Zone minWidth="160px" borderRight align="left" padding="0 10px">
              <div style={{ display: 'flex', gap: '4px' }}>
                <PopoutButton icon={Icons.map} label="Nav" active={navigatorOpen} accent={tokens.accentTeal} onClick={() => setNavigatorOpen(!navigatorOpen)} />
                <PopoutButton icon={Icons.stickyNote} label="Notes" active={scratchpadOpen} accent={tokens.accentAmber} onClick={() => setScratchpadOpen(!scratchpadOpen)} />
                <PopoutButton icon={Icons.sliders} label="Ops" active={operationsOpen} accent={tokens.accentBlue} onClick={() => setOperationsOpen(!operationsOpen)} />
              </div>
            </Zone>
            
            <Zone width="100px">
              <EditBlock
                isEditMode={isEditMode}
                activeTool={activeTool}
                onToolChange={(t) => { setActiveTool(t); if (!isEditMode) setIsEditMode(true); }}
                onToggleEditMode={() => setIsEditMode(!isEditMode)}
              />
            </Zone>
            
            <Zone width="70px">
              <UndoRedoBlock canUndo={true} canRedo={false} onUndo={() => {}} onRedo={() => {}} />
            </Zone>
            
            <Zone flex="1 1 auto">
              <ViewContextBlock viewMode={viewMode} onViewModeChange={setViewMode} />
            </Zone>
            
            <Zone minWidth="200px" borderLeft background="rgba(96, 165, 250, 0.06)">
              <VoiceZone
                isMuted={isMuted}
                isDeafened={isDeafened}
                isInChannel={isInChannel}
                isSpeaking={isSpeaking}
                onToggleMute={() => { setIsMuted(!isMuted); if (!isMuted) setIsSpeaking(false); }}
                onToggleDeafen={() => setIsDeafened(!isDeafened)}
                onJoinLeave={() => setIsInChannel(!isInChannel)}
              />
            </Zone>
          </div>
        </div>
      </div>

      {/* Mode Cards */}
      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { id: 'normal', label: 'Normal', color: tokens.accentBlue, desc: 'All views • Position info' },
          { id: 'isolation', label: 'Isolation', color: tokens.accentAmber, desc: 'Focus mode • Esc hint' },
          { id: 'subset', label: 'Subset', color: tokens.accentPurple, desc: 'Compare • Picker dropdown' },
        ].map(mode => (
          <div
            key={mode.id}
            style={{
              padding: '12px 16px', background: viewMode === mode.id ? `${mode.color}15` : tokens.bgSecondary,
              border: `1px solid ${viewMode === mode.id ? mode.color : tokens.borderSubtle}`,
              borderRadius: '8px', cursor: 'pointer',
            }}
            onClick={() => setViewMode(mode.id)}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: mode.color }}>{mode.label}</div>
            <div style={{ fontSize: '11px', color: tokens.textMuted }}>{mode.desc}</div>
          </div>
        ))}
      </div>
      
      {/* Controls */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: tokens.textSecondary, cursor: 'pointer' }}>
          <input type="checkbox" checked={isSpeaking} onChange={e => setIsSpeaking(e.target.checked)} disabled={isMuted || !isInChannel} />
          Simulate Speaking
        </label>
      </div>
    </div>
  );
}
