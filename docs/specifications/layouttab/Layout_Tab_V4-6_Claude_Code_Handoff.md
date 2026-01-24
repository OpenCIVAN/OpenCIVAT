# Layout Tab V4.6 - Claude Code Implementation Handoff

**Created:** January 24, 2026  
**Prototype:** `LayoutTabV4-6.jsx` (attached to this project)  
**Target Location:** `src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/`  
**Dependencies:** Atomic component system, useAdaptive hook, SASS design tokens

---

## Executive Summary

This handoff covers implementing a completely redesigned Layout Tab that introduces a **four-concept spatial model** for the CIA Web collaborative immersive analytics platform. The design enables sophisticated workspace management with VR-first interaction patterns.

### Core Concepts
1. **Canvas** - Infinite workspace (explicit 1-10×10 grid)
2. **ViewGroup** - Reusable content container (MiniCanvas) with internal layout
3. **View** - Individual InstanceWindow bound to a dataset
4. **Viewport** - User's moveable viewing window (camera into the canvas)

---

## Architecture Overview

### Data Flow
```
Canvas (workspace grid)
  └── ViewGroupPositions[] (placement on canvas)
       └── ViewGroup (content container)
            └── Views[] (actual renderers)

Viewport (user's view into canvas - separate from content)
  └── Can span multiple ViewGroups
  └── Snap or Free positioning mode
```

### Key Distinction
- **ViewGroups** = Content organization units (like slides in a presentation)
- **Viewport** = What the user sees (like a camera window) - can be shared for collaboration

---

## Data Models

### ViewGroup
```typescript
interface ViewGroup {
  id: string;
  name: string;
  layoutId: string;           // 'single', '1+2', '2x2', '3-up', etc.
  views: View[];
  color: string;              // Hex color for visual identification
  linkedTo?: string;          // ID of linked ViewGroup (for view-level sync)
}
```

### View
```typescript
interface View {
  id: string;
  type: ViewType;             // 'vtk' | 'volume' | 'slice' | 'data' | 'chart' | 'notes'
  name: string;
  datasetId?: string;
  config?: ViewConfiguration;
}
```

### Canvas
```typescript
interface Canvas {
  rows: number;               // 1-10 explicit size
  cols: number;               // 1-10 explicit size
  viewGroupPositions: ViewGroupPosition[];
}

interface ViewGroupPosition {
  viewGroupId: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}
```

### Viewport
```typescript
interface Viewport {
  id: string;
  name: string;
  userId: string;
  position: { row: number; col: number };
  size: { rows: number; cols: number };  // 1-10 each dimension
  mode: 'snap' | 'free';
  snappedTo?: string;         // ViewGroup ID if snapped
  isPrimary: boolean;
  isShared: boolean;          // For collaboration - others see this view
}
```

### Built-in Layouts
```typescript
const BUILTIN_LAYOUTS = [
  { id: 'single', name: 'Single', rows: 1, cols: 1 },
  { id: 'side-by-side', name: 'Side by Side', rows: 1, cols: 2 },
  { id: 'stacked', name: 'Stacked', rows: 2, cols: 1 },
  { id: '2x2', name: '2×2 Grid', rows: 2, cols: 2 },
  { id: '1+2', name: '1 + 2', rows: 2, cols: 2, merged: 'top' },
  { id: '2+1', name: '2 + 1', rows: 2, cols: 2, merged: 'right' },
  { id: '3-up', name: '3-up', rows: 1, cols: 3 },
  { id: '3x3', name: '3×3 Grid', rows: 3, cols: 3 },
];
```

---

## Component Structure

### File Organization
```
src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/
├── LayoutTab.jsx                 # Main component (refactor existing)
├── LayoutTab.scss                # Styles
├── hooks/
│   └── useLayoutTab.js           # State management hook
├── components/
│   ├── CanvasMap/
│   │   ├── CanvasMap.jsx         # Interactive canvas visualization
│   │   ├── CanvasMap.scss
│   │   └── CanvasMapControls.jsx # Zoom, layer toggles, size controls
│   ├── ViewGroupEditor/
│   │   ├── ViewGroupEditor.jsx   # Drill-in detail editor
│   │   ├── ViewGroupEditor.scss
│   │   ├── CellGrid.jsx          # Editable cell layout
│   │   └── LayoutPickerPanel.jsx # Floating layout selector
│   ├── Lists/
│   │   ├── ViewGroupListItem.jsx # List item with actions
│   │   ├── ViewportListItem.jsx  # Viewport list item
│   │   └── ViewListItem.jsx      # View item (in drill-in mode)
│   ├── MultiSelect/
│   │   ├── MultiSelectBar.jsx    # Action bar when items selected
│   │   └── ViewRemovalConfirmation.jsx # Floating confirmation card
│   └── Templates/
│       ├── TemplatesTabContent.jsx
│       ├── QuickLayoutsSection.jsx
│       └── SavedLayoutsSection.jsx
└── constants/
    └── layouts.js                # BUILTIN_LAYOUTS, VIEWGROUP_COLORS
```

---

## Component Specifications

### 1. LayoutTab (Main Container)
**Location:** `LayoutTab.jsx`

```jsx
// Structure
<div className="layout-tab">
  <PanelHeader icon="layoutGrid" title="Layout" accent="teal" />
  
  <CanvasMapContainer 
    // Persistent top section (like Starred in Files)
    // Collapsible, resizable via drag handle
    // Shows either CanvasMap OR ViewGroupEditor (drill-in)
  />
  
  <TabSelector 
    tabs={['viewgroups', 'viewports', 'templates']}
    // In drill-in mode: ViewGroups tab shows "Views" with color dot
  />
  
  <TabContent>
    {/* ViewGroups/Views list OR Viewports list OR Templates */}
  </TabContent>
  
  <PanelFooter>
    <HelpButton />
    <SaveLayoutButton />
  </PanelFooter>
</div>
```

### 2. CanvasMapContainer
**Features:**
- Collapsible header with chevron
- Resizable via drag handle at bottom
- Layer visibility toggles (ViewGroups, Viewports)
- Zoom controls (50%-150%)
- Canvas size controls (rows/cols 1-10)
- Switches between CanvasMap and ViewGroupEditor based on `drillInViewGroupId`

**States:**
- Normal: Shows canvas map with ViewGroups and Viewports
- Drill-in: Shows ViewGroupEditor for selected ViewGroup

### 3. CanvasMap
**Interactions:**
- Click ViewGroup → Select (syncs with list)
- Double-click ViewGroup → Drill into editor
- Click Viewport → Select
- Drag layout from Templates → Drop to create new ViewGroup
- Drop zone indicator shows position

**Visual Elements:**
- Grid background (subtle lines)
- ViewGroups: Colored rectangles with name labels, dashed border if empty
- Viewports: Cyan border (solid=snap, dashed=free), name label with star if primary
- Selected items have glow effect

### 4. ViewGroupEditor (Drill-In Mode)
**Header:**
- Back button (←)
- Color dot + Editable name
- Linked indicator (if linked)
- Layout name + view count

**Layout Picker Bar:**
- 7 quick layout thumbnails
- "More" button → LayoutPickerPanel (floating)
- Shows all built-in + custom layouts
- "Save current as template" option

**Cell Grid:**
- Large editable cells (70px+ min height)
- Empty cells show "+" and "Empty" text
- Filled cells show View icon + name
- Click to select, selection has amber highlight

**Floating Action Bar:**
- Appears when 1+ cells selected
- Position: bottom center, floating
- Actions: Merge, Split, Add View, Remove
- Shows "N selected" count

### 5. ViewGroupListItem
**Normal Mode:**
- Layout preview thumbnail
- Name (double-click to rename)
- Layout name + view count + "dbl-click to edit" hint
- "empty" badge if no views
- Hover actions: Duplicate, Settings, Delete

**Multi-Select Mode:**
- Checkbox on left
- No hover actions (use action bar instead)

### 6. ViewportListItem
- Name + Primary badge + Shared badge
- Size + Mode (Snap/Free)
- Mode icon (Magnet or Move3D)
- Hover actions: Share toggle, Duplicate, Settings, Delete

### 7. MultiSelectBar (ViewGroups)
**Trigger:** "Select Multiple" toggle in list header
**Actions when 2+ selected:**
- **Combine**: Flatten into single ViewGroup (preserves internal layouts)
- **Link**: Create view-level sync between ViewGroups
- **Swap**: Exchange canvas positions (2 only)
- **Match**: Make all same canvas size
- **Delete**: Batch delete

**Visual:** Purple accent, shows "N selected", "Done" button to exit

### 8. ViewRemovalConfirmation
**Trigger:** Changing layout when current views > new layout capacity
**Type:** Floating card (not modal) - VR friendly
**Content:**
- Warning icon + "Views Will Be Removed"
- Explanation text
- List of all views with checkboxes
- Pre-selected: last N views (N = views to remove)
- User can change selection
- "Cancel" / "Remove & Apply" buttons

### 9. LayoutPickerPanel
**Trigger:** "More" button in ViewGroupEditor
**Type:** Floating panel (anchored to button)
**Content:**
- "Choose Layout" header with close button
- Built-in section: 4-column grid of thumbnails
- Custom section: 4-column grid (if any exist)
- "Save current as template..." button

### 10. TemplatesTabContent
**Two sections (collapsible):**

**Quick Layouts:**
- Built-in layouts (drag or click)
- Custom layouts (drag or click, deletable)
- "+ New Custom Layout" button
- In drill-in mode: Shows hint "Click to apply layout to [ViewGroup]"

**Saved Layouts:**
- Filter: All / Full / Structure
- List of saved templates with type badge
- "Save Current Canvas as Template" button

---

## Accessibility Requirements (VR-First)

### Text Sizes (Minimum 12px)
```scss
$text-xs: 11px;   // Only for badges/counts
$text-sm: 12px;   // Minimum body text
$text-md: 13px;   // Standard body
$text-lg: 14px;   // Emphasized text
$text-xl: 15px;   // Headers
```

### Touch Targets
- All interactive elements: 36px minimum height
- Buttons with text: 36px+ height
- Icon-only buttons: 32px+ (but grouped for easier targeting)

### VR Patterns
- No hover-dependent features (provide alternatives)
- Selection + Action Bar pattern for multi-item operations
- Floating cards instead of modals
- No right-click required

---

## State Management

### useLayoutTab Hook
```javascript
const useLayoutTab = (workspaceId) => {
  // Data state
  const [viewGroups, setViewGroups] = useState([]);
  const [canvas, setCanvas] = useState({ rows: 4, cols: 4, viewGroupPositions: [] });
  const [viewports, setViewports] = useState([]);
  const [customLayouts, setCustomLayouts] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  
  // Selection state
  const [selectedViewGroupId, setSelectedViewGroupId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [drillInViewGroupId, setDrillInViewGroupId] = useState(null);
  
  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedViewGroupIds, setSelectedViewGroupIds] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('viewgroups');
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [mapHeight, setMapHeight] = useState(220);
  const [mapZoom, setMapZoom] = useState(100);
  const [showViewGroups, setShowViewGroups] = useState(true);
  const [showViewports, setShowViewports] = useState(true);
  
  // Derived
  const allLayouts = useMemo(() => [...BUILTIN_LAYOUTS, ...customLayouts], [customLayouts]);
  const drillInViewGroup = useMemo(() => viewGroups.find(vg => vg.id === drillInViewGroupId), [viewGroups, drillInViewGroupId]);
  
  // ... handlers
  
  return {
    // State
    viewGroups, canvas, viewports, customLayouts, savedTemplates,
    selectedViewGroupId, selectedViewportId, drillInViewGroupId,
    multiSelectMode, selectedViewGroupIds,
    activeTab, mapCollapsed, mapHeight, mapZoom, showViewGroups, showViewports,
    
    // Derived
    allLayouts, drillInViewGroup,
    
    // Handlers
    handleSelectViewGroup, handleSelectViewport,
    handleDrillIn, handleDrillOut,
    handleUpdateViewGroup, handleChangeLayout,
    handleAddViewGroup, handleDropLayout, handleDeleteViewGroup, handleDuplicateViewGroup,
    handleToggleViewGroupCheck, handleCombineViewGroups, handleLinkViewGroups,
    handleSwapViewGroups, handleMatchSizeViewGroups, handleDeleteSelectedViewGroups,
    handleDuplicateViewport, handleDeleteViewport, handleToggleShareViewport,
    // ... etc
  };
};
```

---

## Key Interactions

### 1. ViewGroup Combine (Flatten)
When combining multiple ViewGroups:
1. Calculate bounding rectangle on canvas
2. Create new ViewGroup with custom layout matching the spatial arrangement
3. Preserve all Views in their relative positions
4. Remove original ViewGroups
5. Select new combined ViewGroup

### 2. ViewGroup Link (View-Level Sync)
When linking ViewGroups:
1. Establish links between corresponding Views (V1↔V4, V2↔V5, etc.)
2. Changes to one View propagate to linked counterpart
3. Useful for: Duplicate ViewGroup → place in two locations → keep synchronized

### 3. Viewport Share
When sharing a viewport:
1. Toggle `isShared` flag
2. Collaborators can see exactly what you see
3. Shows "👥 Shared" badge in list

### 4. Layout Change with View Removal
When changing to a smaller layout:
1. Calculate views to remove (current - new capacity)
2. Show ViewRemovalConfirmation card
3. Pre-select last N views for removal
4. User can change selection
5. On confirm: Remove selected views, apply new layout

---

## SASS Structure

```scss
// LayoutTab.scss

@use '@styles/tokens' as *;
@use '@styles/mixins' as *;

.layout-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: $bg-secondary;
  
  &__content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

// Canvas Map
.canvas-map-container {
  flex-shrink: 0;
  border-bottom: 1px solid $border-subtle;
  
  &__header {
    @include flex-between;
    padding: $spacing-sm $spacing-md;
    background: $bg-glass;
    min-height: 44px;
  }
  
  &__controls {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }
  
  &__content {
    overflow: hidden;
  }
  
  &__resize-handle {
    height: 12px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &::after {
      content: '';
      width: 40px;
      height: 4px;
      background: $border-default;
      border-radius: 2px;
    }
    
    &:hover::after,
    &--active::after {
      background: $accent-purple;
    }
  }
}

// ViewGroup Editor
.viewgroup-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: $bg-tertiary;
  
  &__header {
    @include flex-between;
    padding: $spacing-sm $spacing-md;
    border-bottom: 1px solid var(--vg-color, $accent-purple);
    background: rgba(var(--vg-color-rgb), 0.15);
  }
  
  &__layout-bar {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border-bottom: 1px solid $border-subtle;
  }
  
  &__grid {
    flex: 1;
    padding: $spacing-md;
    position: relative;
  }
}

// Floating Action Bar
.floating-action-bar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 30;
  
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  
  background: rgba($bg-secondary, 0.95);
  border: 1px solid $border-strong;
  border-radius: $radius-lg;
  backdrop-filter: blur(12px);
  box-shadow: $shadow-xl;
}

// Multi-Select Bar
.multi-select-bar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  margin: $spacing-sm;
  
  background: rgba($accent-purple, 0.1);
  border: 1px solid rgba($accent-purple, 0.4);
  border-radius: $radius-md;
}

// View Removal Confirmation (Floating Card)
.view-removal-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  
  width: 380px;
  background: $bg-secondary;
  border: 1px solid $border-strong;
  border-radius: $radius-xl;
  box-shadow: $shadow-2xl;
  overflow: hidden;
  
  &__header {
    @include flex-start;
    gap: $spacing-sm;
    padding: $spacing-md;
    background: rgba($accent-amber, 0.15);
    border-bottom: 1px solid $border-subtle;
  }
  
  &__content {
    padding: $spacing-md;
  }
  
  &__view-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }
  
  &__view-item {
    @include flex-start;
    gap: $spacing-md;
    padding: $spacing-md;
    border-radius: $radius-lg;
    cursor: pointer;
    min-height: 48px;
    
    background: $bg-glass;
    border: 1px solid $border-subtle;
    
    &--selected {
      background: rgba($accent-red, 0.15);
      border-color: $accent-red;
    }
  }
  
  &__actions {
    display: flex;
    gap: $spacing-md;
    padding: $spacing-md;
    border-top: 1px solid $border-subtle;
  }
}
```

---

## Integration Points

### Y.js Collaboration (Future)
The following should sync via Y.js:
- `yCanvas` - Canvas size and ViewGroupPositions
- `yViewGroups` - ViewGroup data
- `yViewports` - Viewport data (with `isShared` for collaboration)

### Instance Type Handler
Views connect to the existing InstanceTypeHandler system:
```javascript
const VIEW_TYPE_HANDLERS = {
  vtk: VTKInstanceTypeHandler,
  volume: VolumeInstanceTypeHandler,
  slice: SliceInstanceTypeHandler,
  // ... etc
};
```

### Existing Components to Reuse
- `Icon` from `@UI/react/components/atoms`
- `useAdaptive()` hook from `@UI/react/context`
- `ResizableSections` pattern from Files Tab
- Design tokens from `@styles/tokens`

---

## Implementation Order

### Phase 1: Foundation
1. Create constants file with BUILTIN_LAYOUTS, VIEWGROUP_COLORS
2. Create useLayoutTab hook with state management
3. Create basic LayoutTab structure with tabs

### Phase 2: Canvas Map
1. CanvasMap component with grid visualization
2. ViewGroup rendering on canvas
3. Viewport rendering on canvas
4. Canvas size controls
5. Zoom and layer toggles
6. Collapsible/resizable container

### Phase 3: Lists
1. ViewGroupListItem with hover actions
2. ViewportListItem with hover actions
3. ViewListItem for drill-in mode
4. Selection handling

### Phase 4: ViewGroup Editor
1. ViewGroupEditor container
2. CellGrid with selection
3. FloatingActionBar
4. LayoutPickerPanel
5. ViewRemovalConfirmation

### Phase 5: Multi-Select
1. Multi-select toggle and state
2. ViewGroupMultiSelectBar
3. Combine logic
4. Link logic
5. Swap logic

### Phase 6: Templates Tab
1. QuickLayoutsSection
2. SavedLayoutsSection
3. Drag-to-canvas functionality
4. Contextual behavior (click in drill-in mode)

### Phase 7: Polish
1. Animations and transitions
2. Keyboard navigation
3. VR mode testing
4. Accessibility audit

---

## Testing Checklist

- [ ] ViewGroup CRUD (create, read, update, delete)
- [ ] Viewport CRUD
- [ ] Canvas size adjustment
- [ ] Drill-in and back navigation
- [ ] Cell selection in editor
- [ ] Layout change with view removal
- [ ] Multi-select mode toggle
- [ ] Combine ViewGroups
- [ ] Link ViewGroups
- [ ] Swap ViewGroups (2 only)
- [ ] Share viewport toggle
- [ ] Drag layout to canvas
- [ ] Templates tab contextual behavior
- [ ] Inline rename (double-click)
- [ ] Keyboard navigation
- [ ] VR mode (44px targets, no hover)
- [ ] Responsive at different panel widths

---

## Reference Files

1. **Prototype:** `/mnt/project/LayoutTabV4-6.jsx` or `/mnt/user-data/outputs/LayoutTabV4-6.jsx`
2. **Previous Memory Logs:**
   - `Layout_Tab_V4_Drill_In_Templates_Session_Memory_Log.md`
   - `Layout_Tab_V3_Architecture_Session_Memory_Log.md`
   - `Layout_Tab_Redesign_Session_Memory_Log.md`
3. **Pattern References:**
   - `FilesTab.jsx` - Similar panel structure
   - `Atomic_Component_Decomposition_Spec.md` - Component patterns
   - `Floating_Workspace_Atomic_Design_Session_Memory_Log.md` - VR patterns

---

## Questions for Implementation

Before starting, clarify:
1. Should ViewGroups/Viewports persist to PostgreSQL or only Y.js?
2. Are there existing Y.js maps to integrate with?
3. What's the existing approach for workspace-scoped vs project-scoped data?
4. Are there existing color palette utilities to reuse?

---

*Handoff created: January 24, 2026*
*Prototype version: V4.6*
*Ready for implementation*
