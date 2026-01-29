# PanelShell Architecture & Unified Workspace Design - Session Memory Log

**Date:** January 28, 2025
**Session Focus:** Redesigning floating panels for all-floating architecture, unifying Navigator + Layout, defining View vs Viewport primitives, establishing workspace hierarchy
**Status:** Design exploration complete, ready for API contract definition

---

## Executive Summary

This session established a comprehensive panel architecture for CIA Web's move to an all-floating panel system. Key outcomes:

1. **PanelShell architecture** with chrome levels (FULL/COMPACT/MINIMAL), layout variants (Standard/Split/Tabbed), and dock groups
2. **Unified Canvas Control** panel combining Navigator + Layout via modes (not separate panels)
3. **View vs Viewport distinction** - View is collaborative primitive, Viewport is personal window
4. **Workspace hierarchy** - Project → Rooms → Workspaces with Global/Room/Personal categories
5. **Instance Tools structure** - 3 tabs (Controls/Layers/Links) + collapsible Widgets section

---

## Data Hierarchy (Canonical Reference)

```
Project (War Room)
├── Files (shared, permissioned, versioned)
├── Main Room (all members)
│   ├── Voice/Chat
│   └── Workspaces [Global category]
├── Rooms (focused subsets)
│   ├── Voice/Chat (room-specific)
│   └── Workspaces [Room category]
└── User's Personal Space
    └── Scratchpads [Personal category - room agnostic]

Workspace (Infinite Canvas)
├── ViewGroups (puzzle piece containers)
│   ├── Explicit (named, templated, user-created layout)
│   └── Implicit (unnamed, single member, drag-drop created)
└── Viewports (personal windows into canvas)
    ├── Tab Mode (floating, Photoshop-style)
    └── Tile Mode (organized grid)

View (Plugin Instance - THE COLLABORATIVE PRIMITIVE)
├── Dataset (loaded file data)
├── Configuration (filters, camera, appearance)
├── Links (to other views - camera/filters/widgets/W-L)
└── State (position in VG, visibility)
```

---

## View vs Viewport: Critical Distinction

| Aspect | View | Viewport |
|--------|------|----------|
| **What it is** | Rendered dataset with configuration | Personal window looking at canvas region |
| **Persistence** | Server-synced, versioned, audited | Local/session, restorable |
| **Collaboration** | Shared, linkable, THE unit of work | Personal, shareable (follow mode) |
| **Lifecycle** | Created → Configured → Shared → Archived | Opened → Positioned → Closed |
| **Loss impact** | HIGH (work lost, affects collaborators) | LOW (just reopen to same place) |
| **Analogy** | Google Doc | Browser tab viewing the doc |
| **Sharing** | Always shared in workspace | Can share position for "follow me" |
| **Multiple instances** | One view can appear in multiple VGs (linked) | Multiple viewports can show same canvas region |

**Key insight:** Users can open the same workspace canvas 5 times with 5 different viewports, each showing different regions. The views themselves are shared collaborative state.

---

## PanelShell Architecture

### Chrome Levels (Static declaration per panel type)

| Level | Use Case | Structure |
|-------|----------|-----------|
| **FULL** | Complex panels (Canvas Control, Instance Tools) | Title bar, drag handle, minimize/dock/close, resize handle |
| **COMPACT** | Simple panels (Chat, People, single-purpose) | Icon + title, collapse/close only |
| **MINIMAL** | Toolbars, quick access bars | No header, drag from body |

### Layout Variants (Internal panel structure)

| Variant | Use Case | Structure |
|---------|----------|-----------|
| **Standard** | Single content area | Scrollable content |
| **Split** | Independent sections | Top/bottom with draggable divider |
| **Tabbed** | Multiple content types | Tab bar + switchable content |

### Dock Groups

- Panels can be dragged together to form tabbed dock groups
- In VR, entire dock group travels as one unit
- Tabs can be reordered within dock group
- Drag tab out to undock

### VR Positioning Modes

| Mode | Behavior | Default For |
|------|----------|-------------|
| **World-Anchored** | Fixed in room space | Canvas Control, Data Browser |
| **Hand-Follow** | Loosely follows hand | Instance Tools, Quick Tools |
| **Wrist-Menu** | Summoned from wrist | Settings, Chat, Help |

---

## Canvas Control Panel (Unified Navigator + Layout)

### Why Unified?
- Navigator and Layout both have minimaps - duplication
- Users need to drag views from list to minimap - same panel enables this
- Single spatial control center with different focus modes

### Structure

```
┌─────────────────────────────────────────┐
│ CANVAS CONTROL                    🔗 _ × │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │           MINIMAP (always)          │ │  ← Single source of truth
│ │     [VGs as colored regions]        │ │     Click VG = select it
│ │     [Viewport indicator]            │ │     Drag view = place it
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [Navigate] [Views] [Groups] [Layout]   │  ← Mode tabs
├─────────────────────────────────────────┤
│  MODE-SPECIFIC CONTROLS                 │
└─────────────────────────────────────────┘
```

### Modes

| Mode | Purpose | Controls |
|------|---------|----------|
| **Navigate** | Move viewport around canvas | D-pad, position, zoom, bookmarks, home |
| **Views** | Manage views, drag to minimap | View list (draggable), filters, quick-add |
| **Groups** | ViewGroup management | VG list, select/merge/split/clone, link groups |
| **Layout** | Build/edit VGs, templates | VG builder, quick layouts, templates, size controls |

### Key Interaction: Drag-Drop Views to Minimap
- Views list is in same panel as minimap
- User drags view item directly to minimap cell
- Empty cells show drop zone indicator when dragging
- No tab switching needed for core workflow

---

## Instance Tools Panel

### Structure

```
┌─────────────────────────────────────────┐
│ INSTANCE TOOLS                    🔗 _ × │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ▣ Axial Slice          [A1]        │ │  ← Instance header
│ │ patient_brain_mri.nii • VTK Slice  │ │
│ │ In: Brain Analysis (3 views)  →    │ │  ← VG context (clickable)
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  [Controls] [Layers] [Links]            │  ← 3 tabs
├─────────────────────────────────────────┤
│  TAB CONTENT                            │
└─────────────────────────────────────────┘
│ ▼ WIDGETS (2 visible)              + │  ← Collapsible section
└─────────────────────────────────────────┘
```

### Why 3 Tabs + Collapsible Widgets?

| Component | Rationale |
|-----------|-----------|
| **Controls tab** | Type-specific tools (camera, slice, transform, display) - plugin-provided |
| **Layers tab** | Data layers, overlays, opacity - complex enough for own tab |
| **Links tab** | Per-instance linking (camera/filters/widgets/W-L), directional control |
| **Widgets section** | Always visible while switching tabs; measurements need quick access |

### Links Tab Content
- Shows views THIS instance is linked to
- Per-category linking (camera, filters, widgets, W/L can be linked independently)
- Direction control (unidirectional, bidirectional)
- "Link to..." action to create new links
- "View All Links" opens global Link Manager

---

## Link Manager (Separate Floating Panel)

Accessible via:
- Keyboard shortcut
- Canvas Control header button
- Instance Tools Links tab → "View All Links"

Shows:
- All link groups in workspace
- Group membership and direction
- Create/break link operations

---

## Workspace Organization

### Categories in Workspace Switcher

| Category | Scope | Description |
|----------|-------|-------------|
| **Global** | Project | Workspaces in main room, shared with all project members |
| **Room** | Room | Workspaces in specific rooms, shared with room members |
| **Personal** | User | Scratchpads that span rooms, only visible to user |

### Personal Scratchpads
- Room-agnostic (not tied to any room)
- User can have multiple named scratchpads
- Work can be shared later if desired
- Allows iteration in private before sharing

### Viewport Mode Toggle
- **Tab Mode**: Viewports as floating windows (Photoshop-style)
- **Tile Mode**: Viewports in organized grid
- Control lives in workspace header (affects all viewports of active canvas)

---

## ViewGroups (VGs)

### Types

| Type | Description | Creation |
|------|-------------|----------|
| **Explicit** | Named, templated, user-designed layout | Layout mode VG builder |
| **Implicit** | Unnamed, single member | Drag-drop view to empty canvas cell |

### Operations
- **Merge**: Combine multiple VGs into one
- **Split**: Break VG into separate pieces
- **Clone**: Duplicate VG (with or without data)
- **Link**: Connect VGs for synchronized behavior
- **Focus**: Bring entire VG into viewport focus
- **Save as Template**: Save layout for reuse

### Constraints
- Max VG size: 10×10 (max viewport size)
- VGs are puzzle pieces that fit together on infinite canvas
- Can save VGs as templates (layout only or with dataset mappings)

---

## Resize Behavior Architecture

### Breakpoints per Panel

```typescript
const BREAKPOINTS = {
  navigator: {
    minWidth: 240,      // Absolute minimum - warning below
    compactWidth: 280,  // Below: hide labels, simplify
    standardWidth: 320, // Normal floating panel
    expandedWidth: 400, // Full features, comfortable
  },
  instanceTools: {
    minWidth: 260,
    compactWidth: 300,
    standardWidth: 340,
    expandedWidth: 420,
  },
  dataBrowser: {
    minWidth: 220,
    compactWidth: 260,
    standardWidth: 300,
    expandedWidth: 380,
  },
};
```

### Resize Principles

| Principle | Behavior |
|-----------|----------|
| **Progressive Disclosure** | Labels hide → secondary info hides → icons remain |
| **Aspect Ratio Preservation** | Minimap maintains ratio at all sizes |
| **Wrapping over Clipping** | Button grids wrap to more rows |
| **Text Truncation** | Long text ellipsis (...) |
| **Hard Minimum** | Warning below min, resize enforced |

---

## Panel Architecture Summary

| Panel | Type | Chrome | Layout | Content |
|-------|------|--------|--------|---------|
| **Canvas Control** | Floating (persistent) | FULL | Tabbed (modes) | Minimap + mode controls |
| **Instance Tools** | Floating (contextual) | FULL | Tabbed | Controls/Layers/Links + Widgets |
| **Link Manager** | Floating (on-demand) | FULL | Standard | All link groups |
| **Files** | Left panel tab | - | Standard | Project files |
| **Datasets** | Left panel tab | - | Standard | Workspace datasets |
| **Annotations** | Left panel tab | - | Standard | Workspace annotations |
| **People** | Right panel tab | - | Standard | Presence, viewports |
| **Chat** | Right panel tab | - | Standard | Room chat |
| **Voice** | Right panel tab | - | Standard | Room voice |
| **Settings** | Right panel tab | - | Standard | User/workspace settings |

---

## Decisions Made This Session

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Panel persistence | Hybrid with Smart Defaults | Good onboarding + power user flexibility |
| Panel grouping | Full Docking System | VR-compatible via dock groups traveling together |
| Chrome levels | Static declaration (FULL/COMPACT/MINIMAL) | Predictable, contributor-friendly |
| VR positioning | Hybrid (world/hand/wrist) | Supports analysis and exploration workflows |
| Navigator + Layout | Unified as Canvas Control with modes | Single minimap, drag-drop enabled |
| Instance Tools tabs | Controls/Layers/Links (3 tabs) | Clean separation, links deserve own tab |
| Widgets location | Collapsible section (not tab) | Always visible while adjusting other settings |
| View vs Viewport | View = collaborative, Viewport = personal | Clear separation of concerns |
| Workspace categories | Global/Room/Personal | Covers project, team, and individual needs |
| Personal scratchpads | Multiple, room-agnostic | Allows private iteration before sharing |
| Tab/Tile toggle | In workspace header | Affects all viewports of active canvas |

---

## Artifacts Created

1. **panel-shell-architecture-explorer.jsx** - Chrome levels, layout variants, dock groups, VR modes
2. **real-panel-resize-explorer.jsx** - Navigator, Instance Tools, Data Browser with live resize
3. **unified-panel-architecture.jsx** - Complete architecture with Canvas Control, Instance Tools, Workspace Switcher

---

## Open Questions / Next Steps

1. **VG siblings visibility** - Is "In: Brain Analysis (3 views)" enough, or show sibling list in Instance Tools?
2. **Link Manager design** - Need to prototype the global link manager floating panel
3. **VG Builder** - Need detailed design for explicit VG creation in Layout mode
4. **Template system** - How templates are saved, organized, shared
5. **API contracts** - Define TypeScript interfaces for PanelShell, panel registration, dock groups

---

## Next Session: API Contracts

Ready to define:
1. `PanelShellProps` interface
2. `PanelRegistration` interface (for plugins)
3. `DockGroupState` model
4. `ViewConfiguration` updates for links
5. `ViewGroup` model refinements

---

## Continuation Prompt

```
I'm continuing the CIA Web panel architecture design. This session established comprehensive designs for the all-floating panel system.

Please search project knowledge for:
- PanelShell_Unified_Workspace_Design_Session_Memory_Log.md (this document)
- Floating_Workspace_Atomic_Design_Session_Memory_Log.md
- Modals_vs_FloatingPanels_Design_Session_Memory_Log.md

Previous session established:

1. **PanelShell Architecture**
   - Chrome levels: FULL/COMPACT/MINIMAL (static per panel type)
   - Layout variants: Standard/Split/Tabbed
   - Dock groups: Panels can combine into tabbed containers
   - VR modes: World-anchored, Hand-follow, Wrist-menu

2. **Canvas Control** (Unified Navigator + Layout)
   - Single minimap always visible
   - Mode tabs: Navigate, Views, Groups, Layout
   - Drag views from list to minimap for placement
   - VG selection, merge/split/clone operations

3. **Instance Tools**
   - 3 tabs: Controls (type-specific), Layers, Links
   - Collapsible Widgets section (always visible)
   - VG context in header with click-to-focus
   - Per-instance link management (camera/filters/widgets/W-L)

4. **View vs Viewport**
   - View = collaborative primitive (server-synced, linkable)
   - Viewport = personal window (local state, shareable position)
   - Multiple viewports can view same canvas
   - Tab/Tile mode for viewport arrangement

5. **Workspace Hierarchy**
   - Project → Rooms → Workspaces
   - Categories: Global (project), Room (team), Personal (scratchpads)
   - Personal scratchpads are room-agnostic

6. **ViewGroups**
   - Explicit (named, templated) vs Implicit (drag-drop)
   - Puzzle pieces on infinite canvas
   - Max size 10×10 (viewport limit)

ARTIFACTS CREATED:
- panel-shell-architecture-explorer.jsx
- real-panel-resize-explorer.jsx
- unified-panel-architecture.jsx

I'd like to continue with [API contracts / Link Manager design / VG Builder / implementation / etc.].
```

---

*Memory log created: January 28, 2025*
