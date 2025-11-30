// src/ui/react/CIAWebApp.jsx
// Main Application Component
// UPDATED: Removed canvasMode state and toggle (layout mode is in SecondaryBottomBar now)

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// Import UI components
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { LeftPanel } from '@UI/react/components/panels/LeftPanel';
import { WorkspaceGrid } from "@UI/react/components/workspace/Workspace/WorkspaceGrid";
import { CanvasWorkspace } from "@UI/react/components/workspace/";
import { TopBar } from "@UI/react/components/layout/TopBar";
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { RightPanel } from "@UI/react/components/panels/RightPanel";
import { SecondaryTopBar } from "@UI/react/components/layout/SecondaryTopBar";
import { SecondaryBottomBar } from "@UI/react/components/layout/SecondaryBottomBar";
import { useWorkspaces } from "@UI/react/hooks/useWorkspaces.js";
import {
  VIEW_MODES,
  useWebXRAvailability,
  useViewModeKeyboardShortcut,
  useGlobalKeyboardShortcuts,
} from "@UI/react/components/controls/ViewModeToggle";
import { LAYOUT_MODES } from "@UI/react/components/controls/LayoutModeToggle";

/**
 * Main Application Component
 *
 * Manages:
 * - Layout with resizable panels
 * - Workspace selection and navigation
 * - View mode (Desktop/VR) switching
 * - Layout mode (Normal/Isolation/Subset)
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
  const vrAvailable = useWebXRAvailability();

  // Layout mode state (Normal/Isolation/Subset) - controlled in SecondaryBottomBar
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.NORMAL);

  // Workspace selector dropdown state
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
        }}>
          {phase3Status === 'loading' ? 'Initializing...' : 'Initialization failed'}
        </div>
      );
    }

    // Always use the new canvas-based workspace
    // Layout mode (Normal/Isolation/Subset) is handled inside CanvasWorkspace
    if (useNewCanvas) {
      return (
        <CanvasWorkspace
          workspaceId={workspaceId}
          userId={userId || sessionManager.getUserId?.() || 'anonymous'}
          projectId={projectId}
          layoutMode={layoutMode}
        />
      );
    }
    return <WorkspaceGrid layoutMode={layoutMode} />;
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
          projectName={projectId ? `Project ${projectId}` : null}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          vrAvailable={vrAvailable}
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
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      }
      bottomBar={<StatusBar />}
    />
  );
}

export default CIAWebApp;