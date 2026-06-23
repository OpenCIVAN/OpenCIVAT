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

// Modals
import { CreateRoomModal } from "@UI/react/components/modals/CreateRoomModal";
import { DatasetSelectorModal } from "@UI/react/components/modals/DatasetSelectorModal";
import { DeleteViewDialog } from "@UI/react/components/modals/confirmations/DeleteViewDialog";

// Toast
import { ToastContainer } from "@UI/react/components/molecules/Toast";
import { toast } from "@UI/react/store/toastStore";

// Hooks
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import {
  useWebXRAvailability,
  LAYOUT_MODES,
} from "@UI/react/components/organisms";
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
  } = useWorkspaces({ userId, projectId, roomId: resolvedWorkspaceRoomId });

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
  const [layoutMode] = useState(LAYOUT_MODES.NORMAL);

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

    window.addEventListener("cia:open-dataset-selector", onOpenDataset);
    window.addEventListener("cia:delete-view", onDeleteView);
    window.addEventListener("cia:toast", onToast);
    window.addEventListener("cia:switch-room", onSwitchRoom);
    return () => {
      window.removeEventListener("cia:open-dataset-selector", onOpenDataset);
      window.removeEventListener("cia:delete-view", onDeleteView);
      window.removeEventListener("cia:toast", onToast);
      window.removeEventListener("cia:switch-room", onSwitchRoom);
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
                              onClick={() => setShowCreateRoomModal(true)}
                              title="Manage collaboration session"
                            >
                              Session
                            </button>

                            {vrAvailable && (
                              <button
                                className="vr-app__btn vr-app__btn--vr"
                                onClick={handleEnterVR}
                                title="Enter VR (Quest 2 / WebXR)"
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
                            layoutMode={layoutMode}
                            leftPanelContent={
                              <LeftPanelContent workspaceId={currentWorkspaceId || 'default'} />
                            }
                          />
                        </main>

                        {/* Floating instance tools panel */}
                        <AllFloatingPanels workspaceId={currentWorkspaceId} />

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
