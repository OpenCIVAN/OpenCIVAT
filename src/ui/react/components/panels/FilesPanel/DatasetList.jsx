// src/ui/react/components/panels/FilesPanel/DatasetList.jsx
import React from 'react';
import { FileIcon, Check, Loader, Eye, AlertCircle, Download, Upload } from 'lucide-react';

export function DatasetList({ datasets, onSelectDataset, onRefetchDataset }) {
    if (datasets.length === 0) {
        return (
            <div className="files-panel__datasets-empty">
                <p>No datasets loaded yet</p>
                <p className="files-panel__datasets-hint">
                    Upload a VTP file or load a sample to get started
                </p>
            </div>
        );
    }

    const getStatusIcon = (dataset) => {
        switch (dataset.fileStatus) {
            case 'available':
                return <Check size={14} className="status-available" />;
            case 'fetching':
                return <Loader size={14} className="spinner status-fetching" />;
            case 'fetchable':
                return <Download size={14} className="status-fetchable" />;
            case 'needs-upload':
                return <AlertCircle size={14} className="status-needs-upload" />;
            case 'fetch-failed':
                return <AlertCircle size={14} className="status-error" />;
            default:
                return <FileIcon size={14} />;
        }
    };

    const getStatusTooltip = (dataset) => {
        switch (dataset.fileStatus) {
            case 'available':
                return 'File ready to visualize';
            case 'fetching':
                return 'Fetching file...';
            case 'fetchable':
                return 'Click to fetch file';
            case 'needs-upload':
                return 'File missing - needs re-upload';
            case 'fetch-failed':
                return 'Failed to fetch - try again';
            default:
                return '';
        }
    };

    return (
        <div className="files-panel__datasets-list">
            {datasets.map(dataset => (
                <button
                    key={dataset.id}
                    className={`files-panel__dataset ${dataset.fileStatus || ''}`}
                    onClick={() => onSelectDataset(dataset)}
                    disabled={dataset.fileStatus === 'fetching'}
                    title={getStatusTooltip(dataset)}
                >
                    <div className="files-panel__dataset-info">
                        <div className="files-panel__dataset-name">
                            {getStatusIcon(dataset)}
                            {dataset.name}
                        </div>
                        <div className="files-panel__dataset-meta">
                            {(dataset.pointCount || 0).toLocaleString()} points
                            {' • '}
                            {dataset.uploadedByName || 'Unknown'}
                        </div>
                    </div>

                    {dataset.instanceCount > 0 && (
                        <span className="files-panel__instance-badge">
                            <Eye size={12} />
                            {dataset.instanceCount}
                        </span>
                    )}

                    {/* Show re-fetch button for fetchable datasets */}
                    {dataset.fileStatus === 'fetchable' && (
                        <button
                            className="files-panel__refetch-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefetchDataset(dataset);
                            }}
                            title="Fetch file from server"
                        >
                            <Download size={14} />
                        </button>
                    )}
                </button>
            ))}
        </div>
    );
}