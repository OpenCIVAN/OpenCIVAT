# CIA Web - Glossary & Terminology
## Consistent Language for Code, Comments, and Communication

Use these terms consistently in code, comments, documentation, and UI text.

---

## Core Entities

| Term | Definition | NOT This |
|------|------------|----------|
| **Dataset** | Raw scientific data (files) + annotations. Immutable once uploaded. Layer 1. | "File", "Data", "Source" |
| **ViewConfiguration** | How to view a dataset: camera, filters, colormap, etc. Collaborative unit. Layer 2. | "View" alone, "Instance", "Window" |
| **InstanceWindow** | Ephemeral GPU renderer displaying a ViewConfiguration. Can be destroyed. Layer 3. | "View", "Viewport", "Scene" |
| **Handler** | Plugin that implements InstanceTypeHandler interface for a visualization type. | "Plugin", "Renderer", "Driver" |
| **Canvas** | Infinite 2D grid of placements. A workspace surface. | "Grid", "Board", "Workspace" |
| **Placement** | A positioned item on a canvas (row, col, span). | "Cell", "Slot", "Position" |
| **Viewport** | The visible window into a canvas. Snaps to whole cells. | "View", "Window", "Frame" |
| **Subset** | Saved selection of placements for focus mode. Research artifact. | "Focus Group", "Selection", "Bookmark" |

---

## Actions & Operations

| Term | Definition | Use In Code As |
|------|------------|----------------|
| **Mount** | Create and initialize an InstanceWindow | `mountInstance()` |
| **Unmount** | Destroy an InstanceWindow, free GPU resources | `unmountInstance()` |
| **Load** | Fetch data into a handler for rendering | `loadData()` |
| **Unload** | Remove data from handler, keep handler alive | `unloadData()` |
| **Duplicate** | Create new ViewConfiguration from existing (new server ID) | `duplicateView()` |
| **Link** | Connect ViewConfigurations so properties sync | `linkViews()` |
| **Unlink** | Disconnect linked ViewConfigurations | `unlinkViews()` |
| **Focus** | Enter subset mode, replace viewport with subset views | `activateSubset()` |
| **Exit Focus** | Leave subset mode, return to normal viewport | `deactivateSubset()` |
| **Isolate** | VR: Pull single view to room-scale | `enterIsolationMode()` |
| **Span** | Resize placement to cover multiple cells | `resizePlacement()` |

---

## Workspace Hierarchy

| Term | Definition | Ownership |
|------|------------|-----------|
| **Project** | Top-level container for all collaborative work | Organization/Team |
| **Project Room** | Shared canvas visible to all project members | Project |
| **Breakout Room** | Sub-group workspace for focused collaboration | Group of users |
| **Personal Workspace** | Private canvas for individual exploration | Single user |

---

## Collaboration Terms

| Term | Definition |
|------|------------|
| **Presence** | Real-time awareness of who's online and what they're doing |
| **Cursor Sync** | Sharing mouse/pointer positions between users |
| **Link Mode: Follow** | One-way sync: this view follows another |
| **Link Mode: Bidirectional** | Two-way sync: changes propagate both directions |
| **Link Mode: Broadcast** | Source controls all, followers are read-only |
| **Link Status: Active** | Link is working normally |
| **Link Status: Broken** | Target became inaccessible |

---

## VR Terms

| Term | Definition |
|------|------------|
| **Desktop Mode** | Traditional 2D browser interface |
| **VR Mode** | Immersive WebXR headset interface |
| **Grid Mode** | VR: Views arranged in curved arc around user |
| **Isolation Mode** | VR: Single view scaled to room-size for walking around |
| **Spatial Audio** | Sound positioned in 3D space |
| **Controller Ray** | VR: Pointer line from controller |
| **Hand Tracking** | VR: Using hands instead of controllers |

---

## Rendering Terms

| Term | Definition |
|------|------------|
| **Client Rendering** | GPU rendering in browser via WebGL/VTK.js |
| **Server Rendering** | GPU rendering on server, video streamed to client |
| **Hybrid Rendering** | Mix of client and server based on complexity |
| **Render Mode** | Which rendering approach is active |
| **Context Lost** | WebGL GPU context crashed or was reclaimed |
| **Dormant** | View not currently rendered (outside viewport) |
| **Live/Rendering** | View actively rendered (inside viewport) |

---

## UI Component Names

| Term | What It Is |
|------|------------|
| **TopBar** | Horizontal bar at top with logo, tabs, user |
| **StatusBar** | Horizontal bar at bottom with connection status |
| **LeftPanel** | Collapsible panel on left (Data) |
| **RightPanel** | Collapsible panel on right (Layout + Collaboration) |
| **CanvasGrid** | Main workspace area showing placements |
| **CanvasCell** | Single cell in the grid (may span multiple) |
| **MiniMap** | Small overview of entire canvas |
| **InstanceToolbar** | Handler-specific tools for a view |
| **LayoutPanel** | Right panel tab for canvas navigation |
| **ModeToggle** | Desktop/VR switch in top bar |
| **WorkspaceTabs** | Project/Breakout/Personal tabs |

---

## File/Directory Naming

| Pattern | When To Use | Example |
|---------|-------------|---------|
| `PascalCase` | React components, Classes | `CanvasCell.jsx`, `WorkspaceCanvas.js` |
| `camelCase` | Functions, variables, hooks | `useCanvas.js`, `canvasManager.js` |
| `kebab-case` | SCSS files (match component) | `CanvasCell.scss` |
| `SCREAMING_SNAKE` | Constants | `LINK_MODES`, `MAX_SPAN` |
| `__tests__` | Test directories | `__tests__/CanvasCell.test.jsx` |

---

## Code Comment Prefixes

```javascript
// TODO: Something to implement later
// FIXME: Known bug that needs fixing
// HACK: Temporary workaround, needs proper solution
// NOTE: Important information for understanding
// DEPRECATED: Will be removed, use alternative
// STUB: Placeholder for future implementation
// PERF: Performance-related note
// SECURITY: Security consideration
```

---

## API Endpoint Naming

| Pattern | Example | Purpose |
|---------|---------|---------|
| `GET /api/{resources}` | `GET /api/canvases` | List all |
| `POST /api/{resources}` | `POST /api/canvases` | Create new |
| `GET /api/{resources}/:id` | `GET /api/canvases/123` | Get one |
| `PUT /api/{resources}/:id` | `PUT /api/canvases/123` | Update |
| `DELETE /api/{resources}/:id` | `DELETE /api/canvases/123` | Delete |
| `POST /api/{resources}/:id/{action}` | `POST /api/views/123/duplicate` | Special action |
| `GET /api/{parent}/:id/{children}` | `GET /api/canvases/123/placements` | Nested resource |

---

## Event Names

| Pattern | Example | When Emitted |
|---------|---------|--------------|
| `{entity}Added` | `placementAdded` | After entity created |
| `{entity}Updated` | `viewUpdated` | After entity modified |
| `{entity}Removed` | `subsetRemoved` | After entity deleted |
| `{entity}Loaded` | `canvasLoaded` | After entity fetched |
| `{action}Started` | `renderStarted` | Before async action |
| `{action}Completed` | `renderCompleted` | After async action |
| `{action}Failed` | `renderFailed` | On error |
| `{state}Changed` | `viewportChanged` | On state change |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `NETWORK_ERROR` | Server unreachable |
| `AUTH_ERROR` | Authentication failed |
| `NOT_FOUND` | Resource doesn't exist |
| `CONFLICT` | Edit conflict with another user |
| `VALIDATION_ERROR` | Invalid input |
| `INSUFFICIENT_MEMORY` | GPU/memory limit exceeded |
| `CONTEXT_LOST` | WebGL context lost |
| `HANDLER_ERROR` | Instance type handler failed |
| `VR_NOT_SUPPORTED` | WebXR not available |
| `PERMISSION_DENIED` | User lacks permission |

---

## Abbreviations (Use Sparingly)

| Abbreviation | Meaning | Use In |
|--------------|---------|--------|
| `id` | Identifier | Variable names, params |
| `config` | Configuration | Variable names |
| `ctx` | Context | React contexts only |
| `ref` | Reference | React refs only |
| `opts` | Options | Function parameters |
| `cb` | Callback | Function parameters |
| `err` | Error | Catch blocks |
| `idx` | Index | Loop variables |
| `prev` | Previous | State updaters |
| `curr` | Current | Comparisons |

**Avoid in code:** `mgr`, `btn`, `ctrl`, `usr`, `msg`, `pos` - spell these out.

---

## UI Text Guidelines

| Context | Style | Example |
|---------|-------|---------|
| Button labels | Action verb | "Save", "Delete", "Create View" |
| Error titles | What happened | "Failed to Load Data" |
| Error messages | Why + what to do | "The server is unavailable. Your changes will sync when reconnected." |
| Tooltips | Brief explanation | "Reset camera to default position" |
| Empty states | Helpful guidance | "No views yet. Click + to create one." |
| Confirmations | Question form | "Delete this view? This cannot be undone." |

---

## Quick Reference Card

```
LAYERS:          Dataset → ViewConfiguration → InstanceWindow
                 (data)    (how to view)       (GPU renderer)

CANVAS:          Canvas contains Placements
                 Viewport shows part of Canvas
                 Subset is saved selection of Placements

VR:              Grid Mode (curved arc of views)
                 Isolation Mode (room-scale single view)

RENDERING:       Client (browser GPU)
                 Server (remote GPU, video stream)
                 Hybrid (mix based on complexity)

OWNERSHIP:       Personal (private)
                 Breakout (group)
                 Project (all members)

LINKING:         Follow (one-way)
                 Bidirectional (two-way)
                 Broadcast (source controls all)
```
