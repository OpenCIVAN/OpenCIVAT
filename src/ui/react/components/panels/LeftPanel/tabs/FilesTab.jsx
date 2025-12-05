// src/ui/react/components/panels/LeftPanel/tabs/FilesTab.jsx
// Files tab content for the unified left panel
//
// Features:
// - List and grid view modes with thumbnails
// - Starred, Recent, and All Files sections (VS Code-style resizable)
// - Nested folder support
// - Drag-and-drop for loading files
// - Context menu for file actions
// - Search and filter capabilities
// - Footer anchored to bottom

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ui as log } from "@Utils/logger.js";
import {
    FolderOpen,
    FolderPlus,
    Search,
    X,
    List,
    Grid3X3,
    ArrowUpDown,
    Filter,
    Star,
    Clock,
    Folder,
    ChevronDown,
    ChevronRight,
    GripVertical,
    Upload,
    RefreshCw,
    Box,
    Database,
    FileCode,
    FileText,
    Circle,
    MoreHorizontal,
    Eye,
    Info,
    Pencil,
    Loader,
    Cpu,
} from 'lucide-react';

import { useComputeJobs } from '@UI/react/hooks/useComputeJobs.js';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { config } from '@Core/config/clientConfig.js';

import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { useProjectFiles } from '@UI/react/hooks/useProjectFiles.js';
import { instanceTypeRegistry } from '@Core/instances/types/instanceTypeRegistry.js';
import { getHandlerForFileType, getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import { formatFileSize } from '@Utils/formatters.js';
import * as LucideIcons from 'lucide-react';


// =============================================================================
// FILE UTILITIES (Type-agnostic) - MUST BE HERE, BEFORE COMPONENTS
// =============================================================================

const canVisualize = (fileType) => {
    if (!fileType) return false;
    return getHandlerForFileType(fileType) !== null;
};

const getFileTypeConfig = (file) => {
    if (file.isFolder) {
        return { icon: LucideIcons.Folder, colorClass: 'file-icon--folder', color: null };
    }

    const displayInfo = getFileTypeDisplayInfo(file.fileType);

    if (displayInfo) {
        // Get icon component from Lucide by name
        const iconName = displayInfo.icon.charAt(0).toUpperCase() + displayInfo.icon.slice(1);
        const IconComponent = LucideIcons[iconName] || LucideIcons.Box;

        return {
            icon: IconComponent,
            color: displayInfo.color,  // Use inline style for color
            colorClass: null,
        };
    }

    return { icon: LucideIcons.FileText, colorClass: 'file-icon--default', color: null };
};

// =============================================================================
// CONTEXT MENU (with submenu support)
// =============================================================================

function ContextMenu({ x, y, onClose, onAction, file }) {
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [operations, setOperations] = useState([]);
    const [loadingOps, setLoadingOps] = useState(false);

    // Fetch available operations when Process submenu is hovered
    useEffect(() => {
        if (activeSubmenu !== 'process' || !file) return;

        const fetchOperations = async () => {
            setLoadingOps(true);
            try {
                // Get handler type from file type
                const handler = getHandlerForFileType(file.fileType);
                if (!handler) {
                    setOperations([]);
                    return;
                }

                const handlerType = handler.id || 'vtk';
                const url = new URL(`${config.apiBaseUrl}/compute/operations`);
                url.searchParams.set('handlerType', handlerType);
                url.searchParams.set('fileType', file.fileType);

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setOperations(data.operations || []);
                } else {
                    setOperations([]);
                }
            } catch (err) {
                log.error('Failed to fetch operations:', err);
                setOperations([]);
            } finally {
                setLoadingOps(false);
            }
        };

        fetchOperations();
    }, [activeSubmenu, file]);

    const menuItems = [
        { id: 'open', icon: Eye, label: 'Load in Instance' },
        { id: 'info', icon: Info, label: 'File Details...' },
        { divider: true },
        { id: 'process', icon: Cpu, label: 'Process', hasSubmenu: true },
        { divider: true },
        { id: 'rename', icon: Pencil, label: 'Rename...' },
        { id: 'star', icon: Star, label: file?.starred ? 'Unstar' : 'Star' },
    ];

    const handleMouseEnter = (itemId) => {
        if (itemId === 'process') {
            setActiveSubmenu('process');
        } else {
            setActiveSubmenu(null);
        }
    };

    return createPortal(
        <>
            <div className="context-menu-backdrop" onClick={onClose} />
            <div className="context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
                {menuItems.map((item, index) =>
                    item.divider ? (
                        <div key={index} className="context-menu__divider" />
                    ) : (
                        <div
                            key={item.id}
                            className="context-menu__item-wrapper"
                            onMouseEnter={() => handleMouseEnter(item.id)}
                        >
                            <button
                                className={`context-menu__item ${item.hasSubmenu ? 'has-submenu' : ''}`}
                                onClick={() => {
                                    if (!item.hasSubmenu) {
                                        onAction(item.id, file);
                                        onClose();
                                    }
                                }}
                            >
                                <item.icon size={12} />
                                <span>{item.label}</span>
                                {item.hasSubmenu && <ChevronRight size={10} className="submenu-arrow" />}
                            </button>

                            {/* Process submenu */}
                            {item.id === 'process' && activeSubmenu === 'process' && (
                                <div className="context-menu__submenu">
                                    {loadingOps ? (
                                        <div className="context-menu__item context-menu__item--loading">
                                            <Loader size={12} className="spin" />
                                            <span>Loading...</span>
                                        </div>
                                    ) : operations.length === 0 ? (
                                        <div className="context-menu__item context-menu__item--disabled">
                                            <span>No operations available</span>
                                        </div>
                                    ) : (
                                        operations.map(op => (
                                            <button
                                                key={op.id}
                                                className="context-menu__item"
                                                onClick={() => {
                                                    onAction('process', file, op);
                                                    onClose();
                                                }}
                                            >
                                                <span>{op.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </>,
        document.body
    );
}

// =============================================================================
// FILE ITEM - LIST VIEW
// =============================================================================

function FileItemList({ file, depth = 0, isSelected, onSelect, onStar, onDragStart, onContextMenu, onMenuClick, onDoubleClick, expandedFolders, onToggleFolder }) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, colorClass, color } = getFileTypeConfig(file);
    const isFolder = file.type === 'folder';
    const isExpanded = expandedFolders?.has(file.id);

    return (
        <>
            <div
                className={`tree-item ${isFolder ? 'tree-item--folder' : 'tree-item--file'} ${isSelected ? 'selected' : ''} ${file.loaded ? 'loaded' : ''}`}
                style={{ paddingLeft: 8 + (depth * 16) }}
                draggable={!isFolder}
                onDragStart={(e) => !isFolder && onDragStart?.(e, file)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => isFolder ? onToggleFolder(file.id) : onSelect(file.id)}
                onDoubleClick={(e) => { if (!isFolder) { e.stopPropagation(); onDoubleClick?.(file); } }}
                onContextMenu={(e) => !isFolder && onContextMenu?.(e, file)}
            >
                {isFolder ? (
                    <span className="chevron">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                ) : (
                    <GripVertical size={10} className="drag-handle" style={{ opacity: isHovered ? 0.6 : 0 }} />
                )}
                <TypeIcon size={14} style={color ? { color } : undefined} className={colorClass || ''} />
                <span className="item-name">{file.name}</span>
                {!isFolder && (isHovered || file.starred) && (
                    <button className={`star-btn ${file.starred ? 'star-btn--starred' : ''}`} onClick={(e) => { e.stopPropagation(); onStar(file.id); }}>
                        <Star size={10} fill={file.starred ? 'currentColor' : 'none'} />
                    </button>
                )}
                {!isFolder && isHovered && (
                    <button className="menu-btn" onClick={(e) => onMenuClick?.(e, file)} title="More actions">
                        <MoreHorizontal size={12} />
                    </button>
                )}
                {file.loaded && <Circle size={6} fill="currentColor" className="status-indicator__dot--active" />}
                <span className="item-meta">{isFolder ? `${file.children?.length || 0}` : file.size}</span>
            </div>
            {isFolder && isExpanded && file.children?.map(child => (
                <FileItemList key={child.id} file={child} depth={depth + 1} isSelected={isSelected} onSelect={onSelect} onStar={onStar} onDragStart={onDragStart} onContextMenu={onContextMenu} onMenuClick={onMenuClick} onDoubleClick={onDoubleClick} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} />
            ))}
        </>
    );
}

// =============================================================================
// FILE ITEM - GRID VIEW
// =============================================================================

function FileItemGrid({ file, isSelected, onSelect, onStar, onDragStart, onContextMenu, onMenuClick, onDoubleClick }) {
    const [isHovered, setIsHovered] = useState(false);
    const { icon: TypeIcon, colorClass, color } = getFileTypeConfig(file);

    if (file.type === 'folder') return null;

    return (
        <div
            className={`file-card ${isSelected ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => onDragStart?.(e, file)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(file.id)}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(file); }}
            onContextMenu={(e) => onContextMenu?.(e, file)}
        >
            <div className="thumbnail">
                {file.thumbnail ? (
                    <div className="thumbnail__preview" style={{ background: `linear-gradient(135deg, var(--thumbnail-color, rgba(96,165,250,0.2)) 0%, transparent 100%)` }}>
                        <TypeIcon size={20} style={color ? { color, opacity: 0.7 } : { opacity: 0.7 }} className={colorClass || ''} />
                    </div>
                ) : (
                    <TypeIcon size={20} style={color ? { color, opacity: 0.5 } : { opacity: 0.5 }} className={colorClass || ''} />
                )}
                <div className="thumbnail-actions" style={{ opacity: isHovered ? 1 : 0 }}>
                    <button className="thumbnail-action" onClick={(e) => { e.stopPropagation(); onStar(file.id); }}>
                        <Star size={10} fill={file.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button className="thumbnail-action" onClick={(e) => onMenuClick?.(e, file)} title="More actions">
                        <MoreHorizontal size={10} />
                    </button>
                </div>
            </div>
            <div className="file-name">{file.name}</div>
            <div className="file-size">{file.size}</div>
        </div>
    );
}

// =============================================================================
// MAIN FILES TAB CONTENT
// =============================================================================

export function FilesPanelContent({
    workspaceId,
    // Optional mock data injection (for Storybook)
    mockFiles = null,
    mockFolders = null,
    mockStarredIds = null,
    mockIsLoading = null,
    mockError = null,
}) {
    // View state
    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState({ types: [] });

    // Selection and expansion state
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set([1]));

    // Section states (VS Code-style)
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates({
        starred: { expanded: true, flexGrow: 1 },
        loaded: { expanded: true, flexGrow: 1 },
        all: { expanded: true, flexGrow: 2 },
    });

    // Context menu and drag state
    const [contextMenu, setContextMenu] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Fetch files from server (hook call)
    const { files: hookFiles, isLoading: hookLoading, error: hookError, refetch, uploadFile, toggleStar } = useProjectFiles();

    // Compute jobs hook
    const { submitJob } = useComputeJobs();

    // Loaded datasets from DatasetManager
    const loadedDatasets = useDatasets();

    // Use mock data if provided, otherwise use hook data
    const serverFiles = mockFiles ?? hookFiles;
    const isLoading = mockIsLoading ?? hookLoading;
    const error = mockError ?? hookError;

    // Transform server files to UI format
    const files = useMemo(() => {
        if (!serverFiles || serverFiles.length === 0) return [];

        return serverFiles.map(file => ({
            id: file.id,
            name: file.name || file.filename,
            fileType: file.fileType,
            // Use sizeFormatted from hook, fall back to formatting size, fall back to raw
            size: file.sizeFormatted || (typeof file.size === 'number' ? formatFileSize(file.size) : file.size) || '',
            starred: mockStarredIds ? mockStarredIds.has(file.id) : (file.starred ?? false),
            loaded: file.loaded ?? false,
            thumbnail: file.thumbnail ?? canVisualize(file.fileType),
            date: file.uploadedAt,
            isFolder: false,
        }));
    }, [serverFiles, mockStarredIds]);

    // The key change is:
    // OLD: size: typeof file.size === 'string' ? file.size : formatFileSize(file.size)
    // NEW: size: file.sizeFormatted || (typeof file.size === 'number' ? formatFileSize(file.size) : file.size) || ''

    // This handles three cases:
    // 1. Hook already formatted it → use sizeFormatted
    // 2. Raw number from server → format it
    // 3. Already a string → use as-is

    const starredFiles = useMemo(() => {
        return files.filter(f => f.starred);
    }, [files]);


    // Transform loaded datasets to file-like format for display
    const loadedDatasetsFormatted = useMemo(() => {
        return loadedDatasets.map(ds => ({
            id: ds.id,
            name: ds.name,
            fileType: ds.fileType,
            size: ds.pointCount ? `${ds.pointCount.toLocaleString()} pts` : '',
            starred: false,
            loaded: true,
            thumbnail: true,
            date: ds.uploadedAt,
            isFolder: false,
            isDataset: true, // Flag to indicate this is a loaded dataset
        }));
    }, [loadedDatasets]);


    const loadedCount = useMemo(() => {
        return files.filter(f => f.loaded).length;
    }, [files]);


    // Get all supported file types from registered handlers
    const supportedFileTypes = useMemo(() => {
        const handlers = instanceTypeRegistry.getAvailableHandlers();
        const types = new Set();

        handlers.forEach(({ handler }) => {
            const supported = handler.getSupportedFileTypes();
            supported.forEach(t => types.add(t.extension));
        });

        return Array.from(types);
    }, []);


    // Handlers
    const toggleFolder = useCallback((id) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleStar = useCallback(async (id) => {
        try {
            await toggleStar('file', id);
            log.debug('Toggled star for file:', id);
        } catch (err) {
            log.error('Failed to toggle star:', err);
        }
    }, [toggleStar]);

    const handleDragStart = useCallback((e, file) => {
        e.dataTransfer.setData('application/json', JSON.stringify(file));
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    // Double-click to open file in instance
    const handleDoubleClick = useCallback((file) => {
        log.info(`Double-click to open: ${file.name}`);
        window.dispatchEvent(new CustomEvent('cia:request-instance', {
            detail: {
                datasetId: file.id,
                fileId: file.id,
                fileName: file.name,
            }
        }));
    }, []);

    const handleContextMenu = useCallback((e, file) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    }, []);

    // Menu button click handler (shows menu at button position)
    const handleMenuClick = useCallback((e, file) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenu({ x: rect.right, y: rect.top, file });
    }, []);

    const handleContextAction = useCallback(async (action, file, operation) => {
        log.debug('Context action:', action, file, operation);

        switch (action) {
            case 'open':
                // Dispatch request to create/open instance with this file
                // Note: file.id is the server file ID, which equals dataset.id after sync
                log.info(`Opening file in instance: ${file.name}`);
                window.dispatchEvent(new CustomEvent('cia:request-instance', {
                    detail: {
                        datasetId: file.id,  // file.id === dataset.id after syncDatasetsFromServer
                        fileId: file.id,     // Also provide as fileId for clarity
                        fileName: file.name,
                    }
                }));
                break;

            case 'info':
                // TODO: Show file details dialog
                log.info(`Show details for: ${file.name}`);
                break;

            case 'rename':
                // TODO: Show rename dialog
                log.info(`Rename file: ${file.name}`);
                break;

            case 'star':
                await handleStar(file.id);
                break;

            case 'process':
                if (operation) {
                    try {
                        log.info(`Submitting ${operation.id} job for file ${file.id}`);
                        await submitJob(
                            file.id,
                            operation.id,
                            operation.defaultParams || {},
                            { fileName: file.name }
                        );
                    } catch (err) {
                        log.error('Failed to submit compute job:', err);
                    }
                }
                break;

            default:
                log.warn(`Unknown context action: ${action}`);
        }
    }, [submitJob, handleStar]);
    const toggleTypeFilter = useCallback((type) => {
        setActiveFilters(prev => ({
            ...prev,
            types: prev.types.includes(type) ? prev.types.filter(t => t !== type) : [...prev.types, type]
        }));
    }, []);

    // Render helpers
    const renderFileItems = useCallback((items) => {
        if (viewMode === 'grid') {
            return (
                <div className="files-grid">
                    {items.map(file => (
                        <FileItemGrid key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} onMenuClick={handleMenuClick} onDoubleClick={handleDoubleClick} />
                    ))}
                </div>
            );
        }
        return items.map(file => (
            <FileItemList key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} onMenuClick={handleMenuClick} onDoubleClick={handleDoubleClick} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} />
        ));
    }, [viewMode, selectedFileId, expandedFolders, handleStar, handleDragStart, handleContextMenu, handleMenuClick, handleDoubleClick, toggleFolder]);

    return (
        <div className="files-tab">
            {/* Header */}
            <div className="panel-header">
                <FolderOpen size={14} className="panel-header__icon file-icon--nifti" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__actions">
                    <button className="panel-header__action-btn" title="New Folder"><FolderPlus size={14} /></button>
                </div>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search files..." />
                    {searchQuery && <button className="clear-button" onClick={() => setSearchQuery('')}><X size={10} /></button>}
                </div>
            </div>

            {/* Toolbar */}
            <div className="panel-toolbar">
                <div className="panel-toolbar__group">
                    <button className={`panel-toolbar__toggle ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view"><List size={11} /></button>
                    <button className={`panel-toolbar__toggle ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view"><Grid3X3 size={11} /></button>
                </div>
                <button className="filter-toggle"><ArrowUpDown size={9} /><span>Date</span></button>
                <div className="panel-toolbar__spacer" />
                <button className={`filter-toggle ${showFilters || activeFilters.types.length > 0 ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={9} />
                    {activeFilters.types.length > 0 && <span className="count">{activeFilters.types.length}</span>}
                </button>
                <span className="panel-toolbar__info"><strong>{loadedCount}</strong> loaded</span>
            </div>

            {/* Loading indicator */}
            {isLoading && (
                <div className="panel-loading">
                    <Loader size={16} className="spin" />
                    <span>Loading files...</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="panel-error">
                    <span>Failed to load files: {error}</span>
                    <button onClick={refetch}>Retry</button>
                </div>
            )}

            {/* Filters panel */}
            {showFilters && (
                <div className="panel-filters">
                    <div className="panel-filters__row">
                        {supportedFileTypes.map(type => (
                            <button
                                key={type}
                                className={`filter-toggle ${activeFilters.types.includes(type) ? 'active' : ''}`}
                                onClick={() => toggleTypeFilter(type)}
                            >
                                {type.toUpperCase()}
                            </button>
                        ))}
                        {activeFilters.types.length > 0 && (
                            <button className="panel-filters__clear" onClick={() => setActiveFilters({ types: [] })}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}


            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                <ResizableSection id="starred" icon={Star} iconColorClass="icon-amber" label="Starred" count={starredFiles.length}>
                    {starredFiles.length > 0 ? (
                        renderFileItems(starredFiles)
                    ) : (
                        <div className="resizable-section__empty">No starred items</div>
                    )}
                </ResizableSection>

                <ResizableSection id="loaded" icon={Database} iconColorClass="icon-teal" label="Loaded Datasets" count={loadedDatasetsFormatted.length}>
                    {loadedDatasetsFormatted.length > 0 ? (
                        renderFileItems(loadedDatasetsFormatted)
                    ) : (
                        <div className="resizable-section__empty">No datasets loaded</div>
                    )}
                </ResizableSection>

                <ResizableSection id="all" icon={Folder} iconColorClass="icon-blue" label="All Files" count={files.length}>
                    {files.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="files-grid">
                                {files.filter(f => f.type !== 'folder').map(file => (
                                    <FileItemGrid key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} onMenuClick={handleMenuClick} onDoubleClick={handleDoubleClick} />
                                ))}
                            </div>
                        ) : (
                            files.map(file => (
                                <FileItemList key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} onMenuClick={handleMenuClick} onDoubleClick={handleDoubleClick} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} />
                            ))
                        )
                    ) : (
                        <div className="resizable-section__empty">No files uploaded</div>
                    )}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer - Always anchored to bottom */}
            <div className="panel-footer" onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}>
                {isDragOver ? (
                    <div className="panel-footer__dropzone"><Upload size={16} /><span>Drop to upload</span></div>
                ) : (
                    <>
                        <button
                            className="panel-footer__btn panel-footer__btn--primary"
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.vtp,.vtk,.nii,.nii.gz,.dcm';
                                input.onchange = async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        try {
                                            await uploadFile(file);
                                            refetch();
                                        } catch (err) {
                                            log.error('Upload failed:', err);
                                        }
                                    }
                                };
                                input.click();
                            }}
                        >
                            <Upload size={11} /><span>Upload</span>
                        </button>

                        <button className="panel-footer__btn panel-footer__btn--icon" title="Refresh"><RefreshCw size={11} /></button>
                    </>
                )}
            </div>

            {/* Context menu */}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} onClose={() => setContextMenu(null)} onAction={handleContextAction} />}
        </div>
    );
}

export default FilesPanelContent;