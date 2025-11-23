// src/ui/react/components/panels/FilesPanel/index.jsx
// Option B: Panel handles BOTH collapsed and expanded states
// Receives isCollapsed and onToggle from ResizablePanel

import React, { useState } from 'react';
import {
    FolderOpen,
    Loader,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ChevronLeft,
    Search,
    Filter as FilterIcon,
    BookmarkCheck,
    User,
    Users,
    Archive,
    File
} from 'lucide-react';

import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { useFileOperations } from './useFileOperations.js';
import { SampleFileList } from './SampleFileList.jsx';
import { FileUploadButton } from './FileUploadButton.jsx';

import '@UI/react/components/panels/FilesPanel/FilesPanel.scss';

const SAMPLE_FILES = [
    { name: 'Skull.vtp', path: '/vtp_files/Skull.vtp', size: '19.5 MB' },
    { name: 'Bones.vtp', path: '/vtp_files/Bones.vtp', size: '26 MB' },
    { name: 'Diskout.vtp', path: '/vtp_files/Diskout.vtp', size: '472 KB' },
    { name: 'Lungs.vtp', path: '/vtp_files/Lungs.vtp', size: '10 MB' },
    { name: 'LungVessels.vtp', path: '/vtp_files/LungVessels.vtp', size: '27 MB' },
    { name: 'Earth.vtp', path: '/vtp_files/Earth.vtp', size: '1.2 MB' }
];

/**
 * FilesPanel - Data browser panel
 * 
 * Handles BOTH collapsed and expanded states internally.
 * 
 * @param {Object} props
 * @param {boolean} props.isCollapsed - From ResizablePanel
 * @param {Function} props.onToggle - From ResizablePanel
 * @param {string} props.side - 'left' or 'right' (from ResizablePanel)
 */
export function FilesPanel({ isCollapsed = false, onToggle, side = 'left' }) {
    const datasets = useDatasets();
    const { loadSample, uploadFile } = useFileOperations();

    // =========================================================================
    // COLLAPSED STATE - Activity Bar
    // =========================================================================

    if (isCollapsed) {
        // Remove duplicates for counts
        const uniqueDatasets = Array.from(
            new Map(datasets.map(ds => [ds.id, ds])).values()
        );
        const myCount = uniqueDatasets.filter(ds => !ds.sharedWith && ds.status !== 'inactive').length;
        const sharedCount = uniqueDatasets.filter(ds => ds.sharedWith).length;
        const inactiveCount = uniqueDatasets.filter(ds => ds.status === 'inactive').length;

        return (
            <FilesActivityBar
                myCount={myCount}
                sharedCount={sharedCount}
                inactiveCount={inactiveCount}
                onExpand={onToggle}
            />
        );
    }

    // =========================================================================
    // EXPANDED STATE - Full Panel
    // =========================================================================

    return (
        <FilesPanelExpanded
            datasets={datasets}
            loadSample={loadSample}
            uploadFile={uploadFile}
            onCollapse={onToggle}
        />
    );
}

/**
 * FilesActivityBar - Collapsed state (48px)
 * Shows icons with badge counts
 */
function FilesActivityBar({ myCount, sharedCount, inactiveCount, onExpand }) {
    return (
        <div className="files-activity-bar">
            <div className="files-activity-bar__icons">
                {/* My Instances */}
                <button
                    className="files-activity-bar__icon"
                    title={`My Instances (${myCount})`}
                    onClick={onExpand}
                >
                    <User size={20} />
                    {myCount > 0 && (
                        <span className="files-activity-bar__badge">{myCount}</span>
                    )}
                </button>

                {/* Shared with Me */}
                <button
                    className="files-activity-bar__icon"
                    title={`Shared with Me (${sharedCount})`}
                    onClick={onExpand}
                >
                    <Users size={20} />
                    {sharedCount > 0 && (
                        <span className="files-activity-bar__badge files-activity-bar__badge--blue">
                            {sharedCount}
                        </span>
                    )}
                </button>

                {/* Inactive */}
                <button
                    className="files-activity-bar__icon"
                    title={`Inactive (${inactiveCount})`}
                    onClick={onExpand}
                >
                    <Archive size={20} />
                    {inactiveCount > 0 && (
                        <span className="files-activity-bar__badge files-activity-bar__badge--muted">
                            {inactiveCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Expand Button */}
            <button
                className="files-activity-bar__expand"
                onClick={onExpand}
                title="Expand panel"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}

/**
 * FilesPanelExpanded - Full expanded panel content
 */
function FilesPanelExpanded({ datasets, loadSample, uploadFile, onCollapse }) {
    // Panel state
    const [activeTab, setActiveTab] = useState('datasets');
    const [uploadType, setUploadType] = useState('samples');
    const [error, setError] = useState(null);

    // Tree folder expansion state
    const [expandedFolders, setExpandedFolders] = useState({
        'my': true,
        'shared': false,
        'inactive': false
    });

    // Dataset expansion state (for nested instances)
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Quick Access state
    const [quickAccessOpen, setQuickAccessOpen] = useState(false);
    const [quickAccessTab, setQuickAccessTab] = useState('annotations');

    const isAnyLoading = datasets.some(d => d.isLoading);

    // Remove duplicates and categorize
    const uniqueDatasets = Array.from(
        new Map(datasets.map(ds => [ds.id, ds])).values()
    );

    const myDatasets = uniqueDatasets.filter(ds => !ds.sharedWith && ds.status !== 'inactive');
    const sharedDatasets = uniqueDatasets.filter(ds => ds.sharedWith);
    const inactiveDatasets = uniqueDatasets.filter(ds => ds.status === 'inactive');

    // Handlers
    const requestVisualization = (datasetId, shiftKey = false) => {
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId, spawnNew: shiftKey }
        }));
    };

    const handleSampleSelect = async (sample) => {
        setError(null);
        try {
            const datasetId = await loadSample(sample);
            if (datasetId) {
                requestVisualization(datasetId, true);
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
                requestVisualization(datasetId, true);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDatasetClick = (dataset, event) => {
        if (dataset.isLoading) return;
        requestVisualization(dataset.id, event.shiftKey);
    };

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    const toggleDataset = (datasetId) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            next.has(datasetId) ? next.delete(datasetId) : next.add(datasetId);
            return next;
        });
    };

    return (
        <div className="files-panel">
            {/* Header with Collapse Button */}
            <div className="files-panel__header">
                <div className="files-panel__title">
                    <FolderOpen size={16} />
                    <span>Data</span>
                </div>
                <button
                    className="files-panel__collapse-btn"
                    onClick={onCollapse}
                    title="Collapse panel"
                >
                    <ChevronLeft size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="files-panel__tabs">
                <button
                    className={`files-panel__tab ${activeTab === 'datasets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('datasets')}
                >
                    Datasets
                </button>
                <button
                    className={`files-panel__tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                >
                    Files
                </button>
            </div>

            {/* Content */}
            <div className={`files-panel__content ${quickAccessOpen ? 'split' : 'full'}`}>
                {error && <div className="files-panel__error">{error}</div>}

                {activeTab === 'datasets' ? (
                    <div className="files-panel__datasets-view">
                        <div className="files-panel__tree">
                            {/* My Instances */}
                            <TreeFolder
                                id="my"
                                icon={<User size={18} />}
                                label="My Instances"
                                count={myDatasets.length}
                                expanded={expandedFolders.my}
                                onToggle={() => toggleFolder('my')}
                            >
                                {isAnyLoading && (
                                    <div className="tree-item tree-item--loading">
                                        <Loader size={14} className="spinner" />
                                        <span>Loading...</span>
                                    </div>
                                )}
                                {myDatasets.map(dataset => (
                                    <DatasetTreeItem
                                        key={dataset.id}
                                        dataset={dataset}
                                        expanded={expandedDatasets.has(dataset.id)}
                                        onToggle={() => toggleDataset(dataset.id)}
                                        onClick={(e) => handleDatasetClick(dataset, e)}
                                    />
                                ))}
                            </TreeFolder>

                            {/* Shared with Me */}
                            <TreeFolder
                                id="shared"
                                icon={<Users size={18} />}
                                label="Shared with Me"
                                badge={sharedDatasets.length > 0 ? sharedDatasets.length : null}
                                expanded={expandedFolders.shared}
                                onToggle={() => toggleFolder('shared')}
                                highlighted
                            >
                                {sharedDatasets.length === 0 ? (
                                    <div className="tree-item tree-item--empty">
                                        <span>No shared datasets yet</span>
                                    </div>
                                ) : (
                                    sharedDatasets.map(dataset => (
                                        <DatasetTreeItem
                                            key={dataset.id}
                                            dataset={dataset}
                                            expanded={expandedDatasets.has(dataset.id)}
                                            onToggle={() => toggleDataset(dataset.id)}
                                            onClick={(e) => handleDatasetClick(dataset, e)}
                                        />
                                    ))
                                )}
                            </TreeFolder>

                            {/* Inactive */}
                            <TreeFolder
                                id="inactive"
                                icon={<Archive size={18} />}
                                label="Inactive"
                                count={inactiveDatasets.length}
                                expanded={expandedFolders.inactive}
                                onToggle={() => toggleFolder('inactive')}
                            >
                                {inactiveDatasets.length === 0 ? (
                                    <div className="tree-item tree-item--empty">
                                        <span>No inactive datasets</span>
                                    </div>
                                ) : (
                                    inactiveDatasets.map(dataset => (
                                        <DatasetTreeItem
                                            key={dataset.id}
                                            dataset={dataset}
                                            expanded={expandedDatasets.has(dataset.id)}
                                            onToggle={() => toggleDataset(dataset.id)}
                                            onClick={(e) => handleDatasetClick(dataset, e)}
                                        />
                                    ))
                                )}
                            </TreeFolder>
                        </div>

                        {/* Hint */}
                        <div className="files-panel__hint">
                            <span>💡 <strong>Shift+Click</strong> to open in new window</span>
                        </div>
                    </div>
                ) : (
                    <div className="files-panel__files-view">
                        <div className="files-panel__upload-section">
                            <div className="files-panel__sub-tabs">
                                <button
                                    className={`files-panel__sub-tab ${uploadType === 'samples' ? 'active' : ''}`}
                                    onClick={() => setUploadType('samples')}
                                    disabled={isAnyLoading}
                                >
                                    Sample Files
                                </button>
                                <button
                                    className={`files-panel__sub-tab ${uploadType === 'upload' ? 'active' : ''}`}
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

            {/* Quick Access */}
            {quickAccessOpen && (
                <QuickAccessPanel
                    activeTab={quickAccessTab}
                    onTabChange={setQuickAccessTab}
                    onClose={() => setQuickAccessOpen(false)}
                />
            )}

            {!quickAccessOpen && (
                <button
                    className="files-panel__quick-toggle"
                    onClick={() => setQuickAccessOpen(true)}
                >
                    <ChevronUp size={14} />
                    <span>Quick Access</span>
                </button>
            )}
        </div>
    );
}

/**
 * TreeFolder - Collapsible folder in tree
 */
function TreeFolder({ id, icon, label, count, badge, expanded, onToggle, highlighted, children }) {
    return (
        <div className={`tree-folder ${highlighted ? 'tree-folder--highlighted' : ''}`} data-folder={id}>
            <button className="tree-folder__header" onClick={onToggle}>
                <span className="tree-folder__chevron">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="tree-folder__icon">{icon}</span>
                <span className="tree-folder__label">{label}</span>
                {count !== undefined && <span className="tree-folder__count">({count})</span>}
                {badge && <span className="tree-folder__badge">{badge}</span>}
            </button>
            {expanded && <div className="tree-folder__children">{children}</div>}
        </div>
    );
}

/**
 * DatasetTreeItem - Individual dataset in tree
 */
function DatasetTreeItem({ dataset, expanded, onToggle, onClick }) {
    const instances = []; // TODO: Get from InstanceManager
    const hasInstances = instances.length > 0;
    const pointCount = dataset.pointCount || 0;
    const dataType = dataset.dataType || 'Unknown';

    return (
        <div className="tree-dataset">
            <div className="tree-dataset__row">
                {hasInstances && (
                    <button
                        className="tree-dataset__chevron"
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
                <button
                    className={`tree-item tree-item--dataset ${dataset.isLoading ? 'loading' : ''} ${!hasInstances ? 'tree-item--no-chevron' : ''}`}
                    onClick={onClick}
                    disabled={dataset.isLoading}
                    title={`${dataset.name}\nClick to replace • Shift+Click for new window`}
                >
                    <span className="tree-item__icon"><File size={14} /></span>
                    <div className="tree-item__content">
                        <span className="tree-item__name">{dataset.name}</span>
                        <span className="tree-item__meta">{pointCount.toLocaleString()} points • {dataType}</span>
                    </div>
                    {dataset.isLoading && <Loader size={12} className="spinner tree-item__spinner" />}
                </button>
            </div>
            {expanded && hasInstances && (
                <div className="tree-dataset__instances">
                    {/* Instance items will go here */}
                </div>
            )}
        </div>
    );
}

/**
 * QuickAccessPanel - Bottom panel for annotations/filters/views
 */
function QuickAccessPanel({ activeTab, onTabChange, onClose }) {
    return (
        <div className="files-panel__quick-access">
            <div className="quick-access__header">
                <span className="quick-access__title">Quick Access</span>
                <button className="quick-access__close-btn" onClick={onClose}>
                    <ChevronDown size={14} />
                </button>
            </div>
            <div className="quick-access__tabs">
                <button
                    className={`quick-access__tab ${activeTab === 'annotations' ? 'active' : ''}`}
                    onClick={() => onTabChange('annotations')}
                >
                    <Search size={16} /><span>Annotations</span>
                </button>
                <button
                    className={`quick-access__tab ${activeTab === 'filters' ? 'active' : ''}`}
                    onClick={() => onTabChange('filters')}
                >
                    <FilterIcon size={16} /><span>Filters</span>
                </button>
                <button
                    className={`quick-access__tab ${activeTab === 'views' ? 'active' : ''}`}
                    onClick={() => onTabChange('views')}
                >
                    <BookmarkCheck size={16} /><span>Views</span>
                </button>
            </div>
            <div className="quick-access__content">
                <div className="quick-access__placeholder">
                    {activeTab === 'annotations' && <><Search size={32} /><div>Annotation search</div></>}
                    {activeTab === 'filters' && <><FilterIcon size={32} /><div>Saved filters</div></>}
                    {activeTab === 'views' && <><BookmarkCheck size={32} /><div>Saved views</div></>}
                </div>
            </div>
        </div>
    );
}