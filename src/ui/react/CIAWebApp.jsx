// src/ui/react/CIAWebApp.jsx
// Pure application layer - only handles UI and Phase 3 (optional enhancements)
// Assumes Bootstrap has already handled authentication, username, and Phase 2

import React, { useEffect, useRef, useState } from "react";
import { initializePhase3 } from "@Init/appInitializer.js";

// Import UI components
import { FilesPanel } from "./components/panels/FilesPanel.jsx";
import { ControlPanel } from "./components/ControlPanel.jsx";
import { WorkspaceGrid } from "./components/workspace/WorkspaceGrid.jsx";
import { TopBar } from "./components/layout/TopBar.jsx";
import { StatusBar } from "./components/layout/StatusBar.jsx";

// Import styles
import "./styles/panels.css";

/**
 * Main Application Component
 * 
 * This is the pure application layer. It assumes:
 * 1. Phase 1 (core services) is complete - handled by index.js
 * 2. Username is set - handled by Bootstrap.jsx
 * 3. Phase 2 (user services) is complete - handled by Bootstrap.jsx
 * 
 * This component's only responsibilities are:
 * 1. Render the main application UI
 * 2. Initialize Phase 3 (optional enhancements) after UI is ready
 * 
 * This separation allows the application to focus purely on functionality
 * without worrying about authentication, permissions, or initialization.
 */
export function CIAWebApp({ username }) {
  const [phase3Status, setPhase3Status] = useState('pending'); // pending | running | complete | failed
  const phase3Started = useRef(false);

  // Run Phase 3 after the UI has mounted
  // This phase includes optional enhancements that aren't critical for basic functionality
  useEffect(() => {
    // Prevent double initialization
    if (phase3Started.current) return;

    // Small delay to ensure all React components are fully mounted
    const timer = setTimeout(() => {
      phase3Started.current = true;
      console.log("🎨 CIAWebApp: Starting Phase 3 (optional enhancements)...");
      setPhase3Status('running');

      initializePhase3()
        .then(() => {
          console.log("✅ CIAWebApp: Phase 3 complete - All enhancements loaded");
          setPhase3Status('complete');
        })
        .catch(error => {
          // Phase 3 failures are non-critical
          // The app works fine without these enhancements
          console.warn("⚠️ CIAWebApp: Some enhancements couldn't be loaded:", error.message);
          console.log("Continuing with basic features...");
          setPhase3Status('failed');
        });
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Log when component mounts/unmounts for debugging
  useEffect(() => {
    console.log("🖼️ CIAWebApp: Main UI rendered");

    return () => {
      console.log("🖼️ CIAWebApp: Main UI unmounting");
    };
  }, []);

  // Main application UI
  // This renders immediately, while Phase 3 runs in the background
  return (
    <div className="cia-web-app">
      {/* Top Bar with branding and user info */}
      <TopBar username={username} />

      {/* Main Content Area */}
      <div className="app-body">
        {/* Left Panel - File Management */}
        <div className="left-panel">
          <FilesPanel />
        </div>

        {/* Center Panel - Visualization Workspace */}
        <div className="center-panel">
          <WorkspaceGrid />
        </div>

        {/* Right Panel - Tools and Controls */}
        <div className="right-panel">
          <ControlPanel />
        </div>
      </div>

      {/* Status Bar - Shows system state */}
      <StatusBar
        username={username}
        phase3Status={phase3Status}
      />

      {/* Optional: Development mode indicators */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-indicators">
          {phase3Status === 'running' && (
            <div className="dev-indicator loading">
              Loading enhancements...
            </div>
          )}
          {phase3Status === 'failed' && (
            <div className="dev-indicator warning">
              Some enhancements unavailable
            </div>
          )}
        </div>
      )}
    </div>
  );
}