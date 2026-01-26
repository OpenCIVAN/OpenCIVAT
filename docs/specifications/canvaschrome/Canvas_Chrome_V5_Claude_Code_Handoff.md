# Canvas Chrome Design Handoff

## Overview

This document captures the complete design specification for the Canvas Chrome (Header, Footer 1, Footer 2, and Info Bar) for CIA Web. The canvas chrome surrounds the main visualization area and provides workspace navigation, view controls, and collaboration features.

---

## Architecture Summary

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ CANVAS HEADER (44px)                                                           │
│ Navigation | Workspace > ViewGroup | Edit | Flow |     | Display | Window      │
├────────────────────────────────────────────────────────────────────────────────┤
│ EDIT BAR (conditional, ~40px) - Only visible when Edit mode is ON              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                            CANVAS AREA                                         │
│                     (InstanceWindows in grid)                                  │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ FOOTER 1: INSTANCE TOOLS (~44px) - Type-specific from InstanceTypeHandler      │
│ [Undo][Redo] | Active View | [Nav] [Camera] [Transform] [Interaction] ...      │
├────────────────────────────────────────────────────────────────────────────────┤
│ FOOTER 2: CANVAS CONTROLS (~50px) - Set-and-forget canvas configuration        │
│ Focus | Actions | Display | Navigator | Links | VR                             │
├────────────────────────────────────────────────────────────────────────────────┤
│ INFO BAR (~24px) - Status and clickable size controls                          │
│ [Canvas: 3×3 | Viewport: 2×1 | Cell: 300×250]              👥 3  ● Synced      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
CanvasChrome/
├── CanvasHeader/
│   ├── NavigationGroup (Back, Home buttons)
│   ├── WorkspaceSelector (dropdown with gradual truncation)
│   ├── ViewGroupSelector (pill shape, link indicator, dropdown)
│   ├── EditToggle (button, toggles EditBar)
│   ├── FlowDirection (Right/Down button group)
│   ├── DisplayOptionsDropdown (Grid Coordinates, ViewGroup Borders)
│   └── WindowModeControls (Dock/Float/Full + Fullscreen)
│
├── EditBar/ (conditional - only when edit mode ON)
│   ├── ToolSelector (Select, Pan)
│   ├── GridTools (Merge, Split, Swap)
│   ├── RowColumnTools (Add, Remove)
│   └── DoneButton
│
├── Footer1InstanceTools/
│   ├── UndoRedo (ALWAYS visible, never collapses)
│   ├── ActiveViewSelector (dropdown with color dot)
│   └── InstanceToolCategories (from InstanceTypeHandler)
│       ├── Navigation
│       ├── Camera
│       ├── Transform
│       ├── Interaction
│       ├── Data
│       ├── Color
│       └── Advanced
│
├── Footer2CanvasControls/
│   ├── FocusSection (Focus Mode, View List)
│   ├── ActionsSection (Snapshot, Reset, Copy, Settings)
│   ├── DisplaySection (Visibility, Orientation, Overlays)
│   ├── NavigatorSection (Mini-grid, Home, D-pad, Position badge)
│   ├── LinksSection (Responsive - individual icons or [🔗 count])
│   └── VRSection (Send to VR button)
│
└── InfoBar/
    ├── SizeControls (clickable, opens popout)
    │   ├── Canvas size display
    │   ├── Viewport size display
    │   └── Cell size display
    └── StatusIndicators
        ├── Online count
        └── Sync status
```

---

## Responsive Breakpoints

| Breakpoint | Trigger | Changes |
|------------|---------|---------|
| **<855px** | Links compress | Links section changes from individual icons to `[🔗 count]` button with popover |
| **<810px** | Header compact | Edit button and Flow controls collapse (hidden) |
| **<650px** | Footer wraps | Footer 2 wraps to two rows instead of losing icons |
| **<500px** | Names icon-only | Workspace and ViewGroup selectors show icon only (no text) |
| **500-855px** | Gradual truncation | Workspace/ViewGroup names smoothly truncate with dynamic max-width |

### Breakpoint Constants
```javascript
const BREAKPOINTS = {
  LINKS_COMPACT: 855,      // Links collapse to icon + count
  HEADER_COMPACT: 810,     // Edit/Flow collapse
  FOOTER_WRAP: 650,        // Footer 2 wraps to second line
  NAMES_ICON_ONLY: 500,    // Workspace/VG show icon only
};
```

---

## Canvas Header Specification

### Layout (Left to Right)
1. **Navigation Group** - Back (disabled if no history), Home
2. **Workspace Selector** - Dropdown with teal accent, shows current workspace
3. **Chevron Separator** - `>`
4. **ViewGroup Selector** - Pill shape with color dot, link indicator if VG-linked
5. **Separator**
6. **Edit Toggle** - Button that toggles Edit Bar visibility
7. **Flow Direction** - Button group: Right (→) or Down (↓)
8. **Flex Spacer**
9. **Display Options** - Dropdown with checkboxes for Grid Coordinates and ViewGroup Borders
10. **Window Mode** - Button group: Dock | Float | Full + Fullscreen button

### ViewGroup Selector Features
- Color dot matching ViewGroup color
- Link icon (🔗) appears when ViewGroup has active links
- Dropdown shows all ViewGroups with their colors and link status
- "All ViewGroups" option at top

### Display Options Dropdown
- Shows count badge when options are active
- Checkboxes for:
  - Grid Coordinates (shows A1, B2, etc. on cells)
  - ViewGroup Borders (shows colored borders around VG containers)

### Responsive Behavior
- At <810px: Edit button and Flow controls hide
- At <500px: Workspace/VG show icons only
- Between 500-855px: Names gradually truncate

---

## Edit Bar Specification

Only visible when Edit mode is toggled ON.

### Layout (Left to Right)
1. **"Edit Mode" Label** - Blue accent
2. **Tool Selector** - Select | Pan button group
3. **Separator**
4. **Grid Tools** - Merge, Split, Swap buttons
5. **Separator**
6. **Row/Column Tools** - Add, Remove buttons
7. **Flex Spacer**
8. **Done Button** - Closes edit mode

---

## Footer 1: Instance Tools Specification

This footer displays tools specific to the active view's instance type (from `InstanceTypeHandler.getToolCategories()`).

### Layout (Left to Right)
1. **Undo/Redo** - Button group, ALWAYS visible (never collapses)
2. **Separator**
3. **Active View Selector** - Dropdown showing current view with color dot
4. **Separator**
5. **Instance Tool Categories** - From InstanceTypeHandler:
   - Navigation (zoom level, zoom in/out, reset, center)
   - Camera (snapshot, presets)
   - Transform (pan, rotate, scale, clip)
   - Interaction (select, probe)
   - Data (data info, sample)
   - Color (colormap, range)
   - Advanced (settings, lighting)
6. **Flex Spacer**
7. **More Tools** - Overflow menu (⋮)

### Critical Requirement
**Undo/Redo must NEVER disappear** regardless of width. They are essential for user workflow.

---

## Footer 2: Canvas Controls Specification

This footer contains "set-and-forget" canvas configuration tools.

### Layout (Left to Right)
1. **Focus Section**
   - Focus Mode (expand icon) - Full-screen single view
   - View List (list icon) - Show all views panel

2. **Actions Section**
   - Snapshot (camera icon)
   - Reset View (rotate icon)
   - Copy (clipboard icon)
   - Settings (gear icon)

3. **Display Section**
   - Visibility toggle
   - Orientation cube
   - Overlays (layers)

4. **Flex Spacer**

5. **Navigator Section**
   - Mini preview grid (clickable, shows viewport position on canvas)
   - Home button (goes to A1)
   - D-pad navigation [←][↑][↓][→]
   - Position badge (e.g., "B2" in monospace)

6. **Links Section** (Responsive)
   - Full mode (≥855px): Individual icons for Camera, Filters, Widgets, Cursors, Annotations
   - Compact mode (<855px): `[🔗 2]` button showing count, click for popover

7. **VR Section**
   - Send to VR button (glasses icon, purple accent)

### Responsive Wrapping
At <650px, Footer 2 wraps to two rows:
- **Row 1**: Focus | Actions | Display
- **Row 2**: Navigator | Links | VR

No icons are removed - they just reorganize into two rows.

---

## Info Bar Specification

Thin status bar at the bottom of the canvas.

### Layout (Left to Right)
1. **Size Controls** (clickable button)
   - Canvas size: `📐 Canvas: 3×3` (amber)
   - Viewport size: `🔲 Viewport: 2×1` (cyan)
   - Cell size: `Cell: 300×250px`
   - Click opens Size Popout

2. **Flex Spacer**

3. **Status Indicators**
   - Online count: `👥 3`
   - Sync status: `● Synced` (green)

### Size Popout
Opens above the Info Bar when size area is clicked:
- **Canvas Size Section**
  - Columns: [-] [value] [+]
  - Rows: [-] [value] [+]
  - Presets: 1×1, 2×2, 3×3, 4×4

- **Viewport Size Section**
  - Columns: [-] [value] [+] (max = canvas cols)
  - Rows: [-] [value] [+] (max = canvas rows)
  - Presets: 1×1, 1×2, 2×1, 2×2

---

## Responsive Links Component

### Full Mode (≥855px)
Individual icon buttons for each link type:
```
[👁 Camera] [📊 Filters] [📦 Widgets] [👆 Cursors] [✏️ Annotations]
```
Each button toggles that link property. Active links show with colored background.

### Compact Mode (<855px)
Single button with count:
```
[🔗 2]
```
- Shows link icon + number of active links
- Click opens popover with all link toggles
- Section header already says "LINKS" so no redundant label needed

### Link Types
| ID | Label | Icon | Color |
|----|-------|------|-------|
| camera | Camera | Eye | Teal |
| filters | Filters | Scan | Purple |
| widgets | Widgets | Box | Amber |
| cursors | Cursors | MousePointer | Cyan |
| annotations | Annotations | Edit3 | Pink |

---

## Navigator Component

### Mini Preview Grid
- Shows canvas grid with viewport position highlighted
- Grid cells: 8×8px with 1px gap
- Viewport cells: Teal highlight
- Non-viewport cells: Subtle gray
- Clickable to open full Navigator panel

### D-Pad Controls
- Home button: Goes to position A1, amber when active
- Arrow buttons: [←][↑][↓][→]
- Disabled states when at canvas edge

### Position Badge
- Monospace font
- Blue background with opacity
- Shows absolute position (e.g., "B2")

### Navigation Logic
```javascript
const canMoveUp = position.row > 0;
const canMoveDown = position.row + viewportSize.rows < canvasSize.rows;
const canMoveLeft = position.col > 0;
const canMoveRight = position.col + viewportSize.cols < canvasSize.cols;
```

---

## Color Tokens

```javascript
const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24',
      elevated: '#1e1e2a',
      group: 'rgba(255,255,255,0.03)',
    },
    border: { 
      subtle: 'rgba(255,255,255,0.06)', 
      default: 'rgba(255,255,255,0.1)',
    },
    text: { 
      primary: '#ffffff', 
      secondary: 'rgba(255,255,255,0.7)', 
      muted: 'rgba(255,255,255,0.4)',
      disabled: 'rgba(255,255,255,0.25)',
    },
    accent: { 
      purple: '#a855f7', 
      blue: '#3b82f6', 
      cyan: '#22d3ee', 
      green: '#22c55e', 
      amber: '#f59e0b', 
      teal: '#14b8a6',
      pink: '#ec4899',
    },
  },
  radius: { sm: 4, md: 6, lg: 8 },
};
```

---

## Integration Points

### With Existing Services
- **WorkspaceManager**: Workspace list, current workspace, ViewGroup membership
- **ViewConfigurationManager**: View metadata, canvas positions, ViewGroup assignments
- **ViewLinkingService**: Link property states, link groups
- **InstanceTypeHandler**: Tool categories for Footer 1
- **CanvasLayoutManager**: Grid layout, viewport navigation, cell sizing

### State Management
```typescript
interface CanvasChromeState {
  // Header
  currentWorkspace: string;
  currentViewGroup: string | null;
  viewGroupColor: string | null;
  isViewGroupLinked: boolean;
  isEditMode: boolean;
  flowDirection: 'right' | 'down';
  windowMode: 'docked' | 'floating' | 'full';
  showCoordinates: boolean;
  showViewGroupBorders: boolean;
  
  // Canvas
  canvasSize: { cols: number; rows: number };
  viewportSize: { cols: number; rows: number };
  viewportPosition: { col: number; row: number };
  
  // Footer 1
  activeViewId: string;
  
  // Footer 2
  links: {
    camera: boolean;
    filters: boolean;
    widgets: boolean;
    cursors: boolean;
    annotations: boolean;
  };
  
  // Info Bar
  onlineCount: number;
  syncStatus: 'synced' | 'syncing' | 'offline';
}
```

---

## File Structure Recommendation

```
src/components/canvas/
├── CanvasChrome/
│   ├── index.js
│   ├── CanvasChrome.jsx
│   ├── CanvasChrome.scss
│   └── CanvasChrome.logic.js
│
├── CanvasHeader/
│   ├── index.js
│   ├── CanvasHeader.jsx
│   ├── CanvasHeader.scss
│   ├── components/
│   │   ├── WorkspaceSelector.jsx
│   │   ├── ViewGroupSelector.jsx
│   │   ├── DisplayOptionsDropdown.jsx
│   │   └── WindowModeControls.jsx
│   └── hooks/
│       └── useCanvasHeader.js
│
├── EditBar/
│   ├── index.js
│   ├── EditBar.jsx
│   └── EditBar.scss
│
├── Footer1InstanceTools/
│   ├── index.js
│   ├── Footer1InstanceTools.jsx
│   ├── Footer1InstanceTools.scss
│   └── components/
│       └── ActiveViewSelector.jsx
│
├── Footer2CanvasControls/
│   ├── index.js
│   ├── Footer2CanvasControls.jsx
│   ├── Footer2CanvasControls.scss
│   └── components/
│       ├── CompactNavigator.jsx
│       ├── ResponsiveLinks.jsx
│       └── LinksPopover.jsx
│
└── InfoBar/
    ├── index.js
    ├── InfoBar.jsx
    ├── InfoBar.scss
    └── components/
        └── SizePopout.jsx
```

---

## Testing Checklist

### Responsive Behavior
- [ ] At 855px+: Links show as individual icons
- [ ] At <855px: Links collapse to [🔗 count] button
- [ ] At 810px+: Header shows Edit and Flow controls
- [ ] At <810px: Edit and Flow controls hidden
- [ ] At 650px+: Footer 2 is single row
- [ ] At <650px: Footer 2 wraps to two rows (no icons lost)
- [ ] At 500px+: Workspace/VG names visible (may truncate)
- [ ] At <500px: Workspace/VG show icons only
- [ ] Names truncate gradually between 500-855px
- [ ] **Undo/Redo NEVER disappear at any width**

### Functionality
- [ ] Workspace selector dropdown works
- [ ] ViewGroup selector shows link indicator for linked groups
- [ ] Edit toggle shows/hides Edit Bar
- [ ] Flow direction toggles between right/down
- [ ] Display options dropdown toggles coordinates/borders
- [ ] Window mode buttons work (dock/float/full)
- [ ] Active View selector in Footer 1 works
- [ ] Navigator mini-grid is clickable
- [ ] D-pad navigation respects canvas boundaries
- [ ] Links individual toggles work
- [ ] Links compact popover works
- [ ] Size info click opens popout
- [ ] Size spinners and presets work
- [ ] Viewport size constrained to canvas size

### Accessibility
- [ ] All buttons have title/aria-label
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Dropdowns close on Escape
- [ ] Color contrast meets WCAG AA

---

## Prototype Code

The working prototype is included below. This React component demonstrates all the responsive behaviors and interactions described above.

```jsx
// See canvas-chrome-v5.jsx for the complete working prototype
// Key components:
// - CanvasHeader with responsive breakpoints
// - Footer1InstanceTools with permanent Undo/Redo
// - Footer2CanvasControls with wrapping behavior
// - ResponsiveLinks with compact mode
// - InfoBar with size popout
// - CompactNavigator with mini-grid and d-pad
```

---

## Design Decisions Summary

| Decision | Rationale |
|----------|-----------|
| Undo/Redo always visible | Critical for user workflow, must never be hidden |
| Links compress at <855px | Prevents VR button from being cut off |
| Header compresses at <810px | Prevents window controls from being cut off |
| Footer wraps instead of hiding icons | Users need all tools, just reorganize them |
| Gradual name truncation | Smooth UX, shows as much as possible before collapsing |
| Size controls in Info Bar | Keeps header clean, info is already displayed there |
| ViewGroup link indicator | Quick visual feedback that VG has active links |
| Edit as toggle + bar | Clean header, full edit tools when needed |
| Section labels in footers | Clear organization, helps with compact links (no redundant label) |

---

## Related Documents

- `ViewGroup_Selector_Links_Claude_Code_Handoff.md` - Links system details
- `Room_Header_Workspace_Bar_Design_Session_Memory_Log.md` - Room header context
- `Navigator_V5_Design_Session_Memory_Log.md` - Navigator panel details
- `Instance_Tools_V2_Claude_Code_Handoff.md` - Instance tools specification
