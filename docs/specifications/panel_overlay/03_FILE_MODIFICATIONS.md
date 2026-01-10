# Panel Overlay Architecture - File Modifications

**Date:** January 9, 2026

---

## Overview

This document lists all existing files that need modification to implement the overlay panel architecture.

---

## 1. ThreeEdgeLayout Component

### File: `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx`

**Current Behavior:** Uses flex layout where panels push the canvas.

**Required Changes:**

1. Change canvas container to `position: relative` for overlay positioning
2. Remove panel width from flex calculation
3. Panels render inside canvas container with `position: absolute`

```jsx
// BEFORE
<div className="three-edge-layout">
  <ActivityBar side="left" />
  {leftOpen && <LeftPanel width={leftWidth} />}   {/* Pushes canvas */}
  <div className="canvas-container">              {/* Flex: 1 */}
    <Canvas />
  </div>
  {rightOpen && <RightPanel width={rightWidth} />}
  <ActivityBar side="right" />
</div>

// AFTER
<div className="three-edge-layout">
  <ActivityBar side="left" />
  <div className="canvas-container">              {/* Flex: 1, position: relative */}
    <Canvas />
    <OverlayPanel side="left" />                  {/* position: absolute */}
    <OverlayPanel side="right" />                 {/* position: absolute */}
  </div>
  <ActivityBar side="right" />
</div>
```

### File: `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.scss`

**Changes:**

```scss
// BEFORE
.three-edge-layout {
  display: flex;
  height: 100%;
}

.canvas-container {
  flex: 1;
  min-width: 0;
}

// AFTER
.three-edge-layout {
  display: flex;
  height: 100%;
}

.canvas-container {
  flex: 1;
  min-width: 0;
  position: relative;  // NEW: For overlay positioning
  overflow: hidden;    // NEW: Prevent panel overflow
}
```

---

## 2. ThreeEdgeLayout Logic Hook

### File: `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.logic.js`

**Required Changes:**

1. Add peek state (`leftPeekingTab`, `rightPeekingTab`)
2. Add grace period logic
3. Add focus mode state
4. Add panel state restoration

```javascript
// ADD these to useLayoutState:

// Peek state
const [leftPeekingTab, setLeftPeekingTab] = useState(null);
const [rightPeekingTab, setRightPeekingTab] = useState(null);

// Grace period state
const [leftInGrace, setLeftInGrace] = useState(false);
const [rightInGrace, setRightInGrace] = useState(false);

// Focus mode
const [focusMode, setFocusMode] = useState(false);
const [focusedCell, setFocusedCell] = useState(null);
const preFocusStateRef = useRef({ left: null, right: null });

// New functions to export
const startPeek = (side, tabId) => { ... };
const endPeek = (side) => { ... };
const pinPeek = (side) => { ... };
const enterFocusMode = (cellId) => { ... };
const exitFocusMode = () => { ... };
```

---

## 3. LayoutContext

### File: `src/ui/react/components/layout/ThreeEdgeLayout/LayoutContext.jsx`

**Required Changes:**

Add new state and functions to context:

```javascript
// ADD to context value:
{
  // Existing
  leftOpen,
  setLeftOpen,
  rightOpen,
  setRightOpen,
  leftWidth,
  setLeftWidth,
  rightWidth,
  setRightWidth,
  leftActiveTab,
  setLeftActiveTab,
  rightActiveTab,
  setRightActiveTab,
  
  // NEW: Peek state
  leftPeekingTab,
  rightPeekingTab,
  startPeek,
  endPeek,
  pinPeek,
  
  // NEW: Visibility helpers
  shouldShowPanel,  // (side, tabId) => boolean
  isPreviewMode,    // (side, tabId) => boolean
  
  // NEW: Panel mouse handlers
  onPanelMouseEnter,
  onPanelMouseLeave,
  
  // NEW: Focus mode
  focusMode,
  focusedCell,
  enterFocusMode,
  exitFocusMode,
  toggleFocusMode,
}
```

---

## 4. ActivityBar Component

### File: `src/ui/react/components/layout/ActivityBar/ActivityBar.jsx`

**Required Changes:**

1. Import and use `useAdaptiveHover` in tabs
2. Add `onPeekStart` and `onPeekEnd` handlers
3. Pass peek state to tabs

```jsx
// BEFORE
<ActivityBarTab
  id={tab.id}
  isActive={activeTab === tab.id}
  onClick={() => onTabChange(tab.id)}
/>

// AFTER
<ActivityBarTab
  id={tab.id}
  isActive={activeTab === tab.id}
  isPeeking={peekingTab === tab.id}
  onClick={() => onTabChange(tab.id)}
  onPeekStart={onPeekStart}
  onPeekEnd={onPeekEnd}
  side={side}
/>
```

### File: `src/ui/react/components/layout/ActivityBar/ActivityBar.scss`

**Add styles for peeking state:**

```scss
.activity-bar-tab {
  // Existing styles...
  
  &--peeking {
    color: var(--color-accent-blue);
    background: rgba(96, 165, 250, 0.1);
  }
}
```

---

## 5. ResizablePanel Component

### File: `src/ui/react/components/layout/ResizablePanel/ResizablePanel.jsx`

**Required Changes:**

This component needs to be refactored or deprecated. The new `OverlayPanel` component will handle panel rendering with overlay behavior.

**Options:**
1. **Deprecate:** Remove ResizablePanel, use OverlayPanel instead
2. **Refactor:** Modify ResizablePanel to support overlay mode via prop

**Recommended:** Create new `OverlayPanel` component, gradually migrate.

---

## 6. LeftPanel / RightPanel Components

### Files:
- `src/ui/react/components/panels/LeftPanel/LeftPanel.jsx`
- `src/ui/react/components/panels/RightPanel/RightPanel.jsx`

**Required Changes:**

These components render panel content. They need to be wrapped by `OverlayPanel`:

```jsx
// BEFORE (simplified)
function LeftPanel({ width, isCollapsed, activeTab }) {
  return (
    <div className="left-panel" style={{ width }}>
      <PanelHeader />
      <PanelContent tab={activeTab} />
    </div>
  );
}

// AFTER
function LeftPanel({ tabId }) {
  const { shouldShowPanel, isPreviewMode, pinPeek, ... } = useLayoutContext();
  
  return (
    <OverlayPanel
      side="left"
      tabId={tabId}
      isOpen={shouldShowPanel('left', tabId)}
      isPreview={isPreviewMode('left', tabId)}
      onPin={() => pinPeek('left')}
      onClose={() => setLeftActiveTab(null)}
      title={PANEL_TITLES[tabId]}
    >
      <PanelContent tab={tabId} />
    </OverlayPanel>
  );
}
```

---

## 7. AdaptiveContext

### File: `src/ui/react/context/AdaptiveContext.jsx`

**Required Changes:**

Add new timing tokens:

```javascript
// ADD to DESKTOP_TOKENS:
hoverDelay: 300,        // ms before peek activates
peekGracePeriod: 400,   // ms before peek closes

// ADD to VR_TOKENS:
dwellTime: 500,         // ms for VR dwell hover
peekGracePeriod: 600,   // Longer grace in VR
hoverDelay: 0,          // No delay in VR (dwell handles it)
```

---

## 8. Canvas Components

### File: `src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGrid.jsx`

**Required Changes:**

Add double-click handler for focus mode:

```jsx
// ADD handler
const handleCellDoubleClick = (cellId) => {
  enterFocusMode(cellId);
};

// ADD to cell render
<CanvasCell
  onDoubleClick={() => handleCellDoubleClick(cell.id)}
  // ... other props
/>
```

### File: `src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.jsx`

**Required Changes:**

1. Add `onDoubleClick` prop
2. Show focus hint on hover

```jsx
function CanvasCell({ onDoubleClick, ...props }) {
  return (
    <div 
      className="canvas-cell"
      onDoubleClick={onDoubleClick}
    >
      {/* ... content */}
      <div className="canvas-cell__hint">
        Double-click to focus
      </div>
    </div>
  );
}
```

---

## 9. App Keyboard Shortcuts

### File: `src/App.jsx` or relevant keyboard handler

**Required Changes:**

Add focus mode shortcuts:

```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    // Existing shortcuts...
    
    // Focus mode toggle
    if ((e.key === 'f' || e.key === 'F') && !isInputFocused(e)) {
      e.preventDefault();
      toggleFocusMode();
    }
    
    // Panel shortcuts (1-8)
    const num = parseInt(e.key);
    if (num >= 1 && num <= 8 && !isInputFocused(e)) {
      if (num <= 4) {
        toggleLeftPanel(LEFT_TABS[num - 1].id);
      } else {
        toggleRightPanel(RIGHT_TABS[num - 5].id);
      }
    }
  };
  
  // ...
}, []);
```

---

## 10. localStorage Persistence

### File: `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.logic.js`

**Required Changes:**

Add localStorage for panel widths:

```javascript
const STORAGE_KEY = 'cia-panel-widths';

// Load on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { left, right } = JSON.parse(saved);
      if (left) setLeftWidth(left);
      if (right) setRightWidth(right);
    }
  } catch (e) {
    console.warn('Failed to load panel widths:', e);
  }
}, []);

// Save on change
useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      left: leftWidth,
      right: rightWidth,
    }));
  } catch (e) {
    console.warn('Failed to save panel widths:', e);
  }
}, [leftWidth, rightWidth]);
```

---

## 11. VR Controller Integration (Future)

### File: `src/core/instances/types/vtk/vr/VTKVRController.js`

**Future Changes (Phase 2):**

Add UI element raycasting and hover events:

```javascript
// ADD: Track hovered UI element
_currentHoveredElement = new Map(); // instanceId -> elementId

// ADD: Raycast against UI
_raycastUI(origin, direction) {
  // Project ray to screen space
  // Find element at projected point
  // Return element's data-hover-id
}

// ADD: Emit hover events
_updateUIHover(instanceId, currentElementId) {
  const previousElementId = this._currentHoveredElement.get(instanceId);
  
  if (currentElementId !== previousElementId) {
    if (previousElementId) {
      window.dispatchEvent(new CustomEvent('cia:vr-ray-exit', {
        detail: { instanceId, elementId: previousElementId }
      }));
    }
    
    if (currentElementId) {
      window.dispatchEvent(new CustomEvent('cia:vr-ray-enter', {
        detail: { instanceId, elementId: currentElementId }
      }));
    }
    
    this._currentHoveredElement.set(instanceId, currentElementId);
  }
}
```

---

## Summary of Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `ThreeEdgeLayout.jsx` | P0 | Canvas container positioning |
| `ThreeEdgeLayout.scss` | P0 | position: relative on canvas |
| `ThreeEdgeLayout.logic.js` | P0 | Peek/focus state |
| `LayoutContext.jsx` | P0 | New context values |
| `ActivityBar.jsx` | P0 | Peek handlers |
| `ActivityBar.scss` | P1 | Peek state styles |
| `AdaptiveContext.jsx` | P0 | Timing tokens |
| `LeftPanel.jsx` | P1 | Wrap with OverlayPanel |
| `RightPanel.jsx` | P1 | Wrap with OverlayPanel |
| `CanvasGrid.jsx` | P1 | Double-click handler |
| `CanvasCell.jsx` | P1 | Focus hint |
| `App.jsx` | P1 | Keyboard shortcuts |
| `VTKVRController.js` | P2 | VR hover events (future) |
