// src/ui/react/CIAWebApp.jsx
// FIXED: Proper flex layout so status bar doesn't overlay content

import React, { useEffect, useRef, useState } from "react";
import { initializePhase3 } from "@Init/appInitializer.js";
import { sessionManager } from "@Core/session/sessionManager.js";

// Import UI components
import { ToastContainer } from "@UI/react/components/common/Toast";
import { ThreeEdgeLayout } from "@UI/react/components/layout/ThreeEdgeLayout";
import { FilesPanel } from "@UI/react/components/panels/FilesPanel";
import { WorkspaceGrid } from "@UI/react/components/workspace/WorkspaceGrid.jsx";
import { TopBar } from "@UI/react/components/layout/TopBar.jsx";
import { StatusBar } from "@UI/react/components/layout/StatusBar.jsx";
import { RightCollaborationPanel } from "@UI/react/components/collaboration/RightCollaborationPanel.jsx"

/**
 * Main Application Component
 * 
 * LAYOUT FIX: The entire app uses flexbox with proper sizing
 * so that the status bar is part of the layout flow rather than
 * floating above everything with position: fixed
 */
export function CIAWebApp({ username }) {
  const [phase3Status, setPhase3Status] = useState('pending');
  const phase3Started = useRef(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

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

  return (
    <>
      <ThreeEdgeLayout
        topBar={<TopBar username={username} />}
        leftPanel={<FilesPanel
          isCollapsed={leftPanelCollapsed}
          onToggle={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        />}
        centerPanel={<WorkspaceGrid />}
        rightPanel={<RightCollaborationPanel roomName={sessionManager?.getRoomId() || 'default-analytics-room'} />}
        bottomBar={<StatusBar username={username} phase3Status={phase3Status} />}
      />
      <ToastContainer />
    </>
  );
}