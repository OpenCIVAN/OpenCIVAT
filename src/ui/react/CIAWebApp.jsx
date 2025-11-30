// src/ui/react/CIAWebApp.jsx
// Main Application Component
// Updated: Added view mode (Desktop/VR) state management

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// Import UI components
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { LeftPanel } from '@UI/react/components/panels/LeftPanel';
import { FilesPanel } from "@UI/react/components/panels/FilesPanel";
import { WorkspaceGrid } from "@UI/react/components/workspace/Workspace/WorkspaceGrid";
import { CanvasWorkspace } from "@UI/react/components/workspace/";
import { TopBar } from "@UI/react/components/layout/TopBar";
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { RightPanel } from "@UI/react/components/panels/RightPanel";
import { SecondaryTopBar } from "@UI/react/components/layout/SecondaryTopBar";
import { SecondaryBottomBar, VIEW_MODES } from "@UI/react/components/layout/SecondaryBottomBar";
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import {
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
} from "@UI/react/components/controls/ViewModeToggle";

/**
 * Main Application Component
 *
 * Manages:
 * - Layout with resizable panels
 * - Workspace selection and navigation
 * - View mode (Desktop/VR) switching
 * - Canvas mode toggle
 * - Phase 3 initialization
 */
export function CIAWebApp({ username, userId, projectId, useNewCanvas = false }) {
  // =========================================================================
  // STATE
  // =========================================================================

  const [phase3Status, setPhase3Status] = useState('pending');
  const phase3Started = useRef(false);

  // Workspace state
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspaces({ userId });
  const workspaceId = 'personal';

  // View mode state (Desktop/VR)
  const [viewMode, setViewMode] = useState(VIEW_MODES.DESKTOP);
  const { vrAvailable, vrUnavailableReason } = useWebXRAvailability();

  // Workspace selector state (for keyboard shortcut)
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);

  // Canvas mode (old grid vs new canvas system)
  const [canvasMode, setCanvasMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('canvas') === 'new' || useNewCanvas;
    }
    return useNewCanvas;
  });

  // =========================================================================
  // KEYBOARD SHORTCUTS
  // =========================================================================

  // Toggle view mode: Ctrl/Cmd + Shift + V
  useViewModeKeyboardShortcut({
    onToggle: () => {
      if (vrAvailable) {
        handleViewModeChange(
          viewMode === VIEW_MODES.DESKTOP ? VIEW_MODES.VR : VIEW_MODES.DESKTOP
        );
      }
    },
    enabled: true,
  });

  // Register global keyboard shortcuts
  const registeredShortcuts = useGlobalKeyboardShortcuts([
    {
      key: 'w',
      ctrl: true,
      action: () => setWorkspaceSelectorOpen(prev => !prev),
      label: 'Toggle Workspace Selector',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => setCanvasMode(prev => !prev),
      label: 'Toggle Canvas Mode',
    },
  ]);

  // =========================================================================
  // VIEW MODE HANDLING
  // =========================================================================

  /**
   * Handle view mode change (Desktop <-> VR)
   * This will eventually trigger WebXR session management
   */
  const handleViewModeChange = useCallback((newMode) => {
    log.info(`View mode changing: ${viewMode} → ${newMode}`);

    if (newMode === VIEW_MODES.VR) {
      // TODO: In future, this will:
      // 1. Request WebXR session
      // 2. Transition instances to VR rendering
      // 3. Update collaboration presence to show VR mode
      log.debug("Entering VR mode...");

      // For now, just update state
      setViewMode(newMode);

      // Notify presence system (when implemented)
      // presenceSystem.updateLocalPresence({ mode: 'vr' });
    } else {
      // Exiting VR
      log.debug("Returning to Desktop mode...");

      // TODO: End WebXR session if active
      setViewMode(newMode);

      // presenceSystem.updateLocalPresence({ mode: 'desktop' });
    }
  }, [viewMode]);

  // =========================================================================
  // PHASE 3 INITIALIZATION
  // =========================================================================

  useEffect(() => {
    if (phase3Started.current) return;

    const timer = setTimeout(() => {
      phase3Started.current = true;
      log.debug("CIAWebApp: Starting Phase 3 (optional enhancements)...");
      setPhase3Status('running');

      initializePhase3()
        .then(() => {
          log.info("CIAWebApp: Phase 3 complete");
          setPhase3Status('complete');
        })
        .catch(error => {
          log.warn("CIAWebApp: Some enhancements couldn't be loaded:", error.message);
          log.debug("Continuing with basic features...");
          setPhase3Status('failed');
        });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  /**
   * Render center panel based on canvas mode
   */
  const renderCenterPanel = () => {
    if (canvasMode) {
      return (
        <CanvasWorkspace
          userId={userId || sessionManager?.getCurrentUserId?.() || 'anonymous'}
          projectId={projectId}
        />
      );
    }
    return <WorkspaceGrid />;
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <ThreeEdgeLayout
      // Top bars
      topBar={
        <TopBar
          username={username}
          canvasMode={canvasMode}
          onToggleCanvasMode={() => setCanvasMode(!canvasMode)}
        />
      }
      secondaryTopBar={
        <SecondaryTopBar
          workspaces={workspaces}
          onWorkspaceChange={selectWorkspace}
          workspaceSelectorOpen={workspaceSelectorOpen}
          onWorkspaceSelectorOpenChange={setWorkspaceSelectorOpen}
        />
      }

      // Main panels
      leftPanel={<LeftPanel workspaceId={workspaceId} />}
      centerPanel={renderCenterPanel()}
      rightPanel={<RightPanel workspaceId={workspaceId} />}

      // Bottom bars
      secondaryBottomBar={
        <SecondaryBottomBar
          currentWorkspace={currentWorkspace}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          vrAvailable={vrAvailable}
        />
      }
      bottomBar={<StatusBar />}
    />
  );
}

export default CIAWebApp;