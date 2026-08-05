/**
 * @file VRSessionPanel.jsx
 * @description Panel showing active VR session status, participants, and controls.
 *
 * Features:
 * - Session status and info
 * - Participant list with roles
 * - Session controls (pause, end, settings)
 * - Scale visibility toggle
 * - Navigation mode selector
 * - Snapshot management
 */

import React, { memo, useState, useCallback, useEffect } from "react";
import { Icon, getIconComponent } from "@UI/react/components/atoms/Icon";
import { Button } from "@UI/react/components/atoms/Button";
import { UserAvatar } from "@UI/react/components/atoms/UserAvatar";
import { vrManager } from "@Core/vr/VRManager.js";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRSessionPanel.scss";

/**
 * Participant mode display info
 */
const PARTICIPANT_MODES = {
  "vr-explorer": { label: "VR Explorer", icon: "vr", color: "primary" },
  "vr-observer": { label: "VR Observer", icon: "eye", color: "info" },
  "desktop-observer": { label: "Desktop", icon: "monitor", color: "secondary" },
  "desktop-participant": { label: "Desktop (Active)", icon: "mousePointer", color: "success" },
};

/**
 * Navigation mode options
 */
const NAVIGATION_MODES = [
  { id: "fly", label: "Fly", icon: "plane" },
  { id: "teleport", label: "Teleport", icon: "cursor" },
  { id: "walk", label: "Walk", icon: "footprints" },
  { id: "orbit", label: "Orbit", icon: "orbit" },
];

/**
 * VRSessionPanel - Panel for managing active VR session
 *
 * @param {Object} props
 * @param {Object} props.session - Current VR session data
 * @param {Array} props.participants - Session participants
 * @param {boolean} props.isOwner - Whether current user owns the session
 * @param {string} props.currentUserId - Current user's ID
 * @param {Function} props.onEndSession - Callback to end session
 * @param {Function} props.onLeaveSession - Callback to leave session
 * @param {Function} props.onUpdateSettings - Callback to update session settings
 * @param {Function} props.onCreateSnapshot - Callback to create snapshot
 * @param {Object} [props.manipulationHolder] - Current data-control token holder
 *   ({ holderUserId, holderUserName }) from useVRSession, or null
 * @param {Object<string, string>} [props.activityByUserId] - userId → what that
 *   user is manipulating right now ('dataset' | 'filter')
 * @param {Function} [props.onGrantControl] - (userId, userName) => void; hand
 *   the data-control token to a participant
 * @param {string} props.className - Additional CSS class
 */
function VRSessionPanel({
  session,
  participants = [],
  isOwner = false,
  currentUserId,
  onEndSession,
  onLeaveSession,
  onUpdateSettings,
  onCreateSnapshot,
  manipulationHolder = null,
  activityByUserId = null,
  onGrantControl,
  className = "",
}) {
  // Local state
  const [navigationMode, setNavigationMode] = useState(session?.defaultExplorationMode || "fly");
  const [scaleVisibility, setScaleVisibility] = useState("my-scale");
  const [vrScale, setVrScale] = useState(session?.defaultVRScale || 1.0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Update local state when session changes
  useEffect(() => {
    if (session) {
      setNavigationMode(session.defaultExplorationMode || "fly");
      setVrScale(session.defaultVRScale || 1.0);
    }
  }, [session]);

  /**
   * Handle navigation mode change
   */
  const handleNavigationModeChange = useCallback(
    (modeId) => {
      setNavigationMode(modeId);
      // Emit event for VR system to pick up
      window.dispatchEvent(
        new CustomEvent("cia:vr-navigation-mode", { detail: { mode: modeId } })
      );
    },
    []
  );

  /**
   * Handle scale visibility toggle
   */
  const handleScaleVisibilityToggle = useCallback(() => {
    const newMode = scaleVisibility === "my-scale" ? "world-scale" : "my-scale";
    setScaleVisibility(newMode);
    window.dispatchEvent(
      new CustomEvent("cia:vr-scale-visibility", { detail: { mode: newMode } })
    );
  }, [scaleVisibility]);

  /**
   * Handle creating a snapshot
   */
  const handleCreateSnapshot = useCallback(async () => {
    try {
      if (onCreateSnapshot) {
        await onCreateSnapshot();
        toast.success("Snapshot created");
      }
    } catch (err) {
      toast.error(`Failed to create snapshot: ${err.message}`);
    }
  }, [onCreateSnapshot]);

  /**
   * Handle ending the session
   */
  const handleEndSession = useCallback(async () => {
    try {
      if (onEndSession) {
        await onEndSession();
      }
      setShowEndConfirm(false);
    } catch (err) {
      toast.error(`Failed to end session: ${err.message}`);
    }
  }, [onEndSession]);

  /**
   * Handle leaving the session
   */
  const handleLeaveSession = useCallback(async () => {
    try {
      if (onLeaveSession) {
        await onLeaveSession();
      }
    } catch (err) {
      toast.error(`Failed to leave session: ${err.message}`);
    }
  }, [onLeaveSession]);

  /**
   * Format scale for display
   */
  const formatScale = (scale) => {
    if (scale >= 1) {
      return `${scale.toFixed(1)}x`;
    }
    return `1:${(1 / scale).toFixed(1)}`;
  };

  // Get current user's participant info
  const currentParticipant = participants.find((p) => p.odUserId === currentUserId);

  // Group participants by mode
  const vrParticipants = participants.filter((p) =>
    p.mode?.startsWith("vr-")
  );
  const desktopParticipants = participants.filter((p) =>
    p.mode?.startsWith("desktop-")
  );

  if (!session) {
    return null;
  }

  const holderUserId = manipulationHolder?.holderUserId || null;
  // Only the current token holder and the session host can hand it on — same
  // rule VRManipulationLock.grantTo enforces. Showing the action to anyone
  // else would offer a button that silently fails.
  const canGrantControl =
    !!onGrantControl && (holderUserId === currentUserId || session.ownerUserId === currentUserId);

  const renderParticipant = (participant) => (
    <ParticipantRow
      key={participant.id}
      participant={participant}
      isCurrentUser={participant.odUserId === currentUserId}
      isOwner={participant.odUserId === session.ownerUserId}
      isHolder={!!holderUserId && participant.odUserId === holderUserId}
      activity={activityByUserId?.[participant.odUserId] || null}
      canGrantControl={canGrantControl && participant.odUserId !== holderUserId}
      onGrantControl={onGrantControl}
    />
  );

  return (
    <div className={`vr-session-panel ${className}`}>
      {/* Header */}
      <div className="vr-session-panel__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="vr-session-panel__header-left">
          <Icon name="vr" size={16} className="vr-session-panel__icon" />
          <span className="vr-session-panel__title">VR Session</span>
          <span className={`vr-session-panel__status vr-session-panel__status--${session.status}`}>
            {session.status}
          </span>
        </div>
        <Icon
          name={isExpanded ? "chevronUp" : "chevronDown"}
          size={14}
          className="vr-session-panel__toggle"
        />
      </div>

      {isExpanded && (
        <div className="vr-session-panel__content">
          {/* Navigation Mode */}
          <div className="vr-session-panel__section">
            <div className="vr-session-panel__section-header">
              <span>Navigation</span>
            </div>
            <div className="vr-session-panel__nav-modes">
              {NAVIGATION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`vr-session-panel__nav-mode ${navigationMode === mode.id ? "vr-session-panel__nav-mode--active" : ""}`}
                  onClick={() => handleNavigationModeChange(mode.id)}
                  title={mode.label}
                >
                  <Icon name={mode.icon} size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div className="vr-session-panel__section">
            <div className="vr-session-panel__section-header">
              <span>Scale</span>
              <span className="vr-session-panel__scale-value">{formatScale(vrScale)}</span>
            </div>
            <button
              className="vr-session-panel__visibility-toggle"
              onClick={handleScaleVisibilityToggle}
              title={scaleVisibility === "my-scale" ? "View at your scale" : "View at world scale"}
            >
              <Icon name={scaleVisibility === "my-scale" ? "user" : "globe"} size={14} />
              <span>{scaleVisibility === "my-scale" ? "My Scale" : "World Scale"}</span>
            </button>
          </div>

          {/* Participants */}
          <div className="vr-session-panel__section">
            <div className="vr-session-panel__section-header">
              <span>Participants</span>
              <span className="vr-session-panel__count">{participants.length}</span>
            </div>
            <div className="vr-session-panel__participants">
              {/* VR Participants */}
              {vrParticipants.length > 0 && (
                <div className="vr-session-panel__participant-group">
                  <div className="vr-session-panel__group-label">
                    <Icon name="vr" size={12} />
                    <span>In VR</span>
                  </div>
                  {vrParticipants.map(renderParticipant)}
                </div>
              )}

              {/* Desktop Participants */}
              {desktopParticipants.length > 0 && (
                <div className="vr-session-panel__participant-group">
                  <div className="vr-session-panel__group-label">
                    <Icon name="monitor" size={12} />
                    <span>Desktop</span>
                  </div>
                  {desktopParticipants.map(renderParticipant)}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="vr-session-panel__actions">
            <Button
              variant="secondary"
              size="sm"
              icon={getIconComponent("camera")}
              onClick={handleCreateSnapshot}
            >
              Snapshot
            </Button>

            {isOwner ? (
              <>
                {!showEndConfirm ? (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={getIconComponent("x")}
                    onClick={() => setShowEndConfirm(true)}
                  >
                    End Session
                  </Button>
                ) : (
                  <div className="vr-session-panel__confirm">
                    <span>End session?</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowEndConfirm(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleEndSession}>
                      End
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={getIconComponent("logOut")}
                onClick={handleLeaveSession}
              >
                Leave
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ParticipantRow - Individual participant display
 *
 * @param {Object} props
 * @param {Object} props.participant
 * @param {boolean} props.isCurrentUser
 * @param {boolean} props.isOwner - session host (crown)
 * @param {boolean} [props.isHolder] - holds the data-manipulation token
 * @param {string|null} [props.activity] - what they are manipulating right now
 * @param {boolean} [props.canGrantControl] - whether the viewer may hand them
 *   the token (holder or host only, and never for the holder's own row)
 * @param {Function} [props.onGrantControl]
 */
const ParticipantRow = memo(function ParticipantRow({
  participant,
  isCurrentUser,
  isOwner,
  isHolder = false,
  activity = null,
  canGrantControl = false,
  onGrantControl,
}) {
  const modeInfo = PARTICIPANT_MODES[participant.mode] || PARTICIPANT_MODES["desktop-observer"];

  const handleGrantControl = useCallback(
    (e) => {
      e.stopPropagation();
      onGrantControl?.(participant.odUserId, participant.userName);
    },
    [onGrantControl, participant.odUserId, participant.userName]
  );

  return (
    <div className={`vr-session-panel__participant ${isCurrentUser ? "vr-session-panel__participant--current" : ""} ${isHolder ? "vr-session-panel__participant--holder" : ""}`}>
      <UserAvatar
        name={participant.userName}
        size="xs"
        className="vr-session-panel__avatar"
      />
      <div className="vr-session-panel__participant-info">
        <span className="vr-session-panel__participant-name">
          {participant.userName}
          {isCurrentUser && <span className="vr-session-panel__you">(you)</span>}
          {isOwner && <Icon name="crown" size={10} className="vr-session-panel__owner-badge" title="Session owner" />}
          {/* Distinct from the crown: the host OWNS the session, the holder
              controls the DATA, and after a grant those are different people. */}
          {isHolder && (
            <span
              className="vr-session-panel__control-chip"
              title="Has data control — only this person can change what everyone sees"
            >
              Controlling
            </span>
          )}
        </span>
        <span className="vr-session-panel__participant-mode">
          <Icon name={modeInfo.icon} size={10} />
          {participant.vrScale && participant.vrScale !== 1.0 && (
            <span className="vr-session-panel__participant-scale">
              {participant.vrScale >= 1 ? `${participant.vrScale.toFixed(1)}x` : `1:${(1 / participant.vrScale).toFixed(1)}`}
            </span>
          )}
          {activity && (
            <span className="vr-session-panel__participant-activity">
              editing {activity}
            </span>
          )}
        </span>
      </div>
      {canGrantControl && (
        <button
          type="button"
          className="vr-session-panel__grant-control"
          onClick={handleGrantControl}
          title={`Give data control to ${participant.userName}`}
        >
          Give control
        </button>
      )}
    </div>
  );
});

export default memo(VRSessionPanel);
export { VRSessionPanel };
