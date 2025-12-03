// src/ui/react/components/collaboration/ActivityPanel/ActivityPanel.jsx
// Activity feed showing notifications, mentions, and audit events

import React, { useState, useMemo } from "react";
import {
  Bell,
  AtSign,
  MapPin,
  Video,
  Users,
  Upload,
  Share2,
  MessageSquare,
  Filter,
  Search,
  X,
  ChevronRight,
  Check,
  Eye,
  ExternalLink
} from "lucide-react";

import { useActivityFeed } from "./useActivityFeed.js";
import { UserAvatar } from "../PeoplePanel/UserAvatar.jsx";

import "./ActivityPanel.scss";

// =============================================================================
// ACTIVITY TYPE CONFIGURATIONS
// =============================================================================

const ACTIVITY_TYPES = {
  mention: { 
    icon: AtSign, 
    color: "var(--accent-blue)", 
    label: "Mention" 
  },
  annotation: { 
    icon: MapPin, 
    color: "var(--accent-purple)", 
    label: "Annotation" 
  },
  recording: { 
    icon: Video, 
    color: "var(--accent-pink)", 
    label: "Recording" 
  },
  user_joined: { 
    icon: Users, 
    color: "var(--accent-green)", 
    label: "User Joined" 
  },
  user_left: { 
    icon: Users, 
    color: "var(--text-tertiary)", 
    label: "User Left" 
  },
  dataset_uploaded: { 
    icon: Upload, 
    color: "var(--accent-teal)", 
    label: "Dataset" 
  },
  view_shared: { 
    icon: Share2, 
    color: "var(--accent-amber)", 
    label: "View Shared" 
  },
  message: { 
    icon: MessageSquare, 
    color: "var(--text-secondary)", 
    label: "Message" 
  },
  system: { 
    icon: Bell, 
    color: "var(--text-tertiary)", 
    label: "System" 
  },
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "annotations", label: "Annotations" },
  { id: "recordings", label: "Recordings" },
  { id: "system", label: "System" },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ActivityPanel() {
  // ---------------------------------------------------------------------------
  // STATE & HOOKS
  // ---------------------------------------------------------------------------

  const {
    activities,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearActivity,
  } = useActivityFeed();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ---------------------------------------------------------------------------
  // FILTERING
  // ---------------------------------------------------------------------------

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply type filter
    if (activeFilter !== "all") {
      const filterMap = {
        mentions: ["mention"],
        annotations: ["annotation"],
        recordings: ["recording"],
        system: ["user_joined", "user_left", "system"],
      };
      const allowedTypes = filterMap[activeFilter] || [];
      filtered = filtered.filter(a => allowedTypes.includes(a.type));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.userName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, activeFilter, searchQuery]);

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups = {};
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now - 86400000).toDateString();

    filteredActivities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateStr = date.toDateString();
      
      let groupLabel;
      if (dateStr === today) groupLabel = "Today";
      else if (dateStr === yesterday) groupLabel = "Yesterday";
      else groupLabel = date.toLocaleDateString(undefined, { 
        weekday: "long", 
        month: "short", 
        day: "numeric" 
      });

      if (!groups[groupLabel]) groups[groupLabel] = [];
      groups[groupLabel].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  const renderActivityItem = (activity) => {
    const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.system;
    const IconComponent = config.icon;

    return (
      <div 
        key={activity.id}
        className={`activity-panel__item ${activity.isRead ? "" : "activity-panel__item--unread"}`}
        onClick={() => markAsRead(activity.id)}
      >
        {/* Icon */}
        <div 
          className="activity-panel__item-icon"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          <IconComponent size={16} />
        </div>

        {/* Content */}
        <div className="activity-panel__item-content">
          <div className="activity-panel__item-header">
            <span className="activity-panel__item-title">{activity.title}</span>
            <span className="activity-panel__item-time">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
          
          {activity.description && (
            <p className="activity-panel__item-description">
              {activity.description}
            </p>
          )}

          {activity.context && (
            <div className="activity-panel__item-context">
              {activity.context.userName && (
                <UserAvatar 
                  userName={activity.context.userName} 
                  color={activity.context.userColor}
                  size="xs"
                />
              )}
              <span>{activity.context.text}</span>
            </div>
          )}

          {/* Actions */}
          {activity.actions && activity.actions.length > 0 && (
            <div className="activity-panel__item-actions">
              {activity.actions.map((action, idx) => (
                <button
                  key={idx}
                  className="activity-panel__action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick?.();
                  }}
                >
                  {action.icon && <action.icon size={12} />}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {!activity.isRead && (
          <div className="activity-panel__unread-dot" />
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="activity-panel">
      {/* Header with filters */}
      <div className="activity-panel__header">
        <div className="activity-panel__filters">
          {FILTER_OPTIONS.map(filter => (
            <button
              key={filter.id}
              className={`activity-panel__filter ${activeFilter === filter.id ? "active" : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
              {filter.id === "all" && unreadCount > 0 && (
                <span className="activity-panel__badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button 
            className="activity-panel__mark-read"
            onClick={markAllAsRead}
          >
            <Check size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Search */}
      <div className="activity-panel__search">
        <Search size={14} className="activity-panel__search-icon" />
        <input
          type="text"
          placeholder="Search activity..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="activity-panel__search-input"
        />
        {searchQuery && (
          <button 
            className="activity-panel__search-clear"
            onClick={() => setSearchQuery("")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Activity list */}
      <div className="activity-panel__content">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="activity-panel__empty">
            <Bell size={32} strokeWidth={1.5} />
            <p>No activity yet</p>
            <span>Mentions, annotations, and updates will appear here</span>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([dateLabel, items]) => (
            <div key={dateLabel} className="activity-panel__group">
              <div className="activity-panel__group-header">
                {dateLabel}
              </div>
              <div className="activity-panel__group-items">
                {items.map(activity => renderActivityItem(activity))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export default ActivityPanel;