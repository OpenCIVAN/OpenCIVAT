# Panel Overlay Architecture - Migration Steps

**Date:** January 9, 2026

---

## Overview

This document provides a step-by-step implementation order for migrating from push-based panels to overlay panels.

---

## Phase 1: Foundation (Hooks & Context)

**Goal:** Create the core hooks and update context without changing UI yet.

### Step 1.1: Add Timing Tokens to AdaptiveContext

**File:** `src/ui/react/context/AdaptiveContext.jsx`

```javascript
// Add to DESKTOP_TOKENS:
hoverDelay: 300,
peekGracePeriod: 400,

// Add to VR_TOKENS:
dwellTime: 500,
peekGracePeriod: 600,
hoverDelay: 0,
```

**Verification:** Console.log tokens in a component, verify new values appear.

---

### Step 1.2: Create useAdaptiveHover Hook

**File:** `src/ui/react/hooks/useAdaptiveHover.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** 
```jsx
// Test component
function HoverTest() {
  const ref = useRef(null);
  const { isHovered, dwellProgress } = useAdaptiveHover(ref);
  
  return (
    <div ref={ref} style={{ padding: 20, background: isHovered ? 'blue' : 'gray' }}>
      Hover me (progress: {dwellProgress.toFixed(2)})
    </div>
  );
}
```

---

### Step 1.3: Create usePanelState Hook

**File:** `src/ui/react/hooks/usePanelState.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:**
```jsx
// Test in console
const state = usePanelState('left');
state.startPeek('datasets');
// Verify state.shouldShow('datasets') returns true
// Verify state.isPreview('datasets') returns true
```

---

### Step 1.4: Create useFocusMode Hook

**File:** `src/ui/react/hooks/useFocusMode.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** Press `F` key, verify focus mode toggles.

---

### Step 1.5: Update LayoutContext

**File:** `src/ui/react/components/layout/ThreeEdgeLayout/LayoutContext.jsx`

Add new state and functions:
- `leftPeekingTab`, `rightPeekingTab`
- `focusMode`, `focusedCell`
- `shouldShowPanel()`, `isPreviewMode()`
- `startPeek()`, `endPeek()`, `pinPeek()`
- `enterFocusMode()`, `exitFocusMode()`

**Verification:** Consumer components can access new context values.

---

## Phase 2: Atomic Components

**Goal:** Create the new UI components without wiring them up.

### Step 2.1: Create DwellIndicator Atom

**Files:**
- `src/ui/react/components/atoms/DwellIndicator/DwellIndicator.jsx`
- `src/ui/react/components/atoms/DwellIndicator/DwellIndicator.scss`
- `src/ui/react/components/atoms/DwellIndicator/index.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** Storybook story showing progress states (0.25, 0.5, 0.75).

---

### Step 2.2: Create PreviewHintBanner Molecule

**Files:**
- `src/ui/react/components/molecules/PreviewHintBanner/PreviewHintBanner.jsx`
- `src/ui/react/components/molecules/PreviewHintBanner/PreviewHintBanner.scss`
- `src/ui/react/components/molecules/PreviewHintBanner/index.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** Storybook story showing banner.

---

### Step 2.3: Create OverlayPanelHeader Molecule

**Files:**
- `src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.jsx`
- `src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.scss`
- `src/ui/react/components/molecules/OverlayPanelHeader/index.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** Storybook stories for both `isPreview: true` and `isPreview: false`.

---

### Step 2.4: Create OverlayPanel Component

**Files:**
- `src/ui/react/components/panels/OverlayPanel/OverlayPanel.jsx`
- `src/ui/react/components/panels/OverlayPanel/OverlayPanel.scss`
- `src/ui/react/components/panels/OverlayPanel/index.js`

Copy implementation from `04_NEW_FILES.md`.

**Verification:** Storybook stories showing:
- Closed state
- Open/pinned state
- Preview state (with glow border)
- Left vs right positioning

---

## Phase 3: Layout Modifications

**Goal:** Change the layout structure to support overlay panels.

### Step 3.1: Update ThreeEdgeLayout Structure

**File:** `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx`

**Before:**
```jsx
<div className="three-edge-layout">
  <ActivityBar side="left" />
  <ResizablePanel side="left">
    <LeftPanel />
  </ResizablePanel>
  <div className="canvas-container">
    <Canvas />
  </div>
  <ResizablePanel side="right">
    <RightPanel />
  </ResizablePanel>
  <ActivityBar side="right" />
</div>
```

**After:**
```jsx
<div className="three-edge-layout">
  <ActivityBar side="left" />
  <div className="canvas-container">
    <Canvas />
    <OverlayPanel side="left" tabId={leftActiveTab || leftPeekingTab}>
      <LeftPanelContent tab={leftActiveTab || leftPeekingTab} />
    </OverlayPanel>
    <OverlayPanel side="right" tabId={rightActiveTab || rightPeekingTab}>
      <RightPanelContent tab={rightActiveTab || rightPeekingTab} />
    </OverlayPanel>
  </div>
  <ActivityBar side="right" />
</div>
```

**Verification:** Canvas fills space, no panels visible yet (state is null).

---

### Step 3.2: Update ThreeEdgeLayout Styles

**File:** `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.scss`

```scss
.canvas-container {
  flex: 1;
  min-width: 0;
  position: relative;  // ADD
  overflow: hidden;    // ADD
}
```

**Verification:** Overlay panels position correctly relative to canvas.

---

### Step 3.3: Update ActivityBar with Peek Handlers

**File:** `src/ui/react/components/layout/ActivityBar/ActivityBar.jsx`

Add hover handlers to tabs:

```jsx
<ActivityBarTab
  id={tab.id}
  isActive={activeTab === tab.id}
  isPeeking={peekingTab === tab.id}
  onClick={() => onTabChange(tab.id)}
  onPeekStart={() => startPeek(side, tab.id)}
  onPeekEnd={() => endPeek(side)}
  side={side}
/>
```

**Verification:** Hover over tab, verify `peekingTab` state updates in DevTools.

---

### Step 3.4: Wire Up OverlayPanel State

**File:** `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.jsx`

Connect panel to state:

```jsx
<OverlayPanel
  side="left"
  tabId={leftActiveTab || leftPeekingTab}
  isOpen={!!leftActiveTab}
  isPreview={!leftActiveTab && !!leftPeekingTab}
  onClose={() => setLeftActiveTab(null)}
  onPin={() => pinPeek('left')}
  onMouseEnter={() => onPanelMouseEnter('left')}
  onMouseLeave={() => onPanelMouseLeave('left')}
  title={getPanelTitle(leftActiveTab || leftPeekingTab)}
>
  {/* Panel content */}
</OverlayPanel>
```

**Verification:** 
1. Hover tab → panel peeks with preview state
2. Click tab → panel pins
3. Click pin button → preview becomes pinned
4. Mouse leave with grace period works

---

## Phase 4: Focus Mode Integration

**Goal:** Connect focus mode to canvas and panels.

### Step 4.1: Add Double-Click Handler to Canvas Cells

**File:** `src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.jsx`

```jsx
<div 
  className="canvas-cell"
  onDoubleClick={() => onDoubleClick?.(cellId)}
>
```

**File:** `src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGrid.jsx`

```jsx
const { focusCell } = useLayoutContext();

<CanvasCell
  onDoubleClick={(cellId) => focusCell(cellId)}
/>
```

**Verification:** Double-click cell → focus mode activates, panels collapse.

---

### Step 4.2: Add Focus Mode Exit Controls

**File:** `src/ui/react/components/workspace/Canvas/CanvasGrid/CanvasGrid.jsx`

Add back button when in focus mode:

```jsx
{focusMode && focusedCell && (
  <div className="focus-overlay">
    <button onClick={exitFocusMode}>
      ← Back to Grid (Esc)
    </button>
  </div>
)}
```

**Verification:** Can exit focus mode via button or Esc key.

---

### Step 4.3: Verify Panel State Restoration

**Test Sequence:**
1. Open left panel (Datasets)
2. Open right panel (Tools)
3. Press F (focus mode)
4. Verify both panels collapse
5. Press Esc
6. Verify both panels restore to previous state

---

## Phase 5: Polish & Edge Cases

### Step 5.1: Add localStorage Persistence for Panel Widths

**File:** `src/ui/react/components/layout/ThreeEdgeLayout/ThreeEdgeLayout.logic.js`

```javascript
const STORAGE_KEY = 'cia-panel-widths';

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  // ... restore widths
}, []);

// Save on change
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: leftWidth, right: rightWidth }));
}, [leftWidth, rightWidth]);
```

---

### Step 5.2: Add Keyboard Shortcuts

**File:** App.jsx or dedicated keyboard handler

- `1-4`: Toggle left panels
- `5-8` (or `Shift+1-4`): Toggle right panels
- `F`: Toggle focus mode
- `Esc`: Exit focus / close panels

---

### Step 5.3: Add Reduced Motion Support

**File:** `src/ui/react/components/panels/OverlayPanel/OverlayPanel.scss`

```scss
@media (prefers-reduced-motion: reduce) {
  .overlay-panel {
    transition: opacity 150ms ease;
    
    &--preview::before {
      animation: none;
    }
  }
}
```

---

### Step 5.4: Tune Preview Opacity

Adjust the preview opacity based on visual testing:

```scss
&--preview {
  opacity: 0.75; // Start here, adjust as needed (0.70-0.80 range)
}
```

---

## Phase 6: VR Integration (Future)

### Step 6.1: Add VR Ray Events to VTKVRController

Emit `cia:vr-ray-enter` and `cia:vr-ray-exit` events when controller ray intersects UI elements.

### Step 6.2: Connect useAdaptiveHover to VR Events

The hook already listens for these events - just need the controller to emit them.

### Step 6.3: Test VR Dwell Behavior

- Point at Activity Bar tab
- Verify progress ring appears
- Wait for dwell to complete
- Verify panel appears

---

## Rollback Plan

If issues arise during migration:

1. **Quick Rollback:** Revert ThreeEdgeLayout.jsx to use ResizablePanel
2. **Partial Rollback:** Keep new hooks but use old panel rendering
3. **Feature Flag:** Add `ENABLE_OVERLAY_PANELS` flag to switch between behaviors

```javascript
const useOverlayPanels = process.env.REACT_APP_ENABLE_OVERLAY_PANELS === 'true';

// In ThreeEdgeLayout:
{useOverlayPanels ? (
  <OverlayPanel ... />
) : (
  <ResizablePanel ... />
)}
```

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Foundation | 2-3 hours |
| Phase 2: Atomic Components | 2-3 hours |
| Phase 3: Layout Modifications | 3-4 hours |
| Phase 4: Focus Mode | 1-2 hours |
| Phase 5: Polish | 2-3 hours |
| **Total** | **10-15 hours** |

Phase 6 (VR) is deferred and estimated at additional 4-6 hours.
