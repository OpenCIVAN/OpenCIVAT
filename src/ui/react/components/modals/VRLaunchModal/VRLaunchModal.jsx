/**
 * @file VRLaunchModal.jsx
 * @description Modal for configuring and launching a VR exploration session.
 *
 * Features:
 * - Choose navigation mode (fly, teleport, walk, move, move object)
 * - Set initial VR scale
 * - Review how to interact (selection, gripless input, in-VR menu features)
 * - Launch VR session
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from "react";
import { Icon, getIconComponent } from "@UI/react/components/atoms/Icon";
import { Modal } from "../Modal";
import { Button } from "@UI/react/components/atoms/Button";
import { vrManager } from "@Core/vr/VRManager.js";
import { vrExplorationManager } from "@Core/vr/VRExplorationManager.js";
import { EXPLORATION_MODES } from "@Core/data/models/VRExplorationSession.js";
import { NAVIGATION_MODE_INFO } from "@Core/vr/navigation/VRNavigationController.js";
import { toast } from "@UI/react/store/toastStore.js";
import "./VRLaunchModal.scss";

// Icon registry keys for each mode. NAVIGATION_MODE_INFO's own `icon` field
// uses a different, non-registry naming scheme (it also drives the in-VR
// spatial menu's hint copy), so this is a separate, small display-only map.
const MODE_ICONS = {
  [EXPLORATION_MODES.FLY]: "compass",
  [EXPLORATION_MODES.TELEPORT]: "target",
  [EXPLORATION_MODES.WALK]: "footprints",
  [EXPLORATION_MODES.GRAB]: "move",
  [EXPLORATION_MODES.MOVE_OBJECT]: "move",
};

/**
 * Navigation mode options, derived from NAVIGATION_MODE_INFO (the single
 * source of truth also used by the in-VR spatial menu's hint line) instead of
 * a second hand-maintained list — the previous version included a fake
 * "orbit" mode that didn't correspond to any real EXPLORATION_MODES value and
 * silently never worked. All 5 real modes are offered here (not just the 3
 * locomotion ones) so a user can see Move/Move Object's controls before
 * entering VR, even though they're most often reached via the in-VR menu.
 */
const NAVIGATION_MODES = [
  EXPLORATION_MODES.FLY,
  EXPLORATION_MODES.TELEPORT,
  EXPLORATION_MODES.WALK,
  EXPLORATION_MODES.GRAB,
  EXPLORATION_MODES.MOVE_OBJECT,
].map((id) => ({
  id,
  label: NAVIGATION_MODE_INFO[id].name,
  description: NAVIGATION_MODE_INFO[id].description,
  controls: NAVIGATION_MODE_INFO[id].controls,
  icon: MODE_ICONS[id],
}));

/**
 * Scale preset options
 */
// vrScale follows VTKInstanceHandler._updateCameraFromVRPose's mapping
// (dataPos = xrPos/vrScale + vrOrigin): a SMALL vrScale means a given
// physical step covers a LARGE data-space distance (overview — the whole
// dataset fits in a normal room), a LARGE vrScale means a physical step
// covers only a tiny data-space distance (zoomed into fine detail). Matches
// the auto-fit/isolation convention (vrScale = 2.5 / dataset diagonal).
const SCALE_PRESETS = [
  { id: "overview", label: "Overview", scale: 0.1, description: "See the whole dataset" },
  { id: "normal", label: "Normal", scale: 1.0, description: "1:1 scale" },
  { id: "detail", label: "Detail", scale: 10.0, description: "10x magnification" },
  { id: "micro", label: "Micro", scale: 100.0, description: "100x magnification" },
];

/**
 * VRLaunchModal - Modal for launching VR exploration sessions
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {() => void} props.onClose - Close handler
 * @param {string} props.instanceId - The workspace instance to explore in VR
 * @param {Object} props.dataset - The dataset to explore
 * @param {Object} props.viewConfig - Current view configuration
 * @param {string} props.projectId - Project ID for the session
 * @param {Function} props.onLaunch - Callback when session is launched
 * @param {string} props.className - Additional CSS class
 */
function VRLaunchModal({
  isOpen,
  onClose,
  instanceId,
  dataset,
  viewConfig,
  projectId,
  onLaunch,
  className = "",
}) {
  // VR support state
  const [vrSupported, setVrSupported] = useState(null);
  const [vrCapabilities, setVrCapabilities] = useState(null);
  const [checkingSupport, setCheckingSupport] = useState(true);

  // Configuration state. Default to "fly" so the left stick works on entry
  // (smooth locomotion + snap turn on right stick). Teleport is now an
  // optional toggle available via the in-VR menu. See NAVIGATION_MODE_INFO
  // for the new control mappings.
  const [navigationMode, setNavigationMode] = useState("fly");
  const [scalePreset, setScalePreset] = useState("normal");
  const [customScale, setCustomScale] = useState(1.0);
  const [useCustomScale, setUseCustomScale] = useState(false);

  // UI state
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState("");

  // Check VR support when modal opens
  useEffect(() => {
    if (isOpen) {
      checkVRSupport();
    }
  }, [isOpen]);

  /**
   * Check VR capabilities
   */
  const checkVRSupport = useCallback(async () => {
    setCheckingSupport(true);
    setError("");

    try {
      const isSupported = vrManager.isVRSupported();
      setVrSupported(isSupported);

      if (isSupported) {
        const capabilities = await vrManager.checkVRCapabilities();
        setVrCapabilities(capabilities);
      }
    } catch (err) {
      console.error("VR support check failed:", err);
      setError("Failed to check VR support");
      setVrSupported(false);
    } finally {
      setCheckingSupport(false);
    }
  }, []);

  // Derive effective scale
  const effectiveScale = useMemo(() => {
    if (useCustomScale) {
      return customScale;
    }
    const preset = SCALE_PRESETS.find((p) => p.id === scalePreset);
    return preset?.scale || 1.0;
  }, [useCustomScale, customScale, scalePreset]);

  /**
   * Handle launching the VR session.
   *
   * Delegates everything to vrExplorationManager.startExploration(), which
   * is the single path that: registers the session with the server (via
   * apiClient, not a raw unauthenticated fetch), requests the XR session
   * through VRManager (the sole session owner), and enters VR exploration
   * on the handler with a working WebGL/XRWebGLLayer already attached.
   */
  const handleLaunch = useCallback(async () => {
    if (!vrSupported || !dataset || !instanceId) return;

    setIsLaunching(true);
    setError("");

    try {
      const sessionConfig = {
        viewConfigurationId: viewConfig?.id,
        datasetId: dataset.id,
        projectId,
        explorationMode: navigationMode,
        vrScale: effectiveScale,
      };

      const session = await vrExplorationManager.startExploration(instanceId, sessionConfig);

      toast.success("VR session started");

      // Notify parent
      if (onLaunch) {
        onLaunch(session);
      }

      onClose();
    } catch (err) {
      console.error("Failed to launch VR session:", err);
      setError(err.message || "Failed to launch VR session");
      toast.error(`VR launch failed: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  }, [
    vrSupported,
    dataset,
    instanceId,
    viewConfig,
    projectId,
    navigationMode,
    effectiveScale,
    onLaunch,
    onClose,
  ]);

  // Build class names
  const contentClassNames = ["vr-launch-modal", className].filter(Boolean).join(" ");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Launch VR Exploration"
      icon={getIconComponent("vr")}
      severity="info"
      size="md"
      footer={
        <div className="vr-launch-modal__footer">
          <Button variant="ghost" onClick={onClose} disabled={isLaunching}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLaunch}
            loading={isLaunching}
            disabled={!vrSupported || checkingSupport || isLaunching || !instanceId}
            icon={getIconComponent("vr")}
          >
            {isLaunching ? "Launching..." : "Enter VR"}
          </Button>
        </div>
      }
    >
      <div className={contentClassNames}>
        {/* VR Support Status */}
        {checkingSupport && (
          <div className="vr-launch-modal__status vr-launch-modal__status--checking">
            <Icon name="loader" size={16} className="vr-launch-modal__spinner" />
            <span>Checking VR support...</span>
          </div>
        )}

        {!checkingSupport && !vrSupported && (
          <div className="vr-launch-modal__status vr-launch-modal__status--unsupported">
            <Icon name="warning" size={16} />
            <span>WebXR is not supported in this browser or no VR headset is connected.</span>
          </div>
        )}

        {!checkingSupport && vrSupported && vrCapabilities && (
          <div className="vr-launch-modal__status vr-launch-modal__status--supported">
            <Icon name="check" size={16} />
            <span>VR headset detected (Meta Quest Browser recommended)</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="vr-launch-modal__error" role="alert">
            <Icon name="alertCircle" size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Dataset info */}
        {dataset && (
          <div className="vr-launch-modal__section">
            <h4 className="vr-launch-modal__section-title">Dataset</h4>
            <div className="vr-launch-modal__dataset-info">
              <Icon name="cube" size={16} />
              <span>{dataset.filename || dataset.name}</span>
            </div>
          </div>
        )}

        {/* Navigation Mode */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Navigation Mode</h4>
          <div className="vr-launch-modal__mode-grid">
            {NAVIGATION_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`vr-launch-modal__mode-option ${navigationMode === mode.id ? "vr-launch-modal__mode-option--active" : ""}`}
                onClick={() => setNavigationMode(mode.id)}
                disabled={!vrSupported}
              >
                <Icon name={mode.icon} size={20} />
                <span className="vr-launch-modal__mode-label">{mode.label}</span>
                <span className="vr-launch-modal__mode-desc">{mode.description}</span>
                <span className="vr-launch-modal__mode-controls">{mode.controls}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How to Interact */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">How to Interact</h4>
          <ul className="vr-launch-modal__hints">
            <li>Point and pull the trigger (or pinch, on Vision Pro) to select a menu button or place a tool marker.</li>
            <li>On Vision Pro there's no trigger or thumbstick — look at a control and pinch to select it.</li>
            <li>Pinch/squeeze with both hands and pull apart to zoom, twist to rotate.</li>
            <li>Save/load session snapshots and mute or join voice chat from the in-VR menu — no need to remove your headset.</li>
          </ul>
        </div>

        {/* Scale Settings */}
        <div className="vr-launch-modal__section">
          <h4 className="vr-launch-modal__section-title">Initial Scale</h4>
          <div className="vr-launch-modal__scale-presets">
            {SCALE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`vr-launch-modal__scale-preset ${!useCustomScale && scalePreset === preset.id ? "vr-launch-modal__scale-preset--active" : ""}`}
                onClick={() => {
                  setScalePreset(preset.id);
                  setUseCustomScale(false);
                }}
                disabled={!vrSupported}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="vr-launch-modal__custom-scale">
            <label>
              <input
                type="checkbox"
                checked={useCustomScale}
                onChange={(e) => setUseCustomScale(e.target.checked)}
                disabled={!vrSupported}
              />
              Custom scale:
            </label>
            <input
              type="number"
              min="0.001"
              max="100"
              step="0.1"
              value={customScale}
              onChange={(e) => setCustomScale(parseFloat(e.target.value) || 1.0)}
              disabled={!vrSupported || !useCustomScale}
              className="vr-launch-modal__scale-input"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default memo(VRLaunchModal);
export { VRLaunchModal };
