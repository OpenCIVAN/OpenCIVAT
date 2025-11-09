// src/ui/react/components/workspace/WorkspaceGrid.jsx
// Grid layout for multiple VTK instances

import React, { useState, useEffect, useRef } from "react";

import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport.jsx";
import { workspaceManager } from "@Core/instances/workspaceManager.js";

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const [layout, setLayout] = useState("1x1");
    const gridRef = useRef(null);

    // Create initial instance when component mounts
    useEffect(() => {
        console.log("🎨 WorkspaceGrid mounted, creating initial instance");
        createNewInstance();
    }, []);

    const createNewInstance = () => {
        const instanceId = `instance-${Date.now()}`;

        setInstances(prev => [...prev, {
            id: instanceId,
            name: `View ${instances.length + 1}`,
            created: Date.now()
        }]);

        console.log(`✅ Instance added to state: ${instanceId}`);
    };

    const handleDeleteInstance = (instanceId) => {
        workspaceManager.deleteInstance(instanceId);
        setInstances(prev => prev.filter(i => i.id !== instanceId));
    };

    const handleDuplicateInstance = (instanceId) => {
        // For now, just create a new instance
        // Later we'll implement true duplication
        createNewInstance();
    };

    const getGridStyle = () => {
        const [cols, rows] = layout.split("x").map(Number);
        return {
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: "8px",
            width: "100%",
            height: "100%",
            padding: "8px",
            backgroundColor: "#0a0a0a"
        };
    };

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Workspace Toolbar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: "#1a1a1a",
                borderBottom: "1px solid #2a2a2a"
            }}>
                <span style={{ color: "#888", fontSize: "13px" }}>Layout:</span>
                <button
                    onClick={() => setLayout("1x1")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: layout === "1x1" ? "#2a4a4a" : "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "4px",
                        color: layout === "1x1" ? "#5af" : "#ccc",
                        cursor: "pointer"
                    }}
                >
                    1×1
                </button>
                <button
                    onClick={() => setLayout("2x2")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: layout === "2x2" ? "#2a4a4a" : "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "4px",
                        color: layout === "2x2" ? "#5af" : "#ccc",
                        cursor: "pointer"
                    }}
                >
                    2×2
                </button>

                <div style={{ flex: 1 }} />

                <button
                    onClick={createNewInstance}
                    disabled={instances.length >= 4}
                    style={{
                        padding: "6px 16px",
                        backgroundColor: "#c98910",
                        border: "none",
                        borderRadius: "4px",
                        color: "#fff",
                        cursor: instances.length >= 4 ? "not-allowed" : "pointer",
                        opacity: instances.length >= 4 ? 0.5 : 1
                    }}
                >
                    + Add Instance
                </button>
            </div>

            {/* Instance Grid */}
            <div ref={gridRef} style={getGridStyle()}>
                {instances.map(instance => (
                    <InstanceViewport
                        key={instance.id}
                        instanceId={instance.id}
                        instanceName={instance.name}
                        onDelete={() => handleDeleteInstance(instance.id)}
                        onDuplicate={() => handleDuplicateInstance(instance.id)}
                    />
                ))}
            </div>
        </div>
    );
}