// src/ui/react/components/collaboration/RightCollaborationPanel.jsx
import React, { useState } from "react";
import {
  Users,
  Mic,
  MessageSquare,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";

import { PeoplePanel } from "@UI/react/components/collaboration/PeoplePanel";
import { TextChatPanel } from "@UI/react/components/collaboration/TextChatPanel.jsx";
import { VoiceChatPanel } from "@UI/react/components/collaboration/VoiceChatPanel.jsx";

import './RightCollaborationPanel.scss';

// =============================================================================
// ACTIVITY BAR (Collapsed State)
// =============================================================================

function CollabActivityBar({ activeTab, setActiveTab, onExpand }) {
  return (
    <div className="collab-activity-bar">
      <div className="collab-activity-bar__icons">
        <button
          className={`collab-activity-bar__icon ${activeTab === 'people' ? 'active' : ''}`}
          title="People"
          onClick={() => { setActiveTab('people'); onExpand(); }}
        >
          <Users size={20} />
        </button>
        <button
          className={`collab-activity-bar__icon ${activeTab === 'voice' ? 'active' : ''}`}
          title="Voice Chat"
          onClick={() => { setActiveTab('voice'); onExpand(); }}
        >
          <Mic size={20} />
        </button>
        <button
          className={`collab-activity-bar__icon ${activeTab === 'chat' ? 'active' : ''}`}
          title="Text Chat"
          onClick={() => { setActiveTab('chat'); onExpand(); }}
        >
          <MessageSquare size={20} />
        </button>
        <button
          className={`collab-activity-bar__icon ${activeTab === 'activity' ? 'active' : ''}`}
          title="Activity"
          onClick={() => { setActiveTab('activity'); onExpand(); }}
        >
          <Bell size={20} />
        </button>
      </div>
      <button
        className="collab-activity-bar__expand"
        onClick={onExpand}
        title="Expand panel"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RightCollaborationPanel({ roomName, isCollapsed = false, onToggle, side = 'right' }) {
  // Main panel state
  const [activeTab, setActiveTab] = useState('people'); // 'people', 'voice', 'chat', 'activity'

  // Quick Access state
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [quickAccessTab, setQuickAccessTab] = useState('settings');

  // Settings state (for Quick Access)
  const [showMyCursor, setShowMyCursor] = useState(true);
  const [showAllCursors, setShowAllCursors] = useState(true);

  // Render collapsed activity bar if collapsed
  if (isCollapsed) {
    return (
      <CollabActivityBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExpand={onToggle}
      />
    );
  }

  return (
    <div className="collab-panel">
      {/* Panel Header with collapse button */}
      <div className="collab-panel__panel-header">
        <div className="collab-panel__panel-title">
          <Users size={18} />
          <span>Collaboration</span>
        </div>
        {onToggle && (
          <button
            className="collab-panel__collapse-btn"
            onClick={onToggle}
            title="Collapse panel"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Tabs for People/Voice/Chat/Activity */}
      <div className="collab-panel__main-tabs">
        <button
          className={`collab-panel__main-tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          <Users size={16} />
          <span>People</span>
        </button>
        <button
          className={`collab-panel__main-tab ${activeTab === 'voice' ? 'active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <Mic size={16} />
          <span>Voice</span>
        </button>
        <button
          className={`collab-panel__main-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Chat</span>
        </button>
        <button
          className={`collab-panel__main-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Bell size={16} />
          <span>Activity</span>
        </button>
      </div>

      {/* Main Content Area - Takes 50% when Quick Access open, 100% when closed */}
      <div className={`collab-panel__main-content ${quickAccessOpen ? 'split' : 'full'}`}>
        {activeTab === 'people' && (
          <div className="collab-panel__tab-content">
            <PeoplePanel />
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="collab-panel__tab-content">
            <VoiceChatPanel roomName={roomName} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="collab-panel__tab-content">
            <TextChatPanel />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="collab-panel__tab-content">
            <div className="collab-panel__activity-placeholder">
              <Bell size={32} color="#808080" />
              <p>No new activity</p>
              <span>Mentions, annotations, and updates will appear here</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Access Section - Takes 50% when open */}
      {quickAccessOpen && (
        <div className="collab-panel__quick-access">
          <div className="collab-panel__quick-access-header">
            <span className="collab-panel__quick-access-title">Quick Settings</span>
            <button
              className="collab-panel__quick-close-btn"
              onClick={() => setQuickAccessOpen(false)}
              title="Close Quick Settings"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="collab-panel__quick-tabs">
            <button
              className={`collab-panel__quick-tab ${quickAccessTab === 'settings' ? 'active' : ''}`}
              onClick={() => setQuickAccessTab('settings')}
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <button
              className={`collab-panel__quick-tab ${quickAccessTab === 'cursors' ? 'active' : ''}`}
              onClick={() => setQuickAccessTab('cursors')}
            >
              {showAllCursors ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Cursors</span>
            </button>
          </div>

          <div className="collab-panel__quick-content">
            {quickAccessTab === 'settings' && (
              <div className="collab-panel__settings">
                <div className="collab-panel__setting-item">
                  <label>
                    <span className="setting-label">Notifications</span>
                    <span className="setting-description">Desktop notifications for mentions and updates</span>
                  </label>
                  <select className="setting-select">
                    <option value="all">All</option>
                    <option value="mentions">Mentions only</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="collab-panel__setting-item">
                  <label>
                    <span className="setting-label">Sound Effects</span>
                    <span className="setting-description">Play sounds for chat and voice events</span>
                  </label>
                  <select className="setting-select">
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>

                <div className="collab-panel__setting-item">
                  <label>
                    <span className="setting-label">Auto-join Voice</span>
                    <span className="setting-description">Automatically join voice when entering a room</span>
                  </label>
                  <select className="setting-select">
                    <option value="never">Never</option>
                    <option value="always">Always</option>
                  </select>
                </div>
              </div>
            )}

            {quickAccessTab === 'cursors' && (
              <div className="collab-panel__cursor-settings">
                <div className="collab-panel__cursor-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showMyCursor}
                      onChange={(e) => setShowMyCursor(e.target.checked)}
                    />
                    <span>Show my cursor to others</span>
                  </label>
                  <span className="toggle-hint">
                    {showMyCursor
                      ? 'Other users can see your cursor'
                      : 'Your cursor is hidden from others'}
                  </span>
                </div>

                <div className="collab-panel__cursor-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showAllCursors}
                      onChange={(e) => setShowAllCursors(e.target.checked)}
                    />
                    <span>Show all cursors</span>
                  </label>
                  <span className="toggle-hint">
                    {showAllCursors
                      ? 'All user cursors are visible'
                      : 'User cursors are hidden'}
                  </span>
                </div>

                <div className="collab-panel__cursor-info">
                  <p>💡 Tip: Press <kbd>Ctrl+H</kbd> to quickly toggle cursor visibility</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Access Toggle Button - Only show when closed */}
      {!quickAccessOpen && (
        <div className="collab-panel__quick-toggle">
          <button
            className="collab-panel__quick-toggle-btn"
            onClick={() => setQuickAccessOpen(true)}
          >
            <ChevronUp size={14} />
            <span>Quick Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}