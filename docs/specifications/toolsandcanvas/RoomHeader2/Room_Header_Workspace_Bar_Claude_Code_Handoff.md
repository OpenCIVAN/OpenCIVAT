# Room Header & Workspace Bar - Claude Code Implementation Handoff

## Overview

This document captures the architectural decisions and implementation specifications for the **Room Header** and **Workspace Bar (Canvas Tabs Bar)** components. These replace/enhance the existing `SecondaryHeader` component and integrate with the current canvas chrome architecture.

## Reference Files

### Prototype Artifact
- Location: `/mnt/user-data/outputs/room-header-clarified.jsx`
- Contains: Fully functional React prototype with all interactions

### Existing Code to Reference
- `src/ui/react/components/organisms/RoomPresenceIndicator/` - Existing room selector (partial reuse)
- `src/ui/react/hooks/useRoomIndicator.js` - Hook for room switching logic
- `src/ui/react/components/layout/SecondaryHeader/` - Deprecated, being replaced
- `src/ui/react/components/layout/SecondaryFooter/` - Deprecated, voice controls moving to Room Header
- `src/ui/react/components/canvas/CanvasWorkspace/` - Where workspace tabs integrate

### Session Memory Logs
- `/mnt/project/Room_Header_Canvas_Footer_Session_Memory_Log.md`
- `/mnt/project/Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md`

---

## Architecture Decision Summary

### Separation of Concerns

| Concept | Question It Answers | Where It Lives |
|---------|---------------------|----------------|
| **Viewing Room** | "What room's content am I looking at?" | Room Header → ROOM section |
| **Room Presence** | "How many people are in this room?" | Room Header → ROOM section (with viewing) |
| **Pinned Rooms** | "Quick access to my favorite rooms" | Room Header → PINNED section |
| **Voice Channel** | "Who am I talking to?" | Room Header → VOICE section |
| **Breakouts** | "Ephemeral workspace voice sub-channels" | Room Header VOICE dropdown + Workspace Bar BREAKOUTS manager |
| **Workspace Presence** | "Who sees my cursor/edits right now?" | Workspace tabs (badges on each tab) |
| **Popouts** | "Floating view windows" | Workspace Bar → POPOUTS manager |

### Key Insight: Viewing ≠ Voice

Users can view one room while being in voice for another room. This is intentional for scientific collaboration workflows (e.g., reviewing data in Room B while discussing with team in Room A's voice channel).

---

## Component Specifications

### 1. Room Header

**Location:** Below App Header, above Workspace Bar

**Height:** 62px total (18px section labels + 44px content)

#### Section Layout (Left to Right)

```
┌────────────────────────┬───────────────────┬─────────────────────────────┬──────┐
│         ROOM           │      PINNED       │           VOICE             │ CHAT │
├────────────────────────┼───────────────────┼─────────────────────────────┼──────┤
│ [👁️ Lab Meeting ▼] 👥5 │ [Pin1] [Pin2]     │ [🎧 Voice: Lab ▼] 🎤 🔊 📴  │  💬  │
└────────────────────────┴───────────────────┴─────────────────────────────┴──────┘
```

#### ROOM Section (width: ~180px)

**Components:**
1. **Viewing Dropdown** - Shows current room with Eye icon
   - Dropdown grouped by: Project Rooms, Breakouts, Personal
   - Each room shows: color dot, name, checkmark if viewing, mic icon if voice, user count
   - Pin icon on each room row to toggle pinned state
   - "Create Room" action at bottom

2. **Presence Indicator** - Shows user count for viewing room
   - Format: 👥 {count}
   - Positioned directly next to viewing dropdown
   - Answers: "How many people are in this room?"

#### PINNED Section (flex: 1, min-width: ~160px)

**Components:**
1. **Pinned Room Pills** - Compact buttons for quick room switching
   - Shows: color dot, truncated name (max ~50px), mic icon if voice active
   - Click to switch viewing to that room
   - Max pinned rooms: configurable (default 4)
   
2. **Empty State** - Shows "No pinned rooms" when empty

**Behavior:**
- Pinned rooms exclude the currently viewing room (no duplicate)
- Pin/unpin via dropdown or context menu

#### VOICE Section (width: ~260px)

**Two States:**

**A) Not in Voice:**
```
┌──────────────┬───┐
│ 📞 Join Voice │ ▼ │  ← Split button
└──────────────┴───┘
```
- Main button: Joins voice for viewing room
- Dropdown arrow: Opens room picker with:
  - Current room (highlighted as "Current")
  - Active Breakouts (if any)
  - Other Rooms (with voice user counts)

**B) In Voice:**
```
┌─────────────────────────────────────────┐
│ [🎧 Voice: Lab Meeting ▼] (3) │ 🎤 🔊 📴 │
└─────────────────────────────────────────┘
```
- Voice channel dropdown shows:
  - Room Voice section
  - Workspace Breakouts section (if any)
  - "Create Breakout from Workspace" action
  - "Leave Voice" action
- Controls: Mute, Deafen, Leave
- Green theme for room voice, Purple theme for breakout

#### CHAT Section (width: ~40px)

- Single chat icon button
- Opens floating room chat panel
- Unread indicator badge

---

### 2. Workspace Bar (Canvas Tabs Bar)

**Location:** Below Room Header, above Canvas Area

**Height:** 58px total (18px section labels + 40px content)

#### Section Layout

```
┌─────────────────────────────────────────────────┬────────┬─────────┬───────────┐
│                   WORKSPACE                     │  MODE  │ POPOUTS │ BREAKOUTS │
├─────────────────────────────────────────────────┼────────┼─────────┼───────────┤
│ [Main Analysis ⎇2 👥3] [Tumor ●] [Comp] [+]     │ [▤][◫] │ [⧉ 2]   │  [⎇ 1]    │
└─────────────────────────────────────────────────┴────────┴─────────┴───────────┘
```

#### WORKSPACE Section (flex: 1)

**Workspace Tabs:**
- Icon: Layers
- Name: Workspace name
- Badges (right side of name):
  - `●` amber dot = unsaved changes
  - `⎇ 2` purple = has active breakout with 2 users
  - `👥 3` cyan = 3 users viewing this workspace
- Active tab: elevated background, border
- Inactive tab: transparent background

**[+] Button:**
- Creates NEW WORKSPACE only
- NOT for breakouts (that's in Voice dropdown or Breakouts manager)
- Dashed border style

#### MODE Section (width: ~70px)

**Toggle Buttons:**
- Grid icon = Tile mode (show multiple workspaces tiled)
- Layers icon = Tabs mode (one workspace visible, tabs to switch)
- Active mode: cyan highlight

#### POPOUTS Section (conditional, width: ~60px)

**Only visible when popouts exist**

**Manager Button:**
- Icon: Copy/Maximize
- Count badge
- Opens dropdown with:
  - List of floating windows (name, focus, close buttons)
  - "Tile All" action
  - "Close All" action

#### BREAKOUTS Section (conditional, width: ~80px)

**Only visible when breakouts exist**

**Manager Button:**
- Icon: Split (⎇)
- Count badge
- Purple theme
- Opens dropdown with:
  - List of active breakouts (name, user count, Join button)
  - "Create Breakout for Current Workspace" action

---

## Data Models

### Room

```typescript
interface Room {
  id: string;
  name: string;
  color: string; // Hex color for visual identification
  type: 'main' | 'breakout' | 'personal';
  usersOnline: number; // Total users in room
  usersInVoice: number; // Users in voice channel
}
```

### Workspace

```typescript
interface Workspace {
  id: string;
  name: string;
  usersViewing: number; // Users with this workspace active
  hasChanges: boolean; // Unsaved changes indicator
  hasBreakout: boolean; // Has active voice breakout
  breakoutUsers: number; // Users in breakout (if exists)
}
```

### Breakout

```typescript
interface Breakout {
  id: string;
  name: string; // Usually matches workspace name
  workspaceId: string; // Source workspace
  usersInVoice: number;
  // Ephemeral - auto-closes when last user leaves
}
```

### Popout

```typescript
interface Popout {
  id: string;
  name: string; // View name
  viewId: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}
```

---

## State Management

### Room Header State

```typescript
interface RoomHeaderState {
  viewingRoomId: string;
  voiceRoomId: string | null;
  activeBreakoutId: string | null;
  pinnedRoomIds: string[];
  isMuted: boolean;
  isDeafened: boolean;
}
```

### Workspace Bar State

```typescript
interface WorkspaceBarState {
  activeWorkspaceId: string;
  canvasMode: 'tile' | 'tabs';
  popouts: Popout[];
  breakouts: Breakout[];
}
```

### Hooks to Create/Modify

1. **useRoomHeader** - Manages room viewing, pinning, voice state
2. **useVoiceChannel** - Voice connection, mute, deafen, breakouts
3. **useWorkspaceBar** - Workspace tabs, mode toggle
4. **usePopoutManager** - Floating window management
5. **useBreakoutManager** - Breakout creation, joining, lifecycle

---

## Interaction Behaviors

### Room Switching
- Click pinned room → Switch viewing to that room
- Select from dropdown → Switch viewing to that room
- Voice stays in current room unless explicitly changed

### Voice Channel
- "Join Voice" main button → Join viewing room's voice
- "Join Voice" dropdown → Pick any room or breakout
- Voice dropdown while in voice → Switch channels or leave
- Breakout creation → From Voice dropdown or Breakouts manager

### Workspace Tabs
- Click tab → Switch to that workspace
- [+] button → Create new workspace (modal or inline)
- Tab badges update in real-time (presence, changes, breakout status)

### Breakout Lifecycle
1. Created from: Voice dropdown or Breakouts manager
2. Named after: Source workspace
3. Listed in: Voice dropdown + Breakouts manager
4. Indicated on: Workspace tab (⎇ badge)
5. Joins: Via Voice dropdown or Breakouts manager
6. Ends: Auto-closes when last user leaves

---

## Styling Guidelines

### Section Labels Row
- Height: 18px
- Background: `tokens.colors.bg.tertiary`
- Font: 9px uppercase, letter-spacing 0.5px
- Color: `tokens.colors.text.muted`

### Content Row
- Height: 44px (Room Header) / 40px (Workspace Bar)
- Background: `tokens.colors.bg.secondary`
- Border bottom: 1px solid `tokens.colors.border.default`

### Section Dividers
- Width: 1px
- Color: `tokens.colors.border.subtle`
- Full height of content row

### Voice Active States
- Room voice: Green theme (`tokens.colors.accent.green`)
- Breakout voice: Purple theme (`tokens.colors.accent.purple`)
- Background: `{color}10` (10% opacity)
- Border: `{color}30` (30% opacity)

### Workspace Tab Badges
- Unsaved changes: Amber dot (6px)
- Breakout: Purple background, Split icon + count
- Presence: Cyan background, Users icon + count

---

## File Structure Recommendation

```
src/ui/react/components/
├── bars/
│   ├── RoomHeader/
│   │   ├── RoomHeader.jsx
│   │   ├── RoomHeader.logic.js (useRoomHeader hook)
│   │   ├── RoomHeader.scss
│   │   ├── RoomSection.jsx
│   │   ├── PinnedSection.jsx
│   │   ├── VoiceSection.jsx
│   │   ├── ChatSection.jsx
│   │   └── index.js
│   │
│   └── WorkspaceBar/
│       ├── WorkspaceBar.jsx
│       ├── WorkspaceBar.logic.js (useWorkspaceBar hook)
│       ├── WorkspaceBar.scss
│       ├── WorkspaceTab.jsx
│       ├── ModeToggle.jsx
│       ├── PopoutManager.jsx
│       ├── BreakoutManager.jsx
│       └── index.js
│
├── dropdowns/
│   ├── RoomPickerDropdown.jsx
│   ├── VoiceChannelDropdown.jsx
│   ├── JoinVoiceDropdown.jsx
│   └── ...
│
└── hooks/
    ├── useRoomHeader.js
    ├── useVoiceChannel.js
    ├── useWorkspaceBar.js
    ├── usePopoutManager.js
    └── useBreakoutManager.js
```

---

## Implementation Order

1. **Phase 1: Room Header Structure**
   - Create RoomHeader component shell
   - Implement section layout with labels
   - Wire up RoomSection with existing useRoomIndicator

2. **Phase 2: Viewing & Pinned**
   - Room dropdown with grouping
   - Pin/unpin functionality
   - Presence indicator

3. **Phase 3: Voice Section**
   - Join Voice split button
   - Voice channel dropdown
   - Mute/Deafen/Leave controls
   - Integrate with existing voiceService

4. **Phase 4: Workspace Bar**
   - Workspace tabs with badges
   - Mode toggle (tile/tabs)
   - [+] new workspace button

5. **Phase 5: Managers**
   - Popout manager dropdown
   - Breakout manager dropdown
   - Breakout creation flow

6. **Phase 6: Integration**
   - Replace SecondaryHeader usage
   - Wire to canvas chrome
   - Real-time presence updates via Y.js

---

## Testing Scenarios

1. **Room Switching** - View room A, voice in room B, switch viewing to C → Voice stays in B
2. **Pin Management** - Pin 4 rooms, try to pin 5th → Should be blocked or replace oldest
3. **Voice Join** - Not in voice → Click "Join Voice" → Should join viewing room
4. **Voice Picker** - Click dropdown arrow → Should show all rooms + breakouts
5. **Breakout Creation** - Create breakout → Should appear in Voice dropdown + Breakouts manager + Workspace tab badge
6. **Workspace Presence** - User A views Workspace 1, User B views Workspace 2 → Badges should reflect
7. **Popout Lifecycle** - Create popout → Should appear in manager → Close → Should remove from manager
8. **Mode Toggle** - Switch tile ↔ tabs → Canvas should rerender appropriately

---

## Questions for Implementation

1. **Max pinned rooms** - Should this be user-configurable in settings?
2. **Breakout auto-naming** - Always use workspace name, or allow rename?
3. **Popout persistence** - Should popout positions persist across sessions?
4. **Voice reconnection** - Auto-rejoin voice on page refresh?

---

## Related Documentation

- See `/mnt/project/Room_Header_Canvas_Footer_Session_Memory_Log.md` for earlier design decisions
- See `/mnt/project/Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md` for tab behaviors
- See `/mnt/project/canvas-comprehensive-v3.jsx` for original prototype reference
