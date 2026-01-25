import React, { useState } from 'react';

// =============================================================================
// DESIGN: Display Tab in Instance Tools
// =============================================================================
// Restructuring Instance Tools tabs:
// - Tools: Camera, Transform, Slice (manipulation)
// - Display: Scene Overlays, Window/Level, Appearance (visual settings)
// - Annotations: (unchanged)
// =============================================================================

const tokens = {
  colors: {
    bg: { primary: '#0a0a0f', secondary: '#12121a', tertiary: '#1a1a24', glass: 'rgba(255,255,255,0.03)' },
    border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.1)' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
    accent: { 
      purple: '#a855f7', blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e', 
      amber: '#f59e0b', pink: '#ec4899', red: '#ef4444', teal: '#14b8a6',
      orange: '#f97316',
    },
  },
  radius: { sm: 4, md: 6, lg: 8 },
};

// =============================================================================
// OVERLAY CONFIG (reused from previous)
// =============================================================================

const OVERLAY_DEFAULTS = {
  orientation: { style: 'cube', position: 'BOTTOM_RIGHT', sizePreset: 'md', sizePercent: 12, sizePixels: 80 },
  grid: { plane: 'xz', divisions: 10, opacity: 50 },
  axes: { showLabels: true, showTicks: true, color: 'white' },
  scalebar: { style: 'ticked', position: 'BOTTOM_RIGHT', orientation: 'horizontal', behavior: 'auto', units: 'auto' },
  coordinates: { position: 'BOTTOM_LEFT', format: 'xyz', precision: 2 },
};

const OVERLAY_CONFIG = {
  orientation: { id: 'orientation', name: 'Orientation', icon: '🧭', shortcut: 'Shift+O', hasSettings: true, getActiveLabel: (c) => c.style.charAt(0).toUpperCase() + c.style.slice(1) },
  grid: { id: 'grid', name: 'Grid', icon: '▦', shortcut: 'Shift+G', hasSettings: true, getActiveLabel: (c) => c.plane.toUpperCase() },
  axes: { id: 'axes', name: 'Axes', icon: '📐', shortcut: 'Shift+A', hasSettings: true, getActiveLabel: () => null },
  scalebar: { id: 'scalebar', name: 'Scale Bar', icon: '📏', shortcut: 'Shift+B', hasSettings: true, getActiveLabel: (c) => c.behavior === 'auto' ? 'Auto' : 'Fixed' },
  coordinates: { id: 'coordinates', name: 'Coords', icon: '📍', shortcut: 'Shift+C', hasSettings: true, getActiveLabel: (c) => `${c.precision}dp` },
  fps: { id: 'fps', name: 'FPS', icon: '⚡', shortcut: 'Shift+F', hasSettings: false, getActiveLabel: () => null },
};

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

const SectionHeader = ({ icon, label, color, isExpanded, onToggle, badge }) => (
  <button
    onClick={onToggle}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', border: 'none',
      background: isExpanded ? color + '10' : 'transparent',
      borderLeft: `3px solid ${isExpanded ? color : 'transparent'}`,
      borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      cursor: 'pointer', textAlign: 'left',
    }}
  >
    <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>{isExpanded ? '▼' : '▶'}</span>
    <span style={{ fontSize: 14 }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: 500, color: isExpanded ? color : tokens.colors.text.primary }}>{label}</span>
    {badge && (
      <span style={{
        marginLeft: 'auto', padding: '2px 8px', borderRadius: 10,
        background: color + '25', color: color, fontSize: 10, fontWeight: 600,
      }}>{badge}</span>
    )}
  </button>
);

// =============================================================================
// POSITION GRID (9-point)
// =============================================================================

function PositionGrid({ value, onChange, allowedPositions = null }) {
  const positions = [
    ['TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT'],
    ['MIDDLE_LEFT', 'CENTER', 'MIDDLE_RIGHT'],
    ['BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT'],
  ];
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 26px)', gridTemplateRows: 'repeat(3, 26px)', gap: 2 }}>
      {positions.flat().map(pos => {
        const isSelected = value === pos;
        const isAllowed = !allowedPositions || allowedPositions.includes(pos);
        return (
          <button
            key={pos}
            onClick={() => isAllowed && onChange(pos)}
            disabled={!isAllowed}
            style={{
              width: 26, height: 26, borderRadius: pos === 'CENTER' ? '50%' : 4,
              border: `1px solid ${isSelected ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
              background: isSelected ? tokens.colors.accent.teal + '30' : isAllowed ? tokens.colors.bg.tertiary : tokens.colors.bg.primary,
              cursor: isAllowed ? 'pointer' : 'not-allowed', opacity: isAllowed ? 1 : 0.3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isSelected && <div style={{ width: 8, height: 8, borderRadius: pos === 'CENTER' ? '50%' : 2, background: tokens.colors.accent.teal }} />}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// SIZE CONTROL (Tri-tier)
// =============================================================================

function SizeControl({ preset, percent, pixels, onPresetChange, onPercentChange, onPixelsChange }) {
  const presets = [
    { id: 'xs', label: 'XS', percent: 6, pixels: 40 },
    { id: 'sm', label: 'S', percent: 9, pixels: 60 },
    { id: 'md', label: 'M', percent: 12, pixels: 80 },
    { id: 'lg', label: 'L', percent: 16, pixels: 120 },
    { id: 'xl', label: 'XL', percent: 20, pixels: 160 },
  ];
  
  const handlePresetClick = (p) => {
    onPresetChange(p.id);
    onPercentChange(p.percent);
    onPixelsChange(p.pixels);
  };
  
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Size Presets</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {presets.map(p => (
            <button key={p.id} onClick={() => handlePresetClick(p)} style={{
              flex: 1, padding: '4px 2px', borderRadius: 4,
              border: `1px solid ${preset === p.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
              background: preset === p.id ? tokens.colors.accent.teal + '20' : 'transparent',
              color: preset === p.id ? tokens.colors.accent.teal : tokens.colors.text.muted,
              fontSize: 9, fontWeight: 600, cursor: 'pointer',
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Viewport %</span>
          <span style={{ fontSize: 9, color: tokens.colors.accent.purple, fontFamily: 'monospace' }}>{percent}%</span>
        </div>
        <input type="range" min="5" max="25" value={percent}
          onChange={(e) => { onPercentChange(parseInt(e.target.value)); onPresetChange(null); }}
          style={{ width: '100%', height: 3, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }}
        />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Fine (px)</span>
          <span style={{ fontSize: 9, color: tokens.colors.accent.cyan, fontFamily: 'monospace' }}>{pixels}px</span>
        </div>
        <input type="range" min="30" max="200" value={pixels}
          onChange={(e) => { onPixelsChange(parseInt(e.target.value)); onPresetChange(null); }}
          style={{ width: '100%', height: 3, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// OVERLAY TOGGLE CHIP
// =============================================================================

function OverlayToggle({ config, overlayConfig, isActive, hasSettingsOpen, onToggle, onSettingsClick }) {
  const activeLabel = isActive && overlayConfig.getActiveLabel ? overlayConfig.getActiveLabel(config) : null;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <button onClick={onToggle} title={`${overlayConfig.name} (${overlayConfig.shortcut})`} style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
        borderRadius: overlayConfig.hasSettings ? '5px 0 0 5px' : '5px',
        border: `1px solid ${isActive ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
        borderRight: overlayConfig.hasSettings ? 'none' : undefined,
        background: isActive ? tokens.colors.accent.teal + '20' : 'transparent',
        color: isActive ? tokens.colors.accent.teal : tokens.colors.text.muted,
        fontSize: 10, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
      }}>
        <span style={{ fontSize: 11 }}>{overlayConfig.icon}</span>
        <span>{overlayConfig.name}</span>
        {activeLabel && (
          <span style={{ fontSize: 8, opacity: 0.8, padding: '1px 3px', background: tokens.colors.accent.teal + '30', borderRadius: 2 }}>{activeLabel}</span>
        )}
      </button>
      {overlayConfig.hasSettings && (
        <button onClick={onSettingsClick} disabled={!isActive} style={{
          padding: '5px 6px', borderRadius: '0 5px 5px 0',
          border: `1px solid ${isActive ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
          background: hasSettingsOpen ? tokens.colors.accent.teal + '30' : isActive ? tokens.colors.accent.teal + '10' : 'transparent',
          color: isActive ? tokens.colors.accent.teal : tokens.colors.text.muted,
          fontSize: 8, cursor: isActive ? 'pointer' : 'not-allowed', opacity: isActive ? 1 : 0.5,
        }}>{hasSettingsOpen ? '▲' : '▼'}</button>
      )}
    </div>
  );
}

// =============================================================================
// SETTINGS PANELS (Compact versions)
// =============================================================================

function OrientationSettings({ config, onChange, onReset }) {
  const styles = [
    { id: 'cube', name: 'Cube' }, { id: 'arrows', name: 'Arrows' }, { id: 'compass', name: 'Compass' },
    { id: 'gimbal', name: 'Gimbal' }, { id: 'human', name: 'Human' },
  ];
  return (
    <div style={{ padding: 10 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Style</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {styles.map(s => (
            <button key={s.id} onClick={() => onChange({ ...config, style: s.id })} style={{
              padding: '4px 7px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
              border: `1px solid ${config.style === s.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
              background: config.style === s.id ? tokens.colors.accent.teal + '20' : 'transparent',
              color: config.style === s.id ? tokens.colors.accent.teal : tokens.colors.text.secondary,
            }}>{s.name}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Position</div>
          <PositionGrid value={config.position} onChange={(pos) => onChange({ ...config, position: pos })} />
        </div>
        <div style={{ flex: 1 }}>
          <SizeControl
            preset={config.sizePreset} percent={config.sizePercent} pixels={config.sizePixels}
            onPresetChange={(val) => onChange({ ...config, sizePreset: val })}
            onPercentChange={(val) => onChange({ ...config, sizePercent: val })}
            onPixelsChange={(val) => onChange({ ...config, sizePixels: val })}
          />
        </div>
      </div>
      <button onClick={onReset} style={{
        width: '100%', padding: '5px', borderRadius: 4, border: `1px solid ${tokens.colors.border.subtle}`,
        background: 'transparent', color: tokens.colors.text.muted, fontSize: 9, cursor: 'pointer',
      }}>↺ Reset</button>
    </div>
  );
}

function GridSettings({ config, onChange, onReset }) {
  return (
    <div style={{ padding: 10 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Plane</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'xy', label: 'XY' }, { id: 'xz', label: 'XZ' }, { id: 'yz', label: 'YZ' }].map(p => (
            <button key={p.id} onClick={() => onChange({ ...config, plane: p.id })} style={{
              flex: 1, padding: '5px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
              border: `1px solid ${config.plane === p.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
              background: config.plane === p.id ? tokens.colors.accent.teal + '20' : 'transparent',
              color: config.plane === p.id ? tokens.colors.accent.teal : tokens.colors.text.secondary,
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Divisions</span>
            <span style={{ fontSize: 9, color: tokens.colors.accent.teal, fontFamily: 'monospace' }}>{config.divisions}</span>
          </div>
          <input type="range" min="2" max="20" value={config.divisions}
            onChange={(e) => onChange({ ...config, divisions: parseInt(e.target.value) })}
            style={{ width: '100%', height: 3, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Opacity</span>
            <span style={{ fontSize: 9, color: tokens.colors.accent.teal, fontFamily: 'monospace' }}>{config.opacity}%</span>
          </div>
          <input type="range" min="10" max="100" value={config.opacity}
            onChange={(e) => onChange({ ...config, opacity: parseInt(e.target.value) })}
            style={{ width: '100%', height: 3, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }} />
        </div>
      </div>
      <button onClick={onReset} style={{
        width: '100%', padding: '5px', borderRadius: 4, border: `1px solid ${tokens.colors.border.subtle}`,
        background: 'transparent', color: tokens.colors.text.muted, fontSize: 9, cursor: 'pointer',
      }}>↺ Reset</button>
    </div>
  );
}

function ScaleBarSettings({ config, onChange, onReset }) {
  const styles = [{ id: 'simple', name: 'Simple' }, { id: 'ticked', name: 'Ticked' }, { id: 'bracketed', name: 'Bracket' }, { id: 'boxed', name: 'Boxed' }];
  return (
    <div style={{ padding: 10 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Style</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {styles.map(s => (
              <button key={s.id} onClick={() => onChange({ ...config, style: s.id })} style={{
                padding: '3px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                border: `1px solid ${config.style === s.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
                background: config.style === s.id ? tokens.colors.accent.teal + '20' : 'transparent',
                color: config.style === s.id ? tokens.colors.accent.teal : tokens.colors.text.secondary,
              }}>{s.name}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Orientation</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {['H', 'V'].map(o => (
              <button key={o} onClick={() => onChange({ ...config, orientation: o === 'H' ? 'horizontal' : 'vertical' })} style={{
                padding: '3px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                border: `1px solid ${config.orientation === (o === 'H' ? 'horizontal' : 'vertical') ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
                background: config.orientation === (o === 'H' ? 'horizontal' : 'vertical') ? tokens.colors.accent.teal + '20' : 'transparent',
                color: config.orientation === (o === 'H' ? 'horizontal' : 'vertical') ? tokens.colors.accent.teal : tokens.colors.text.secondary,
              }}>{o}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Behavior</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[{ id: 'auto', name: 'Auto' }, { id: 'fixed', name: 'Fixed' }].map(b => (
              <button key={b.id} onClick={() => onChange({ ...config, behavior: b.id })} style={{
                flex: 1, padding: '4px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                border: `1px solid ${config.behavior === b.id ? tokens.colors.accent.teal : tokens.colors.border.subtle}`,
                background: config.behavior === b.id ? tokens.colors.accent.teal + '20' : 'transparent',
                color: config.behavior === b.id ? tokens.colors.accent.teal : tokens.colors.text.secondary,
              }}>{b.name}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Units</div>
          <select value={config.units} onChange={(e) => onChange({ ...config, units: e.target.value })} style={{
            width: '100%', padding: '4px', borderRadius: 4, border: `1px solid ${tokens.colors.border.subtle}`,
            background: tokens.colors.bg.tertiary, color: tokens.colors.text.primary, fontSize: 9, cursor: 'pointer',
          }}>
            <option value="auto">From Data</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>
      <button onClick={onReset} style={{
        width: '100%', padding: '5px', borderRadius: 4, border: `1px solid ${tokens.colors.border.subtle}`,
        background: 'transparent', color: tokens.colors.text.muted, fontSize: 9, cursor: 'pointer',
      }}>↺ Reset</button>
    </div>
  );
}

// =============================================================================
// SCENE OVERLAYS SECTION
// =============================================================================

function SceneOverlaysSection({ isExpanded, onToggle }) {
  const [activeOverlays, setActiveOverlays] = useState({ orientation: true, grid: false, axes: true, scalebar: false, coordinates: false, fps: false });
  const [overlayConfigs, setOverlayConfigs] = useState({ ...OVERLAY_DEFAULTS });
  const [openSettings, setOpenSettings] = useState(null);
  
  const toggleOverlay = (id) => {
    setActiveOverlays(prev => ({ ...prev, [id]: !prev[id] }));
    if (activeOverlays[id] && openSettings === id) setOpenSettings(null);
  };
  
  const activeCount = Object.values(activeOverlays).filter(Boolean).length;
  
  const SettingsComponent = { orientation: OrientationSettings, grid: GridSettings, scalebar: ScaleBarSettings }[openSettings];
  
  return (
    <div>
      <SectionHeader icon="🎨" label="Scene Overlays" color={tokens.colors.accent.teal}
        isExpanded={isExpanded} onToggle={onToggle} badge={activeCount > 0 ? `${activeCount}` : null} />
      
      {isExpanded && (
        <div style={{ padding: '8px 12px 12px', position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {['orientation', 'grid', 'axes', 'scalebar'].map(id => (
              <OverlayToggle key={id} config={overlayConfigs[id]} overlayConfig={OVERLAY_CONFIG[id]}
                isActive={activeOverlays[id]} hasSettingsOpen={openSettings === id}
                onToggle={() => toggleOverlay(id)} onSettingsClick={() => setOpenSettings(openSettings === id ? null : id)} />
            ))}
          </div>
          
          {/* Overlay Settings Panel */}
          {openSettings && SettingsComponent && activeOverlays[openSettings] && (
            <div style={{
              position: 'absolute', left: 12, right: 12, top: 50, zIndex: 100,
              background: tokens.colors.bg.secondary, borderRadius: 6,
              border: `1px solid ${tokens.colors.accent.teal}40`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                padding: '6px 10px', background: tokens.colors.accent.teal + '15',
                borderBottom: `1px solid ${tokens.colors.border.subtle}`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 11 }}>{OVERLAY_CONFIG[openSettings].icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.teal }}>{OVERLAY_CONFIG[openSettings].name}</span>
                <button onClick={() => setOpenSettings(null)} style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  color: tokens.colors.text.muted, cursor: 'pointer', fontSize: 12,
                }}>✕</button>
              </div>
              <SettingsComponent config={overlayConfigs[openSettings]}
                onChange={(c) => setOverlayConfigs(prev => ({ ...prev, [openSettings]: c }))}
                onReset={() => setOverlayConfigs(prev => ({ ...prev, [openSettings]: { ...OVERLAY_DEFAULTS[openSettings] } }))} />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 5, paddingTop: 8, borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
            {['coordinates', 'fps'].map(id => (
              <OverlayToggle key={id} config={overlayConfigs[id] || {}} overlayConfig={OVERLAY_CONFIG[id]}
                isActive={activeOverlays[id]} hasSettingsOpen={false}
                onToggle={() => toggleOverlay(id)} onSettingsClick={() => {}} />
            ))}
          </div>
          
          <div style={{ marginTop: 8, padding: '5px 8px', background: tokens.colors.bg.tertiary, borderRadius: 4, fontSize: 9, color: tokens.colors.text.muted }}>
            ⌨️ Shift+G/O/A/B for quick toggle
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WINDOW/LEVEL SECTION
// =============================================================================

function WindowLevelSection({ isExpanded, onToggle }) {
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [preset, setPreset] = useState('soft');
  const [invert, setInvert] = useState(false);
  
  const presets = [
    { id: 'brain', name: 'Brain', w: 80, c: 40 },
    { id: 'bone', name: 'Bone', w: 2000, c: 500 },
    { id: 'lung', name: 'Lung', w: 1500, c: -600 },
    { id: 'soft', name: 'Soft', w: 400, c: 40 },
  ];
  
  return (
    <div>
      <SectionHeader icon="🌗" label="Window / Level" color={tokens.colors.accent.orange}
        isExpanded={isExpanded} onToggle={onToggle} />
      
      {isExpanded && (
        <div style={{ padding: '8px 12px 12px' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Presets</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {presets.map(p => (
                <button key={p.id} onClick={() => { setPreset(p.id); setWindowWidth(p.w); setWindowCenter(p.c); }} style={{
                  padding: '5px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${preset === p.id ? tokens.colors.accent.orange : tokens.colors.border.subtle}`,
                  background: preset === p.id ? tokens.colors.accent.orange + '20' : 'transparent',
                  color: preset === p.id ? tokens.colors.accent.orange : tokens.colors.text.secondary,
                }}>{p.name}</button>
              ))}
              <button onClick={() => setPreset('custom')} style={{
                padding: '5px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                border: `1px solid ${preset === 'custom' ? tokens.colors.accent.orange : tokens.colors.border.subtle}`,
                background: preset === 'custom' ? tokens.colors.accent.orange + '20' : 'transparent',
                color: preset === 'custom' ? tokens.colors.accent.orange : tokens.colors.text.secondary,
              }}>Custom</button>
            </div>
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Window Width</span>
              <span style={{ fontSize: 9, color: tokens.colors.accent.orange, fontFamily: 'monospace' }}>{windowWidth}</span>
            </div>
            <input type="range" min="1" max="4000" value={windowWidth}
              onChange={(e) => { setWindowWidth(parseInt(e.target.value)); setPreset('custom'); }}
              style={{ width: '100%', height: 4, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }} />
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Window Center</span>
              <span style={{ fontSize: 9, color: tokens.colors.accent.orange, fontFamily: 'monospace' }}>{windowCenter}</span>
            </div>
            <input type="range" min="-1000" max="1000" value={windowCenter}
              onChange={(e) => { setWindowCenter(parseInt(e.target.value)); setPreset('custom'); }}
              style={{ width: '100%', height: 4, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }} />
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: 10, color: tokens.colors.text.secondary }}>Invert Colors</span>
            <div onClick={() => setInvert(!invert)} style={{
              width: 32, height: 18, borderRadius: 9, background: invert ? tokens.colors.accent.orange : tokens.colors.bg.tertiary,
              position: 'relative', cursor: 'pointer',
            }}>
              <div style={{ position: 'absolute', top: 2, left: invert ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
            </div>
          </label>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// APPEARANCE SECTION
// =============================================================================

function AppearanceSection({ isExpanded, onToggle }) {
  const [renderMode, setRenderMode] = useState('volume');
  const [colorMap, setColorMap] = useState('grayscale');
  const [opacity, setOpacity] = useState(100);
  
  return (
    <div>
      <SectionHeader icon="👁" label="Appearance" color={tokens.colors.accent.green}
        isExpanded={isExpanded} onToggle={onToggle} />
      
      {isExpanded && (
        <div style={{ padding: '8px 12px 12px' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Render Mode</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Volume', 'Surface', 'Slice', 'MIP'].map(mode => (
                <button key={mode} onClick={() => setRenderMode(mode.toLowerCase())} style={{
                  flex: 1, padding: '5px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                  border: `1px solid ${renderMode === mode.toLowerCase() ? tokens.colors.accent.green : tokens.colors.border.subtle}`,
                  background: renderMode === mode.toLowerCase() ? tokens.colors.accent.green + '20' : 'transparent',
                  color: renderMode === mode.toLowerCase() ? tokens.colors.accent.green : tokens.colors.text.secondary,
                }}>{mode}</button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4, textTransform: 'uppercase' }}>Color Map</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['Grayscale', 'Viridis', 'Plasma', 'Hot', 'Cool'].map(cm => (
                <button key={cm} onClick={() => setColorMap(cm.toLowerCase())} style={{
                  padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                  border: `1px solid ${colorMap === cm.toLowerCase() ? tokens.colors.accent.green : tokens.colors.border.subtle}`,
                  background: colorMap === cm.toLowerCase() ? tokens.colors.accent.green + '20' : 'transparent',
                  color: colorMap === cm.toLowerCase() ? tokens.colors.accent.green : tokens.colors.text.secondary,
                }}>{cm}</button>
              ))}
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Opacity</span>
              <span style={{ fontSize: 9, color: tokens.colors.accent.green, fontFamily: 'monospace' }}>{opacity}%</span>
            </div>
            <input type="range" min="0" max="100" value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value))}
              style={{ width: '100%', height: 4, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 2, cursor: 'pointer' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TOOLS TAB SECTIONS (Simplified)
// =============================================================================

function ToolsTabContent() {
  const [expanded, setExpanded] = useState({ camera: true, transform: false, slice: false });
  
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <SectionHeader icon="📷" label="Camera" color={tokens.colors.accent.cyan}
        isExpanded={expanded.camera} onToggle={() => setExpanded(p => ({ ...p, camera: !p.camera }))} />
      {expanded.camera && (
        <div style={{ padding: '8px 12px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 150 }}>
            {['Top', 'Front', 'Right', 'Bot', 'Back', 'Left', 'Iso', 'Reset', ''].map((label, i) => label ? (
              <button key={label} style={{
                padding: '8px 4px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                background: label === 'Reset' ? tokens.colors.accent.cyan + '20' : tokens.colors.bg.tertiary,
                border: `1px solid ${label === 'Reset' ? tokens.colors.accent.cyan : tokens.colors.border.subtle}`,
                color: label === 'Reset' ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
              }}>{label}</button>
            ) : <div key={i} />)}
          </div>
        </div>
      )}
      
      <SectionHeader icon="🎛️" label="Transform" color={tokens.colors.accent.pink}
        isExpanded={expanded.transform} onToggle={() => setExpanded(p => ({ ...p, transform: !p.transform }))} />
      {expanded.transform && (
        <div style={{ padding: '8px 12px 12px', fontSize: 10, color: tokens.colors.text.muted }}>
          Position, Rotation, Scale controls...
        </div>
      )}
      
      <SectionHeader icon="🔪" label="Slice" color={tokens.colors.accent.blue}
        isExpanded={expanded.slice} onToggle={() => setExpanded(p => ({ ...p, slice: !p.slice }))} />
      {expanded.slice && (
        <div style={{ padding: '8px 12px 12px', fontSize: 10, color: tokens.colors.text.muted }}>
          Axial, Sagittal, Coronal slice controls...
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DISPLAY TAB CONTENT
// =============================================================================

function DisplayTabContent() {
  const [expanded, setExpanded] = useState({ overlays: true, windowLevel: false, appearance: false });
  
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <SceneOverlaysSection isExpanded={expanded.overlays} onToggle={() => setExpanded(p => ({ ...p, overlays: !p.overlays }))} />
      <WindowLevelSection isExpanded={expanded.windowLevel} onToggle={() => setExpanded(p => ({ ...p, windowLevel: !p.windowLevel }))} />
      <AppearanceSection isExpanded={expanded.appearance} onToggle={() => setExpanded(p => ({ ...p, appearance: !p.appearance }))} />
    </div>
  );
}

// =============================================================================
// ANNOTATIONS TAB (Placeholder)
// =============================================================================

function AnnotationsTabContent() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📝</div>
        <div style={{ fontSize: 12, color: tokens.colors.text.muted }}>Annotations Tab</div>
        <div style={{ fontSize: 10, color: tokens.colors.text.muted, marginTop: 4 }}>(To be designed)</div>
      </div>
    </div>
  );
}

// =============================================================================
// FULL INSTANCE TOOLS PANEL WITH 3 TABS
// =============================================================================

function InstanceToolsPanel() {
  const [activeTab, setActiveTab] = useState('display');
  
  const tabs = [
    { id: 'tools', label: 'Tools', icon: '🔧', color: tokens.colors.accent.amber },
    { id: 'display', label: 'Display', icon: '👁', color: tokens.colors.accent.teal },
    { id: 'annotations', label: 'Annotations', icon: '📝', color: tokens.colors.accent.pink },
  ];
  
  return (
    <div style={{
      width: 340, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.lg,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh',
    }}>
      {/* Mock Instance Header */}
      <div style={{
        padding: '10px 12px', background: tokens.colors.bg.tertiary,
        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: tokens.colors.accent.purple + '30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16 }}>🧠</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: tokens.colors.text.primary }}>Brain MRI - Axial</div>
          <div style={{ fontSize: 9, color: tokens.colors.text.muted }}>VTK Volume • 512 × 512 × 256</div>
        </div>
      </div>
      
      {/* Tab Bar - 3 TABS */}
      <div style={{
        display: 'flex', gap: 4, padding: '8px 12px',
        background: tokens.colors.bg.primary, borderBottom: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '7px 10px', borderRadius: 6,
            border: `1px solid ${activeTab === tab.id ? tab.color + '50' : tokens.colors.border.subtle}`,
            background: activeTab === tab.id ? tab.color + '15' : tokens.colors.bg.glass,
            color: activeTab === tab.id ? tab.color : tokens.colors.text.muted,
            fontSize: 10, fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer',
          }}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'tools' && <ToolsTabContent />}
        {activeTab === 'display' && <DisplayTabContent />}
        {activeTab === 'annotations' && <AnnotationsTabContent />}
      </div>
      
      {/* Layers Footer (always visible) */}
      <div style={{
        padding: '10px 12px', background: tokens.colors.bg.tertiary,
        borderTop: `1px solid ${tokens.colors.border.subtle}`,
      }}>
        <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 6, textTransform: 'uppercase' }}>Layers & Widgets</div>
        <div style={{ fontSize: 10, color: tokens.colors.text.secondary }}>3 layers • 2 measurements</div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DEMO
// =============================================================================

export default function DisplayTabArtifact() {
  return (
    <div style={{
      minHeight: '100vh', background: tokens.colors.bg.primary,
      padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: tokens.colors.accent.teal + '30', color: tokens.colors.accent.teal,
            fontSize: 10, fontWeight: 600,
          }}>DESIGN 1 OF 7 - V3</span>
        </div>
        <h1 style={{ color: tokens.colors.text.primary, fontSize: 20, marginBottom: 8 }}>
          Display Tab in Instance Tools
        </h1>
        <p style={{ color: tokens.colors.text.muted, fontSize: 12, maxWidth: 600 }}>
          New tab structure: <strong>Tools</strong> (manipulation), <strong>Display</strong> (visual settings),
          <strong> Annotations</strong>. Click tabs to see content.
        </p>
      </div>
      
      {/* Panel */}
      <InstanceToolsPanel />
      
      {/* Design Notes */}
      <div style={{ marginTop: 24, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 500 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.amber, marginBottom: 8 }}>TAB RESTRUCTURE</div>
        <table style={{ fontSize: 11, color: tokens.colors.text.secondary, borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>Tab</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>Sections</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px' }}>🔧 Tools</td>
              <td style={{ padding: '4px 8px' }}>Camera, Transform, Slice</td>
              <td style={{ padding: '4px 8px' }}>Data manipulation</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}>👁 Display</td>
              <td style={{ padding: '4px 8px' }}>Scene Overlays, Window/Level, Appearance</td>
              <td style={{ padding: '4px 8px' }}>Visual settings</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px' }}>📝 Annotations</td>
              <td style={{ padding: '4px 8px' }}>TBD</td>
              <td style={{ padding: '4px 8px' }}>Markup & notes</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Questions */}
      <div style={{
        marginTop: 16, padding: 16, background: tokens.colors.accent.purple + '10',
        borderRadius: 8, border: `1px solid ${tokens.colors.accent.purple}30`, maxWidth: 500,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.purple, marginBottom: 8 }}>QUESTIONS</div>
        <ul style={{ fontSize: 11, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>Does this 3-tab structure feel right?</li>
          <li>Is "Display" the right name? Alternatives: View, Visuals, Render?</li>
          <li>Should Appearance stay in Display or move to Tools?</li>
        </ul>
      </div>
    </div>
  );
}
