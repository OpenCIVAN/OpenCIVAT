// src/ui/react/CIAWebApp.jsx
// =============================================================================
// MAIN APPLICATION COMPONENT - SIMPLIFIED VERSION
// =============================================================================
// 
// KEY CHANGE: Uses self-contained SecondaryHeader and SecondaryFooter components
// instead of assembling zone objects. This makes the code cleaner and keeps
// all secondary bar logic contained within those components.
//
// BEFORE (zone objects pattern):
//   const secondaryTopBarZones = useMemo(() => ({
//     left: <WorkspaceSelector .../>,
//     center: <div>...</div>,
//     right: <RoomPresenceIndicator .../>,
//   }), [...deps...]);
//   <ThreeEdgeLayout secondaryTopBarZones={secondaryTopBarZones} />
//
// AFTER (component pattern):
//   <ThreeEdgeLayout 
//     secondaryTopBar={<SecondaryHeader workspace={...} onNavigate={...} />}
//     secondaryBottomBar={<SecondaryFooter voice={...} onToolChange={...} />}
//   />

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// =============================================================================
// LAYOUT INFRASTRUCTURE
// =============================================================================
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";

// =============================================================================
// HEADER COMPONENTS (48px - Global App Controls)
// =============================================================================
import { Header } from "@UI/react/components/layout/Header";

// =============================================================================
// SECONDARY BARS (Self-contained - manage their own zones internally)
// =============================================================================
import { SecondaryHeader } from '@UI/react/components/layout/SecondaryHeader';
import { SecondaryFooter } from "@UI/react/components/layout/SecondaryFooter";

// =============================================================================
// FOOTER / STATUS BAR (28px - System Status)
// =============================================================================
import { StatusBar } from "@UI/react/components/layout/StatusBar";

// =============================================================================
// WORKSPACE & CANVAS
// =============================================================================
import { CanvasWorkspace } from "@UI/react/components/workspace";

// =============================================================================
// PANEL COMPONENTS (Separated Activity Bars and Content)
// =============================================================================
import {
  LeftPanelProvider,
  LeftActivityBar,
  LeftPanelContent,
} from "@UI/react/components/panels/LeftPanel";
import {
  RightPanelProvider,
  RightActivityBar,
  RightPanelContent,
} from "@UI/react/components/panels/RightPanel";
import {
  FloatingPanelProvider,
  AllFloatingPanels,
} from "@UI/react/components/panels/FloatingPanel";
import { LayoutPanelProvider } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { FloatingCanvasNavigator } from "@UI/react/components/panels/LayoutPanel";
import { CanvasOperationsPanel } from "@UI/react/components/workspace/FloatingPanels/CanvasOperationsPanel";

// =============================================================================
// MODALS
// =============================================================================
import { CreateRoomModal } from "@UI/react/components/modals/CreateRoomModal";

// =============================================================================
// HOOKS
// =============================================================================
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";
import { useRoomWorkspaceTransition } from "@UI/react/hooks/useRoomWorkspaceTransition.js";
import {
  VIEW_MODES,
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
} from "@UI/react/components/controls/ViewModeToggle";
import { LAYOUT_MODES } from "@UI/react/components/controls/LayoutModeToggle";
import { useVoiceControls } from "@UI/react/hooks/useVoiceBar.js";
import { useRoomIndicator } from "@UI/react/hooks/useRoomIndicator.js";

// =============================================================================
// CENTRALIZED STATE MODULES
// =============================================================================
import {
  loadCanvasSize,
  saveCanvasSize,
} from "@UI/react/hooks/canvasState.js";

// Helper to get initial canvas size
const getInitialCanvasSize = () => {
  const saved = loadCanvasSize();
  return saved ?? { rows: 3, cols: 3 };
};

// =============================================================================
// MAIN APPLICATION COMPONENT
// =============================================================================

export function CIAWebApp({ username, userId, projectId }) {
  // ===========================================================================
  // PHASE 3 INITIALIZATION
  // ===========================================================================
  const [phase3Status, setPhase3Status] = useState("pending");
  const phase3Started = useRef(false);

  useEffect(() => {
    if (phase3Started.current) return;
    phase3Started.current = true;

    const initPhase3 = async () => {
      try {
        setPhase3Status("loading");
        await initializePhase3();
        setPhase3Status("ready");
        log.info("Phase 3 initialization complete");
      } catch (error) {
        log.error("Phase 3 initialization failed:", error);
        setPhase3Status("error");
      }
    };

    initPhase3();
  }, []);

  // ===========================================================================
  // WORKSPACE STATE
  // ===========================================================================
  const {
    workspaces,
    currentWorkspace,
    workspaceId,
    handleWorkspaceChange,
    handleCreateWorkspace,
  } = useWorkspaces(projectId);

  // ===========================================================================
  // CANVAS STATE
  // ===========================================================================
  const {
    canvas,
    canvasId,
    viewport,
    setFlowDirection: setCanvasFlowDirection,
    setCanvasSize,
    setViewportSize,
  } = useCanvas(workspaceId);

  // Derive canvas size from actual canvas dimensions
  const canvasSize = canvas?.dimensions || { rows: 3, cols: 3 };
  // Viewport size from useCanvas hook
  const viewportSize = { rows: viewport?.rows || 3, cols: viewport?.cols || 3 };

  // Persist canvas size
  useEffect(() => {
    saveCanvasSize(canvasSize);
  }, [canvasSize]);

  // ===========================================================================
  // VIEW MODE STATE (Desktop/VR)
  // ===========================================================================
  const [viewMode, setViewMode] = useState(VIEW_MODES.DESKTOP);
  const vrAvailable = useWebXRAvailability();
  useViewModeKeyboardShortcut(setViewMode);

  // ===========================================================================
  // LAYOUT MODE STATE (Normal/Isolation/Subset)
  // ===========================================================================
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.NORMAL);

  // ===========================================================================
  // EDIT STATE (Secondary Footer)
  // ===========================================================================
  // Flow direction is derived from canvas, with local state for immediate UI feedback
  const [localFlowDirection, setLocalFlowDirection] = useState("row");
  const flowDirection = canvas?.flowDirection || localFlowDirection;
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [openPopouts, setOpenPopouts] = useState([]);

  // ===========================================================================
  // VOICE CONTROLS
  // ===========================================================================
  const voice = useVoiceControls();
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // ===========================================================================
  // ROOM STATE
  // ===========================================================================
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  const {
    currentRoom,
    currentRoomId,
    currentRoomName,
    availableRooms,
    roomMembers,
    isLoading: isLoadingRooms,
    switchRoom,
    createRoom,
  } = useRoomIndicator({
    projectId,
    userId,
    onRoomChange: (roomId, roomName) => {
      log.info("Room changed to:", roomName);
    },
  });

  // Derive voice channels from rooms
  const availableVoiceChannels = useMemo(() => {
    return (availableRooms || [])
      .filter((room) => room.hasVoice)
      .map((room) => ({
        id: room.id,
        name: room.name,
        participantCount: room.voiceParticipants?.length || 0,
      }));
  }, [availableRooms]);

  // ===========================================================================
  // CALLBACKS - HEADER
  // ===========================================================================
  const handleOpenSearch = useCallback(() => {
    log.debug("Open global search");
    window.dispatchEvent(new CustomEvent("open:global-search"));
  }, []);

  const handleOpenHelp = useCallback(() => {
    log.debug("Open help modal");
    window.dispatchEvent(new CustomEvent("open:help"));
  }, []);

  const handleSignOut = useCallback(() => {
    log.debug("Sign out");
    sessionManager.logout?.();
  }, []);

  const handleProjectChange = useCallback((project) => {
    log.debug("Project changed:", project);
  }, []);

  const handleCreateProject = useCallback(() => {
    log.debug("Create project");
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    log.debug("Notification clicked:", notification);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY HEADER (View Mode)
  // ===========================================================================
  const handleViewModeChange = useCallback((mode) => {
    setLayoutMode(mode);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY HEADER (Room)
  // ===========================================================================
  const handleRoomSelect = useCallback((roomId) => {
    switchRoom(roomId);
  }, [switchRoom]);

  const handleOpenRoomsPanel = useCallback(() => {
    window.dispatchEvent(new CustomEvent("navigate:right-panel", { detail: { tab: "rooms" } }));
  }, []);

  const handleCreateRoom = useCallback(() => {
    setShowCreateRoomModal(true);
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY FOOTER (Edit Tools)
  // ===========================================================================
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    // Dispatch event for canvas to listen to
    window.dispatchEvent(new CustomEvent('canvas:toolChange', { detail: { tool } }));
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const newMode = !prev;
      // Dispatch event for canvas to listen to
      window.dispatchEvent(new CustomEvent('canvas:editModeChange', { detail: { editMode: newMode } }));
      return newMode;
    });
  }, []);

  const handleFlowDirectionChange = useCallback((direction) => {
    // Update local state for immediate UI feedback
    setLocalFlowDirection(direction);
    // Update canvas (persists to server)
    setCanvasFlowDirection?.(direction);
  }, [setCanvasFlowDirection]);

  const handleCanvasSizeChange = useCallback((newSize) => {
    // Update canvas dimensions (persists to server)
    setCanvasSize?.(newSize);
    // Save to local storage for persistence
    saveCanvasSize(newSize);
  }, [setCanvasSize]);

  const handleViewportSizeChange = useCallback((newSize) => {
    // Validate input to prevent NaN propagation
    const rows = typeof newSize?.rows === 'number' && !isNaN(newSize.rows) ? newSize.rows : null;
    const cols = typeof newSize?.cols === 'number' && !isNaN(newSize.cols) ? newSize.cols : null;

    if (rows !== null && cols !== null) {
      // Update viewport size (how many cells are visible)
      setViewportSize?.(rows, cols);
    }
  }, [setViewportSize]);

  const handleUndo = useCallback(() => {
    log.debug("Undo - not yet implemented");
    // TODO: Implement undo with canvas history
  }, []);

  const handleRedo = useCallback(() => {
    log.debug("Redo - not yet implemented");
    // TODO: Implement redo with canvas history
  }, []);

  const handleTogglePopout = useCallback((popoutId) => {
    setOpenPopouts((prev) =>
      prev.includes(popoutId)
        ? prev.filter((id) => id !== popoutId)
        : [...prev, popoutId]
    );
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY FOOTER (Voice)
  // ===========================================================================
  const handleJoinLeaveVoice = useCallback(() => {
    if (voice.inVoice) {
      voice.leaveVoice?.();
    } else {
      voice.joinVoice?.();
    }
  }, [voice]);

  const handleChangeVoiceChannel = useCallback((channelId) => {
    voice.switchChannel?.(channelId);
  }, [voice]);

  const handleOpenVoiceSettings = useCallback(() => {
    setShowVoiceSettings(true);
  }, []);

  // ===========================================================================
  // RENDER CENTER PANEL
  // ===========================================================================
  const renderCenterPanel = useCallback(() => {
    if (phase3Status !== "ready") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          {phase3Status === "loading"
            ? "Initializing..."
            : "Initialization failed"}
        </div>
      );
    }

    return (
      <CanvasWorkspace
        workspaceId={workspaceId}
        userId={userId || sessionManager.getUserId?.() || "anonymous"}
        projectId={projectId}
        layoutMode={layoutMode}
      />
    );
  }, [phase3Status, workspaceId, userId, projectId, layoutMode]);

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <FloatingPanelProvider>
      <LeftPanelProvider>
        <RightPanelProvider>
          <LayoutPanelProvider canvasId={canvasId}>
            <ThreeEdgeLayout
              // ─────────────────────────────────────────────────────────────
              // TOP BAR (48px Header)
              // ─────────────────────────────────────────────────────────────
              topBar={
                <Header
                  currentProject={projectId ? { id: projectId, name: projectId } : null}
                  projects={[]}
                  user={userId ? { id: userId, name: username, avatar: null } : null}
                  notifications={[]}
                  unreadCount={0}
                  viewMode={viewMode}
                  vrAvailable={vrAvailable}
                  onProjectChange={handleProjectChange}
                  onCreateProject={handleCreateProject}
                  onOpenSearch={handleOpenSearch}
                  onOpenHelp={handleOpenHelp}
                  onNotificationClick={handleNotificationClick}
                  onViewModeChange={setViewMode}
                  onNavigate={(path) => log.debug("Navigate:", path)}
                  onSignOut={handleSignOut}
                />
              }
              // ─────────────────────────────────────────────────────────────
              // SECONDARY TOP BAR (48px - Self-contained component)
              // ─────────────────────────────────────────────────────────────
              secondaryTopBar={
                <SecondaryHeader
                  // Workspace props
                  workspace={currentWorkspace}
                  workspaces={workspaces}
                  onWorkspaceChange={handleWorkspaceChange}
                  onCreateWorkspace={handleCreateWorkspace}
                  // Flow direction (connected to canvas)
                  flowDirection={flowDirection}
                  onFlowDirectionChange={handleFlowDirectionChange}
                  // Canvas size (connected to canvas)
                  canvasSize={canvasSize}
                  canvasPlacements={canvas?.placements || []}
                  onCanvasSizeChange={handleCanvasSizeChange}
                  // Viewport size (how many cells visible)
                  viewportSize={viewportSize}
                  onViewportSizeChange={handleViewportSizeChange}
                  // Room props
                  room={currentRoom}
                  members={roomMembers}
                  availableRooms={availableRooms}
                  onRoomChange={handleRoomSelect}
                  onOpenRoomsPanel={handleOpenRoomsPanel}
                  onCreateRoom={handleCreateRoom}
                />
              }
              // ─────────────────────────────────────────────────────────────
              // LEFT PANEL (Activity Bar + Content)
              // ─────────────────────────────────────────────────────────────
              leftActivityBar={<LeftActivityBar />}
              leftPanelContent={<LeftPanelContent />}
              // ─────────────────────────────────────────────────────────────
              // CENTER PANEL (Canvas Workspace)
              // ─────────────────────────────────────────────────────────────
              centerPanel={renderCenterPanel()}
              // ─────────────────────────────────────────────────────────────
              // RIGHT PANEL (Activity Bar + Content)
              // ─────────────────────────────────────────────────────────────
              rightActivityBar={<RightActivityBar />}
              rightPanelContent={<RightPanelContent />}
              // ─────────────────────────────────────────────────────────────
              // SECONDARY BOTTOM BAR (36px - Self-contained component)
              // ─────────────────────────────────────────────────────────────
              secondaryBottomBar={
                <SecondaryFooter
                  // Popout state (Navigator uses its own hook internally)
                  scratchpadOpen={openPopouts.includes("scratchpad")}
                  canvasOpsOpen={openPopouts.includes("canvasOps")}
                  onToggleScratchpad={() => handleTogglePopout("scratchpad")}
                  onToggleCanvasOps={() => handleTogglePopout("canvasOps")}
                  // Edit tools
                  isEditMode={isEditMode}
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  onToggleEditMode={handleToggleEditMode}
                  canUndo={false}
                  canRedo={false}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  // View mode (for ViewContextBlock)
                  viewMode={layoutMode}
                  onViewModeChange={handleViewModeChange}
                  // Voice controls
                  isMuted={voice.muted}
                  isDeafened={voice.deafened}
                  isInChannel={voice.inVoice}
                  isJoiningVoice={voice.isJoining}
                  currentChannel={
                    voice.currentRoom
                      ? { id: currentRoomId, name: voice.currentRoom }
                      : null
                  }
                  participantCount={voice.participants?.length || 0}
                  voiceChannels={availableVoiceChannels}
                  onToggleMute={voice.toggleMute}
                  onToggleDeafen={voice.toggleDeafen}
                  onJoinLeaveVoice={handleJoinLeaveVoice}
                  onChangeVoiceChannel={handleChangeVoiceChannel}
                  onOpenVoiceSettings={handleOpenVoiceSettings}
                />
              }
              // ─────────────────────────────────────────────────────────────
              // BOTTOM BAR (28px Status Bar)
              // ─────────────────────────────────────────────────────────────
              bottomBar={<StatusBar />}
            >
              {/* Floating panels rendered inside LayoutContext */}
              <AllFloatingPanels workspaceId={workspaceId} />
              <FloatingCanvasNavigator />

              {/* Canvas Operations Panel */}
              <CanvasOperationsPanel
                isOpen={openPopouts.includes("canvasOps")}
                onClose={() => handleTogglePopout("canvasOps")}
                onMinimize={() => handleTogglePopout("canvasOps")}
                pendingOperations={[]}
                transactions={[]}
                collaborators={roomMembers.map((member, idx) => ({
                  id: member.odId || `user-${idx}`,
                  name: member.name || 'Unknown',
                  online: member.isOnline !== false,
                  editing: false,
                  viewport: { row: 1, col: 1 },
                  cursor: { row: 1, col: 1 },
                }))}
                savePoints={[]}
                currentUserId={userId}
              />
            </ThreeEdgeLayout>

            {/* Create Room Modal */}
            <CreateRoomModal
              isOpen={showCreateRoomModal}
              onClose={() => setShowCreateRoomModal(false)}
              onCreate={async (roomData) => {
                try {
                  await createRoom(roomData);
                  setShowCreateRoomModal(false);
                } catch (error) {
                  log.error("Failed to create room:", error);
                }
              }}
              availableUsers={roomMembers.filter((m) => !m.isYou)}
            />
          </LayoutPanelProvider>
        </RightPanelProvider>
      </LeftPanelProvider>
    </FloatingPanelProvider>
  );
}

export default CIAWebApp;