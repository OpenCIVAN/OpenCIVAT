# CIA Web: Comprehensive Contributor Guide

**Welcome to CIA Web!** This guide will help you understand and contribute to our collaborative immersive analytics platform, regardless of your experience level.

---

## Table of Contents

1. [What is CIA Web?](#what-is-cia-web)
2. [Core Concepts](#core-concepts)
3. [Architecture Overview](#architecture-overview)
4. [The Three-Layer Data Model](#the-three-layer-data-model)
5. [The Plugin System](#the-plugin-system)
6. [Key Managers](#key-managers)
7. [Collaboration Features](#collaboration-features)
8. [How to Contribute](#how-to-contribute)
9. [Common Patterns](#common-patterns)
10. [Future Roadmap](#future-roadmap)

---

## What is CIA Web?

**CIA Web** (Collaborative Immersive Analytics) is an open-source platform that allows scientific teams to:

- **Visualize** 3D datasets together in real-time
- **Collaborate** with voice chat, text chat, and shared cursors
- **Analyze** data using dimensionality reduction (PCA, t-SNE, UMAP)
- **Experience** data in VR with WebXR headsets
- **Annotate** important features directly in 3D space

### Real-World Analogy

Think of it like **Google Docs for 3D scientific data**. Just as multiple people can edit a document simultaneously, multiple scientists can explore and analyze 3D datasets together, seeing each other's cursors and changes in real-time.

### Primary Use Cases

- **Medical imaging**: Teams reviewing MRI/CT scan data together
- **Molecular biology**: Analyzing protein structures collaboratively
- **Materials science**: Exploring crystal structures and simulations
- **Climate science**: Visualizing atmospheric or oceanographic data

---

## Core Concepts

### 1. Real-Time Collaboration

**What it means:** When one user makes a change (loads a dataset, adds an annotation, moves the camera), everyone else sees it instantly.

**How it works:** We use **Y.js**, a library that implements CRDTs (Conflict-free Replicated Data Types). Think of it like Git, but for real-time data instead of files.

**Example:**

```javascript
// User A loads a dataset
yDatasets.set("dataset-123", { name: "brain-scan.vtp", uploadedBy: "userA" });

// User B's browser automatically receives this change and can access the dataset
```

### 2. 3D Visualization

**What it means:** Rendering scientific data as interactive 3D graphics in the browser.

**How it works:** We use **VTK.js** (Visualization Toolkit), a powerful library for scientific visualization that runs entirely in your browser using WebGL.

**Example:** Loading a point cloud representing a protein structure and rotating it with your mouse.

### 3. Immersive Analytics

**What it means:** Using VR headsets (like Meta Quest) to explore data in 3D space, where you can walk around and interact with data using hand controllers.

**How it works:** We use **WebXR**, a web standard that lets browsers talk to VR/AR devices.

### 4. Plugin Architecture

**What it means:** The system is designed so new visualization types can be added without modifying the core code.

**Why it matters:** A contributor can add support for 2D plots (using Plotly) or custom visualizations without understanding the entire codebase or risking breaking existing features.

---

## Architecture Overview

### The Big Picture

```
┌─────────────────────────────────────────────────┐
│              React UI Layer                     │  ← What users see and interact with
│   (Components, layouts, buttons, panels)        │
├─────────────────────────────────────────────────┤
│           Managers & Controllers                │  ← Business logic and coordination
│  (DatasetManager, WorkspaceManager, etc.)      │
├─────────────────────────────────────────────────┤
│         Collaboration Layer (Y.js)              │  ← Real-time synchronization
│      (Shared state, presence, cursors)         │
├─────────────────────────────────────────────────┤
│         Visualization Plugins                   │  ← Rendering engines (VTK, Plotly, etc.)
│    (VTKInstanceHandler, future handlers)       │
└─────────────────────────────────────────────────┘
```

### Key Principle: Separation of Concerns

The architecture follows a fundamental rule: **each layer only talks to adjacent layers**.

**Good:**

```javascript
// UI calls Manager
datasetManager.loadDataset(file);

// Manager calls Collaboration
yDatasets.set(dataset.id, dataset.metadata);

// Manager calls Visualization Plugin
handler.loadData(instanceData, dataset, polydata);
```

**Bad:**

```javascript
// UI directly manipulating Y.js (skips Manager layer)
yDatasets.set(dataset.id, dataset.metadata); // ❌ DON'T DO THIS

// UI importing VTK code (skips Plugin layer)
import { initializeScene } from "@Core/instances/types/vtk/scene.js"; // ❌ DON'T DO THIS
```

---

## The Three-Layer Data Model

This is **the most important architectural concept** in CIA Web. Understanding this will help you navigate the entire codebase.

### The Problem We're Solving

Imagine you have a 3D model of a heart. You might want to:

1. View it from the front
2. View it with a cross-section filter
3. View it with specific annotations highlighted
4. Share one view with your team while keeping another private

Each of these is a different **view** of the same **data**, and you might have multiple windows showing different views at once.

### The Solution: Three Layers

```
Layer 1: Dataset           ─┐
  (The truth - raw data)    │ Data flows DOWN
                            │
Layer 2: ViewConfiguration │ Each layer references
  (How to view the data)    │ the layer above it
                            │
Layer 3: InstanceWindow     │
  (Where it's displayed)   ─┘
```

### Layer 1: Dataset

**What it is:** The raw scientific data and its annotations.

**File location:** `src/core/data/models/Dataset.js`

**Contains:**

- Binary data (the actual VTK polydata file)
- Metadata (filename, point count, bounds, upload time)
- Annotations (3D markers with notes, spatially anchored to data)

**Key insight:** Annotations belong HERE, not in views. Why? Because an annotation at position `[10, 20, 30]` represents a real feature in the data - it exists regardless of how you're viewing it.

**Real-world analogy:** Think of this like a video file. The video data itself doesn't change based on whether you're watching it on your TV, phone, or computer.

**Code example:**

```javascript
const dataset = new Dataset({
  id: "dataset-123",
  filename: "brain-scan.vtp",
  uploadedBy: "alice",
  metadata: {
    pointCount: 50000,
    bounds: [-100, 100, -100, 100, -100, 100],
  },
  annotations: [
    {
      id: "ann-1",
      position: [10, 20, 30],
      text: "Tumor detected here",
      type: "point",
      userId: "alice",
    },
  ],
});
```

### Layer 2: ViewConfiguration

**What it is:** A saved state describing HOW to view a dataset.

**File location:** `src/core/data/models/ViewConfiguration.js`

**Contains:**

- Reference to which dataset it views (`datasetId`)
- Camera position and angle
- Active filters (e.g., "show only points where density > 50")
- Widget states (e.g., "measurement tool is active")
- Which annotations to display and how to style them

**Key insight:** This layer doesn't OWN the data or annotations - it just references them and configures how they appear.

**Real-world analogy:** Like a bookmark or saved view in Google Maps. The map data doesn't change, but you've saved a particular location, zoom level, and layer settings.

**Code example:**

```javascript
const viewConfig = new ViewConfiguration({
  id: "view-456",
  datasetId: "dataset-123", // References the dataset
  name: "Frontal view with tumor highlighted",
  camera: {
    position: [0, 0, 100],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0],
  },
  filters: [{ type: "threshold", parameter: "density", min: 50, max: 100 }],
  annotationDisplay: {
    enabled: true,
    filter: {
      tags: ["tumor"], // Only show annotations tagged 'tumor'
      userIds: ["alice"], // Only show Alice's annotations
    },
  },
});
```

### Layer 3: InstanceWindow

**What it is:** An actual viewport rendering a view configuration.

**File location:** `src/core/data/models/InstanceWindow.js`

**Contains:**

- Reference to which view it displays (`viewConfigurationId`)
- Which type of renderer to use (`type`: 'vtk', 'plotly', etc.)
- Grid position in the UI (row, column, size)
- Runtime references (DOM element, handler, initialization state)

**Key insight:** These are EPHEMERAL. You can close an instance window to free GPU memory, and the view configuration persists. Creating a new instance pointing to the same view brings everything back.

**Real-world analogy:** Like a browser tab. Closing the tab doesn't delete the webpage. Opening a new tab to the same URL loads it again.

**Code example:**

```javascript
const instance = new InstanceWindow({
  id: "instance-789",
  viewConfigurationId: "view-456", // References the view
  type: "vtk", // Uses VTK renderer
  gridPosition: { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
});
```

### Why This Separation Matters

**Without separation:**

```javascript
// Old way: Everything mixed together
const instance = {
  dataset: {
    /* huge binary data */
  },
  camera: {
    /* camera state */
  },
  filters: [
    /* filters */
  ],
  domElement: document.getElementById("viewport-1"),
};
// Problem: Can't easily:
// - Share the same view across multiple instances
// - Destroy an instance without losing your work
// - Switch between different views of the same data
```

**With separation:**

```javascript
// New way: Clean separation
const dataset = datasetManager.getDataset("dataset-123");
const view1 = viewManager.createView(dataset.id, { name: "Front" });
const view2 = viewManager.createView(dataset.id, { name: "Side" });
const instance1 = workspaceManager.createInstance({
  viewConfigurationId: view1.id,
});
const instance2 = workspaceManager.createInstance({
  viewConfigurationId: view2.id,
});

// Now you can:
// - Both instances reference the same dataset (efficient memory)
// - Each instance shows a different view
// - Close instance1 without affecting view1
// - Create a new instance for view1 later
```

---

## The Plugin System

### The Problem

Imagine we build the entire system specifically for VTK visualization. Then a contributor wants to add 2D scatter plots using Plotly. They'd have to:

1. Modify core managers to know about Plotly
2. Add Plotly-specific logic everywhere
3. Risk breaking existing VTK code
4. Make the codebase harder to maintain

**This doesn't scale.**

### The Solution: Plugin Architecture

Instead of the core system knowing about VTK, Plotly, or any specific visualization type, we define a **contract** (interface) that ALL visualization types must follow. The core only talks through this contract.

```
┌─────────────────────────────────────────────┐
│           Core System                       │
│    "I need to load data into an instance"   │
│    "I don't care HOW, just follow the      │
│     InstanceTypeHandler interface"         │
└─────────────────┬───────────────────────────┘
                  │
        Uses Interface (contract)
                  │
    ┌─────────────┴─────────────┬──────────────────┐
    │                           │                  │
┌───▼────────┐         ┌────────▼───┐    ┌───────▼──────┐
│ VTK Plugin │         │Plotly Plugin│   │ Your Plugin  │
│            │         │             │   │              │
│ implements │         │ implements  │   │  implements  │
│ interface  │         │ interface   │   │  interface   │
└────────────┘         └─────────────┘   └──────────────┘
```

### The Interface (Contract)

**File location:** `src/core/instances/types/InstanceTypeInterface.js`

Every plugin must implement these methods:

```javascript
class InstanceTypeHandler {
  // Identity
  getType()                    // Returns: 'vtk', 'plotly', 'custom', etc.
  getDisplayName()             // Returns: 'VTK 3D Visualization'

  // Lifecycle
  initialize(container, opts)  // Create the renderer in the DOM
  cleanup(instanceData)        // Clean up when instance is destroyed

  // Data handling
  loadData(instanceData, dataset, data)  // Render the dataset

  // UI Integration
  getTools(instanceData)       // Return toolbar buttons for this type

  // VR Support
  supportsInstanceVR()         // Does this type work in VR?
  enterInstanceVR(instanceData, xrSession)  // Switch to VR mode

  // Collaboration
  captureState(instanceData)   // Get current state for syncing
  applyRemoteState(instanceData, state)  // Apply state from another user
}
```

### How Core Uses Plugins

```javascript
// Core doesn't know about VTK or Plotly specifically
import { getHandlerForType } from "./types/instanceTypesInit.js";

// User wants to create a VTK instance
const handler = getHandlerForType("vtk"); // Registry returns VTK plugin

// Core asks the handler to do VTK-specific things
const instanceData = await handler.initialize(containerElement, options);
await handler.loadData(instanceData, dataset, polydata);

// Later, core asks handler to clean up
handler.cleanup(instanceData);
```

### The Registry

**File location:** `src/core/instances/types/InstanceTypeRegistry.js`

A simple lookup table that maps type names to their handlers:

```javascript
// During app startup
registry.register(vtkInstanceHandler); // Registers 'vtk'
registry.register(plotlyInstanceHandler); // Registers 'plotly'

// Later, anywhere in the app
const handler = registry.getHandler("vtk"); // Returns VTK handler
const availableTypes = registry.listTypes(); // Returns ['vtk', 'plotly']
```

### Adding a New Plugin: Step-by-Step

Let's say you want to add support for 2D scatter plots using Plotly.

**Step 1:** Create your handler

```javascript
// src/core/instances/types/plotly/PlotlyInstanceHandler.js
import { InstanceTypeHandler } from "../InstanceTypeInterface.js";
import Plotly from "plotly.js";

export class PlotlyInstanceHandler extends InstanceTypeHandler {
  getType() {
    return "plotly";
  }

  getDisplayName() {
    return "Plotly Charts";
  }

  async initialize(container, options) {
    // Create a Plotly div
    const plotDiv = document.createElement("div");
    plotDiv.style.width = "100%";
    plotDiv.style.height = "100%";
    container.appendChild(plotDiv);

    return {
      plotDiv,
      plotData: null,
    };
  }

  async loadData(instanceData, dataset, data) {
    // Convert dataset to Plotly format
    const plotData = [
      {
        x: data.x,
        y: data.y,
        mode: "markers",
        type: "scatter",
      },
    ];

    Plotly.newPlot(instanceData.plotDiv, plotData);
    instanceData.plotData = plotData;
  }

  cleanup(instanceData) {
    Plotly.purge(instanceData.plotDiv);
  }

  // ... implement other required methods
}

export const plotlyInstanceHandler = new PlotlyInstanceHandler();
```

**Step 2:** Register your handler (ONE LINE!)

```javascript
// src/core/instances/types/instanceTypesInit.js
import { plotlyInstanceHandler } from "./plotly/PlotlyInstanceHandler.js";

export function registerInstanceTypes() {
  instanceTypeRegistry.register(vtkInstanceHandler);
  instanceTypeRegistry.register(plotlyInstanceHandler); // ← Add this line
}
```

**Step 3:** That's it! The system now automatically:

- Shows "Plotly Charts" as an option in the UI
- Creates Plotly instances when requested
- Syncs Plotly state across users
- Handles cleanup when instances are destroyed

### Why This is Powerful

**For Contributors:**

- You only need to understand the interface, not the entire codebase
- Your code is isolated in your plugin folder
- You can't accidentally break other plugins or core functionality
- Testing is isolated to your plugin

**For the Project:**

- Core stays clean and simple
- New visualization types can be added without code reviews from core team
- Plugins can be developed in parallel by different contributors
- Bad plugins can be removed without affecting anything else

---

## Key Managers

Managers are the "business logic" layer - they coordinate between UI, collaboration, and visualization.

### DatasetManager

**What it does:** Manages all datasets (Layer 1 of the three-layer model)

**File location:** `src/core/data/managers/DatasetManager.js`

**Responsibilities:**

- Load VTK files from user uploads
- Store binary data in IndexedDB (browser's local database)
- Sync metadata through Y.js so other users know what datasets exist
- Manage dataset lifecycle (create, update, delete)
- Handle annotations attached to datasets

**Key methods:**

```javascript
// Load a new dataset
const dataset = await datasetManager.addDataset(file, userId);

// Get a dataset
const dataset = datasetManager.getDataset(datasetId);

// Get all datasets
const allDatasets = datasetManager.getAllDatasets();

// Delete a dataset (also cleans up views and instances)
await datasetManager.deleteDataset(datasetId);
```

**How it works:**

```javascript
// When User A uploads a file:
async addDataset(file, userId) {
  // 1. Generate unique ID
  const datasetId = generateDatasetId();

  // 2. Store binary data locally (IndexedDB)
  await dataCache.storeDataset(datasetId, file);

  // 3. Extract metadata
  const metadata = await extractMetadata(file);

  // 4. Create dataset object
  const dataset = new Dataset({ id: datasetId, filename: file.name, metadata });

  // 5. Sync metadata (not binary) to other users
  yDatasets.set(datasetId, dataset.toJSON());

  // 6. Emit event so UI can react
  this.emit('datasetAdded', { datasetId, dataset });

  return dataset;
}

// User B's browser receives the Y.js update:
yDatasets.observe((event) => {
  event.changes.keys.forEach((change, datasetId) => {
    if (change.action === 'add') {
      const metadata = yDatasets.get(datasetId);
      // User B now knows the dataset exists
      // But they need to download the actual file separately
    }
  });
});
```

### ViewConfigurationManager

**What it does:** Manages view configurations (Layer 2)

**File location:** `src/core/data/managers/ViewConfigurationManager.js`

**Responsibilities:**

- Create new views for datasets
- Update camera, filters, widget states
- Track which views are active (have instances)
- Handle view templates (saving a view to reuse later)
- Duplicate views (for "save before experimenting")

**Key methods:**

```javascript
// Create a view
const view = viewManager.createView(datasetId, { name: "My Analysis" });

// Update camera
viewManager.updateCamera(viewId, cameraState);

// Add a filter
viewManager.addFilter(viewId, { type: "threshold", min: 50, max: 100 });

// Mark view as active (has a rendering instance)
viewManager.activateView(viewId);

// Duplicate a view
const newView = viewManager.duplicateView(viewId, userId);
```

### WorkspaceManager (was InstanceManager)

**What it does:** Manages instance windows (Layer 3)

**File location:** `src/core/instances/workspaceManager.js`

**Key distinction:**

- Instance windows are **ephemeral** - they don't sync to other users
- They're just "projectors" that render ViewConfigurations
- When you close a browser tab, instance windows are destroyed
- ViewConfigurations persist and can be rendered again

**Responsibilities:**

- Create instances (get handler from registry)
- Initialize visualization in DOM
- Load data through handler
- Track instance lifecycle
- Clean up GPU resources

**Key methods:**

```javascript
// Create instance
const instance = await workspaceManager.createInstance({
  viewConfigurationId: viewId,
  type: "vtk",
  container: domElement,
});

// Destroy instance (frees GPU memory)
await workspaceManager.destroyInstance(instanceId);

// Get instance
const instance = workspaceManager.getInstance(instanceId);
```

### WorkspaceManager

**What it does:** Higher-level manager that coordinates the grid layout of instances

**File location:** `src/core/instances/workspaceManager.js`

**Responsibilities:**

- Manage bento-grid layout
- Track which instances are visible
- Handle instance focus/selection
- Coordinate between multiple instances

**Key methods:**

```javascript
// Get all instances
const instances = workspaceManager.getAllInstances();

// Set active instance
workspaceManager.setActiveInstance(instanceId);

// Update grid position
workspaceManager.updateGridPosition(instanceId, { row: 1, col: 0 });
```

### AnnotationManager

**What it does:** Manages annotations (part of Dataset layer)

**File location:** `src/core/data/managers/AnnotationManager.js`

**Responsibilities:**

- Create annotations on datasets
- Update/delete annotations
- Filter annotations by tags, users, types
- Sync annotations through Y.js

**Key methods:**

```javascript
// Create annotation
const annotation = annotationManager.createAnnotation(datasetId, {
  position: [10, 20, 30],
  text: "Important feature",
  type: "point",
  tags: ["tumor", "high-priority"],
});

// Get annotations for a dataset
const annotations = annotationManager.getAnnotationsForDataset(datasetId);

// Filter annotations
const filtered = annotationManager.filterAnnotations(annotations, {
  tags: ["tumor"],
  userIds: ["alice"],
});
```

---

## Collaboration Features

### Real-Time Synchronization (Y.js)

**What is Y.js?**
Y.js implements CRDTs (Conflict-free Replicated Data Types) - a way to sync data where conflicts are mathematically impossible.

**Traditional approach (conflicts possible):**

```
User A: sets value to "hello"
User B: sets value to "goodbye"
Result: Conflict! Who wins?
```

**CRDT approach (conflicts impossible):**

```
User A: appends "hello" to position 0
User B: appends "goodbye" to position 5
Result: "hellogoodbye" (both operations preserved)
```

**Our Y.js structure:**

```javascript
// Shared Y.js document
const ydoc = new Y.Doc();

// Shared maps for different data types
const yDatasets = ydoc.getMap("datasets"); // Dataset metadata
const yViews = ydoc.getMap("views"); // View configurations
const yAnnotations = ydoc.getMap("annotations"); // Annotations
const yPresence = ydoc.getMap("presence"); // Who's online
```

**How syncing works:**

```javascript
// User A's browser
yDatasets.set("dataset-123", {
  name: "brain-scan.vtp",
  uploadedBy: "alice",
  pointCount: 50000,
});

// Y.js automatically sends this change through WebSocket to server
// Server broadcasts to all connected clients
// User B's browser receives the change and fires observer

yDatasets.observe((event) => {
  event.changes.keys.forEach((change, key) => {
    if (change.action === "add") {
      console.log("New dataset added:", key);
      // Update UI to show new dataset
    }
  });
});
```

### Presence System

**What it does:** Shows who's online, their cursor position, and activity status

**File location:** `src/collaboration/presence/presenceSystem.js`

**How it works:**

```javascript
// Your browser broadcasts your state
awareness.setLocalState({
  userId: "alice",
  userName: "Alice",
  color: "#FF6B9D",
  cursor: { instanceId: "instance-1", x: 0.5, y: 0.5, z: 0 },
  status: "active", // 'active', 'idle', 'away'
});

// You receive everyone else's state
awareness.on("change", () => {
  const states = awareness.getStates();
  states.forEach((state, clientId) => {
    if (clientId !== awareness.clientID) {
      // Render this user's cursor in 3D space
      renderCursor(state.cursor, state.color, state.userName);
    }
  });
});
```

**Activity detection:**

```javascript
// Heartbeat every 30 seconds
setInterval(() => {
  awareness.setLocalState({
    ...awareness.getLocalState(),
    lastActive: Date.now(),
  });
}, 30000);

// Check if users are idle
const states = awareness.getStates();
states.forEach((state) => {
  const timeSinceActive = Date.now() - state.lastActive;
  if (timeSinceActive > 60000) {
    state.status = "idle";
  } else if (timeSinceActive > 300000) {
    state.status = "away";
  }
});
```

### Voice Chat (LiveKit)

**What it does:** WebRTC voice communication

**File location:** `src/collaboration/communication/voiceChat.js`

**How it works:**

1. User clicks "Join Voice"
2. Frontend requests access token from token server
3. Token server validates user and creates LiveKit token
4. Frontend connects to LiveKit room with token
5. Audio streams directly between users (peer-to-peer when possible)

**Code flow:**

```javascript
// 1. Request token
const response = await fetch("http://localhost:3001/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    room: "main-room",
    username: "alice",
  }),
});
const { token } = await response.json();

// 2. Connect to room
const room = new Room();
await room.connect("ws://localhost:7880", token);

// 3. Audio automatically starts streaming
```

### Chat System

**What it does:** Text messaging between users

**File location:** `src/collaboration/communication/textChat.js`

**How it works:**

```javascript
// Append to shared array
const yChatMessages = ydoc.getArray("chatMessages");
yChatMessages.push([
  {
    id: generateMessageId(),
    userId: "alice",
    userName: "Alice",
    text: "Found something interesting!",
    timestamp: Date.now(),
  },
]);

// All users receive this instantly
yChatMessages.observe(() => {
  const messages = yChatMessages.toArray();
  renderChatUI(messages);
});
```

---

## How to Contribute

### Getting Started

1. **Read this guide** - You're doing it! ✅

2. **Set up the development environment:**

   ```bash
   git clone [repository]
   cd CIA_Web
   npm install

   # Generate SSL certs (required for WebXR)
   mkdir certs
   openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem \
     -out certs/cert.pem -days 365 -nodes
   ```

3. **Start the services** (you need 4 terminal windows):

   ```bash
   # Terminal 1: Y.js server (collaboration)
   node server.js

   # Terminal 2: Token server (LiveKit auth)
   node token-server.js

   # Terminal 3: LiveKit (voice chat)
   livekit-server --dev

   # Terminal 4: Web app
   npm start
   ```

4. **Open your browser:** `https://localhost:8081`

5. **Test collaboration:** Open two tabs (simulates two users)

### Understanding the Codebase

**Start here:**

1. `README.md` - Quick overview
2. `ARCHITECTURE.md` - High-level architecture
3. This guide - Deep dive into concepts
4. `src/core/data/models/` - Look at the three data models
5. `src/core/instances/types/InstanceTypeInterface.js` - Study the plugin contract
6. `src/core/instances/types/vtk/VTKInstanceHandler.js` - See a complete implementation

**Follow the data flow:**

1. User uploads file → `DatasetManager.addDataset()`
2. Dataset created → `ViewConfigurationManager.createView()`
3. View created → `workspaceManager.createInstance()`
4. Instance renders → VTK handler's `initialize()` and `loadData()`

### Types of Contributions

#### 1. New Visualization Plugin

**Example:** Add support for 2D heat maps

**Steps:**

1. Create `src/core/instances/types/heatmap/HeatmapInstanceHandler.js`
2. Implement `InstanceTypeHandler` interface
3. Register in `src/core/instances/types/instanceTypesInit.js`

**Skills needed:** JavaScript, your chosen visualization library (D3, Plotly, etc.)

**Difficulty:** Medium (requires understanding the interface)

#### 2. VTK Widgets

**Example:** Add a ruler tool for measuring distances

**Steps:**

1. Create `src/core/instances/types/vtk/widgets/VTKRulerWidget.js`
2. Follow per-instance pattern (see `VTKOrientationWidget.js`)
3. Integrate in `VTKInstanceHandler.getTools()`

**Skills needed:** JavaScript, basic VTK.js knowledge

**Difficulty:** Medium

#### 3. UI Components

**Example:** Improve the dataset browser panel

**Steps:**

1. Edit `src/ui/react/components/panels/DatasetBrowser.jsx`
2. Use hooks to subscribe to `DatasetManager` events
3. Update SCSS in co-located file

**For adding slider controls:** See [SLIDER_CONTROLS.md](./SLIDER_CONTROLS.md)

**Skills needed:** React, SASS, UI/UX

**Difficulty:** Easy to Medium

#### 4. Collaboration Features

**Example:** Add "follow user" mode (your camera follows another user's camera)

**Steps:**

1. Add follow state to Y.js awareness
2. Subscribe to target user's camera updates
3. Add UI toggle in presence panel

**Skills needed:** JavaScript, Y.js basics, VTK camera APIs

**Difficulty:** Medium

#### 5. Backend Features

**Example:** Add persistent project storage

**Steps:**

1. Set up PostgreSQL database (Docker provided)
2. Create API endpoints in `server/api/`
3. Integrate with existing managers

**Skills needed:** Node.js, PostgreSQL, REST APIs

**Difficulty:** Medium to Hard

### Code Standards

#### Directory Structure

```
src/
├── core/              # Core infrastructure (type-agnostic)
│   ├── data/
│   │   ├── models/    # Data structures
│   │   └── managers/  # Business logic
│   └── instances/
│       └── types/     # Plugin implementations
├── collaboration/     # Real-time features
├── ui/
│   └── react/
│       └── components/
└── services/          # External services
```

#### Naming Conventions

- **Files:** `camelCase.js`, `ComponentName.jsx`
- **Classes:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Managers:** `*Manager` (e.g., `DatasetManager`)
- **Handlers:** `*Handler` (e.g., `VTKInstanceHandler`)

#### Import Aliases

```javascript
import { Dataset } from "@Core/data/models/Dataset.js";
import { datasetManager } from "@Init/appInitializer.js";
import { Button } from "@UI/react/components/common/Button.jsx";
import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";
```

#### Component Patterns

**Headless Logic:**

```javascript
// dataset-browser.logic.js
export function useDatasetBrowser() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    const handleDatasetAdded = ({ dataset }) => {
      setDatasets((prev) => [...prev, dataset]);
    };

    datasetManager.on("datasetAdded", handleDatasetAdded);
    return () => datasetManager.off("datasetAdded", handleDatasetAdded);
  }, []);

  const handleUpload = async (file) => {
    await datasetManager.addDataset(file, getUserId());
  };

  return { datasets, handleUpload };
}
```

**Presentation Component:**

```javascript
// DatasetBrowser.jsx
import { useDatasetBrowser } from "./dataset-browser.logic.js";

export function DatasetBrowser() {
  const { datasets, handleUpload } = useDatasetBrowser();

  return (
    <div className="dataset-browser">
      {datasets.map((ds) => (
        <DatasetCard key={ds.id} dataset={ds} />
      ))}
      <UploadButton onUpload={handleUpload} />
    </div>
  );
}
```

#### SASS Architecture

```scss
// components/DatasetBrowser.scss
@import "../../styles/theme.scss"; // Import design tokens

.dataset-browser {
  padding: $spacing-md;
  background: $color-surface;

  .dataset-card {
    @include card-style; // Use mixin
    margin-bottom: $spacing-sm;
  }
}
```

**Never hardcode:**

```scss
.bad {
  color: #ff6b9d; // ❌ Hardcoded color
  padding: 16px; // ❌ Hardcoded spacing
}

.good {
  color: $color-primary; // ✅ Use token
  padding: $spacing-md; // ✅ Use token
}
```

---

## Common Patterns

### Pattern 1: Creating and Displaying Data

**Complete flow from file upload to 3D rendering:**

```javascript
// 1. User selects file
<input type="file" onChange={handleFileSelect} />;

async function handleFileSelect(event) {
  const file = event.target.files[0];

  // 2. Add to DatasetManager (Layer 1)
  const dataset = await datasetManager.addDataset(file, getUserId());
  console.log("Dataset created:", dataset.id);

  // 3. Create a view configuration (Layer 2)
  const viewConfig = viewConfigurationManager.createView(dataset.id, {
    name: "Default View",
    camera: {
      /* default camera */
    },
  });
  console.log("View created:", viewConfig.id);

  // 4. Create an instance to display it (Layer 3)
  const instance = await workspaceManager.createInstance({
    viewConfigurationId: viewConfig.id,
    type: "vtk",
    container: document.getElementById("viewport-1"),
  });
  console.log("Instance created:", instance.id);

  // 5. The data is now visible!
  // Y.js automatically synced metadata to other users
  // Other users can now download and view the same dataset
}
```

### Pattern 2: Subscribing to Changes

**React hooks for manager events:**

```javascript
// Custom hook for dataset changes
function useDatasets() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    // Get initial datasets
    const initial = datasetManager.getAllDatasets();
    setDatasets(initial);

    // Subscribe to additions
    const handleAdd = ({ dataset }) => {
      setDatasets((prev) => [...prev, dataset]);
    };

    // Subscribe to removals
    const handleRemove = ({ datasetId }) => {
      setDatasets((prev) => prev.filter((ds) => ds.id !== datasetId));
    };

    datasetManager.on("datasetAdded", handleAdd);
    datasetManager.on("datasetRemoved", handleRemove);

    // Cleanup on unmount
    return () => {
      datasetManager.off("datasetAdded", handleAdd);
      datasetManager.off("datasetRemoved", handleRemove);
    };
  }, []);

  return datasets;
}

// Use in component
function DatasetList() {
  const datasets = useDatasets();
  return (
    <ul>
      {datasets.map((ds) => (
        <li key={ds.id}>{ds.filename}</li>
      ))}
    </ul>
  );
}
```

### Pattern 3: Per-Instance Storage

**For widgets, tools, and features that need instance-specific state:**

```javascript
// VTKRulerWidget.js - Correct pattern
class VTKRulerWidget {
  constructor() {
    this.instanceState = new Map(); // instanceId → state
  }

  initialize(instanceId, config) {
    // Create widget for this specific instance
    const widget = vtkDistanceWidget.newInstance();

    // Store per-instance
    this.instanceState.set(instanceId, {
      widget,
      enabled: false,
      measurements: [],
    });
  }

  enable(instanceId) {
    const state = this.instanceState.get(instanceId);
    if (!state) {
      console.error("Instance not initialized:", instanceId);
      return;
    }
    state.widget.setEnabled(true);
    state.enabled = true;
  }

  cleanup(instanceId) {
    const state = this.instanceState.get(instanceId);
    if (state) {
      state.widget.delete();
      this.instanceState.delete(instanceId);
    }
  }
}

// ❌ WRONG: Global singleton (breaks with multiple instances)
const widget = vtkDistanceWidget.newInstance();
function enable() {
  widget.setEnabled(true); // Which instance???
}
```

### Pattern 4: Async Operations with Loading States

```javascript
async function loadDataset(datasetId, instanceId) {
  try {
    // 1. Show loading indicator
    setLoading(true);
    setError(null);

    // 2. Get dataset metadata
    const dataset = datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }

    // 3. Fetch binary data (might be from cache or network)
    const polydata = await datasetManager.loadPolydata(datasetId);

    // 4. Get instance
    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) {
      throw new Error("Instance not found");
    }

    // 5. Get handler and load data
    const handler = getHandlerForType(instance.type);
    await handler.loadData(instance.instanceData, dataset, polydata);

    // 6. Success!
    setLoading(false);
    console.log("Dataset loaded successfully");
  } catch (error) {
    setLoading(false);
    setError(error.message);
    console.error("Failed to load dataset:", error);
  }
}
```

---

## Future Roadmap

### Phase 1: Foundation (Current)

✅ Plugin architecture
✅ Three-layer data model
✅ Basic VTK visualization
✅ Real-time collaboration (in-memory)
✅ Presence system
✅ Voice and text chat
✅ Annotations

### Phase 2: Backend & Persistence (In Progress)

🚧 PostgreSQL database
🚧 Multi-tenant project system
🚧 S3/MinIO file storage
🚧 Authentication & authorization
🚧 Server-side recording
🚧 Session playback

**What this means for contributors:**

- Datasets will persist across sessions
- Users can create private/shared projects
- Admin dashboard for managing users
- File deduplication (same file uploaded once)

### Phase 3: Advanced Collaboration

📋 Selective collaboration (link camera, link filters, etc.)
📋 Workspace layouts (bento grid templates)
📋 Breakout rooms
📋 Real-time co-editing of annotations
📋 Version history

**What this means for contributors:**

- Users can choose what to sync (e.g., "sync camera but not filters")
- Save and share workspace layouts
- Private sub-rooms within a session

### Phase 4: Advanced VTK Features

📋 Complete VR integration
📋 Advanced widgets (clipping planes, measurement tools)
📋 Volume rendering
📋 Animation/time series support
📋 Custom shaders

### Phase 5: Additional Plugins

📋 Plotly integration (2D plots)
📋 Three.js integration (custom 3D)
📋 Image viewer
📋 Molecule viewer (NGL, 3Dmol.js)

### Phase 6: Analysis Tools

📋 Jupyter-style notebook integration
📋 Python backend for heavy computation
📋 GPU-accelerated algorithms
📋 Machine learning integration

---

## Getting Help

### Debugging Tools

The app exposes a global `CIA` object with debugging helpers:

```javascript
// Open browser console (F12) and try these:

CIA.help(); // List all available commands
CIA.status(); // Show system status
CIA.listDatasets(); // List all datasets
CIA.listViews(); // List all view configurations
CIA.listInstances(); // List all instances
CIA.getDataset("id"); // Inspect a dataset
CIA.getView("id"); // Inspect a view configuration
CIA.getInstance("id"); // Inspect an instance
```

### Common Issues

**Issue: "Dataset loads but nothing renders"**

- Check: Is the instance initialized? `CIA.getInstance('id')`
- Check: Did the handler load data? Look for errors in console
- Check: Is the container element visible? Inspect DOM

**Issue: "Changes not syncing to other tabs"**

- Check: Is Y.js server running? `ws://localhost:8080`
- Check: Are both tabs connected? Look for "Connected to Y.js" in console
- Check: Are you using managers or manipulating Y.js directly? (Don't do the latter)

**Issue: "Voice chat not working"**

- Check: Is LiveKit server running? `http://localhost:7880`
- Check: Is token server running? `http://localhost:3002/health`
- Check: For HTTPS demos, are you using the frontend proxy paths? Token requests should go through `/voice-token`, and LiveKit signaling should use `/rtc`.
- Check: Did you start both services with `./scripts/start-livekit.sh`?
- Check: Did you allow microphone permissions?
- Check: Are both users in the same room?

### Where to Ask Questions

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Architecture questions, design decisions
- **Code Comments:** Many files have extensive documentation
- **This Guide:** You're reading it! Search for keywords

---

## Conclusion

CIA Web is built on three core principles:

1. **Separation of Concerns:** Each layer has a clear responsibility
2. **Plugin Architecture:** New features don't require modifying core code
3. **Collaboration-First:** Real-time sync is built into every feature

By understanding the three-layer data model (Dataset → ViewConfiguration → InstanceWindow) and the plugin system (InstanceTypeHandler interface), you have the foundation to contribute anywhere in the codebase.

**Next steps:**

1. Set up your development environment
2. Browse the codebase with this guide open
3. Pick a small feature to implement
4. Open a pull request!

Welcome to the team! 🎉
