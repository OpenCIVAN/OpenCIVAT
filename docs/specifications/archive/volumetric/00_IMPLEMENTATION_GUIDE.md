# Send to VR Feature - Implementation Guide

**Status:** Complete (All phases implemented as of January 9, 2026)
**VR Testing:** Pending hardware access (~2 weeks)

## Overview

This handoff package provides complete specifications for implementing the "Send to VR" feature in CIA Web. The feature enables seamless transition from desktop analysis to immersive VR exploration of volumetric data.

---

## Package Contents

| File | Description |
|------|-------------|
| `00_IMPLEMENTATION_GUIDE.md` | This file - overview and implementation order |
| `01_DATA_MODELS.md` | VRExplorationSession, Dataset extensions, ViewConfiguration additions |
| `02_CORE_SERVICES.md` | VRExplorationManager, VRParticipantSync, VRSnapshotManager |
| `03_SERVER_ENDPOINTS.md` | REST API endpoints, WebSocket events, preprocessing queue |
| `04_VR_TOOLS.md` | VR tool system, slice plane, measurement, annotation tools |
| `05_UI_COMPONENTS.md` | VRLaunchModal, VRSessionPanel, VRExploreButton |
| `06_HANDLER_EXTENSIONS.md` | InstanceTypeHandler VR interface additions, VTK implementation |
| `07_NAVIGATION_SYSTEM.md` | Fly, teleport, walk, scale modes |
| `08_COLLABORATION.md` | Desktop participation modes, control handoff, presence sync |
| `09_TESTING_CHECKLIST.md` | Test cases for each component |

---

## Key Architectural Decisions

### 1. Unified State Model
VR and Desktop consume the **same ViewConfiguration state**. They are different renderers, not separate state stores.

```
ViewConfiguration (Layer 2)
├── Universal State (camera, slicePlanes, clipBox, measurements, etc.)
├── VR Rendering Hints (vrScale, vrOrigin, explorationMode)
└── Snapshots (includes isVRSnapshot flag)
```

### 2. Automatic VR Preprocessing
VR preprocessing happens **automatically on file upload** as a background job:
- LOD generation for meshes/point clouds
- Volume chunking for volumetric data
- Results cached in S3, tracked in `Dataset.vrReadiness`

### 3. Desktop Participation Modes
Three modes for desktop users in VR sessions:
1. **Observer** - Watch only
2. **Participant** - Interact via virtual avatar
3. **Controller** - Guide a VR user's view (with permission)

### 4. Session Snapshots
VR sessions create snapshots in ViewConfiguration with `isVRSnapshot: true` metadata. Users can restore to any previous state.

### 5. Annotation Ownership
- Default: **Individual** ownership (creator attributed)
- Option: **Group** ownership (attributed to VR session, contributors tracked)

### 6. Scale Visibility Toggle
Users choose how to see others at different scales:
- **My Scale**: Relative to current user's scale
- **World Scale**: At actual world positions

---

## Implementation Phases

**All phases complete as of January 9, 2026**

### Phase 1: Core Infrastructure ✅ COMPLETE

**Priority: CRITICAL**

Files to create/modify:

1. **Data Models**
   - `src/core/data/models/VRExplorationSession.js` (NEW)
   - `src/core/data/models/Dataset.js` (ADD vrReadiness)
   - `src/core/data/models/ViewConfiguration.js` (ADD VR extensions)
   - `src/core/data/models/Annotation.js` (ADD ownership model)

2. **Server**
   - `server/routes/vr.js` (NEW - VR session API)
   - `server/queues/vrPreprocessing.js` (NEW - background processing)
   - `server/workers/vrPreprocessingWorker.js` (NEW)
   - `server/routes/datasets.js` (MODIFY - queue preprocessing on upload)

3. **Core Services**
   - `src/core/vr/VRExplorationManager.js` (NEW)

### Phase 2: Desktop Launch UI ✅ COMPLETE

**Priority: HIGH**

Files to create:

1. `src/ui/react/components/modals/VRLaunchModal/VRLaunchModal.jsx`
2. `src/ui/react/components/modals/VRLaunchModal/VRLaunchModal.scss`
3. `src/ui/react/components/modals/VRLaunchModal/index.js`
4. `src/ui/react/components/molecules/VRExploreButton/VRExploreButton.jsx`
5. `src/ui/react/components/molecules/VRExploreButton/VRExploreButton.scss`

Modify:
- `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx` (ADD VR menu)

### Phase 3: Desktop Participation ✅ COMPLETE

**Priority: HIGH**

Files to create:

1. `src/ui/react/components/panels/VRSessionPanel/VRSessionPanel.jsx`
2. `src/ui/react/components/panels/VRSessionPanel/VRSessionPanel.scss`
3. `src/ui/react/components/panels/VRSessionPanel/views/ObserverView.jsx`
4. `src/ui/react/components/panels/VRSessionPanel/views/ParticipantView.jsx`
5. `src/ui/react/components/panels/VRSessionPanel/views/ControllerView.jsx`
6. `src/core/vr/VRControlManager.js` (NEW)

### Phase 4: VR Environment ✅ COMPLETE

**Priority: HIGH**

Files to create:

1. `src/core/vr/VRExplorationLayout.js`
2. `src/core/vr/VRScaleVisibility.js`
3. `src/core/vr/VRParticipantSync.js`
4. `src/core/vr/VRDesktopAvatars.js`

### Phase 5: VR Tools ✅ COMPLETE

**Priority: HIGH**

Files to create:

1. `src/core/vr/tools/VRToolInterface.js`
2. `src/core/vr/tools/VRToolManager.js`
3. `src/core/vr/tools/VRSlicePlaneTool.js`
4. `src/core/vr/tools/VRMeasureTool.js`
5. `src/core/vr/tools/VRAnnotationTool.js`
6. `src/core/vr/tools/VRClipBoxTool.js`
7. `src/core/vr/tools/VRProbeTool.js`
8. `src/core/vr/navigation/VRNavigationController.js`
9. `src/core/vr/navigation/VRFlyMode.js`
10. `src/core/vr/navigation/VRTeleportMode.js`
11. `src/core/vr/navigation/VRScaleController.js`

### Phase 6: Annotations & Snapshots ✅ COMPLETE

**Priority: MEDIUM**

Files to create:

1. `src/core/vr/VRAnnotationHandler.js`
2. `src/core/vr/VRSnapshotManager.js`
3. `src/core/vr/VRVoiceInput.js`

Modify:
- `src/core/data/managers/AnnotationManager.js` (ownership support)
- `src/core/data/managers/ViewConfigurationManager.js` (VR snapshots)

---

## Existing Code to Reference

### VR Infrastructure (Already Exists)
```
src/core/vr/
├── VRManager.js           # WebXR session management
├── VRCursorSync.js        # Cross-platform cursor sync (Y.js)
├── vrModeManager.js       # VR mode state management

src/core/instances/types/vtk/vr/
├── VTKVRController.js     # Controller handling (needs update)
```

### Handler Interface (Extend)
```
src/core/instances/types/InstanceTypeInterface.js
# Add: supportsVRExploration(), getVRExplorationCapabilities(), etc.
```

### VTK Handler (Reference Implementation)
```
src/core/instances/types/vtk/VTKInstanceHandler.js
# Already has: supportsInstanceVR(), enterInstanceVR(), etc.
# Add: VR exploration methods
```

### Manifest (Already Has VR Config)
```
src/core/instances/types/vtk/manifest.ts
# vr: { supportsInstanceVR: true, requirements: {...} }
# compute.serverSide: LOD generation, volume chunking already defined
```

---

## Critical Implementation Notes

### 1. Y.js Usage
VRExplorationSession uses Y.js for:
- Participant presence sync (`ydoc.getMap('vr-participants-${sessionId}')`)
- NOT for visualization state (that's in ViewConfiguration)

### 2. Server Authority
- VRExplorationSession IDs from server
- Dataset.vrReadiness from server
- Annotations via REST API (not Y.js)

### 3. Handler Interface Contract
All new handler methods must:
- Have default implementations in `InstanceTypeInterface.js`
- Be implemented in `VTKInstanceHandler.js` as reference
- Be documented with JSDoc

### 4. Event Naming Convention
```javascript
// Window events
'cia:vr-session-started'
'cia:vr-session-ended'
'cia:vr-control-request'
'cia:vr-control-response'
'cia:dataset:vr-ready'

// Manager events (EventEmitter pattern)
vrExplorationManager.on('participantJoined', ...)
vrExplorationManager.on('sessionStarted', ...)
```

### 5. Component Location
Following existing patterns:
- Modals: `src/ui/react/components/modals/[ModalName]/`
- Panels: `src/ui/react/components/panels/[PanelName]/`
- Molecules: `src/ui/react/components/molecules/[ComponentName]/`

---

## Testing Strategy

### Unit Tests
- VRExplorationSession model methods
- VRTool lifecycle
- Scale visibility calculations

### Integration Tests
- Server preprocessing queue
- Session creation flow
- Control handoff flow

### Manual VR Tests
- Use Quest Link or similar for desktop VR testing
- Test with multiple users (VR + desktop)
- Test preprocessing with large datasets

---

## Getting Started

1. Read all specification files in order
2. Start with Phase 1 (data models)
3. Use `project_knowledge_search` to find existing patterns
4. Reference VTKInstanceHandler for handler implementation patterns
5. Reference existing modals/panels for UI patterns

---

## Questions During Implementation

If you encounter unclear specifications:
1. Check existing patterns in the codebase
2. Reference the VTK plugin as the canonical example
3. Document any decisions made for future reference
4. Prefer extensibility over quick fixes

---

## File Dependencies Graph

```
VRExplorationSession (model)
    ↓
VRExplorationManager (service)
    ↓
├── VRToolManager → VRTool implementations
├── VRParticipantSync → Y.js presence
├── VRNavigationController → Navigation modes
└── VRSnapshotManager → ViewConfiguration

VRLaunchModal (UI)
    ↓
├── VRExplorationManager
├── Dataset.vrReadiness
└── Instance handler capabilities

VRSessionPanel (UI)
    ↓
├── VRExplorationManager
├── Participation modes
└── Control handoff
```
