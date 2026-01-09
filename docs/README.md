# CIA Web Documentation

> Documentation for the Collaborative Immersive Analytics (CIA) Web Platform

## Quick Links

| I want to... | Go to |
|--------------|-------|
| Set up my dev environment | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| Understand the architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Use a component | [COMPONENT_STYLE_GUIDE.md](./COMPONENT_STYLE_GUIDE.md) |
| Add an icon | [ICON_README.md](./ICON_README.md) |
| Contribute to the project | [guides/CONTRIBUTOR_GUIDE.md](./guides/CONTRIBUTOR_GUIDE.md) |

---

## Documentation Structure

```
docs/
├── Core Documentation          # Start here
├── specifications/             # Design specs & feature definitions
│   └── linking/                # View linking system
├── guides/                     # How-to guides
├── testing/                    # Test procedures
├── prototypes/                 # Experimental implementations
└── archive/                    # Historical reference (pending cleanup)
```

---

## Core Documentation

Essential docs for all contributors:

| Document | Description | Status |
|----------|-------------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Server-authority architecture, data flow, API design | Current |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Dev environment setup, common tasks, ports | Current |
| [COMPONENT_STYLE_GUIDE.md](./COMPONENT_STYLE_GUIDE.md) | How to use atomic components | Current |
| [ICON_README.md](./ICON_README.md) | Icon system (217+ Material Symbols) | Current |
| [ATOMIC_DESIGN_MIGRATION.md](./ATOMIC_DESIGN_MIGRATION.md) | Component system overview | Complete |
| [CLEANUP_PROCEDURES.md](./CLEANUP_PROCEDURES.md) | Database reset, cache clearing | Current |
| [DOCUMENTATION_TRACKER.md](./DOCUMENTATION_TRACKER.md) | What needs documenting | Meta |

---

## Specifications

Design specifications define **what** to build and **why**.

### UI Specifications

| Specification | Covers |
|---------------|--------|
| [Canvas_Area_Design_Specification.md](./specifications/Canvas_Area_Design_Specification.md) | Main canvas workspace, cells, toolbars |
| [Left_Panel_Design_Specification.md](./specifications/Left_Panel_Design_Specification.md) | File browser, instance tools, datasets |
| [Right_Panel_Design_Specification.md](./specifications/Right_Panel_Design_Specification.md) | People, chat, voice, collaboration |
| [FloatingPanel_Component_Specification.md](./specifications/FloatingPanel_Component_Specification.md) | Detachable floating panels |

### VR Specifications

| Specification | Covers | Status |
|---------------|--------|--------|
| [VR_Interface_Design_Specification_v2.md](./specifications/VR_Interface_Design_Specification_v2.md) | VR UI patterns, controllers, panels | Spec complete |
| [VR_Accessibility_Settings_Panel_Specification.md](./specifications/VR_Accessibility_Settings_Panel_Specification.md) | VR accessibility features | Spec complete |

### View Linking System

The linking system enables view-to-view synchronization (camera, filters, selections).

| Document | Purpose |
|----------|---------|
| [View_Linking_System_Implementation_Guide_v2.md](./specifications/linking/View_Linking_System_Implementation_Guide_v2.md) | Main implementation guide |
| [VIEW_LINKING_VR_HANDOFF_PACKAGE.md](./specifications/linking/VIEW_LINKING_VR_HANDOFF_PACKAGE.md) | VR-specific linking |
| [HANDOFF_PACKAGE.md](./specifications/linking/HANDOFF_PACKAGE.md) | Complete feature handoff |

### Architecture & Framework

| Specification | Description | Status |
|---------------|-------------|--------|
| [CIAUI_Framework_Specification.md](./specifications/CIAUI_Framework_Specification.md) | WebGPU-native framework proposal | Research/Future |
| [VR_First_Architecture_Migration_Strategy.md](./specifications/VR_First_Architecture_Migration_Strategy.md) | VR-first design approach | Reference |

---

## Guides

Step-by-step instructions for specific tasks:

| Guide | Description | Status |
|-------|-------------|--------|
| [CONTRIBUTOR_GUIDE.md](./guides/CONTRIBUTOR_GUIDE.md) | Getting started as a contributor | Needs v2.0 update |
| [BACKEND_SETUP.md](./guides/BACKEND_SETUP.md) | Backend infrastructure setup | Needs update |
| [VR_IMPLEMENTATION.md](./guides/VR_IMPLEMENTATION.md) | WebXR implementation guide | Roadmap |
| [QUICK_REFERENCE.md](./guides/QUICK_REFERENCE.md) | Common patterns & snippets | Current |
| [THUMBNAIL_WORKER.md](./guides/THUMBNAIL_WORKER.md) | Thumbnail generation setup | Reference |

---

## Testing

| Document | Description |
|----------|-------------|
| [COMPUTE_PIPELINE_TESTING.md](./testing/COMPUTE_PIPELINE_TESTING.md) | 10-phase compute pipeline test checklist |

---

## Prototypes

Experimental implementations and tools. These are works-in-progress.

See [prototypes/README.md](./prototypes/README.md) for details.

---

## Archive

Historical documentation preserved for reference. Contents will be removed after git history is squashed.

| Folder | Contents | Files |
|--------|----------|-------|
| `archive/legacy/` | Superseded specifications (.md and .docx) | 11 |
| `archive/design-logs/` | Design session memory logs | 7 |
| `archive/prototypes/` | Implemented prototype JSX files | 14 |

> **Note:** Archive cleanup pending. These files are preserved for git history before squashing.

---

## Key Concepts

### Three-Layer Data Model

```
Dataset           → Raw data + annotations (server-authoritative)
    ↓
ViewConfiguration → How to view data: camera, filters, colors (linkable)
    ↓
Instance Window   → GPU renderer on canvas (ephemeral, client-side)
```

### Server-Authority Pattern

All persistent state lives on the server. The client requests changes, the server validates and broadcasts.

```
Client Action → WebSocket Request → Server Validation → Y.js Broadcast → All Clients Update
```

### Atomic Design System

Components are organized by complexity:

| Level | Examples | Count |
|-------|----------|-------|
| **Atoms** | Button, Icon, Badge, Input | 20 |
| **Molecules** | SearchBar, ColorPicker, TabBar | 27 |
| **Organisms** | InstanceCard, ViewContextBlock, ToolPanel | 10+ |

---

## Contributing to Docs

### Adding Documentation

1. Determine the type:
   - **Specification** → `specifications/`
   - **How-to guide** → `guides/`
   - **Test procedure** → `testing/`

2. Use clear, descriptive filenames (e.g., `Feature_Name_Specification.md`)

3. Include a header with:
   ```markdown
   # Document Title

   > Brief description

   **Status:** Draft | Current | Needs Update | Deprecated
   **Last Updated:** Month Year
   ```

4. Update this README if adding a new document

### Updating Documentation

1. Check [DOCUMENTATION_TRACKER.md](./DOCUMENTATION_TRACKER.md) for known issues
2. Update the "Last Updated" date
3. If making significant changes, note them in the document

---

## Questions?

- Check existing docs first
- Ask in the project chat
- File an issue for documentation gaps
