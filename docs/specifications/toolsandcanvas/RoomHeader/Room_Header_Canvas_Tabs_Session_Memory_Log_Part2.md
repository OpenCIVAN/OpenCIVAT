# Room Header & Canvas Tabs Bar Design Session Memory Log (Part 2)

**Session Date:** January 25, 2026  
**Previous Session:** `Room_Header_Canvas_Footer_Session_Memory_Log.md`  
**Prototypes Created:** `canvas-tabs-bar-v1.jsx`, `canvas-tabs-bar-v2.jsx`, `canvas-comprehensive-v3.jsx`  
**Handoff Document:** `Room_Header_Canvas_Tabs_Claude_Code_Handoff.md`

---

## Session Overview

This session continued from the Room Header & Canvas Footer design, focusing on the Canvas Tabs Bar implementation, workspace management, voice breakout indicators, popout window behavior, and merging all components into a comprehensive prototype.

---

## 1. Canvas Tabs Bar Design (CONFIRMED)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Main Analysis 🎙️] [Subset: Tumors ●] [+1▼] [+] │ [▤ Tile][◫ Tabs] │ [⧉2] [🎙️1] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Tab Types
| Type | Icon | Prefix | Color | Notes |
|------|------|--------|-------|-------|
| workspace | none | none | blue | Standard workspace |
| subset | Filter | "Subset:" | amber | Can save as ViewGroup |
| scratch | Pencil | none | green | Personal, closeable |

### Tab Behaviors
- **Click** → Select workspace
- **Double-click** → Inline rename
- **Right-click** → Context menu
- **Drag** → Reorder tabs (visual: grip handle on hover)
- **Hover** → Show close button [X]
- **🎙️ icon** → Workspace has active voice breakout
- **● amber dot** → Unsaved changes

### Create/Open Popover ([+] button)
- **Create New:** Empty Workspace, From Subset..., Scratch Pad
- **Open Existing:** Searchable list of closed workspaces
- "From Subset..." opens existing SubsetSelectorModal

---

## 2. Voice Breakout Indicator Architecture (CONFIRMED)

### Three-Level Voice Indicator Pattern

| Level | Location | Shows | Interaction |
|-------|----------|-------|-------------|
| **Tab** | Canvas Tab | 🎙️ icon | Visual only |
| **Tab Bar** | Breakout Manager dropdown | List + counts | Join/Leave buttons |
| **Canvas Header** | Mini/Full header | Badge + controls | Join/Leave inline |

### Breakout Manager Dropdown
```
┌─────────────────────────────────────┐
│ WORKSPACE BREAKOUTS (2)             │
├─────────────────────────────────────┤
│ 🎙️ Main Analysis     3    [Join]   │
│ 🎙️ Team Review       1    [Leave]  │
└─────────────────────────────────────┘
```

### Canvas Header Breakout Display
**Tile Mode (Mini Header):**
```
│ Main Analysis  [🎙️ 3] [⛶] [X] │
                   ↑ Click to join
```

**Tabs Mode (Full Header):**
```
│ Main Analysis │ 🎙️ Breakout (3) [Join/Leave] │ ... │
```

---

## 3. Canvas Window Modes (CONFIRMED)

### Tile Mode
- Maximum 4 canvases visible
- Freeform resizable dividers
- Minimum canvas size: 280px × 200px
- Divider drag ratio: 20% - 80%
- Each canvas has own mini header with close button

### Tabs Mode
- Single canvas full-size
- Full header with all controls
- Close button in header

### Overlay Mode → REMOVED
- Replaced by Popout system
- Popouts are ephemeral View-level windows
- Not workspaces, just focused single views

---

## 4. Popout Window System (CONFIRMED)

### Characteristics
- **Ephemeral** - Not persisted, gone when closed
- **Single View** - Shows one View, not full workspace
- **Tools via Footer 1** - No mini toolbar in popout
- **Focus locks Footer 1** - View selector locked to popout's view

### Drag & Resize
- Drag header to move
- Drag corner handle to resize
- Minimum size: 200px × 150px

### Snap Behavior
| Snap Type | Behavior |
|-----------|----------|
| **Edge** | Snap to container edges (20px threshold) |
| **Corner** | Snap when near two edges |
| **Center** | Snap to horizontal/vertical center |
| **Grid** | Optional 50px grid alignment |

**Snap Override:** Hold Shift while dragging to temporarily disable

### Popout Manager
- Only visible when popouts exist
- Shows snap toggles (Edge Snap, Grid Snap)
- Lists all popouts with [↑ Bring to Front] [✕ Close]
- Bulk actions: Tile All, Close All

---

## 5. Footer 1 Popout Integration (CONFIRMED)

### Normal State
```
[Undo][Redo] │ [● Axial Slice ▼] │ [Pan][Zoom][Rotate]... │ [Measurements] │ 🔧
                     ↑ Dropdown to switch views
```

### Popout Focused State
```
[Undo][Redo] │ [● Axial Slice 🔒⧉] │ [Pan][Zoom][Rotate]... │ [Measurements] │ 🔧
                     ↑ Locked, shows lock + external link icons
             "Popout focused" label appears
```

Click on main canvas to unfocus popout and unlock selector.

---

## 6. Close Button Locations (CONFIRMED)

Close buttons now appear in both places:
1. **Tab** - Hover reveals X button
2. **Canvas Header** - Always visible X button (both mini and full headers)

Both trigger unsaved changes confirmation if workspace.hasChanges is true.

---

## 7. State Model

### Room State
```typescript
interface RoomState {
  viewingRoomId: string;
  voiceRoomId: string | null;
  isMuted: boolean;
}
```

### Workspace State
```typescript
interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  mode: 'tile' | 'tabs';
  currentBreakoutId: string | null;
}

interface Workspace {
  id: string;
  name: string;
  type: 'workspace' | 'subset' | 'scratch';
  isOpen: boolean;
  hasChanges: boolean;
  hasBreakout: boolean;
  breakoutUsers: number;
}
```

### Popout State (Local Only - Not Collaborative)
```typescript
interface PopoutState {
  popouts: Popout[];
  focusedPopoutId: string | null;
  snapEnabled: boolean;
  gridSnapEnabled: boolean;
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { width: number; height: number }>;
}
```

---

## 8. Design Tokens Added

```typescript
const sizing = {
  touchTarget: 44,
  touchTargetLg: 56,
  iconSm: 14,
  iconMd: 16,
  iconLg: 20,
  iconStroke: 1.75,
  minCanvasWidth: 280,
  minCanvasHeight: 200,
  minPopoutWidth: 200,
  minPopoutHeight: 150,
};

const snap = {
  threshold: 20,
  gridSize: 50,
};
```

---

## 9. Files Created This Session

| File | Description |
|------|-------------|
| `canvas-tabs-bar-v1.jsx` | Initial Canvas Tabs Bar prototype |
| `canvas-tabs-bar-v2.jsx` | Added resize, reorder, close in header |
| `canvas-comprehensive-v3.jsx` | **Final** - Merged all components |
| `Room_Header_Canvas_Tabs_Claude_Code_Handoff.md` | Implementation guide for Claude Code |

---

## 10. Integration Points Identified

| Component | Integrates With | Notes |
|-----------|-----------------|-------|
| Create Popover | SubsetSelectorModal | "From Subset..." opens existing modal |
| Workspace List | Y.js | Real-time sync of workspace state |
| Breakout Presence | Y.js Awareness | Show who's in each breakout |
| Room Voice | LiveKit | Primary room channels |
| Workspace Breakouts | LiveKit | Ephemeral sub-rooms |
| Popout Rendering | InstanceTypeHandler | Uses existing instance pipeline |

---

## 11. Open Design Questions (For Future Sessions)

1. **ViewGroup Selector** - Full dropdown with search, Go To, inline actions (from previous session)
2. **Room tabs overflow** - Dropdown vs horizontal scroll? (using dropdown currently)
3. **Voice breakout auto-join** - When entering workspace with active breakout?
4. **Subset max views** - Fixed at 4 or configurable per context?
5. **Popout z-order** - Should "Tile All" arrange in consistent pattern?
6. **VR Popouts** - In VR, popouts become floating panels - how to arrange in 3D?

---

## 12. Decisions Made This Session

| Decision | Resolution | Rationale |
|----------|------------|-----------|
| Close button location | Both tab AND header | More intuitive, users look at header while working |
| Overlay mode | Removed, use Popouts | Simpler model - workspaces vs ephemeral views |
| Popout toolbar | Use Footer 1 instead | Consistent tools, popout is just focused view |
| Snap override | Shift+drag | Standard convention (Photoshop, etc.) |
| Voice indicators | Three-level pattern | Mirrors Room Header pattern, progressive detail |
| Breakout manager | In Canvas Tabs Bar | Near mode toggle and popout manager |
| Grid snap | Optional toggle | Some users want it, others find it restrictive |
| Tab rename | Inline double-click | Quick and discoverable |

---

## 13. Next Steps (For Future Sessions)

1. **ViewGroup Selector component** - Was listed as open item, not yet prototyped
2. **Canvas Header breadcrumb** - "Workspace > ViewGroup > View" navigation
3. **Recording/Playback UI** - Session recording for scientific reproducibility
4. **VR mode indicators** - How to show VR-specific UI states
5. **Permission indicators** - Guest view restrictions in canvas

---

## 14. Continuation Prompt

```
Room Header & Canvas Tabs Bar - Continuation Prompt (Part 3)

Previous Session Date: January 25, 2026

Context to Load:
Please read the following memory logs to restore context:
* `Room_Header_Canvas_Footer_Session_Memory_Log.md` (original session)
* `Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md` (this session)

Also reference:
* `Room_Header_Canvas_Tabs_Claude_Code_Handoff.md` (implementation guide)

Prototypes Created:
* `canvas-comprehensive-v3.jsx` - Merged prototype with all components

What We Built:
1. Room Header - Room tabs, voice dropdown, presence, chat
2. Canvas Tabs Bar - Workspace tabs, create/open popover, mode toggle
3. Tile/Tabs Modes - Resizable multi-canvas and single canvas views
4. Popout Windows - Draggable, resizable, snapping ephemeral views
5. Breakout Manager - Workspace voice sub-channel controls
6. Footer 1 Integration - Popout focus locking behavior

Key Decisions:
* Close buttons in both tabs AND canvas headers
* Voice breakouts use three-level indicator pattern (tab → manager → header)
* Popouts snap to edges, corners, center, or grid
* Shift+drag overrides snap
* Footer 1 view selector locked when popout focused

Open Items for Next Session:
1. ViewGroup Selector - Full dropdown component
2. Canvas breadcrumb navigation
3. VR mode UI adaptations
4. Permission/guest view indicators

Questions to Ask If Needed:
* Should I continue with ViewGroup Selector?
* Any changes to decisions in memory log?
* Ready to implement or more design refinement needed?
```

---

## Architecture Diagram (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ APP HEADER                                                          [User] ⚙️  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ROOM HEADER                                                                     │
│ [Main 👁️🎙️] [Analysis] [+2▼] [+]  │ 👥 5 │ 🎙️ In: Lab Meeting ▼ │ 🔇 │ 💬    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ CANVAS TABS BAR                                                                 │
│ [Main Analysis 🎙️] [Subset: Tumors ●] [+1▼] [+] │ [▤][◫] │ [⧉ 2] │ [🎙️ 1]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ CANVAS AREA (Tile Mode shown)                                                   │
│ ┌─────────────────────┬─────────────────────┐                                   │
│ │ Mini Header [🎙️][X] │ Mini Header [X]     │   ← Each canvas has header       │
│ │                     │                     │                                   │
│ │   Canvas 1          │   Canvas 2          │   ┌───────────┐                   │
│ │                     │                     │   │ Popout    │ ← Ephemeral       │
│ ├─────────────────────┼─────────────────────┤   │ Window    │   floating view   │
│ │ Mini Header [X]     │ Mini Header [X]     │   └───────────┘                   │
│ │                     │                     │                                   │
│ │   Canvas 3          │   Canvas 4          │                                   │
│ │                     │                     │                                   │
│ └─────────────────────┴─────────────────────┘                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FOOTER 1: INTERACTION (44px)                                                    │
│ [↶][↷] │ [● Axial Slice 🔒⧉] │ [Pan][Zoom][Rotate]... │ [Measure] │ 🔧 Tools   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FOOTER 2: VIEW & CANVAS (40px)                                                  │
│ [Focus][Subset▼] │ [📷][↻] │ [Display...] │ [▪ ViewGroup▼] │ 🔗 Links │ 🥽 VR  │
└─────────────────────────────────────────────────────────────────────────────────┘
```
