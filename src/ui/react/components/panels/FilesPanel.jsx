// src/ui/react/components/panels/FilesPanel.jsx
// Enhanced version with proper publicPath handling for sample files

import React, { useState, useEffect, useRef } from 'react';
import { datasetManager } from '../../../../core/datasetManager.js';
import { simpleVisualizationManager } from '../../../../core/simpleVisualizationManager.js';
import { getUserName } from '../../../../collaboration/userManagement.js';
import { useDatasets } from '../../hooks/useDatasets.js';
import { useCurrentDataset } from '../../hooks/useCurrentDataset.js';

const SAMPLE_FILES = [
    { name: 'Skull.vtp', path: '/vtp_files/Skull.vtp', size: '19.5 MB' },
    { name: 'Bones.vtp', path: '/vtp_files/Bones.vtp', size: '26 MB' },
    { name: 'Diskout.vtp', path: '/vtp_files/Diskout.vtp', size: '472 KB' },
    { name: 'Lungs.vtp', path: '/vtp_files/Lungs.vtp', size: '10 MB' },
    { name: 'LungVessels.vtp', path: '/vtp_files/LungVessels.vtp', size: '27 MB' },
    { name: 'Earth.vtp', path: '/vtp_files/Earth.vtp', size: '1.2 MB' }
];

export function FilesPanel() {
    const datasets = useDatasets();
    const currentDatasetId = useCurrentDataset();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadType, setUploadType] = useState('samples');
    const fileInputRef = useRef(null);

    // Handle loading a sample file
    const handleLoadSample = async (sampleFile) => {
        console.log(`📂 Loading sample: ${sampleFile.path}`);
        setIsLoading(true);

        try {
            // Check if already exists
            const existing = datasetManager.findDatasetByFilename(sampleFile.name);
            if (existing) {
                console.log('📂 Sample already loaded, switching to it');
                simpleVisualizationManager.setCurrentDataset(existing.id, sampleFile.name);
                return;
            }

            // Fetch the sample file
            const response = await fetch(sampleFile.path);
            if (!response.ok) {
                throw new Error(`Failed to load sample: ${response.status}`);
            }

            const blob = await response.blob();
            const file = new File([blob], sampleFile.name, { type: 'application/octet-stream' });

            // CRITICAL: Pass the publicPath so other browsers can fetch it!
            const publicPath = window.location.origin + sampleFile.path;
            const datasetId = await datasetManager.loadDataset(file, publicPath);

            console.log(`✅ Sample loaded successfully`);

            // Set as current dataset
            simpleVisualizationManager.setCurrentDataset(datasetId, sampleFile.name);

        } catch (error) {
            console.error('❌ Failed to load sample:', error);
            alert(`Failed to load sample: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle user file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log(`📂 Uploading file: ${file.name}`);
        setIsLoading(true);

        try {
            // Check if already exists
            const existing = datasetManager.findDatasetByFilename(file.name);
            if (existing) {
                console.log('📂 File already exists, switching to it');
                simpleVisualizationManager.setCurrentDataset(existing.id, file.name);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            // Load the file (no publicPath for user uploads)
            const datasetId = await datasetManager.loadDataset(file, null);

            console.log(`✅ File uploaded successfully`);

            // Set as current dataset
            simpleVisualizationManager.setCurrentDataset(datasetId, file.name);

        } catch (error) {
            console.error('❌ Failed to upload file:', error);
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle clicking on an existing dataset
    const handleSelectDataset = (datasetId) => {
        const dataset = datasetManager.getDatasetSync(datasetId);

        if (!dataset) {
            console.log(`📂 Dataset not loaded locally, attempting to fetch...`);
            setIsLoading(true);

            // Trigger async load
            datasetManager.getDataset(datasetId).then((loadedDataset) => {
                if (loadedDataset?.polydata) {
                    simpleVisualizationManager.setCurrentDataset(datasetId, loadedDataset.name);
                } else {
                    alert('This dataset needs to be uploaded locally. The original uploader needs to share the file.');
                }
                setIsLoading(false);
            });
            return;
        }

        if (!dataset.polydata) {
            alert('Dataset is still loading. Please wait...');
            return;
        }

        simpleVisualizationManager.setCurrentDataset(datasetId, dataset.name);
    };

    return (
        <div className="files-panel">
            <div className="panel-header">
                <h3>📁 Files</h3>
                {isLoading && <span className="loading-indicator">Loading...</span>}
            </div>

            {/* Upload Section */}
            <div className="upload-section">
                <div className="upload-tabs">
                    <button
                        className={`tab ${uploadType === 'samples' ? 'active' : ''}`}
                        onClick={() => setUploadType('samples')}
                        disabled={isLoading}
                    >
                        Sample Files
                    </button>
                    <button
                        className={`tab ${uploadType === 'upload' ? 'active' : ''}`}
                        onClick={() => setUploadType('upload')}
                        disabled={isLoading}
                    >
                        Upload VTP
                    </button>
                </div>

                {uploadType === 'samples' ? (
                    <div className="sample-files">
                        {SAMPLE_FILES.map(sample => (
                            <button
                                key={sample.name}
                                className="sample-file-btn"
                                onClick={() => handleLoadSample(sample)}
                                disabled={isLoading || datasets.some(d => d.name === sample.name)}
                            >
                                <span className="file-icon">📄</span>
                                <span className="file-name">{sample.name}</span>
                                <span className="file-size">{sample.size}</span>
                                {datasets.some(d => d.name === sample.name) &&
                                    <span className="loaded-badge">✓</span>
                                }
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="upload-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".vtp"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                        >
                            <span className="upload-icon">⬆️</span>
                            Choose VTP File
                        </button>
                        <p className="upload-hint">
                            Note: User-uploaded files are only visible to users who upload the same file
                        </p>
                    </div>
                )}
            </div>

            {/* Loaded Datasets */}
            <div className="datasets-section">
                <h4>Loaded Datasets ({datasets.length})</h4>
                <div className="dataset-list">
                    {datasets.map((dataset) => (
                        <div
                            key={dataset.id}
                            className={`dataset-item ${dataset.id === currentDatasetId ? 'active' : ''}`}
                            onClick={() => handleSelectDataset(dataset.id)}
                        >
                            <div className="dataset-info">
                                <div className="dataset-name">
                                    {dataset.hasPolydata ? '✅' : dataset.isLoading ? '⏳' : '⚠️'}
                                    {' '}{dataset.name}
                                </div>
                                <div className="dataset-meta">
                                    {dataset.pointCount?.toLocaleString()} points
                                    {' • '}
                                    {dataset.uploadedByName || 'Unknown'}
                                    {dataset.publicPath && ' • 🌐 Public'}
                                </div>
                            </div>
                            {dataset.id === currentDatasetId &&
                                <span className="current-badge">Current</span>
                            }
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .files-panel {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .panel-header h3 {
                    margin: 0;
                    font-size: 18px;
                }

                .loading-indicator {
                    font-size: 12px;
                    color: #ff6b6b;
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .upload-section {
                    background: #2a2a2a;
                    border-radius: 8px;
                    padding: 10px;
                    margin-bottom: 15px;
                }

                .upload-tabs {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 10px;
                }

                .tab {
                    flex: 1;
                    padding: 8px;
                    background: transparent;
                    border: 1px solid #444;
                    color: #888;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .tab.active {
                    background: #333;
                    color: white;
                    border-color: #666;
                }

                .tab:hover:not(.active):not(:disabled) {
                    background: #333;
                }

                .tab:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .sample-files {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .sample-file-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #333;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sample-file-btn:hover:not(:disabled) {
                    background: #3a3a3a;
                    border-color: #666;
                }

                .sample-file-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .file-name {
                    flex: 1;
                    text-align: left;
                }

                .file-size {
                    color: #888;
                    font-size: 12px;
                }

                .loaded-badge {
                    color: #4CAF50;
                    font-weight: bold;
                }

                .upload-area {
                    text-align: center;
                }

                .upload-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .upload-btn:hover:not(:disabled) {
                    background: #45a049;
                }

                .upload-btn:disabled {
                    background: #666;
                    cursor: not-allowed;
                }

                .upload-hint {
                    margin-top: 10px;
                    font-size: 11px;
                    color: #888;
                    font-style: italic;
                }

                .datasets-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .datasets-section h4 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #888;
                }

                .dataset-list {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .dataset-item {
                    padding: 10px;
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .dataset-item:hover {
                    background: #333;
                    border-color: #666;
                }

                .dataset-item.active {
                    background: #3a4a5a;
                    border-color: #4CAF50;
                }

                .dataset-info {
                    flex: 1;
                }

                .dataset-name {
                    font-size: 14px;
                    margin-bottom: 4px;
                }

                .dataset-meta {
                    font-size: 11px;
                    color: #888;
                }

                .current-badge {
                    padding: 2px 8px;
                    background: #4CAF50;
                    color: white;
                    border-radius: 3px;
                    font-size: 11px;
                }
            `}</style>
        </div>
    );
}