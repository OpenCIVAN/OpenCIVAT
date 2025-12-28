# Header & Footer Bars Design Specification

**CIA Web - Collaborative Immersive Analytics**

Version 1.0 | December 2024 | Ready for Implementation

---

## Overview

This specification defines the four horizontal bars that frame the CIA Web canvas area. Each bar has a distinct purpose and scope, creating a clear visual hierarchy from global to contextual controls.

### Complete Layout Structure

**Bar Stack (top to bottom):**

| Bar | Height | Purpose |
|-----|--------|---------|
| Header | 48px | Global app controls: Project, Search, User, Theme, VR |
| Secondary Header | 44px | Workspace context: Workspace, Room, Presence, Navigation, Edit Tools |
| Canvas Area | flex | Main viewport for visualization instances |
| Secondary Footer | 36px | Instance context: Popouts, Active Instance, View Mode, Voice Controls |
| Footer | 28px | System status: Sync, Users, Recording, Memory, FPS |

*Total bar height: 156px (48 + 44 + 36 + 28)*

---

## Implementation Status Summary

| Component | Status | Priority |
|-----------|--------|----------|
| Header (primary) | 🔄 Partial | P0 |
| Secondary Header | ❌ TODO | P0 |
| Secondary Footer | ❌ TODO | P1 |
| Footer/StatusBar | 🔄 Partial | P1 |
| GlobalSearch Modal | ❌ TODO | P1 |

---

## Z-Index Hierarchy

**CRITICAL:** Proper z-index prevents panels from getting stuck behind bars.

| Element | Z-Index | Notes |
|---------|---------|-------|
| Modals | 1000+ | Always on top |
| Dropdowns/Popouts | 200+ | Above all bars |
| Header & Footer | 100 | Primary bars |
| Dev Mode Banner | 95 | Overlay, not push layout |
| Secondary Bars | 90 | Below primary bars |
| Panels | 80-89 | Left/Right panels |

---

## ✅ IMPLEMENTED

### Header (Partial)

**Implemented:**
- Basic Header component structure
- Logo placeholder
- ProjectSelector component (partial)
- UserMenu component (basic)
- ViewModeToggle (Desktop/VR)

### Footer/StatusBar (Partial)

**Implemented:**
- StatusBar component structure
- Basic sync status display
- User count indicator

---

## ❌ REMAINING TO IMPLEMENT

### Header (Primary) - Complete Implementation

**Height: 48px** | Background: `tokens.bgSecondary` | Border: 1px solid `tokens.borderDefault` (bottom)

**Purpose:** Global application controls that persist across all projects and workspaces.

**Layout Structure:**
- **Left Section:** Logo, Project Selector
- **Right Section:** Search, Help, Notifications, Theme, VR Toggle, User Menu

**Components:**

| Component | Icon | Behavior |
|-----------|------|----------|
| Logo | Hexagon (placeholder) | Click → Navigate to Home Dashboard (projects list) |
| Project Selector | Folder + ChevronDown | Dropdown with search, recent projects, + New Project |
| Global Search | Search (⌘K) | Opens modal with cross-project search, filter chips, results show project name |
| Help | HelpCircle | Opens in-app help modal with quick start, shortcuts, docs links |
| Notifications | Bell + badge | Global notifications dropdown, click navigates to item |
| Theme Toggle | Sun / Moon | Simple toggle Light ↔ Dark. System option in Account Settings. |
| VR Toggle | Monitor / Glasses | Existing ViewModeToggle component. Desktop ↔ VR segmented toggle. |
| User Menu | Avatar + ChevronDown | Status selector, Profile, Settings, Shortcuts, Admin (if admin), Sign Out |

### Secondary Header (Full implementation needed)

**Height: 44px** | Background: `tokens.bgSecondary` | Border: 1px solid `tokens.borderDefault` (bottom)

**Purpose:** Workspace context and navigation tools.

**Layout Structure:**
- **Left Zone:** Workspace Selector (tall dropdown), Room Indicator + Presence Avatars
- **Center/Right Zone:** Flow Direction, Edit Tools (contextual), Canvas Navigation

**Workspace Selector:**
Tall dropdown button with label showing current workspace. Min-width: 180px.

| Workspace Type | Icon | Color |
|----------------|------|-------|
| Project | Globe | tokens.accentBlue |
| Breakout | GitBranch | tokens.accentPurple |
| Personal | User | tokens.accentGreen |

**Room Indicator + Presence:**
- Displays current room name with type icon
- Shows avatar stack (max 4) with overflow count
- Click opens Right Panel → Rooms tab
- Hover on avatars shows tooltip with names

**Flow Direction Toggle:**

Key Insight: No Grid/Flow mode toggle needed. The mode is determined by user action:

| Action | Behavior | Uses Flow Direction? |
|--------|----------|----------------------|
| Drag & Drop | Grid placement (explicit cell) | No |
| Double-click / Add View | Auto-place in next slot | Yes |

**Flow Direction Options:**
- Row-first (→): Fills (0,0), (0,1), (0,2)... then (1,0), (1,1)...
- Column-first (↓): Fills (0,0), (1,0), (2,0)... then (0,1), (1,1)...

**Edit Tools (Contextual):**
*Only visible when Edit Mode is active.*

| Tool | Icon | Color / Action |
|------|------|----------------|
| Select | MousePointer2 | Blue - Select cells/views |
| Pan | Hand | Teal - Pan canvas |
| Merge | Combine | Purple - Merge cells |
| Edit Toggle | Pencil | Amber - Toggle edit mode on/off |
| Undo/Redo | Undo / Redo | Workspace-level history |
| More Tools ⋯ | MoreHorizontal | Overflow dropdown for additional tools |

**Canvas Navigation:**
- Home button (amber when at origin)
- Bookmark button for saved positions
- D-pad arrows for viewport movement
- Position display (col, row) in monospace

### Secondary Footer (Full implementation needed)

**Height: 36px** | Background: `tokens.bgSecondary` | Border: 1px solid `tokens.borderSubtle` (top)

**Purpose:** Instance context, view modes, and voice quick controls.

**Layout Structure:**
- **Left Zone:** Popout Buttons (Canvas Navigator, Scratchpad)
- **Center Zone:** Active Instance Selector, View Mode Toggle, Canvas Size
- **Right Zone:** Voice Quick Controls

**Popout Buttons:**

| Popout | Icon | Content |
|--------|------|---------|
| Canvas Navigator | Map | Minimap, D-pad, zoom, canvas size controls. Resizable. |
| Scratchpad | StickyNote | Rich text notes, auto-save. Can be personal or shared. Resizable. |

**Popout Behavior:**
- Float over canvas area (z-index: 200+)
- Draggable and resizable
- Multiple can be open simultaneously
- Position/size persisted to database per user

**Active Instance Selector:**
Dropdown showing current active instance with color indicator. Click opens searchable list.

| State | Display |
|-------|---------|
| Instance active | ● Brain Scan Axial ▼ (colored dot) |
| No instance active | ○ No active instance ▼ (muted) |
| Multiple selected | ● 3 instances ▼ |

**Dropdown Sections:**
- Search input at top
- ON CANVAS: Views currently placed with position (click to focus + navigate)
- AVAILABLE VIEWS: Views loaded but not placed (click to auto-place + focus)

**View Mode Toggle:**

| Mode | Icon | Description |
|------|------|-------------|
| Normal | LayoutGrid | Blue - Standard grid view with all instances |
| Isolation | Maximize2 | Amber - Focus single instance fullscreen |
| Subset | Layers | Purple - View selected subset of instances |

**Canvas Size Display:**
- Shows current canvas dimensions: "📐 3 × 4"
- Click opens inline resize controls (not full panel)
- Preserves canvas space - no panel needed for simple resize

**Voice Quick Controls:**

| Control | Icon | States / Action |
|---------|------|-----------------|
| Mic | Mic / MicOff | On (green), Off (red), Muted (amber) |
| Deafen | Volume2 / VolumeX | Normal, Deafened |
| Leave/Join | PhoneOff / Phone | Leave or join voice channel |
| Room Selector | DoorOpen + ChevronDown | Dropdown to switch voice channel |
| Settings | Settings | Opens Voice Settings popout (devices, volume, PTT) |

### Footer (Status Bar) - Complete Implementation

**Height: 28px** | Background: `tokens.bgPrimary` | Border: 1px solid `tokens.borderDefault` (top)

**Purpose:** System status, connection info, recording controls, performance metrics.

**Layout Structure:**
- **Left Zone:** Auth, Connection Group, Warnings, Cursors Toggle
- **Center Zone:** Transient messages (auto-fade)
- **Right Zone:** Recording Controls, Memory, FPS, Voice, Panel Toggle

**Left Zone Components:**

| Component | States | Action |
|-----------|--------|--------|
| Auth Mode | Dev Mode (amber), Secure (green) | Informational |
| Sync Status | Synced (green), Syncing (amber), Offline (red) | Grouped with Online Users |
| Online Users | Count + hover popover | Click → People tab |
| Warnings | Count (amber), hidden when 0 | Click → Logs panel filtered to warnings |
| Cursors Toggle | Visible (Eye), Hidden (EyeOff) | Toggle remote cursor visibility |

**Center Zone - Transient Messages:**
Clean by default. Shows temporary status messages that auto-fade after 2 seconds:
- "Auto-saved" - After auto-save
- "3 changes syncing..." - During sync
- "Copied to clipboard" - After copy
- "Layout saved" - After layout save

**Right Zone Components:**

**Recording Controls (Enhanced):**
Inline pause/stop controls to avoid opening Recording panel for quick actions.

| Element | Icon | Action |
|---------|------|--------|
| Record Indicator | Circle (pulsing red) | Click → Recording tab |
| Pause | Pause | Pause recording |
| Stop | Square | Stop recording (with confirmation) |
| Duration | mm:ss | Elapsed time |
| Mode Badge | Text | Workspace / Session / Instance |

**Memory Usage:**
Shows GPU/RAM usage for optimization research. Click shows detailed breakdown.

| Level | Color | Threshold |
|-------|-------|-----------|
| Normal | tokens.textMuted | < 50% of available |
| Warning | tokens.accentAmber | 50-80% |
| Critical | tokens.accentRed | > 80% |

**FPS Counter:**

| FPS Range | Color | Icon |
|-----------|-------|------|
| 55+ | tokens.accentGreen | Zap |
| 30-54 | tokens.accentAmber | Zap |
| < 30 | tokens.accentRed | Zap |

**Other Controls:**
- Voice Command Toggle - Enable/disable voice commands
- Panel Toggle (ChevronUp/Down) - Opens/closes bottom output panel

---

## Bug Fixes Required

### Development Banner Issue
**BUG:** Development mode warning banner pushes footer out of view.
**FIX:** Banner should overlay content using position: fixed, not push layout. Use z-index: 95.

### Panel Z-Index Issue
**BUG:** Panels can get stuck behind header (above dev banner but below header bar).
**FIX:** Implement proper z-index hierarchy as defined in Section 1.2. Ensure panels never exceed z-index 89.

---

## Persistence & Preferences

User preferences and positions should persist across sessions and devices via database storage.

### Per-User Preferences (Database)
- Theme preference (Light/Dark/System)
- Flow direction preference (Row/Column)
- Cursor visibility default
- Popout positions and sizes
- Panel open/closed states

### Per-Project Preferences (Database)
- Workspace positions/layouts
- Scratchpad content (if shared)
- Default view mode per workspace

---

## File Structure

```
src/ui/react/components/layout/
├── Header/
│   ├── Header.jsx
│   ├── Header.scss
│   └── components/
│       ├── Logo.jsx
│       ├── ProjectSelector/
│       ├── GlobalSearch/
│       ├── NotificationBell/
│       ├── ThemeToggle.jsx
│       └── UserMenu/
├── SecondaryHeader/
│   ├── SecondaryHeader.jsx
│   └── components/
│       ├── WorkspaceSelector/
│       ├── RoomPresenceIndicator/
│       ├── FlowDirectionToggle.jsx
│       ├── EditToolbar.jsx
│       └── CanvasNavigation.jsx
├── SecondaryFooter/
│   ├── SecondaryFooter.jsx
│   └── components/
│       ├── PopoutButtons/
│       ├── InstanceSelector/
│       ├── ViewModeToggle.jsx
│       ├── CanvasSizeDisplay.jsx
│       └── VoiceQuickControls/
├── Footer/
│   ├── StatusBar.jsx (existing)
│   └── components/
│       ├── RecordingControls.jsx
│       └── MemoryUsage.jsx
└── common/
    └── Popout/
        ├── Popout.jsx
        └── usePopout.js
```

---

*This document serves as the authoritative reference for Header and Footer bar implementation.*
