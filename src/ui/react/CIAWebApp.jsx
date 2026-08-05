// src/ui/react/CIAWebApp.jsx
// VR-first application shell.
//
// Layout: minimal header + full-screen VTK canvas.
// VR wrist menu handles in-headset controls.

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ui as log } from "@Utils/logger.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { followService } from "@Services/followService.js";
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
import { SnapshotPickerModal } from "@UI/react/components/modals/SnapshotPickerModal";
import { DeleteViewDialog } from "@UI/react/components/modals/confirmations/DeleteViewDialog";

// Sync conflict resolution (mounted globally so any manager's 'cia:sync-conflict' surfaces it)
import { ConflictResolutionDialog } from "@UI/react/components/organisms";

// Server-side rendering overlay
import { ServerRenderOverlay } from "@/rendering/ServerRenderOverlay.jsx";

// Toast
import { ToastContainer } from "@UI/react/components/molecules/Toast";
import { toast } from "@UI/react/store/toastStore";
import { appToasts } from "@UI/react/store/appToasts";

// Load-failure surfacing (ViewLifecycleService has no other way to reach the UI)
import { eventBus, BUS_EVENTS } from "@Core/events/EventBus.js";

// Config
import { config } from "@Core/config/clientConfig.js";

// Hooks
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import { useWebXRAvailability } from "@UI/react/components/organisms";
import { useVoiceControls } from "@UI/react/hooks/useVoiceBar.js";
import { useRoomIndicator } from "@UI/react/hooks/useRoomIndicator.js";
import { vrExplorationManager } from "@Core/vr/VRExplorationManager.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";

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

  // Follow-user service: wire camera-feed + window-event subscriptions once.
  useEffect(() => {
    followService.init();
  }, []);

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
    error: workspacesError,
    createPersonalWorkspace,
  // Note: do NOT pass roomId here. The Y.js session UUID (roomId from sessionManager)
  // is the collaboration channel key and is NOT a server-side rooms table record.
  // Passing it as roomId triggers a FK violation when creating workspaces for new link-based sessions.
  // Y.js already uses sessionManager.getRoomId() independently via yjsSetup.js.
  } = useWorkspaces({ userId, projectId });

  // Auto-create a personal workspace on first run (no workspace in this
  // project/room yet). This is only a guarded fallback: useWorkspaces already
  // get-or-creates a personal workspace during loadWorkspaces. We guard it hard
  // to avoid the creation loop that produced hundreds of thousands of rows:
  //   - fire at most once per session (autoCreateAttemptedRef), and
  //   - skip when the workspace list failed to load — a failed list is not an
  //     empty list, and creating on error would spam the server.
  const autoCreateAttemptedRef = useRef(false);
  useEffect(() => {
    if (isWorkspacesLoading || !userId || !projectId) return;
    if (workspacesError) return;
    if ((workspaces || []).length > 0) return;
    if (autoCreateAttemptedRef.current) return;
    autoCreateAttemptedRef.current = true;
    createPersonalWorkspace?.('My Workspace').catch((err) => {
      log.warn('Auto-create workspace failed:', err.message);
    });
  }, [isWorkspacesLoading, workspaces, userId, projectId, workspacesError, createPersonalWorkspace]);

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

  // Delta hydration: once a workspace is selected, scope the sync watermark
  // to it and replay any sync_events missed since this client's last visit
  // (falls back to full hydration when the watermark is absent or expired —
  // see performStartupHydration in syncService.js). Runs once per workspace
  // selection; dynamic imports keep boot order and module cycles out of play.
  useEffect(() => {
    if (!currentWorkspaceId || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ serverSync }, { performStartupHydration }, appInit, { viewGroupManager }, { workspaceAnnotationManager }] =
          await Promise.all([
            import('@Services/serverSync.js'),
            import('@Services/syncService.js'),
            import('@Init/appInitializer.js'),
            import('@Core/data/managers/ViewGroupManager.js'),
            import('@Core/data/managers/WorkspaceAnnotationManager.js'),
          ]);
        if (cancelled) return;
        serverSync.setWorkspaceId(currentWorkspaceId);
        await performStartupHydration(
          currentWorkspaceId,
          {
            viewConfigurationManager: appInit.getViewConfigurationManager?.(),
            annotationManager: appInit.getAnnotationManager?.(),
            viewGroupManager,
            workspaceAnnotationManager,
          },
          userId
        );
      } catch (err) {
        log.warn('Workspace delta hydration failed:', err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, userId]);

  const { canvasId } = useCanvas(currentWorkspace?.activeCanvasId || null);

  // ── VR ────────────────────────────────────────────────────────────────────
  const vrAvailable = useWebXRAvailability();
  const workspaceViewMode = config.enableMultiView ? 'tabs' : 'single';

  const handleEnterVR = useCallback(async () => {
    try {
      const instance = canvasId ? workspaceManager.getActiveInstanceForCanvas(canvasId) : null;
      if (!instance?.instanceData?.hasData) {
        toast.error("Open a dataset first");
        return;
      }
      await vrExplorationManager.startExploration(instance.instanceId, {});
    } catch (err) {
      log.error("Enter VR failed:", err);
      toast.error(`VR unavailable: ${err.message}`);
    }
  }, [canvasId]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  // Pass the resolved collaboration room id so the voice room is tied to the
  // session (the actual LiveKit room name is derived from sessionManager via
  // getVoiceRoomName; roomId here also drives presence/display context).
  const voice = useVoiceControls({ roomId: resolvedWorkspaceRoomId });

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

    // ViewLifecycleService has no UI of its own — it only emits VIEW_ERROR on
    // the core event bus when a requested dataset/view fails to load or
    // place. Without this bridge the failure is console-only and whatever
    // triggered it (e.g. a sample-dataset "Load" button) is left with a
    // spinner that clears on its own timeout with no explanation.
    const onViewError = ({ error } = {}) => {
      toast.error(appToasts.loadFailed(error).message, {
        description: appToasts.loadFailed(error).description,
        duration: appToasts.loadFailed(error).duration,
      });
    };

    window.addEventListener("cia:open-dataset-selector", onOpenDataset);
    window.addEventListener("cia:delete-view", onDeleteView);
    window.addEventListener("cia:toast", onToast);
    window.addEventListener("cia:switch-room", onSwitchRoom);
    window.addEventListener("cia:manipulator-changed", onManipulatorChanged);
    const unsubViewError = eventBus.on(BUS_EVENTS.VIEW_ERROR, onViewError);
    return () => {
      window.removeEventListener("cia:open-dataset-selector", onOpenDataset);
      window.removeEventListener("cia:delete-view", onDeleteView);
      window.removeEventListener("cia:toast", onToast);
      window.removeEventListener("cia:switch-room", onSwitchRoom);
      window.removeEventListener("cia:manipulator-changed", onManipulatorChanged);
      unsubViewError?.();
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

                      {/* Global snapshot picker — opens on cia:show-snapshot-picker */}
                      <SnapshotPickerModal />

                      <DeleteViewDialog
                        isOpen={deleteViewTarget !== null}
                        onClose={() => setDeleteViewTarget(null)}
                        view={deleteViewTarget}
                        onConfirm={handleConfirmDeleteView}
                      />

                      <ToastContainer />

                      {/* Sync conflict resolution — global listener for 'cia:sync-conflict' */}
                      <ConflictResolutionDialog />

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
