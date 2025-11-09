// src/ui/react/components/workspace/InstanceToolbar.jsx
// Instance-specific tools that appear in each viewport

import React from "react";
import {
    Filter,
    Ruler,
    Wand2,
    Camera,
    Eye,
    Sliders
} from "lucide-react";

const INSTANCE_TOOLS = [
    {
        id: "filter",
        label: "Filter",
        icon: Filter,
        description: "Filter data points"
    },
    {
        id: "measure",
        label: "Measure",
        icon: Ruler,
        description: "Measurement tools"
    },
    {
        id: "transform",
        label: "Transform",
        icon: Wand2,
        description: "Apply transformations"
    },
    {
        id: "camera",
        label: "Camera",
        icon: Camera,
        description: "Camera controls"
    },
    {
        id: "visibility",
        label: "Display",
        icon: Eye,
        description: "Visibility and rendering"
    },
    {
        id: "properties",
        label: "Properties",
        icon: Sliders,
        description: "Instance properties"
    }
];

export function InstanceToolbar({ instanceId, activeInstanceTool, onToolSelect }) {
    return (
        <div className="instance-toolbar">
            {INSTANCE_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeInstanceTool === tool.id;

                return (
                    <button
                        key={tool.id}
                        className={`instance-tool-button ${isActive ? "active" : ""}`}
                        onClick={() => onToolSelect(tool.id)}
                        title={tool.description}
                    >
                        <Icon size={18} />
                    </button>
                );
            })}

            <style jsx>{`
        .instance-toolbar {
          display: flex;
          gap: 2px;
          padding: 4px;
          background: #1a1a1a;
          border-bottom: 1px solid #2a2a2a;
        }

        .instance-tool-button {
          padding: 6px 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .instance-tool-button:hover {
          background: #2a2a2a;
          color: #e0e0e0;
          border-color: #3a3a3a;
        }

        .instance-tool-button.active {
          background: #2a3a2a;
          color: #4CAF50;
          border-color: #4CAF50;
        }
      `}</style>
        </div>
    );
}