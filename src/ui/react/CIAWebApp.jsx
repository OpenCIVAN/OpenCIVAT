// src/ui/react/CIAWebApp.jsx
// Main application component - handles VTK scene and UI layout

import React, { useState, useEffect, useRef } from "react";

import { initializeScene } from "@Core/scene/sceneManager.js";
import { initializePhase3 } from "@Init/appInitializer.js";
import { RightCollaborationPanel } from "@UI/react/components/collaboration/RightCollaborationPanel.jsx";
import { ToolPanel } from "@UI/react/components/common/ToolPanel.jsx";
import { DebugPanel } from "@UI/react/components/DebugPanel.jsx";
import { LoggingPanel } from "@UI/react/components/LoggingPanel.jsx";
import { AnnotationModal } from "@UI/react/components/modals/AnnotationModal.jsx";
import { AnalyzePanel } from "@UI/react/components/panels/AnalyzePanel.jsx";
import { AnnotationsPanel } from "@UI/react/components/panels/AnnotationsPanel.jsx";
import { FilesPanel } from "@UI/react/components/panels/FilesPanel.jsx";
import { TestPanel } from "@UI/react/components/TestPanel.jsx";
import { LeftToolbar } from "@UI/react/components/toolbars/LeftToolbar.jsx";
import { CIAWebLayout } from "@UI/react/layouts/CIAWebLayout.jsx";

export function CIAWebApp({ roomName, userName }) {
  const [activeTool, setActiveTool] = useState(null);
  const [vtkInitialized, setVtkInitialized] = useState(false);
  const [postSceneInitialized, setPostSceneInitialized] = useState(false);
  const wrapperRef = useRef(null);
  const initOnce = useRef(false);
  const [annotationModal, setAnnotationModal] = useState({
    isOpen: false,
    position: null
  });

  const handleToolSelect = (toolId) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const handleClosePanel = () => {
    setActiveTool(null);
  };

  // Create VTK container outside React's render tree
  useEffect(() => {
    if (wrapperRef.current && !initOnce.current) {
      initOnce.current = true;
      console.log("🎨 Creating VTK container...");

      // Create the container outside React's render tree
      const vtkContainer = document.createElement("div");
      vtkContainer.id = "vtk-workspace-container";
      vtkContainer.style.width = "100%";
      vtkContainer.style.height = "100%";
      vtkContainer.style.position = "absolute";
      vtkContainer.style.top = "0";
      vtkContainer.style.left = "0";

      // Append it to the wrapper
      wrapperRef.current.appendChild(vtkContainer);

      console.log("📦 VTK container created, initializing scene...");

      // Initialize VTK scene in that container
      const sceneObjects = initializeScene(vtkContainer);

      if (sceneObjects) {
        setVtkInitialized(true);
        window.vtkScene = sceneObjects;
        console.log("✅ VTK scene initialized");
      }
    }
  }, []);


  // Setup annotation modal trigger
  useEffect(() => {
    window.showAnnotationModal = (position) => {
      // Go directly to annotation modal - no instructions needed
      setAnnotationModal({ isOpen: true, position });
    };

    return () => {
      delete window.showAnnotationModal;
    };
  }, []);

  // Initialize post-scene features after VTK is ready
  useEffect(() => {
    if (vtkInitialized && !postSceneInitialized) {
      console.log("🔧 VTK ready, initializing post-scene features...");

      // Small delay to ensure scene is fully ready
      setTimeout(() => {
        try {
          initializePhase3();
          setPostSceneInitialized(true);
          console.log("✅ Post-scene initialization complete");
        } catch (error) {
          console.error("❌ Error in post-scene initialization:", error);
        }
      }, 500);
    }
  }, [vtkInitialized, postSceneInitialized]);

  return (
    <>
      {process.env.NODE_ENV === "development" && <TestPanel />}

      <CIAWebLayout
        roomName={roomName}
        datasetName="{Project Name}" // Need Way to set this dynamically later
        leftPanel={
          <LeftToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
          />
        }
        rightPanel={
          <RightCollaborationPanel roomName={roomName} userName={userName} />
        }
      >
        {/* VTK Canvas Wrapper */}
        <div
          ref={wrapperRef}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden"
          }}
        >
          {!vtkInitialized && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#666",
              fontSize: "14px",
              zIndex: 10
            }}>
              <div style={{ marginBottom: "10px" }}>🎨</div>
              Initializing VTK Canvas...
            </div>
          )}
        </div>

        {/* Tool Panels */}
        <ToolPanel
          isOpen={activeTool === "files"}
          title="File Manager"
          icon="📁"
          onClose={handleClosePanel}
        >
          <FilesPanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === "analyze"}
          title="Analyze Data"
          icon="📊"
          onClose={handleClosePanel}
        >
          <AnalyzePanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === "visualize"}
          title="Visualization"
          icon="🎨"
          onClose={handleClosePanel}
        >
          <div style={{ color: "#999", textAlign: "center", padding: "40px 20px" }}>
            Visualization controls coming soon...
          </div>
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === "transform"}
          title="Transform"
          icon="🔧"
          onClose={handleClosePanel}
        >
          <div style={{ color: "#999", textAlign: "center", padding: "40px 20px" }}>
            Transform tools coming soon...
          </div>
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
          isOpen={activeTool === "measure"}
          title="Measurements"
          icon="📐"
          onClose={handleClosePanel}
        >
          <div style={{ color: "#999", textAlign: "center", padding: "40px 20px" }}>
            Measurement tools coming soon...
          </div>
        </ToolPanel>

        {/* Annotation Creation Modal */}
        <AnnotationModal
          isOpen={annotationModal.isOpen}
          position={annotationModal.position}
          onClose={() => {
            setAnnotationModal({ isOpen: false, position: null });
            window._annotationPosition = null;

            // Disable annotation mode
            import("@Collaboration/annotations/annotationState.js").then(({ annotationModeState }) => {
              annotationModeState.disable();
            });
          }}
          onSubmit={(text, type) => {
            // Create annotation
            import("@Collaboration/annotations/annotationSystem.js").then(({ annotationSystem }) => {
              annotationSystem.createAnnotation(annotationModal.position, text, type);
            });

            setAnnotationModal({ isOpen: false, position: null });
            window._annotationPosition = null;

            // Disable annotation mode
            import("@Collaboration/annotations/annotationState.js").then(({ annotationModeState }) => {
              annotationModeState.disable();
            });
          }}
        />
      </CIAWebLayout>

      {/* Logging Panel - outside main layout */}
      <LoggingPanel />
      {process.env.NODE_ENV === "development" && <DebugPanel />}
    </>
  );
}