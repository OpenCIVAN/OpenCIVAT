import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const tokens = {
  bgPrimary: '#0d0d12',
  bgSecondary: '#16161f',
  bgTertiary: '#1e1e2a',
  bgHover: '#252532',
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
  accentOrange: '#fb923c',
};

// ============================================================================
// SVG ICONS
// ============================================================================
const Icons = {
  chevronDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>,
  chevronUp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>,
  chevronRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>,
  grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  maximize: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  layers: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  camera: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  filter: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  target: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  edit3: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
  move: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>,
  sliders: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>,
  x: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  link: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  copy: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  settings: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  snapshot: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M3 9h2M19 9h2M9 3v2M9 19v2M15 3v2M15 19v2" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
  cube: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
  activity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  box: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
  search: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  plus: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  arrowUpDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>,
};

const DirectionIcons = { bidirectional: '↔', parent: '→', child: '←' };

// ============================================================================
// LINK TYPES
// ============================================================================
const LINK_TYPES = [
  { id: 'camera', icon: Icons.camera, label: 'Camera', color: tokens.accentTeal },
  { id: 'filter', icon: Icons.filter, label: 'Filters', color: tokens.accentAmber },
  { id: 'selection', icon: Icons.target, label: 'Selection', color: tokens.accentPurple },
  { id: 'annotations', icon: Icons.edit3, label: 'Annotations', color: tokens.accentPink },
  { id: 'transforms', icon: Icons.move, label: 'Transforms', color: tokens.accentCyan },
  { id: 'params', icon: Icons.sliders, label: 'Parameters', color: tokens.accentOrange },
];

// ============================================================================
// MOCK DATA
// ============================================================================
const createInitialOnCanvas = () => [
  { id: 'v1', name: 'Brain Volume', type: 'volume', color: tokens.accentBlue, position: { col: 0, row: 0 }, links: { camera: { target: 'v2', direction: 'bidirectional' }, filter: null, selection: null, annotations: null, transforms: null, params: null } },
  { id: 'v2', name: 'Sagittal Slice', type: 'slice', color: tokens.accentTeal, position: { col: 1, row: 0 }, links: { camera: { target: 'v1', direction: 'bidirectional' }, filter: { target: 'v3', direction: 'bidirectional' }, selection: null, annotations: null, transforms: null, params: null } },
  { id: 'v3', name: 'Axial Slice', type: 'slice', color: tokens.accentAmber, position: { col: 0, row: 1 }, links: { camera: null, filter: { target: 'v2', direction: 'bidirectional' }, selection: null, annotations: null, transforms: null, params: null } },
  { id: 'v4', name: 'Cell Histogram', type: 'chart', color: tokens.accentPurple, position: { col: 1, row: 1 }, links: { camera: null, filter: null, selection: null, annotations: null, transforms: null, params: null } },
  { id: 'v5', name: 'Correlation Matrix', type: 'chart', color: tokens.accentCyan, position: { col: 2, row: 0 }, links: { camera: null, filter: null, selection: null, annotations: null, transforms: null, params: null } },
];

const createInitialAvailable = () => [
  { id: 'av1', name: 'Coronal Slice', type: 'slice', color: tokens.accentGreen },
  { id: 'av2', name: 'Surface Mesh', type: 'mesh', color: tokens.accentPink },
  { id: 'av3', name: 'Point Cloud', type: 'points', color: tokens.accentRed },
];

const viewTypeIcons = { volume: Icons.cube, slice: Icons.layers, chart: Icons.activity, mesh: Icons.box, points: Icons.target };

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  colorDot: (color, size = 10) => ({ width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color, flexShrink: 0 }),
  divider: { width: '1px', height: '28px', background: tokens.borderSubtle, margin: '0 8px', flexShrink: 0 },
  popover: { position: 'absolute', background: tokens.bgSecondary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden' },
  dropdownButton: (isOpen, accentColor = null) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: isOpen ? tokens.bgHover : tokens.bgSecondary, border: `1px solid ${isOpen ? (accentColor || tokens.accentPurple) : tokens.borderSubtle}`, borderRadius: '6px', color: tokens.textPrimary, cursor: 'pointer', fontSize: '12px' }),
  iconButton: (size = 28) => ({ width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`, borderRadius: '4px', color: tokens.textMuted, cursor: 'pointer', padding: 0 }),
  positionBadge: { fontSize: '9px', fontFamily: 'ui-monospace, monospace', color: tokens.textMuted, background: tokens.bgTertiary, padding: '2px 6px', borderRadius: '4px' },
  directionBtn: (active, color) => ({ padding: '4px 8px', fontSize: '12px', background: active ? `${color}22` : tokens.bgTertiary, border: `1px solid ${active ? color : tokens.borderSubtle}`, borderRadius: '4px', color: active ? color : tokens.textMuted, cursor: 'pointer', fontWeight: active ? 600 : 400 }),
};

// ============================================================================
// FULL VIEW HUB FLYOUT
// In normal mode: shows all on-canvas + available
// In subset mode: shows only subset views (no available section)
// ============================================================================
const ViewHubFlyout = ({ 
  onCanvasViews, // Full list or filtered to subset depending on mode
  availableViews,
  activeView,
  isSubsetMode,
  onSelectView,
  onAction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const allTypes = [...new Set([...onCanvasViews, ...availableViews].map(v => v.type))];
  
  const toggleTypeFilter = (type) => {
    setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  
  const filterViews = (views) => views.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilters.length === 0 || typeFilters.includes(v.type);
    return matchesSearch && matchesType;
  });
  
  const sortViews = (views) => [...views].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'type': return a.type.localeCompare(b.type);
      case 'position': return ((a.position?.row || 0) * 10 + (a.position?.col || 0)) - ((b.position?.row || 0) * 10 + (b.position?.col || 0));
      default: return 0;
    }
  });
  
  const filteredOnCanvas = sortViews(filterViews(onCanvasViews));
  const filteredAvailable = sortViews(filterViews(availableViews));
  const hasActiveFilters = typeFilters.length > 0 || searchQuery;
  
  const sortOptions = [
    { id: 'name', label: 'Name A→Z' },
    { id: 'name-desc', label: 'Name Z→A' },
    { id: 'type', label: 'By Type' },
    { id: 'position', label: 'By Position' },
  ];

  return (
    <div style={{ ...styles.popover, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', width: '320px' }}>
      {/* Subset mode indicator */}
      {isSubsetMode && (
        <div style={{ padding: '10px 12px', background: `${tokens.accentPurple}15`, borderBottom: `1px solid ${tokens.accentPurple}30`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: tokens.accentPurple }}>Subset Mode Active</div>
            <div style={{ fontSize: '10px', color: tokens.textMuted }}>Showing {onCanvasViews.length} views in subset</div>
          </div>
        </div>
      )}
      
      {/* Search + Filter + Sort */}
      <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: tokens.textMuted }}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search views..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`, borderRadius: '6px', color: tokens.textPrimary, fontSize: '12px', outline: 'none' }}
              autoFocus
            />
          </div>
          
          <button
            style={{ ...styles.iconButton(28), background: showFilters || typeFilters.length > 0 ? `${tokens.accentTeal}22` : tokens.bgTertiary, border: `1px solid ${showFilters || typeFilters.length > 0 ? tokens.accentTeal : tokens.borderSubtle}`, color: showFilters || typeFilters.length > 0 ? tokens.accentTeal : tokens.textMuted, position: 'relative' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            {Icons.filter}
            {typeFilters.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '14px', height: '14px', borderRadius: '7px', background: tokens.accentTeal, fontSize: '9px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{typeFilters.length}</span>}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={{ ...styles.iconButton(28), background: showSortMenu ? `${tokens.accentAmber}22` : tokens.bgTertiary, border: `1px solid ${showSortMenu ? tokens.accentAmber : tokens.borderSubtle}`, color: showSortMenu ? tokens.accentAmber : tokens.textMuted }} onClick={() => setShowSortMenu(!showSortMenu)}>
              {Icons.arrowUpDown}
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: tokens.bgTertiary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 10, minWidth: '130px', overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', fontSize: '9px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort by</div>
                {sortOptions.map(option => (
                  <button key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: sortBy === option.id ? `${tokens.accentAmber}15` : 'transparent', border: 'none', color: sortBy === option.id ? tokens.accentAmber : tokens.textSecondary, cursor: 'pointer', fontSize: '11px', textAlign: 'left' }} onClick={() => { setSortBy(option.id); setShowSortMenu(false); }}>
                    <span style={{ width: '12px', color: sortBy === option.id ? tokens.accentAmber : 'transparent' }}>✓</span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${tokens.borderSubtle}`, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {allTypes.map(type => (
              <button key={type} style={{ padding: '4px 10px', fontSize: '10px', background: typeFilters.includes(type) ? tokens.accentTeal : tokens.bgTertiary, border: `1px solid ${typeFilters.includes(type) ? tokens.accentTeal : tokens.borderSubtle}`, borderRadius: '12px', color: typeFilters.includes(type) ? '#fff' : tokens.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => toggleTypeFilter(type)}>
                {viewTypeIcons[type]}{type}
              </button>
            ))}
            {typeFilters.length > 0 && <button style={{ padding: '4px 8px', fontSize: '10px', background: 'transparent', border: 'none', color: tokens.textMuted, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTypeFilters([])}>Clear</button>}
          </div>
        )}
      </div>
      
      {/* On Canvas Section */}
      <div style={{ padding: '12px', borderBottom: !isSubsetMode ? `1px solid ${tokens.borderSubtle}` : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.textMuted }}>
            {isSubsetMode ? 'In Subset' : 'On Canvas'} ({filteredOnCanvas.length}{hasActiveFilters && ` of ${onCanvasViews.length}`})
          </span>
          {hasActiveFilters && <button style={{ fontSize: '9px', color: tokens.accentTeal, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setTypeFilters([]); setSearchQuery(''); }}>Clear filters</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: isSubsetMode ? '280px' : '180px', overflowY: 'auto' }}>
          {filteredOnCanvas.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: tokens.textMuted, fontSize: '11px' }}>
              {hasActiveFilters ? 'No views match filters' : 'No views in subset'}
            </div>
          ) : (
            filteredOnCanvas.map(view => {
              const isActive = activeView?.id === view.id;
              return (
                <div
                  key={view.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isActive ? `${tokens.accentPurple}15` : 'transparent', border: `1px solid ${isActive ? tokens.accentPurple + '30' : 'transparent'}` }}
                  onClick={() => onSelectView(view)}
                >
                  <span style={styles.colorDot(view.color)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: isActive ? 500 : 400, color: tokens.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.name}</div>
                    <div style={{ fontSize: '10px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {viewTypeIcons[view.type]}
                      <span>{view.type}</span>
                      {view.position && <span style={styles.positionBadge}>{view.position.col},{view.position.row}</span>}
                    </div>
                  </div>
                  {isActive && <span style={{ color: tokens.accentPurple }}>●</span>}
                  {!isActive && !isSubsetMode && (
                    <button style={{ ...styles.iconButton(20), color: tokens.accentRed }} title="Remove from canvas" onClick={(e) => { e.stopPropagation(); onAction('remove', view); }}>{Icons.x}</button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Available Section - Only in normal mode */}
      {!isSubsetMode && (
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.textMuted }}>Available ({filteredAvailable.length})</span>
            <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: `${tokens.accentGreen}15`, border: `1px solid ${tokens.accentGreen}50`, borderRadius: '4px', color: tokens.accentGreen, cursor: 'pointer', fontSize: '10px', fontWeight: 500 }} onClick={() => onAction('create', null)}>
              {Icons.plus} New View
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '120px', overflowY: 'auto' }}>
            {filteredAvailable.map(view => (
              <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}>
                <span style={styles.colorDot(view.color)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: tokens.textPrimary }}>{view.name}</div>
                  <div style={{ fontSize: '10px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>{viewTypeIcons[view.type]}{view.type}</div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '10px', background: `${tokens.accentGreen}22`, border: `1px solid ${tokens.accentGreen}`, borderRadius: '4px', color: tokens.accentGreen, cursor: 'pointer' }} onClick={() => onAction('place', view)}>
                  {Icons.plus} Place
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUBSET PICKER DROPDOWN (Row 2 in subset mode)
// Full-featured with search, filter, sort - checkbox list of all canvas views
// ============================================================================
const SubsetPickerDropdown = ({ allViews, selectedIds, onToggle, onSelectAll, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const allTypes = [...new Set(allViews.map(v => v.type))];
  
  const toggleTypeFilter = (type) => {
    setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  
  const filterViews = (views) => views.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilters.length === 0 || typeFilters.includes(v.type);
    return matchesSearch && matchesType;
  });
  
  const sortViews = (views) => [...views].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'type': return a.type.localeCompare(b.type);
      case 'position': return ((a.position?.row || 0) * 10 + (a.position?.col || 0)) - ((b.position?.row || 0) * 10 + (b.position?.col || 0));
      default: return 0;
    }
  });
  
  const filteredViews = sortViews(filterViews(allViews));
  const hasActiveFilters = typeFilters.length > 0 || searchQuery;
  
  const sortOptions = [
    { id: 'name', label: 'Name A→Z' },
    { id: 'name-desc', label: 'Name Z→A' },
    { id: 'type', label: 'By Type' },
    { id: 'position', label: 'By Position' },
  ];

  return (
    <div style={{ ...styles.popover, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', width: '320px' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: `${tokens.accentPurple}10` }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: tokens.accentPurple }}>Select Views for Subset</div>
        <div style={{ fontSize: '10px', color: tokens.textMuted }}>Check the views to include in comparison</div>
      </div>
      
      {/* Search + Filter + Sort */}
      <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: tokens.textMuted }}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search views..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', background: tokens.bgTertiary, border: `1px solid ${tokens.borderSubtle}`, borderRadius: '6px', color: tokens.textPrimary, fontSize: '12px', outline: 'none' }}
              autoFocus
            />
          </div>
          
          <button
            style={{ ...styles.iconButton(28), background: showFilters || typeFilters.length > 0 ? `${tokens.accentTeal}22` : tokens.bgTertiary, border: `1px solid ${showFilters || typeFilters.length > 0 ? tokens.accentTeal : tokens.borderSubtle}`, color: showFilters || typeFilters.length > 0 ? tokens.accentTeal : tokens.textMuted, position: 'relative' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            {Icons.filter}
            {typeFilters.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '14px', height: '14px', borderRadius: '7px', background: tokens.accentTeal, fontSize: '9px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{typeFilters.length}</span>}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button style={{ ...styles.iconButton(28), background: showSortMenu ? `${tokens.accentAmber}22` : tokens.bgTertiary, border: `1px solid ${showSortMenu ? tokens.accentAmber : tokens.borderSubtle}`, color: showSortMenu ? tokens.accentAmber : tokens.textMuted }} onClick={() => setShowSortMenu(!showSortMenu)}>
              {Icons.arrowUpDown}
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: tokens.bgTertiary, border: `1px solid ${tokens.borderDefault}`, borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 10, minWidth: '130px', overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', fontSize: '9px', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort by</div>
                {sortOptions.map(option => (
                  <button key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: sortBy === option.id ? `${tokens.accentAmber}15` : 'transparent', border: 'none', color: sortBy === option.id ? tokens.accentAmber : tokens.textSecondary, cursor: 'pointer', fontSize: '11px', textAlign: 'left' }} onClick={() => { setSortBy(option.id); setShowSortMenu(false); }}>
                    <span style={{ width: '12px', color: sortBy === option.id ? tokens.accentAmber : 'transparent' }}>✓</span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${tokens.borderSubtle}`, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {allTypes.map(type => (
              <button key={type} style={{ padding: '4px 10px', fontSize: '10px', background: typeFilters.includes(type) ? tokens.accentTeal : tokens.bgTertiary, border: `1px solid ${typeFilters.includes(type) ? tokens.accentTeal : tokens.borderSubtle}`, borderRadius: '12px', color: typeFilters.includes(type) ? '#fff' : tokens.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => toggleTypeFilter(type)}>
                {viewTypeIcons[type]}{type}
              </button>
            ))}
            {typeFilters.length > 0 && <button style={{ padding: '4px 8px', fontSize: '10px', background: 'transparent', border: 'none', color: tokens.textMuted, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTypeFilters([])}>Clear</button>}
          </div>
        )}
      </div>
      
      {/* View List */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.textMuted }}>
            All Canvas Views ({filteredViews.length}{hasActiveFilters && ` of ${allViews.length}`})
          </span>
          {hasActiveFilters && <button style={{ fontSize: '9px', color: tokens.accentTeal, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setTypeFilters([]); setSearchQuery(''); }}>Clear filters</button>}
        </div>
        
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {filteredViews.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: tokens.textMuted, fontSize: '11px' }}>
              No views match filters
            </div>
          ) : (
            filteredViews.map(view => {
              const isSelected = selectedIds.includes(view.id);
              return (
                <div
                  key={view.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isSelected ? `${tokens.accentPurple}15` : 'transparent', marginBottom: '4px' }}
                  onClick={() => onToggle(view.id)}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isSelected ? tokens.accentPurple : tokens.borderSubtle}`, background: isSelected ? tokens.accentPurple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                    {isSelected && Icons.check}
                  </div>
                  <span style={styles.colorDot(view.color)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: tokens.textPrimary }}>{view.name}</div>
                    <div style={{ fontSize: '10px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {viewTypeIcons[view.type]}{view.type}
                      {view.position && <span style={styles.positionBadge}>{view.position.col},{view.position.row}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${tokens.borderSubtle}`, background: tokens.bgTertiary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: tokens.textMuted }}>{selectedIds.length} of {allViews.length} in subset</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ fontSize: '10px', color: tokens.accentPurple, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={onSelectAll}>Select All</button>
          <button style={{ fontSize: '10px', color: tokens.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={onClear}>Clear</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LINKS DROPDOWN
// ============================================================================
const LinksDropdown = ({ activeView, allViews, onUpdateLink }) => {
  const [expandedLink, setExpandedLink] = useState(null);
  const otherViews = allViews.filter(v => v.id !== activeView.id);
  const getViewById = (id) => allViews.find(v => v.id === id);
  
  return (
    <div style={{ ...styles.popover, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', width: '280px' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${tokens.borderSubtle}`, background: tokens.bgTertiary }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.textMuted }}>Links for</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={styles.colorDot(activeView.color)} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: tokens.textPrimary }}>{activeView.name}</span>
        </div>
      </div>
      
      <div style={{ padding: '8px' }}>
        {LINK_TYPES.map(linkType => {
          const link = activeView.links[linkType.id];
          const isExpanded = expandedLink === linkType.id;
          const targetView = link ? getViewById(link.target) : null;
          
          return (
            <div key={linkType.id} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isExpanded ? tokens.bgTertiary : 'transparent', border: `1px solid ${isExpanded ? tokens.borderSubtle : 'transparent'}` }} onClick={() => setExpandedLink(isExpanded ? null : linkType.id)}>
                <span style={{ color: link ? linkType.color : tokens.textMuted, display: 'flex' }}>{linkType.icon}</span>
                <span style={{ fontSize: '12px', color: tokens.textPrimary, minWidth: '80px' }}>{linkType.label}</span>
                {link && targetView ? (
                  <>
                    <span style={{ fontSize: '12px', color: linkType.color, fontWeight: 500 }}>{DirectionIcons[link.direction]}</span>
                    <span style={styles.colorDot(targetView.color, 8)} />
                    <span style={{ fontSize: '11px', color: tokens.textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{targetView.name}</span>
                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: 'transparent', border: 'none', borderRadius: '4px', color: tokens.textMuted, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onUpdateLink(linkType.id, null, null); }} title="Unlink">{Icons.x}</button>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: tokens.textMuted, flex: 1 }}>— Not linked</span>
                )}
                <span style={{ color: tokens.textMuted, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>{Icons.chevronRight}</span>
              </div>
              
              {isExpanded && (
                <div style={{ padding: '10px 12px', marginTop: '4px', background: tokens.bgPrimary, borderRadius: '6px', border: `1px solid ${tokens.borderSubtle}` }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '10px', color: tokens.textMuted, marginBottom: '6px' }}>Link to:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {otherViews.map(view => {
                        const isSelected = link?.target === view.id;
                        return (
                          <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', background: isSelected ? `${linkType.color}15` : 'transparent', border: `1px solid ${isSelected ? linkType.color + '50' : 'transparent'}` }} onClick={() => onUpdateLink(linkType.id, view.id, link?.direction || 'bidirectional')}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${isSelected ? linkType.color : tokens.borderSubtle}`, background: isSelected ? linkType.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            <span style={styles.colorDot(view.color, 8)} />
                            <span style={{ fontSize: '11px', color: tokens.textPrimary }}>{view.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {link && (
                    <div>
                      <div style={{ fontSize: '10px', color: tokens.textMuted, marginBottom: '6px' }}>Direction:</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button style={styles.directionBtn(link.direction === 'bidirectional', linkType.color)} onClick={() => onUpdateLink(linkType.id, link.target, 'bidirectional')}>↔ Both</button>
                        <button style={styles.directionBtn(link.direction === 'parent', linkType.color)} onClick={() => onUpdateLink(linkType.id, link.target, 'parent')}>→ Push</button>
                        <button style={styles.directionBtn(link.direction === 'child', linkType.color)} onClick={() => onUpdateLink(linkType.id, link.target, 'child')}>← Receive</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ViewContextComplete() {
  const [viewMode, setViewMode] = useState('normal');
  const [onCanvasViews, setOnCanvasViews] = useState(createInitialOnCanvas);
  const [availableViews, setAvailableViews] = useState(createInitialAvailable);
  const [activeView, setActiveView] = useState(null);
  const [selectedSubsetIds, setSelectedSubsetIds] = useState(['v1', 'v2', 'v3']);
  
  const [showViewHub, setShowViewHub] = useState(false);
  const [showSubsetPicker, setShowSubsetPicker] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  
  const viewHubRef = useRef(null);
  const subsetRef = useRef(null);
  const linksRef = useRef(null);

  useEffect(() => {
    if (!activeView && onCanvasViews.length > 0) setActiveView(onCanvasViews[0]);
  }, [onCanvasViews, activeView]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewHubRef.current && !viewHubRef.current.contains(e.target)) setShowViewHub(false);
      if (subsetRef.current && !subsetRef.current.contains(e.target)) setShowSubsetPicker(false);
      if (linksRef.current && !linksRef.current.contains(e.target)) setShowLinks(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep active view in subset when in subset mode
  useEffect(() => {
    if (viewMode === 'subset' && activeView && !selectedSubsetIds.includes(activeView.id)) {
      const firstSubset = onCanvasViews.find(v => selectedSubsetIds.includes(v.id));
      if (firstSubset) setActiveView(firstSubset);
    }
  }, [viewMode, selectedSubsetIds, activeView, onCanvasViews]);

  const handleAction = (action, view) => {
    switch (action) {
      case 'place':
        setAvailableViews(prev => prev.filter(v => v.id !== view.id));
        setOnCanvasViews(prev => [...prev, { ...view, position: { col: 2, row: 0 }, links: { camera: null, filter: null, selection: null, annotations: null, transforms: null, params: null } }]);
        break;
      case 'remove':
        setOnCanvasViews(prev => prev.filter(v => v.id !== view.id));
        setAvailableViews(prev => [...prev, { id: view.id, name: view.name, type: view.type, color: view.color }]);
        setSelectedSubsetIds(prev => prev.filter(id => id !== view.id));
        if (activeView?.id === view.id) setActiveView(onCanvasViews.find(v => v.id !== view.id) || null);
        break;
      case 'create':
        const colors = [tokens.accentBlue, tokens.accentTeal, tokens.accentAmber, tokens.accentPurple, tokens.accentGreen];
        const types = ['volume', 'slice', 'chart', 'mesh'];
        setAvailableViews(prev => [...prev, { id: `new-${Date.now()}`, name: `New View ${availableViews.length + onCanvasViews.length + 1}`, type: types[Math.floor(Math.random() * types.length)], color: colors[Math.floor(Math.random() * colors.length)] }]);
        break;
    }
  };

  const handleToggleSubset = (viewId) => {
    setSelectedSubsetIds(prev => {
      const newIds = prev.includes(viewId) ? prev.filter(id => id !== viewId) : [...prev, viewId];
      // Ensure at least one view in subset
      return newIds.length > 0 ? newIds : prev;
    });
  };

  const handleUpdateLink = (linkType, targetId, direction) => {
    if (!activeView) return;
    const updatedView = { ...activeView, links: { ...activeView.links, [linkType]: targetId ? { target: targetId, direction } : null } };
    setActiveView(updatedView);
    setOnCanvasViews(prev => prev.map(v => v.id === activeView.id ? updatedView : v));
  };

  const isSubsetMode = viewMode === 'subset';
  const subsetViews = onCanvasViews.filter(v => selectedSubsetIds.includes(v.id));
  const viewsForHub = isSubsetMode ? subsetViews : onCanvasViews;
  const viewsForLinks = isSubsetMode ? subsetViews : onCanvasViews;
  const activeLinkCount = activeView ? Object.values(activeView.links).filter(l => l !== null).length : 0;

  return (
    <div style={{ minHeight: '100vh', background: tokens.bgPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: tokens.textPrimary, padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600 }}>Complete ViewContext Layout</h1>
        <p style={{ margin: '0 0 32px', fontSize: '14px', color: tokens.textSecondary }}>
          Full ViewHub always in row 1. In subset mode, row 2 picker restricts what row 1 shows.
        </p>

        <div style={{ background: tokens.bgSecondary, borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: tokens.textMuted, marginBottom: '12px' }}>
            View Context Block
          </div>
          
          <div style={{ background: tokens.bgTertiary, borderRadius: '8px', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Row 1: Always shows full ViewHub */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* View Mode Toggle */}
              <div style={{ display: 'flex', background: tokens.bgSecondary, borderRadius: '6px', padding: '2px', gap: '2px' }}>
                {[
                  { id: 'normal', icon: Icons.grid, color: tokens.accentBlue, label: 'Normal' },
                  { id: 'isolation', icon: Icons.maximize, color: tokens.accentAmber, label: 'Isolation' },
                  { id: 'subset', icon: Icons.layers, color: tokens.accentPurple, label: 'Subset' },
                ].map(m => (
                  <button key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '26px', background: viewMode === m.id ? `${m.color}22` : 'transparent', border: viewMode === m.id ? `1px solid ${m.color}` : '1px solid transparent', borderRadius: '4px', color: viewMode === m.id ? m.color : tokens.textMuted, cursor: 'pointer' }} onClick={() => setViewMode(m.id)} title={m.label}>
                    {m.icon}
                  </button>
                ))}
              </div>
              
              <div style={styles.divider} />
              
              {/* Full ViewHub - always here, but filtered in subset mode */}
              <div ref={viewHubRef} style={{ position: 'relative' }}>
                <button style={styles.dropdownButton(showViewHub)} onClick={() => setShowViewHub(!showViewHub)}>
                  <span style={styles.colorDot(activeView?.color || tokens.textMuted, 10)} />
                  <span style={{ minWidth: '100px', textAlign: 'left', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeView?.name || 'Select...'}
                  </span>
                  {activeView && <span style={{ color: tokens.textMuted }}>{viewTypeIcons[activeView.type]}</span>}
                  {showViewHub ? Icons.chevronUp : Icons.chevronDown}
                </button>
                {showViewHub && (
                  <ViewHubFlyout
                    onCanvasViews={viewsForHub}
                    availableViews={isSubsetMode ? [] : availableViews}
                    activeView={activeView}
                    isSubsetMode={isSubsetMode}
                    onSelectView={(v) => { setActiveView(v); setShowViewHub(false); }}
                    onAction={handleAction}
                  />
                )}
              </div>
              
              <div style={styles.divider} />
              
              {/* Links */}
              <div ref={linksRef} style={{ position: 'relative' }}>
                <button style={{ ...styles.dropdownButton(showLinks, tokens.accentTeal), color: showLinks ? tokens.accentTeal : tokens.textSecondary }} onClick={() => setShowLinks(!showLinks)}>
                  {Icons.link}
                  <span>Links</span>
                  {activeLinkCount > 0 && <span style={{ minWidth: '16px', height: '16px', borderRadius: '8px', background: tokens.accentTeal, color: '#fff', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeLinkCount}</span>}
                  {showLinks ? Icons.chevronUp : Icons.chevronDown}
                </button>
                {showLinks && activeView && <LinksDropdown activeView={activeView} allViews={viewsForLinks} onUpdateLink={handleUpdateLink} />}
              </div>
              
              <div style={styles.divider} />
              
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[{ icon: Icons.snapshot, label: 'Snapshot' }, { icon: Icons.copy, label: 'Duplicate' }, { icon: Icons.settings, label: 'Settings' }].map((action, i) => (
                  <button key={i} style={{ ...styles.iconButton(28), background: tokens.bgSecondary }} title={action.label}>{action.icon}</button>
                ))}
              </div>
            </div>
            
            {/* Row 2: Only in subset mode - Subset Picker aligned below active instance */}
            {isSubsetMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: `1px solid ${tokens.borderSubtle}` }}>
                {/* Spacer to align with mode toggle */}
                <div style={{ width: '90px', flexShrink: 0 }} />
                
                <div style={styles.divider} />
                
                {/* Subset Picker - aligned below ViewHub */}
                <div ref={subsetRef} style={{ position: 'relative' }}>
                  <button style={{ ...styles.dropdownButton(showSubsetPicker, tokens.accentPurple), background: `${tokens.accentPurple}10` }} onClick={() => setShowSubsetPicker(!showSubsetPicker)}>
                    <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
                    <span style={{ color: tokens.accentPurple, fontWeight: 500, minWidth: '100px', textAlign: 'left' }}>Subset: {selectedSubsetIds.length} of {onCanvasViews.length}</span>
                    <div style={{ display: 'flex', marginLeft: '4px' }}>
                      {subsetViews.slice(0, 4).map((v, i) => (
                        <span key={v.id} style={{ ...styles.colorDot(v.color, 8), marginLeft: i > 0 ? '-3px' : 0, border: `1px solid ${tokens.bgTertiary}` }} />
                      ))}
                      {subsetViews.length > 4 && <span style={{ fontSize: '9px', color: tokens.textMuted, marginLeft: '4px' }}>+{subsetViews.length - 4}</span>}
                    </div>
                    {showSubsetPicker ? Icons.chevronUp : Icons.chevronDown}
                  </button>
                  {showSubsetPicker && (
                    <SubsetPickerDropdown
                      allViews={onCanvasViews}
                      selectedIds={selectedSubsetIds}
                      onToggle={handleToggleSubset}
                      onSelectAll={() => onCanvasViews.forEach(v => { if (!selectedSubsetIds.includes(v.id)) handleToggleSubset(v.id); })}
                      onClear={() => {
                        // Keep at least one view selected
                        const firstId = selectedSubsetIds[0];
                        selectedSubsetIds.forEach(id => { if (id !== firstId) handleToggleSubset(id); });
                      }}
                    />
                  )}
                </div>
                
                <span style={{ fontSize: '10px', color: tokens.textMuted, marginLeft: '8px' }}>↑ Restricts active instance above</span>
              </div>
            )}
          </div>
          
          <div style={{ minHeight: '420px' }} />
        </div>

        {/* Layout Diagrams */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: tokens.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: tokens.accentBlue, fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Normal / Isolation Mode</div>
            <div style={{ background: tokens.bgTertiary, borderRadius: '8px', padding: '12px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: tokens.textSecondary }}>
              <div>[Mode] │ [● Full ViewHub ▾] │ [Links] │ [Actions]</div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: tokens.textMuted, fontFamily: 'system-ui' }}>
                ViewHub shows: All on-canvas views + Available views<br/>
                Search, filter, sort, place, remove all work
              </div>
            </div>
          </div>
          
          <div style={{ background: tokens.bgSecondary, borderRadius: '12px', padding: '16px' }}>
            <div style={{ color: tokens.accentPurple, fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Subset Mode</div>
            <div style={{ background: tokens.bgTertiary, borderRadius: '8px', padding: '12px', fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: tokens.textSecondary }}>
              <div>[Mode] │ [● ViewHub ▾]      │ [Links] │ [Actions]</div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: `1px dashed ${tokens.borderSubtle}` }}>
                <span>[Mode] │ [◫ Subset Picker ▾]</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: tokens.textMuted, fontFamily: 'system-ui' }}>
                Both dropdowns aligned • Both have search/filter/sort<br/>
                Row 2 picks subset → Row 1 filtered to subset only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
