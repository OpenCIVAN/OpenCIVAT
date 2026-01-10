# Core Services Specification

## 1. VRExplorationManager (NEW FILE)

**File**: `src/core/vr/VRExplorationManager.js`

Central service for managing VR exploration sessions.

```javascript
// src/core/vr/VRExplorationManager.js
// Manages VR exploration session lifecycle and coordination
//
// RESPONSIBILITIES:
// - Create/join/leave exploration sessions
// - Coordinate with VRManager for WebXR
// - Manage participant state via Y.js
// - Bridge between UI and VR system

import { vr as log } from '@Utils/logger.js';
import { vrManager } from '@Core/vr/VRManager.js';
import { VRExplorationSession, PARTICIPATION_MODE, SESSION_STATUS } from '@Core/data/models/VRExplorationSession.js';
import { VRParticipantSync } from '@Core/vr/VRParticipantSync.js';
import { VRToolManager } from '@Core/vr/tools/VRToolManager.js';
import { VRNavigationController } from '@Core/vr/navigation/VRNavigationController.js';
import { VRSnapshotManager } from '@Core/vr/VRSnapshotManager.js';
import { VRControlManager } from '@Core/vr/VRControlManager.js';
import { apiClient } from '@Services/apiClient.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { getUserId, getUserName, getUserColor } from '@Collaboration/presence/userManagement.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';
import { EventEmitter } from '@Utils/EventEmitter.js';

class VRExplorationManager extends EventEmitter {
  constructor() {
    super();
    
    // Active session
    this._activeSession = null;
    this._activeContext = null;
    
    // Sub-managers
    this._participantSync = null;
    this._toolManager = null;
    this._navigationController = null;
    this._snapshotManager = null;
    this._controlManager = null;
    
    // Frame loop
    this._isRunning = false;
    this._animationFrameId = null;
    
    // Bind methods
    this._onFrame = this._onFrame.bind(this);
    this._onSessionEnd = this._onSessionEnd.bind(this);
  }
  
  // ===========================================================================
  // SESSION LIFECYCLE
  // ===========================================================================
  
  /**
   * Start a new VR exploration session
   * 
   * @param {string} instanceId - Source instance
   * @param {Object} config - Session configuration
   * @returns {Promise<VRExplorationSession>}
   */
  async startExploration(instanceId, config) {
    log.info('Starting VR exploration...', { instanceId, config });
    
    // Get instance and handler
    const instance = workspaceManager.getInstance(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }
    
    const handler = instance.handler;
    if (!handler.supportsVRExploration?.()) {
      throw new Error('Handler does not support VR exploration');
    }
    
    // Check VR support
    if (!vrManager.isVRSupported()) {
      throw new Error('WebXR not supported');
    }
    
    // Create session on server
    log.debug('Creating session on server...');
    const sessionData = await apiClient.post('/vr/sessions', {
      viewConfigurationId: instance.viewConfigId,
      datasetId: instance.instanceData?.dataset?.id,
      projectId: instance.instanceData?.projectId,
      ...config,
    });
    
    const session = VRExplorationSession.fromJSON(sessionData);
    
    // Add self as participant
    session.addParticipant(
      getUserId(),
      getUserName(),
      getUserColor(),
      PARTICIPATION_MODE.VR_EXPLORER
    );
    
    // Initialize sub-managers
    this._participantSync = new VRParticipantSync(session);
    this._snapshotManager = new VRSnapshotManager(session, getViewConfigurationManager());
    this._controlManager = new VRControlManager(session);
    
    // Check if preprocessing is complete
    const dataset = instance.instanceData?.dataset;
    if (dataset?.vrReadiness?.status !== 'ready') {
      log.info('Waiting for VR preprocessing...');
      await this._waitForPreprocessing(dataset.id);
    }
    
    // Request XR session
    log.debug('Requesting XR session...');
    const xrSession = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking', 'bounded-floor'],
    });
    
    // Set up session end handler
    xrSession.addEventListener('end', this._onSessionEnd);
    
    // Enter VR exploration mode on handler
    log.debug('Entering VR exploration mode on handler...');
    const vrContext = await handler.enterVRExploration(
      instance.instanceData,
      session,
      xrSession
    );
    
    // Initialize tool manager with handler
    this._toolManager = new VRToolManager(handler, vrContext);
    
    // Initialize navigation
    this._navigationController = new VRNavigationController(
      session.defaultExplorationMode,
      vrContext
    );
    
    // Store active context
    this._activeSession = session;
    this._activeContext = {
      session,
      instance,
      handler,
      vrContext,
      xrSession,
    };
    
    // Start session
    session.start();
    
    // Start frame loop
    this._startFrameLoop(xrSession);
    
    // Start participant sync
    this._participantSync.start();
    
    // Emit event
    this.emit('explorationStarted', { session, instanceId });
    
    log.info('VR exploration started', { sessionId: session.id });
    
    return session;
  }
  
  /**
   * Join an existing VR exploration session
   * 
   * @param {string} sessionId - Session to join
   * @param {string} mode - Participation mode
   */
  async joinSession(sessionId, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    log.info('Joining VR session...', { sessionId, mode });
    
    // Fetch session from server
    const sessionData = await apiClient.get(`/vr/sessions/${sessionId}`);
    const session = VRExplorationSession.fromJSON(sessionData);
    
    if (!session.allowJoin) {
      throw new Error('Session does not allow joining');
    }
    
    if (mode === PARTICIPATION_MODE.DESKTOP_PARTICIPANT && !session.allowDesktopParticipants) {
      throw new Error('Session does not allow desktop participants');
    }
    
    // Add self as participant
    session.addParticipant(
      getUserId(),
      getUserName(),
      getUserColor(),
      mode
    );
    
    // Notify server
    await apiClient.post(`/vr/sessions/${sessionId}/join`, {
      mode,
    });
    
    // Initialize participant sync
    this._participantSync = new VRParticipantSync(session);
    this._participantSync.start();
    
    // Initialize control manager
    this._controlManager = new VRControlManager(session);
    
    // Store session
    this._activeSession = session;
    this._activeContext = {
      session,
      mode,
    };
    
    // Emit event
    this.emit('sessionJoined', { session, mode });
    
    return session;
  }
  
  /**
   * Leave the current session
   */
  async leaveSession() {
    if (!this._activeSession) return;
    
    const session = this._activeSession;
    
    log.info('Leaving VR session...', { sessionId: session.id });
    
    // Stop frame loop if running
    this._stopFrameLoop();
    
    // Clean up sub-managers
    this._participantSync?.stop();
    this._toolManager?.cleanup();
    this._navigationController?.cleanup();
    
    // Remove self from session
    session.removeParticipant(getUserId());
    
    // Notify server
    try {
      await apiClient.post(`/vr/sessions/${session.id}/leave`);
    } catch (error) {
      log.warn('Failed to notify server of leave:', error);
    }
    
    // If we're in VR, exit
    if (this._activeContext?.xrSession) {
      await this._activeContext.xrSession.end();
    }
    
    // Clean up
    this._activeSession = null;
    this._activeContext = null;
    this._participantSync = null;
    this._toolManager = null;
    this._navigationController = null;
    this._snapshotManager = null;
    this._controlManager = null;
    
    // Emit event
    this.emit('sessionLeft', { sessionId: session.id });
  }
  
  // ===========================================================================
  // PARTICIPANT MANAGEMENT
  // ===========================================================================
  
  getActiveSession() {
    return this._activeSession;
  }
  
  getMyParticipant() {
    return this._activeSession?.getParticipant(getUserId());
  }
  
  async updateParticipantMode(newMode) {
    if (!this._activeSession) return;
    
    const participant = this._activeSession.updateParticipantMode(getUserId(), newMode);
    
    // Sync to server
    await apiClient.put(`/vr/sessions/${this._activeSession.id}/participants/${getUserId()}`, {
      mode: newMode,
    });
    
    // Sync via Y.js
    this._participantSync?.broadcastParticipant(participant);
    
    this.emit('participantUpdated', { participant });
    
    return participant;
  }
  
  // ===========================================================================
  // CONTROL MANAGEMENT (delegated to VRControlManager)
  // ===========================================================================
  
  async requestControl(targetUserId) {
    if (!this._controlManager) throw new Error('No active session');
    return this._controlManager.requestControl(targetUserId);
  }
  
  async releaseControl() {
    if (!this._controlManager) throw new Error('No active session');
    return this._controlManager.releaseControl();
  }
  
  respondToControlRequest(approved) {
    if (!this._controlManager) return;
    this._controlManager.respondToRequest(approved);
  }
  
  // ===========================================================================
  // TOOL MANAGEMENT (delegated to VRToolManager)
  // ===========================================================================
  
  activateTool(toolId) {
    if (!this._toolManager) return;
    this._toolManager.activateTool(toolId);
    this.emit('toolActivated', { toolId });
  }
  
  getActiveTool() {
    return this._toolManager?.getActiveTool();
  }
  
  // ===========================================================================
  // NAVIGATION (delegated to VRNavigationController)
  // ===========================================================================
  
  setExplorationMode(mode) {
    if (!this._navigationController) return;
    this._navigationController.setMode(mode);
    this.emit('explorationModeChanged', { mode });
  }
  
  setVRScale(scale) {
    if (!this._navigationController) return;
    this._navigationController.setScale(scale);
    this.emit('vrScaleChanged', { scale });
  }
  
  // ===========================================================================
  // SNAPSHOTS (delegated to VRSnapshotManager)
  // ===========================================================================
  
  async createSnapshot(name) {
    if (!this._snapshotManager) throw new Error('No active session');
    return this._snapshotManager.quickSave(name);
  }
  
  async loadSnapshot(snapshotId) {
    if (!this._snapshotManager) throw new Error('No active session');
    return this._snapshotManager.loadSnapshot(snapshotId);
  }
  
  // ===========================================================================
  // FRAME LOOP
  // ===========================================================================
  
  _startFrameLoop(xrSession) {
    this._isRunning = true;
    xrSession.requestAnimationFrame(this._onFrame);
  }
  
  _stopFrameLoop() {
    this._isRunning = false;
    if (this._animationFrameId) {
      // Note: Can't cancel XR animation frame directly
    }
  }
  
  _onFrame(time, frame) {
    if (!this._isRunning || !this._activeContext) return;
    
    const { handler, vrContext, xrSession } = this._activeContext;
    
    try {
      // Get input state
      const inputState = this._gatherInputState(frame);
      
      // Update navigation
      this._navigationController?.update(inputState, frame);
      
      // Update tools
      const toolAction = this._toolManager?.update(inputState, frame);
      if (toolAction) {
        this._handleToolAction(toolAction);
      }
      
      // Update participant sync
      this._participantSync?.updateLocalState({
        headPose: inputState.headPose,
        leftHandPose: inputState.controllers?.left?.pose,
        rightHandPose: inputState.controllers?.right?.pose,
        vrScale: this._navigationController?.getScale() || 1.0,
      });
      
      // Let handler update VR rendering
      handler.updateVRExploration(vrContext, frame, inputState);
      
      // Emit frame event for UI
      this.emit('frame', { time, inputState });
      
    } catch (error) {
      log.error('Error in VR frame loop:', error);
    }
    
    // Continue loop
    xrSession.requestAnimationFrame(this._onFrame);
  }
  
  _gatherInputState(frame) {
    const session = frame.session;
    const referenceSpace = vrManager.getReferenceSpace();
    
    const state = {
      headPose: null,
      controllers: {
        left: null,
        right: null,
      },
      hands: {
        left: null,
        right: null,
      },
    };
    
    // Get head pose
    const viewerPose = frame.getViewerPose(referenceSpace);
    if (viewerPose) {
      state.headPose = viewerPose.transform;
    }
    
    // Get controller states
    for (const source of session.inputSources) {
      if (source.hand) {
        // Hand tracking
        const handedness = source.handedness;
        state.hands[handedness] = this._getHandJoints(frame, source, referenceSpace);
      } else if (source.gripSpace) {
        // Controller
        const handedness = source.handedness;
        const gripPose = frame.getPose(source.gripSpace, referenceSpace);
        const targetRayPose = source.targetRaySpace 
          ? frame.getPose(source.targetRaySpace, referenceSpace)
          : null;
        
        state.controllers[handedness] = {
          pose: gripPose?.transform,
          targetRay: targetRayPose?.transform,
          gamepad: source.gamepad,
          triggerPressed: source.gamepad?.buttons?.[0]?.pressed || false,
          triggerValue: source.gamepad?.buttons?.[0]?.value || 0,
          squeezePressed: source.gamepad?.buttons?.[1]?.pressed || false,
          squeezeValue: source.gamepad?.buttons?.[1]?.value || 0,
          thumbstick: {
            x: source.gamepad?.axes?.[2] || 0,
            y: source.gamepad?.axes?.[3] || 0,
          },
          buttons: {
            a: source.gamepad?.buttons?.[4]?.pressed || false,
            b: source.gamepad?.buttons?.[5]?.pressed || false,
          },
        };
      }
    }
    
    return state;
  }
  
  _getHandJoints(frame, source, referenceSpace) {
    if (!source.hand) return null;
    
    const joints = {};
    for (const joint of source.hand.values()) {
      const jointPose = frame.getJointPose(joint, referenceSpace);
      if (jointPose) {
        joints[joint.jointName] = {
          position: jointPose.transform.position,
          orientation: jointPose.transform.orientation,
          radius: jointPose.radius,
        };
      }
    }
    return joints;
  }
  
  _handleToolAction(action) {
    // Handle tool actions (annotations, measurements, etc.)
    log.debug('Tool action:', action);
    
    switch (action.type) {
      case 'annotation-created':
        this.emit('annotationCreated', action.data);
        break;
      case 'measurement-created':
        this.emit('measurementCreated', action.data);
        break;
      case 'slice-plane-updated':
        this.emit('slicePlaneUpdated', action.data);
        break;
    }
  }
  
  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================
  
  _onSessionEnd() {
    log.info('XR session ended');
    this.leaveSession().catch(err => log.error('Error leaving session:', err));
  }
  
  // ===========================================================================
  // PREPROCESSING WAIT
  // ===========================================================================
  
  async _waitForPreprocessing(datasetId, timeout = 5 * 60 * 1000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = async () => {
        try {
          const response = await apiClient.get(`/datasets/${datasetId}/vr-status`);
          
          if (response.vrReadiness?.status === 'ready') {
            resolve();
            return;
          }
          
          if (response.vrReadiness?.status === 'failed') {
            reject(new Error(response.vrReadiness.errorMessage || 'VR preprocessing failed'));
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            reject(new Error('VR preprocessing timeout'));
            return;
          }
          
          // Emit progress
          this.emit('preprocessingProgress', {
            progress: response.vrReadiness?.progress || 0,
          });
          
          // Check again in 2 seconds
          setTimeout(checkStatus, 2000);
          
        } catch (error) {
          reject(error);
        }
      };
      
      checkStatus();
    });
  }
}

export const vrExplorationManager = new VRExplorationManager();
export default vrExplorationManager;
```

---

## 2. VRParticipantSync (NEW FILE)

**File**: `src/core/vr/VRParticipantSync.js`

```javascript
// src/core/vr/VRParticipantSync.js
// Synchronizes participant states via Y.js for real-time presence

import { vr as log } from '@Utils/logger.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';
import { getUserId } from '@Collaboration/presence/userManagement.js';

export class VRParticipantSync {
  constructor(session) {
    this._session = session;
    this._yParticipants = null;
    this._localUserId = getUserId();
    this._updateInterval = null;
    this._observers = [];
  }
  
  start() {
    // Get or create Y.js map for this session
    this._yParticipants = ydoc.getMap(`vr-participants-${this._session.id}`);
    
    // Set up observer for remote updates
    const observer = (event) => {
      event.changes.keys.forEach((change, odUserId) => {
        if (odUserId === this._localUserId) return;
        
        if (change.action === 'delete') {
          this._handleParticipantLeft(odUserId);
        } else {
          const data = this._yParticipants.get(odUserId);
          this._handleParticipantUpdate(odUserId, data);
        }
      });
    };
    
    this._yParticipants.observe(observer);
    this._observers.push(() => this._yParticipants.unobserve(observer));
    
    log.debug('VRParticipantSync started');
  }
  
  stop() {
    // Clear observers
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];
    
    // Remove self from Y.js
    if (this._yParticipants) {
      this._yParticipants.delete(this._localUserId);
    }
    
    // Stop update interval
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
    
    log.debug('VRParticipantSync stopped');
  }
  
  /**
   * Update local participant state (call every frame or throttled)
   */
  updateLocalState(state) {
    if (!this._yParticipants) return;
    
    const participant = this._session.getParticipant(this._localUserId);
    if (!participant) return;
    
    const data = {
      odUserId: this._localUserId,
      userName: participant.userName,
      userColor: participant.userColor,
      mode: participant.mode,
      vrScale: state.vrScale || participant.vrScale,
      scaleVisibility: participant.scaleVisibility,
      timestamp: Date.now(),
      
      // Pose data
      headPose: state.headPose ? this._serializePose(state.headPose) : null,
      leftHandPose: state.leftHandPose ? this._serializePose(state.leftHandPose) : null,
      rightHandPose: state.rightHandPose ? this._serializePose(state.rightHandPose) : null,
      
      // Cursor (for desktop participants)
      cursorPosition: state.cursorPosition || null,
      cursorTarget: state.cursorTarget || null,
    };
    
    this._yParticipants.set(this._localUserId, data);
  }
  
  /**
   * Broadcast participant metadata change
   */
  broadcastParticipant(participant) {
    if (!this._yParticipants) return;
    
    const existing = this._yParticipants.get(participant.odUserId) || {};
    this._yParticipants.set(participant.odUserId, {
      ...existing,
      mode: participant.mode,
      permissions: participant.permissions,
      vrScale: participant.vrScale,
      scaleVisibility: participant.scaleVisibility,
      controllingUserId: participant.controllingUserId,
      controlledByUserId: participant.controlledByUserId,
    });
  }
  
  /**
   * Get all remote participant states
   */
  getRemoteParticipants() {
    if (!this._yParticipants) return [];
    
    const participants = [];
    this._yParticipants.forEach((data, odUserId) => {
      if (odUserId !== this._localUserId) {
        participants.push({
          ...data,
          isStale: Date.now() - data.timestamp > 5000,
        });
      }
    });
    
    return participants;
  }
  
  _handleParticipantUpdate(odUserId, data) {
    const participant = this._session.getParticipant(odUserId);
    if (participant) {
      // Update local session model
      participant.vrScale = data.vrScale;
      participant.scaleVisibility = data.scaleVisibility;
      participant.lastActiveAt = data.timestamp;
    } else {
      // New participant joined
      this._session.addParticipant(
        data.odUserId,
        data.userName,
        data.userColor,
        data.mode
      );
    }
    
    // Dispatch event for renderers
    window.dispatchEvent(new CustomEvent('cia:vr-participant-update', {
      detail: { odUserId, data }
    }));
  }
  
  _handleParticipantLeft(odUserId) {
    this._session.removeParticipant(odUserId);
    
    window.dispatchEvent(new CustomEvent('cia:vr-participant-left', {
      detail: { odUserId }
    }));
  }
  
  _serializePose(pose) {
    if (!pose) return null;
    
    return {
      position: pose.position ? {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
      } : null,
      orientation: pose.orientation ? {
        x: pose.orientation.x,
        y: pose.orientation.y,
        z: pose.orientation.z,
        w: pose.orientation.w,
      } : null,
    };
  }
}

export default VRParticipantSync;
```

---

## 3. VRSnapshotManager (NEW FILE)

**File**: `src/core/vr/VRSnapshotManager.js`

```javascript
// src/core/vr/VRSnapshotManager.js
// Manages VR session snapshots

import { vr as log } from '@Utils/logger.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';

export class VRSnapshotManager {
  constructor(session, viewConfigManager) {
    this._session = session;
    this._viewConfigManager = viewConfigManager;
    this._autoSaveInterval = null;
  }
  
  /**
   * Quick save - creates a snapshot with auto-generated name
   */
  async quickSave(name = null) {
    const viewConfig = this._viewConfigManager.getView(this._session.viewConfigurationId);
    if (!viewConfig) {
      throw new Error('ViewConfiguration not found');
    }
    
    const userId = getUserId();
    const userName = getUserName();
    
    // Create ViewConfiguration snapshot
    const viewSnapshot = viewConfig.createVRSnapshot({
      vrSession: this._session,
      name: name || `VR: ${new Date().toLocaleTimeString()}`,
      userId,
      userName,
    });
    
    // Create session snapshot with participant states
    const sessionSnapshot = this._session.createSessionSnapshot(
      name || `VR: ${new Date().toLocaleTimeString()}`,
      viewSnapshot.id,
      userId,
      userName
    );
    
    // Persist to server
    await this._persistSnapshot(sessionSnapshot);
    
    // Trigger haptic feedback
    this._triggerHapticFeedback('save');
    
    log.info('VR snapshot created:', sessionSnapshot.id);
    
    return sessionSnapshot;
  }
  
  /**
   * Load a snapshot
   */
  async loadSnapshot(snapshotId) {
    // Find in session snapshots
    let sessionSnapshot = this._session.getSessionSnapshot(snapshotId);
    
    // If not found, might be a direct view snapshot ID
    if (!sessionSnapshot) {
      const viewConfig = this._viewConfigManager.getView(this._session.viewConfigurationId);
      viewConfig.restoreSnapshot(snapshotId);
      this._triggerHapticFeedback('load');
      return;
    }
    
    // Restore ViewConfiguration state
    const viewConfig = this._viewConfigManager.getView(this._session.viewConfigurationId);
    viewConfig.restoreSnapshot(sessionSnapshot.viewSnapshotId);
    
    // Optionally restore participant scales
    // (positions would need teleportation)
    
    // Trigger haptic feedback
    this._triggerHapticFeedback('load');
    
    log.info('VR snapshot loaded:', snapshotId);
    
    return sessionSnapshot;
  }
  
  /**
   * Get all snapshots for current session
   */
  getSessionSnapshots() {
    return this._session.sessionSnapshots;
  }
  
  /**
   * Get all VR snapshots for the ViewConfiguration
   */
  getAllVRSnapshots() {
    const viewConfig = this._viewConfigManager.getView(this._session.viewConfigurationId);
    return viewConfig?.getVRSnapshots() || [];
  }
  
  /**
   * Enable auto-save at interval
   */
  enableAutoSave(intervalMs = 5 * 60 * 1000) {
    this.disableAutoSave();
    
    this._autoSaveInterval = setInterval(() => {
      this.quickSave(`Auto-save ${new Date().toLocaleTimeString()}`);
    }, intervalMs);
    
    log.debug('VR auto-save enabled');
  }
  
  /**
   * Disable auto-save
   */
  disableAutoSave() {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  }
  
  async _persistSnapshot(snapshot) {
    // Server persistence would go here
    // For now, ViewConfiguration handles persistence
  }
  
  _triggerHapticFeedback(type) {
    // Dispatch event for VR system to trigger haptics
    window.dispatchEvent(new CustomEvent('cia:vr-haptic', {
      detail: { type, intensity: type === 'save' ? 0.5 : 0.3, duration: 100 }
    }));
  }
  
  cleanup() {
    this.disableAutoSave();
  }
}

export default VRSnapshotManager;
```

---

## 4. VRControlManager (NEW FILE)

**File**: `src/core/vr/VRControlManager.js`

```javascript
// src/core/vr/VRControlManager.js
// Manages desktop-to-VR control handoff

import { vr as log } from '@Utils/logger.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';

export class VRControlManager {
  constructor(session) {
    this._session = session;
    this._yControlRequests = ydoc.getMap(`vr-control-${session.id}`);
    this._pendingRequest = null;
    this._observers = [];
    
    this._setupObservers();
  }
  
  _setupObservers() {
    const observer = (event) => {
      event.changes.keys.forEach((change, key) => {
        const data = this._yControlRequests.get(key);
        
        if (data?.type === 'request' && data.toUserId === getUserId()) {
          // Someone is requesting to control us
          window.dispatchEvent(new CustomEvent('cia:vr-control-request', {
            detail: {
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName,
            }
          }));
        }
        
        if (data?.type === 'response' && data.toUserId === getUserId()) {
          // Response to our request
          if (data.approved) {
            this._session.establishControl(getUserId(), data.fromUserId);
          }
          
          window.dispatchEvent(new CustomEvent('cia:vr-control-response', {
            detail: {
              approved: data.approved,
              targetUserId: data.fromUserId,
            }
          }));
          
          this._pendingRequest = null;
        }
      });
    };
    
    this._yControlRequests.observe(observer);
    this._observers.push(() => this._yControlRequests.unobserve(observer));
  }
  
  /**
   * Request control of a VR user
   */
  async requestControl(targetUserId) {
    if (this._pendingRequest) {
      throw new Error('Control request already pending');
    }
    
    const target = this._session.getParticipant(targetUserId);
    if (!target) {
      throw new Error('Target user not found');
    }
    
    if (!target.isVR()) {
      throw new Error('Can only control VR users');
    }
    
    if (target.isBeingControlled()) {
      throw new Error('User is already being controlled');
    }
    
    this._pendingRequest = { targetUserId };
    
    // Broadcast request via Y.js
    const requestId = `req_${Date.now()}`;
    this._yControlRequests.set(requestId, {
      type: 'request',
      fromUserId: getUserId(),
      fromUserName: getUserName(),
      toUserId: targetUserId,
      timestamp: Date.now(),
    });
    
    if (!this._session.requireControlApproval) {
      // Auto-approve
      this._session.establishControl(getUserId(), targetUserId);
      this._pendingRequest = null;
      return { status: 'established' };
    }
    
    return { status: 'pending' };
  }
  
  /**
   * Respond to a control request
   */
  respondToRequest(approved) {
    const responseId = `resp_${Date.now()}`;
    
    // Get the pending request for us
    let requestData = null;
    this._yControlRequests.forEach((data, key) => {
      if (data.type === 'request' && data.toUserId === getUserId()) {
        requestData = data;
      }
    });
    
    if (!requestData) return;
    
    if (approved) {
      this._session.establishControl(requestData.fromUserId, getUserId());
    } else {
      this._session.declineControlRequest(requestData.fromUserId, getUserId());
    }
    
    // Broadcast response
    this._yControlRequests.set(responseId, {
      type: 'response',
      fromUserId: getUserId(),
      toUserId: requestData.fromUserId,
      approved,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Release control
   */
  async releaseControl() {
    this._session.releaseControl(getUserId());
    
    // Broadcast release
    const releaseId = `release_${Date.now()}`;
    this._yControlRequests.set(releaseId, {
      type: 'release',
      fromUserId: getUserId(),
      timestamp: Date.now(),
    });
  }
  
  cleanup() {
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];
  }
}

export default VRControlManager;
```

---

## 5. VRScaleVisibility (NEW FILE)

**File**: `src/core/vr/VRScaleVisibility.js`

```javascript
// src/core/vr/VRScaleVisibility.js
// Manages how users at different scales see each other

import { SCALE_VISIBILITY } from '@Core/data/models/VRExplorationSession.js';

export class VRScaleVisibilityManager {
  constructor(session) {
    this._session = session;
    this._localParticipant = null;
  }
  
  setLocalParticipant(participant) {
    this._localParticipant = participant;
  }
  
  /**
   * Toggle visibility mode
   */
  toggleVisibilityMode() {
    if (!this._localParticipant) return null;
    
    const current = this._localParticipant.scaleVisibility;
    const newMode = current === SCALE_VISIBILITY.MY_SCALE
      ? SCALE_VISIBILITY.WORLD_SCALE
      : SCALE_VISIBILITY.MY_SCALE;
    
    this._localParticipant.scaleVisibility = newMode;
    
    return newMode;
  }
  
  /**
   * Calculate render transform for a remote participant
   */
  getRemoteParticipantTransform(remoteParticipant, localScale) {
    const visibilityMode = this._localParticipant?.scaleVisibility || SCALE_VISIBILITY.MY_SCALE;
    
    if (visibilityMode === SCALE_VISIBILITY.MY_SCALE) {
      // Render relative to local scale
      const relativeScale = remoteParticipant.vrScale / localScale;
      
      return {
        scale: relativeScale,
        position: this._transformToLocalSpace(
          remoteParticipant.headPose?.position,
          localScale
        ),
        avatarScale: Math.max(0.1, Math.min(2.0, relativeScale)),
      };
    } else {
      // WORLD_SCALE: Render at absolute position
      return {
        scale: 1.0,
        position: remoteParticipant.headPose?.position,
        avatarScale: 1.0,
        scaleIndicator: remoteParticipant.vrScale,
      };
    }
  }
  
  _transformToLocalSpace(worldPosition, localScale) {
    if (!worldPosition) return null;
    
    // Transform world position based on local scale
    return {
      x: worldPosition.x / localScale,
      y: worldPosition.y / localScale,
      z: worldPosition.z / localScale,
    };
  }
  
  getVisibilityModeLabel() {
    const mode = this._localParticipant?.scaleVisibility;
    return mode === SCALE_VISIBILITY.MY_SCALE
      ? 'Relative to my scale'
      : 'World positions';
  }
}

export default VRScaleVisibilityManager;
```
