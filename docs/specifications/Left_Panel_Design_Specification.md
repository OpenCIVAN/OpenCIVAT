# Left Panel Design Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - December 2024

---

## Document Overview

This specification defines the complete design for the Left Panel of CIA Web, the primary interface for data management, view control, and annotation workflows. The Left Panel provides access to project files, datasets, views, instance tools, layout controls, annotations, bookmarks/filters, and cursor settings.

### Design Principles

- **Plugin-aware:** Generic components that work with any instance type handler
- **Collaborative-first:** All features support real-time multi-user workflows
- **Server-authority:** Persistent state saved to server for async collaboration
- **Memory-efficient:** Optimize for working sets, not full project loads
- **Contributor-safe:** Clear boundaries for plugin and extension development

---

## Implementation Status Summary

| Tab | Status | Priority |
|-----|--------|----------|
| Files | ðŸ”„ Partial | P0 |
| Datasets | ðŸ”„ Partial | P0 |
| Views | ðŸ”„ Partial | P0 |
| Instance Tools | ðŸ”„ Partial | P0 |
| Layout | âŒ TODO | P1 |
| Annotations | âŒ TODO | P1 |
| Bookmarks & Filters | âŒ TODO | P2 |
| Cursors | âŒ TODO | P2 |

---

## Tab Structure

The Left Panel contains 8 tabs organized into logical groupings with visual dividers.

| Tab | Icon | Color | Purpose |
|-----|------|-------|---------|
| Files | ðŸ“ | Blue | Project storage, upload, versioning, organization |
| Datasets | ðŸ—ƒï¸ | Teal | Loaded data palette, dataset management |
| Views | ðŸ‘ | Purple | View creation, placement, linking, lifecycle |
| Instance Tools | ðŸ”§ | Amber | Active instance control panel |
| Layout | ðŸ“ | Green | Canvas structure, templates, navigation |
| Annotations | ðŸ“ | Pink | All annotation management (central hub) |
| Bookmarks & Filters | ðŸ”– | Indigo | Saved states and presets |
| Cursors | ðŸŽ¯ | Teal/Cyan | Cursor visibility and color settings |

### Divider Placement

- After Datasets (separates DATA SOURCES from VISUALIZATION)
- After Layout (separates VISUALIZATION from SPATIAL & STATE)
- After Bookmarks & Filters (separates main tabs from Cursors for future VR expansion)

---

## Three-Layer Data Architecture

The Left Panel implements a clear separation between storage, working set, and active visualization.

### The Artist's Studio Analogy

| Layer | Analogy | Tab | Persistence |
|-------|---------|-----|-------------|
| Files | Supply closet (all paints in storage) | Files Tab | Permanent (server) |
| Datasets | Palette (paints I'm working with today) | Datasets Tab | Per-workspace (server) |
| Views | Easel (what's currently on canvas) | Views Tab | Per-workspace (server) |

### Memory Optimization

| State | Memory Impact | Description |
|-------|---------------|-------------|
| File (stored) | 0 MB client | Server-side only |
| Dataset (loaded) | ~1-10 MB | Metadata, thumbnails, LOD info |
| View (inactive) | ~10-50 MB | Low-res proxy, cached thumbnail |
| View (active) | Full memory | GPU textures, full resolution |
| View (background) | Reduced | Lower LOD, smaller textures |

### Persistence Model

All state persists to server for synchronous and asynchronous collaboration. Users return to find their workspace exactly as they left it.

| Data | Storage | Restored On Return |
|------|---------|-------------------|
| Files | Server (S3/MinIO) | Always present |
| Dataset metadata | Server DB (PostgreSQL) | Auto-restored |
| ViewConfigurations | Server DB | Auto-restored |
| Canvas Layout | Server DB | Auto-restored |
| Annotations | Server DB | Auto-restored |
| Instance GPU State | Client memory | Rebuilt from ViewConfig |

---

## âœ… IMPLEMENTED

### Files Tab (Partial)

**Implemented:**
- Basic FileTree component structure
- File upload functionality
- FileItem display component
- Basic file organization (folders)

**File States (Specified, partially implemented):**

| Icon | State | Description |
|------|-------|-------------|
| â—‹ | Stored | In storage, not loaded as dataset |
| â— | Loading | Currently loading into dataset |
| â— | Loaded | Active as dataset (in Datasets Tab) |
| âŸ³ | Processing | Server-side compute running |
| âš ï¸ | Error | Failed to process/validate |
| ðŸ”’ | Restricted | User doesn't have access |

### Datasets Tab (Partial)

**Implemented:**
- DatasetTree component structure
- Basic dataset listing
- View creation workflow started

**Structure (Specified):**
Single view 'By Dataset' - hierarchical tree showing Dataset â†’ Views relationship.

### Instance Tools Tab (Partial)

**Implemented:**
- Basic tool palette structure
- Some VTK-specific tools
- Layers panel started

**Active Instance Header (Specified):**
Always shows which instance is being controlled: color dot, name, dataset, type, position, status, annotation count. Dropdown to switch instances.

---

## âŒ REMAINING TO IMPLEMENT

### Files Tab - Remaining Items

**Organization features:**
- Starred: User-pinned files for quick access
- Recent: Recently accessed files (viewed, loaded, modified)
- Tags: Virtual organization by tags
- Collections: User-created smart folders

**Key Actions (remaining):**
| Action | Description |
|--------|-------------|
| Preview | Quick look without loading into memory (server-rendered) |
| Load as Dataset | Creates dataset in Datasets Tab (explicit load) |
| Open | Load + Create View + Place on Canvas (convenience) |
| Version History | View and restore previous versions |
| Permissions | Control who can access the file |

**Upload Behavior:**
Default: Just upload (file goes to storage). Option to auto-load as dataset. Users explicitly choose when to load files into their working set.

**Permissions:**
- Default: All project members can view (collaborative software)
- Restricted files: Show greyed out to users without access
- Workspace warning: Alert when loading restricted file if not all members can view
- Breakout rooms: Suggested for restricted content

### Datasets Tab - Remaining Items

**Filter Chips:**
| Filter | Description |
|--------|-------------|
| Active | Datasets with at least one view on canvas |
| Inactive | Datasets loaded but no views on canvas |
| Shared | Datasets/views shared by others |

**Dataset Node:**
Shows: Type icon, name, view count, handler type, file size, load timestamp. Expands to show child views.

**View Row (Within Dataset):**
| Element | Description |
|---------|-------------|
| Color dot | Instance color |
| Status dot | â— Active (filled), â—‹ Inactive (outline) |
| Name | View configuration name |
| Position | Grid position if active, '---' if inactive |
| Menu | View actions |

**Multi-Handler Support:**
A single dataset can support operations from multiple handlers. When creating a view, users can choose the view type (e.g., CSV as Table, Chart, Scatter, or Heatmap). Default set in settings, allows switching.

**Storage Management:**
Footer shows memory usage. Storage Management modal shows loaded datasets by size with unload options and auto-unload settings.

### Views Tab (Full implementation needed)

**Canvas Navigator (Shared):**
The Canvas Navigator is shared between Views and Layout tabs with mode toggle:

| Mode | Primary Tab | Focus |
|------|-------------|-------|
| Layout Mode | Layout Tab | Canvas structure, merge cells, resize |
| Views Mode | Views Tab | View placement, move, swap |

**Sections:**
| Section | Content |
|---------|---------|
| On Canvas | Active views currently placed on the canvas grid |
| Not Placed | Inactive views that exist but aren't on canvas |
| Recently Deleted | Soft-deleted views (30-day retention for compliance) |

**ViewItem Component - Collapsed State:**
Instance color, status dot, name, position, quick info (type, annotation count, modification time).

**ViewItem Component - Expanded State:**
- Thumbnail and metadata
- Applied filters (as removable chips)
- Size picker (1Ã—1, 2Ã—1, 1Ã—2, 2Ã—2, Custom)
- Linking configuration (camera, filters, widgets, cursors)
- Action buttons (Go To, Tools, Duplicate, Bookmark, Share, Close, Delete)
- Origin tracking (if spawned from bookmark)

**View Linking:**
Connect views for synchronized exploration.

| Property | Description |
|----------|-------------|
| Camera | Synchronized camera position/angle |
| Filters | Shared filter settings |
| Widgets | Shared measurement widgets |
| Cursors | Show cursors across linked views |

| Mode | Behavior |
|------|----------|
| Follow | One-way: This view follows the leader |
| Bidirectional | Two-way: Changes sync both directions |
| Broadcast | One-to-many: Leader broadcasts to followers |

**Close vs Delete:**
| Action | Result | Recoverable |
|--------|--------|-------------|
| Close | Removes from canvas, view exists in 'Not Placed' | Yes, just place again |
| Delete | Moves to 'Recently Deleted' | Yes, for 30 days |
| Permanently Delete | Gone forever | No |

### Instance Tools Tab - Remaining Items

**Subtabs:**
| Subtab | Content |
|--------|---------|
| Tools | Handler-provided tools: Navigation, Representation, Widgets, Appearance |
| Layers | Visibility and opacity control for data geometry, annotations, widgets, cursors, etc. |
| Annotations | Quick annotation tools and list (links to full Annotations tab) |

**Tools Subtab Categories:**
| Category | Examples |
|----------|----------|
| Navigation | Reset, Fit, Ortho, Iso, Camera presets (Top, Bottom, Left, Right, Front, Back) |
| Representation | Surface/Wireframe/Points, Opacity slider, Color mapping |
| Widgets | Ruler, Angle, Clip Plane (toggleable) |
| Appearance | Background color, Show Grid, Show Axes, Orientation Cube |

**Handler Interface:**
Tools come from the instance type handler (VTK, Chart, etc.) via getToolsConfig() and getLayersConfig() methods. This enables plugin extensibility.

**Sync with Viewport Toolbar:**
Tool states bidirectionally sync between Instance Tools tab and the mini toolbar that appears on hover in each instance viewport.

### Layout Tab (Full implementation needed)

**Canvas Navigator:**
Shared with Views Tab. Supports docking/undocking. When floating, shows combined tools bar. When docked, shows mode toggle (Layout/Views).

**Layout Mode:**
| Mode | Behavior |
|------|----------|
| Grid | Manual placement - drop views where you want |
| Flow | Auto-arrangement - new views fill next available slot (row-first or column-first) |

**New View Size (Spawn Settings):**
Presets: 1Ã—1, 2Ã—1, 1Ã—2, 2Ã—2, 3Ã—1, 3Ã—2, Custom. Determines default size when creating new views.

**Quick Layouts:**
Preset arrangements: Single, Side-by-Side, Stacked, 2Ã—2 Grid, 3-up, 1+2, Custom. Rearranges existing views when applied.

**Layout Templates:**
Key Concept: Layouts are structural templates, NOT view containers.

A layout template defines canvas dimensions, merged cell regions, slot names/labels, and constraints. It does NOT define which views/datasets go where.

**Use Cases:**
- Standard Analysis: Team always uses 3-column comparison layout
- Research Protocol: 20Ã—28 grid for systematic review
- Presentation Mode: Large main view + 4 thumbnails

**Template Scope:**
Personal, Workspace, Project, or Global. Templates can be exported/imported as .cialayout files.

**Tools:**
| Tool | Description |
|------|-------------|
| Select | Click to select views, drag to move |
| Pan | Drag to pan canvas viewport |
| Merge | Select multiple views to merge cells |
| Edit | Enable resize handles, show drop zones |

**Canvas Size:**
Manual control of canvas dimensions (columns Ã— rows). Protection prevents reducing size if views would be removed. Compact Layout option auto-moves views to fit.

### Annotations Tab (Full implementation needed)

**Purpose:** The single source of truth for all annotation management. Central command center for workspace, instance, and dataset annotations.

**Annotation Scope Hierarchy:**
| Scope | Anchored To | Persists With | Use Cases |
|-------|-------------|---------------|-----------|
| Workspace | Canvas grid coordinates | Workspace layout | Arrows between views, labels, freehand notes |
| Instance/View | View configuration | The specific view | Temporary markers, view-specific callouts |
| Dataset | Data coordinates (x,y,z) | The dataset itself | Tumor markers, measurements, scientific annotations |

**Context Selector:**
Toggle between Workspace Canvas and Instance context. Instance dropdown shows all instances on canvas with position. Clear indication of what you're annotating.

**Annotation Tools:**
- Instance Context: Select, Point, Ruler, Angle, Region, Text, Draw, Highlight
- Workspace Context: Select, Freehand, Arrow, Rectangle, Ellipse, Text, Sticky Note

**Drawing Annotations:**
Freehand drawing/highlighting directly on 3D surfaces. Drawings are anchored to data coordinates (follow surface geometry). Stored as arrays of (position, normal) pairs.

**Replies & Threads:**
Annotations can have threaded replies (like GitHub comments). Reply count badge shown on collapsed items. Full thread visible in expanded view.

**Status States:**
| Status | Icon | Description |
|--------|------|-------------|
| Open | âšª | Active, needs attention |
| Resolved | âœ… | Addressed, still visible |
| Archived | ðŸ“¦ | Completed, hidden from default view (preserved for audit) |

**View-Specific Snapshots:**
View-specific annotations capture a snapshot of view state (camera, filters) when created. Essential for audit - allows 'Restore View Context' to recreate the visual context.

**Instance Tools Integration:**
The Annotations subtab in Instance Tools is a portal to this tab, not a separate system. 'Open Full Annotations Panel' button switches to Annotations tab with context pre-selected.

### Bookmarks & Filters Tab (Full implementation needed)

**Key Distinction:**
| Aspect | Bookmark | Filter |
|--------|----------|--------|
| What it saves | Complete view snapshot | Subset of properties |
| When to use | 'Come back to exactly this' | 'Apply settings to any view' |
| Creates new view? | Yes, spawns ViewConfiguration | No, modifies existing |
| Dataset-bound? | Yes | No, type-compatible |

**Scope Chips:**
Project / Workspace / Mine - multi-select with counts. Search works across both subtabs.

**Bookmarks Subtab - What a Bookmark Saves:**
Dataset reference, camera state, active filters, widget states, representation, color mapping, visibility, lighting, annotations, thumbnail.

**Open Behavior:**
- Auto-flow placement on canvas
- Creates new ViewConfiguration with server-generated ID
- Links to bookmark (view knows origin)

**Origin Tracking:**
View Details shows 'Spawned from bookmark: [name]' with options to View Original or Save Changes (as new or update original).

**Filters Subtab - What a Filter Saves:**
Subset of properties: camera, appearance, representation, color mapping, widgets, annotations visibility.

**Application:**
- Select properties to apply with checkboxes
- Conflicts highlighted
- All changes added as single undo operation

**Multiple Filter Loading:**
Modal shows filters in order. Conflict resolution: Use First / Last / Skip.

### Cursors Tab (Full implementation needed)

**Purpose:** Configure how YOU see other workspace members' cursors (local preferences, not presence tracking).

**Sections:**
| Section | Content |
|---------|---------|
| Your Cursor | Broadcast toggle, style (Ring/Dot/Crosshair/Pointer), color picker |
| Display Options | Show names, show self cursor, size, fade inactive (30s default) |
| Workspace Members | Filterable list with per-user visibility and color overrides |

**Accessible Color Algorithm:**

Color Assignment Hierarchy:
1. Admin-assigned color (enforced, locked)
2. User's chosen color (if available in pool)
3. Auto-assigned accessible color
4. Local override (viewer only, doesn't change actual color)

**Primary Palette (8 colors):**
Perceptually distinct for deuteranopia/protanopia/tritanopia: Blue #0077BB, Cyan #33BBEE, Teal #009988, Orange #EE7733, Red #CC3311, Magenta #EE3377, Purple #AA3377, Yellow #EECC66

**Assignment Algorithm:**
- Check admin override (locked)
- Check user preference (if not taken)
- Auto-assign from available pool (hash-based for consistency)
- Generate unique shade using golden ratio hue stepping if pool exhausted

**Color Distance Check:**
CIEDE2000 deltaE < 30 = too similar, warn user when selecting custom color.

**Settings Persistence:**
| Setting | Storage |
|---------|---------|
| User color preference | Server (cross-workspace) |
| Admin assignments/locks | Server (workspace) |
| Display options | Local Storage (device only) |
| Per-user overrides | Local Storage (device only) |

---

## File Structure

```
src/ui/react/components/panels/LeftPanel/
â”œâ”€â”€ tabs/
â”‚   â”œâ”€â”€ FilesTab/
â”‚   â”œâ”€â”€ DatasetsTab/
â”‚   â”œâ”€â”€ ViewsTab/
â”‚   â”œâ”€â”€ InstanceToolsTab/
â”‚   â”œâ”€â”€ LayoutTab/
â”‚   â”œâ”€â”€ AnnotationsTab/
â”‚   â”œâ”€â”€ BookmarksFiltersTab/
â”‚   â””â”€â”€ CursorsTab/
```

### Component Pattern

Each tab follows the pattern:
- `index.jsx` - Export
- `TabName.jsx` - Main component
- `TabName.scss` - Co-located styles
- `components/` - Child components
- `modals/` - Modal dialogs
- `hooks/` - Custom hooks

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F | Open Files tab |
| D | Open Datasets tab |
| V | Open Views tab |
| I | Open Instance Tools tab |
| L | Open Layout tab |
| A | Open Annotations tab |
| B | Save current view as bookmark |
| Shift+B | Open Bookmarks & Filters tab |
| U | Upload files |
| N | New view (in Views tab) |
| M | Quick add measurement |
| T | Quick add text annotation |
| Enter | Open/Go to selected item |
| Space | Expand/collapse selected item |
| Delete | Close selected view / Delete item |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

---

## Backend API Endpoints

### Files
- `GET/POST /api/projects/:projectId/files`
- `GET/PATCH/DELETE /api/files/:id`
- `GET /api/files/:id/versions`
- `POST /api/files/:id/upload` (multipart)

### Datasets
- `GET/POST /api/workspaces/:workspaceId/datasets`
- `GET/PATCH/DELETE /api/datasets/:id`
- `POST /api/datasets/:id/load`
- `POST /api/datasets/:id/unload`

### Views
- `GET/POST /api/workspaces/:workspaceId/views`
- `GET/PATCH/DELETE /api/views/:id`
- `POST /api/views/:id/place`
- `POST /api/views/:id/close`

### Annotations
- `GET/POST /api/datasets/:datasetId/annotations`
- `GET/POST /api/views/:viewId/annotations`
- `GET/POST /api/workspaces/:workspaceId/annotations`
- `PATCH/DELETE /api/annotations/:id`
- `POST /api/annotations/:id/replies`

### Bookmarks & Filters
- `GET/POST /api/projects/:projectId/bookmarks`
- `GET/POST /api/projects/:projectId/filters`

### Layout Templates
- `GET/POST /api/projects/:projectId/layout-templates`
- `GET/PATCH/DELETE /api/layout-templates/:id`

---

## Summary

The Left Panel provides comprehensive project and visualization management through 8 specialized tabs:

| Tab | Focus |
|-----|-------|
| Files | Project storage - the supply closet |
| Datasets | Working set - the palette |
| Views | Active visualization - the easel |
| Instance Tools | Per-instance control panel |
| Layout | Canvas structure and templates |
| Annotations | Central annotation hub (3 scopes) |
| Bookmarks & Filters | Saved states and presets |
| Cursors | Collaborative cursor settings |

### Key Architectural Decisions

- Three-layer data model (Files â†’ Datasets â†’ Views) with clear separation
- Server-authority persistence for sync/async collaboration
- Shared Canvas Navigator between Layout and Views tabs
- Annotations tab as central hub (Instance Tools subtab is a portal)
- Layout templates as reusable blueprints (independent of views)
- Accessible color algorithm for cursors
- Soft delete with 30-day retention for compliance

---

*This specification provides the foundation for implementing the Left Panel with extensibility for future plugin types and VR integration.*
