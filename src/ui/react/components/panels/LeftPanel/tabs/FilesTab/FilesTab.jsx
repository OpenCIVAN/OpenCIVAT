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
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton, ToggleGroup } from '@UI/react/components/molecules';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import {
    ResizableSectionsContainer,
    ResizableSection,
} from '@UI/react/components/organisms/ResizableSections';
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
                <Icon name="folderOpen" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__actions">
                    <IconButton
                        icon="folderPlus"
                        tooltip="New Folder"
                        size="sm"
                        variant="ghost"
                    />
                </div>
            </div>

            {/* Search */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search files..."
            />

            {/* Toolbar */}
            <div className="panel-toolbar">
                <ToggleGroup
                    options={[
                        { value: 'list', icon: 'list' },
                        { value: 'grid', icon: 'grid3x3' },
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                    size="xs"
                />
                <LabeledButton
                    icon="arrowUpDown"
                    label="Date"
                    size="xs"
                    variant="ghost"
                    className="filter-toggle"
                />
                <div className="panel-toolbar__spacer" />
                <IconButton
                    icon="filter"
                    onClick={() => setShowFilters(!showFilters)}
                    active={showFilters || activeFilters.types.length > 0}
                    size="xs"
                    variant="ghost"
                    tooltip="Filter files"
                    className="filter-toggle"
                />
                <span className="panel-toolbar__info">
                    <strong>{loadedCount}</strong> loaded
                </span>
            </div>

            {/* Loading indicator */}
            {isLoading && (
                <div className="panel-loading">
                    <Icon name="loader" size={16} className="spin" />
                    <span>Loading files...</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="panel-error">
                    <span>Failed to load files: {error}</span>
                    <LabeledButton
                        label="Retry"
                        onClick={refetch}
                        size="xs"
                        variant="ghost"
                    />
                </div>
            )}

            {/* Filters panel */}
            {showFilters && (
                <div className="panel-filters">
                    <div className="panel-filters__row">
                        {supportedFileTypes.map((type) => (
                            <LabeledButton
                                key={type}
                                label={type.toUpperCase()}
                                onClick={() => toggleTypeFilter(type)}
                                active={activeFilters.types.includes(type)}
                                size="xs"
                                variant="ghost"
                                className="filter-toggle"
                            />
                        ))}
                        {activeFilters.types.length > 0 && (
                            <LabeledButton
                                label="Clear"
                                onClick={clearFilters}
                                size="xs"
                                variant="ghost"
                                className="panel-filters__clear"
                            />
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
                    icon="star"
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
                    icon="database"
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
                    icon="folder"
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