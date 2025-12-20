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
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { BottomPanel } from "@UI/react/components/panels/BottomPanel";

// New Header/Footer bar components (per design spec)
import { Header } from "@UI/react/components/layout/Header";
import {
  WorkspaceSelector,
  RoomPresenceIndicator,
  FlowDirectionToggle,
  EditToolbar,
  CanvasNavigation,
} from "@UI/react/components/layout/SecondaryHeader";
import {
  PopoutButtons,
  InstanceSelector,
  ViewModeToggle as FooterViewModeToggle,
  CanvasSizeDisplay,
  VoiceQuickControls,
} from "@UI/react/components/layout/SecondaryFooter";

// Workspace and voice bar hooks
import { useSecondaryTopBar } from "@UI/react/hooks/useWorkspaceBar.js";
import { useVoiceControls } from "@UI/react/hooks/useVoiceBar.js";

import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import {
  VIEW_MODES,
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
} from "@UI/react/components/controls/ViewModeToggle";
import { LAYOUT_MODES } from "@UI/react/components/controls/LayoutModeToggle";
import { SecondaryBarDivider } from "./components/layout/SecondaryBarZone";

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

  // New component state (per design spec)
  const [flowDirection, setFlowDirection] = useState('row');
  const [canvasPosition, setCanvasPosition] = useState({ col: 0, row: 0 });
  const [canvasSize, setCanvasSize] = useState({ cols: 2, rows: 2 });
  const [openPopouts, setOpenPopouts] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);

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
  // NEW COMPONENT HANDLERS (per design spec)
  // =========================================================================

  // Popout panel toggle
  const handleTogglePopout = useCallback((popoutId) => {
    setOpenPopouts(prev =>
      prev.includes(popoutId)
        ? prev.filter(id => id !== popoutId)
        : [...prev, popoutId]
    );
  }, []);

  // Canvas navigation
  const handleNavigateHome = useCallback(() => {
    setCanvasPosition({ col: 0, row: 0 });
  }, []);

  const handleNavigateDirection = useCallback((direction) => {
    setCanvasPosition(prev => ({
      col: prev.col + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0),
      row: prev.row + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0),
    }));
  }, []);

  // Edit actions
  const handleUndo = useCallback(() => {
    log.debug('Undo action');
    // TODO: Implement undo
  }, []);

  const handleRedo = useCallback(() => {
    log.debug('Redo action');
    // TODO: Implement redo
  }, []);

  // Header actions
  const handleOpenSearch = useCallback(() => {
    log.debug('Open global search');
    // TODO: Dispatch global search modal
    window.dispatchEvent(new CustomEvent('open:global-search'));
  }, []);

  const handleOpenHelp = useCallback(() => {
    log.debug('Open help modal');
    // TODO: Dispatch help modal
    window.dispatchEvent(new CustomEvent('open:help'));
  }, []);

  const handleSignOut = useCallback(() => {
    log.debug('Sign out');
    sessionManager.logout?.();
  }, []);

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
              // Top bar (48px Header per design spec)
              topBar={
                <Header
                  currentProject={projectId ? { id: projectId, name: `Project ${projectId}` } : null}
                  projects={projects}
                  user={{ id: userId, name: username, status: 'online' }}
                  notifications={notifications}
                  unreadCount={notifications.filter(n => !n.read).length}
                  viewMode={viewMode}
                  vrAvailable={vrAvailable}
                  onProjectChange={(project) => log.debug('Project changed:', project)}
                  onCreateProject={() => log.debug('Create project')}
                  onOpenSearch={handleOpenSearch}
                  onOpenHelp={handleOpenHelp}
                  onNotificationClick={(n) => log.debug('Notification clicked:', n)}
                  onViewModeChange={handleViewModeChange}
                  onNavigate={(path) => log.debug('Navigate:', path)}
                  onSignOut={handleSignOut}
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

              // Secondary bar zones (44px SecondaryHeader per design spec)
              secondaryTopBarZones={{
                left: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WorkspaceSelector
                      workspace={workspace.currentWorkspace}
                      workspaces={workspaces}
                      onSelect={(ws) => workspace.selectWorkspace(ws?.id || ws)}
                      onCreate={() => log.debug('Create workspace')}
                    />
                    <SecondaryBarDivider height={20} />
                    <RoomPresenceIndicator
                      room={{ id: currentRoomId, name: currentRoomName }}
                      members={presence.visibleUsers?.map(u => ({
                        id: u.id,
                        name: u.name || u.username,
                        color: u.color,
                        status: 'online',
                      })) || []}
                      onClick={() => log.debug('Open rooms panel')}
                    />
                  </div>
                ),
                center: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FlowDirectionToggle
                      direction={flowDirection}
                      onChange={setFlowDirection}
                    />
                    <SecondaryBarDivider height={20} />
                    <EditToolbar
                      isEditMode={editMode}
                      activeTool={activeTool}
                      onToolChange={setActiveTool}
                      onToggleEditMode={() => setEditMode(!editMode)}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                    />
                    <SecondaryBarDivider height={20} />
                    <CanvasNavigation
                      position={canvasPosition}
                      isAtOrigin={canvasPosition.col === 0 && canvasPosition.row === 0}
                      onHome={handleNavigateHome}
                      onMove={handleNavigateDirection}
                      onBookmark={() => log.debug('Open bookmarks')}
                    />
                  </div>
                ),
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
                  </div>
                ),
              }}
              // Secondary bar zones (36px SecondaryFooter per design spec)
              secondaryBottomBarZones={{
                left: (
                  <PopoutButtons
                    openPopouts={openPopouts}
                    onToggle={handleTogglePopout}
                  />
                ),
                center: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InstanceSelector
                      activeInstance={null}
                      onCanvasViews={[]}
                      availableViews={[]}
                      onSelectInstance={(instance) => log.debug('Select instance:', instance)}
                      onPlaceView={(view) => log.debug('Place view:', view)}
                    />
                    <SecondaryBarDivider height={20} />
                    <FooterViewModeToggle
                      mode={layoutMode}
                      onChange={setLayoutMode}
                    />
                    <SecondaryBarDivider height={20} />
                    <CanvasSizeDisplay
                      size={canvasSize}
                      onChange={setCanvasSize}
                    />
                  </div>
                ),
                right: (
                  <VoiceQuickControls
                    isMuted={voice.muted}
                    isDeafened={voice.deafened}
                    isInChannel={voice.inVoice}
                    currentChannel={voice.currentRoom ? { id: currentRoomId, name: voice.currentRoom } : null}
                    channels={[
                      { id: 'general', name: 'General', participantCount: 3 },
                      { id: 'team', name: 'Team', participantCount: 2 },
                    ]}
                    onToggleMute={voice.toggleMute}
                    onToggleDeafen={voice.toggleDeafen}
                    onJoinLeave={voice.inVoice ? voice.leaveVoice : voice.joinVoice}
                    onChangeChannel={(channelId) => log.debug('Change voice channel:', channelId)}
                    onOpenSettings={() => log.debug('Open voice settings')}
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