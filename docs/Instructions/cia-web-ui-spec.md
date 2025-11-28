# CIA Web UI Architecture Specification v5
## Server-Authority + Infinite Canvas + VR-First Design

**Purpose:** Comprehensive specification for Claude Code implementation
**Last Updated:** November 2024
**Status:** Ready for Implementation

---

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Data Models](#data-models)
3. [Canvas & Viewport System](#canvas--viewport-system)
4. [Subset/Focus Mode](#subsetfocus-mode)
5. [Workspace Hierarchy](#workspace-hierarchy)
6. [UI Component Structure](#ui-component-structure)
7. [VR Stubs & Architecture](#vr-stubs--architecture)
8. [Implementation Priority](#implementation-priority)

---

## Core Concepts

### Mental Model
The workspace is an **infinite pinboard canvas** that users navigate via a **viewport window**. Only views within the viewport render (GPU optimization). Users can create **subsets** to focus on specific views for deep analysis, which temporarily replace the viewport.

### Key Principles
1. **Server Authority** - All persistent state comes from server (auditing/compliance)
2. **VR-First** - Architecture designed for VR, implemented desktop-first for debugging
3. **Flexibility** - Minimal assumptions, validate with user studies
4. **Open Source** - Clean interfaces for contributors

### Three-Layer Data Model (Unchanged)
```
Dataset (Layer 1) → ViewConfiguration (Layer 2) → InstanceWindow (Layer 3)
     ↓                      ↓                            ↓
  Raw data            Collaborative state          Ephemeral renderer
  Annotations         Server-generated ID          Client-generated ID
  Immutable           Auditable, shareable         GPU resource, destroyable
```

---

## Data Models

### WorkspaceCanvas
Represents the infinite pinboard with view placements.

```typescript
interface WorkspaceCanvas {
  id: string;                    // Server-generated
  projectId: string;             // Parent project
  name: string;
  
  // Canvas dimensions (grows as needed)
  dimensions: {
    rows: number;                // Current max rows (starts 3, grows)
    cols: number;                // Current max cols (starts 3, grows)
  };
  
  // Ownership determines sharing level
  ownership: {
    type: 'personal' | 'breakout' | 'project';
    ownerId: string;             // UserId, BreakoutRoomId, or ProjectId
  };
  
  // View placements on the canvas
  placements: CanvasPlacement[];
  
  // Audit fields
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasPlacement {
  id: string;                    // Placement ID (server-generated)
  
  // Position on canvas grid
  row: number;
  col: number;
  rowSpan: number;               // Default 1, max 3
  colSpan: number;               // Default 1, max 3
  
  // What's placed here (union type)
  content: 
    | { type: 'view'; viewConfigurationId: string }
    | { type: 'notes'; notesBlockId: string }
    | { type: 'image'; imageBlockId: string }
    | { type: 'empty' };
  
  // For subset attachment
  subsetIds: string[];           // Which subsets include this placement
}
```

### NotesBlock
Research notes that can be placed on canvas.

```typescript
interface NotesBlock {
  id: string;                    // Server-generated
  projectId: string;
  
  title: string;
  content: string;               // Markdown supported
  
  // Visibility (like annotations)
  visibility: 'private' | 'shared';
  sharedWith: string[];          // UserIds or 'all'
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### ImageBlock
Reference images for research context.

```typescript
interface ImageBlock {
  id: string;                    // Server-generated
  projectId: string;
  
  title: string;
  imageUrl: string;              // S3/MinIO path
  caption?: string;
  
  // Visibility
  visibility: 'private' | 'shared';
  sharedWith: string[];
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Subset (Focus Group)
A saved selection of views for deep analysis.

```typescript
interface Subset {
  id: string;                    // Server-generated
  projectId: string;
  canvasId: string;              // Parent canvas
  
  name: string;
  description?: string;          // Research context
  
  // What's included
  placementIds: string[];        // References to CanvasPlacement.id
  
  // Optional attached context
  attachedNotes: string[];       // NotesBlock IDs
  attachedImages: string[];      // ImageBlock IDs
  
  // Visibility (can change post-creation)
  visibility: 'private' | 'shared';
  sharedWith: string[];
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### UserViewport
Ephemeral (not persisted) - tracks where user is looking.

```typescript
interface UserViewport {
  userId: string;
  canvasId: string;
  
  // Current viewport position
  row: number;
  col: number;
  rows: number;                  // Viewport height (2-4)
  cols: number;                  // Viewport width (2-4)
  
  // Active subset (if in focus mode)
  activeSubsetId: string | null;
  
  // Mode
  mode: 'desktop' | 'vr';
  vrState?: VRViewportState;     // VR-specific state
}

interface VRViewportState {
  isolated: boolean;             // In isolation mode?
  isolatedPlacementId?: string;  // Which view is isolated
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}
```

---

## Canvas & Viewport System

### Viewport Navigation
- **Snap scrolling**: Viewport always aligns to whole rows/columns
- **No partial views**: A view is either fully visible or not rendered
- **Keyboard**: Arrow keys move viewport by 1 row/col
- **Mini-map click**: Jump to clicked region
- **Mini-map drag**: Drag viewport indicator to pan

### Canvas Growth
```
Initial: 3×3 grid (9 slots)
         
User adds row → 4×3 grid (12 slots)
User adds column → 4×4 grid (16 slots)

Growth is explicit via UI buttons, not automatic.
Canvas can shrink if no views in removed row/col.
```

### View Spanning (Merge Cells)
- Views can span 1-3 rows and 1-3 columns
- Maximum span: 3×3 (one view taking full viewport)
- Resize via:
  - Drag corner handle on view
  - Layout panel controls
  - Right-click context menu

### Rendering Optimization
```
┌─────────────────────────────────────────────┐
│ CANVAS (5×4)                                │
│                                             │
│  ┌───┬───┬───┬───┬───┐                     │
│  │ D │ D │ D │   │   │  D = Dormant        │
│  ├───┼───┼───┼───┼───┤      (not rendered) │
│  │ D │ R │ R │ R │   │                     │
│  ├───┼───┼───┼───┼───┤  R = Rendering      │
│  │   │ R │ R │ R │   │      (in viewport)  │
│  ├───┼───┼───┼───┼───┤                     │
│  │   │   │   │   │   │  Green = viewport   │
│  └───┴───┴───┴───┴───┘                     │
│        └─────────┘                          │
│         Viewport                            │
└─────────────────────────────────────────────┘
```

---

## Subset/Focus Mode

### Creating a Subset
1. Enter selection mode (button in Layout panel)
2. Click views on grid OR mini-map to select
3. Click "Create Subset" → opens modal
4. Name the subset, add description
5. Optionally attach existing notes/images
6. Save → server creates Subset with placementIds

### Activating Focus Mode
1. Click "Focus" on a subset in Layout panel
2. Main viewport is **replaced** with subset views only
3. Subset views arranged in optimal grid (auto-layout)
4. "Exit Focus" returns to previous viewport position

### Subset Lifecycle
```
Create → Private by default
       ↓
Edit → Change name, description, attached context
       ↓
Share → Change visibility to 'shared'
       ↓
Collaborate → Others can view (not edit unless permitted)
       ↓
Archive/Delete → Soft delete for audit trail
```

### Subset as Research Artifact
When a subset is created, it captures:
- Which views were being examined
- Attached notes (observations, hypotheses)
- Attached images (reference materials)
- Who created it and when (audit)

This supports scientific reproducibility: "Here's exactly what I was looking at when I made this observation."

---

## Workspace Hierarchy

### Three Levels of Canvas

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROJECT ROOM (Shared Canvas)                                        │
│ • One canvas shared by all project members                          │
│ • Everyone sees the same layout                                     │
│ • Changes sync to all users                                         │
│ • Good for: presentations, group discussions                        │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ Users can spawn...
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BREAKOUT ROOM (Group Canvas)                                        │
│ • Subset of project members                                         │
│ • Own canvas layout for the group                                   │
│ • Changes sync within breakout only                                 │
│ • Good for: sub-team analysis, focused discussions                  │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ Each user also has...
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PERSONAL WORKSPACE (Private Canvas)                                 │
│ • Each user has their own                                           │
│ • Not visible to others                                             │
│ • Can pull views from project/breakout                              │
│ • Good for: personal exploration, draft analysis                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Switching Workspaces
- Tabs in top bar show available workspaces
- "Project Room", "Breakout: MRI Team", "My Workspace"
- New breakout rooms can be created on demand
- Each workspace has independent canvas state

### View Sharing Between Workspaces
- ViewConfigurations exist at Project level
- Can be placed on any canvas in the project
- Same view can appear on multiple canvases
- Changes to ViewConfiguration sync everywhere

---

## UI Component Structure

### Layout (Desktop)
```
┌────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                            │
│ [Logo] [Workspace Tabs] [Mode: Desktop/VR] [Viewport Info] [Users] │
├────┬───────────────────────────────────────────────────────┬───────┤
│ L  │                                                       │   R   │
│ E  │                 CENTER: WORKSPACE GRID                │   I   │
│ F  │                                                       │   G   │
│ T  │  ┌─────────┬─────┬─────┐                             │   H   │
│    │  │         │     │     │                             │   T   │
│ D  │  │  2×2    │ 1×1 │ 1×1 │                             │       │
│ A  │  │  view   │     │     │                             │   L   │
│ T  │  ├─────────┼─────┴─────┤                             │   A   │
│ A  │  │         │   2×1     │                             │   Y   │
│    │  │         │   wide    │                             │   O   │
│ P  │  └─────────┴───────────┘                             │   U   │
│ A  │                                                       │   T   │
│ N  │                                                       │   +   │
│ E  │                                                       │   C   │
│ L  │                                                       │   O   │
│    │                                                       │   L   │
│    │                                                       │   L   │
│    │                                                       │   A   │
│    │                                                       │   B   │
├────┴───────────────────────────────────────────────────────┴───────┤
│ STATUS BAR                                                         │
│ [Connected] [Rendering: 4] [Dormant: 5] [Cursors] [Mode] [Sync]   │
└────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy
```
CIAWebApp
├── TopBar
│   ├── Logo
│   ├── WorkspaceTabs
│   ├── ModeToggle (Desktop/VR)
│   ├── ViewportInfo
│   ├── UserAvatars
│   └── Actions (notifications, settings)
│
├── ThreeEdgeLayout
│   ├── LeftPanel (Data)
│   │   ├── DatasetsTab
│   │   ├── FilesTab
│   │   └── QuickAccessPanel
│   │
│   ├── CenterPanel
│   │   ├── GridHeader
│   │   │   ├── CanvasInfo
│   │   │   ├── ViewportSizeSelector
│   │   │   └── FocusModeIndicator
│   │   └── WorkspaceCanvas
│   │       ├── CanvasGrid
│   │       │   └── CanvasCell (for each visible slot)
│   │       │       ├── ViewInstanceWindow
│   │       │       ├── NotesBlockRenderer
│   │       │       ├── ImageBlockRenderer
│   │       │       └── EmptySlotPlaceholder
│   │       └── CanvasNavigationOverlay
│   │
│   └── RightPanel (Layout + Collab)
│       ├── LayoutTab
│       │   ├── MiniMap
│       │   ├── SelectionControls
│       │   ├── SubsetsList
│       │   └── CanvasActions
│       ├── PeopleTab
│       ├── VoiceTab
│       ├── ChatTab
│       └── ActivityTab
│
└── StatusBar
    ├── ConnectionStatus
    ├── RenderingStats
    ├── CursorToggle
    └── SyncStatus
```

### Right Panel Tab Structure
```
┌─────────────────────────────────────────┐
│  [Layout] [People] [Voice] [Chat]       │  ← Main tabs
├─────────────────────────────────────────┤
│                                         │
│  Layout Tab Content:                    │
│  ┌─────────────────────────────────────┐│
│  │ [Map] [Subsets]     ← Sub-tabs     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Map Sub-tab:                           │
│  • Mini-map with viewport indicator     │
│  • Selection mode toggle                │
│  • Create subset button                 │
│  • Canvas resize controls               │
│  • VR mode info (when active)           │
│                                         │
│  Subsets Sub-tab:                       │
│  • List of saved subsets                │
│  • Focus/Exit buttons                   │
│  • Share controls                       │
│  • Attached notes/images                │
│                                         │
└─────────────────────────────────────────┘
```

---

## VR Stubs & Architecture

### VR-First Design Principle
All components must consider VR from day one. Desktop implementation comes first for debugging, but architecture must support VR.

### VR Component Stubs

```typescript
// src/core/vr/VRManager.ts (stub)
export class VRManager {
  private mode: 'inactive' | 'grid' | 'isolated' = 'inactive';
  private isolatedViewId: string | null = null;
  
  // Stub methods - implement later
  async enterVR(): Promise<void> { /* TODO */ }
  async exitVR(): Promise<void> { /* TODO */ }
  
  enterIsolationMode(viewId: string): void { /* TODO */ }
  exitIsolationMode(): void { /* TODO */ }
  
  // Desktop can call these to prepare state
  getVRState(): VRState { /* TODO */ }
  isVRSupported(): boolean { return false; /* Check WebXR */ }
}

// src/core/vr/VRGridLayout.ts (stub)
export class VRGridLayout {
  // Curved grid surrounding user (Fiesta-style)
  private gridRadius: number = 3; // meters
  private gridCurvature: number = 0.3; // 0-1
  
  // Calculate 3D position for a canvas placement
  getWorldPosition(placement: CanvasPlacement): Vector3 { /* TODO */ }
  
  // Handle gaze/point selection
  getTargetedPlacement(ray: Ray): CanvasPlacement | null { /* TODO */ }
}

// src/core/vr/VRIsolationMode.ts (stub)
export class VRIsolationMode {
  private isolatedView: ViewConfiguration | null = null;
  private scale: number = 2.0; // Room-scale multiplier
  
  // Pull view to center, user can walk around
  isolateView(view: ViewConfiguration): void { /* TODO */ }
  
  // Return to grid
  returnToGrid(): void { /* TODO */ }
  
  // Desktop cursors visible in VR
  projectDesktopCursor(userId: string, screenPos: Vector2): Vector3 { /* TODO */ }
}

// src/core/vr/VRCursorSync.ts (stub)
export class VRCursorSync {
  // VR user's controller ray → visible to desktop users
  broadcastVRPointer(userId: string, ray: Ray): void { /* TODO */ }
  
  // Desktop user's mouse → visible to VR users as floating dot
  broadcastDesktopCursor(userId: string, worldPos: Vector3): void { /* TODO */ }
  
  // VR user's hand position (if hand tracking)
  broadcastHandPosition(userId: string, hand: 'left' | 'right', pos: Vector3): void { /* TODO */ }
}
```

### VR Data Flow
```
Desktop User                          VR User
     │                                    │
     │ Mouse move on view                 │ Controller point at model
     │         │                          │         │
     ▼         ▼                          ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Y.js Presence Layer                          │
│  yCursors: { odUserId: { position, mode, viewId, worldPos } }   │
└─────────────────────────────────────────────────────────────────┘
     │         │                          │         │
     ▼         ▼                          ▼         ▼
VR sees dot              Desktop sees ray indicator
on 3D model              projected onto 2D view
```

### Mode Toggle Component
```tsx
// src/ui/react/components/layout/ModeToggle.tsx
export function ModeToggle() {
  const [mode, setMode] = useState<'desktop' | 'vr'>('desktop');
  const vrSupported = useVRSupport(); // Check WebXR availability
  
  const handleVRClick = async () => {
    if (mode === 'desktop') {
      // TODO: Actually enter VR when implemented
      console.log('VR mode requested - stub');
      setMode('vr');
    } else {
      setMode('desktop');
    }
  };
  
  return (
    <div className="mode-toggle">
      <button 
        className={mode === 'desktop' ? 'active' : ''}
        onClick={() => setMode('desktop')}
      >
        <Monitor /> Desktop
      </button>
      <button 
        className={mode === 'vr' ? 'active' : ''}
        onClick={handleVRClick}
        disabled={!vrSupported}
        title={!vrSupported ? 'WebXR not available' : 'Enter VR'}
      >
        <Glasses /> VR Mode
      </button>
    </div>
  );
}
```

---

## Implementation Priority

### Phase 1: Canvas Foundation (Current Sprint)
1. ✅ WorkspaceCanvas data model
2. ✅ CanvasPlacement with spanning
3. ✅ Viewport navigation (snap scroll)
4. ✅ Mini-map component
5. ✅ Rendering optimization (only viewport views)

### Phase 2: Subsets & Focus Mode
1. Subset data model
2. Selection mode UI
3. Create subset flow
4. Focus mode (viewport replacement)
5. Exit focus (return to position)

### Phase 3: Notes & Images
1. NotesBlock data model + API
2. ImageBlock data model + API
3. Canvas placement for non-view content
4. Attach to subsets

### Phase 4: Workspace Hierarchy
1. Personal canvas per user
2. Breakout room canvases
3. Project room shared canvas
4. Workspace tabs + switching

### Phase 5: VR Implementation
1. Implement VR stubs
2. Grid layout in VR
3. Isolation mode
4. Cross-platform cursor sync
5. Hand tracking support

---

## API Endpoints (New)

```
# Canvas Management
GET    /api/projects/:projectId/canvases
POST   /api/projects/:projectId/canvases
GET    /api/canvases/:canvasId
PUT    /api/canvases/:canvasId
DELETE /api/canvases/:canvasId

# Placements
POST   /api/canvases/:canvasId/placements
PUT    /api/placements/:placementId
DELETE /api/placements/:placementId
PUT    /api/placements/:placementId/resize  # { rowSpan, colSpan }
PUT    /api/placements/:placementId/move    # { row, col }

# Subsets
GET    /api/canvases/:canvasId/subsets
POST   /api/canvases/:canvasId/subsets
GET    /api/subsets/:subsetId
PUT    /api/subsets/:subsetId
DELETE /api/subsets/:subsetId
PUT    /api/subsets/:subsetId/visibility    # { visibility, sharedWith }

# Notes & Images
POST   /api/projects/:projectId/notes
PUT    /api/notes/:noteId
DELETE /api/notes/:noteId

POST   /api/projects/:projectId/images
PUT    /api/images/:imageId
DELETE /api/images/:imageId
```

---

## File Structure (New/Modified)

```
src/
├── core/
│   ├── data/
│   │   ├── models/
│   │   │   ├── WorkspaceCanvas.js      # NEW
│   │   │   ├── CanvasPlacement.js      # NEW
│   │   │   ├── Subset.js               # NEW
│   │   │   ├── NotesBlock.js           # NEW
│   │   │   └── ImageBlock.js           # NEW
│   │   └── managers/
│   │       ├── CanvasManager.js        # NEW
│   │       ├── SubsetManager.js        # NEW
│   │       └── ContentBlockManager.js  # NEW (notes + images)
│   │
│   └── vr/                             # NEW directory
│       ├── VRManager.js                # Stub
│       ├── VRGridLayout.js             # Stub
│       ├── VRIsolationMode.js          # Stub
│       └── VRCursorSync.js             # Stub
│
└── ui/
    └── react/
        └── components/
            ├── layout/
            │   ├── ModeToggle/         # NEW
            │   └── WorkspaceTabs/      # NEW
            │
            ├── workspace/
            │   ├── CanvasGrid/         # NEW (replaces simple grid)
            │   ├── CanvasCell/         # NEW
            │   ├── MiniMap/            # NEW
            │   ├── ViewportNavigator/  # NEW
            │   └── SelectionOverlay/   # NEW
            │
            ├── content/                # NEW directory
            │   ├── NotesBlockRenderer/ # NEW
            │   └── ImageBlockRenderer/ # NEW
            │
            └── panels/
                └── LayoutPanel/        # NEW (right panel tab)
                    ├── MapSubTab/
                    └── SubsetsSubTab/
```

---

## Summary

This specification defines:
1. **Data models** for canvas, placements, subsets, notes, images
2. **Canvas system** with infinite pinboard, snap scrolling, view spanning
3. **Subset system** for focus mode with research context
4. **Workspace hierarchy** (personal, breakout, project)
5. **VR stubs** ready for implementation
6. **UI structure** with Layout panel on right side
7. **API endpoints** for all new entities
8. **File structure** for implementation

Ready for Claude Code implementation! 🚀
