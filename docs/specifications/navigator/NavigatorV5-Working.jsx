import React, { useState, useMemo } from 'react';

const colors = {
  bg: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a24',
  border: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.4)',
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  pink: '#ec4899',
  cyan: '#22d3ee',
  orange: '#f97316',
  teal: '#14b8a6',
};

const VIEWGROUPS = [
  { id: 'vg-1', name: 'Brain Analysis', color: colors.purple, row: 0, col: 0, rowSpan: 2, colSpan: 2 },
  { id: 'vg-2', name: 'Tumor Review', color: colors.pink, row: 0, col: 2, rowSpan: 1, colSpan: 2 },
  { id: 'vg-3', name: 'Data Tables', color: colors.cyan, row: 1, col: 2, rowSpan: 1, colSpan: 2 },
  { id: 'vg-4', name: 'Comparison', color: colors.amber, row: 2, col: 0, rowSpan: 2, colSpan: 3 },
];

const VIEWS = [
  { id: 'v-1', name: 'Axial Slice', color: colors.purple, instanceType: 'vtk-slice', position: 'A1', groupId: 'vg-1', starredWorkspace: true, linkedCount: 2 },
  { id: 'v-2', name: 'Sagittal', color: colors.blue, instanceType: 'vtk-slice', position: 'B1', groupId: 'vg-1', linkedCount: 2 },
  { id: 'v-3', name: '3D Volume', color: colors.green, instanceType: 'vtk-volume', position: 'A2', groupId: 'vg-1', starredWorkspace: true, starredPersonal: true },
  { id: 'v-4', name: 'Tumor Overlay', color: colors.pink, instanceType: 'vtk-volume', position: 'C1', groupId: 'vg-2', starredPersonal: true, isShared: true },
  { id: 'v-5', name: 'Data Table', color: colors.cyan, instanceType: 'table', position: 'C2', groupId: 'vg-3' },
  { id: 'v-6', name: 'Full Skull', color: colors.orange, instanceType: 'vtk-mesh', position: 'A3', groupId: 'vg-4', isLocked: true },
  { id: 'v-7', name: 'Vessel Tree', color: colors.teal, instanceType: 'vtk-mesh', position: 'B3', groupId: 'vg-4' },
  { id: 'v-8', name: 'Coronal View', color: colors.amber, instanceType: 'vtk-slice', position: null, groupId: null, starredPersonal: true },
];

const COLLABORATORS = [
  { id: 'c-1', name: 'Alice', position: { row: 0, col: 2 }, avatar: '👩' },
  { id: 'c-2', name: 'Bob', position: { row: 2, col: 1 }, avatar: '👨' },
];

const BOOKMARKS = [
  { id: 'bm-1', name: 'Pre-surgery baseline', viewGroupId: 'vg-1', isStarred: true },
  { id: 'bm-2', name: 'Tumor boundary review', viewGroupId: 'vg-2', isStarred: true },
  { id: 'bm-3', name: 'Final approval state', viewGroupId: 'vg-1', isStarred: false },
];

function ViewItemRow({ view, isSelected, onSelect, onNavigate }) {
  const isPlaced = Boolean(view.position);
  const hasLinks = (view.linkedCount || 0) > 0;
  const group = VIEWGROUPS.find(g => g.id === view.groupId);
  
  const getTypeIcon = (type) => {
    if (!type) return '□';
    if (type.includes('slice')) return '▤';
    if (type.includes('volume')) return '▣';
    if (type.includes('mesh')) return '△';
    if (type === 'table') return '▦';
    return '□';
  };

  return (
    <div
      onClick={() => onSelect && onSelect(view.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: isSelected ? `${view.color}15` : 'transparent',
        borderLeft: `3px solid ${isSelected ? view.color : 'transparent'}`,
        cursor: 'pointer',
        opacity: isPlaced ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 10, color: colors.textMuted }}>⋮⋮</span>
      
      <div style={{ position: 'relative', width: 32, height: 32 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 4,
          background: `${view.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12,
        }}>
          {getTypeIcon(view.instanceType)}
        </div>
        <div style={{
          position: 'absolute', top: -2, left: -2, right: -2, bottom: -2,
          borderRadius: 6,
          border: isPlaced ? `2px solid ${view.color}` : `1px dashed ${colors.border}`,
          pointerEvents: 'none',
        }} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500,
          color: isPlaced ? colors.text : colors.textMuted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {view.name}
        </div>
        <div style={{ fontSize: 10, color: colors.textMuted }}>
          {group ? group.name : 'Not placed'}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {view.starredWorkspace && <span style={{ fontSize: 10 }}>📁</span>}
        {view.starredPersonal && <span style={{ fontSize: 10 }}>🌐</span>}
        {view.isShared && <span style={{ fontSize: 10 }}>👥</span>}
        {view.isLocked && <span style={{ fontSize: 10 }}>🔒</span>}
        {hasLinks && <span style={{ fontSize: 10 }}>🔗</span>}
      </div>
      
      {view.position && (
        <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: `${view.color}30`, color: view.color,
          fontSize: 10, fontWeight: 500, fontFamily: 'monospace',
        }}>
          {view.position}
        </span>
      )}
      
      {isPlaced && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(view.id); }}
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, border: `1px solid ${colors.border}`,
            background: 'transparent', color: colors.textMuted, fontSize: 10, cursor: 'pointer',
          }}
        >🎯</button>
      )}
    </div>
  );
}

function InactiveViewRow({ view, onPlace }) {
  return (
    <div
      onClick={() => onPlace && onPlace(view.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', opacity: 0.6, cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 10, color: colors.textMuted }}>⋮⋮</span>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: `${view.color}20`, border: `1px dashed ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
      }}>+</div>
      <span style={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>{view.name}</span>
      <span style={{ fontSize: 10, color: colors.textMuted, padding: '2px 6px', background: colors.bgTertiary, borderRadius: 4 }}>
        Click to place
      </span>
    </div>
  );
}

function Spinner({ value, onChange, min, max, color }) {
  const btn = {
    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.bgTertiary,
    color: colors.textMuted, fontSize: 10, cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={btn}>−</button>
      <span style={{ minWidth: 16, textAlign: 'center', fontSize: 11, fontWeight: 600, color: color, fontFamily: 'monospace' }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={btn}>+</button>
    </div>
  );
}

export default function NavigatorV5() {
  const [activeTab, setActiveTab] = useState('minimap');
  const [focusMode, setFocusMode] = useState('groups');
  const [selectedGroupId, setSelectedGroupId] = useState('vg-1');
  const [selectedViewId, setSelectedViewId] = useState(null);
  const [viewFilter, setViewFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPosition, setCurrentPosition] = useState({ row: 0, col: 0 });
  const [homePosition, setHomePosition] = useState({ row: 0, col: 0 });
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewportSize, setViewportSize] = useState({ rows: 3, cols: 3 });
  const [canvasSize, setCanvasSize] = useState({ rows: 4, cols: 4 });

  const selectedGroup = VIEWGROUPS.find(g => g.id === selectedGroupId);
  const selectedView = VIEWS.find(v => v.id === selectedViewId);
  const groupViews = (groupId) => VIEWS.filter(v => v.groupId === groupId);
  const isAtHome = currentPosition.row === homePosition.row && currentPosition.col === homePosition.col;
  const formatPosition = (row, col) => String.fromCharCode(65 + col) + (row + 1);
  
  const getGroupAt = (row, col) => VIEWGROUPS.find(g =>
    row >= g.row && row < g.row + g.rowSpan && col >= g.col && col < g.col + g.colSpan
  );
  
  const isInViewport = (row, col) => 
    row >= currentPosition.row && row < currentPosition.row + viewportSize.rows &&
    col >= currentPosition.col && col < currentPosition.col + viewportSize.cols;

  const getCollaboratorsAt = (row, col) => COLLABORATORS.filter(c => c.position.row === row && c.position.col === col);

  const handleNavigate = (direction) => {
    setCurrentPosition(prev => {
      const next = { ...prev };
      if (direction === 'up') next.row = Math.max(0, prev.row - 1);
      if (direction === 'down') next.row = Math.min(canvasSize.rows - 1, prev.row + 1);
      if (direction === 'left') next.col = Math.max(0, prev.col - 1);
      if (direction === 'right') next.col = Math.min(canvasSize.cols - 1, prev.col + 1);
      return next;
    });
  };

  const handleCellClick = (row, col, group) => {
    if (isSettingHome) {
      setHomePosition({ row, col });
      setIsSettingHome(false);
      return;
    }
    setCurrentPosition({ row, col });
    if (group) {
      setSelectedGroupId(group.id);
      if (focusMode === 'groups') setSelectedViewId(null);
    }
  };

  const handleSelectView = (viewId) => {
    setSelectedViewId(viewId);
    setFocusMode('views');
  };

  const handleNavigateToView = (viewId) => {
    const view = VIEWS.find(v => v.id === viewId);
    if (view && view.groupId) {
      const group = VIEWGROUPS.find(g => g.id === view.groupId);
      if (group) setCurrentPosition({ row: group.row, col: group.col });
    }
  };

  const filteredViews = useMemo(() => {
    let result = [...VIEWS];
    if (viewFilter === 'active') result = result.filter(v => v.position);
    else if (viewFilter === 'inactive') result = result.filter(v => !v.position);
    else if (viewFilter === 'starred') result = result.filter(v => v.starredWorkspace || v.starredPersonal);
    else if (viewFilter === 'linked') result = result.filter(v => (v.linkedCount || 0) > 0);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.name.toLowerCase().includes(q));
    }
    return result;
  }, [viewFilter, searchQuery]);

  const activeViews = filteredViews.filter(v => v.position);
  const inactiveViews = filteredViews.filter(v => !v.position);

  const dpadBtn = {
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.bgTertiary,
    color: colors.textSecondary, fontSize: 10, cursor: 'pointer',
  };
  
  const smallBtn = {
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, border: `1px solid ${colors.border}`, background: colors.bgTertiary,
    color: colors.textMuted, fontSize: 11, cursor: 'pointer',
  };

  // Build grid cells
  const renderGridCells = () => {
    const cells = [];
    for (let idx = 0; idx < canvasSize.rows * canvasSize.cols; idx++) {
      const row = Math.floor(idx / canvasSize.cols);
      const col = idx % canvasSize.cols;
      const group = getGroupAt(row, col);
      const collabs = getCollaboratorsAt(row, col);
      const inViewport = isInViewport(row, col);
      const isHome = homePosition.row === row && homePosition.col === col;
      const isTopLeft = group && row === group.row && col === group.col;
      
      if (group && !isTopLeft) continue;
      
      const views = group ? groupViews(group.id) : [];
      const isSelectedGroup = group && group.id === selectedGroupId;

      if (focusMode === 'views' && group) {
        cells.push(
          <div
            key={idx}
            style={{
              gridRow: `span ${group.rowSpan}`,
              gridColumn: `span ${group.colSpan}`,
              display: 'grid',
              gridTemplateColumns: group.colSpan > 1 ? '1fr 1fr' : '1fr',
              gridTemplateRows: group.rowSpan > 1 ? '1fr 1fr' : '1fr',
              gap: 2, padding: 3,
              background: `${group.color}15`,
              border: `1px solid ${group.color}40`,
              borderRadius: 4,
              opacity: inViewport ? 1 : 0.5,
              position: 'relative',
            }}
          >
            {views.slice(0, 4).map(view => (
              <div
                key={view.id}
                onClick={() => handleSelectView(view.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: selectedViewId === view.id ? `${view.color}50` : `${view.color}25`,
                  border: `2px solid ${selectedViewId === view.id ? view.color : 'transparent'}`,
                  borderRadius: 3, cursor: 'pointer', padding: 2,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: view.color }} />
                <span style={{ fontSize: 6, color: colors.textMuted, marginTop: 1 }}>{view.name.split(' ')[0]}</span>
              </div>
            ))}
            {collabs.length > 0 && (
              <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 1 }}>
                {collabs.map(c => <span key={c.id} style={{ fontSize: 10 }}>{c.avatar}</span>)}
              </div>
            )}
          </div>
        );
      } else {
        cells.push(
          <div
            key={idx}
            onClick={() => handleCellClick(row, col, group)}
            style={{
              gridRow: group ? `span ${group.rowSpan}` : 'span 1',
              gridColumn: group ? `span ${group.colSpan}` : 'span 1',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: group 
                ? `${group.color}${isSelectedGroup ? '40' : '20'}`
                : isHome ? `${colors.amber}15` : 'rgba(255,255,255,0.02)',
              border: `2px solid ${
                group ? (isSelectedGroup ? group.color : `${group.color}50`) : 
                isHome ? `${colors.amber}50` : colors.border
              }`,
              borderRadius: 4,
              cursor: isSettingHome ? 'crosshair' : 'pointer',
              opacity: inViewport ? 1 : 0.5,
              position: 'relative',
            }}
          >
            {group ? (
              <>
                <span style={{ fontSize: 8, fontWeight: 600, color: group.color, textAlign: 'center' }}>{group.name}</span>
                <span style={{ fontSize: 7, color: colors.textMuted }}>{views.length} views</span>
              </>
            ) : isHome ? (
              <span style={{ fontSize: 10, color: colors.amber }}>🏠</span>
            ) : null}
            {isHome && group && (
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: colors.amber }} />
            )}
            {collabs.length > 0 && (
              <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 1 }}>
                {collabs.map(c => <span key={c.id} style={{ fontSize: 10 }}>{c.avatar}</span>)}
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div style={{
      width: 340, minHeight: 650, background: colors.bg, borderRadius: 8, overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif', color: colors.text, display: 'flex', flexDirection: 'column',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '10px 14px',
        background: `linear-gradient(135deg, ${colors.blue}20, transparent)`,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>🧭 Navigator</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', background: colors.bgTertiary, borderRadius: 6, padding: 2 }}>
          {['groups', 'views'].map(mode => (
            <button
              key={mode}
              onClick={() => setFocusMode(mode)}
              style={{
                padding: '5px 10px', borderRadius: 4, border: 'none',
                background: focusMode === mode ? colors.bgSecondary : 'transparent',
                color: focusMode === mode ? colors.text : colors.textMuted,
                fontSize: 10, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {mode === 'groups' ? '⊞' : '👁'} {mode}
            </button>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: colors.bgSecondary, borderBottom: `1px solid ${colors.border}` }}>
        {[
          { id: 'minimap', label: '🗺️ Map' },
          { id: 'views', label: '👁️ Views' },
          { id: 'bookmarks', label: '🔖 Marks' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px 8px', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${colors.blue}` : '2px solid transparent',
              background: activeTab === tab.id ? colors.bg : 'transparent',
              color: activeTab === tab.id ? colors.blue : colors.textMuted,
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* MINIMAP TAB */}
        {activeTab === 'minimap' && (
          <>
            {isSettingHome && (
              <div style={{
                padding: '8px 12px', background: `${colors.amber}20`, borderBottom: `1px solid ${colors.amber}40`,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: colors.amber,
              }}>
                <span>🎯</span>
                <span style={{ flex: 1 }}>Click a cell to set as home</span>
                <button
                  onClick={() => setIsSettingHome(false)}
                  style={{ padding: '3px 8px', borderRadius: 4, border: `1px solid ${colors.amber}`, background: 'transparent', color: colors.amber, fontSize: 10, cursor: 'pointer' }}
                >Cancel</button>
              </div>
            )}

            {/* Minimap Grid */}
            <div style={{ padding: 10, background: colors.bgTertiary }}>
              <div style={{
                display: 'grid',
                gridTemplateRows: `repeat(${canvasSize.rows}, 1fr)`,
                gridTemplateColumns: `repeat(${canvasSize.cols}, 1fr)`,
                gap: 3,
                minHeight: 200,
                position: 'relative',
              }}>
                {/* Viewport Indicator */}
                <div style={{
                  position: 'absolute',
                  top: `${(currentPosition.row / canvasSize.rows) * 100}%`,
                  left: `${(currentPosition.col / canvasSize.cols) * 100}%`,
                  width: `${(viewportSize.cols / canvasSize.cols) * 100}%`,
                  height: `${(viewportSize.rows / canvasSize.rows) * 100}%`,
                  border: `2px solid ${colors.amber}`,
                  borderRadius: 4,
                  pointerEvents: 'none',
                  boxShadow: `0 0 12px ${colors.amber}50`,
                  zIndex: 10,
                }} />
                {renderGridCells()}
              </div>
            </div>

            {/* D-PAD + POSITION */}
            <div style={{ display: 'flex', gap: 12, padding: '10px 12px', background: colors.bgSecondary, borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button onClick={() => handleNavigate('up')} style={dpadBtn}>▲</button>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => handleNavigate('left')} style={dpadBtn}>◀</button>
                  <button onClick={() => setCurrentPosition({ ...homePosition })} style={{
                    ...dpadBtn,
                    background: isAtHome ? `${colors.amber}30` : colors.bgTertiary,
                    color: isAtHome ? colors.amber : colors.textMuted,
                    border: `1px solid ${isAtHome ? `${colors.amber}50` : colors.border}`,
                  }}>🏠</button>
                  <button onClick={() => handleNavigate('right')} style={dpadBtn}>▶</button>
                </div>
                <button onClick={() => handleNavigate('down')} style={dpadBtn}>▼</button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: colors.textMuted, width: 50 }}>Position:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.teal, fontFamily: 'monospace' }}>
                    {formatPosition(currentPosition.row, currentPosition.col)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: colors.textMuted, width: 50 }}>Home:</span>
                  <span style={{ fontSize: 11, color: isAtHome ? colors.amber : colors.textMuted, fontFamily: 'monospace' }}>
                    {formatPosition(homePosition.row, homePosition.col)}{isAtHome ? ' ✓' : ''}
                  </span>
                  <button onClick={() => setIsSettingHome(true)} style={{
                    padding: '2px 6px', borderRadius: 3, border: `1px solid ${colors.border}`,
                    background: 'transparent', color: colors.textMuted, fontSize: 9, cursor: 'pointer', marginLeft: 'auto',
                  }}>Set Home</button>
                </div>
              </div>
            </div>

            {/* ZOOM + SIZE */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: colors.bgSecondary, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: colors.textMuted }}>Zoom:</span>
                <button onClick={() => setZoomLevel(z => Math.max(25, z - 25))} style={smallBtn}>−</button>
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.textSecondary, minWidth: 36, textAlign: 'center', fontFamily: 'monospace' }}>{zoomLevel}%</span>
                <button onClick={() => setZoomLevel(z => Math.min(200, z + 25))} style={smallBtn}>+</button>
              </div>
              <div style={{ width: 1, height: 16, background: colors.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: colors.green }}>View:</span>
                <Spinner value={viewportSize.cols} onChange={v => setViewportSize(s => ({ ...s, cols: v }))} min={1} max={6} color={colors.green} />
                <span style={{ fontSize: 9, color: colors.textMuted }}>×</span>
                <Spinner value={viewportSize.rows} onChange={v => setViewportSize(s => ({ ...s, rows: v }))} min={1} max={6} color={colors.green} />
              </div>
              <div style={{ width: 1, height: 16, background: colors.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: colors.purple }}>Canvas:</span>
                <Spinner value={canvasSize.cols} onChange={v => setCanvasSize(s => ({ ...s, cols: v }))} min={1} max={12} color={colors.purple} />
                <span style={{ fontSize: 9, color: colors.textMuted }}>×</span>
                <Spinner value={canvasSize.rows} onChange={v => setCanvasSize(s => ({ ...s, rows: v }))} min={1} max={12} color={colors.purple} />
              </div>
            </div>
          </>
        )}

        {/* VIEWS TAB */}
        {activeTab === 'views' && (
          <>
            <div style={{ padding: '8px 12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                background: colors.bgTertiary, borderRadius: 6, border: `1px solid ${colors.border}`,
              }}>
                <span style={{ fontSize: 12 }}>🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search views..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: colors.text, fontSize: 11 }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 10 }}>✕</button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '0 12px 8px', borderBottom: `1px solid ${colors.border}` }}>
              {[
                { id: 'all', label: 'All', count: VIEWS.length, color: colors.purple },
                { id: 'active', label: 'Active', count: VIEWS.filter(v => v.position).length, color: colors.green },
                { id: 'inactive', label: 'Inactive', count: VIEWS.filter(v => !v.position).length, color: colors.textMuted },
                { id: 'starred', label: '★', count: VIEWS.filter(v => v.starredWorkspace || v.starredPersonal).length, color: colors.amber },
                { id: 'linked', label: '🔗', count: VIEWS.filter(v => (v.linkedCount || 0) > 0).length, color: colors.teal },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setViewFilter(f.id)}
                  style={{
                    padding: '4px 8px', borderRadius: 4,
                    border: `1px solid ${viewFilter === f.id ? f.color : colors.border}`,
                    background: viewFilter === f.id ? `${f.color}20` : 'transparent',
                    color: viewFilter === f.id ? f.color : colors.textMuted,
                    fontSize: 10, cursor: 'pointer',
                  }}
                >{f.label} ({f.count})</button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeViews.length > 0 && (
                <>
                  <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 600, color: colors.green, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>● ON CANVAS</span>
                    <span style={{ padding: '1px 5px', background: `${colors.green}20`, borderRadius: 8, fontSize: 9 }}>{activeViews.length}</span>
                  </div>
                  {activeViews.map(view => (
                    <ViewItemRow key={view.id} view={view} isSelected={selectedViewId === view.id} onSelect={handleSelectView} onNavigate={handleNavigateToView} />
                  ))}
                </>
              )}

              {inactiveViews.length > 0 && viewFilter !== 'active' && (
                <>
                  <div style={{ padding: '12px 12px 4px', fontSize: 10, fontWeight: 600, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>○ NOT PLACED</span>
                    <span style={{ padding: '1px 5px', background: colors.bgTertiary, borderRadius: 8, fontSize: 9 }}>{inactiveViews.length}</span>
                  </div>
                  {inactiveViews.map(view => (
                    <InactiveViewRow key={view.id} view={view} onPlace={(id) => console.log('Place:', id)} />
                  ))}
                </>
              )}

              {filteredViews.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: colors.textMuted }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 12 }}>No views match</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            <div style={{ padding: '4px 12px 8px', fontSize: 10, fontWeight: 600, color: colors.textMuted }}>★ STARRED</div>
            {BOOKMARKS.filter(b => b.isStarred).map(bm => {
              const group = VIEWGROUPS.find(g => g.id === bm.viewGroupId);
              return (
                <div key={bm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, color: colors.amber }}>⭐</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{bm.name}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: group ? group.color : colors.textMuted }} />
                      {group ? group.name : 'Unknown'}
                    </div>
                  </div>
                  <button style={smallBtn}>▶</button>
                </div>
              );
            })}

            <div style={{ padding: '12px 12px 8px', fontSize: 10, fontWeight: 600, color: colors.textMuted }}>ALL BOOKMARKS</div>
            {BOOKMARKS.filter(b => !b.isStarred).map(bm => {
              const group = VIEWGROUPS.find(g => g.id === bm.viewGroupId);
              return (
                <div key={bm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{bm.name}</div>
                    <div style={{ fontSize: 10, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: group ? group.color : colors.textMuted }} />
                      {group ? group.name : 'Unknown'}
                    </div>
                  </div>
                  <button style={smallBtn}>▶</button>
                </div>
              );
            })}

            <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
              <button style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: colors.amber, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>🔖 New Bookmark</button>
            </div>
          </div>
        )}
      </div>

      {/* GROUP CONTROLS */}
      {selectedGroup && focusMode === 'groups' && activeTab === 'minimap' && (
        <div style={{ padding: 12, background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: selectedGroup.color }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedGroup.name}</span>
            <span style={{ fontSize: 10, color: colors.textMuted }}>{groupViews(selectedGroup.id).length} views</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {groupViews(selectedGroup.id).map(v => (
              <span key={v.id} onClick={() => handleSelectView(v.id)} style={{
                padding: '3px 8px', borderRadius: 4, background: colors.bgTertiary,
                fontSize: 10, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.color }} />
                {v.name}
              </span>
            ))}
          </div>
          <button style={{
            width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none',
            background: selectedGroup.color, color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>🎯 Focus Group</button>
        </div>
      )}

      {/* VIEW INFO */}
      {selectedView && focusMode === 'views' && (
        <div style={{ padding: 12, background: colors.bgSecondary, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedView.color, boxShadow: `0 0 6px ${selectedView.color}` }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedView.name}</span>
            <span style={{ fontSize: 10, color: colors.textMuted }}>({selectedView.instanceType})</span>
            {selectedView.position && (
              <span style={{ padding: '2px 6px', borderRadius: 4, background: `${selectedView.color}30`, color: selectedView.color, fontSize: 10 }}>{selectedView.position}</span>
            )}
            <div style={{ flex: 1 }} />
            {selectedView.starredWorkspace && <span>📁</span>}
            {selectedView.starredPersonal && <span>🌐</span>}
            {(selectedView.linkedCount || 0) > 0 && <span>🔗</span>}
          </div>
          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 6 }}>
            → Use Instance Tools to adjust settings
          </div>
        </div>
      )}
    </div>
  );
}
