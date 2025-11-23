// src/ui/react/components/panels/FilesPanel/ServerFileList.jsx
// Displays files available in the current project from the server
//
// Features:
// - Shows file metadata (size, upload date, uploader)
// - Indicates if file is already loaded in client
// - Supports filtering via search
// - Refresh button to sync with server

import React from 'react';
import {
    File,
    Download,
    Check,
    RefreshCw,
    User,
    Clock,
    AlertCircle,
    Inbox
} from 'lucide-react';

/**
 * ServerFileList - Displays project files from server
 * 
 * @param {Object} props
 * @param {Array} props.files - Files from useProjectFiles hook
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message if any
 * @param {Function} props.onLoadFile - Called when user clicks to load a file
 * @param {Function} props.onRefresh - Called to refresh file list
 * @param {Function} props.isFileLoaded - Function to check if file is loaded in client
 * @param {Set} props.loadingFileIds - Set of file IDs currently being loaded
 * @param {string} props.searchQuery - Current search filter
 */
export function ServerFileList({
    files = [],
    isLoading = false,
    error = null,
    onLoadFile,
    onRefresh,
    isFileLoaded,
    loadingFileIds = new Set(),
    searchQuery = ''
}) {
    // Loading state
    if (isLoading && files.length === 0) {
        return (
            <div className="server-file-list server-file-list--loading">
                <RefreshCw size={24} className="spinner" />
                <span>Loading project files...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="server-file-list server-file-list--error">
                <AlertCircle size={24} />
                <span>{error}</span>
                <button
                    className="server-file-list__retry-btn"
                    onClick={onRefresh}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Empty state
    if (files.length === 0) {
        return (
            <div className="server-file-list server-file-list--empty">
                <Inbox size={32} />
                <p>No files in this project</p>
                <span>Upload a file to get started</span>
            </div>
        );
    }

    // No search results
    const hasSearchQuery = searchQuery.trim().length > 0;
    if (hasSearchQuery && files.length === 0) {
        return (
            <div className="server-file-list server-file-list--empty">
                <File size={32} />
                <p>No files match "{searchQuery}"</p>
            </div>
        );
    }

    return (
        <div className="server-file-list">
            {/* Header with count and refresh */}
            <div className="server-file-list__header">
                <span className="server-file-list__count">
                    {files.length} file{files.length !== 1 ? 's' : ''} available
                    {hasSearchQuery && ' (filtered)'}
                </span>
                <button
                    className="server-file-list__refresh-btn"
                    onClick={onRefresh}
                    disabled={isLoading}
                    title="Refresh file list"
                >
                    <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
                </button>
            </div>

            {/* File list */}
            <div className="server-file-list__items">
                {files.map(file => {
                    const loaded = isFileLoaded?.(file.id);
                    const loading = loadingFileIds.has(file.id);

                    return (
                        <ServerFileItem
                            key={file.id}
                            file={file}
                            isLoaded={loaded}
                            isLoading={loading}
                            onClick={() => onLoadFile(file)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Individual file item
 */
function ServerFileItem({ file, isLoaded, isLoading, onClick }) {
    const statusIcon = isLoading ? (
        <RefreshCw size={16} className="spinner" />
    ) : isLoaded ? (
        <Check size={16} />
    ) : (
        <File size={16} />
    );

    const statusClass = isLoaded ? 'loaded' : isLoading ? 'loading' : '';
    const title = isLoaded
        ? 'Already loaded - click to view in Datasets tab'
        : isLoading
            ? 'Loading...'
            : 'Click to load into workspace';

    return (
        <button
            className={`server-file-item ${statusClass}`}
            onClick={onClick}
            disabled={isLoading}
            title={title}
        >
            <span className="server-file-item__icon">
                {statusIcon}
            </span>

            <div className="server-file-item__info">
                <span className="server-file-item__name">
                    {file.filename || file.name}
                </span>
                <div className="server-file-item__meta">
                    <span className="server-file-item__size">
                        {formatFileSize(file.size)}
                    </span>
                    {file.uploadedBy && (
                        <span className="server-file-item__uploader">
                            <User size={10} />
                            {file.isOwnUpload ? 'You' : file.uploadedBy}
                        </span>
                    )}
                    {file.uploadedAt && (
                        <span className="server-file-item__date">
                            <Clock size={10} />
                            {formatRelativeDate(file.uploadedAt)}
                        </span>
                    )}
                </div>
            </div>

            {!isLoaded && !isLoading && (
                <Download size={14} className="server-file-item__action" />
            )}
        </button>
    );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format bytes to human readable size
 */
function formatFileSize(bytes) {
    if (bytes == null || isNaN(bytes)) return 'Unknown size';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format date to relative string
 */
function formatRelativeDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            return `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;

    return date.toLocaleDateString();
}

export default ServerFileList;