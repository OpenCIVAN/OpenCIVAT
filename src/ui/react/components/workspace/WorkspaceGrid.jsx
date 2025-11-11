// src/ui/react/components/workspace/WorkspaceGrid.jsx

import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport.jsx";
import { useCurrentDataset } from "@UI/react/hooks/useCurrentDataset.js";

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const [layout, setLayout] = useState("1x1");
    const gridRef = useRef(null);
    const initialized = useRef(false);

    // Watch for dataset changes to auto-create instance
    const { datasetId } = useCurrentDataset();

    // Initialize workspace manager once
    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            console.log("🎨 WorkspaceGrid mounted");
            workspaceManager.initialize();
        }
    }, []);

    // ✨ FIXED: Only depend on datasetId, not instances.length
    // The instances.length check is INSIDE the effect, not a dependency
    useEffect(() => {
        if (datasetId && instances.length === 0) {
            console.log(`🎨 Auto-creating instance for dataset: ${datasetId}`);
            createNewInstance(datasetId);
        }
    }, [datasetId]); // ← ONLY datasetId in the dependency array

    // Accept datasetId parameter to link instance to dataset
    const createNewInstance = (datasetIdForInstance = null) => {
        const instanceId = `instance-${Date.now()}`;
        const instanceName = `View ${instances.length + 1}`;

        console.log(`✅ Creating instance: ${instanceId}`);
        if (datasetIdForInstance) {
            console.log(`   Linked to dataset: ${datasetIdForInstance}`);
        }

        setInstances(prev => [...prev, {
            id: instanceId,
            name: instanceName,
            datasetId: datasetIdForInstance,
            created: Date.now()
        }]);
    };

    const handleDeleteInstance = (instanceId) => {
        console.log(`🗑️  Deleting instance: ${instanceId}`);
        workspaceManager.deleteInstance(instanceId);
        setInstances(prev => prev.filter(i => i.id !== instanceId));
    };

    const handleDuplicateInstance = (instanceId) => {
        console.log(`📋 Duplicating instance: ${instanceId}`);
        const original = instances.find(i => i.id === instanceId);
        createNewInstance(original?.datasetId || null);
    };

    const getGridStyle = () => {
        const cols = layout === "2x1" ? 2 : 1;
        return {
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "16px",
            flex: 1,
            padding: "16px",
            backgroundColor: "#0a0a0a"
        };
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: "#0f0f0f"
        }}>
            {/* Toolbar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: "#1a1a1a",
                borderBottom: "1px solid #2a2a2a"
            }}>
                <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                    Workspace ({instances.length}/4 instances)
                </span>
                <button
                    onClick={() => createNewInstance(datasetId)}
                    disabled={instances.length >= 4}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        backgroundColor: instances.length >= 4 ? "#2a2a2a" : "#3a5a3a",
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
                    <div style={{ fontSize: "48px", opacity: 0.3 }}>🎨</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#888" }}>
                        No visualization windows open
                    </div>
                    <div style={{
                        fontSize: "13px",
                        color: "#666",
                        textAlign: "center",
                        maxWidth: "400px",
                        lineHeight: 1.5
                    }}>
                        Load a dataset from the Files panel to automatically create a window,
                        or click "Add Instance" to create one manually.
                    </div>
                    <button
                        onClick={() => createNewInstance(datasetId)}
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
                            datasetId={instance.datasetId}
                            onDelete={() => handleDeleteInstance(instance.id)}
                            onDuplicate={() => handleDuplicateInstance(instance.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}