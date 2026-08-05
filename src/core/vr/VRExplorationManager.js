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
import { VRExplorationSession, PARTICIPATION_MODE, SESSION_STATUS, EXPLORATION_MODES } from '@Core/data/models/VRExplorationSession.js';
import { VRParticipantSync } from '@Core/vr/VRParticipantSync.js';
import { VRToolManager } from '@Core/vr/tools/VRToolManager.js';
import { VRSnapshotManager } from '@Core/vr/VRSnapshotManager.js';
import { VRControlManager } from '@Core/vr/VRControlManager.js';
import { VRManipulationLock } from '@Core/vr/VRManipulationLock.js';
import { VRNavigationController } from '@Core/vr/navigation/VRNavigationController.js';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { getUserId, getUserName, getUserColor } from '@Collaboration/presence/userManagement.js';
// Room id for the collaboration diagnostic — it is the Y.Doc room every peer
// must share, and the first thing to compare when two headsets cannot see
// each other. See getCollaborationDiagnostics().
import { sessionManager } from '@Core/session/sessionManager.js';
import { apiClient } from '@Services/apiClient.js';
import { BaseManager } from '@Core/data/managers/BaseManager.js';
import { vrAvatarSystem } from '@Core/instances/types/vtk/vr/VTKVRAvatars.js';
import { vrSpatialUI } from '@Core/instances/types/vtk/vr/VTKVRSpatialUI.js';
import { vrMultiViewGrid } from '@Core/vr/VRMultiViewGrid.js';
import {
  vtkClippingFeature,
  vtkSceneFeature,
  vtkThresholdFeature,
  vtkIsosurfaceFeature,
} from '@Core/instances/types/vtk/features/index.js';
import { VRValueEditorModel } from '@Core/vr/VRValueEditorModel.js';
import { vtkGlyphFeature, isGlyphFeatureAvailable, getDisabledGlyphTypes } from '@Core/instances/types/vtk/features/VTKGlyphFeature.js';
import { instanceTools } from '@VTK/vtkInstanceTools.js';
import { pushSharedVisualizationUpdate } from '@Services/visualizationSyncService.js';
import { vrCursorSync } from '@Core/vr/VRCursorSync.js';
import {
  yVRSessions,
  getVRSessionForView,
  claimVRSession,
  heartbeatVRSession,
  releaseVRSession,
  syncManipulatorToYjs,
  yManipulatorState,
} from '@Collaboration/yjs/yjsSetup.js';
import { presenceSystem } from '@Collaboration/presence/presenceSystem.js';
import { mapXRPointToData, controllerForward } from '@Core/vr/tools/vrPlaneMath.js';
import { vrEnvironment } from '@Core/vr/environment/VREnvironment.js';
import { voiceRoomService, getVoiceRoomName } from '@Services/voice/voiceRoomService.js';

// ---------------------------------------------------------------------------
// Entry-placement geometry. These four are derived TOGETHER and must stay in
// sync with VTKVRSpatialUI's PANEL_DISTANCE — the whole point is that the
// dataset and the spatial menu do not occupy the same solid angle.
//
// The old fit (2.5 m diagonal at 2.0 m) made the dataset subtend ~77 deg while
// the panel subtends ~40 deg, so no lateral offset could separate them: the
// menu would have to sit ~67 deg off-axis, outside any usable gaze cone. The
// fix is to fit the dataset to a smaller angular radius so both fit in front.
//
// Solve for the centre distance D such that the near face of the bounding
// sphere clears the panel plane:
//     D = PANEL_PLANE_M + PANEL_CLEARANCE_M + R,  where R = D * sin(halfAngle)
//  => D * (1 - sin(halfAngle)) = PANEL_PLANE_M + PANEL_CLEARANCE_M
// With 15 deg / 1.6 m / 0.35 m this gives D ~= 2.63 m, R ~= 0.68 m, so the
// dataset spans ~1.36 physical metres. Deliberately smaller than before — the
// user grows it with the two-hand gesture, which now stays grounded.
const FIT_HALF_ANGLE_RAD = (15 * Math.PI) / 180;
const PANEL_PLANE_M = 1.6;
const PANEL_CLEARANCE_M = 0.35;
const FIT_DISTANCE_M =
  (PANEL_PLANE_M + PANEL_CLEARANCE_M) / (1 - Math.sin(FIT_HALF_ANGLE_RAD));
const FIT_DIAGONAL_M = 2 * FIT_DISTANCE_M * Math.sin(FIT_HALF_ANGLE_RAD);

// How high (physical metres) the dataset's own bottom bound sits above the
// floor — a fixed pedestal rather than resting directly on it. Without this,
// _computeAutoPlacement's grounding invariant (see there) pins a flat/short
// dataset's bottom to the literal floor, so its center — and anything sized
// to its bounds, like the cube-axes marker — ends up hugging the floor well
// below a comfortable standing eye/interaction line. A fixed pedestal (not a
// "center at eye height" placement) keeps the dataset visually anchored to
// the floor grid rather than floating disconnected from it.
const PEDESTAL_HEIGHT_M = 0.5;

// How long a "Building glyphs…" style status label may persist before the
// panel falls back to its normal status line (see getPendingWorkLabel).
const PENDING_WORK_TTL_MS = 3000;

// Minimum gap between surface picks for the pointer's hit marker (10 Hz).
//
// VTKInstanceHandler.raycastVR rebuilds its pick list (_getVRPickTargets) on
// EVERY call and then runs a vtkCellPicker pass, so it is nowhere near a
// 90 Hz-per-frame budget. The hit point only has to look attached to the
// surface, and at 10 Hz the ray itself still moves every frame — only the dot
// quantizes. Between picks the cached hit is reused verbatim.
const POINTER_PICK_MS = 100;

// Minimum gap between shared vr-sessions registry housekeeping ticks
// (heartbeat + host-promotion check) — see _tickVRSessionRegistry. 1 Hz is
// generous next to VR_SESSION_STALE_MS (15s), and keeps this off the
// per-frame budget entirely.
const VR_SESSION_HEARTBEAT_MS = 1000;

// How long _watchVRSessionConvergence keeps listening to yVRSessions after a
// claim/adopt, to catch a competing write that resolves the claim race AFTER
// our own synchronous claimVRSession() call already returned (see its
// docstring in yjsSetup.js).
const VR_SESSION_CONVERGE_WATCH_MS = 3000;

// How long an in-VR notice ("X has data control") stays on the spatial menu's
// status line. Long enough to read at arm's length inside a headset, short
// enough that it never masks the dataset/scale/mode line for a whole gesture.
const VR_NOTICE_MS = 2500;

// How long after the last shared-data change this user stays lit as the
// "active manipulator" on every desktop client (the existing
// yjsSetup.syncManipulatorToYjs / onManipulatorChange channel). Matches the
// desktop camera-manipulation debounce so VR and desktop activity decay alike.
const MANIPULATOR_IDLE_MS = 1500;

// Human-readable names for the keys _pushVisualizationPatch can carry, used
// only for the refusal notice ("Glyphs needs data control — Alice has it").
const PATCH_LABELS = Object.freeze({
  clipBox: 'Clip',
  representation: 'Appearance',
  glyph: 'Glyphs',
  threshold: 'Threshold',
  isosurface: 'Isosurface',
  transform: 'Move Object',
});

// Which patch keys read as "filtering" rather than "changing the dataset" on
// the desktop manipulator-awareness UI (see _signalManipulation).
const FILTER_PATCH_KEYS = new Set(['clipBox', 'threshold', 'isosurface', 'glyph']);

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

    // Data-manipulation token (Phase 3). Null outside an active session — and
    // EVERY gate below fails OPEN on null, so nothing that worked before this
    // existed can be blocked by its absence (see _hasManipulationControl).
    /** @type {VRManipulationLock|null} */
    this._manipulationLock = null;
    this._offManipulationLock = null;
    // Transient in-headset message, { text, untilMs } — see _flashVRNotice.
    this._vrNotice = null;
    // Debounce handle for the "this user is manipulating" activity signal.
    this._manipulatorIdleTimer = null;

    // Frame loop — driven by vrManager's single XR rAF loop, not our own.
    // _offFrame/_offSessionEnded hold the unsubscribe functions returned by
    // vrManager.on(); _leaving guards against re-entrant leaveSession() calls
    // (leaveSession -> vrManager.exitVR() -> "end" event -> our sessionEnded
    // handler -> leaveSession again).
    this._offFrame = null;
    this._offSessionEnded = null;
    this._leaving = false;
    this._lastFrameTime = 0;

    // Isolation mode (room-scale inspection)
    this._isolationBackup = null;
    this._lastIsolationButtonState = false;
    this._lastMenuToggleButtonState = false;

    // vrManager.getYawOffset() snapshot, compared each frame in _onFrame to
    // force vrSpatialUI.forceReanchor() after a snap-turn (see there).
    this._lastMenuYawOffset = 0;

    // In-VR "follow a collaborator" — soft positional follow only, never
    // touches head orientation (see followParticipant/_updateParticipantFollow).
    this._followTargetUserId = null;

    // One-shot: _applyInitialPlacement runs before any XR frame exists, so it
    // has to assume the user faces reference-space -Z at session start. That
    // assumption doesn't hold on every platform — set once the first real
    // frame's viewerPose arrives, correcting placement to the user's actual
    // head position/facing (see _applyPoseRelativePlacement).
    this._needsPoseCorrection = false;

    // One-shot: Vision Pro's transient-pointer input sources are grip-less
    // and typically don't appear in xrSession.inputSources until the user
    // pinches, so we can't tell at session start whether the platform is
    // gripless — detection happens lazily in _onFrame on the first frame
    // that reports a controller (see the input-profile check there).
    this._inputProfileDetected = false;

    // Deferred work queue: heavy per-toggle operations (glyph rebuild,
    // isosurface extraction, ...) triggered from inside the menu's
    // synchronous activate() call. Draining happens at the END of the XR
    // frame, AFTER the eyes are drawn (see _onFrame/_drainDeferredWork), so
    // the stall lands between frames instead of inside one — see _deferHeavy.
    this._deferredWork = [];
    this._pendingWorkLabel = null;

    // Floor point under the head in XR metres, refreshed each frame. Used as
    // the pivot for scale changes that originate outside the frame loop.
    this._lastHeadFloorXR = null;

    // Throttle cache for the pointer's surface pick — { pos, atMs }. See
    // POINTER_PICK_MS and _pickPointerHit.
    /** @type {{pos: {x:number,y:number,z:number}|null, atMs: number}|null} */
    this._lastPointerHit = null;

    // Session convergence (Phase 1): unsubscribe for the short-lived
    // post-claim yVRSessions observer (see _watchVRSessionConvergence), and
    // the Date.now() guard for the ≤1 Hz registry heartbeat/host-promotion
    // tick (see _tickVRSessionRegistry).
    this._offVRSessionObserver = null;
    this._lastVRSessionHeartbeat = 0;

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

    // SESSION CONVERGENCE (defect: a second "Enter VR" tap on the same view
    // used to mint its own vrsession_<ts>_<rand> id, opening a DIFFERENT
    // `vr-participants-<id>` Y.js map — the two users were invisible to each
    // other, and the server's GET /vr/sessions can't fix it (it filters on
    // projectId, which is undefined for locally loaded datasets). The id
    // must be settled before sub-managers are constructed: VRParticipantSync
    // keys its Y.js map by session.id, so joiners need the canonical id to
    // sync avatars against the same map.
    //
    // Three paths, in priority order:
    //  1. Explicit join (config.serverSession) — id is already canonical.
    //  2. A live room-scoped registry record already exists for this view
    //     (another client entered VR on it first) — adopt its sessionId/host
    //     directly and skip server registration entirely. This also removes
    //     the up-to-1500ms _tryRegisterSession race from the joiner's path.
    //  3. Neither — we're first. Register with the server as before, then
    //     claim the registry slot; someone racing us for the SAME slot may
    //     still beat us to it (Y.js Map is last-writer-wins), so adopt
    //     whatever claimVRSession() returns rather than assuming we won it.
    const sessionKey = this._resolveSessionKey(instance);
    if (serverSession?.id) {
      // Path 1 — nothing to adopt, id is already canonical.
    } else {
      const liveRecord = getVRSessionForView(sessionKey);
      if (liveRecord) {
        // Path 2
        session.id = liveRecord.sessionId;
        session.ownerUserId = liveRecord.hostUserId;
        session.ownerUserName = liveRecord.hostUserName;
      } else {
        // Path 3
        const serverRow = await this._tryRegisterSession(session);
        if (serverRow?.id) {
          session.id = serverRow.id;
        }
        const claimed = claimVRSession(sessionKey, {
          sessionId: session.id,
          hostUserId: getUserId(),
          hostUserName: getUserName(),
          datasetId: session.datasetId,
          projectId: session.projectId,
        });
        session.id = claimed.sessionId;
        session.ownerUserId = claimed.hostUserId;
        session.ownerUserName = claimed.hostUserName;
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
    // Data-control token. Deliberately NOT VRControlManager: that models a
    // desktop user puppeteering a VR user's viewpoint, which is orthogonal to
    // "who may push shared visualization patches". See VRManipulationLock.
    this._manipulationLock = new VRManipulationLock(session);

    // Request XR session via VRManager — the sole owner of session lifecycle,
    // reference space and the XRWebGLLayer. This must be the only place that
    // ever calls navigator.xr.requestSession() for exploration; a competing
    // session here was the root cause of VR entry rendering nothing.
    const glContext = handler.getWebGLContext(instance.instanceId);
    if (!glContext) {
      throw new Error(
        'Could not get a WebGL context for VR — is the dataset loaded and render mode set to local?'
      );
    }

    log.debug('Requesting XR session via VRManager...');
    await vrManager.enterVR(glContext, {
      sessionId: session.id,
      navigationMode: sessionConfig.explorationMode,
      scale: sessionConfig.vrScale,
      requiredFeatures: ['local-floor'],
      // NOTE: do NOT request 'layers'. The renderer draws exclusively through
      // the legacy XRWebGLLayer set as baseLayer (VRManager._setupWebGLLayer).
      // Browsers that support the WebXR Layers API (e.g. Oculus/Meta Quest)
      // would grant 'layers', and the spec then forbids setting baseLayer in
      // updateRenderState() — throwing "Can't use baseLayer with layers feature
      // requested" and blocking VR entry. We never use the Layers API, so
      // requesting it gains nothing and only breaks capable headsets.
      optionalFeatures: ['bounded-floor', 'hand-tracking'],
    });
    const xrSession = vrManager.getSession();

    // Enter VR exploration mode on handler, handing it the already-configured
    // gl/XRWebGLLayer/reference space instead of letting it create its own.
    log.debug('Entering VR exploration mode on handler...');
    const vrContext = await handler.enterVRExploration(
      instance.instanceData,
      session,
      xrSession,
      {
        gl: glContext,
        xrLayer: vrManager.getXRLayer(),
        referenceSpace: vrManager.getReferenceSpace(),
      }
    );

    // Auto-fit placement: never leave vrOrigin at [0,0,0] — scientific
    // datasets are rarely centered on the data origin, so an unplaced
    // dataset is invisible on entry. Uses the same math as enterIsolation().
    this._applyInitialPlacement(vrContext, sessionConfig);
    this._needsPoseCorrection = true;

    // Initialize tool manager with handler. The `canManipulate` predicate is
    // INJECTED rather than imported by the tools, so VRAnnotationTool/
    // VRMeasureTool can refuse a placement without importing this manager
    // (which imports them — that would be a cycle).
    this._toolManager = new VRToolManager(handler, vrContext, {
      canManipulate: (label) => this._requireManipulationControl(label),
    });

    // Initialize navigation controller. The onObjectMoved callback lets the
    // MOVE_OBJECT mode broadcast the active dataset's transform to collaborators.
    // Pass vrManager so snap-turn plumbing works in the layered controller.
    this._navigationController = new VRNavigationController(session, vrContext, {
      vrManager,
      onObjectMoved: (final) => this._pushObjectTransformPatch(final),
    });

    // Set the world-grab engagement predicate: grip on tracked controllers
    // (squeeze > 0.7), pinch on Vision Pro (triggerPressed). This keeps grip
    // dedicated to "pull the world for navigation" while trigger stays free
    // for object-move and the menu.
    //
    // Schmitt trigger: engage high, release low. A single threshold made a grip
    // resting near 0.7 chatter at frame rate — every OFF frame froze the world
    // and suppressed fly, every ON frame re-anchored and discarded the hand
    // travel since the last anchor, so the grab felt sticky and stopped
    // tracking. The `engaged` argument is supplied by VRGrabMode, which knows
    // whether the grab is currently active.
    const GRIP_ENGAGE = 0.7;
    const GRIP_RELEASE = 0.4;
    const gripPredicate = (hand, engaged = false) => {
      if (!hand) return false;
      // Grip + trigger together is the "carry the dataset" chord
      // (VRNavigationController._isObjectMoveChord). Excluding it here is what
      // keeps the two from firing at once — grip alone pulls the world, grip
      // with trigger moves the data.
      if (hand.triggerPressed === true && !hand.isTransientPointer) return false;
      // Vision Pro's transient-pointer is gripless (squeezeValue always 0) and
      // its pinch is digital — no hysteresis needed or possible.
      if (hand.isTransientPointer) return hand.triggerPressed === true;
      return (hand.squeezeValue || 0) > (engaged ? GRIP_RELEASE : GRIP_ENGAGE);
    };
    this._navigationController.setWorldGrabEngagement(gripPredicate);

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

    // Drive our frame work off VRManager's single XR frame loop instead of
    // requesting our own animation frames.
    this._offFrame = vrManager.on('frame', this._onFrame);
    this._offSessionEnded = vrManager.on('sessionEnded', this._onSessionEnd);

    // Start participant sync
    this._participantSync.start();

    // Data-control token. The host claims it by default so a fresh session has
    // exactly one authority instead of N headsets racing on the same patch
    // channel; everyone else asks for it (see requestManipulationControl).
    this._safeInitStep('manipulationLock.start', () => {
      this._manipulationLock.start();
      if (session.ownerUserId === getUserId()) {
        this._manipulationLock.claimAsHost();
      }
      this._offManipulationLock = this._manipulationLock.onChange((state) =>
        this._emit('manipulationControlChanged', state)
      );
    });

    // Watch the shared registry for a short window after claiming/adopting a
    // slot for this view — a claim race can resolve AFTER our own synchronous
    // claimVRSession() call returns, once a competing write propagates over
    // the network (see claimVRSession's docstring).
    this._watchVRSessionConvergence(sessionKey, session);

    // Initialize avatar system
    const avatarRenderer = vrContext.sceneObjects?.renderer;
    if (avatarRenderer) {
      this._safeInitStep('vrAvatarSystem.initialize', () =>
        vrAvatarSystem.initialize(avatarRenderer, session, vrContext)
      );
    }

    // Spatial environment: floor grid + horizon, physically anchored so the
    // user has depth/scale cues rather than a dataset floating in a void.
    if (avatarRenderer) {
      this._safeInitStep('vrEnvironment.initialize', () =>
        vrEnvironment.initialize(avatarRenderer, vrContext)
      );
    }

    // Pointer-ray broadcasting: desktop collaborators render this VR user's
    // controller ray via vrCursorSync (consumed by VTKRemoteVRRays).
    this._safeInitStep('vrCursorSync.initialize', () =>
      vrCursorSync.initialize(getUserId(), getUserName(), getUserColor(getUserId()))
    );

    // Print the room/session/view triple every peer must agree on. Cheap, once
    // per session, and it is the first thing to check when two headsets cannot
    // see each other.
    this._logCollaborationDiagnostics('session-start');

    // Initialize the in-scene spatial tool menu. WebXR immersive sessions do
    // not render the DOM, so this VTK panel — not the React VRWristMenu — is
    // the guaranteed in-headset UI. It shares this manager as its source of
    // truth (tool select / undo / isolation toggle / exit all route back here).
    if (avatarRenderer) {
      // Pass the transform up front. The panel commits its opening anchor from
      // the FIRST hitTest(), which runs a phase before the first layout() —
      // without bounds it cannot compute its clearance from the dataset and
      // parks itself across the forward axis, where it then swallows the
      // trigger aimed at the data (see VTKVRSpatialUI._latchTransform).
      // _applyInitialPlacement has already populated these above.
      this._safeInitStep('vrSpatialUI.initialize', () =>
        vrSpatialUI.initialize(avatarRenderer, this, {
          vrScale: vrContext.vrScale,
          vrOrigin: vrContext.vrOrigin,
          dataBounds: vrContext.dataBounds,
        })
      );
    }

    // Tell the ROOM (not just the session) that this user is now in a headset.
    // Desktop collaborators who never open the VR panel still need to see it —
    // useRoomPresence's `inVR` bucket and MemberRow's VR badge both read this.
    this._safeInitStep('presence.setVRPresence', () =>
      presenceSystem.setVRPresence({
        inVR: true,
        vrSessionId: session.id,
        vrRole: session.ownerUserId === getUserId() ? 'host' : 'participant',
      })
    );

    // Emit event
    this._emit('explorationStarted', { session, instanceId });

    log.info('VR exploration started', { sessionId: session.id });

    return session;
  }

  /**
   * Resolve a view configuration to its live instance and start VR
   * exploration on it. This is the single entry point every "Enter VR" UI
   * surface (launch modal, canvas footer toggle, header button, voice
   * command) should call — no caller should ever talk to vrManager.enterVR()
   * or navigator.xr.requestSession() directly.
   *
   * @param {string} viewConfigId
   * @param {Object} [config] - see startExploration
   * @returns {Promise<VRExplorationSession>}
   */
  async startForView(viewConfigId, config = {}) {
    const instance = workspaceManager.getInstanceByViewConfigId(viewConfigId);
    if (!instance) {
      throw new Error('No open view found for VR exploration');
    }
    if (!instance.instanceData?.hasData) {
      throw new Error('Load a dataset to explore in VR');
    }
    const handler = instance.handler;
    if (!handler?.supportsVRExploration?.()) {
      throw new Error('This view type does not support VR exploration');
    }

    return this.startExploration(instance.instanceId, config);
  }

  /**
   * Resolve the key this instance's VR exploration converges on in the
   * shared `vr-sessions` registry (yVRSessions).
   *
   * WHY dataset id, not view id: every client that opens a dataset mints its
   * OWN ViewConfiguration via createView()/POST /views, so two headsets
   * looking at the SAME dataset in the SAME room hold two different, both
   * individually valid, viewConfigIds. Keying convergence on viewConfigId
   * (the old behaviour) meant each headset looked up — and claimed — a
   * DIFFERENT registry slot; neither could ever observe the other's claim,
   * so avatars/poses were permanently split across two sessions with no way
   * to recover. yVRSessions is already room-scoped (see yjsSetup.js), so
   * "same datasetId" is exactly "same dataset, same room" — the actual
   * semantics a shared VR exploration needs.
   *
   * Falls back to viewConfigId when there is no dataset id (e.g. a handler
   * that hasn't attached dataset metadata to the instance yet); returns
   * undefined when neither is available so callers preserve the existing
   * "no key, do nothing" behaviour instead of claiming/watching garbage.
   *
   * @param {object} instance - workspaceManager instance (see startExploration)
   * @returns {string|undefined}
   * @private
   */
  _resolveSessionKey(instance) {
    return (
      instance?.instanceData?.dataset?.id ||
      instance?.datasetId ||
      instance?.viewConfigId ||
      undefined
    );
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
   * Watch the shared `vr-sessions` registry for VR_SESSION_CONVERGE_WATCH_MS
   * after claiming/adopting the slot for this session key (see
   * _resolveSessionKey). Two clients can claim
   * "simultaneously" (see claimVRSession's docstring) — each wins its own
   * synchronous local claim, but once the competing write propagates over the
   * network, Y.js's last-writer-wins resolution can silently overwrite our
   * entry with someone else's. If that happens, our sub-managers are still
   * keyed by our own (losing) session id and would be invisible to the
   * winner — so re-key onto the survivor the moment we see it.
   *
   * Self-unsubscribes after the window; also torn down early by leaveSession
   * via _offVRSessionObserver.
   *
   * @param {string} sessionKey - see _resolveSessionKey()
   * @param {VRExplorationSession} session
   * @private
   */
  _watchVRSessionConvergence(sessionKey, session) {
    if (!sessionKey) return;

    // A previous call (shouldn't normally overlap, but startExploration can
    // in principle run again before this window elapses) must not leak.
    this._offVRSessionObserver?.();

    const observer = (event) => {
      if (!event.changes.keys.has(sessionKey)) return;

      const record = getVRSessionForView(sessionKey);
      if (!record || record.sessionId === session.id) return;

      log.info(`VR session claim race resolved against us — re-keying ${session.id} -> ${record.sessionId}`);
      this._participantSync?.rekey(record.sessionId);
      this._controlManager?.rekey(record.sessionId);
      this._manipulationLock?.rekey(record.sessionId);
      session.id = record.sessionId;
      session.ownerUserId = record.hostUserId;
      session.ownerUserName = record.hostUserName;
    };

    yVRSessions.observe(observer);

    const timeoutId = setTimeout(() => {
      yVRSessions.unobserve(observer);
      this._offVRSessionObserver = null;
    }, VR_SESSION_CONVERGE_WATCH_MS);

    this._offVRSessionObserver = () => {
      clearTimeout(timeoutId);
      yVRSessions.unobserve(observer);
    };
  }

  /**
   * Low-frequency (throttled to VR_SESSION_HEARTBEAT_MS by the caller in
   * _onFrame) housekeeping for the shared `vr-sessions` registry:
   *  - refresh our record's heartbeat so the stale sweep (VR_SESSION_STALE_MS)
   *    never evicts a session that is still live;
   *  - if the host's record has disappeared (clean release, or its heartbeat
   *    went stale), deterministically promote exactly one remaining client —
   *    the live VR participant with the lowest joinedAt — instead of running
   *    a voting protocol. Every remaining client runs this same computation;
   *    only the one that agrees it is the winner writes the claim.
   * Must key on the same value startExploration claimed/watched under (see
   * _resolveSessionKey) — otherwise this heartbeats/promotes against a
   * DIFFERENT registry slot than the one the session actually lives at,
   * which looks exactly like the record having gone stale (host-promotion
   * fires spuriously) even though nothing is actually wrong.
   *
   * @param {string|undefined} sessionKey - see _resolveSessionKey()
   * @param {VRExplorationSession|null} session
   * @private
   */
  _tickVRSessionRegistry(sessionKey, session) {
    if (!sessionKey || !session) return;

    heartbeatVRSession(sessionKey, getUserId());

    if (getVRSessionForView(sessionKey)) return; // host's slot is still live

    const vrParticipants = session.getVRParticipants?.() || [];
    if (!vrParticipants.length) return;

    const winner = vrParticipants.reduce((best, p) =>
      !best || p.joinedAt < best.joinedAt ? p : best,
      null
    );
    if (!winner || winner.odUserId !== getUserId()) return; // not our turn

    const claimed = claimVRSession(sessionKey, {
      sessionId: session.id,
      hostUserId: getUserId(),
      hostUserName: getUserName(),
      datasetId: session.datasetId,
      projectId: session.projectId,
    });
    session.ownerUserId = claimed.hostUserId;
    session.ownerUserName = claimed.hostUserName;
    if (claimed.hostUserId === getUserId()) {
      log.info(`VR session host promoted: ${getUserId()} claimed ${sessionKey}`);
    }
  }

  /**
   * Join an existing VR exploration session, given the already-fetched
   * session record (callers listing sessions — e.g. VRExploreButton's
   * session popover — already have this row from their GET /vr/sessions;
   * avoid a redundant refetch here). Fields are the raw
   * vr_exploration_sessions row shape (snake_case) returned by the server.
   *
   * The join notification POST is bounded by a short timeout so a slow
   * network never delays entering VR while WebXR user-activation is still
   * fresh — same pattern as _tryRegisterSession. If the session's view is
   * open locally and a VR mode was requested, enters VR against that view
   * using the shared startExploration path (with the server session's id,
   * so avatar/participant Y.js state converges across clients).
   *
   * @param {Object} sessionRecord - server session row (id, view_configuration_id,
   *   owner_user_name, default_exploration_mode, default_vr_scale, ...)
   * @param {string} mode - Participation mode (PARTICIPATION_MODE)
   * @returns {Promise<{joined: boolean, vrEntered: boolean, session?: object, reason?: string}>}
   */
  async joinSession(sessionRecord, mode = PARTICIPATION_MODE.DESKTOP_OBSERVER) {
    const sessionId = sessionRecord?.id;
    if (!sessionId) {
      return { joined: false, vrEntered: false, reason: 'session-not-found' };
    }
    log.info('Joining VR session...', { sessionId, mode });

    try {
      const joinPost = apiClient.post(`/vr/sessions/${sessionId}/join`, { mode });
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
      await Promise.race([joinPost, timeout]);
    } catch (err) {
      log.warn('VR session join notification failed (continuing):', err.message);
    }

    // Desktop observers are done: participant state flows via Y.js/WS
    const isVRMode = mode === PARTICIPATION_MODE.VR_EXPLORER;
    if (!isVRMode) {
      this._emit('sessionJoined', { sessionId, mode });
      return { joined: true, vrEntered: false, session: sessionRecord };
    }

    // VR modes need the session's view open locally
    const viewConfigId = sessionRecord.view_configuration_id;
    const instance = viewConfigId
      ? workspaceManager.getInstanceByViewConfigId(viewConfigId)
      : null;
    if (!instance) {
      log.warn(`Cannot enter VR for session ${sessionId}: view ${viewConfigId} not open locally`);
      this._emit('sessionJoined', { sessionId, mode, vrEntered: false });
      return {
        joined: true,
        vrEntered: false,
        session: sessionRecord,
        reason: 'view-not-open',
      };
    }

    // Enter VR against the shared session id
    await this.startExploration(instance.instanceId, {
      serverSession: sessionRecord,
      participationMode: mode,
      explorationMode: sessionRecord.default_exploration_mode,
      vrScale: Number(sessionRecord.default_vr_scale) || 1.0,
    });

    this._emit('sessionJoined', { sessionId, mode, vrEntered: true });
    return { joined: true, vrEntered: true, session: sessionRecord };
  }

  /**
   * Leave the current session
   */
  /**
   * Run one teardown step, logging and swallowing any failure instead of
   * letting it abort the rest of leaveSession()'s cleanup sequence. Without
   * this, a single sub-manager throwing (e.g. vrSpatialUI.dispose()) would
   * skip every step after it — critically vrEnvironment.dispose() — leaving
   * floor/wall/marker/menu actors permanently stuck in the instance's
   * long-lived renderer (VR "exits" with no visible error, but the next
   * "Enter VR" then sizes the dataset off contaminated bounds). Each step is
   * independently guarded so one failure can never take out the others.
   * @private
   */
  async _safeCleanupStep(label, fn) {
    try {
      await fn();
    } catch (e) {
      log.error(`VR leaveSession: ${label} failed`, e);
    }
  }

  /**
   * Run one VR sub-system init step, logging and swallowing any failure
   * instead of letting it abort the rest of startExploration()'s setup. By
   * the time these run, session.start() and the XR frame loop are already
   * live — the user is fully immersed — so without this, a single sub-system
   * throwing (e.g. vrSpatialUI.initialize() building ~25 button actors) would
   * silently reject the whole startExploration() promise. The caller only
   * sees a desktop toast, invisible from inside the headset, and everything
   * after the failed step (critically the spatial menu, since it initializes
   * last) never gets a chance to run. Each step is independently guarded so
   * one failure can never take out the others, and the error is logged with
   * enough detail (message + stack) to diagnose from a headset's remote
   * console (chrome://inspect for Quest, Safari Develop menu for Vision Pro).
   * @private
   */
  _safeInitStep(label, fn) {
    try {
      fn();
    } catch (e) {
      log.error(`VR startExploration: ${label} failed — ${e?.message}`, e?.stack || e);
    }
  }

  async leaveSession() {
    // Guard against re-entrancy: leaveSession() -> vrManager.exitVR() ->
    // XRSession "end" event -> our sessionEnded handler -> leaveSession()
    // again. Also covers the reverse: the headset/browser ends the session
    // first (user removed headset), which fires sessionEnded and calls us
    // here without anyone having called leaveSession() directly.
    if (!this._activeSession || this._leaving) return;
    this._leaving = true;

    const session = this._activeSession;
    // Captured before _activeContext is nulled out in `finally` — the
    // registry release below needs it after every other cleanup step runs.
    // Must match the key startExploration claimed under (see
    // _resolveSessionKey), or this releases the wrong registry slot entirely.
    const sessionKey = this._resolveSessionKey(this._activeContext?.instance);

    log.info('Leaving VR session...', { sessionId: session.id });

    try {
      // Unsubscribe from VRManager events first so no further frame/end
      // callbacks touch a partially torn-down context.
      this._offFrame?.();
      this._offFrame = null;
      this._offSessionEnded?.();
      this._offSessionEnded = null;

      // Stop watching for a delayed claim-race resolution (see
      // _watchVRSessionConvergence) — nothing left to re-key onto once we're
      // leaving.
      await this._safeCleanupStep('vrSessionObserver.cleanup', () => {
        this._offVRSessionObserver?.();
        this._offVRSessionObserver = null;
      });

      // Release the shared registry slot if WE are the host, so a remaining
      // participant's host-promotion check (_tickVRSessionRegistry) sees it
      // vacated instead of waiting out VR_SESSION_STALE_MS. No-op for a
      // non-host (releaseVRSession itself also guards this, but checking
      // here avoids a pointless Y.js write from every leaving participant).
      await this._safeCleanupStep('vrSessionRegistry.release', () => {
        if (sessionKey && session.ownerUserId === getUserId()) {
          releaseVRSession(sessionKey, getUserId());
        }
      });

      // Clean up sub-managers — each step independently guarded (see
      // _safeCleanupStep) so a failure in one can never skip the rest,
      // especially vrEnvironment.dispose() (must run before the handler's
      // final desktop render, and before the next VR entry computes bounds).
      await this._safeCleanupStep('participantSync.stop', () => this._participantSync?.stop());
      await this._safeCleanupStep('vrCursorSync.clearCursor', () => vrCursorSync.clearCursor());
      await this._safeCleanupStep('vrMultiViewGrid.disable', () => vrMultiViewGrid.disable());
      await this._safeCleanupStep('vrSpatialUI.dispose', () => vrSpatialUI.dispose());
      await this._safeCleanupStep('vrAvatarSystem.dispose', () => vrAvatarSystem.dispose());
      await this._safeCleanupStep('vrEnvironment.dispose', () => vrEnvironment.dispose());
      await this._safeCleanupStep('toolManager.cleanup', () => this._toolManager?.cleanup());
      await this._safeCleanupStep('snapshotManager.cleanup', () => this._snapshotManager?.cleanup());
      await this._safeCleanupStep('controlManager.cleanup', () => this._controlManager?.cleanup());
      await this._safeCleanupStep('manipulationLock.stop', () => {
        this._offManipulationLock?.();
        this._offManipulationLock = null;
        this._manipulationLock?.stop();
      });
      // Clear our "currently manipulating" flag on every desktop client, so a
      // VR user who exits mid-gesture doesn't stay lit forever.
      await this._safeCleanupStep('manipulatorSignal.clear', () => this._clearManipulationSignal());
      await this._safeCleanupStep('navigationController.cleanup', () => this._navigationController?.cleanup());

      // Exit VR exploration on handler
      await this._safeCleanupStep('handler.exitVRExploration', () => {
        if (this._activeContext?.handler && this._activeContext?.vrContext) {
          return this._activeContext.handler.exitVRExploration(this._activeContext.vrContext);
        }
        return undefined;
      });

      // End the XR session via VRManager (the sole session owner). Safe to
      // call even if the session already ended (e.g. we got here via the
      // sessionEnded event) — exitVR() no-ops when there's no active session.
      try {
        await vrManager.exitVR();
      } catch (e) {
        // Session may already be ended
      }

      // End session
      session.end();

      // Notify the server (non-fatal; only meaningful for server-registered ids)
      if (session.id && !String(session.id).startsWith('vrsession_')) {
        apiClient
          .post(`/vr/sessions/${session.id}/leave`, {})
          .catch((err) => log.warn('VR session leave notification failed:', err.message));
      }
    } finally {
      // Guaranteed to run even if something above threw unexpectedly outside
      // the individually-guarded steps — otherwise _leaving would stay true
      // forever and every future "Enter VR" attempt would silently no-op.
      this._activeSession = null;
      this._activeContext = null;
      this._isolationBackup = null;
      this._lastIsolationButtonState = false;
      this._lastMenuToggleButtonState = false;
      this._lastMenuYawOffset = 0;
      this._followTargetUserId = null;
      this._inputProfileDetected = false;
      // The cached hit belongs to the picker on the vrContext just disposed.
      this._lastPointerHit = null;
      // Defensive — the try block above already unsubscribes/releases these,
      // but guarantee a clean slate even if it threw before reaching them.
      this._offVRSessionObserver?.();
      this._offVRSessionObserver = null;
      this._lastVRSessionHeartbeat = 0;
      // Drop any queued heavy work so it cannot run after exit (see
      // _deferHeavy/_drainDeferredWork) — the toggle's manager/feature state
      // it would have mutated may itself be torn down by the steps above.
      this._deferredWork = [];
      this._pendingWorkLabel = null;
      this._participantSync = null;
      this._toolManager = null;
      this._snapshotManager = null;
      this._controlManager = null;
      this._navigationController = null;
      this._offManipulationLock?.();
      this._offManipulationLock = null;
      this._manipulationLock = null;
      this._vrNotice = null;

      // Clear the room-wide "in VR" flag set in startExploration.
      await this._safeCleanupStep('presence.clearVRPresence', () =>
        presenceSystem.setVRPresence({ inVR: false, vrSessionId: null, vrRole: null })
      );

      // Emit events
      this._emit('sessionLeft', { sessionId: session.id });

      window.dispatchEvent(new CustomEvent('cia:vr-session-ended', {
        detail: { sessionId: session.id }
      }));

      this._leaving = false;
    }
  }

  // ===========================================================================
  // PARTICIPANT MANAGEMENT
  // ===========================================================================

  getActiveSession() {
    return this._activeSession;
  }

  /** Display name of the dataset in the active session, for spatial UI status text. */
  getActiveDatasetName() {
    const dataset = this._activeContext?.instance?.instanceData?.dataset;
    return dataset?.filename || dataset?.name || null;
  }

  getMyParticipant() {
    return this._activeSession?.getParticipant(getUserId());
  }

  /**
   * Other participants in the active session (excluding self), for the
   * spatial UI's collaborator go-to/follow controls.
   * @returns {Array<import('@Core/data/models/VRExplorationSession.js').VRParticipant>}
   */
  getOtherParticipants() {
    const session = this._activeSession;
    if (!session) return [];
    const selfId = getUserId();
    return session.participants.filter((p) => p.odUserId !== selfId);
  }

  /**
   * The session's participants in DISPLAY PRECEDENCE order, decorated with
   * everything a roster surface (the in-VR people drawer, the desktop
   * VRSessionPanel) needs to render a row without querying four subsystems
   * itself.
   *
   * Order — deliberately NOT alphabetical or join order alone:
   *   1. the data-control holder (who can change what everyone sees)
   *   2. the session host (who can take it back)
   *   3. the other VR explorers, oldest `joinedAt` first (stable: Phase 5's
   *      upsertParticipant stopped `joinedAt` being reset by every pose packet,
   *      so this ordering no longer reshuffles itself frame to frame)
   *   4. desktop observers
   * Ties inside a band break on userId so the list never jitters.
   *
   * Every field is read from an EXISTING source: `session.participants` for
   * identity/mode/joinedAt, `_participantSync.getRemoteParticipants()` for
   * liveness, `_manipulationLock` for the token, `yManipulatorState` (the same
   * room-global channel `_signalManipulation` writes and the desktop awareness
   * UI already observes) for activity, and `_getParticipantDataPosition` for
   * distance.
   *
   * @returns {Array<{userId:string, userName:string, userColor:string,
   *   mode:string, isSelf:boolean, isHost:boolean, isHolder:boolean,
   *   activity:string|null, isStale:boolean, distance:number|null}>}
   */
  getSessionRoster() {
    const session = this._activeSession;
    if (!session) return [];

    const selfId = getUserId();
    const hostId = session.ownerUserId || null;
    const holderId = this.getManipulationHolder()?.holderUserId || null;

    // Liveness comes from the Y.js pose map, which only carries REMOTE entries
    // (getRemoteParticipants filters self out) — so self is never stale.
    const liveById = new Map();
    try {
      for (const p of this._participantSync?.getRemoteParticipants?.() || []) {
        if (p?.odUserId) liveById.set(p.odUserId, p);
      }
    } catch (err) {
      log.warn(`VR roster: participant sync read failed — ${err?.message}`);
    }

    const selfPos = this._getParticipantDataPosition(selfId);

    const rows = (Array.isArray(session.participants) ? session.participants : [])
      .filter((p) => p?.odUserId)
      .map((p) => {
        const userId = p.odUserId;
        const isSelf = userId === selfId;
        const live = liveById.get(userId) || null;
        return {
          userId,
          userName: p.userName || userId,
          userColor: p.userColor || '#888888',
          mode: p.mode || PARTICIPATION_MODE.DESKTOP_OBSERVER,
          isSelf,
          isHost: !!hostId && userId === hostId,
          isHolder: !!holderId && userId === holderId,
          activity: this._readActivity(userId),
          // A participant the session model knows about but the pose map has
          // never seen is NOT stale — that is a desktop observer, or a VR peer
          // whose first packet has not landed yet.
          isStale: !isSelf && !!live?.isStale,
          distance: isSelf ? 0 : this._distanceBetween(selfPos, this._getParticipantDataPosition(userId)),
          joinedAt: typeof p.joinedAt === 'number' ? p.joinedAt : 0,
        };
      });

    const rank = (r) => {
      if (r.isHolder) return 0;
      if (r.isHost) return 1;
      return r.mode === PARTICIPATION_MODE.VR_EXPLORER ? 2 : 3;
    };
    rows.sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
      return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
    });

    // joinedAt was only carried to sort by; it is not part of the roster shape.
    return rows.map(({ joinedAt: _joinedAt, ...row }) => row);
  }

  /**
   * What this user is currently manipulating, from the room-global manipulator
   * channel (`syncManipulatorToYjs`). Returns null when idle.
   * @param {string} userId
   * @returns {string|null} e.g. 'dataset' | 'filter'
   * @private
   */
  _readActivity(userId) {
    try {
      return yManipulatorState?.get?.(userId)?.target || null;
    } catch {
      return null;
    }
  }

  /** @returns {number|null} Euclidean distance in data space, null if unknown. @private */
  _distanceBetween(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return Number.isFinite(d) ? d : null;
  }

  /**
   * A participant's last known head position, converted from THEIR OWN
   * physical XR space into shared data space using THEIR vrScale/vrOrigin
   * (each VR participant has an independent WebXR reference space — same
   * conversion as RemoteAvatarController._toScenePose / followService).
   * @param {string} userId
   * @returns {number[]|null} [x, y, z] in data space, or null if unknown
   * @private
   */
  _getParticipantDataPosition(userId) {
    const state = this._participantSync?.getParticipantState(userId);
    const headPose = state?.headPose;
    if (!headPose?.position) return null;

    const theirScale = typeof state.vrScale === 'number' ? state.vrScale : 1.0;
    const theirOrigin = Array.isArray(state.vrOrigin) ? state.vrOrigin : [0, 0, 0];
    return mapXRPointToData(headPose.position, theirScale, theirOrigin);
  }

  /**
   * One-shot: move the local vrOrigin so the target participant sits ~1.5m
   * in front of the user at chest height (same convention as
   * _computeAutoPlacement/enterIsolation). Keeps this user's own vrScale.
   * @param {string} userId
   * @returns {boolean} true if the target's position was known and applied
   */
  goToParticipant(userId) {
    const ctx = this._activeContext?.vrContext;
    if (!ctx) return false;
    const targetPos = this._getParticipantDataPosition(userId);
    if (!targetPos) return false;

    const vrScale = ctx.vrScale || 1.0;
    // Y stays on the ground plane rather than tracking the target's altitude:
    // you walk over to stand near them, you don't get teleported to their eye
    // height. Keeps the grounding invariant intact (see _groundY).
    ctx.vrOrigin = [
      targetPos[0],
      this._groundY(ctx),
      targetPos[2] + 1.5 / vrScale,
    ];
    this._emit('wentToParticipant', { userId });
    return true;
  }

  /**
   * Start soft positional follow of a participant: every frame, vrOrigin
   * lerps toward standing near their current position. Head orientation is
   * NEVER touched — the user keeps free head-look at all times (a hard
   * spectator lock is a motion-sickness hazard). Any local locomotion
   * input this frame cancels follow, mirroring followService's desktop
   * auto-unfollow-on-manual-move semantics.
   * @param {string} userId
   * @returns {boolean} true if a live session is active
   */
  followParticipant(userId) {
    if (!this._activeContext?.vrContext || !userId) return false;
    this._followTargetUserId = userId;
    this._emit('followingParticipantChanged', { userId });
    return true;
  }

  stopFollowing() {
    if (!this._followTargetUserId) return;
    this._followTargetUserId = null;
    this._emit('followingParticipantChanged', { userId: null });
  }

  isFollowingParticipant() {
    return this._followTargetUserId;
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
  // DATA-MANIPULATION TOKEN (delegated to VRManipulationLock)
  // ===========================================================================
  //
  // Exactly one participant at a time may push SHARED data changes — clip,
  // representation, glyphs, threshold, isosurface, dataset transform, and the
  // placement of annotations/measurements. The host holds the token by
  // default, can hand it to anyone, and everyone else can ask.
  //
  // WHAT IS DELIBERATELY NOT GATED: vrScale, vrOrigin, locomotion, follow,
  // isolation and probe. Those are this user's own viewpoint. Gating them
  // would mean four people in one headset session all being dragged around by
  // whoever holds the token, which is the opposite of the requirement.

  /**
   * Silent permission read. FAILS OPEN on a missing/throwing lock — every
   * gate in this file funnels through here, so a session constructed without
   * a lock (or a test that fabricates _activeContext directly) behaves
   * exactly as it did before this feature existed.
   * @returns {boolean}
   * @private
   */
  _hasManipulationControl() {
    const lock = this._manipulationLock;
    if (!lock || typeof lock.canManipulate !== 'function') return true;
    try {
      return lock.canManipulate() !== false;
    } catch (err) {
      log.warn(`VR manipulation lock read failed (allowing): ${err?.message}`);
      return true;
    }
  }

  /**
   * Permission check WITH in-headset feedback. Returns true when the action
   * may proceed; on refusal it flashes a notice naming the holder, because a
   * silently dropped patch is exactly the desync this feature exists to fix.
   * @param {string} [label] - what the user was trying to do, e.g. "Glyphs"
   * @returns {boolean}
   */
  _requireManipulationControl(label = 'That change') {
    if (this._hasManipulationControl()) return true;
    const holderName = this.getManipulationHolder()?.holderUserName;
    this._flashVRNotice(
      holderName
        ? `${label} needs data control — ${holderName} has it`
        : `${label} needs data control`
    );
    return false;
  }

  /** Ask the current holder for the token. @returns {boolean} */
  requestManipulationControl() {
    if (!this._manipulationLock) return false;
    const ok = this._manipulationLock.requestControl() === true;
    this._flashVRNotice(ok ? 'Control requested' : 'You already have data control');
    return ok;
  }

  /** Hand the token to another participant. @returns {boolean} */
  grantManipulationControlTo(userId, userName) {
    const ok = this._manipulationLock?.grantTo(userId, userName) === true;
    if (ok) {
      const name =
        userName ||
        this.getOtherParticipants().find((p) => p.odUserId === userId)?.userName ||
        userId;
      this._flashVRNotice(`Data control given to ${name}`);
    }
    return ok;
  }

  /** Give the token back to the session host. @returns {boolean} */
  releaseManipulationControl() {
    const ok = this._manipulationLock?.release() === true;
    if (ok) this._flashVRNotice('Data control released');
    return ok;
  }

  /**
   * @returns {{holderUserId:string, holderUserName:string, grantedBy:string,
   *   grantedAt:number, heartbeat:number}|null} null when nobody live holds it
   */
  /**
   * One-shot snapshot of everything that has to MATCH between two headsets for
   * them to share a world. Logged on session start and callable from the
   * console (remote-debug a Quest via chrome://inspect).
   *
   * This exists because the overwhelmingly common multi-headset failure — the
   * two devices being in different sessions — is invisible in-headset. Each
   * user sees a working VR scene and an empty People list, with nothing to say
   * whether the problem is the room, the view, the network, or the token. BOTH
   * `roomId` and `sessionKey` must be identical on the two devices — sessionKey
   * is what convergence actually keys on (see _resolveSessionKey; usually the
   * dataset id, NOT viewConfigId — each client mints its own ViewConfiguration,
   * so comparing viewConfigId across headsets is meaningless and was the
   * original bug here). A null sessionKey means neither a dataset id nor a
   * viewConfigId was available, which silently defeats convergence entirely.
   *
   * @returns {object} plain, loggable snapshot
   */
  getCollaborationDiagnostics() {
    let roster = [];
    try {
      roster = this.getSessionRoster() || [];
    } catch {
      roster = [];
    }
    const holder = (() => {
      try {
        return this.getManipulationHolder();
      } catch {
        return null;
      }
    })();

    return {
      roomId: sessionManager.getRoomId?.() ?? null,
      vrSessionId: this._activeContext?.session?.id ?? null,
      sessionKey: this._resolveSessionKey(this._activeContext?.instance) ?? null,
      viewConfigId: this._activeContext?.instance?.viewConfigId ?? null,
      userId: getUserId(),
      userName: getUserName(),
      participants: roster.length,
      peers: roster.filter((r) => !r.isSelf).map((r) => r.userName || r.odUserId),
      controlHolder: holder?.holderUserName || holder?.holderUserId || '(unheld)',
      voiceConnected: (() => {
        try {
          return this.isVoiceConnected();
        } catch {
          return false;
        }
      })(),
    };
  }

  /** @private */
  _logCollaborationDiagnostics(reason) {
    try {
      const d = this.getCollaborationDiagnostics();
      log.info(
        `VR collab [${reason}] room=${d.roomId} session=${d.vrSessionId} ` +
          `key=${d.sessionKey} view=${d.viewConfigId} as=${d.userName} participants=${d.participants} ` +
          `peers=[${d.peers.join(', ')}] control=${d.controlHolder} voice=${d.voiceConnected}`
      );
      if (!d.sessionKey) {
        log.warn(
          'VR collab: sessionKey is null (no dataset id or viewConfigId) — ' +
            'VR session convergence cannot match it against the other headset.'
        );
      }
    } catch (err) {
      log.warn(`VR collab diagnostics failed: ${err?.message}`);
    }
  }

  getManipulationHolder() {
    return this._manipulationLock?.getHolder() ?? null;
  }

  /** @returns {boolean} */
  isManipulationHolder() {
    return this._manipulationLock?.isHeldByMe() === true;
  }

  /** @returns {Array<{userId:string,userName:string,atMs:number}>} */
  getManipulationRequests() {
    return this._manipulationLock?.getRequests() ?? [];
  }

  /** Approve a pending request (holder/host only). @returns {boolean} */
  approveManipulationRequest(userId) {
    return this._manipulationLock?.approveRequest(userId) === true;
  }

  /** Deny a pending request (holder/host only). @returns {boolean} */
  denyManipulationRequest(userId) {
    return this._manipulationLock?.denyRequest(userId) === true;
  }

  // ---------------------------------------------------------------------------
  // IN-VR NOTICE
  // ---------------------------------------------------------------------------

  /**
   * Show a transient message on the spatial menu's status line. Reuses the
   * EXISTING dirty-checked status canvas (VRSpatialMenuModel.getStatusLine →
   * VTKVRSpatialUI._layoutStatus) rather than adding an actor: a notice that
   * costs a texture upload only while it is on screen.
   * @param {string} text
   * @param {number} [ms=VR_NOTICE_MS]
   */
  _flashVRNotice(text, ms = VR_NOTICE_MS) {
    if (!text) return;
    this._vrNotice = { text, untilMs: Date.now() + ms };
  }

  /**
   * The live notice text, or null once it has expired.
   * @returns {string|null}
   */
  getVRNotice() {
    const notice = this._vrNotice;
    if (!notice) return null;
    if (Date.now() >= notice.untilMs) {
      this._vrNotice = null;
      return null;
    }
    return notice.text;
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY SIGNAL
  // ---------------------------------------------------------------------------

  /**
   * Light this user up as the active manipulator for everyone, VR and desktop
   * alike, through the EXISTING yjsSetup manipulator channel — the same one
   * VTKInstanceHandler uses for desktop camera drags, already observed by
   * every desktop client via onManipulatorChange. No new plumbing, no new
   * Y.js map, and desktop awareness UI gets VR activity for free.
   *
   * @param {'dataset'|'filter'} target
   * @param {string} [action='manipulating']
   * @private
   */
  _signalManipulation(target, action = 'manipulating') {
    try {
      syncManipulatorToYjs(getUserId(), getUserName(), target, action);
      // In-headset counterpart of the desktop awareness UI: a marker on THIS
      // user's avatar so the other headsets can see who is acting. Driven here
      // — at manipulation-event rate, then again on the idle timer — never per
      // frame; it costs one Y.js presence write (see AvatarNetworkSync's
      // unchanged-payload short-circuit).
      vrAvatarSystem.setLocalActivity?.(target);
      if (this._manipulatorIdleTimer) clearTimeout(this._manipulatorIdleTimer);
      this._manipulatorIdleTimer = setTimeout(() => {
        this._manipulatorIdleTimer = null;
        this._clearManipulationSignal();
      }, MANIPULATOR_IDLE_MS);
    } catch (err) {
      log.warn(`VR manipulator signal failed: ${err?.message}`);
    }
  }

  /** @private */
  _clearManipulationSignal() {
    if (this._manipulatorIdleTimer) {
      clearTimeout(this._manipulatorIdleTimer);
      this._manipulatorIdleTimer = null;
    }
    try {
      syncManipulatorToYjs(getUserId(), null, null, null);
      vrAvatarSystem.setLocalActivity?.(null);
    } catch (err) {
      log.warn(`VR manipulator clear failed: ${err?.message}`);
    }
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

  /**
   * Archive the active measurement path and begin a disconnected one. Backs the
   * measure tool's contextual "New Path" button — without it, the only way to
   * start measuring elsewhere would be to undo every point first.
   * @returns {object|null} the archived path, or null if nothing was drawn
   */
  startNewMeasurementPath() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'measure' || typeof tool.newPath !== 'function') return null;
    const action = tool.newPath();
    if (!action) return null;
    this._handleToolAction(action);
    return action.data ?? null;
  }

  getAvailableTools() {
    return this._toolManager?.getAvailableTools() || [];
  }

  /**
   * Advance the active tool's pending annotation label to the next preset
   * (VRAnnotationTool.cycleLabel — the only VR text-entry mechanism, see
   * ANNOTATION_LABEL_PRESETS). No-ops if the active tool doesn't support
   * labels. Invoked by the spatial menu's "Label" button.
   * @returns {string|null} the newly-selected label, or null if unsupported
   */
  cycleAnnotationLabel() {
    const tool = this._toolManager?.getActiveTool?.();
    if (typeof tool?.cycleLabel !== 'function') return null;
    const label = tool.cycleLabel();
    this._emit('annotationLabelChanged', { label });
    return label;
  }

  /** @returns {string|null} the label the next placed annotation will carry */
  getPendingAnnotationLabel() {
    const tool = this._toolManager?.getActiveTool?.();
    return typeof tool?.getPendingLabel === 'function' ? tool.getPendingLabel() : null;
  }

  /**
   * Invert the active Clip tool's plane direction. Routes the resulting
   * clip-box-updated action through the same _handleToolAction path the
   * A-button shortcut uses, so persistence/broadcast stays consistent.
   * No-ops if Clip isn't the active tool. Invoked by the spatial menu's
   * contextual "Invert" button.
   */
  invertClipPlane() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'clip' || typeof tool.invert !== 'function') return;
    const action = tool.invert();
    if (action) this._handleToolAction(action);
  }

  /**
   * Cycle the clip plane's axis constraint (free -> X -> Y -> Z). Backs the
   * contextual "Axis" button, which is the only way to get an exactly
   * axis-aligned cut on Vision Pro — free-aiming a plane by hand with no grip
   * to brace against is not precise.
   * @returns {string|null} the new axis lock, or null when free
   */
  cycleClipAxis() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'clip' || typeof tool.cycleAxisLock !== 'function') return null;
    const action = tool.cycleAxisLock();
    if (action) this._handleToolAction(action);
    return tool.getAxisLock?.() ?? null;
  }

  /**
   * Reset the active Clip tool's plane. Same routing as invertClipPlane().
   * Invoked by the spatial menu's contextual "Reset" button.
   */
  resetClipPlane() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'clip' || typeof tool.reset !== 'function') return;
    const action = tool.reset();
    if (action) this._handleToolAction(action);
  }

  /**
   * Cycle the active Annotate tool's marker colour. No-ops (returns null) if
   * Annotate isn't the active tool. Invoked by the spatial menu's contextual
   * "Color" button.
   *
   * Replaced cycleAnnotationMode (marker/text/drawing), which changed only
   * stored metadata — the tool drew the same sphere for every mode, so the
   * button appeared to do nothing.
   * @returns {string|null} the newly-selected colour name
   */
  cycleAnnotationColor() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate' || typeof tool.cycleColor !== 'function') return null;
    return tool.cycleColor();
  }

  /**
   * Current state of the active Annotate tool's in-progress draft (a fixed
   * point with nothing persisted yet). Read every frame by the spatial
   * keyboard's status line. Returns null when Annotate isn't the active tool
   * or no draft is open — the keyboard renderer treats null as "not shown".
   * @returns {{active:boolean,text:string,fallbackText:string,position:object,color:*}|null}
   */
  getAnnotationDraft() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate' || typeof tool.getDraft !== 'function') return null;
    return tool.getDraft();
  }

  /**
   * Append characters to the active draft's text buffer. No-ops (returns
   * null) if Annotate isn't active or no draft is open. Invoked per keypress
   * by the spatial keyboard's kbd-char / kbd-preset keys.
   * @param {string} str
   * @returns {string|null} the new draft text, or null if unsupported
   */
  appendAnnotationDraft(str) {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate' || typeof tool.appendDraftText !== 'function') return null;
    return tool.appendDraftText(str);
  }

  /**
   * Remove the last character of the active draft's text buffer. Same guard
   * shape as appendAnnotationDraft. Invoked by the keyboard's Del key.
   * @returns {string|null} the new draft text, or null if unsupported
   */
  backspaceAnnotationDraft() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate' || typeof tool.backspaceDraft !== 'function') return null;
    return tool.backspaceDraft();
  }

  /**
   * Save the active draft as a real, persisted, broadcast annotation.
   * Routes the resulting annotation-created action through _handleToolAction
   * — never call _persistVRAnnotation directly — so persistence and _emit
   * stay behind the single choke point every other tool action goes through
   * (see undoLastToolAction, invertClipPlane). Invoked by the keyboard's
   * Save key.
   * @returns {boolean} true if a draft was confirmed
   */
  confirmAnnotationDraft() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate') return false;
    const action = tool.confirmDraft?.();
    if (action) this._handleToolAction(action);
    return !!action;
  }

  /**
   * Discard the active draft — nothing persisted, nothing broadcast. Same
   * _handleToolAction routing discipline as confirmAnnotationDraft. Invoked
   * by the keyboard's Cancel key.
   * @returns {boolean} true if a draft was cancelled
   */
  cancelAnnotationDraft() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'annotate') return false;
    const action = tool.cancelDraft?.();
    if (action) this._handleToolAction(action);
    return !!action;
  }

  /**
   * Toggle the active Probe tool's continuous-sampling mode. No-ops (returns
   * false) if Probe isn't the active tool. Invoked by the spatial menu's
   * contextual "Continuous" button.
   * @returns {boolean} the new continuous-mode state
   */
  toggleProbeContinuous() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'probe' || typeof tool.setContinuousMode !== 'function') return false;
    const next = !tool.isContinuousMode();
    tool.setContinuousMode(next);
    return next;
  }

  /** @returns {boolean} whether the active Probe tool is in continuous-sampling mode */
  isProbeContinuous() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'probe' || typeof tool.isContinuousMode !== 'function') return false;
    return tool.isContinuousMode();
  }

  /**
   * Clear the active Probe tool's sample history. No-ops if Probe isn't the
   * active tool. Invoked by the spatial menu's contextual "Clear" button.
   */
  clearProbeHistory() {
    const tool = this._toolManager?.getActiveTool?.();
    if (tool?.id !== 'probe' || typeof tool.clearHistory !== 'function') return;
    tool.clearHistory();
  }

  // ===========================================================================
  // VOICE (delegated to voiceRoomService)
  // ===========================================================================
  //
  // Thin pass-through so the spatial menu's Mute/Voice buttons can control the
  // same LiveKit voice room the voice bar/tab use, without leaving VR. Room
  // name is derived from the collaboration session (getVoiceRoomName), not
  // reinvented here.

  /** @returns {boolean} whether the local participant is currently muted */
  isVoiceMuted() {
    return voiceRoomService.isMuted;
  }

  /**
   * Toggle the local participant's mute state. Fire-and-forget: toggleMute()
   * is async, but the spatial menu's activate() must return synchronously —
   * the button's tint catches up on the next frame once isVoiceMuted()
   * re-reads the (by-then-updated) state.
   * @returns {boolean} the new muted state, read optimistically before the
   *   promise resolves
   */
  toggleVoiceMute() {
    voiceRoomService.toggleMute().catch((err) => log.warn('Voice mute toggle failed:', err?.message));
    return !voiceRoomService.isMuted;
  }

  /** @returns {boolean} whether currently connected to the session's voice room */
  isVoiceConnected() {
    return voiceRoomService.isConnected();
  }

  /**
   * Join or leave the session's voice room. Fire-and-forget, same rationale
   * as toggleVoiceMute().
   * @returns {boolean} the new connected state, read optimistically
   */
  toggleVoiceConnection() {
    if (voiceRoomService.isConnected()) {
      voiceRoomService.leaveRoom().catch((err) => log.warn('Voice leave failed:', err?.message));
      return false;
    }
    voiceRoomService
      .joinRoom(getVoiceRoomName(), getUserName())
      .catch((err) => log.warn('Voice join failed:', err?.message));
    return true;
  }

  // ===========================================================================
  // NAVIGATION (delegated to VRNavigationController)
  // ===========================================================================

  setNavigationMode(mode) {
    if (!this._navigationController) return;
    // MOVE_OBJECT is the one locomotion mode that is not a per-user viewpoint:
    // its drag rewrites the SHARED dataset transform. Letting a non-holder
    // enter it means they drag the data locally, _pushVisualizationPatch
    // silently drops the patch, and their view is permanently out of step with
    // everyone else's — worse than refusing the mode outright.
    if (mode === EXPLORATION_MODES.MOVE_OBJECT && !this._requireManipulationControl('Move Object')) {
      return null;
    }
    this._navigationController.setMode(mode);
    this._emit('navigationModeChanged', { mode });
    return mode;
  }

  getNavigationMode() {
    return this._navigationController?.getMode();
  }

  cycleNavigationMode() {
    if (!this._navigationController) return null;
    let newMode = this._navigationController.cycleMode();
    // Same reasoning as setNavigationMode — the cycle must not be able to park
    // a non-holder in MOVE_OBJECT through the back door. Step past it once
    // (the cycle is finite and only one entry is gated, so this terminates).
    if (newMode === EXPLORATION_MODES.MOVE_OBJECT && !this._hasManipulationControl()) {
      this._requireManipulationControl('Move Object');
      newMode = this._navigationController.cycleMode();
    }
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
    // Pivot the preset about the floor under the user, so Overview/Normal/
    // Detail resize the dataset in place instead of hurling it toward or away
    // from them. Unpivoted, a preset tap is a homothety about the XR origin —
    // the same defect the two-hand gesture had, and a 10x preset jump makes it
    // far more violent. See VRScaleController.setScale.
    this._navigationController.setScale(scale, this._lastHeadFloorXR);
    // setScale's pivot deliberately leaves Y untouched (see its doc comment),
    // which is exactly right for the OLD scale-independent floor grounding
    // but leaves the pedestal (see PEDESTAL_HEIGHT_M) stale at the previous
    // scale's height. Re-ground now that vrScale has changed — a one-shot
    // preset tap, not a live gesture, so there's no per-frame pivot logic to
    // fight with here (contrast the two-hand gesture, which deliberately
    // holds Y fixed for its own duration — see VRScaleController._pivotedOrigin).
    const ctx = this._activeContext?.vrContext;
    if (ctx && Array.isArray(ctx.vrOrigin)) {
      ctx.vrOrigin[1] = this._groundY(ctx);
    }
    this._emit('vrScaleChanged', { scale });
  }

  // ===========================================================================
  // VISUALIZATION (representation cycling + glyph toggle)
  // ===========================================================================
  //
  // These drive the SAME desktop implementations the InstanceToolsPanel uses
  // (instanceTools / vtkGlyphFeature) and push the SAME visualizationSyncService
  // patch its menus push, so an in-VR change is indistinguishable from a desktop
  // one to every collaborator (and persists identically for late joiners).

  /**
   * Cycle the active dataset's surface representation
   * surface → wireframe → points → surface, mirroring the desktop Appearance
   * menu. Renders locally via instanceTools.setRepresentation AND pushes the
   * `representation` field to collaborators + persistence.
   * @returns {string|null} the new representation, or null if no active dataset
   */
  cycleRepresentation() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;

    const order = ['surface', 'wireframe', 'points'];
    const current = instanceTools.getRepresentation?.(instanceId) || 'surface';
    const next = order[(order.indexOf(current) + 1) % order.length];

    // Deferred like the other menu-triggered visualization changes (see
    // _deferHeavy / toggleGlyphs) — the mapper rebuild + sync patch run one
    // frame later; the optimistic `next` is returned immediately.
    // boundsMayChange: false — representation only changes how the mapper
    // draws existing geometry (surface/wireframe/points), never its bounds.
    this._deferHeavy('Applying appearance…', () => {
      instanceTools.setRepresentation?.(instanceId, next);
      this._pushVisualizationPatch({ representation: next });
    }, { boundsMayChange: false });
    this._emit('representationChanged', { representation: next });
    return next;
  }

  /**
   * Set one specific representation, backing the Appearance drawer's discrete
   * Surface/Wire/Points buttons. Same effect as cycleRepresentation without the
   * guessing — cycleRepresentation is kept for voice commands and any other
   * caller that genuinely wants "next".
   * @param {'surface'|'wireframe'|'points'} mode
   * @returns {string|null} the applied mode, or null with no active dataset
   */
  setRepresentation(mode) {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;
    if (!['surface', 'wireframe', 'points'].includes(mode)) {
      log.warn(`VR setRepresentation: unknown mode "${mode}"`);
      return null;
    }

    // Deferred — see cycleRepresentation. boundsMayChange: false, same reason.
    this._deferHeavy('Applying appearance…', () => {
      instanceTools.setRepresentation?.(instanceId, mode);
      this._pushVisualizationPatch({ representation: mode });
    }, { boundsMayChange: false });
    this._emit('representationChanged', { representation: mode });
    return mode;
  }

  // ===========================================================================
  // SCENE CHROME — data reference grid + labelled axes
  // ===========================================================================
  //
  // These reuse VTKSceneFeature, the same code the desktop scene menu drives.
  // Because VR shares the desktop renderer, a grid toggled on either side is
  // already visible in the other — only the in-VR CONTROL was missing.
  //
  // Bounds are passed explicitly. VTKSceneFeature otherwise sizes itself from
  // renderer.computeVisiblePropBounds(), which in a VR session also sees
  // VREnvironment's floor and walls (~20 m) — so the grid would be built around
  // the room rather than the data. vrContext.dataBounds is already scoped to
  // the data actor alone.
  //
  // Deliberately NOT synced to collaborators: pushSharedVisualizationUpdate has
  // no scene field and applySharedState no scene branch, and these are viewer
  // chrome in the same category as isolation and the Views grid, both already
  // session-local. Syncing would mean new Y.js schema + ViewConfiguration +
  // applySharedState work for no collaborative value. If that changes, the
  // shape is: patch { scene: vtkSceneFeature.getState(id) }, and an
  // applySharedState branch calling setGridVisible/setGridPlane/setAxesVisible.

  /** @private Shared preamble for the scene-chrome wrappers. */
  _sceneTarget() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;
    return { instanceId, bounds: this._activeContext?.vrContext?.dataBounds || null };
  }

  /**
   * Toggle the data reference grid.
   * Distinct from toggleGridMode(), which lays out OTHER open views in space.
   * @returns {boolean} whether the grid is now visible
   */
  toggleReferenceGrid() {
    const t = this._sceneTarget();
    if (!t) return false;
    try {
      vtkSceneFeature.toggleGrid(t.instanceId, { bounds: t.bounds });
    } catch (err) {
      log.warn(`VR reference grid toggle failed: ${err?.message}`);
      return false;
    }
    const visible = this.isReferenceGridVisible();
    this._emit('referenceGridToggled', { visible });
    return visible;
  }

  /** @returns {boolean} */
  isReferenceGridVisible() {
    const t = this._sceneTarget();
    if (!t) return false;
    return !!vtkSceneFeature.getState?.(t.instanceId)?.showGrid;
  }

  /**
   * Cycle the reference grid's plane. Starts at xz (the "floor" orientation,
   * which is what a grid usually means in a room-scale headset).
   * @returns {string|null} the new plane
   */
  cycleGridPlane() {
    const t = this._sceneTarget();
    if (!t) return null;
    const order = ['xz', 'xy', 'yz'];
    const current = vtkSceneFeature.getState?.(t.instanceId)?.gridPlane || 'xz';
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
      vtkSceneFeature.setGridPlane(t.instanceId, next, { bounds: t.bounds });
    } catch (err) {
      log.warn(`VR grid plane cycle failed: ${err?.message}`);
      return null;
    }
    this._emit('gridPlaneChanged', { plane: next });
    return next;
  }

  /**
   * Toggle the labelled cube axes around the data.
   * @returns {boolean} whether the axes are now visible
   */
  toggleDataAxes() {
    const t = this._sceneTarget();
    if (!t) return false;
    try {
      vtkSceneFeature.toggleAxes(t.instanceId, { bounds: t.bounds });
    } catch (err) {
      log.warn(`VR data axes toggle failed: ${err?.message}`);
      return false;
    }
    const visible = this.areDataAxesVisible();
    this._emit('dataAxesToggled', { visible });
    return visible;
  }

  /** @returns {boolean} */
  areDataAxesVisible() {
    const t = this._sceneTarget();
    if (!t) return false;
    return !!vtkSceneFeature.getState?.(t.instanceId)?.showAxes;
  }

  // ===========================================================================
  // FILTERS — threshold + isosurface
  // ===========================================================================

  /** @private */
  _instanceId() {
    return this._activeContext?.instance?.instanceId || null;
  }

  /**
   * Threshold needs at least one scalar array to act on. scanAvailableArrays
   * runs at load time, so this is just a read.
   * @returns {boolean}
   */
  isThresholdAvailable() {
    const id = this._instanceId();
    if (!id) return false;
    const arrays = vtkThresholdFeature.getState?.(id)?.availableArrays;
    return Array.isArray(arrays) && arrays.length > 0;
  }

  /** @returns {boolean} */
  isThresholdEnabled() {
    const id = this._instanceId();
    return !!(id && vtkThresholdFeature.getState?.(id)?.enabled);
  }

  /** @returns {object|null} */
  getThresholdState() {
    const id = this._instanceId();
    return id ? vtkThresholdFeature.getState?.(id) ?? null : null;
  }

  /**
   * Toggle the threshold filter, syncing the result to collaborators through
   * the existing `threshold` visualization channel (the desktop menu pushes the
   * same patch).
   * @returns {boolean} whether threshold is now enabled
   */
  toggleThresholdFilter() {
    const id = this._instanceId();
    if (!id || !this.isThresholdAvailable()) return false;
    const wasEnabled = this.isThresholdEnabled();

    // Availability + current-state reads above stay synchronous; the actual
    // filter (re)application is the expensive part — deferred, same
    // reasoning as toggleGlyphs (see _deferHeavy).
    this._deferHeavy(wasEnabled ? 'Removing threshold…' : 'Applying threshold…', () => {
      try {
        vtkThresholdFeature.toggleThreshold(id);
      } catch (err) {
        log.warn(`VR threshold toggle failed: ${err?.message}`);
        return;
      }
      this._syncThreshold(id);
      this._emit('thresholdToggled', { enabled: this.isThresholdEnabled() });
    });

    return !wasEnabled;
  }

  /** Cycle threshold mode: between -> above -> below. @returns {string|null} */
  cycleThresholdMode() {
    const id = this._instanceId();
    if (!id) return null;
    const order = ['between', 'above', 'below'];
    const current = vtkThresholdFeature.getState?.(id)?.mode || 'between';
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
      vtkThresholdFeature.setMode(id, next);
    } catch (err) {
      log.warn(`VR threshold mode cycle failed: ${err?.message}`);
      return null;
    }
    this._syncThreshold(id);
    return next;
  }

  /** Cycle which scalar array the threshold acts on. @returns {string|null} */
  cycleThresholdArray() {
    const id = this._instanceId();
    if (!id) return null;
    const state = vtkThresholdFeature.getState?.(id);
    const arrays = state?.availableArrays;
    if (!Array.isArray(arrays) || arrays.length === 0) return null;

    const names = arrays.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
    if (!names.length) return null;
    const next = names[(names.indexOf(state?.activeArray) + 1) % names.length];
    try {
      vtkThresholdFeature.selectArray(id, next);
    } catch (err) {
      log.warn(`VR threshold array cycle failed: ${err?.message}`);
      return null;
    }
    this._syncThreshold(id);
    return next;
  }

  /** @private Push the threshold config through the shared channel. */
  _syncThreshold(instanceId) {
    try {
      const config = vtkThresholdFeature.getConfigForSync?.(instanceId);
      if (config) this._pushVisualizationPatch({ threshold: config });
    } catch (err) {
      log.warn(`VR threshold sync failed: ${err?.message}`);
    }
  }

  /**
   * Isosurface requires volume/image data, so it is simply unavailable for
   * plain polydata — the menu dims the button rather than letting it no-op.
   * @returns {boolean}
   */
  isIsosurfaceAvailable() {
    const id = this._instanceId();
    const instanceData = this._activeContext?.instance?.instanceData;
    if (!id || !instanceData?.imageData) return false;
    try {
      return vtkIsosurfaceFeature.isAvailable?.(id, instanceData) !== false;
    } catch {
      return false;
    }
  }

  /** @returns {boolean} */
  isIsosurfaceEnabled() {
    const id = this._instanceId();
    return !!(id && vtkIsosurfaceFeature.getState?.(id)?.enabled);
  }

  /** @returns {object|null} */
  getIsosurfaceState() {
    const id = this._instanceId();
    return id ? vtkIsosurfaceFeature.getState?.(id) ?? null : null;
  }

  /**
   * Toggle isosurface extraction.
   *
   * Session-local on purpose: unlike threshold, isosurface has no field in
   * pushSharedVisualizationUpdate and no applySharedState branch, so syncing it
   * would mean extending the Y.js schema and ViewConfiguration. Left as a
   * follow-up rather than half-wired.
   *
   * enableIsosurface is async; the returned boolean is the optimistic target
   * state, and the menu re-reads getState on the next frame regardless.
   * @returns {boolean}
   */
  toggleIsosurface() {
    const id = this._instanceId();
    if (!id || !this.isIsosurfaceAvailable()) return false;
    const enabled = this.isIsosurfaceEnabled();

    // Availability + current-state reads above stay synchronous so the
    // button can still report "unavailable" immediately. The actual marching
    // cubes enable/disable is the expensive part — deferred, same reasoning
    // as toggleGlyphs (see _deferHeavy).
    if (enabled) {
      this._deferHeavy('Removing isosurface…', () => {
        try {
          vtkIsosurfaceFeature.disableIsosurface(id);
        } catch (err) {
          log.warn(`VR isosurface toggle failed: ${err?.message}`);
        }
      });
    } else {
      const imageData = this._activeContext?.instance?.instanceData?.imageData;
      this._deferHeavy('Building isosurface…', () => {
        try {
          const r = vtkIsosurfaceFeature.enableIsosurface?.(id, imageData);
          // Fire-and-forget: must never block or break the XR frame loop.
          if (r && typeof r.catch === 'function') {
            r.catch((err) => log.warn(`VR isosurface enable failed: ${err?.message}`));
          }
        } catch (err) {
          log.warn(`VR isosurface toggle failed: ${err?.message}`);
        }
      });
    }

    this._emit('isosurfaceToggled', { enabled: !enabled });
    return !enabled;
  }

  // ===========================================================================
  // SHARED NUMERIC STEPPER
  // ===========================================================================

  /** @private Lazily build the value editor, bound to this manager. */
  _valueEditor() {
    if (!this._valueEditorModel) {
      this._valueEditorModel = new VRValueEditorModel(this);
    }
    return this._valueEditorModel;
  }

  /** Retarget the stepper to the next editable value. @returns {string|null} */
  cycleValueTarget() {
    return this._valueEditor().cycleTarget();
  }

  /** @returns {number|null} the new value */
  nudgeValue(steps) {
    return this._valueEditor().nudge(steps);
  }

  /** @returns {number|null} the restored value */
  resetValue() {
    return this._valueEditor().reset();
  }

  /** @returns {string} one-line readout for the status line */
  getValueReadout() {
    return this._valueEditor().getReadout();
  }

  // --- Value accessors the stepper's targets read/write ----------------------
  //
  // Thin passthroughs to instanceTools / the feature modules, each pushing the
  // same sync patch the desktop controls push. Holding "+" fires these many
  // times, so the sync side is throttled (see _pushThrottledPatch).

  /** @returns {number|null} */
  getPointSize() {
    const id = this._instanceId();
    return id ? instanceTools.getPointSize?.(id) ?? null : null;
  }

  setPointSize(value) {
    const id = this._instanceId();
    if (!id) return;
    instanceTools.setPointSize?.(id, value);
    this._pushThrottledPatch({ pointSize: value });
  }

  /** @returns {number|null} */
  getLineWidth() {
    const id = this._instanceId();
    return id ? instanceTools.getLineWidth?.(id) ?? null : null;
  }

  setLineWidth(value) {
    const id = this._instanceId();
    if (!id) return;
    instanceTools.setLineWidth?.(id, value);
    this._pushThrottledPatch({ lineWidth: value });
  }

  /** @returns {string|null} current representation, for target availability */
  getRepresentation() {
    const id = this._instanceId();
    return id ? instanceTools.getRepresentation?.(id) ?? null : null;
  }

  setThresholdMin(value) {
    const id = this._instanceId();
    if (!id) return;
    vtkThresholdFeature.setMinValue?.(id, value);
    this._pushThrottledPatch(null, () => ({
      threshold: vtkThresholdFeature.getConfigForSync?.(id),
    }));
  }

  setThresholdMax(value) {
    const id = this._instanceId();
    if (!id) return;
    vtkThresholdFeature.setMaxValue?.(id, value);
    this._pushThrottledPatch(null, () => ({
      threshold: vtkThresholdFeature.getConfigForSync?.(id),
    }));
  }

  setIsovalue(value) {
    const id = this._instanceId();
    if (!id) return;
    // Session-local, like the isosurface toggle itself — see toggleIsosurface.
    vtkIsosurfaceFeature.setIsovalue?.(id, value);
  }

  setIsosurfaceOpacity(value) {
    const id = this._instanceId();
    if (!id) return;
    vtkIsosurfaceFeature.setOpacity?.(id, value);
  }

  /**
   * Push a visualization patch at most ~20/sec. A held "+" button fires every
   * frame; without this each tap would become a Y.js broadcast and a
   * ViewConfiguration write. Mirrors the mid-drag throttle in
   * _pushObjectTransformPatch.
   *
   * @param {object|null} patch - static patch, or null when it must be built lazily
   * @param {Function} [build] - lazy builder, used when the patch is expensive
   * @private
   */
  _pushThrottledPatch(patch, build) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - (this._lastValuePatchAt || 0) < 50) return;
    this._lastValuePatchAt = now;

    const payload = patch || (typeof build === 'function' ? build() : null);
    if (payload) this._pushVisualizationPatch(payload);
  }

  /** Current surface representation of the active dataset (for menu highlight). */
  getRepresentation() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;
    return instanceTools.getRepresentation?.(instanceId) || 'surface';
  }

  /**
   * Toggle vector/scalar glyphs on the active dataset, mirroring the desktop
   * glyph menu handler (VTKInstanceHandler). Disables if currently enabled;
   * otherwise enables using the first available vector array for orientation,
   * guarded by the same availability check the desktop menu uses. Pushes the
   * same `glyph` sync patch so collaborators + persistence converge.
   * @returns {boolean} the new enabled state (false if unavailable / no arrays)
   */
  toggleGlyphs() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return false;

    const state = vtkGlyphFeature.getState(instanceId);
    if (!state) return false;

    if (state.enabled) {
      // Disabling is cheap, but deferred anyway for symmetry with enable —
      // see _deferHeavy — and so the two can never race out of FIFO order if
      // the user taps twice before a frame drains.
      this._deferHeavy('Removing glyphs…', () => {
        vtkGlyphFeature.disableGlyphs(instanceId);
        this._pushVisualizationPatch({ glyph: vtkGlyphFeature.getConfigForSync(instanceId) });
      });
      this._emit('glyphsToggled', { enabled: false });
      return false;
    }

    // Cheap guards stay synchronous so the button can still report "can't do
    // that" immediately, without ever touching the deferred queue.
    const { vectorArrays = [], scalarArrays = [] } = state;
    if (!isGlyphFeatureAvailable(vectorArrays, scalarArrays)) {
      log.warn('VR glyph toggle: no usable vector/scalar point-data arrays on this dataset');
      return false;
    }

    const polydata = this._activeContext?.instance?.instanceData?.polydata;
    if (!polydata) {
      log.warn('VR glyph toggle: dataset polydata unavailable');
      return false;
    }

    // Pick settings the DATA can actually satisfy, rather than inheriting
    // VTKGlyphFeature's defaults.
    //
    // Those defaults are glyphType 'arrow' (requiresOrientation) with
    // scalingMode 'vector', and VR passed orientationArray = undefined when the
    // dataset had no vector array. Worse, SCALING_MODES maps 'vector' to 2,
    // which in vtk.js is SCALE_BY_COMPONENTS, not magnitude — so with a
    // 1-component scalar array vtk.js logs an error and nulls the scale array.
    // Net result: every glyph drew at scaleFactor 1.0 in ABSOLUTE DATA UNITS,
    // unoriented — invisible specks on a large dataset, scene-swamping blobs on
    // a small one. That is the "Glyphs doesn't work" report.
    //
    // The shared SCALING_MODES map is left alone deliberately: correcting it is
    // desktop-visible and would change existing saved glyph configs. Tracked
    // separately; here we just choose the one entry that maps correctly
    // ('scalar' -> 1 -> SCALE_BY_MAGNITUDE) and an explicit type/array pair.
    const vectorName = vectorArrays?.[0]?.name;
    const scalarName = scalarArrays?.[0]?.name;
    const options = vectorName
      ? {
          glyphType: 'arrow',
          scalingMode: 'scalar',
          orientationArray: vectorName,
          scaleArray: vectorName,
        }
      : {
          // 'sphere' is requiresOrientation:false, so it renders correctly with
          // no vector data — unlike 'arrow', which has nothing to point along.
          glyphType: 'sphere',
          scalingMode: 'off',
          orientationArray: null,
          colorMode: scalarName ? 'scalar' : 'solid',
          colorArray: scalarName || null,
        };
    options.scaleFactor = this._autoGlyphScaleFactor(polydata);

    // The expensive part — vtkGlyphFeature.enableGlyphs runs
    // _buildSubsampledPolydata plus first-draw shader compilation — is
    // deferred; everything above already ran synchronously so we can return
    // the optimistic `true` right now.
    this._deferHeavy('Building glyphs…', () => {
      vtkGlyphFeature.enableGlyphs(instanceId, polydata, options);
      this._pushVisualizationPatch({ glyph: vtkGlyphFeature.getConfigForSync(instanceId) });
    });
    this._emit('glyphsToggled', { enabled: true });
    return true;
  }

  /**
   * A glyph size that suits the dataset, in DATA units.
   *
   * VTKGlyphFeature's default is a hardcoded 1.0, which is meaningless without
   * knowing the data's scale: sub-pixel on a dataset spanning thousands of
   * units, scene-swamping on a normalised one. Derive it from the mean point
   * spacing instead — `diagonal / cbrt(N)` — halved, because the sphere and
   * arrow sources have radius ~0.5, so scaleFactor reads as a diameter.
   * @private
   */
  _autoGlyphScaleFactor(polydata) {
    try {
      const b = this._activeContext?.vrContext?.dataBounds;
      const diagonal =
        Array.isArray(b) && b.length === 6
          ? Math.hypot(b[1] - b[0], b[3] - b[2], b[5] - b[4])
          : 0;
      const n = polydata?.getNumberOfPoints?.() || 0;
      if (!(diagonal > 1e-9) || n < 2) return 1.0;
      const spacing = diagonal / Math.cbrt(n);
      // Clamp so a pathological aspect ratio can't produce a degenerate size.
      return Math.max(diagonal * 1e-4, Math.min(diagonal * 0.1, spacing * 0.5));
    } catch {
      return 1.0;
    }
  }

  /** @returns {boolean} whether glyphs are currently enabled on the active dataset */
  isGlyphsEnabled() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return false;
    return !!vtkGlyphFeature.getState(instanceId)?.enabled;
  }

  /**
   * Select a specific glyph type (or disable glyphs with typeId === null).
   * Unlike toggleGlyphs above (on/off only — it always auto-picks arrow-or-
   * sphere with no user choice, which is why VR glyphs looked "random": the
   * dataset's first vector array may not be a meaningful direction, and the
   * user had no way to pick a different array or a non-oriented shape
   * instead), this exposes the full type set the desktop glyph menu already
   * offers (VTKInstanceHandler.js glyph-menu options) — every VTKGlyphFeature
   * GLYPH_TYPES id, each backed by a real vtk.js source (vtkArrowSource,
   * vtkConeSource, vtkSphereSource, vtkCubeSource, vtkCylinderSource; 'dot' is
   * a small vtkSphereSource). No new glyph rendering code — this only adds a
   * VR menu surface for the API toggleGlyphs and the desktop menu both
   * already call.
   * @param {string|null} typeId - a VTKGlyphFeature GLYPH_TYPES id, or null to disable
   * @returns {boolean} true if the request was accepted
   */
  setGlyphType(typeId) {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return false;

    if (typeId === null) {
      this._deferHeavy('Removing glyphs…', () => {
        vtkGlyphFeature.disableGlyphs(instanceId);
        this._pushVisualizationPatch({ glyph: vtkGlyphFeature.getConfigForSync(instanceId) });
      });
      this._emit('glyphsToggled', { enabled: false });
      return true;
    }

    const state = vtkGlyphFeature.getState(instanceId);
    if (!state) return false;

    // Same guards toggleGlyphs uses, but reported (a disabled-type tap fails
    // loud via a notice, not silently — see the plan's notice-visibility fix).
    const { vectorArrays = [], scalarArrays = [] } = state;
    if (getDisabledGlyphTypes(vectorArrays).includes(typeId)) {
      this._flashVRNotice(`${typeId} needs a vector array — this dataset has none`);
      return false;
    }
    if (!isGlyphFeatureAvailable(vectorArrays, scalarArrays)) {
      this._flashVRNotice('No vector or scalar data on this dataset for glyphs');
      return false;
    }

    if (state.enabled) {
      // Already running — just swap the shape. VTKGlyphFeature.setGlyphType
      // only rebuilds the glyph SOURCE, not the mapper/subsample (see its
      // definition), so this is cheap enough to run synchronously, unlike
      // the initial enable below.
      vtkGlyphFeature.setGlyphType(instanceId, typeId);
      this._pushVisualizationPatch({ glyph: vtkGlyphFeature.getConfigForSync(instanceId) });
      this._emit('glyphsToggled', { enabled: true });
      return true;
    }

    // Not yet enabled: bring it up WITH the requested type, using the same
    // array-driven options toggleGlyphs derives (see its comment for why
    // scalingMode:'scalar' rather than 'vector' matters) — just parameterized
    // on the user's chosen type instead of always picking arrow-or-sphere.
    const polydata = this._activeContext?.instance?.instanceData?.polydata;
    if (!polydata) return false;

    const vectorName = vectorArrays?.[0]?.name;
    const scalarName = scalarArrays?.[0]?.name;
    const options = vectorName
      ? {
          glyphType: typeId,
          scalingMode: 'scalar',
          orientationArray: vectorName,
          scaleArray: vectorName,
        }
      : {
          glyphType: typeId,
          scalingMode: 'off',
          orientationArray: null,
          colorMode: scalarName ? 'scalar' : 'solid',
          colorArray: scalarName || null,
        };
    options.scaleFactor = this._autoGlyphScaleFactor(polydata);

    this._deferHeavy('Building glyphs…', () => {
      vtkGlyphFeature.enableGlyphs(instanceId, polydata, options);
      this._pushVisualizationPatch({ glyph: vtkGlyphFeature.getConfigForSync(instanceId) });
    });
    this._emit('glyphsToggled', { enabled: true });
    return true;
  }

  /** @returns {string|null} the current glyph type, or null if disabled/unavailable */
  getGlyphType() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;
    const state = vtkGlyphFeature.getState(instanceId);
    return state?.enabled ? state.glyphType : null;
  }

  /** @returns {string[]} glyph type ids disabled on the active dataset (no vector array) */
  getDisabledGlyphTypeIds() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return [];
    const state = vtkGlyphFeature.getState(instanceId);
    return getDisabledGlyphTypes(state?.vectorArrays || []);
  }

  /**
   * @returns {string|null} the point-data array name currently driving glyph
   *   orientation, or null. Surfaced in the VR status line specifically to
   *   close the "why do these arrows look random" gap — the array is picked
   *   automatically (the dataset's first vector array) and was previously
   *   never shown to the user anywhere in VR.
   */
  getGlyphOrientationArray() {
    const instanceId = this._activeContext?.instance?.instanceId;
    if (!instanceId) return null;
    const state = vtkGlyphFeature.getState(instanceId);
    return state?.enabled ? state.orientationArray || null : null;
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
  /**
   * Compute an auto-fit vrScale/vrOrigin so a dataset of arbitrary size and
   * position ends up ~1m in front of the user, its own bottom bound resting
   * PEDESTAL_HEIGHT_M above the floor (not directly on it — see there),
   * regardless of where its bounds sit relative to the data origin. Shared by
   * initial VR placement (_applyInitialPlacement) and isolation mode
   * (enterIsolation) — same math, same "diagonal spans ~2.5 physical meters"
   * convention.
   * @private
   */
  _computeAutoPlacement(dataBounds) {
    // Guard degenerate/invalid bounds: a null box, or one whose extent is
    // (near) zero on every axis — which happens when actors aren't fully
    // added yet on the Vision Pro entry timing — would yield a nonsense
    // diagonal and mis-size the object. Fall back to a unit box in that case.
    let b = dataBounds;
    const valid =
      Array.isArray(b) &&
      b.length === 6 &&
      b.every((v) => Number.isFinite(v)) &&
      (b[1] - b[0] > 1e-6 || b[3] - b[2] > 1e-6 || b[5] - b[4] > 1e-6);
    if (!valid) b = [-1, 1, -1, 1, -1, 1];

    const dx = b[1] - b[0];
    const dy = b[3] - b[2];
    const dz = b[5] - b[4];
    const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const center = [(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2];

    // Auto-fit: the bounding diagonal spans FIT_DIAGONAL_M physical metres,
    // centred FIT_DISTANCE_M in front (see the derivation at the top of this
    // file — the distance is what keeps the dataset clear of the menu panel).
    const vrScale = FIT_DIAGONAL_M / diagonal;

    // GROUNDING INVARIANT. The dataset's base sits PEDESTAL_HEIGHT_M above
    // the floor iff its data-space Y-minimum maps to physical y=PEDESTAL_HEIGHT_M,
    // and since
    //     xr.y(P) = (P - vrOrigin[1]) * vrScale
    // that is exactly `vrOrigin[1] = dataBounds[2] - PEDESTAL_HEIGHT_M / vrScale`.
    // vrOrigin[1] is still a FIXED data-space value once placed, independent
    // of any later vrScale change — that's the property that matters below.
    //
    // Pinning SOME fixed data-space plane here is what fixes "the data keeps
    // getting larger and rises over the user". Changing vrScale with vrOrigin
    // fixed is a homothety about the XR origin, which in local-floor space is
    // the floor point under the user — so every coordinate INCLUDING HEIGHT
    // multiplies by s/s0. It used to start at xr.y ~= +0.6 m and double with
    // every doubling of scale. A point sitting exactly on the pinned plane is
    // a fixed point of that homothety, so grounding removes the rise with no
    // per-frame clamp — the pedestal offset doesn't reintroduce it, since it
    // only changes WHICH plane is pinned, not whether one is.
    const groundY = b[2] - PEDESTAL_HEIGHT_M / vrScale;
    const vrOrigin = [
      center[0],
      groundY,
      center[2] + FIT_DISTANCE_M / vrScale,
    ];
    return {
      vrScale,
      vrOrigin,
      diagonal,
      center,
      groundY,
      radiusM: FIT_DIAGONAL_M / 2,
    };
  }

  /**
   * Data-space Y of the plane the dataset rests on — the value vrOrigin[1]
   * must hold for the dataset's bottom bound to sit PEDESTAL_HEIGHT_M above
   * the floor (see the grounding invariant in _computeAutoPlacement). Every
   * writer of vrOrigin[1] has to go through this, or the first one that
   * doesn't silently un-grounds the dataset and the ballooning returns.
   * @private
   */
  _groundY(vrContext) {
    const b = vrContext?.dataBounds;
    const vrScale = vrContext?.vrScale || 1;
    if (Array.isArray(b) && b.length === 6 && Number.isFinite(b[2])) {
      return b[2] - PEDESTAL_HEIGHT_M / vrScale;
    }
    return vrContext?.vrOrigin?.[1] ?? 0;
  }

  /**
   * Re-read the data actor's bounds. `vrContext.dataBounds` is captured once
   * at VR entry, but Threshold/Isosurface/Glyphs SUBSTITUTE a derived actor
   * with different bounds — leaving it stale would put the grounding plane
   * (and the menu's angular clearance) on the wrong geometry.
   * @param {Object} [vrContext] defaults to the active context
   * @returns {number[]|null} the refreshed bounds, or the previous value
   */
  /**
   * Pin the world-locked environment pieces to the dataset's frame: the floor
   * lattice phase-anchors to the data centre, and the four cardinal posts sit
   * at fixed data-space points framing the dataset. Constant apparent size at
   * a world-fixed position is the strongest translation-parallax cue there is.
   * @private
   */
  _applyEnvironmentAnchor(vrContext, placement) {
    try {
      const p = placement || this._computeAutoPlacement(vrContext?.dataBounds);
      const c = p.center;
      const b = vrContext?.dataBounds;
      // Frame the dataset: posts just outside its horizontal footprint, or a
      // sane default when bounds are degenerate.
      const spanX = Array.isArray(b) ? Math.abs(b[1] - b[0]) : 0;
      const spanZ = Array.isArray(b) ? Math.abs(b[5] - b[4]) : 0;
      const r = 0.9 * Math.max(spanX, spanZ, 1e-6) || 1;
      vrEnvironment.setWorldAnchor({
        refPoint: [c[0], p.groundY, c[2]],
        markerAnchors: [
          [c[0] + r, p.groundY, c[2]],
          [c[0] - r, p.groundY, c[2]],
          [c[0], p.groundY, c[2] + r],
          [c[0], p.groundY, c[2] - r],
        ],
      });
    } catch (e) {
      log.warn(`VR environment anchor failed — ${e?.message}`);
    }
  }

  refreshDataBounds(vrContext) {
    const ctx = vrContext || this._activeContext?.vrContext;
    if (!ctx) return null;
    const actor = ctx.sceneObjects?.actor;
    const b = typeof actor?.getBounds === 'function' ? actor.getBounds() : null;
    const valid =
      Array.isArray(b) &&
      b.length === 6 &&
      b.every((v) => Number.isFinite(v)) &&
      (b[1] - b[0] > 1e-6 || b[3] - b[2] > 1e-6 || b[5] - b[4] > 1e-6);
    if (!valid) return ctx.dataBounds ?? null;
    ctx.dataBounds = [...b];
    return ctx.dataBounds;
  }

  /**
   * Apply the starting pose for a freshly-entered VR context. If the caller
   * didn't request an explicit scale, auto-fit the dataset to room scale
   * (matches enterIsolation's convention). If an explicit scale WAS
   * requested, keep it but still compute vrOrigin so the dataset center
   * sits in front of the user — vrOrigin must never be left at [0,0,0].
   * @private
   */
  _applyInitialPlacement(vrContext, sessionConfig) {
    const placement = this._computeAutoPlacement(vrContext.dataBounds);

    // ALWAYS auto-fit on fresh entry. A persisted/default `vrScale` (from a
    // prior session's default_vr_scale, threaded in via sessionConfig) is a
    // stale hint, not a live user gesture — honoring it was the root cause of
    // the "object appears tiny and far away" report on Apple Vision Pro, where
    // a small saved scale locked the dataset far below its fit-to-view size.
    // Live scale/rotation gestures during the session write vrContext directly;
    // they don't come back through sessionConfig, so ignoring it here is safe.
    vrContext._hasExplicitScale = false;
    vrContext.vrScale = placement.vrScale;
    vrContext.vrOrigin = placement.vrOrigin;
    // Rotation is part of the same affine XR→data map as scale/origin; start
    // unrotated (yaw radians about world-up through the data center).
    vrContext.vrRotation = 0;

    log.info('Applied initial VR placement', {
      vrScale: vrContext.vrScale,
      vrOrigin: vrContext.vrOrigin,
      diagonal: placement.diagonal,
      ignoredSessionScale: sessionConfig?.vrScale ?? null,
    });
  }

  /**
   * Re-place the dataset relative to the user's ACTUAL head position and
   * facing direction, read from the first real XR frame. _applyInitialPlacement
   * runs before any frame exists, so it has to assume the user faces
   * reference-space -Z at session start — not guaranteed on every
   * headset/platform. Getting this wrong leaves the dataset out of the
   * viewing frustum entirely (reported as a fully black VR view).
   * @private
   */
  _applyPoseRelativePlacement(vrContext, viewerPose) {
    const { position, orientation } = viewerPose.transform;

    // GROUND-PROJECT the gaze ray. controllerForward is the full 3D forward,
    // so the old code's `forward[1] * distance` threw the dataset up to +/-2 m
    // vertically if the user happened to be looking up or down on the first
    // frame. The dataset belongs on the floor in front of them regardless of
    // head pitch, so only the heading matters.
    const forward = controllerForward(orientation);
    let fx = forward[0];
    let fz = forward[2];
    const flen = Math.hypot(fx, fz);
    if (flen < 1e-6) {
      // Looking straight up or down — no meaningful heading; fall back to the
      // reference space's forward.
      fx = 0;
      fz = -1;
    } else {
      fx /= flen;
      fz /= flen;
    }

    const placement = this._computeAutoPlacement(vrContext.dataBounds);
    // Always auto-fit (see _applyInitialPlacement) — the pose-relative pass
    // only re-derives vrOrigin so the auto-fit dataset centers on where the
    // user is actually looking on the first real frame.
    const vrScale = placement.vrScale;

    // Horizontal target only. The vertical placement comes entirely from the
    // grounding invariant below: with vrOrigin[1] = groundY, the centre lands
    // at (center[1] - groundY) * vrScale above the floor — i.e. its own
    // half-height plus PEDESTAL_HEIGHT_M, resting on the pedestal.
    const targetX = position.x + fx * FIT_DISTANCE_M;
    const targetZ = position.z + fz * FIT_DISTANCE_M;

    vrContext.vrScale = vrScale;
    vrContext.vrRotation = 0;
    vrContext.vrOrigin = [
      placement.center[0] - targetX / vrScale,
      placement.groundY,
      placement.center[2] - targetZ / vrScale,
    ];

    // Anchor the world-locked environment to the dataset's frame now that its
    // real placement is known. The floor's grid lines phase-lock to this point
    // and the cardinal posts pin to fixed data-space positions, so travelling
    // produces genuine motion parallax — the cue that makes the stick read as
    // moving the user rather than sliding the dataset.
    this._applyEnvironmentAnchor(vrContext, placement);

    log.info('Applied pose-relative VR placement', {
      vrScale: vrContext.vrScale,
      vrOrigin: vrContext.vrOrigin,
      headPosition: [position.x, position.y, position.z],
      headForward: forward,
    });
  }

  enterIsolation() {
    const ctx = this._activeContext?.vrContext;
    if (!ctx) {
      log.warn('Cannot enter isolation: no active VR context');
      return false;
    }
    if (this._isolationBackup) return true; // already isolated

    this._isolationBackup = {
      vrScale: ctx.vrScale,
      vrOrigin: [...(ctx.vrOrigin || [0, 0, 0])],
    };

    const placement = this._computeAutoPlacement(ctx.dataBounds);
    if (this._navigationController?.setScale) {
      this._navigationController.setScale(placement.vrScale);
    } else {
      ctx.vrScale = placement.vrScale;
    }
    ctx.vrOrigin = placement.vrOrigin;

    const viewId = this._activeContext.instance?.viewConfigId || ctx.instanceId;
    vrManager.enterIsolationMode(viewId);
    this._emit('isolationChanged', { isolated: true, viewId });
    log.info('Entered isolation mode', { scale: ctx.vrScale, diagonal: placement.diagonal });
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
    // Re-ground on restore: dataBounds may have changed while isolated (a
    // filter swapping the actor), which would make the backed-up Y stale and
    // leave the dataset floating or sunk.
    ctx.vrOrigin = [vrOrigin[0], this._groundY(ctx), vrOrigin[2]];

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

  /**
   * Load a snapshot and reapply the VR-side state it captured.
   *
   * VRSnapshotManager restores the ViewConfiguration (camera, appearance, clip
   * box, ...), but the VR zoom level and navigation mode live on the session's
   * participant record, so they were saved and then never reapplied — "Load"
   * restored strictly less than its name implied. Reapply the LOCAL
   * participant's captured vrScale + mode here, where vrContext and the
   * navigation controller are in scope.
   *
   * Note: vrOrigin is intentionally not restored — createSessionSnapshot does
   * not capture it (see VRExplorationSession.createSessionSnapshot), so there
   * is nothing saved to put back.
   */
  async loadSnapshot(snapshotId) {
    if (!this._snapshotManager) throw new Error('No active session');
    const snapshot = await this._snapshotManager.loadSnapshot(snapshotId);

    try {
      const mine = snapshot?.participantStates?.find(
        (p) => p.odUserId === getUserId()
      );
      const vrContext = this._activeContext?.vrContext;
      if (mine && vrContext) {
        if (Number.isFinite(mine.vrScale) && mine.vrScale > 0) {
          vrContext.vrScale = mine.vrScale;
          this._navigationController?.setScale?.(mine.vrScale);
          // Re-ground: _groundY's data-space value depends on vrScale (see
          // PEDESTAL_HEIGHT_M), so restoring a different scale without this
          // would leave the pedestal height stale and drifting.
          if (Array.isArray(vrContext.vrOrigin)) {
            vrContext.vrOrigin[1] = this._groundY(vrContext);
          }
        }
        if (mine.mode) this.setNavigationMode(mine.mode);
      }
    } catch (err) {
      // Never let a partial restore break loading the view snapshot itself.
      log.warn(`VR snapshot: placement restore failed: ${err?.message}`);
    }

    return snapshot;
  }

  getSessionSnapshots() {
    return this._snapshotManager?.getSessionSnapshots() || [];
  }

  // ===========================================================================
  // FRAME LOOP
  // ===========================================================================
  //
  // Frame work is driven by vrManager's own XR rAF loop via the "frame"
  // event (see startExploration's vrManager.on('frame', this._onFrame)) —
  // there is exactly one requestAnimationFrame loop for the whole VR
  // session, owned by VRManager.

  /**
   * Queue heavy work to run at the END of the next XR frame instead of
   * inside the current one. Menu activations run SYNCHRONOUSLY inside the
   * XR rAF callback (VTKVRSpatialUI.update -> VRSpatialMenuModel.activate),
   * so any multi-hundred-millisecond operation there (e.g. glyph rebuild's
   * O(N) subsampled-polydata copy) drops frames — the headset's reprojection
   * shows that up as the world shaking. Draining after this frame's eyes are
   * drawn (see _drainDeferredWork, called from _onFrame) puts the stall
   * between frames instead of inside one.
   *
   * Callers keep all cheap guard/availability logic synchronous and defer
   * only the expensive call plus its sync patch — see toggleGlyphs() for the
   * pattern.
   *
   * @param {string} label - short user-facing status text shown while this
   *   (or an earlier queued) task is pending — see getPendingWorkLabel() and
   *   VRSpatialMenuModel.getStatusLine().
   * @param {Function} fn - the deferred work; invoked with no arguments and
   *   individually try/caught by _drainDeferredWork so a failure here can
   *   never strand the queue or the frame loop.
   * @param {{boundsMayChange?: boolean}} [opts] - boundsMayChange defaults to
   *   true (Threshold/Isosurface/Glyphs substitute the actor with different
   *   bounds). Pass false for tasks that only touch actor/mapper properties
   *   (e.g. representation) so _drainDeferredWork can skip the bounds
   *   readback — see the note there.
   * @private
   */
  _deferHeavy(label, fn, { boundsMayChange = true } = {}) {
    // Coalesce a repeat of the same action. Because the guards run
    // synchronously but the mutation is deferred, a second tap before the
    // drain reads pre-tap state — so double-tapping Threshold used to enqueue
    // toggle() twice (net: off) while the menu optimistically showed "on".
    const tail = this._deferredWork[this._deferredWork.length - 1];
    if (tail && tail.label === label) return;

    this._deferredWork.push({ label, fn, boundsMayChange });
    this._pendingWorkLabel = label;
    this._pendingWorkAtMs = Date.now();
  }

  /**
   * Drain ONE queued task per call — never more, so a burst of taps spreads
   * its cost over several frames instead of front-loading it onto the very
   * next one. Called once per XR frame, at the end, after the eyes are drawn
   * (see _onFrame). Each task is individually try/caught: one throwing task
   * must not prevent the tasks queued behind it from ever draining, and must
   * not strand _pendingWorkLabel on a task that will never run again.
   * @private
   */
  _drainDeferredWork() {
    const task = this._deferredWork.shift();
    if (task) {
      try {
        task.fn();
      } catch (e) {
        log.error(`VR deferred work "${task.label}" failed — ${e?.message}`, e?.stack || e);
      }
      // Threshold/Isosurface/Glyphs SUBSTITUTE a derived actor with different
      // bounds. Refreshing here rather than at each call site means a new one
      // can't forget to — and stale bounds would silently put the grounding
      // plane and the menu's angular clearance on dead geometry. Runs even if
      // the task threw: it may have partially applied.
      // Representation-only changes (see cycleRepresentation/setRepresentation)
      // opt out via boundsMayChange: false — they never touch the actor's
      // bounds, and this synchronous actor.getBounds() readback was extra
      // main-thread work landing in the same XR frame slot that caused the
      // "world shaking" glyph-rebuild bug this comment describes above.
      if (task.boundsMayChange !== false) {
        try {
          this.refreshDataBounds();
        } catch (e) {
          log.warn(`VR dataBounds refresh failed — ${e?.message}`);
        }
      }
    }
    this._pendingWorkLabel = this._deferredWork[0]?.label ?? null;
    this._pendingWorkAtMs = this._pendingWorkLabel ? Date.now() : 0;
  }

  /**
   * @returns {string|null} the label of the currently queued/in-flight
   *   deferred task (see _deferHeavy), or null when nothing is pending. Read
   *   by VRSpatialMenuModel.getStatusLine() so the panel shows "Building
   *   glyphs…" (etc.) instead of silently freezing while the work runs.
   */
  getPendingWorkLabel() {
    if (!this._pendingWorkLabel) return null;
    // TTL. VRSpatialMenuModel.getStatusLine short-circuits on this label
    // unconditionally, so a queue that somehow stops draining would leave the
    // panel reading "Building glyphs…" for the rest of the session, hiding the
    // dataset name, scale and nav mode. Belt and braces with the `finally` in
    // _onFrame that keeps the drain running.
    if (Date.now() - (this._pendingWorkAtMs || 0) > PENDING_WORK_TTL_MS) {
      return null;
    }
    return this._pendingWorkLabel;
  }

  /**
   * @param {{time:number, deltaTime:number, frame:XRFrame, viewerPose:XRViewerPose}} frameData
   */
  _onFrame({ time, deltaTime: deltaTimeMs, frame, viewerPose }) {
    if (!this._activeContext) return;

    const { handler, vrContext } = this._activeContext;
    // Clamp: the upper bound stops a tracking hitch or tab throttle from
    // producing one huge position delta that teleports the user; the lower
    // bound guards against a duplicated timestamp giving dt=0.
    const deltaTime = Math.min(
      0.1,
      Math.max(1e-4, (deltaTimeMs || 16.67) / 1000)
    );

    try {
      if (this._needsPoseCorrection && viewerPose) {
        this._needsPoseCorrection = false;
        this._applyPoseRelativePlacement(vrContext, viewerPose);
      }

      // Get input state
      const inputState = this._gatherInputState(frame);

      // A snap-turn (or any other reference-space offset) rotates the frame
      // every subsequent pose is reported in, but is deliberately built to
      // leave head POSITION nearly unchanged (see VRManager.applySnapTurn) —
      // so vrSpatialUI's position-drift re-anchor gate never trips on its
      // own, and its cached anchor would silently desync from the camera and
      // stay frozen there. Force a fresh anchor the frame after any yaw
      // change, before this frame's hitTest() runs.
      const currentYawOffset = vrManager.getYawOffset?.() ?? 0;
      if (currentYawOffset !== this._lastMenuYawOffset) {
        this._lastMenuYawOffset = currentYawOffset;
        vrSpatialUI.forceReanchor?.();
      }

      // Quest: left X is the fast menu toggle. Reopening deliberately creates
      // a fresh anchor at the user's current gaze, so a menu left elsewhere
      // never traps the user into searching for it.
      const menuTogglePressed = !!inputState.controllers?.left?.buttons?.x;
      if (menuTogglePressed && !this._lastMenuToggleButtonState) {
        vrSpatialUI.toggleAtHead(inputState.headPose);
      }
      this._lastMenuToggleButtonState = menuTogglePressed;

      // Cache the floor point under the head. Menu actions (scale presets) run
      // outside the frame loop and have no inputState of their own, but they
      // need a pivot to resize about — see setVRScale.
      const headXR = inputState.headPose?.position;
      if (headXR) {
        this._lastHeadFloorXR = [headXR.x, 0, headXR.z];
      }

      // INPUT ARBITRATION (R2). The floating spatial menu must be interactable
      // without its pinches also firing tools/teleport. So the menu hit-tests
      // the RAW input FIRST — before nav/tools — and reports whether the
      // pointer is over a button. We then hand nav and the tools a shallow-
      // cloned inputState with the offending trigger stripped, never mutating
      // the object _gatherInputState returned (other consumers below — pose
      // sync, avatars, pointer broadcast — still read the raw poses).
      //
      // Isolated in its own try/catch (unlike the rest of this frame body,
      // which shares one try/catch below): vrSpatialUI.hitTest() is the
      // newest, highest-risk per-frame call (canvas/texture work upstream of
      // it in the same module), and this whole method runs every frame — an
      // uncaught throw here would repeat on every subsequent frame and stall
      // nav/tools/avatar sync right along with the menu. Isolating it means a
      // menu-only failure stays menu-only, and gets logged instead of
      // silently freezing the session.
      //
      // FRAME-ORDER CONTRACT: this is PHASE 1 (hitTest) of the menu's
      // per-frame update, deliberately called here — before navigation below
      // mutates vrContext.vrScale/vrOrigin — because it's pure XR-metre
      // geometry (head/controller poses), entirely independent of that
      // transform. PHASE 2 (layout, which DOES depend on the transform) runs
      // later, after nav — see the vrSpatialUI.layout() call below
      // vrEnvironment.updateTransform(). Splitting it this way fixes a
      // one-frame placement lag: previously, calling the combined update()
      // here meant the panel's actors were positioned using vrContext's
      // transform from frame N-1 while the camera rendered frame N, so the
      // panel would visibly swim against the world by up to a frame's worth
      // of the user's locomotion/scale distance whenever they moved.
      let menuResult = null;
      try {
        menuResult = vrSpatialUI.hitTest(inputState) || null;
      } catch (e) {
        log.error(`VR frame: vrSpatialUI.hitTest failed — ${e?.message}`, e?.stack || e);
      }
      const menuHovering = !!menuResult?.hovering;
      const menuHand = menuResult?.hand || 'right';
      const menuConsumesTrigger = menuResult?.consumingTrigger ?? menuHovering;
      const menuConsumesGrip = !!menuResult?.consumingGrip;
      // A pinch used to place/aim an active tool must not ALSO aim teleport.
      const toolActive = !!this._toolManager?.getActiveTool?.();

      // INPUT GATING: in the new layered model, grip stays ALWAYS ON for
      // world-grab navigation; only trigger is gated by menu/tool. Grip is
      // never stripped so pulling the world is always available (standard VR
      // convention, e.g. Meta Quest 3 — the hand is never "interrupted" by UI).
      const navStripHands = new Set();
      const toolStripHands = new Set();
      const navStripGripHands = new Set();
      const toolStripGripHands = new Set();
      if (menuConsumesTrigger) {
        navStripHands.add(menuHand);
        toolStripHands.add(menuHand);
      }
      if (menuConsumesGrip) {
        // Grip normally remains world-grab. While it is actively moving the
        // menu header, however, that one hand belongs to the menu.
        navStripGripHands.add(menuHand);
        toolStripGripHands.add(menuHand);
      }
      if (toolActive) {
        // Strip both hands' triggers from nav/tools so a tool placement never
        // drives object-move or menu hover. Grip remains (world navigation).
        navStripHands.add('left');
        navStripHands.add('right');
      }
      const navInput = this._gateInputState(inputState, navStripHands, navStripGripHands);
      const toolInput = this._gateInputState(inputState, toolStripHands, toolStripGripHands);

      // NOTE: Vision Pro input detection (transient-pointer) used to trigger a
      // mode switch here, but the new layered model handles it transparently:
      // the world-grab predicate checks isTransientPointer and routes pinches
      // correctly (pinch = grip on Vision Pro, squeeze on tracked controllers).
      // Locomotion (left stick) and snap turn (right stick) still work on
      // Vision Pro even though there's no hardware stick (they read zero but
      // don't hurt). The first time the user pinches, it will pull the world
      // (world-grab via the injected grip predicate) — no mode switch needed.

      // Update navigation (handles movement, teleport, scale). Nav consumes the
      // arbitration-gated clone so a menu pinch / tool pinch can't drive it.
      if (this._navigationController) {
        const navResult = this._navigationController.update(navInput, frame, deltaTime);

        // Apply navigation result to VR context
        if (navResult.vrScale !== null) {
          vrContext.vrScale = navResult.vrScale;
        }
        if (navResult.vrRotation != null) {
          // Two-hand twist yaw. Applied to the data actor (turntable spin) by
          // the handler each frame from vrContext.vrRotation — see
          // VTKInstanceHandler._applyVRDataRotation.
          vrContext.vrRotation = navResult.vrRotation;
        }
        if (navResult.position) {
          vrContext.vrOrigin = [
            navResult.position.x,
            navResult.position.y,
            navResult.position.z,
          ];
        }

        // Persist the new placement to the ViewConfiguration on gesture END
        // only (grab release / teleport commit), never per drag frame.
        if (navResult.grabEnded || navResult.teleporting) {
          this._persistVRHints(vrContext);
        }
      }

      // In-VR follow: soft positional lerp toward the target participant.
      // Real locomotion input (thumbstick/teleport trigger) always wins and
      // cancels follow — mirrors followService's desktop
      // auto-unfollow-on-manual-move semantics. Reads the nav-gated clone so a
      // menu/tool pinch doesn't read as "the user is moving".
      if (this._followTargetUserId) {
        if (this._hasLocomotionInput(navInput)) {
          this.stopFollowing();
        } else {
          this._updateParticipantFollow(vrContext, deltaTime);
        }
      }

      // B button (right controller) toggles isolation mode: pull the model
      // to room scale for walk-around inspection, press again to restore.
      const bPressed = inputState.controllers?.right?.buttons?.b || false;
      if (bPressed && !this._lastIsolationButtonState) {
        this.toggleIsolation();
      }
      this._lastIsolationButtonState = bPressed;

      // Update tools with the arbitration-gated clone so a pinch aimed at a
      // menu button never also fires the active tool.
      const toolAction = this._toolManager?.update(toolInput, frame);
      if (toolAction) {
        this._handleToolAction(toolAction);
      }

      // STEP 6.5 — pointer ray. Computed HERE, between the tools and the
      // participant broadcast, for one reason: its result has to ride along in
      // the same updateLocalState payload below, so a remote viewer never
      // renders a head pose from frame N against a pointer from frame N-1.
      // Cheap by construction — a quaternion rotate plus one mapXRPointToData,
      // both of which the old inline _broadcastPointerRay already paid — and
      // the only expensive part (the surface pick) is capped at 10 Hz inside
      // and skipped entirely while the menu is hovered.
      const pointerRay = this._computePointerRay(inputState, vrContext, {
        skipPick: menuHovering,
      });

      // Update participant sync. Head/hand poses are in THIS user's own
      // physical XR space (each participant has an independent WebXR
      // session/reference space) — vrScale/vrOrigin travel alongside so
      // remote viewers can convert into the one shared frame, data space,
      // using the SENDER's transform rather than their own (see
      // RemoteAvatarController._toScenePose).
      this._participantSync?.updateLocalState({
        headPose: inputState.headPose,
        leftHandPose: inputState.controllers?.left?.pose,
        rightHandPose: inputState.controllers?.right?.pose,
        vrScale: vrContext.vrScale || 1.0,
        vrOrigin: vrContext.vrOrigin || [0, 0, 0],
        // XR metres (converted by the receiver with the transform above)...
        pointer: pointerRay,
        // ...and the surface hit, which is ALREADY data space and shared by
        // every viewer — see VRParticipantSync.updateLocalState.
        pointerHit: pointerRay?.hit || null,
      });

      // Shared vr-sessions registry housekeeping — heartbeat + host-promotion
      // check (see _tickVRSessionRegistry) — throttled to VR_SESSION_HEARTBEAT_MS,
      // same Date.now()-guard style as the pointer pick throttle above.
      const nowForVRSessionRegistry = Date.now();
      if (nowForVRSessionRegistry - this._lastVRSessionHeartbeat >= VR_SESSION_HEARTBEAT_MS) {
        this._lastVRSessionHeartbeat = nowForVRSessionRegistry;
        this._tickVRSessionRegistry(
          this._resolveSessionKey(this._activeContext?.instance),
          this._activeSession
        );
        // Same 1 Hz budget: refresh our hold on the data-control token, or (as
        // host) reclaim one whose holder went stale. Internally throttled too,
        // so sharing this tick is belt-and-braces rather than load-bearing.
        try {
          this._manipulationLock?.heartbeat();
        } catch (err) {
          log.warn(`VR manipulation heartbeat failed: ${err?.message}`);
        }
      }

      // Broadcast the active controller ray so desktop collaborators can see
      // where this VR user is pointing (throttled inside vrCursorSync).
      this._broadcastPointerRay(pointerRay);

      // Update avatar system
      vrAvatarSystem.update(deltaTime, inputState);

      // Everything that can mutate vrContext.vrScale/vrOrigin has now run:
      // navigation, participant-follow, the B-button isolation toggle, and
      // tool actions. Place the world-anchored in-scene geometry LAST, so it
      // uses exactly the transform this frame's camera is about to render
      // with.
      //
      // Keep the floor/environment anchored under the user as they
      // teleport/fly/scale/follow (no-ops internally if nothing changed).
      vrEnvironment.updateTransform(vrContext.vrScale, vrContext.vrOrigin);

      // FRAME-ORDER CONTRACT (see the vrSpatialUI.hitTest() call above): this
      // is PHASE 2 (layout) of the menu's per-frame update — placement only.
      // hitTest ran at the top of the frame because it is pure XR-metre
      // geometry and its result has to gate nav/tool input; layout runs here
      // because it is the only half that depends on vrScale/vrOrigin.
      // Previously the combined update() ran at the top, so the panel was
      // positioned with frame N-1's transform while the camera rendered frame
      // N — the panel visibly swam against the world by a frame's worth of
      // the user's locomotion whenever they moved. Isolated in its own
      // try/catch for the same reason as hitTest() — a menu-only placement
      // failure must not stall the handler's draw.
      try {
        vrSpatialUI.layout({
          vrScale: vrContext.vrScale,
          vrOrigin: vrContext.vrOrigin,
          // Consumed by the panel's adaptive side-offset, which needs the
          // dataset's angular size to know how far to sit beside it.
          dataBounds: vrContext.dataBounds,
        });
      } catch (e) {
        log.error(`VR frame: vrSpatialUI.layout failed — ${e?.message}`, e?.stack || e);
      }

      // Let handler update VR rendering (synchronous stereo render — see
      // VTKInstanceHandler.updateVRExploration). Gets the tool-gated clone so a
      // menu pinch doesn't leak into the handler's own interaction handling.
      handler.updateVRExploration?.(vrContext, frame, toolInput, viewerPose);

      // Emit frame event for UI
      this._emit('frame', { time, inputState, deltaTime });

    } catch (error) {
      // This catch spans ~9 unguarded calls (pose correction, input gathering,
      // menu hit-test, navigation, tools, follow, isolation). A throw in ANY of
      // them silently skips everything downstream — including the tool update —
      // and then repeats at headset frame rate. Log the stack, and dedupe on
      // message so a per-frame throw produces one readable entry instead of
      // thousands that bury it.
      const signature = error?.message || String(error);
      if (this._lastFrameErrorSignature !== signature) {
        this._lastFrameErrorSignature = signature;
        log.error(
          `Error in VR frame loop: ${signature}`,
          error?.stack || error
        );
      }
    } finally {
      // Drain one deferred heavy task, now that both eyes for THIS frame have
      // been drawn.
      //
      // MUST be in `finally`. It used to sit at the end of the try block,
      // downstream of ~9 unguarded calls (input gathering, navigation, tools,
      // avatars, the handler's draw). Any of those throwing skipped the drain —
      // and because the cause is per-frame state, it skipped it on every
      // subsequent frame too. The queue then grew forever and Glyphs, Style,
      // Threshold and Isosurface silently stopped applying while the session
      // carried on rendering normally, with only a log line to show for it.
      try {
        this._drainDeferredWork();
      } catch (e) {
        log.error(`VR deferred drain failed — ${e?.message}`, e?.stack || e);
      }
    }
  }

  /**
   * True if the user is actively driving locomotion this frame (thumbstick
   * past deadzone, or the teleport trigger held) — used to cancel in-VR
   * follow the moment the user tries to move themselves.
   * @private
   */
  _hasLocomotionInput(inputState) {
    const mag = (c) =>
      c?.thumbstick ? Math.hypot(c.thumbstick.x || 0, c.thumbstick.y || 0) : 0;
    const left = inputState.controllers?.left;
    const right = inputState.controllers?.right;
    return mag(left) > 0.15 || mag(right) > 0.15 || !!right?.triggerPressed;
  }

  /**
   * Return a SHALLOW clone of the frame's input state with trigger and/or grip
   * stripped from the named hands. Used for input
   * arbitration (R2): the object _gatherInputState returned is never mutated —
   * the menu and pose/avatar consumers keep reading the raw triggers/poses —
   * while nav and tools receive a gated copy so a menu interaction doesn't
   * also drive locomotion. Thumbsticks, poses and face buttons pass through.
   *
   * @param {Object} inputState - raw state from _gatherInputState
   * @param {Set<string>|Array<string>} triggerHands - hands whose trigger is stripped
   * @param {Set<string>|Array<string>} gripHands - hands whose grip is stripped
   * @returns {Object} the same object if nothing to strip, else a gated clone
   * @private
   */
  _gateInputState(inputState, triggerHands, gripHands = []) {
    const triggerList = triggerHands instanceof Set ? [...triggerHands] : triggerHands || [];
    const gripList = gripHands instanceof Set ? [...gripHands] : gripHands || [];
    if (!triggerList.length && !gripList.length) return inputState;
    const clone = { ...inputState, controllers: { ...inputState.controllers } };
    for (const hand of new Set([...triggerList, ...gripList])) {
      const c = clone.controllers?.[hand];
      if (c) {
        clone.controllers[hand] = {
          ...c,
          ...(triggerList.includes(hand) ? { triggerPressed: false, triggerValue: 0 } : {}),
          ...(gripList.includes(hand) ? { squeezePressed: false, squeezeValue: 0 } : {}),
        };
      }
    }
    return clone;
  }

  /**
   * Persist the current VR placement (vrScale / vrOrigin / mode) onto the
   * active ViewConfiguration so the "where the data sits" survives the session
   * (R4 — position must not feel fixed, but the last placement should stick).
   * Fired only on gesture END (grab release / teleport commit). Fire-and-forget
   * and fully guarded — it must never throw into the XR frame loop.
   * @param {Object} vrContext
   * @private
   */
  _persistVRHints(vrContext) {
    try {
      const viewId = this._activeContext?.instance?.viewConfigId;
      if (!viewId) return;
      const view = getViewConfigurationManager()?.getView?.(viewId);
      if (typeof view?.updateVRHints !== 'function') return;
      const origin = vrContext?.vrOrigin || [0, 0, 0];
      view.updateVRHints({
        vrScale: vrContext?.vrScale,
        vrOrigin: [origin[0], origin[1], origin[2]],
        explorationMode: this.getNavigationMode(),
      });
    } catch (err) {
      log.warn(`VR hints persist failed: ${err?.message}`);
    }
  }

  /**
   * Per-frame soft positional follow: lerps vrOrigin toward standing near
   * the followed participant's current position. Never touches orientation.
   * Auto-stops if the target's position becomes unknown (e.g. they left).
   * @private
   */
  _updateParticipantFollow(vrContext, deltaTime) {
    const targetPos = this._getParticipantDataPosition(this._followTargetUserId);
    if (!targetPos) {
      this.stopFollowing();
      return;
    }

    const vrScale = vrContext.vrScale || 1.0;
    const desired = [targetPos[0], targetPos[2] + 1.5 / vrScale];

    // ~0.5s settle time regardless of frame rate. Only X/Z are lerped — Y is
    // pinned to the ground plane so following someone walks you across the
    // floor rather than drifting you up to their altitude, and so follow can
    // never un-ground the dataset (see _groundY).
    const alpha = Math.min(1, deltaTime * 2);
    const origin = vrContext.vrOrigin || [0, 0, 0];
    vrContext.vrOrigin = [
      origin[0] + (desired[0] - origin[0]) * alpha,
      this._groundY(vrContext),
      origin[2] + (desired[1] - origin[2]) * alpha,
    ];
  }

  /**
   * Compute this frame's pointer ray for the active hand (right wins when both
   * are tracked), plus — at most 10x/s — where that ray meets the geometry.
   *
   * Two consumers, TWO COORDINATE FRAMES, and mixing them up is the whole
   * subtlety here:
   *  - `origin`/`direction` are the SENDER's raw XR metres. They go to
   *    VRParticipantSync, and RemoteAvatarController._toScenePose converts them
   *    with this sender's vrScale/vrOrigin, because every participant has a
   *    physically distinct WebXR reference space. Pre-converting them here
   *    would make the receiver apply the transform twice.
   *  - `dataOrigin` is the same point already mapped to data space, for the
   *    desktop broadcast (VTKRemoteVRRays renders in data space directly).
   *  - `hit` is a point ON the shared geometry, so it is data space for
   *    everyone and is never re-transformed by anyone.
   *
   * Never throws: the pointer is cosmetic and must not be able to break the
   * frame loop (the callers below rely on this, as does _broadcastPointerRay).
   *
   * @param {object} inputState - from _gatherInputState
   * @param {object} vrContext
   * @param {{skipPick?: boolean}} [opts] - skipPick while the spatial menu is
   *   hovered: the ray is aimed at the panel, not the data, so picking would
   *   burn a vtkCellPicker pass to (correctly) find nothing.
   * @returns {{origin:{x:number,y:number,z:number},
   *   dataOrigin:{x:number,y:number,z:number},
   *   direction:{x:number,y:number,z:number},
   *   hand:'left'|'right',
   *   hit:{x:number,y:number,z:number}|null}|null}
   * @private
   */
  _computePointerRay(inputState, vrContext, { skipPick = false } = {}) {
    try {
      const hand = inputState?.controllers?.right?.pose
        ? 'right'
        : inputState?.controllers?.left?.pose
          ? 'left'
          : null;
      if (!hand) return null;

      const controller = inputState.controllers[hand];
      const pose = controller.pose;
      if (!pose?.position || !pose?.orientation) return null;

      const dataOrigin = mapXRPointToData(
        pose.position,
        vrContext?.vrScale || 1.0,
        vrContext?.vrOrigin || [0, 0, 0]
      );
      const dir = controllerForward(pose.orientation);

      return {
        origin: { x: pose.position.x, y: pose.position.y, z: pose.position.z },
        dataOrigin: { x: dataOrigin[0], y: dataOrigin[1], z: dataOrigin[2] },
        direction: { x: dir[0], y: dir[1], z: dir[2] },
        hand,
        hit: this._pickPointerHit(controller, vrContext, skipPick),
      };
    } catch {
      // pointer is cosmetic — never break the frame loop
      return null;
    }
  }

  /**
   * Throttled surface pick for the pointer's hit marker. Returns the cached
   * result between picks so the caller can treat it as a per-frame value.
   *
   * @param {object} controller - inputState.controllers[hand]
   * @param {object} vrContext
   * @param {boolean} skipPick
   * @returns {{x:number,y:number,z:number}|null} data-space hit point
   * @private
   */
  _pickPointerHit(controller, vrContext, skipPick) {
    // Aimed at the menu: drop the cache too, or the dot would hang on the last
    // surface point while the user works the panel.
    if (skipPick) {
      this._lastPointerHit = null;
      return null;
    }

    const now = Date.now();
    const cached = this._lastPointerHit;
    if (cached && now - cached.atMs < POINTER_PICK_MS) return cached.pos;

    const handler = this._activeContext?.handler;
    if (typeof handler?.raycastVR !== 'function' || !controller?.targetRay) {
      this._lastPointerHit = { pos: null, atMs: now };
      return null;
    }

    let pos = null;
    try {
      // Same call convention as VRAnnotationTool._performRaycast — raycastVR
      // accepts the XRRigidTransform targetRay directly and returns
      // { hit, position, normal, ... } in data space.
      const result = handler.raycastVR(vrContext, controller.targetRay);
      if (result?.hit && result.position) {
        pos = { x: result.position.x, y: result.position.y, z: result.position.z };
      }
    } catch {
      // Swallow, but still stamp the cache below so a persistently throwing
      // picker is retried at 10 Hz rather than 90 Hz.
      pos = null;
    }

    this._lastPointerHit = { pos, atMs: now };
    return pos;
  }

  /**
   * Publish an already-computed pointer ray (in DATA space, so desktop views can
   * render it directly) via vrCursorSync.
   * Never throws — pointer visibility must not break the frame loop.
   *
   * @param {ReturnType<VRExplorationManager['_computePointerRay']>} ray
   * @private
   */
  _broadcastPointerRay(ray) {
    try {
      if (!ray) return;
      const viewId = this._activeContext?.instance?.viewConfigId;
      if (!viewId) return;

      vrCursorSync.broadcastVRPointer(viewId, ray.dataOrigin, ray.direction, ray.hand);
    } catch {
      // pointer broadcast is cosmetic — never break the frame loop
    }
  }

  _gatherInputState(frame) {
    const session = frame.session;
    // vrManager owns the session, so its reference space is always valid by
    // the time frames are flowing — no per-frame fallback request needed
    // (requestReferenceSpace() returns a Promise, which was never usable
    // synchronously by frame.getPose() below anyway).
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
            isTransientPointer: false,
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
              a: handedness === 'right' && !!source.gamepad?.buttons?.[4]?.pressed,
              b: handedness === 'right' && !!source.gamepad?.buttons?.[5]?.pressed,
              x: handedness === 'left' && !!source.gamepad?.buttons?.[4]?.pressed,
              y: handedness === 'left' && !!source.gamepad?.buttons?.[5]?.pressed,
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

          // Resolve which hand slot this gripless source fills. visionOS often
          // reports handedness "none" for pinch sources; assign it to whichever
          // slot is still free so TWO simultaneous pinches populate both hands
          // (required for the two-hand scale + twist gesture) rather than
          // collapsing onto "right".
          let handedness =
            source.handedness && source.handedness !== 'none'
              ? source.handedness
              : null;
          if (!handedness) {
            handedness = !state.controllers.right
              ? 'right'
              : !state.controllers.left
                ? 'left'
                : null;
            if (!handedness) continue; // both hands already filled
          }

          // Don't overwrite a real tracked controller for the same hand
          if (state.controllers[handedness]) continue;

          state.controllers[handedness] = {
            pose: targetRayPose.transform,
            targetRay: targetRayPose.transform,
            gamepad: source.gamepad || null,
            targetRayMode: source.targetRayMode,
            isTransientPointer: true,
            triggerPressed:
              source.gamepad?.buttons?.[0]?.pressed ||
              vrManager.isSelectPressed(source),
            triggerValue: source.gamepad?.buttons?.[0]?.value || 0,
            squeezePressed: false,
            squeezeValue: 0,
            thumbstick: { x: 0, y: 0 },
            buttons: { a: false, b: false, x: false, y: false },
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
      case 'annotation-pending':
        // Point fixed, keyboard open — nothing persisted or broadcast yet.
        // Reached only from VRAnnotationTool.handleInput's trigger placement.
        this._emit('annotationPending', action.data);
        break;
      case 'annotation-created':
        // Reached only from confirmAnnotationDraft() now (Save) — the old
        // instant-place-on-trigger path is gone.
        this._emit('annotationCreated', action.data);
        this._persistVRAnnotation(action.data);
        break;
      case 'annotation-cancelled':
        // Draft discarded — nothing was ever persisted, so nothing to delete.
        this._emit('annotationCancelled', action.data);
        break;
      case 'annotation-removed':
        this._emit('annotationRemoved', action.data);
        this._deletePersistedVRAnnotation(action.data);
        break;
      case 'measurement-start-placed':
        // First point of a chained path — nothing to persist until it closes
        // a segment, but observers want to know a measurement has begun.
        this._emit('measurementStartPlaced', action.data);
        break;
      case 'measurement-created':
        this._emit('measurementCreated', action.data);
        this._persistVRMeasurement(action.data);
        break;
      case 'measurement-removed':
        this._emit('measurementRemoved', action.data);
        // Undo must also remove the SERVER-side annotation, or an undone
        // segment reappears for everyone else (and on reload). Works unchanged
        // for measurements: same annotation store, keyed on the serverId that
        // _persistVRMeasurement back-fills onto this same object.
        this._deletePersistedVRAnnotation(action.data);
        break;
      case 'measurement-cancelled':
        this._emit('measurementCancelled', action.data ?? null);
        break;
      case 'measurement-path-completed':
        this._emit('measurementPathCompleted', action.data);
        break;
      case 'probe-created':
        // Probe results are intentionally session-local (transient inspection).
        this._emit('probeCreated', action.data);
        break;
      case 'clip-box-updated':
        this._emit('clipBoxUpdated', action.data);
        // Sync/persist only on gesture end — not every drag frame.
        if (action.data?.final) {
          const instanceId = this._activeContext?.vrContext?.instanceId;
          const config = instanceId
            ? vtkClippingFeature.getConfigForSync(instanceId)
            : null;
          if (config) this._pushVisualizationPatch({ clipBox: config });
        }
        break;
      default:
        // Session-local tool feedback (probe-*, clip-grab-start, ...). Emitted
        // for observers; nothing persisted. A default arm exists so a newly
        // added action type can never again be silently swallowed — several
        // were, which is how tools appeared to half-work.
        this._emit('toolAction', action);
        break;
    }
  }

  /**
   * Push a VR-manipulated visualization patch (clipBox / representation / glyph)
   * to collaborators + persistence via the same channel the desktop menus use
   * (visualizationSyncService → Y.js broadcast + ViewConfiguration), so an
   * in-VR change is identical to a desktop one. Fire-and-forget: must never
   * block or break the XR frame loop.
   * THE single choke point for shared data changes, and therefore the single
   * place the manipulation token is enforced: clip / representation / glyph /
   * threshold / isosurface all call this directly, and _pushObjectTransformPatch
   * funnels through it too, so one guard covers every one of them.
   *
   * @param {object} patch - e.g. { representation: 'wireframe' } or { clipBox: {...} }
   * @private
   */
  _pushVisualizationPatch(patch) {
    try {
      if (!patch) return;
      const key = Object.keys(patch)[0];
      const label = PATCH_LABELS[key] || 'That change';

      const viewId = this._activeContext?.instance?.viewConfigId;
      if (!viewId) {
        // A view opened without a server-side ViewConfiguration has a null
        // viewConfigId. The local change still applies, but there is nothing
        // to broadcast it against, so the peer never sees it. Silent until
        // now — and indistinguishable in-headset from a working sync.
        this._flashVRNotice(`${label} is local only — this view isn't shared`);
        return;
      }

      if (!this._requireManipulationControl(label)) return;

      // Filters (threshold/isosurface/glyph/clip) read as "filtering" work to
      // desktop observers; everything else is a change to the dataset itself.
      this._signalManipulation(FILTER_PATCH_KEYS.has(key) ? 'filter' : 'dataset');

      Promise.resolve(pushSharedVisualizationUpdate(viewId, patch))
        .then((result) => {
          // The service REFUSES by RETURNING { persisted: false, reason },
          // it does not throw — so the .catch() below never fires for the
          // most common failure. That made a refused sync completely silent
          // in VR: the local view changed, the other headset never saw it,
          // and nothing explained why.
          if (result && result.persisted === false) {
            this._flashVRNotice(
              result.reason === 'permission-denied'
                ? `${label} not shared — view is read-only for your role`
                : `${label} not shared — no active collaboration workspace`
            );
          }
        })
        .catch((err) => log.warn(`VR visualization sync failed: ${err?.message}`));
    } catch (err) {
      log.warn(`VR visualization sync failed: ${err?.message}`);
    }
  }

  /**
   * Broadcast the active dataset's full transform (position/rotation/scale) after
   * an in-VR object move, reusing the desktop InstanceToolsPanel patch shape
   * ({ transform: { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] } }). The
   * whole transform is always sent because the Y.js/ViewConfiguration merge is
   * shallow. Non-final (mid-drag) frames are throttled to ~20/sec; the final
   * frame (gesture release) is always sent so the resting pose is authoritative.
   * @param {boolean} final - true on gesture release
   * @private
   */
  _pushObjectTransformPatch(final) {
    try {
      const instanceId = this._activeContext?.instance?.instanceId;
      if (!instanceId) return;

      if (!final) {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (now - (this._lastObjTransformSentAt || 0) < 50) return;
        this._lastObjTransformSentAt = now;
      } else {
        this._lastObjTransformSentAt = 0; // let the next drag send immediately
      }

      const position = instanceTools.getPosition?.(instanceId) || [0, 0, 0];
      const rotation = instanceTools.getRotation?.(instanceId) || [0, 0, 0];
      const scale = instanceTools.getScale?.(instanceId) || [1, 1, 1];

      this._pushVisualizationPatch({
        transform: {
          position: [position[0], position[1], position[2]],
          rotation: [rotation[0], rotation[1], rotation[2]],
          scale: [scale[0], scale[1], scale[2]],
        },
      });
    } catch (err) {
      log.warn(`VR object transform sync failed: ${err?.message}`);
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
    if (!datasetId || !data?.position) {
      // Marker still renders locally (the tool's own optimistic state) so
      // this looks like success in-headset unless we say otherwise — a
      // dataset with no server id (e.g. loaded locally, never saved) would
      // otherwise silently vanish on reload with no explanation.
      this._flashVRNotice('Annotation not saved — dataset has no server id');
      return;
    }

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
            // authorName rides in metadata (not a first-class annotation
            // field) because AnnotationManager already writes the raw
            // createdBy user id separately — this is purely the DISPLAY name
            // so VTKAnnotationLinesFeature can render "who placed this" on
            // the pin without a separate user-id -> display-name lookup.
            metadata: {
              source: 'vr',
              vrMode: data.type,
              color: data.color,
              authorName: data.authorName || getUserName(),
            },
          },
          { projectId }
        );
      })
      .then((annotation) => {
        if (annotation) {
          // Map the tool-local id to the server id so undo can delete it
          data.serverId = annotation.id;
          log.debug(`VR annotation persisted as ${annotation.id}`);

          // In-flight-undo hole: the user could Undo (which tombstones with
          // _deleted, see VRAnnotationTool.undoLast) before this create POST
          // resolved. _deletePersistedVRAnnotation early-returns without a
          // serverId, so without this check the row would live on the server
          // and stay broadcast to every participant forever. The keyboard
          // flow makes this window realistic — confirm-then-immediately-undo
          // is exactly a fast double-tap away.
          if (data._deleted) this._deletePersistedVRAnnotation(data);
        }
      })
      .catch((err) => {
        log.warn('Failed to persist VR annotation:', err.message);
        this._flashVRNotice('Annotation failed to save');
      });
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
    if (!datasetId || !data?.startPoint || !data?.endPoint) {
      this._flashVRNotice('Measurement not saved — dataset has no server id');
      return;
    }

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
      .catch((err) => {
        log.warn('Failed to persist VR measurement:', err.message);
        this._flashVRNotice('Measurement failed to save');
      });
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
