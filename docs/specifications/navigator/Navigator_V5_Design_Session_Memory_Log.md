# Navigator V5 Design Session Memory Log

**Date:** January 24, 2025  
**Session Focus:** Navigator Tab Redesign - Clean Scope Definition  
**Branch:** Beth-branch--server-authority

---

## Session Summary

This session finalized the Navigator V5 design by establishing a critical architectural boundary: **Navigator handles spatial navigation only, Instance Tools handles type-specific rendering controls.**

---

## Key Decisions Made

### 1. Scope Separation (CRITICAL)

**Navigator = Pure Spatial Navigation + View Organization**

| Keep in Navigator | Move to Instance Tools |
|-------------------|----------------------|
| D-pad navigation | Slice position slider |
| Position display | Window/Level sliders |
| Home position | Opacity slider |
| Viewport indicator | Camera presets |
| Zoom control | Camera rotation |
| Viewport/Canvas size | Flip H/V buttons |
| Collaborator cursors | Reset/Fit buttons |
| Focus mode toggle | |
| Minimap | |
| Views tab | |
| Bookmarks tab | |

### 2. Plugin Architecture Rationale

The decision was triggered by the question: *"Do we need the camera preset here or should that stay under instance tools since not all types have the camera function?"*

Analysis showed that even "common" controls aren't universal:

| Instance Type | Camera? | Slice? | W/L? | Opacity? |
|---------------|---------|--------|------|----------|
| VTK 3D Volume | ✅ | ✅ | ✅ | ✅ |
| VTK Mesh | ✅ | ❌ | ❌ | ✅ |
| 2D Slice View | ❌ | ✅ | ✅ | ✅ |
| Data Table | ❌ | ❌ | ❌ | ❌ |
| Plotly Chart | ❌ | ❌ | ❌ | Different |

**Principle:** If a control doesn't apply to ALL instance types, it belongs in Instance Tools.

### 3. ViewItem Component Reuse

Navigator's Views tab must use the existing ViewItem components:

```javascript
import { ViewItem, InactiveViewItem } from '@UI/react/components/molecules/ViewItem';
```

This ensures:
- Consistent appearance across Datasets Tab, Views Tab, Layout Panel
- Single source of truth for view rendering
- Status icons, drag/drop, context menu all come free

### 4. Three-Tab Structure

```
[🗺️ Map] [👁️ Views] [🔖 Marks]
```

- **Map (Minimap):** Spatial navigation with D-pad, position, zoom
- **Views:** Search/filter view list using ViewItem components
- **Bookmarks:** Saved camera/view states (future feature)

### 5. Focus Modes

- **Groups mode:** Minimap shows ViewGroups as colored regions
- **Views mode:** Minimap shows individual views within groups

---

## Files Created

### Prototypes
| File | Description |
|------|-------------|
| `/mnt/user-data/outputs/NavigatorMinimal.jsx` | Minimal working prototype (120 lines) |
| `/mnt/user-data/outputs/NavigatorV5-Working.jsx` | Full feature prototype (~650 lines) |
| `/mnt/user-data/outputs/NavigatorV5-ViewItem.jsx` | Extended prototype (superseded) |
| `/mnt/user-data/outputs/NavigatorV5-Final.jsx` | Previous version (superseded) |

### Documentation
| File | Description |
|------|-------------|
| `/mnt/user-data/outputs/Navigator_V5_Claude_Code_Handoff.md` | Complete handoff for Claude Code |

---

## Component Architecture

```
NavigatorTab/
├── NavigatorTab.jsx
├── NavigatorTab.scss
├── NavigatorTab.logic.js
├── index.js
└── components/
    ├── MinimapGrid/
    ├── DPadControls/
    ├── SizeControls/
    ├── ViewsPanel/
    └── BookmarksPanel/
```

---

## Data Shapes Defined

### View (matches ViewItem interface)
```typescript
interface View {
  id: string;
  name: string;
  color: string;
  datasetId: string;
  instanceType: string;
  position: string | null;
  groupId: string | null;
  starredWorkspace?: boolean;
  starredPersonal?: boolean;
  isShared?: boolean;
  isLocked?: boolean;
  linkedCount?: number;
}
```

### Navigator State
```typescript
interface NavigatorState {
  activeTab: 'minimap' | 'views' | 'bookmarks';
  focusMode: 'groups' | 'views';
  selectedGroupId: string | null;
  selectedViewId: string | null;
  currentPosition: { row: number; col: number };
  homePosition: { row: number; col: number };
  isSettingHome: boolean;
  zoomLevel: number;
  viewportSize: { rows: number; cols: number };
  canvasSize: { rows: number; cols: number };
  searchQuery: string;
  viewFilter: 'all' | 'active' | 'inactive' | 'starred' | 'linked';
}
```

---

## Integration Points

1. **CanvasGrid** - Viewport position/size synchronization
2. **ViewConfigurationManager** - View/group data
3. **Presence system** - Collaborator positions
4. **Y.js** - Real-time state sync

---

## Next Steps

1. **Instance Tools Tab Redesign** - Create type-aware control panel
2. **InstanceTypeHandler queries** - Add `hasSliceControl()`, `hasCameraControl()`, etc.
3. **Control composition** - Dynamically build UI based on type capabilities

---

## Questions Deferred

1. ViewGroups storage: Y.js vs derived from positions?
2. Bookmark camera serialization per instance type?
3. Navigator ↔ CanvasGrid connection: Direct or via manager?

---

## Related Documents

- `Atomic_Component_Decomposition_Spec.md` - Component patterns
- `Floating_Workspace_Atomic_Design_Session_Memory_Log.md` - Panel design
- `Files_Tab_Claude_Code_Handoff.md` - Similar handoff pattern
- `Layout_Tab_V4-6_Claude_Code_Handoff.md` - Layout tab reference

---

## Continuation Prompt

```
I'm continuing the CIA Web Navigator V5 implementation. 

Please search project knowledge for:
- Navigator_V5_Design_Session_Memory_Log.md (this document)
- Navigator_V5_Claude_Code_Handoff.md
- Atomic_Component_Decomposition_Spec.md
- ViewItem component in src/ui/react/components/molecules/ViewItem/

Previous session established:
1. Navigator = spatial navigation ONLY (no type-specific controls)
2. Type-specific controls (slice, W/L, camera, opacity) → Instance Tools
3. Must reuse ViewItem/InactiveViewItem components
4. Three tabs: Minimap | Views | Bookmarks
5. Focus modes: Groups vs Views

I'd like to [implement Navigator / design Instance Tools / etc.].
```

---

*Memory log created: January 24, 2025*
