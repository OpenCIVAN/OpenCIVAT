# Architecture Overview

This document explains the architecture and extensibility of the CIA War Room.

## Current State (Phase 1)

### Core Technologies
- **VTK.js**: 3D visualization
- **React**: UI components
- **Y.js**: Real-time collaboration (in-memory)
- **WebRTC**: Voice chat

### Architecture Layers
```
┌─────────────────────────────────────┐
│         React UI Layer              │  Components, layouts
├─────────────────────────────────────┤
│    Collaboration Managers           │  Presence, datasets, visualizations
├─────────────────────────────────────┤
│         Y.js State (In-Memory)      │  Real-time sync
├─────────────────────────────────────┤
│       VTK.js (Outside React)        │  3D rendering
└─────────────────────────────────────┘
```

### Key Managers

**DatasetManager** (`src/core/datasetManager.js`)
- Loads and stores VTP files
- Tracks dataset metadata
- Syncs metadata via Y.js (polydata stays local)

**VisualizationManager** (`src/core/visualizationManager.js`)
- Creates views of datasets
- Manages personal vs shared scopes
- Syncs camera positions

**PresenceSystem** (`src/collaboration/presenceSystem.js`)
- Tracks online users
- Heartbeat system
- Status tracking (active/idle/away)

## Extension Points

### Adding Backend Persistence

**Current**: Y.js in-memory only (lost on server restart)

**To Add Persistence**:

1. Set up backend database (PostgreSQL recommended)
2. Create `server/persistence.js` with PersistenceManager
3. Hook into Y.js update events to save state
4. Load persisted state on connection

See `TODO (Backend)` markers in code for specific integration points.

**Files to modify**:
- `src/collaboration/yjsSetup.js` - Add persistence provider
- Create `server/persistence.js` - Backend save/load logic
- Create `server/database/schema.sql` - Database tables

### Adding Multiple Groups

**Current**: Single shared space for everyone

**To Add Groups**:

1. Add `yGroups` map to Y.js setup
2. Nest visualizations under group IDs
3. Add group membership tracking
4. Update UI to show/switch groups

See `TODO (Groups)` markers in code.

**Files to modify**:
- `src/collaboration/yjsSetup.js` - Add yGroups map
- `src/core/visualizationManager.js` - Group scoping logic
- Create `src/collaboration/groupManager.js`
- UI components for group switching

### Adding Access Control

**Current**: Everything is public to all connected users

**To Add Access Control**:

1. Add authentication system
2. Add role-based permissions
3. Check permissions before operations
4. Add audit logging

See `TODO (Access Control)` markers.

## Contributing

### Code Style
- Use JSDoc comments for public methods
- Add TODO markers for future extensibility
- Keep managers focused on single responsibility
- Avoid tight coupling between systems

### Adding Features

1. Check if extension point exists (look for TODO markers)
2. If adding new domain, create new manager
3. Add Y.js map if state needs syncing
4. Update this doc with new extension points

### Testing

- Test with multiple browser tabs (simulates multiple users)
- Check console for sync messages
- Verify state persists across tabs

## Questions?

Open an issue or join our Discord (link TBD)