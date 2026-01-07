import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DESIGN TOKENS - Refined for Glassmorphism
// =============================================================================

const tokens = {
  // Canvas backgrounds - true neutral for data accuracy
  bgCanvas: '#030303',
  bgCanvasCell: '#050506',
  
  // UI Chrome - blue-tinted for immersion
  bgPrimary: '#060a12',
  bgSecondary: '#0c1220',
  bgTertiary: '#121a2e',
  bgElevated: '#18223c',
  
  // Glass surfaces
  glassSubtle: 'rgba(96, 165, 250, 0.03)',
  glassLight: 'rgba(96, 165, 250, 0.05)',
  glassMedium: 'rgba(96, 165, 250, 0.08)',
  glassStrong: 'rgba(96, 165, 250, 0.12)',
  glassPanel: 'rgba(8, 14, 24, 0.85)',
  glassPanelSolid: 'rgba(12, 18, 32, 0.95)',
  
  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(96, 165, 250, 0.3)',
  borderAccentStrong: 'rgba(96, 165, 250, 0.5)',
  
  // Text
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  
  // Accent colors
  accentBlue: '#60a5fa',
  accentCyan: '#22d3ee',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  accentPink: '#f472b6',
  accentTeal: '#2dd4bf',
  
  // Spacing & Radii
  gap: 6,
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
  radiusXl: 16,
  
  // Effects
  blurMedium: 'blur(12px)',
  blurStrong: 'blur(20px)',
  blurExtreme: 'blur(32px)',
};

// Gradient border helper - creates the toast-like effect
const gradientBorder = (accentColor = tokens.accentBlue, direction = 'to right') => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    padding: '1px',
    background: `linear-gradient(${direction}, ${accentColor}66, ${accentColor}22, transparent)`,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  }
});

// =============================================================================
// ICON COMPONENT
// =============================================================================

const Icon = ({ name, size = 16, style = {} }) => {
  const paths = {
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    hand: <><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></>,
    zoomIn: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>,
    rotateCw: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    penTool: <><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></>,
    crosshair: <><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></>,
    maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></>,
    sliders: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    ruler: <><path d="M21.4 8.6l-6-6a2 2 0 0 0-2.8 0l-10 10a2 2 0 0 0 0 2.8l6 6a2 2 0 0 0 2.8 0l10-10a2 2 0 0 0 0-2.8z"/><path d="M7 17l1-1"/><path d="M10 14l1-1"/><path d="M13 11l1-1"/><path d="M16 8l1-1"/></>,
    
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    focus: <><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></>,
    
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    
    folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    tool: <><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    messageCircle: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    share2: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    
    check: <polyline points="20 6 9 17 4 12"/>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    fitToScreen: <><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><rect x="7" y="7" width="10" height="10" rx="1"/></>,
    refreshCw: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// =============================================================================
// GLASS PANEL COMPONENT - Reusable toast-like glass effect
// =============================================================================

const GlassPanel = ({ 
  children, 
  accentColor = tokens.accentBlue,
  accentPosition = 'left', // 'left', 'top', 'right', 'bottom', 'all', 'none'
  intensity = 'medium', // 'subtle', 'medium', 'strong'
  style = {},
  className = '',
  ...props 
}) => {
  const intensityMap = {
    subtle: { bg: tokens.glassSubtle, blur: tokens.blurMedium },
    medium: { bg: tokens.glassPanel, blur: tokens.blurStrong },
    strong: { bg: tokens.glassPanelSolid, blur: tokens.blurExtreme },
  };
  
  const { bg, blur } = intensityMap[intensity];
  
  // Build gradient border based on accent position
  const getGradientBorder = () => {
    if (accentPosition === 'none') return {};
    
    const accentStrong = `${accentColor}66`;
    const accentMid = `${accentColor}33`;
    const accentFade = `${accentColor}11`;
    const transparent = 'transparent';
    
    const gradients = {
      left: `linear-gradient(to right, ${accentStrong}, ${accentMid}, ${accentFade}, ${transparent})`,
      top: `linear-gradient(to bottom, ${accentStrong}, ${accentMid}, ${accentFade}, ${transparent})`,
      right: `linear-gradient(to left, ${accentStrong}, ${accentMid}, ${accentFade}, ${transparent})`,
      bottom: `linear-gradient(to top, ${accentStrong}, ${accentMid}, ${accentFade}, ${transparent})`,
      all: `linear-gradient(135deg, ${accentStrong}, ${accentMid}, ${accentFade}, ${accentMid}, ${accentStrong})`,
    };
    
    return { background: gradients[accentPosition] };
  };
  
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: bg,
        backdropFilter: `${blur} saturate(180%)`,
        WebkitBackdropFilter: `${blur} saturate(180%)`,
        borderRadius: tokens.radiusMd,
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {/* Gradient border overlay */}
      {accentPosition !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            ...getGradientBorder(),
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Subtle inner highlight */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// ICON BUTTON COMPONENT
// =============================================================================

const IconButton = ({ 
  icon, 
  title, 
  onClick, 
  active, 
  disabled, 
  size = 16,
  variant = 'ghost', // 'ghost', 'subtle', 'filled'
  accentColor = tokens.accentBlue,
  style = {} 
}) => {
  const [hovered, setHovered] = useState(false);
  
  const getBackground = () => {
    if (active) return `${accentColor}22`;
    if (hovered && !disabled) return 'rgba(255, 255, 255, 0.06)';
    return 'transparent';
  };
  
  const getBorder = () => {
    if (active) return `1px solid ${accentColor}44`;
    return '1px solid transparent';
  };
  
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size + 12,
        height: size + 12,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getBackground(),
        border: getBorder(),
        borderRadius: tokens.radiusSm,
        color: active ? accentColor : (hovered ? tokens.textSecondary : tokens.textTertiary),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name={icon} size={size} />
    </button>
  );
};

// =============================================================================
// INSTANCE HEADER - Glass treatment with gradient accent
// =============================================================================

const InstanceHeader = ({ 
  name, 
  color = tokens.accentGreen,
  isActive,
  collaboratorCount = 0,
  onClose,
  onFocus,
  onMore,
}) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 10px',
        background: hovered || isActive
          ? 'linear-gradient(to bottom, rgba(8, 14, 24, 0.95), rgba(8, 14, 24, 0.85))'
          : 'linear-gradient(to bottom, rgba(8, 14, 24, 0.8), rgba(8, 14, 24, 0.4))',
        backdropFilter: tokens.blurMedium,
        WebkitBackdropFilter: tokens.blurMedium,
        borderBottom: `1px solid ${isActive ? `${color}33` : tokens.borderSubtle}`,
        transition: 'all 0.2s ease',
        zIndex: 10,
      }}
    >
      {/* Left: Status + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* Status dot with glow */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${color}66`,
            }}
          />
          {collaboratorCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -6,
                fontSize: 9,
                fontWeight: 600,
                color: tokens.textPrimary,
              }}
            >
              {collaboratorCount}
            </div>
          )}
        </div>
        
        {/* Name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: tokens.textSecondary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </span>
      </div>
      
      {/* Right: Actions (visible on hover or active) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          opacity: hovered || isActive ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <IconButton icon="more" size={14} title="More options" onClick={onMore} />
        <IconButton icon="focus" size={14} title="Focus view" onClick={onFocus} />
        <IconButton icon="x" size={14} title="Close" onClick={onClose} />
      </div>
    </div>
  );
};

// =============================================================================
// INSTANCE VIEWPORT - The main view container with glass treatment
// =============================================================================

const InstanceViewport = ({
  viewConfig,
  isActive,
  cellWidth,
  onActivate,
  onClose,
  onFocus,
}) => {
  const [hovered, setHovered] = useState(false);
  const showTools = isActive && cellWidth >= 200;
  
  // Gradient glow for active state (softer than solid border)
  const getActiveGlow = () => {
    if (!isActive) return {};
    const color = viewConfig.color;
    return {
      boxShadow: `
        0 0 0 1px ${color}44,
        0 0 20px ${color}22,
        0 0 40px ${color}11,
        inset 0 0 60px ${color}08
      `,
    };
  };
  
  return (
    <div
      onMouseDown={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: tokens.bgCanvasCell,
        borderRadius: tokens.radiusMd,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${isActive ? `${viewConfig.color}33` : hovered ? tokens.borderDefault : tokens.borderSubtle}`,
        transition: 'all 0.2s ease',
        ...getActiveGlow(),
      }}
    >
      {/* Header */}
      <InstanceHeader
        name={viewConfig.name}
        color={viewConfig.color}
        isActive={isActive}
        collaboratorCount={viewConfig.collaborators || 0}
        onClose={onClose}
        onFocus={onFocus}
        onMore={() => console.log('More')}
      />
      
      {/* Content Area - Mock 3D render */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(ellipse at center, ${viewConfig.color}08 0%, transparent 70%)`,
        }}
      >
        {/* Mock 3D visualization */}
        <div
          style={{
            width: '60%',
            height: '60%',
            background: `linear-gradient(135deg, ${viewConfig.color}44, ${viewConfig.color}22)`,
            borderRadius: tokens.radiusLg,
            border: `1px solid ${viewConfig.color}33`,
            boxShadow: `0 8px 32px ${viewConfig.color}22`,
          }}
        />
      </div>
      
      {/* Grid position indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontSize: 10,
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          color: tokens.textMuted,
          padding: '2px 6px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: tokens.radiusSm,
        }}
      >
        [{viewConfig.row}, {viewConfig.col}]
      </div>
    </div>
  );
};

// =============================================================================
// EMPTY CELL - Refined with subtle glass treatment
// =============================================================================

const EmptyCell = ({ row, col, onAdd }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onAdd}
      style={{
        position: 'relative',
        background: hovered ? tokens.glassSubtle : 'transparent',
        border: `1px dashed ${hovered ? tokens.borderDefault : tokens.borderSubtle}`,
        borderRadius: tokens.radiusMd,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Plus button - subtle until hovered */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
          border: `1px solid ${hovered ? tokens.borderDefault : tokens.borderSubtle}`,
          color: hovered ? tokens.textSecondary : tokens.textMuted,
          transition: 'all 0.2s ease',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        <Icon name="plus" size={18} />
      </div>
      
      {/* Position indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          fontSize: 10,
          fontFamily: 'SF Mono, Monaco, Consolas, monospace',
          color: tokens.textMuted,
          opacity: hovered ? 0.6 : 0.3,
          transition: 'opacity 0.2s ease',
        }}
      >
        [{row}, {col}]
      </div>
    </div>
  );
};

// =============================================================================
// ACTIVITY BAR - With instance tools when active
// =============================================================================

const ActivityBar = ({ 
  position = 'left',
  activeTab, 
  onTabChange,
  activeViewTools = null, // When a view is active, show its tools
}) => {
  const isLeft = position === 'left';
  
  const topTabs = isLeft 
    ? [
        { id: 'files', icon: 'folder', label: 'Files' },
        { id: 'views', icon: 'layers', label: 'Views' },
        { id: 'tools', icon: 'tool', label: 'Instance Tools' },
      ]
    : [
        { id: 'collab', icon: 'users', label: 'Collaboration' },
        { id: 'chat', icon: 'messageCircle', label: 'Chat' },
        { id: 'share', icon: 'share2', label: 'Share' },
      ];
      
  const bottomTabs = isLeft
    ? [{ id: 'settings', icon: 'settings', label: 'Settings' }]
    : [];
  
  return (
    <div
      style={{
        width: 44,
        background: tokens.bgPrimary,
        borderRight: isLeft ? `1px solid ${tokens.borderSubtle}` : 'none',
        borderLeft: !isLeft ? `1px solid ${tokens.borderSubtle}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {/* Top tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {topTabs.map((tab) => (
          <IconButton
            key={tab.id}
            icon={tab.icon}
            title={tab.label}
            size={20}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            accentColor={tokens.accentBlue}
          />
        ))}
      </div>
      
      {/* Instance tools section (when tools tab active and view selected) */}
      {isLeft && activeTab === 'tools' && activeViewTools && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${tokens.borderSubtle}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { id: 'camera', icon: 'camera', label: 'Snapshot' },
              { id: 'pan', icon: 'hand', label: 'Pan' },
              { id: 'zoom', icon: 'zoomIn', label: 'Zoom' },
              { id: 'rotate', icon: 'rotateCw', label: 'Rotate' },
              { id: 'annotate', icon: 'penTool', label: 'Annotate' },
              { id: 'measure', icon: 'ruler', label: 'Measure' },
            ].map((tool) => (
              <IconButton
                key={tool.id}
                icon={tool.icon}
                title={tool.label}
                size={18}
                active={activeViewTools.activeTool === tool.id}
                onClick={() => activeViewTools.onToolChange(tool.id)}
                accentColor={tokens.accentCyan}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      
      {/* Bottom tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bottomTabs.map((tab) => (
          <IconButton
            key={tab.id}
            icon={tab.icon}
            title={tab.label}
            size={20}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS FOOTER - Unified glass treatment
// =============================================================================

const CanvasFooter = ({
  activeView,
  views,
  viewMode,
  onViewModeChange,
  viewportPosition,
  onNavigate,
  onGoHome,
}) => {
  return (
    <GlassPanel
      accentPosition="top"
      accentColor={tokens.accentBlue}
      intensity="medium"
      style={{
        margin: `0 ${tokens.gap}px ${tokens.gap}px ${tokens.gap}px`,
        borderRadius: tokens.radiusMd,
      }}
    >
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        {/* Left: Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Directional nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton icon="home" size={16} title="Go to home position" onClick={onGoHome} />
            <div style={{ width: 1, height: 16, background: tokens.borderSubtle, margin: '0 4px' }} />
            <IconButton icon="arrowLeft" size={14} title="Pan left" onClick={() => onNavigate('left')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <IconButton icon="arrowUp" size={14} title="Pan up" onClick={() => onNavigate('up')} style={{ width: 22, height: 14 }} />
              <IconButton icon="arrowDown" size={14} title="Pan down" onClick={() => onNavigate('down')} style={{ width: 22, height: 14 }} />
            </div>
            <IconButton icon="arrowRight" size={14} title="Pan right" onClick={() => onNavigate('right')} />
          </div>
          
          {/* Position indicator */}
          <div
            style={{
              fontSize: 11,
              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
              color: tokens.textMuted,
              padding: '4px 8px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: tokens.radiusSm,
            }}
          >
            {viewportPosition.row},{viewportPosition.col}
          </div>
          
          {/* View mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
            {['grid', 'focus'].map((mode) => (
              <IconButton
                key={mode}
                icon={mode === 'grid' ? 'grid' : 'maximize'}
                size={16}
                title={mode === 'grid' ? 'Grid view' : 'Focus view'}
                active={viewMode === mode}
                onClick={() => onViewModeChange(mode)}
              />
            ))}
          </div>
        </div>
        
        {/* Center: Active View Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeView ? (
            <>
              {/* View indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: activeView.color,
                    boxShadow: `0 0 8px ${activeView.color}66`,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 500, color: tokens.textSecondary }}>
                  {activeView.name}
                </span>
              </div>
              
              {/* Quick actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton icon="link" size={14} title="Manage links" />
                <IconButton icon="camera" size={14} title="Snapshot" />
                <IconButton icon="eye" size={14} title="Visibility" />
                <IconButton icon="settings" size={14} title="View settings" />
              </div>
            </>
          ) : (
            <span style={{ fontSize: 12, color: tokens.textMuted }}>
              No view selected
            </span>
          )}
        </div>
        
        {/* Right: Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: tokens.textMuted }}>
            {views.filter(v => v.onCanvas).length} views on canvas
          </span>
          <div style={{ width: 1, height: 16, background: tokens.borderSubtle }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.accentGreen }} />
            <span style={{ fontSize: 11, color: tokens.textMuted }}>Synced</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

// =============================================================================
// FLOATING ZOOM CONTROLS - Glass treatment
// =============================================================================

const ZoomControls = ({ zoom, onZoomChange, onFit, onReset, onCenter }) => {
  return (
    <GlassPanel
      accentPosition="none"
      intensity="strong"
      style={{
        position: 'absolute',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: tokens.radiusLg,
        border: `1px solid ${tokens.borderDefault}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px' }}>
        <IconButton icon="minus" size={14} title="Zoom out" onClick={() => onZoomChange(zoom - 10)} />
        
        <div
          style={{
            minWidth: 48,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: tokens.textSecondary,
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: tokens.radiusSm,
          }}
        >
          {zoom}%
        </div>
        
        <IconButton icon="plus" size={14} title="Zoom in" onClick={() => onZoomChange(zoom + 10)} />
        
        <div style={{ width: 1, height: 16, background: tokens.borderSubtle, margin: '0 4px' }} />
        
        <IconButton icon="fitToScreen" size={14} title="Fit to view" onClick={onFit} />
        <IconButton icon="refreshCw" size={14} title="Reset" onClick={onReset} />
        <IconButton icon="target" size={14} title="Center" onClick={onCenter} />
      </div>
    </GlassPanel>
  );
};

// =============================================================================
// MAIN APPLICATION
// =============================================================================

export default function CanvasGlassAesthetic() {
  // State
  const [views, setViews] = useState([
    { id: 'v1', name: 'View of Bones.vtp', color: tokens.accentGreen, row: 0, col: 0, onCanvas: true, collaborators: 2 },
    { id: 'v2', name: 'View of Bones.vtp', color: tokens.accentGreen, row: 0, col: 1, onCanvas: true, collaborators: 0 },
    { id: 'v3', name: 'View of diskout.vtp (copy)', color: tokens.accentBlue, row: 0, col: 2, onCanvas: true, collaborators: 0 },
    { id: 'v4', name: 'View of diskout.vtp (copy)', color: tokens.accentGreen, row: 1, col: 0, onCanvas: true, collaborators: 0 },
  ]);
  
  const [activeViewId, setActiveViewId] = useState('v2');
  const [viewMode, setViewMode] = useState('grid');
  const [viewportSize] = useState({ rows: 3, cols: 3 });
  const [viewportPosition, setViewportPosition] = useState({ row: 0, col: 0 });
  const [leftTab, setLeftTab] = useState('views');
  const [rightTab, setRightTab] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState('pan');
  
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Computed values
  const activeView = views.find(v => v.id === activeViewId);
  const gap = tokens.gap;
  const cellWidth = (containerSize.width - gap * (viewportSize.cols + 1)) / viewportSize.cols;
  const cellHeight = (containerSize.height - gap * (viewportSize.rows + 1)) / viewportSize.rows;
  
  // Handlers
  const getViewAt = (row, col) => {
    const canvasRow = viewportPosition.row + row;
    const canvasCol = viewportPosition.col + col;
    return views.find(v => v.onCanvas && v.row === canvasRow && v.col === canvasCol);
  };
  
  const handleNavigate = (direction) => {
    setViewportPosition(prev => {
      switch (direction) {
        case 'up': return { ...prev, row: Math.max(0, prev.row - 1) };
        case 'down': return { ...prev, row: prev.row + 1 };
        case 'left': return { ...prev, col: Math.max(0, prev.col - 1) };
        case 'right': return { ...prev, col: prev.col + 1 };
        default: return prev;
      }
    });
  };
  
  const handleCloseView = (viewId) => {
    setViews(prev => prev.map(v => v.id === viewId ? { ...v, onCanvas: false } : v));
    if (activeViewId === viewId) setActiveViewId(null);
  };
  
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: tokens.bgPrimary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: tokens.textPrimary,
        overflow: 'hidden',
      }}
    >
      {/* Header placeholder */}
      <div
        style={{
          height: 40,
          background: tokens.bgPrimary,
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: tokens.textSecondary }}>
          Canvas Glass Aesthetic Prototype
        </span>
      </div>
      
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Activity Bar */}
        <ActivityBar
          position="left"
          activeTab={leftTab}
          onTabChange={setLeftTab}
          activeViewTools={activeView ? { activeTool, onToolChange: setActiveTool } : null}
        />
        
        {/* Canvas Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Canvas grid */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              position: 'relative',
              background: tokens.bgCanvas,
              overflow: 'hidden',
            }}
          >
            {/* Grid of cells */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`,
                gap,
                padding: gap,
                width: '100%',
                height: '100%',
              }}
            >
              {Array.from({ length: viewportSize.rows * viewportSize.cols }).map((_, i) => {
                const row = Math.floor(i / viewportSize.cols);
                const col = i % viewportSize.cols;
                const viewAtCell = getViewAt(row, col);
                
                if (!viewAtCell) {
                  return (
                    <EmptyCell
                      key={`${row}-${col}`}
                      row={viewportPosition.row + row}
                      col={viewportPosition.col + col}
                      onAdd={() => console.log('Add at', row, col)}
                    />
                  );
                }
                
                return (
                  <InstanceViewport
                    key={viewAtCell.id}
                    viewConfig={viewAtCell}
                    cellWidth={cellWidth}
                    isActive={activeViewId === viewAtCell.id}
                    onActivate={() => setActiveViewId(viewAtCell.id)}
                    onClose={() => handleCloseView(viewAtCell.id)}
                    onFocus={() => setViewMode('focus')}
                  />
                );
              })}
            </div>
            
            {/* Zoom controls (floating, appears when active view) */}
            {activeView && (
              <ZoomControls
                zoom={zoom}
                onZoomChange={setZoom}
                onFit={() => setZoom(100)}
                onReset={() => setZoom(100)}
                onCenter={() => console.log('Center')}
              />
            )}
          </div>
          
          {/* Canvas Footer */}
          <CanvasFooter
            activeView={activeView}
            views={views}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            viewportPosition={viewportPosition}
            onNavigate={handleNavigate}
            onGoHome={() => setViewportPosition({ row: 0, col: 0 })}
          />
        </div>
        
        {/* Right Activity Bar */}
        <ActivityBar
          position="right"
          activeTab={rightTab}
          onTabChange={setRightTab}
        />
      </div>
      
      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        button:hover:not(:disabled) { filter: brightness(1.1); }
        button:active:not(:disabled) { transform: scale(0.97); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${tokens.borderMedium}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
