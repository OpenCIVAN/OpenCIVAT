// src/ui/react/CIAWebApp.jsx
// FIXED: Proper flex layout so status bar doesn't overlay content

import React, { useEffect, useRef, useState } from "react";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// Import UI components
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { FilesPanel } from "@UI/react/components/panels/FilesPanel";
import { WorkspaceGrid } from "@UI/react/components/workspace/Workspace/WorkspaceGrid";
import { CanvasWorkspace } from "@UI/react/components/workspace/";
import { TopBar } from "@UI/react/components/layout/TopBar";
import { StatusBar } from "@UI/react/components/layout/StatusBar";
import { RightCollaborationPanel } from "@UI/react/components/collaboration/RightCollaborationPanel"
import { SecondaryTopBar } from '@UI/react/components/layout/SecondaryTopBar';
import { SecondaryBottomBar } from '@UI/react/components/layout/SecondaryBottomBar';
import { useWorkspaces } from '@UI/react/hooks/useWorkspaces.js';

/**
 * Main Application Component
 *
 * LAYOUT FIX: The entire app uses flexbox with proper sizing
 * so that the status bar is part of the layout flow rather than
 * floating above everything with position: fixed
 */
export function CIAWebApp({ username, userId, projectId, useNewCanvas = false }) {
  const [phase3Status, setPhase3Status] = useState('pending');
  const phase3Started = useRef(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspaces({ userId });

  // Feature flag for new canvas system (can be toggled via props or query param)
  const [canvasMode, setCanvasMode] = useState(() => {
    // Check URL for ?canvas=new
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('canvas') === 'new' || useNewCanvas;
    }
    return useNewCanvas;
  });

  // Run Phase 3 after the UI has mounted
  useEffect(() => {
    if (phase3Started.current) return;

    const timer = setTimeout(() => {
      phase3Started.current = true;
      console.log("🎨 CIAWebApp: Starting Phase 3 (optional enhancements)...");
      setPhase3Status('running');

      initializePhase3()
        .then(() => {
          console.log("✅ CIAWebApp: Phase 3 complete");
          setPhase3Status('complete');
        })
        .catch(error => {
          console.warn("⚠️ CIAWebApp: Some enhancements couldn't be loaded:", error.message);
          console.log("Continuing with basic features...");
          setPhase3Status('failed');
        });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Render center panel based on canvas mode
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

  return (
    <ThreeEdgeLayout
      topBar={<TopBar username={username} canvasMode={canvasMode} onToggleCanvasMode={() => setCanvasMode(!canvasMode)} />}
      secondaryTopBar={<SecondaryTopBar workspaces={workspaces} />}
      leftPanel={<FilesPanel />}
      centerPanel={<WorkspaceGrid />}
      rightPanel={<CollaborationPanel />}
      secondaryBottomBar={<SecondaryBottomBar currentWorkspace={currentWorkspace} />}
      bottomBar={<StatusBar />}
    />
  );
}