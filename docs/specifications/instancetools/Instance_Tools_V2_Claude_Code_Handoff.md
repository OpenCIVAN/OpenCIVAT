# Instance Tools V2 - Claude Code Handoff

**Prototype:** `InstanceToolsV2.jsx`  
**Target Location:** `src/ui/react/components/panels/InstanceToolsPanel/`

---

## Overview

Implement a redesigned Instance Tools panel featuring:
- Adaptive ViewGroup strip (connectors for ≤5 views, mini grid for 6+)
- Dot-based section navigation
- Full transform controls (position, rotation, scale)
- Draggable layer reordering
- Widget value hover/click interaction
- Layers & Widgets stationary at bottom

---

## File Structure

```
src/ui/react/components/panels/InstanceToolsPanel/
├── index.js                          # Main export
├── InstanceToolsPanel.jsx            # Container component
├── InstanceToolsPanel.logic.js       # Business logic hooks
├── InstanceToolsPanel.scss           # Styles
├── components/
│   ├── ViewGroupStrip/
│   │   ├── ViewGroupStrip.jsx
│   │   ├── ViewGroupStrip.logic.js
│   │   ├── ViewGroupConnectors.jsx   # ≤5 views style
│   │   └── ViewGroupMiniGrid.jsx     # 6+ views style
│   ├── InstanceHeader/
│   │   └── InstanceHeader.jsx
│   ├── DotNavigation/
│   │   ├── DotNavigation.jsx
│   │   └── DotNavigation.scss
│   ├── ToolSections/
│   │   ├── CameraSection.jsx
│   │   ├── TransformSection.jsx      # Position + Rotation + Scale
│   │   ├── SliceSection.jsx
│   │   ├── WindowLevelSection.jsx
│   │   └── AppearanceSection.jsx
│   ├── LayersAndWidgets/
│   │   ├── LayersAndWidgets.jsx
│   │   ├── LayersAndWidgets.logic.js
│   │   ├── LayerItem.jsx             # With drag handle
│   │   ├── WidgetItem.jsx            # With value popover
│   │   └── WidgetValuePopover.jsx
│   └── shared/
│       ├── AxisSlider.jsx            # Reusable X/Y/Z slider
│       └── MiniSlider.jsx            # Compact inline slider
└── constants.js                      # Section configs, colors
```

---

## Implementation Priority

### Phase 1: Core Structure
1. `InstanceToolsPanel.jsx` - Main container with layout
2. `InstanceHeader.jsx` - View info display
3. Tab bar (Tools | Annotations)

### Phase 2: ViewGroup Strip
4. `ViewGroupStrip.jsx` - Adaptive container
5. `ViewGroupConnectors.jsx` - Gradient links with 🔗
6. `ViewGroupMiniGrid.jsx` - Expandable grid

### Phase 3: Dot Navigation
7. `DotNavigation.jsx` - Section indicator + jump
8. Scroll tracking integration

### Phase 4: Tool Sections
9. `CameraSection.jsx` - Preset grid
10. `TransformSection.jsx` - Full gimbal (MOST COMPLEX)
11. `SliceSection.jsx` - Orientation + position
12. `WindowLevelSection.jsx` - Presets + sliders
13. `AppearanceSection.jsx` - Opacity + representation

### Phase 5: Layers & Widgets
14. `LayersAndWidgets.jsx` - Container with resize
15. `LayerItem.jsx` - Drag-and-drop reordering
16. `WidgetItem.jsx` - Value display
17. `WidgetValuePopover.jsx` - Hover details + copy

---

## Key Constants

```javascript
// constants.js
export const VIEWGROUP_TIPPING_POINT = 5;

export const TOOL_SECTIONS = [
  { id: 'camera', label: 'Camera', icon: '📷', color: 'cyan' },
  { id: 'transform', label: 'Transform', icon: '🎛️', color: 'pink' },
  { id: 'slice', label: 'Slice', icon: '🔪', color: 'blue' },
  { id: 'windowLevel', label: 'Window/Level', icon: '🌗', color: 'orange' },
  { id: 'appearance', label: 'Appearance', icon: '👁', color: 'green' },
];

export const TRANSFORM_LIMITS = {
  position: { min: -500, max: 500, unit: 'mm' },
  rotation: { min: -180, max: 180, unit: '°' },
  scale: { min: 10, max: 200, unit: '%' },
};
```

---

## TransformSection Implementation

This is the most complex section. Structure:

```jsx
// TransformSection.jsx
function TransformSection({ instanceId, onTransformChange }) {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 100, y: 100, z: 100 });
  const [uniformScale, setUniformScale] = useState(true);

  const handleScaleChange = (axis, value) => {
    if (uniformScale) {
      setScale({ x: value, y: value, z: value });
    } else {
      setScale(prev => ({ ...prev, [axis]: value }));
    }
  };

  return (
    <div className="transform-section">
      {/* POSITION */}
      <div className="subsection">
        <label>POSITION</label>
        <AxisSlider axis="X" value={position.x} onChange={...} color="red" />
        <AxisSlider axis="Y" value={position.y} onChange={...} color="green" />
        <AxisSlider axis="Z" value={position.z} onChange={...} color="blue" />
      </div>

      {/* ROTATION */}
      <div className="subsection">
        <label>ROTATION</label>
        <AxisSlider axis="X" value={rotation.x} onChange={...} unit="°" />
        <AxisSlider axis="Y" value={rotation.y} onChange={...} unit="°" />
        <AxisSlider axis="Z" value={rotation.z} onChange={...} unit="°" />
      </div>

      {/* SCALE */}
      <div className="subsection">
        <div className="subsection-header">
          <label>SCALE</label>
          <button onClick={() => setUniformScale(!uniformScale)}>
            {uniformScale ? '🔗 Uniform' : '🔓 Free'}
          </button>
        </div>
        {uniformScale ? (
          <AxisSlider axis="Uniform" value={scale.x} onChange={...} />
        ) : (
          <>
            <AxisSlider axis="X" value={scale.x} onChange={...} />
            <AxisSlider axis="Y" value={scale.y} onChange={...} />
            <AxisSlider axis="Z" value={scale.z} onChange={...} />
          </>
        )}
      </div>

      <button className="reset-btn" onClick={handleReset}>
        ⟲ Reset Transform
      </button>
    </div>
  );
}
```

---

## ViewGroup Connector Logic

```javascript
// ViewGroupConnectors.jsx
function ViewGroupConnectors({ viewGroup, activeViewId, onViewSelect }) {
  // Find which views are linked to active view
  const linkedViewIds = useMemo(() => {
    const ids = new Set();
    viewGroup.links?.forEach(link => {
      if (link.viewIds.includes(activeViewId)) {
        link.viewIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [viewGroup.links, activeViewId]);

  return (
    <div className="view-chips">
      {viewGroup.views.map((view, index) => {
        const isLinked = linkedViewIds.has(view.id);
        const nextView = viewGroup.views[index + 1];
        const showConnector = isLinked && nextView && linkedViewIds.has(nextView.id);

        return (
          <Fragment key={view.id}>
            <ViewChip view={view} isActive={view.id === activeViewId} />
            {showConnector && (
              <GradientConnector
                fromColor={view.color}
                toColor={nextView.color}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
```

---

## Drag-and-Drop Layer Reordering

```javascript
// LayerItem.jsx
function LayerItem({ layer, index, onReorder, onVisibilityChange, onOpacityChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('layerId', layer.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('layerId');
    if (draggedId !== layer.id) {
      onReorder(draggedId, layer.id);
    }
    setIsDragOver(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn('layer-item', { dragging: isDragging, 'drag-over': isDragOver })}
    >
      <div className="drag-handle">⋮⋮</div>
      <div className="index">{index + 1}</div>
      <button className="visibility" onClick={() => onVisibilityChange(layer.id)}>
        {layer.visible ? '👁' : '○'}
      </button>
      <span className="type-dot" style={{ background: layer.typeColor }} />
      <span className="name">{layer.name}</span>
      <MiniSlider value={layer.opacity} onChange={(v) => onOpacityChange(layer.id, v)} />
    </div>
  );
}
```

---

## Dot Navigation with Scroll Tracking

```javascript
// DotNavigation.jsx
function DotNavigation({ sections, containerRef }) {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const sectionRefs = useRef({});

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let current = sections[0].id;

      sections.forEach(section => {
        const ref = sectionRefs.current[section.id];
        if (ref && ref.offsetTop <= scrollTop + 50) {
          current = section.id;
        }
      });

      setActiveSection(current);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sections, containerRef]);

  const navigateTo = (sectionId) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  return (
    <div className="dot-navigation">
      {sections.map(section => (
        <button
          key={section.id}
          className={cn('dot', { active: activeSection === section.id })}
          style={{ '--section-color': section.color }}
          onClick={() => navigateTo(section.id)}
          title={section.label}
        />
      ))}
    </div>
  );
}
```

---

## SCSS Structure

```scss
// InstanceToolsPanel.scss
@import '@/styles/theme';

.instance-tools-panel {
  display: flex;
  flex-direction: column;
  background: $bg-secondary;
  border-radius: $radius-lg;
  max-height: 95vh;
  overflow: hidden;
}

.dot-navigation {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid $border-subtle;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: $bg-tertiary;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      width: 20px;
      background: var(--section-color);
    }
  }
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 5px;
  transition: all 0.15s;

  &.dragging {
    opacity: 0.7;
    background: rgba($accent-purple, 0.2);
  }

  &.drag-over {
    background: rgba($accent-teal, 0.15);
    border: 1px dashed $accent-teal;
  }

  .drag-handle {
    cursor: grab;
    color: $text-muted;
  }
}
```

---

## Integration with Existing Systems

### InstanceTypeHandler Interface
```javascript
// Check capabilities for section visibility
const caps = instanceTypeHandler.getCapabilities();
// caps = { hasCamera, hasTransform, hasSlice, hasWindowLevel, hasOpacity }
```

### Y.js Collaboration
```javascript
// Layer visibility/opacity synced via Y.js
const yLayers = ydoc.getMap('layers');
yLayers.observe((event) => {
  // Update local state when remote changes
});
```

### ViewConfigurationManager
```javascript
// Switch views when clicking sibling in ViewGroup strip
viewConfigManager.setActiveView(viewId);
```

---

## Testing Checklist

- [ ] ViewGroup shows connectors for ≤5 views
- [ ] ViewGroup shows mini grid for 6+ views
- [ ] Dot navigation tracks scroll position
- [ ] Dot click jumps to section
- [ ] Transform sliders update values
- [ ] Uniform scale locks X/Y/Z together
- [ ] Layer drag-and-drop reorders
- [ ] Widget value hover shows popover
- [ ] Widget value click copies to clipboard
- [ ] Resize handle adjusts Layers section height
- [ ] Sections hide based on instance type capabilities
