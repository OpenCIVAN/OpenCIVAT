// src/ui/react/components/workspace/WorkspaceGrid.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";

import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";
import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport.jsx";

import './WorkspaceGrid.scss';

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const gridRef = useRef(null);

    useEffect(() => {
        const handleInstanceRequest = async (event) => {
            const datasetId = event.detail?.datasetId;

            if (!datasetId || typeof datasetId !== 'string') {
                console.error('❌ Invalid dataset ID:', datasetId);
                return;
            }

            try {
                console.log('📬 Creating instance for dataset:', datasetId);

                const dataset = datasetManager.getDataset(datasetId);
                if (!dataset) {
                    console.error('❌ Dataset not found:', datasetId);
                    return;
                }

                const viewConfig = viewConfigurationManager.createView(datasetId, {
                    name: `View of ${dataset.filename}`,
                });

                console.log(`📋 Created view ${viewConfig.id} for dataset ${datasetId}`);

                setInstances((prev) => [...prev, {
                    key: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    viewConfigId: viewConfig.id,
                    type: 'vtk',
                    isRemote: false,
                }]);

            } catch (error) {
                console.error('❌ Failed to create instance:', error);
            }
        };

        window.addEventListener('cia:request-instance', handleInstanceRequest);
        return () => window.removeEventListener('cia:request-instance', handleInstanceRequest);
    }, []);

    const handleCreateEmptyInstance = useCallback(() => {
        if (instances.length >= 9) {
            console.log('⚠️ Grid full - max 9 instances');
            return;
        }

        console.log('➕ Creating empty instance (no view yet)');

        setInstances((prev) => [...prev, {
            key: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            viewConfigId: null,
            type: null,
            isRemote: false,
        }]);
    }, [instances.length]);

    const handleDeleteInstance = useCallback((key) => {
        console.log(`🗑️ Removing instance from grid: ${key}`);
        setInstances((prev) => prev.filter((i) => i.key !== key));
    }, []);

    const getGridStyle = () => {
        const count = instances.length;
        if (count === 0) return { display: "none" };

        let cols = 1, rows = 1;
        if (count === 1) { cols = 1; rows = 1; }
        else if (count === 2) { cols = 2; rows = 1; }
        else if (count <= 4) { cols = 2; rows = 2; }
        else if (count <= 6) { cols = 3; rows = 2; }
        else { cols = 3; rows = 3; }

        return {
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
        };
    };

    return (
        <div className="workspace-grid">
            {/* Toolbar */}
            <div className="workspace-grid__toolbar">
                <span className="workspace-grid__toolbar-title">
                    Workspace ({instances.length} instance{instances.length !== 1 ? "s" : ""})
                    {instances.filter((i) => i.isRemote).length > 0 && (
                        <span className="workspace-grid__toolbar-status">
                            ({instances.filter((i) => i.isRemote).length} remote)
                        </span>
                    )}
                </span>
                <button
                    className="workspace-grid__add-button"
                    onClick={handleCreateEmptyInstance}
                    disabled={instances.length >= 9}
                >
                    <Plus size={16} />
                    Add Instance
                </button>
            </div>

            {/* Empty State or Grid */}
            {instances.length === 0 ? (
                <div className="workspace-grid__empty-state">
                    <div className="workspace-grid__empty-icon">🎨</div>
                    <div className="workspace-grid__empty-title">
                        No visualization windows open
                    </div>
                    <div className="workspace-grid__empty-description">
                        Click a dataset from the Files panel to create a window with that data,
                        or click "Add Instance" above to create an empty window.
                    </div>
                    <button
                        className="workspace-grid__empty-button"
                        onClick={handleCreateEmptyInstance}
                    >
                        <Plus size={18} />
                        Create Instance
                    </button>
                </div>
            ) : (
                <div ref={gridRef} className="workspace-grid__grid" style={getGridStyle()}>
                    {instances.map((instance) => (
                        <InstanceViewport
                            key={instance.key}
                            viewConfigId={instance.viewConfigId}
                            type={instance.type}
                            isRemote={instance.isRemote}
                            remoteInstanceId={instance.remoteId}
                            ownerUserName={instance.userName}
                            onDelete={() => handleDeleteInstance(instance.key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}