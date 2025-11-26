// src/ui/react/components/workspace/WorkspaceGrid.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";

import { generateGridSlotId } from "@Utils/idGenerator.js";
import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";
import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport";

import './WorkspaceGrid.scss';

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const gridRef = useRef(null);

    // Track highlighted instance for visual feedback
    const [highlightedInstanceKey, setHighlightedInstanceKey] = useState(null);

    // Listen for dataset click events
    useEffect(() => {
        const handleInstanceRequest = async (event) => {
            const datasetId = event.detail?.datasetId;
            const viewConfigId = event.detail?.viewConfigId;
            const spawnNew = event.detail?.spawnNew;
            const duplicateViewId = event.detail?.duplicateViewId;

            if (!datasetId || typeof datasetId !== 'string') {
                console.error('❌ Invalid dataset ID:', datasetId);
                return;
            }

            try {
                const dataset = datasetManager.getDataset(datasetId);
                if (!dataset) {
                    console.error('❌ Dataset not found:', datasetId);
                    return;
                }

                // Check if we should reuse an existing instance

                if (viewConfigId && !spawnNew) {
                    // Find existing instance with this view
                    const existingInstance = instances.find(inst => inst.viewConfigId === viewConfigId);
                    if (existingInstance) {
                        console.log(`✨ Highlighting existing instance for view ${viewConfigId}`);
                        // Highlight the instance
                        setHighlightedInstanceKey(existingInstance.key);

                        // Scroll to it if needed
                        setTimeout(() => {
                            const element = document.querySelector(`[data-instance-key="${existingInstance.key}"]`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }, 100);

                        // Remove highlight after animation
                        setTimeout(() => setHighlightedInstanceKey(null), 2000);

                        return; // Don't create a new instance
                    }
                }

                // Check if there's already an active view for this dataset
                let viewConfig = null;
                if (viewConfigId) {
                    // Use existing view
                    viewConfig = viewConfigurationManager.getView(viewConfigId);
                    if (!viewConfig) {
                        console.error(`❌ View ${viewConfigId} not found`);
                        return;
                    }
                    console.log(`📋 Using existing view ${viewConfigId}`);
                } else if (duplicateViewId) {
                    // Duplicate an existing view
                    const sourceView = viewConfigurationManager.getView(duplicateViewId);
                    if (!sourceView) {
                        console.error(`❌ Source view ${duplicateViewId} not found for duplication`);
                        return;
                    }
                    viewConfig = viewConfigurationManager.duplicateView(duplicateViewId);
                    console.log(`📋 Duplicated view ${duplicateViewId} to ${viewConfig.id}`);
                } else {
                    // Create new view
                    viewConfig = viewConfigurationManager.createView(datasetId, {
                        name: `View of ${dataset.filename}`,
                    });
                    console.log(`📋 Created new view ${viewConfig.id} for dataset ${datasetId}`);
                }
                // Add instance with the view (type will be determined when data loads)
                setInstances((prev) => [...prev, {
                    key: generateGridSlotId(),
                    viewConfigId: viewConfig.id,
                    isRemote: false,
                }]);

            } catch (error) {
                console.error('❌ Failed to create instance:', error);
            }
        };



        window.addEventListener('cia:request-instance', handleInstanceRequest);

        return () => window.removeEventListener('cia:request-instance', handleInstanceRequest);

    }, [instances]);

    // Listen for view deletion events to close corresponding instances
    useEffect(() => {
        const handleViewDeletion = (event) => {
            const viewConfigId = event.detail?.viewConfigId;

            if (!viewConfigId) {
                console.error('❌ Invalid viewConfigId for deletion');
                return;
            }

            // Find and remove instances with this viewConfigId
            const instancesToRemove = instances.filter(inst => inst.viewConfigId === viewConfigId);

            if (instancesToRemove.length > 0) {
                console.log(`🗑️ Closing ${instancesToRemove.length} instance(s) for deleted view ${viewConfigId}`);
                setInstances((prev) => prev.filter((instance) => instance.viewConfigId !== viewConfigId));
            }
        };

        window.addEventListener('cia:delete-view-instance', handleViewDeletion);
        return () => window.removeEventListener('cia:delete-view-instance', handleViewDeletion);
    }, [instances]);

    // Create empty instance button handler
    const handleCreateEmptyInstance = useCallback(() => {
        if (instances.length >= 9) {
            console.log('⚠️ Grid full - max 9 instances');
            return;
        }

        console.log('➕ Creating empty instance (no type, no view)');

        setInstances((prev) => [...prev, {
            key: generateGridSlotId(),
            viewConfigId: null,
            isRemote: false,
        }]);
    }, [instances.length]);

    // Delete instance handler
    const handleDeleteInstance = useCallback((instanceKey, viewConfigId) => {
        console.log(`🗑️ Deleting instance: ${instanceKey}`);

        // Deactivate the view before removing the instance
        if (viewConfigId) {
            try {
                viewConfigurationManager.deactivateView(viewConfigId);
                console.log(`📉 View ${viewConfigId} deactivated (moved to inactive)`);
            } catch (error) {
                console.error(`Failed to deactivate view ${viewConfigId}:`, error);
            }
        }
        setInstances((prev) => prev.filter((instance) => instance.key !== instanceKey));
    }, []);

    // Get CSS class for grid layout based on instance count
    const getGridLayoutClass = () => {
        const count = instances.length;
        if (count === 0) return '';
        if (count === 1) return 'grid-layout-1';
        if (count === 2) return 'grid-layout-2';
        if (count <= 4) return 'grid-layout-4';
        if (count <= 6) return 'grid-layout-6';
        return 'grid-layout-9';
    };

    // Get CSS class for bento cell span
    const getSpanClass = (span) => {
        const spanClasses = {
            '1x1': '',
            '2x1': 'grid-span-col-2',   // Wide
            '1x2': 'grid-span-row-2',   // Tall
            '2x2': 'grid-span-2x2',     // Large square
        };
        return spanClasses[span] || '';
    };

    // Change instance span size
    const handleChangeSpan = useCallback((instanceKey, newSpan) => {
        setInstances((prev) => prev.map((instance) =>
            instance.key === instanceKey
                ? { ...instance, span: newSpan }
                : instance
        ));
    }, []);

    return (
        <div className="workspace-grid">
            {/* Header with Add Instance button */}
            <div className="workspace-grid__header">
                <div className="workspace-grid__title">
                    <span>Workspace</span>
                    <span className="workspace-grid__count">({instances.length})</span>
                </div>
                <button
                    className="workspace-grid__add-button"
                    onClick={handleCreateEmptyInstance}
                    disabled={instances.length >= 9}
                    title="Add empty instance"
                >
                    <Plus size={18} />
                    Add Instance
                </button>
            </div>

            {/* Empty state or grid */}
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
                <div ref={gridRef} className={`workspace-grid__grid ${getGridLayoutClass()}`}>
                    {instances.map((instance) => (
                        <div
                            key={instance.key}
                            data-instance-key={instance.key}
                            className={`${highlightedInstanceKey === instance.key ? 'instance-highlight' : ''} ${getSpanClass(instance.span)}`}
                        >
                            <InstanceViewport
                                viewConfigId={instance.viewConfigId}
                                isRemote={instance.isRemote}
                                remoteInstanceId={instance.remoteInstanceId}
                                ownerUserName={instance.ownerUserName}
                                onDelete={() => handleDeleteInstance(instance.key, instance.viewConfigId)}
                                onChangeSpan={(newSpan) => handleChangeSpan(instance.key, newSpan)}
                                currentSpan={instance.span || '1x1'}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}