# CIA Web Glossary

Consistent terminology helps everyone communicate clearly. Use these terms in code, comments, documentation, and discussions.

## Core Entities

| Term | Definition |
|------|------------|
| **Dataset** | Raw scientific data (files) plus annotations. Immutable once uploaded. Layer 1 of data model. |
| **ViewConfiguration** | Settings for how to view a dataset: camera position, filters, colormap, etc. The collaborative unit. Layer 2. |
| **InstanceWindow** | Ephemeral GPU renderer that displays a ViewConfiguration. Can be created/destroyed freely. Layer 3. |
| **Handler** | Plugin that implements the `InstanceTypeHandler` interface for a visualization type (e.g., VTK, Molecule). |
| **Canvas** | The infinite 2D grid surface where views are placed. Each workspace has its own canvas. |
| **Placement** | A positioned item on a canvas, with row, column, and optional spanning. |
| **Viewport** | The visible window into a canvas. Shows a subset of the full canvas. Snaps to whole cells. |
| **Subset** | A saved selection of placements for "focus mode." Can include attached notes and images. |

## Workspace Terms

| Term | Definition |
|------|------------|
| **Project** | Top-level container for all collaborative work. Contains datasets, views, and workspaces. |
| **Project Room** | The main shared canvas visible to all project members. |
| **Breakout Room** | A sub-workspace for a subset of the team to collaborate privately. |
| **Personal Workspace** | Each user's private canvas for individual exploration. |
| **Focus Mode** | When a subset is activated, replacing the normal viewport with just those views. |

## Collaboration Terms

| Term | Definition |
|------|------------|
| **Presence** | Real-time awareness of who's online and what they're doing. |
| **Cursor Sync** | Sharing mouse/pointer positions between users in real-time. |
| **Link** | Connection between ViewConfigurations so changes sync automatically. |
| **Follow Mode** | One-way link: your view follows another user's view. |
| **Bidirectional Mode** | Two-way link: changes propagate in both directions. |
| **Broadcast Mode** | One-to-many: source controls all linked views (presentation mode). |

## VR Terms

| Term | Definition |
|------|------------|
| **Desktop Mode** | Traditional 2D browser interface with mouse/keyboard. |
| **VR Mode** | Immersive WebXR headset interface. |
| **Grid Mode** | VR layout where views are arranged in a curved arc around the user. |
| **Isolation Mode** | VR feature where a single view is scaled to room-size for walking around. |
| **Spatial Audio** | Audio positioned in 3D space so users hear voices from avatar locations. |

## Rendering Terms

| Term | Definition |
|------|------------|
| **Client Rendering** | GPU rendering in the browser using WebGL/VTK.js. |
| **Server Rendering** | GPU rendering on a remote server with video streamed to the client. |
| **Hybrid Rendering** | Mix of client and server rendering based on complexity. |
| **Dormant** | A view that exists but isn't currently rendered (outside the viewport). |
| **Live** | A view that is actively being rendered (inside the viewport). |
| **Context Lost** | When the WebGL GPU context crashes or is reclaimed by the system. |

## Actions

| Term | Code Usage | Definition |
|------|------------|------------|
| **Mount** | `mountInstance()` | Create and initialize an InstanceWindow |
| **Unmount** | `unmountInstance()` | Destroy an InstanceWindow, free GPU resources |
| **Load** | `loadData()` | Fetch data into a handler for rendering |
| **Duplicate** | `duplicateView()` | Create new ViewConfiguration from existing (new server ID) |
| **Link** | `linkViews()` | Connect ViewConfigurations for sync |
| **Span** | `resizePlacement()` | Resize a placement to cover multiple cells |
| **Focus** | `activateSubset()` | Enter focus mode with a subset |
| **Isolate** | `enterIsolationMode()` | VR: Pull view to room-scale |

## File Naming

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `PascalCase` | React components, Classes | `CanvasCell.jsx`, `WorkspaceCanvas.js` |
| `camelCase` | Functions, variables, hooks | `useCanvas.js`, `canvasManager.js` |
| `kebab-case` | SCSS files | `canvas-cell.scss` |
| `SCREAMING_SNAKE` | Constants | `LINK_MODES`, `MAX_SPAN` |

## Code Comment Prefixes

```javascript
// TODO: Something to implement later
// FIXME: Known bug that needs fixing
// HACK: Temporary workaround
// NOTE: Important context
// STUB: Placeholder for future implementation
// DEPRECATED: Will be removed
```

## Quick Reference

```
DATA MODEL:     Dataset → ViewConfiguration → InstanceWindow
                (data)    (how to view)       (renderer)

CANVAS:         Canvas contains Placements
                Viewport shows part of Canvas
                Subset = saved selection for focus mode

WORKSPACES:     Personal (private)
                Breakout (group)
                Project (everyone)

VR:             Grid Mode (curved arc of views)
                Isolation Mode (room-scale single view)

RENDERING:      Client (browser GPU)
                Server (remote GPU + video)
                Hybrid (mix)

LINKING:        Follow (one-way)
                Bidirectional (two-way)
                Broadcast (one-to-many)
```
