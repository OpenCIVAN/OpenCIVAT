// src/ui/react/CIAWebApp.jsx
// FIXED: Proper flex layout so status bar doesn't overlay content

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
 * LAYOUT FIX: The entire app uses flexbox with proper sizing
 * so that the status bar is part of the layout flow rather than
 * floating above everything with position: fixed
 */
export function CIAWebApp({ username }) {
  const [phase3Status, setPhase3Status] = useState('pending');
  const phase3Started = useRef(false);

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
    <div className="cia-web-app" style={{
      // CRITICAL: Use viewport height and flexbox to create proper layout
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden', // Prevent page-level scrolling
      position: 'fixed', // Lock to viewport
      top: 0,
      left: 0,
    }}>
      {/* Top Bar - Fixed height, doesn't grow or shrink */}
      <div style={{ flexShrink: 0 }}>
        <TopBar username={username} />
      </div>

      {/* Main Content Area - Takes all available space */}
      <div className="app-body" style={{
        flex: 1, // Grow to fill available space
        display: 'flex',
        overflow: 'hidden', // Let children handle their own overflow
        minHeight: 0, // Critical for flex children to respect overflow
      }}>
        {/* Left Panel - Fixed width */}
        <div className="left-panel" style={{
          width: '250px',
          flexShrink: 0,
          overflow: 'auto', // This panel can scroll if content is too tall
          backgroundColor: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-subtle)',
        }}>
          <FilesPanel />
        </div>

        {/* Center Panel - Grows to fill available horizontal space */}
        <div className="center-panel" style={{
          flex: 1,
          overflow: 'hidden', // WorkspaceGrid will handle its own scrolling
          minWidth: 0, // Critical for flex children
        }}>
          <WorkspaceGrid />
        </div>

        {/* Right Panel - Fixed width */}
        <div className="right-panel" style={{
          width: '280px',
          flexShrink: 0,
          overflow: 'auto', // This panel can scroll if content is too tall
          backgroundColor: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border-subtle)',
        }}>
          <ControlPanel />
        </div>
      </div>

      {/* Status Bar - Fixed height, doesn't grow or shrink */}
      {/* CRITICAL: This is part of flex layout, not position: fixed */}
      <div style={{ flexShrink: 0 }}>
        <StatusBar
          username={username}
          phase3Status={phase3Status}
        />
      </div>

      {/* Development mode indicators */}
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