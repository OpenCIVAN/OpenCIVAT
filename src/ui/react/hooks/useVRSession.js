/**
 * @file useVRSession.js
 * @description Hook for managing VR exploration session state.
 *
 * Provides:
 * - Active session tracking
 * - Participant list
 * - Session actions (create, join, leave, end)
 * - VR support detection
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { vrManager } from "@Core/vr/VRManager.js";
import { vrExplorationManager } from "@Core/vr/VRExplorationManager.js";
import { apiClient } from "@Services/apiClient.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { toast } from "@UI/react/store/toastStore.js";

/**
 * Hook for VR session state management
 *
 * @param {string} projectId - Current project ID
 * @returns {Object} VR session state and actions
 */
export function useVRSession(projectId) {
  // VR support state
  const [vrSupported, setVrSupported] = useState(false);
  const [vrCapabilities, setVrCapabilities] = useState(null);
  const [checkingSupport, setCheckingSupport] = useState(true);

  // Session state
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isInVR, setIsInVR] = useState(false);
  // Data-manipulation token (VRManipulationLock via VRExplorationManager).
  // { holderUserId, holderUserName, ... } or null when nobody live holds it.
  const [manipulationHolder, setManipulationHolder] = useState(null);
  const [manipulationRequests, setManipulationRequests] = useState([]);
  // userId → what that user is manipulating right now ('dataset' | 'filter').
  const [activityByUserId, setActivityByUserId] = useState({});

  // Loading states
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);

  // Check VR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      setCheckingSupport(true);
      try {
        const supported = vrManager.isVRSupported();
        setVrSupported(supported);

        if (supported) {
          const capabilities = await vrManager.checkVRCapabilities();
          setVrCapabilities(capabilities);
        }
      } catch (err) {
        console.error("VR support check failed:", err);
        setVrSupported(false);
      } finally {
        setCheckingSupport(false);
      }
    };

    checkSupport();
  }, []);

  // Track the LOCAL VR exploration session (this browser hosting or having
  // entered VR for a session) via vrExplorationManager — the single
  // consolidated source of truth for VR session lifecycle. Do NOT read
  // vrManager's raw "sessionStarted" payload as a session: it carries
  // { session: XRSession, referenceSpace, sessionType, config }, not a
  // VRExplorationSession record, so treating it as one produced a session
  // object with none of the fields this hook's consumers read.
  useEffect(() => {
    const syncFromManager = () => {
      const session = vrExplorationManager.getActiveSession();
      setCurrentSession(session);
      setParticipants(session ? [...session.participants] : []);
      setIsInVR(vrManager.isInVR());
    };

    const offStarted = vrExplorationManager.on("explorationStarted", syncFromManager);
    const offJoined = vrExplorationManager.on("sessionJoined", syncFromManager);
    const offLeft = vrExplorationManager.on("sessionLeft", syncFromManager);

    // Participant list changes arrive via Y.js and mutate the active
    // session's participants array in place (VRParticipantSync) — resync on
    // the DOM events it dispatches so React sees a fresh array reference.
    window.addEventListener("cia:vr-participant-update", syncFromManager);
    window.addEventListener("cia:vr-participant-left", syncFromManager);

    syncFromManager(); // pick up a session already active on mount

    return () => {
      offStarted?.();
      offJoined?.();
      offLeft?.();
      window.removeEventListener("cia:vr-participant-update", syncFromManager);
      window.removeEventListener("cia:vr-participant-left", syncFromManager);
    };
  }, []);

  // Data-control token. The manager emits 'manipulationControlChanged' with
  // { holder, requests } on every lock transition (claim, grant, release,
  // stale-reclaim), so the desktop panel stays in step with the headsets
  // without polling.
  useEffect(() => {
    const sync = (state) => {
      setManipulationHolder(state?.holder ?? vrExplorationManager.getManipulationHolder());
      setManipulationRequests(state?.requests ?? vrExplorationManager.getManipulationRequests());
    };

    const off = vrExplorationManager.on("manipulationControlChanged", sync);
    sync(null); // pick up a lock already held on mount

    return () => off?.();
  }, []);

  // Live "who is touching what" map. Rides the EXISTING room-global manipulator
  // channel (yjsSetup.syncManipulatorToYjs → yjsObservers.onManipulatorChange →
  // workspaceManager's `cia:manipulator-changed` window event) that desktop
  // camera drags and VR's _signalManipulation both already write to — no new
  // Y.js map, no polling.
  useEffect(() => {
    const onManipulatorChanged = (e) => {
      const { userId, manipulator } = e.detail || {};
      if (!userId) return;
      setActivityByUserId((prev) => {
        const target = manipulator?.target || null;
        if ((prev[userId] || null) === target) return prev; // no re-render
        const next = { ...prev };
        if (target) next[userId] = target;
        else delete next[userId];
        return next;
      });
    };

    window.addEventListener("cia:manipulator-changed", onManipulatorChanged);
    return () => window.removeEventListener("cia:manipulator-changed", onManipulatorChanged);
  }, []);

  /**
   * Hand the data-manipulation token to another participant. Only meaningful
   * for the current holder or the host — the lock enforces that itself, this
   * just surfaces it.
   */
  const grantControl = useCallback((userId, userName) => {
    if (!userId) return false;
    return vrExplorationManager.grantManipulationControlTo(userId, userName);
  }, []);

  /** Ask the current holder for the data-manipulation token. */
  const requestControl = useCallback(() => {
    return vrExplorationManager.requestManipulationControl();
  }, []);

  /** Give the token back to the session host. */
  const releaseControl = useCallback(() => {
    return vrExplorationManager.releaseManipulationControl();
  }, []);

  // Fetch active sessions for project. These are raw vr_exploration_sessions
  // rows (snake_case: dataset_id, owner_user_name, participant_count) — a
  // different shape from currentSession's client-side VRExplorationSession
  // model (camelCase). See getSessionsForDataset.
  const fetchActiveSessions = useCallback(async () => {
    if (!projectId) return;

    setLoadingSessions(true);
    try {
      const sessions = await apiClient.get(
        `/vr/sessions?projectId=${encodeURIComponent(projectId)}`
      );
      setActiveSessions(sessions || []);
    } catch (err) {
      console.error("Failed to fetch VR sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [projectId]);

  // Fetch sessions on mount and project change
  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // Listen for WebSocket session/participant events (via serverSync custom
  // events). Unlike the raw REST responses above, these are already
  // normalized to camelCase by the server's wsManager broadcast helpers
  // (server/src/services/websocket.js) — only activeSessions' participant
  // counts are touched here; the locally-active session's own participants
  // list is owned by the sync effect above.
  useEffect(() => {
    const handleSessionCreated = (event) => {
      const { session } = event.detail || {};
      fetchActiveSessions();
      toast.info(`VR session started by ${session?.ownerUserName || "someone"}`);
    };

    const handleSessionUpdated = (event) => {
      const { sessionId, updates } = event.detail || {};
      setActiveSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s))
      );
    };

    const handleSessionEnded = (event) => {
      const { sessionId } = event.detail || {};
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    };

    const handleParticipantJoined = (event) => {
      const { sessionId, participant } = event.detail || {};
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, participant_count: (s.participant_count || 1) + 1 }
            : s
        )
      );
      if (sessionId && sessionId !== currentSession?.id) {
        toast.info(`${participant?.userName || "Someone"} joined a VR session`);
      }
    };

    const handleParticipantLeft = (event) => {
      const { sessionId } = event.detail || {};
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, participant_count: Math.max(0, (s.participant_count || 1) - 1) }
            : s
        )
      );
    };

    const handleSnapshotCreated = (event) => {
      const { sessionId, snapshot } = event.detail || {};
      if (currentSession?.id === sessionId) {
        toast.success(`Snapshot "${snapshot?.name}" created`);
      }
    };

    window.addEventListener("cia:vr-session-created", handleSessionCreated);
    window.addEventListener("cia:vr-session-updated", handleSessionUpdated);
    window.addEventListener("cia:vr-session-ended", handleSessionEnded);
    window.addEventListener("cia:vr-participant-joined", handleParticipantJoined);
    window.addEventListener("cia:vr-participant-left", handleParticipantLeft);
    window.addEventListener("cia:vr-snapshot-created", handleSnapshotCreated);

    return () => {
      window.removeEventListener("cia:vr-session-created", handleSessionCreated);
      window.removeEventListener("cia:vr-session-updated", handleSessionUpdated);
      window.removeEventListener("cia:vr-session-ended", handleSessionEnded);
      window.removeEventListener("cia:vr-participant-joined", handleParticipantJoined);
      window.removeEventListener("cia:vr-participant-left", handleParticipantLeft);
      window.removeEventListener("cia:vr-snapshot-created", handleSnapshotCreated);
    };
  }, [currentSession, fetchActiveSessions]);

  /**
   * Join an existing VR session — routes through vrExplorationManager so VR
   * entry (if requested) goes through the single consolidated session/
   * render path instead of duplicating WebXR/session logic here.
   */
  const joinSession = useCallback(
    async (sessionId, mode = "desktop-observer") => {
      setJoiningSession(true);
      try {
        // Reuse the row from the already-fetched list when available (avoid
        // a redundant refetch); vrExplorationManager.joinSession expects the
        // raw vr_exploration_sessions row shape either way.
        let record = activeSessions.find((s) => s.id === sessionId);
        if (!record) {
          record = await apiClient.get(`/vr/sessions/${sessionId}`);
        }

        const result = await vrExplorationManager.joinSession(record, mode);
        if (!result.joined) {
          throw new Error(result.reason || "Failed to join session");
        }

        toast.success(
          result.vrEntered ? "Joined VR session" : "Joined VR session as an observer"
        );
        return result;
      } catch (err) {
        toast.error(`Failed to join session: ${err.message}`);
        throw err;
      } finally {
        setJoiningSession(false);
      }
    },
    [activeSessions]
  );

  /**
   * Leave the current session — delegates full teardown (tools, spatial UI,
   * avatars, environment, XR session exit, server notification) to
   * vrExplorationManager.leaveSession() rather than duplicating it here.
   */
  const leaveSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await vrExplorationManager.leaveSession();
      toast.success("Left VR session");
    } catch (err) {
      toast.error(`Failed to leave session: ${err.message}`);
    }
  }, [currentSession]);

  /**
   * End the current session for all participants (owner only).
   */
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    const sessionId = currentSession.id;
    try {
      if (isInVR) {
        await vrExplorationManager.leaveSession();
      }
      // Locally-generated ids (registration never reached the server) have
      // nothing to delete server-side.
      if (sessionId && !String(sessionId).startsWith("vrsession_")) {
        await apiClient.delete(`/vr/sessions/${sessionId}`);
      }
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("VR session ended");
    } catch (err) {
      toast.error(`Failed to end session: ${err.message}`);
    }
  }, [currentSession, isInVR]);

  /**
   * Create a snapshot of the current session
   */
  const createSnapshot = useCallback(
    async (name) => {
      if (!currentSession) return;
      const sessionId = currentSession.id;
      if (!sessionId || String(sessionId).startsWith("vrsession_")) {
        throw new Error("Session is not registered with the server yet");
      }

      try {
        const snapshot = await apiClient.post(`/vr/sessions/${sessionId}/snapshots`, {
          name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
        });
        toast.success("Snapshot created");
        return snapshot;
      } catch (err) {
        toast.error(`Failed to create snapshot: ${err.message}`);
        throw err;
      }
    },
    [currentSession]
  );

  // Check if current user is session owner
  const isOwner = useMemo(() => {
    if (!currentSession) return false;
    return currentSession.ownerUserId === getUserId();
  }, [currentSession]);

  // Get sessions relevant to a specific dataset. activeSessions rows are raw
  // vr_exploration_sessions rows (snake_case) — see fetchActiveSessions.
  const getSessionsForDataset = useCallback(
    (datasetId) => {
      return activeSessions.filter(
        (s) => s.dataset_id === datasetId && s.status !== "ended"
      );
    },
    [activeSessions]
  );

  return {
    // VR support
    vrSupported,
    vrCapabilities,
    checkingSupport,

    // Session state
    activeSessions,
    currentSession,
    participants,
    isInVR,
    isOwner,

    // Data-control token
    manipulationHolder,
    manipulationRequests,
    activityByUserId,

    // Loading states
    loadingSessions,
    joiningSession,

    // Actions
    fetchActiveSessions,
    joinSession,
    leaveSession,
    endSession,
    createSnapshot,
    getSessionsForDataset,
    grantControl,
    requestControl,
    releaseControl,
  };
}

export default useVRSession;
