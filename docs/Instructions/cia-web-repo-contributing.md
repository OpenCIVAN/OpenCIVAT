# Contributing to CIA Web

Thank you for your interest in contributing to CIA Web! This document will help you get started.

## Table of Contents
- [Project Overview](#project-overview)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Conventions](#code-conventions)
- [Adding New Features](#adding-new-features)
- [Submitting Changes](#submitting-changes)

---

## Project Overview

CIA Web is an open-source **Collaborative Immersive Analytics** platform - "war rooms for scientific data analysis" where research teams can view 3D scientific data together in real-time across desktop and VR.

### Core Principles

1. **VR-First**: Designed for immersive experiences, implemented desktop-first for debugging
2. **Server Authority**: All persistent state comes from the server (for compliance/audit)
3. **Plugin Architecture**: New visualization types without touching core code
4. **Open Source**: Clean, documented code that contributors can understand

### Technology Stack

- **Frontend**: React, VTK.js, WebXR
- **Real-time**: Y.js (presence only), WebSocket
- **Backend**: Node.js, PostgreSQL, MinIO/S3
- **Voice**: LiveKit
- **Styling**: SCSS with design tokens

---

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/cia-web.git
cd cia-web

# Install dependencies
npm install

# Start development services (PostgreSQL, MinIO, Y.js server)
docker-compose up -d

# Start the development server
npm run dev
```

### Project Structure

```
src/
├── core/                    # Business logic (NO React here)
│   ├── data/
│   │   ├── models/          # Data classes (Dataset, ViewConfiguration, etc.)
│   │   └── managers/        # State management
│   ├── instances/
│   │   └── types/           # Plugin handlers (VTK, Molecule, etc.)
│   └── vr/                  # VR system
│
├── collaboration/           # Real-time sync
│   ├── yjs/                 # Y.js setup (presence ONLY)
│   └── presence/            # Who's online, cursors
│
├── ui/react/                # React UI
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   └── styles/              # SCSS with design tokens
│
└── init/                    # App initialization
```

### Import Aliases

Always use these aliases instead of relative paths:

```javascript
import { Dataset } from '@Core/data/models/Dataset';
import { FilesPanel } from '@UI/react/components/panels/FilesPanel';
import { presenceSystem } from '@Collaboration/presence/presenceSystem';
```

---

## Architecture Overview

### The Three-Layer Data Model

```
Dataset (Layer 1) → ViewConfiguration (Layer 2) → InstanceWindow (Layer 3)
     ↓                      ↓                            ↓
  Raw data            How to view it               GPU renderer
  + Annotations       Camera, filters              Ephemeral
  Immutable           Server ID (auditable)        Client ID
```

**Key insight**: Closing a window (InstanceWindow) doesn't lose your view settings (ViewConfiguration). The ViewConfiguration persists on the server.

### State Management Rules

| What | Where | Why |
|------|-------|-----|
| Persistent data | Server via REST API | Audit trail, compliance |
| Cursor positions | Y.js | Real-time, ephemeral |
| UI state | React state/context | Local only |

```javascript
// ✅ Correct - Server for persistent state
await api.put(`/views/${viewId}`, viewConfig);

// ✅ Correct - Y.js for presence
yCursors.set(userId, cursorPosition);

// ❌ Wrong - Don't store persistent state in Y.js
yViews.set(viewId, viewConfig);
```

### Plugin System

Visualization types are implemented as **handlers** that implement the `InstanceTypeHandler` interface. The core UI never imports visualization libraries directly.

```javascript
// ✅ Correct - UI uses handler interface
const handler = instanceTypeRegistry.get(viewConfig.type);
await handler.initialize(container, config);

// ❌ Wrong - UI imports VTK directly
import vtkRenderer from 'vtk.js/...';
```

See [Plugin Architecture](docs/architecture/PLUGIN_ARCHITECTURE.md) for details on adding new visualization types.

---

## Code Conventions

### File Naming

| Pattern | When | Example |
|---------|------|---------|
| `PascalCase` | Components, Classes | `CanvasCell.jsx` |
| `camelCase` | Functions, hooks | `useCanvas.js` |
| `kebab-case` | SCSS files | `canvas-cell.scss` |

### Component Structure

```
ComponentName/
├── ComponentName.jsx       # React component
├── ComponentName.logic.js  # Business logic (hooks)
├── ComponentName.scss      # Styles
├── ComponentName.test.jsx  # Tests
└── index.js               # Exports
```

### CSS/SCSS

- Use BEM naming: `.block__element--modifier`
- Use design tokens from `@UI/react/styles/theme`
- Co-locate styles with components

```scss
@import '@UI/react/styles/theme';

.canvas-cell {
  padding: $spacing-md;
  background: $color-bg-secondary;
  
  &__header { /* ... */ }
  &--selected { /* ... */ }
}
```

### Comments

```javascript
// TODO: Something to implement later
// FIXME: Known bug that needs fixing
// STUB: Placeholder for future implementation
// NOTE: Important context for understanding
```

---

## Adding New Features

### Adding a New Visualization Type

1. Create directory: `src/core/instances/types/yourType/`
2. Implement `InstanceTypeHandler` interface
3. Register in `instanceTypeRegistry.js`
4. No UI changes needed!

See [Plugin Architecture](docs/architecture/PLUGIN_ARCHITECTURE.md) for the full guide.

### Adding a New UI Component

1. Create directory: `src/ui/react/components/[category]/ComponentName/`
2. Follow the component structure above
3. Use design tokens for styling
4. Add tests

### Adding a New Data Model

1. Create model in `src/core/data/models/`
2. Create manager in `src/core/data/managers/`
3. Add API endpoints on server
4. Document in [Glossary](docs/GLOSSARY.md)

---

## Submitting Changes

### Before Submitting

- [ ] Code follows conventions above
- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] New features have tests
- [ ] Documentation updated if needed

### PR Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Write/update tests
5. Submit a PR with a clear description

### PR Description Template

```markdown
## What

Brief description of changes.

## Why

Why is this change needed?

## How

How does this implementation work?

## Testing

How was this tested?

## Screenshots

If UI changes, include before/after screenshots.
```

---

## Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions about architecture
- **Code Comments**: Many files have extensive documentation

## Related Documentation

- [Glossary](docs/GLOSSARY.md) - Terminology and naming
- [Plugin Architecture](docs/architecture/PLUGIN_ARCHITECTURE.md) - Adding visualization types
- [Architecture Decisions](docs/architecture/DECISIONS.md) - Why things are the way they are
- [Error Handling](docs/guides/ERROR_HANDLING.md) - Handling failures gracefully
