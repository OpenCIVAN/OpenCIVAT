# Navigator V5 - Claude Code Implementation Handoff

**Date:** January 24, 2025  
**Session:** Navigator V5 Clean Scope Definition  
**Branch:** Beth-branch--server-authority  
**Prototype:** `/mnt/user-data/outputs/NavigatorMinimal.jsx`

---

## Executive Summary

Navigator V5 establishes a clean separation of concerns: **Navigator handles spatial navigation only**, while **Instance Tools handles type-specific rendering controls**. This respects the plugin architecture where not all instance types share the same capabilities.

### Key Architectural Decision

**REMOVED from Navigator (moved to Instance Tools):**
- Slice position slider
- Window/Level sliders  
- Opacity slider
- Camera presets (Front/Back/Left/Right/Top/Bottom)
- Camera controls section
- Flip H/V buttons
- Reset/Fit buttons

**Rationale:** These controls are type-specific. A `vtk-volume` has camera presets, but a `table` instance doesn't. A `vtk-slice` has slice controls, but a `plotly-chart` doesn't. Even opacity doesn't apply universally (tables don't have it).

---

## Navigator V5 Scope

### KEEP (Universal to all instance types)

| Feature | Description |
|---------|-------------|
| **D-pad navigation** | ▲▼◀▶ arrows + Home center button |
| **Position display** | Current location (A1, B2...) |
| **Home position** | Set/go to home, at-home indicator |
| **Viewport indicator** | Amber box overlay on minimap |
| **Zoom control** | Canvas-level zoom percentage |
| **Viewport size spinners** | Visible area cols × rows |
| **Canvas size spinners** | Total canvas cols × rows |
| **Collaborator cursors** | Avatars on minimap cells |
| **Focus mode toggle** | Groups / Views modes |
| **Minimap** | Adapts to focus mode |
| **Views tab** | Search, filter (All/Active/★/🔗), ViewItem list |
| **Bookmarks tab** | Starred + all sections |
| **ViewGroup controls** | View chips, Focus Group button |

### Three-Tab Structure

```
┌─────────────────────────────────────┐
│ 🧭 Navigator          [Groups│Views] │  ← Header with focus mode toggle
├─────────────────────────────────────┤
│ [🗺️ Map] [👁️ Views] [🔖 Marks]      │  ← Tab bar
├─────────────────────────────────────┤
│                                     │
│  ┌───┬───┬───┬───┐                 │
│  │   │   │   │   │  ← Minimap      │
│  ├───┼───┼───┼───┤    (Groups mode │
│  │   │   │   │   │     shows groups│
│  ├───┼───┼───┼───┤     Views mode  │
│  │   │   │   │   │     shows views)│
│  └───┴───┴───┴───┘                 │
│                                     │
│  ┌───┐                             │
│  │ ▲ │                             │
│  ├───┼───┼───┤   Position: A1      │  ← D-pad + info
│  │ ◀ │🏠 │ ▶ │   Home: A1 ✓        │
│  ├───┼───┼───┤                     │
│  │ ▼ │                             │
│  └───┘                             │
│                                     │
│  Zoom: [−] 100% [+]                │  ← Size controls
│  View: 3×3  Canvas: 4×4            │
├─────────────────────────────────────┤
│ Group: Brain Analysis (3 views)     │  ← Footer (contextual)
│ [Axial] [Sagittal] [3D Volume]     │
│ [🎯 Focus Group]                    │
└─────────────────────────────────────┘
```

---

## Files to Modify/Create

### 1. Main Navigator Component

**Location:** `src/ui/react/components/panels/LeftPanel/tabs/NavigatorTab/`

```
NavigatorTab/
├── NavigatorTab.jsx          # Main component
├── NavigatorTab.scss         # Styles (extend existing CanvasNavigator.scss)
├── NavigatorTab.logic.js     # Business logic (headless pattern)
├── index.js                  # Exports
└── components/
    ├── MinimapGrid/
    │   ├── MinimapGrid.jsx
    │   └── MinimapGrid.scss
    ├── DPadControls/
    │   ├── DPadControls.jsx
    │   └── DPadControls.scss
    ├── SizeControls/
    │   ├── SizeControls.jsx
    │   └── SizeControls.scss
    ├── ViewsPanel/
    │   ├── ViewsPanel.jsx
    │   └── ViewsPanel.scss
    └── BookmarksPanel/
        ├── BookmarksPanel.jsx
        └── BookmarksPanel.scss
```

### 2. Reuse Existing Components

**MUST import and use these existing components:**

```javascript
// ViewItem components - DO NOT recreate
import { ViewItem, InactiveViewItem } from '@UI/react/components/molecules/ViewItem';

// Atoms
import { Icon } from '@UI/react/components/atoms/Icon';
import { Badge } from '@UI/react/components/atoms/Badge';

// Molecules
import { SearchField } from '@UI/react/components/molecules/SearchField';
import { SectionHeader } from '@UI/react/components/molecules/SectionHeader';
import { NumberStepper } from '@UI/react/components/molecules/NumberStepper';

// Context
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
```

### 3. Existing File to Reference

**CanvasNavigator (partial implementation exists):**
- `src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.scss`

This file has many styles we can reuse or extend. Key classes:
- `.canvas-navigator__minimap`
- `.canvas-navigator__cell`
- `.canvas-navigator__viewport-indicator`
- `.canvas-navigator__nav-block`
- `.canvas-navigator__spinner`

---

## Component Specifications

### MinimapGrid

```typescript
interface MinimapGridProps {
  canvasSize: { rows: number; cols: number };
  viewportPosition: { row: number; col: number };
  viewportSize: { rows: number; cols: number };
  homePosition: { row: number; col: number };
  focusMode: 'groups' | 'views';
  viewGroups: ViewGroup[];
  views: View[];
  collaborators: Collaborator[];
  selectedGroupId: string | null;
  selectedViewId: string | null;
  isSettingHome: boolean;
  onCellClick: (row: number, col: number, group?: ViewGroup) => void;
  onViewSelect: (viewId: string) => void;
}
```

**Behavior:**
- **Groups mode:** Shows ViewGroups as colored regions spanning multiple cells
- **Views mode:** Shows individual views within groups (up to 4 per group cell)
- Viewport indicator (amber border) shows current visible area
- Home position shown with 🏠 icon or amber dot
- Collaborator avatars stack on cells they're viewing
- Cells outside viewport are dimmed (opacity: 0.5)

### DPadControls

```typescript
interface DPadControlsProps {
  currentPosition: { row: number; col: number };
  homePosition: { row: number; col: number };
  canvasSize: { rows: number; cols: number };
  isAtHome: boolean;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onGoHome: () => void;
  onSetHome: () => void;
}
```

**Layout:**
```
    [▲]
[◀] [🏠] [▶]    Position: A1
    [▼]         Home: A1 ✓  [Set Home]
```

### ViewsPanel (Views Tab Content)

```typescript
interface ViewsPanelProps {
  views: View[];
  selectedViewId: string | null;
  searchQuery: string;
  viewFilter: 'all' | 'active' | 'inactive' | 'starred' | 'linked';
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onSelectView: (viewId: string) => void;
  onNavigateToView: (viewId: string) => void;
  onPlaceView: (viewId: string) => void;
}
```

**Structure:**
```jsx
<SearchField ... />
<FilterChips filters={['All', 'Active', 'Inactive', '★', '🔗']} />
<SectionHeader title="On Canvas" badge={count} color="green" />
{activeViews.map(v => <ViewItem key={v.id} view={v} ... />)}
<SectionHeader title="Not Placed" badge={count} collapsible />
{inactiveViews.map(v => <InactiveViewItem key={v.id} view={v} ... />)}
```

### View Data Shape (matches existing ViewItem)

```typescript
interface View {
  id: string;
  name: string;
  color: string;
  datasetId: string;
  instanceType: string;  // 'vtk-volume', 'vtk-slice', 'vtk-mesh', 'table', etc.
  position: string | null;  // 'A1', 'B2', or null if not placed
  groupId: string | null;
  
  // Status flags (used by ViewItem STATUS_ICONS)
  starredWorkspace?: boolean;
  starredPersonal?: boolean;
  hasSavedState?: boolean;
  isShared?: boolean;
  isLocked?: boolean;
  linkedCount?: number;  // hasLinks if > 0
  hasFilters?: boolean;
  
  // Layout
  rowSpan?: number;
  colSpan?: number;
}
```

---

## State Management

### Navigator State

```typescript
interface NavigatorState {
  // Tab state
  activeTab: 'minimap' | 'views' | 'bookmarks';
  focusMode: 'groups' | 'views';
  
  // Selection
  selectedGroupId: string | null;
  selectedViewId: string | null;
  
  // Canvas navigation
  currentPosition: { row: number; col: number };
  homePosition: { row: number; col: number };
  isSettingHome: boolean;
  
  // Canvas dimensions
  zoomLevel: number;
  viewportSize: { rows: number; cols: number };
  canvasSize: { rows: number; cols: number };
  
  // Views tab
  searchQuery: string;
  viewFilter: 'all' | 'active' | 'inactive' | 'starred' | 'linked';
}
```

### Data Sources

```typescript
// From ViewConfigurationManager (or Y.js shared state)
const viewGroups = useViewGroups();
const views = useViews();

// From presence system
const collaborators = useCollaborators();

// From BookmarkManager (to be implemented)
const bookmarks = useBookmarks();
```

---

## Footer Behavior (Contextual)

### Groups Mode + Group Selected
```
┌─────────────────────────────────────┐
│ [●] Brain Analysis      3 views     │
│ [Axial] [Sagittal] [3D Volume]     │
│ [🎯 Focus Group]                    │
└─────────────────────────────────────┘
```
- Clicking view chip → switches to Views mode with that view selected

### Views Mode + View Selected
```
┌─────────────────────────────────────┐
│ [●] Axial Slice (vtk-slice)    A1  │
│ → Use Instance Tools to adjust     │
│   vtk-slice settings               │
└─────────────────────────────────────┘
```
- Shows view type to guide user to correct Instance Tools

---

## Styling Guidelines

### Use Existing Design Tokens

```scss
@use "theme" as *;

// Colors
$color-bg-primary, $color-bg-secondary, $color-bg-tertiary
$color-text-primary, $color-text-secondary, $color-text-muted
$color-border-subtle, $color-border-default
$color-accent-purple, $color-accent-blue, $color-accent-green
$color-accent-amber, $color-accent-pink, $color-accent-cyan

// Spacing
$spacing-xs, $spacing-sm, $spacing-md, $spacing-lg

// Radius
$radius-xs, $radius-sm, $radius-md

// Shadows
$shadow-sm, $shadow-md
```

### Adaptive Sizing (VR Support)

```scss
.navigator-tab {
  // Desktop mode
  &--desktop {
    --btn-size: 28px;
    --font-size: 11px;
  }
  
  // VR mode - larger touch targets
  &--vr {
    --btn-size: 44px;
    --font-size: 14px;
  }
}
```

---

## Integration Points

### 1. LeftPanel Tab Registration

```javascript
// In LeftPanel tabs configuration
{
  id: 'navigator',
  label: 'Navigator',
  icon: 'compass',
  component: NavigatorTab,
}
```

### 2. Canvas Actions

```javascript
// Connect to CanvasGrid for viewport navigation
const { setViewportPosition, setViewportSize, setCanvasSize } = useCanvasActions();

// Connect to ViewConfigurationManager
const { focusView, focusGroup } = useViewConfigurationManager();
```

### 3. Presence System

```javascript
// Get collaborator positions for minimap
const collaborators = useCollaboratorPresence();
// Returns: [{ id, name, avatar, position: { row, col } }]
```

---

## Testing Checklist

- [ ] Minimap renders correctly with groups
- [ ] Minimap switches between groups/views modes
- [ ] D-pad navigation updates viewport position
- [ ] Home position can be set and recalled
- [ ] Viewport indicator tracks current position
- [ ] Size spinners update viewport/canvas dimensions
- [ ] Views tab search filters correctly
- [ ] Views tab filters work (all/active/starred/linked)
- [ ] ViewItem components render with correct status icons
- [ ] InactiveViewItem shows "click to place" state
- [ ] Footer shows contextual controls based on selection
- [ ] Collaborator avatars appear on minimap
- [ ] VR mode sizing applies correctly
- [ ] Keyboard navigation works (arrow keys)

---

## Prototype Reference

The working prototype is at:
```
/mnt/user-data/outputs/NavigatorMinimal.jsx
```

This shows the core UI structure with:
- Three-tab layout (minimap, views, bookmarks)
- ViewItem-style list in Views tab
- Filter chips
- Contextual footer

**Note:** The prototype uses inline styles and emoji placeholders. Production implementation should:
1. Use SCSS with design tokens
2. Use Icon components instead of emoji
3. Use existing molecules (ViewItem, SearchField, etc.)
4. Connect to real data sources

---

## Next Steps After Navigator

1. **Instance Tools Tab Redesign** - Type-aware control panel
2. **InstanceTypeHandler capability queries** - `hasSliceControl()`, `hasCameraControl()`, etc.
3. **Type-specific control sets** - Slice, camera, chart, table controls
4. **Control panel composition** - Dynamically build UI based on type capabilities

---

## Questions for Implementation

1. Should ViewGroups be stored in Y.js or just derived from view positions?
2. How should bookmarks serialize camera state for different instance types?
3. Should the Navigator connect directly to CanvasGrid or go through a manager?

---

*Handoff created: January 24, 2025*
*Ready for Claude Code implementation*
