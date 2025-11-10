// src/ui/react/components/workspace/WorkspaceGrid.jsx
// Grid layout for multiple VTK instances
// Instances are created ONLY when:
// 1. User explicitly clicks "Add Instance"
// 2. Loading a saved session with open windows (future)
// 3. Joining a room where others have shared windows (future)

import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport.jsx";
import { workspaceManager } from "@Core/instances/workspaceManager.js";

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const [layout, setLayout] = useState("1x1");
    const gridRef = useRef(null);
    const initialized = useRef(false);

    // Initialize workspace manager once
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            console.log("🎨 WorkspaceGrid mounted");
            workspaceManager.initialize();

            // DO NOT auto-create instances here!
            // Instances should only be created when:
            // 1. User clicks "Add Instance" button
            // 2. Loading a saved session (future implementation)
            // 3. Joining a room with shared windows (future implementation)
        }
    }, []);

    const createNewInstance = () => {
        const instanceId = `instance-${Date.now()}`;
        const instanceName = `View ${instances.length + 1}`;

        console.log(`✅ User creating new instance: ${instanceId}`);

        setInstances(prev => [...prev, {
            id: instanceId,
            name: instanceName,
            created: Date.now()
        }]);
    };

    const handleDeleteInstance = (instanceId) => {
        console.log(`🗑️  User deleting instance: ${instanceId}`);

        // Clean up in workspace manager
        workspaceManager.deleteInstance(instanceId);

        // Remove from state
        setInstances(prev => prev.filter(i => i.id !== instanceId));
    };

    const handleDuplicateInstance = (instanceId) => {
        console.log(`📋 User duplicating instance: ${instanceId}`);

        // For now, just create a new instance
        // Later we'll implement true duplication with camera/filters copied
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
        <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
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
                        cursor: "pointer",
                        fontSize: "12px"
                    }}
                >
                    1×1
                </button>

                <button
                    onClick={() => setLayout("2x1")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: layout === "2x1" ? "#2a4a4a" : "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "4px",
                        color: layout === "2x1" ? "#5af" : "#ccc",
                        cursor: "pointer",
                        fontSize: "12px"
                    }}
                >
                    2×1
                </button>

                <button
                    onClick={() => setLayout("2x2")}
                    style={{
                        padding: "6px 12px",
                        backgroundColor: layout === "2x2" ? "#2a4a4a" : "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "4px",
                        color: layout === "2x2" ? "#5af" : "#ccc",
                        cursor: "pointer",
                        fontSize: "12px"
                    }}
                >
                    2×2
                </button>

                <div style={{ flex: 1 }} />

                <button
                    onClick={createNewInstance}
                    disabled={instances.length >= 4}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        backgroundColor: instances.length >= 4 ? "#2a2a2a" : "#c98910",
                        border: "none",
                        borderRadius: "4px",
                        color: instances.length >= 4 ? "#666" : "#fff",
                        cursor: instances.length >= 4 ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "all 0.2s"
                    }}
                >
                    <Plus size={16} />
                    Add Instance
                </button>
            </div>

            {/* Instance Grid or Empty State */}
            {instances.length === 0 ? (
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0a0a0a",
                    color: "#666",
                    gap: "16px",
                    padding: "40px"
                }}>
                    <div style={{
                        fontSize: "48px",
                        opacity: 0.3
                    }}>
                        🎨
                    </div>
                    <div style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#888"
                    }}>
                        No visualization windows open
                    </div>
                    <div style={{
                        fontSize: "13px",
                        color: "#666",
                        textAlign: "center",
                        maxWidth: "400px",
                        lineHeight: 1.5
                    }}>
                        Click "Add Instance" to create a visualization window, or load a dataset
                        from the Files panel to automatically create one.
                    </div>
                    <button
                        onClick={createNewInstance}
                        style={{
                            marginTop: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 20px",
                            backgroundColor: "#c98910",
                            border: "none",
                            borderRadius: "6px",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600,
                            transition: "all 0.2s"
                        }}
                    >
                        <Plus size={18} />
                        Create First Instance
                    </button>
                </div>
            ) : (
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
            )}
        </div>
    );
}