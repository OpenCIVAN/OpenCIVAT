# Instance Cell UI Design Session - Memory Log

**Date:** December 22, 2024  
**Session Focus:** Complete redesign of instance cell UI components (header, toolbar, navigation notch)  
**Status:** Design phase complete, ready for canvas-level design and implementation

---

## Executive Summary

This session produced a complete, cohesive design for instance cells with three distinct control areas:
1. **Instance Header** - ViewConfiguration-level actions (always visible)
2. **Instance Toolbar** - Type-specific tools (hover/pin reveal)
3. **Navigation Notch** - Camera/zoom controls (carved edge element)

Key principles established:
- User should NOT know lifecycle state (cold/paused/live) - UI looks identical
- Header always present at ALL sizes with full menu access
- Clear separation: toolbar = type-specific, nav notch = camera controls
- Blue-tinted dark theme direction confirmed
- Material Icons to replace Lucide (via IconRegistry pattern)

---

## Final Design Decisions

### 1. Instance Header

**Style:** Underline accent (2px bottom border in instance color when active)

**Components:**
- Color dot (6px, becomes spinner when loading)
- View name (bold when active, truncated with ellipsis)
- Action buttons (responsive visibility)

**Responsive Breakpoints:**

| Breakpoint | Min Width | Header Height | Visible Elements |
|------------|-----------|---------------|------------------|
| Full | â‰¥450px | 32px | Wrench, Dot, Name, More, Expand, VR (Glasses), Close |
| Large | â‰¥380px | 32px | Same as Full |
| Medium | â‰¥300px | 32px | Wrench, Dot, Name, More, Expand, Close (VR in menu) |
| Small | â‰¥220px | 28px | Dot, Name, More, Close (Wrench+Expand+VR in menu) |
| Tiny | â‰¥160px | 26px | Dot, Name, More, Close |
| Micro | <160px | 24px | Dot, Name, More (â‹®), Close |

**VR Icon:** Uses Glasses icon (not headset) - more intuitive

**Key Behavior:**
- Header ALWAYS present at all sizes
- Menu ALWAYS provides access to ALL functionality (VR, Expand, Instance Tools, etc.)
- Clicking Wrench on cold cell â†’ activates view first, then opens Instance Tools

### 2. Header Menu (More Button)

**Simplified Structure - NO type-specific options:**

```
[Responsive Section - only if items hidden from header]
â”œâ”€â”€ Instance Tools (T)
â”œâ”€â”€ Expand / Fullscreen (F)
â””â”€â”€ Enter VR Mode (V)

[View Section]
â”œâ”€â”€ View Options... (O)        â† Opens full view settings
â”œâ”€â”€ View Syncing... (L)        â† Opens sync configuration modal
â”œâ”€â”€ Duplicate View (D)
â”œâ”€â”€ Save as Bookmark (B)
â””â”€â”€ Capture Snapshot... (S)    â† Opens save/attach dialog

[Danger Section]
â”œâ”€â”€ Remove from Canvas
â””â”€â”€ Delete View (red, confirmation required)
```

**Terminology Updates:**
- ~~Link Settings~~ â†’ **View Syncing...** (clearer about sync purpose)
- ~~Capture Thumbnail~~ â†’ **Capture Snapshot...** (server owns thumbnails, this is user-initiated capture)
- Added: **View Options...** (new menu item)

**Snapshot Destinations (via dialog):**
- Save to computer (download)
- Open as new Image view
- Attach to annotation
- Copy to clipboard

### 3. Instance Toolbar

**Purpose:** Type-specific tools ONLY (no navigation - that's in nav notch)

**VTK Tools (reference implementation):**
```
[Representation â–¾] [Color Map â–¾] | [Annotate] [Measure] [Clip] | [Undo] [Redo] | [Pin]
```

**Responsive Modes:**

| Mode | Visible Tools |
|------|---------------|
| Full | All tools + Undo/Redo + Pin |
| Compact | Representation, Color Map, Annotate, Measure + Pin |
| Mini | Representation, Annotate, More (hint) |
| None | Toolbar hidden (tiny/micro sizes) |

**Visibility:**
- Appears on hover OR when cell is active
- Pin button ALWAYS visible (no layout shift)
- When pinned, stays visible even without hover

### 4. Navigation Notch

**Design:** Carved-out edge element that feels integrated with the window

**Visual Treatment:**
- Darker background than cell content: `rgba(8, 8, 12, 0.95)`
- Inset shadow: `inset 0 2px 8px rgba(0,0,0,0.4)`
- Instance color border accent on exposed edges: `${color}40`
- Rounded corners only on exposed sides

**Positions:** Left, Bottom, Right (user configurable)
- Global preference with workspace and per-view overrides
- No top option (conflicts with toolbar)

**Controls (Full mode):**
```
[Zoom -] [100%] [Zoom +] | [Fit] [Reset] | [Pan] [Rotate] | [Collapse â–¾]
```

**Zoom % Behavior:**
- Single click: Opens dropdown with slider + presets (25%, 50%, 75%, 100%, 150%, 200%, 300%, 400%)
- Double-click: Direct text input mode
- Always relative to ORIGINAL dataset size (absolute zoom, not relative to current)
- Click preset or drag slider to change

**Responsive Modes:**

| Mode | Controls |
|------|----------|
| Full | Zoom Â±, %, Fit, Reset, Pan, Rotate, Collapse |
| Compact | Zoom Â±, %, Fit, Reset, Pan, Rotate, Collapse |
| Mini | Zoom Â±, %, Fit, Collapse |
| Icon | Fit only + Collapse |

**Chevron Behavior:**
- When EXPANDED: Chevron always visible (no layout shift)
- When COLLAPSED: Entire notch appears on hover (with chevron)

### 5. Cell Selection & Focus States

**Border Treatment (2px for cohesion):**
- **Active/Focused:** 2px solid border in instance color
- **Multi-select (merge, linking):** 2px solid border in instance color
- **Inactive:** 1px subtle border

**Loading Indicator:**
- Color dot becomes spinning loader icon
- Same color as instance
- User sees "something is loading" without knowing what

### 6. Cell Position Identifier

**Placement:** Dynamic based on nav notch position, with top-right fallback

| Nav Position | Identifier Position |
|--------------|---------------------|
| Bottom | Bottom-right (if space) or top-right |
| Right | Bottom-left or top-right |
| Left | Bottom-right âœ“ |
| Default/Fallback | Top-right |

---

## Theme Direction

### Blue-Tinted Dark Color Scheme (APPROVED)

**Rationale:**
- More professional "scientific instrument" aesthetic
- Complements visualization colors (greens, purples)
- Feels more high-tech and immersive

**Proposed Token Updates:**
```scss
// Current (neutral)          â†’ Proposed (blue-tinted)
$bg-primary: #0a0a0f         â†’ #0a0c10
$bg-secondary: #12121a       â†’ #10141c
$bg-tertiary: #1a1a24        â†’ #161c28
$border-subtle: rgba(255,255,255,0.06) â†’ rgba(96,165,250,0.08)
```

**Glassmorphism Integration:**
- Glass panels: `background: rgba(12, 16, 24, 0.85)` + `backdrop-filter: blur(12px)`
- Blue tint in borders: `rgba(96, 165, 250, 0.1)`
- More transparency over bright content to reveal blue undertone

---

## Icon Library Migration

### Decision: Lucide â†’ Material Icons

**Reasons:**
- Material has extensive VR/3D icons (view_in_ar, 3d_rotation, vrpano, gesture)
- Better scientific symbols (biotech, science, microscope)
- More technical icons needed for this application

**Migration Strategy:**
1. Create `IconRegistry` with semantic naming
2. Map semantic names to icons: `IconVR`, `IconRotate3D`, etc.
3. Migrate incrementally as components are updated
4. This abstraction allows future library changes

**Key Icons Needed:**
- `view_in_ar` or `vrpano` - VR mode
- `3d_rotation` - rotation controls
- `gesture` - hand tracking
- `spatial_audio` - voice/audio
- `biotech` / `science` - domain-specific

---

## Artifacts Created

All artifacts are interactive React components for design exploration:

1. **instance-header-design-v2.jsx** - Initial 5 header design alternatives
2. **underline-header-design.jsx** - Focused underline style exploration
3. **dropdown-menu-explorer.jsx** - Menu structure with type-specific options
4. **simplified-header-final.jsx** - Simplified menu (no type-specific)
5. **header-toolbar-explorer.jsx** - Header + toolbar interaction
6. **comprehensive-cell-explorer.jsx** - All three control areas
7. **refined-cell-explorer.jsx** - Carved notch, positions, hover behavior
8. **final-cell-explorer.jsx** - FINAL DESIGN with all refinements

**Final artifact location:** `/mnt/user-data/outputs/final-cell-explorer.jsx`

---

## Next Steps

### Immediate (New Chat)

1. **Canvas-Level Design**
   - Empty cell appearance
   - Grid lines/gaps
   - Drag & drop visual feedback
   - Canvas background with blue-tinted theme
   - Cell spawn animations

2. **Theme Token Updates**
   - Update `styles/tokens/` with blue-tinted palette
   - Test glassmorphism over various content types
   - Document color usage guidelines

3. **IconRegistry Implementation**
   - Create registry pattern
   - Map current Lucide usage
   - Begin Material Icons integration

### Implementation Phase

1. Extract components from final artifact:
   - `InstanceHeader` component
   - `InstanceToolbar` component  
   - `NavigationNotch` component
   - `ZoomInput` component

2. Integrate with existing architecture:
   - Connect to `useViewMetadata` hook
   - Wire up to `InstanceTypeHandler` for toolbar config
   - Connect zoom to actual camera state

3. Update specs:
   - Canvas_Area_Design_Specification.docx (sections 6-7)
   - Add Navigation Notch specification

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Cold cell wrench behavior? | Activate view first, then open Instance Tools |
| Type-specific in header menu? | NO - belongs in Instance Tools only |
| Navigation in toolbar? | NO - navigation is in Nav Notch only |
| Chevron hover behavior? | Always visible when expanded; hover-reveal when collapsed |
| Pin button visibility? | Always visible (no layout shift) |
| Zoom reference? | Always relative to original dataset (absolute) |
| Icon library? | Material Icons via IconRegistry |
| Theme direction? | Blue-tinted dark with glassmorphism |

---

## Prompt to Continue

Copy this into a new chat to continue:

```
I'm continuing the instance cell UI design work. Please read the memory log at:
/mnt/project/Instance_Cell_UI_Design_Session_Memory_Log.md

Previous session completed:
- Instance header (underline style, responsive breakpoints)
- Instance toolbar (type-specific tools only)
- Navigation notch (carved design, zoom %, positions)
- Final artifact: /mnt/user-data/outputs/final-cell-explorer.jsx

This session I want to:
1. Design the canvas-level appearance (empty cells, grid, backgrounds)
2. Apply the blue-tinted theme direction
3. Plan the IconRegistry for Material Icons migration

Please search the project knowledge for current canvas implementation and specs before we begin.
```

---

## File References

**Current Implementation:**
- `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx`
- `src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCellHeader.jsx`
- `src/ui/react/hooks/useViewMetadata.js`

**Specifications:**
- `/mnt/project/Canvas_Area_Design_Specification.docx`
- `/mnt/project/Canvas_Area_Design_Session_Memory_Log.md`

**Design Tokens:**
- `styles/tokens/` (to be updated with blue-tinted palette)
