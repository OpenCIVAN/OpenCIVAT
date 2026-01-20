// src/ui/react/CIAWebApp.jsx
// =============================================================================
// MAIN APPLICATION COMPONENT - CANVAS-CENTRIC VERSION
// =============================================================================
//
// KEY CHANGE: Secondary bars (SecondaryHeader/SecondaryFooter) have been moved
// into the canvas itself. The canvas now has its own chrome:
// - CanvasHeader: Navigation (back, home, breadcrumb, viewport nav, grid size)
// - CanvasToolbar: Actions (view mode, history, subset, active view, actions)
// - CanvasStatusBar: Info (canvas size, viewport size, render mode, sync status)
// - EdgeTriggers + FloatingPanels: Panel access via edge hover
//
// The ThreeEdgeLayout now has 3 rows instead of 5:
// - Top bar (Header)
// - Main content (activity bars + panels + workspace)
// - Bottom bar (StatusBar)

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { authService } from "@Services/authService.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

// =============================================================================
// LAYOUT INFRASTRUCTURE
// =============================================================================
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";

// =============================================================================
// HEADER COMPONENTS (48px - Global App Controls)
// =============================================================================
import { Header } from "@UI/react/components/layout/Header";

// =============================================================================
// SECONDARY BARS - DEPRECATED
// =============================================================================
// SecondaryHeader and SecondaryFooter are now deprecated.
// Canvas chrome is now handled by CanvasWorkspace which includes:
// - CanvasHeader, CanvasToolbar, CanvasStatusBar
// - EdgeTriggers + FloatingPanels for panel access

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
  useInstanceToolsFloating,
} from "@UI/react/components/panels/FloatingPanel";
import { LayoutPanelProvider } from "@UI/react/components/panels/LayoutPanel/LayoutPanelContext";
import { FloatingCanvasNavigator, useNavigatorButton } from "@UI/react/components/panels/LayoutPanel";
import { CanvasOperationsPanel } from "@UI/react/components/panels/FloatingPanel/CanvasOperationsPanel";
import { VRAccessibilityProvider } from "@UI/react/context/VRAccessibilityContext";

// =============================================================================
// MODALS
// =============================================================================
import { CreateRoomModal } from "@UI/react/components/modals/CreateRoomModal";
import { KeyboardShortcutsModal } from "@UI/react/components/modals/KeyboardShortcutsModal";
import { GlobalSearchModal } from "@UI/react/components/modals/GlobalSearchModal";
import { DeleteViewDialog } from "@UI/react/components/modals/confirmations/DeleteViewDialog";
import { DatasetSelectorModal } from "@UI/react/components/modals/DatasetSelectorModal";

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================
import { ToastContainer } from "@UI/react/components/molecules/Toast";
import { toast } from "@UI/react/store/toastStore";

// =============================================================================
// CANVAS HISTORY (UNDO/REDO)
// =============================================================================
import { canvasHistory } from "@UI/react/store/canvasHistoryStore";

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
  LAYOUT_MODES,
} from "@UI/react/components/organisms";
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
  const [userStatus, setUserStatus] = useState("online");

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

  // ===========================================================================
  // USER STATUS (Presence-aware)
  // ===========================================================================
  useEffect(() => {
    const handlePresenceChange = (users) => {
      const me = users.find((user) => user.isYou);
      if (me?.status) {
        setUserStatus(me.status);
      }
    };

    const handleStatusChange = (status) => {
      if (status) {
        setUserStatus(status);
      }
    };

    const handleStatusEvent = (event) => {
      const nextStatus = event?.detail?.status;
      if (nextStatus) {
        presenceSystem.updateStatus(nextStatus);
      }
    };

    const cleanupPresence = presenceSystem.onPresenceChange(handlePresenceChange);
    const cleanupStatus = presenceSystem.onStatusChange(handleStatusChange);
    window.addEventListener("cia:user-status-change", handleStatusEvent);

    return () => {
      cleanupPresence?.();
      cleanupStatus?.();
      window.removeEventListener("cia:user-status-change", handleStatusEvent);
    };
  }, []);

  // ===========================================================================
  // MODAL STATE
  // ===========================================================================
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [deleteViewTarget, setDeleteViewTarget] = useState(null); // { id, name } or null
  const [datasetSelectorTarget, setDatasetSelectorTarget] = useState(null); // { row, col } or null

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
    setShowGlobalSearch(true);
  }, []);

  const handleOpenHelp = useCallback(() => {
    log.debug("Open keyboard shortcuts");
    setShowKeyboardShortcuts(true);
  }, []);

  const handleDeleteView = useCallback((view) => {
    log.debug("Delete view requested:", view);
    setDeleteViewTarget(view);
  }, []);

  const handleConfirmDeleteView = useCallback(async () => {
    if (!deleteViewTarget?.id) return;

    const viewId = deleteViewTarget.id;
    const viewName = deleteViewTarget.name;
    log.info("Deleting view:", viewName);

    try {
      // Get managers
      const viewConfigManager = getViewConfigurationManager();
      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');

      // Find and store placement info for undo
      const placement = canvasManager.getPlacementForView(viewId);
      const placementData = placement ? {
        canvasId: canvasManager.getActiveCanvas()?.id,
        row: placement.row,
        col: placement.col,
        rowSpan: placement.rowSpan || 1,
        colSpan: placement.colSpan || 1,
      } : null;

      // Store view config for potential undo
      const viewConfig = viewConfigManager.getView(viewId);

      // 1. Remove from canvas if placed
      if (placement && placementData?.canvasId) {
        await canvasManager.removePlacement(placementData.canvasId, placement.id);
      }

      // 2. Delete the view configuration
      await viewConfigManager.deleteView(viewId);

      // 3. Record in history for undo
      canvasHistory.record({
        type: 'DELETE',
        description: `Delete "${viewName}"`,
        undo: async () => {
          // Restore would require recreating the view - complex operation
          // For now, just show a message that undo isn't fully supported for delete
          toast.warning('View deletion cannot be fully undone. Check trash to restore.');
        },
        redo: async () => {
          // Re-delete would require the view to exist again
          toast.info('Redo delete not available');
        },
      });

      toast.success(`Deleted "${viewName}"`, {
        actionLabel: 'Undo',
        onAction: () => canvasHistory.undo(),
      });
    } catch (error) {
      log.error("Failed to delete view:", error);
      toast.error(`Failed to delete view: ${error.message}`);
    }

    setDeleteViewTarget(null);
  }, [deleteViewTarget]);

  const handleSignOut = useCallback(async () => {
    log.debug("Sign out");
    presenceSystem.destroy();
    sessionManager.clearSession();
    await authService.logout();
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
    if (canvasHistory.canUndo()) {
      log.debug("Undo triggered");
      canvasHistory.undo();
    } else {
      log.debug("Nothing to undo");
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (canvasHistory.canRedo()) {
      log.debug("Redo triggered");
      canvasHistory.redo();
    } else {
      log.debug("Nothing to redo");
    }
  }, []);

  const handleTogglePopout = useCallback((popoutId) => {
    setOpenPopouts((prev) => {
      const newState = prev.includes(popoutId)
        ? prev.filter((id) => id !== popoutId)
        : [...prev, popoutId];

      // Dispatch state change event for activity bar buttons
      window.dispatchEvent(new CustomEvent('cia:popout-state-change', {
        detail: { popoutId, isOpen: newState.includes(popoutId) }
      }));

      return newState;
    });
  }, []);

  // Listen for popout toggle events from activity bar
  useEffect(() => {
    const handleTogglePopoutEvent = (e) => {
      const { popoutId } = e.detail || {};
      if (popoutId) {
        handleTogglePopout(popoutId);
      }
    };

    window.addEventListener('cia:toggle-popout', handleTogglePopoutEvent);
    return () => window.removeEventListener('cia:toggle-popout', handleTogglePopoutEvent);
  }, [handleTogglePopout]);

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
  // VOICE EVENT BRIDGE (for activity bar voice controls)
  // ===========================================================================
  // Listen for voice action events from activity bar and call appropriate handlers
  useEffect(() => {
    const handleVoiceAction = (e) => {
      const { action } = e.detail || {};
      switch (action) {
        case 'joinLeave':
          handleJoinLeaveVoice();
          break;
        case 'toggleMute':
          voice.toggleMute?.();
          break;
        case 'toggleDeafen':
          voice.toggleDeafen?.();
          break;
        case 'openSettings':
          handleOpenVoiceSettings();
          break;
        default:
          break;
      }
    };

    window.addEventListener('cia:voice-action', handleVoiceAction);
    return () => window.removeEventListener('cia:voice-action', handleVoiceAction);
  }, [handleJoinLeaveVoice, voice.toggleMute, voice.toggleDeafen, handleOpenVoiceSettings]);

  // Dispatch voice state changes to activity bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cia:voice-state-change', {
      detail: {
        inVoice: voice.inVoice,
        isMuted: voice.muted,
        isDeafened: voice.deafened,
        isJoining: voice.isJoining,
      }
    }));
  }, [voice.inVoice, voice.muted, voice.deafened, voice.isJoining]);

  // Track previous voice state for toast notifications
  const prevVoiceState = useRef({ inVoice: false, isJoining: false });

  useEffect(() => {
    const prev = prevVoiceState.current;
    const roomName = voice.currentRoom || currentRoomName || 'voice channel';

    // Started joining
    if (voice.isJoining && !prev.isJoining) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Joining ${roomName}...`, type: 'info', duration: 3000 }
      }));
    }

    // Successfully joined (was joining or just connected)
    if (voice.inVoice && !prev.inVoice) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Joined ${roomName}`, type: 'success' }
      }));
    }

    // Left voice (was in voice, now not)
    if (!voice.inVoice && prev.inVoice && !voice.isJoining) {
      window.dispatchEvent(new CustomEvent('cia:toast', {
        detail: { message: `Left ${roomName}`, type: 'info' }
      }));
    }

    // Update previous state
    prevVoiceState.current = { inVoice: voice.inVoice, isJoining: voice.isJoining };
  }, [voice.inVoice, voice.isJoining, voice.currentRoom, currentRoomName]);

  // ===========================================================================
  // QUICK ACTION HANDLERS (View Snapshot, Duplicate, Settings)
  // ===========================================================================
  const handleViewSnapshot = useCallback(async (event) => {
    const { viewId, view, cameraState } = event.detail || {};
    if (!viewId) return;

    log.info("Creating snapshot for view:", view?.name || viewId);

    try {
      // Get view configuration for additional details
      const viewConfigManager = getViewConfigurationManager();
      const viewConfig = viewConfigManager.getView(viewId);

      if (!viewConfig) {
        toast.error('View configuration not found');
        return;
      }

      // Create bookmark name with timestamp
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const snapshotName = `${view?.name || viewConfig.name} - ${timestamp}`;

      // Get camera state from event or from view config
      const camera = cameraState || viewConfig.camera;

      // Dispatch event to create bookmark (will be handled by BookmarksFiltersTab or a hook)
      window.dispatchEvent(new CustomEvent('cia:create-bookmark', {
        detail: {
          name: snapshotName,
          description: `Snapshot of "${view?.name || viewConfig.name}"`,
          scope: 'personal',
          view_config_id: viewId,
          dataset_id: viewConfig.datasetId,
          camera_state: camera,
          filter_ids: viewConfig.filters?.map(f => f.id) || [],
          tags: ['snapshot', 'auto-created'],
        }
      }));

      toast.success(`Snapshot saved: "${snapshotName}"`, {
        actionLabel: 'View',
        onAction: () => {
          window.dispatchEvent(new CustomEvent('navigate:left-panel', {
            detail: { tab: 'bookmarks-filters' }
          }));
        },
      });
    } catch (error) {
      log.error("Failed to create snapshot:", error);
      toast.error(`Failed to create snapshot: ${error.message}`);
    }
  }, []);

  const handleViewDuplicate = useCallback(async (event) => {
    const { viewId, view, canvasId: eventCanvasId } = event.detail || {};
    if (!viewId) return;

    log.info("Duplicating view:", view?.name || viewId);

    try {
      // Get the managers
      const viewConfigManager = getViewConfigurationManager();
      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');

      // 1. Duplicate the view configuration
      const newView = await viewConfigManager.duplicateView(viewId);

      // 2. Find the canvas to place the new view on
      const targetCanvasId = eventCanvasId || canvasManager.getActiveCanvas()?.id;
      if (!targetCanvasId) {
        toast.error('No active canvas to place duplicated view');
        return;
      }

      // 3. Find an empty cell (scan row by row for first empty)
      const canvas = canvasManager.getActiveCanvas();
      const placements = canvas?.placements || [];
      const occupiedCells = new Set(placements.map(p => `${p.row}-${p.col}`));

      let targetRow = 0;
      let targetCol = 0;
      const maxRows = canvas?.size?.rows || 10;
      const maxCols = canvas?.size?.cols || 10;

      // Find first empty cell
      let found = false;
      for (let r = 0; r < maxRows && !found; r++) {
        for (let c = 0; c < maxCols && !found; c++) {
          if (!occupiedCells.has(`${r}-${c}`)) {
            targetRow = r;
            targetCol = c;
            found = true;
          }
        }
      }

      // 4. Place the new view on the canvas
      await canvasManager.addPlacement(targetCanvasId, {
        row: targetRow,
        col: targetCol,
        rowSpan: 1,
        colSpan: 1,
        content: {
          type: 'view',
          viewConfigurationId: newView.id,
        },
      });

      // 5. Record in history for undo
      canvasHistory.record({
        type: 'ADD',
        description: `Duplicate "${view?.name || 'view'}"`,
        undo: async () => {
          // Remove the placement
          const placement = canvasManager.getPlacementForView(newView.id, targetCanvasId);
          if (placement) {
            await canvasManager.removePlacement(targetCanvasId, placement.id);
          }
        },
        redo: async () => {
          await canvasManager.addPlacement(targetCanvasId, {
            row: targetRow,
            col: targetCol,
            rowSpan: 1,
            colSpan: 1,
            content: {
              type: 'view',
              viewConfigurationId: newView.id,
            },
          });
        },
      });

      toast.success(`Duplicated "${view?.name || 'view'}" to ${newView.name}`);
    } catch (error) {
      log.error("Failed to duplicate view:", error);
      toast.error(`Failed to duplicate view: ${error.message}`);
    }
  }, []);

  const handleViewSettings = useCallback((event) => {
    const { viewId, view } = event.detail || {};
    if (!viewId) return;

    log.info("Opening settings for view:", view?.name || viewId);
    // Navigate to Instance Tools tab in left panel with this view selected
    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
      detail: { tab: 'instance-tools', viewId }
    }));
  }, []);

  // Listen for quick action events
  useEffect(() => {
    window.addEventListener('cia:view-snapshot', handleViewSnapshot);
    window.addEventListener('cia:view-duplicate', handleViewDuplicate);
    window.addEventListener('cia:view-settings', handleViewSettings);

    return () => {
      window.removeEventListener('cia:view-snapshot', handleViewSnapshot);
      window.removeEventListener('cia:view-duplicate', handleViewDuplicate);
      window.removeEventListener('cia:view-settings', handleViewSettings);
    };
  }, [handleViewSnapshot, handleViewDuplicate, handleViewSettings]);

  // ===========================================================================
  // MODAL EVENT LISTENERS
  // ===========================================================================
  useEffect(() => {
    const handleOpenGlobalSearch = () => setShowGlobalSearch(true);
    const handleOpenShortcuts = () => setShowKeyboardShortcuts(true);
    const handleDeleteViewEvent = (e) => {
      const { view } = e.detail || {};
      if (view) handleDeleteView(view);
    };
    const handleOpenDatasetSelector = (e) => {
      const { targetRow, targetCol } = e.detail || {};
      if (targetRow !== undefined && targetCol !== undefined) {
        setDatasetSelectorTarget({ row: targetRow, col: targetCol });
      }
    };

    window.addEventListener('open:global-search', handleOpenGlobalSearch);
    window.addEventListener('open:keyboard-shortcuts', handleOpenShortcuts);
    window.addEventListener('open:help', handleOpenShortcuts); // Help opens shortcuts
    window.addEventListener('cia:delete-view', handleDeleteViewEvent);
    window.addEventListener('cia:open-dataset-selector', handleOpenDatasetSelector);

    return () => {
      window.removeEventListener('open:global-search', handleOpenGlobalSearch);
      window.removeEventListener('open:keyboard-shortcuts', handleOpenShortcuts);
      window.removeEventListener('open:help', handleOpenShortcuts);
      window.removeEventListener('cia:delete-view', handleDeleteViewEvent);
      window.removeEventListener('cia:open-dataset-selector', handleOpenDatasetSelector);
    };
  }, [handleDeleteView]);

  // ===========================================================================
  // TOAST EVENT LISTENER
  // ===========================================================================
  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type = 'info', ...options } = e.detail || {};
      if (!message) return;

      // Call the appropriate toast method based on type
      switch (type) {
        case 'success':
          toast.success(message, options);
          break;
        case 'warning':
          toast.warning(message, options);
          break;
        case 'error':
          toast.error(message, options);
          break;
        case 'sync':
          toast.sync(message, options);
          break;
        default:
          toast.info(message, options);
      }
    };

    window.addEventListener('cia:toast', handleToastEvent);
    return () => window.removeEventListener('cia:toast', handleToastEvent);
  }, []);

  // ===========================================================================
  // KEYBOARD SHORTCUTS FOR MODALS
  // ===========================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger in inputs
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      // ⌘/Ctrl + K = Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
        return;
      }

      // ? = Keyboard Shortcuts (not in inputs)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // ⌘/Ctrl + / = Keyboard Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // T = Toggle Instance Tools floating panel (not in inputs)
      if (e.key === 't' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cia:toggle-instance-tools-floating'));
        return;
      }

      // ⌘/Ctrl + M = Toggle Canvas Navigator
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('cia:toggle-canvas-navigator'));
        return;
      }

      // ⌘/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // ⌘/Ctrl + Shift + Z OR ⌘/Ctrl + Y = Redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
    <VRAccessibilityProvider>
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
                  user={
                    userId
                      ? {
                          id: userId,
                          name: username,
                          avatar: null,
                          status: userStatus,
                        }
                      : null
                  }
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
              // SECONDARY BARS REMOVED - Now handled by CanvasWorkspace
              // ─────────────────────────────────────────────────────────────
              // Canvas chrome (CanvasHeader, CanvasToolbar, CanvasStatusBar)
              // is now rendered inside CanvasWorkspace, not in ThreeEdgeLayout
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
              rightPanelContent={
                <RightPanelContent
                  workspaceId={workspaceId}
                  projectId={projectId}
                  roomId={currentRoomId}
                  roomName={currentRoomName}
                  availableRooms={availableRooms}
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

            {/* Keyboard Shortcuts Modal (? or ⌘/) */}
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />

            {/* Global Search Modal (⌘K) */}
            <GlobalSearchModal
              isOpen={showGlobalSearch}
              onClose={() => setShowGlobalSearch(false)}
              onSelect={async (result) => {
                log.debug("Search result selected:", result);
                setShowGlobalSearch(false);

                if (!result?.type || !result?.id) return;

                // Navigate based on result type
                switch (result.type) {
                  case 'project':
                    // Navigate to the project (would change active project)
                    log.info(`Navigating to project: ${result.name}`);
                    toast.info(`Opening project "${result.name}"...`);
                    // Dispatch event to change project
                    window.dispatchEvent(new CustomEvent('cia:navigate-project', {
                      detail: { projectId: result.id, projectName: result.name }
                    }));
                    break;

                  case 'dataset':
                    // Open dataset in left panel
                    log.info(`Navigating to dataset: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                      detail: { tab: 'datasets', datasetId: result.id }
                    }));
                    toast.info(`Showing dataset "${result.name}"`);
                    break;

                  case 'view':
                    // Focus the view on canvas or open it
                    log.info(`Opening view: ${result.name}`);
                    try {
                      const { canvasManager } = await import('@Core/data/managers/CanvasManager.js');
                      const placement = canvasManager.getPlacementForView(result.id);

                      if (placement) {
                        // View is on canvas - scroll to it and select
                        window.dispatchEvent(new CustomEvent('cia:focus-cell', {
                          detail: { row: placement.row, col: placement.col, viewId: result.id }
                        }));
                        toast.info(`Focused "${result.name}"`);
                      } else {
                        // View not on canvas - show in views tab
                        window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                          detail: { tab: 'views', viewId: result.id }
                        }));
                        toast.info(`Showing view "${result.name}" in Views tab`);
                      }
                    } catch (error) {
                      log.error('Error navigating to view:', error);
                    }
                    break;

                  case 'person':
                    // Show person in People tab
                    log.info(`Opening person: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:right-panel', {
                      detail: { tab: 'people', userId: result.id }
                    }));
                    toast.info(`Showing "${result.name}" in People tab`);
                    break;

                  case 'annotation':
                    // Open annotation in Annotations tab
                    log.info(`Opening annotation: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('navigate:left-panel', {
                      detail: { tab: 'annotations', annotationId: result.id }
                    }));
                    toast.info(`Showing annotation`);
                    break;

                  case 'room':
                    // Switch to the room
                    log.info(`Navigating to room: ${result.name}`);
                    window.dispatchEvent(new CustomEvent('cia:switch-room', {
                      detail: { roomId: result.id, roomName: result.name }
                    }));
                    toast.info(`Switching to room "${result.name}"`);
                    break;

                  default:
                    log.warn(`Unknown result type: ${result.type}`);
                    toast.warning(`Cannot navigate to "${result.name}"`);
                }
              }}
            />

            {/* Delete View Confirmation Dialog */}
            <DeleteViewDialog
              isOpen={deleteViewTarget !== null}
              onClose={() => setDeleteViewTarget(null)}
              view={deleteViewTarget}
              onConfirm={handleConfirmDeleteView}
            />

            {/* Dataset Selector Modal (for empty cell view button) */}
            <DatasetSelectorModal
              isOpen={datasetSelectorTarget !== null}
              onClose={() => setDatasetSelectorTarget(null)}
              targetRow={datasetSelectorTarget?.row ?? 0}
              targetCol={datasetSelectorTarget?.col ?? 0}
            />

            {/* Toast Notifications */}
            <ToastContainer />
            </LayoutPanelProvider>
          </RightPanelProvider>
        </LeftPanelProvider>
      </FloatingPanelProvider>
    </VRAccessibilityProvider>
  );
}

export default CIAWebApp;
