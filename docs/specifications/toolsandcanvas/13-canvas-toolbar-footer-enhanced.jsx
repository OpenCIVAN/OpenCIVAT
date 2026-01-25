import React, { useState, useMemo } from 'react';

// =============================================================================
// DESIGN: Canvas Toolbar Footer (Enhanced)
// =============================================================================
// Updates:
// 1. Undo/Redo buttons added
// 2. History dropdown for recent views visited
// 3. "Open Instance Tools" button
// 4. Responsive: priority hiding, grouping, overflow menu
// =============================================================================

const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24', 
      glass: 'rgba(10, 10, 15, 0.95)',
    },
    border: { subtle: 'rgba(255,255,255,0.08)', default: 'rgba(255,255,255,0.12)' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
    accent: { 
      purple: '#a855f7', blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e', 
      amber: '#f59e0b', pink: '#ec4899', red: '#ef4444', teal: '#14b8a6',
      orange: '#f97316',
    },
  },
};

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_VIEWS = [
  { id: 'v-1', name: 'Axial Slice', color: tokens.colors.accent.purple, dataset: 'Brain MRI', type: 'vtk-slice' },
  { id: 'v-2', name: 'Sagittal', color: tokens.colors.accent.blue, dataset: 'Brain MRI', type: 'vtk-slice' },
  { id: 'v-3', name: '3D Volume', color: tokens.colors.accent.green, dataset: 'Brain MRI', type: 'vtk-volume' },
  { id: 'v-4', name: 'Tumor Overlay', color: tokens.colors.accent.pink, dataset: 'CT Scan', type: 'vtk-volume' },
];

const MOCK_HISTORY = [
  { id: 'h-1', viewId: 'v-1', name: 'Axial Slice', color: tokens.colors.accent.purple, timestamp: Date.now() - 60000 },
  { id: 'h-2', viewId: 'v-3', name: '3D Volume', color: tokens.colors.accent.green, timestamp: Date.now() - 120000 },
  { id: 'h-3', viewId: 'v-2', name: 'Sagittal', color: tokens.colors.accent.blue, timestamp: Date.now() - 300000 },
  { id: 'h-4', viewId: 'v-4', name: 'Tumor Overlay', color: tokens.colors.accent.pink, timestamp: Date.now() - 600000 },
];

const INSTANCE_TOOLS = {
  'vtk-slice': [
    { id: 'window-level', icon: '◐', label: 'Window/Level', shortcut: 'W', priority: 1 },
    { id: 'pan', icon: '✥', label: 'Pan', shortcut: 'P', priority: 1 },
    { id: 'zoom', icon: '🔍', label: 'Zoom', shortcut: 'Z', priority: 1 },
    { id: 'scroll', icon: '↕', label: 'Scroll Slices', shortcut: 'S', priority: 2 },
  ],
  'vtk-volume': [
    { id: 'rotate', icon: '↻', label: 'Rotate', shortcut: 'R', priority: 1 },
    { id: 'pan', icon: '✥', label: 'Pan', shortcut: 'P', priority: 1 },
    { id: 'zoom', icon: '🔍', label: 'Zoom', shortcut: 'Z', priority: 1 },
    { id: 'clip', icon: '✂', label: 'Clip Plane', shortcut: 'C', priority: 2 },
  ],
};

const SCENE_OVERLAYS = [
  { id: 'orientation', icon: '🧭', label: 'Orientation', shortcut: 'Shift+O', priority: 1 },
  { id: 'grid', icon: '▦', label: 'Grid', shortcut: 'Shift+G', priority: 2 },
  { id: 'axes', icon: '📐', label: 'Axes', shortcut: 'Shift+A', priority: 2 },
  { id: 'scalebar', icon: '📏', label: 'Scale Bar', shortcut: 'Shift+B', priority: 2 },
];

const MEASUREMENT_TOOLS = [
  { id: 'distance', icon: '📏', label: 'Distance', shortcut: 'Alt+D', priority: 1 },
  { id: 'angle', icon: '∠', label: 'Angle', shortcut: 'Alt+A', priority: 2 },
  { id: 'probe', icon: '📍', label: 'Probe', shortcut: 'Alt+P', priority: 2 },
];

const VIEW_CONTROLS = [
  { id: 'fit', icon: '⊡', label: 'Fit View', shortcut: 'F', priority: 1 },
  { id: 'reset', icon: '↺', label: 'Reset Camera', shortcut: 'Home', priority: 2 },
  { id: 'snapshot', icon: '📷', label: 'Snapshot', shortcut: 'Ctrl+S', priority: 2 },
];

const LINK_OPTIONS = [
  { id: 'camera', label: 'Camera', icon: '🎥' },
  { id: 'filters', label: 'Filters', icon: '⚙' },
  { id: 'widgets', label: 'Widgets', icon: '🔧' },
  { id: 'cursors', label: 'Cursors', icon: '👆' },
];

// Priority levels for responsive hiding
// 1 = Always visible
// 2 = Hide first
// 3 = Hide second (go to overflow)

// =============================================================================
// TOOLTIP
// =============================================================================

function Tooltip({ children, content, shortcut, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: position === 'top' ? '100%' : 'auto',
          top: position === 'bottom' ? '100%' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: position === 'top' ? 8 : 0,
          marginTop: position === 'bottom' ? 8 : 0,
          padding: '6px 10px',
          background: tokens.colors.bg.secondary,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: tokens.colors.text.primary }}>{content}</div>
          {shortcut && (
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, fontFamily: 'monospace', marginTop: 2 }}>
              {shortcut}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TOOL BUTTON
// =============================================================================

function ToolButton({ icon, isActive, onClick, size = 28, activeColor = tokens.colors.accent.teal, disabled }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        border: 'none',
        background: isActive 
          ? activeColor + '25' 
          : isHovered && !disabled
            ? 'rgba(255,255,255,0.08)' 
            : 'transparent',
        color: disabled 
          ? tokens.colors.text.muted + '50'
          : isActive 
            ? activeColor 
            : tokens.colors.text.secondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}

// =============================================================================
// SEPARATOR
// =============================================================================

function Separator() {
  return (
    <div style={{
      width: 1,
      height: 24,
      background: tokens.colors.border.subtle,
      margin: '0 4px',
      flexShrink: 0,
    }} />
  );
}

// =============================================================================
// ACTIVE VIEW INDICATOR WITH HISTORY
// =============================================================================

function ActiveViewIndicator({ view, views, history, onSelectView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('views'); // 'views' | 'history'
  
  if (!view) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        borderRadius: 6,
        background: tokens.colors.bg.tertiary,
        border: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        <span style={{ fontSize: 11, color: tokens.colors.text.muted }}>No view selected</span>
      </div>
    );
  }
  
  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 6,
          background: view.color + '15',
          border: `1px solid ${view.color}40`,
          cursor: 'pointer',
          minWidth: 140,
        }}
      >
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: view.color,
        }} />
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ 
            fontSize: 11, 
            fontWeight: 500, 
            color: tokens.colors.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {view.name}
          </div>
        </div>
        <span style={{ 
          fontSize: 10, 
          color: tokens.colors.text.muted,
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 4,
            zIndex: 50,
            width: 260,
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: 8,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}>
              <button
                onClick={() => setActiveTab('views')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: activeTab === 'views' ? tokens.colors.bg.tertiary : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === 'views' ? tokens.colors.accent.cyan : 'transparent'}`,
                  color: activeTab === 'views' ? tokens.colors.text.primary : tokens.colors.text.muted,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >All Views</button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: activeTab === 'history' ? tokens.colors.bg.tertiary : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === 'history' ? tokens.colors.accent.cyan : 'transparent'}`,
                  color: activeTab === 'history' ? tokens.colors.text.primary : tokens.colors.text.muted,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >🕐 Recent</button>
            </div>
            
            {/* Content */}
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {activeTab === 'views' && (
                <>
                  {views.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { onSelectView(v); setIsOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: v.id === view.id ? v.color + '15' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: tokens.colors.text.primary }}>{v.name}</div>
                        <div style={{ fontSize: 9, color: tokens.colors.text.muted }}>{v.dataset}</div>
                      </div>
                      {v.id === view.id && <span style={{ color: tokens.colors.accent.green, fontSize: 10 }}>✓</span>}
                    </button>
                  ))}
                </>
              )}
              
              {activeTab === 'history' && (
                <>
                  {history.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: tokens.colors.text.muted, fontSize: 10 }}>
                      No recent history
                    </div>
                  ) : (
                    history.map((h, i) => {
                      const v = views.find(v => v.id === h.viewId);
                      return (
                        <button
                          key={h.id}
                          onClick={() => { if (v) onSelectView(v); setIsOpen(false); }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            opacity: i === 0 ? 1 : 0.7,
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: tokens.colors.text.primary }}>{h.name}</div>
                          </div>
                          <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>{formatTime(h.timestamp)}</span>
                        </button>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// LINKS DROPDOWN
// =============================================================================

function LinksDropdown({ links, onToggleLink }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = Object.values(links).filter(Boolean).length;
  
  return (
    <div style={{ position: 'relative' }}>
      <Tooltip content="View Links" shortcut="L">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 6,
            border: `1px solid ${activeCount > 0 ? tokens.colors.accent.cyan + '40' : tokens.colors.border.subtle}`,
            background: activeCount > 0 ? tokens.colors.accent.cyan + '15' : 'transparent',
            color: activeCount > 0 ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          🔗
          {activeCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 600 }}>{activeCount}</span>
          )}
        </button>
      </Tooltip>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 4,
            zIndex: 50,
            width: 180,
            padding: 8,
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: 8,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 6, textTransform: 'uppercase' }}>
              Link with other views
            </div>
            {LINK_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onToggleLink(opt.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: links[opt.id] ? tokens.colors.accent.cyan + '15' : 'transparent',
                  color: links[opt.id] ? tokens.colors.text.primary : tokens.colors.text.muted,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 12 }}>{opt.icon}</span>
                <span style={{ flex: 1, fontSize: 10 }}>{opt.label}</span>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `1px solid ${links[opt.id] ? tokens.colors.accent.cyan : tokens.colors.border.default}`,
                  background: links[opt.id] ? tokens.colors.accent.cyan : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {links[opt.id] && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// OVERFLOW MENU
// =============================================================================

function OverflowMenu({ items, overlays, onToggleOverlay, measureTool, onSetMeasureTool }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative' }}>
      <Tooltip content="More Tools">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${tokens.colors.border.subtle}`,
            background: isOpen ? tokens.colors.bg.tertiary : 'transparent',
            color: tokens.colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}
        >
          ⋯
        </button>
      </Tooltip>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 4,
            zIndex: 50,
            width: 200,
            background: tokens.colors.bg.secondary,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: 8,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Scene Overlays */}
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 6, textTransform: 'uppercase' }}>
                Scene Overlays
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {SCENE_OVERLAYS.map(overlay => (
                  <button
                    key={overlay.id}
                    onClick={() => onToggleOverlay(overlay.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: `1px solid ${overlays[overlay.id] ? tokens.colors.accent.teal + '40' : 'transparent'}`,
                      background: overlays[overlay.id] ? tokens.colors.accent.teal + '20' : tokens.colors.bg.tertiary,
                      color: overlays[overlay.id] ? tokens.colors.accent.teal : tokens.colors.text.muted,
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    <span>{overlay.icon}</span>
                    <span>{overlay.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Measurement Tools */}
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 6, textTransform: 'uppercase' }}>
                Measurements
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {MEASUREMENT_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => onSetMeasureTool(measureTool === tool.id ? null : tool.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: `1px solid ${measureTool === tool.id ? tokens.colors.accent.amber + '40' : 'transparent'}`,
                      background: measureTool === tool.id ? tokens.colors.accent.amber + '20' : tokens.colors.bg.tertiary,
                      color: measureTool === tool.id ? tokens.colors.accent.amber : tokens.colors.text.muted,
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    <span>{tool.icon}</span>
                    <span>{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* View Controls */}
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 6, textTransform: 'uppercase' }}>
                View Controls
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {VIEW_CONTROLS.map(control => (
                  <button
                    key={control.id}
                    onClick={() => console.log(control.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: tokens.colors.bg.tertiary,
                      color: tokens.colors.text.muted,
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    <span>{control.icon}</span>
                    <span>{control.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// CANVAS TOOLBAR FOOTER
// =============================================================================

function CanvasToolbarFooter({ width = 700 }) {
  const [activeView, setActiveView] = useState(MOCK_VIEWS[0]);
  const [activeTool, setActiveTool] = useState('rotate');
  const [overlays, setOverlays] = useState({
    orientation: true,
    grid: false,
    axes: true,
    scalebar: false,
  });
  const [measureTool, setMeasureTool] = useState(null);
  const [links, setLinks] = useState({
    camera: true,
    filters: false,
    widgets: false,
    cursors: true,
  });
  const [canUndo, setCanUndo] = useState(true);
  const [canRedo, setCanRedo] = useState(false);
  
  const instanceTools = INSTANCE_TOOLS[activeView?.type] || INSTANCE_TOOLS['vtk-volume'];
  
  const toggleOverlay = (id) => {
    setOverlays(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const toggleLink = (id) => {
    setLinks(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Responsive breakpoints
  const isCompact = width < 600;
  const isMedium = width >= 600 && width < 800;
  const isFull = width >= 800;
  
  // Determine which tools to show based on width
  const visibleOverlays = isFull ? SCENE_OVERLAYS : isCompact ? [] : SCENE_OVERLAYS.filter(o => o.priority === 1);
  const visibleMeasure = isFull ? MEASUREMENT_TOOLS : isCompact ? [] : MEASUREMENT_TOOLS.filter(t => t.priority === 1);
  const visibleViewControls = isFull ? VIEW_CONTROLS : isCompact ? [] : VIEW_CONTROLS.filter(c => c.priority === 1);
  const showOverflow = !isFull;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 12px',
      background: tokens.colors.bg.glass,
      borderTop: `1px solid ${tokens.colors.border.default}`,
      minHeight: 44,
    }}>
      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: 2 }}>
        <Tooltip content="Undo" shortcut="Ctrl+Z">
          <ToolButton
            icon="↶"
            isActive={false}
            onClick={() => console.log('undo')}
            disabled={!canUndo}
            activeColor={tokens.colors.text.secondary}
          />
        </Tooltip>
        <Tooltip content="Redo" shortcut="Ctrl+Shift+Z">
          <ToolButton
            icon="↷"
            isActive={false}
            onClick={() => console.log('redo')}
            disabled={!canRedo}
            activeColor={tokens.colors.text.secondary}
          />
        </Tooltip>
      </div>
      
      <Separator />
      
      {/* Active View Indicator */}
      <ActiveViewIndicator 
        view={activeView} 
        views={MOCK_VIEWS}
        history={MOCK_HISTORY}
        onSelectView={setActiveView}
      />
      
      <Separator />
      
      {/* Instance-Specific Tools */}
      <div style={{ display: 'flex', gap: 2 }}>
        {instanceTools.map(tool => (
          <Tooltip key={tool.id} content={tool.label} shortcut={tool.shortcut}>
            <ToolButton
              icon={tool.icon}
              isActive={activeTool === tool.id}
              onClick={() => setActiveTool(tool.id)}
              activeColor={tokens.colors.accent.blue}
            />
          </Tooltip>
        ))}
      </div>
      
      <Separator />
      
      {/* Scene Overlays - Priority based */}
      {visibleOverlays.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 2 }}>
            {visibleOverlays.map(overlay => (
              <Tooltip key={overlay.id} content={overlay.label} shortcut={overlay.shortcut}>
                <ToolButton
                  icon={overlay.icon}
                  isActive={overlays[overlay.id]}
                  onClick={() => toggleOverlay(overlay.id)}
                  activeColor={tokens.colors.accent.teal}
                />
              </Tooltip>
            ))}
          </div>
          <Separator />
        </>
      )}
      
      {/* Measurement Tools - Priority based */}
      {visibleMeasure.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 2 }}>
            {visibleMeasure.map(tool => (
              <Tooltip key={tool.id} content={tool.label} shortcut={tool.shortcut}>
                <ToolButton
                  icon={tool.icon}
                  isActive={measureTool === tool.id}
                  onClick={() => setMeasureTool(measureTool === tool.id ? null : tool.id)}
                  activeColor={tokens.colors.accent.amber}
                />
              </Tooltip>
            ))}
          </div>
          <Separator />
        </>
      )}
      
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      
      {/* View Controls - Priority based */}
      {visibleViewControls.length > 0 && (
        <div style={{ display: 'flex', gap: 2 }}>
          {visibleViewControls.map(control => (
            <Tooltip key={control.id} content={control.label} shortcut={control.shortcut}>
              <ToolButton
                icon={control.icon}
                isActive={false}
                onClick={() => console.log(control.id)}
                activeColor={tokens.colors.accent.green}
              />
            </Tooltip>
          ))}
        </div>
      )}
      
      {/* Overflow Menu */}
      {showOverflow && (
        <OverflowMenu
          items={[]}
          overlays={overlays}
          onToggleOverlay={toggleOverlay}
          measureTool={measureTool}
          onSetMeasureTool={setMeasureTool}
        />
      )}
      
      <Separator />
      
      {/* Links */}
      <LinksDropdown links={links} onToggleLink={toggleLink} />
      
      {/* Open Instance Tools */}
      <Tooltip content="Open Instance Tools" shortcut="I">
        <button
          onClick={() => console.log('open instance tools')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${tokens.colors.accent.amber}40`,
            background: tokens.colors.accent.amber + '15',
            color: tokens.colors.accent.amber,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          🔧
          {!isCompact && <span>Tools</span>}
        </button>
      </Tooltip>
    </div>
  );
}

// =============================================================================
// MOCK CANVAS WITH FOOTER
// =============================================================================

function MockCanvasWithFooter({ width }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: width,
      height: 400,
      background: tokens.colors.bg.primary,
      borderRadius: 12,
      border: `1px solid ${tokens.colors.border.default}`,
      overflow: 'hidden',
      transition: 'width 0.3s ease',
    }}>
      {/* Canvas Grid Area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 4,
        padding: 4,
        background: tokens.colors.bg.secondary,
      }}>
        {MOCK_VIEWS.map((view, i) => (
          <div 
            key={view.id}
            style={{
              background: tokens.colors.bg.tertiary,
              borderRadius: 8,
              border: `1px solid ${i === 0 ? view.color + '60' : tokens.colors.border.subtle}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              background: tokens.colors.bg.glass,
              borderBottom: `1px solid ${tokens.colors.border.subtle}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: view.color }} />
              <span style={{ fontSize: 9, color: tokens.colors.text.secondary, flex: 1 }}>{view.name}</span>
            </div>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.colors.text.muted,
              fontSize: 9,
            }}>
              {view.type}
            </div>
          </div>
        ))}
      </div>
      
      {/* Canvas Toolbar Footer */}
      <CanvasToolbarFooter width={width} />
    </div>
  );
}

// =============================================================================
// DEMO
// =============================================================================

export default function CanvasToolbarFooterEnhancedArtifact() {
  const [width, setWidth] = useState(700);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bg.primary,
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: tokens.colors.accent.cyan + '30', color: tokens.colors.accent.cyan,
            fontSize: 10, fontWeight: 600,
          }}>DESIGN 5 - FINAL</span>
        </div>
        <h1 style={{ color: tokens.colors.text.primary, fontSize: 20, marginBottom: 8 }}>
          Canvas Toolbar Footer (Enhanced)
        </h1>
        <p style={{ color: tokens.colors.text.muted, fontSize: 12, maxWidth: 600 }}>
          Added Undo/Redo, History dropdown, Open Instance Tools button, and responsive overflow.
        </p>
      </div>
      
      {/* Width Control */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: tokens.colors.text.muted }}>Canvas Width:</span>
        <input
          type="range"
          min={400}
          max={900}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{ width: 200 }}
        />
        <span style={{ 
          fontSize: 11, 
          color: width < 600 ? tokens.colors.accent.red : width < 800 ? tokens.colors.accent.amber : tokens.colors.accent.green,
          fontWeight: 600,
        }}>
          {width}px ({width < 600 ? 'Compact' : width < 800 ? 'Medium' : 'Full'})
        </span>
      </div>
      
      {/* Canvas Preview */}
      <MockCanvasWithFooter width={width} />
      
      {/* New Features */}
      <div style={{ marginTop: 24, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 650 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.green, marginBottom: 12 }}>NEW FEATURES</div>
        <table style={{ width: '100%', fontSize: 10, color: tokens.colors.text.secondary, borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>Undo/Redo</td>
              <td style={{ padding: '8px' }}>↶ ↷ buttons at the start, with Ctrl+Z / Ctrl+Shift+Z shortcuts</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>History Dropdown</td>
              <td style={{ padding: '8px' }}>Active View dropdown has "🕐 Recent" tab showing visited views</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>Open Instance Tools</td>
              <td style={{ padding: '8px' }}>🔧 Tools button opens full Instance Tools panel (shortcut: I)</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', fontWeight: 500 }}>Responsive Overflow</td>
              <td style={{ padding: '8px' }}>Tools collapse based on priority. ⋯ overflow menu for hidden tools.</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Responsive Behavior */}
      <div style={{ marginTop: 16, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 650 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.amber, marginBottom: 12 }}>RESPONSIVE BEHAVIOR</div>
        <table style={{ width: '100%', fontSize: 10, color: tokens.colors.text.secondary, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Width</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Mode</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Visible</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px' }}>≥800px</td>
              <td style={{ padding: '4px 8px', color: tokens.colors.accent.green }}>Full</td>
              <td style={{ padding: '4px 8px' }}>All tools visible</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}>600-800px</td>
              <td style={{ padding: '4px 8px', color: tokens.colors.accent.amber }}>Medium</td>
              <td style={{ padding: '4px 8px' }}>Priority 1 tools only + overflow menu</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}>&lt;600px</td>
              <td style={{ padding: '4px 8px', color: tokens.colors.accent.red }}>Compact</td>
              <td style={{ padding: '4px 8px' }}>Essential only + overflow menu for all tools</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Try It */}
      <div style={{
        marginTop: 16, padding: 16, background: tokens.colors.accent.blue + '10',
        borderRadius: 8, border: `1px solid ${tokens.colors.accent.blue}30`, maxWidth: 650,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.blue, marginBottom: 8 }}>TRY IT</div>
        <ul style={{ fontSize: 11, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li><strong>Drag the slider</strong> to change canvas width and see responsive behavior</li>
          <li>Click <strong>Active View dropdown</strong> → switch to "🕐 Recent" tab</li>
          <li>Click <strong>⋯ overflow menu</strong> (appears in compact/medium modes)</li>
          <li>Click <strong>🔧 Tools</strong> button to "open" Instance Tools panel</li>
          <li>Notice Undo/Redo at the start of the toolbar</li>
        </ul>
      </div>
    </div>
  );
}
