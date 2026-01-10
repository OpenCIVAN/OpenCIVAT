# Panel Overlay Architecture - Implementation Guide

**Date:** January 9, 2026
**Feature:** Overlay Panels with Hover-Peek, Focus Mode, and VR Dwell
**Status:** Complete (all phases implemented)

---

## Implementation Status (Updated 2026-01-09)

### Completed

- **AdaptiveContext timing tokens** - Added hoverDelay, peekGracePeriod, dwellTime, panelWidth, activityBarWidth
- **useAdaptiveHover hook** - Unified hover detection for Desktop (mouse) and VR (dwell)
- **usePanelState hook** - Panel open/peek/preview state with grace period logic
- **useFocusMode hook** - Focus mode state management with F key shortcut
- **DwellIndicator atom** - VR dwell progress ring component
- **PreviewHintBanner molecule** - "Preview" banner for peek mode
- **OverlayPanelHeader molecule** - Panel header with Pin/Close buttons
- **OverlayPanel component** - Overlay panel with slide animation and preview state
- **LayoutContext extended** - Added peek state, focus mode to context
- **ActivityBar peek detection** - LeftActivityBar and RightActivityBar have hover peek

### Pending

- None! All features implemented.

### Recently Completed (2026-01-09)

- **Canvas double-click focus** - Double-click cell triggers focus view + panel collapse
- **Switch panels to overlay positioning** - Grid now uses 3-column overlay mode
- **OverlayPanel integration** - Panel content wrapped in OverlayPanel components

---

## Executive Summary

This handoff package specifies the migration from **push-based side panels** to **overlay panels** in CIA Web. Panels will overlay the canvas without resizing it, include hover-peek preview functionality, and support VR dwell-based interaction.

### Key Changes

1. **Panels overlay canvas** - No longer push/resize the canvas area
2. **Hover-peek preview** - Hover Activity Bar tabs to preview panels
3. **Preview vs Pinned states** - Visual differentiation with pin action
4. **Focus Mode** - Collapse panels with state restoration on exit
5. **VR dwell hover** - Unified hover system for Desktop and VR
6. **One panel per side** - Switch behavior, not stack

---

## Package Contents

| File | Description |
|------|-------------|
| `00_IMPLEMENTATION_GUIDE.md` | This file - overview and architecture |
| `01_DESIGN_DECISIONS.md` | All confirmed design decisions |
| `02_COMPONENT_SPECIFICATIONS.md` | Props, state, hooks for each component |
| `03_FILE_MODIFICATIONS.md` | Existing files to modify |
| `04_NEW_FILES.md` | New files to create |
| `05_MIGRATION_STEPS.md` | Step-by-step implementation order |
| `06_TESTING_CHECKLIST.md` | QA verification checklist |

---

## Architecture Overview

### Current Architecture (Push)

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├────────┬────────────────────────────────┬───────────────┤
│Activity│                                │    Activity   │
│  Bar   │  Left    │    CANVAS    │Right │      Bar      │
│ (48px) │  Panel   │   (flex:1)   │Panel │    (48px)     │
│        │ (320px)  │              │(340px)│               │
├────────┴──────────┴──────────────┴──────┴───────────────┤
│ Footer                                                  │
└─────────────────────────────────────────────────────────┘

Problem: Canvas resizes when panels open/close
```

### New Architecture (Overlay)

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├────────┬────────────────────────────────────────┬───────┤
│Activity│                                        │Activity│
│  Bar   │              CANVAS                    │  Bar   │
│ (48px) │           (fills space)                │ (48px) │
│        │   ┌─────────────┐                      │        │
│        │   │ Left Panel  │ ← Overlays canvas    │        │
│        │   │ (absolute)  │                      │        │
│        │   └─────────────┘                      │        │
├────────┴────────────────────────────────────────┴───────┤
│ Footer                                                  │
└─────────────────────────────────────────────────────────┘

Solution: Canvas never resizes, panels float on top
```

### Component Hierarchy

```
App
├── Header
├── AppBody (flex container)
│   ├── ActivityBar (left, 48px, flexShrink: 0)
│   │   └── ActivityBarTab[] (with useAdaptiveHover)
│   │
│   ├── CanvasContainer (flex: 1, position: relative)
│   │   ├── CanvasGrid (fills container)
│   │   │   └── CanvasCell[]
│   │   │
│   │   ├── OverlayPanel (left, position: absolute)  ← NEW
│   │   │   ├── PanelHeader (with Pin/Close button)
│   │   │   ├── PreviewHintBanner (conditional)
│   │   │   └── PanelContent
│   │   │
│   │   └── OverlayPanel (right, position: absolute) ← NEW
│   │
│   └── ActivityBar (right, 48px, flexShrink: 0)
│
└── Footer
```

### State Flow

```
┌─────────────────────────────────────────────────────────┐
│                    LayoutContext                        │
├─────────────────────────────────────────────────────────┤
│ leftActiveTab: string | null    // Pinned panel         │
│ rightActiveTab: string | null   // Pinned panel         │
│ leftPeekingTab: string | null   // Preview panel        │
│ rightPeekingTab: string | null  // Preview panel        │
│ focusMode: boolean              // Focus mode active    │
│ preFocusState: { left, right }  // Saved panel state    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Panel State Logic                      │
├─────────────────────────────────────────────────────────┤
│ isOpen = activeTab === tabId                            │
│ isPeeking = peekingTab === tabId && !isOpen             │
│ isPreview = isPeeking || mouseInside || inGracePeriod   │
│ shouldShow = isOpen || isPreview                        │
└─────────────────────────────────────────────────────────┘
```

---

## Key Behavioral Rules

### Panel Visibility States

| State | Trigger | Visual | Behavior |
|-------|---------|--------|----------|
| **Closed** | Default | Hidden | Panel not visible |
| **Preview** | Hover tab (300ms) or VR dwell (500ms) | 75-80% opacity, glow border, "PREVIEW" banner, Pin button | Auto-closes after 400ms grace period |
| **Pinned** | Click tab or Pin button | 100% opacity, Close button | Stays open until explicitly closed |

### Focus Mode Behavior

1. **Enter Focus Mode:**
   - Save current `{ leftActiveTab, rightActiveTab }` to `preFocusState`
   - Set both active tabs to `null`
   - Set `focusMode: true`

2. **Exit Focus Mode:**
   - Restore `leftActiveTab` and `rightActiveTab` from `preFocusState`
   - Set `focusMode: false`

3. **Triggers:**
   - `F` key → Toggle focus mode
   - Double-click cell → Enter focus mode + focus cell
   - `Esc` → Exit focus mode (or exit focused cell first)

### Panel Switching (One Per Side)

```javascript
// When user clicks a tab:
const handleTabChange = (tabId) => {
  setActiveTab(prev => prev === tabId ? null : tabId); // Toggle same, switch different
  setPeekingTab(null); // Clear any peek state
};

// When user pins from preview:
const handlePin = (tabId) => {
  setActiveTab(tabId);
  setPeekingTab(null);
};
```

### Hover-Peek Flow

```
Desktop:
1. Mouse enters ActivityBarTab
2. Start 300ms timer
3. Timer completes → setPeekingTab(tabId) → Panel slides in as preview
4. Mouse enters panel → setMouseInside(true) → Panel stays
5. Mouse leaves panel → Start 400ms grace period
6. Grace period expires → Panel closes (unless mouse returned)

VR:
1. Controller ray enters ActivityBarTab
2. Start dwell timer, show progress ring
3. 500ms completes → setPeekingTab(tabId) → Panel appears as preview
4. Ray enters panel → Panel stays
5. Ray leaves panel → Start 600ms grace period
6. Grace period expires → Panel closes
```

---

## Integration Points

### Existing Systems to Integrate

| System | Integration |
|--------|-------------|
| **AdaptiveContext** | Use `isVR` and `tokens` for sizing/timing |
| **FloatingPanelContext** | Panels can pop-out to floating |
| **ThreeEdgeLayout** | Modify to use overlay instead of push |
| **LeftPanelContext/RightPanelContext** | Tab content rendering |
| **VRManager** | VR dwell events |

### New Systems to Create

| System | Purpose |
|--------|---------|
| **useAdaptiveHover** | Unified hover for Desktop/VR |
| **DwellIndicator** | VR progress ring component |
| **usePanelState** | Panel open/peek/preview state logic |
| **useFocusMode** | Focus mode state and restoration |

---

## Performance Considerations

1. **Panel Rendering:** Only render panel content when `shouldShow` is true
2. **Animation:** Use CSS transforms (GPU accelerated) for slide animations
3. **Grace Period:** Use refs for timers to avoid re-renders
4. **VR Dwell:** Use requestAnimationFrame for smooth progress updates
5. **Backdrop Filter:** Limit blur radius to prevent performance issues on low-end devices

---

## Accessibility

1. **Keyboard Navigation:**
   - `1-4` → Toggle left panels
   - `5-8` → Toggle right panels (or `Shift+1-4`)
   - `F` → Toggle focus mode
   - `Esc` → Close panel / exit focus
   - `Tab` → Navigate within panel

2. **Screen Readers:**
   - Panels announce open/close state
   - Preview banner is aria-live
   - Focus trapped within open panel

3. **Reduced Motion:**
   - Respect `prefers-reduced-motion`
   - Skip slide animations, use fade instead

---

## Next Steps

1. Read `01_DESIGN_DECISIONS.md` for all confirmed decisions
2. Review `02_COMPONENT_SPECIFICATIONS.md` for implementation details
3. Follow `05_MIGRATION_STEPS.md` for implementation order
4. Use `06_TESTING_CHECKLIST.md` to verify implementation

---

## Reference

- **Prototype:** `panel-overlay-prototype-v2.jsx` in project outputs
- **Related Logs:** 
  - `Floating_Workspace_Atomic_Design_Session_Memory_Log.md`
  - `Canvas_Chrome_Architecture_Session_Memory_Log.md`
  - `Modals_vs_FloatingPanels_Design_Session_Memory_Log.md`
