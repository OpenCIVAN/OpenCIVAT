// src/ui/react/components/panels/FilesPanel/DatasetList.jsx
import React from 'react';
import { FileIcon, Check, Loader, Eye } from 'lucide-react';

export function DatasetList({ datasets, onSelectDataset }) {
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

    return (
        <div className="files-panel__datasets-list">
            {datasets.map(dataset => (
                <button
                    key={dataset.id}
                    className={`files-panel__dataset ${dataset.isLoading ? 'loading' : ''}`}
                    onClick={() => onSelectDataset(dataset)}
                    disabled={dataset.isLoading}
                >
                    <div className="files-panel__dataset-info">
                        <div className="files-panel__dataset-name">
                            {dataset.isLoading ? (
                                <Loader size={14} className="spinner" />
                            ) : dataset.hasPolydata ? (
                                <Check size={14} />
                            ) : (
                                <FileIcon size={14} />
                            )}
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
                </button>
            ))}
        </div>
    );
}