// src/ui/react/CIAWebApp.jsx
// VR-first application shell.
//
// Layout: minimal header + full-screen VTK canvas.
// VR wrist menu handles in-headset controls.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

// Layout
import { AdaptiveProvider } from "@UI/react/context/AdaptiveContext.jsx";

// Panels (providers needed by CanvasWorkspace sub-components)
import {
  LeftPanelProvider,
  LeftPanelContent,
} from "@UI/react/components/panels/LeftPanel";
import {
  RightPanelProvider,
} from "@UI/react/components/panels/RightPanel";
import {
  FloatingPanelProvider,
  AllFloatingPanels,
} from "@UI/react/components/panels/FloatingPanel";
import { PanelShellProvider } from "@UI/react/components/panels/PanelShell";
import { LayoutPanelProvider } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { VRAccessibilityProvider } from "@UI/react/context/VRAccessibilityContext";
import { VGEditorProvider } from "@UI/react/context";
import { VRWristMenuProvider } from "@UI/react/components/organisms/VRWristMenu";
import { VRWristMenu } from "@UI/react/components/organisms/VRWristMenu";

// Canvas
import { CanvasWorkspace } from "@UI/react/components/workspace";

// Session sharing panel
import { SessionPanel } from "@UI/react/components/panels/SessionPanel/SessionPanel.jsx";

// Modals
import { CreateRoomModal } from "@UI/react/components/modals/CreateRoomModal";
import { DatasetSelectorModal } from "@UI/react/components/modals/DatasetSelectorModal";
import { DeleteViewDialog } from "@UI/react/components/modals/confirmations/DeleteViewDialog";

// Server-side rendering overlay
import { ServerRenderOverlay } from "@/rendering/ServerRenderOverlay.jsx";

// Toast
import { ToastContainer } from "@UI/react/components/molecules/Toast";
import { toast } from "@UI/react/store/toastStore";

// Config
import { config } from "@Core/config/clientConfig.js";

// Hooks
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import { useWebXRAvailability } from "@UI/react/components/organisms";
import { useVoiceControls } from "@UI/react/hooks/useVoiceBar.js";
import { useRoomIndicator } from "@UI/react/hooks/useRoomIndicator.js";
import { vrManager } from "@Core/vr/VRManager.js";

import "./CIAWebApp.scss";

export function CIAWebApp({ username, userId, projectId }) {
  // ── Room & collaboration ──────────────────────────────────────────────────
  const [workspaceRoomId, setWorkspaceRoomId] = useState(null);

  const {
    currentRoomId,
    currentRoomName,
    roomMembers,
    switchRoom,
    createRoom,
  } = useRoomIndicator({ projectId, userId });

  useEffect(() => {
    setWorkspaceRoomId(currentRoomId || null);
  }, [currentRoomId]);

  const resolvedWorkspaceRoomId = useMemo(
    () => workspaceRoomId || currentRoomId || sessionManager.getRoomId?.() || null,
    [workspaceRoomId, currentRoomId]
  );

  // ── Workspace ─────────────────────────────────────────────────────────────
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    selectWorkspace,
    updateWorkspace,
    isLoading: isWorkspacesLoading,
    createPersonalWorkspace,
  // Note: do NOT pass roomId here. The Y.js session UUID (roomId from sessionManager)
  // is the collaboration channel key and is NOT a server-side rooms table record.
  // Passing it as roomId triggers a FK violation when creating workspaces for new link-based sessions.
  // Y.js already uses sessionManager.getRoomId() independently via yjsSetup.js.
  } = useWorkspaces({ userId, projectId });

  // Auto-create a personal workspace on first run (no workspace in this project/room yet)
  useEffect(() => {
    if (isWorkspacesLoading || !userId || !projectId) return;
    if ((workspaces || []).length > 0) return;
    createPersonalWorkspace?.('My Workspace').catch((err) => {
      log.warn('Auto-create workspace failed:', err.message);
    });
  }, [isWorkspacesLoading, workspaces, userId, projectId, createPersonalWorkspace]);

  // Ensure the active workspace has a canvas
  const ensureCanvas = useCallback(
    async (workspaceId) => {
      if (!workspaceId) return null;
      const ws = (workspaces || []).find((w) => w.id === workspaceId);
      if (!ws) return null;
      if (ws.activeCanvasId) return ws.activeCanvasId;
      if (ws.canvasIds?.length) {
        await updateWorkspace?.(ws.id, { activeCanvasId: ws.canvasIds[0] });
        return ws.canvasIds[0];
      }
      try {
        const { canvasManager } = await import("@Core/data/managers/CanvasManager.js");
        const canvas = await canvasManager.createCanvas(
          projectId || ws.projectId || null,
          {
            name: ws.name || "Workspace",
            ownership:
              ws.type === "personal"
                ? { type: "personal", ownerId: userId || "anonymous" }
                : { type: "project", ownerId: projectId || ws.projectId },
            workspaceId: ws.id,
            projectId: projectId || ws.projectId || null,
          }
        );
        const { workspaceManager } = await import("@Core/data/managers/WorkspaceManager.js");
        await workspaceManager.addCanvasToWorkspace(ws.id, canvas.id);
        await updateWorkspace?.(ws.id, { activeCanvasId: canvas.id });
        return canvas.id;
      } catch (err) {
        log.error("Failed to create canvas:", err);
        return null;
      }
    },
    [projectId, updateWorkspace, userId, workspaces]
  );

  // Auto-select first workspace on load
  useEffect(() => {
    if (!workspaces?.length) return;
    if (!currentWorkspaceId) {
      selectWorkspace(workspaces[0].id);
    } else {
      ensureCanvas(currentWorkspaceId);
    }
  }, [workspaces, currentWorkspaceId, selectWorkspace, ensureCanvas]);

  const { canvasId } = useCanvas(currentWorkspace?.activeCanvasId || null);

  // ── VR ────────────────────────────────────────────────────────────────────
  const vrAvailable = useWebXRAvailability();
  const workspaceViewMode = config.enableMultiView ? 'tabs' : 'single';

  const handleEnterVR = useCallback(async () => {
    try {
      await vrManager.enterVR();
    } catch (err) {
      log.error("Enter VR failed:", err);
      toast.error(`VR unavailable: ${err.message}`);
    }
  }, []);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const voice = useVoiceControls();

  // ── Modal state ───────────────────────────────────────────────────────────
  const [datasetSelectorTarget, setDatasetSelectorTarget] = useState(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [deleteViewTarget, setDeleteViewTarget] = useState(null);

  // ── Manipulator awareness ─────────────────────────────────────────────────
  const [activeManipulator, setActiveManipulator] = useState(null);

  // ── Session panel ─────────────────────────────────────────────────────────
  const [showSessionPanel, setShowSessionPanel] = useState(false);

  // ── Event bridges ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onOpenDataset = (e) => {
      const { targetRow = 0, targetCol = 0 } = e.detail || {};
      setDatasetSelectorTarget({ row: targetRow, col: targetCol });
    };
    const onDeleteView = (e) => {
      const { view } = e.detail || {};
      if (view) setDeleteViewTarget(view);
    };
    const onToast = (e) => {
      const { message, type = "info", ...opts } = e.detail || {};
      if (!message) return;
      switch (type) {
        case "success": toast.success(message, opts); break;
        case "error":   toast.error(message, opts);   break;
        case "warning": toast.warning(message, opts); break;
        case "sync":    toast.sync(message, opts);    break;
        default:        toast.info(message, opts);
      }
    };
    const onSwitchRoom = (e) => {
      const { roomId } = e.detail || {};
      if (roomId) switchRoom(roomId);
    };

    const onManipulatorChanged = (e) => {
      const { manipulator } = e.detail || {};
      setActiveManipulator(manipulator?.target ? manipulator : null);
    };

    window.addEventListener("cia:open-dataset-selector", onOpenDataset);
    window.addEventListener("cia:delete-view", onDeleteView);
    window.addEventListener("cia:toast", onToast);
    window.addEventListener("cia:switch-room", onSwitchRoom);
    window.addEventListener("cia:manipulator-changed", onManipulatorChanged);
    return () => {
      window.removeEventListener("cia:open-dataset-selector", onOpenDataset);
      window.removeEventListener("cia:delete-view", onDeleteView);
      window.removeEventListener("cia:toast", onToast);
      window.removeEventListener("cia:switch-room", onSwitchRoom);
      window.removeEventListener("cia:manipulator-changed", onManipulatorChanged);
    };
  }, [switchRoom]);

  // Voice event bridge (activity bar → voice controls)
  useEffect(() => {
    const onVoiceAction = (e) => {
      const { action } = e.detail || {};
      switch (action) {
        case "joinLeave":     voice.inVoice ? voice.leaveVoice?.() : voice.joinVoice?.(); break;
        case "toggleMute":   voice.toggleMute?.();   break;
        case "toggleDeafen": voice.toggleDeafen?.(); break;
        default: break;
      }
    };
    window.addEventListener("cia:voice-action", onVoiceAction);
    return () => window.removeEventListener("cia:voice-action", onVoiceAction);
  }, [voice]);

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    presenceSystem.destroy();
    sessionManager.clearSession();
    await authService.logout();
  }, []);


  // ── Delete view handler ───────────────────────────────────────────────────
  const handleConfirmDeleteView = useCallback(async () => {
    if (!deleteViewTarget?.id) return;
    try {
      const { getViewConfigurationManager } = await import("@Init/appInitializer.js");
      const { canvasManager } = await import("@Core/data/managers/CanvasManager.js");
      const vcm = getViewConfigurationManager();
      const placement = canvasManager.getPlacementForView(deleteViewTarget.id);
      if (placement) {
        const activeCanvas = canvasManager.getActiveCanvas();
        if (activeCanvas?.id) {
          await canvasManager.removePlacement(activeCanvas.id, placement.id);
        }
      }
      await vcm.deleteView(deleteViewTarget.id);
      toast.success(`Deleted "${deleteViewTarget.name}"`);
    } catch (err) {
      log.error("Delete view failed:", err);
      toast.error(`Failed to delete view: ${err.message}`);
    }
    setDeleteViewTarget(null);
  }, [deleteViewTarget]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdaptiveProvider autoSyncVR>
      <VRWristMenuProvider>
        <VRAccessibilityProvider>
          <FloatingPanelProvider>
            <VGEditorProvider>
              <PanelShellProvider>
                <LeftPanelProvider>
                  <RightPanelProvider>
                    <LayoutPanelProvider canvasId={canvasId}>

                      <div className="vr-app">
                        {/* ── Minimal header ── */}
                        <header className="vr-app__header">
                          <span className="vr-app__brand">CIA Web</span>

                          <span className="vr-app__session">
                            {currentRoomName || sessionManager.getRoomId?.() || "session"}
                            {roomMembers.length > 0 && (
                              <span className="vr-app__users">
                                {" · "}{roomMembers.length} user{roomMembers.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </span>

                          <div className="vr-app__actions">
                            <button
                              className="vr-app__btn"
                              onClick={() => setDatasetSelectorTarget({ row: 0, col: 0 })}
                              title="Load a dataset"
                            >
                              Load Data
                            </button>

                            <button
                              className="vr-app__btn"
                              onClick={() => setShowSessionPanel((v) => !v)}
                              title="Share or join a collaboration session"
                            >
                              Session
                            </button>

                            {vrAvailable && (
                              <button
                                className="vr-app__btn vr-app__btn--vr"
                                onClick={handleEnterVR}
                                title="Enter Immersive Mode (WebXR)"
                              >
                                Enter VR
                              </button>
                            )}

                            <button
                              className="vr-app__btn vr-app__btn--ghost"
                              onClick={handleSignOut}
                              title="Sign out"
                            >
                              {username || "Sign out"}
                            </button>
                          </div>
                        </header>

                        {/* ── Full-screen VTK canvas ── */}
                        <main className="vr-app__canvas">
                          <CanvasWorkspace
                            workspaceId={currentWorkspaceId}
                            userId={userId || sessionManager.getUserId?.() || "anonymous"}
                            projectId={projectId}
                            workspaceViewMode={workspaceViewMode}
                            leftPanelContent={
                              <LeftPanelContent workspaceId={currentWorkspaceId || 'default'} />
                            }
                          />
                        </main>

                        {/* Floating instance tools panel */}
                        <AllFloatingPanels workspaceId={currentWorkspaceId} />

                        {/* Active manipulator badge */}
                        {activeManipulator && (
                          <div className="vr-app__manipulator-badge" aria-live="polite">
                            <span className="vr-app__manipulator-dot" />
                            <span>
                              {activeManipulator.displayName || activeManipulator.userId}{" "}
                              is {activeManipulator.action || "manipulating"} the {activeManipulator.target}
                            </span>
                          </div>
                        )}

                        {/* Session sharing panel */}
                        {showSessionPanel && (
                          <SessionPanel
                            roomMembers={roomMembers}
                            onClose={() => setShowSessionPanel(false)}
                          />
                        )}

                        {/* VR wrist menu (only in headset) */}
                        <VRWristMenu showInDesktop={false} />
                      </div>

                      {/* ── Modals ── */}
                      <CreateRoomModal
                        isOpen={showCreateRoomModal}
                        onClose={() => setShowCreateRoomModal(false)}
                        onCreate={async (roomData) => {
                          try {
                            await createRoom(roomData);
                            setShowCreateRoomModal(false);
                          } catch (err) {
                            log.error("Failed to create room:", err);
                          }
                        }}
                        availableUsers={(roomMembers || []).filter((m) => !m.isYou)}
                      />

                      <DatasetSelectorModal
                        isOpen={datasetSelectorTarget !== null}
                        onClose={() => setDatasetSelectorTarget(null)}
                        targetRow={datasetSelectorTarget?.row ?? 0}
                        targetCol={datasetSelectorTarget?.col ?? 0}
                      />

                      <DeleteViewDialog
                        isOpen={deleteViewTarget !== null}
                        onClose={() => setDeleteViewTarget(null)}
                        view={deleteViewTarget}
                        onConfirm={handleConfirmDeleteView}
                      />

                      <ToastContainer />

                      {/* Server-rendered VTK overlay (shown when RENDER_MODE=server and dataset selected) */}
                      <ServerRenderOverlay />

                    </LayoutPanelProvider>
                  </RightPanelProvider>
                </LeftPanelProvider>
              </PanelShellProvider>
            </VGEditorProvider>
          </FloatingPanelProvider>
        </VRAccessibilityProvider>
      </VRWristMenuProvider>
    </AdaptiveProvider>
  );
}

export default CIAWebApp;
