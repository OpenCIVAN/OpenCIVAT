# Architecture

This document describes the system architecture of OpenCIVAN: how its components are organized, how data flows through the system, and why key design decisions were made.

---

## Navigation

| | |
|---|---|
| [System Overview](#system-overview) | [Frontend Structure](#frontend-structure) |
| [Backend Services](#backend-services) | [Data Flow](#data-flow) |
| [Collaboration Model](#collaboration-model) | [VR Architecture](#vr-architecture) |
| [Compute Pipeline](#compute-pipeline) | [Path Aliases](#path-aliases) |
| [Design Decisions](#design-decisions) | |

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Quest 2                     │
│                                                         │
│   React 18 + VTK.js + WebXR                            │
│   ┌──────────────┐  ┌───────────┐  ┌────────────────┐  │
│   │  VTK Canvas  │  │ Collab UI │  │  VR Wrist Menu │  │
│   └──────┬───────┘  └─────┬─────┘  └───────┬────────┘  │
│          │                │                 │           │
│   ┌──────▼───────────────▼─────────────────▼────────┐  │
│   │            Services & Core Layer                 │  │
│   │  ViewLifecycleService · DatasetManager          │  │
│   │  VRManager (WebXR) · Y.js Presence              │  │
│   └──────┬──────────────────────┬───────────────────┘  │
└──────────┼──────────────────────┼─────────────────────-┘
           │                      │
     HTTP/REST                WebSocket
           │                      │
┌──────────▼──────────────────────▼───────────────────────┐
│                      Backend                            │
│                                                         │
│   ┌────────────┐   ┌───────────┐   ┌─────────────────┐  │
│   │ Express API│   │ Y.js WS   │   │  LiveKit Voice  │  │
│   │  :3001     │   │  :9001    │   │  (external opt) │  │
│   └──────┬─────┘   └───────────┘   └─────────────────┘  │
│          │                                              │
│   ┌──────▼──────────────────────────────────────┐      │
│   │              Data Layer                      │      │
│   │  PostgreSQL 15 · MinIO · Redis + BullMQ      │      │
│   └──────────────────┬──────────────────────────┘      │
│                      │                                  │
│   ┌──────────────────▼──────────────────────────┐      │
│   │         Compute Workers (Docker)             │      │
│   │  Python VTK worker · Node thumbnail worker   │      │
│   └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Structure

The frontend follows **Atomic Design** with a strict **unidirectional dependency rule**:

```
UI Components
    ↓
Services          (ViewLifecycleService, authService, apiClient, …)
    ↓
Managers          (DatasetManager, ViewConfigurationManager, CanvasManager, …)
    ↓
Core              (EventBus, VRManager, Y.js collaboration, session)
    ↓
Utils             (logger, colorHelpers, idGenerator, …)
```

No layer may import from a layer above it.

### Directory layout

```
src/
├── ui/react/
│   ├── components/          Atomic Design: atoms → molecules → organisms
│   │   ├── atoms/           Button, Icon, Badge, Slider, Toggle, …
│   │   ├── molecules/       SearchBar, Tabs, ColorSwatch, VRButton, …
│   │   ├── organisms/       FilterToolbar, VRWristMenu, RoomHeader, …
│   │   ├── panels/          LeftPanel, RightPanel, FloatingPanel, …
│   │   ├── modals/          DatasetSelectorModal, CreateRoomModal, …
│   │   ├── layout/          Header, StatusBar, ThreeEdgeLayout
│   │   └── workspace/       CanvasWorkspace, InstanceViewport, …
│   ├── context/             React context providers (AdaptiveContext, …)
│   ├── hooks/               useWorkspaces, useCanvas, useRoomIndicator, …
│   ├── store/               Zustand stores (toastStore, canvasHistoryStore)
│   └── styles/              Design tokens, SCSS, global styles
│
├── core/
│   ├── instances/types/vtk/ VTK.js handler + 24 feature modules
│   ├── vr/                  VRManager (WebXR session), navigation, tools
│   ├── collaboration/       Y.js setup, observers, presence, cursor, chat
│   ├── managers/            Singleton data managers
│   ├── events/              EventBus (pub/sub)
│   └── session/             Session state
│
├── services/                High-level operations called by UI
│   ├── ViewLifecycleService.js
│   ├── ViewLinkingService.js
│   ├── authService.js
│   ├── apiClient.js
│   ├── serverSync.js
│   ├── voice/               LiveKit room, command, feedback services
│   └── storage/             IndexedDB provider, query cache
│
├── algorithms/              Client-side t-SNE, UMAP, PCA (TensorFlow.js)
├── utils/                   Pure functions, no upstream imports
├── vr/                      vrModeManager (thin mode-state bridge)
└── init/                    Three-phase app startup (Phase 0, 1, 2)
```

---

## Backend Services

### Express API (`server/src/`)

REST + WebSocket server. All persistent state mutations go through here.

| Route group | Resource |
|---|---|
| `/api/files` | Dataset upload, download, delete |
| `/api/views` | View configuration CRUD |
| `/api/workspaces` | Workspace and canvas management |
| `/api/rooms` | Collaborative session management |
| `/api/annotations` | Annotation CRUD |
| `/api/compute` | Dispatch jobs to Python VTK worker |
| `/api/bookmarks` | Save/restore camera + filter state |
| `/api/thumbnails` | Snapshot cache |
| `/api/auth/me` | Current user info |

Auth middleware validates Keycloak JWT tokens, or passes a fixed dev user when `DEV_BYPASS_AUTH=true`.

### Y.js WebSocket Server (`:9001`)

Handles the real-time presence layer only. Persistent state (datasets, views, annotations) is handled by the REST API, not Y.js.

Y.js shared maps:

| Map | Contents |
|---|---|
| `yCursors` | userId → screen/world cursor position |
| `yCameras` | viewId → camera state |
| `yViewPresence` | viewId → list of viewers |
| `yAvatars` | userId → VR head + hand poses |
| `yVRControllers` | `${userId}_${hand}` → controller state |
| `yText` | Chat messages array |

### Data Storage

| Store | Purpose |
|---|---|
| PostgreSQL 15 | Datasets, views, workspaces, annotations, users |
| MinIO | Binary dataset files (`.vtp`, `.vtk`) |
| Redis 7 | BullMQ job queues, rate limiting |
| IndexedDB (browser) | Offline dataset cache, query results |

---

## Data Flow

### Loading a dataset

```
User clicks "Load Data"
    → DatasetSelectorModal (upload file)
    → POST /api/files (multipart)
    → MinIO stores binary
    → PostgreSQL stores metadata
    → API broadcasts via WebSocket to all clients in session
    → All clients: DatasetManager.addDatasetFromServer()
    → User places dataset on canvas cell
    → ViewLifecycleService.createView(datasetId, options)
    → VTK.js VTKInstanceHandler renders
```

### Collaboration cursor sync

```
User moves mouse on canvas
    → cursors.js throttled mousemove handler
    → syncCursorToYjs() → Y.js yCursors map update
    → Y.js WebSocket broadcasts to other clients
    → yjsObservers.js cursor observer fires on other clients
    → VTKInstanceCursors renders remote cursor in VTK scene
```

---

## Collaboration Model

OpenCIVAN uses a **server-authoritative** architecture for persistent state:

- The REST API is the single source of truth for datasets, views, workspaces, and annotations.
- Y.js handles **presence only**: cursors, camera states, VR avatars, and controller poses.
- WebSocket broadcasts from the API propagate persistent state changes to all connected clients.

This avoids CRDT conflicts on complex objects (view configurations, compute job results) while still providing low-latency cursor and avatar sync.

### Initialization sequence

```
Phase 0: Server sync check (detect stale local state)
Phase 1: Core services (storage, managers, server sync connect)
Phase 2: User services (Y.js connect, presence, cursors, voice, workspace)
```

---

## VR Architecture

### Entry flow

```
User clicks "Enter VR"
    → vrManager.enterVR()
    → navigator.xr.requestSession('immersive-vr', features)
    → XRSession created
    → vrManager emits 'vrEntered'
    → AdaptiveContext switches to VR token set
    → VR wrist menu activates
    → XR render loop starts (_onXRFrame)
```

### Components

| Module | Responsibility |
|---|---|
| `VRManager.js` | XR session lifecycle, reference space, render loop, controller/hand events |
| `VRGridLayout.js` | Calculate 3D world positions for canvas panels (flat grid) |
| `VRNavigationController.js` | Switch between fly and teleport modes |
| `VRFlyMode.js` | Continuous thumbstick movement |
| `VRTeleportMode.js` | Point-and-teleport arc navigation |
| `VRToolManager.js` | Register and dispatch VR tools |
| `VRAnnotationTool.js` | Place annotations in 3D space via controller |
| `VRMeasureTool.js` | Distance and angle measurement |
| `VRClipBoxTool.js` | Interactive clipping box manipulation |
| `VRSlicePlaneTool.js` | Slice plane drag in VR |
| `VRCursorSync.js` | Broadcast controller positions to other users |
| `VRParticipantSync.js` | Receive and render remote user avatars |
| `VTKVRController.js` | VTK.js controller model rendering |
| `VTKVRAvatars.js` | VTK.js remote avatar rendering |
| `VRWristMenu` | React UI mounted in VR (look at left wrist) |

### AdaptiveContext

`AdaptiveProvider` with `autoSyncVR` subscribes to `vrManager` events and updates a React context that controls design tokens (larger touch targets, different colors, simplified layouts) for the VR environment.

---

## Compute Pipeline

Large VTK operations (downsampling, filtering, meshing) are offloaded to a Python worker:

```
Client → POST /api/compute { operation, params, fileId }
       → BullMQ job added to Redis queue
       → Python vtk-worker picks up job
       → Downloads input from MinIO
       → Runs VTK operation
       → Uploads result to MinIO
       → Updates job status in PostgreSQL
       → API WebSocket broadcasts completion
       → Client downloads result and loads in VTK.js
```

---

## Path Aliases

Webpack and Vitest resolve these aliases:

| Alias | Source directory |
|---|---|
| `@UI` | `src/ui` |
| `@Core` | `src/core` |
| `@Services` | `src/services` |
| `@Utils` | `src/utils` |
| `@VTK` | `src/core/instances/types/vtk` |
| `@VR` | `src/vr` |
| `@Init` | `src/init` |
| `@Algorithms` | `src/algorithms` |
| `@Collaboration` | `src/collaboration` |

---

## Design Decisions

<details>
<summary>Why Y.js for presence only?</summary>

Early versions used Y.js for all shared state. This caused conflicts when complex objects (VTK view configurations, compute results) were edited concurrently, and made audit logging and access control difficult. The current architecture uses the REST API as the source of truth and Y.js only for ephemeral high-frequency data (cursors, poses) where CRDT semantics are a good fit.

</details>

<details>
<summary>Why VTK.js and not Three.js directly?</summary>

VTK.js provides scientific visualization primitives that would require significant implementation effort in raw Three.js: volume rendering, slice views (MPR), isosurface extraction, scalar coloring pipelines, and interoperability with VTK file formats and server-side VTK Python workers.

</details>

<details>
<summary>Why server-side compute workers?</summary>

Large scientific datasets (millions of points) are too heavy to process in the browser. Offloading to a Python VTK worker allows operations like decimation, isosurface extraction, and dimensionality reduction on data that would exhaust browser memory or take too long in JavaScript.

</details>

<details>
<summary>Why MinIO and not direct filesystem storage?</summary>

MinIO provides S3-compatible object storage that scales independently of the database and supports pre-signed URLs for direct browser uploads, without exposing the filesystem to application code.

</details>
