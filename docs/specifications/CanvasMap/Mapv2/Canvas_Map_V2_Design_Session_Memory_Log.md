# Canvas Map V2 Design Session Memory Log

**Session Date:** January 29, 2026  
**Topic:** Canvas Map Panel - Complete Design with Side Toolbar, Companion Panel, Cursors, and Panning  
**Artifacts Created:**
- `/mnt/user-data/outputs/canvas-map-v2-complete.jsx` - Complete interactive prototype
- `/mnt/user-data/outputs/Canvas_Map_Panel_Claude_Code_Handoff.md` - Implementation guide

---

## Session Summary

This session completed the Canvas Map V2 design, building on previous architecture clarification that established:
- Canvas Map is a **PanelShell floating panel**, NOT a LeftPanel tab
- Uses `CHROME_LEVELS.FULL` for full panel chrome
- Located at `src/ui/react/components/panels/CanvasMapPanel/`

---

## Key Design Decisions Made

### 1. Quick Navigation Placement

**DECISION:** Persistent side toolbar along minimap edge

- **Configurable handedness:** Left (default) or right based on user preference
- **Always visible:** Available in ALL modes, not just Navigate
- **Buttons:** Home, Set Home, Fit All, Add Bookmark

**Rationale:** Quick nav needed everywhere, side placement doesn't consume contextual panel space.

---

### 2. Companion Views & Datasets Panel

**DECISION:** Integrated collapsible side section (not separate floating panel)

```
COLLAPSED (280px):                 EXPANDED (420px):
┌──────────────────────┐          ┌─────────────────┬──────────────┐
│ [Mode Tabs]          │          │ [Mode Tabs]     │              │
├────┬─────────────────┤          ├────┬────────────┤ VIEWS        │
│ 🏠 │    MINIMAP      │   →      │ 🏠 │  MINIMAP   │ [Axial]      │
│ ⊕  │                 │  [📋]   │ ⊕  │            │──────────────│
├────┴─────────────────┤          ├────┴────────────┤ DATASETS     │
│ [Contextual Panel]   │          │ [Contextual]    │ [brain.nii]  │
└──────────────────────┘          └─────────────────┴──────────────┘
```

**Smart behaviors:**
- Toggle button (📋) in toolbar
- Could auto-expand in Layout mode (user preference)
- Single drag-drop context vs coordinating two panels

**Purpose separation:**
- **Contextual panel** = Managing what's ON canvas
- **Companion panel** = Adding NEW things to canvas

---

### 3. Mode Naming

**DECISION:** Keep "Layout" as mode name

Considered: "Arrange", "Build", "ViewGroups"

**Rationale:** "Layout" implies spatial arrangement and grid configuration - matches user mental model.

---

### 4. Cursor Consolidation

**DECISION:** Merge cursors into Team mode, deprecate separate Cursors tab

**Team Mode Structure:**
```
Team Mode
├── Me (sub-tab)
│   ├── My Viewports
│   ├── Broadcast toggle
│   └── My Cursor (color, visibility)
│
└── Team (sub-tab)
    ├── Show Cursors (master toggle)
    ├── BROADCASTING (section)
    ├── ONLINE (section with per-person cursor toggles)
    └── OFFLINE (section)
```

**Rationale:**
- Cursors are fundamentally about presence ("where are teammates pointing?")
- Team mode already handles presence ("where are teammates looking?")
- Separating creates fragmentation

---

### 5. Minimap Panning

**DECISION:** Yes, support conditional panning

| Canvas Size | Zoom Level | Panning? |
|-------------|------------|----------|
| Small (4×4) | Auto-fit | No need |
| Small (4×4) | Zoomed in | Yes |
| Large (8×8+) | Any | Yes |

**Implementation:**
- Drag to pan when content exceeds container
- Edge fade indicators show when more content exists
- "Drag to pan" hint appears when panning available
- Double-click or "Fit All" resets pan

---

## Final Panel Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ [Navigate] [Layout] [Links] [Team]                                 │
├────────────────────────────────────────────────────────────────────┤
│ [Zoom-][100%][Zoom+] | [#] [VG|View] | [mode tools...] | [📋]     │
├────┬───────────────────────────────────┬───────────────────────────┤
│ 🏠 │                                   │ VIEWS & DATASETS          │
│ ⊕  │           MINIMAP                 │ [Search...]               │
│ 🔲 │      (drag to pan)                │ [drag items here]         │
│ 🔖 │                                   │                           │
├────┴───────────────────────────────────┴───────────────────────────┤
│ CONTEXTUAL PANEL (mode-specific)                                   │
│ - Navigate: Bookmarks                                              │
│ - Layout: VGs on canvas + Inactive VGs                             │
│ - Links: VG Links / View Links (sub-tabs)                          │
│ - Team: Me / Team (sub-tabs with cursor controls)                  │
├────────────────────────────────────────────────────────────────────┤
│ [Footer: mode description | viewport position]                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Size Mode Behavior

| Mode | Width | Behavior |
|------|-------|----------|
| `compact` | <300px | Icons only in tabs, simplified list items, hidden search, overflow menu |
| `standard` | 300-440px | Full mode names, standard list items |
| `expanded` | >440px | All features, comfortable spacing |

```javascript
const sizeMode = useMemo(() => {
  const effectiveWidth = panelWidth - (companionOpen ? companionWidth : 0);
  if (effectiveWidth < 300) return 'compact';
  if (effectiveWidth >= 440) return 'expanded';
  return 'standard';
}, [panelWidth, companionOpen]);
```

---

## Prototype Features Implemented

| Feature | Status |
|---------|--------|
| Four modes (Navigate/Layout/Links/Team) | ✅ |
| Mode-specific contextual panels | ✅ |
| Sub-tabs (Links: VG/View, Team: Me/Team) | ✅ |
| VG/View display mode toggle | ✅ |
| Minimap with grid labels | ✅ |
| Responsive sizeMode adaptation | ✅ |
| Side quick-nav toolbar | ✅ |
| Configurable toolbar position | ✅ |
| Companion Views/Datasets panel | ✅ |
| Cursor controls in Team mode | ✅ |
| Minimap panning with edge fades | ✅ |
| VG selection/highlighting | ✅ |
| Link highlighting with ghosting | ✅ |
| Collapsible inactive VGs section | ✅ |
| Glassmorphism styling | ✅ |

---

## Implementation Priorities

### Phase 1: Core Structure (High)
1. Folder structure
2. Constants and utilities
3. Panel shell with PanelShell wrapper
4. Mode tabs
5. Basic minimap

### Phase 2: Minimap Components (High)
6. Grid background
7. VG blocks
8. Viewport indicators
9. Collaborator indicators
10. Grid labels

### Phase 3: Toolbar & Quick Nav (High)
11. Map toolbar
12. Quick nav toolbar
13. Position preference

### Phase 4: Contextual Panels (Medium)
14. Navigate panel (bookmarks)
15. Layout panel (VG lists)
16. Links panel (VG/View links)
17. Team panel (Me/Team)

### Phase 5: Advanced Features (Medium)
18. Minimap panning
19. Link line visualization
20. Cursor indicators
21. Companion panel

### Phase 6-8: Interactions, Drag-Drop, Polish (Lower)

---

## Questions for Claude Code

1. **Y.js Integration:** Which existing hooks provide ViewGroup/Viewport/Collaborator data?
2. **Cursor Broadcasting:** How is cursor position shared via Y.js?
3. **Drag-Drop Library:** react-dnd or native HTML5?
4. **User Preferences:** localStorage vs server storage?
5. **Canvas Config:** Is there a useCanvasConfig hook?

---

## Related Project Files

- `PanelShell_Unified_Workspace_Design_Session_Memory_Log.md`
- `Canvas_Chrome_Architecture_Session_Memory_Log.md`
- `Canvas_Map_Panel_Architecture_Clarification.md`
- `src/ui/react/components/panels/PanelShell/`
- `src/ui/react/styles/tokens/`

---

## Next Steps

1. Claude Code reviews handoff document
2. Implements Phase 1-3 (core structure, minimap, toolbar)
3. Connects to real data hooks
4. Implements remaining phases
5. Tests responsive behavior and interactions

---

*Session ended: January 29, 2026*
