import React, { useState, useRef, useEffect } from 'react';

// ============================================================================
// VIEW CONTEXT BLOCK - Isolated Prototype
// ============================================================================
// This component handles:
// 1. View Mode toggle (Normal/Isolation/Subset)
// 2. Active View selector with full ViewHub flyout
// 3. Quick actions (Links, Snapshot, Duplicate)
// 4. Contextual second row based on mode
// 5. Subset picker dropdown (in Subset mode)
//
// Used in: Secondary Footer bar
// Takes: Flexible width (flex: 1) to fill available space
// ============================================================================

// ============================================================================
// DESIGN TOKENS
// ============================================================================
const tokens = {
  // Backgrounds
  bgPrimary: '#0a0a0a',
  bgSecondary: '#121216',
  bgTertiary: '#1a1a20',
  bgElevated: '#242430',
  bgHover: '#2a2a38',
  
  // Glass
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassMedium: 'rgba(255, 255, 255, 0.08)',
  
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

// RGB values for rgba() usage
const rgb = {
  blue: '96, 165, 250',
  purple: '167, 139, 250',
  green: '74, 222, 128',
  teal: '45, 212, 191',
  amber: '251, 191, 36',
};

// ============================================================================
// SVG ICONS
// ============================================================================
const Icons = {
  chevronUp: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>,
  chevronDown: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>,
  grid: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  maximize: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  layers: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
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

// View type to icon mapping
const viewTypeIcons = {
  volume: Icons.cube,
  slice: Icons.slice,
  chart: Icons.chart,
  points: Icons.points,
};

// ============================================================================
// MOCK DATA
// ============================================================================
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
// SHARED STYLES
// ============================================================================
const S = {
  iconBtn: (size = 26) => ({
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.bgTertiary,
    border: `1px solid ${tokens.borderSubtle}`,
    borderRadius: '6px',
    color: tokens.textSecondary,
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s',
  }),
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    border: 'none',
    borderRadius: '16px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

// ============================================================================
// VIEW HUB FLYOUT
// Full-featured dropdown with search, filter, sort
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
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: '8px',
      width: '340px',
      maxWidth: 'calc(100vw - 32px)',
      background: tokens.bgSecondary,
      border: `1px solid ${tokens.borderDefault}`,
      borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      zIndex: 1000,
    }}>
      {/* Subset mode header */}
      {isSubset && (
        <div style={{
          padding: '10px 14px',
          background: `rgba(${rgb.purple}, 0.1)`,
          borderBottom: `1px solid rgba(${rgb.purple}, 0.2)`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
          <span style={{ fontSize: '12px', color: tokens.accentPurple, fontWeight: 500 }}>Subset Mode</span>
          <span style={{ fontSize: '11px', color: tokens.textMuted }}>• {views.length} views</span>
        </div>
      )}
      
      {/* Search + Filter + Sort */}
      <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Search input */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: tokens.bgTertiary,
            borderRadius: '8px',
          }}>
            <span style={{ color: tokens.textMuted }}>{Icons.search}</span>
            <input
              type="text"
              placeholder="Search views..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: tokens.textPrimary,
                fontSize: '13px',
              }}
              autoFocus
            />
            {search && (
              <button
                style={{ background: 'none', border: 'none', color: tokens.textMuted, cursor: 'pointer', padding: 0 }}
                onClick={() => setSearch('')}
              >
                {Icons.x}
              </button>
            )}
          </div>
          
          {/* Filter button */}
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
            {typeFilter && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: tokens.accentTeal,
              }} />
            )}
          </button>
          
          {/* Sort button */}
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
            
            {/* Sort dropdown */}
            {showSort && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: tokens.bgElevated,
                border: `1px solid ${tokens.borderDefault}`,
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 10,
                minWidth: '130px',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '10px',
                  color: tokens.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: `1px solid ${tokens.borderSubtle}`,
                }}>
                  Sort by
                </div>
                {[
                  { id: 'name', label: 'Name' },
                  { id: 'type', label: 'Type' },
                  { id: 'position', label: 'Position' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => { setSortBy(o.id); setShowSort(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 14px',
                      background: sortBy === o.id ? `rgba(${rgb.amber}, 0.1)` : 'transparent',
                      border: 'none',
                      color: sortBy === o.id ? tokens.accentAmber : tokens.textSecondary,
                      cursor: 'pointer',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
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
            <button
              onClick={() => setTypeFilter(null)}
              style={{
                ...S.chip,
                background: !typeFilter ? tokens.accentTeal : tokens.bgTertiary,
                color: !typeFilter ? '#fff' : tokens.textMuted,
              }}
            >
              All
            </button>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                style={{
                  ...S.chip,
                  background: typeFilter === t ? tokens.accentTeal : tokens.bgTertiary,
                  color: typeFilter === t ? '#fff' : tokens.textMuted,
                }}
              >
                {viewTypeIcons[t]} {t}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* View lists */}
      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
        {/* On Canvas / In Subset section */}
        <div style={{ padding: '8px' }}>
          <div style={{
            padding: '6px 10px',
            fontSize: '10px',
            color: tokens.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{isSubset ? 'In Subset' : 'On Canvas'} ({filtered.length})</span>
            {hasFilters && (
              <button
                style={{
                  fontSize: '9px',
                  color: tokens.accentTeal,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => { setSearch(''); setTypeFilter(null); }}
              >
                Clear
              </button>
            )}
          </div>
          
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: tokens.textMuted, fontSize: '12px' }}>
              {hasFilters ? 'No views match filters' : 'No views'}
            </div>
          ) : filtered.map(v => (
            <button
              key={v.id}
              onClick={() => { onSelect(v); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px',
                background: activeView?.id === v.id ? `rgba(${rgb.purple}, 0.12)` : 'transparent',
                border: activeView?.id === v.id ? `1px solid rgba(${rgb.purple}, 0.25)` : '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (activeView?.id !== v.id) e.currentTarget.style.background = tokens.glassLight; }}
              onMouseLeave={e => { if (activeView?.id !== v.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: v.color,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  color: tokens.textPrimary,
                  fontWeight: activeView?.id === v.id ? 500 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {v.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: tokens.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '2px',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {viewTypeIcons[v.type]} {v.type}
                  </span>
                  {v.position && (
                    <span style={{
                      padding: '1px 6px',
                      background: tokens.bgTertiary,
                      borderRadius: '4px',
                      fontSize: '10px',
                    }}>
                      {v.position.col},{v.position.row}
                    </span>
                  )}
                </div>
              </div>
              {activeView?.id === v.id && (
                <span style={{ color: tokens.accentPurple, fontSize: '16px' }}>●</span>
              )}
            </button>
          ))}
        </div>
        
        {/* Available section (only in normal/isolation mode) */}
        {!isSubset && filteredAvail.length > 0 && (
          <div style={{ padding: '8px', borderTop: `1px solid ${tokens.borderSubtle}` }}>
            <div style={{
              padding: '6px 10px',
              fontSize: '10px',
              color: tokens.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Available ({filteredAvail.length})
            </div>
            {filteredAvail.map(v => (
              <button
                key={v.id}
                onClick={() => { onSelect(v); onClose(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: 0.7,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = tokens.glassLight; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: tokens.textPrimary }}>{v.name}</div>
                  <div style={{ fontSize: '11px', color: tokens.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {viewTypeIcons[v.type]} {v.type}
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: tokens.accentGreen, fontSize: '11px' }}>
                  {Icons.plus} Add
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUBSET PICKER DROPDOWN
// ============================================================================
const SubsetPickerDropdown = ({ views, selectedIds, onToggle, onClose }) => (
  <div style={{
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: '8px',
    width: '340px',
    maxWidth: 'calc(100vw - 32px)',
    background: tokens.bgSecondary,
    border: `1px solid ${tokens.borderDefault}`,
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    zIndex: 1000,
  }}>
    <div style={{
      padding: '12px 14px',
      borderBottom: `1px solid ${tokens.borderSubtle}`,
      background: `rgba(${rgb.purple}, 0.08)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ fontSize: '13px', color: tokens.accentPurple, fontWeight: 500 }}>Select Subset Views</div>
      <span style={{ fontSize: '11px', color: tokens.textMuted }}>{selectedIds.length} selected</span>
    </div>
    <div style={{ padding: '8px', maxHeight: '280px', overflowY: 'auto' }}>
      {views.map(v => {
        const sel = selectedIds.includes(v.id);
        return (
          <div
            key={v.id}
            onClick={() => onToggle(v.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: sel ? `rgba(${rgb.purple}, 0.12)` : 'transparent',
              border: sel ? `1px solid rgba(${rgb.purple}, 0.25)` : '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = tokens.glassLight; }}
            onMouseLeave={e => { e.currentTarget.style.background = sel ? `rgba(${rgb.purple}, 0.12)` : 'transparent'; }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '5px',
              border: `2px solid ${sel ? tokens.accentPurple : tokens.borderSubtle}`,
              background: sel ? tokens.accentPurple : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}>
              {sel && Icons.check}
            </div>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: v.color,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                color: tokens.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {v.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: tokens.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '2px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {viewTypeIcons[v.type]} {v.type}
                </span>
                {v.position && (
                  <span style={{
                    padding: '1px 6px',
                    background: tokens.bgTertiary,
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    {v.position.col},{v.position.row}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ============================================================================
// VIEW CONTEXT BLOCK - MAIN COMPONENT
// ============================================================================
const ViewContextBlock = ({ 
  viewMode = 'normal', 
  onModeChange,
  onCanvasViews = mockViews,
  availableViews: availViews = availableViews,
}) => {
  const [showHub, setShowHub] = useState(false);
  const [showSubset, setShowSubset] = useState(false);
  const [activeView, setActiveView] = useState(onCanvasViews[0] || null);
  const [subsetIds, setSubsetIds] = useState(['v1', 'v2', 'v3']);
  
  const hubRef = useRef(null);
  const subsetRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (hubRef.current && !hubRef.current.contains(e.target)) setShowHub(false);
      if (subsetRef.current && !subsetRef.current.contains(e.target)) setShowSubset(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isSubset = viewMode === 'subset';
  const subsetViews = onCanvasViews.filter(v => subsetIds.includes(v.id));
  const viewsForHub = isSubset ? subsetViews : onCanvasViews;
  
  // Mode-specific colors
  const modeColor = isSubset ? tokens.accentPurple : viewMode === 'isolation' ? tokens.accentAmber : tokens.accentBlue;
  const modeRgb = isSubset ? rgb.purple : viewMode === 'isolation' ? rgb.amber : rgb.blue;

  const handleSubsetToggle = (id) => {
    setSubsetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flex: 1,
      minWidth: 0,
    }}>
      {/* ================================================================ */}
      {/* ROW 1: Mode Toggle | Active View Selector | Quick Actions */}
      {/* ================================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          background: tokens.bgPrimary,
          borderRadius: '6px',
          padding: '3px',
          flexShrink: 0,
        }}>
          {[
            { id: 'normal', icon: Icons.grid, c: tokens.accentBlue, label: 'Normal' },
            { id: 'isolation', icon: Icons.maximize, c: tokens.accentAmber, label: 'Isolation' },
            { id: 'subset', icon: Icons.layers, c: tokens.accentPurple, label: 'Subset' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onModeChange?.(m.id)}
              title={m.label}
              style={{
                width: '30px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: viewMode === m.id ? `${m.c}22` : 'transparent',
                border: viewMode === m.id ? `1px solid ${m.c}` : '1px solid transparent',
                borderRadius: '4px',
                color: viewMode === m.id ? m.c : tokens.textMuted,
                cursor: 'pointer',
              }}
            >
              {m.icon}
            </button>
          ))}
        </div>
        
        <div style={{ width: '1px', height: '28px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        {/* Active view selector - TAKES REMAINING SPACE */}
        <div ref={hubRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setShowHub(!showHub)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '8px 14px',
              background: showHub ? tokens.bgHover : `rgba(${modeRgb}, 0.06)`,
              border: `1px solid ${showHub ? modeColor : `rgba(${modeRgb}, 0.2)`}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: activeView?.color || tokens.textMuted,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: '9px',
                color: tokens.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                marginBottom: '1px',
              }}>
                Active View
              </div>
              <div style={{
                fontSize: '13px',
                color: tokens.textPrimary,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {activeView?.name || 'Select view...'}
              </div>
            </div>
            <span style={{ color: tokens.textMuted, flexShrink: 0 }}>
              {activeView?.type && viewTypeIcons[activeView.type]}
            </span>
            <span style={{ color: tokens.textMuted, flexShrink: 0 }}>
              {showHub ? Icons.chevronUp : Icons.chevronDown}
            </span>
          </button>
          
          {showHub && (
            <ViewHubFlyout
              views={viewsForHub}
              available={isSubset ? [] : availViews}
              activeView={activeView}
              isSubset={isSubset}
              onSelect={setActiveView}
              onClose={() => setShowHub(false)}
            />
          )}
        </div>
        
        <div style={{ width: '1px', height: '28px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button style={S.iconBtn(28)} title="Links">{Icons.link}</button>
          <button style={S.iconBtn(28)} title="Snapshot">{Icons.camera}</button>
          <button style={S.iconBtn(28)} title="Duplicate">{Icons.copy}</button>
        </div>
      </div>
      
      {/* ================================================================ */}
      {/* ROW 2: Contextual info based on mode */}
      {/* ================================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '24px' }}>
        {/* Mode indicator */}
        <div style={{
          width: '102px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {viewMode === 'normal' && (
            <span style={{
              fontSize: '10px',
              color: tokens.accentBlue,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {Icons.grid} All Views
            </span>
          )}
          {viewMode === 'isolation' && (
            <span style={{
              fontSize: '10px',
              color: tokens.accentAmber,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {Icons.maximize} Focus
            </span>
          )}
          {viewMode === 'subset' && (
            <span style={{
              fontSize: '10px',
              color: tokens.accentPurple,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {Icons.layers} Compare
            </span>
          )}
        </div>
        
        <div style={{ width: '1px', height: '16px', background: tokens.borderSubtle, flexShrink: 0 }} />
        
        {/* Mode-specific content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Normal mode: show position and view count */}
          {viewMode === 'normal' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '3px 8px',
                background: tokens.bgTertiary,
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'ui-monospace',
                color: tokens.textSecondary,
              }}>
                {activeView?.position?.col},{activeView?.position?.row}
              </span>
              <span style={{ fontSize: '11px', color: tokens.textMuted }}>
                {onCanvasViews.length} views on canvas
              </span>
            </div>
          )}
          
          {/* Isolation mode: show escape hint */}
          {viewMode === 'isolation' && (
            <span style={{ fontSize: '11px', color: tokens.textMuted }}>
              Press{' '}
              <kbd style={{
                padding: '2px 6px',
                background: tokens.bgTertiary,
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'ui-monospace',
              }}>
                Esc
              </kbd>
              {' '}to exit
            </span>
          )}
          
          {/* Subset mode: show subset picker */}
          {viewMode === 'subset' && (
            <div ref={subsetRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSubset(!showSubset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  background: `rgba(${rgb.purple}, 0.06)`,
                  border: `1px solid ${showSubset ? tokens.accentPurple : `rgba(${rgb.purple}, 0.3)`}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: tokens.accentPurple }}>{Icons.layers}</span>
                <span style={{ fontSize: '11px', color: tokens.textSecondary }}>
                  {subsetIds.length} in subset
                </span>
                <div style={{ display: 'flex' }}>
                  {subsetViews.slice(0, 4).map((v, i) => (
                    <span
                      key={v.id}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: v.color,
                        marginLeft: i > 0 ? '-4px' : 0,
                        border: `2px solid ${tokens.bgSecondary}`,
                      }}
                    />
                  ))}
                </div>
                <span style={{ color: tokens.textMuted }}>
                  {showSubset ? Icons.chevronUp : Icons.chevronDown}
                </span>
              </button>
              
              {showSubset && (
                <SubsetPickerDropdown
                  views={onCanvasViews}
                  selectedIds={subsetIds}
                  onToggle={handleSubsetToggle}
                  onClose={() => setShowSubset(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DEMO APP
// ============================================================================
export default function ViewContextPrototype() {
  const [viewMode, setViewMode] = useState('normal');

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: tokens.textPrimary,
      padding: '24px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600 }}>
          View Context Block
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: tokens.textSecondary }}>
          Isolated component for Secondary Footer. Handles view modes, active view selection, and subset management.
        </p>
        
        {/* Component demo in simulated footer context */}
        <div style={{
          background: tokens.bgSecondary,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: tokens.textMuted,
            marginBottom: '12px',
          }}>
            Secondary Footer Context
          </div>
          
          <div style={{
            background: tokens.bgTertiary,
            borderRadius: '8px',
            padding: '12px 16px',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <ViewContextBlock
              viewMode={viewMode}
              onModeChange={setViewMode}
            />
          </div>
        </div>
        
        {/* Mode switcher buttons */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: tokens.textMuted,
            marginBottom: '8px',
          }}>
            Test Mode Switching
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['normal', 'isolation', 'subset'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '10px 20px',
                  background: viewMode === m ? tokens.accentPurple : tokens.bgTertiary,
                  border: `1px solid ${viewMode === m ? tokens.accentPurple : tokens.borderSubtle}`,
                  borderRadius: '8px',
                  color: viewMode === m ? '#fff' : tokens.textSecondary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        
        {/* Component structure documentation */}
        <div style={{
          background: tokens.bgSecondary,
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: tokens.textMuted,
            marginBottom: '12px',
          }}>
            Component Structure
          </div>
          
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '12px',
            color: tokens.textSecondary,
            lineHeight: 1.6,
          }}>
            <div style={{ color: tokens.accentPurple }}>ViewContextBlock</div>
            <div style={{ paddingLeft: '16px' }}>
              <div>├── <span style={{ color: tokens.accentBlue }}>Row 1</span>: Mode Toggle | Active View Selector | Quick Actions</div>
              <div style={{ paddingLeft: '24px', color: tokens.textMuted }}>
                ├── ModeToggle (Normal/Isolation/Subset)<br/>
                ├── ActiveViewSelector → ViewHubFlyout<br/>
                └── QuickActions (Links, Snapshot, Duplicate)
              </div>
              <div>└── <span style={{ color: tokens.accentBlue }}>Row 2</span>: Context Info (mode-specific)</div>
              <div style={{ paddingLeft: '24px', color: tokens.textMuted }}>
                ├── Normal: Position + View Count<br/>
                ├── Isolation: Escape Hint<br/>
                └── Subset: SubsetPicker → SubsetPickerDropdown
              </div>
            </div>
          </div>
        </div>
        
        {/* Props documentation */}
        <div style={{
          background: tokens.bgSecondary,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: tokens.textMuted,
            marginBottom: '12px',
          }}>
            Props
          </div>
          
          <div style={{ fontSize: '12px', color: tokens.textSecondary }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: tokens.accentTeal, fontFamily: 'ui-monospace' }}>viewMode</span>
              <span style={{ color: tokens.textMuted }}>string</span>
              <span>'normal' | 'isolation' | 'subset'</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: tokens.accentTeal, fontFamily: 'ui-monospace' }}>onModeChange</span>
              <span style={{ color: tokens.textMuted }}>function</span>
              <span>Callback when mode changes</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: tokens.accentTeal, fontFamily: 'ui-monospace' }}>onCanvasViews</span>
              <span style={{ color: tokens.textMuted }}>array</span>
              <span>Views currently on canvas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr', gap: '8px' }}>
              <span style={{ color: tokens.accentTeal, fontFamily: 'ui-monospace' }}>availableViews</span>
              <span style={{ color: tokens.textMuted }}>array</span>
              <span>Views available to add</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
