# ViewGroup Selector & Footer 2 Links - Design Session Memory Log

**Date:** January 25, 2026  
**Session Type:** UI/UX Design Exploration  
**Artifacts Created:**
- `viewgroup-selector-v1.jsx` - Initial prototype
- `viewgroup-selector-v2.jsx` - Enhanced links, duplication dialog
- `viewgroup-selector-v3.jsx` - Fixed responsive breakpoints (FINAL)
- `ViewGroup_Selector_Links_Claude_Code_Handoff.md` - Implementation guide

---

## Session Context

This session continued from the Room Header & Canvas Tabs work (Parts 1 & 2). We focused on the ViewGroup Selector component in Footer 2 and discovered significant design work needed for the Links system.

### Previous Work Referenced
- `canvas-comprehensive-v3.jsx` - Comprehensive canvas prototype (1807 lines)
- `Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md` - Previous session decisions
- Existing `ViewLinkingService` and `LinkManagerPanels` components in codebase

---

## Key Design Decisions

### 1. ViewGroup Selector Location & Behavior
**Decision:** ViewGroup Selector lives in Footer 2, right-center area
- Trigger button shows color dot + name (responsive)
- Click opens dropdown with search, list, and create actions
- Active ViewGroup = Selected ViewGroup (same as Instance Tools pattern)

### 2. Settings Popover (Option C - Hybrid)
**Decision:** Quick settings popover with "Edit in Layout Tab" link
- Popover handles: Name, Color, Layout dropdown, ViewGroup links
- Actions: Save as Template, Duplicate, Delete
- "Edit in Layout Tab" for advanced/comprehensive editing
- Rationale: Speed for common tasks, full control available via floating panels

### 3. "Go To" Behavior (Option D - All)
**Decision:** Go To action does pan + zoom + highlight
- Smooth pan canvas to center on ViewGroup
- Zoom to fit if needed
- Flash border highlight for visual confirmation
- Can be preference-controlled later

### 4. Create New Flow (Option C - Quick Create with Advanced)
**Decision:** Quick templates inline, Advanced opens Layout Tab
- Quick Create shows 5 layout templates (Single, 1+2, 2×2, 3-up, 2+1)
- "From Saved" section ALWAYS visible (shows empty state if no templates)
- "Advanced: Open Layout Tab" for full canvas grid control
- Rationale: Discoverability of save-as-template feature

### 5. Links Architecture - Major Enhancement
**Decision:** Links are NOT just toggles - they show what you're linked to

**Footer 2 Link Indicators:**
- Full mode: Individual indicators per property with counts
- Compact mode: Single button with colored dots
- Minimal mode: Single button with total count
- Click any → Opens popover with details and "Open Link Manager" button

**Link Properties (6 universal + type-specific):**
1. Camera (teal) - all types
2. Filters (purple) - all types
3. Colors (pink) - vtk, chart
4. Widgets (amber) - all types
5. Cursors (cyan) - all types
6. Annotations (orange) - vtk, image
7. Window/Level (blue) - vtk-slice, vtk-volume
8. Slice Position (green) - vtk-slice
9. Time Position (amber) - vtk-4d, timeseries

**Link Modes (existing from codebase):**
- Follow (←) - Receive updates only
- Sync (↔) - Bidirectional
- Broadcast (→) - Send updates only

### 6. Duplication with Link Handling
**Decision:** Dialog asks how to handle links with 3 options

| Option | Default | Behavior |
|--------|---------|----------|
| Keep individual links | No | Copy inherits same targets |
| **Link to original** | **Yes** | ViewGroup-to-ViewGroup sync |
| No links | No | Clean slate |

**Critical:** When "Link to original" selected:
- Individual links are RETAINED but DISABLED
- If ViewGroup link is later broken, individual links can be re-enabled
- Prevents data loss while avoiding conflicting sync

### 7. Link Reminder Toast
**Decision:** One-time reminder when activating linked ViewGroup
- Shows total link count and "syncing with other views" message
- "Got it" dismisses and allows sync
- "Disable Links" turns off incoming sync
- NOT a blocking confirmation - this is synchronous collaboration

**Philosophy:** Always-on sync for synchronous collaboration. Don't ask on every change, just remind once so users know their view may shift.

### 8. ViewGroup-to-ViewGroup Linking
**Decision:** Only allowed for compatible ViewGroups
- Must be duplicates (spawn from same) OR
- Must have compatible layouts (same view count)
- Individual View-to-View linking always available for flexibility
- ViewGroup linking is convenience layer, not restriction

---

## Responsive Breakpoints (Final)

### Footer 2 Breakpoints

| Mode | Width | Links | ViewGroup | Labels | Type-specific |
|------|-------|-------|-----------|--------|---------------|
| Full | ≥900px | All expanded | Full name | ✅ | ✅ |
| Compact | 600-899px | Dots | Truncated | ❌ | ❌ |
| Minimal | 450-599px | Count only | Color dot | ❌ | ❌ |
| Min-width | <450px | Enforce min | — | — | — |

### Workspace Minimum Sizes

```typescript
const sizing = {
  minWorkspaceWidth: 450,    // Enforced minimum
  minWorkspaceHeight: 300,
  minCanvasWidth: 280,       // Individual tiles
  minCanvasHeight: 200,
  minPopoutWidth: 200,
  minPopoutHeight: 150,
};
```

**Rationale:** 450px minimum for workspace avoids all edge cases. Horizontal scroll enabled below that but should never happen in practice.

---

## Components Designed

### New Components
1. **ViewGroupSelectorTrigger** - Responsive button (full/compact/minimal)
2. **ViewGroupSelectorDropdown** - Search, list, create
3. **ViewGroupRow** - Row with name, view count, link indicator, actions
4. **CreateViewGroupPopover** - Quick templates + From Saved + Advanced
5. **ViewGroupSettingsPopover** - Quick settings with Layout Tab link
6. **DuplicationDialog** - Link handling options
7. **CollapsedLinksIndicator** - Compact/minimal link display
8. **LinksPopover** - Full link list with property details
9. **LinkPropertyPopover** - Single property detail/config
10. **LinkReminderToast** - One-time activation reminder

### Enhanced Components
1. **Footer2** - Added ViewGroup selector and responsive links
2. **LinkPropertyIndicator** - Now shows count, not just toggle

---

## Integration Notes

### Existing Code to Integrate With
- `ViewLinkingService` - Already handles link operations
- `LINK_PROPERTIES` in `linkConstants.js` - Property definitions
- `LINK_MODES` in `linkConstants.js` - Mode definitions
- `ViewLinkManager` - Full link configuration panel
- `ModeSelector` - Three-way toggle component
- `GroupMembersList` - Shows members in link group

### Backend Considerations (for Claude Code)
- Link properties may need `applicableTypes` field in database
- ViewGroup-to-ViewGroup linking needs new relationship type
- Individual links should have "disabled while ViewGroup linked" state
- Link reminder "shown" state needs per-session tracking

---

## Open Items for Future Sessions

### Not Addressed This Session
1. **Canvas breadcrumb navigation** - "Workspace > ViewGroup > View" path
2. **VR mode UI adaptations** - How these components transform for VR
3. **Permission/guest view indicators** - Guest restrictions in canvas
4. **Recording/Playback UI** - Session recording for scientific reproducibility
5. **Subset selector integration** - How subsets interact with ViewGroups

### Questions for Later
1. Should ViewGroup templates include link configurations?
2. How do saved ViewGroups interact with different datasets?
3. What happens to links when a view type changes?

---

## Prototype Files

### viewgroup-selector-v3.jsx (FINAL)
- Full responsive Footer 2
- All three modes working (Full/Compact/Minimal)
- ViewGroup Selector with dropdown
- Collapsed links with colored dots
- LinksPopover and LinkPropertyPopover
- DuplicationDialog with link options
- LinkReminderToast

### Test Controls in Prototype
- Width slider (400-1200px) with breakpoint markers
- Mode indicator showing current responsive mode
- "Empty State" toggle
- "Test Duplication" button
- "Link Reminder" button

---

## Design Tokens Used

```typescript
const tokens = {
  colors: {
    accent: { 
      purple: '#a855f7',  // ViewGroup default, broadcast mode
      blue: '#3b82f6',    // Window/Level links
      cyan: '#22d3ee',    // Cursors, follow mode
      green: '#22c55e',   // Slice position, success
      amber: '#f59e0b',   // Widgets, warnings
      pink: '#ec4899',    // Colors/colorMaps
      red: '#ef4444',     // Delete, unlink
      teal: '#14b8a6',    // Camera, sync mode, VR
      orange: '#fb923c',  // Annotations
    },
  },
  sizing: {
    touchTarget: 44,
    touchTargetLg: 56,
    minWorkspaceWidth: 450,
    minWorkspaceHeight: 300,
  },
};
```

---

## Continuation Prompt

To continue this work in a new chat, use:

> "I'm continuing the ViewGroup Selector and Footer 2 Links design work. Please read the `ViewGroup_Selector_Links_Design_Session_Memory_Log.md` file in project knowledge to restore context. The final prototype is `viewgroup-selector-v3.jsx`. We completed the ViewGroup Selector dropdown, enhanced Links section with responsive behavior, duplication dialog with link handling, and link reminder toast. The handoff for Claude Code is ready in `ViewGroup_Selector_Links_Claude_Code_Handoff.md`."

---

## Session Statistics

- **Duration:** Extended session
- **Prototype iterations:** 3 (v1, v2, v3)
- **Design questions resolved:** 8
- **New components designed:** 10
- **Existing components enhanced:** 2
- **Handoff document:** Complete
