// src/ui/react/CIAWebApp.jsx
// =============================================================================
// MAIN APPLICATION COMPONENT
// =============================================================================
// CSS Grid layout with separated activity bars and panel content.
// Uses zone-based approach for secondary bars to enable automatic
// width synchronization with collapsible panels.
//
// Layout Structure (per Header_Footer_Bars_Design_Specification.docx):
// ┌──────────────────────────────────────────────────────────────────────┐
// │                         HEADER (48px)                                 │
// ├────────┬──────────┬─────────────────────┬─────────────┬──────────────┤
// │        │ SEC-TOP  │   SEC-TOP-CENTER    │  SEC-TOP    │              │
// │  LEFT  │  LEFT    │      (44px)         │   RIGHT     │    RIGHT     │
// │  ACT   ├──────────┼─────────────────────┼─────────────┤    ACT       │
// │  BAR   │  LEFT    │                     │   RIGHT     │    BAR       │
// │        │  PANEL   │   CANVAS WORKSPACE  │   PANEL     │              │
// │        ├──────────┼─────────────────────┼─────────────┤              │
// │        │ SEC-BOT  │   SEC-BOT-CENTER    │  SEC-BOT    │              │
// │        │  LEFT    │      (36px)         │   RIGHT     │              │
// ├────────┴──────────┴─────────────────────┴─────────────┴──────────────┤
// │                        STATUS BAR (28px)                              │
// └──────────────────────────────────────────────────────────────────────┘

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// =============================================================================
// LAYOUT INFRASTRUCTURE
// =============================================================================
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { SecondaryBarDivider } from "@UI/react/components/layout/SecondaryBarZone";

// =============================================================================
// HEADER COMPONENTS (48px - Global App Controls)
// =============================================================================
import { Header } from "@UI/react/components/layout/Header";

// =============================================================================
// SECONDARY HEADER COMPONENTS (44px - Workspace Context)
// Zone-based: WorkspaceSelector | FlowDirection, EditTools, Navigation | RoomPresence
// =============================================================================
import {
  WorkspaceSelector,
  RoomPresenceIndicator,
  FlowDirectionToggle,
  EditToolbar,
  CanvasNavigation,
} from "@UI/react/components/layout/SecondaryHeader";

// =============================================================================
// SECONDARY FOOTER COMPONENTS (36px - Instance Context)
// Zone-based: Popouts | InstanceSelector, ViewMode, CanvasSize | VoiceControls
// =============================================================================
import {
  PopoutButtons,
  InstanceSelector,
  ViewModeToggle as LayoutModeToggle, // Renamed to avoid conflict with VR toggle
  CanvasSizeDisplay,
  VoiceQuickControls,
} from "@UI/react/components/layout/SecondaryFooter";

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
import { WorkspacePickerModal } from "@UI/react/components/modals/WorkspacePickerModal/WorkspacePickerModal.jsx";

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

// =============================================================================
// MAIN APPLICATION COMPONENT
// =============================================================================

/**
 * CIAWebApp - Main Application Component
 *
 * Manages:
 * - Layout with resizable panels (activity bars always visible)
 * - Workspace selection and navigation
 * - View mode (Desktop/VR) switching
 * - Layout mode (Normal/Isolation/Subset)
 * - Phase 3 initialization
 *
 * @param {Object} props
 * @param {string} props.username - Current user's display name
 * @param {string} props.userId - Current user's ID
 * @param {string} props.projectId - Current project ID
 */
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
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspaces({
    userId,
  });
  const workspaceId = currentWorkspace?.id || "personal";

  // ===========================================================================
  // ROOM STATE (Space Navigation)
  // ===========================================================================
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState("Main Room");
  const [pendingRoomChange, setPendingRoomChange] = useState(null);

  // Room/workspace transition handling
  const {
    showWorkspacePicker,
    handleRoomSelect,
    handleWorkspaceSelect,
    handleCreateWorkspaceForRoom,
    handleCancelWorkspacePicker,
  } = useRoomWorkspaceTransition({
    currentRoomId,
    setCurrentRoomId,
    setCurrentRoomName,
    pendingRoomChange,
    setPendingRoomChange,
    selectWorkspace,
  });

  // ===========================================================================
  // VIEW MODE STATE (Desktop/VR)
  // ===========================================================================
  const [viewMode, setViewMode] = useState(VIEW_MODES.DESKTOP);
  const vrAvailable = useWebXRAvailability();

  // Keyboard shortcuts for view mode
  useViewModeKeyboardShortcut(viewMode, setViewMode, vrAvailable);
  useGlobalKeyboardShortcuts();

  // ===========================================================================
  // LAYOUT MODE STATE (Normal/Isolation/Subset)
  // ===========================================================================
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.NORMAL);

  // ===========================================================================
  // CANVAS STATE
  // ===========================================================================
  const { canvas } = useCanvas();
  const canvasId = canvas?.id;

  // Canvas size (grid dimensions)
  const [canvasSize, setCanvasSize] = useState({ cols: 2, rows: 2 });

  // Canvas viewport position
  const [canvasPosition, setCanvasPosition] = useState({ col: 0, row: 0 });
  const isAtOrigin = canvasPosition.col === 0 && canvasPosition.row === 0;

  // ===========================================================================
  // EDIT MODE STATE
  // ===========================================================================
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("select");

  // ===========================================================================
  // FLOW DIRECTION STATE
  // ===========================================================================
  const [flowDirection, setFlowDirection] = useState("row");

  // ===========================================================================
  // POPOUT STATE
  // ===========================================================================
  const [openPopouts, setOpenPopouts] = useState([]);

  const handleTogglePopout = useCallback((popoutId) => {
    setOpenPopouts((prev) =>
      prev.includes(popoutId)
        ? prev.filter((id) => id !== popoutId)
        : [...prev, popoutId]
    );
  }, []);

  // ===========================================================================
  // VOICE CONTROLS (from hook)
  // ===========================================================================
  const voice = useVoiceControls();

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
    // TODO: Navigate to project
  }, []);

  const handleCreateProject = useCallback(() => {
    log.debug("Create new project");
    window.dispatchEvent(new CustomEvent("open:new-project"));
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    log.debug("Notification clicked:", notification);
    // TODO: Navigate to notification target
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY HEADER
  // ===========================================================================
  const handleWorkspaceChange = useCallback(
    (workspace) => {
      log.debug("Workspace changed:", workspace);
      selectWorkspace(workspace.id);
    },
    [selectWorkspace]
  );

  const handleCreateWorkspace = useCallback(() => {
    log.debug("Create new workspace");
    window.dispatchEvent(new CustomEvent("open:new-workspace"));
  }, []);

  const handleOpenRoomsPanel = useCallback(() => {
    log.debug("Open rooms panel");
    // TODO: Open right panel to Rooms tab
    window.dispatchEvent(new CustomEvent("open:rooms-panel"));
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
  }, []);

  const handleUndo = useCallback(() => {
    log.debug("Undo action");
    // TODO: Implement undo via workspace history
  }, []);

  const handleRedo = useCallback(() => {
    log.debug("Redo action");
    // TODO: Implement redo via workspace history
  }, []);

  const handleNavigateHome = useCallback(() => {
    setCanvasPosition({ col: 0, row: 0 });
  }, []);

  const handleNavigateDirection = useCallback((direction) => {
    setCanvasPosition((prev) => ({
      col:
        prev.col +
        (direction === "right" ? 1 : direction === "left" ? -1 : 0),
      row:
        prev.row + (direction === "down" ? 1 : direction === "up" ? -1 : 0),
    }));
  }, []);

  const handleOpenBookmarks = useCallback(() => {
    log.debug("Open bookmarks");
    // TODO: Open bookmarks popout or panel
  }, []);

  // ===========================================================================
  // CALLBACKS - SECONDARY FOOTER
  // ===========================================================================
  const handleSelectInstance = useCallback((instance) => {
    log.debug("Select instance:", instance);
    // TODO: Focus instance in canvas
  }, []);

  const handlePlaceView = useCallback((view) => {
    log.debug("Place view:", view);
    // TODO: Place view in next available canvas cell
  }, []);

  const handleOpenVoiceSettings = useCallback(() => {
    log.debug("Open voice settings");
    // TODO: Open voice settings popout
    handleTogglePopout("voice-settings");
  }, [handleTogglePopout]);

  const handleChangeVoiceChannel = useCallback((channelId) => {
    log.debug("Change voice channel:", channelId);
    // TODO: Switch voice channel
  }, []);

  // ===========================================================================
  // RENDER - CENTER PANEL (WORKSPACE)
  // ===========================================================================
  const renderCenterPanel = () => {
    if (phase3Status !== "ready") {
      return (
        <div className="cia-loading">
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
  };

  // ===========================================================================
  // RENDER - SECONDARY TOP BAR ZONES (44px)
  // ===========================================================================
  const secondaryTopBarZones = {
    // Left Zone: Workspace Selector (syncs with left panel width)
    left: (
      <WorkspaceSelector
        workspace={currentWorkspace}
        workspaces={workspaces}
        onSelect={handleWorkspaceChange}
        onCreate={handleCreateWorkspace}
      />
    ),

    // Center Zone: Flow Direction + Edit Tools + Canvas Navigation
    center: (
      <div className="secondary-bar-zone__content">
        <FlowDirectionToggle
          direction={flowDirection}
          onChange={setFlowDirection}
        />

        <SecondaryBarDivider height={20} />

        <EditToolbar
          isEditMode={isEditMode}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onToggleEditMode={handleToggleEditMode}
          canUndo={false} // TODO: Wire to workspace history
          canRedo={false}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        <SecondaryBarDivider height={20} />

        <CanvasNavigation
          position={canvasPosition}
          isAtOrigin={isAtOrigin}
          onHome={handleNavigateHome}
          onMove={handleNavigateDirection}
          onBookmark={handleOpenBookmarks}
        />
      </div>
    ),

    // Right Zone: Room + Presence with dropdown (syncs with right panel width)
    right: (
      <RoomPresenceIndicator
        room={{ id: currentRoomId, name: currentRoomName, type: 'main' }}
        members={[]} // TODO: Wire to presence system via presenceSystem.getUsersInRoom()
        availableRooms={[
          // TODO: Wire to actual rooms from RoomManager
          // For now, showing structure expected by enhanced component
        ]}
        onRoomChange={handleRoomSelect}
        onClick={handleOpenRoomsPanel}
        onCreateRoom={() => log.debug('Create room')}
      />
    ),
  };

  // ===========================================================================
  // RENDER - SECONDARY BOTTOM BAR ZONES (36px)
  // ===========================================================================
  const secondaryBottomBarZones = {
    // Left Zone: Popout Buttons (Canvas Navigator, Scratchpad)
    left: (
      <PopoutButtons openPopouts={openPopouts} onToggle={handleTogglePopout} />
    ),

    // Center Zone: Instance Selector + Layout Mode + Canvas Size
    center: (
      <div className="secondary-bar-zone__content">
        <InstanceSelector
          activeInstance={null} // TODO: Wire to active instance state
          onCanvasViews={[]} // TODO: Wire to canvas views
          availableViews={[]} // TODO: Wire to available views
          onSelectInstance={handleSelectInstance}
          onPlaceView={handlePlaceView}
        />

        <SecondaryBarDivider height={20} />

        <LayoutModeToggle mode={layoutMode} onChange={setLayoutMode} />

        <SecondaryBarDivider height={20} />

        <CanvasSizeDisplay size={canvasSize} onChange={setCanvasSize} />
      </div>
    ),

    // Right Zone: Voice Quick Controls
    right: (
      <VoiceQuickControls
        isMuted={voice.muted}
        isDeafened={voice.deafened}
        isInChannel={voice.inVoice}
        currentChannel={
          voice.currentRoom
            ? { id: currentRoomId, name: voice.currentRoom }
            : null
        }
        channels={[
          // TODO: Wire to actual voice channels
          { id: "general", name: "General", participantCount: 3 },
          { id: "team", name: "Team", participantCount: 2 },
        ]}
        onToggleMute={voice.toggleMute}
        onToggleDeafen={voice.toggleDeafen}
        onJoinLeave={voice.inVoice ? voice.leaveVoice : voice.joinVoice}
        onChangeChannel={handleChangeVoiceChannel}
        onOpenSettings={handleOpenVoiceSettings}
      />
    ),
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <FloatingPanelProvider>
      <LeftPanelProvider>
        <RightPanelProvider>
          {/* LayoutPanelProvider shares state between LayoutPanel and FloatingCanvasNavigator */}
          <LayoutPanelProvider canvasId={canvasId}>
            <ThreeEdgeLayout
              // ─────────────────────────────────────────────────────────────
              // TOP BAR (48px Header)
              // ─────────────────────────────────────────────────────────────
              topBar={
                <Header
                  currentProject={
                    projectId ? { id: projectId, name: projectId } : null
                  }
                  projects={[]} // TODO: Wire to user's projects
                  user={
                    userId
                      ? { id: userId, name: username, avatar: null }
                      : null
                  }
                  notifications={[]} // TODO: Wire to notifications
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
              // SECONDARY TOP BAR ZONES (44px)
              // ─────────────────────────────────────────────────────────────
              secondaryTopBarZones={secondaryTopBarZones}
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
              // SECONDARY BOTTOM BAR ZONES (36px)
              // ─────────────────────────────────────────────────────────────
              secondaryBottomBarZones={secondaryBottomBarZones}
              // ─────────────────────────────────────────────────────────────
              // BOTTOM BAR (28px Status Bar)
              // ─────────────────────────────────────────────────────────────
              bottomBar={<StatusBar />}
            >
              {/* Floating panels rendered inside LayoutContext */}
              <AllFloatingPanels workspaceId={workspaceId} />

              {/* Canvas Navigator - floating/corner/minimized positions */}
              <FloatingCanvasNavigator />
            </ThreeEdgeLayout>

            {/* ─────────────────────────────────────────────────────────────
                MODALS (Rendered outside layout)
                ───────────────────────────────────────────────────────────── */}
            {showWorkspacePicker && (
              <WorkspacePickerModal
                room={pendingRoomChange}
                workspaces={workspaces}
                onSelect={handleWorkspaceSelect}
                onCreate={handleCreateWorkspaceForRoom}
                onCancel={handleCancelWorkspacePicker}
              />
            )}
          </LayoutPanelProvider>
        </RightPanelProvider>
      </LeftPanelProvider>
    </FloatingPanelProvider>
  );
}

export default CIAWebApp;