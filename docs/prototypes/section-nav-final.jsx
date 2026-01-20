import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, MousePointer, Ruler, Pencil, Slice, Box, Filter, Paintbrush } from 'lucide-react';

const iconMap = {
  move: Move,
  mousePointer: MousePointer,
  ruler: Ruler,
  pencil: Pencil,
  slice: Slice,
  box: Box,
  filter: Filter,
  paintbrush: Paintbrush,
};

export default function SectionNavDemo() {
  const [panelHeight, setPanelHeight] = useState(350);
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});
  const [currentSectionId, setCurrentSectionId] = useState('transform');
  const [hoveredDot, setHoveredDot] = useState(null);
  
  const allSections = [
    { id: 'transform', icon: 'move', label: 'Transform', iconColor: '#60a5fa', 
      tools: ['Pan', 'Zoom', 'Rotate', 'Reset View', 'Snap to Grid', 'Center'] },
    { id: 'selection', icon: 'mousePointer', label: 'Selection', iconColor: '#4ade80',
      tools: ['Point Select', 'Box Select', 'Lasso Select', 'Clear Selection', 'Select All'] },
    { id: 'measurement', icon: 'ruler', label: 'Measurement', iconColor: '#fbbf24',
      tools: ['Distance', 'Point Probe', 'Area', 'Volume'] },
    { id: 'annotation', icon: 'pencil', label: 'Annotations', iconColor: '#f472b6',
      tools: ['Text Label', 'Point Marker', 'Region Box', 'Freehand Draw', 'Arrow', 'Dimension'] },
    { id: 'clipping', icon: 'slice', label: 'Clipping', iconColor: '#a78bfa',
      tools: ['X Plane', 'Y Plane', 'Z Plane', 'Box Clip', 'Clear All'] },
    { id: 'widgets', icon: 'box', label: 'Widgets', iconColor: '#2dd4bf',
      tools: ['Bounding Box', 'Axes Helper', 'Grid Overlay', 'Orientation Cube', 'Scale Bar'] },
    { id: 'filters', icon: 'filter', label: 'Filters', iconColor: '#fb923c',
      tools: ['Threshold', 'Iso Surface', 'Slice Extract', 'Resample'] },
    { id: 'appearance', icon: 'paintbrush', label: 'Appearance', iconColor: '#818cf8',
      tools: ['Color Map', 'Opacity', 'Render Mode', 'Lighting'] },
  ];

  // Scroll to section using container's scrollTop (not scrollIntoView)
  const scrollToSection = useCallback((id, event) => {
    // Remove focus from clicked element
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }
    
    const container = scrollContainerRef.current;
    const sectionEl = sectionRefs.current[id];
    
    if (container && sectionEl) {
      // Calculate the offset of the section relative to the scroll container
      const containerRect = container.getBoundingClientRect();
      const sectionRect = sectionEl.getBoundingClientRect();
      const currentScrollTop = container.scrollTop;
      
      // Target scroll position: current scroll + (section position - container position)
      const targetScrollTop = currentScrollTop + (sectionRect.top - containerRect.top);
      
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Use IntersectionObserver to detect which section is in view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) {
              setCurrentSectionId(sectionId);
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '-0% 0px -70% 0px',
        threshold: 0,
      }
    );

    allSections.forEach((section) => {
      const el = sectionRefs.current[section.id];
      if (el) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [panelHeight]);

  const currentIndex = allSections.findIndex(s => s.id === currentSectionId);
  const currentSection = allSections[currentIndex] || allSections[0];

  // Navigation dot
  const NavDot = ({ section, isCurrent, isHovered, onHover, onLeave, onClick }) => {
    const IconComponent = iconMap[section.icon] || Box;
    const showExpanded = isHovered || isCurrent;
    
    return (
      <div
        style={{ position: 'relative' }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <div
          onClick={onClick}
          tabIndex={-1} // Prevent focus on click
          style={{
            width: showExpanded ? '22px' : '10px',
            height: showExpanded ? '22px' : '10px',
            borderRadius: '50%',
            background: section.iconColor,
            cursor: 'pointer',
            opacity: isCurrent ? 1 : (isHovered ? 0.9 : 0.4),
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isCurrent ? `0 0 0 2px #1e1e30, 0 0 0 4px ${section.iconColor}40` : 'none',
            outline: 'none', // Remove focus outline
          }}
        >
          {showExpanded && (
            <IconComponent size={11} style={{ color: 'rgba(0,0,0,0.7)' }} />
          )}
        </div>
        
        {/* Tooltip on hover (not current) */}
        {isHovered && !isCurrent && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '4px 8px',
            background: '#2a2a3e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.8)',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none', // Prevent tooltip from interfering with hover
          }}>
            {section.label}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              background: '#2a2a3e',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }} />
          </div>
        )}
      </div>
    );
  };

  // Section header
  const SectionHeader = ({ section }) => {
    const IconComponent = iconMap[section.icon] || Box;
    
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <IconComponent size={12} style={{ color: section.iconColor }} />
        <span>{section.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginLeft: 'auto' }}>
          {section.tools.length}
        </span>
      </div>
    );
  };

  // Tool item
  const ToolItem = ({ name, iconColor }) => {
    const [hovered, setHovered] = useState(false);
    
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 10px',
          fontSize: '11px',
          color: hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)',
          borderRadius: '4px',
          cursor: 'pointer',
          background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'all 0.1s ease',
        }}
      >
        <div style={{
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: iconColor,
          opacity: hovered ? 1 : 0.5,
        }} />
        <span>{name}</span>
      </div>
    );
  };

  const CurrentIcon = iconMap[currentSection.icon] || Box;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#12121a', 
      color: 'white', 
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Section Navigation - Final</h1>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
        Container-only scroll. No focus state on dots after click.
      </p>
      
      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          {/* Controls */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', width: '80px' }}>Panel Height:</span>
              <input
                type="range"
                min={250}
                max={500}
                value={panelHeight}
                onChange={(e) => setPanelHeight(Number(e.target.value))}
                style={{ width: '120px', accentColor: '#60a5fa' }}
              />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', width: '40px' }}>{panelHeight}px</span>
            </div>
          </div>
          
          {/* The Panel */}
          <div style={{ 
            width: '280px',
            height: `${panelHeight}px`,
            background: '#1a1a2e', 
            borderRadius: '8px', 
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Panel title */}
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0,
              background: '#1a1a2e',
            }}>
              Instance Tools
            </div>
            
            {/* Navigation bar */}
            <div style={{
              padding: '8px 12px',
              background: '#1e1e30',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              {/* Current section name */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}>
                <CurrentIcon size={13} style={{ color: currentSection.iconColor }} />
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: 'rgba(255,255,255,0.85)',
                }}>
                  {currentSection.label}
                </span>
              </div>
              
              {/* All dots */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                {allSections.map((section, index) => (
                  <NavDot
                    key={section.id}
                    section={section}
                    isCurrent={section.id === currentSectionId}
                    isHovered={hoveredDot === section.id}
                    onHover={() => setHoveredDot(section.id)}
                    onLeave={() => setHoveredDot(null)}
                    onClick={(e) => scrollToSection(section.id, e)}
                  />
                ))}
              </div>
            </div>
            
            {/* Scrollable content */}
            <div 
              ref={scrollContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {allSections.map((section) => (
                <div 
                  key={section.id} 
                  ref={el => sectionRefs.current[section.id] = el}
                  data-section-id={section.id}
                >
                  <SectionHeader section={section} />
                  <div style={{ padding: '4px 6px' }}>
                    {section.tools.map((tool, i) => (
                      <ToolItem key={i} name={tool} iconColor={section.iconColor} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
            Current: {currentSection.label} ({currentIndex + 1}/{allSections.length})
          </div>
        </div>
        
        {/* Summary */}
        <div style={{ 
          width: '300px', 
          background: '#1a1a2e', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: 'rgba(255,255,255,0.8)' }}>
            Final Implementation
          </h3>
          
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '16px' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#4ade80' }}>✓ Fixed:</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '16px', lineHeight: 1.8 }}>
              <li>Clicking dots scrolls container only (not page)</li>
              <li>No focus ring stays after clicking</li>
              <li>IntersectionObserver for accurate detection</li>
            </ul>
          </div>
          
          <div style={{ 
            padding: '10px', 
            background: 'rgba(96,165,250,0.1)', 
            borderRadius: '6px',
            border: '1px solid rgba(96,165,250,0.2)',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#60a5fa', marginBottom: '6px' }}>
              Component Structure
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontFamily: 'monospace' }}>
              SectionGroup<br/>
              ├─ SectionNav (header + dots)<br/>
              │&nbsp;&nbsp;&nbsp;├─ CurrentSection<br/>
              │&nbsp;&nbsp;&nbsp;└─ NavDots<br/>
              └─ SectionContent (scrollable)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;└─ Section[] (non-collapsible)
            </div>
          </div>
          
          <div style={{ 
            padding: '10px', 
            background: 'rgba(74,222,128,0.1)', 
            borderRadius: '6px',
            border: '1px solid rgba(74,222,128,0.2)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#4ade80', marginBottom: '6px' }}>
              Ready for Implementation
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              This pattern is ready to be built as the actual component. Want me to create the real files?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
