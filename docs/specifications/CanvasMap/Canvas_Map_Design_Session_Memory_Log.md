# Canvas Map Design Session Memory Log

**Date:** January 28-29, 2026
**Session Focus:** Canvas Map Panel - Focused Modes, Grid Labels, Companion Panels
**Prototype:** `/mnt/user-data/outputs/canvas-map-refined.jsx`

---

## Session Overview

This session refined the unified Canvas Map design from previous sessions, addressing clutter concerns and adding critical features for spatial navigation and collaboration in CIA Web.

### Key User Requirements

1. **Clutter Reduction** - Too many layers competing for limited panel space
2. **Search/Filter/Sort** - Need for long lists of VGs, bookmarks, collaborators
3. **Quick Navigation** - Should appear above bookmarks
4. **View Links** - Need separate space (can get complex)
5. **Viewports Toggle** - Was missing from previous design
6. **Background Grid** - For easier alignment visualization
7. **Grid Labels** - Excel-style A1, B2, C3 for communication
8. **Implicit VG Naming** - Show view name, not "implicit"
9. **VG/View Display Toggle** - Like current Navigator's Layout|Views tabs
10. **Layout Mini Previews** - Tiny pixel representation of VG layouts in lists
11. **Inactive VGs** - Like datasets, closed VGs should be restorable
12. **Team Scalability** - Sub-tabs for large teams

---

## Design Decisions

### 1. Four Focused Modes

Instead of one map with 10+ toggles, purpose-built modes:

| Mode | Color | Purpose | Shows | Hides |
|------|-------|---------|-------|-------|
| Navigate | Blue #3b82f6 | Move around canvas | Viewports, collaborators, bookmarks, VG boundaries | Internals, links, edit tools |
| Layout | Green #22c55e | Build/edit canvas | VGs with internals, edit tools, your viewport | Collaborators, links, bookmarks |
| Links | Purple #a855f7 | Manage connections | Ghosted VGs, link lines, highlight on click | Viewports, collaborators, internals |
| Team | Amber #f59e0b | Collaboration | Collaborators, broadcasts, your viewport | Internals, links, edit tools |

**Rationale:** Each mode optimizes the UI for a specific task, reducing cognitive load.

### 2. Links Mode - Ghosted + Highlight Pattern

- VGs become semi-transparent (ghosted) by default
- Link lines drawn between connected VGs
- Click link line → highlights, connected VGs become prominent
- Sub-tabs: "VG Links" | "View Links" (separate due to complexity)
- Solid line = bidirectional, Dashed = unidirectional
- Color indicates link type (camera=cyan, filters=purple)

**Rationale:** Links can become visually overwhelming. Ghosting + highlight-on-click keeps it manageable.

### 3. VG vs View Display Toggle

Toggle in toolbar: `[VG | View]`

**VG Mode (default):**
- Shows ViewGroups as colored containers
- VGs span multiple cells (e.g., 2×2)
- Internal layout visible when showInternals enabled

**View Mode:**
- Shows individual views as 1×1 cells
- Each view positioned within its VG's canvas area
- Icon + truncated name
- Hover tooltip with full details

**Rationale:** Different mental models - sometimes you want to see organizational structure (VG), sometimes you want to see what's actually rendered (View).

### 4. Excel-Style Grid Labels

Toggleable via `#` button in toolbar.

**Implementation:**
```javascript
const colToLetter = (col) => {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
};

const formatCellRef = (row, col) => `${colToLetter(col)}${row + 1}`;
const formatRangeRef = (row, col, rowSpan, colSpan) => {
  const start = formatCellRef(row, col);
  if (rowSpan === 1 && colSpan === 1) return start;
  return `${start}:${formatCellRef(row + rowSpan - 1, col + colSpan - 1)}`;
};
```

**Display locations:**
- Column headers: A, B, C, D...
- Row numbers: 1, 2, 3, 4...
- VG list items: "Brain Analysis A1:B2"
- Bookmarks: "🔖 Pre-surgery [A1]"
- Collaborators: "at C1"
- Viewport footer: "[A1:B2]"

**Rationale:** Excel-style references enable unambiguous communication ("look at C3").

### 5. Background Grid Scaling

**Critical:** Grid background must scale with cell size.

```scss
background-size: calc(#{$cell-size} + #{$gap}) calc(#{$cell-size} + #{$gap});
```

Each grid square = exactly 1 cell slot. Zoom in = larger squares. Zoom out = smaller squares.

**Rationale:** Grid provides alignment reference that must match actual cells.

### 6. Implicit VG Naming Convention

- **Display name** for implicit VG = single view's name (not "implicit")
- If multiple views: "Group (n views)"
- Visual indicator: Dashed border + amber "implicit" badge in lists

**Rationale:** Users shouldn't see "implicit" everywhere - show meaningful names.

### 7. Layout Mini Previews

Each VG in lists shows tiny (18×18px) pixel-art layout preview:

- Filled cells = views present (solid color)
- Empty cells = available slots (40% opacity)
- Supports merged layouts (1+2, 2+1, etc.)

**Rationale:** Quick visual scan of layout type without hovering/clicking.

### 8. Inactive VGs Section

When VG is closed:
1. Moves to "Inactive" section (not deleted)
2. No canvas position
3. Layout preview still visible
4. Can restore via drag-to-canvas or Restore button

**Rationale:** Matches datasets pattern - nothing is truly deleted, can always recover.

### 9. Team Mode Sub-Tabs

`[ Me | Team (5) ]`

**Me tab:**
- My Viewports list
- My Status (broadcasting state, who I'm following)

**Team tab:**
- Search bar
- Filter chips: Online | All | Live
- Grouped by status: BROADCASTING → ONLINE → OFFLINE
- Each collaborator: avatar, name, position, Live badge, Follow button

**Rationale:** Teams can have 10-20+ people; sub-tabs prevent overwhelm.

### 10. Flattened View Position Calculation

For View mode, calculate each view's canvas position:

```javascript
const canvasRow = vg.position.row + 
  Math.floor(internalRow * vg.position.rowSpan / layout.rows);
const canvasCol = vg.position.col + 
  Math.floor(internalCol * vg.position.colSpan / layout.cols);
```

Each view = exactly 1 cell. Grid size stays same as canvas (no expansion).

---

## Component Extraction

### Atoms
- `ToolbarButton` - Icon button with active state
- `Separator` - Vertical divider
- `Badge` - Count/status indicator

### Molecules
- `SearchBar` - Input with search icon
- `SectionHeader` - Title + icon + count + action
- `FilterChip` - Toggleable filter pill
- `ToggleButtonGroup` - Segmented control (VG|View, Me|Team)
- `ActionButton` - Icon + label button
- `LayoutMiniPreview` - Tiny pixel layout grid

### Organisms
- `ListItem` - Base wrapper for list items
- `VGListItem` - ViewGroup in list with preview
- `CollaboratorItem` - Team member with Follow
- `BookmarkItem` - Saved position
- `ViewportItem` - User viewport
- `ViewCell` - Individual view on minimap
- `VGBlock` - ViewGroup on minimap

---

## Panel Layout Structure

```
┌──────────────────────────────────────────┐
│ [Navigate] [Layout] [Links] [Team]       │ ← Mode tabs
├──────────────────────────────────────────┤
│ Zoom... | # | [VG|View] | mode-specific  │ ← Toolbar
├──────────────────────────────────────────┤
│                                          │
│              MINIMAP                     │ ← Grid with overlays
│                                          │
├──────────────────────────────────────────┤
│ Contextual Panel (mode-dependent)        │ ← Lists, actions
│ - Navigate: Bookmarks                    │
│ - Layout: VGs + Inactive                 │
│ - Links: Link list                       │
│ - Team: Me/Team                          │
├──────────────────────────────────────────┤
│ Viewport: Main [A1:B2] | Mode: snap      │ ← Footer
└──────────────────────────────────────────┘
```

---

## Companion Panels (Optional)

**Views/Datasets Side Panel (280px):**
- Tabs: Views | Datasets
- Search + filter
- Drag items to canvas map

**Canvas Operations Panel (340px):**
- Tabs: Transaction | Audit Log | Users | Save Points
- Tracks changes for undo/redo

These are separate panels, not part of Canvas Map Tab.

---

## Visual Specifications

### Mode Colors
```scss
$mode-navigate: #3b82f6;  // Blue
$mode-layout: #22c55e;    // Green
$mode-links: #a855f7;     // Purple
$mode-collaborate: #f59e0b; // Amber
```

### VG Block States
- Default: 25% fill, 80% border
- Selected: 40% fill, 100% border, glow shadow
- Ghosted (Links mode): 10% fill, 30% border, 40% opacity
- Explicit: Solid border
- Implicit: Dashed border

### Viewport Indicator
- Border: Cyan #22d3ee
- Snap mode: Solid border
- Free mode: Dashed border
- Label in corner with name

### Collaborator Indicator
- Border: User's assigned color
- Dashed border style
- Avatar in corner

---

## Interactions

| Action | Result |
|--------|--------|
| Click mode tab | Switch mode, clear link highlight |
| Click VG | Select VG |
| Double-click VG | Drill into VG (Layout mode) |
| Click link line | Highlight link, ghost other VGs |
| Drag viewport indicator | Pan around canvas |
| Drag VG from list | Reposition on canvas |
| Drag inactive VG to canvas | Restore and place |
| Click Follow on collaborator | Follow their viewport |

---

## Open Questions (For Future Sessions)

1. **Mode persistence** - Remember which mode user was in?
2. **Keyboard shortcuts** - 1-2-3-4 for modes?
3. **Link line routing** - Straight vs curved/orthogonal?
4. **VG Templates** - Quick-access bar when drilling in?
5. **Follow UX** - Follow in current viewport or new one?
6. **Transactions** - Auto-commit or batch pending?
7. **View Links visualization** - Lines between individual views?
8. **Grid label density** - Show all or only visible range?

---

## Files Created

1. **Prototype:** `/mnt/user-data/outputs/canvas-map-refined.jsx`
   - Complete working prototype with all features
   
2. **Handoff:** `/home/claude/Canvas_Map_Claude_Code_Handoff.md`
   - Full implementation specification
   
3. **Atomic Spec:** `/home/claude/Atomic_Component_Spec_Canvas_Map.md`
   - Reusable component definitions

---

## Continuation Prompt

To continue this work in a new chat:

```
I'm continuing work on the Canvas Map panel for CIA Web. Please read these files:

1. Canvas_Map_Claude_Code_Handoff.md - Implementation spec
2. Atomic_Component_Spec_Canvas_Map.md - Component definitions  
3. Canvas_Map_Design_Session_Memory_Log.md - Design decisions

The prototype is at: canvas-map-refined.jsx (in project files)

Previous sessions covered:
- Four focused modes (Navigate, Layout, Links, Team)
- VG vs View display toggle
- Excel-style grid labels (A1, B2)
- Layout mini previews in lists
- Inactive VGs section
- Team mode with Me/Team sub-tabs
- Background grid that scales with cell size

[State what you want to work on next]
```

---

## Related Documents

- `PanelShell_Unified_Workspace_Design_Session_Memory_Log.md`
- `Navigator_V5_Design_Session_Memory_Log.md`
- `Layout_Tab_V4_Drill_In_Templates_Session_Memory_Log.md`
- `Modals_vs_FloatingPanels_Design_Session_Memory_Log.md`
