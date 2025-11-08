import React, { useState, useEffect } from 'react';
import { visualizationManager } from '../../../core/visualizationManager.js';
import { datasetManager } from '../../../core/datasetManager.js';
import { yInstances } from '../../../collaboration/yjsSetup.js';
import { loadDatasetIntoScene } from '../../../core/scene.js';
import { getUserId } from '../../../collaboration/userManagement.js';

export function ViewSwitcher() {
    const [visualizations, setVisualizations] = useState([]);
    const [activeVizId, setActiveVizId] = useState(null);

    useEffect(() => {
        const updateVisualizations = () => {
            const allViz = visualizationManager.getAllVisualizations();
            setVisualizations(allViz);

            // Set initial active if none set
            const active = visualizationManager.getActive();
            if (!active && allViz.length > 0) {
                handleSwitchView(allViz[0].id);
            } else if (active) {
                setActiveVizId(active.id);
            }
        };

        yInstances.observe(updateVisualizations);
        updateVisualizations();

        return () => yInstances.unobserve(updateVisualizations);
    }, []);

    const handleSwitchView = (vizId) => {
        const viz = visualizationManager.getVisualization(vizId);
        if (!viz) return;

        // Get the dataset
        const dataset = datasetManager.getDataset(viz.datasetId);
        if (!dataset || !dataset.polydata) {
            console.error('Dataset polydata not available');
            return;
        }

        // Load into scene
        loadDatasetIntoScene(dataset.polydata);

        // Set as active
        visualizationManager.setActive(vizId);
        setActiveVizId(vizId);

        console.log(`🎯 Switched to visualization: ${viz.name}`);
    };

    const handleRemoveView = (vizId, e) => {
        e.stopPropagation();

        const viz = visualizations.find(v => v.id === vizId);
        if (!viz) return;

        if (confirm(`Remove view "${viz.name}"?`)) {
            visualizationManager.removeVisualization(vizId);

            // If this was active, switch to another
            if (vizId === activeVizId) {
                const remaining = visualizations.filter(v => v.id !== vizId);
                if (remaining.length > 0) {
                    handleSwitchView(remaining[0].id);
                }
            }
        }
    };

    const handleToggleScope = (vizId, e) => {
        e.stopPropagation();

        const viz = visualizations.find(v => v.id === vizId);
        if (!viz) return;

        const newScope = viz.scope === 'personal' ? 'shared' : 'personal';
        visualizationManager.changeScope(vizId, newScope);
    };

    if (visualizations.length === 0) {
        return (
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '70px',
                padding: '8px 12px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                color: '#999',
                fontSize: '12px'
            }}>
                No views created yet. Load a dataset from Files panel.
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            left: '70px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            maxWidth: 'calc(100vw - 500px)',
            zIndex: 10
        }}>
            {visualizations.map(viz => {
                const isActive = viz.id === activeVizId;
                const isYours = viz.createdBy === getUserId();

                return (
                    <div
                        key={viz.id}
                        onClick={() => handleSwitchView(viz.id)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: isActive ? '#4CAF50' : 'rgba(0,0,0,0.7)',
                            border: `1px solid ${isActive ? '#4CAF50' : '#444'}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#e0e0e0'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
                            }
                        }}
                    >
                        {/* Scope indicator */}
                        <span style={{ fontSize: '14px' }}>
                            {viz.scope === 'personal' ? '🔒' : '👥'}
                        </span>

                        {/* View name */}
                        <span style={{ fontWeight: isActive ? '600' : '400' }}>
                            {viz.name}
                        </span>

                        {/* Actions (only show for your views) */}
                        {isYours && (
                            <>
                                <button
                                    onClick={(e) => handleToggleScope(viz.id, e)}
                                    title={viz.scope === 'personal' ? 'Make shared' : 'Make personal'}
                                    style={{
                                        background: 'none',
                                        border: '1px solid #666',
                                        borderRadius: '3px',
                                        padding: '2px 6px',
                                        color: '#999',
                                        cursor: 'pointer',
                                        fontSize: '10px'
                                    }}
                                >
                                    {viz.scope === 'personal' ? '📤' : '🔒'}
                                </button>

                                <button
                                    onClick={(e) => handleRemoveView(viz.id, e)}
                                    title="Remove view"
                                    style={{
                                        background: '#f44336',
                                        border: 'none',
                                        borderRadius: '3px',
                                        padding: '2px 6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: '600'
                                    }}
                                >
                                    ×
                                </button>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}