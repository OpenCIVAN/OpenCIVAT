# Testing Checklist & Quick Reference

## Testing Checklist

### Phase 1: Core Infrastructure Tests

#### Data Models
- [ ] VRExplorationSession serializes/deserializes correctly
- [ ] Participant management (add, remove, update mode)
- [ ] Control request/approval flow
- [ ] Session snapshot creation
- [ ] Dataset VR readiness status transitions

#### Server Endpoints
- [ ] POST /vr/sessions creates session with correct owner
- [ ] GET /vr/sessions lists active sessions in project
- [ ] POST /vr/sessions/:id/join adds participant
- [ ] POST /vr/sessions/:id/leave removes participant
- [ ] Participant mode updates sync correctly

#### VR Preprocessing
- [ ] Job queued on file upload (for VR-capable types)
- [ ] Progress broadcasts via WebSocket
- [ ] LOD generation produces valid files
- [ ] Completion updates Dataset.vrReadiness
- [ ] Failed jobs mark status correctly

### Phase 2: Desktop UI Tests

#### VR Launch Modal
- [ ] Shows VR readiness status
- [ ] Disables launch when VR not ready
- [ ] Selection types work (full, filtered, selection, region)
- [ ] Exploration mode selection persists
- [ ] Scale slider updates correctly
- [ ] Collaboration toggles work

#### VR Explore Button
- [ ] Shows in instance viewport toolbar
- [ ] Dropdown shows correct options
- [ ] Disabled when handler doesn't support VR
- [ ] Shows loading state during preprocessing

### Phase 3: Desktop Participation Tests

#### Observer Mode
- [ ] Can join active session as observer
- [ ] Sees list of VR participants
- [ ] Can switch between following different users
- [ ] No interaction capabilities

#### Participant Mode
- [ ] Avatar appears in VR view
- [ ] Can create annotations
- [ ] Can add slice planes
- [ ] Cursor visible to VR users

#### Controller Mode
- [ ] Request control shows pending state
- [ ] VR user sees approval dialog
- [ ] Control established after approval
- [ ] Mouse movements control VR camera
- [ ] Release control works
- [ ] VR user can break free

### Phase 4: VR Environment Tests

#### Scale Visibility
- [ ] Toggle between MY_SCALE and WORLD_SCALE
- [ ] Remote participants scale correctly in MY_SCALE
- [ ] Scale indicators show in WORLD_SCALE

#### Participant Sync (Y.js)
- [ ] Head pose updates broadcast
- [ ] Controller poses broadcast
- [ ] Participant join/leave detected
- [ ] Scale changes sync

### Phase 5: VR Tools Tests

#### Slice Plane Tool
- [ ] Initial plane created at center
- [ ] Grip to grab plane works
- [ ] Move grabbed plane
- [ ] Thumbstick slides along normal
- [ ] Trigger creates new plane
- [ ] Planes sync to desktop (if enabled)

#### Measure Tool
- [ ] Trigger at start point
- [ ] Trigger at end point
- [ ] Distance displayed in VR
- [ ] Measurement persisted

#### Annotation Tool
- [ ] Point at surface
- [ ] Trigger places marker
- [ ] Voice input for text (if available)
- [ ] Ownership toggle (individual/group)
- [ ] Annotation syncs to Dataset

### Phase 6: Navigation Tests

#### Fly Mode
- [ ] Thumbstick forward/back/strafe
- [ ] Trigger boost works
- [ ] Rotation via right thumbstick

#### Teleport Mode
- [ ] Arc preview shows
- [ ] Release teleports to target
- [ ] Snap rotation works

#### Scale Mode
- [ ] Two-hand pinch detected
- [ ] Pinch scales user
- [ ] Scale limits enforced

### Phase 7: Snapshot Tests

#### Quick Save
- [ ] Creates snapshot with auto name
- [ ] Haptic feedback fires
- [ ] Snapshot appears in list

#### Load Snapshot
- [ ] ViewConfiguration restored
- [ ] VR context restored (scale, mode)
- [ ] Haptic feedback fires

#### Auto-save
- [ ] Interval creates snapshots
- [ ] Disable stops interval

---

## Quick Reference

### File Locations

```
NEW FILES:
src/core/data/models/VRExplorationSession.js
src/core/vr/VRExplorationManager.js
src/core/vr/VRParticipantSync.js
src/core/vr/VRSnapshotManager.js
src/core/vr/VRControlManager.js
src/core/vr/VRScaleVisibility.js
src/core/vr/tools/VRToolManager.js
src/core/vr/tools/VRToolInterface.js
src/core/vr/tools/VRSlicePlaneTool.js
src/core/vr/tools/VRMeasureTool.js
src/core/vr/tools/VRAnnotationTool.js
src/core/vr/navigation/VRNavigationController.js
src/ui/react/components/modals/VRLaunchModal/
src/ui/react/components/panels/VRSessionPanel/
src/ui/react/components/molecules/VRExploreButton/
server/routes/vr.js
server/queues/vrPreprocessing.js

MODIFIED FILES:
src/core/data/models/Dataset.js (vrReadiness)
src/core/data/models/ViewConfiguration.js (vrHints, VR snapshots)
src/core/data/models/Annotation.js (ownership model)
src/core/instances/types/InstanceTypeInterface.js (VR exploration methods)
src/core/instances/types/vtk/VTKInstanceHandler.js (VR implementation)
server/routes/datasets.js (queue preprocessing)
prisma/schema.prisma (VR tables)
```

### Key Enums

```javascript
// Selection types
SELECTION_TYPE.FULL | FILTERED | SELECTION | REGION

// Exploration modes
EXPLORATION_MODES.FLY | TELEPORT | WALK | SCALE

// Participation modes
PARTICIPATION_MODE.VR_EXPLORER | DESKTOP_OBSERVER | DESKTOP_PARTICIPANT | DESKTOP_CONTROLLER

// Scale visibility
SCALE_VISIBILITY.MY_SCALE | WORLD_SCALE

// Session status
SESSION_STATUS.PREPARING | ACTIVE | PAUSED | ENDED

// VR readiness
VR_READINESS_STATUS.PENDING | QUEUED | PROCESSING | READY | FAILED | NOT_APPLICABLE

// Annotation ownership
ANNOTATION_OWNERSHIP.INDIVIDUAL | GROUP
```

### Event Names

```javascript
// Window events (UI communication)
'cia:vr-session-started'
'cia:vr-session-ended'
'cia:vr-control-request'
'cia:vr-control-response'
'cia:vr-participant-update'
'cia:vr-participant-left'
'cia:vr-haptic'
'cia:vr-context-restored'
'cia:dataset:vr-ready'

// WebSocket broadcasts
'vr:session-created'
'vr:session-updated'
'vr:session-ended'
'vr:participant-joined'
'vr:participant-left'
'dataset:vr-progress'
'dataset:vr-ready'
'dataset:vr-failed'

// Manager events (EventEmitter)
vrExplorationManager.on('explorationStarted')
vrExplorationManager.on('sessionJoined')
vrExplorationManager.on('sessionLeft')
vrExplorationManager.on('participantUpdated')
vrExplorationManager.on('toolActivated')
vrExplorationManager.on('explorationModeChanged')
vrExplorationManager.on('vrScaleChanged')
vrExplorationManager.on('frame')
vrExplorationManager.on('annotationCreated')
vrExplorationManager.on('measurementCreated')
vrExplorationManager.on('slicePlaneUpdated')
```

### Controller Mapping

```
RIGHT CONTROLLER:
- Trigger: Select / Interact / Tool primary action
- Grip: Grab objects
- Thumbstick: Navigation (fly mode) / Tool secondary
- A Button: Confirm
- B Button: Cancel / Break free from control

LEFT CONTROLLER:
- Trigger: Secondary select
- Grip: Grab objects
- Thumbstick: Navigation (strafe/vertical)
- X Button: Toggle menu
- Y Button: Home / Reset view
```

### API Endpoints

```
POST   /vr/sessions                      Create session
GET    /vr/sessions/:id                  Get session
GET    /vr/sessions?projectId=X          List sessions
PUT    /vr/sessions/:id                  Update session
DELETE /vr/sessions/:id                  End session
POST   /vr/sessions/:id/join             Join session
POST   /vr/sessions/:id/leave            Leave session
PUT    /vr/sessions/:id/participants/:id Update participant
POST   /vr/sessions/:id/snapshots        Create snapshot
GET    /vr/sessions/:id/snapshots        List snapshots
GET    /datasets/:id/vr-status           Get VR readiness
```

---

## Implementation Order Checklist

### Week 1-2: Core Infrastructure
- [ ] Create VRExplorationSession model
- [ ] Add Dataset.vrReadiness
- [ ] Add ViewConfiguration.vrHints
- [ ] Add Annotation ownership
- [ ] Create server VR routes
- [ ] Create preprocessing queue
- [ ] Modify dataset upload to queue jobs
- [ ] Add database schema

### Week 3: Desktop Launch UI
- [ ] Create VRLaunchModal
- [ ] Create VRExploreButton
- [ ] Add to InstanceViewport toolbar
- [ ] Add VR readiness indicator

### Week 4: Desktop Participation
- [ ] Create VRSessionPanel
- [ ] Implement ObserverView
- [ ] Implement ParticipantView
- [ ] Implement ControllerView
- [ ] Create VRControlManager

### Week 5-6: VR Environment
- [ ] Create VRExplorationManager
- [ ] Create VRParticipantSync
- [ ] Create VRScaleVisibility
- [ ] Add handler VR exploration methods
- [ ] Implement VTK VR exploration

### Week 7: VR Tools
- [ ] Create VRToolManager
- [ ] Create VRToolInterface
- [ ] Implement VRSlicePlaneTool
- [ ] Implement VRMeasureTool
- [ ] Implement VRAnnotationTool
- [ ] Create VRNavigationController

### Week 8: Polish
- [ ] Create VRSnapshotManager
- [ ] Add voice input for annotations
- [ ] End-to-end testing
- [ ] Performance optimization
