import React, { useState } from 'react';
import { 
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Home,
  Maximize2, MoreHorizontal, Box, Layers, Eye, LayoutGrid, Grid3X3,
  Link2, Square, Hash, Camera, RotateCw,
  Copy, Maximize, Compass, Plus, Minus, Glasses, Settings, 
  MousePointer, Scan, Move, Expand, List, Clipboard,
  ArrowRight, ArrowDown, Edit3, MousePointer2, Merge,
  Users, Check, Pencil, Hand, Undo, Redo,
  Scissors, FlipHorizontal, PanelLeft
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24',
      elevated: '#1e1e2a',
      group: 'rgba(255,255,255,0.03)',
    },
    border: { 
      subtle: 'rgba(255,255,255,0.06)', 
      default: 'rgba(255,255,255,0.1)',
    },
    text: { 
      primary: '#ffffff', 
      secondary: 'rgba(255,255,255,0.7)', 
      muted: 'rgba(255,255,255,0.4)',
      disabled: 'rgba(255,255,255,0.25)',
    },
    accent: { 
      purple: '#a855f7', 
      blue: '#3b82f6', 
      cyan: '#22d3ee', 
      green: '#22c55e', 
      amber: '#f59e0b', 
      teal: '#14b8a6',
      pink: '#ec4899',
    },
  },
  radius: { sm: 4, md: 6, lg: 8 },
};

// =============================================================================
// BREAKPOINTS
// =============================================================================
const BREAKPOINTS = {
  LINKS_COMPACT: 855,      // Links collapse to icon + count
  HEADER_COMPACT: 810,     // Edit/Flow collapse
  FOOTER_WRAP: 650,        // Footer 2 wraps to second line
  NAMES_ICON_ONLY: 500,    // Workspace/VG show icon only
};

const WINDOW_MODES = { DOCKED: 'docked', FLOATING: 'floating', FULL: 'full' };

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function IconButton({ icon: Icon, size = 14, buttonSize = 28, active, disabled, onClick, title, color, grouped }) {
  const [hovered, setHovered] = useState(false);
  const activeColor = color || tokens.colors.accent.cyan;
  
  let bgColor = 'transparent';
  if (active) bgColor = activeColor + '25';
  else if (hovered && !disabled) bgColor = 'rgba(255,255,255,0.08)';
  
  let textColor = tokens.colors.text.secondary;
  if (disabled) textColor = tokens.colors.text.disabled;
  else if (active) textColor = activeColor;
  else if (hovered) textColor = tokens.colors.text.primary;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: buttonSize, height: buttonSize, minWidth: buttonSize,
        borderRadius: grouped ? 0 : tokens.radius.sm, border: 'none', background: bgColor,
        color: textColor, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease', flexShrink: 0, padding: 0,
      }}
    >
      <Icon size={size} strokeWidth={1.75} />
    </button>
  );
}

function ButtonGroup({ children }) {
  return (
    <div style={{ display: 'flex', borderRadius: tokens.radius.sm, border: '1px solid ' + tokens.colors.border.subtle, overflow: 'hidden' }}>
      {React.Children.map(children, (child, i) => (
        <>{i > 0 && <div style={{ width: 1, background: tokens.colors.border.subtle }} />}{child}</>
      ))}
    </div>
  );
}

function ControlGroup({ children, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: tokens.colors.bg.group, borderRadius: tokens.radius.md, flexShrink: 0 }}>
      {label && <span style={{ fontSize: 9, color: tokens.colors.text.muted, marginRight: 2 }}>{label}</span>}
      {children}
    </div>
  );
}

function Separator({ height = 20, margin = 8 }) {
  return <div style={{ width: 1, height, background: tokens.colors.border.default, margin: `0 ${margin}px`, flexShrink: 0 }} />;
}

function SectionLabel({ children, color }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: color || tokens.colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function FooterSection({ label, children, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
      <SectionLabel color={color}>{label}</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
    </div>
  );
}

// =============================================================================
// WORKSPACE SELECTOR (Gradual truncation)
// =============================================================================

function WorkspaceSelector({ workspace, onSelect, width }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Gradual truncation based on available width
  const showIconOnly = width < BREAKPOINTS.NAMES_ICON_ONLY;
  // Calculate max-width for name: shrinks as width decreases
  const nameMaxWidth = Math.max(40, Math.min(120, (width - 400) * 0.2));
  
  return (
    <div style={{ position: 'relative', flexShrink: 1, minWidth: showIconOnly ? 36 : 60 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.accent.teal + '40', background: tokens.colors.accent.teal + '15', cursor: 'pointer', maxWidth: '100%' }}>
        <LayoutGrid size={12} style={{ color: tokens.colors.accent.teal, flexShrink: 0 }} />
        {!showIconOnly && (
          <span style={{ 
            fontSize: 11, fontWeight: 500, color: tokens.colors.accent.teal, 
            maxWidth: nameMaxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'max-width 0.2s ease',
          }}>
            {workspace}
          </span>
        )}
        <ChevronDown size={10} style={{ color: tokens.colors.accent.teal, flexShrink: 0 }} />
      </button>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.lg, padding: 4, minWidth: 180, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            {['My Workspace', 'Shared Analysis', 'Comparison View'].map(ws => (
              <button key={ws} onClick={() => { onSelect?.(ws); setIsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: tokens.radius.sm, border: 'none', background: ws === workspace ? tokens.colors.accent.teal + '20' : 'transparent', color: ws === workspace ? tokens.colors.accent.teal : tokens.colors.text.secondary, cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
                <LayoutGrid size={12} /><span>{ws}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// VIEWGROUP SELECTOR (Gradual truncation + link indicator)
// =============================================================================

function ViewGroupSelector({ viewGroup, color, isLinked, onSelect, width }) {
  const [isOpen, setIsOpen] = useState(false);
  const groups = [
    { name: 'MRI Slices', color: tokens.colors.accent.purple, isLinked: true },
    { name: '3D Analysis', color: tokens.colors.accent.green, isLinked: false },
    { name: 'Data Views', color: tokens.colors.accent.amber, isLinked: true },
  ];
  
  const showIconOnly = width < BREAKPOINTS.NAMES_ICON_ONLY;
  const nameMaxWidth = Math.max(40, Math.min(100, (width - 400) * 0.15));
  
  return (
    <div style={{ position: 'relative', flexShrink: 1, minWidth: showIconOnly ? 36 : 50 }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${color || tokens.colors.border.subtle}40`, background: color ? `${color}15` : 'transparent', cursor: 'pointer', maxWidth: '100%' }}>
        {viewGroup ? (
          <>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {!showIconOnly && (
              <span style={{ 
                fontSize: 11, color: color, 
                maxWidth: nameMaxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'max-width 0.2s ease',
              }}>
                {viewGroup}
              </span>
            )}
            {isLinked && <Link2 size={10} style={{ color: tokens.colors.accent.cyan, flexShrink: 0 }} />}
          </>
        ) : (
          <>
            <Grid3X3 size={11} style={{ color: tokens.colors.text.muted, flexShrink: 0 }} />
            {!showIconOnly && <span style={{ fontSize: 11, color: tokens.colors.text.secondary }}>All</span>}
          </>
        )}
        <ChevronDown size={10} style={{ color: color || tokens.colors.text.muted, flexShrink: 0 }} />
      </button>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.lg, padding: 4, minWidth: 180, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <button onClick={() => { onSelect?.(null); setIsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: tokens.radius.sm, border: 'none', background: !viewGroup ? tokens.colors.accent.cyan + '20' : 'transparent', color: !viewGroup ? tokens.colors.accent.cyan : tokens.colors.text.secondary, cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
              <Grid3X3 size={12} /><span style={{ flex: 1 }}>All ViewGroups</span>
            </button>
            <div style={{ height: 1, background: tokens.colors.border.subtle, margin: '4px 0' }} />
            {groups.map(g => (
              <button key={g.name} onClick={() => { onSelect?.(g); setIsOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: tokens.radius.sm, border: 'none', background: viewGroup === g.name ? `${g.color}20` : 'transparent', color: viewGroup === g.name ? g.color : tokens.colors.text.secondary, cursor: 'pointer', fontSize: 11, textAlign: 'left' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }} />
                <span style={{ flex: 1 }}>{g.name}</span>
                {g.isLinked && <Link2 size={10} style={{ color: tokens.colors.accent.cyan }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// DISPLAY OPTIONS DROPDOWN
// =============================================================================

function DisplayOptionsDropdown({ showCoordinates, showViewGroupBorders, onToggleCoordinates, onToggleViewGroupBorders }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = (showCoordinates ? 1 : 0) + (showViewGroupBorders ? 1 : 0);
  
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setIsOpen(!isOpen)} title="Display Options" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.border.subtle, background: activeCount > 0 ? tokens.colors.accent.purple + '15' : 'transparent', cursor: 'pointer' }}>
        <Eye size={12} style={{ color: activeCount > 0 ? tokens.colors.accent.purple : tokens.colors.text.muted }} />
        {activeCount > 0 && <span style={{ fontSize: 9, color: tokens.colors.accent.purple, fontWeight: 600 }}>{activeCount}</span>}
        <ChevronDown size={10} style={{ color: tokens.colors.text.muted }} />
      </button>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.lg, padding: 4, minWidth: 180, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '6px 10px', fontSize: 9, color: tokens.colors.text.muted, textTransform: 'uppercase' }}>Display Options</div>
            <button onClick={() => onToggleCoordinates()} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, textAlign: 'left', color: tokens.colors.text.secondary }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${showCoordinates ? tokens.colors.accent.blue : tokens.colors.border.default}`, background: showCoordinates ? tokens.colors.accent.blue : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{showCoordinates && <Check size={10} style={{ color: '#fff' }} />}</div>
              <Hash size={12} style={{ color: tokens.colors.accent.blue }} /><span>Grid Coordinates</span>
            </button>
            <button onClick={() => onToggleViewGroupBorders()} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, textAlign: 'left', color: tokens.colors.text.secondary }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${showViewGroupBorders ? tokens.colors.accent.purple : tokens.colors.border.default}`, background: showViewGroupBorders ? tokens.colors.accent.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{showViewGroupBorders && <Check size={10} style={{ color: '#fff' }} />}</div>
              <Eye size={12} style={{ color: tokens.colors.accent.purple }} /><span>ViewGroup Borders</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// RESPONSIVE LINKS (Compact = icon + count, NO redundant "Links:" label)
// =============================================================================

function ResponsiveLinks({ links, onToggleLink, isCompact }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const linkTypes = [
    { id: 'camera', label: 'Camera', icon: Eye, color: tokens.colors.accent.teal },
    { id: 'filters', label: 'Filters', icon: Scan, color: tokens.colors.accent.purple },
    { id: 'widgets', label: 'Widgets', icon: Box, color: tokens.colors.accent.amber },
    { id: 'cursors', label: 'Cursors', icon: MousePointer, color: tokens.colors.accent.cyan },
    { id: 'annotations', label: 'Annotations', icon: Edit3, color: tokens.colors.accent.pink },
  ];
  
  const activeCount = Object.values(links).filter(Boolean).length;
  
  if (isCompact) {
    // Compact: Just icon + count (section header already says "LINKS")
    return (
      <div style={{ position: 'relative' }}>
        <button onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.accent.cyan + '40', background: tokens.colors.accent.cyan + '10', cursor: 'pointer' }}>
          <Link2 size={12} style={{ color: tokens.colors.accent.cyan }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: tokens.colors.accent.cyan }}>{activeCount}</span>
        </button>
        {isOpen && <LinksPopover links={links} linkTypes={linkTypes} onToggleLink={onToggleLink} onClose={() => setIsOpen(false)} />}
      </div>
    );
  }
  
  // Full mode: Individual icons
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {linkTypes.map(link => (
        <IconButton key={link.id} icon={link.icon} size={13} buttonSize={26} title={link.label} onClick={() => onToggleLink(link.id)} active={links[link.id]} color={link.color} />
      ))}
    </div>
  );
}

function LinksPopover({ links, linkTypes, onToggleLink, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={onClose} />
      <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 4, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.lg, padding: 4, minWidth: 160, zIndex: 100, boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '6px 10px', fontSize: 9, color: tokens.colors.text.muted, textTransform: 'uppercase' }}>Links</div>
        {linkTypes.map(link => (
          <button key={link.id} onClick={() => onToggleLink(link.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: tokens.radius.sm, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, textAlign: 'left', color: tokens.colors.text.secondary }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${links[link.id] ? link.color : tokens.colors.border.default}`, background: links[link.id] ? link.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{links[link.id] && <Check size={10} style={{ color: '#fff' }} />}</div>
            <link.icon size={12} style={{ color: link.color }} /><span>{link.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// =============================================================================
// COMPACT NAVIGATOR
// =============================================================================

function CompactNavigator({ canvasSize, viewportSize, position, onNavigate, onHome, onOpenFullNavigator }) {
  const canMoveUp = position.row > 0;
  const canMoveDown = position.row + viewportSize.rows < canvasSize.rows;
  const canMoveLeft = position.col > 0;
  const canMoveRight = position.col + viewportSize.cols < canvasSize.cols;
  const isAtHome = position.row === 0 && position.col === 0;
  const needsNavigation = canvasSize.cols > viewportSize.cols || canvasSize.rows > viewportSize.rows;
  
  if (!needsNavigation) {
    return <span style={{ fontSize: 10, color: tokens.colors.text.muted, fontStyle: 'italic' }}>Full view</span>;
  }
  
  const previewCells = [];
  for (let r = 0; r < canvasSize.rows; r++) {
    for (let c = 0; c < canvasSize.cols; c++) {
      const isInViewport = r >= position.row && r < position.row + viewportSize.rows && c >= position.col && c < position.col + viewportSize.cols;
      previewCells.push({ r, c, isInViewport });
    }
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={onOpenFullNavigator} title="Open Full Navigator" style={{ display: 'grid', gridTemplateColumns: `repeat(${canvasSize.cols}, 8px)`, gridTemplateRows: `repeat(${canvasSize.rows}, 8px)`, gap: 1, padding: 4, borderRadius: tokens.radius.sm, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, cursor: 'pointer' }}>
        {previewCells.map((cell, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 1, background: cell.isInViewport ? tokens.colors.accent.teal : tokens.colors.border.default }} />
        ))}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton icon={Home} size={12} buttonSize={26} title="Home (A1)" onClick={onHome} color={tokens.colors.accent.amber} active={isAtHome} />
        <ButtonGroup>
          <IconButton icon={ChevronLeft} size={12} buttonSize={22} onClick={() => onNavigate('left')} disabled={!canMoveLeft} grouped />
          <IconButton icon={ChevronUp} size={12} buttonSize={22} onClick={() => onNavigate('up')} disabled={!canMoveUp} grouped />
          <IconButton icon={ChevronDown} size={12} buttonSize={22} onClick={() => onNavigate('down')} disabled={!canMoveDown} grouped />
          <IconButton icon={ChevronRight} size={12} buttonSize={22} onClick={() => onNavigate('right')} disabled={!canMoveRight} grouped />
        </ButtonGroup>
      </div>
      <span style={{ fontSize: 10, fontFamily: 'Monaco, monospace', color: tokens.colors.accent.blue, padding: '3px 6px', background: tokens.colors.accent.blue + '15', borderRadius: tokens.radius.sm }}>
        {String.fromCharCode(65 + position.col)}{position.row + 1}
      </span>
    </div>
  );
}

// =============================================================================
// CANVAS HEADER (Responsive - Edit/Flow collapse at <810px)
// =============================================================================

function CanvasHeader({ 
  workspace, viewGroup, viewGroupColor, isLinked,
  isEditMode, onToggleEditMode,
  flowDirection, onSetFlowDirection,
  windowMode, onSetWindowMode,
  showCoordinates, showViewGroupBorders,
  onToggleCoordinates, onToggleViewGroupBorders,
  onSelectWorkspace, onSelectViewGroup,
  width,
}) {
  const isCompact = width < BREAKPOINTS.HEADER_COMPACT;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 44,
      padding: '0 8px',
      background: tokens.colors.bg.tertiary,
      borderBottom: '1px solid ' + tokens.colors.border.subtle,
      gap: 8,
    }}>
      {/* Navigation Group */}
      <ControlGroup>
        <IconButton icon={ChevronLeft} title="Back" size={14} buttonSize={26} disabled />
        <IconButton icon={Home} title="Home" size={12} buttonSize={26} />
      </ControlGroup>
      
      {/* Breadcrumb - uses flex-shrink for gradual truncation */}
      <WorkspaceSelector workspace={workspace} onSelect={onSelectWorkspace} width={width} />
      <ChevronRight size={12} style={{ color: tokens.colors.text.disabled, flexShrink: 0 }} />
      <ViewGroupSelector viewGroup={viewGroup} color={viewGroupColor} isLinked={isLinked} onSelect={onSelectViewGroup} width={width} />
      
      {/* Edit Toggle - collapses at <810px */}
      {!isCompact && (
        <>
          <Separator height={24} margin={4} />
          <button
            onClick={onToggleEditMode}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: tokens.radius.md,
              border: isEditMode ? `1px solid ${tokens.colors.accent.blue}` : '1px solid ' + tokens.colors.border.subtle,
              background: isEditMode ? tokens.colors.accent.blue + '25' : 'transparent',
              color: isEditMode ? tokens.colors.accent.blue : tokens.colors.text.secondary,
              cursor: 'pointer', fontSize: 11, fontWeight: 500, flexShrink: 0,
            }}
          >
            <Pencil size={12} />
            {isEditMode ? 'Editing' : 'Edit'}
          </button>
          
          {/* Flow Direction */}
          <ControlGroup label="Flow">
            <ButtonGroup>
              <IconButton icon={ArrowRight} size={12} buttonSize={24} active={flowDirection === 'right'} onClick={() => onSetFlowDirection('right')} color={tokens.colors.accent.cyan} grouped />
              <IconButton icon={ArrowDown} size={12} buttonSize={24} active={flowDirection === 'down'} onClick={() => onSetFlowDirection('down')} color={tokens.colors.accent.cyan} grouped />
            </ButtonGroup>
          </ControlGroup>
        </>
      )}
      
      <div style={{ flex: 1, minWidth: 8 }} />
      
      {/* Display Options */}
      <DisplayOptionsDropdown
        showCoordinates={showCoordinates}
        showViewGroupBorders={showViewGroupBorders}
        onToggleCoordinates={onToggleCoordinates}
        onToggleViewGroupBorders={onToggleViewGroupBorders}
      />
      
      {/* Window Mode */}
      <ControlGroup>
        <ButtonGroup>
          <IconButton icon={PanelLeft} size={11} buttonSize={24} title="Dock" active={windowMode === WINDOW_MODES.DOCKED} onClick={() => onSetWindowMode(WINDOW_MODES.DOCKED)} color={tokens.colors.accent.cyan} grouped />
          <IconButton icon={Copy} size={11} buttonSize={24} title="Float" active={windowMode === WINDOW_MODES.FLOATING} onClick={() => onSetWindowMode(WINDOW_MODES.FLOATING)} color={tokens.colors.accent.purple} grouped />
          <IconButton icon={Maximize} size={11} buttonSize={24} title="Full" active={windowMode === WINDOW_MODES.FULL} onClick={() => onSetWindowMode(WINDOW_MODES.FULL)} color={tokens.colors.accent.green} grouped />
        </ButtonGroup>
        <IconButton icon={Maximize2} title="Fullscreen" size={12} buttonSize={26} />
      </ControlGroup>
    </div>
  );
}

// =============================================================================
// EDIT BAR
// =============================================================================

function EditBar({ onClose }) {
  const [activeTool, setActiveTool] = useState('select');
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: tokens.colors.accent.blue + '10', borderBottom: '1px solid ' + tokens.colors.accent.blue + '30', gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.blue, textTransform: 'uppercase', marginRight: 8 }}>Edit Mode</span>
      <ButtonGroup>
        <IconButton icon={MousePointer2} size={12} buttonSize={28} active={activeTool === 'select'} onClick={() => setActiveTool('select')} color={tokens.colors.accent.blue} grouped />
        <IconButton icon={Hand} size={12} buttonSize={28} active={activeTool === 'pan'} onClick={() => setActiveTool('pan')} color={tokens.colors.accent.blue} grouped />
      </ButtonGroup>
      <Separator height={20} />
      <IconButton icon={Merge} size={12} buttonSize={28} title="Merge" />
      <IconButton icon={Scissors} size={12} buttonSize={28} title="Split" />
      <IconButton icon={FlipHorizontal} size={12} buttonSize={28} title="Swap" />
      <Separator height={20} />
      <IconButton icon={Plus} size={12} buttonSize={28} title="Add" />
      <IconButton icon={Minus} size={12} buttonSize={28} title="Remove" />
      <div style={{ flex: 1 }} />
      <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: tokens.radius.sm, border: '1px solid ' + tokens.colors.accent.blue + '40', background: tokens.colors.accent.blue + '15', color: tokens.colors.accent.blue, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>
        <Check size={12} />Done
      </button>
    </div>
  );
}

// =============================================================================
// FOOTER 1: INSTANCE TOOLS (Undo/Redo before Active View)
// CRITICAL: Undo/Redo must NEVER disappear regardless of width!
// =============================================================================

function Footer1InstanceTools({ activeView, width }) {
  // Note: width param available for future responsive needs, but Undo/Redo stays visible
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: tokens.colors.bg.secondary, borderTop: '1px solid ' + tokens.colors.border.subtle, gap: 8 }}>
      {/* UNDO/REDO - ALWAYS VISIBLE, NEVER COLLAPSES */}
      <ButtonGroup>
        <IconButton icon={Undo} size={14} buttonSize={28} title="Undo (Ctrl+Z)" grouped />
        <IconButton icon={Redo} size={14} buttonSize={28} title="Redo (Ctrl+Shift+Z)" grouped />
      </ButtonGroup>
      
      <Separator height={24} />
      
      {/* Active View Selector */}
      <FooterSection label="Active View" color={tokens.colors.accent.purple}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: tokens.radius.md, border: '1px solid ' + tokens.colors.accent.purple + '40', background: tokens.colors.accent.purple + '10', cursor: 'pointer' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: tokens.colors.accent.purple }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: tokens.colors.text.primary, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeView}</span>
          <ChevronDown size={10} style={{ color: tokens.colors.text.muted }} />
        </button>
      </FooterSection>
      
      <Separator height={24} />
      
      {/* Instance Tools Placeholder */}
      <span style={{ color: tokens.colors.text.disabled, fontSize: 10 }}>
        [Navigation] [Camera] [Transform] [Interaction] [Data] [Color] [Advanced]
      </span>
      
      <div style={{ flex: 1 }} />
      <IconButton icon={MoreHorizontal} size={14} buttonSize={28} title="More Tools" />
    </div>
  );
}

// =============================================================================
// FOOTER 2: CANVAS CONTROLS (Wraps at <650px, Links compact at <855px)
// =============================================================================

function Footer2CanvasControls({ canvasSize, viewportSize, position, onNavigate, onNavigateHome, onOpenFullNavigator, links, onToggleLink, width }) {
  const shouldWrap = width < BREAKPOINTS.FOOTER_WRAP;
  const linksCompact = width < BREAKPOINTS.LINKS_COMPACT;
  
  // Row 1 content (always visible)
  const row1Content = (
    <>
      <FooterSection label="Focus" color={tokens.colors.text.muted}>
        <IconButton icon={Expand} size={14} buttonSize={28} title="Focus Mode" />
        <IconButton icon={List} size={14} buttonSize={28} title="View List" />
      </FooterSection>
      
      <Separator height={32} />
      
      <FooterSection label="Actions" color={tokens.colors.text.muted}>
        <IconButton icon={Camera} size={14} buttonSize={28} title="Snapshot" />
        <IconButton icon={RotateCw} size={14} buttonSize={28} title="Reset View" />
        <IconButton icon={Clipboard} size={14} buttonSize={28} title="Copy" />
        <IconButton icon={Settings} size={14} buttonSize={28} title="Settings" />
      </FooterSection>
      
      <Separator height={32} />
      
      <FooterSection label="Display" color={tokens.colors.text.muted}>
        <IconButton icon={Eye} size={14} buttonSize={28} title="Visibility" active />
        <IconButton icon={Compass} size={14} buttonSize={28} title="Orientation" />
        <IconButton icon={Layers} size={14} buttonSize={28} title="Overlays" />
      </FooterSection>
    </>
  );
  
  // Row 2 content (Navigator, Links, VR)
  const row2Content = (
    <>
      <FooterSection label="Navigator" color={tokens.colors.accent.teal}>
        <CompactNavigator 
          canvasSize={canvasSize} 
          viewportSize={viewportSize} 
          position={position} 
          onNavigate={onNavigate} 
          onHome={onNavigateHome} 
          onOpenFullNavigator={onOpenFullNavigator}
        />
      </FooterSection>
      
      <div style={{ flex: 1, minWidth: 8 }} />
      
      <FooterSection label="Links" color={tokens.colors.text.muted}>
        <ResponsiveLinks links={links} onToggleLink={onToggleLink} isCompact={linksCompact} />
      </FooterSection>
      
      <Separator height={32} />
      
      <FooterSection label="VR" color={tokens.colors.accent.purple}>
        <IconButton icon={Glasses} size={16} buttonSize={32} title="Send to VR" color={tokens.colors.accent.purple} />
      </FooterSection>
    </>
  );
  
  if (shouldWrap) {
    // Two-row layout
    return (
      <div style={{ background: tokens.colors.bg.tertiary, borderTop: '1px solid ' + tokens.colors.border.subtle }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '6px 12px 4px', gap: 12 }}>
          {row1Content}
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '4px 12px 8px', gap: 12, borderTop: '1px solid ' + tokens.colors.border.subtle }}>
          {row2Content}
        </div>
      </div>
    );
  }
  
  // Single row layout
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-end', 
      padding: '6px 12px 8px', 
      background: tokens.colors.bg.tertiary, 
      borderTop: '1px solid ' + tokens.colors.border.subtle, 
      gap: 12,
    }}>
      {row1Content}
      <Separator height={32} />
      {row2Content}
    </div>
  );
}

// =============================================================================
// INFO BAR (with Sync status)
// =============================================================================

function InfoBar({ canvasSize, viewportSize, cellSize, onOpenSizePopout, isSizePopoutOpen, onChangeCanvasCols, onChangeCanvasRows, onChangeViewportCols, onChangeViewportRows, onCloseSizePopout, onlineCount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', background: tokens.colors.bg.secondary, borderTop: '1px solid ' + tokens.colors.border.subtle, fontSize: 10, color: tokens.colors.text.muted, gap: 16, position: 'relative' }}>
      {/* Clickable Size Info */}
      <button
        onClick={onOpenSizePopout}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '2px 8px', margin: '-2px',
          borderRadius: tokens.radius.sm,
          border: isSizePopoutOpen ? '1px solid ' + tokens.colors.accent.cyan + '40' : '1px solid transparent',
          background: isSizePopoutOpen ? tokens.colors.accent.cyan + '10' : 'transparent',
          cursor: 'pointer', color: tokens.colors.text.muted, fontSize: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Grid3X3 size={10} />
          Canvas: <strong style={{ color: tokens.colors.accent.amber }}>{canvasSize.cols}×{canvasSize.rows}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Square size={10} />
          Viewport: <strong style={{ color: tokens.colors.accent.cyan }}>{viewportSize.cols}×{viewportSize.rows}</strong>
        </span>
        <span>Cell: {cellSize.width}×{cellSize.height}px</span>
      </button>
      
      {/* Size Popout */}
      {isSizePopoutOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onCloseSizePopout} />
          <div style={{ position: 'absolute', bottom: '100%', left: 12, marginBottom: 8, background: tokens.colors.bg.elevated, border: '1px solid ' + tokens.colors.border.default, borderRadius: tokens.radius.lg, padding: 16, minWidth: 280, zIndex: 200, boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.text.primary, marginBottom: 16 }}>Canvas & Viewport Size</div>
            
            {/* Canvas Size */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Grid3X3 size={12} style={{ color: tokens.colors.accent.amber }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.amber, textTransform: 'uppercase' }}>Canvas Size</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4 }}>Columns</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => onChangeCanvasCols(Math.max(1, canvasSize.cols - 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 600, color: tokens.colors.accent.amber }}>{canvasSize.cols}</span>
                    <button onClick={() => onChangeCanvasCols(Math.min(10, canvasSize.cols + 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4 }}>Rows</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => onChangeCanvasRows(Math.max(1, canvasSize.rows - 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 600, color: tokens.colors.accent.amber }}>{canvasSize.rows}</span>
                    <button onClick={() => onChangeCanvasRows(Math.min(10, canvasSize.rows + 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {['1×1', '2×2', '3×3', '4×4'].map(preset => {
                  const [c, r] = preset.split('×').map(Number);
                  const isActive = canvasSize.cols === c && canvasSize.rows === r;
                  return <button key={preset} onClick={() => { onChangeCanvasCols(c); onChangeCanvasRows(r); }} style={{ flex: 1, padding: '4px', borderRadius: 4, border: isActive ? `1px solid ${tokens.colors.accent.amber}` : '1px solid ' + tokens.colors.border.subtle, background: isActive ? tokens.colors.accent.amber + '20' : 'transparent', color: isActive ? tokens.colors.accent.amber : tokens.colors.text.muted, cursor: 'pointer', fontSize: 10 }}>{preset}</button>;
                })}
              </div>
            </div>
            
            {/* Viewport Size */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Square size={12} style={{ color: tokens.colors.accent.cyan }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.cyan, textTransform: 'uppercase' }}>Viewport Size</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4 }}>Columns</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => onChangeViewportCols(Math.max(1, viewportSize.cols - 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 600, color: tokens.colors.accent.cyan }}>{viewportSize.cols}</span>
                    <button onClick={() => onChangeViewportCols(Math.min(canvasSize.cols, viewportSize.cols + 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4 }}>Rows</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => onChangeViewportRows(Math.max(1, viewportSize.rows - 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 600, color: tokens.colors.accent.cyan }}>{viewportSize.rows}</span>
                    <button onClick={() => onChangeViewportRows(Math.min(canvasSize.rows, viewportSize.rows + 1))} style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid ' + tokens.colors.border.subtle, background: tokens.colors.bg.secondary, color: tokens.colors.text.secondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {['1×1', '1×2', '2×1', '2×2'].map(preset => {
                  const [c, r] = preset.split('×').map(Number);
                  const isActive = viewportSize.cols === c && viewportSize.rows === r;
                  const isDisabled = c > canvasSize.cols || r > canvasSize.rows;
                  return <button key={preset} onClick={() => { if (!isDisabled) { onChangeViewportCols(c); onChangeViewportRows(r); }}} disabled={isDisabled} style={{ flex: 1, padding: '4px', borderRadius: 4, border: isActive ? `1px solid ${tokens.colors.accent.cyan}` : '1px solid ' + tokens.colors.border.subtle, background: isActive ? tokens.colors.accent.cyan + '20' : 'transparent', color: isDisabled ? tokens.colors.text.disabled : isActive ? tokens.colors.accent.cyan : tokens.colors.text.muted, cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 10 }}>{preset}</button>;
                })}
              </div>
            </div>
          </div>
        </>
      )}
      
      <div style={{ flex: 1 }} />
      
      {/* Right side: Online count + Sync status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={10} />
          {onlineCount}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.colors.accent.green }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.colors.accent.green }} />
          Synced
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DEMO
// =============================================================================

export default function CanvasChromeV5Demo() {
  const [containerWidth, setContainerWidth] = useState(900);
  const [canvasSize, setCanvasSize] = useState({ cols: 3, rows: 3 });
  const [viewportSize, setViewportSize] = useState({ cols: 2, rows: 1 });
  const [position, setPosition] = useState({ col: 0, row: 0 });
  const [windowMode, setWindowMode] = useState(WINDOW_MODES.DOCKED);
  const [isEditMode, setIsEditMode] = useState(false);
  const [flowDirection, setFlowDirection] = useState('right');
  const [workspace, setWorkspace] = useState('My Workspace');
  const [viewGroup, setViewGroup] = useState('MRI Slices');
  const [viewGroupColor, setViewGroupColor] = useState(tokens.colors.accent.purple);
  const [isLinked, setIsLinked] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showViewGroupBorders, setShowViewGroupBorders] = useState(true);
  const [links, setLinks] = useState({ camera: true, filters: false, widgets: false, cursors: true, annotations: false });
  const [isSizePopoutOpen, setIsSizePopoutOpen] = useState(false);
  
  const handleNavigate = (direction) => {
    setPosition(p => {
      switch (direction) {
        case 'up': return { ...p, row: Math.max(0, p.row - 1) };
        case 'down': return { ...p, row: Math.min(canvasSize.rows - viewportSize.rows, p.row + 1) };
        case 'left': return { ...p, col: Math.max(0, p.col - 1) };
        case 'right': return { ...p, col: Math.min(canvasSize.cols - viewportSize.cols, p.col + 1) };
        default: return p;
      }
    });
  };
  
  const toggleLink = (id) => setLinks(l => ({ ...l, [id]: !l[id] }));
  
  const handleSelectViewGroup = (g) => {
    if (g) { setViewGroup(g.name); setViewGroupColor(g.color); setIsLinked(g.isLinked); }
    else { setViewGroup(null); setViewGroupColor(null); setIsLinked(false); }
  };
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg.primary, color: tokens.colors.text.primary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Controls */}
      <div style={{ padding: 16, borderBottom: '1px solid ' + tokens.colors.border.default }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Canvas Chrome v5 - Responsive Testing</div>
        <div style={{ fontSize: 11, color: tokens.colors.text.muted, marginBottom: 12 }}>
          Drag the slider to test breakpoints. Footer wraps instead of losing icons.
        </div>
        
        {/* Width Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: tokens.colors.text.secondary, minWidth: 80 }}>Width: <strong>{containerWidth}px</strong></span>
          <input
            type="range"
            min={400}
            max={1200}
            value={containerWidth}
            onChange={e => setContainerWidth(Number(e.target.value))}
            style={{ flex: 1, accentColor: tokens.colors.accent.cyan }}
          />
        </div>
        
        {/* Breakpoint indicators */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10 }}>
          <span style={{ padding: '4px 8px', borderRadius: 4, background: containerWidth < BREAKPOINTS.LINKS_COMPACT ? tokens.colors.accent.cyan + '20' : tokens.colors.bg.secondary, color: containerWidth < BREAKPOINTS.LINKS_COMPACT ? tokens.colors.accent.cyan : tokens.colors.text.muted }}>
            Links compact (&lt;{BREAKPOINTS.LINKS_COMPACT}px) {containerWidth < BREAKPOINTS.LINKS_COMPACT ? '✓' : ''}
          </span>
          <span style={{ padding: '4px 8px', borderRadius: 4, background: containerWidth < BREAKPOINTS.HEADER_COMPACT ? tokens.colors.accent.amber + '20' : tokens.colors.bg.secondary, color: containerWidth < BREAKPOINTS.HEADER_COMPACT ? tokens.colors.accent.amber : tokens.colors.text.muted }}>
            Header compact (&lt;{BREAKPOINTS.HEADER_COMPACT}px) {containerWidth < BREAKPOINTS.HEADER_COMPACT ? '✓' : ''}
          </span>
          <span style={{ padding: '4px 8px', borderRadius: 4, background: containerWidth < BREAKPOINTS.FOOTER_WRAP ? tokens.colors.accent.purple + '20' : tokens.colors.bg.secondary, color: containerWidth < BREAKPOINTS.FOOTER_WRAP ? tokens.colors.accent.purple : tokens.colors.text.muted }}>
            Footer wraps (&lt;{BREAKPOINTS.FOOTER_WRAP}px) {containerWidth < BREAKPOINTS.FOOTER_WRAP ? '✓' : ''}
          </span>
          <span style={{ padding: '4px 8px', borderRadius: 4, background: containerWidth < BREAKPOINTS.NAMES_ICON_ONLY ? tokens.colors.accent.pink + '20' : tokens.colors.bg.secondary, color: containerWidth < BREAKPOINTS.NAMES_ICON_ONLY ? tokens.colors.accent.pink : tokens.colors.text.muted }}>
            Names icon-only (&lt;{BREAKPOINTS.NAMES_ICON_ONLY}px) {containerWidth < BREAKPOINTS.NAMES_ICON_ONLY ? '✓' : ''}
          </span>
        </div>
      </div>
      
      {/* Canvas Window */}
      <div style={{ padding: 16 }}>
        <div style={{ 
          width: containerWidth, 
          border: '2px solid ' + tokens.colors.accent.cyan + '40', 
          borderRadius: tokens.radius.lg, 
          overflow: 'hidden',
          transition: 'width 0.2s ease',
        }}>
          {/* Header */}
          <CanvasHeader
            workspace={workspace}
            viewGroup={viewGroup}
            viewGroupColor={viewGroupColor}
            isLinked={isLinked}
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
            flowDirection={flowDirection}
            onSetFlowDirection={setFlowDirection}
            windowMode={windowMode}
            onSetWindowMode={setWindowMode}
            showCoordinates={showCoordinates}
            showViewGroupBorders={showViewGroupBorders}
            onToggleCoordinates={() => setShowCoordinates(!showCoordinates)}
            onToggleViewGroupBorders={() => setShowViewGroupBorders(!showViewGroupBorders)}
            onSelectWorkspace={setWorkspace}
            onSelectViewGroup={handleSelectViewGroup}
            width={containerWidth}
          />
          
          {/* Edit Bar */}
          {isEditMode && <EditBar onClose={() => setIsEditMode(false)} />}
          
          {/* Canvas Area */}
          <div style={{ height: 160, background: tokens.colors.bg.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`, gap: 6, width: '95%', height: '90%' }}>
              {['Axial Slice', 'Bones.vtp'].slice(0, viewportSize.cols * viewportSize.rows).map((name, i) => (
                <div key={i} style={{ background: tokens.colors.bg.tertiary, borderRadius: tokens.radius.md, border: i === 0 ? `2px solid ${tokens.colors.accent.purple}` : '1px solid ' + tokens.colors.border.subtle, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '4px 8px', borderBottom: '1px solid ' + tokens.colors.border.subtle, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? tokens.colors.accent.purple : tokens.colors.accent.green }} />
                    <span style={{ fontSize: 9, color: tokens.colors.text.secondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.text.disabled, fontSize: 9 }}>[3D]</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer 1 - Undo/Redo ALWAYS visible */}
          <Footer1InstanceTools activeView="Axial Slice" width={containerWidth} />
          
          {/* Footer 2 */}
          <Footer2CanvasControls
            canvasSize={canvasSize}
            viewportSize={viewportSize}
            position={position}
            onNavigate={handleNavigate}
            onNavigateHome={() => setPosition({ col: 0, row: 0 })}
            onOpenFullNavigator={() => console.log('Open full navigator')}
            links={links}
            onToggleLink={toggleLink}
            width={containerWidth}
          />
          
          {/* Info Bar */}
          <InfoBar
            canvasSize={canvasSize}
            viewportSize={viewportSize}
            cellSize={{ width: 300, height: 250 }}
            isSizePopoutOpen={isSizePopoutOpen}
            onOpenSizePopout={() => setIsSizePopoutOpen(!isSizePopoutOpen)}
            onCloseSizePopout={() => setIsSizePopoutOpen(false)}
            onChangeCanvasCols={cols => setCanvasSize(s => ({ ...s, cols }))}
            onChangeCanvasRows={rows => setCanvasSize(s => ({ ...s, rows }))}
            onChangeViewportCols={cols => setViewportSize(s => ({ ...s, cols: Math.min(cols, canvasSize.cols) }))}
            onChangeViewportRows={rows => setViewportSize(s => ({ ...s, rows: Math.min(rows, canvasSize.rows) }))}
            onlineCount={3}
          />
        </div>
      </div>
      
      {/* Breakpoint Summary */}
      <div style={{ padding: 16, borderTop: '1px solid ' + tokens.colors.border.default }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Breakpoint Summary</div>
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + tokens.colors.border.default }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: tokens.colors.text.muted }}>Breakpoint</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: tokens.colors.text.muted }}>What Changes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px 12px', color: tokens.colors.accent.cyan }}>&lt;855px</td>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.secondary }}>Links collapse to [🔗 2] button with popover</td>
            </tr>
            <tr style={{ background: tokens.colors.bg.secondary }}>
              <td style={{ padding: '8px 12px', color: tokens.colors.accent.amber }}>&lt;810px</td>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.secondary }}>Header: Edit button and Flow controls collapse</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px', color: tokens.colors.accent.purple }}>&lt;650px</td>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.secondary }}>Footer 2 wraps to two rows (no icons lost)</td>
            </tr>
            <tr style={{ background: tokens.colors.bg.secondary }}>
              <td style={{ padding: '8px 12px', color: tokens.colors.accent.pink }}>&lt;500px</td>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.secondary }}>Workspace/ViewGroup names → icon only</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.muted }}>500-810px</td>
              <td style={{ padding: '8px 12px', color: tokens.colors.text.secondary }}>Names gradually truncate (dynamic max-width)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
