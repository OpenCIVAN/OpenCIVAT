// src/ui/react/CIAWebApp.jsx

import React, { useState, useEffect, useRef } from "react";

import { initializePhase3 } from "@Init/appInitializer.js";
import { RightCollaborationPanel } from "@UI/react/components/collaboration/RightCollaborationPanel.jsx";
import { ToolPanel } from "@UI/react/components/common/ToolPanel.jsx";
import { DebugPanel } from "@UI/react/components/DebugPanel.jsx";
import { LoggingPanel } from "@UI/react/components/LoggingPanel.jsx";
import { AnalyzePanel } from "@UI/react/components/panels/AnalyzePanel.jsx";
import { AnnotationsPanel } from "@UI/react/components/panels/AnnotationsPanel.jsx";
import { FilesPanel } from "@UI/react/components/panels/FilesPanel.jsx";
import { LeftToolbar } from "@UI/react/components/toolbars/LeftToolbar.jsx";
import { WorkspaceGrid } from "@UI/react/components/workspace/WorkspaceGrid.jsx";
import { CIAWebLayout } from "@UI/react/layouts/CIAWebLayout.jsx";

export function CIAWebApp({ roomName, userName }) {
  const [activeTool, setActiveTool] = useState(null);
  const initOnce = useRef(false);

  // Hide loading screen on mount
  useEffect(() => {
    if (window.hideLoadingScreen) {
      setTimeout(() => {
        window.hideLoadingScreen();
        console.log("🎬 Loading screen hidden - application ready");
      }, 300);
    }
  }, []);

  // Initialize Phase 3 after component mounts
  useEffect(() => {
    if (!initOnce.current) {
      initOnce.current = true;

      console.log("🔧 Initializing post-React features...");

      setTimeout(() => {
        try {
          initializePhase3();
          console.log("✅ Post-React initialization complete");
        } catch (error) {
          console.error("❌ Error in Phase 3:", error);
        }
      }, 500);
    }
  }, []);

  const handleToolSelect = (toolId) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const handleClosePanel = () => {
    setActiveTool(null);
  };

  return (
    <>
      <CIAWebLayout
        roomName={roomName}
        datasetName="{Project Name}"
        leftPanel={
          <LeftToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
          />
        }
        rightPanel={
          <RightCollaborationPanel
            roomName={roomName}
            userName={userName}
          />
        }
      >
        {/* Main Content - WorkspaceGrid goes inside as children */}
        <WorkspaceGrid />

        {/* Tool Panels - These overlay on top when opened */}
        <ToolPanel
          isOpen={activeTool === "files"}
          title="File Manager"
          icon="📁"
          onClose={handleClosePanel}
        >
          <FilesPanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === "annotate"}
          title="Annotations"
          icon="💬"
          onClose={handleClosePanel}
        >
          <AnnotationsPanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === "analyze"}
          title="Analyze Data"
          icon="📊"
          onClose={handleClosePanel}
        >
          <AnalyzePanel />
        </ToolPanel>
      </CIAWebLayout>

      {/* Logging Panel - outside main layout */}
      <LoggingPanel />
      {/* {process.env.NODE_ENV === "development" && <DebugPanel />} */}
    </>
  );
}