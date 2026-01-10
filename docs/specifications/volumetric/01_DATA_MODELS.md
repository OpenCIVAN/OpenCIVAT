# Data Models Specification

## 1. VRExplorationSession (NEW FILE)

**File**: `src/core/data/models/VRExplorationSession.js`

This is the core model for coordinating VR exploration sessions. Note: It does NOT store visualization state (that lives in ViewConfiguration). It manages WHO is exploring and HOW they're collaborating.

```javascript
// src/core/data/models/VRExplorationSession.js
// Coordinates multi-user VR exploration sessions
//
// ARCHITECTURE:
// - This does NOT duplicate ViewConfiguration state
// - It coordinates participants and collaboration
// - All visualization state lives in ViewConfiguration
// - Server is source of truth for session data

import { vr as log } from '@Utils/logger.js';

// =============================================================================
// ENUMS
// =============================================================================

export const SELECTION_TYPE = Object.freeze({
  FULL: 'full',           // Entire dataset
  FILTERED: 'filtered',   // Current view with filters applied
  SELECTION: 'selection', // User-selected points/regions
  REGION: 'region',       // Defined bounding region
});

export const EXPLORATION_MODES = Object.freeze({
  FLY: 'fly',           // Free 6DOF movement
  TELEPORT: 'teleport', // Point and click locomotion
  WALK: 'walk',         // Room-scale physical movement
  SCALE: 'scale',       // Pinch to resize relative to data
});

export const PARTICIPATION_MODE = Object.freeze({
  VR_EXPLORER: 'vr-explorer',           // In VR headset
  DESKTOP_OBSERVER: 'desktop-observer', // Watch only
  DESKTOP_PARTICIPANT: 'desktop-participant', // Interact via avatar
  DESKTOP_CONTROLLER: 'desktop-controller',   // Control a VR user's view
});

export const SCALE_VISIBILITY = Object.freeze({
  MY_SCALE: 'my-scale',     // See others relative to own scale
  WORLD_SCALE: 'world-scale', // See others at actual positions
});

export const SESSION_STATUS = Object.freeze({
  PREPARING: 'preparing',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
});

export const VR_TOOL_IDS = Object.freeze({
  SLICE: 'slice',
  MEASURE: 'measure',
  ANNOTATE: 'annotate',
  CLIP: 'clip',
  PROBE: 'probe',
  CROSS_SECTION: 'cross',
});

// =============================================================================
// PARTICIPANT CLASS
// =============================================================================

export class VRParticipant {
  constructor(config = {}) {
    this.odUserId = config.odUserId;
    this.userName = config.userName;
    this.userColor = config.userColor || '#00ff00';
    
    this.mode = config.mode || PARTICIPATION_MODE.DESKTOP_OBSERVER;
    this.joinedAt = config.joinedAt || Date.now();
    this.lastActiveAt = config.lastActiveAt || Date.now();
    
    this.permissions = config.permissions || {
      canAnnotate: false,
      canSlice: false,
      canControl: false,
    };
    
    // VR-specific (when mode is VR_EXPLORER)
    this.vrScale = config.vrScale || 1.0;
    this.scaleVisibility = config.scaleVisibility || SCALE_VISIBILITY.MY_SCALE;
    
    // Control relationship
    this.controllingUserId = config.controllingUserId || null;
    this.controlledByUserId = config.controlledByUserId || null;
  }
  
  isVR() {
    return this.mode === PARTICIPATION_MODE.VR_EXPLORER;
  }
  
  isDesktop() {
    return this.mode !== PARTICIPATION_MODE.VR_EXPLORER;
  }
  
  isControlling() {
    return this.controllingUserId !== null;
  }
  
  isBeingControlled() {
    return this.controlledByUserId !== null;
  }
  
  toJSON() {
    return {
      odUserId: this.odUserId,
      userName: this.userName,
      userColor: this.userColor,
      mode: this.mode,
      joinedAt: this.joinedAt,
      lastActiveAt: this.lastActiveAt,
      permissions: { ...this.permissions },
      vrScale: this.vrScale,
      scaleVisibility: this.scaleVisibility,
      controllingUserId: this.controllingUserId,
      controlledByUserId: this.controlledByUserId,
    };
  }
  
  static fromJSON(json) {
    return new VRParticipant(json);
  }
}

// =============================================================================
// SESSION SNAPSHOT CLASS
// =============================================================================

export class VRSessionSnapshot {
  constructor(config = {}) {
    this.id = config.id;
    this.name = config.name || '';
    this.timestamp = config.timestamp || Date.now();
    this.viewSnapshotId = config.viewSnapshotId;  // Reference to ViewConfiguration snapshot
    this.createdBy = config.createdBy;
    this.createdByName = config.createdByName;
    
    // Participant states at snapshot time
    this.participantStates = config.participantStates || [];
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      timestamp: this.timestamp,
      viewSnapshotId: this.viewSnapshotId,
      createdBy: this.createdBy,
      createdByName: this.createdByName,
      participantStates: this.participantStates,
    };
  }
  
  static fromJSON(json) {
    return new VRSessionSnapshot(json);
  }
}

// =============================================================================
// MAIN SESSION CLASS
// =============================================================================

export class VRExplorationSession {
  constructor(config = {}) {
    // =========================================================================
    // IDENTITY
    // =========================================================================
    this.id = config.id;                  // Server-generated
    this.serverId = config.serverId;      // For server sync
    this.name = config.name || '';        // Optional session name
    
    // =========================================================================
    // RELATIONSHIPS
    // =========================================================================
    this.viewConfigurationId = config.viewConfigurationId;  // THE state source
    this.datasetId = config.datasetId;
    this.projectId = config.projectId;
    
    // =========================================================================
    // DATA SELECTION (what subset to explore)
    // =========================================================================
    this.selectionType = config.selectionType || SELECTION_TYPE.FULL;
    this.regionOfInterest = config.regionOfInterest || null;
    // regionOfInterest: { bounds: [xMin, xMax, yMin, yMax, zMin, zMax], transform: matrix4 }
    
    this.selectionIds = config.selectionIds || [];
    // Point/cell IDs when selectionType is SELECTION
    
    this.filterSnapshotId = config.filterSnapshotId || null;
    // Reference to ViewConfiguration snapshot with filter state
    
    // =========================================================================
    // EXPLORATION SETTINGS
    // =========================================================================
    this.defaultExplorationMode = config.defaultExplorationMode || EXPLORATION_MODES.FLY;
    this.defaultVRScale = config.defaultVRScale || 1.0;
    
    // =========================================================================
    // PARTICIPANTS
    // =========================================================================
    this.ownerUserId = config.ownerUserId;
    this.ownerUserName = config.ownerUserName;
    
    this.participants = (config.participants || []).map(p => 
      p instanceof VRParticipant ? p : VRParticipant.fromJSON(p)
    );
    
    // =========================================================================
    // COLLABORATION SETTINGS
    // =========================================================================
    this.visibility = config.visibility || 'group';  // 'private' | 'group' | 'public'
    this.allowJoin = config.allowJoin !== false;
    this.allowDesktopParticipants = config.allowDesktopParticipants !== false;
    this.allowDesktopControl = config.allowDesktopControl !== false;
    this.requireControlApproval = config.requireControlApproval !== false;
    
    // =========================================================================
    // DESKTOP SYNC
    // =========================================================================
    this.syncSlicesToDesktop = config.syncSlicesToDesktop !== false;
    this.syncAnnotationsToDesktop = config.syncAnnotationsToDesktop !== false;
    
    // =========================================================================
    // LIFECYCLE
    // =========================================================================
    this.status = config.status || SESSION_STATUS.PREPARING;
    this.createdAt = config.createdAt || Date.now();
    this.startedAt = config.startedAt || null;
    this.endedAt = config.endedAt || null;
    this.pausedAt = config.pausedAt || null;
    
    // =========================================================================
    // SNAPSHOTS
    // =========================================================================
    this.sessionSnapshots = (config.sessionSnapshots || []).map(s =>
      s instanceof VRSessionSnapshot ? s : VRSessionSnapshot.fromJSON(s)
    );
    
    // =========================================================================
    // PENDING REQUESTS
    // =========================================================================
    this.pendingControlRequests = config.pendingControlRequests || [];
    // { fromUserId, toUserId, requestedAt }
  }
  
  // ===========================================================================
  // PARTICIPANT MANAGEMENT
  // ===========================================================================
  
  getParticipant(odUserId) {
    return this.participants.find(p => p.odUserId === odUserId);
  }
  
  addParticipant(odUserId, userName, userColor, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    // Remove if already exists
    this.removeParticipant(odUserId);
    
    const participant = new VRParticipant({
      odUserId,
      userName,
      userColor,
      mode,
      permissions: this._getDefaultPermissions(mode),
    });
    
    this.participants.push(participant);
    return participant;
  }
  
  removeParticipant(odUserId) {
    const index = this.participants.findIndex(p => p.odUserId === odUserId);
    if (index !== -1) {
      const participant = this.participants[index];
      
      // Clean up any control relationships
      if (participant.controllingUserId) {
        const target = this.getParticipant(participant.controllingUserId);
        if (target) target.controlledByUserId = null;
      }
      if (participant.controlledByUserId) {
        const controller = this.getParticipant(participant.controlledByUserId);
        if (controller) controller.controllingUserId = null;
      }
      
      this.participants.splice(index, 1);
      return participant;
    }
    return null;
  }
  
  updateParticipantMode(odUserId, newMode) {
    const participant = this.getParticipant(odUserId);
    if (participant) {
      participant.mode = newMode;
      participant.permissions = this._getDefaultPermissions(newMode);
      participant.lastActiveAt = Date.now();
    }
    return participant;
  }
  
  _getDefaultPermissions(mode) {
    switch (mode) {
      case PARTICIPATION_MODE.VR_EXPLORER:
        return { canAnnotate: true, canSlice: true, canControl: false };
      case PARTICIPATION_MODE.DESKTOP_PARTICIPANT:
        return { canAnnotate: true, canSlice: true, canControl: false };
      case PARTICIPATION_MODE.DESKTOP_CONTROLLER:
        return { canAnnotate: false, canSlice: false, canControl: true };
      case PARTICIPATION_MODE.DESKTOP_OBSERVER:
      default:
        return { canAnnotate: false, canSlice: false, canControl: false };
    }
  }
  
  // ===========================================================================
  // PARTICIPANT QUERIES
  // ===========================================================================
  
  getVRParticipants() {
    return this.participants.filter(p => p.isVR());
  }
  
  getDesktopParticipants() {
    return this.participants.filter(p => p.isDesktop());
  }
  
  getControllableVRUsers() {
    return this.participants.filter(p => 
      p.isVR() && !p.isBeingControlled()
    );
  }
  
  // ===========================================================================
  // CONTROL MANAGEMENT
  // ===========================================================================
  
  requestControl(fromUserId, toUserId) {
    const from = this.getParticipant(fromUserId);
    const to = this.getParticipant(toUserId);
    
    if (!from || !to) {
      throw new Error('Invalid participant IDs');
    }
    
    if (!to.isVR()) {
      throw new Error('Can only control VR users');
    }
    
    if (to.isBeingControlled()) {
      throw new Error('User is already being controlled');
    }
    
    if (this.requireControlApproval) {
      this.pendingControlRequests.push({
        fromUserId,
        toUserId,
        requestedAt: Date.now(),
      });
      return { status: 'pending' };
    } else {
      return this.establishControl(fromUserId, toUserId);
    }
  }
  
  establishControl(controllerUserId, targetUserId) {
    const controller = this.getParticipant(controllerUserId);
    const target = this.getParticipant(targetUserId);
    
    if (!controller || !target) {
      throw new Error('Invalid participant IDs');
    }
    
    controller.controllingUserId = targetUserId;
    controller.mode = PARTICIPATION_MODE.DESKTOP_CONTROLLER;
    target.controlledByUserId = controllerUserId;
    
    // Remove from pending
    this.pendingControlRequests = this.pendingControlRequests.filter(
      r => !(r.fromUserId === controllerUserId && r.toUserId === targetUserId)
    );
    
    return { status: 'established' };
  }
  
  releaseControl(controllerUserId) {
    const controller = this.getParticipant(controllerUserId);
    if (!controller || !controller.controllingUserId) return;
    
    const target = this.getParticipant(controller.controllingUserId);
    if (target) {
      target.controlledByUserId = null;
    }
    
    controller.controllingUserId = null;
    controller.mode = PARTICIPATION_MODE.DESKTOP_PARTICIPANT;
  }
  
  declineControlRequest(fromUserId, toUserId) {
    this.pendingControlRequests = this.pendingControlRequests.filter(
      r => !(r.fromUserId === fromUserId && r.toUserId === toUserId)
    );
  }
  
  // ===========================================================================
  // SNAPSHOTS
  // ===========================================================================
  
  createSessionSnapshot(name, viewSnapshotId, userId, userName) {
    const snapshot = new VRSessionSnapshot({
      id: `vrsnapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      viewSnapshotId,
      createdBy: userId,
      createdByName: userName,
      participantStates: this.participants.map(p => ({
        odUserId: p.odUserId,
        vrScale: p.vrScale,
        mode: p.mode,
      })),
    });
    
    this.sessionSnapshots.push(snapshot);
    return snapshot;
  }
  
  getSessionSnapshot(snapshotId) {
    return this.sessionSnapshots.find(s => s.id === snapshotId);
  }
  
  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  
  start() {
    this.status = SESSION_STATUS.ACTIVE;
    this.startedAt = Date.now();
  }
  
  pause() {
    this.status = SESSION_STATUS.PAUSED;
    this.pausedAt = Date.now();
  }
  
  resume() {
    this.status = SESSION_STATUS.ACTIVE;
    this.pausedAt = null;
  }
  
  end() {
    this.status = SESSION_STATUS.ENDED;
    this.endedAt = Date.now();
  }
  
  isActive() {
    return this.status === SESSION_STATUS.ACTIVE;
  }
  
  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================
  
  toJSON() {
    return {
      id: this.id,
      serverId: this.serverId,
      name: this.name,
      viewConfigurationId: this.viewConfigurationId,
      datasetId: this.datasetId,
      projectId: this.projectId,
      selectionType: this.selectionType,
      regionOfInterest: this.regionOfInterest,
      selectionIds: this.selectionIds,
      filterSnapshotId: this.filterSnapshotId,
      defaultExplorationMode: this.defaultExplorationMode,
      defaultVRScale: this.defaultVRScale,
      ownerUserId: this.ownerUserId,
      ownerUserName: this.ownerUserName,
      participants: this.participants.map(p => p.toJSON()),
      visibility: this.visibility,
      allowJoin: this.allowJoin,
      allowDesktopParticipants: this.allowDesktopParticipants,
      allowDesktopControl: this.allowDesktopControl,
      requireControlApproval: this.requireControlApproval,
      syncSlicesToDesktop: this.syncSlicesToDesktop,
      syncAnnotationsToDesktop: this.syncAnnotationsToDesktop,
      status: this.status,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      pausedAt: this.pausedAt,
      sessionSnapshots: this.sessionSnapshots.map(s => s.toJSON()),
      pendingControlRequests: this.pendingControlRequests,
    };
  }
  
  static fromJSON(json) {
    return new VRExplorationSession(json);
  }
}

export default VRExplorationSession;
```

---

## 2. Dataset Model Extensions

**File**: `src/core/data/models/Dataset.js`

Add the following to the existing Dataset class:

```javascript
// Add to imports at top of file
export const VR_READINESS_STATUS = Object.freeze({
  PENDING: 'pending',       // Not yet processed
  QUEUED: 'queued',         // In preprocessing queue
  PROCESSING: 'processing', // Currently being processed
  READY: 'ready',           // Fully optimized for VR
  FAILED: 'failed',         // Processing failed
  NOT_APPLICABLE: 'n-a',    // File type doesn't support VR
});

// Add to Dataset constructor
constructor(config = {}) {
  // ... existing fields ...
  
  // VR Optimization Status (NEW)
  this.vrReadiness = config.vrReadiness || {
    status: VR_READINESS_STATUS.PENDING,
    queuedAt: null,
    startedAt: null,
    completedAt: null,
    progress: 0,              // 0-100
    estimatedCompletion: null,
    
    // Results (when status is 'ready')
    lodLevels: 0,             // Number of LOD levels generated
    chunkCount: 0,            // Number of volume chunks
    recommendedScale: 1.0,    // Recommended VR scale
    bounds: null,             // Data bounds [xMin, xMax, yMin, yMax, zMin, zMax]
    processedFiles: [],       // S3 paths to processed files
    
    // Error info (when status is 'failed')
    errorMessage: null,
    errorCode: null,
  };
}

// Add helper methods
isVRReady() {
  return this.vrReadiness.status === VR_READINESS_STATUS.READY;
}

isVRProcessing() {
  return this.vrReadiness.status === VR_READINESS_STATUS.PROCESSING ||
         this.vrReadiness.status === VR_READINESS_STATUS.QUEUED;
}

getVRProcessedFile(type, level = 0) {
  return this.vrReadiness.processedFiles?.find(
    f => f.type === type && f.level === level
  );
}

// Update toJSON to include vrReadiness
toJSON() {
  return {
    // ... existing fields ...
    vrReadiness: this.vrReadiness,
  };
}
```

---

## 3. ViewConfiguration Extensions

**File**: `src/core/data/models/ViewConfiguration.js`

Add the following to the existing ViewConfiguration class:

```javascript
// Add to constructor
constructor(config = {}) {
  // ... existing fields ...
  
  // =========================================================================
  // VR RENDERING HINTS (NEW)
  // These are NOT synced state, just preferences for VR rendering
  // =========================================================================
  this.vrHints = config.vrHints || {
    vrScale: 1.0,                    // Default scale for VR
    vrOrigin: [0, 0, 0],             // Default origin in data coords
    explorationMode: 'fly',          // Default exploration mode
    lastToolId: null,                // Last used VR tool
    toolSettings: {},                // Per-tool settings
  };
}

// Add method for creating VR snapshots
createVRSnapshot(options = {}) {
  const { vrSession, name, userId, userName } = options;
  
  return this.createSnapshot({
    name: name || `VR: ${new Date().toLocaleTimeString()}`,
    userId,
    userName,
    metadata: {
      isVRSnapshot: true,
      vrSessionId: vrSession?.id,
      vrContext: {
        vrScale: this.vrHints.vrScale,
        vrOrigin: this.vrHints.vrOrigin,
        explorationMode: this.vrHints.explorationMode,
        activeTools: vrSession?.activeTools || [],
        participantCount: vrSession?.participants?.length || 1,
      },
    },
  });
}

// Get VR snapshots only
getVRSnapshots() {
  return this.snapshots.filter(s => s.metadata?.isVRSnapshot);
}

// Get snapshots from a specific VR session
getSessionSnapshots(vrSessionId) {
  return this.snapshots.filter(s => s.metadata?.vrSessionId === vrSessionId);
}

// Update toJSON to include vrHints
toJSON() {
  return {
    // ... existing fields ...
    vrHints: this.vrHints,
  };
}
```

---

## 4. Annotation Model Extensions

**File**: `src/core/data/models/Annotation.js`

Add the following to the existing Annotation class:

```javascript
// Add to imports/constants at top
export const ANNOTATION_OWNERSHIP = Object.freeze({
  INDIVIDUAL: 'individual',  // Single user owns
  GROUP: 'group',            // Session/team owns
});

// Add to constructor
constructor(config = {}) {
  // ... existing fields ...
  
  // =========================================================================
  // OWNERSHIP MODEL (NEW)
  // =========================================================================
  this.ownership = config.ownership || ANNOTATION_OWNERSHIP.INDIVIDUAL;
  
  // Group ownership fields
  this.groupId = config.groupId || null;        // VR session ID or team ID
  this.groupName = config.groupName || null;    // "VR Session: Brain Analysis"
  this.contributors = config.contributors || []; // User IDs who contributed
  
  // =========================================================================
  // CREATION CONTEXT (NEW)
  // =========================================================================
  this.creationContext = config.creationContext || {
    mode: 'desktop',        // 'desktop' | 'vr'
    vrSessionId: null,      // If created in VR
    vrScale: null,          // Scale at which annotation was made
  };
}

// Add methods
isGroupOwned() {
  return this.ownership === ANNOTATION_OWNERSHIP.GROUP;
}

canClaimOwnership(odUserId) {
  return this.isGroupOwned() && this.contributors.includes(odUserId);
}

claimOwnership(odUserId, odUserName) {
  if (!this.canClaimOwnership(odUserId)) {
    throw new Error('User is not a contributor');
  }
  
  this.ownership = ANNOTATION_OWNERSHIP.INDIVIDUAL;
  this.createdBy = odUserId;
  this.createdByName = odUserName;
  this.modifiedBy = odUserId;
  this.modifiedAt = Date.now();
  // Keep groupId for provenance
}

// Update toJSON
toJSON() {
  return {
    // ... existing fields ...
    ownership: this.ownership,
    groupId: this.groupId,
    groupName: this.groupName,
    contributors: this.contributors,
    creationContext: this.creationContext,
  };
}
```

---

## 5. Index Exports

**File**: `src/core/data/models/index.js`

Add exports for new models:

```javascript
// Add to existing exports
export { 
  VRExplorationSession,
  VRParticipant,
  VRSessionSnapshot,
  SELECTION_TYPE,
  EXPLORATION_MODES,
  PARTICIPATION_MODE,
  SCALE_VISIBILITY,
  SESSION_STATUS,
  VR_TOOL_IDS,
} from './VRExplorationSession.js';

export { 
  VR_READINESS_STATUS,
} from './Dataset.js';

export {
  ANNOTATION_OWNERSHIP,
} from './Annotation.js';
```
