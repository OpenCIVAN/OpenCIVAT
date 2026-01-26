# Room Header & Workspace Bar Design Session Memory Log

**Date:** January 26, 2026
**Focus:** Room Header architecture, Workspace Bar (Canvas Tabs), section organization, breakout placement

---

## Session Summary

This session resolved the architecture for the Room Header and Workspace Bar components, focusing on clear separation of viewing context vs voice context, proper section organization matching the existing UI patterns, and breakout room placement.

---

## Key Design Decisions

### 1. Option D Architecture - Viewing vs Voice Separation

**Decision:** Separate the "what am I looking at" (Viewing) from "who am I talking to" (Voice) into distinct UI sections.

**Rationale:**
- Users can view one room while being in voice for another
- Eliminates "Currently In" ambiguity
- Matches Discord/Slack mental model for voice channels
- Supports scientific collaboration workflows (reviewing data while discussing)

### 2. Room Header Section Layout

**Final Layout:**
```
ROOM (viewing + presence) | PINNED | VOICE | CHAT
```

**Key insight:** Presence (👥5) belongs WITH the viewing room dropdown because it answers "how many people are in the room I'm viewing?"

**Previous consideration rejected:** Having presence as a separate section - this created unnecessary separation from its context.

### 3. Voice Join Split Button

**Decision:** Use split button pattern for "Join Voice"
- Main button click → Join viewing room's voice (most common action)
- Dropdown arrow → Pick any room or existing breakout

**Dropdown contents:**
1. Current room (highlighted as default)
2. Active Breakouts section (if any exist)
3. Other Rooms section (with voice user counts)

### 4. Breakout Architecture

**Question resolved:** Where do breakouts live - Room or Workspace level?

**Answer:** Hybrid approach
- **Created from:** Workspace context ("Create breakout for [workspace name]")
- **Lives in:** Voice section as ephemeral sub-channels
- **Named after:** Source workspace
- **Indicated on:** Workspace tab badge (⎇ icon + user count)
- **Lifecycle:** Ephemeral - auto-closes when last person leaves

**Access points for breakouts:**
1. Voice dropdown → "Create Breakout from Workspace"
2. Voice dropdown → Join existing breakout
3. Breakouts manager (Workspace Bar) → Join or create
4. NOT from [+] button (that's workspace creation only)

### 5. Workspace Bar Section Layout

**Final Layout:**
```
WORKSPACE (tabs + [+]) | MODE | POPOUTS (if any) | BREAKOUTS (if any)
```

**Clarifications:**
- [+] button = NEW WORKSPACE only (never breakouts)
- POPOUTS section only appears when popouts exist
- BREAKOUTS section only appears when breakouts exist
- Mode toggle = Tile vs Tabs view

### 6. Workspace Tab Badges

**Badge types (can stack):**
- `●` amber dot = unsaved changes
- `⎇ 2` purple = has active breakout with 2 users in voice
- `👥 3` cyan = 3 users viewing this workspace

### 7. Dual Presence Model

**Two levels of presence:**
1. **Room Presence** (Room Header) → "Who can I talk to?"
2. **Workspace Presence** (Workspace tabs) → "Who sees my cursor/edits?"

Both matter for scientific collaboration - room presence shows potential collaborators, workspace presence shows who's actively looking at the same data.

---

## Artifacts Created

1. **room-header-options.jsx** - Initial comparison of Options A, B, C
2. **room-header-option-d.jsx** - Option D with viewing/voice separation
3. **room-header-option-d-enhanced.jsx** - Added join voice picker + dual presence
4. **room-header-with-sections.jsx** - Added section headers + breakout architecture
5. **room-header-clarified.jsx** - Final version with corrected section layout

---

## Implementation Notes

### Component Structure
- RoomHeader (bars/RoomHeader/)
  - RoomSection (viewing dropdown + presence)
  - PinnedSection (quick-access pills)
  - VoiceSection (voice channel + controls)
  - ChatSection (room chat shortcut)

- WorkspaceBar (bars/WorkspaceBar/)
  - WorkspaceTabs (tab list + badges)
  - ModeToggle (tile/tabs)
  - PopoutManager (floating windows)
  - BreakoutManager (voice breakouts)

### State Considerations
- viewingRoomId and voiceRoomId are independent
- activeBreakoutId replaces voiceRoomId when in breakout (mutually exclusive)
- pinnedRoomIds stored per-user (localStorage or user preferences)
- Breakouts are ephemeral (not persisted to database)

### Integration Points
- Replace SecondaryHeader component
- Voice controls move from SecondaryFooter to Room Header
- Canvas chrome (CanvasHeader) becomes workspace-level, not room-level
- Y.js handles real-time presence updates

---

## Questions Deferred

1. Max pinned rooms - user configurable?
2. Breakout auto-naming vs custom naming
3. Popout position persistence across sessions
4. Voice auto-reconnection on page refresh

---

## Next Steps

1. ✅ Create Claude Code handoff document
2. → New chat: Canvas Header implementation (inside canvas chrome)
3. → Footer implementation (view tools, ViewGroup selector, links)

---

## Reference Files

- `/mnt/project/canvas-comprehensive-v3.jsx` - Original comprehensive prototype
- `/mnt/project/Room_Header_Canvas_Footer_Session_Memory_Log.md` - Earlier session
- `/mnt/project/Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md` - Earlier session
- `/mnt/user-data/outputs/room-header-clarified.jsx` - Final prototype artifact
