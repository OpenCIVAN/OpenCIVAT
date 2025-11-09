import React, { useState, useEffect } from "react";

import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

export function CIAWebLayout({
  children,
  leftPanel,
  rightPanel,
  roomName = "Analytics Web App",
  datasetName = "Untitled Dataset",
}) {
  const [onlineCount, setOnlineCount] = useState(0);

  // Update user count from presence system
  useEffect(() => {
    const cleanup = presenceSystem.onPresenceChange((users) => {
      setOnlineCount(users.length);
    });

    return cleanup;
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#1a1a1a",
      color: "#e0e0e0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden"
    }}>
      {/* Top Header Bar */}
      <div style={{
        height: "50px",
        backgroundColor: "#242424",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0
      }}>
        {/* Left: Room and Dataset Info */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "15px"
        }}>
          <div style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#4CAF50"
          }}>
            🎯 {roomName}
          </div>
          <div style={{
            fontSize: "13px",
            color: "#999",
            borderLeft: "1px solid #444",
            paddingLeft: "15px"
          }}>
            {datasetName}
          </div>
        </div>

        {/* Right: User Count and Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "15px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            backgroundColor: "#2a2a2a",
            borderRadius: "4px",
            fontSize: "13px"
          }}>
            <span style={{ color: "#4CAF50" }}>👥</span>
            <span>{onlineCount} online</span>
          </div>

          <button style={{
            background: "none",
            border: "1px solid #444",
            color: "#999",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}>
            ⋮
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden"
      }}>
        {/* Left Toolbar */}
        {leftPanel}

        {/* Center Canvas Area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative"
        }}>
          {children}
        </div>

        {/* Right Collaboration Panel */}
        {rightPanel}
      </div>
    </div>
  );
}