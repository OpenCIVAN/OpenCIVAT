import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24', 
      glass: 'rgba(255,255,255,0.03)',
      glassHover: 'rgba(255,255,255,0.06)',
    },
    border: { 
      subtle: 'rgba(255,255,255,0.06)', 
      default: 'rgba(255,255,255,0.1)',
      strong: 'rgba(255,255,255,0.15)',
    },
    text: { 
      primary: '#ffffff', 
      secondary: 'rgba(255,255,255,0.7)', 
      muted: 'rgba(255,255,255,0.4)' 
    },
    accent: { 
      purple: '#a855f7', 
      blue: '#3b82f6', 
      cyan: '#22d3ee', 
      green: '#22c55e', 
      amber: '#f59e0b', 
      pink: '#ec4899',
      teal: '#14b8a6',
      orange: '#f97316',
      red: '#ef4444',
    },
  },
  text: { xs: '10px', sm: '11px', md: '12px', lg: '13px' },
  radius: { sm: 4, md: 6, lg: 8 },
};

// =============================================================================
// MOCK DATA
// =============================================================================
const MOCK_INSTANCE = {
  id: 'v-1',
  viewName: 'Axial Slice',
  datasetName: 'patient_brain_mri.nii.gz',
  instanceType: 'vtk-volume',
  color: '#a855f7',
  position: 'A1',
};

const SMALL_VIEWGROUP = {
  id: 'vg-1',
  name: 'Brain Analysis',
  color: '#a855f7',
  views: [
    { id: 'v-1', name: 'Axial', color: '#a855f7', position: 'A1', isActive: true },
    { id: 'v-2', name: 'Sagittal', color: '#3b82f6', position: 'A2', isActive: false },
    { id: 'v-3', name: '3D Volume', color: '#22c55e', position: 'B1', isActive: false },
  ],
  links: [{ viewIds: ['v-1', 'v-2'], type: 'camera' }],
};

const LARGE_VIEWGROUP = {
  id: 'vg-2',
  name: 'Comparison Grid',
  color: '#f59e0b',
  views: [
    { id: 'v-1', name: 'Pre-Op Axial', color: '#a855f7', position: 'A1', isActive: true },
    { id: 'v-2', name: 'Pre-Op Sag', color: '#3b82f6', position: 'A2', isActive: false },
    { id: 'v-3', name: 'Pre-Op Cor', color: '#22c55e', position: 'A3', isActive: false },
    { id: 'v-4', name: 'Post-Op Axial', color: '#ec4899', position: 'B1', isActive: false },
    { id: 'v-5', name: 'Post-Op Sag', color: '#f97316', position: 'B2', isActive: false },
    { id: 'v-6', name: 'Post-Op Cor', color: '#14b8a6', position: 'B3', isActive: false },
    { id: 'v-7', name: 'Diff Map', color: '#22d3ee', position: 'C1', isActive: false },
    { id: 'v-8', name: 'Stats', color: '#f59e0b', position: 'C2', isActive: false },
  ],
  links: [
    { viewIds: ['v-1', 'v-2', 'v-3'], type: 'camera' },
    { viewIds: ['v-4', 'v-5', 'v-6'], type: 'camera' },
  ],
};

const MOCK_LAYERS = [
  { id: 'l-1', name: 'Base Volume', type: 'data', visible: true, opacity: 100 },
  { id: 'l-2', name: 'Tumor Segmentation', type: 'overlay', visible: true, opacity: 75 },
  { id: 'l-3', name: 'Vessel Mask', type: 'overlay', visible: false, opacity: 60 },
];

const MOCK_WIDGETS = [
  { id: 'w-1', name: 'Line Measurement', type: 'line', visible: true, opacity: 100, 
    value: '45.2 mm', details: { start: '(12.4, 34.8, 56.2)', end: '(57.6, 34.8, 56.2)' } },
  { id: 'w-2', name: 'Angle Tool', type: 'angle', visible: true, opacity: 80, 
    value: '32.5°', details: { vertex: '(45.0, 67.2, 89.1)', angle: '32.5°' } },
];

// Tool sections configuration
const TOOL_SECTIONS = [
  { id: 'camera', label: 'Camera', icon: '📷', color: tokens.colors.accent.cyan },
  { id: 'transform', label: 'Transform', icon: '🎛️', color: tokens.colors.accent.pink },
  { id: 'slice', label: 'Slice', icon: '🔪', color: tokens.colors.accent.blue },
  { id: 'windowLevel', label: 'Window/Level', icon: '🌗', color: tokens.colors.accent.orange },
  { id: 'appearance', label: 'Appearance', icon: '👁', color: tokens.colors.accent.green },
];

// =============================================================================
// SHARED COMPONENTS
// =============================================================================
const ColorDot = ({ color, size = 8, glow = false }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    borderRadius: '50%', background: color,
    boxShadow: glow ? `0 0 6px ${color}` : 'none', flexShrink: 0,
  }} />
);

const Badge = ({ children, color = tokens.colors.accent.purple }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 6px',
    borderRadius: tokens.radius.sm, fontSize: '9px', fontWeight: 500,
    background: `${color}25`, color,
  }}>{children}</span>
);

const IconButton = ({ icon, onClick, title, size = 14, active, color, disabled, style = {} }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, minWidth: 24, borderRadius: tokens.radius.sm, border: 'none',
    background: active ? `${color || tokens.colors.accent.purple}20` : 'transparent',
    color: disabled ? tokens.colors.text.muted : active ? (color || tokens.colors.accent.purple) : tokens.colors.text.secondary,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    fontSize: size, transition: 'all 0.15s', ...style,
  }}>{icon}</button>
);

const MiniSlider = ({ value, onChange, color = tokens.colors.accent.purple, min = 0, max = 100 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 90 }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          flex: 1, height: 4, appearance: 'none', cursor: 'pointer',
          background: `linear-gradient(to right, ${color} ${percentage}%, ${tokens.colors.bg.tertiary} ${percentage}%)`,
          borderRadius: 2,
        }}
      />
      <span style={{ fontSize: 9, color: tokens.colors.text.muted, width: 28, textAlign: 'right', fontFamily: 'monospace' }}>
        {value}%
      </span>
    </div>
  );
};

// =============================================================================
// VIEWGROUP STRIP (Adaptive: Connectors ≤5, Grid 6+)
// =============================================================================
function ViewGroupStrip({ viewGroup, onViewSelect }) {
  const TIPPING_POINT = 5;
  const [expanded, setExpanded] = useState(false);
  const activeView = viewGroup.views.find(v => v.isActive);
  
  const linkedViewIds = useMemo(() => {
    const ids = new Set();
    viewGroup.links?.forEach(link => {
      if (link.viewIds.includes(activeView?.id)) {
        link.viewIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [viewGroup.links, activeView?.id]);
  
  const useConnectors = viewGroup.views.length <= TIPPING_POINT;
  const gridSize = Math.ceil(Math.sqrt(viewGroup.views.length));
  
  return (
    <div style={{
      background: `${viewGroup.color}15`,
      borderBottom: `1px solid ${viewGroup.color}25`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
        <ColorDot color={viewGroup.color} size={8} glow />
        <span style={{ fontSize: 11, fontWeight: 600, color: viewGroup.color }}>{viewGroup.name}</span>
        {!useConnectors && <Badge color={viewGroup.color}>{viewGroup.views.length}</Badge>}
        <div style={{ flex: 1 }} />
        
        {/* For large groups: active chip + grid toggle */}
        {!useConnectors && (
          <>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4,
              background: `${activeView.color}30`,
              border: `1px solid ${activeView.color}`,
              color: activeView.color, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            }}>
              <ColorDot color={activeView.color} size={5} />
              {activeView.name}
              <span style={{ fontSize: 8, fontFamily: 'monospace' }}>{activeView.position}</span>
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                width: 26, height: 26, borderRadius: 4,
                background: expanded ? `${viewGroup.color}20` : tokens.colors.bg.glass,
                border: `1px solid ${expanded ? viewGroup.color : tokens.colors.border.subtle}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(gridSize, 3)}, 4px)`, gap: 1 }}>
                {viewGroup.views.slice(0, 9).map((v, i) => (
                  <div key={i} style={{ width: 4, height: 4, background: v.isActive ? v.color : `${v.color}60`, borderRadius: 1 }} />
                ))}
              </div>
            </button>
          </>
        )}
        <IconButton icon="⚙" title="Group Settings" size={11} />
      </div>
      
      {/* Connector style for ≤5 views */}
      {useConnectors && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px 8px' }}>
          {viewGroup.views.map((view, index) => {
            const isLinked = linkedViewIds.has(view.id);
            const nextView = viewGroup.views[index + 1];
            const showConnector = isLinked && nextView && linkedViewIds.has(nextView.id);
            
            return (
              <React.Fragment key={view.id}>
                <button
                  onClick={() => onViewSelect?.(view.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: view.isActive ? '5px 10px' : '5px 8px', borderRadius: 4,
                    background: view.isActive ? `${view.color}30` : tokens.colors.bg.glass,
                    border: `1px solid ${view.isActive ? view.color : tokens.colors.border.subtle}`,
                    color: view.isActive ? view.color : tokens.colors.text.muted,
                    fontSize: 10, fontWeight: view.isActive ? 600 : 400, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <ColorDot color={view.color} size={5} glow={view.isActive} />
                  {view.isActive && <span>{view.name}</span>}
                  <span style={{ fontSize: 8, fontFamily: 'monospace' }}>{view.position}</span>
                </button>
                {showConnector && (
                  <div style={{
                    width: 18, height: 2, alignSelf: 'center', borderRadius: 1, position: 'relative',
                    background: `linear-gradient(90deg, ${view.color}, ${nextView.color})`,
                  }}>
                    <span style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', fontSize: 7 }}>🔗</span>
                  </div>
                )}
                {!showConnector && index < viewGroup.views.length - 1 && <div style={{ width: 6 }} />}
              </React.Fragment>
            );
          })}
        </div>
      )}
      
      {/* Expanded grid for 6+ views */}
      {!useConnectors && expanded && (
        <div style={{ margin: '0 12px 10px', padding: 10, background: tokens.colors.bg.tertiary, borderRadius: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gap: 4 }}>
            {viewGroup.views.map(view => (
              <button
                key={view.id}
                onClick={() => onViewSelect?.(view.id)}
                title={view.name}
                style={{
                  aspectRatio: '1', borderRadius: 4,
                  background: view.isActive ? `${view.color}40` : `${view.color}20`,
                  border: `2px solid ${view.isActive ? view.color : 'transparent'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, color: view.color,
                }}
              >
                {view.position}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// INSTANCE HEADER
// =============================================================================
function InstanceHeader({ instance }) {
  return (
    <div style={{ padding: '12px', borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${instance.color}20`, border: `2px solid ${instance.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>◈</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.text.primary }}>{instance.viewName}</span>
            <Badge color={tokens.colors.text.muted}>{instance.instanceType}</Badge>
          </div>
          <div style={{ fontSize: 10, color: tokens.colors.text.muted, marginTop: 2 }}>{instance.datasetName}</div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 4,
          background: `${instance.color}20`, color: instance.color,
          fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
        }}>{instance.position}</span>
      </div>
    </div>
  );
}

// =============================================================================
// DOT NAVIGATION
// =============================================================================
function DotNavigation({ sections, activeSection, onNavigate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '8px 12px',
      borderBottom: `1px solid ${tokens.colors.border.subtle}`,
    }}>
      {sections.map(section => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            title={section.label}
            style={{
              width: isActive ? 20 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: isActive ? section.color : tokens.colors.bg.tertiary,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// TOOLS TAB CONTENT (with scrolling sections)
// =============================================================================
function ToolsTabContent({ sections }) {
  const [activeSection, setActiveSection] = useState('camera');
  const [expandedSections, setExpandedSections] = useState({ camera: true, transform: true, slice: true, windowLevel: true, appearance: true });
  const sectionRefs = useRef({});
  const containerRef = useRef(null);
  
  // Transform state
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 100, y: 100, z: 100 });
  const [uniformScale, setUniformScale] = useState(true);
  
  // Other controls state
  const [sliceValue, setSliceValue] = useState(127);
  const [windowValue, setWindowValue] = useState(400);
  const [levelValue, setLevelValue] = useState(40);
  const [opacityValue, setOpacityValue] = useState(100);
  
  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const navigateToSection = (id) => {
    setActiveSection(id);
    setExpandedSections(prev => ({ ...prev, [id]: true }));
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // Track scroll position to update active dot
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentSection = 'camera';
      
      sections.forEach(section => {
        const ref = sectionRefs.current[section.id];
        if (ref && ref.offsetTop <= scrollTop + 50) {
          currentSection = section.id;
        }
      });
      
      setActiveSection(currentSection);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sections]);
  
  const SectionHeader = ({ section, isExpanded }) => (
    <div
      ref={el => sectionRefs.current[section.id] = el}
      onClick={() => toggleSection(section.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', cursor: 'pointer',
        background: isExpanded ? `${section.color}10` : 'transparent',
        borderLeft: `3px solid ${isExpanded ? section.color : 'transparent'}`,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 10, color: tokens.colors.text.muted }}>{isExpanded ? '▼' : '▶'}</span>
      <span style={{ fontSize: 14 }}>{section.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: isExpanded ? section.color : tokens.colors.text.primary }}>
        {section.label}
      </span>
    </div>
  );
  
  const AxisSlider = ({ axis, value, onChange, min, max, unit = '', color }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: tokens.colors.text.secondary }}>{axis}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', height: 5, appearance: 'none', cursor: 'pointer',
          background: tokens.colors.bg.tertiary, borderRadius: 3,
        }}
      />
    </div>
  );
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Dot Navigation */}
      <DotNavigation sections={sections} activeSection={activeSection} onNavigate={navigateToSection} />
      
      {/* Scrollable Content */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* CAMERA */}
        <div>
          <SectionHeader section={sections[0]} isExpanded={expandedSections.camera} />
          {expandedSections.camera && (
            <div style={{ padding: '8px 12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 180, margin: '0 auto' }}>
                {[
                  { id: 'iso', label: 'Iso', icon: '◇' },
                  { id: 'top', label: 'Top', icon: '⬆' },
                  null,
                  { id: 'left', label: 'Left', icon: '⬅' },
                  { id: 'reset', label: 'Reset', icon: '⟲', special: true },
                  { id: 'right', label: 'Right', icon: '➡' },
                  { id: 'front', label: 'Front', icon: '◉' },
                  { id: 'bottom', label: 'Bot', icon: '⬇' },
                  { id: 'back', label: 'Back', icon: '○' },
                ].map((preset, i) => preset ? (
                  <button key={preset.id} style={{
                    padding: '8px 4px', borderRadius: 4,
                    background: preset.special ? tokens.colors.accent.cyan + '20' : tokens.colors.bg.glass,
                    border: `1px solid ${preset.special ? tokens.colors.accent.cyan + '40' : tokens.colors.border.subtle}`,
                    color: preset.special ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                    fontSize: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                    <span style={{ fontSize: 14 }}>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ) : <div key={i} />)}
              </div>
            </div>
          )}
        </div>
        
        {/* TRANSFORM (Position + Rotation + Scale) */}
        <div>
          <SectionHeader section={sections[1]} isExpanded={expandedSections.transform} />
          {expandedSections.transform && (
            <div style={{ padding: '8px 12px 16px' }}>
              {/* Position */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8, letterSpacing: '0.5px' }}>
                  POSITION
                </div>
                {['X', 'Y', 'Z'].map(axis => (
                  <AxisSlider
                    key={`pos-${axis}`}
                    axis={axis}
                    value={position[axis.toLowerCase()]}
                    onChange={(val) => setPosition(prev => ({ ...prev, [axis.toLowerCase()]: val }))}
                    min={-500} max={500} unit=" mm"
                    color={axis === 'X' ? tokens.colors.accent.red : axis === 'Y' ? tokens.colors.accent.green : tokens.colors.accent.blue}
                  />
                ))}
              </div>
              
              {/* Rotation */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 8, letterSpacing: '0.5px' }}>
                  ROTATION
                </div>
                {['X', 'Y', 'Z'].map(axis => (
                  <AxisSlider
                    key={`rot-${axis}`}
                    axis={axis}
                    value={rotation[axis.toLowerCase()]}
                    onChange={(val) => setRotation(prev => ({ ...prev, [axis.toLowerCase()]: val }))}
                    min={-180} max={180} unit="°"
                    color={axis === 'X' ? tokens.colors.accent.red : axis === 'Y' ? tokens.colors.accent.green : tokens.colors.accent.blue}
                  />
                ))}
              </div>
              
              {/* Scale */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: tokens.colors.text.muted, letterSpacing: '0.5px' }}>SCALE</span>
                  <button
                    onClick={() => setUniformScale(!uniformScale)}
                    style={{
                      padding: '2px 6px', borderRadius: 3, border: 'none',
                      background: uniformScale ? tokens.colors.accent.purple + '30' : tokens.colors.bg.tertiary,
                      color: uniformScale ? tokens.colors.accent.purple : tokens.colors.text.muted,
                      fontSize: 9, cursor: 'pointer',
                    }}
                  >
                    {uniformScale ? '🔗 Uniform' : '🔓 Free'}
                  </button>
                </div>
                {uniformScale ? (
                  <AxisSlider
                    axis="Uniform"
                    value={scale.x}
                    onChange={(val) => setScale({ x: val, y: val, z: val })}
                    min={10} max={200} unit="%"
                    color={tokens.colors.accent.purple}
                  />
                ) : (
                  ['X', 'Y', 'Z'].map(axis => (
                    <AxisSlider
                      key={`scale-${axis}`}
                      axis={axis}
                      value={scale[axis.toLowerCase()]}
                      onChange={(val) => setScale(prev => ({ ...prev, [axis.toLowerCase()]: val }))}
                      min={10} max={200} unit="%"
                      color={axis === 'X' ? tokens.colors.accent.red : axis === 'Y' ? tokens.colors.accent.green : tokens.colors.accent.blue}
                    />
                  ))
                )}
              </div>
              
              <button style={{
                width: '100%', padding: '6px', borderRadius: 4, border: 'none',
                background: tokens.colors.bg.tertiary, color: tokens.colors.text.secondary,
                fontSize: 10, cursor: 'pointer',
              }}>
                ⟲ Reset Transform
              </button>
            </div>
          )}
        </div>
        
        {/* SLICE */}
        <div>
          <SectionHeader section={sections[2]} isExpanded={expandedSections.slice} />
          {expandedSections.slice && (
            <div style={{ padding: '8px 12px 16px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['Axial', 'Sagittal', 'Coronal'].map(orient => (
                  <button key={orient} style={{
                    flex: 1, padding: '6px', borderRadius: 4, border: 'none',
                    background: orient === 'Axial' ? tokens.colors.accent.blue + '30' : tokens.colors.bg.tertiary,
                    color: orient === 'Axial' ? tokens.colors.accent.blue : tokens.colors.text.secondary,
                    fontSize: 10, cursor: 'pointer',
                  }}>
                    {orient}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: tokens.colors.text.muted }}>Slice Position</span>
                <span style={{ fontFamily: 'monospace', color: tokens.colors.accent.blue }}>{sliceValue} / 256</span>
              </div>
              <input
                type="range" min="0" max="256" value={sliceValue}
                onChange={(e) => setSliceValue(parseInt(e.target.value))}
                style={{
                  width: '100%', height: 6, appearance: 'none', cursor: 'pointer',
                  background: `linear-gradient(to right, ${tokens.colors.accent.blue} ${(sliceValue/256)*100}%, ${tokens.colors.bg.tertiary} ${(sliceValue/256)*100}%)`,
                  borderRadius: 3,
                }}
              />
            </div>
          )}
        </div>
        
        {/* WINDOW/LEVEL */}
        <div>
          <SectionHeader section={sections[3]} isExpanded={expandedSections.windowLevel} />
          {expandedSections.windowLevel && (
            <div style={{ padding: '8px 12px 16px' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['Brain', 'Bone', 'Lung', 'Soft'].map(preset => (
                  <button key={preset} style={{
                    flex: 1, padding: '5px', borderRadius: 4, border: 'none',
                    background: preset === 'Brain' ? tokens.colors.accent.orange + '30' : tokens.colors.bg.tertiary,
                    color: preset === 'Brain' ? tokens.colors.accent.orange : tokens.colors.text.secondary,
                    fontSize: 9, cursor: 'pointer',
                  }}>
                    {preset}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: tokens.colors.text.muted }}>Window</span>
                  <span style={{ fontFamily: 'monospace', color: tokens.colors.accent.orange }}>{windowValue}</span>
                </div>
                <input type="range" min="1" max="2000" value={windowValue} onChange={(e) => setWindowValue(parseInt(e.target.value))}
                  style={{ width: '100%', height: 5, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 3, cursor: 'pointer' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: tokens.colors.text.muted }}>Level</span>
                  <span style={{ fontFamily: 'monospace', color: tokens.colors.accent.orange }}>{levelValue}</span>
                </div>
                <input type="range" min="-1000" max="1000" value={levelValue} onChange={(e) => setLevelValue(parseInt(e.target.value))}
                  style={{ width: '100%', height: 5, appearance: 'none', background: tokens.colors.bg.tertiary, borderRadius: 3, cursor: 'pointer' }} />
              </div>
            </div>
          )}
        </div>
        
        {/* APPEARANCE */}
        <div>
          <SectionHeader section={sections[4]} isExpanded={expandedSections.appearance} />
          {expandedSections.appearance && (
            <div style={{ padding: '8px 12px 16px' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: tokens.colors.text.muted }}>Opacity</span>
                  <span style={{ fontFamily: 'monospace', color: tokens.colors.accent.green }}>{opacityValue}%</span>
                </div>
                <input type="range" min="0" max="100" value={opacityValue} onChange={(e) => setOpacityValue(parseInt(e.target.value))}
                  style={{
                    width: '100%', height: 5, appearance: 'none', cursor: 'pointer',
                    background: `linear-gradient(to right, ${tokens.colors.accent.green} ${opacityValue}%, ${tokens.colors.bg.tertiary} ${opacityValue}%)`,
                    borderRadius: 3,
                  }} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['Surface', 'Wireframe', 'Points'].map(rep => (
                  <button key={rep} style={{
                    flex: 1, padding: '6px', borderRadius: 4, border: 'none',
                    background: rep === 'Surface' ? tokens.colors.accent.green + '30' : tokens.colors.bg.tertiary,
                    color: rep === 'Surface' ? tokens.colors.accent.green : tokens.colors.text.secondary,
                    fontSize: 10, cursor: 'pointer',
                  }}>
                    {rep}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Spacer for comfortable scrolling */}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// =============================================================================
// ANNOTATIONS TAB
// =============================================================================
function AnnotationsTabContent() {
  return (
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📍</div>
      <div style={{ fontSize: 12, color: tokens.colors.text.secondary }}>Instance Annotations</div>
      <div style={{ fontSize: 10, color: tokens.colors.text.muted, marginTop: 4 }}>Coming soon</div>
    </div>
  );
}

// =============================================================================
// LAYERS & WIDGETS (Stationary Bottom)
// =============================================================================
function LayersAndWidgets({ layers: initialLayers, widgets: initialWidgets }) {
  const [layers, setLayers] = useState(initialLayers);
  const [layerStates, setLayerStates] = useState(
    Object.fromEntries(initialLayers.map(l => [l.id, { visible: l.visible, opacity: l.opacity }]))
  );
  const [widgetStates, setWidgetStates] = useState(
    Object.fromEntries(initialWidgets.map(w => [w.id, { visible: w.visible, opacity: w.opacity }]))
  );
  const [expanded, setExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  const toggleLayerVisibility = (id) => setLayerStates(prev => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } }));
  const setLayerOpacity = (id, opacity) => setLayerStates(prev => ({ ...prev, [id]: { ...prev[id], opacity } }));
  const toggleWidgetVisibility = (id) => setWidgetStates(prev => ({ ...prev, [id]: { ...prev[id], visible: !prev[id].visible } }));
  const setWidgetOpacity = (id, opacity) => setWidgetStates(prev => ({ ...prev, [id]: { ...prev[id], opacity } }));
  
  const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, id) => { e.preventDefault(); if (id !== draggedId) setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedId && targetId && draggedId !== targetId) {
      const newLayers = [...layers];
      const draggedIndex = newLayers.findIndex(l => l.id === draggedId);
      const targetIndex = newLayers.findIndex(l => l.id === targetId);
      const [draggedLayer] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, draggedLayer);
      setLayers(newLayers);
    }
    setDraggedId(null); setDragOverId(null);
  };
  
  const handleCopyValue = (widget) => {
    navigator.clipboard?.writeText(widget.value);
    setCopiedId(widget.id);
    setTimeout(() => setCopiedId(null), 1500);
  };
  
  const getWidgetIcon = (type) => ({ line: '📏', angle: '📐', plane: '◫' }[type] || '◈');
  const visibleCount = Object.values(layerStates).filter(s => s.visible).length + Object.values(widgetStates).filter(s => s.visible).length;
  
  return (
    <div style={{ borderTop: `1px solid ${tokens.colors.border.subtle}` }}>
      {/* Resize handle */}
      <div style={{
        height: 5, background: tokens.colors.bg.tertiary, cursor: 'ns-resize',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}>
        <div style={{ width: 40, height: 3, borderRadius: 2, background: tokens.colors.border.default }} />
      </div>
      
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer',
        background: expanded ? `${tokens.colors.accent.teal}08` : 'transparent',
      }}>
        <span style={{ fontSize: 10, color: tokens.colors.text.muted, transform: expanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▼</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.teal }}>LAYERS & WIDGETS</span>
        <Badge color={tokens.colors.accent.teal}>{visibleCount} visible</Badge>
        <div style={{ flex: 1 }} />
        <IconButton icon="+" title="Add Overlay" color={tokens.colors.accent.teal} onClick={(e) => e.stopPropagation()} />
      </div>
      
      {expanded && (
        <div style={{ padding: '0 12px 12px', maxHeight: 200, overflowY: 'auto' }}>
          {/* DATA LAYERS */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 6, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>DATA LAYERS</span>
              <span style={{ fontSize: 8, fontWeight: 400 }}>(drag ⋮⋮)</span>
            </div>
            {layers.map((layer, index) => {
              const state = layerStates[layer.id];
              const isDragging = draggedId === layer.id;
              const isDragOver = dragOverId === layer.id;
              return (
                <div key={layer.id} draggable onDragStart={(e) => handleDragStart(e, layer.id)} onDragOver={(e) => handleDragOver(e, layer.id)} onDragLeave={() => setDragOverId(null)} onDrop={(e) => handleDrop(e, layer.id)} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 3,
                    background: isDragging ? `${tokens.colors.accent.purple}20` : isDragOver ? `${tokens.colors.accent.teal}15` : state.visible ? tokens.colors.bg.glass : 'transparent',
                    border: isDragOver ? `1px dashed ${tokens.colors.accent.teal}` : `1px solid transparent`,
                    borderRadius: 5, opacity: isDragging ? 0.7 : state.visible ? 1 : 0.5, cursor: isDragging ? 'grabbing' : 'default',
                  }}>
                  <div style={{ cursor: 'grab', padding: '2px', color: tokens.colors.text.muted, fontSize: 10 }}>⋮⋮</div>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: tokens.colors.bg.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, color: tokens.colors.text.muted }}>{index + 1}</div>
                  <button onClick={() => toggleLayerVisibility(layer.id)} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: state.visible ? tokens.colors.accent.teal : tokens.colors.text.muted, cursor: 'pointer', fontSize: 11 }}>{state.visible ? '👁' : '○'}</button>
                  <ColorDot color={layer.type === 'data' ? tokens.colors.accent.purple : tokens.colors.accent.pink} size={6} />
                  <span style={{ flex: 1, fontSize: 11, color: tokens.colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</span>
                  <MiniSlider value={state.opacity} onChange={(val) => setLayerOpacity(layer.id, val)} color={layer.type === 'data' ? tokens.colors.accent.purple : tokens.colors.accent.pink} />
                </div>
              );
            })}
          </div>
          
          {/* MEASUREMENT WIDGETS */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: tokens.colors.text.muted, marginBottom: 6, letterSpacing: '0.5px' }}>MEASUREMENT WIDGETS</div>
            {initialWidgets.map(widget => {
              const state = widgetStates[widget.id];
              const isHovered = hoveredWidget === widget.id;
              const isCopied = copiedId === widget.id;
              return (
                <div key={widget.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', marginBottom: 3, background: state.visible ? tokens.colors.bg.glass : 'transparent', borderRadius: 5, opacity: state.visible ? 1 : 0.5, position: 'relative' }}>
                  <button onClick={() => toggleWidgetVisibility(widget.id)} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: state.visible ? tokens.colors.accent.amber : tokens.colors.text.muted, cursor: 'pointer', fontSize: 11 }}>{state.visible ? '👁' : '○'}</button>
                  <span style={{ fontSize: 11 }}>{getWidgetIcon(widget.type)}</span>
                  <span style={{ flex: 1, fontSize: 11, color: tokens.colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{widget.name}</span>
                  {widget.value && state.visible && (
                    <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredWidget(widget.id)} onMouseLeave={() => setHoveredWidget(null)}>
                      <button onClick={() => handleCopyValue(widget)} style={{
                        padding: '3px 8px', borderRadius: 4, border: 'none',
                        background: isCopied ? tokens.colors.accent.green + '30' : tokens.colors.accent.amber + '20',
                        color: isCopied ? tokens.colors.accent.green : tokens.colors.accent.amber,
                        fontSize: 10, fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer',
                      }}>
                        {isCopied ? '✓ Copied' : widget.value}
                      </button>
                      {isHovered && !isCopied && (
                        <div style={{
                          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, padding: '10px 12px',
                          background: tokens.colors.bg.secondary, border: `1px solid ${tokens.colors.border.default}`,
                          borderRadius: 6, zIndex: 100, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.accent.amber, marginBottom: 8, fontFamily: 'monospace' }}>{widget.value}</div>
                          {Object.entries(widget.details).map(([key, val]) => (
                            <div key={key} style={{ fontSize: 10, color: tokens.colors.text.muted, marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>{key}:</span>
                              <span style={{ fontFamily: 'monospace' }}>{val}</span>
                            </div>
                          ))}
                          <div style={{ marginTop: 6, fontSize: 9, color: tokens.colors.text.muted, textAlign: 'center' }}>Click to copy</div>
                        </div>
                      )}
                    </div>
                  )}
                  <MiniSlider value={state.opacity} onChange={(val) => setWidgetOpacity(widget.id, val)} color={tokens.colors.accent.amber} />
                  <IconButton icon="🗑" title="Delete" size={10} color={tokens.colors.accent.red} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NO INSTANCE PLACEHOLDER
// =============================================================================
function NoInstancePlaceholder() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: tokens.colors.bg.tertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28, opacity: 0.5 }}>🖥️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.text.primary, marginBottom: 8 }}>No Instance Selected</div>
      <div style={{ fontSize: 11, color: tokens.colors.text.muted, maxWidth: 240 }}>Click on an instance viewport to select it.</div>
    </div>
  );
}

// =============================================================================
// FULL INSTANCE TOOLS PANEL
// =============================================================================
function InstanceToolsPanel({ viewGroup, instance, layers, widgets, showNoInstance = false }) {
  const [activeTab, setActiveTab] = useState('tools');
  
  if (showNoInstance) {
    return (
      <div style={{ width: 380, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.lg, overflow: 'hidden' }}>
        <NoInstancePlaceholder />
      </div>
    );
  }
  
  return (
    <div style={{
      width: 380, background: tokens.colors.bg.secondary, borderRadius: tokens.radius.lg,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '95vh',
    }}>
      {/* ViewGroup Strip */}
      <ViewGroupStrip viewGroup={viewGroup} onViewSelect={(id) => console.log('Select:', id)} />
      
      {/* Instance Header */}
      <InstanceHeader instance={instance} />
      
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: tokens.colors.bg.primary, borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
        {[
          { id: 'tools', label: 'Tools', icon: '🔧', color: tokens.colors.accent.amber },
          { id: 'annotations', label: 'Annotations', icon: '📍', color: tokens.colors.accent.pink },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 6,
            border: `1px solid ${activeTab === tab.id ? tab.color + '50' : tokens.colors.border.subtle}`,
            background: activeTab === tab.id ? tab.color + '15' : tokens.colors.bg.glass,
            color: activeTab === tab.id ? tab.color : tokens.colors.text.muted,
            fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer',
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content (scrollable middle) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'tools' && <ToolsTabContent sections={TOOL_SECTIONS} />}
        {activeTab === 'annotations' && <AnnotationsTabContent />}
      </div>
      
      {/* Layers & Widgets (stationary bottom) */}
      <LayersAndWidgets layers={layers} widgets={widgets} />
    </div>
  );
}

// =============================================================================
// DEMO
// =============================================================================
export default function InstanceToolsV2() {
  const [demoMode, setDemoMode] = useState('small');
  
  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.bg.primary, padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: tokens.colors.text.primary, fontSize: 20, marginBottom: 8 }}>Instance Tools V2</h1>
        <p style={{ color: tokens.colors.text.muted, fontSize: 12, marginBottom: 16 }}>
          Dot navigation • Layers at bottom • Full transform (position + rotation + scale)
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'small', label: '≤5 Views (Connectors)', color: tokens.colors.accent.purple },
            { id: 'large', label: '6+ Views (Grid)', color: tokens.colors.accent.amber },
            { id: 'none', label: 'No Instance', color: tokens.colors.text.muted },
          ].map(mode => (
            <button key={mode.id} onClick={() => setDemoMode(mode.id)} style={{
              padding: '8px 16px', borderRadius: 6,
              border: `1px solid ${demoMode === mode.id ? mode.color : tokens.colors.border.subtle}`,
              background: demoMode === mode.id ? mode.color + '20' : tokens.colors.bg.glass,
              color: demoMode === mode.id ? mode.color : tokens.colors.text.secondary,
              fontSize: 11, cursor: 'pointer',
            }}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 24 }}>
        <InstanceToolsPanel
          viewGroup={demoMode === 'large' ? LARGE_VIEWGROUP : SMALL_VIEWGROUP}
          instance={MOCK_INSTANCE}
          layers={MOCK_LAYERS}
          widgets={MOCK_WIDGETS}
          showNoInstance={demoMode === 'none'}
        />
        
        <div style={{ flex: 1, maxWidth: 320 }}>
          <h3 style={{ color: tokens.colors.accent.cyan, fontSize: 12, marginBottom: 12 }}>V2 UPDATES</h3>
          {[
            { icon: '●', title: 'Dot Navigation', desc: 'Click dots to jump to sections, auto-tracks scroll position' },
            { icon: '⬇', title: 'Layers at Bottom', desc: 'Tools get prime real estate, layers/widgets as "foundation"' },
            { icon: '🎛️', title: 'Full Transform', desc: 'Position (XYZ pan) + Rotation + Scale with uniform toggle' },
          ].map(f => (
            <div key={f.title} style={{ padding: '10px 12px', background: tokens.colors.bg.glass, borderRadius: 6, border: `1px solid ${tokens.colors.border.subtle}`, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span>{f.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.text.primary }}>{f.title}</span>
              </div>
              <div style={{ fontSize: 10, color: tokens.colors.text.muted }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
