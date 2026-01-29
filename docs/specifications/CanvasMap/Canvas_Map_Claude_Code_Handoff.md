# Canvas Map Panel - Claude Code Implementation Handoff

## Overview

The Canvas Map is a unified navigation and editing control for the collaborative immersive analytics platform. It consolidates viewport navigation, ViewGroup management, collaboration awareness, and link visualization into a single, mode-based panel.

**Primary Functions:**
- Navigate the infinite canvas
- Manage ViewGroups (create, edit, merge, split, link)
- Visualize and follow collaborators
- Understand linking relationships between VGs and Views

**Design Philosophy:**
- Mode-based UI reduces clutter by showing only relevant controls
- Grid-aligned visual metaphor (Excel-style A1, B2 coordinates)
- VG vs View display toggle for different mental models
- Consistent with existing Navigator patterns

---

## Architecture

### File Location
```
src/ui/react/components/panels/LeftPanel/tabs/CanvasMapTab/
├── CanvasMapTab.jsx           # Main container
├── CanvasMapTab.scss          # Styles
├── components/
│   ├── Minimap/
│   │   ├── Minimap.jsx        # Grid + overlays
│   │   ├── Minimap.scss
│   │   ├── MinimapGrid.jsx    # Background cells
│   │   ├── VGBlock.jsx        # ViewGroup overlay
│   │   ├── ViewCell.jsx       # Individual view (View mode)
│   │   ├── ViewportIndicator.jsx
│   │   └── CollaboratorIndicator.jsx
│   ├── ModeToolbar/
│   │   ├── ModeToolbar.jsx
│   │   └── ModeToolbar.scss
│   ├── panels/
│   │   ├── NavigatePanel.jsx  # Bookmarks, quick nav
│   │   ├── LayoutPanel.jsx    # VG list, inactive VGs
│   │   ├── LinksPanel.jsx     # VG links, View links
│   │   └── TeamPanel.jsx      # Me tab, Team tab
│   └── shared/
│       ├── VGListItem.jsx
│       ├── ViewListItem.jsx
│       ├── BookmarkItem.jsx
│       ├── CollaboratorItem.jsx
│       ├── ViewportItem.jsx
│       └── LayoutMiniPreview.jsx
└── hooks/
    ├── useCanvasNavigation.js
    ├── useViewGroupOperations.js
    └── useCollaboratorPresence.js
```

### State Management

```javascript
// Local UI State
const [mapMode, setMapMode] = useState('navigate'); // 'navigate' | 'layout' | 'links' | 'collaborate'
const [displayMode, setDisplayMode] = useState('vg'); // 'vg' | 'view'
const [minimapZoom, setMinimapZoom] = useState(100); // 50-200
const [showGridLabels, setShowGridLabels] = useState(true);
const [showViewports, setShowViewports] = useState(true);
const [showCollaborators, setShowCollaborators] = useState(true);
const [showBookmarks, setShowBookmarks] = useState(true);
const [showInternals, setShowInternals] = useState(true);
const [linksSubTab, setLinksSubTab] = useState('vg'); // 'vg' | 'view'
const [collaborateSubTab, setCollaborateSubTab] = useState('me'); // 'me' | 'team'
const [focusedVGId, setFocusedVGId] = useState(null); // Drill-in mode

// Selection State
const [selectedVGId, setSelectedVGId] = useState(null);
const [selectedViewportId, setSelectedViewportId] = useState(null);
const [highlightedLinkId, setHighlightedLinkId] = useState(null);

// From Context/Managers
// - canvas (CanvasManager)
// - viewGroups (ViewConfigurationManager)
// - viewports (ViewportManager)
// - collaborators (CollaboratorPresenceManager)
// - vgLinks, viewLinks (LinkManager)
// - bookmarks (BookmarkManager)
```

---

## Modes

### 1. Navigate Mode (Blue)
**Purpose:** Move around the canvas, find locations

**Shows:**
- Viewports (user + collaborators)
- Bookmarks
- VG boundaries (no internals)
- Home position indicator

**Toolbar:**
- Zoom controls
- Grid labels toggle
- VG/View display toggle
- Viewport visibility toggle
- Collaborator visibility toggle
- Bookmark visibility toggle

**Panel Content:**
1. Quick Navigation section (Go Home, Set Home, Fit All, Add Bookmark)
2. Bookmarks list with search

### 2. Layout Mode (Green)
**Purpose:** Build and edit canvas structure

**Shows:**
- VGs with internal layouts
- Edit tools
- Your viewports only

**Toolbar:**
- Zoom controls
- Grid labels toggle
- VG/View display toggle
- Show internals toggle
- Snap to grid toggle
- Add VG / Merge / Split buttons

**Panel Content:**
1. On Canvas - VG list with layout previews
2. Inactive - Closed VGs that can be restored

**Special:** Double-click VG to drill into focused edit mode

### 3. Links Mode (Purple)
**Purpose:** Visualize and manage connections

**Shows:**
- Ghosted VGs with link lines
- Click to highlight specific link

**Toolbar:**
- Zoom controls
- VG Links / View Links sub-tabs
- Create link / Break link buttons

**Panel Content:**
- VG Links list (when VG sub-tab active)
- View Links list (when View sub-tab active)

**Interaction:** Click link line on map OR list item to highlight

### 4. Team/Collaborate Mode (Amber)
**Purpose:** See where teammates are working

**Shows:**
- Collaborator viewports (prominent)
- Broadcast indicators
- Your viewports

**Toolbar:**
- Zoom controls
- Me / Team sub-tabs
- Show broadcasts only filter

**Panel Content (Me tab):**
1. My Viewports list
2. My Status (broadcasting state, who I'm following)

**Panel Content (Team tab):**
1. Search + filter chips (Online, All, Live)
2. Broadcasting section
3. Online section
4. Offline section

---

## Display Modes

### VG Mode
Shows ViewGroups as containers spanning multiple cells.

```
      A     B     C     D
   ┌───────────┬───────────┐
 1 │           │           │
   │   Brain   │  Tumor    │
 2 │  Analysis │  Review   │
   ├─────┬─────┴─────┬─────┤
 3 │Notes│Comparison │Time │
   └─────┴───────────┴─────┘
```

- VG borders: Solid (explicit) or Dashed (implicit)
- VG color fill with opacity
- Name label
- Internal layout grid (if showInternals enabled)

### View Mode
Shows individual views as 1:1 cells, ignoring VG boundaries.

```
      A     B     C     D
   ┌─────┬─────┬─────┬─────┐
 1 │ 🧊  │ 🔲  │ 🔲  │ 🔲  │
   ├─────┼─────┼─────┼─────┤
 2 │ 📊  │     │ 🧊  │ 📈  │
   ├─────┼─────┼─────┼─────┤
 3 │ 📝  │ 🔲  │ 🔲  │ 📈  │
   └─────┴─────┴─────┴─────┘
```

- Each view = exactly 1 cell
- Color by view type
- Icon + truncated name
- Hover tooltip with full details

---

## Grid & Coordinate System

### Excel-Style References
```javascript
// Column index to letter (0->A, 25->Z, 26->AA)
const colToLetter = (col) => {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
};

// Format cell reference
const formatCellRef = (row, col) => `${colToLetter(col)}${row + 1}`;

// Format range reference
const formatRangeRef = (row, col, rowSpan, colSpan) => {
  const start = formatCellRef(row, col);
  if (rowSpan === 1 && colSpan === 1) return start;
  const end = formatCellRef(row + rowSpan - 1, col + colSpan - 1);
  return `${start}:${end}`;
};
```

### Background Grid Scaling
```scss
// Grid lines scale with cell size
background-size: calc(#{$cell-size} + #{$gap}) calc(#{$cell-size} + #{$gap});
```

The background grid paper must align exactly with the minimap cells. Each grid square = 1 cell slot.

---

## Components Specification

### Minimap

**Props:**
```typescript
interface MinimapProps {
  canvas: Canvas;
  viewGroups: ViewGroup[];
  viewports: Viewport[];
  collaborators: Collaborator[];
  vgLinks: VGLink[];
  viewLinks: ViewLink[];
  bookmarks: Bookmark[];
  
  // Display
  displayMode: 'vg' | 'view';
  zoom: number;
  showGridLabels: boolean;
  showInternals: boolean;
  
  // Selection
  selectedVGId: string | null;
  selectedViewportId: string | null;
  highlightedLinkId: string | null;
  focusedVGId: string | null;
  
  // Visibility (mode-dependent)
  showViewports: boolean;
  showCollaborators: boolean;
  showBookmarks: boolean;
  
  // Callbacks
  onVGClick: (id: string) => void;
  onVGDoubleClick: (id: string) => void;
  onViewportDrag: (id: string, position: Position) => void;
  onLinkClick: (id: string) => void;
}
```

**Cell Size Calculation:**
```javascript
const minimapCellSize = useMemo(() => {
  const baseSize = focusedVGId ? 60 : 42;
  return Math.floor(baseSize * (zoom / 100));
}, [zoom, focusedVGId]);
```

### VGBlock

**Props:**
```typescript
interface VGBlockProps {
  vg: ViewGroup;
  displayName: string;
  cellSize: number;
  isSelected: boolean;
  isGhosted: boolean;
  showInternals: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}
```

**Visual States:**
- Default: 25% opacity fill, 80% opacity border
- Selected: 40% opacity fill, 100% border, glow shadow
- Ghosted (links mode): 10% opacity fill, 30% border, 40% overall opacity
- Explicit: Solid border
- Implicit: Dashed border

### ViewCell

**Props:**
```typescript
interface ViewCellProps {
  view: FlattenedView;
  cellSize: number;
  isSelected: boolean;
  onClick: () => void;
  formatCellRef: (row: number, col: number) => string;
}
```

**Hover Tooltip Content:**
- View name (full)
- Dataset name
- Cell reference (e.g., "A1")

### LayoutMiniPreview

**Props:**
```typescript
interface LayoutMiniPreviewProps {
  layoutId: string;
  color: string;
  viewCount: number;
  size?: number; // default 16-18px
}
```

Renders a tiny pixel-art representation of the VG's internal layout:
- Filled cells = views present
- Empty cells = available slots
- Supports merged layouts (1+2, 2+1)

### VGListItem

**Props:**
```typescript
interface VGListItemProps {
  vg: ViewGroup;
  displayName: string;
  isSelected: boolean;
  isInactive?: boolean;
  formatRangeRef: (row, col, rowSpan, colSpan) => string;
  onClick: () => void;
  onDoubleClick: () => void;
}
```

**Display Elements:**
- LayoutMiniPreview (18px)
- Name
- Position (e.g., "A1:B2") - not shown if inactive
- View count (e.g., "3v")
- "implicit" badge if unnamed
- "Restore" button if inactive

---

## Interactions

### Viewport Dragging
- Mouse down on viewport indicator → capture start position
- Mouse move → calculate cell offset from drag distance
- Constrain to canvas bounds
- Update viewport position in real-time
- Snap to grid (if snap mode enabled)

### VG Selection Flow
1. Click VG → Select VG (for operations)
2. Double-click VG → Drill into focused edit mode
3. Selecting a View auto-selects parent VG
4. Selecting VG does NOT auto-select a View

### Link Highlighting (Links Mode)
1. Click link line on map OR click list item
2. Highlighted link: Full opacity, glow effect
3. Connected VGs: Full opacity
4. Other VGs: Ghosted (40% opacity)
5. Click again to deselect

### Focused VG Edit Mode
1. Double-click VG in Layout mode
2. Breadcrumb appears: "Canvas > VG Name"
3. Minimap shows ONLY that VG's internal grid (large cells)
4. Can add/remove views, change layout
5. Click "Back" or breadcrumb to return to canvas view

### Drag & Drop
- **VG from list to minimap:** Reposition VG on canvas
- **Inactive VG to minimap:** Restore and place
- **VG off minimap:** Move to Inactive (with confirmation)
- **View from side panel to minimap:** Place view in empty cell

---

## Implicit vs Explicit ViewGroups

| Property | Implicit | Explicit |
|----------|----------|----------|
| Name | `null` (displays view name or "Group (n views)") | User-defined |
| Border | Dashed | Solid |
| Badge | "implicit" amber badge | None |
| Created by | Quick drag-drop | Explicit creation |
| Merge | ✅ Allowed | ✅ Allowed |
| Split | ✅ Allowed (if >1 view) | ✅ Allowed |
| Duplicate | ✅ Allowed | ✅ Allowed |
| Link | ✅ Allowed | ✅ Allowed |
| Save as Template | ⚠️ Prompts for name first | ✅ Allowed |
| Share | ⚠️ Prompts for name first | ✅ Allowed |

**Upgrade Path:** Any operation requiring identity (save, share) prompts for a name, converting implicit → explicit.

---

## Inactive ViewGroups

When a VG is closed:
1. Moves to "Inactive" section (not deleted)
2. No canvas position
3. Layout preview still visible
4. Can be restored via:
   - Drag to canvas
   - Click "Restore" button

---

## Data Models

### ViewGroup
```typescript
interface ViewGroup {
  id: string;
  name: string | null; // null = implicit
  color: string;
  isExplicit: boolean;
  layoutId: string; // 'single' | 'side-by-side' | '2x2' | '1+2' | etc.
  position: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
  } | null; // null if inactive
  views: View[];
  linkedTo?: string[];
  linkMode?: 'unidirectional' | 'bidirectional';
}
```

### Viewport
```typescript
interface Viewport {
  id: string;
  name: string;
  position: { row: number; col: number };
  size: { rows: number; cols: number };
  mode: 'snap' | 'free';
  syncMode: null | 'broadcast' | 'follow' | 'bidirectional';
  followingUser?: string;
  isPrimary: boolean;
}
```

### Collaborator
```typescript
interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  color: string;
  viewport: {
    row: number;
    col: number;
    rows: number;
    cols: number;
  } | null;
  isBroadcasting: boolean;
  isOnline: boolean;
}
```

### VGLink
```typescript
interface VGLink {
  id: string;
  from: string; // VG id
  to: string; // VG id
  type: 'camera' | 'filters' | 'widgets' | 'all';
  mode: 'unidirectional' | 'bidirectional';
}
```

### ViewLink
```typescript
interface ViewLink {
  id: string;
  views: string[]; // View ids
  type: 'camera' | 'windowLevel' | 'slice' | 'colormap';
  mode: 'bidirectional';
}
```

### Bookmark
```typescript
interface Bookmark {
  id: string;
  name: string;
  position: { row: number; col: number };
  zoom?: number;
}
```

---

## SCSS Structure

```scss
// CanvasMapTab.scss

@use '@/styles/theme' as *;

.canvas-map {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  &__mode-tabs {
    display: flex;
    background: $bg-tertiary;
    border-bottom: 1px solid $border-subtle;
  }
  
  &__mode-tab {
    flex: 1;
    padding: $spacing-sm $spacing-xs;
    border: none;
    background: transparent;
    color: $text-muted;
    font-size: $text-sm;
    cursor: pointer;
    
    &--active {
      background: $bg-secondary;
      border-bottom: 2px solid var(--mode-color);
      color: var(--mode-color);
    }
  }
  
  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-sm;
    border-bottom: 1px solid $border-subtle;
    background: $bg-tertiary;
  }
  
  &__minimap {
    flex: 1;
    padding: $spacing-md;
    overflow: auto;
    background: $bg-tertiary;
    background-image: 
      linear-gradient($bg-grid-line 1px, transparent 1px),
      linear-gradient(90deg, $bg-grid-line 1px, transparent 1px);
    // backgroundSize set dynamically based on cell size
  }
  
  &__panel {
    border-top: 1px solid $border-subtle;
    max-height: 240px;
    overflow: auto;
    flex: 1;
  }
  
  &__footer {
    padding: $spacing-xs $spacing-sm;
    border-top: 1px solid $border-subtle;
    background: $bg-tertiary;
    font-size: $text-xs;
    color: $text-muted;
  }
}

// Mode colors
.canvas-map--navigate { --mode-color: #{$accent-blue}; }
.canvas-map--layout { --mode-color: #{$accent-green}; }
.canvas-map--links { --mode-color: #{$accent-purple}; }
.canvas-map--collaborate { --mode-color: #{$accent-amber}; }
```

---

## Integration Points

### Managers to Wire
- `CanvasManager` - Canvas dimensions, home position
- `ViewConfigurationManager` - ViewGroups, views
- `ViewportManager` - User viewports
- `CollaboratorPresenceManager` - Team member presence (Y.js)
- `LinkManager` - VG and View links
- `BookmarkManager` - Saved positions

### Events to Handle
- `viewport:moved` - User dragged viewport
- `vg:selected` - VG clicked
- `vg:focused` - VG double-clicked (drill-in)
- `collaborator:follow` - Follow button clicked
- `link:highlighted` - Link selected for visualization

### Y.js Sync
- Viewport positions (if sharing enabled)
- VG positions (collaborative editing)
- Link configurations

---

## Testing Checklist

- [ ] All 4 modes render correctly
- [ ] Mode switching preserves selection
- [ ] VG/View toggle works in all modes
- [ ] Grid labels toggle on/off
- [ ] Zoom scales grid background correctly
- [ ] Excel-style coordinates display correctly
- [ ] VG selection/double-click works
- [ ] Viewport dragging works
- [ ] Link highlighting works in Links mode
- [ ] Collaborator indicators show for online users with viewports
- [ ] Inactive VGs section appears when VGs are closed
- [ ] LayoutMiniPreview renders all layout types correctly
- [ ] Implicit VGs show dashed borders and "implicit" badge
- [ ] Search/filter works in lists
- [ ] Breadcrumb navigation in focused edit mode
- [ ] Side panel (Views/Datasets) toggles open/close
- [ ] Follow/Broadcast controls work in Team mode

---

## Prototype Reference

The working prototype is available at:
`/mnt/user-data/outputs/canvas-map-refined.jsx`

This contains all the visual design, interactions, and component structure to reference during implementation.
