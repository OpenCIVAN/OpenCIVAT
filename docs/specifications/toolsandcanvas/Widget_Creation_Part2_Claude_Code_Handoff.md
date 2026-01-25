# Widget Creation Part 2 - Claude Code Handoff

**Handoff Date:** January 24, 2026  
**Design Status:** Complete  
**Implementation Priority:** High  
**Session Log:** Widget_Creation_Part2_Session_Memory_Log.md

---

## Executive Summary

Implement the Instance Tools panel enhancements and Canvas Toolbar Footer. This work completes the widget creation system and provides the shared toolbar architecture for small viewport scenarios.

**Key Deliverables:**
1. Display Tab (Instance Tools)
2. Annotations Tab (Instance Tools)  
3. Canvas Toolbar Footer (shared toolbar)
4. Camera Section enhancements
5. Hybrid Filter component

---

## File Structure

```
src/ui/react/components/
├── panels/
│   └── InstanceToolsPanel/
│       ├── index.js
│       ├── InstanceToolsPanel.jsx
│       ├── InstanceToolsPanel.logic.js
│       ├── InstanceToolsPanel.scss
│       └── components/
│           ├── tabs/
│           │   ├── ToolsTab/
│           │   │   ├── ToolsTab.jsx
│           │   │   ├── CameraSection.jsx         # ENHANCED
│           │   │   ├── CameraSection.logic.js    # NEW - flyTo, presets
│           │   │   ├── TransformSection.jsx
│           │   │   ├── SliceSection.jsx
│           │   │   ├── WindowLevelSection.jsx
│           │   │   ├── DisplaySection.jsx        # NEW
│           │   │   └── AppearanceSection.jsx
│           │   └── AnnotationsTab/
│           │       ├── AnnotationsTab.jsx        # NEW
│           │       ├── AnnotationsTab.logic.js   # NEW
│           │       ├── AnnotationItem.jsx        # NEW
│           │       └── AnnotationsTab.scss       # NEW
│           ├── LayersAndWidgets/
│           │   └── (existing - minor updates)
│           └── shared/
│               ├── HybridFilter/                 # NEW
│               │   ├── HybridFilter.jsx
│               │   ├── HybridFilter.logic.js
│               │   └── HybridFilter.scss
│               └── AnimationSettings/            # NEW
│                   └── AnimationSettings.jsx
├── workspace/
│   └── CanvasToolbarFooter/                      # NEW
│       ├── index.js
│       ├── CanvasToolbarFooter.jsx
│       ├── CanvasToolbarFooter.logic.js
│       ├── CanvasToolbarFooter.scss
│       └── components/
│           ├── ActiveViewSelector.jsx
│           ├── ToolSection.jsx
│           ├── LinksDropdown.jsx
│           └── OverflowMenu.jsx
└── atoms/
    └── ToggleSwitch/
        └── ToggleSwitch.jsx                      # NEW (reusable)
```

---

## Component 1: Display Section (Instance Tools)

### Location
`src/ui/react/components/panels/InstanceToolsPanel/components/tabs/ToolsTab/DisplaySection.jsx`

### Purpose
Toggle scene overlays (orientation widget, grid, axes, scale bar, etc.)

### Props
```typescript
interface DisplaySectionProps {
  instanceId: string;
  isExpanded: boolean;
  onToggle: () => void;
}
```

### State (from instance)
```typescript
interface DisplayState {
  orientationWidget: { enabled: boolean; style: 'cube' | 'arrows' | 'compass' | 'gimbal' | 'human' };
  grid: { enabled: boolean; density: number };
  axes: { enabled: boolean };
  scaleBar: { enabled: boolean; unit: 'mm' | 'cm' | 'm' | 'in' };
  coordinates: { enabled: boolean };
  fps: { enabled: boolean };
  backgroundColor: string;
}
```

### Implementation
```jsx
// DisplaySection.jsx
import React from 'react';
import { ToggleSwitch } from '@UI/react/components/atoms/ToggleSwitch';
import { MiniSlider } from '../shared/MiniSlider';
import { workspaceManager } from '@Core/instances/workspaceManager';

const OVERLAY_ITEMS = [
  { id: 'orientationWidget', icon: '🧭', label: 'Orientation', hasStyle: true },
  { id: 'grid', icon: '▦', label: 'Grid', hasSlider: true, sliderLabel: 'Density' },
  { id: 'axes', icon: '📐', label: 'Axes' },
  { id: 'scaleBar', icon: '📏', label: 'Scale Bar', hasUnit: true },
  { id: 'coordinates', icon: '📍', label: 'Coordinates' },
  { id: 'fps', icon: '⚡', label: 'FPS Counter' },
];

export function DisplaySection({ instanceId, isExpanded, onToggle }) {
  const [state, setState] = useState(getInitialState(instanceId));
  
  const handleToggle = (overlayId, enabled) => {
    // Update via workspaceManager
    workspaceManager.setOverlayEnabled(instanceId, overlayId, enabled);
    
    // Dispatch event for Canvas Toolbar Footer sync
    window.dispatchEvent(new CustomEvent('cia:overlay-toggled', {
      detail: { instanceId, overlayId, enabled }
    }));
  };
  
  // ... render implementation
}
```

### Events to Dispatch
- `cia:overlay-toggled` - When any overlay is toggled
- `cia:overlay-style-changed` - When orientation style changes

### Events to Listen
- `cia:overlay-toggled` - Sync from Canvas Toolbar Footer

---

## Component 2: Annotations Tab

### Location
`src/ui/react/components/panels/InstanceToolsPanel/components/tabs/AnnotationsTab/`

### Purpose
Manage annotations visible in the current view.

### Props
```typescript
interface AnnotationsTabProps {
  instanceId: string;
  viewConfigId: string;
}
```

### Data Model
```typescript
interface Annotation {
  id: string;
  type: 'point' | 'distance' | 'angle' | 'text' | 'region' | 'label';
  content: string;
  position: { x: number; y: number; z: number };
  author: { id: string; name: string; color: string };
  createdAt: Date;
  datasetId: string;
  visibility: 'visible' | 'hidden';
  // Type-specific data
  measurementValue?: string;
  regionBounds?: { min: number[]; max: number[] };
}
```

### Sections
1. **View Annotations** - Annotations visible in current view
2. **Not in View** - Collapsed section showing annotations outside view bounds

### Actions
- Create annotation (type selector dropdown)
- Toggle visibility
- Delete annotation
- Edit annotation (inline)

### Implementation Pattern
```jsx
// AnnotationsTab.jsx
export function AnnotationsTab({ instanceId, viewConfigId }) {
  const { annotations, isLoading } = useAnnotations(viewConfigId);
  const [filter, setFilter] = useState({ type: null, author: null });
  
  const viewAnnotations = useMemo(() => 
    annotations.filter(a => isInViewBounds(a, viewBounds)),
    [annotations, viewBounds]
  );
  
  const hiddenAnnotations = useMemo(() =>
    annotations.filter(a => !isInViewBounds(a, viewBounds)),
    [annotations, viewBounds]
  );
  
  return (
    <div className="annotations-tab">
      <div className="annotations-tab__header">
        <span>VIEW ANNOTATIONS</span>
        <AddAnnotationButton onAdd={handleAddAnnotation} />
      </div>
      
      <div className="annotations-tab__list">
        {viewAnnotations.map(annotation => (
          <AnnotationItem 
            key={annotation.id}
            annotation={annotation}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </div>
      
      {hiddenAnnotations.length > 0 && (
        <CollapsibleSection title={`Not in this view (${hiddenAnnotations.length})`}>
          {hiddenAnnotations.map(annotation => (
            <AnnotationItem key={annotation.id} annotation={annotation} dimmed />
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}
```

---

## Component 3: Canvas Toolbar Footer

### Location
`src/ui/react/components/workspace/CanvasToolbarFooter/`

### Purpose
Shared toolbar at bottom of canvas area that operates on the active instance.

### Critical Design Decision
**This replaces per-instance toolbars** because viewport cells get too small in 3×3 or 4×4 grids. One shared toolbar always remains accessible.

### Props
```typescript
interface CanvasToolbarFooterProps {
  activeInstanceId: string | null;
  onOpenInstanceTools: () => void;
}
```

### Toolbar Sections

```typescript
const TOOLBAR_SECTIONS = [
  { id: 'history', position: 'start', priority: 1 },      // Undo/Redo
  { id: 'activeView', position: 'start', priority: 1 },   // View selector
  { id: 'instanceTools', position: 'center', priority: 1 }, // From handler
  { id: 'overlays', position: 'center', priority: 2 },    // Scene overlays
  { id: 'measurements', position: 'center', priority: 2 }, // Measurement tools
  { id: 'viewControls', position: 'center', priority: 2 }, // Fit/Reset/Snapshot
  { id: 'links', position: 'end', priority: 1 },          // Links dropdown
  { id: 'openTools', position: 'end', priority: 1 },      // Open panel button
];
```

### Responsive Behavior

```typescript
// CanvasToolbarFooter.logic.js
const BREAKPOINTS = {
  full: 800,    // All tools visible
  medium: 600,  // Priority 1 only, rest in overflow
  compact: 0,   // Essential only
};

export function useToolbarLayout(containerWidth: number) {
  const mode = useMemo(() => {
    if (containerWidth >= BREAKPOINTS.full) return 'full';
    if (containerWidth >= BREAKPOINTS.medium) return 'medium';
    return 'compact';
  }, [containerWidth]);
  
  const visibleSections = useMemo(() => {
    if (mode === 'full') return TOOLBAR_SECTIONS;
    if (mode === 'medium') return TOOLBAR_SECTIONS.filter(s => s.priority === 1);
    return TOOLBAR_SECTIONS.filter(s => s.id === 'activeView' || s.id === 'openTools');
  }, [mode]);
  
  const overflowSections = useMemo(() => {
    return TOOLBAR_SECTIONS.filter(s => !visibleSections.includes(s));
  }, [visibleSections]);
  
  return { mode, visibleSections, overflowSections };
}
```

### Active View Selector

```jsx
// ActiveViewSelector.jsx
export function ActiveViewSelector({ activeView, views, onSelectView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'recent'
  
  const recentViews = useRecentViews(); // Track view history
  
  return (
    <div className="active-view-selector">
      <button 
        className="active-view-selector__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span 
          className="active-view-selector__dot"
          style={{ background: activeView?.color }}
        />
        <span className="active-view-selector__name">
          {activeView?.name || 'No view selected'}
        </span>
        <ChevronDown size={12} />
      </button>
      
      {isOpen && (
        <DropdownPortal>
          <div className="active-view-selector__dropdown">
            <div className="active-view-selector__tabs">
              <button 
                className={activeTab === 'all' ? 'active' : ''}
                onClick={() => setActiveTab('all')}
              >
                All Views
              </button>
              <button 
                className={activeTab === 'recent' ? 'active' : ''}
                onClick={() => setActiveTab('recent')}
              >
                🕐 Recent
              </button>
            </div>
            
            <div className="active-view-selector__list">
              {(activeTab === 'all' ? views : recentViews).map(view => (
                <button
                  key={view.id}
                  className="active-view-selector__item"
                  onClick={() => { onSelectView(view.id); setIsOpen(false); }}
                >
                  <span style={{ background: view.color }} />
                  <span>{view.name}</span>
                  {activeTab === 'recent' && (
                    <span className="timestamp">{formatRelativeTime(view.lastVisited)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
}
```

### State Synchronization
```javascript
// Sync with Instance Tools panel
useEffect(() => {
  const handleOverlayToggled = (event) => {
    const { instanceId, overlayId, enabled } = event.detail;
    if (instanceId === activeInstanceId) {
      // Update local state to match
      setOverlays(prev => ({ ...prev, [overlayId]: enabled }));
    }
  };
  
  window.addEventListener('cia:overlay-toggled', handleOverlayToggled);
  return () => window.removeEventListener('cia:overlay-toggled', handleOverlayToggled);
}, [activeInstanceId]);
```

### SCSS Structure
```scss
// CanvasToolbarFooter.scss
.canvas-toolbar-footer {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-md;
  min-height: 44px;
  background: rgba(10, 10, 15, 0.95);
  border-top: 1px solid $color-border-subtle;
  backdrop-filter: blur(8px);
  
  &__section {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    
    &--start { margin-right: auto; }
    &--end { margin-left: auto; }
  }
  
  &__separator {
    width: 1px;
    height: 20px;
    background: $color-border-subtle;
    margin: 0 $spacing-xs;
  }
  
  &__tool-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: $radius-sm;
    border: none;
    background: transparent;
    color: $color-text-muted;
    cursor: pointer;
    transition: all 0.15s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: $color-text-secondary;
    }
    
    &--active {
      background: rgba(var(--tool-color-rgb), 0.25);
      color: var(--tool-color);
    }
    
    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
```

---

## Component 4: Camera Section Enhancements

### Location
`src/ui/react/components/panels/InstanceToolsPanel/components/tabs/ToolsTab/CameraSection.jsx`

### New Features

#### 1. flyTo() Function

```javascript
// Add to src/core/instances/types/vtk/utils/cameraUtils.js

const EASING = {
  linear: t => t,
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: t => 1 - Math.pow(1 - t, 3),
  easeIn: t => t * t * t,
  bounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export function flyTo(renderer, targetState, options = {}) {
  const {
    duration = 500,
    easing = 'easeInOut',
    onComplete = null,
    onProgress = null,
  } = options;
  
  const camera = renderer.getActiveCamera();
  if (!camera) return null;
  
  const fromState = captureCameraState(renderer);
  const easingFn = EASING[easing] || EASING.easeInOut;
  
  let startTime = null;
  let animationId = null;
  
  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    
    const elapsed = timestamp - startTime;
    const rawT = Math.min(elapsed / duration, 1);
    const t = easingFn(rawT);
    
    const currentState = interpolateCameraState(fromState, targetState, t);
    
    camera.setPosition(...currentState.position);
    camera.setFocalPoint(...currentState.focalPoint);
    camera.setViewUp(...currentState.viewUp);
    if (currentState.viewAngle) camera.setViewAngle(currentState.viewAngle);
    if (currentState.parallelScale) camera.setParallelScale(currentState.parallelScale);
    
    renderer.resetCameraClippingRange();
    renderer.getRenderWindow().render();
    
    onProgress?.(rawT);
    
    if (rawT < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };
  
  animationId = requestAnimationFrame(animate);
  
  return () => {
    if (animationId) cancelAnimationFrame(animationId);
  };
}
```

#### 2. setResetPoint()

```javascript
// Add to src/core/instances/types/vtk/VTKInstanceHandler.js

setResetPoint(instanceData) {
  if (!instanceData?.sceneObjects?.camera) {
    log.warn("Cannot set reset point: VTK not initialized");
    return false;
  }
  
  const camera = instanceData.sceneObjects.camera;
  
  // Capture current state as new initial state
  instanceData._initialCameraState = {
    position: camera.getPosition(),
    focalPoint: camera.getFocalPoint(),
    viewUp: camera.getViewUp(),
    parallelScale: camera.getParallelScale(),
    clippingRange: camera.getClippingRange(),
    viewAngle: camera.getViewAngle(),
  };
  
  // Persist to ViewConfiguration
  if (instanceData.viewConfigId) {
    const viewConfig = viewConfigurationManager.getView(instanceData.viewConfigId);
    if (viewConfig) {
      viewConfig.camera = { ...instanceData._initialCameraState };
      viewConfig.cameraIsResetPoint = true;
      viewConfigurationManager.updateView(instanceData.viewConfigId, viewConfig);
    }
  }
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('cia:reset-point-set', {
    detail: { instanceId: instanceData.instanceId }
  }));
  
  log.debug(`Reset point set for ${instanceData.instanceId}`);
  return true;
}
```

#### 3. Animation Presets

```javascript
// CameraSection.logic.js

export function useAnimationPresets(instanceId) {
  const [activePreset, setActivePreset] = useState(null);
  const animationRef = useRef(null);
  
  const startOrbit = useCallback(() => {
    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) return;
    
    const { camera, renderer, renderWindow } = instance.instanceData.sceneObjects;
    const startPosition = camera.getPosition();
    const focalPoint = camera.getFocalPoint();
    
    let angle = 0;
    const animate = () => {
      angle += 0.5; // degrees per frame
      
      // Rotate camera around focal point
      const radius = Math.sqrt(
        Math.pow(startPosition[0] - focalPoint[0], 2) +
        Math.pow(startPosition[2] - focalPoint[2], 2)
      );
      const rad = (angle * Math.PI) / 180;
      
      camera.setPosition(
        focalPoint[0] + radius * Math.sin(rad),
        startPosition[1],
        focalPoint[2] + radius * Math.cos(rad)
      );
      
      renderer.resetCameraClippingRange();
      renderWindow.render();
      
      if (angle < 360) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setActivePreset(null);
      }
    };
    
    setActivePreset('orbit');
    animationRef.current = requestAnimationFrame(animate);
  }, [instanceId]);
  
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setActivePreset(null);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return { activePreset, startOrbit, startTumble: () => {}, startRock: () => {}, stopAnimation };
}
```

---

## Component 5: Hybrid Filter

### Location
`src/ui/react/components/panels/InstanceToolsPanel/components/shared/HybridFilter/`

### Purpose
Responsive filter component that adapts to container width.

### Props
```typescript
interface HybridFilterProps {
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (filterId: string, value: any) => void;
  onClearAll: () => void;
}

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiSelect' | 'dateRange' | 'search';
  options?: { value: string; label: string }[];
  icon?: string;
}
```

### Implementation
```jsx
// HybridFilter.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useResizeObserver } from '@UI/react/hooks/useResizeObserver';

const BREAKPOINTS = { compact: 320, medium: 480 };

export function HybridFilter({ filters, activeFilters, onFilterChange, onClearAll }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState('full');
  
  // Measure container width
  useResizeObserver(containerRef, (entry) => {
    const width = entry.contentRect.width;
    if (width < BREAKPOINTS.compact) setMode('compact');
    else if (width < BREAKPOINTS.medium) setMode('medium');
    else setMode('full');
  });
  
  const activeCount = Object.values(activeFilters).filter(Boolean).length;
  
  if (mode === 'compact') {
    return (
      <div ref={containerRef} className="hybrid-filter hybrid-filter--compact">
        <FilterDropdownButton 
          filters={filters}
          activeFilters={activeFilters}
          activeCount={activeCount}
          onFilterChange={onFilterChange}
        />
      </div>
    );
  }
  
  if (mode === 'medium') {
    const visibleFilters = filters.slice(0, 2);
    const overflowFilters = filters.slice(2);
    
    return (
      <div ref={containerRef} className="hybrid-filter hybrid-filter--medium">
        {visibleFilters.map(filter => (
          <FilterChip key={filter.id} filter={filter} value={activeFilters[filter.id]} onChange={onFilterChange} />
        ))}
        {overflowFilters.length > 0 && (
          <MoreFiltersButton filters={overflowFilters} activeFilters={activeFilters} onChange={onFilterChange} />
        )}
        {activeCount > 0 && <ClearAllButton onClick={onClearAll} />}
      </div>
    );
  }
  
  // Full mode
  return (
    <div ref={containerRef} className="hybrid-filter hybrid-filter--full">
      {filters.map(filter => (
        <FilterChip key={filter.id} filter={filter} value={activeFilters[filter.id]} onChange={onFilterChange} />
      ))}
      {activeCount > 0 && <ClearAllButton onClick={onClearAll} />}
    </div>
  );
}
```

---

## Integration Points

### Event System

```typescript
// Events dispatched
'cia:overlay-toggled'        // { instanceId, overlayId, enabled }
'cia:measurement-activated'  // { instanceId, measurementType }
'cia:reset-point-set'        // { instanceId }
'cia:view-changed'           // { instanceId, viewId }
'cia:annotation-created'     // { instanceId, annotation }
'cia:annotation-deleted'     // { instanceId, annotationId }

// Events listened
'cia:instance-focused'       // When user focuses an instance
'cia:tools-updated'          // When tools change for instance
```

### workspaceManager Extensions

```javascript
// Add to workspaceManager.js

setResetPoint(instanceId) {
  const instance = this.getInstance(instanceId);
  if (!instance?.handler?.setResetPoint) return false;
  return instance.handler.setResetPoint(instance.instanceData);
}

setOverlayEnabled(instanceId, overlayId, enabled) {
  const instance = this.getInstance(instanceId);
  if (!instance?.handler?.setOverlayEnabled) return;
  instance.handler.setOverlayEnabled(instance.instanceData, overlayId, enabled);
}
```

---

## Implementation Order

### Phase 1: Foundation (Day 1-2)
1. `ToggleSwitch` atom component
2. `HybridFilter` shared component
3. `DisplaySection` in Tools Tab

### Phase 2: Annotations (Day 3-4)
4. `AnnotationsTab` component
5. `AnnotationItem` component
6. Wire up to existing annotation system

### Phase 3: Canvas Toolbar (Day 5-7)
7. `CanvasToolbarFooter` container
8. `ActiveViewSelector` with history
9. Tool sections (overlays, measurements, view controls)
10. `OverflowMenu` for responsive behavior
11. `LinksDropdown` component

### Phase 4: Camera Enhancements (Day 8-9)
12. `flyTo()` function in cameraUtils.js
13. `setResetPoint()` in VTKInstanceHandler
14. Animation presets (orbit, tumble, rock)
15. `CameraSection` UI updates

### Phase 5: Integration (Day 10)
16. State synchronization between toolbar and panel
17. Event system wiring
18. Testing responsive behavior

---

## Testing Checklist

- [ ] Display Tab toggles sync with Canvas Toolbar Footer
- [ ] Annotations Tab filters work at all panel widths
- [ ] Canvas Toolbar Footer responsive at 600px, 800px breakpoints
- [ ] Active View dropdown shows recent views with timestamps
- [ ] flyTo() animates smoothly with all easing options
- [ ] Set Reset Point persists across session
- [ ] Animation presets (orbit) can be started/stopped
- [ ] Overflow menu shows hidden tools correctly
- [ ] Keyboard shortcuts work from Canvas Toolbar Footer

---

## Reference Artifacts

| Artifact | Purpose |
|----------|---------|
| `08-display-tab.jsx` | Display section design |
| `09-layers-widgets-updated.jsx` | Layer/widget updates |
| `10-annotations-tab.jsx` | Annotations tab design |
| `11-left-panel-annotations-enhanced.jsx` | Full annotations panel |
| `12-hybrid-filter.jsx` | Responsive filter design |
| `13-canvas-toolbar-footer-enhanced.jsx` | Toolbar footer design |
| `14-camera-section-enhanced.jsx` | Camera enhancements |

---

## Questions for Implementation

1. **Annotation storage** - Are annotations stored in PostgreSQL or Y.js? Need to confirm data layer.

2. **View history** - Should recent views persist across sessions or be session-only?

3. **Animation presets** - Should these be per-instance or global settings?

4. **Keyboard shortcuts** - Any conflicts with existing shortcuts to resolve?

5. **Canvas Toolbar position** - Fixed at bottom or allow user to move to top?
