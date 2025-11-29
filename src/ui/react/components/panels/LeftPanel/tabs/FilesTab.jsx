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

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';

import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from "@UI/react/components/common/ResizableSections";
import { useProjectFiles } from '@UI/react/hooks/useProjectFiles.js';
import { instanceTypeRegistry } from '@Core/instances/types/instanceTypeRegistry.js';
import { getHandlerForFileType, getFileTypeDisplayInfo } from '@Core/instances/types/instanceTypesInit.js';
import * as LucideIcons from 'lucide-react';


// =============================================================================
// FILE UTILITIES (Type-agnostic) - MUST BE HERE, BEFORE COMPONENTS
// =============================================================================

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
};

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
// CONTEXT MENU
// =============================================================================

function ContextMenu({ x, y, onClose, onAction, file }) {
    const menuItems = [
        { id: 'open', icon: Eye, label: 'Load in Instance' },
        { id: 'info', icon: Info, label: 'File Details...' },
        { divider: true },
        { id: 'rename', icon: Pencil, label: 'Rename...' },
        { id: 'star', icon: Star, label: file?.starred ? 'Unstar' : 'Star' },
    ];

    return (
        <>
            <div className="context-menu-backdrop" onClick={onClose} />
            <div className="context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
                {menuItems.map((item, index) =>
                    item.divider ? (
                        <div key={index} className="context-menu__divider" />
                    ) : (
                        <button
                            key={item.id}
                            className="context-menu__item"
                            onClick={() => { onAction(item.id, file); onClose(); }}
                        >
                            <item.icon size={12} />
                            <span>{item.label}</span>
                        </button>
                    )
                )}
            </div>
        </>
    );
}

// =============================================================================
// FILE ITEM - LIST VIEW
// =============================================================================

function FileItemList({ file, depth = 0, isSelected, onSelect, onStar, onDragStart, onContextMenu, expandedFolders, onToggleFolder }) {
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
                {file.loaded && <Circle size={6} fill="currentColor" className="status-indicator__dot--active" />}
                <span className="item-meta">{isFolder ? `${file.children?.length || 0}` : file.size}</span>
            </div>
            {isFolder && isExpanded && file.children?.map(child => (
                <FileItemList key={child.id} file={child} depth={depth + 1} isSelected={isSelected} onSelect={onSelect} onStar={onStar} onDragStart={onDragStart} onContextMenu={onContextMenu} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} />
            ))}
        </>
    );
}

// =============================================================================
// FILE ITEM - GRID VIEW
// =============================================================================

function FileItemGrid({ file, isSelected, onSelect, onStar, onDragStart, onContextMenu }) {
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

export function FilesPanelContent({ workspaceId }) {
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
        recent: { expanded: false, flexGrow: 1 },
        all: { expanded: true, flexGrow: 2 },
    });

    // Context menu and drag state
    const [contextMenu, setContextMenu] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    // Fetch files from server
    const { files: serverFiles, isLoading, error, refetch, uploadFile } = useProjectFiles();

    // Transform server files to UI format
    const files = useMemo(() => {
        if (!serverFiles || serverFiles.length === 0) return [];

        return serverFiles.map(file => ({
            id: file.id,
            name: file.name || file.filename,
            fileType: file.fileType,  // Pass through server-provided type
            size: formatFileSize(file.size),
            starred: false,
            loaded: false,
            thumbnail: canVisualize(file.fileType),
            date: file.uploadedAt,
            isFolder: false,
        }));
    }, [serverFiles]);

    const starredFiles = useMemo(() => {
        return files.filter(f => f.starred);
    }, [files]);


    const recentFiles = useMemo(() => {
        // Sort by date and take most recent 4
        return [...files]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4);
    }, [files]);


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

    const handleStar = useCallback((id) => console.log('Toggle star:', id), []);
    const handleDragStart = useCallback((e, file) => {
        e.dataTransfer.setData('application/json', JSON.stringify(file));
        e.dataTransfer.effectAllowed = 'copy';
    }, []);
    const handleContextMenu = useCallback((e, file) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    }, []);
    const handleContextAction = useCallback((action, file) => console.log('Context action:', action, file), []);
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
                        <FileItemGrid key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} />
                    ))}
                </div>
            );
        }
        return items.map(file => (
            <FileItemList key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} />
        ));
    }, [viewMode, selectedFileId, expandedFolders, handleStar, handleDragStart, handleContextMenu, toggleFolder]);

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

                <ResizableSection id="recent" icon={Clock} iconColorClass="icon-teal" label="Recent" count={recentFiles.length}>
                    {recentFiles.length > 0 ? (
                        renderFileItems(recentFiles)
                    ) : (
                        <div className="resizable-section__empty">No recent files</div>
                    )}
                </ResizableSection>

                <ResizableSection id="all" icon={Folder} iconColorClass="icon-blue" label="All Files" count={files.length}>
                    {files.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="files-grid">
                                {files.filter(f => f.type !== 'folder').map(file => (
                                    <FileItemGrid key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} />
                                ))}
                            </div>
                        ) : (
                            files.map(file => (
                                <FileItemList key={file.id} file={file} isSelected={selectedFileId === file.id} onSelect={setSelectedFileId} onStar={handleStar} onDragStart={handleDragStart} onContextMenu={handleContextMenu} expandedFolders={expandedFolders} onToggleFolder={toggleFolder} />
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
                                            console.error('Upload failed:', err);
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