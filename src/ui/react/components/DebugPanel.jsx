// src/ui/react/components/DebugPanel.jsx
// A diagnostic panel to help understand what's happening in the app

import React, { useState, useEffect } from 'react';
import { datasetManager } from '../../../core/datasetManager.js';
import { simpleVisualizationManager } from '../../../core/simpleVisualizationManager.js';
import { getSceneObjects } from '../../../core/scene.js';
import { yDatasets } from '../../../collaboration/yjsSetup.js';

export function DebugPanel() {
    const [debugInfo, setDebugInfo] = useState({
        datasetsInMemory: 0,
        datasetsInYjs: 0,
        currentDataset: null,
        sceneActors: 0,
        hasRenderer: false,
        polydataStatus: {}
    });

    const updateDebugInfo = () => {
        // Check datasets in memory
        const allDatasets = datasetManager.getAllDatasets();
        const datasetsInMemory = allDatasets.length;

        // Check datasets in Y.js
        const datasetsInYjs = Array.from(yDatasets.keys()).length;

        // Check current dataset
        const currentDataset = simpleVisualizationManager.getCurrentDataset();

        // Check scene status
        const scene = getSceneObjects();
        const hasRenderer = !!scene.renderer;
        const sceneActors = scene.renderer ? scene.renderer.getActors().length : 0;

        // Check polydata status for each dataset
        const polydataStatus = {};
        allDatasets.forEach(dataset => {
            const localData = datasetManager.getDatasetSync(dataset.id);
            polydataStatus[dataset.name] = {
                hasPolydata: !!localData?.polydata,
                pointCount: localData?.polydata?.getPoints()?.getNumberOfPoints() || 0,
                isLoading: dataset.isLoading
            };
        });

        setDebugInfo({
            datasetsInMemory,
            datasetsInYjs,
            currentDataset,
            sceneActors,
            hasRenderer,
            polydataStatus
        });

        // Log to console for debugging
        console.group('🔍 Debug Panel Update');
        console.log('Datasets in memory:', datasetsInMemory);
        console.log('Datasets in Y.js:', datasetsInYjs);
        console.log('Current dataset:', currentDataset);
        console.log('Scene actors:', sceneActors);
        console.log('Has renderer:', hasRenderer);
        console.log('Polydata status:', polydataStatus);
        console.groupEnd();
    };

    useEffect(() => {
        // Initial update
        updateDebugInfo();

        // Update every second for real-time monitoring
        const interval = setInterval(updateDebugInfo, 1000);

        // Also update on dataset changes
        const unsubscribe = datasetManager.onChange(updateDebugInfo);

        // And on Y.js changes
        simpleVisualizationManager.yViz.observe(updateDebugInfo);

        return () => {
            clearInterval(interval);
            unsubscribe();
            simpleVisualizationManager.yViz.unobserve(updateDebugInfo);
        };
    }, []);

    // Manual actions for debugging
    const forceSetCurrent = (datasetId) => {
        console.log('🔧 Manually setting current dataset:', datasetId);
        const dataset = datasetManager.getAllDatasets().find(d => d.id === datasetId);
        if (dataset) {
            simpleVisualizationManager.setCurrentDataset(datasetId, dataset.name);
            console.log('✅ Current dataset set');
        } else {
            console.error('❌ Dataset not found');
        }
    };

    const forceLoadIntoScene = async (datasetId) => {
        console.log('🔧 Manually loading into scene:', datasetId);
        const dataset = datasetManager.getDatasetSync(datasetId);

        if (!dataset) {
            console.error('❌ Dataset not in memory');
            return;
        }

        if (!dataset.polydata) {
            console.error('❌ Dataset has no polydata');
            return;
        }

        try {
            const { loadDatasetIntoScene } = await import('../../../core/scene.js');
            loadDatasetIntoScene(dataset.polydata, true, datasetId);
            console.log('✅ Loaded into scene');
        } catch (error) {
            console.error('❌ Error loading into scene:', error);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            maxWidth: '400px',
            zIndex: 10000,
            border: '2px solid #00ff00'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>🔍 DEBUG PANEL</h3>

            <div style={{ marginBottom: '10px' }}>
                <strong>System Status:</strong>
                <div>• Datasets in memory: {debugInfo.datasetsInMemory}</div>
                <div>• Datasets in Y.js: {debugInfo.datasetsInYjs}</div>
                <div>• Scene actors: {debugInfo.sceneActors}</div>
                <div>• Renderer exists: {debugInfo.hasRenderer ? '✅' : '❌'}</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Current Dataset:</strong>
                {debugInfo.currentDataset ? (
                    <div>
                        <div>• Name: {debugInfo.currentDataset.datasetName}</div>
                        <div>• ID: {debugInfo.currentDataset.datasetId?.substring(0, 20)}...</div>
                    </div>
                ) : (
                    <div style={{ color: 'red' }}>❌ NONE SELECTED</div>
                )}
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Polydata Status:</strong>
                {Object.entries(debugInfo.polydataStatus).map(([name, status]) => (
                    <div key={name} style={{ marginLeft: '10px', marginTop: '5px' }}>
                        <div>{name}:</div>
                        <div style={{ marginLeft: '10px', fontSize: '11px' }}>
                            • Has polydata: {status.hasPolydata ? '✅' : '❌'}
                            • Points: {status.pointCount.toLocaleString()}
                            • Loading: {status.isLoading ? '⏳' : 'No'}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                <strong>Manual Actions:</strong>
                {datasetManager.getAllDatasets().map(dataset => (
                    <div key={dataset.id} style={{ marginTop: '5px' }}>
                        <button
                            onClick={() => forceSetCurrent(dataset.id)}
                            style={{
                                marginRight: '5px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Set Current
                        </button>
                        <button
                            onClick={() => forceLoadIntoScene(dataset.id)}
                            style={{
                                marginRight: '5px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            Load Scene
                        </button>
                        <span style={{ fontSize: '10px' }}>{dataset.name}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={updateDebugInfo}
                style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '5px',
                    background: '#00ff00',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                🔄 Refresh Debug Info
            </button>
        </div>
    );
}