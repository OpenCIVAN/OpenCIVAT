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
import { VRSnapshotManager } from '@Core/vr/VRSnapshotManager.js';
import { VRControlManager } from '@Core/vr/VRControlManager.js';
import { VRNavigationController } from '@Core/vr/navigation/VRNavigationController.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { getUserId, getUserName, getUserColor } from '@Collaboration/presence/userManagement.js';
import { apiClient } from '@Services/apiClient.js';
import { BaseManager } from '@Core/data/managers/BaseManager.js';
import { vrAvatarSystem } from '@Core/instances/types/vtk/vr/VTKVRAvatars.js';
import { vrSpatialUI } from '@Core/instances/types/vtk/vr/VTKVRSpatialUI.js';
import { vrMultiViewGrid } from '@Core/vr/VRMultiViewGrid.js';
import { vtkClippingFeature, vtkSliceFeature } from '@Core/instances/types/vtk/features/index.js';
import { pushSharedVisualizationUpdate } from '@Services/visualizationSyncService.js';
import { vrCursorSync } from '@Core/vr/VRCursorSync.js';
import { mapXRPointToData, controllerForward } from '@Core/vr/tools/vrPlaneMath.js';

class VRExplorationManager extends BaseManager {
  constructor() {
    super();

    // Active session
    this._activeSession = null;
    this._activeContext = null;

    // Sub-managers
    this._participantSync = null;
    this._toolManager = null;
    this._snapshotManager = null;
    this._controlManager = null;
    this._navigationController = null;

    // Frame loop
    this._isRunning = false;
    this._lastFrameTime = 0;

    // Isolation mode (room-scale inspection)
    this._isolationBackup = null;
    this._lastIsolationButtonState = false;

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
  async startExploration(instanceId, config = {}) {
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

    // Create session locally. If we're joining an existing server session
    // (config.serverSession from joinSession), reuse its id; otherwise the
    // session is registered with the server after VR entry succeeds.
    const { serverSession = null, ...sessionConfig } = config;
    const session = new VRExplorationSession({
      id: serverSession?.id ||
        `vrsession_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      viewConfigurationId: instance.viewConfigId,
      datasetId: instance.instanceData?.dataset?.id,
      projectId: instance.instanceData?.projectId,
      ownerUserId: serverSession?.owner_user_id || getUserId(),
      ownerUserName: serverSession?.owner_user_name || getUserName(),
      ...sessionConfig,
    });

    // Register with the server before sub-managers are constructed:
    // VRParticipantSync keys its Y.js map by session.id, so the canonical
    // (server) id must be adopted first for joiners to sync avatars.
    if (!serverSession) {
      const serverRow = await this._tryRegisterSession(session);
      if (serverRow?.id) {
        session.id = serverRow.id;
      }
    }

    // Add self as participant
    session.addParticipant(
      getUserId(),
      getUserName(),
      getUserColor(),
      serverSession ? sessionConfig.participationMode || PARTICIPATION_MODE.VR_EXPLORER : PARTICIPATION_MODE.VR_EXPLORER
    );

    // Initialize sub-managers
    this._participantSync = new VRParticipantSync(session);
    this._snapshotManager = new VRSnapshotManager(session, getViewConfigurationManager());
    this._controlManager = new VRControlManager(session);

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

    // Initialize navigation controller
    this._navigationController = new VRNavigationController(session, vrContext);

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

    // Initialize avatar system
    const avatarRenderer = vrContext.sceneObjects?.renderer;
    if (avatarRenderer) {
      vrAvatarSystem.initialize(avatarRenderer, session, vrContext);
    }

    // Pointer-ray broadcasting: desktop collaborators render this VR user's
    // controller ray via vrCursorSync (consumed by VTKRemoteVRRays).
    vrCursorSync.initialize(getUserId(), getUserName(), getUserColor(getUserId()));

    // Initialize the in-scene spatial tool menu. WebXR immersive sessions do
    // not render the DOM, so this VTK panel — not the React VRWristMenu — is
    // the guaranteed in-headset UI. It shares this manager as its source of
    // truth (tool select / undo / isolation toggle / exit all route back here).
    if (avatarRenderer) {
      vrSpatialUI.initialize(avatarRenderer, this);
    }

    // Emit event
    this._emit('explorationStarted', { session, instanceId });

    // Dispatch window event for UI
    window.dispatchEvent(new CustomEvent('cia:vr-session-started', {
      detail: { sessionId: session.id, instanceId }
    }));

    log.info('VR exploration started', { sessionId: session.id });

    return session;
  }

  /**
   * Register a locally started session with the server, bounded by a short
   * timeout so a slow network never delays VR entry (WebXR requestSession
   * must run while user activation is still fresh). The server generates
   * the canonical id, which every client's Y.js participant map is keyed by
   * — so this must resolve before VRParticipantSync is constructed.
   *
   * @returns {Promise<object|null>} Server session row, or null (offline/slow)
   * @private
   */
  async _tryRegisterSession(session, timeoutMs = 1500) {
    try {
      const post = apiClient.post('/vr/sessions', {
        viewConfigurationId: session.viewConfigurationId,
        datasetId: session.datasetId,
        projectId: session.projectId,
        explorationMode: session.explorationMode,
        vrScale: session.vrScale,
        allowJoin: session.allowJoin,
        allowDesktopParticipants: session.allowDesktopParticipants,
        allowDesktopControl: session.allowDesktopControl,
      });
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const serverRow = await Promise.race([post, timeout]);
      if (serverRow?.id) {
        log.debug(`VR session registered on server as ${serverRow.id}`);
        return serverRow;
      }
      log.warn('VR session registration timed out; continuing with local id');
      return null;
    } catch (err) {
      log.warn('VR session server registration failed (continuing locally):', err.message);
      return null;
    }
  }

  /**
   * Join an existing VR exploration session.
   *
   * Registers the join with the server, then — if the session's view is open
   * locally and a VR mode was requested — enters VR against that view using
   * the shared startExploration path (with the server session's id, so
   * avatar/participant Y.js state converges across clients).
   *
   * @param {string} sessionId - Server session id to join
   * @param {string} mode - Participation mode (PARTICIPATION_MODE)
   * @returns {Promise<{joined: boolean, vrEntered: boolean, session?: object, reason?: string}>}
   */
  async joinSession(sessionId, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    log.info('Joining VR session...', { sessionId, mode });

    // Register the join with the server
    await apiClient.post(`/vr/sessions/${sessionId}/join`, { mode });

    // Fetch the session record to resolve its view
    const serverSession = await apiClient.get(`/vr/sessions/${sessionId}`);
    if (!serverSession?.id) {
      return { joined: false, vrEntered: false, reason: 'session-not-found' };
    }

    // Desktop observers are done: participant state flows via Y.js/WS
    const isVRMode = mode === PARTICIPATION_MODE.VR_EXPLORER;
    if (!isVRMode) {
      this._emit('sessionJoined', { sessionId, mode });
      return { joined: true, vrEntered: false, session: serverSession };
    }

    // VR modes need the session's view open locally
    const viewConfigId = serverSession.view_configuration_id;
    const instance = viewConfigId
      ? workspaceManager.getInstanceByViewConfigId(viewConfigId)
      : null;
    if (!instance) {
      log.warn(`Cannot enter VR for session ${sessionId}: view ${viewConfigId} not open locally`);
      this._emit('sessionJoined', { sessionId, mode, vrEntered: false });
      return {
        joined: true,
        vrEntered: false,
        session: serverSession,
        reason: 'view-not-open',
      };
    }

    // Enter VR against the shared session id
    await this.startExploration(instance.instanceId, {
      serverSession,
      participationMode: mode,
      explorationMode: serverSession.default_exploration_mode,
      vrScale: Number(serverSession.default_vr_scale) || 1.0,
    });

    this._emit('sessionJoined', { sessionId, mode, vrEntered: true });
    return { joined: true, vrEntered: true, session: serverSession };
  }

  /**
   * Leave the current session
   */
  async leaveSession() {
    if (!this._activeSession) return;

    const session = this._activeSession;

    log.info('Leaving VR session...', { sessionId: session.id });

    // Stop frame loop
    this._stopFrameLoop();

    // Clean up sub-managers
    this._participantSync?.stop();
    vrCursorSync.clearCursor(); // remove this user's ray from collaborators' views
    vrMultiViewGrid.disable();
    vrSpatialUI.dispose();
    vrAvatarSystem.dispose();
    await this._toolManager?.cleanup();
    this._snapshotManager?.cleanup();
    this._controlManager?.cleanup();
    this._navigationController?.cleanup();

    // Exit VR exploration on handler
    if (this._activeContext?.handler && this._activeContext?.vrContext) {
      await this._activeContext.handler.exitVRExploration(this._activeContext.vrContext);
    }

    // End XR session if still active
    if (this._activeContext?.xrSession) {
      try {
        await this._activeContext.xrSession.end();
      } catch (e) {
        // Session may already be ended
      }
    }

    // End session
    session.end();

    // Notify the server (non-fatal; only meaningful for server-registered ids)
    if (session.id && !String(session.id).startsWith('vrsession_')) {
      apiClient
        .post(`/vr/sessions/${session.id}/leave`, {})
        .catch((err) => log.warn('VR session leave notification failed:', err.message));
    }

    // Clean up
    this._activeSession = null;
    this._activeContext = null;
    this._isolationBackup = null;
    this._lastIsolationButtonState = false;
    this._participantSync = null;
    this._toolManager = null;
    this._snapshotManager = null;
    this._controlManager = null;
    this._navigationController = null;

    // Emit events
    this._emit('sessionLeft', { sessionId: session.id });

    window.dispatchEvent(new CustomEvent('cia:vr-session-ended', {
      detail: { sessionId: session.id }
    }));
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

    // Sync via Y.js
    this._participantSync?.broadcastParticipant(participant);

    this._emit('participantUpdated', { participant });

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
    this._emit('toolActivated', { toolId });
  }

  deactivateTool() {
    if (!this._toolManager) return;
    this._toolManager.deactivateTool();
    this._emit('toolDeactivated', {});
  }

  getActiveTool() {
    return this._toolManager?.getActiveTool();
  }

  /**
   * Undo the active tool's most recent action (e.g. remove the last VR
   * annotation or measurement). Routes the resulting tool action through the
   * same _handleToolAction path the controller A-button uses, so persistence
   * and broadcast stay consistent. Invoked by the spatial menu's Undo button.
   * @returns {boolean} true if something was undone
   */
  undoLastToolAction() {
    const tool = this._toolManager?.getActiveTool?.();
    const action = tool?.undoLast?.();
    if (!action) return false;
    this._handleToolAction(action);
    return true;
  }

  getAvailableTools() {
    return this._toolManager?.getAvailableTools() || [];
  }

  // ===========================================================================
  // NAVIGATION (delegated to VRNavigationController)
  // ===========================================================================

  setNavigationMode(mode) {
    if (!this._navigationController) return;
    this._navigationController.setMode(mode);
    this._emit('navigationModeChanged', { mode });
    return mode;
  }

  getNavigationMode() {
    return this._navigationController?.getMode();
  }

  cycleNavigationMode() {
    if (!this._navigationController) return null;
    const newMode = this._navigationController.cycleMode();
    this._emit('navigationModeChanged', { mode: newMode });
    return newMode;
  }

  getNavigationModeInfo() {
    return this._navigationController?.getModeInfo();
  }

  getVRScale() {
    return this._navigationController?.getScale() || 1.0;
  }

  setVRScale(scale) {
    if (!this._navigationController) return;
    this._navigationController.setScale(scale);
    this._emit('vrScaleChanged', { scale });
  }

  // ===========================================================================
  // ISOLATION MODE (room-scale inspection)
  // ===========================================================================
  //
  // Isolation pulls the active dataset to room scale so the user can walk
  // around it, and restores the previous scale/origin on exit. The camera
  // mapping is dataPos = xrPos / vrScale + vrOrigin (see
  // VTKInstanceHandler._updateCameraFromVRPose), so isolation is purely a
  // vrScale/vrOrigin change — no actor mutation, nothing leaks to other
  // participants beyond the normal vrScale presence field.

  /**
   * Enter isolation mode: scale the model to ~room size and stand the user
   * a couple of meters back from its center.
   * @returns {boolean} true if isolation is now active
   */
  enterIsolation() {
    const ctx = this._activeContext?.vrContext;
    if (!ctx) {
      log.warn('Cannot enter isolation: no active VR context');
      return false;
    }
    if (this._isolationBackup) return true; // already isolated

    const b = ctx.dataBounds || [-1, 1, -1, 1, -1, 1];
    const dx = b[1] - b[0];
    const dy = b[3] - b[2];
    const dz = b[5] - b[4];
    const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const center = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2];

    this._isolationBackup = {
      vrScale: ctx.vrScale,
      vrOrigin: [...(ctx.vrOrigin || [0, 0, 0])],
    };

    // Model diagonal spans ~2.5 physical meters
    const scale = 2.5 / diagonal;
    if (this._navigationController?.setScale) {
      this._navigationController.setScale(scale);
    } else {
      ctx.vrScale = scale;
    }

    // User origin: model center at chest height, standing 2 m back
    ctx.vrOrigin = [
      center[0],
      center[1] - 1.4 / ctx.vrScale,
      center[2] + 2.0 / ctx.vrScale,
    ];

    const viewId = this._activeContext.instance?.viewConfigId || ctx.instanceId;
    vrManager.enterIsolationMode(viewId);
    this._emit('isolationChanged', { isolated: true, viewId });
    log.info('Entered isolation mode', { scale: ctx.vrScale, diagonal });
    return true;
  }

  /**
   * Exit isolation mode and restore the previous scale and origin.
   * @returns {boolean} true if isolation is now inactive
   */
  exitIsolation() {
    const ctx = this._activeContext?.vrContext;
    if (!ctx || !this._isolationBackup) return false;

    const { vrScale, vrOrigin } = this._isolationBackup;
    this._isolationBackup = null;

    if (this._navigationController?.setScale) {
      this._navigationController.setScale(vrScale);
    } else {
      ctx.vrScale = vrScale;
    }
    ctx.vrOrigin = [...vrOrigin];

    vrManager.exitIsolationMode();
    this._emit('isolationChanged', { isolated: false });
    log.info('Exited isolation mode');
    return true;
  }

  /**
   * Toggle isolation mode.
   */
  toggleIsolation() {
    return this._isolationBackup ? this.exitIsolation() : this.enterIsolation();
  }

  isIsolated() {
    return this._isolationBackup != null;
  }

  // ===========================================================================
  // MULTI-VIEW GRID MODE
  // ===========================================================================
  //
  // Shows the workspace's OTHER open VTK views as a grid of datasets inside
  // the active VR scene (proxy actors sharing the source views' mappers —
  // see VRMultiViewGrid). Source views are never mutated, and the grid is
  // strictly session-local: nothing is broadcast to other participants.

  /**
   * Enable grid mode: every other open VTK instance with loaded data appears
   * as a scaled-down dataset in a grid in front of the user.
   * @returns {boolean} true if the grid is now showing at least one view
   */
  enableGridMode() {
    const ctx = this._activeContext?.vrContext;
    const sceneObjects = ctx?.sceneObjects;
    if (!sceneObjects?.renderer) {
      log.warn('Cannot enable grid mode: no active VR context');
      return false;
    }

    const activeInstanceId = this._activeContext.instance?.instanceId;
    const others = [];
    for (const instance of workspaceManager.getInstancesByType('vtk')) {
      if (!instance || instance.instanceId === activeInstanceId) continue;
      const data = instance.instanceData;
      if (!data?.hasData) continue;

      // Prefer the source renderer's full actor list (includes glyphs,
      // annotation lines, etc.); fall back to the primary data actor.
      let actors = [];
      try {
        actors = data.sceneObjects?.renderer?.getActors?.() || [];
      } catch {
        actors = [];
      }
      if (actors.length === 0 && data.sceneObjects?.actor) {
        actors = [data.sceneObjects.actor];
      }
      if (actors.length > 0) {
        others.push({ instanceId: instance.instanceId, actors });
      }
    }

    const shown = vrMultiViewGrid.enable(sceneObjects, others);
    this._emit('gridModeChanged', { enabled: shown > 0, viewCount: shown });
    return shown > 0;
  }

  /**
   * Disable grid mode and remove all proxy actors from the VR scene.
   * @returns {boolean} always false (grid is now inactive)
   */
  disableGridMode() {
    if (vrMultiViewGrid.isEnabled()) {
      vrMultiViewGrid.disable();
      this._emit('gridModeChanged', { enabled: false, viewCount: 0 });
    }
    return false;
  }

  /**
   * Toggle grid mode.
   * @returns {boolean} whether the grid is now enabled
   */
  toggleGridMode() {
    return vrMultiViewGrid.isEnabled() ? this.disableGridMode() : this.enableGridMode();
  }

  isGridModeEnabled() {
    return vrMultiViewGrid.isEnabled();
  }

  /**
   * Highlight/grab a grid placement (instance id). Pass null to clear.
   * @param {string|null} instanceId
   */
  setGridTarget(instanceId) {
    vrMultiViewGrid.setTargeted(instanceId);
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

  getSessionSnapshots() {
    return this._snapshotManager?.getSessionSnapshots() || [];
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
  }

  _onFrame(time, frame) {
    if (!this._isRunning || !this._activeContext) return;

    const { handler, vrContext, xrSession } = this._activeContext;

    // Calculate delta time
    const deltaTime = this._lastFrameTime ? (time - this._lastFrameTime) / 1000 : 0.016;
    this._lastFrameTime = time;

    try {
      // Get input state
      const inputState = this._gatherInputState(frame);

      // Update navigation (handles movement, teleport, scale)
      if (this._navigationController) {
        const navResult = this._navigationController.update(inputState, frame, deltaTime);

        // Apply navigation result to VR context
        if (navResult.vrScale !== null) {
          vrContext.vrScale = navResult.vrScale;
        }
        if (navResult.position) {
          vrContext.vrOrigin = [
            navResult.position.x,
            navResult.position.y,
            navResult.position.z,
          ];
        }
      }

      // B button (right controller) toggles isolation mode: pull the model
      // to room scale for walk-around inspection, press again to restore.
      const bPressed = inputState.controllers?.right?.buttons?.b || false;
      if (bPressed && !this._lastIsolationButtonState) {
        this.toggleIsolation();
      }
      this._lastIsolationButtonState = bPressed;

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
        vrScale: vrContext.vrScale || 1.0,
      });

      // Broadcast the active controller ray so desktop collaborators can see
      // where this VR user is pointing (throttled inside vrCursorSync).
      this._broadcastPointerRay(inputState, vrContext);

      // Update avatar system
      vrAvatarSystem.update(deltaTime, inputState);

      // Update the in-scene tool menu (hover/tap hit-testing + head anchoring)
      vrSpatialUI.update(inputState);

      // Let handler update VR rendering
      handler.updateVRExploration?.(vrContext, frame, inputState);

      // Emit frame event for UI
      this._emit('frame', { time, inputState, deltaTime });

    } catch (error) {
      log.error('Error in VR frame loop:', error);
    }

    // Continue loop
    xrSession.requestAnimationFrame(this._onFrame);
  }

  /**
   * Publish the local VR controller ray (in DATA space, so desktop views can
   * render it directly) via vrCursorSync. Right hand wins when both present.
   * Never throws — pointer visibility must not break the frame loop.
   * @private
   */
  _broadcastPointerRay(inputState, vrContext) {
    try {
      const viewId = this._activeContext?.instance?.viewConfigId;
      if (!viewId) return;

      const hand = inputState.controllers?.right?.pose
        ? 'right'
        : inputState.controllers?.left?.pose
          ? 'left'
          : null;
      if (!hand) return;

      const pose = inputState.controllers[hand].pose;
      if (!pose?.position || !pose?.orientation) return;

      const origin = mapXRPointToData(
        pose.position,
        vrContext.vrScale || 1.0,
        vrContext.vrOrigin || [0, 0, 0]
      );
      const dir = controllerForward(pose.orientation);

      vrCursorSync.broadcastVRPointer(
        viewId,
        { x: origin[0], y: origin[1], z: origin[2] },
        { x: dir[0], y: dir[1], z: dir[2] },
        hand
      );
    } catch {
      // pointer broadcast is cosmetic — never break the frame loop
    }
  }

  _gatherInputState(frame) {
    const session = frame.session;
    const referenceSpace = vrManager.getReferenceSpace?.() ||
      session.requestReferenceSpace?.('local-floor');

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
    try {
      const viewerPose = frame.getViewerPose(referenceSpace);
      if (viewerPose) {
        state.headPose = viewerPose.transform;
      }
    } catch (e) {
      // Reference space not ready
    }

    // Get controller states
    for (const source of session.inputSources) {
      if (source.hand) {
        // Hand tracking - skip for now
        continue;
      }

      if (source.gripSpace) {
        const handedness = source.handedness;
        try {
          const gripPose = frame.getPose(source.gripSpace, referenceSpace);
          const targetRayPose = source.targetRaySpace
            ? frame.getPose(source.targetRaySpace, referenceSpace)
            : null;

          state.controllers[handedness] = {
            pose: gripPose?.transform,
            targetRay: targetRayPose?.transform,
            gamepad: source.gamepad,
            triggerPressed:
              source.gamepad?.buttons?.[0]?.pressed ||
              vrManager.isSelectPressed(source),
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
        } catch (e) {
          // Pose not available
        }
      } else if (source.targetRaySpace) {
        // Gripless sources: Vision Pro "transient-pointer" (gaze + pinch).
        // No grip space, usually no gamepad, and handedness may be "none" —
        // map "none" to "right" so tools that read controllers.right work.
        try {
          const targetRayPose = frame.getPose(source.targetRaySpace, referenceSpace);
          if (!targetRayPose) continue;

          const handedness =
            source.handedness && source.handedness !== 'none'
              ? source.handedness
              : 'right';

          // Don't overwrite a real tracked controller for the same hand
          if (state.controllers[handedness]) continue;

          state.controllers[handedness] = {
            pose: targetRayPose.transform,
            targetRay: targetRayPose.transform,
            gamepad: source.gamepad || null,
            targetRayMode: source.targetRayMode,
            triggerPressed:
              source.gamepad?.buttons?.[0]?.pressed ||
              vrManager.isSelectPressed(source),
            triggerValue: source.gamepad?.buttons?.[0]?.value || 0,
            squeezePressed: false,
            squeezeValue: 0,
            thumbstick: { x: 0, y: 0 },
            buttons: { a: false, b: false },
          };
        } catch (e) {
          // Pose not available
        }
      }
    }

    return state;
  }

  _handleToolAction(action) {
    log.debug('Tool action:', action);

    switch (action.type) {
      case 'annotation-created':
        this._emit('annotationCreated', action.data);
        this._persistVRAnnotation(action.data);
        break;
      case 'annotation-removed':
        this._emit('annotationRemoved', action.data);
        this._deletePersistedVRAnnotation(action.data);
        break;
      case 'measurement-created':
        this._emit('measurementCreated', action.data);
        this._persistVRMeasurement(action.data);
        break;
      case 'measurement-removed':
        this._emit('measurementRemoved', action.data);
        break;
      case 'slice-plane-updated':
        this._emit('slicePlaneUpdated', action.data);
        // Sync/persist only on gesture end — not every drag frame.
        if (action.data?.final) {
          this._syncVRVisualization('slicePlane');
        }
        break;
      case 'probe-created':
        // Probe results are intentionally session-local (transient inspection).
        this._emit('probeCreated', action.data);
        break;
      case 'clip-box-updated':
        this._emit('clipBoxUpdated', action.data);
        if (action.data?.final) {
          this._syncVRVisualization('clipBox');
        }
        break;
    }
  }

  /**
   * Push a VR-manipulated visualization property (clipBox / slicePlane) to
   * collaborators + persistence via the same channel the desktop menus use
   * (visualizationSyncService → Y.js broadcast + ViewConfiguration).
   * Fire-and-forget: must never block or break the XR frame loop.
   * @param {'clipBox'|'slicePlane'} key
   * @private
   */
  _syncVRVisualization(key) {
    try {
      const viewId = this._activeContext?.instance?.viewConfigId;
      const instanceId = this._activeContext?.vrContext?.instanceId;
      if (!viewId || !instanceId) return;

      const config =
        key === 'clipBox'
          ? vtkClippingFeature.getConfigForSync(instanceId)
          : vtkSliceFeature.getConfigForSync(instanceId);
      if (!config) return;

      Promise.resolve(
        pushSharedVisualizationUpdate(viewId, { [key]: config })
      ).catch((err) =>
        log.warn(`VR ${key} sync failed: ${err?.message}`)
      );
    } catch (err) {
      log.warn(`VR ${key} sync failed: ${err?.message}`);
    }
  }

  // ===========================================================================
  // VR TOOL RESULT PERSISTENCE
  // ===========================================================================
  //
  // VR-placed annotations and measurements are persisted through the same
  // REST path desktop annotations use. The server broadcast then delivers
  // them to every participant (desktop and VR), closing the loop between
  // immersive actions and the shared annotation store.

  _getPersistenceScope() {
    const instance = this._activeContext?.instance;
    const datasetId =
      instance?.instanceData?.dataset?.id || instance?.datasetId || null;
    const projectId = instance?.instanceData?.projectId || null;
    return { datasetId, projectId };
  }

  async _getAnnotationManager() {
    const { annotationManager } = await import(
      '@Core/data/managers/AnnotationManager.js'
    );
    return annotationManager;
  }

  _persistVRAnnotation(data) {
    const { datasetId, projectId } = this._getPersistenceScope();
    if (!datasetId || !data?.position) return;

    // Fire-and-forget: never block the XR frame loop on network I/O
    this._getAnnotationManager()
      .then((annotationManager) => {
        if (!annotationManager) return null;
        return annotationManager.createAnnotation(
          datasetId,
          {
            position: [data.position.x, data.position.y, data.position.z],
            normal: data.normal
              ? [data.normal.x, data.normal.y, data.normal.z]
              : null,
            text: data.text || 'VR marker',
            type: 'point',
            metadata: { source: 'vr', vrMode: data.type, color: data.color },
          },
          { projectId }
        );
      })
      .then((annotation) => {
        if (annotation) {
          // Map the tool-local id to the server id so undo can delete it
          data.serverId = annotation.id;
          log.debug(`VR annotation persisted as ${annotation.id}`);
        }
      })
      .catch((err) => log.warn('Failed to persist VR annotation:', err.message));
  }

  _deletePersistedVRAnnotation(data) {
    const { datasetId } = this._getPersistenceScope();
    if (!datasetId || !data?.serverId) return;

    this._getAnnotationManager()
      .then((annotationManager) =>
        annotationManager?.deleteAnnotation(datasetId, data.serverId)
      )
      .catch((err) => log.warn('Failed to delete VR annotation:', err.message));
  }

  _persistVRMeasurement(data) {
    const { datasetId, projectId } = this._getPersistenceScope();
    if (!datasetId || !data?.startPoint || !data?.endPoint) return;

    const mid = {
      x: (data.startPoint.x + data.endPoint.x) / 2,
      y: (data.startPoint.y + data.endPoint.y) / 2,
      z: (data.startPoint.z + data.endPoint.z) / 2,
    };

    this._getAnnotationManager()
      .then((annotationManager) => {
        if (!annotationManager) return null;
        return annotationManager.createAnnotation(
          datasetId,
          {
            position: [mid.x, mid.y, mid.z],
            text: `Distance: ${Number(data.distance).toFixed(3)} ${data.unit || 'units'}`,
            type: 'measurement',
            metadata: {
              source: 'vr',
              startPoint: [data.startPoint.x, data.startPoint.y, data.startPoint.z],
              endPoint: [data.endPoint.x, data.endPoint.y, data.endPoint.z],
              distance: data.distance,
              unit: data.unit || 'units',
            },
          },
          { projectId }
        );
      })
      .then((annotation) => {
        if (annotation) {
          data.serverId = annotation.id;
          log.debug(`VR measurement persisted as ${annotation.id}`);
        }
      })
      .catch((err) => log.warn('Failed to persist VR measurement:', err.message));
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  _onSessionEnd() {
    log.info('XR session ended');
    this.leaveSession().catch(err => log.error('Error leaving session:', err));
  }

  // ===========================================================================
  // STATUS QUERIES
  // ===========================================================================

  isExploring() {
    return this._activeSession != null && this._activeSession.isActive();
  }

  getActiveContext() {
    return this._activeContext;
  }
}

export const vrExplorationManager = new VRExplorationManager();
export default vrExplorationManager;
