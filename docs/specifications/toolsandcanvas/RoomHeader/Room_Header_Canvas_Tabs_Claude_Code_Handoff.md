# Room Header & Canvas Tabs Bar - Claude Code Handoff

**Created:** January 25, 2026  
**Prototype:** `canvas-comprehensive-v3.jsx`  
**Branch:** Beth-branch--server-authority

---

## Overview

This handoff covers the implementation of the Room Header, Canvas Tabs Bar, and related canvas chrome UI components. These form the upper navigation layer of the CIA Web application, managing rooms, workspaces, voice channels, and canvas window arrangements.

---

## 1. Application Hierarchy

```
PROJECT (App Level)
├── Room (collaborative space with voice channel)
│   ├── Workspace (canvas window - contains ViewGroups)
│   │   ├── ViewGroup (collection of linked views)
│   │   │   └── View (single visualization)
│   │   └── 🎙️ Workspace Breakout (optional ephemeral voice sub-channel)
│   └── 🎙️ Room Voice Channel (primary)
├── Popout Window (ephemeral, single View focus)
└── Personal Room (private, no voice by default)
```

---

## 2. Component Architecture

### 2.1 Room Header

**Location:** `src/ui/react/components/organisms/RoomHeader/`

**Purpose:** Room-level navigation, voice controls, presence, chat access

**Props Interface:**
```typescript
interface RoomHeaderProps {
  rooms: Room[];
  viewingRoomId: string;
  voiceRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onJoinVoice: (roomId: string) => void;
  onLeaveVoice: () => void;
  onSwitchVoice: (roomId: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  unreadMessages: number;
  onOpenChat: () => void;
}

interface Room {
  id: string;
  name: string;
  color: string;
  usersOnline: number;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Room Tabs...] [+N more ▼] [+]  │ 👥 5 │ 🎙️ In: Lab Meeting ▼ │ 🔇 │ 💬   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Behaviors:**
- Viewing room tab shows 👁️ icon (cyan)
- Voice room tab shows 🎙️ icon (green)
- Both icons shown when viewing AND in voice for same room
- Viewing room always prioritized first in tab order
- Max 3 visible tabs, overflow in dropdown
- Voice dropdown: switch rooms OR leave voice entirely
- Switching voice auto-navigates to that room

---

### 2.2 Canvas Tabs Bar

**Location:** `src/ui/react/components/organisms/CanvasTabsBar/`

**Purpose:** Workspace management, canvas mode switching, popout/breakout management

**Props Interface:**
```typescript
interface CanvasTabsBarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (type: 'empty' | 'subset' | 'scratch') => void;
  onOpenWorkspace: (id: string) => void;
  onCloseWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onReorderWorkspaces: (draggedId: string, targetId: string) => void;
  mode: 'tile' | 'tabs';
  onModeChange: (mode: 'tile' | 'tabs') => void;
  popouts: Popout[];
  popoutManagerProps: PopoutManagerProps;
  breakoutManagerProps: BreakoutManagerProps;
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

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Main Analysis 🎙️] [Subset: Tumors ●] [+1▼] [+] │ [▤ Tile][◫ Tabs] │ [⧉2] [🎙️1] │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tab Types & Indicators:**
| Type | Icon | Prefix | Color |
|------|------|--------|-------|
| workspace | none | none | blue |
| subset | Filter | "Subset:" | amber |
| scratch | Pencil | none | green |

**Tab Behaviors:**
- Click → Select workspace
- Double-click → Inline rename
- Right-click → Context menu (Rename, Duplicate, Save as ViewGroup, Close)
- Drag → Reorder tabs
- Hover → Show close button [X] and drag handle
- 🎙️ icon → Workspace has active voice breakout
- ● amber dot → Unsaved changes

**[+] Create/Open Popover:**
```
┌─────────────────────────────────┐
│ CREATE NEW                      │
│ ○ Empty Workspace               │
│ ○ From Subset... (→ SubsetSelectorModal)
│ ○ Scratch Pad                   │
├─────────────────────────────────┤
│ OPEN EXISTING            [🔍]   │
│ • Comparison View        [open] │
│ • Patient Overview              │
│ (showing 3 of 8)     [View All] │
└─────────────────────────────────┘
```

---

### 2.3 Canvas Mode: Tile

**Location:** `src/ui/react/components/organisms/TiledCanvasView/`

**Purpose:** Display multiple workspaces side-by-side with resizable dividers

**Constraints:**
- Maximum 4 canvases visible at once
- Minimum canvas size: 280px × 200px
- Divider drag ratio: 20% - 80%

**Layout Patterns:**
```
1 canvas:  [████████████████]

2 canvases: [████████│████████]  (horizontal split)

3 canvases: [████│████]
            [████│████]  (2×2 with one empty)

4 canvases: [████│████]
            [────┼────]
            [████│████]
```

**Divider Behavior:**
- Drag to resize (both horizontal and vertical)
- Visual feedback: cyan highlight on drag
- Respects minimum canvas dimensions

**Mini Canvas Header (per canvas in tile mode):**
```
┌─────────────────────────────────────────────────┐
│ [Type?] [●?] Main Analysis  [🎙️ 3] [⛶] [X]    │
└─────────────────────────────────────────────────┘
```
- Type icon (Filter for subset, Pencil for scratch)
- Unsaved indicator (● amber)
- Name (truncated)
- Breakout badge with user count + join action
- Maximize button
- Close button (hover reveal)

---

### 2.4 Canvas Mode: Tabs

**Location:** `src/ui/react/components/organisms/TabbedCanvasView/`

**Purpose:** Display single workspace full-size

**Full Canvas Header:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Type?] [●?] Main Analysis │ 🎙️ Breakout (3) [Join/Leave] │ [Grid][Groups][⛶] │ [X] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.5 Popout Windows

**Location:** `src/ui/react/components/molecules/PopoutWindow/`

**Purpose:** Ephemeral floating windows for focused view examination

**Props Interface:**
```typescript
interface PopoutWindowProps {
  popout: Popout;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onClose: () => void;
  isFocused: boolean;
  onFocus: () => void;
  snapEnabled: boolean;
  gridSnapEnabled: boolean;
  containerBounds: { width: number; height: number } | null;
}

interface Popout {
  id: string;
  viewName: string;
  viewType: string;
  color: string;
}
```

**Behaviors:**
- Drag header to move
- Drag corner handle to resize
- Minimum size: 200px × 150px
- Focus state: cyan border + glow, higher z-index
- Click anywhere on canvas to unfocus popout

**Snap Behavior:**
| Snap Type | Trigger | Visual |
|-----------|---------|--------|
| Edge | Within 20px of container edge | Dashed cyan border |
| Corner | Near two edges simultaneously | Snaps to both |
| Center | Near horizontal/vertical center | Snaps to center line |
| Grid | When grid snap enabled | 50px grid alignment |

**Snap Override:** Hold Shift while dragging to temporarily disable snap

---

### 2.6 Popout Manager

**Location:** `src/ui/react/components/molecules/PopoutManager/`

**Purpose:** Manage all active popout windows

**Only visible when popouts.length > 0**

**Dropdown Contents:**
```
┌─────────────────────────────────────┐
│ ACTIVE POPOUTS (2)                  │
├─────────────────────────────────────┤
│ ☑ Edge Snap   ☑ Grid Snap          │
│ 💡 Hold Shift to disable snap       │
├─────────────────────────────────────┤
│ ● Axial Slice          [↑] [✕]     │
│ ● 3D Volume            [↑] [✕]     │
├─────────────────────────────────────┤
│ [Tile All]        [Close All]       │
└─────────────────────────────────────┘
```

---

### 2.7 Breakout Manager

**Location:** `src/ui/react/components/molecules/BreakoutManager/`

**Purpose:** Manage workspace voice breakouts (sub-channels of room voice)

**Only visible when any open workspace has hasBreakout: true**

**Props Interface:**
```typescript
interface BreakoutManagerProps {
  workspaces: Workspace[];
  currentBreakoutId: string | null;
  onJoinBreakout: (workspaceId: string) => void;
  onLeaveBreakout: () => void;
}
```

**Dropdown Contents:**
```
┌─────────────────────────────────────┐
│ WORKSPACE BREAKOUTS (2)             │
├─────────────────────────────────────┤
│ 🎙️ Main Analysis     3    [Join]   │
│ 🎙️ Team Review       1    [Leave]  │  ← if currently in this one
└─────────────────────────────────────┘
```

---

## 3. Footer Integration

### 3.1 Footer 1: Interaction (44px)

**Popout Focus Behavior:**
- When popout is focused, view selector shows popout's view
- Selector becomes **locked** (non-interactive)
- Shows 🔒 and ⧉ icons to indicate locked/popout state
- "Popout focused" label appears

```
Normal:   [Undo][Redo] │ [● Axial Slice ▼] │ [Tools...] │ [Measurements] │ 🔧
Popout:   [Undo][Redo] │ [● Axial Slice 🔒⧉] │ [Tools...] │ [Measurements] │ 🔧
                                  ↑ locked, shows popout indicator
```

### 3.2 Footer 2: View & Canvas (40px)

No changes from previous design. Contains:
- Focus, Subset controls
- Universal actions (Snapshot, Reset View)
- Type-specific display options
- ViewGroup selector
- Links (Camera, Filters, Widgets, Cursors)
- VR button

---

## 4. State Management

### 4.1 Room State
```typescript
interface RoomState {
  viewingRoomId: string;      // Which room user is looking at
  voiceRoomId: string | null; // Which room user is in voice (can differ)
  isMuted: boolean;
  isDeafened: boolean;
}
```

### 4.2 Workspace State
```typescript
interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  mode: 'tile' | 'tabs';
  currentBreakoutId: string | null;  // Which workspace breakout user is in
}
```

### 4.3 Popout State
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

## 5. Integration Points

### 5.1 SubsetSelectorModal
- "From Subset..." in create popover should open existing `SubsetSelectorModal`
- Located at: `src/ui/react/components/modals/SubsetSelectorModal/`
- On confirm, creates new workspace of type 'subset'

### 5.2 Y.js Collaboration
- Workspace list should sync via Y.js for real-time updates
- Breakout presence should use Y.js awareness
- Popout state is **local only** (not collaborative)

### 5.3 LiveKit Voice
- Room voice channels managed by LiveKit
- Workspace breakouts are ephemeral LiveKit sub-rooms
- Join/leave triggers LiveKit room switching

### 5.4 InstanceTypeHandler
- Popout windows render single Views
- Should use existing instance rendering pipeline
- Mini toolbar removed - uses Footer 1 instead

---

## 6. Design Tokens

**VR-First Sizing:**
```typescript
const sizing = {
  touchTarget: 44,        // Minimum touch target
  touchTargetLg: 56,      // Large touch target
  iconSm: 14,
  iconMd: 16,
  iconLg: 20,
  iconStroke: 1.75,       // Thicker for VR visibility
  minCanvasWidth: 280,
  minCanvasHeight: 200,
  minPopoutWidth: 200,
  minPopoutHeight: 150,
};

const snap = {
  threshold: 20,          // Pixels to trigger snap
  gridSize: 50,           // Grid snap increment
};
```

**Colors:** Use existing design tokens from `styles/tokens/`

---

## 7. File Structure

```
src/ui/react/components/
├── organisms/
│   ├── RoomHeader/
│   │   ├── RoomHeader.jsx
│   │   ├── RoomHeader.logic.js
│   │   ├── RoomHeader.scss
│   │   ├── RoomTab.jsx
│   │   └── VoiceDropdown.jsx
│   │
│   ├── CanvasTabsBar/
│   │   ├── CanvasTabsBar.jsx
│   │   ├── CanvasTabsBar.logic.js
│   │   ├── CanvasTabsBar.scss
│   │   ├── CanvasTab.jsx
│   │   ├── CreateOpenPopover.jsx
│   │   └── ModeToggle.jsx
│   │
│   ├── TiledCanvasView/
│   │   ├── TiledCanvasView.jsx
│   │   ├── TiledCanvasView.logic.js
│   │   ├── TiledCanvasView.scss
│   │   ├── MiniCanvasHeader.jsx
│   │   └── ResizableDivider.jsx
│   │
│   └── TabbedCanvasView/
│       ├── TabbedCanvasView.jsx
│       ├── TabbedCanvasView.scss
│       └── FullCanvasHeader.jsx
│
├── molecules/
│   ├── PopoutWindow/
│   │   ├── PopoutWindow.jsx
│   │   ├── PopoutWindow.logic.js (snap calculations)
│   │   └── PopoutWindow.scss
│   │
│   ├── PopoutManager/
│   │   ├── PopoutManager.jsx
│   │   └── PopoutManager.scss
│   │
│   └── BreakoutManager/
│       ├── BreakoutManager.jsx
│       └── BreakoutManager.scss
│
└── atoms/
    └── (existing: IconButton, Separator, Badge, etc.)
```

---

## 8. Implementation Order

1. **RoomHeader** - Room tabs, voice dropdown, presence
2. **CanvasTabsBar** - Workspace tabs, mode toggle, create popover
3. **TiledCanvasView** - Multi-canvas grid with resizable dividers
4. **TabbedCanvasView** - Single canvas with full header
5. **PopoutWindow** - Draggable, resizable, snapping windows
6. **PopoutManager** - Popout list and bulk actions
7. **BreakoutManager** - Workspace voice breakout controls
8. **Footer 1 Integration** - Popout focus locking behavior

---

## 9. Testing Checklist

- [ ] Room tabs prioritize viewing room first
- [ ] Voice/view icons display correctly for each room state
- [ ] Workspace tabs drag-to-reorder works
- [ ] Double-click rename with Enter/Escape handling
- [ ] Unsaved changes confirmation on close
- [ ] Tile mode respects minimum canvas sizes
- [ ] Tile dividers stop at 20%/80% limits
- [ ] Popout snap to edges, corners, center
- [ ] Shift+drag disables snap
- [ ] Grid snap aligns to 50px grid
- [ ] Popout resize respects minimum dimensions
- [ ] Footer 1 locks when popout focused
- [ ] Breakout join/leave updates indicators
- [ ] Create popover search filters workspaces

---

## 10. Prototype Reference

The complete interactive prototype is available at:
`canvas-comprehensive-v3.jsx`

This file contains all components in a single file for easy testing. Production implementation should split into the file structure above.
