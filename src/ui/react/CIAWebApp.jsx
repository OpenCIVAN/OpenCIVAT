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
import { getViewConfigurationManager } from "@Init/appInitializer";

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
import { useInstanceSelector } from "@UI/react/hooks/useInstanceSelector.js";
import { useRoomIndicator } from "@UI/react/hooks/useRoomIndicator.js";
import { useSecondaryHeaderLogic } from '@UI/react/hooks/useSecondaryHeaderLogic';

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

  // Get wired logic for SecondaryHeader
  const headerLogic = useSecondaryHeaderLogic();

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
  const { canvasId } = useCanvas(workspaceId);
  const [canvasSize, setCanvasSize] = useState(getInitialCanvasSize);
  const [canvasPosition, setCanvasPosition] = useState({ col: 0, row: 0 });
  const isAtOrigin = canvasPosition.col === 0 && canvasPosition.row === 0;

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
  const [flowDirection, setFlowDirection] = useState("row");
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [openPopouts, setOpenPopouts] = useState([]);

  // ===========================================================================
  // INSTANCE SELECTOR STATE
  // ===========================================================================
  const {
    activeInstance,
    onCanvasViews,
    availableViews,
    handleSelectInstance,
    handlePlaceView,
  } = useInstanceSelector(workspaceId);

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
  // CALLBACKS - SECONDARY HEADER (Navigation)
  // ===========================================================================
  const handleNavigateHome = useCallback(() => {
    setCanvasPosition({ col: 0, row: 0 });
  }, []);

  const handleNavigateDirection = useCallback((direction) => {
    setCanvasPosition((prev) => ({
      col: prev.col + (direction === "right" ? 1 : direction === "left" ? -1 : 0),
      row: prev.row + (direction === "down" ? 1 : direction === "up" ? -1 : 0),
    }));
  }, []);

  const handleOpenBookmarks = useCallback(() => {
    log.debug("Open bookmarks");
  }, []);

  const handleSelectView = useCallback((view) => {
    handleSelectInstance(view);
  }, [handleSelectInstance]);

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
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const handleUndo = useCallback(() => {
    log.debug("Undo");
  }, []);

  const handleRedo = useCallback(() => {
    log.debug("Redo");
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
                  // Navigation (from hook - properly wired to canvas)
                  canvasPosition={headerLogic.canvasPosition}
                  isAtOrigin={headerLogic.isAtOrigin}
                  onNavigate={headerLogic.onNavigate}
                  onHome={headerLogic.onHome}
                  onBookmark={headerLogic.onBookmark}
                  // Views (from hook - enriched with names)
                  activeView={headerLogic.activeView}
                  onCanvasViews={headerLogic.onCanvasViews}
                  availableViews={headerLogic.availableViews}
                  onSelectView={headerLogic.onSelectView}
                  onPlaceView={headerLogic.onPlaceView}
                  viewMode={layoutMode}
                  onViewModeChange={handleViewModeChange}
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
                  // Popout state
                  navigatorOpen={openPopouts.includes("navigator")}
                  scratchpadOpen={openPopouts.includes("scratchpad")}
                  onToggleNavigator={() => handleTogglePopout("navigator")}
                  onToggleScratchpad={() => handleTogglePopout("scratchpad")}
                  // Flow direction
                  flowDirection={flowDirection}
                  onFlowDirectionChange={setFlowDirection}
                  // Edit tools
                  isEditMode={isEditMode}
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  onToggleEditMode={handleToggleEditMode}
                  canUndo={false}
                  canRedo={false}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  // Canvas size
                  canvasSize={canvasSize}
                  onCanvasSizeChange={setCanvasSize}
                  // Voice controls
                  isMuted={voice.muted}
                  isDeafened={voice.deafened}
                  isInChannel={voice.inVoice}
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