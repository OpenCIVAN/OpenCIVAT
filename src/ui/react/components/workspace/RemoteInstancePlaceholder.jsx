// src/ui/components/workspace/RemoteInstancePlaceholder.jsx

import React, { useState } from 'react';
import { User, Download, Eye } from 'lucide-react';
import './RemoteInstancePlaceholder.scss';

/**
 * RemoteInstancePlaceholder
 * 
 * Shows when a teammate is viewing a dataset we don't have yet.
 * Provides a button to fetch the dataset and view it.
 */
export function RemoteInstancePlaceholder({
    instanceId,
    datasetId,
    ownerId,
    ownerName,
    datasetFilename,
    datasetFileType,
    publicPath,
    storageKey,
    onFetchAndView,
}) {
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState(null);

    const handleFetchAndView = async () => {
        setFetching(true);
        setError(null);

        try {
            await onFetchAndView({
                instanceId,
                datasetId,
                publicPath,
                storageKey,
                filename: datasetFilename,
                fileType: datasetFileType,
            });
        } catch (err) {
            console.error('Failed to fetch dataset:', err);
            setError(err.message);
            setFetching(false);
        }
    };

    return (
        <div className="remote-instance-placeholder">
            <div className="placeholder-content">
                {/* Remote user indicator */}
                <div className="remote-user-badge">
                    <User size={16} />
                    <span>{ownerName}'s view</span>
                </div>

                {/* Dataset information */}
                <div className="dataset-info">
                    <div className="dataset-icon">📊</div>
                    <div className="dataset-details">
                        <div className="dataset-filename">{datasetFilename}</div>
                        <div className="dataset-type">{datasetFileType.toUpperCase()}</div>
                    </div>
                </div>

                {/* Action button */}
                {!error && (
                    <button
                        className="fetch-button"
                        onClick={handleFetchAndView}
                        disabled={fetching}
                    >
                        {fetching ? (
                            <>
                                <Download size={18} className="spinning" />
                                <span>Fetching...</span>
                            </>
                        ) : (
                            <>
                                <Eye size={18} />
                                <span>View {ownerName}'s data</span>
                            </>
                        )}
                    </button>
                )}

                {/* Error state */}
                {error && (
                    <div className="error-message">
                        <span>Failed to fetch: {error}</span>
                        <button onClick={handleFetchAndView}>Retry</button>
                    </div>
                )}

                {/* Helpful context */}
                <div className="placeholder-hint">
                    {ownerName} is viewing this dataset. Click to fetch and view it.
                </div>
            </div>
        </div>
    );
}