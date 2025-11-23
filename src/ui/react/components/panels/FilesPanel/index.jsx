// src/ui/react/components/panels/FilesPanel/index.jsx
// Production-ready FilesPanel with server-integrated file management
//
// Architecture:
// - Files Tab: Shows files available in the current project (from server)
// - Datasets Tab: Shows datasets loaded into client memory (for visualization)
//
// The server is the source of truth for what files exist.
// The client DatasetManager tracks what's loaded for visualization.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
    File,
    X,
    Upload,
    Database,
    Trash2,
    Plus,
    Copy,
    Link as LinkIcon
} from 'lucide-react';

import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { useProjectFiles } from '@UI/react/hooks/useProjectFiles.js';
import { useFileOperations } from './useFileOperations.js';
import { ServerFileList } from './ServerFileList.jsx';
import { FileUploadButton } from './FileUploadButton.jsx';
import { datasetManager, viewConfigurationManager } from '@Init/appInitializer.js';

import './FilesPanel.scss';

/**
 * FilesPanel - Data browser with server-integrated file management
 * 
 * Two tabs:
 * - Datasets: Files loaded into client memory (ready for visualization)
 * - Files: Files available in the project on the server
 * 
 * Features:
 * - Unified search bar that filters based on active tab
 * - Smart loading: if file already loaded, switches to Datasets tab
 * - Tree structure with My/Shared/Inactive folders
 * - Collapsed activity bar state
 * - Server-backed file storage with deduplication
 * - Audit trail for compliance
 */
export function FilesPanel({ isCollapsed = false, onToggle, side = 'left' }) {
    const datasets = useDatasets();

    // Compute counts for activity bar badges
    const counts = useMemo(() => {
        const unique = Array.from(new Map(datasets.map(ds => [ds.id, ds])).values());
        return {
            my: unique.filter(ds => !ds.sharedWith && ds.status !== 'inactive').length,
            shared: unique.filter(ds => ds.sharedWith).length,
            inactive: unique.filter(ds => ds.status === 'inactive').length
        };
    }, [datasets]);

    if (isCollapsed) {
        return (
            <FilesActivityBar
                myCount={counts.my}
                sharedCount={counts.shared}
                inactiveCount={counts.inactive}
                onExpand={onToggle}
            />
        );
    }

    return (
        <FilesPanelExpanded
            datasets={datasets}
            onCollapse={onToggle}
        />
    );
}

// =============================================================================
// ACTIVITY BAR (Collapsed State)
// =============================================================================

function FilesActivityBar({ myCount, sharedCount, inactiveCount, onExpand }) {
    return (
        <div className="files-activity-bar">
            <div className="files-activity-bar__icons">
                <button
                    className="files-activity-bar__icon"
                    title={`My Datasets (${myCount})`}
                    onClick={onExpand}
                >
                    <User size={20} />
                    {myCount > 0 && (
                        <span className="files-activity-bar__badge">{myCount}</span>
                    )}
                </button>
                <button
                    className="files-activity-bar__icon"
                    title={`Shared (${sharedCount})`}
                    onClick={onExpand}
                >
                    <Users size={20} />
                    {sharedCount > 0 && (
                        <span className="files-activity-bar__badge files-activity-bar__badge--shared">
                            {sharedCount}
                        </span>
                    )}
                </button>
                <button
                    className="files-activity-bar__icon"
                    title={`Inactive (${inactiveCount})`}
                    onClick={onExpand}
                >
                    <Archive size={20} />
                </button>
            </div>
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

// =============================================================================
// EXPANDED PANEL
// =============================================================================

function FilesPanelExpanded({ datasets, onCollapse }) {
    // Server files hook
    const {
        files: projectFiles,
        isLoading: filesLoading,
        error: filesError,
        refetch: refetchFiles,
        uploadFile: uploadToServer
    } = useProjectFiles();

    // File operations for loading into client
    const { loadServerFile, findLoadedDataset } = useFileOperations();

    // Tab state
    const [activeTab, setActiveTab] = useState('datasets'); // 'datasets' | 'files'
    const [error, setError] = useState(null);

    // Unified search state - shared across tabs
    const [searchQuery, setSearchQuery] = useState('');

    // Selection state for highlighting
    const [selectedDatasetId, setSelectedDatasetId] = useState(null);

    // Track files being loaded
    const [loadingFileIds, setLoadingFileIds] = useState(new Set());

    // Tree expansion state
    const [expandedFolders, setExpandedFolders] = useState({
        my: true,
        shared: false,
        inactive: false
    });
    const [expandedDatasets, setExpandedDatasets] = useState(new Set());

    // Section resize state
    const [sectionHeights, setSectionHeights] = useState({});

    // Quick Access state
    const [quickAccessOpen, setQuickAccessOpen] = useState(false);
    const [quickAccessTab, setQuickAccessTab] = useState('annotations');

    const isAnyLoading = datasets.some(d => d.isLoading);

    // Deduplicate datasets
    const uniqueDatasets = useMemo(() =>
        Array.from(new Map(datasets.map(ds => [ds.id, ds])).values()),
        [datasets]
    );

    // Filter datasets by search query (when on datasets tab)
    const filteredDatasets = useMemo(() => {
        if (!searchQuery.trim()) return uniqueDatasets;
        const query = searchQuery.toLowerCase();
        return uniqueDatasets.filter(ds =>
            ds.name?.toLowerCase().includes(query) ||
            ds.filename?.toLowerCase().includes(query)
        );
    }, [uniqueDatasets, searchQuery]);

    // Filter project files by search query (when on files tab)
    const filteredProjectFiles = useMemo(() => {
        if (!searchQuery.trim()) return projectFiles;
        const query = searchQuery.toLowerCase();
        return projectFiles.filter(file =>
            file.filename?.toLowerCase().includes(query) ||
            file.name?.toLowerCase().includes(query)
        );
    }, [projectFiles, searchQuery]);

    // Categorize filtered datasets
    const myDatasets = filteredDatasets.filter(ds => !ds.sharedWith && ds.status !== 'inactive');
    const sharedDatasets = filteredDatasets.filter(ds => ds.sharedWith);
    const inactiveDatasets = filteredDatasets.filter(ds => ds.status === 'inactive');

    // Check if a server file is already loaded in client
    const isFileLoaded = useCallback((serverId) => {
        return !!findLoadedDataset(serverId);
    }, [findLoadedDataset]);

    // Request visualization from InstanceManager
    const requestVisualization = useCallback((datasetId, spawnNew = false) => {
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId, spawnNew }
        }));
    }, []);

    // Load a server file into client memory
    const handleLoadServerFile = useCallback(async (serverFile) => {
        setError(null);

        // Check if already loaded
        const existingDataset = findLoadedDataset(serverFile.id);
        if (existingDataset) {
            // Switch to Datasets tab and highlight
            setActiveTab('datasets');
            setSelectedDatasetId(existingDataset.id);
            setSearchQuery('');
            setExpandedFolders(prev => ({ ...prev, my: true }));
            setTimeout(() => setSelectedDatasetId(null), 2000);
            return;
        }

        // Load from server
        setLoadingFileIds(prev => new Set(prev).add(serverFile.id));

        try {
            const datasetId = await loadServerFile(serverFile);
            if (datasetId) {
                setActiveTab('datasets');
                setSelectedDatasetId(datasetId);
                setExpandedFolders(prev => ({ ...prev, my: true }));
                requestVisualization(datasetId, true);
                setTimeout(() => setSelectedDatasetId(null), 2000);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingFileIds(prev => {
                const next = new Set(prev);
                next.delete(serverFile.id);
                return next;
            });
        }
    }, [findLoadedDataset, loadServerFile, requestVisualization]);

    // Handle file upload
    const handleFileUpload = useCallback(async (file) => {
        setError(null);

        try {
            // Upload to server
            const uploadedFile = await uploadToServer(file);

            // Now load into client
            if (uploadedFile) {
                await handleLoadServerFile(uploadedFile);
            }
        } catch (err) {
            setError(err.message);
        }
    }, [uploadToServer, handleLoadServerFile]);

    const handleDatasetClick = useCallback((dataset, event) => {
        if (dataset.isLoading) return;
        setSelectedDatasetId(dataset.id);
        requestVisualization(dataset.id, event.shiftKey);
    }, [requestVisualization]);

    const toggleFolder = useCallback((id) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const toggleDataset = useCallback((id) => {
        setExpandedDatasets(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleSectionResize = useCallback((sectionId, height) => {
        setSectionHeights(prev => ({ ...prev, [sectionId]: height }));
    }, []);

    const clearSearch = useCallback(() => setSearchQuery(''), []);

    // Handle dataset deletion
    const handleDeleteDataset = useCallback(async (datasetId) => {
        setError(null);
        try {
            await datasetManager.removeDataset(datasetId);
            console.log(`✅ Dataset ${datasetId} removed`);
        } catch (err) {
            console.error('Failed to remove dataset:', err);
            setError(`Failed to remove dataset: ${err.message}`);
        }
    }, []);

    // Dynamic placeholder based on active tab
    const searchPlaceholder = activeTab === 'datasets'
        ? 'Filter datasets...'
        : 'Filter files...';

    return (
        <div className="files-panel">
            {/* Header */}
            <div className="files-panel__header">
                <div className="files-panel__title">
                    <FolderOpen size={16} />
                    <span>Data</span>
                </div>
                {onCollapse && (
                    <button
                        className="files-panel__collapse-btn"
                        onClick={onCollapse}
                        title="Collapse panel"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Unified Search Bar - Above tabs, filters based on active tab */}
            <div className="files-panel__search">
                <Search size={14} className="files-panel__search-icon" />
                <input
                    type="text"
                    className="files-panel__search-input"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="files-panel__search-clear"
                        onClick={clearSearch}
                        title="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Toggle Tabs */}
            <div className="files-panel__toggle-tabs">
                <button
                    className={`files-panel__toggle-tab ${activeTab === 'datasets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('datasets')}
                >
                    <Database size={14} />
                    <span>Loaded</span>
                    {uniqueDatasets.length > 0 && (
                        <span className="files-panel__toggle-tab-count">
                            {uniqueDatasets.length}
                        </span>
                    )}
                </button>
                <button
                    className={`files-panel__toggle-tab ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                >
                    <Upload size={14} />
                    <span>Project Files</span>
                    {projectFiles.length > 0 && (
                        <span className="files-panel__toggle-tab-count">
                            {projectFiles.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Error Display */}
            {(error || filesError) && (
                <div className="files-panel__error">
                    <span>{error || filesError}</span>
                    <button onClick={() => setError(null)}>
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className={`files-panel__content ${quickAccessOpen ? 'split' : 'full'}`}>
                {activeTab === 'datasets' ? (
                    <DatasetsView
                        myDatasets={myDatasets}
                        sharedDatasets={sharedDatasets}
                        inactiveDatasets={inactiveDatasets}
                        isAnyLoading={isAnyLoading}
                        searchQuery={searchQuery}
                        selectedDatasetId={selectedDatasetId}
                        expandedFolders={expandedFolders}
                        expandedDatasets={expandedDatasets}
                        sectionHeights={sectionHeights}
                        onToggleFolder={toggleFolder}
                        onToggleDataset={toggleDataset}
                        onDatasetClick={handleDatasetClick}
                        onSectionResize={handleSectionResize}
                        onDeleteDataset={handleDeleteDataset}
                    />
                ) : (
                    <FilesView
                        files={filteredProjectFiles}
                        isLoading={filesLoading}
                        error={filesError}
                        searchQuery={searchQuery}
                        loadingFileIds={loadingFileIds}
                        onLoadFile={handleLoadServerFile}
                        onUploadFile={handleFileUpload}
                        onRefresh={refetchFiles}
                        isFileLoaded={isFileLoaded}
                    />
                )}
            </div>

            {/* Quick Access Panel */}
            {quickAccessOpen ? (
                <QuickAccessPanel
                    activeTab={quickAccessTab}
                    onTabChange={setQuickAccessTab}
                    onClose={() => setQuickAccessOpen(false)}
                />
            ) : (
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

// =============================================================================
// DATASETS VIEW
// =============================================================================

function DatasetsView({
    myDatasets,
    sharedDatasets,
    inactiveDatasets,
    isAnyLoading,
    searchQuery,
    selectedDatasetId,
    expandedFolders,
    expandedDatasets,
    sectionHeights,
    onToggleFolder,
    onToggleDataset,
    onDatasetClick,
    onSectionResize,
    onDeleteDataset
}) {
    const emptyMessage = searchQuery ? 'No matches' : 'No datasets';

    return (
        <div className="files-panel__datasets-view">
            <div className="files-panel__tree">
                {/* My Datasets */}
                <TreeFolder
                    id="my"
                    icon={<User size={18} />}
                    label="My Datasets"
                    count={myDatasets.length}
                    expanded={expandedFolders.my}
                    onToggle={() => onToggleFolder('my')}
                    onResize={onSectionResize}
                    showResizeHandle={true}
                    style={sectionHeights.my ? { flexBasis: sectionHeights.my + 'px' } : undefined}
                >
                    {isAnyLoading && (
                        <div className="tree-item tree-item--loading">
                            <Loader size={14} className="spinner" />
                            <span>Loading...</span>
                        </div>
                    )}
                    {myDatasets.length === 0 && !isAnyLoading ? (
                        <div className="tree-item tree-item--empty">
                            <span>{emptyMessage}</span>
                        </div>
                    ) : (
                        myDatasets.map(dataset => (
                            <DatasetTreeItem
                                key={dataset.id}
                                dataset={dataset}
                                isSelected={dataset.id === selectedDatasetId}
                                expanded={expandedDatasets.has(dataset.id)}
                                onToggle={() => onToggleDataset(dataset.id)}
                                onClick={(e) => onDatasetClick(dataset, e)}
                                onDelete={onDeleteDataset}
                            />
                        ))
                    )}
                </TreeFolder>

                {/* Shared Datasets */}
                <TreeFolder
                    id="shared"
                    icon={<Users size={18} />}
                    label="Shared with Me"
                    badge={sharedDatasets.length > 0 ? sharedDatasets.length : null}
                    expanded={expandedFolders.shared}
                    onToggle={() => onToggleFolder('shared')}
                    onResize={onSectionResize}
                    showResizeHandle={true}
                    style={sectionHeights.shared ? { flexBasis: sectionHeights.shared + 'px' } : undefined}
                    highlighted
                >
                    {sharedDatasets.length === 0 ? (
                        <div className="tree-item tree-item--empty">
                            <span>{searchQuery ? 'No matches' : 'No shared datasets'}</span>
                        </div>
                    ) : (
                        sharedDatasets.map(dataset => (
                            <DatasetTreeItem
                                key={dataset.id}
                                dataset={dataset}
                                isSelected={dataset.id === selectedDatasetId}
                                expanded={expandedDatasets.has(dataset.id)}
                                onToggle={() => onToggleDataset(dataset.id)}
                                onClick={(e) => onDatasetClick(dataset, e)}
                                onDelete={onDeleteDataset}
                            />
                        ))
                    )}
                </TreeFolder>

                {/* Inactive Datasets */}
                <TreeFolder
                    id="inactive"
                    icon={<Archive size={18} />}
                    label="Inactive"
                    count={inactiveDatasets.length}
                    expanded={expandedFolders.inactive}
                    onToggle={() => onToggleFolder('inactive')}
                >
                    {inactiveDatasets.length === 0 ? (
                        <div className="tree-item tree-item--empty">
                            <span>{searchQuery ? 'No matches' : 'No inactive datasets'}</span>
                        </div>
                    ) : (
                        inactiveDatasets.map(dataset => (
                            <DatasetTreeItem
                                key={dataset.id}
                                dataset={dataset}
                                isSelected={dataset.id === selectedDatasetId}
                                expanded={expandedDatasets.has(dataset.id)}
                                onToggle={() => onToggleDataset(dataset.id)}
                                onClick={(e) => onDatasetClick(dataset, e)}
                                onDelete={onDeleteDataset}
                            />
                        ))
                    )}
                </TreeFolder>
            </div>

            <div className="files-panel__hint">
                <span>💡 <strong>Shift+Click</strong> to open in new window</span>
            </div>
        </div>
    );
}

// =============================================================================
// FILES VIEW (Server-backed)
// =============================================================================

function FilesView({
    files,
    isLoading,
    error,
    searchQuery,
    loadingFileIds,
    onLoadFile,
    onUploadFile,
    onRefresh,
    isFileLoaded
}) {
    return (
        <div className="files-panel__files-view">
            {/* Server File List */}
            <ServerFileList
                files={files}
                isLoading={isLoading}
                error={error}
                onLoadFile={onLoadFile}
                onRefresh={onRefresh}
                isFileLoaded={isFileLoaded}
                loadingFileIds={loadingFileIds}
                searchQuery={searchQuery}
            />

            {/* Upload Section */}
            <div className="files-panel__upload-section">
                <FileUploadButton
                    onFileSelect={onUploadFile}
                    disabled={isLoading}
                />
            </div>

            <div className="files-panel__hint">
                <span>💡 Files are stored in the project for team access</span>
            </div>
        </div>
    );
}

// =============================================================================
// TREE COMPONENTS
// =============================================================================

function TreeFolder({
    id,
    icon,
    label,
    count,
    badge,
    expanded,
    onToggle,
    highlighted,
    children,
    onResize,
    showResizeHandle = false,
    style
}) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = React.useRef(0);
    const startHeight = React.useRef(0);
    const folderRef = React.useRef(null);

    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!folderRef.current) return;

        setIsDragging(true);
        dragStartY.current = e.clientY;
        startHeight.current = folderRef.current.offsetHeight;

        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleResizeMove = useCallback((e) => {
        if (!isDragging || !folderRef.current) return;

        const deltaY = e.clientY - dragStartY.current;
        const newHeight = Math.max(100, startHeight.current + deltaY);

        if (onResize) {
            onResize(id, newHeight);
        }
    }, [isDragging, id, onResize]);

    const handleResizeEnd = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);

            return () => {
                window.removeEventListener('mousemove', handleResizeMove);
                window.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isDragging, handleResizeMove, handleResizeEnd]);

    return (
        <div
            ref={folderRef}
            className={`tree-folder ${expanded ? 'tree-folder--expanded' : ''} ${highlighted ? 'tree-folder--highlighted' : ''}`}
            data-folder={id}
            style={style}
        >
            <button className="tree-folder__header" onClick={onToggle}>
                <span className="tree-folder__chevron">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="tree-folder__icon">{icon}</span>
                <span className="tree-folder__label">{label}</span>
                {count !== undefined && (
                    <span className="tree-folder__count">({count})</span>
                )}
                {badge && <span className="tree-folder__badge">{badge}</span>}
            </button>
            {expanded && (
                <div className="tree-folder__children">{children}</div>
            )}
            {expanded && showResizeHandle && (
                <div
                    className={`tree-folder__resize-handle ${isDragging ? 'tree-folder__resize-handle--dragging' : ''}`}
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>
    );
}

function DatasetTreeItem({ dataset, isSelected, expanded, onToggle, onClick, onDelete }) {
    // Get views for this dataset
    const [datasetViews, setDatasetViews] = useState([]);

    useEffect(() => {
        const updateViews = () => {
            const views = viewConfigurationManager.getViewsForDataset(dataset.id);
            setDatasetViews(views.filter(v => v.status !== 'archived'));
        };

        updateViews();

        // Listen for view changes
        const handleViewUpdate = () => updateViews();
        viewConfigurationManager.on('viewAdded', handleViewUpdate);
        viewConfigurationManager.on('viewRemoved', handleViewUpdate);
        viewConfigurationManager.on('viewUpdated', handleViewUpdate);

        return () => {
            viewConfigurationManager.off('viewAdded', handleViewUpdate);
            viewConfigurationManager.off('viewRemoved', handleViewUpdate);
            viewConfigurationManager.off('viewUpdated', handleViewUpdate);
        };
    }, [dataset.id]);

    const hasViews = datasetViews.length > 0;
    const pointCount = dataset.pointCount || 0;
    const dataType = dataset.dataType || 'Unknown';

    const handleDeleteDataset = (e) => {
        e.stopPropagation();
        if (window.confirm(`Remove "${dataset.name}" from loaded datasets?\n\nThis will remove the dataset and all its views.`)) {
            onDelete(dataset.id);
        }
    };

    const handleClearAllViews = (e) => {
        e.stopPropagation();
        if (window.confirm(`Clear all ${datasetViews.length} view(s) for "${dataset.name}"?`)) {
            datasetViews.forEach(view => {
                viewConfigurationManager.deleteView(view.id);
            });
        }
    };

    const handleDeleteView = (e, view) => {
        e.stopPropagation();
        viewConfigurationManager.deleteView(view.id);
    };

    const handleCreateNewView = (e) => {
        e.stopPropagation();
        // Request a new instance for this dataset
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId: dataset.id, spawnNew: true }
        }));
    };

    const handleDuplicateView = (e, view) => {
        e.stopPropagation();
        // Request a new instance with the same view configuration
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId: dataset.id, spawnNew: true, duplicateViewId: view.id }
        }));
    };

    const handleLinkView = (e, view) => {
        e.stopPropagation();
        // Future: implement view linking
        console.log('Link view:', view.id);
    };

    const handleViewClick = (e, view) => {
        e.stopPropagation();
        // Open this specific view
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: { datasetId: dataset.id, viewConfigId: view.id }
        }));
    };

    return (
        <div className={`tree-dataset ${isSelected ? 'tree-dataset--selected' : ''}`}>
            <div className="tree-dataset__row">
                {hasViews && (
                    <button
                        className="tree-dataset__chevron"
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}

                <div className={`tree-item tree-item--dataset tree-item--no-click ${!hasViews ? 'tree-item--no-chevron' : ''}`}>
                    <span className="tree-item__icon">
                        <File size={14} />
                    </span>
                    <div className="tree-item__content">
                        <span className="tree-item__name">{dataset.name}</span>
                        <span className="tree-item__meta">
                            {pointCount.toLocaleString()} points • {dataType}
                            {hasViews && <span className="tree-item__view-count"> • {datasetViews.length} view{datasetViews.length !== 1 ? 's' : ''}</span>}
                        </span>
                    </div>
                    {dataset.isLoading && (
                        <Loader size={12} className="spinner tree-item__spinner" />
                    )}
                </div>
                <button
                    className="tree-dataset__add-view-btn"
                    onClick={handleCreateNewView}
                    title="Create new view"
                >
                    <Plus size={12} />
                </button>
                {hasViews && (
                    <button
                        className="tree-dataset__clear-views-btn"
                        onClick={handleClearAllViews}
                        title="Clear all views"
                    >
                        <X size={12} />
                    </button>
                )}
                <button
                    className="tree-dataset__delete-btn"
                    onClick={handleDeleteDataset}
                    title="Remove dataset and all views"
                >
                    <Trash2 size={12} />
                </button>
            </div>
            {expanded && hasViews && (
                <div className="tree-dataset__views">
                    {datasetViews.map(view => (
                        <div key={view.id} className="tree-view-item"
                            onClick={(e) => handleViewClick(e, view)}
                        >
                            <BookmarkCheck size={12} className="tree-view-item__icon" />
                            <span className="tree-view-item__name">{view.name || 'Untitled View'}</span>
                            <span className="tree-view-item__status">
                                {view.activeInstanceCount > 0 ? (
                                    <span className="tree-view-item__badge tree-view-item__badge--active">
                                        {view.activeInstanceCount} active
                                    </span>
                                ) : (
                                    <span className="tree-view-item__badge tree-view-item__badge--inactive">inactive</span>
                                )}
                            </span>
                            <div className="tree-view-item__actions">
                                <button
                                    className="tree-view-item__action-btn"
                                    onClick={(e) => handleDuplicateView(e, view)}
                                    title="Duplicate this view"
                                >
                                    <Copy size={12} />
                                </button>
                                <button
                                    className="tree-view-item__action-btn"
                                    onClick={(e) => handleLinkView(e, view)}
                                    title="Link this view (coming soon)"
                                >
                                    <LinkIcon size={12} />
                                </button>
                                <button
                                    className="tree-view-item__action-btn tree-view-item__action-btn--delete"
                                    onClick={(e) => handleDeleteView(e, view)}
                                    title="Delete this view"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// QUICK ACCESS PANEL
// =============================================================================

function QuickAccessPanel({ activeTab, onTabChange, onClose }) {
    // Get saved views grouped by dataset
    const [savedViewsByDataset, setSavedViewsByDataset] = useState({});

    useEffect(() => {
        if (activeTab !== 'views') return;

        const updateSavedViews = () => {
            const allViews = Array.from(viewConfigurationManager._viewConfigs.values());

            // Only show saved views
            const savedViews = allViews.filter(v => v.savedByUser && v.status !== 'archived');

            // Group by dataset
            const grouped = {};
            savedViews.forEach(view => {
                const datasetId = view.datasetId;
                if (!grouped[datasetId]) {
                    const dataset = datasetManager.getDataset(datasetId);
                    grouped[datasetId] = {
                        dataset: dataset,
                        views: []
                    };
                }
                grouped[datasetId].views.push(view);
            });

            // Sort views within each dataset by creation time
            Object.values(grouped).forEach(group => {
                group.views.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
            });

            setSavedViewsByDataset(grouped);
        };

        updateSavedViews();

        // Listen for view changes
        const handleViewUpdate = () => updateSavedViews();
        viewConfigurationManager.on('viewAdded', handleViewUpdate);
        viewConfigurationManager.on('viewRemoved', handleViewUpdate);
        viewConfigurationManager.on('viewUpdated', handleViewUpdate);

        return () => {
            viewConfigurationManager.off('viewAdded', handleViewUpdate);
            viewConfigurationManager.off('viewRemoved', handleViewUpdate);
            viewConfigurationManager.off('viewUpdated', handleViewUpdate);
        };
    }, [activeTab]);

    return (
        <div className="files-panel__quick-access">
            <div className="quick-access__header">
                <span className="quick-access__title">Quick Access</span>
                <button
                    className="quick-access__close-btn"
                    onClick={onClose}
                    title="Close Quick Access"
                >
                    <ChevronDown size={14} />
                </button>
            </div>
            <div className="quick-access__tabs">
                <button
                    className={`quick-access__tab ${activeTab === 'annotations' ? 'active' : ''}`}
                    onClick={() => onTabChange('annotations')}
                >
                    <Search size={16} />
                    <span>Annotations</span>
                </button>
                <button
                    className={`quick-access__tab ${activeTab === 'filters' ? 'active' : ''}`}
                    onClick={() => onTabChange('filters')}
                >
                    <FilterIcon size={16} />
                    <span>Filters</span>
                </button>
                <button
                    className={`quick-access__tab ${activeTab === 'views' ? 'active' : ''}`}
                    onClick={() => onTabChange('views')}
                >
                    <BookmarkCheck size={16} />
                    <span>Saved Views</span>
                </button>
            </div>
            <div className="quick-access__content">
                {activeTab === 'annotations' && (
                    <div className="quick-access__placeholder">
                        <Search size={32} />
                        <div>Search annotations across datasets</div>
                    </div>
                )}
                {activeTab === 'filters' && (
                    <div className="quick-access__placeholder">
                        <FilterIcon size={32} />
                        <div>Saved filter configurations</div>
                    </div>
                )}
                {activeTab === 'views' && (
                    <div className="quick-access__views">
                        {Object.keys(savedViewsByDataset).length === 0 ? (
                            <div className="quick-access__placeholder">
                                <BookmarkCheck size={32} />
                                <div>No saved views</div>
                                <div style={{ fontSize: '12px', marginTop: '8px', color: 'var(--color-text-tertiary)' }}>
                                    Save views from the context menu to see them here
                                </div>
                            </div>
                        ) : (
                            Object.entries(savedViewsByDataset).map(([datasetId, { dataset, views }]) => (
                                <div key={datasetId} className="quick-access__dataset-group">
                                    <div className="quick-access__dataset-header">
                                        <File size={14} />
                                        <span>{dataset?.filename || 'Unknown Dataset'}</span>
                                        <span className="quick-access__view-count">({views.length})</span>
                                    </div>

                                    <div className="quick-access__view-list">
                                        {views.map(view => (
                                            <div key={view.id} className="quick-access__view-item">
                                                <BookmarkCheck size={12} />
                                                <span className="quick-access__view-name">{view.name || 'Untitled View'}</span>
                                                <span className="quick-access__view-status">
                                                    {view.activeInstanceCount > 0 ? `${view.activeInstanceCount} active` : 'inactive'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}