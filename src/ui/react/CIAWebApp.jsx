// src/ui/react/CIAWebApp.jsx
// Updated to show username modal before main UI

import React, { useState, useEffect, useRef } from 'react';
import { CIAWebLayout } from './layouts/CIAWebLayout.jsx';
import { LeftToolbar } from './components/LeftToolbar.jsx';
import { RightCollaborationPanel } from './components/RightCollaborationPanel.jsx';
import { ToolPanel } from './components/ToolPanel.jsx';
import { AnalyzePanel } from './components/panels/AnalyzePanel.jsx';
import { FilesPanel } from './components/panels/FilesPanel.jsx';
import { AnnotationsPanel } from './components/panels/AnnotationsPanel.jsx';
import { LoggingPanel } from './components/LoggingPanel.jsx';
import { UsernameModal } from './components/modals/UsernameModal.jsx';
import { useAppStore } from './store/appStore.js';
import { initializeScene } from '../../core/scene.js';
import { initializeApplicationPostScene } from '../../index.js';
import { setUserName, hasUserName } from '../../collaboration/userManagement.js';
import { presenceSystem } from '../../collaboration/presenceSystem.js';
import { markSystemReady } from '../../collaboration/yjsSetup.js';
import { AnnotationModal } from './components/modals/AnnotationModal.jsx';
import { InstructionsModal } from './components/modals/InstructionsModal.jsx';
import { TestPanel } from './components/TestPanel.jsx';
import { DebugPanel } from './components/DebugPanel.jsx';

export function CIAWebApp({ roomName = 'default-analytics-room' }) {
  const [activeTool, setActiveTool] = useState(null);
  const [vtkInitialized, setVtkInitialized] = useState(false);
  const [postSceneInitialized, setPostSceneInitialized] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const { users } = useAppStore();
  const wrapperRef = useRef(null);
  // const vtkContainerRef = useRef(null);
  const initOnce = useRef(false);
  const [instructionsModal, setInstructionsModal] = useState(false);
  const [annotationModal, setAnnotationModal] = useState({
    isOpen: false,
    position: null
  });

  // Check if username is already set
  useEffect(() => {
    if (!hasUserName()) {
      setShowUsernameModal(true);
      // Hide loading screen (username modal will be visible instead)
      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    } else {
      // Username already exists from previous session
      console.log("👤 Username already set, marking system ready");

      // 🔥 CRITICAL: Mark system ready immediately if username exists
      markSystemReady();

      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    }
  }, []);

  const handleUsernameSubmit = (username) => {
    console.log("👤 Username submitted:", username);

    // Set username
    setUserName(username);

    // Update presence
    presenceSystem.updateMyPresence({
      userName: username,
    });

    // 🔥 CRITICAL: Mark system as ready BEFORE hiding modal
    // This allows Y.js observers to now process remote datasets
    console.log("🚀 Marking system ready after username submission");
    markSystemReady();

    setShowUsernameModal(false);

    setTimeout(() => {
      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    }, 100);
  };

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
      console.log('🎨 Creating VTK container...');

      // Create the container OUTSIDE React's render tree
      const vtkContainer = document.createElement('div');
      vtkContainer.id = 'vtk-workspace-container';

      // Append it to the wrapper
      wrapperRef.current.appendChild(vtkContainer);
      // vtkContainerRef.current = vtkContainer;
      wrapperRef.current = vtkContainer;

      console.log('📦 VTK container created, initializing scene...');

      // NOW initialize VTK scene in that container
      const sceneObjects = initializeScene(vtkContainer);

      if (sceneObjects) {
        setVtkInitialized(true);
        window.vtkScene = sceneObjects;
      }
    }
  }, []);


  // In CIAWebApp useEffect, replace window.showAnnotationModal:
  useEffect(() => {
    // Check if we should skip instructions
    const skipInstructions = localStorage.getItem('annotation_skip_instructions') === 'true';

    window.showAnnotationModal = (position) => {
      if (skipInstructions) {
        // Go directly to annotation modal
        setAnnotationModal({ isOpen: true, position });
      } else {
        // Show instructions first
        setInstructionsModal(true);

        // Store position for later
        window._annotationPosition = position;
      }
    };

    return () => {
      delete window.showAnnotationModal;
      delete window._annotationPosition;
    };
  }, []);

  // Initialize post-scene features after VTK is ready
  useEffect(() => {
    if (vtkInitialized && !postSceneInitialized) {
      console.log('🔧 VTK ready, initializing post-scene features...');

      setTimeout(() => {
        try {
          initializeApplicationPostScene();
          setPostSceneInitialized(true);
          console.log('✅ Post-scene initialization complete');
        } catch (error) {
          console.error('❌ Error in post-scene initialization:', error);
        }
      }, 500);
    }
  }, [vtkInitialized, postSceneInitialized]);

  // Show username modal if needed
  if (showUsernameModal) {
    return <UsernameModal onSubmit={handleUsernameSubmit} />;
  }

  return (
    <>
      <TestPanel />
      <CIAWebLayout
        roomName="Analytics Web App"  // Consider naming later since we want contained project rooms
        datasetName="{Project Name}" // Need Way to set this dynamically later
        leftPanel={
          <LeftToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
          />
        }
        rightPanel={
          <RightCollaborationPanel roomName={roomName} />
        }
      >
        {/* VTK Container */}
        {/* <div
          ref={vtkContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        /> */}
        {/* VTK Canvas Wrapper */}
        <div
          ref={wrapperRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {!vtkInitialized && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
              zIndex: 10
            }}>
              <div style={{ marginBottom: '10px' }}>🎨</div>
              Initializing VTK Canvas...
            </div>
          )}
        </div>
        {/* Tool Panels */}
        <ToolPanel
          isOpen={activeTool === 'files'}
          title="File Manager"
          icon="📁"
          onClose={handleClosePanel}
        >
          <FilesPanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === 'analyze'}
          title="Analyze Data"
          icon="📊"
          onClose={handleClosePanel}
        >
          <AnalyzePanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === 'visualize'}
          title="Visualization"
          icon="🎨"
          onClose={handleClosePanel}
        >
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
            Visualization controls coming soon...
          </div>
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === 'transform'}
          title="Transform"
          icon="🔧"
          onClose={handleClosePanel}
        >
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
            Transform tools coming soon...
          </div>
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === 'annotate'}
          title="Annotations"
          icon="💬"
          onClose={handleClosePanel}
        >
          <AnnotationsPanel />
        </ToolPanel>

        <ToolPanel
          isOpen={activeTool === 'measure'}
          title="Measurements"
          icon="📐"
          onClose={handleClosePanel}
        >
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
            Measurement tools coming soon...
          </div>
        </ToolPanel>
        {/* Instructions Modal */}
        <InstructionsModal
          isOpen={instructionsModal}
          onClose={() => {
            setInstructionsModal(false);

            // Now show the annotation modal with stored position
            if (window._annotationPosition) {
              setAnnotationModal({
                isOpen: true,
                position: window._annotationPosition
              });
            }
          }}
          onDontShowAgain={() => {
            console.log('✅ Instructions disabled for future sessions');
          }}
        />

        {/* Annotation Creation Modal */}
        <AnnotationModal
          isOpen={annotationModal.isOpen}
          position={annotationModal.position}
          onClose={() => {
            setAnnotationModal({ isOpen: false, position: null });
            window._annotationPosition = null;

            // Disable annotation mode
            import('../../core/annotationState.js').then(({ annotationModeState }) => {
              annotationModeState.disable();
            });
          }}
          onSubmit={(text, type) => {
            // Create annotation
            import('../../collaboration/annotations.js').then(({ annotationSystem }) => {
              annotationSystem.createAnnotation(annotationModal.position, text, type);
            });

            setAnnotationModal({ isOpen: false, position: null });
            window._annotationPosition = null;

            // Disable annotation mode
            import('../../core/annotationState.js').then(({ annotationModeState }) => {
              annotationModeState.disable();
            });
          }}
        />
      </CIAWebLayout>

      {/* Logging Panel - outside main layout */}
      <LoggingPanel />
      {process.env.NODE_ENV === 'development' && <DebugPanel />}
    </>
  );
}