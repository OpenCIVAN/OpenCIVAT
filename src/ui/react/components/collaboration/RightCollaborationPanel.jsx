// src/ui/react/components/collaboration/RightCollaborationPanel.jsx

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { PeoplePanel } from "@UI/react/components/collaboration/PeoplePanel.jsx";
import { TextChatPanel } from "@UI/react/components/collaboration/TextChatPanel.jsx";
import { VoiceChatPanel } from "@UI/react/components/collaboration/VoiceChatPanel.jsx";

export function RightCollaborationPanel({ roomName }) {
  // DISABLED: Cursor visibility toggle - cursor system needs refactoring for multi-instance
  // const [cursorVisible, setCursorVisible] = useState(true);
  // const handleToggleCursor = () => {
  //   const newVisibility = !cursorVisible;
  //   setCursorVisible(newVisibility);
  //   setMyCursorVisible(newVisibility);  // ← This function doesn't exist anymore
  // };

  return (
    <div className="collaboration-panel" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a1a'
    }}>
      {/* Section Header */}
      <div style={{
        padding: "15px",
        borderBottom: "1px solid #333",
        fontSize: "13px",
        fontWeight: "600",
        textTransform: "uppercase",
        color: "#4CAF50",
        letterSpacing: "0.5px"
      }}>
        Collaboration
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px"
      }}>
        <PeoplePanel />
        <VoiceChatPanel roomName={roomName} />
        <TextChatPanel />
      </div>

      {/* DISABLED: Cursor visibility toggle - will re-enable when cursor system is refactored */}
      {/* <div style={{
        padding: '12px',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto'
      }}>
        <span style={{ fontSize: '13px', color: '#888' }}>
          Show my cursor
        </span>
        <button
          onClick={handleToggleCursor}
          style={{...}}
        >
          {cursorVisible ? <Eye size={16} /> : <EyeOff size={16} />}
          {cursorVisible ? 'Visible' : 'Hidden'}
        </button>
      </div> */}
    </div>
  );
}