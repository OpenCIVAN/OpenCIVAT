/**
 * @file FilesTab.jsx
 * @description Project file storage and organization tab.
 * Upload, browse, organize, version, and prepare files for use.
 *
 * Features:
 * - Grid and list view modes with thumbnails
 * - Starred, Recent, and All Files sections (resizable)
 * - Nested folder support with drag-and-drop
 * - Context menu for file actions
 * - Upload dropzone with progress
 * - File state indicators (stored, loading, loaded, processing, error)
 *
 * Three-layer model:
 * - Files = Supply closet (all files in storage)
 * - Datasets = Palette (files loaded into memory)
 * - Views = Easel (what's on canvas)
 *
 * @see Left_Panel_Design_Specification.docx - Section 4 Files Tab
 *
 * @example
 * <FilesTab workspaceId="ws-1" />
 */

import React, { useCallback } from 'react';
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
    Folder,
    Database,
    Loader,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
} from '@UI/react/components/common/ResizableSections';
import { useFilesTab } from './hooks/useFilesTab';
import { FileItemList, FileItemGrid } from './components/FileItem';
import { FileContextMenu } from './components/FileContextMenu';
import { UploadDropzone } from './components/UploadDropzone';
import './FilesTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} FilesPanelContentProps
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockFiles] - Mock files for testing
 * @property {Set} [mockStarredIds] - Mock starred IDs for testing
 * @property {boolean} [mockIsLoading] - Mock loading state
 * @property {string} [mockError] - Mock error state
 */

/**
 * Files tab panel content component.
 *
 * @param {FilesPanelContentProps} props - Component props
 * @returns {React.ReactElement} The rendered panel content
 */
export function FilesPanelContent({
    workspaceId,
    mockFiles = null,
    mockStarredIds = null,
    mockIsLoading = null,
    mockError = null,
}) {
    const {
        // View state
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        showFilters,
        setShowFilters,
        activeFilters,
        toggleTypeFilter,
        clearFilters,

        // Selection
        selectedFileId,
        setSelectedFileId,
        expandedFolders,
        toggleFolder,

        // Section states
        sectionStates,
        toggleSection,
        resizeSection,

        // Context menu
        contextMenu,
        handleContextMenu,
        handleMenuClick,
        closeContextMenu,
        handleContextAction,

        // Upload
        isDragOver,
        setIsDragOver,
        handleUpload,

        // Files data
        files,
        starredFiles,
        loadedDatasetsFormatted,
        loadedCount,
        supportedFileTypes,
        isLoading,
        error,

        // Actions
        handleStar,
        handleDragStart,
        handleDoubleClick,
        refetch,
    } = useFilesTab({
        workspaceId,
        mockFiles,
        mockStarredIds,
        mockIsLoading,
        mockError,
    });

    // Render file items based on view mode
    const renderFileItems = useCallback(
        (items) => {
            if (viewMode === 'grid') {
                return (
                    <div className="files-grid">
                        {items.map((file) => (
                            <FileItemGrid
                                key={file.id}
                                file={file}
                                isSelected={selectedFileId === file.id}
                                onSelect={setSelectedFileId}
                                onStar={handleStar}
                                onDragStart={handleDragStart}
                                onContextMenu={handleContextMenu}
                                onMenuClick={handleMenuClick}
                                onDoubleClick={handleDoubleClick}
                            />
                        ))}
                    </div>
                );
            }
            return items.map((file) => (
                <FileItemList
                    key={file.id}
                    file={file}
                    isSelected={selectedFileId === file.id}
                    onSelect={setSelectedFileId}
                    onStar={handleStar}
                    onDragStart={handleDragStart}
                    onContextMenu={handleContextMenu}
                    onMenuClick={handleMenuClick}
                    onDoubleClick={handleDoubleClick}
                    expandedFolders={expandedFolders}
                    onToggleFolder={toggleFolder}
                />
            ));
        },
        [
            viewMode,
            selectedFileId,
            expandedFolders,
            handleStar,
            handleDragStart,
            handleContextMenu,
            handleMenuClick,
            handleDoubleClick,
            setSelectedFileId,
            toggleFolder,
        ]
    );

    return (
        <div className="files-tab">
            {/* Header */}
            <div className="panel-header panel-header--orange">
                <FolderOpen size={14} className="panel-header__icon" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__actions">
                    <button className="panel-header__action-btn" title="New Folder">
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Search size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files..."
                    />
                    {searchQuery && (
                        <button className="clear-button" onClick={() => setSearchQuery('')}>
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="panel-toolbar">
                <div className="panel-toolbar__group">
                    <button
                        className={`panel-toolbar__toggle ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List view"
                    >
                        <List size={11} />
                    </button>
                    <button
                        className={`panel-toolbar__toggle ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                    >
                        <Grid3X3 size={11} />
                    </button>
                </div>
                <button className="filter-toggle">
                    <ArrowUpDown size={9} />
                    <span>Date</span>
                </button>
                <div className="panel-toolbar__spacer" />
                <button
                    className={`filter-toggle ${showFilters || activeFilters.types.length > 0 ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={9} />
                    {activeFilters.types.length > 0 && (
                        <span className="count">{activeFilters.types.length}</span>
                    )}
                </button>
                <span className="panel-toolbar__info">
                    <strong>{loadedCount}</strong> loaded
                </span>
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
                        {supportedFileTypes.map((type) => (
                            <button
                                key={type}
                                className={`filter-toggle ${activeFilters.types.includes(type) ? 'active' : ''}`}
                                onClick={() => toggleTypeFilter(type)}
                            >
                                {type.toUpperCase()}
                            </button>
                        ))}
                        {activeFilters.types.length > 0 && (
                            <button className="panel-filters__clear" onClick={clearFilters}>
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
                <ResizableSection
                    id="starred"
                    icon={Star}
                    iconColorClass="icon-amber"
                    label="Starred"
                    count={starredFiles.length}
                >
                    {starredFiles.length > 0 ? (
                        renderFileItems(starredFiles)
                    ) : (
                        <div className="resizable-section__empty">No starred items</div>
                    )}
                </ResizableSection>

                <ResizableSection
                    id="loaded"
                    icon={Database}
                    iconColorClass="icon-teal"
                    label="Loaded Datasets"
                    count={loadedDatasetsFormatted.length}
                >
                    {loadedDatasetsFormatted.length > 0 ? (
                        renderFileItems(loadedDatasetsFormatted)
                    ) : (
                        <div className="resizable-section__empty">No datasets loaded</div>
                    )}
                </ResizableSection>

                <ResizableSection
                    id="all"
                    icon={Folder}
                    iconColorClass="icon-blue"
                    label="All Files"
                    count={files.length}
                >
                    {files.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="files-grid">
                                {files
                                    .filter((f) => f.type !== 'folder')
                                    .map((file) => (
                                        <FileItemGrid
                                            key={file.id}
                                            file={file}
                                            isSelected={selectedFileId === file.id}
                                            onSelect={setSelectedFileId}
                                            onStar={handleStar}
                                            onDragStart={handleDragStart}
                                            onContextMenu={handleContextMenu}
                                            onMenuClick={handleMenuClick}
                                            onDoubleClick={handleDoubleClick}
                                        />
                                    ))}
                            </div>
                        ) : (
                            files.map((file) => (
                                <FileItemList
                                    key={file.id}
                                    file={file}
                                    isSelected={selectedFileId === file.id}
                                    onSelect={setSelectedFileId}
                                    onStar={handleStar}
                                    onDragStart={handleDragStart}
                                    onContextMenu={handleContextMenu}
                                    onMenuClick={handleMenuClick}
                                    onDoubleClick={handleDoubleClick}
                                    expandedFolders={expandedFolders}
                                    onToggleFolder={toggleFolder}
                                />
                            ))
                        )
                    ) : (
                        <div className="resizable-section__empty">No files uploaded</div>
                    )}
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer with upload */}
            <UploadDropzone
                onUpload={handleUpload}
                onRefresh={refetch}
                isDragOver={isDragOver}
                setIsDragOver={setIsDragOver}
            />

            {/* Context menu */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={closeContextMenu}
                    onAction={handleContextAction}
                />
            )}
        </div>
    );
}

export default FilesPanelContent;