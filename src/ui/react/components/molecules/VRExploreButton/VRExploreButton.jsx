/**
 * @file VRExploreButton.jsx
 * @description Button to launch VR exploration session with configuration modal.
 * The single "Enter VR" control across the app — opens a configuration
 * modal before entering VR, creates a collaborative VR session, supports
 * joining existing sessions, and renders itself disabled with a tooltip
 * when no dataset is loaded rather than opening an empty session.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@UI/react/components/atoms/Icon";
import { SlashedIcon } from "@UI/react/components/atoms/IconOverlay/IconOverlay.jsx";
import { vrManager } from "@Core/vr/VRManager.js";
import { vrExplorationManager } from "@Core/vr/VRExplorationManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { PARTICIPATION_MODE } from "@Core/data/models/VRExplorationSession.js";
import { VRLaunchModal } from "@UI/react/components/modals/VRLaunchModal";
import { UsernameModal } from "@UI/react/components/modals/UsernameModal";
import {
  needsDisplayNamePrompt,
  setUserName,
} from "@Collaboration/presence/userManagement.js";
import { setDeviceName } from "@Core/identity/deviceIdentity.js";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRExploreButton.scss";

/**
 * VRExploreButton - Button to launch VR exploration with configuration
 *
 * @param {Object} props
 * @param {string} props.instanceId - The instance to explore
 * @param {Object} props.dataset - Dataset to explore
 * @param {Object} props.viewConfig - Current view configuration
 * @param {string} props.projectId - Project ID
 * @param {Object} props.selection - Current selection (optional)
 * @param {Object[]} props.activeSessions - Active VR sessions in this project
 * @param {string} props.size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {string} props.variant - Visual variant: 'default' | 'primary' | 'minimal'
 * @param {string} props.className - Additional CSS class
 */
export function VRExploreButton({
  instanceId,
  dataset,
  viewConfig,
  projectId,
  selection,
  activeSessions = [],
  size = "sm",
  showLabel = false,
  variant = "default",
  className = "",
}) {
  // VR state
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInVR, setIsInVR] = useState(false);
  const [handlerSupportsVR, setHandlerSupportsVR] = useState(false);

  // Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Check VR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      setIsLoading(true);

      try {
        const vrSupported = vrManager.isVRSupported();
        if (!vrSupported) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        const capabilities = await vrManager.checkVRCapabilities();
        setIsSupported(capabilities.supported);

        // Check if handler supports VR exploration
        if (instanceId) {
          const instance = workspaceManager.getInstance(instanceId);
          if (instance?.handler) {
            const supportsExploration =
              typeof instance.handler.supportsVRExploration === "function"
                ? instance.handler.supportsVRExploration()
                : false;
            setHandlerSupportsVR(supportsExploration);
          }
        }
      } catch (err) {
        console.error("VR exploration check failed:", err);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, [instanceId]);

  // Listen for VR session changes
  useEffect(() => {
    const handleSessionStarted = () => setIsInVR(true);
    const handleSessionEnded = () => setIsInVR(false);

    vrManager.on("sessionStarted", handleSessionStarted);
    vrManager.on("sessionEnded", handleSessionEnded);

    setIsInVR(vrManager.isInVR());

    return () => {
      vrManager.off("sessionStarted", handleSessionStarted);
      vrManager.off("sessionEnded", handleSessionEnded);
    };
  }, []);

  // Relevant active sessions for this dataset. Session rows come straight
  // from the server (SELECT * FROM vr_exploration_sessions), so fields are
  // snake_case (dataset_id, owner_user_name, participant_count) — not the
  // camelCase VRExplorationSession model shape used client-side.
  const relevantSessions = useMemo(() => {
    if (!dataset) return [];
    return activeSessions.filter(
      (s) => s.dataset_id === dataset.id && s.status !== "ended"
    );
  }, [activeSessions, dataset]);

  /**
   * Handle the display-name prompt being submitted.
   * Sets both the collaboration display name and the persistent device name,
   * so the headset keeps this name across reloads.
   */
  const handleNameSubmit = useCallback((name) => {
    setUserName(name);
    setDeviceName(name);
    setShowNamePrompt(false);
    toast.info(`Saved as "${name}" — tap Enter VR again to start`);
  }, []);

  /**
   * Handle button click
   */
  const handleClick = useCallback(() => {
    if (isInVR) {
      // Full teardown of tools/spatial UI/avatars/environment, then
      // vrManager.exitVR() internally — not a bare session end.
      vrExplorationManager.leaveSession();
      return;
    }

    // Ask for a display name BEFORE any VR entry path. This click deliberately
    // does not continue into VR: WebXR requestSession() needs fresh user
    // activation, and an intervening async modal burns it. The user submits a
    // name, then taps Enter VR again.
    if (needsDisplayNamePrompt()) {
      setShowNamePrompt(true);
      return;
    }

    if (relevantSessions.length > 0) {
      // Show session list to join or create new
      setShowSessionList(true);
    } else {
      // Open launch modal directly
      setShowLaunchModal(true);
    }
  }, [isInVR, relevantSessions]);

  /**
   * Handle joining an existing session, either as a VR participant (if this
   * browser supports it and the session's view is open locally) or as a
   * desktop observer watching the VR user's avatar/ray.
   */
  const handleJoinSession = useCallback(async (session, mode) => {
    try {
      const result = await vrExplorationManager.joinSession(session, mode);
      if (!result.joined) {
        throw new Error(result.reason || "Failed to join session");
      }
      if (mode === PARTICIPATION_MODE.VR_EXPLORER && !result.vrEntered) {
        // Joined the collaborative session, but couldn't enter VR locally
        // (e.g. that view isn't open in this browser) — still a success.
        toast.info(`Joined ${session.owner_user_name}'s session as an observer`);
      } else {
        toast.success(`Joined ${session.owner_user_name}'s VR session`);
      }
      setShowSessionList(false);
    } catch (err) {
      toast.error(`Failed to join session: ${err.message}`);
    }
  }, []);

  /**
   * Handle launching a new session
   */
  const handleLaunchNew = useCallback(() => {
    setShowSessionList(false);
    setShowLaunchModal(true);
  }, []);

  /**
   * Handle session launched
   */
  const handleSessionLaunched = useCallback((session) => {
    setShowLaunchModal(false);
  }, []);

  // Determine visibility based on actual per-instance/browser capability —
  // not the app-wide render mode (VTKInstanceHandler always renders locally
  // regardless of config.renderMode, so it's always VR-capable).
  const shouldShow = isSupported && (handlerSupportsVR || !instanceId);

  if (isLoading) {
    return (
      <button
        className={`vr-explore-button vr-explore-button--${size} vr-explore-button--${variant} vr-explore-button--loading ${className}`}
        disabled
        title="Checking VR support..."
      >
        <span className="vr-explore-button__icon">
          <Icon name="loader" size={size === "lg" ? 18 : size === "md" ? 16 : 14} />
        </span>
        {showLabel && <span className="vr-explore-button__label">VR</span>}
      </button>
    );
  }

  if (!shouldShow) {
    return null;
  }

  const iconSize = size === "lg" ? 18 : size === "md" ? 16 : 14;

  // No dataset loaded yet: show a real, disabled control rather than a
  // button that would open a VR session with nothing to explore.
  if (!dataset) {
    return (
      <button
        className={`vr-explore-button vr-explore-button--${size} vr-explore-button--disabled ${className}`}
        disabled
        title="Load a dataset to explore in VR"
        aria-label="Load a dataset to explore in VR"
      >
        <span className="vr-explore-button__icon">
          <Icon name="vr" size={iconSize} />
        </span>
        {showLabel && <span className="vr-explore-button__label">Explore in VR</span>}
      </button>
    );
  }

  const getTooltip = () => {
    if (isInVR) return "Exit VR exploration";
    if (relevantSessions.length > 0) return `Join VR session (${relevantSessions.length} active)`;
    return "Start VR exploration";
  };

  const getLabel = () => {
    if (isInVR) return "Exit VR";
    if (relevantSessions.length > 0) return `VR (${relevantSessions.length})`;
    return "Explore in VR";
  };

  return (
    <>
      <button
        className={`vr-explore-button vr-explore-button--${size} vr-explore-button--${variant} ${isInVR ? "vr-explore-button--active" : ""} ${className}`}
        onClick={handleClick}
        title={getTooltip()}
        aria-label={getTooltip()}
        aria-pressed={isInVR}
      >
        <span className="vr-explore-button__icon">
          {isInVR ? (
            <SlashedIcon icon="vr" size={iconSize} />
          ) : (
            <Icon name="vr" size={iconSize} />
          )}
        </span>

        {showLabel && <span className="vr-explore-button__label">{getLabel()}</span>}

        {/* Session count badge */}
        {!isInVR && relevantSessions.length > 0 && !showLabel && (
          <span className="vr-explore-button__badge">{relevantSessions.length}</span>
        )}

        {/* Active pulse */}
        {isInVR && <span className="vr-explore-button__pulse" />}
      </button>

      {/* Display-name prompt — shown on the click BEFORE the one that enters
          VR, so the WebXR user activation is never spent on this modal. */}
      {showNamePrompt && (
        <UsernameModal
          onSubmit={handleNameSubmit}
          onCancel={() => setShowNamePrompt(false)}
          title="Name yourself"
          subtitle="Everyone in the VR session sees this name"
          label="Display name"
          submitLabel="Save name"
          hint="Tap Enter VR again once your name is saved"
        />
      )}

      {/* Launch Modal */}
      <VRLaunchModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        instanceId={instanceId}
        dataset={dataset}
        viewConfig={viewConfig}
        projectId={projectId}
        selection={selection}
        onLaunch={handleSessionLaunched}
      />

      {/* Session List Popover */}
      {showSessionList && (
        <div className="vr-explore-button__session-list">
          <div className="vr-explore-button__session-header">
            <span>Active VR Sessions</span>
            <button
              className="vr-explore-button__close"
              onClick={() => setShowSessionList(false)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
          <div className="vr-explore-button__sessions">
            {relevantSessions.map((session) => (
              <div key={session.id} className="vr-explore-button__session-item">
                <div className="vr-explore-button__session-info">
                  <Icon name="vr" size={14} />
                  <span className="vr-explore-button__session-owner">
                    {session.owner_user_name}'s session
                  </span>
                  <span className="vr-explore-button__session-count">
                    {session.participant_count || 1} participant{(session.participant_count || 1) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="vr-explore-button__session-actions">
                  {isSupported && (
                    <button
                      className="vr-explore-button__session-join vr-explore-button__session-join--vr"
                      onClick={() => handleJoinSession(session, PARTICIPATION_MODE.VR_EXPLORER)}
                      title="Join this session in VR"
                    >
                      Join in VR
                    </button>
                  )}
                  <button
                    className="vr-explore-button__session-join vr-explore-button__session-join--desktop"
                    onClick={() => handleJoinSession(session, PARTICIPATION_MODE.DESKTOP_OBSERVER)}
                    title="Watch this session from the desktop"
                  >
                    Observe on desktop
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="vr-explore-button__new-session"
            onClick={handleLaunchNew}
          >
            <Icon name="plus" size={14} />
            <span>Start new session</span>
          </button>
        </div>
      )}
    </>
  );
}

export default VRExploreButton;
