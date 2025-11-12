// src/ui/react/components/workspace/WorkspaceGrid.jsx
// Simplified grid that uses instanceManager for all operations
// Includes notification system for remote instances

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Users, X } from "lucide-react";

import { instanceManager } from "@Core/instances/instanceManager.js";
import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport.jsx";

export function WorkspaceGrid() {
    // Local state for viewports to render
    const [instances, setInstances] = useState([]);

    // Notification state for remote instances
    const [pendingRemoteInstances, setPendingRemoteInstances] = useState([]);
    const [showNotification, setShowNotification] = useState(false);

    const gridRef = useRef(null);
    const initialized = useRef(false);

    // CRITICAL: Memoize this function so it doesn't change on every render
    const handleCreateInstance = useCallback((datasetIdForInstance = null) => {
        const instanceId = `temp-${Date.now()}`;

        console.log(`✅ Creating instance via instanceManager`);
        if (datasetIdForInstance) {
            console.log(`   Dataset: ${datasetIdForInstance}`);
        }

        setInstances((prev) => [...prev, {
            id: instanceId,
            datasetId: datasetIdForInstance,
            isRemote: false,
            created: Date.now(),
        }]);
    }, []); // Empty deps - this function never changes

    // Initialize instance manager once
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            console.log("🎨 WorkspaceGrid: Initializing...");

            instanceManager.initialize();

            const cleanup = instanceManager.onRemoteInstanceChange((event) => {
                if (event.action === "add") {
                    console.log(`📬 Notification: Remote instance available`);
                    setPendingRemoteInstances((prev) => [...prev, {
                        instanceId: event.instanceId,
                        userName: event.instance.userName,
                        datasetId: event.instance.datasetId,
                    }]);
                    setShowNotification(true);
                }

                if (event.action === "delete") {
                    setInstances((prev) => prev.filter((i) => i.id !== event.instanceId));
                    setPendingRemoteInstances((prev) =>
                        prev.filter((p) => p.instanceId !== event.instanceId)
                    );
                }
            });

            console.log("✅ WorkspaceGrid initialized");
            return cleanup;
        }
    }, []); // Empty deps - run exactly once

    // Listen for dataset selection requests from FilesPanel
    useEffect(() => {
        const handleInstanceRequest = (event) => {
            const { datasetId } = event.detail;
            console.log(`📬 Instance request received for dataset: ${datasetId}`);
            handleCreateInstance(datasetId);
        };

        window.addEventListener('cia:request-instance', handleInstanceRequest);

        return () => {
            window.removeEventListener('cia:request-instance', handleInstanceRequest);
        };
    }, [handleCreateInstance]); // Now safe to include because it's memoized

    /**
     * Accept pending remote instances and spawn them
     */
    const handleAcceptRemoteInstances = () => {
        console.log(
            `✅ Accepting ${pendingRemoteInstances.length} remote instances`
        );

        pendingRemoteInstances.forEach((remote) => {
            setInstances((prev) => [
                ...prev,
                {
                    id: remote.instanceId,
                    datasetId: remote.datasetId,
                    isRemote: true,
                    userName: remote.userName,
                    created: Date.now(),
                },
            ]);
        });

        // Clear pending and hide notification
        setPendingRemoteInstances([]);
        setShowNotification(false);
    };

    /**
     * Dismiss remote instance notification
     */
    const handleDismissNotification = () => {
        console.log(`⭐️ Dismissed remote instance notification`);
        setPendingRemoteInstances([]);
        setShowNotification(false);
    };

    /**
     * Delete an instance
     */
    const handleDeleteInstance = (instanceId) => {
        console.log(`🗑️ Deleting instance: ${instanceId}`);

        // Use instanceManager to handle all cleanup
        instanceManager.deleteInstance(instanceId);

        // Remove from grid
        setInstances((prev) => prev.filter((i) => i.id !== instanceId));
    };

    /**
     * Calculate grid layout based on instance count
     * Supports up to 9 instances in a 3x3 grid
     */
    const getGridStyle = () => {
        const count = instances.length;
        let cols = 1;
        let rows = 1;

        if (count === 0) {
            return { display: "none" };
        } else if (count === 1) {
            cols = 1;
            rows = 1;
        } else if (count === 2) {
            cols = 2;
            rows = 1;
        } else if (count <= 4) {
            cols = 2;
            rows = 2;
        } else if (count <= 6) {
            cols = 3;
            rows = 2;
        } else {
            cols = 3;
            rows = 3;
        }

        return {
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: "12px",
            padding: "12px",
            height: "100%",
            overflow: "auto",
        };
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
            }}
        >
            {/* Remote Instance Notification */}
            {showNotification && pendingRemoteInstances.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        minWidth: "400px",
                        background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
                        border: "2px solid #4CAF50",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                        animation: "slideDown 0.3s ease-out",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Users size={20} color="#4CAF50" />
                            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
                                Shared Views Available
                            </h3>
                        </div>
                        <button
                            onClick={handleDismissNotification}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#999",
                                cursor: "pointer",
                                padding: "4px",
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div
                        style={{ marginBottom: "16px", color: "#ccc", fontSize: "14px" }}
                    >
                        {pendingRemoteInstances.map((remote, idx) => (
                            <div key={idx} style={{ marginBottom: "4px" }}>
                                • <strong>{remote.userName}</strong> is sharing{" "}
                                {remote.datasetId ? "a view" : "an empty view"}
                            </div>
                        ))}
                    </div>

                    <div
                        style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
                    >
                        <button
                            onClick={handleDismissNotification}
                            style={{
                                padding: "8px 16px",
                                background: "#3a3a3a",
                                border: "1px solid #555",
                                borderRadius: "6px",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "14px",
                            }}
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleAcceptRemoteInstances}
                            style={{
                                padding: "8px 16px",
                                background: "#4CAF50",
                                border: "none",
                                borderRadius: "6px",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 600,
                            }}
                        >
                            Open Views Now
                        </button>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#1a1a1a",
                    borderBottom: "1px solid #2a2a2a",
                    flexShrink: 0,
                }}
            >
                <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                    Workspace ({instances.length} instance
                    {instances.length !== 1 ? "s" : ""})
                    {instances.filter((i) => i.isRemote).length > 0 && (
                        <span
                            style={{ color: "#4CAF50", marginLeft: "8px", fontSize: "12px" }}
                        >
                            ({instances.filter((i) => i.isRemote).length} remote)
                        </span>
                    )}
                    {pendingRemoteInstances.length > 0 && (
                        <span
                            style={{
                                color: "#FFA726",
                                marginLeft: "8px",
                                fontSize: "12px",
                                animation: "pulse 2s infinite",
                            }}
                        >
                            ({pendingRemoteInstances.length} pending)
                        </span>
                    )}
                </span>
                <button
                    onClick={() => handleCreateInstance(null)}
                    disabled={instances.length >= 9}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        backgroundColor: instances.length >= 9 ? "#2a2a2a" : "#3a5a3a",
                        border: "none",
                        borderRadius: "4px",
                        color: instances.length >= 9 ? "#666" : "#fff",
                        cursor: instances.length >= 9 ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "all 0.2s",
                    }}
                >
                    <Plus size={16} />
                    Add Instance
                </button>
            </div>

            {/* Instance Grid or Empty State */}
            {instances.length === 0 ? (
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#0a0a0a",
                        color: "#666",
                        gap: "16px",
                        padding: "40px",
                    }}
                >
                    <div style={{ fontSize: "48px", opacity: 0.3 }}>🎨</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#888" }}>
                        No visualization windows open
                    </div>
                    <div
                        style={{
                            fontSize: "13px",
                            color: "#666",
                            textAlign: "center",
                            maxWidth: "400px",
                            lineHeight: 1.5,
                        }}
                    >
                        Click a dataset from the Files panel to create a window with that data,
                        or click "Add Instance" below to create an empty window.
                    </div>
                    <button
                        onClick={() => handleCreateInstance(null)}
                        style={{
                            marginTop: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 20px",
                            backgroundColor: "#3a5a3a",
                            border: "none",
                            borderRadius: "6px",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600,
                            transition: "all 0.2s",
                        }}
                    >
                        <Plus size={18} />
                        Create Instance
                    </button>
                </div>
            ) : (
                <div ref={gridRef} style={getGridStyle()}>
                    {instances.map((instance) => (
                        <InstanceViewport
                            key={instance.id}
                            instanceId={instance.id}
                            datasetId={instance.datasetId}
                            isRemote={instance.isRemote}
                            ownerUserName={instance.userName}
                            onDelete={() => handleDeleteInstance(instance.id)}
                        />
                    ))}
                </div>
            )}

            {/* Keyframe animations */}
            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}