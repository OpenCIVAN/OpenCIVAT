// Floating Canvas Architecture Prototype - CIA Web
// Demonstrates: Floating/dockable canvas, compact mode, subsets as first-class citizens,
// cleaned up instance header (no wrench), live indicators on snapshots

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Box, BarChart3, MoreHorizontal, X, Maximize2, Minimize2,
  Hand, ZoomIn, Rotate3D, Plus, Pin, PinOff, Move,
  RotateCcw, Scan, Glasses, Copy, Trash2, Focus, Grid3X3, Columns,
  ChevronUp, ChevronDown, Layers, Settings, MousePointer2, 
  Dock, Maximize, PanelTop, PanelTopClose, Lock, Unlock,
  Users, Eye, EyeOff, Grip, LayoutGrid, Bookmark, Share2,
  Circle, Activity
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  bgCanvas: '#030303',
  bgCanvasCell: '#080808',
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
// RENDER MODES
// =============================================================================

const RENDER_MODES = {
  FULL: 'full',
  COMPACT: 'compact',
  THUMBNAIL: 'thumbnail',
  SNAPSHOT: 'snapshot',
};

const getRenderMode = (width, height) => {
  const minDim = Math.min(width, height);
  if (minDim >= 200) return RENDER_MODES.FULL;
  if (minDim >= 120) return RENDER_MODES.COMPACT;
  if (minDim >= 80) return RENDER_MODES.THUMBNAIL;
  return RENDER_MODES.SNAPSHOT;
};

// =============================================================================
// CANVAS MODES
// =============================================================================

const CANVAS_MODES = {
  DOCKED: 'docked',
  FLOATING: 'floating',
  FULLSCREEN: 'fullscreen',
};

// =============================================================================
// ASPECT RATIO PRESETS
// =============================================================================

const ASPECT_RATIOS = {
  FREE: { label: 'Free', ratio: null },
  SQUARE: { label: '1:1', ratio: 1 },
  FOUR_THREE: { label: '4:3', ratio: 4/3 },
  SIXTEEN_NINE: { label: '16:9', ratio: 16/9 },
  TWENTY_ONE_NINE: { label: '21:9', ratio: 21/9 },
};

// =============================================================================
// UTILITY
// =============================================================================

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '96, 165, 250';
};

// =============================================================================
// ICON BUTTON
// =============================================================================

const IconButton = ({ icon: Icon, title, onClick, active, danger, size = 20, badge }) => (
  <button
    onClick={onClick}
    title={title}
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
      cursor: 'pointer',
      position: 'relative',
    }}
  >
    <Icon size={size - 4} />
    {badge && (
      <span style={{
        position: 'absolute',
        top: -4,
        right: -4,
        width: 12,
        height: 12,
        borderRadius: '50%',
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
// LIVE INDICATOR - Shows when collaborators are working on a view
// =============================================================================

const LiveIndicator = ({ collaborators = [] }) => {
  if (collaborators.length === 0) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 6,
      left: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      background: 'rgba(74, 222, 128, 0.15)',
      border: '1px solid rgba(74, 222, 128, 0.3)',
      borderRadius: 12,
      zIndex: 10,
    }}>
      <div className="live-pulse" style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: tokens.accentGreen,
      }} />
      <span style={{ fontSize: 9, color: tokens.accentGreen }}>
        {collaborators.length} viewing
      </span>
    </div>
  );
};

// =============================================================================
// INSTANCE HEADER - Cleaned up (NO wrench button)
// =============================================================================

const InstanceHeader = ({ 
  name, 
  type = 'vtk',
  color = tokens.accentBlue,
  renderMode = RENDER_MODES.FULL,
  onClose,
  onFocus,
  onMore,
  isInFocusMode = false,
  collaborators = [],
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const TypeIcon = type === 'vtk' ? Box : type === 'chart' ? BarChart3 : type === 'subset' ? Grid3X3 : Layers;
  const colorRgb = hexToRgb(color);
  
  const isCompact = renderMode === RENDER_MODES.COMPACT || renderMode === RENDER_MODES.THUMBNAIL;
  const isMinimal = renderMode === RENDER_MODES.THUMBNAIL;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMinimal ? '4px 6px' : '6px 8px',
      background: tokens.bgSecondary,
      borderBottom: `1px solid ${tokens.borderSubtle}`,
      minHeight: isMinimal ? 28 : 34,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Left - Label Badge ONLY (no wrench) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
        {/* Live indicator for collaborators */}
        {collaborators.length > 0 && !isMinimal && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            background: 'rgba(74, 222, 128, 0.12)',
            borderRadius: 10,
            marginRight: 4,
          }}>
            <div className="live-pulse" style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: tokens.accentGreen,
            }} />
            <span style={{ fontSize: 9, color: tokens.accentGreen }}>{collaborators.length}</span>
          </div>
        )}
        
        {/* Label Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMinimal ? 4 : 6,
          padding: isMinimal ? '2px 6px' : '4px 10px',
          background: `rgba(${colorRgb}, 0.12)`,
          border: `1px solid rgba(${colorRgb}, 0.25)`,
          borderRadius: tokens.radiusSm,
          flex: 1,
          minWidth: 0,
        }}>
          <div style={{
            width: isMinimal ? 5 : 7,
            height: isMinimal ? 5 : 7,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }} />
          
          <span style={{
            fontSize: isMinimal ? 10 : 13,
            fontWeight: 500,
            color: color,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          
          {!isMinimal && (
            <TypeIcon size={12} style={{ color: color, opacity: 0.7, flexShrink: 0 }} />
          )}
        </div>
      </div>
      
      {/* Right - Controls: More, Focus, Close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMinimal ? 2 : 4, flexShrink: 0 }}>
        {/* More button (⋯) - always visible except minimal */}
        {!isMinimal && (
          <IconButton 
            icon={MoreHorizontal} 
            title="More options" 
            size={isCompact ? 18 : 20}
            onClick={() => setShowMenu(!showMenu)}
          />
        )}
        
        {/* Focus button */}
        {!isInFocusMode && (
          <IconButton 
            icon={Focus} 
            title="Focus Mode (F)" 
            size={isMinimal ? 16 : (isCompact ? 18 : 20)}
            onClick={onFocus}
          />
        )}
        
        {/* Close - ALWAYS visible */}
        <IconButton 
          icon={X} 
          title="Close" 
          size={isMinimal ? 16 : (isCompact ? 18 : 20)}
          onClick={onClose} 
          danger 
        />
      </div>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 8,
          marginTop: 4,
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusMd,
          padding: '4px 0',
          minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          <MenuItem icon={Settings} label="Instance Tools" shortcut="T" />
          <MenuItem icon={Maximize2} label="Fullscreen" />
          <MenuItem icon={Glasses} label="Enter VR Mode" />
          <Divider />
          <MenuItem icon={RotateCcw} label="Reset Camera" />
          <MenuItem icon={Scan} label="Fit to View" />
          <Divider />
          <MenuItem icon={Copy} label="Duplicate View" />
          <MenuItem icon={Bookmark} label="Add to Subset" />
          <MenuItem icon={Share2} label="Share View" />
          <Divider />
          <MenuItem icon={X} label="Close View" />
          <MenuItem icon={Trash2} label="Delete View" danger />
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, shortcut, danger, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      cursor: 'pointer',
      color: danger ? tokens.accentRed : tokens.textSecondary,
      fontSize: 13,
    }}
    className="menu-item"
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
    {shortcut && <span style={{ fontSize: 11, color: tokens.textMuted }}>{shortcut}</span>}
  </div>
);

const Divider = () => <div style={{ height: 1, background: tokens.borderDefault, margin: '4px 8px' }} />;

// =============================================================================
// INSTANCE TOOLBAR (FULL mode only)
// =============================================================================

const InstanceToolbar = ({ visible, pinned, onTogglePin, activeTool, onSelectTool }) => {
  const tools = [
    { id: 'pointer', icon: MousePointer2, label: 'Select' },
    { id: 'pan', icon: Hand, label: 'Pan' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
    { id: 'rotate', icon: Rotate3D, label: 'Rotate' },
  ];
  
  return (
    <div style={{
      position: 'absolute',
      top: 42,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible || pinned ? 0 : -50}px)`,
      opacity: visible || pinned ? 1 : 0,
      pointerEvents: visible || pinned ? 'auto' : 'none',
      transition: 'all 0.2s ease',
      zIndex: 50,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        background: 'rgba(12, 18, 32, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: tokens.radiusMd,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            title={tool.label}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: activeTool === tool.id ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
              border: activeTool === tool.id ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid transparent',
              borderRadius: tokens.radiusSm,
              color: activeTool === tool.id ? tokens.accentBlue : tokens.textSecondary,
              cursor: 'pointer',
            }}
          >
            <tool.icon size={14} />
          </button>
        ))}
        
        <div style={{ width: 1, height: 16, background: tokens.borderDefault, margin: '0 4px' }} />
        
        <button
          onClick={onTogglePin}
          title={pinned ? 'Unpin' : 'Pin toolbar'}
          style={{
            width: 22,
            height: 22,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: pinned ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: tokens.radiusSm,
            color: pinned ? tokens.accentBlue : tokens.textMuted,
            cursor: 'pointer',
          }}
        >
          {pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// SUBSET CARD - First-class citizen on canvas
// =============================================================================

const SubsetCard = ({ subset, renderMode, isActive, onClick, onOpen, onClose }) => {
  const [hovering, setHovering] = useState(false);
  const colorRgb = hexToRgb(subset.color);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: `rgba(${colorRgb}, 0.08)`,
        borderRadius: tokens.radiusLg,
        border: `2px dashed ${isActive ? subset.color : `rgba(${colorRgb}, 0.3)`}`,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        background: `rgba(${colorRgb}, 0.15)`,
        borderBottom: `1px solid rgba(${colorRgb}, 0.2)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Grid3X3 size={14} style={{ color: subset.color }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: subset.color }}>
            {subset.name}
          </span>
          <span style={{ fontSize: 10, color: tokens.textMuted }}>
            ({subset.viewIds.length} views)
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton icon={Share2} title="Share subset" size={18} />
          <IconButton icon={X} title="Remove from canvas" size={18} onClick={(e) => { e.stopPropagation(); onClose?.(); }} danger />
        </div>
      </div>
      
      {/* Preview Grid - Shows miniature thumbnails */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${subset.layout === '2x2' ? 2 : 3}, 1fr)`,
        gridTemplateRows: `repeat(${subset.layout === '2x2' ? 2 : 3}, 1fr)`,
        gap: 4,
        padding: 8,
      }}>
        {subset.viewIds.slice(0, subset.layout === '2x2' ? 4 : 9).map((viewId, i) => (
          <div
            key={i}
            style={{
              background: tokens.bgCanvas,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box size={16} style={{ color: tokens.textMuted, opacity: 0.5 }} />
          </div>
        ))}
      </div>
      
      {/* Open Button Overlay */}
      {hovering && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
            style={{
              padding: '10px 20px',
              background: subset.color,
              border: 'none',
              borderRadius: tokens.radiusMd,
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Focus size={16} />
            Open Subset
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// INSTANCE VIEWPORT
// =============================================================================

const InstanceViewport = ({ 
  viewConfig,
  isActive,
  renderMode = RENDER_MODES.FULL,
  onActivate,
  onClose,
  onFocus,
  isInFocusMode = false,
  collaborators = [],
}) => {
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [activeTool, setActiveTool] = useState('pointer');
  const hideTimeout = useRef(null);
  
  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (renderMode === RENDER_MODES.FULL) {
      setToolbarVisible(true);
    }
  };
  
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setToolbarVisible(false), 300);
  };
  
  const color = viewConfig.color || tokens.accentBlue;
  const colorRgb = hexToRgb(color);
  const isSnapshot = renderMode === RENDER_MODES.SNAPSHOT;
  
  // Handle subset type
  if (viewConfig.type === 'subset') {
    return (
      <SubsetCard
        subset={viewConfig}
        renderMode={renderMode}
        isActive={isActive}
        onClick={onActivate}
        onOpen={onFocus}
        onClose={onClose}
      />
    );
  }
  
  return (
    <div
      onClick={!isSnapshot ? onActivate : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: tokens.bgSecondary,
        borderRadius: tokens.radiusLg,
        border: `1px solid ${isActive ? color : tokens.borderDefault}`,
        boxShadow: isActive 
          ? `0 0 0 1px ${color}, 0 0 20px rgba(${colorRgb}, 0.25), inset 0 0 60px rgba(0,0,0,0.5)`
          : 'inset 0 0 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative',
        cursor: isSnapshot ? 'default' : 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.2s',
      }}
    >
      {/* Live Indicator for Snapshot mode */}
      {isSnapshot && collaborators.length > 0 && (
        <LiveIndicator collaborators={collaborators} />
      )}
      
      {/* Header - ALWAYS visible except snapshot */}
      {!isSnapshot && (
        <InstanceHeader
          name={viewConfig.name}
          type={viewConfig.type}
          color={color}
          renderMode={renderMode}
          isInFocusMode={isInFocusMode}
          collaborators={collaborators}
          onClose={onClose}
          onFocus={onFocus}
        />
      )}
      
      {/* Toolbar */}
      {renderMode === RENDER_MODES.FULL && (
        <InstanceToolbar
          visible={toolbarVisible || isActive}
          pinned={toolbarPinned}
          onTogglePin={() => setToolbarPinned(!toolbarPinned)}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
        />
      )}
      
      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.bgCanvas,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: tokens.textMuted }}>
          <Box size={renderMode === RENDER_MODES.SNAPSHOT ? 24 : 40} strokeWidth={1} style={{ color }} />
          {renderMode !== RENDER_MODES.SNAPSHOT && renderMode !== RENDER_MODES.THUMBNAIL && (
            <span style={{ fontSize: 11 }}>{viewConfig.name}</span>
          )}
        </div>
        
        {(renderMode === RENDER_MODES.FULL || renderMode === RENDER_MODES.COMPACT) && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${tokens.borderDefault}`,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: tokens.textMuted,
          }}>
            XYZ
          </div>
        )}
      </div>
      
      {/* Snapshot Overlay */}
      {isSnapshot && (
        <div 
          onClick={onFocus}
          className="snapshot-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: tokens.radiusSm,
          }}>
            <Focus size={16} color={tokens.accentBlue} />
            <span style={{ fontSize: 10, color: tokens.textSecondary }}>Focus</span>
          </div>
        </div>
      )}
      
      {/* Mode Badge */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 4,
        padding: '2px 6px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 3,
        fontSize: 9,
        color: tokens.textMuted,
        textTransform: 'uppercase',
      }}>
        {renderMode}
      </div>
    </div>
  );
};

// =============================================================================
// EMPTY CELL
// =============================================================================

const EmptyCell = ({ row, col, renderMode, onAddContent }) => {
  const [hovering, setHovering] = useState(false);
  const isSmall = renderMode === RENDER_MODES.SNAPSHOT || renderMode === RENDER_MODES.THUMBNAIL;
  
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px dashed ${hovering ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: tokens.radiusMd,
        background: hovering ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
        position: 'relative',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
      }}
    >
      {!isSmall && (
        <button
          onClick={() => onAddContent?.('view')}
          style={{
            width: renderMode === RENDER_MODES.COMPACT ? 32 : 44,
            height: renderMode === RENDER_MODES.COMPACT ? 32 : 44,
            borderRadius: '50%',
            border: `2px solid ${hovering ? tokens.accentBlue : tokens.borderSubtle}`,
            background: hovering ? 'rgba(96, 165, 250, 0.15)' : tokens.bgSecondary,
            color: hovering ? tokens.accentBlue : tokens.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus size={renderMode === RENDER_MODES.COMPACT ? 16 : 20} />
        </button>
      )}
      
      {isSmall && (
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: hovering ? tokens.accentBlue : tokens.borderSubtle,
        }} />
      )}
      
      <div style={{
        position: 'absolute',
        bottom: 6,
        right: 6,
        fontSize: 9,
        fontFamily: 'monospace',
        color: tokens.textMuted,
        opacity: hovering ? 0.8 : 0.5,
      }}>
        [{row}, {col}]
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS GRID
// =============================================================================

const CanvasGrid = ({ 
  rows, cols, placements, activeViewId, containerSize,
  onActivate, onClose, onFocus, onAddContent,
}) => {
  const gap = tokens.gap;
  const padding = 12;
  const cellWidth = (containerSize.width - padding * 2 - gap * (cols - 1)) / cols;
  const cellHeight = (containerSize.height - padding * 2 - gap * (rows - 1)) / rows;
  const renderMode = getRenderMode(cellWidth, cellHeight);
  
  const getPlacement = (row, col) => placements.find(p => p.row === row && p.col === col);
  
  // Simulate some collaborators for demo
  const getCollaborators = (id) => {
    if (id === 'view-2') return [{ name: 'Alice' }, { name: 'Bob' }];
    return [];
  };
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap,
      padding,
      width: '100%',
      height: '100%',
      background: tokens.bgCanvas,
    }}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const placement = getPlacement(row, col);
        
        if (!placement) {
          return <EmptyCell key={`${row}-${col}`} row={row} col={col} renderMode={renderMode} onAddContent={(type) => onAddContent?.(row, col, type)} />;
        }
        
        return (
          <InstanceViewport
            key={placement.id}
            viewConfig={placement}
            isActive={activeViewId === placement.id}
            renderMode={renderMode}
            collaborators={getCollaborators(placement.id)}
            onActivate={() => onActivate(placement.id)}
            onClose={() => onClose(placement.id)}
            onFocus={() => onFocus(placement)}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// APP HEADER - Can be hidden in compact mode
// =============================================================================

const AppHeader = ({ visible, onToggle, compact }) => {
  if (!visible && !compact) return null;
  
  if (compact) {
    // Thin grab bar to restore header
    return (
      <div 
        onClick={onToggle}
        style={{
          height: 4,
          background: tokens.bgSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="header-grab"
      >
        <div style={{ width: 40, height: 2, background: tokens.borderMedium, borderRadius: 1 }} />
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      background: tokens.bgSecondary,
      borderBottom: `1px solid ${tokens.borderDefault}`,
      height: 48,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>CIA Web</div>
        <span style={{ fontSize: 12, color: tokens.textMuted }}>|</span>
        <span style={{ fontSize: 12, color: tokens.textSecondary }}>Project Alpha</span>
        <span style={{ fontSize: 12, color: tokens.textMuted }}>→</span>
        <span style={{ fontSize: 12, color: tokens.accentBlue }}>Main Room</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton icon={Users} title="2 online" badge="2" size={20} />
        <IconButton icon={Glasses} title="Enter VR" size={20} />
        <IconButton icon={PanelTopClose} title="Hide header (Cmd+Shift+H)" size={20} onClick={onToggle} />
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS CONTROLS BAR - Controls for floating canvas
// =============================================================================

const CanvasControlsBar = ({ 
  canvasMode, aspectRatio, gridSize,
  onModeChange, onAspectRatioChange, onGridSizeChange,
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: tokens.bgTertiary,
    borderBottom: `1px solid ${tokens.borderDefault}`,
  }}>
    {/* Left - Canvas Mode */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: tokens.textMuted, textTransform: 'uppercase' }}>Canvas:</span>
      
      {Object.entries(CANVAS_MODES).map(([key, mode]) => (
        <button
          key={key}
          onClick={() => onModeChange(mode)}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            background: canvasMode === mode ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
            border: `1px solid ${canvasMode === mode ? 'rgba(96, 165, 250, 0.3)' : tokens.borderDefault}`,
            borderRadius: tokens.radiusSm,
            color: canvasMode === mode ? tokens.accentBlue : tokens.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {mode === CANVAS_MODES.DOCKED && <Dock size={12} />}
          {mode === CANVAS_MODES.FLOATING && <Move size={12} />}
          {mode === CANVAS_MODES.FULLSCREEN && <Maximize size={12} />}
          {key.charAt(0) + key.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
    
    {/* Center - Aspect Ratio */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: tokens.textMuted }}>Aspect:</span>
      <select
        value={aspectRatio}
        onChange={(e) => onAspectRatioChange(e.target.value)}
        style={{
          padding: '4px 8px',
          fontSize: 11,
          background: tokens.bgElevated,
          border: `1px solid ${tokens.borderDefault}`,
          borderRadius: tokens.radiusSm,
          color: tokens.textPrimary,
        }}
      >
        {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      
      {aspectRatio !== 'FREE' && (
        <Lock size={12} style={{ color: tokens.accentAmber }} />
      )}
    </div>
    
    {/* Right - Grid Size */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: tokens.textMuted }}>Grid:</span>
      <select
        value={`${gridSize.rows}x${gridSize.cols}`}
        onChange={(e) => {
          const [r, c] = e.target.value.split('x').map(Number);
          onGridSizeChange({ rows: r, cols: c });
        }}
        style={{
          padding: '4px 8px',
          fontSize: 11,
          background: tokens.bgElevated,
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
  </div>
);

// =============================================================================
// FLOATING CANVAS WRAPPER
// =============================================================================

const FloatingCanvasWrapper = ({ 
  children, 
  canvasMode, 
  aspectRatio,
  position,
  size,
  onDrag,
  onResize,
}) => {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  if (canvasMode === CANVAS_MODES.DOCKED) {
    return <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>;
  }
  
  if (canvasMode === CANVAS_MODES.FULLSCREEN) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: tokens.bgCanvas,
      }}>
        {children}
      </div>
    );
  }
  
  // Floating mode
  return (
    <div style={{
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      zIndex: 200,
      borderRadius: tokens.radiusLg,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      border: `1px solid ${tokens.borderMedium}`,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Drag Handle */}
      <div 
        style={{
          height: 24,
          background: tokens.bgTertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'move',
          borderBottom: `1px solid ${tokens.borderDefault}`,
        }}
        onMouseDown={(e) => {
          setDragging(true);
          dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }}
      >
        <Grip size={14} style={{ color: tokens.textMuted }} />
      </div>
      
      {children}
      
      {/* Resize Handle */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          cursor: 'se-resize',
          background: `linear-gradient(135deg, transparent 50%, ${tokens.borderMedium} 50%)`,
        }}
      />
    </div>
  );
};

// =============================================================================
// MAIN APP
// =============================================================================

export default function App() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [canvasMode, setCanvasMode] = useState(CANVAS_MODES.DOCKED);
  const [aspectRatio, setAspectRatio] = useState('FREE');
  const [gridSize, setGridSize] = useState({ rows: 3, cols: 3 });
  const [activeViewId, setActiveViewId] = useState('view-1');
  const [floatingPosition, setFloatingPosition] = useState({ x: 100, y: 100 });
  const [floatingSize, setFloatingSize] = useState({ width: 800, height: 600 });
  
  const [placements, setPlacements] = useState([
    { id: 'view-1', type: 'vtk', name: 'Brain MRI', color: tokens.accentBlue, row: 0, col: 0 },
    { id: 'view-2', type: 'vtk', name: 'CT Chest', color: tokens.accentPurple, row: 0, col: 1 },
    { id: 'view-3', type: 'vtk', name: 'Skull Mesh', color: tokens.accentTeal, row: 0, col: 2 },
    { id: 'subset-1', type: 'subset', name: 'Comparison Set', color: tokens.accentAmber, row: 1, col: 1, layout: '2x2', viewIds: ['view-1', 'view-2', 'view-3', 'view-4'] },
  ]);
  
  // Calculate container size based on mode
  const getContainerSize = () => {
    if (canvasMode === CANVAS_MODES.FULLSCREEN) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    if (canvasMode === CANVAS_MODES.FLOATING) {
      return floatingSize;
    }
    // Docked - estimate based on viewport minus headers
    return { width: 900, height: 500 };
  };
  
  const containerSize = getContainerSize();
  const cellWidth = (containerSize.width - 24 - tokens.gap * (gridSize.cols - 1)) / gridSize.cols;
  const cellHeight = (containerSize.height - 60 - tokens.gap * (gridSize.rows - 1)) / gridSize.rows;
  const renderMode = getRenderMode(cellWidth, cellHeight);
  
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: tokens.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: tokens.textPrimary,
      position: 'relative',
    }}>
      {/* App Header - Hideable */}
      <AppHeader 
        visible={headerVisible} 
        compact={!headerVisible}
        onToggle={() => setHeaderVisible(!headerVisible)} 
      />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Activity Bar (placeholder) */}
        <div style={{
          width: 48,
          background: tokens.bgSecondary,
          borderRight: `1px solid ${tokens.borderDefault}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 8,
        }}>
          <IconButton icon={LayoutGrid} title="Views" size={20} active />
          <IconButton icon={Layers} title="Datasets" size={20} />
          <IconButton icon={Settings} title="Instance Tools (T)" size={20} />
          <div style={{ flex: 1 }} />
          <IconButton icon={Bookmark} title="Subsets" size={20} />
        </div>
        
        {/* Canvas Container */}
        <FloatingCanvasWrapper
          canvasMode={canvasMode}
          aspectRatio={aspectRatio}
          position={floatingPosition}
          size={floatingSize}
        >
          {/* Canvas Controls */}
          <CanvasControlsBar
            canvasMode={canvasMode}
            aspectRatio={aspectRatio}
            gridSize={gridSize}
            onModeChange={setCanvasMode}
            onAspectRatioChange={setAspectRatio}
            onGridSizeChange={setGridSize}
          />
          
          {/* Canvas Grid */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CanvasGrid
              rows={gridSize.rows}
              cols={gridSize.cols}
              placements={placements}
              activeViewId={activeViewId}
              containerSize={{ ...containerSize, height: containerSize.height - 40 }}
              onActivate={setActiveViewId}
              onClose={(id) => setPlacements(prev => prev.filter(p => p.id !== id))}
              onFocus={(view) => console.log('Focus:', view)}
              onAddContent={(row, col, type) => {
                const id = `view-${Date.now()}`;
                const colors = [tokens.accentBlue, tokens.accentPurple, tokens.accentTeal, tokens.accentGreen];
                setPlacements(prev => [...prev, { id, type: 'vtk', name: 'New View', color: colors[Math.floor(Math.random() * colors.length)], row, col }]);
              }}
            />
          </div>
          
          {/* Status Bar */}
          <div style={{
            padding: '6px 12px',
            background: tokens.bgTertiary,
            borderTop: `1px solid ${tokens.borderDefault}`,
            fontSize: 10,
            color: tokens.textMuted,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Cell: {Math.round(cellWidth)}×{Math.round(cellHeight)}px | Mode: {renderMode}</span>
            <span>Header hidden? Press Cmd+Shift+H to restore</span>
          </div>
        </FloatingCanvasWrapper>
      </div>
      
      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .live-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .snapshot-overlay:hover {
          opacity: 1 !important;
        }
        
        .menu-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        
        .header-grab:hover {
          background: ${tokens.bgTertiary};
        }
        
        button:hover {
          filter: brightness(1.1);
        }
        
        select:focus {
          outline: 1px solid ${tokens.accentBlue};
        }
      `}</style>
    </div>
  );
}
