// src/ui/react/components/toolbars/LeftToolbar.jsx
// Redesigned for multi-instance architecture

import React from "react";
import {
  FolderOpen,
  Layout,
  Save,
  Star,
  Search,
  Settings,
  HelpCircle
} from "lucide-react";

const GLOBAL_TOOLS = [
  {
    id: "files",
    label: "Files",
    icon: FolderOpen,
    description: "Manage datasets and project files"
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Layout,
    description: "Layout and window management"
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    description: "Search across all data and annotations"
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: Star,
    description: "Saved views and configurations"
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Application preferences"
  },
  {
    id: "help",
    label: "Help",
    icon: HelpCircle,
    description: "Documentation and tutorials"
  }
];

export function LeftToolbar({ activeTool, onToolSelect }) {
  return (
    <div className="left-toolbar">
      {GLOBAL_TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            className={`tool-button ${isActive ? "active" : ""}`}
            onClick={() => onToolSelect(tool.id)}
            title={tool.description}
            aria-label={tool.label}
          >
            <Icon size={24} />
            <span className="tool-label">{tool.label}</span>
          </button>
        );
      })}

      <style jsx>{`
        .left-toolbar {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 8px;
          background: #1a1a1a;
          border-right: 1px solid #2a2a2a;
        }

        .tool-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }

        .tool-button:hover {
          background: #2a2a2a;
          color: #e0e0e0;
          border-color: #3a3a3a;
        }

        .tool-button.active {
          background: #2a3a2a;
          color: #4CAF50;
          border-color: #4CAF50;
        }

        .tool-label {
          font-size: 11px;
          font-weight: 500;
          text-align: center;
        }
      `}</style>
    </div>
  );
}