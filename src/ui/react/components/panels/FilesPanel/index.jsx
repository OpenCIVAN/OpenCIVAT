// src/ui/react/components/panels/FilesPanel/index.jsx
import React, { useState } from 'react';
import { FolderOpen, Loader } from 'lucide-react';

import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { useFileOperations } from './useFileOperations.js';
import { SampleFileList } from './SampleFileList.jsx';
import { DatasetList } from './DatasetList.jsx';
import { FileUploadButton } from './FileUploadButton.jsx';
import { instanceManager } from '@Core/instances/instanceManager.js';

import './FilesPanel.css';

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
    const { loadSample, uploadFile } = useFileOperations();
    const [uploadType, setUploadType] = useState('samples');
    const [spawnNewInstances, setSpawnNewInstances] = useState(true);
    const [error, setError] = useState(null);

    // Enrich datasets with instance counts
    const datasetsWithCounts = datasets.map(dataset => ({
        ...dataset,
        instanceCount: instanceManager.getInstanceCountForDataset(dataset.id)
    }));

    const isAnyLoading = datasets.some(d => d.isLoading);

    const requestVisualization = (datasetId) => {
        if (spawnNewInstances) {
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: { datasetId }
            }));
        } else {
            // TODO: Replace active instance dataset
            console.log('🔄 Replace mode not yet implemented');
        }
    };

    const handleSampleSelect = async (sample) => {
        setError(null);
        try {
            const dataset = await loadSample(sample);
            if (dataset) {
                requestVisualization(dataset.id);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFileUpload = async (file) => {
        setError(null);
        try {
            const dataset = await uploadFile(file);
            if (dataset) {
                requestVisualization(dataset.id);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDatasetSelect = (dataset) => {
        if (dataset.isLoading) {
            return; // Can't select while loading
        }
        requestVisualization(dataset.id);
    };

    return (
        <div className="files-panel">
            <div className="files-panel__header">
                <FolderOpen size={20} />
                <h3>Files</h3>
                {isAnyLoading && (
                    <span className="files-panel__loading">
                        <Loader size={14} className="spinner" />
                        Loading...
                    </span>
                )}
            </div>

            {error && (
                <div className="files-panel__error">
                    {error}
                </div>
            )}

            <div className="files-panel__spawn-toggle">
                <label className="toggle-label">
                    <input
                        type="checkbox"
                        checked={spawnNewInstances}
                        onChange={(e) => setSpawnNewInstances(e.target.checked)}
                    />
                    <span>Spawn new instances</span>
                </label>
                <span className="toggle-hint">
                    {spawnNewInstances
                        ? 'Each dataset opens in a new window'
                        : 'Datasets replace current view'}
                </span>
            </div>

            <div className="files-panel__upload-section">
                <div className="files-panel__tabs">
                    <button
                        className={`files-panel__tab ${uploadType === 'samples' ? 'active' : ''}`}
                        onClick={() => setUploadType('samples')}
                        disabled={isAnyLoading}
                    >
                        Sample Files
                    </button>
                    <button
                        className={`files-panel__tab ${uploadType === 'upload' ? 'active' : ''}`}
                        onClick={() => setUploadType('upload')}
                        disabled={isAnyLoading}
                    >
                        Upload VTP
                    </button>
                </div>

                {uploadType === 'samples' ? (
                    <SampleFileList
                        samples={SAMPLE_FILES}
                        onSelectSample={handleSampleSelect}
                        disabled={isAnyLoading}
                    />
                ) : (
                    <FileUploadButton
                        onFileSelect={handleFileUpload}
                        disabled={isAnyLoading}
                    />
                )}
            </div>

            <div className="files-panel__datasets">
                <h4 className="files-panel__datasets-header">
                    Loaded Datasets ({datasetsWithCounts.length})
                </h4>
                <DatasetList
                    datasets={datasetsWithCounts}
                    onSelectDataset={handleDatasetSelect}
                />
            </div>
        </div>
    );
}