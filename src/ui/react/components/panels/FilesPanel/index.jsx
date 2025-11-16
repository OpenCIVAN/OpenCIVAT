// src/ui/react/components/panels/FilesPanel/index.jsx
import React, { useState } from 'react';
import {
    FolderOpen,
    Loader,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Search,
    Filter as FilterIcon,
    BookmarkCheck
} from 'lucide-react';

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

    // Main panel state
    const [activeTab, setActiveTab] = useState('datasets'); // 'datasets' or 'files'
    const [uploadType, setUploadType] = useState('samples');
    const [spawnNewInstances, setSpawnNewInstances] = useState(true);
    const [error, setError] = useState(null);

    // Quick Access state
    const [quickAccessOpen, setQuickAccessOpen] = useState(false);
    const [quickAccessTab, setQuickAccessTab] = useState('annotations');

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
            console.log('🔄 Replace mode not yet implemented');
        }
    };

    const handleSampleSelect = async (sample) => {
        setError(null);
        try {
            const datasetId = await loadSample(sample);
            if (datasetId) {
                requestVisualization(datasetId);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFileUpload = async (file) => {
        setError(null);
        try {
            const datasetId = await uploadFile(file);
            if (datasetId) {
                requestVisualization(datasetId);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDatasetSelect = (dataset) => {
        if (dataset.isLoading) return;
        requestVisualization(dataset.id);
    };

    return (
        <div className="files-panel">
            {/* Panel Header - Remove collapse button for now since ThreeEdgeLayout doesn't exist */}
            <div className="files-panel__panel-header">
                <div className="files-panel__panel-title">
                    <FolderOpen size={18} />
                    <span>Data</span>
                </div>
                {/* TODO: Add collapse when ThreeEdgeLayout is implemented */}
            </div>

            {/* Tabs for Datasets/Files */}
            <div className="files-panel__main-tabs">
                <button
                    className={`files-panel__main-tab ${activeTab === 'datasets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('datasets')}
                >
                    Datasets
                </button>
                <button
                    className={`files-panel__main-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                >
                    Files
                </button>
            </div>

            {/* Main Content Area - Takes 50% when Quick Access open, 100% when closed */}
            <div className={`files-panel__main-content ${quickAccessOpen ? 'split' : 'full'}`}>
                {error && (
                    <div className="files-panel__error">
                        {error}
                    </div>
                )}

                {activeTab === 'datasets' ? (
                    /* Datasets Tab */
                    <div className="files-panel__datasets-view">
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

                        <div className="files-panel__datasets-section">
                            <h4 className="files-panel__section-title">
                                Loaded Datasets ({datasetsWithCounts.length})
                                {isAnyLoading && (
                                    <Loader size={14} className="spinner" style={{ marginLeft: 8 }} />
                                )}
                            </h4>
                            <DatasetList
                                datasets={datasetsWithCounts}
                                onSelectDataset={handleDatasetSelect}
                            />
                        </div>
                    </div>
                ) : (
                    /* Files Tab */
                    <div className="files-panel__files-view">
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
                    </div>
                )}
            </div>

            {/* Quick Access Section - Takes 50% when open */}
            {quickAccessOpen && (
                <div className="files-panel__quick-access">
                    <div className="files-panel__quick-access-header">
                        <span className="files-panel__quick-access-title">Quick Access</span>
                        <button
                            className="files-panel__quick-close-btn"
                            onClick={() => setQuickAccessOpen(false)}
                            title="Close Quick Access"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className="files-panel__quick-tabs">
                        <button
                            className={`files-panel__quick-tab ${quickAccessTab === 'annotations' ? 'active' : ''}`}
                            onClick={() => setQuickAccessTab('annotations')}
                        >
                            <Search size={14} />
                            <span>Annotations</span>
                        </button>
                        <button
                            className={`files-panel__quick-tab ${quickAccessTab === 'filters' ? 'active' : ''}`}
                            onClick={() => setQuickAccessTab('filters')}
                        >
                            <FilterIcon size={14} />
                            <span>Filters</span>
                        </button>
                        <button
                            className={`files-panel__quick-tab ${quickAccessTab === 'views' ? 'active' : ''}`}
                            onClick={() => setQuickAccessTab('views')}
                        >
                            <BookmarkCheck size={14} />
                            <span>Views</span>
                        </button>
                    </div>

                    <div className="files-panel__quick-content">
                        {quickAccessTab === 'annotations' && (
                            <div className="files-panel__quick-placeholder">
                                <Search size={24} color="#808080" />
                                <p>Global annotation search</p>
                                <span>Search annotations across all datasets</span>
                            </div>
                        )}
                        {quickAccessTab === 'filters' && (
                            <div className="files-panel__quick-placeholder">
                                <FilterIcon size={24} color="#808080" />
                                <p>Saved filters</p>
                                <span>Quick access to your saved filter configurations</span>
                            </div>
                        )}
                        {quickAccessTab === 'views' && (
                            <div className="files-panel__quick-placeholder">
                                <BookmarkCheck size={24} color="#808080" />
                                <p>Saved views</p>
                                <span>Restore camera positions and visualization settings</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Access Toggle Button - Only show when closed */}
            {!quickAccessOpen && (
                <div className="files-panel__quick-toggle">
                    <button
                        className="files-panel__quick-toggle-btn"
                        onClick={() => setQuickAccessOpen(true)}
                    >
                        <ChevronUp size={14} />
                        <span>Quick Access</span>
                    </button>
                </div>
            )}
        </div>
    );
}