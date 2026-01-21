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

import React, { useCallback, useMemo } from 'react';
import { Icon, IconButton, Tooltip } from '@UI/react/components/atoms';
import { LabeledButton, ToggleGroup } from '@UI/react/components/molecules';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { SectionNavGroup } from '@UI/react/components/organisms';
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

    // Render file items based on view mode (for starred and loaded sections)
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

    // Build sections for SectionNavGroup
    const fileSections = useMemo(() => [
        {
            id: 'starred',
            icon: 'star',
            label: 'Starred',
            color: '#fbbf24', // amber
            itemCount: starredFiles.length,
            content: starredFiles.length > 0 ? (
                renderFileItems(starredFiles)
            ) : (
                <div className="section-empty">No starred items</div>
            ),
        },
        {
            id: 'loaded',
            icon: 'database',
            label: 'Loaded Datasets',
            color: '#7dd3fc', // teal
            itemCount: loadedDatasetsFormatted.length,
            content: loadedDatasetsFormatted.length > 0 ? (
                renderFileItems(loadedDatasetsFormatted)
            ) : (
                <div className="section-empty">No datasets loaded</div>
            ),
        },
        {
            id: 'all',
            icon: 'folder',
            label: 'All Files',
            color: '#60a5fa', // blue
            itemCount: files.length,
            content: files.length > 0 ? (
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
                <div className="section-empty">No files uploaded</div>
            ),
        },
    ], [
        starredFiles,
        loadedDatasetsFormatted,
        files,
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
        renderFileItems,
    ]);

    return (
        <div className="files-tab">
            {/* Header */}
            <div className="panel-header panel-header--blue">
                <Icon name="folderOpen" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Files</span>
                <div className="panel-header__spacer" />
                <div className="panel-header__actions">
                    <Tooltip content="New Folder" placement="bottom">
                        <IconButton
                            icon="folderPlus"
                            label="New Folder"
                            size="xs"
                            variant="ghost"
                        />
                    </Tooltip>
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
                        { value: 'grid', icon: 'grid_3x3' },
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

            {/* Section Navigation */}
            <div className="files-tab__sections">
                <SectionNavGroup
                    sections={fileSections}
                    defaultSectionId="starred"
                    size="sm"
                />
            </div>

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