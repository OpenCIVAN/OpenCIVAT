// src/ui/react/components/workspace/InstanceViewport.jsx
// A single VTK visualization instance

import React, { useRef, useEffect, useState } from "react";

import { workspaceManager } from "@Core/instances/workspaceManager.js";

export function InstanceViewport({ instanceId, instanceName, onDelete, onDuplicate }) {
    const containerRef = useRef(null);
    const [initialized, setInitialized] = useState(false);
    const initOnce = useRef(false);

    useEffect(() => {
        if (containerRef.current && !initOnce.current) {
            initOnce.current = true;

            console.log(`🎨 Initializing instance viewport: ${instanceId}`);

            try {
                // Create the instance in the workspace manager
                workspaceManager.createInstance(containerRef.current, {
                    instanceId: instanceId
                });

                setInitialized(true);
                console.log(`✅ Instance viewport initialized: ${instanceId}`);

            } catch (error) {
                console.error(`❌ Failed to initialize instance viewport:`, error);
            }
        }

        return () => {
            // Cleanup handled by WorkspaceGrid when instance is deleted
        };
    }, [instanceId]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0f0f0f",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            overflow: "hidden"
        }}>
            {/* Instance Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                backgroundColor: "#1a1a1a",
                borderBottom: "1px solid #2a2a2a"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                        width: "8px",
                        height: "8px",
                        background: initialized ? "#0f0" : "#666",
                        borderRadius: "50%"
                    }} />
                    <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                        {instanceName}
                    </span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                    <button
                        onClick={onDuplicate}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: "#2a2a2a",
                            border: "1px solid #3a3a3a",
                            borderRadius: "4px",
                            color: "#ccc",
                            fontSize: "12px",
                            cursor: "pointer"
                        }}
                    >
                        Duplicate
                    </button>
                    <button
                        onClick={onDelete}
                        style={{
                            padding: "6px 12px",
                            backgroundColor: "#3a1a1a",
                            border: "1px solid #4a2a2a",
                            borderRadius: "4px",
                            color: "#f88",
                            fontSize: "12px",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* VTK Container */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: "relative",
                    backgroundColor: "#0a0a0a"
                }}
            >
                {!initialized && (
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "#666",
                        fontSize: "12px"
                    }}>
                        Initializing VTK...
                    </div>
                )}
            </div>
        </div>
    );
}