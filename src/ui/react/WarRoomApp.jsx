// src/ui/react/WarRoomApp.jsx
// Updated to show username modal before main UI

import React, { useState, useEffect, useRef } from 'react';
import WarRoomLayout from './layouts/WarRoomLayout.jsx';
import LeftToolbar from './components/LeftToolbar.jsx';
import RightCollaborationPanel from './components/RightCollaborationPanel.jsx';
import ToolPanel from './components/ToolPanel.jsx';
import AnalyzePanel from './components/panels/AnalyzePanel.jsx';
import FilesPanel from './components/panels/FilesPanel.jsx';
import AnnotationsPanel from './components/panels/AnnotationsPanel.jsx';
import LoggingPanel from './components/LoggingPanel.jsx';
import UsernameModal from './components/UsernameModal.jsx';
import { useAppStore } from './store/appStore.js';
import { initializeScene } from '../../core/scene.js';
import { initializeApplicationPostScene } from '../../index.js';
import { setUserName, hasUserName } from '../../collaboration/userManagement.js';
import { presenceSystem } from '../../collaboration/presenceSystem.js';

export default function WarRoomApp({ roomName = 'default-analytics-room' }) {
  const [activeTool, setActiveTool] = useState(null);
  const [vtkInitialized, setVtkInitialized] = useState(false);
  const [postSceneInitialized, setPostSceneInitialized] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const { users } = useAppStore();
  const wrapperRef = useRef(null);
  const vtkContainerRef = useRef(null);
  const initOnce = useRef(false);

  // Check if username is already set
  useEffect(() => {
    if (!hasUserName()) {
      setShowUsernameModal(true);
    } else {
      // Username already exists, hide loading screen and show app
      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    }
  }, []);

  const handleUsernameSubmit = (username) => {
    // Set username
    setUserName(username);

    // Update presence
    presenceSystem.updateMyPresence({
      userName: username,
    });

    setShowUsernameModal(false);

    setTimeout(() => {
      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    }, 100);
  };

  const handleToolSelect = (toolId) => {
    setActiveTool(activeTool === toolId ? null : toolId);
    console.log('Tool selected:', toolId);
  };

  const handleClosePanel = () => {
    setActiveTool(null);
  };

  // Create VTK container outside React's render tree
  useEffect(() => {
    if (wrapperRef.current && !initOnce.current) {
      initOnce.current = true;
      console.log('🎨 Creating VTK container...');

      const vtkContainer = document.createElement('div');
      vtkContainer.id = 'vtk-war-room-container';
      vtkContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #1a1a1a;
      `;

      wrapperRef.current.appendChild(vtkContainer);
      vtkContainerRef.current = vtkContainer;

      console.log('📦 VTK container created, initializing scene...');

      try {
        const sceneObjects = initializeScene(vtkContainer);

        if (sceneObjects) {
          console.log('✅ VTK initialized in War Room');
          setVtkInitialized(true);
          window.vtkScene = sceneObjects;
        } else {
          console.error('❌ Failed to initialize VTK scene');
        }
      } catch (error) {
        console.error('❌ Error initializing VTK:', error);
      }
    }

    return () => { };
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
      <WarRoomLayout
        roomName="Analytics War Room"
        datasetName="{Project Name}"
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
      </WarRoomLayout>

      {/* Logging Panel - outside main layout */}
      <LoggingPanel />
    </>
  );
}