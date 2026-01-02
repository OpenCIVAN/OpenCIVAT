import React, { useState, useRef, useEffect } from 'react';
import { 
  Wrench, MoreHorizontal, Maximize2, X, Trash2, 
  Box, BarChart3, Copy, Camera, Bookmark, Link2, 
  Glasses, Settings, Check, Loader2, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, Pin, PinOff,
  ZoomIn, ZoomOut, RotateCw, Hand, Home, Scan,
  PenTool, Ruler, Palette, Grid3X3, Scissors,
  Undo2, Redo2, MoreVertical, Eye, Layers
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  bgHover: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderDefault: 'rgba(255,255,255,0.1)',
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textMuted: '#606070',
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  accentTeal: '#2dd4bf',
  accentPink: '#f472b6',
  accentRed: '#f87171',
};

const VIEW_COLORS = [
  { hex: '#60a5fa', name: 'Blue' },
  { hex: '#4ade80', name: 'Green' },
  { hex: '#f472b6', name: 'Pink' },
  { hex: '#fbbf24', name: 'Amber' },
  { hex: '#2dd4bf', name: 'Teal' },
  { hex: '#a78bfa', name: 'Purple' },
];

// =============================================================================
// BREAKPOINTS
// =============================================================================
const getBreakpoint = (width) => {
  if (width >= 450) return { label: 'Full', headerMode: 'full', toolbarMode: 'full', navMode: 'full' };
  if (width >= 380) return { label: 'Large', headerMode: 'full', toolbarMode: 'compact', navMode: 'full' };
  if (width >= 300) return { label: 'Medium', headerMode: 'medium', toolbarMode: 'compact', navMode: 'compact' };
  if (width >= 220) return { label: 'Small', headerMode: 'small', toolbarMode: 'mini', navMode: 'mini' };
  if (width >= 160) return { label: 'Tiny', headerMode: 'tiny', toolbarMode: 'none', navMode: 'icon' };
  return { label: 'Micro', headerMode: 'micro', toolbarMode: 'none', navMode: 'icon' };
};

// =============================================================================
// MOCK DATA
// =============================================================================
const mockView = { 
  id: 'v1', 
  name: 'Brain MRI - Axial View', 
  datasetName: 'brain_001.nii', 
  color: 0, 
  type: 'vtk' 
};

// =============================================================================
// SHARED COMPONENTS
// =============================================================================
const ColorDot = ({ color, isLoading = false, size = 6 }) => {
  if (isLoading) {
    return <Loader2 size={size + 2} style={{ color, animation: 'spin 1s linear infinite' }} />;
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
};

const IconButton = ({ icon: Icon, onClick, title, active, size = 24, iconSize = 12, disabled, style = {} }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      border: 'none',
      borderRadius: 4,
      color: disabled ? tokens.textMuted : (active ? tokens.textPrimary : tokens.textMuted),
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.1s ease',
      ...style,
    }}
  >
    <Icon size={iconSize} />
  </button>
);

// =============================================================================
// HEADER MENU
// =============================================================================
const HeaderMenu = ({ isOpen, onClose, anchorRef, onAction, headerMode }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isOpen, anchorRef]);
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);
  
  if (!isOpen) return null;
  
  const sections = [
    ...(headerMode !== 'full' ? [{
      id: 'tools',
      items: [
        ...(headerMode === 'micro' || headerMode === 'tiny' || headerMode === 'small' ? [
          { id: 'instanceTools', icon: Wrench, label: 'Instance Tools', shortcut: 'T' },
        ] : []),
        ...(headerMode !== 'full' ? [
          { id: 'expand', icon: Maximize2, label: 'Expand / Fullscreen', shortcut: 'F' },
          { id: 'vr', icon: Glasses, label: 'Enter VR Mode', shortcut: 'V' },
        ] : []),
      ],
    }] : []),
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'viewOptions', icon: Settings, label: 'View Options...', shortcut: 'O' },
        { id: 'syncOptions', icon: Link2, label: 'View Syncing...', shortcut: 'L' },
        { id: 'duplicate', icon: Copy, label: 'Duplicate View', shortcut: 'D' },
        { id: 'bookmark', icon: Bookmark, label: 'Save as Bookmark', shortcut: 'B' },
        { id: 'snapshot', icon: Camera, label: 'Capture Snapshot...', shortcut: 'S' },
      ],
    },
    {
      id: 'danger',
      items: [
        { id: 'close', icon: X, label: 'Remove from Canvas' },
        { id: 'delete', icon: Trash2, label: 'Delete View', danger: true },
      ],
    },
  ];
  
  const MenuItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => { onAction(item.id); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: 6,
          color: item.danger ? tokens.accentRed : tokens.textSecondary,
          fontSize: 12, cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = item.danger ? 'rgba(248,113,113,0.1)' : tokens.bgHover}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Icon size={14} style={{ opacity: 0.8 }} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.shortcut && (
          <span style={{ fontSize: 10, color: tokens.textMuted, background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 3, fontFamily: 'monospace' }}>
            {item.shortcut}
          </span>
        )}
      </button>
    );
  };
  
  const Divider = () => <div style={{ height: 1, background: tokens.borderSubtle, margin: '4px 8px' }} />;
  
  return (
    <div ref={menuRef} style={{
      position: 'fixed', top: position.top, right: Math.max(8, position.right), zIndex: 10000,
      minWidth: 220, padding: 4,
      background: 'rgba(20,20,28,0.98)', backdropFilter: 'blur(16px)',
      border: `1px solid ${tokens.borderDefault}`, borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {sections.map((section, si) => (
        <div key={section.id}>
          {si > 0 && <Divider />}
          {section.label && (
            <div style={{ padding: '6px 12px 2px', fontSize: 9, fontWeight: 600, color: tokens.textMuted, textTransform: 'uppercase' }}>
              {section.label}
            </div>
          )}
          {section.items.map(item => <MenuItem key={item.id} item={item} />)}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// INSTANCE HEADER
// =============================================================================
const InstanceHeader = ({ view, headerMode, isActive, isLoading, onAction }) => {
  const [showMenu, setShowMenu] = useState(false);
  const moreButtonRef = useRef(null);
  const color = VIEW_COLORS[view.color];
  
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15,15,20,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: `2px solid ${isActive ? color.hex : tokens.borderSubtle}`,
    transition: 'border-color 0.15s ease',
  };
  
  const configs = {
    micro: { height: 24, padding: '0 4px', gap: 4, dotSize: 4, fontSize: 9, btnSize: 18, iconSize: 10 },
    tiny: { height: 26, padding: '0 4px', gap: 4, dotSize: 5, fontSize: 10, btnSize: 20, iconSize: 11 },
    small: { height: 28, padding: '0 6px', gap: 4, dotSize: 6, fontSize: 11, btnSize: 24, iconSize: 12 },
    medium: { height: 32, padding: '0 6px', gap: 6, dotSize: 6, fontSize: 12, btnSize: 24, iconSize: 12 },
    full: { height: 32, padding: '0 6px', gap: 6, dotSize: 6, fontSize: 12, btnSize: 24, iconSize: 12 },
  };
  
  const cfg = configs[headerMode] || configs.full;
  const showWrench = headerMode === 'medium' || headerMode === 'full';
  const showExpand = headerMode === 'medium' || headerMode === 'full';
  const showVR = headerMode === 'full';
  
  return (
    <div style={{ ...baseStyle, height: cfg.height, padding: cfg.padding, gap: cfg.gap }}>
      {showWrench && <IconButton icon={Wrench} onClick={() => onAction('tools')} title="Instance Tools (T)" size={cfg.btnSize} iconSize={cfg.iconSize} />}
      <ColorDot color={color.hex} isLoading={isLoading} size={cfg.dotSize} />
      <span style={{
        fontSize: cfg.fontSize, fontWeight: isActive ? 500 : 400,
        color: isActive ? tokens.textPrimary : tokens.textSecondary,
        flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {view.name}
      </span>
      <div ref={moreButtonRef}>
        <IconButton 
          icon={headerMode === 'micro' ? MoreVertical : MoreHorizontal} 
          onClick={() => setShowMenu(!showMenu)} 
          title="Menu" 
          size={cfg.btnSize} 
          iconSize={headerMode === 'micro' ? 10 : 14} 
          active={showMenu} 
        />
      </div>
      {showExpand && <IconButton icon={Maximize2} onClick={() => onAction('expand')} title="Expand (F)" size={cfg.btnSize} iconSize={cfg.iconSize} />}
      {showVR && <IconButton icon={Glasses} onClick={() => onAction('vr')} title="Enter VR (V)" size={cfg.btnSize} iconSize={cfg.iconSize} />}
      <IconButton icon={X} onClick={() => onAction('close')} title="Close" size={cfg.btnSize} iconSize={cfg.iconSize} />
      <HeaderMenu isOpen={showMenu} onClose={() => setShowMenu(false)} anchorRef={moreButtonRef} onAction={onAction} headerMode={headerMode} />
    </div>
  );
};

// =============================================================================
// INSTANCE TOOLBAR (Type-specific only)
// =============================================================================
const InstanceToolbar = ({ visible, pinned, onTogglePin, toolbarMode, color }) => {
  const [activeTool, setActiveTool] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  
  if (toolbarMode === 'none') return null;
  
  const tools = toolbarMode === 'mini' ? [
    { id: 'representation', icon: Box, label: 'Representation', hasMenu: true },
    { id: 'annotate', icon: PenTool, label: 'Annotate' },
    { id: 'more', icon: MoreHorizontal, label: 'More in Instance Tools', tooltip: true },
  ] : toolbarMode === 'compact' ? [
    { id: 'representation', icon: Box, label: 'Representation', hasMenu: true },
    { id: 'colormap', icon: Palette, label: 'Color Map', hasMenu: true },
    { type: 'separator' },
    { id: 'annotate', icon: PenTool, label: 'Annotate' },
    { id: 'measure', icon: Ruler, label: 'Measure' },
  ] : [
    { id: 'representation', icon: Box, label: 'Representation', hasMenu: true },
    { id: 'colormap', icon: Palette, label: 'Color Map', hasMenu: true },
    { type: 'separator' },
    { id: 'annotate', icon: PenTool, label: 'Annotate', shortcut: 'A' },
    { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M' },
    { id: 'clip', icon: Scissors, label: 'Clip Plane' },
    { type: 'separator' },
    { id: 'undo', icon: Undo2, label: 'Undo' },
    { id: 'redo', icon: Redo2, label: 'Redo' },
  ];
  
  return (
    <div 
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: toolbarMode === 'mini' ? '4px 6px' : '5px 8px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 100%)',
        backdropFilter: 'blur(12px)', borderRadius: 8,
        border: `1px solid ${pinned ? color + '40' : tokens.borderSubtle}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'all 0.15s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {tools.map((tool, i) => {
        if (tool.type === 'separator') {
          return <div key={i} style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />;
        }
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const btnSize = toolbarMode === 'mini' ? 24 : 26;
        
        return (
          <button
            key={tool.id}
            onClick={() => !tool.hasMenu && !tool.tooltip && setActiveTool(isActive ? null : tool.id)}
            title={tool.label}
            style={{
              width: btnSize, height: btnSize,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              border: 'none', borderRadius: 5,
              color: tool.tooltip ? tokens.textMuted : (isActive ? tokens.textPrimary : tokens.textSecondary),
              cursor: 'pointer', opacity: tool.tooltip ? 0.6 : 1,
            }}
          >
            <Icon size={toolbarMode === 'mini' ? 12 : 14} />
            {tool.hasMenu && <ChevronDown size={8} style={{ marginLeft: -2 }} />}
          </button>
        );
      })}
      
      {toolbarMode !== 'mini' && (
        <>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
          <button
            onClick={onTogglePin}
            title={pinned ? 'Unpin toolbar' : 'Pin toolbar'}
            style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: pinned ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', borderRadius: 5,
              color: pinned ? tokens.textPrimary : tokens.textMuted, cursor: 'pointer',
            }}
          >
            {pinned ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
        </>
      )}
    </div>
  );
};

// =============================================================================
// ZOOM INPUT WITH DROPDOWN SLIDER
// =============================================================================
const ZoomInput = ({ value, onChange, color }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef(null);
  const sliderRef = useRef(null);
  
  const presets = [25, 50, 75, 100, 150, 200, 300, 400];
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);
  
  useEffect(() => {
    if (!showSlider) return;
    const handleClickOutside = (e) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target)) {
        setShowSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSlider]);
  
  const handleSubmit = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= 10000) {
      onChange(num);
    } else {
      setInputValue(value.toString());
    }
    setIsEditing(false);
  };
  
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') {
            setInputValue(value.toString());
            setIsEditing(false);
          }
        }}
        style={{
          width: 48, padding: '3px 4px', fontSize: 11, fontFamily: 'monospace',
          color: tokens.textPrimary, background: 'rgba(0,0,0,0.5)',
          border: `1px solid ${color}60`, borderRadius: 4, textAlign: 'center',
          outline: 'none',
        }}
      />
    );
  }
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowSlider(!showSlider)}
        onDoubleClick={() => setIsEditing(true)}
        title="Click for presets, double-click to edit"
        style={{
          padding: '3px 8px', fontSize: 11, fontFamily: 'monospace',
          color: tokens.textSecondary, background: 'rgba(0,0,0,0.3)',
          border: 'none', borderRadius: 4, cursor: 'pointer',
          minWidth: 48, textAlign: 'center',
        }}
      >
        {value}%
      </button>
      
      {showSlider && (
        <div 
          ref={sliderRef}
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: 8, padding: 8,
            background: 'rgba(20,20,28,0.98)', backdropFilter: 'blur(16px)',
            border: `1px solid ${tokens.borderDefault}`, borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 160,
          }}
        >
          {/* Slider */}
          <div style={{ marginBottom: 8 }}>
            <input
              type="range"
              min="10"
              max="500"
              value={Math.min(500, value)}
              onChange={(e) => onChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: color }}
            />
          </div>
          
          {/* Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => { onChange(preset); setShowSlider(false); }}
                style={{
                  padding: '4px 8px', fontSize: 10, fontFamily: 'monospace',
                  background: value === preset ? `${color}30` : 'rgba(255,255,255,0.06)',
                  border: value === preset ? `1px solid ${color}50` : '1px solid transparent',
                  borderRadius: 4, color: value === preset ? color : tokens.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {preset}%
              </button>
            ))}
          </div>
          
          {/* Note about absolute zoom */}
          <div style={{ 
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${tokens.borderSubtle}`,
            fontSize: 9, color: tokens.textMuted, lineHeight: 1.4,
          }}>
            Zoom is relative to original dataset size
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NAVIGATION NOTCH - Carved out feel with instance color
// =============================================================================
const NavigationNotch = ({ 
  visible, 
  expanded, 
  onToggleExpand,
  navMode, 
  position = 'bottom',
  color,
  zoomLevel = 100,
  onZoomChange,
  is3D = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeMode, setActiveMode] = useState('rotate');
  
  if (navMode === 'none') return null;
  
  const isHorizontal = position === 'bottom';
  const isLeft = position === 'left';
  const isRight = position === 'right';
  
  // Carved-out notch styling with instance color accent
  const getNotchStyle = () => {
    const base = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      flexDirection: isHorizontal ? 'row' : 'column',
      // Carved out feel - darker, inset look
      background: `linear-gradient(${isHorizontal ? '0deg' : isLeft ? '90deg' : '-90deg'}, 
        rgba(8,8,12,0.95) 0%, 
        rgba(12,12,18,0.9) 100%)`,
      backdropFilter: 'blur(12px)',
      transition: 'all 0.2s ease',
      zIndex: 5,
    };
    
    // Instance color accent on exposed edges
    const colorBorder = `1px solid ${color}40`;
    const subtleBorder = `1px solid ${tokens.borderSubtle}`;
    
    if (isHorizontal) {
      return {
        ...base,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: '10px 10px 0 0',
        borderTop: colorBorder,
        borderLeft: colorBorder,
        borderRight: colorBorder,
        // Inner shadow for carved effect
        boxShadow: `inset 0 2px 8px rgba(0,0,0,0.4), 0 -2px 8px rgba(0,0,0,0.2)`,
        padding: expanded ? '6px 10px' : '4px 8px',
        gap: expanded ? 6 : 4,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      };
    }
    
    if (isLeft) {
      return {
        ...base,
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        borderRadius: '0 10px 10px 0',
        borderTop: colorBorder,
        borderRight: colorBorder,
        borderBottom: colorBorder,
        boxShadow: `inset -2px 0 8px rgba(0,0,0,0.4), 2px 0 8px rgba(0,0,0,0.2)`,
        padding: expanded ? '10px 6px' : '8px 4px',
        gap: expanded ? 6 : 4,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      };
    }
    
    return {
      ...base,
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      borderRadius: '10px 0 0 10px',
      borderTop: colorBorder,
      borderLeft: colorBorder,
      borderBottom: colorBorder,
      boxShadow: `inset 2px 0 8px rgba(0,0,0,0.4), -2px 0 8px rgba(0,0,0,0.2)`,
      padding: expanded ? '10px 6px' : '8px 4px',
      gap: expanded ? 6 : 4,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
    };
  };
  
  const ChevronExpand = isHorizontal ? ChevronUp : (isLeft ? ChevronRight : ChevronLeft);
  const ChevronCollapse = isHorizontal ? ChevronDown : (isLeft ? ChevronLeft : ChevronRight);
  
  // Collapsed state - whole notch only shows on hover, chevron visible when notch is visible
  if (!expanded) {
    return (
      <div 
        style={getNotchStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={onToggleExpand}
          title="Expand navigation"
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 4,
            color: tokens.textMuted, cursor: 'pointer',
          }}
        >
          <ChevronExpand size={14} />
        </button>
      </div>
    );
  }
  
  // Expanded state
  const btnSize = navMode === 'icon' ? 22 : navMode === 'mini' ? 24 : 26;
  const iconSize = navMode === 'icon' ? 12 : 14;
  
  const NavButton = ({ icon: Icon, label, onClick, isActive, isMode }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: btnSize, height: btnSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? `${color}25` : 'transparent',
        border: isActive ? `1px solid ${color}40` : '1px solid transparent',
        borderRadius: 5,
        color: isActive ? color : tokens.textMuted,
        cursor: 'pointer',
        transition: 'all 0.1s ease',
      }}
    >
      <Icon size={iconSize} />
    </button>
  );
  
  const Separator = () => (
    <div style={{ 
      width: isHorizontal ? 1 : 16, 
      height: isHorizontal ? 16 : 1, 
      background: `${color}20`,
      margin: isHorizontal ? '0 3px' : '3px 0',
    }} />
  );
  
  // Icon-only mode
  if (navMode === 'icon') {
    return (
      <div 
        style={getNotchStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <NavButton icon={Scan} label="Fit to View" onClick={() => {}} />
        <button
          onClick={onToggleExpand}
          title="Collapse"
          style={{
            width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 4,
            color: tokens.textMuted, cursor: 'pointer',
            marginLeft: isHorizontal ? 4 : 0, marginTop: isHorizontal ? 0 : 4,
          }}
        >
          <ChevronCollapse size={12} />
        </button>
      </div>
    );
  }
  
  // Mini mode
  if (navMode === 'mini') {
    return (
      <div 
        style={getNotchStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <NavButton icon={ZoomOut} label="Zoom Out" onClick={() => onZoomChange?.(Math.max(10, zoomLevel - 10))} />
        <ZoomInput value={zoomLevel} onChange={onZoomChange} color={color} />
        <NavButton icon={ZoomIn} label="Zoom In" onClick={() => onZoomChange?.(Math.min(10000, zoomLevel + 10))} />
        <Separator />
        <NavButton icon={Scan} label="Fit to View" onClick={() => {}} />
        <button
          onClick={onToggleExpand}
          title="Collapse"
          style={{
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 4,
            color: tokens.textMuted, cursor: 'pointer',
            marginLeft: isHorizontal ? 4 : 0, marginTop: isHorizontal ? 0 : 4,
          }}
        >
          <ChevronCollapse size={12} />
        </button>
      </div>
    );
  }
  
  // Compact mode
  if (navMode === 'compact') {
    return (
      <div 
        style={getNotchStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <NavButton icon={ZoomOut} label="Zoom Out" onClick={() => onZoomChange?.(Math.max(10, zoomLevel - 10))} />
        <ZoomInput value={zoomLevel} onChange={onZoomChange} color={color} />
        <NavButton icon={ZoomIn} label="Zoom In" onClick={() => onZoomChange?.(Math.min(10000, zoomLevel + 10))} />
        <Separator />
        <NavButton icon={Scan} label="Fit to View" onClick={() => {}} />
        <NavButton icon={Home} label="Reset Camera" onClick={() => {}} />
        <Separator />
        <NavButton icon={Hand} label="Pan" onClick={() => setActiveMode('pan')} isActive={activeMode === 'pan'} isMode />
        {is3D && <NavButton icon={RotateCw} label="Rotate" onClick={() => setActiveMode('rotate')} isActive={activeMode === 'rotate'} isMode />}
        <button
          onClick={onToggleExpand}
          title="Collapse"
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 4,
            color: tokens.textMuted, cursor: 'pointer',
            marginLeft: isHorizontal ? 4 : 0, marginTop: isHorizontal ? 0 : 4,
          }}
        >
          <ChevronCollapse size={12} />
        </button>
      </div>
    );
  }
  
  // Full mode
  return (
    <div 
      style={getNotchStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NavButton icon={ZoomOut} label="Zoom Out" onClick={() => onZoomChange?.(Math.max(10, zoomLevel - 10))} />
      <ZoomInput value={zoomLevel} onChange={onZoomChange} color={color} />
      <NavButton icon={ZoomIn} label="Zoom In" onClick={() => onZoomChange?.(Math.min(10000, zoomLevel + 10))} />
      <Separator />
      <NavButton icon={Scan} label="Fit to View" onClick={() => {}} />
      <NavButton icon={Home} label="Reset Camera" onClick={() => {}} />
      <Separator />
      <NavButton icon={Hand} label="Pan (P)" onClick={() => setActiveMode('pan')} isActive={activeMode === 'pan'} isMode />
      {is3D && <NavButton icon={RotateCw} label="Rotate (R)" onClick={() => setActiveMode('rotate')} isActive={activeMode === 'rotate'} isMode />}
      <button
        onClick={onToggleExpand}
        title="Collapse"
        style={{
          width: 26, height: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', borderRadius: 4,
          color: tokens.textMuted, cursor: 'pointer',
          marginLeft: isHorizontal ? 4 : 0, marginTop: isHorizontal ? 0 : 4,
        }}
      >
        <ChevronCollapse size={14} />
      </button>
    </div>
  );
};

// =============================================================================
// CANVAS CELL
// =============================================================================
const CanvasCell = ({ 
  view, 
  width = 400,
  height = 300,
  isActive = false,
  isLoading = false,
  navPosition = 'bottom',
  toolbarPinned = false,
  navExpanded = true,
  onToggleToolbarPin,
  onToggleNavExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const color = VIEW_COLORS[view.color];
  const breakpoint = getBreakpoint(width);
  
  const showToolbar = breakpoint.toolbarMode !== 'none';
  const toolbarVisible = showToolbar && (isHovered || toolbarPinned || isActive);
  const navVisible = isHovered || navExpanded || isActive;
  
  return (
    <div 
      style={{
        width, height,
        background: tokens.bgPrimary,
        borderRadius: 8,
        overflow: 'hidden',
        border: isActive ? `2px solid ${color.hex}` : `1px solid ${tokens.borderSubtle}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <InstanceHeader
        view={view}
        headerMode={breakpoint.headerMode}
        isActive={isActive}
        isLoading={isLoading}
        onAction={(action) => console.log(`Action: ${action}`)}
      />
      
      <div style={{
        flex: 1,
        position: 'relative',
        background: `linear-gradient(135deg, ${tokens.bgSecondary} 0%, ${tokens.bgPrimary} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 30% 40%, ${color.hex}12 0%, transparent 50%)`,
        }} />
        
        {showToolbar && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <InstanceToolbar
              visible={toolbarVisible}
              pinned={toolbarPinned}
              onTogglePin={onToggleToolbarPin}
              toolbarMode={breakpoint.toolbarMode}
              color={color.hex}
            />
          </div>
        )}
        
        <NavigationNotch
          visible={navVisible}
          expanded={navExpanded}
          onToggleExpand={onToggleNavExpand}
          navMode={breakpoint.navMode}
          position={navPosition}
          color={color.hex}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          is3D={view.type === 'vtk'}
        />
        
        <div style={{
          width: 50, height: 50, borderRadius: 10,
          background: `linear-gradient(135deg, ${color.hex}25 0%, ${color.hex}10 100%)`,
          border: `1px solid ${color.hex}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box size={22} style={{ color: color.hex, opacity: 0.8 }} />
        </div>
        
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '2px 6px', borderRadius: 4,
          background: 'rgba(0,0,0,0.6)', fontSize: 9,
          color: tokens.textMuted, fontFamily: 'monospace',
        }}>
          {breakpoint.label}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN EXPLORER
// =============================================================================
export default function FinalCellExplorer() {
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [isActive, setIsActive] = useState(true);
  const [navPosition, setNavPosition] = useState('bottom');
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const [selectedColor, setSelectedColor] = useState(0);
  
  const breakpoint = getBreakpoint(width);
  const view = { ...mockView, color: selectedColor };
  
  return (
    <div style={{
      display: 'flex', height: '100vh', background: tokens.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="range"] { width: 100%; accent-color: ${VIEW_COLORS[selectedColor].hex}; }
      `}</style>
      
      {/* Controls */}
      <div style={{ width: 300, background: tokens.bgSecondary, borderRight: `1px solid ${tokens.borderDefault}`, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: tokens.textPrimary }}>Final Cell Design</h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: tokens.textMuted }}>Carved nav notch â€¢ Stable chevron â€¢ Editable zoom</p>
        </div>
        
        {/* Color picker */}
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: tokens.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Instance Color</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {VIEW_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(i)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: c.hex,
                  border: selectedColor === i ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                  boxShadow: selectedColor === i ? `0 0 12px ${c.hex}60` : 'none',
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Size */}
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: tokens.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Size</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tokens.textSecondary, marginBottom: 4 }}>
              <span>Width</span><span style={{ fontFamily: 'monospace' }}>{width}px</span>
            </div>
            <input type="range" min="100" max="600" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tokens.textSecondary, marginBottom: 4 }}>
              <span>Height</span><span style={{ fontFamily: 'monospace' }}>{height}px</span>
            </div>
            <input type="range" min="80" max="500" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </div>
        </div>
        
        {/* Breakpoint info */}
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.borderSubtle}`, background: `${VIEW_COLORS[selectedColor].hex}08` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: VIEW_COLORS[selectedColor].hex, marginBottom: 6 }}>
            Breakpoint: {breakpoint.label}
          </div>
          <div style={{ fontSize: 10, color: tokens.textMuted, lineHeight: 1.5 }}>
            <div>Header: <strong style={{ color: tokens.textSecondary }}>{breakpoint.headerMode}</strong></div>
            <div>Toolbar: <strong style={{ color: tokens.textSecondary }}>{breakpoint.toolbarMode}</strong></div>
            <div>Nav: <strong style={{ color: tokens.textSecondary }}>{breakpoint.navMode}</strong></div>
          </div>
        </div>
        
        {/* Toggles */}
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
          {[
            { key: 'active', label: 'Active (focused)', value: isActive, set: setIsActive, color: tokens.accentGreen },
            { key: 'toolbarPin', label: 'Toolbar pinned', value: toolbarPinned, set: setToolbarPinned, color: tokens.accentBlue },
            { key: 'navExpand', label: 'Nav notch expanded', value: navExpanded, set: setNavExpanded, color: tokens.accentTeal },
          ].map(({ key, label, value, set, color }) => (
            <button
              key={key}
              onClick={() => set(!value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 10px', marginBottom: 6,
                background: value ? `${color}15` : tokens.bgTertiary,
                border: `1px solid ${value ? color + '40' : tokens.borderSubtle}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: value ? color : tokens.bgSecondary,
                border: `1px solid ${value ? color : tokens.borderDefault}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {value && <Check size={8} style={{ color: '#fff' }} />}
              </div>
              <span style={{ fontSize: 11, color: value ? color : tokens.textSecondary }}>{label}</span>
            </button>
          ))}
        </div>
        
        {/* Nav position */}
        <div style={{ padding: 12, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: tokens.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
            Nav Notch Position
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['left', 'bottom', 'right'].map((pos) => (
              <button
                key={pos}
                onClick={() => setNavPosition(pos)}
                style={{
                  flex: 1, padding: '8px',
                  background: navPosition === pos ? `${VIEW_COLORS[selectedColor].hex}15` : 'transparent',
                  border: navPosition === pos ? `1px solid ${VIEW_COLORS[selectedColor].hex}40` : `1px solid ${tokens.borderSubtle}`,
                  borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, color: navPosition === pos ? VIEW_COLORS[selectedColor].hex : tokens.textSecondary,
                  textTransform: 'capitalize',
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        
        {/* Key features */}
        <div style={{ padding: 12, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: VIEW_COLORS[selectedColor].hex, marginBottom: 8, textTransform: 'uppercase' }}>
            Key Features
          </div>
          <div style={{ fontSize: 10, color: tokens.textMuted, lineHeight: 1.6 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: tokens.textSecondary }}>Carved Notch:</strong> Inset shadow, darker background, instance color border accent
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: tokens.textSecondary }}>Chevron Behavior:</strong> Always visible when expanded (no layout shift). When collapsed, notch appears on hover.
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: tokens.textSecondary }}>Editable Zoom:</strong> Click for presets+slider, double-click to type value
            </div>
            <div>
              <strong style={{ color: tokens.textSecondary }}>Absolute Zoom:</strong> Always relative to original dataset size
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflow: 'auto' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: tokens.textPrimary }}>Instance Cell</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: tokens.textMuted }}>
            Chevron always visible when expanded â€¢ Collapsed notch appears on hover â€¢ Click zoom % for presets
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 400 }}>
          <CanvasCell
            view={view}
            width={width}
            height={height}
            isActive={isActive}
            navPosition={navPosition}
            toolbarPinned={toolbarPinned}
            navExpanded={navExpanded}
            onToggleToolbarPin={() => setToolbarPinned(!toolbarPinned)}
            onToggleNavExpand={() => setNavExpanded(!navExpanded)}
          />
        </div>
        
        {/* All positions demo */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: tokens.textSecondary }}>Nav Notch Positions</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {['left', 'bottom', 'right'].map((pos) => (
              <div key={pos} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: tokens.textMuted, textTransform: 'uppercase' }}>{pos}</span>
                <CanvasCell
                  view={view}
                  width={280}
                  height={200}
                  isActive={false}
                  navPosition={pos}
                  toolbarPinned={false}
                  navExpanded={true}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* All sizes */}
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, color: tokens.textSecondary }}>All Sizes</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {[
              { w: 480, h: 300 },
              { w: 360, h: 240 },
              { w: 280, h: 200 },
              { w: 200, h: 160 },
              { w: 150, h: 120 },
              { w: 110, h: 90 },
            ].map(({ w, h }) => (
              <div key={`${w}x${h}`} style={{ flexShrink: 0 }}>
                <CanvasCell
                  view={view}
                  width={w}
                  height={h}
                  isActive={false}
                  navPosition="bottom"
                  toolbarPinned={false}
                  navExpanded={w >= 200}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
