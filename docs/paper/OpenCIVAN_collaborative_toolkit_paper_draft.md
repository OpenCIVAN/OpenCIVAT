# OpenCIVAN Paper Draft
## Research Paper Draft — Collaborative Immersive Analytics Toolkit

---

## Title Options

1. **OpenCIVAN: A Collaborative Immersive Analytics Toolkit for Cross-Device Scientific Visualization**
2. **OpenCIVAN: Dual-Channel Synchronization for Multi-User Immersive Scientific Visualization**
3. **OpenCIVAN: An Open Toolkit for Collaborative Immersive Analytics Across Desktop and WebXR Devices**

> Preferred title: Option 1 — emphasizes collaborative scope without overstating implementation maturity.

---

## Abstract

Scientific visualization increasingly requires collaboration: multiple analysts must coordinate attention within complex 3D datasets, compare interpretations, and reason collectively about spatially distributed features. However, building infrastructure to support this collaboration is difficult. Existing immersive analytics systems typically address either single-user visualization quality or multi-user communication, but seldom provide a reusable, open toolkit that tightly integrates shared visualization state, cross-device participation, and real-time presence into a unified architecture.

We present OpenCIVAN (Open Collaborative Immersive Visual Analytics Network), a prototype open-source toolkit that enables collaborative immersive analytics workflows in browser environments. OpenCIVAN implements a dual-channel synchronization architecture that separates ephemeral collaborative state — user cursors, spatial presence, VR avatar poses, and camera follow — from durable persistent state — datasets, view configurations, canvas layouts, and annotations. Client-side scientific visualization is built on VTK.js with support for VTP, VTI, VTU, STL, PLY, OBJ, and time-series formats, augmented by a modular feature system for volume rendering, scalar coloring, glyphs, clipping, thresholding, and dimensionality reduction. Cross-device participation is implemented via the WebXR Device API, supporting desktop and immersive headset clients within the same shared session. Real-time voice communication is integrated through the LiveKit WebRTC platform. The current implementation also includes session recording, 3D annotation, and an optional Matrix-protocol federation layer. We outline evaluation directions for measuring synchronization correctness, collaborative workflow support, and cross-device performance. OpenCIVAN is intended as a reusable research infrastructure foundation rather than a finished end-user platform.

---

## 1. Introduction

### 1.1 Problem Context

Scientific analysis of complex spatial datasets is rarely a solitary activity. Researchers investigating volumetric simulation outputs, 3D medical imaging, point cloud reconstructions, or multi-variate surface fields typically need to discuss what they observe, coordinate attention around regions of interest, and jointly determine how to interpret ambiguous features. When these datasets are large or spatially complex, communication alone is insufficient: collaborators benefit from shared spatial reference — the ability to point at a specific location in 3D space, follow a colleague's viewpoint, or highlight a feature visible from a particular camera angle.

Immersive environments have shown promise in addressing the spatial communication problem. By providing stereoscopic depth cues and natural pointing interactions, head-mounted displays can help analysts locate features in volumetric data more rapidly and communicate spatial relationships more precisely. However, immersive environments also introduce new collaboration complexity: users on different device classes — desktop workstations, tablet browsers, and immersive headsets — must participate in a shared analytical session despite fundamental differences in input modality, rendering capability, and display geometry.

Building systems that support this kind of collaborative immersive analysis requires integrating at minimum: multi-user session management, real-time state synchronization, user presence and identity, cross-device rendering, and scientific data loading — while remaining extensible enough that researchers can adapt the system to new data types, interaction paradigms, or analytical workflows.

### 1.2 Toolkit Gap

A key gap in existing infrastructure is that collaborative visualization systems are rarely designed as open toolkits for reuse. Systems developed for specific scientific disciplines often tightly couple domain-specific data handling with visualization and session logic, making extension difficult. More general immersive analytics platforms exist but tend to be closed, single-vendor, or focused on authoring rather than programmatic extension.

From an implementation standpoint, building a collaborative immersive analytics system requires solving several technical sub-problems simultaneously:

- **Session and room management**: creating, joining, and routing clients to shared sessions with appropriate membership and access control;
- **Dual-mode state synchronization**: distinguishing state that should be eventually consistent (view configurations, annotations, dataset metadata) from state that should be low-latency ephemeral (cursor positions, avatar poses, voice indicators);
- **Cross-device rendering**: presenting the same shared analytical state to clients whose local rendering is fundamentally different — full VTK.js pipeline on desktop, WebXR-rendered geometry on a headset, or streamed frames from a server-side renderer for thin clients;
- **User presence and identity**: tracking who is in a session, where their attention is focused, and how they are represented to others;
- **Scientific data support**: ingesting and rendering the file formats that domain scientists actually produce, such as VTK XML formats, mesh formats, and time series;
- **Extensibility**: allowing developers to add new visualization types, synchronized state fields, interaction tools, or compute backends without restructuring the core system.

OpenCIVAN addresses these sub-problems in a single open prototype toolkit.

### 1.3 OpenCIVAN Overview

OpenCIVAN is an open-source prototype toolkit for collaborative immersive analytics, deployed in the browser via web technologies. The current implementation supports multiple simultaneous users within a shared project workspace, each operating client-side VTK.js visualization instances against shared scientific datasets, with session state synchronized across clients through a dual-channel architecture.

Datasets — scientific files in VTP, VTI, VTU, STL, PLY, OBJ, or VTK formats — are uploaded to object storage and referenced by UUID. Each visualization of a dataset is managed as a *ViewConfiguration*, a server-persisted and collaboratively synchronized state object that captures camera position, scalar coloring configuration, active features (volume rendering, clipping, glyphs, thresholding), and widget positions. Clients render ViewConfigurations locally using VTK.js, maintaining a GPU-local rendering pipeline that is not itself synchronized, while the *ViewConfiguration* that drives it is shared across the session.

Collaboration is modeled at two levels. *Ephemeral collaborative state* — user cursor positions raycasted to 3D world coordinates, user presence and activity status, VR avatar poses, controller states, and camera follow relationships — is synchronized via a Y.js CRDT WebSocket server. *Persistent collaborative state* — ViewConfigurations, canvas layouts, dataset membership, annotations, and computation results — is managed via a REST API backed by PostgreSQL and broadcast to connected clients via a separate WebSocket event channel. This dual-channel design separates concerns cleanly: the CRDT channel optimizes for latency at the cost of durability, while the REST channel optimizes for consistency and persistence.

Cross-device participation is implemented through the WebXR Device API, enabling immersive headset clients to enter a shared session with VR-specific interaction modes. An immersive session presents the active view's dataset at a comfortable auto-computed scale, with an *isolation mode* that pulls the dataset to room scale for walk-around inspection and restores the previous scale on exit. (A multi-view spatial grid layout is scaffolded but not yet wired into the render path.) VR participants are assigned roles (VR explorer, desktop observer, desktop participant, desktop controller), and their avatar poses and controller states are synchronized via Y.js to all connected clients regardless of device.

Real-time voice communication is provided via the LiveKit WebRTC platform, integrated within the presence system so that voice state (in-call, muted, speaking) is reflected in user presence indicators. A text chat system using Y.js Y.Array with PostgreSQL persistence is also provided. An optional Matrix-protocol federation bridge allows cross-server chat relay.

The server architecture includes: an Express REST API, a Y.js WebSocket server, a Python FastAPI server-side VTK render server, a Python VTK compute worker (BullMQ/Redis), a Node.js headless-browser thumbnail worker, Keycloak for OIDC authentication, PostgreSQL for persistence, MinIO for object storage, and Redis for job queues.

### 1.4 Contributions

The contributions of OpenCIVAN, as evidenced by the current codebase, are:

1. **A dual-channel synchronization architecture** that explicitly separates ephemeral CRDT-based presence state (Y.js, port 9001) from REST-managed persistent state (Express API, port 3001), implemented with server-side Y.js snapshot persistence and client-side reconciliation logic — as evidenced by `src/collaboration/yjs/yjsSetup.js`, `server.js`, `server/src/services/yjsPersistence.js`, and `src/services/syncService.js`.

2. **A three-layer visualization model** that decouples raw dataset storage (Layer 1), shared and persisted ViewConfiguration state (Layer 2), and ephemeral client-local GPU rendering pipelines (Layer 3), enabling collaborators to share analytical configurations without requiring GPU state transfer — as evidenced by `src/core/data/models/Dataset.js`, `src/core/data/models/ViewConfiguration.js`, and `src/core/instances/types/vtk/VTKInstanceHandler.js`.

3. **Cross-device collaborative participation** via the WebXR Device API, supporting desktop and immersive-headset clients in the same session with synchronized avatar poses, controller states, and VR-specific interaction tools (measure, probe, clip box, slice plane, annotation) — as evidenced by `src/core/vr/VRManager.js`, `src/core/vr/VRParticipantSync.js`, and the `vr_exploration_sessions` / `vr_session_participants` database schema.

4. **A modular extensibility architecture** for visualization types based on an `InstanceTypeHandler` interface and plugin registry, allowing new renderers, interaction tools, or data loaders to be added without modifying core infrastructure — as evidenced by `src/core/instances/types/`, `src/core/instances/types/vtk/features/`, and the registry pattern in `instanceTypesInit.js`.

5. **A session recording and provenance infrastructure** that captures Y.js update streams, cursor movements, and chat messages with millisecond-resolution offsets for session replay, combined with audit logging, file version histories, and file derivation chains — as evidenced by `server/src/services/recordingService.js`, `server/database/init.sql` (`session_recordings`, `recording_events`, `audit_log`, `file_versions` tables), and `src/core/data/managers/ViewConfigurationManager.js`.

---

## 2. Related Work

### 2.1 Immersive Analytics and Scientific Visualization

TODO: Add citations and discussion of immersive analytics foundations (Marriott et al., Dwyer et al.), scientific visualization with VTK and its derivatives, and browser-based immersive visualization systems.

### 2.2 Collaborative Visualization and Shared Analytical Workspaces

TODO: Add citations and discussion of collaborative visualization infrastructure (GroupVis, Vismon, frameworks for asynchronous and synchronous collaborative analysis), CRDT-based shared document models (Y.js, Automerge), and multi-user annotation systems.

### 2.3 WebXR and Cross-Device Immersive Systems

TODO: Add citations and discussion of WebXR Device API adoption, cross-device immersive analytics systems (e.g., Fiesta, ImAxes, MagicToon), and challenges in cross-device rendering fidelity and interaction design.

### 2.4 Visualization Toolkits and Authoring Frameworks

TODO: Add citations and discussion of ParaView, VisIt, VTK, VTK.js, Plotly Dash, Observable, and toolkit-focused approaches to reusable visualization infrastructure. Discuss how OpenCIVAN's open-source, browser-first, collaboration-integrated architecture differs in focus from single-user toolkits.

**Positioning paragraph.** OpenCIVAN occupies a position between single-user scientific visualization toolkits (which emphasize rendering quality and data format breadth) and general-purpose real-time collaboration frameworks (which emphasize shared editing but are not domain-specific to scientific data). The current implementation demonstrates that browser-deployable VTK.js rendering, WebXR immersive participation, and CRDT-based state synchronization can coexist in a unified architecture with a manageable deployment footprint. Unlike closed immersive analytics platforms, OpenCIVAN exposes all core abstractions as extensible modules, making it suitable as a research infrastructure foundation rather than a product.

---

## 3. Design Rationale and Requirements

### 3.1 Design Rationale

The design of OpenCIVAN is structured around a central observation visible throughout the codebase: *not all shared state in a collaborative visualization session has the same consistency and latency requirements*. Cursor positions and avatar poses must update at interactive frame rates and can tolerate brief inconsistency; losing a few cursor update messages does not corrupt the collaboration. By contrast, a ViewConfiguration — defining how a dataset is colored, which clipping planes are active, and what the saved camera angle is — must be durable, versioned, and consistent across all clients including late joiners. OpenCIVAN's architecture explicitly encodes this distinction into two independent synchronization channels with different transport protocols, persistence models, and conflict handling strategies.

A second design principle visible in the codebase is the *separation of rendered state from shared state*. The VTK.js rendering pipeline (vtkRenderer, vtkRenderWindow, vtkActor, vtkMapper, vtkCamera) is created locally by each client and never transmitted over the network. What is shared is the declarative ViewConfiguration that drives the pipeline — camera parameters, colormap selection, feature toggles, widget positions. This separation avoids transmitting large GPU-local state over the network while still enabling collaborators to converge on identical visualizations when they load the same ViewConfiguration. The trade-off, discussed further in Section 10, is that rendering consistency depends on clients having the same VTK.js version and the same dataset, neither of which is enforced by the toolkit.

A third design principle is *device-agnostic session participation*. The presence system, room management, and Y.js synchronization channels operate independently of whether a client is running in desktop browser mode or WebXR immersive mode. VR-specific state (avatar pose, controller state) is transmitted through the same Y.js channels and rendered by non-VR clients as 3D avatar overlays. Desktop clients can therefore observe and coordinate with VR participants without themselves entering the immersive environment.

Finally, the toolkit is designed for extensibility at multiple levels: new visualization types are added by implementing the `InstanceTypeHandler` interface; new synchronized state fields are added to the Y.js document; new server-side compute operations are registered as BullMQ workers; new annotation types are stored as typed records in PostgreSQL. This layered extensibility strategy is visible throughout the codebase and reflects a design intent to serve as a foundation for future research prototypes rather than as a fixed application.

### 3.2 Design Requirements

The following design requirements are inferred directly from the codebase. Each requirement describes a technical problem the implementation addresses, the evidence for its implementation, and known gaps.

---

#### DR1 — Dual-Channel Real-Time Synchronization

**Rationale.** Collaborative visualization requires different synchronization properties for different state types. Presence state (cursor positions, avatar poses, voice activity) must propagate with low latency but tolerates brief inconsistency. Persistent state (ViewConfigurations, annotations, dataset membership) must be durable, consistent, and available to late joiners. A single synchronization channel cannot optimally serve both requirements simultaneously.

**Implementation evidence.** OpenCIVAN implements two explicit synchronization channels. The *presence channel* uses Y.js (CRDT) over WebSocket (port 9001, `server.js`), exposing shared Y.Map objects: `yCursors` (userId → 3D cursor data), `yCameras` (viewId → camera state), `yViewPresence` (viewId → viewer list), `yAvatars` (userId → VR pose), `yVRControllers` (controllerId → controller state), and `yText` (per-room chat array). The Y.js server persists document snapshots to PostgreSQL via `server/src/services/yjsPersistence.js` at 60-second intervals, with binary update streams stored for replay. The *persistent channel* uses an Express REST API (port 3001) backed by PostgreSQL, with state changes broadcast to connected clients via `server/src/services/websocket.js` (WebSocketManager). The client-side `src/services/syncService.js` detects divergence between local and server state on startup, using four divergence levels (NONE, MINOR, MODERATE, MAJOR) to trigger reconciliation.

**Current limitation.** The Y.js CRDT model handles concurrent presence updates gracefully, but there is no explicit conflict-resolution UI for concurrent edits to persistent state (e.g., two users simultaneously modifying the same ViewConfiguration); revision-checked writes (optimistic concurrency control) reject stale updates with a 409 that clients resolve automatically. Reconnecting clients hydrate incrementally via the `sync_events` watermark mechanism (`GET /api/sync/delta`), falling back to full REST reconciliation when the watermark has expired; the Y.js presence channel itself is restored from server snapshots without a delta path.

---

#### DR2 — Separation of Visualization State Layers

**Rationale.** Sharing GPU rendering state across a network is impractical for interactive use. However, sharing the configuration that produces a visualization — colormap, filter parameters, camera pose — is both feasible and sufficient to enable collaborators to converge on identical views. A three-layer architecture that separates raw data from visualization configuration from rendered output allows the network to carry only the configuration layer.

**Implementation evidence.** OpenCIVAN implements three explicit layers. *Layer 1 (Dataset)* represents raw uploaded files stored in MinIO with SHA-256 hash deduplication and tracked in the `datasets` PostgreSQL table; managed by `src/core/data/managers/DatasetManager.js`. *Layer 2 (ViewConfiguration)* is a server-persisted and Y.js-synchronized state object capturing camera parameters, feature toggles, colormap selection, scalar array selection, widget positions, and snapshot history; implemented in `src/core/data/models/ViewConfiguration.js` and managed by `src/core/data/managers/ViewConfigurationManager.js`. Camera updates from the VTK.js interactor are debounced at 100 ms and written to both Y.js (for real-time follow) and the REST API (for persistence). *Layer 3 (InstanceWindow)* is an ephemeral VTK.js rendering pipeline created per client per viewport, implemented in `src/core/instances/types/vtk/VTKInstanceHandler.js`; it is not synchronized and is recreated from the Layer 2 configuration on each client independently.

**Current limitation.** The separation assumes all clients render Layer 2 state identically, which holds only if they use the same VTK.js version and have access to the same Layer 1 dataset bytes. The toolkit currently provides no mechanism to verify or enforce rendering consistency across clients. Additionally, the ViewConfiguration model does not yet include a full specification of time-series playback state or multi-dataset composition, limiting shared analytical state for complex workflows.

---

#### DR3 — Cross-Device Collaborative Participation

**Rationale.** Collaborative immersive analytics sessions should not require all participants to use the same device class. Domain scientists may access the toolkit from a desktop browser, while a small subset use an immersive headset for spatial exploration. The toolkit should allow heterogeneous participation where device-specific capabilities are exposed but a shared collaborative session is maintained.

**Implementation evidence.** OpenCIVAN supports two participation contexts. *Desktop clients* access a browser-based UI with VTK.js rendering, 2D cursor sync, room chat, and viewport navigation. *WebXR clients* enter an `immersive-vr` session via the WebXR Device API in `src/core/vr/VRManager.js`, with required feature `local-floor` and optional features `bounded-floor`, `hand-tracking`, and `layers`. VR participants are assigned a role stored in the `vr_session_participants` database table: `vr-explorer`, `desktop-observer`, `desktop-participant`, or `desktop-controller`. Input sources cover tracked controllers, hand tracking, and visionOS transient-pointer (gaze + pinch) sources, which lack a grip space and are handled by a target-ray fallback in both input-gathering paths. Avatar poses (position, rotation, headPose, handPoses) and controller states are synchronized via Y.js `yAvatars` and `yVRControllers` maps in `src/core/vr/VRParticipantSync.js`, and rendered on desktop clients as 3D avatar overlays. VR-specific analytical tools are implemented in `src/core/vr/tools/`: `VRMeasureTool`, `VRProbeTool`, `VRClipBoxTool`, `VRSlicePlaneTool`, `VRAnnotationTool`; annotation and measurement results are persisted through the shared REST annotation store and broadcast to all participants. VR sessions are registered on the server (`POST /api/vr/sessions`), and remote participants can join a running session (`joinSession`), entering VR when the session's view is open locally. Server-side VTK rendering via a Python FastAPI server (`server/render_server/app.py`) provides an alternative rendering path for thin clients that cannot run VTK.js.

**Current limitation.** The toolkit does not yet support WebXR in all target browsers equally, and browser compatibility testing is not documented in the repository. VR-placed annotations and measurements are now persisted through the same REST annotation store as desktop annotations (`VRExplorationManager._handleToolAction` → `AnnotationManager.createAnnotation`), making them visible to all participants; visionOS `transient-pointer` input sources (gaze + pinch, no grip space) are supported in both input-gathering paths. The server-side rendering path (`RemoteRenderClient.js`) and the client-side VTK.js path remain independent; the toolkit does not yet support seamless rendering fallback or handoff between the two.

---

#### DR4 — Scientific Data Loading and Visualization

**Rationale.** A collaborative toolkit for scientific visualization is only useful if it supports the data formats that scientists actually produce. VTK XML formats (VTP, VTI, VTU) are standard outputs of simulation pipelines, medical imaging tools, and point cloud processors. Supporting multiple formats, a rich feature set, and compute offload for heavy operations is essential for domain adoption.

**Implementation evidence.** File format support is implemented in `src/core/instances/types/vtk/VTKInstanceHandler.js` via eight VTK.js reader classes: `vtkXMLPolyDataReader` (VTP), `vtkXMLImageDataReader` (VTI), `vtkPolyDataReader` (VTK legacy), `vtkSTLReader`, `vtkPLYReader`, `vtkOBJReader`, `vtkHttpDataSetReader` (VTKJS with ZIP), and `vtkHttpDataSetSeriesReader` (time series). A modular feature system in `src/core/instances/types/vtk/features/` provides more than twenty independently loadable visualization features, including volume rendering (`VTKVolumeFeature`), 2D slice viewing (`VTKSliceFeature`), isosurface extraction, scalar coloring, vector/tensor glyphs (`VTKGlyphFeature`), clipping planes, thresholding, PBR materials, transfer function editing, measurement widgets (`VTKMeasurementWidgetsFeature`), and client-side dimensionality reduction (PCA, t-SNE, UMAP via `VTKReductionFeature`). Server-side heavy computation is offloaded to a Python VTK worker via BullMQ/Redis (`workers/vtk-python/worker.py`), supporting mesh decimation, level-of-detail generation, smoothing, and point cloud subsampling. Thumbnail previews of views are generated by a headless Playwright browser worker (`workers/thumbnail-node/worker.js`).

**Current limitation.** Format support does not currently include common domain-specific formats such as HDF5, netCDF, DICOM, or GLTF. The client-side dimensionality reduction implementation is limited by browser memory and JavaScript execution speed for large point clouds. There is no streaming or progressive loading mechanism for large dataset files, which may limit scalability for datasets approaching or exceeding the 500 MB per-file limit.

---

#### DR5 — Session, Room, and Workspace Management

**Rationale.** Collaborative analytics requires structured session contexts: named shared spaces that users join and leave, with membership control, chat isolation, and the ability to create temporary sub-spaces (breakout rooms) for focused discussion of a subset of data or analytical question.

**Implementation evidence.** OpenCIVAN implements a two-level session hierarchy. *Workspaces* represent persistent analytical projects and are managed via `server/src/routes/workspaces.js`: types include `personal` (auto-created per user), `project` (shared multi-user workspace), and `breakout` (temporary, with auto-merge back to parent). *Rooms* are chat and collaboration spaces within a workspace, managed via `server/src/routes/rooms.js`: types include `main` (auto-created per workspace, cannot be deleted), `breakout` (user-created sub-spaces), and `dm` (direct messaging, private). Room membership is tracked in the `room_members` table with roles (admin, member). State changes (room creation, member join/leave) are broadcast via WebSocketManager. Client-side session routing in `src/core/session/sessionManager.js` resolves the active room from URL path, URL query parameter, localStorage, or config default, in that priority order.

**Current limitation.** The workspace and room membership model implements access control at the database level but does not yet expose role-based granular permissions for visualization actions (e.g., distinguishing who may modify a ViewConfiguration vs. who may only observe). Breakout room auto-merge to parent is declared in the schema but its implementation in the routing layer was not fully verified during codebase inspection.

---

#### DR6 — Session Recording, Provenance, and Annotation

**Rationale.** Scientific collaboration generates analytical history: who pointed at what feature, when a particular view configuration was created, how a dataset was derived from a source. Recording this history supports later review, reproducibility, and knowledge sharing. Annotations allow collaborators to mark points of interest for asynchronous review.

**Implementation evidence.** Session recording is implemented in `server/src/services/recordingService.js`: active recordings capture cursor movements (throttled to 15 fps with a 5 px delta filter), Y.js updates, and chat messages with millisecond-resolution offsets from session start, stored in the `recording_events` PostgreSQL table. Audit logging at four levels (minimal, standard, detailed, forensic) is implemented in `server/src/services/audit.js` using the `audit_log` table. File provenance is tracked via `datasets.derived_from` (UUID of source file) and `derivation_info` (JSONB metadata). File versioning uses the `file_versions` table with SHA-256 hash, storage key, and version number. ViewConfiguration history is captured as a JSONB snapshot array within the `view_configurations` table. View forks are tracked via `forked_from` JSONB and `fork_count`.

Three-dimensional point annotations anchored to dataset positions are stored in the `annotations` table (position, normal, type, text, branch) via `server/src/routes/annotations.js`. Canvas-level free-form drawings — strokes, paths, labels, and pointer overlays on the workspace grid — are stored as `workspace_annotations` (path\_data, screen\_coordinates, style, text\_content) via `server/src/routes/workspaceAnnotations.js`, with versioned snapshots in `workspace_annotation_snapshots`.

**Current limitation.** Session recording captures the raw Y.js update stream and cursor movements, but a replay interface that reconstructs the full collaborative session from this data is not yet implemented. The audit log schema is implemented but the audit-level configuration and its enforcement across all API routes were not fully verified. Annotation sharing across breakout rooms or workspaces is not yet implemented. Annotation creation, update, and deletion now propagate live to all connected clients via WebSocket broadcast (`serverSync.js` → `AnnotationManager.handleServerBroadcast`), with sync-event rows written for create/update/delete so reconnecting clients recover missed annotation changes through delta hydration.

---

## 4. OpenCIVAN Toolkit Model

OpenCIVAN models a collaborative analytical session as a set of named abstractions that correspond to distinct objects in the codebase. Rather than a flat list of features, these abstractions compose into a hierarchy: Workspaces contain Rooms; Rooms contain Users; Users operate Canvases; Canvases display Views; Views present Instances that render Datasets. Shared analytical state is held in ViewConfigurations, distributed via the dual-channel synchronization architecture. User identity and position are held in Presence objects distributed via Y.js awareness.

### Table 3 — Toolkit Abstractions

| Abstraction | Purpose | Implementation evidence | Collaborative role |
|---|---|---|---|
| **Project / Workspace** | Persistent named analytical project with member list and access control | `server/src/routes/workspaces.js`; `workspaces` table | Defines the scope boundary for shared datasets, views, rooms, and recordings |
| **Room** | Chat and presence sub-space within a workspace; types: main, breakout, dm | `server/src/routes/rooms.js`; `rooms` + `room_members` tables | Provides membership-bounded presence and chat isolation for sub-groups |
| **Dataset** | A scientific data file (VTP, VTI, VTU, STL, PLY, OBJ, VTKJS) stored in MinIO, referenced by UUID and tracked with hash-based versioning | `src/core/data/models/Dataset.js`; `datasets` + `file_versions` tables | Shared data source; all participants in a workspace reference the same UUID |
| **ViewConfiguration** | Server-persisted and collaboratively synchronized state object for one visualization; holds camera, colormap, feature flags, widget positions, snapshot history | `src/core/data/models/ViewConfiguration.js`; `view_configurations` table; `ViewConfigurationManager.js` | Primary shared analytical object; Layer 2 of the three-layer model |
| **InstanceWindow** | Ephemeral client-local VTK.js GPU rendering pipeline for one ViewConfiguration; not synchronized | `src/core/instances/types/vtk/VTKInstanceHandler.js` | Layer 3; renders the ViewConfiguration; recreated independently per client |
| **Canvas** | A named rectangular workspace region containing a grid of InstanceWindows with layout configuration | `server/src/routes/canvases.js`; `canvases` + `placements` tables; `CanvasManager.js` | Canvas layouts and placements are synchronized via REST broadcast |
| **ViewGroup** | A logical grouping of ViewConfigurations with synchronized camera links | `server/src/routes/viewgroups.js`; `viewgroups` + `view_links` tables | Enables linked navigation across multiple views simultaneously |
| **User / Participant** | An authenticated identity with UUID, display name, and deterministic HSL color; may be Keycloak-authenticated or dev-mode mock | `src/collaboration/presence/userManagement.js`; `users` table | Basis for presence, attribution, permission, and recording authorship |
| **Presence** | Ephemeral per-user state: cursor position (3D world coords), activity status (active/idle/away), room membership, voice state (in-call, muted, speaking) | `src/collaboration/presence/presenceSystem.js`; Y.js awareness | Enables real-time awareness of collaborators' attention and status |
| **VR Session** | A structured multi-user immersive session with defined roles (vr-explorer, vr-observer, desktop-observer, desktop-participant) and VR-specific tool state | `src/core/vr/VRManager.js`; `vr_exploration_sessions` + `vr_session_participants` tables | Extends collaborative participation to immersive device clients |
| **Avatar** | A 3D representation of a VR participant: position, rotation, head pose, hand poses, synced via Y.js | `src/core/vr/VRParticipantSync.js`; `yAvatars` Y.Map | Renders VR participants in both VR and desktop clients' shared 3D scene |
| **Annotation** | A 3D point or region marker anchored to a dataset position, typed and texted, with branch support | `server/src/routes/annotations.js`; `annotations` table | Persistent spatial markers for asynchronous analytical communication |
| **Workspace Annotation** | A canvas-level free-form drawing or text label; versioned | `server/src/routes/workspaceAnnotations.js`; `workspace_annotations` table | Persistent canvas-level markup for communicating about layouts and views |
| **Session Recording** | A timestamped stream of Y.js updates, cursor movements, and chat messages captured during a collaborative session | `server/src/services/recordingService.js`; `session_recordings` + `recording_events` tables | Enables post-session review and reproducibility |
| **Computation Job** | An asynchronous server-side VTK computation (decimation, LOD, smoothing, PCA/t-SNE/UMAP) submitted to a BullMQ queue and executed by a Python worker | `server/src/services/jobQueue.js`; `workers/vtk-python/worker.py`; `computation_jobs` table | Offloads expensive operations from the client; results are broadcast to all participants |
| **Voice Room** | A LiveKit WebRTC room for real-time voice communication among session participants | `src/services/voice/voiceRoomService.js`; `livekit-client` | Separates voice communication from visualization state synchronization |
| **Chat Message** | A text message in a room's Y.js-synchronized Y.Array, persisted to PostgreSQL with thread support and optional Matrix federation | `src/collaboration/communication/textChat.js`; `chat_messages` table | Supports asynchronous and synchronous text discussion alongside visualization |

**Synthesis.** OpenCIVAN models collaborative analysis as a set of concentric scopes — Workspace > Room > Canvas > View — each with its own synchronization properties. Ephemeral collaborative state (presence, cursors, avatars) flows through Y.js awareness and shared maps; durable shared state (ViewConfigurations, annotations, canvases) flows through the REST API with WebSocket broadcast for immediate propagation. This model allows OpenCIVAN to support simultaneous users with different interaction modes — desktop browser, VR headset, or thin client via server-side rendering — without requiring a common rendering substrate.

---

## 5. Collaborative Workflow Pipeline

The collaborative workflow in OpenCIVAN follows a sequence of stages from data ingestion to synchronized analytical interaction. The pipeline below is derived from the implementation rather than an idealized model.

**Pipeline:**

> Data Ingestion → Session Initialization → View Construction → Cross-Device Rendering → Real-Time Synchronization → Annotation and Communication → Session Recording and Provenance

---

### Stage 1: Data Ingestion

**What the user provides:** A scientific data file (VTP, VTI, VTU, STL, PLY, OBJ, or VTKJS format), uploaded via the dataset selector UI (`DatasetSelectorModal.jsx`).

**What the toolkit does:** The file is posted to `POST /api/files` (Express, `server/src/routes/files.js`). The server validates the file type via magic-byte detection (`handlerCapabilities.js`), stores the file bytes in MinIO at a UUID-based key, and creates a record in the `datasets` PostgreSQL table with filename, SHA-256 hash, storage key, and optional spatial bounds and data array metadata. The `DatasetManager.js` client subscribes to `file:added` WebSocket events and imports the new dataset record into local state and IndexedDB cache.

**Collaborative purpose:** Once a dataset is ingested into a workspace, all workspace members can reference it by UUID and create views against it. The dataset is the shared analytical substrate.

**Remains local-only:** Client-side parsed VTK data (vtkPolyData, vtkImageData) is cached locally in `DatasetManager.getCachedParsedData()`; parsed data is not transmitted between clients.

---

### Stage 2: Session Initialization

**What the system provides:** A Y.js WebSocket connection to room state on port 9001, and a REST WebSocket connection to broadcast events on port 3001.

**What the toolkit does:** `sessionManager.js` resolves the current `roomId` from URL path, URL query parameter, localStorage, or config default. The Y.js `WebsocketProvider` in `yjsSetup.js` connects to the Y.js server and synchronizes shared state maps. `presenceSystem.js` initializes awareness, publishes the local user's identity (userId, userName, userColor), and starts the 10-second heartbeat. `serverSync.js` connects the REST WebSocket and registers handlers for all server-broadcast event types. On startup, `syncService.js` fetches server sync status and compares it against local state to detect and resolve divergence.

**Collaborative purpose:** All participants in the same room receive Y.js state and REST events from the same session context, establishing the shared collaborative space.

---

### Stage 3: View Construction

**What the user does:** Creates a new ViewConfiguration referencing a dataset, or opens an existing one from the workspace.

**What the toolkit does:** `POST /api/views` creates a ViewConfiguration record in PostgreSQL. The server broadcasts a `view:created` WebSocket event to all room participants. `ViewConfigurationManager.js` receives the broadcast and emits `VIEW_CREATED` on the client EventBus. `WorkspaceManager.createInstance()` creates an `InstanceWindow` (Layer 3), linking it to the ViewConfiguration (Layer 2) and the Dataset (Layer 1). The VTK.js rendering pipeline is created lazily on first data load by `VTKInstanceHandler._initializeVTKPipeline()`.

**Collaborative purpose:** When one user creates a view, the `view:created` broadcast causes all connected clients to be aware of the new view, enabling any participant to open or reference it.

---

### Stage 4: Cross-Device Rendering

**Desktop clients:** VTK.js renders the ViewConfiguration locally. The rendering pipeline includes the full vtkRenderer + vtkOpenGLRenderWindow + vtkRenderWindowInteractor stack with a trackball camera style.

**WebXR (VR) clients:** `VRManager.js` enters an `immersive-vr` WebXR session against the active view; isolation mode pulls the dataset to room scale for walk-around inspection. VR-specific tools (measure, probe, clip, slice, annotation) are available; annotation and measurement results persist to the shared annotation store. Avatar and controller poses are published to Y.js `yAvatars` and `yVRControllers`. Vision Pro's transient-pointer (gaze + pinch) input is supported alongside tracked controllers and hand tracking.

**Server-side rendering (thin clients):** `server/render_server/` provides a Python FastAPI server at port 7001. Clients connect via `RemoteRenderClient.js` (WebSocket `/ws`) and receive PNG frames rendered by a server-side VTK pipeline. This path enables participation from clients that cannot run VTK.js.

**What remains local:** GPU state, vtkActor visibility per-client, and rendered image pixels are local only.

---

### Stage 5: Real-Time Synchronization

**Presence state (Y.js channel):**
- Cursor positions are raycasted from mouse to 3D world coordinates and published at up to 60 fps via `syncCursorToYjs()`. Other clients receive and render 3D cursor indicators.
- Camera follow state is published to `yCameras` when a view's camera is modified, with a 100 ms debounce.
- VR avatar poses and controller states are published to `yAvatars` and `yVRControllers` in `VRParticipantSync.js`.
- Presence status (active/idle/away) and voice state are published via Y.js awareness.

**Persistent state (REST channel):**
- ViewConfiguration changes (camera save, feature toggle, colormap change) are posted to the REST API. The server persists the change and broadcasts a `view:updated` event. All clients receive the update and apply it to their local ViewConfiguration.
- Canvas layout changes, placement moves, dataset additions, subset changes, and annotation mutations trigger analogous REST + broadcast sequences.

**Collaborative purpose:** All participants see each other's spatial attention (cursors, camera positions, avatar presence) in near real time, while analytical configurations remain consistent and durable via the REST layer.

---

### Stage 6: Annotation and Communication

**3D annotations:** A user places a 3D annotation at a dataset position, stored via `POST /api/annotations`. The server broadcasts `annotation:created`. All clients receive and render the annotation.

**Canvas drawings:** Free-form drawing and text labels on the workspace canvas are stored as `workspace_annotations` via REST and optionally versioned via `workspace_annotation_snapshots`.

**Text chat:** Messages are appended to the Y.js `yText` Y.Array for the current room. The Y.js server extracts messages to the `chat_messages` PostgreSQL table for persistence. Chat history is retrievable via `GET /api/rooms/:roomId/chat`.

**Voice:** Users join a LiveKit WebRTC room via `voiceRoomService.js`. Voice state (in-call, muted, speaking) is reflected in the Y.js presence object and visible to all participants in the room.

---

### Stage 7: Session Recording and Provenance

**Recording:** If recording is active for the workspace (`recordingService.js`), all Y.js update events, cursor movements (15 fps, 5 px delta filter), and chat messages are stored with millisecond offsets to the `recording_events` table.

**Provenance:** File uploads are hash-verified and versioned in `file_versions`. Dataset derivation chains are tracked via `derived_from` UUID. ViewConfiguration forks are tracked via `forked_from`. Audit events are logged at configurable levels.

---

**Figure placeholder: Collaborative workflow pipeline.**
*Caption: Diagram showing the seven-stage collaborative workflow in OpenCIVAN. The left-to-right flow begins with data ingestion (file upload to MinIO, dataset record in PostgreSQL), proceeds through session initialization (Y.js WebSocket at port 9001 + REST WebSocket at port 3001, presence system startup), view construction (ViewConfiguration creation via REST, EventBus propagation to clients), cross-device rendering (VTK.js for desktop, WebXR for VR, Python FastAPI for thin clients), real-time synchronization (Y.js presence channel for cursors and avatars, REST broadcast channel for persistent state), annotation and communication (3D annotations, canvas drawings, Y.js chat, LiveKit voice), and session recording and provenance (recording_events table, audit_log, file_versions). Arrows should illustrate the data flow between client tiers, the two server channels, and the storage backends (PostgreSQL, MinIO, Redis).*

---

## 6. System Architecture and Implementation

### 6.1 Architecture Overview

OpenCIVAN's architecture follows a service-oriented pattern comprising six functional layers: client visualization, client collaboration, synchronization infrastructure, server API, background computation, and persistent storage. These layers communicate via defined interfaces and do not share in-process state except within a single deployed service.

**Figure placeholder: System architecture diagram.**
*Caption: Block diagram showing the six layers of the OpenCIVAN architecture. The Client tier shows the React UI, VTK.js rendering pipeline, Y.js client, WebSocket client, VR manager, and voice room client. The Synchronization tier shows the Y.js WebSocket server (port 9001) and WebSocketManager broadcast within the Express server (port 3001). The Server tier shows Express REST API routes (files, views, canvases, rooms, annotations, compute, VR, chat, recordings). The Computation tier shows the Python FastAPI render server (port 7001), Python VTK BullMQ worker, and Node.js Playwright thumbnail worker. The Storage tier shows PostgreSQL, MinIO, and Redis. An Authentication tier shows Keycloak OIDC with JWT validation. Arrows show the directional flow of requests, events, and data between layers.*

### 6.2 Client Layer

The client is a single-page React 18 application served by Webpack. The component tree follows an atomic design hierarchy: atoms → molecules → organisms, with all shared UI components exported from a barrel index (`src/ui/react/components/index.js`).

*Visualization.* Each viewport is rendered by a `VTKInstanceHandler` instance managing a VTK.js rendering pipeline. The pipeline is created lazily on first dataset load, avoiding unnecessary GPU context creation for empty views. A `ResizeObserver` keeps the OpenGL render window synchronized with DOM container dimensions. Rendered pixels are not transmitted to other clients.

*Local state management.* Client state is managed through singleton managers (`DatasetManager`, `ViewConfigurationManager`, `CanvasManager`, `ViewGroupManager`, `AnnotationManager`) coordinated by the `EventBus` pub/sub system (`src/core/events/EventBus.js`). Sixty-plus React hooks in `src/ui/react/hooks/` expose manager state to components, with presence-specific hooks in `useRoomPresence.js`.

*Immersive client.* The VR subsystem in `src/core/vr/` manages the WebXR session lifecycle, controller event handling, VR-specific navigation (fly mode, teleport, scale), VR tool management, and avatar/controller pose publication to Y.js.

### 6.3 Server Layer

The server layer comprises two independently running Node.js processes.

*Express REST API (port 3001).* The Express server exposes approximately 25 route modules in `server/src/routes/`, covering: authentication (`auth.js`), projects and workspaces (`projects.js`, `workspaces.js`), file management (`files.js`, `folders.js`), visualization state (`views.js`, `viewgroups.js`, `canvases.js`), annotations (`annotations.js`, `workspaceAnnotations.js`), room and chat management (`rooms.js`, `chat.js`), computation (`compute.js`), VR sessions (`vr.js`), thumbnails (`thumbnails.js`, `thumbnailCallback.js`), session recordings (`recordings.js`), provenance utilities (`filters.js`, `bookmarks.js`, `stars.js`), user preferences (`userPreferences.js`), Matrix federation status (`matrix.js`), and synchronization status (`sync.js`). All routes requiring authentication validate Keycloak JWTs via the `authenticate` middleware in `server/src/middleware/auth.js`, with a `DEV_BYPASS_AUTH` escape hatch for development.

The `WebSocketManager` singleton in `server/src/services/websocket.js` maintains per-user and per-project WebSocket connection registries and provides typed broadcast methods (e.g., `fileAdded()`, `viewUpdated()`, `computeComplete()`, `vrParticipantJoined()`) called by route handlers after successful mutations.

*Y.js WebSocket server (port 9001, `server.js`).* This is a separate process that implements the Y.js synchronization protocol over WebSocket. Rooms are created on-demand and cached in memory. Each room holds a Y.Doc and an awareness instance. Binary sync messages (type 0) and awareness messages (type 1) are relayed between clients according to the Y.js protocol. JWT authentication is optionally enforced (type 2 messages). The Y.js server observes chat message additions in `yText` and extracts them to PostgreSQL via `YjsPersistenceService`. Document snapshots are saved every 60 seconds. If an active recording exists for a project, the Y.js server routes relevant updates to the `recordingService`.

### 6.4 Collaboration and Synchronization Model

This section describes the synchronization model in detail, as it constitutes the core technical architecture of the collaborative toolkit.

**Session creation and joining.** A collaborative session is bounded by a workspace (persistent) and a room (within a workspace). Clients resolve their target room via URL path (`/rooms/{projectId}`), URL query string (`?room={projectId}`), localStorage (`cia_last_room`), or a config-default `defaultSessionId`. This resolution is performed by `sessionManager.js` before the Y.js provider connects. Joining requires successful authentication and room membership verification at the REST API level. The Y.js server does not independently enforce membership beyond JWT validity.

**User identity.** Each user is identified by a UUID derived from Keycloak (`external_id`) or from localStorage in dev-bypass mode. Display name and email are similarly sourced from the JWT token or local configuration. A deterministic per-user HSL color is computed from the user UUID by `getUserColor()` in `userManagement.js` using a simple hash function, ensuring consistent color assignment across all clients and sessions without coordination.

**Presence and awareness.** The `presenceSystem.js` singleton publishes and subscribes to Y.js awareness state. The published state object per user is:

```
{
  userId, userName, userColor,
  status: "active" | "idle" | "away",
  cursor: { ... },
  joinedAt, lastSeen,
  roomId, workspaceId,
  inVoice, voiceRoomId, isMuted, isSpeaking
}
```

Status transitions are driven by DOM activity tracking: idle after 5 minutes of inactivity, away after 15 minutes. A 10-second heartbeat timer updates `lastSeen`. When multiple tabs of the same user are open, the presence system deduplicates by keeping the most recent awareness entry per userId. The `useRoomPresence` React hook (`src/ui/react/hooks/useRoomPresence.js`) exposes derived views of this awareness state (users in room, by voice status, by activity status) to UI components.

**Ephemeral state (Y.js channel).** The following Y.Map and Y.Array objects in the Y.Doc (`yjsSetup.js`) constitute the ephemeral shared state:

- `yCursors`: Maps `userId` → `{ position: [x,y,z], color, name, viewId, lastUpdate }`. Updated via `syncCursorToYjs()`, which is called from the VTK.js interactor's mouse-move handler after raycasting the cursor to 3D world coordinates. Cursor updates are throttled to approximately 60 fps on the client and relayed at approximately 15 fps to the recording system.
- `yCameras`: Maps `viewId` → `{ camera: { position, focalPoint, viewUp, ... }, userId, lastUpdate }`. Updated with a 100 ms debounce when the VTK interactor modifies the camera. Other clients receive this via the `initializeCameraObserver()` observer.
- `yViewPresence`: Maps `viewId` → `{ viewers: [userId, ...], lastUpdate }`. Tracks which users are actively looking at which views.
- `yAvatars`: Maps `userId` → `{ position, rotation, headPose, handPoses, ... }`. Updated at interactive frame rates from the WebXR frame loop in `VRParticipantSync.js`.
- `yVRControllers`: Maps `${userId}_${hand}` → `{ position, rotation, buttons, ... }`. Updated similarly from the WebXR input source loop.
- `yText`: A Y.Array used as the per-room chat log. Observed by the Y.js server, which extracts messages to PostgreSQL.

All Y.js observer callbacks skip their own origin (via origin check) to prevent echo feedback loops.

**Persistent state (REST + WebSocket broadcast channel).** Analytical state that must survive client disconnections and be available to late joiners is managed via the REST API. The sequence for a ViewConfiguration update is:

1. Client sends `PATCH /api/views/:viewId` with the updated state.
2. Express route validates, persists to PostgreSQL `view_configurations`, and calls `webSocketManager.viewUpdated(projectId, viewData)`.
3. WebSocketManager iterates connected clients for the project and sends a `view:updated` WebSocket message.
4. Each client's `serverSync.js` receives the event and routes it to `viewConfigurationManager._applyServerUpdate()`.
5. ViewConfigurationManager updates its local cache and emits `VIEW_UPDATED` on the EventBus.
6. React components subscribed to the affected view re-render.

The same pattern applies to canvas layouts, placements, datasets, subsets, and annotations.

**Late joiner behavior.** When a client connects or reconnects, it fetches current state via REST API calls (e.g., `GET /api/views`, `GET /api/canvases`) that return the current database state. Y.js state is restored from the last server snapshot plus any accumulated binary updates since that snapshot, replayed in sequence by the Y.js protocol. There is no explicit late-join protocol beyond these two initial fetches; the `syncService.js` divergence check on startup catches cases where local IndexedDB state has diverged significantly from server state.

**Conflict handling.** Concurrent Y.js updates are handled by the Y.js CRDT algorithm, which merges concurrent updates without requiring coordination. For REST API state, concurrent updates result in last-write-wins behavior determined by write order at the database. No explicit conflict detection or merge UI is currently implemented for ViewConfiguration concurrent edits.

**Disconnection and reconnection.** The Y.js `WebsocketProvider` implements automatic reconnection with exponential backoff. The `serverSync.js` REST WebSocket client implements up to five reconnection attempts with exponential backoff. On reconnection, Y.js state is re-synchronized from the server snapshot. On page reload, `syncService.js` re-fetches server sync status and resolves divergence.

**Synchronization scope summary.** See Table 4 below.

### Table 4 — Synchronization Scope

| State type | Synchronized or local-only | Mechanism | Supporting files | Notes/limitations |
|---|---|---|---|---|
| User presence / awareness | Synchronized (ephemeral) | Y.js awareness protocol | `presenceSystem.js`, `server.js` | Lost on server restart without snapshot |
| 3D cursor positions | Synchronized (ephemeral) | Y.js `yCursors` | `yjsSetup.js`, `VTKInstanceHandler.js` | ~60 fps client, ~15 fps recording |
| Camera follow state | Synchronized (ephemeral + durable) | Y.js `yCameras` (real-time) + REST (durable) | `yjsSetup.js`, `ViewConfigurationManager.js` | 100 ms debounce on Y.js; REST persists final value |
| View presence (who is viewing what) | Synchronized (ephemeral) | Y.js `yViewPresence` | `yjsSetup.js` | Not persisted beyond session |
| VR avatar poses | Synchronized (ephemeral) | Y.js `yAvatars` | `VRParticipantSync.js`, `yjsSetup.js` | Not recorded unless recording is active |
| VR controller states | Synchronized (ephemeral) | Y.js `yVRControllers` | `VRParticipantSync.js`, `yjsSetup.js` | Not persisted |
| Chat messages | Synchronized (ephemeral + durable) | Y.js `yText` + PostgreSQL `chat_messages` | `textChat.js`, `server.js`, `yjsPersistence.js` | Chat described as migrating to Matrix-CRDT |
| View configurations | Synchronized (durable) | REST + WebSocket broadcast | `views.js`, `WebSocketManager.js`, `ViewConfigurationManager.js` | Last-write-wins; no concurrent edit UI |
| Canvas layouts / placements | Synchronized (durable) | REST + WebSocket broadcast | `canvases.js`, `WebSocketManager.js`, `CanvasManager.js` | — |
| Dataset metadata | Synchronized (durable) | REST + WebSocket broadcast | `files.js`, `WebSocketManager.js`, `DatasetManager.js` | — |
| Subsets (point/cell selections) | Synchronized (durable) | REST + WebSocket broadcast | `subsets.js`, `WebSocketManager.js` | — |
| 3D annotations | Synchronized (durable) | REST + WebSocket broadcast | `annotations.js`, `WebSocketManager.js`, `AnnotationManager.js` | Live-synced to all clients; VR tool annotations and measurements persist through the same store |
| Threshold filter state | Synchronized (ephemeral + durable) | Y.js `yVisualizationState` + ViewConfiguration REST | `VTKThresholdFeature.js`, `VTKInstanceHandler.js` | Declarative params only (array name, mode, range); data recomputed per client |
| Workspace drawings | Synchronized (durable) | REST + WebSocket broadcast | `workspaceAnnotations.js`, `WebSocketManager.js` | Versioned snapshots available |
| Computation results | Synchronized (durable) | BullMQ → Python worker → REST callback → broadcast | `jobQueue.js`, `worker.py`, `compute.js` | Progress and completion broadcast to all |
| VR session state | Synchronized (durable) | REST + WebSocket broadcast | `vr.js`, `WebSocketManager.js` | VR snapshots stored separately |
| Voice state | Synchronized (ephemeral) | Y.js awareness (in-call, muted, speaking) + LiveKit | `presenceSystem.js`, `voiceRoomService.js` | Voice state in presence; audio via LiveKit |
| VTK.js rendering pipeline | Local only | — | `VTKInstanceHandler.js` | GPU resources are client-local |
| Parsed VTK data (vtkPolyData etc.) | Local only | IndexedDB cache | `DatasetManager.js` | Re-parsed per client on demand |
| Computation selections / filters | Synchronized (durable) | REST | `filters.js` | Saved filter presets per workspace |
| Audit log | Server-authoritative | PostgreSQL `audit_log` | `audit.js` | Four configurable levels |
| Session recordings | Server-authoritative | PostgreSQL `recording_events` | `recordingService.js` | Replay interface not yet confirmed in client |

### 6.5 Rendering and Visualization Layer

Scientific data rendering in OpenCIVAN is performed client-side by VTK.js within `VTKInstanceHandler.js`. The rendering pipeline is constructed in six phases: (1) vtkRenderer + vtkRenderWindow creation; (2) vtkOpenGLRenderWindow with WebGL context (preserveDrawingBuffer enabled for thumbnail capture); (3) vtkRenderWindowInteractor + trackball camera style; (4) vtkMapper + vtkActor (actor is marked pickable for raycasting); (5) ResizeObserver for responsive sizing; (6) 3D cursor raycasting loop.

The pipeline is driven by the Layer 2 ViewConfiguration: colormap selection, scalar array binding, feature toggles, and camera state are all read from the ViewConfiguration and applied to the VTK.js pipeline. Rendering connectivity to shared state is therefore achieved at the configuration level rather than the GPU state level.

The modular feature system (`src/core/instances/types/vtk/features/`) allows features to be independently enabled or disabled per InstanceWindow without modifying the core pipeline. Features with incompatible data types self-disable. Client-side dimensionality reduction (`VTKReductionFeature`) runs PCA, t-SNE, or UMAP via `src/algorithms/` and produces a new vtkPolyData for rendering.

An alternative server-side rendering path is available via the Python FastAPI render server (`server/render_server/`). The render server manages per-session VTK rendering contexts and streams PNG frames to clients via WebSocket. This path is consumed by `src/services/RemoteRenderClient.js` and is intended for thin clients or remote datasets that cannot be efficiently transferred to the browser. The server-side and client-side rendering paths are currently independent; no unified rendering manager coordinates fallback between them.

### 6.6 Communication Layer

OpenCIVAN separates human-to-human communication (voice, text chat) from visualization state synchronization both architecturally and in the user interface.

*Voice.* The `VoiceRoomService` (`src/services/voice/voiceRoomService.js`) uses the `livekit-client` npm package to manage connections to a LiveKit WebRTC server (default port 7880). The service supports multiple concurrent voice rooms aligned with the workspace room hierarchy, with participant tracking, mute control, and speaking state detection. Voice state (in-call, muted, speaking) is published to Y.js awareness so all clients can display per-user voice indicators without subscribing directly to the LiveKit SDK. The `VoiceTab` component (`src/ui/react/components/panels/RightPanel/tabs/VoiceTab/`) exposes the voice UI.

*Text chat.* The `TextChat` class (`src/collaboration/communication/textChat.js`) uses a Y.js Y.Array per room (keyed as `chatMessages_${roomId}`) as the primary real-time transport. A maximum of 100 messages are retained per room in the Y.js document; older messages are available via the REST chat history endpoint. The Y.js server extracts messages from the Y.Array observer and persists them to the `chat_messages` PostgreSQL table, enabling history retrieval and audit. Thread support (reply\_to\_id, thread\_root\_id) is implemented in the database schema but the thread rendering UI was not confirmed in the client codebase during inspection.

*Matrix federation.* An optional `matrixBridge.js` service in the server layer provides bidirectional relay between Y.js chat rooms and Matrix homeserver rooms. The bridge uses a circuit-breaker pattern to avoid blocking Y.js updates on Matrix availability. Matrix room identifiers are mapped via the `matrix_room_mappings` table and deduplicated via `matrix_event_log`. This federation capability is flagged in the codebase as a Phase 4 feature, implying it is optional and may not be active in a default deployment.

### 6.7 Extensibility Points

OpenCIVAN provides explicit extension points at multiple architectural levels:

**Adding a new visualization type.** Implement the `InstanceTypeHandler` abstract interface, which specifies: `getType()`, `getDisplayName()`, `getSupportedFileTypes()`, `initialize()`, `loadData()`, `cleanup()`, `pauseInstance()`, `resumeInstance()`, `canHandle()`, `canExtractMetadata()`, `extractMetadata()`, and `getTools()`. Register the handler in `src/core/instances/types/instanceTypesInit.js`. This pattern allows non-VTK renderers (e.g., Three.js, Babylon.js, custom WebGL) to be integrated without modifying the VTK pipeline.

**Adding a new VTK feature.** Implement a feature module following the pattern of existing features in `src/core/instances/types/vtk/features/`, exposing `initialize()`, `getState()`, and `cleanup()`. Feature modules interact with the vtkRenderer and vtkWidgetManager of the InstanceWindow without coupling to each other.

**Adding a new synchronized state field.** Add a new Y.Map, Y.Array, or Y.Text to the Y.Doc in `src/collaboration/yjs/yjsSetup.js`. Add corresponding observer registration in `src/collaboration/yjs/yjsObservers.js`. Clients will receive updates automatically via the Y.js protocol.

**Adding a new server API.** Add an Express route module in `server/src/routes/`, register it in the Express application, and add relevant `WebSocketManager` broadcast calls after mutations. Add the corresponding client-side handler in `server/src/services/websocket.js` (server) and `src/services/syncService.js` (client).

**Adding a new compute operation.** Register the operation in the worker capability registry (`server/src/services/workerRegistry.js`), implement the BullMQ consumer in the Python worker (`workers/vtk-python/worker.py`), and add the callback route handler in `server/src/routes/compute.js`.

---

## 7. Interfaces and User/Developer Levels

### 7.1 Analyst or Domain Scientist Interface

A domain scientist uses OpenCIVAN by uploading scientific datasets, opening visualizations in tiled canvas views, applying rendering features (scalar coloring, volume rendering, clipping, glyphs), and navigating with trackball camera interaction. The analyst can place 3D annotations at positions of interest, draw on the workspace canvas, filter and threshold data by scalar value range, apply dimensionality reduction for high-dimensional point clouds, and trigger server-side compute jobs (decimation, LOD, smoothing, PCA/t-SNE/UMAP) via the compute API.

Bookmarks allow saving of ViewConfigurations for later reference. Stars allow marking of files or folders as important. Saved filter presets allow reuse of scalar filtering configurations.

### 7.2 Collaborator Interface

A collaborator joins an existing workspace by navigating to its URL or being added as a workspace member. In the session, the collaborator sees other users' 3D cursors rendered as spatial indicators within shared viewports, with names and per-user colors derived from their identity. Users' presence status (active, idle, away) is visible in the participant list. Voice participants can be seen and heard through the LiveKit-integrated VoiceTab. Text chat is available per room with message history. When another user modifies a ViewConfiguration or annotation, the change propagates via the WebSocket broadcast channel and updates the collaborator's local view.

The collaborator can navigate to breakout rooms for sub-group focused discussion, or join a VR session as an observer or participant without entering VR (desktop-observer role).

### 7.3 Developer Interface

Developers extend OpenCIVAN by implementing handler or feature interfaces. The `InstanceTypeHandler` interface and the feature module pattern (`src/core/instances/types/vtk/features/`) provide the primary extension surfaces for visualization. The EventBus (`src/core/events/EventBus.js`) provides a pub/sub interface for cross-module communication; the event catalogue (`BUS_EVENTS`) is the primary internal API for component coordination. Debug access is available via `window.CIA.eventBus` and `window.CIA.traceEvents()` in development builds.

The Y.js document structure in `yjsSetup.js` is the extension surface for collaborative state. New Y.Map or Y.Array fields can be added and observed without modifying the core synchronization infrastructure. The server-side compute extension pattern (worker registry + BullMQ consumer) allows new server-side algorithms to be integrated without touching the REST API routing layer.

### 7.4 Session Host or Administrator Interface

Workspace owners and project administrators manage membership via `POST /api/workspaces/:id/members` and analogous room membership endpoints. Session recording can be started and stopped via `POST /api/projects/:projectId/recordings/start` and `/stop`. Audit log levels (minimal, standard, detailed, forensic) are configurable in server configuration. VR session creation and management are available via `POST /api/vr/sessions` and its sub-routes.

Infrastructure administrators configure the system via environment variables (documented in `.env.example`): database credentials, MinIO credentials, Keycloak realm configuration, LiveKit server URLs, render server URL, Matrix federation settings, and DEV\_BYPASS\_AUTH for development.

---

## 8. Demonstration Scenarios

### Scenario 1 — Collaborative Scientific Dataset Inspection

A computational fluid dynamics researcher, Alice, uploads a 120 MB VTP file containing simulation output with a velocity vector field and pressure scalar array. Alice creates a workspace for the project and opens a canvas with two ViewConfigurations: one with scalar coloring by pressure, and one with glyph rendering of the velocity vectors. She saves both ViewConfigurations to the server.

Her colleague Bob joins the workspace by URL. Bob's client receives `file:added` and `view:created` broadcasts, loading the dataset reference and both ViewConfigurations into his local state. Both clients now render identical visualizations independently from the same shared ViewConfiguration. Alice adjusts the pressure colormap; the REST API persists the change and broadcasts `view:updated` to Bob, who sees the colormap update within the 100 ms debounce window.

Alice moves her cursor over a high-pressure region in the scalar view. Her 3D cursor position is raycasted to world coordinates and published to Y.js `yCursors`. Bob sees Alice's cursor rendered as a labeled 3D indicator at the same position in his viewport. Alice places a 3D annotation at the point. The annotation is stored via REST and broadcast; Bob's client renders it immediately. The session is being recorded, so Alice's cursor path is captured at 15 fps for later review.

**Takeaway.** Shared ViewConfigurations and real-time cursor sync allow two geographically separated researchers to coordinate attention within the same 3D dataset without screen sharing, while session recording preserves the collaborative exploration path.

---

### Scenario 2 — Cross-Device Collaboration (Desktop and VR)

A neuroscience team is inspecting a volumetric brain atlas in VTI format, rendered with OpenCIVAN's volume rendering feature. Carlos joins from a desktop browser; Diana enters a WebXR `immersive-vr` session on a connected headset.

Diana's VR client enters the immersive session against the shared atlas view. Her avatar pose and controller states are published to Y.js `yAvatars` and `yVRControllers`. Carlos sees Diana's avatar rendered in the desktop 3D viewport, positioned near the volumetric data. Diana presses the isolation-mode toggle to pull the atlas to room scale and walks around it; on exit, the previous scale and viewing origin are restored. Diana uses `VRMeasureTool` to measure the span of a structure; the completed measurement is persisted as a `measurement`-type annotation (endpoints, distance, and unit in its metadata) and appears in Carlos's annotation list. Diana places a VR marker with `VRAnnotationTool`; it is stored through the same REST annotation path as desktop annotations and broadcast to every participant. Diana uses `VRSlicePlaneTool` to adjust a clipping plane; the slice-plane widget state remains local to her InstanceWindow (not yet synchronized).

Carlos speaks in the LiveKit voice room; his speaking state is reflected in his presence indicator visible to Diana. Carlos annotates a suspected anatomical boundary with a 3D annotation posted via REST; Diana sees the annotation appear in her VR view.

**Takeaway.** Desktop and VR clients participate in the same session with synchronized presence and a shared annotation store: VR-placed markers and measurements are durable annotations visible to all participants. Slice-plane and clip-box tool state remains local per user — an acknowledged limitation described in DR3.

---

### Scenario 3 — Extending the Toolkit with a New Visualization Type

A developer wishes to add a WebGL-based custom renderer for sparse point cloud data in a proprietary format. The developer implements the `InstanceTypeHandler` interface in a new module `src/core/instances/types/webgl-pointcloud/WebGLPointCloudHandler.js`, overriding `getType()` → `"webgl-pointcloud"`, `getSupportedFileTypes()` → `[".xyz"]`, `initialize()` to create a custom WebGL canvas, `loadData()` to parse the proprietary format into a typed array and upload it to the GPU, and `getTools()` to expose format-specific controls.

The handler is registered in `instanceTypesInit.js`. No changes to the routing, synchronization, session management, or presence infrastructure are required. The new visualization type participates in the same Layer 2 / Layer 3 architecture: a ViewConfiguration can reference a `.xyz` dataset, the ViewConfiguration is synchronized via the existing Y.js and REST channels, and the WebGLPointCloudHandler creates the local rendering context per-client from the shared ViewConfiguration state.

**Takeaway.** The `InstanceTypeHandler` plugin architecture allows the core collaborative infrastructure to remain stable while the visualization substrate is extended, demonstrating the extensibility model described in DR6.

---

## 9. Evaluation Plan

No formal user evaluation, performance benchmarks, or synchronization correctness measurements were found in the current repository. The following evaluation plan is proposed for future work.

### 9.1 Technical Performance

TODO: Measure baseline rendering frame rates for representative dataset sizes (1M, 10M, 100M points) in VTK.js. Measure dataset upload and parse latency for VTP and VTI files at 50 MB, 200 MB, and 500 MB. Measure Y.js cursor synchronization end-to-end latency (client A to client B) under varying numbers of simultaneous users (2, 5, 10, 20). Measure REST WebSocket broadcast latency for ViewConfiguration updates. Measure Python VTK worker job queue throughput and execution time for mesh decimation at varying polygon counts.

### 9.2 Synchronization Correctness

TODO: Implement automated multi-client synchronization tests that verify: (a) ViewConfiguration state converges across clients after concurrent edits; (b) Y.js cursor state arrives on a second client within a measurable latency bound; (c) late joiner receives the correct current state for all persistence channels on connection; (d) session recordings can be replayed to reproduce the full collaborative session state at any timestamp.

### 9.3 Collaborative Workflow Evaluation

TODO: Conduct expert walkthroughs with visualization researchers and domain scientists using representative workflows (see Scenarios 1–3). Assess: task completion rate, coordination efficiency, annotation utility, and tool discoverability. Consider structured co-analysis tasks with two-user pairs (one desktop, one VR) to evaluate cross-device coordination quality.

### 9.4 Comparative Capability Analysis

TODO: Compare OpenCIVAN against existing collaborative immersive visualization systems (e.g., ParaView Catalyst, COVISE, Microsoft Mesh, Nanome) on a capability matrix covering: browser accessibility, WebXR support, VTK format support, CRDT synchronization, server-side rendering, annotation support, session recording, extensibility, and open-source availability.

### Table 5 — Requirement-to-Evaluation Plan

| Requirement | Current evidence | Evaluation method needed | Metrics or qualitative evidence |
|---|---|---|---|
| DR1 — Dual-channel sync | Two-channel implementation confirmed in code | Latency measurement under concurrent users; consistency test after concurrent edits | E2E latency in ms; convergence time; divergence rate |
| DR2 — Three-layer model | Layer separation confirmed in VTKInstanceHandler + ViewConfigurationManager | Rendering consistency test: do two clients render identically from the same ViewConfiguration? | Pixel similarity; feature parity |
| DR3 — Cross-device participation | WebXR and desktop paths confirmed; VR roles confirmed in DB schema | Two-user desktop + VR co-analysis task with verbal and analytical coordination | Task completion; coordination qualitative score |
| DR4 — Scientific data loading | Eight format readers confirmed; feature modules confirmed | Load time and parse time per format and file size; user test: domain scientist loads real dataset | Load latency; format coverage; error rate |
| DR5 — Session / room management | Room CRUD and member management confirmed | Stress test: 20 simultaneous users in one room; breakout room creation and navigation | Join success rate; broadcast delivery time; presence count accuracy |
| DR6 — Recording and provenance | Recording infrastructure confirmed; replay client unconfirmed | Implement and test replay interface; verify audit log completeness under various event types | Replay fidelity; audit event coverage |

---

## 10. Discussion

### 10.1 What the Toolkit Enables

OpenCIVAN demonstrates that a browser-based, open-source collaborative immersive analytics toolkit is architecturally feasible with contemporary web technologies. The combination of VTK.js for client-side scientific rendering, Y.js for CRDT-based ephemeral presence synchronization, an Express REST API for durable shared state, and the WebXR Device API for immersive participation covers the core technical requirements for collaborative immersive analytics without requiring native applications or proprietary platforms.

The dual-channel synchronization architecture makes explicit an important design choice that is often implicit in collaborative visualization systems: that presence state and analytical state have different consistency requirements and should be treated accordingly. This architectural clarity is a contribution in itself, as it provides a principled foundation for future work on synchronization semantics in collaborative visualization.

The three-layer visualization model (Dataset → ViewConfiguration → InstanceWindow) demonstrates that shared analytical configuration and local rendering can be cleanly separated, enabling multiple clients with heterogeneous rendering capabilities to converge on the same visualization without GPU state transfer. This model may generalize beyond VTK.js to other client-side renderers, as the plugin architecture illustrates.

### 10.2 Design Trade-offs

**Browser accessibility vs. native rendering performance.** The choice of VTK.js and WebGL over native VTK and OpenGL sacrifices some rendering performance (particularly for large polygon counts and GPU memory limits) in exchange for zero-install browser deployment and cross-platform participation. This trade-off is appropriate for a collaborative research prototype where accessibility across devices is a priority.

**Shared state consistency vs. local interaction freedom.** The dual-channel architecture allows fast-path local interactions (cursor movement, camera navigation) to proceed without coordination, at the cost of ephemeral state inconsistency. Camera follow state is synchronized via Y.js but its adoption is per-user (a user may ignore the camera sync); persistent camera state is written to the REST API on a 100 ms debounce. This gives users local navigation freedom while still enabling collaboration via cursor awareness and explicit camera sharing.

**CRDT presence vs. last-write-wins persistent state.** Y.js provides conflict-free merging for ephemeral state. The REST API uses database-level last-write-wins for persistent state, which is simpler to reason about but may produce unexpected behavior under concurrent edits to ViewConfigurations. Future work could explore CRDT-based ViewConfiguration editing to handle concurrent analytical modifications more gracefully.

**General toolkit architecture vs. domain-specific optimization.** OpenCIVAN's plugin architecture (InstanceTypeHandler, feature modules, worker registry) provides general extensibility but does not optimize for any particular scientific domain or data type. Domain-specific toolkits would achieve better performance and workflow integration for their target domain; OpenCIVAN instead provides the collaborative infrastructure on top of which domain-specific extensions can be built.

**Client-side vs. server-side rendering.** Both rendering paths are implemented but are currently independent. Client-side VTK.js provides interactive frame rates for moderate dataset sizes but is limited by browser memory and JavaScript execution speed. The Python FastAPI server-side renderer provides a path for datasets that exceed client capacity, but frame streaming introduces latency. An adaptive hybrid path — switching between client and server rendering based on dataset size or client capability — would address both constraints but is not yet implemented.

### 10.3 Current Limitations

The following limitations are derived from codebase inspection:

- **No formal user evaluation.** No user study, expert walkthrough, or usability evaluation data was found in the repository. The toolkit's collaborative value for domain scientists has not been measured.
- **No synchronization latency measurements.** End-to-end synchronization latency for cursor positions, ViewConfiguration updates, and chat messages has not been measured or reported.
- **Limited concurrent user testing.** The implementation has not been tested with large numbers of simultaneous users. The in-memory room model in the Y.js server (`server.js`) does not horizontally scale without adaptation.
- **Partial VR tool-state synchronization.** VR-placed annotations and measurements persist to the shared annotation store and broadcast to all participants, but slice-plane and clip-box tool state remains local per user.
- **In-VR user interface.** The React UI is not rendered inside the immersive view (no DOM overlay or layer-quad UI); in-VR interaction relies on controller/pinch input and spatial tools, with session controls on the desktop side.
- **Isolation mode is minimal.** Room-scale isolation adjusts the scene scale and viewing origin for the active view; it does not implement multi-view spatial grids, view fading, or in-VR return-to-grid UI.
- **Session replay interface.** Session recording infrastructure is confirmed in the server, but no client-side replay interface exists.
- **Chat migration in progress.** The codebase comments describe the text chat as migrating to a Matrix-CRDT model; the current Y.js Y.Array implementation is noted as transitional.
- **No explicit concurrent edit UI.** Concurrent ViewConfiguration edits are guarded by optimistic concurrency control (revision-checked writes return 409 conflicts), but there is no user-facing conflict visualization.
- **Format breadth.** Formats common in some scientific domains (HDF5, netCDF, DICOM, GLTF, CSV point clouds) are not currently supported.
- **Authentication in the Y.js server.** JWT authentication in the Y.js WebSocket server is implemented but its enforcement was not confirmed as mandatory in all deployment modes.
- **Vision Pro validation.** Transient-pointer input support and the thin-client rendering path follow the WebXR specification but still require on-device validation with Vision Pro hardware.

### 10.4 Future Work

Research-relevant extensions for OpenCIVAN include:

- **Synchronization latency measurement and optimization.** Characterize end-to-end latency for all synchronization channels under varying participant counts and network conditions. Explore cursor update interpolation and prediction to improve perceived smoothness.
- **CRDT-based ViewConfiguration editing.** Extend the Y.js document to include ViewConfiguration state as Y.Map fields, enabling conflict-free concurrent edits to colormap, feature toggles, and camera state.
- **Session replay interface.** Implement a client-side replay interface that reconstructs collaborative sessions from the `recording_events` stream, enabling retrospective analysis of collaborative analytical paths.
- **Full VR tool-state persistence.** VR annotations and measurements now persist through the shared annotation store; extend the same treatment to slice-plane and clip-box tool state, and add 3D rendering of measurement annotations (line segments with labels) on desktop clients.
- **In-VR user interface.** Render session controls and panels inside the immersive view (WebXR layer quads or DOM overlay), removing the dependence on desktop-side UI during immersive sessions.
- **Adaptive client/server rendering.** Implement a rendering mode manager that selects between VTK.js client-side rendering and server-side frame streaming based on dataset size, client memory, and network conditions.
- **Expert evaluation and user studies.** Conduct structured co-analysis tasks with visualization researchers and domain scientists to evaluate collaborative workflow support, cross-device coordination quality, and tool discoverability.
- **Horizontal scaling of the Y.js server.** Adapt the Y.js server for horizontal scaling via Redis-backed room state or distributed Y.js providers, enabling larger concurrent user counts.
- **Richer provenance visualization.** Implement a provenance graph interface that presents file derivation chains, ViewConfiguration fork histories, and session recording timelines in a unified timeline view.
- **Role-based analytical permissions.** Implement fine-grained permissions distinguishing between users who may modify shared ViewConfigurations and those who may only observe, supporting structured collaboration protocols.
- **Accessibility in VR.** Extend the `VRAccessibilityContext` with documented accessibility settings and verify accessibility for users with motor or visual differences in both desktop and VR modes.

---

## 11. Conclusion

OpenCIVAN is a prototype open-source toolkit for collaborative immersive analytics that demonstrates the feasibility of integrating shared multi-user sessions, CRDT-based synchronization, cross-device WebXR participation, and client-side VTK.js scientific rendering in a unified browser-deployable architecture. Its primary architectural contribution is the explicit dual-channel synchronization model, which separates ephemeral collaborative state (Y.js CRDT) from durable persistent analytical state (REST API with PostgreSQL), enabling the toolkit to serve the distinct consistency and latency requirements of each without compromise. A three-layer visualization model further separates raw dataset storage, shared ViewConfiguration state, and ephemeral GPU rendering, allowing collaborators on heterogeneous devices to converge on identical analytical configurations without transmitting GPU state across the network.

The current implementation supports eight scientific data formats, more than twenty VTK.js visualization features, multi-user VR sessions with role-based participation and avatar synchronization, real-time voice communication via LiveKit WebRTC, structured room and workspace management, 3D and canvas annotations, session recording, and an extensible plugin architecture for new visualization types and compute operations.

Significant work remains before OpenCIVAN can be considered a mature research infrastructure. No formal user evaluation has been conducted; synchronization latency, concurrent user limits, and rendering consistency across device types have not been measured. Several known limitations — the absence of an in-VR user interface, slice-plane/clip-box state persistence, session replay, the chat migration, and the absence of a concurrent-edit UI — require targeted engineering effort. The toolkit is best understood as a foundation for future research into collaborative immersive analytics, providing a structured starting point from which specific collaboration scenarios, evaluation studies, and domain-specific extensions can be developed.

---

## Appendix: Required Tables

### Table 1 — Implementation Evidence Map

| Paper claim | Supporting files/modules | Notes |
|---|---|---|
| Dual-channel synchronization architecture (Y.js + REST) | `src/collaboration/yjs/yjsSetup.js`, `server.js`, `server/src/services/websocket.js`, `src/services/syncService.js` | Two independent WebSocket connections maintained simultaneously |
| CRDT-based ephemeral presence synchronization | `src/collaboration/presence/presenceSystem.js`, `src/collaboration/yjs/yjsObservers.js` | Y.js awareness + Y.Map shared objects |
| Three-layer visualization model | `src/core/data/models/Dataset.js`, `src/core/data/models/ViewConfiguration.js`, `src/core/instances/types/vtk/VTKInstanceHandler.js` | Layer 1/2/3 separation confirmed in codebase |
| WebXR immersive session support | `src/core/vr/VRManager.js` (uses WebXR Device API) | Two VR layout modes: grid and isolated |
| Multi-user VR sessions with roles | `server/src/routes/vr.js`; `vr_exploration_sessions` + `vr_session_participants` tables | Roles: vr-explorer, vr-observer, desktop-observer, desktop-participant |
| VR avatar and controller pose synchronization | `src/core/vr/VRParticipantSync.js`, `src/collaboration/yjs/yjsSetup.js` (yAvatars, yVRControllers) | Published at WebXR frame rate; not recorded by default |
| VTK.js client-side rendering with scientific format support | `src/core/instances/types/vtk/VTKInstanceHandler.js` (lines 63–76) | VTP, VTI, VTU, STL, PLY, OBJ, VTKJS readers |
| Modular visualization feature system | `src/core/instances/types/vtk/features/` (20+ feature modules) | Volume, slice, glyph, clipping, threshold, PCA/t-SNE/UMAP, etc. |
| Server-side VTK rendering path | `server/render_server/app.py`, `render_state.py`, `vtk_renderer.py`; `src/services/RemoteRenderClient.js` | FastAPI server at port 7001; WebSocket frame streaming |
| Session, room, and workspace management | `server/src/routes/rooms.js`, `server/src/routes/workspaces.js`, `src/core/session/sessionManager.js` | Room types: main, breakout, dm; workspace types: personal, project, breakout |
| Keycloak OIDC authentication | `server/src/middleware/auth.js` | JWT validation + DEV_BYPASS_AUTH development mode |
| Real-time voice communication | `src/services/voice/voiceRoomService.js` (`livekit-client`) | LiveKit WebRTC; voice state in Y.js presence |
| Text chat with CRDT + PostgreSQL persistence | `src/collaboration/communication/textChat.js`, `server.js` (chat observer), `chat_messages` table | Y.js Y.Array; extracted to PostgreSQL; REST history API |
| 3D annotation support | `server/src/routes/annotations.js`, `annotations` table | Position, normal, type, text, branch |
| Canvas-level workspace drawings | `server/src/routes/workspaceAnnotations.js`, `workspace_annotations` table | Versioned snapshots in `workspace_annotation_snapshots` |
| Session recording infrastructure | `server/src/services/recordingService.js`, `session_recordings` + `recording_events` tables | Cursor at 15 fps with 5 px delta filter; Y.js updates; chat |
| Audit logging and provenance | `server/src/services/audit.js`, `audit_log` table; `file_versions`; `derived_from` field in `datasets` | Four audit levels; file hash versioning; derivation chains |
| Extensible instance type plugin architecture | `src/core/instances/types/` (InstanceTypeHandler interface + VTKInstanceHandler) | Handler registration in `instanceTypesInit.js` |
| BullMQ compute job queue with Python VTK worker | `server/src/services/jobQueue.js`, `workers/vtk-python/worker.py` | Decimation, LOD, smoothing, subsampling, PCA/t-SNE/UMAP |
| Optional Matrix federation for chat | `server/src/services/matrixBridge.js`, `matrix_room_mappings` table | Circuit-breaker pattern; flagged as Phase 4 / optional |

---

### Table 2 — Design Requirements and Implementation Evidence

| Requirement | Rationale | Implementation evidence | Current limitation |
|---|---|---|---|
| DR1 — Dual-channel real-time synchronization | Presence and persistent state have different latency and consistency requirements | `yjsSetup.js` (Y.js channel); `WebSocketManager.js` + REST routes (persistent channel); `syncService.js` (watermark + delta hydration) | No concurrent edit UI for persistent state; OCC 409s resolved automatically; Y.js channel has no delta path |
| DR2 — Three-layer visualization state separation | Sharing GPU state over the network is impractical; sharing configuration is sufficient | `Dataset.js` (Layer 1); `ViewConfiguration.js` + `ViewConfigurationManager.js` (Layer 2); `VTKInstanceHandler.js` (Layer 3) | Rendering consistency across clients depends on identical VTK.js version and dataset availability; not enforced |
| DR3 — Cross-device collaborative participation | Collaborative sessions should support heterogeneous device classes | `VRManager.js` (WebXR + transient-pointer input); `VRParticipantSync.js` (avatar sync); `VRExplorationManager.js` (tool persistence, isolation mode); `vr_session_participants` table (roles); `RemoteRenderClient.js` (thin client) | Slice-plane/clip-box tool state local per user; client/server rendering paths are independent |
| DR4 — Scientific data loading and visualization | Toolkit must support formats that domain scientists produce | `VTKInstanceHandler.js` readers (VTP, VTI, VTU, STL, PLY, OBJ, VTKJS); feature modules in `vtk/features/`; `workers/vtk-python/worker.py` | No HDF5, netCDF, DICOM, or GLTF support; no progressive/streaming load; 500 MB file size limit |
| DR5 — Session and room management | Structured session contexts are required for collaborative coordination | `rooms.js`; `workspaces.js`; `sessionManager.js`; `rooms` + `room_members` tables | No role-based permissions for visualization actions; breakout auto-merge not fully confirmed in client routing |
| DR6 — Session recording, provenance, and annotation | Analytical history supports reproducibility and retrospective review | `recordingService.js`; `session_recordings` + `recording_events` tables; `audit_log`; `file_versions`; `annotations` + `workspace_annotations` tables; live broadcast wiring in `serverSync.js` + `AnnotationManager.js` | No client-side replay interface; annotation sharing across rooms not implemented; audit enforcement across all routes not fully verified |

---

*End of paper draft. Sections 2 (Related Work), 9 (Evaluation), and Table 5 entries marked TODO require external literature, measured data, or user study results that are not available from the codebase alone.*
