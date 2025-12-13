// src/ui/react/CIAWebApp.jsx
// Main Application Component
// CSS Grid layout with separated activity bars and panel content

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// Import UI components
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { CanvasWorkspace } from "@UI/react/components/workspace/";
import { TopBar } from "@UI/react/components/layout/TopBar";
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { BottomPanel } from "@UI/react/components/panels/BottomPanel";
import {
  SecondaryTopBar,
  WorkspaceSelector,
  WorkspacePresence,
  useSecondaryTopBar,
} from "@UI/react/components/layout/SecondaryTopBar";
import {
  SecondaryBottomBar,
  VoiceControls,
  useVoiceControls,
} from "@UI/react/components/layout/SecondaryBottomBar";
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import {
  VIEW_MODES,
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
} from "@UI/react/components/controls/ViewModeToggle";
import { LayoutModeToggle, LAYOUT_MODES } from "@UI/react/components/controls/LayoutModeToggle";

// Room Navigation
import { RoomSelector } from "@UI/react/components/navigation/RoomSelector";
import { WorkspacePickerModal } from '@UI/react/components/modals/WorkspacePickerModal/WorkspacePickerModal.jsx';
import { useRoomWorkspaceTransition } from '@UI/react/hooks/useRoomWorkspaceTransition.js';

// Panel components (separated activity bars and content)
import {
  LeftPanelProvider,
  LeftActivityBar,
  LeftPanelContent,
} from '@UI/react/components/panels/LeftPanel';
import {
  RightPanelProvider,
  RightActivityBar,
  RightPanelContent,
} from "@UI/react/components/panels/RightPanel";
import { FloatingPanelProvider, AllFloatingPanels } from "@UI/react/components/panels/FloatingPanel";
import { LayoutPanelProvider } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { FloatingCanvasNavigator } from "@UI/react/components/panels/LayoutPanel";
import { useCanvas } from "@UI/react/hooks/useCanvas.js";

// Canvas controls (moved from CanvasGrid to secondary bars)
import { GridEditOverlay } from "@UI/react/components/workspace/Canvas/GridEditOverlay";

/**
 * Main Application Component
 *
 * CSS Grid layout with separated activity bars and panel content.
 *
 * Manages:
 * - Layout with resizable panels (activity bars always visible)
 * - Workspace selection and navigation
 * - View mode (Desktop/VR) switching
 * - Layout mode (Normal/Isolation/Subset)
 * - Phase 3 initialization
 */
export function CIAWebApp({ username, userId, projectId }) {
  // =========================================================================
  // STATE
  // =========================================================================

  const [phase3Status, setPhase3Status] = useState('pending');
  const phase3Started = useRef(false);

  // Workspace state
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspaces({ userId });
  const workspaceId = 'personal';

  // Room state (Space Navigation)
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomName, setCurrentRoomName] = useState('Main Room');
  const [pendingRoomChange, setPendingRoomChange] = useState(null);
  // Shape: { roomId: string, roomName: string } | null

  // View mode state (Desktop/VR)
  const [viewMode, setViewMode] = useState(VIEW_MODES.DESKTOP);
  const vrAvailable = useWebXRAvailability();

  // Layout mode state (Normal/Isolation/Subset)
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.NORMAL);

  // Workspace selector dropdown state
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);

  // Get active canvas for LayoutPanelProvider
  const { canvas } = useCanvas();
  const canvasId = canvas?.id;

  // Canvas controls state (minimap, edit mode)
  const [editMode, setEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [activeTool, setActiveTool] = useState('select');

  // Handle room change - receives both id and name from RoomSelector
  const handleRoomChange = useCallback((roomId, roomName) => {
    // If same room, no picker needed
    if (roomId === currentRoomId) {
      return;
    }

    // Store pending room change and show picker
    setPendingRoomChange({ roomId, roomName });
  }, [currentRoomId]);

  // =========================================================================
  // SECONDARY BAR HOOKS (for zone content)
  // =========================================================================

  // Top bar state (workspace selector, presence)
  const { workspace, presence } = useSecondaryTopBar({
    workspaces,
    currentRoomId,
    currentRoomName,
    onWorkspaceChange: selectWorkspace,
  });

  // Voice controls state - bound to current room context
  const voice = useVoiceControls({
    roomId: currentRoomId,
    roomName: currentRoomName,
    userName: username || 'Anonymous',
  });

  const transition = useRoomWorkspaceTransition({
    currentRoomId,
    onRoomChange: (roomId, roomName) => {
      setCurrentRoomId(roomId);
      setCurrentRoomName(roomName);
    },
    onWorkspaceChange: (workspaceId) => {
      workspace.selectWorkspace(workspaceId);
    },
  });

  const handleWorkspacePicked = useCallback((workspaceId) => {
    if (!pendingRoomChange) return;

    // Complete the room change
    setCurrentRoomId(pendingRoomChange.roomId);
    setCurrentRoomName(pendingRoomChange.roomName);

    // Switch workspace
    workspace.selectWorkspace(workspaceId);

    // Clear pending state
    setPendingRoomChange(null);
  }, [pendingRoomChange, workspace]);

  const handleSkipWorkspaceChange = useCallback(() => {
    if (!pendingRoomChange) return;

    // Complete room change without switching workspace
    setCurrentRoomId(pendingRoomChange.roomId);
    setCurrentRoomName(pendingRoomChange.roomName);

    // Clear pending state
    setPendingRoomChange(null);
  }, [pendingRoomChange]);

  const handleCancelRoomChange = useCallback(() => {
    // Cancel - don't switch room at all
    setPendingRoomChange(null);
  }, []);

  const handleCreateWorkspaceForRoom = useCallback(
    async (type, roomId) => {
      // Use existing createBreakout from useWorkspaces or workspaceManager
      try {
        const newWorkspace = await workspace.createBreakout?.(
          `${currentRoomName || 'Room'} Workspace`,
          2 // expires in 2 hours (or adjust as needed)
        );

        // If workspaceManager has a method to set roomId, call it
        // Otherwise, the backend should handle roomId association

        return newWorkspace;
      } catch (err) {
        console.error('Failed to create workspace:', err);
        return null;
      }
    },
    [workspace, currentRoomName]
  );


  // =========================================================================
  // PHASE 3 INITIALIZATION
  // =========================================================================

  useEffect(() => {
    if (phase3Started.current) return;
    phase3Started.current = true;

    const runPhase3 = async () => {
      try {
        setPhase3Status('loading');
        log.info('Starting Phase 3 initialization...');

        await initializePhase3();

        setPhase3Status('ready');
        log.info('Phase 3 initialization complete');
      } catch (error) {
        log.error('Phase 3 initialization failed:', error);
        setPhase3Status('error');
      }
    };

    runPhase3();
  }, []);

  // =========================================================================
  // VIEW MODE HANDLING
  // =========================================================================

  const handleViewModeChange = useCallback((mode) => {
    log.info('View mode changed:', mode);
    setViewMode(mode);

    if (mode === VIEW_MODES.VR) {
      // VR mode activation logic here
      log.debug('Activating VR mode...');
    } else {
      // Desktop mode activation logic here
      log.debug('Activating Desktop mode...');
    }
  }, []);

  // Keyboard shortcut for view mode toggle
  useViewModeKeyboardShortcut({
    viewMode,
    onViewModeChange: handleViewModeChange,
    vrAvailable,
    enabled: true,
  });

  // Global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  const renderCenterPanel = () => {
    if (phase3Status !== 'ready') {
      return (
        <div className="cia-loading">
          {phase3Status === 'loading' ? 'Initializing...' : 'Initialization failed'}
        </div>
      );
    }

    return (
      <CanvasWorkspace
        workspaceId={workspaceId}
        userId={userId || sessionManager.getUserId?.() || 'anonymous'}
        projectId={projectId}
        layoutMode={layoutMode}
      />
    );
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <FloatingPanelProvider>
      <LeftPanelProvider>
        <RightPanelProvider>
          {/* LayoutPanelProvider shares state between LayoutPanel and FloatingCanvasNavigator */}
          <LayoutPanelProvider canvasId={canvasId}>
            <ThreeEdgeLayout
              // Top bar
              topBar={
                <TopBar
                  username={username}
                  projectName={projectId ? `Project ${projectId}` : null}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  vrAvailable={vrAvailable}
                />
              }

              // Center workspace
              centerPanel={renderCenterPanel()}

              // Bottom bar
              bottomBar={
                <>
                  <BottomPanel />
                  <StatusBar />
                </>
              }

              // Left side - separated activity bar and content
              leftActivityBar={<LeftActivityBar />}
              leftPanelContent={<LeftPanelContent workspaceId={workspaceId} />}

              // Right side - separated activity bar and content
              rightActivityBar={<RightActivityBar />}
              rightPanelContent={<RightPanelContent workspaceId={workspaceId} roomId={currentRoomId} roomName={currentRoomName} />}

              // Secondary bar zones - distributed across grid cells
              secondaryTopBarZones={{
                left: (
                  <WorkspaceSelector
                    currentWorkspace={workspace.currentWorkspace}
                    isOpen={workspaceSelectorOpen}
                    searchQuery={workspace.searchQuery}
                    groupedWorkspaces={workspace.groupedWorkspaces}
                    onToggle={() => setWorkspaceSelectorOpen(!workspaceSelectorOpen)}
                    onSelect={(id) => {
                      workspace.selectWorkspace(id);
                      setWorkspaceSelectorOpen(false);
                    }}
                    onSearchChange={workspace.setSearchQuery}
                    onClose={() => setWorkspaceSelectorOpen(false)}
                  />
                ),
                center: <SecondaryTopBar />,
                right: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RoomSelector
                      projectId={projectId}
                      onRoomChange={transition.initiateRoomChange}
                    />
                    <WorkspacePickerModal
                      isOpen={transition.isPickerOpen}
                      targetRoom={transition.pendingRoom}
                      currentWorkspaceId={workspace.currentWorkspace?.id}
                      groupedWorkspaces={workspace.groupedWorkspaces}
                      onConfirm={transition.confirmWithWorkspace}
                      onSkip={transition.confirmKeepWorkspace}
                      onCancel={transition.cancel}
                      onAutoEnter={transition.autoEnter}
                      onCreateWorkspace={handleCreateWorkspaceForRoom}
                    />
                    <WorkspacePresence
                      visibleUsers={presence.visibleUsers}
                      overflowCount={presence.overflowCount}
                      totalCount={presence.totalCount}
                      isHovering={presence.isHovering}
                      onHoverChange={presence.setIsHovering}
                    />
                  </div>
                ),
              }}
              secondaryBottomBarZones={{
                left: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutModeToggle
                      mode={layoutMode}
                      onModeChange={setLayoutMode}
                    />
                  </div>
                ),
                center: <SecondaryBottomBar currentWorkspace={currentWorkspace} />,
                right: (
                  <VoiceControls
                    inVoice={voice.inVoice}
                    muted={voice.muted}
                    deafened={voice.deafened}
                    currentRoom={voice.currentRoom}
                    showRoomDropdown={voice.showRoomDropdown}
                    onJoin={voice.joinVoice}
                    onLeave={voice.leaveVoice}
                    onToggleMute={voice.toggleMute}
                    onToggleDeafen={voice.toggleDeafen}
                    onToggleRoomDropdown={voice.toggleRoomDropdown}
                  />
                ),
              }}
            >
              {/* Floating panels rendered at app level - persist when docked panels close */}
              <AllFloatingPanels workspaceId={workspaceId} />
              {/* Canvas Navigator - floating/corner/minimized positions */}
              <FloatingCanvasNavigator />
            </ThreeEdgeLayout>
          </LayoutPanelProvider>
        </RightPanelProvider>
      </LeftPanelProvider>
    </FloatingPanelProvider>
  );
}

export default CIAWebApp;