# Instance Tools & Floating Workspace System - Session Memory Log

**Date:** January 2, 2025
**Session Focus:** Resolving open questions, floating panel architecture, atomic component decomposition
**Status:** Design complete, ready for atomic decomposition and implementation

---

## Executive Summary

This session resolved the remaining open questions from the Instance Tools design and evolved into a comprehensive **Floating Workspace System** architecture with **VR-First Atomic Design** principles. Key outcomes:

1. Resolved all 4 open questions from previous session
2. Established "Floating First, Panels for Discovery" philosophy
3. Designed complex Navigator panel with independent top/bottom sections
4. Committed to VR-First Atomic Design (adaptiveness baked into atoms)
5. Created prototypes demonstrating the complete system

---

## VR-FIRST ADAPTIVE ARCHITECTURE

### Core Principle

**Adaptiveness is baked into atoms.** Every atom consumes `useAdaptive()` and applies mode-appropriate sizing. When atoms are adaptive, molecules and organisms become adaptive automatically through composition.

```
AdaptiveProvider
    ↓
ATOM (Button) ← reads tokens, applies sizing
    ↓
MOLECULE (ToolButton) ← composed of atoms, automatically adaptive
    ↓
ORGANISM (QuickToolsBar) ← composed of molecules, automatically adaptive
```

### Key Token Differences

| Token | Desktop | VR | Why |
|-------|---------|-----|-----|
| buttonHeight | 28px | 56px | Larger targets |
| touchTarget | 28px | 44px min | Controller accuracy |
| iconSize | 14px | 22px | Visibility |
| iconStrokeWidth | 2px | 1.5px | Thinner looks refined large |
| fontSize | 11px | 14px | Readability at distance |
| showHoverStates | true | false | No hover in VR |
| showLabelsOnButtons | false | true | No tooltips in VR |

### Atom Pattern

```jsx
const Button = ({ size = 'md', iconOnly, children, ...props }) => {
  const { tokens, isVR } = useAdaptive();
  
  // All sizing from tokens
  const height = Math.max(tokens.buttonHeight, tokens.touchTarget);
  const fontSize = tokens.fontSize;
  
  // VR-specific behavior
  const showLabel = isVR ? true : !iconOnly;  // Always show labels in VR
  
  return (
    <button style={{ minHeight: height, fontSize }}>
      {props.icon && <Icon name={props.icon} />}
      {showLabel && children}
    </button>
  );
};
```

---

## Open Questions - RESOLVED

### 1. Gesture Hints Visibility
**Decision:** Progressive disclosure with `?` expansion

| Phase | Behavior |
|-------|----------|
| First 3 VR sessions | Hints visible by default in panel footer |
| After learning | Collapse to `?` icon in corner |
| On tap | Expands inline hint bar (not modal) |
| Persistence | Per-user account preference |

**Pattern:**
```
┌─────────────────────────────────────────┐
│  ❓  │ 🤏 Pinch close  ✊ Grab move  👆 Tap │  ← Expanded inline
└─────────────────────────────────────────┘
```

### 2. Panel Position Persistence
**Decision:** Global defaults → Workspace override → Session memory (Photoshop-style)

| Property | Scope | Storage |
|----------|-------|---------|
| Panel positions (x, y, z in VR) | Global → Workspace override | Database |
| Panel sizes (width, height) | Global → Workspace override | Database |
| Panel visibility (open/closed) | Global → Workspace override | Database |
| Active tab states | Session only | Memory |
| Custom tabs configuration | Global (user preference) | Database |
| Density preference | Global | Database |

**Future Feature:** Saved Workspace Layouts (like Photoshop workspaces)
- Users can save current arrangement as named preset
- Quick switch between "Analysis Mode", "Annotation Mode", etc.
- Low priority but valuable for v2

### 3. Complex VR Operations
**Decision:** "Different, not diminished" - everything possible in VR

| Complexity | Desktop | VR Alternative |
|------------|---------|----------------|
| Simple | Click | Point + trigger |
| Medium (sliders) | Drag | Grab gestures, thumbstick fine-tune |
| Complex (text) | Keyboard | Voice input, virtual keyboard, presets |
| Very Complex (bulk) | Forms | Wizard-style stepped UI, voice commands |

**Rules:**
- ✅ "Tap to use voice input"
- ✅ "Use thumbstick for fine adjustment"
- ❌ Never say "This is easier on desktop"

### 4. Annotations Tab Location
**Decision:** Instance Tools has creation tools with Instance/Workspace scope toggle

**Instance Tools → Annotations Tab:**
- Creates annotations on active instance OR workspace (user chooses scope)
- Tools: Point, Region, Measure, Angle, Text, Eraser
- Scope toggle: `[🔵 Instance] [🌐 Workspace]`
- Smart defaults based on action type
- Shows recent annotations from this session

**Left Panel → Annotations Tab:**
- Management hub only (no creation tools)
- Browse, search, filter all annotations
- Scope filter: All / Mine / Shared
- Type filter: Point / Region / Measure / etc.
- Bulk actions: Export, delete, change visibility
- Jump-to-annotation navigation

---

## Floating Workspace Architecture

### Core Philosophy: "Floating First, Panels for Discovery"

| Layer | Purpose | Design Priority |
|-------|---------|-----------------|
| **Floating Panels** | Primary workspace | Compact, efficient, icon-heavy |
| **Side Panels** | Discovery + Advanced | Spacious, labeled, help text |

**User Flow:**
1. New users learn in spacious side panels
2. Learning users pop out floating panels for frequent tasks
3. Power users work entirely in floating panels
4. Frustrated users fall back to side panels when stuck

### Panel Features

| Feature | Description |
|---------|-------------|
| **Pop-out** | Any panel tab becomes floating |
| **Duplication** | Same tab in panel + floating, synced |
| **Custom combinations** | User creates multi-tab floating panels |
| **Link toggle** | 🔗 icon - synced vs independent |
| **Saved layouts** | Save/restore workspace arrangements (future) |

### Recommended Floating Panel Groups

| Panel | Tabs | Rationale |
|-------|------|-----------|
| **Navigator** | (standalone - complex) | Central canvas control |
| **Instance Tools** | (standalone - complex) | Full tool suite |
| **Data** | Files + Datasets | Both about data sources |
| **Views** | (standalone) | Complex list, drag source |
| **Annotations** | Annotations + Cursors | Both spatial marking |
| **Collaboration** | People + Voice + Chat | Real-time features |

---

## Navigator Panel - Final Design

### CRITICAL: Independent Top/Bottom Sections

The Navigator has TWO independently-sized sections:

```
┌─────────────────────────────────────────┐
│  NAVIGATOR                       🔗 _ ✕ │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │         TOP SECTION                 ││ ← Fixed min height
│  │  - Overlay toggles                  ││    User can resize
│  │  - Canvas toolbar (select/merge)    ││    
│  │  - Minimap (interactive)            ││
│  │  - Label style + zoom               ││
│  │  - Navigation bar (d-pad)           ││
│  │  - Quick tools bar                  ││
│  └─────────────────────────────────────┘│
├═════════════════════════════════════════┤ ← Resize handle / divider
│  ▾ Size & Layout            (3×2 / 8×8)│ ← Collapse bar
│  ┌─────────────────────────────────────┐│
│  │       BOTTOM SECTION                ││ ← Independently resizable
│  │  - Quick Jump Bar                   ││    Scrollable content
│  │  - Size Controls (viewport/canvas)  ││    Collapsible to bar only
│  │  - Quick Layouts                    ││
│  │  - Templates                        ││
│  │  - Advanced settings                ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Key Behavior:**
- Collapsing bottom does NOT give space to top - it just hides
- Expanding bottom does NOT steal from top - panel grows or scrolls
- Both sections have min/max heights
- Minimap has priority - never gets smaller than usable
- Bottom section is scrollable with Quick Jump navigation

### Top Section Components (Always Visible)

| Component | Purpose |
|-----------|---------|
| **Overlay toggles** | Grid / Views / Markers - what minimap shows |
| **Canvas toolbar** | Select, Move, Merge, Split, Lock, Copy, Delete |
| **Minimap** | Interactive canvas preview with cells |
| **Label style** | A (alpha) / # (numeric) / ● (dot only) |
| **Minimap zoom** | Zoom the minimap view itself |
| **D-pad navigation** | Move viewport position |
| **Position display** | Current position + Home position |
| **Quick tools** | Flow direction, Grid toggle, Snap toggle, Add |

### Bottom Section Components (Scrollable)

| Section | Contents |
|---------|----------|
| **Quick Jump Bar** | Navigation → Size → Layouts → Templates → Advanced |
| **Size Controls** | Viewport cols/rows, Canvas cols/rows |
| **Quick Layouts** | 1×1, 2×2, 3×3, 1+3, 2+2, Custom... |
| **Templates** | Saved layout templates with Manage button |
| **Advanced** | Auto-arrange, aspect ratio, coordinates toggles |

### Minimap Interactivity

| Action | Result |
|--------|--------|
| Click cell | Select/deselect (multi-select with modifier) |
| Drag cell | Reposition on canvas |
| Click empty | Deselect all |
| Drag viewport box | Pan canvas view |
| Right-click cell | Context menu (Lock, Copy, Delete, etc.) |

### Canvas Toolbar Tools

| Tool | Icon | Action |
|------|------|--------|
| Select | cursor | Click to select cells |
| Move | move | Drag to reposition |
| Merge | merge | Combine selected cells (2+) |
| Split | split | Divide merged cell (1 selected) |
| Lock | lock | Prevent modifications |
| Copy | copy | Duplicate cell(s) |
| Delete | trash | Remove from canvas |

---

## UI/UX Recommendations - ACCEPTED

All recommendations accepted for implementation:

### P0 - Critical
1. **Undo/Redo Visibility** - Persistent indicator in Secondary Footer, undo toast after destructive actions
2. **Empty States That Educate** - Show available actions, keyboard shortcuts, not just "No items"

### P1 - High Priority
3. **Skeleton Loading** - Panel content shows shapes while loading, not spinners
4. **Keyboard Accessibility** - Tab navigation, focus rings, skip links, announce mode changes

### P2 - Medium Priority
5. **Progressive Tips** - After 3x slow way, offer shortcut hint
6. **VR Comfort Features** - Panel snap zones, auto-dim distant panels, break reminders

### P3 - Polish Phase
7. **Micro-interactions** - Button press feedback, smooth animations, success moments

---

## Atomic Design Architecture (VR-First Adaptive)

### Core Principle: Adaptiveness at the Atom Level

Every atom consumes `useAdaptive()` and applies mode-appropriate sizing. When atoms are adaptive, molecules and organisms become adaptive automatically through composition.

### Component Hierarchy

```
ATOMS (Smallest) - CONSUME useAdaptive(), all sizing from tokens
├── Icon              - Adaptive strokeWidth (2px desktop→1.5px VR)
├── Button            - Adaptive height, touch target, label visibility
├── IconButton        - Adaptive size, enforces 44px min in VR
├── Badge             - Adaptive padding, fontSize
├── Toggle            - Adaptive track/thumb sizes
├── ColorDot          - Adaptive sizes
├── Slider            - Adaptive track/thumb (larger in VR)
├── Input             - Adaptive height (44px min VR), voice input
├── Checkbox          - Adaptive size
├── Tooltip           - Desktop: hover, VR: inline or hidden
└── Spinner           - Adaptive size

MOLECULES (Composed Atoms) - INHERIT ADAPTIVENESS
├── SectionHeader     - Touch target for toggle area
├── QuickJumpBar      - Scrollable, buttons adaptive
├── ToolButton        - VR: always shows label (inherited)
├── OverlayToggle     - All atoms adaptive
├── NumberStepper     - VR: larger + long-press support
├── SearchField       - VR: adds voice input button
├── ScopeToggle       - Icons (cube/globe), NOT emojis
├── DatasetItem       - Row enforces touch target
├── ViewItem          - VR: compact mode disabled
├── MiniMapCell       - VR: larger minimum cell size
├── NavButtonCluster  - VR: larger, more spacing
├── ChipGroup         - Chips adaptive
├── StatusIndicator   - ColorDot adaptive
└── PositionDisplay   - Text adaptive

ORGANISMS (Complex) - INHERIT + LAYOUT ADAPTATIONS
├── FloatingPanelHeader  - VR: larger drag handle
├── TabBar               - VR: may use vertical orientation
├── CanvasToolbar        - VR: more spacing
├── NavigatorMinimap     - VR: larger cells
├── DatasetTree          - VR: more padding
├── ViewList             - VR: larger rows
├── QuickToolsBar        - VR: may switch to vertical
├── DPadNavigation       - VR: larger cluster
├── SizeControlsPanel    - VR: 2-column layout
├── AnnotationToolPalette - VR: grid layout
└── SplitPaneContainer   - VR: larger resize handle (CRITICAL)

TEMPLATES (Page-Level) - COMPOSE ORGANISMS
├── FloatingPanel        - Draggable container shell
├── NavigatorContent     - SplitPaneContainer for independent sections
├── DataBrowserContent   - Files + Datasets tabs
├── AnnotationsContent   - Annotations + Cursors
├── InstanceToolsContent - Full instance tools
├── CollaborationContent - People + Voice + Chat
└── SidePanelShell       - Left/Right panel container
```

### File Structure

```
src/ui/react/components/
├── atoms/
│   ├── Icon/
│   │   ├── Icon.jsx
│   │   ├── Icon.scss
│   │   ├── Icon.stories.jsx
│   │   ├── Icon.test.jsx
│   │   └── index.js
│   ├── Button/
│   ├── IconButton/
│   ├── Badge/
│   ├── Toggle/
│   ├── ColorDot/
│   ├── Slider/
│   ├── Input/
│   └── index.js           ← Re-exports all atoms
├── molecules/
│   ├── SectionHeader/
│   ├── QuickJumpBar/
│   ├── ToolButton/
│   ├── DatasetItem/
│   ├── ViewItem/
│   ├── MiniMapCell/
│   └── index.js
├── organisms/
│   ├── TabBar/
│   ├── CanvasToolbar/
│   ├── NavigatorMinimap/
│   ├── DatasetTree/
│   └── index.js
├── templates/
│   ├── FloatingPanel/
│   ├── NavigatorContent/
│   └── index.js
└── index.js               ← Master re-export
```

### Contributor Workflow

```
1. DESIGN   → Create component spec (props, variants, states)
2. BUILD    → Implement atom/molecule in isolation with useAdaptive()
3. STORY    → Write Storybook story testing BOTH modes (desktop/VR)
4. TEST     → Unit test the component
5. COMPOSE  → Use component in organism/template
6. DOCUMENT → Props interface, usage examples, adaptive behavior
```

### Key Adaptive Patterns

**Atom Pattern (all atoms follow this):**
```jsx
const Button = ({ size = 'md', iconOnly, children, ...props }) => {
  const { tokens, isVR } = useAdaptive();
  
  // All sizing from tokens - NO hardcoded px values
  const height = Math.max(tokens.buttonHeight, tokens.touchTarget);
  const fontSize = tokens.fontSize;
  const iconSize = tokens.iconSize;
  
  // VR-specific behavior baked in
  const showLabel = isVR ? true : !iconOnly;
  
  return (
    <button style={{ minHeight: height, fontSize }}>
      {props.icon && <Icon name={props.icon} size={iconSize} />}
      {showLabel && children}
    </button>
  );
};
```

**Molecule Pattern (inherits from atoms):**
```jsx
const ToolButton = ({ icon, label, ...props }) => {
  // No useAdaptive needed here - atoms handle it
  return (
    <Button icon={icon} {...props}>
      {label}  {/* Button decides if label shows based on isVR */}
    </Button>
  );
};
```

**Organism Pattern (adds layout adaptations):**
```jsx
const QuickToolsBar = ({ tools }) => {
  const { isVR, tokens } = useAdaptive();
  return (
    <div style={{ 
      flexDirection: isVR ? 'column' : 'row',  // Layout adaptation
      gap: tokens.gap  // Spacing from tokens
    }}>
      {tools.map(t => <ToolButton key={t.id} {...t} />)}
    </div>
  );
};
```

---

## Artifacts Produced This Session

1. **floating-workspace-system.jsx** - First prototype with floating panels
2. **atomic-workspace-system.jsx** - Atomic decomposition prototype

**Note:** Both prototypes have issues to fix:
- Navigator needs independent top/bottom sections (not just collapsible)
- Annotations uses emojis - should be icons
- Need proper atoms extracted and reused

---

## Known Issues to Fix in Next Session

1. **Navigator independent sections** - Top and bottom must resize independently, bottom scrollable
2. **Icons not emojis** - Replace 🔵 and 🌐 with Icon components in Annotations scope toggle
3. **Atom extraction** - Current prototypes have inline components, need proper separation
4. **Storybook setup** - Need actual Storybook configuration for component catalog

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Gesture hints | Progressive disclosure with ? | Balance guidance vs clutter |
| Position persistence | Global → Workspace → Session | Photoshop-like familiarity |
| Complex VR ops | Different, not diminished | Full capability in VR |
| Annotations location | Instance Tools with scope toggle | Single creation point |
| Floating vs Side | Floating first, panels for discovery | Power user efficiency |
| Panel duplication | Allow both, synced by default | Flexibility + discoverability |
| Navigator sections | Independent top/bottom | Minimap never compromised |
| Component architecture | Atomic Design | Contributor-friendly, testable |
| Icon library | Material Symbols via registry | Already implemented |

---

## Related Documents

- `Adaptive_Components_Design_Session_Memory_Log.md` - VR/Desktop adaptive system
- `Adaptive_Components_Implementation_Prompt.md` - Implementation guide
- `Instance_Cell_UI_Design_Session_Memory_Log.md` - Instance header/toolbar design
- `Canvas_Area_Design_Specification.md` - Canvas and grid specs
- `Left_Panel_Design_Specification.md` - All 8 left panel tabs
- `Right_Panel_Design_Specification.md` - All 8 right panel tabs

---

## Continuation Prompt

```
I'm continuing the CIA Web floating workspace and atomic component design. This is a VR-FIRST adaptive system where components must work seamlessly in both Desktop and VR modes.

Please search project knowledge for:
- Floating_Workspace_Atomic_Design_Session_Memory_Log.md (this document)
- Atomic_Component_Decomposition_Spec.md (detailed component specs)
- Adaptive_Components_Design_Session_Memory_Log.md
- AdaptiveContext.jsx in the codebase

Previous session established:
1. "Floating First, Panels for Discovery" architecture
2. Navigator with independent top/bottom sections (SplitPaneContainer)
3. Complex minimap with select/merge/split/lock/drag operations
4. Annotations with Instance/Workspace scope toggle (using ICONS, not emojis)
5. Dataset tree with ViewItem children pattern
6. VR-First Atomic hierarchy: Atoms → Molecules → Organisms → Templates

CRITICAL VR-FIRST REQUIREMENTS:
- Every ATOM consumes useAdaptive() hook - no hardcoded px values
- VR: 44px minimum touch targets, thinner icon strokes (1.5px vs 2px)
- VR: No hover states, always show button labels
- Molecules/organisms inherit adaptiveness from atoms automatically
- Navigator TOP and BOTTOM sections are INDEPENDENTLY RESIZABLE (not just collapsible)
- All indicators use Icon components, NEVER emojis

ADAPTIVE TOKEN QUICK REFERENCE:
- Desktop: buttonHeight 28px, iconSize 14px, strokeWidth 2px
- VR: buttonHeight 56px, iconSize 22px, strokeWidth 1.5px, touchTarget 44px min

This session I want to:
1. Review and finalize the atom/molecule/organism breakdown
2. Create proper Storybook-ready component specs for each atom
3. Build working components with properly extracted adaptive atoms
4. Ensure Navigator has true independent sections via SplitPaneContainer

Please confirm you understand the VR-first adaptive architecture (atoms consume tokens, adaptiveness propagates up), then start by listing all atoms we need with their adaptive behavior documented.
```

---

*Memory log created: January 2, 2025*
