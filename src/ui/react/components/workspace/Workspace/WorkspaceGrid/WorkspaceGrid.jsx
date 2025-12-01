// src/ui/react/components/workspace/WorkspaceGrid.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Layers } from "lucide-react";

import { generateGridSlotId } from "@Utils/idGenerator.js";
import { viewConfigurationManager, datasetManager } from "@Init/appInitializer.js";
import { InstanceViewport } from "@UI/react/components/workspace/InstanceViewport";
import { workspace as log } from "@Utils/logger.js";

import './WorkspaceGrid.scss';

export function WorkspaceGrid() {
    const [instances, setInstances] = useState([]);
    const gridRef = useRef(null);

    // Track highlighted instance for visual feedback
    const [highlightedInstanceKey, setHighlightedInstanceKey] = useState(null);

    // Listen for dataset click events
    // Note: DatasetsTab dispatches 'cia:request-instance' with viewId property
    useEffect(() => {
        const handleInstanceRequest = async (event) => {
            const datasetId = event.detail?.datasetId;
            // Support both viewConfigId and viewId (for compatibility with DatasetsTab)
            const viewConfigId = event.detail?.viewConfigId || event.detail?.viewId;
            const spawnNew = event.detail?.spawnNew;
            const duplicateViewId = event.detail?.duplicateViewId;

            log.debug('Instance request received:', { datasetId, viewConfigId, spawnNew });

            if (!datasetId || typeof datasetId !== 'string') {
                log.error('Invalid dataset ID:', datasetId);
                return;
            }

            try {
                const dataset = datasetManager.getDataset(datasetId);
                if (!dataset) {
                    log.error('Dataset not found:', datasetId);
                    return;
                }

                // Check if this is a placeholder view (needs real view creation)
                const isPlaceholder = viewConfigId && viewConfigId.startsWith('placeholder-');

                // Check if we should reuse an existing instance (not for placeholders)
                if (viewConfigId && !isPlaceholder && !spawnNew) {
                    // Find existing instance with this view
                    const existingInstance = instances.find(inst => inst.viewConfigId === viewConfigId);
                    if (existingInstance) {
                        log.debug(`Highlighting existing instance for view ${viewConfigId}`);
                        // Highlight the instance
                        setHighlightedInstanceKey(existingInstance.key);
                        setTimeout(() => setHighlightedInstanceKey(null), 1500);
                        return;
                    }
                }

                // Handle view duplication
                if (duplicateViewId) {
                    log.debug(`Duplicating view ${duplicateViewId}`);
                    const newViewConfig = await viewConfigurationManager.duplicateView(duplicateViewId);
                    if (newViewConfig) {
                        addInstance(datasetId, newViewConfig.id);
                    }
                    return;
                }

                // If we have a real (non-placeholder) viewConfigId, use it
                if (viewConfigId && !isPlaceholder && !spawnNew) {
                    log.debug(`Opening existing view ${viewConfigId}`);
                    addInstance(datasetId, viewConfigId);
                    return;
                }

                // Create new view configuration for new instance
                log.debug(`Creating new view for dataset ${datasetId}`);
                const newViewConfig = await viewConfigurationManager.createView(datasetId, {
                    name: `View of ${dataset.filename || dataset.fileName || 'Unknown'}`,
                    instanceType: dataset.metadata?.defaultInstanceType || 'vtk'
                });

                if (newViewConfig) {
                    addInstance(datasetId, newViewConfig.id);
                }
            } catch (error) {
                log.error('Failed to handle instance request:', error);
            }
        };

        // Listen for both event names for compatibility
        window.addEventListener('cia:create-instance', handleInstanceRequest);
        window.addEventListener('cia:request-instance', handleInstanceRequest);
        return () => {
            window.removeEventListener('cia:create-instance', handleInstanceRequest);
            window.removeEventListener('cia:request-instance', handleInstanceRequest);
        };
    }, [instances, addInstance]);

    // Add a new instance to the grid
    const addInstance = useCallback((datasetId, viewConfigId) => {
        const newInstance = {
            key: generateGridSlotId(),
            datasetId,
            viewConfigId,
            span: '1x1'
        };

        setInstances(prev => {
            if (prev.length >= 9) {
                log.warn('Maximum instances reached (9)');
                return prev;
            }
            return [...prev, newInstance];
        });
    }, []);

    // Handle creating an empty instance
    const handleCreateEmptyInstance = useCallback(() => {
        addInstance(null, null);
    }, [addInstance]);

    // Handle deleting an instance
    const handleDeleteInstance = useCallback((key, viewConfigId) => {
        setInstances(prev => prev.filter(inst => inst.key !== key));

        // Also delete the view configuration if it exists
        if (viewConfigId) {
            viewConfigurationManager.deleteView(viewConfigId);
        }
    }, []);

    // Handle changing instance span
    const handleChangeSpan = useCallback((key, newSpan) => {
        setInstances(prev => prev.map(inst =>
            inst.key === key ? { ...inst, span: newSpan } : inst
        ));
    }, []);

    // Calculate grid layout class based on instance count
    const getGridLayoutClass = () => {
        const count = instances.length;
        if (count <= 1) return 'grid-layout-1';
        if (count <= 2) return 'grid-layout-2';
        if (count <= 4) return 'grid-layout-4';
        if (count <= 6) return 'grid-layout-6';
        return 'grid-layout-9';
    };

    // Get span class for an instance
    const getSpanClass = (span) => {
        if (!span || span === '1x1') return '';
        return `span-${span.replace('x', '-')}`;
    };

    return (
        <div className="workspace-grid">
            {instances.length === 0 ? (
                <div className="workspace-grid__empty-state">
                    <div className="workspace-grid__empty-icon">
                        <Layers size={64} strokeWidth={1} />
                    </div>
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