# ViewLifecycleService & EventBus Integration Guide

## Overview

This guide explains how to integrate the new centralized services into CIA Web. The goal is to eliminate scattered view creation/placement logic and provide a consistent event system.

## Files Created

```
src/core/events/
├── EventBus.js          # Central typed event bus
├── eventConstants.js    # (existing - no changes needed)
└── index.js             # Unified exports

src/services/
├── ViewLifecycleService.js  # Centralized view operations
└── index.js                 # Service exports (update existing if present)
```

## Step 1: Initialize ViewLifecycleService

In `src/init/appInitializer.js`, add initialization after managers are ready:

```javascript
// Add import at top
import { viewLifecycleService } from "@Services/ViewLifecycleService.js";

// In initializePhase2() or after viewConfigurationManager is ready:
export async function initializePhase2() {
  // ... existing initialization ...

  // After ViewConfigurationManager and CanvasManager are ready:
  viewLifecycleService.initialize();

  log.info("ViewLifecycleService initialized");
}
```

## Step 2: Update CanvasWorkspace.jsx

The service now handles `cia:request-instance` events. Remove the duplicate handling from CanvasWorkspace:

### REMOVE these useEffect blocks from CanvasWorkspace.jsx:

```javascript
// REMOVE THIS ENTIRE useEffect (around line 150-230):
// Listen for instance creation events (same as WorkspaceGrid)
useEffect(() => {
  if (!activeCanvasId) return;

  const handleInstanceRequest = async (event) => {
    // ... all this code is now in ViewLifecycleService
  };

  window.addEventListener("cia:create-instance", handleInstanceRequest);
  window.addEventListener("cia:request-instance", handleInstanceRequest);

  return () => {
    window.removeEventListener("cia:create-instance", handleInstanceRequest);
    window.removeEventListener("cia:request-instance", handleInstanceRequest);
  };
}, [activeCanvasId, canvas, addPlacement, navigateTo, findNextEmptyCell]);

// REMOVE THIS ENTIRE useEffect:
// Listen for file drops to specific cells
useEffect(() => {
  if (!activeCanvasId) return;

  const handleFileToCell = async (event) => {
    // ... all this code is now in ViewLifecycleService
  };

  window.addEventListener("cia:load-file-to-cell", handleFileToCell);
  return () =>
    window.removeEventListener("cia:load-file-to-cell", handleFileToCell);
}, [activeCanvasId]);
```

### KEEP in CanvasWorkspace:

- Viewport navigation event handling
- Local placement operations (addPlacement, removePlacement for local UI state)
- Canvas dimension operations

## Step 3: Update DatasetsTab.jsx Callbacks

Replace direct manager calls with service calls:

```javascript
// Add import
import { viewLifecycleService } from "@Services";

// Update DatasetViewItemWrapper callbacks:

function DatasetViewItemWrapper({ view, datasetId }) {
  // Select/focus a view
  const handleSelect = useCallback((viewId) => {
    viewLifecycleService.focusView(viewId);
  }, []);

  // Close view (remove from canvas)
  const handleClose = useCallback(async (viewId) => {
    await viewLifecycleService.removeViewFromCanvas(viewId);
  }, []);

  // Trash view
  const handleTrash = useCallback(async (viewId) => {
    await viewLifecycleService.trashView(viewId);
  }, []);

  // Rename view
  const handleRename = useCallback((viewId, newName) => {
    viewLifecycleService.renameView(viewId, newName);
  }, []);

  // Navigate to view on canvas
  const handleNavigate = useCallback((viewId) => {
    viewLifecycleService.focusView(viewId);
  }, []);

  // Place view on canvas
  const handlePlaceOnCanvas = useCallback(async (viewId) => {
    await viewLifecycleService.placeView(viewId);
  }, []);

  // ... rest of component
}
```

## Step 4: Update ViewsTab.jsx

Same pattern - use service for operations:

```javascript
// Add import
import { viewLifecycleService } from "@Services";

// Update handlePlaceView and similar callbacks to use the service
const handlePlaceView = useCallback(async (viewId) => {
  await viewLifecycleService.placeView(viewId);
}, []);

const handleTrashView = useCallback(async (viewId) => {
  await viewLifecycleService.trashView(viewId);
}, []);
```

## Step 5: Update useInstanceSelector.js

Replace scattered logic with service calls:

```javascript
// Add import
import { viewLifecycleService } from "@Services";

// Update handlePlaceView
const handlePlaceView = useCallback(async (viewId) => {
  await viewLifecycleService.placeView(viewId);
}, []);
```

## Step 6: Subscribe to EventBus in Components

Components can subscribe to EventBus events for reactive updates:

```javascript
import { useEffect, useCallback } from "react";
import { eventBus, BUS_EVENTS } from "@Core/events";

function MyComponent() {
  const handleViewPlaced = useCallback(({ viewId, row, col }) => {
    console.log(`View ${viewId} placed at [${row}, ${col}]`);
    // Update local state, trigger refresh, etc.
  }, []);

  useEffect(() => {
    // Subscribe returns unsubscribe function
    const unsub = eventBus.on(BUS_EVENTS.VIEW_PLACED, handleViewPlaced);
    return unsub;
  }, [handleViewPlaced]);

  // ... rest of component
}
```

## Step 7: Debugging

In development mode, you can inspect the event system:

```javascript
// In browser console:

// Enable event tracing (logs all events)
const stopTrace = window.CIA.traceEvents();
// To stop: stopTrace();

// Check event history
window.CIA.eventBus.getHistory();

// Check specific event history
window.CIA.eventBus.getHistory("view:created");

// Test service directly
await window.CIA.viewLifecycleService.createAndPlaceView("dataset-123");
```

## API Reference

### ViewLifecycleService Methods

| Method                                                   | Description                | Returns                      |
| -------------------------------------------------------- | -------------------------- | ---------------------------- |
| `createView(datasetId, options)`                         | Create view (no placement) | `Promise<ViewConfiguration>` |
| `createAndPlaceView(datasetId, placementOpts, viewOpts)` | Create and place view      | `Promise<{view, placement}>` |
| `duplicateView(sourceViewId, options)`                   | Duplicate a view           | `Promise<ViewConfiguration>` |
| `duplicateAndPlaceView(sourceViewId, placementOpts)`     | Duplicate and place        | `Promise<{view, placement}>` |
| `placeView(viewId, options)`                             | Place existing view        | `Promise<CanvasPlacement>`   |
| `removeViewFromCanvas(viewId)`                           | Remove from canvas         | `Promise<void>`              |
| `trashView(viewId)`                                      | Soft delete                | `Promise<void>`              |
| `restoreView(viewId)`                                    | Restore from trash         | `Promise<ViewConfiguration>` |
| `deleteView(viewId)`                                     | Hard delete                | `Promise<void>`              |
| `renameView(viewId, newName)`                            | Rename view                | `Promise<ViewConfiguration>` |
| `focusView(viewId)`                                      | Focus/navigate to view     | `void`                       |

### BUS_EVENTS Reference

| Event             | Payload                                     | When                     |
| ----------------- | ------------------------------------------- | ------------------------ |
| `VIEW_CREATED`    | `{viewId, datasetId, name}`                 | New view created         |
| `VIEW_DUPLICATED` | `{viewId, sourceViewId, datasetId}`         | View duplicated          |
| `VIEW_PLACED`     | `{viewId, placementId, canvasId, row, col}` | View placed on canvas    |
| `VIEW_REMOVED`    | `{viewId}`                                  | View removed from canvas |
| `VIEW_TRASHED`    | `{viewId}`                                  | View moved to trash      |
| `VIEW_RESTORED`   | `{viewId, view}`                            | View restored            |
| `VIEW_DELETED`    | `{viewId}`                                  | View permanently deleted |
| `VIEW_RENAMED`    | `{viewId, newName}`                         | View renamed             |
| `VIEW_FOCUSED`    | `{viewId}`                                  | View selected/focused    |
| `VIEW_ERROR`      | `{error}`                                   | Operation failed         |

## Migration Checklist

- [ ] Add ViewLifecycleService initialization to appInitializer
- [ ] Remove event listeners from CanvasWorkspace.jsx
- [ ] Update DatasetsTab.jsx callbacks to use service
- [ ] Update ViewsTab.jsx callbacks to use service
- [ ] Update useInstanceSelector.js to use service
- [ ] Test: Create new view from dataset
- [ ] Test: Drag ViewItem to canvas (should duplicate)
- [ ] Test: Close view from panel
- [ ] Test: Trash view
- [ ] Test: Navigate to view

## Backward Compatibility

The service listens to the existing DOM events (`cia:request-instance`, `cia:close-view`, etc.) so existing components that dispatch these events will continue to work during migration. You can migrate components incrementally.
