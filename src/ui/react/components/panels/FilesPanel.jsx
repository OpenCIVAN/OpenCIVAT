import React, { useState, useRef, useEffect } from 'react';
import { datasetManager } from '../../../../core/datasetManager.js';
import { simpleVisualizationManager } from '../../../../core/simpleVisualizationManager.js';
import { yDatasets } from '../../../../collaboration/yjsSetup.js';
import { loadDatasetIntoScene } from '../../../../core/scene.js';
import { sceneState } from '../../../../core/sceneState.js';
import { getSceneObjects } from "../../../../core/scene.js";

// Add a clear datasets button and better timeout handling

// At the top of the component, add this helper:
const handleClearAllDatasets = () => {
    if (confirm('Clear all datasets?')) {
        // 1. Clear local datasets
        const allDatasets = datasetManager.getAllDatasets();
        allDatasets.forEach(dataset => {
            datasetManager.removeDataset(dataset.id);
        });

        // 2. Clear current visualization
        simpleVisualizationManager.yViz.delete('current');

        // 3. Clear the actual VTK scene
        const { renderer, renderWindow } = getSceneObjects();
        const actors = renderer.getActors();
        actors.forEach(actor => {
            renderer.removeActor(actor);
        });
        renderWindow.render();

        console.log('🗑️ All datasets and visualization cleared');
    }
};


export default function FilesPanel() {
    const [datasets, setDatasets] = useState([]);
    const [currentDataset, setCurrentDataset] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const loadingRef = useRef(false); // Prevent concurrent loads

    // Listen for dataset changes
    useEffect(() => {
        const updateDatasets = () => {
            const allDatasets = datasetManager.getAllDatasets();
            setDatasets(allDatasets);
        };

        datasetManager.onChange(updateDatasets);
        yDatasets.observe(updateDatasets);
        updateDatasets();

        return () => {
            yDatasets.unobserve(updateDatasets);
        };
    }, []);

    // Listen for "current dataset" changes - LOAD ONLY ONCE
    useEffect(() => {
        let mounted = true;

        const handleCurrentChange = () => {
            const current = simpleVisualizationManager.getCurrentDataset();

            if (!mounted) return;

            console.log('🎯 Current dataset:', current?.datasetName || 'none');
            setCurrentDataset(current);

            if (!current) return;

            // CRITICAL: Only load if it's different AND we're not already loading
            if (sceneState.isDatasetLoaded(current.datasetId)) {
                console.log('✅ Already in scene, skipping');
                return;
            }

            if (loadingRef.current) {
                console.log('⏳ Already loading, skipping');
                return;
            }

            const dataset = datasetManager.getDataset(current.datasetId);

            if (dataset && dataset.polydata) {
                console.log('📊 Loading NOW:', dataset.filename);
                loadingRef.current = true;

                try {
                    loadDatasetIntoScene(dataset.polydata, true);
                    sceneState.setLoadedDataset(current.datasetId);
                    console.log('✅ Loaded into scene');
                } finally {
                    loadingRef.current = false;
                }
            } else {
                console.log('⏳ Polydata not ready, polling...');

                // Poll for polydata with timeout
                let attempts = 0;
                const pollInterval = setInterval(() => {
                    if (!mounted) {
                        clearInterval(pollInterval);
                        return;
                    }

                    attempts++;
                    const updated = datasetManager.getDataset(current.datasetId);

                    if (updated && updated.polydata) {
                        console.log('✅ Polydata ready');
                        clearInterval(pollInterval);

                        // Double check we still want this one
                        const stillCurrent = simpleVisualizationManager.getCurrentDataset();
                        if (stillCurrent && stillCurrent.datasetId === current.datasetId && !sceneState.isDatasetLoaded(current.datasetId)) {
                            loadingRef.current = true;
                            try {
                                loadDatasetIntoScene(updated.polydata, true);
                                sceneState.setLoadedDataset(current.datasetId);
                                console.log('✅ Loaded into scene after waiting');
                            } finally {
                                loadingRef.current = false;
                            }
                        }
                    } else if (attempts > 30) {
                        console.log('❌ Timeout');
                        clearInterval(pollInterval);
                    }
                }, 500);
            }
        };

        simpleVisualizationManager.yViz.observe(handleCurrentChange);
        handleCurrentChange();

        return () => {
            mounted = false;
            simpleVisualizationManager.yViz.unobserve(handleCurrentChange);
        };
    }, []); // Empty deps - only run once

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.vtp')) {
            alert('Please select a .vtp file');
            return;
        }

        // Check if already exists
        const existing = datasetManager.findDatasetByFilename(file.name);
        if (existing) {
            console.log('ℹ️ File already loaded, switching to it');
            simpleVisualizationManager.setCurrentDataset(existing.id, file.name);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setIsLoading(true);

        try {
            console.log('📂 User loading file:', file.name);

            const datasetId = await datasetManager.loadDataset(file, null);
            simpleVisualizationManager.setCurrentDataset(datasetId, file.name);

            console.log('✅ File loaded');

        } catch (error) {
            console.error('❌ Error loading file:', error);
            alert('Failed to load file. Check console for details.');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleLoadDataset = (datasetId) => {
        const dataset = datasetManager.getDataset(datasetId);
        if (!dataset) {
            alert('Dataset not found');
            return;
        }

        if (!dataset.polydata) {
            alert('Dataset is still loading. Please wait...');
            return;
        }

        console.log('👆 User clicked to view:', dataset.filename);
        simpleVisualizationManager.setCurrentDataset(datasetId, dataset.filename);
    };

    const handleLoadSample = async (samplePath, sampleName) => {
        // Check if already exists
        const existing = datasetManager.findDatasetByFilename(sampleName);
        if (existing) {
            console.log('ℹ️ Sample already loaded, switching to it');
            simpleVisualizationManager.setCurrentDataset(existing.id, sampleName);
            return;
        }

        setIsLoading(true);

        try {
            console.log('📂 Loading sample:', samplePath);

            const response = await fetch(samplePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const file = new File([blob], sampleName, { type: 'application/octet-stream' });

            const datasetId = await datasetManager.loadDataset(file, samplePath);
            simpleVisualizationManager.setCurrentDataset(datasetId, sampleName);

            console.log('✅ Sample loaded');

        } catch (error) {
            console.error('❌ Error loading sample:', error);
            alert(`Failed to load sample: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.vtp')) {
                const fakeEvent = { target: { files: [file] } };
                handleFileSelect(fakeEvent);
            } else {
                alert('Please drop a .vtp file');
            }
        }
    };

    const sampleFiles = [
        { name: 'diskout.vtp', description: 'Disk geometry', path: '/vtp_files/diskout.vtp' },
        { name: 'Skull.vtp', description: 'Skull', path: '/vtp_files/Skull.vtp' },
        { name: 'LungVessels.vtp', description: 'Lung Vessels', path: '/vtp_files/LungVessels.vtp' },
    ];

    return (
        <div style={{ color: '#e0e0e0' }}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".vtp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {currentDataset && (
                <div style={{
                    marginBottom: '20px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #4CAF50',
                    borderRadius: '6px'
                }}>
                    <div style={{ fontSize: '11px', color: '#81C784', marginBottom: '4px' }}>
                        CURRENTLY VIEWING
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {currentDataset.datasetName}
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '20px' }}>
                <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#aaa'
                }}>
                    Load VTP File
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleBrowseClick}
                    style={{
                        width: '100%',
                        padding: '30px 20px',
                        backgroundColor: '#1a1a1a',
                        border: '2px dashed #444',
                        borderRadius: '6px',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                        if (!isLoading) {
                            e.currentTarget.style.backgroundColor = '#242424';
                            e.currentTarget.style.borderColor = '#666';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1a1a1a';
                        e.currentTarget.style.borderColor = '#444';
                    }}
                >
                    <div style={{ fontSize: '32px' }}>
                        {isLoading ? '⏳' : '📁'}
                    </div>
                    <div style={{ fontWeight: '600' }}>
                        {isLoading ? 'Loading...' : 'Click to Browse'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                        or drag and drop VTP file
                    </div>
                </div>
            </div>

            {datasets.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color: '#aaa'
                    }}>
                        Available Datasets ({datasets.length})
                    </div>

                    {datasets.map((dataset) => {
                        const isCurrent = currentDataset?.datasetId === dataset.id;
                        const isClickable = dataset.hasPolydata && !dataset.isLoading && !isCurrent;

                        return (
                            <button
                                key={dataset.id}
                                onClick={() => isClickable && handleLoadDataset(dataset.id)}
                                disabled={!isClickable}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    marginBottom: '8px',
                                    backgroundColor: isCurrent ? '#1a3a1a' : '#1a1a1a',
                                    border: `1px solid ${isCurrent ? '#4CAF50' : '#333'}`,
                                    borderRadius: '4px',
                                    color: isClickable ? '#e0e0e0' : '#666',
                                    fontSize: '13px',
                                    cursor: isClickable ? 'pointer' : 'not-allowed',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    opacity: (dataset.hasPolydata && !isCurrent) ? 1 : 0.6
                                }}
                                onMouseEnter={(e) => {
                                    if (isClickable) {
                                        e.currentTarget.style.backgroundColor = '#242424';
                                        e.currentTarget.style.borderColor = '#4CAF50';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isCurrent) {
                                        e.currentTarget.style.backgroundColor = '#1a1a1a';
                                        e.currentTarget.style.borderColor = '#333';
                                    }
                                }}
                            >
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                    {isCurrent && '✓ '}
                                    {dataset.isLoading && '⏳ '}
                                    {dataset.filename}
                                </div>
                                <div style={{ fontSize: '11px', color: '#999' }}>
                                    By {dataset.uploadedByName}
                                    {dataset.isLoading && ' • Loading...'}
                                    {!dataset.hasPolydata && !dataset.isLoading && ' • Not available'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div>
                <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#aaa'
                }}>
                    Sample Datasets
                </div>

                {sampleFiles.map((file, index) => (
                    <button
                        key={index}
                        onClick={() => handleLoadSample(file.path, file.name)}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '4px',
                            color: isLoading ? '#666' : '#e0e0e0',
                            fontSize: '13px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.backgroundColor = '#242424';
                                e.currentTarget.style.borderColor = '#4CAF50';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1a1a1a';
                            e.currentTarget.style.borderColor = '#333';
                        }}
                    >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {file.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                            {file.description}
                        </div>
                    </button>
                ))}
            </div>
            {/* Debug/Admin Controls */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
                <button
                    onClick={handleClearAllDatasets}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#3a1a1a',
                        border: '1px solid #663333',
                        borderRadius: '4px',
                        color: '#ff6666',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4a2020';
                        e.currentTarget.style.borderColor = '#994444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3a1a1a';
                        e.currentTarget.style.borderColor = '#663333';
                    }}
                >
                    Clear All Datasets
                </button>
            </div>
        </div>
    );
}