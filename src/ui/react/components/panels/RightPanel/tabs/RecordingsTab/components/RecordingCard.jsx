/**
 * @file RecordingCard.jsx
 * @description Recording card with playback controls and actions.
 */

import React, { useCallback } from 'react';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';

/**
 * Recording modes for icon lookup
 */
const RECORDING_MODES = {
    full: 'monitor',
    isolation: 'maximize',
    subset: 'layers',
};

/**
 * Format duration in milliseconds
 */
function formatDurationMs(ms) {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff < dayMs) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diff < 2 * dayMs) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}

/**
 * @typedef {Object} RecordingCardProps
 * @property {Object} recording - Recording data
 * @property {boolean} isSelected - Whether this card is selected
 * @property {function} onSelect - Callback when card is clicked
 * @property {function} onExport - Callback to export recording
 * @property {function} onDownload - Callback to download recording
 * @property {function} onDelete - Callback to delete recording
 * @property {boolean} isExporting - Whether currently exporting
 */

/**
 * Recording card component.
 * Displays recording with expandable controls.
 *
 * @param {RecordingCardProps} props - Component props
 * @returns {React.ReactElement} The rendered card
 */
export function RecordingCard({
    recording,
    isSelected,
    onSelect,
    onExport,
    onDownload,
    onDelete,
    isExporting,
}) {
    const mode = recording.metadata?.mode || 'full';
    const modeIconName = RECORDING_MODES[mode] || 'monitor';
    const name = recording.metadata?.name || 'Untitled Recording';
    const isExported = !!recording.storage_key;

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        if (window.confirm('Delete this recording? This cannot be undone.')) {
            onDelete(recording.id);
        }
    }, [recording.id, onDelete]);

    const handleExport = useCallback((e) => {
        e.stopPropagation();
        onExport(recording.id);
    }, [recording.id, onExport]);

    const handleDownload = useCallback((e) => {
        e.stopPropagation();
        onDownload(recording.id);
    }, [recording.id, onDownload]);

    return (
        <div
            className={`recording-card ${isSelected ? 'recording-card--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : recording.id)}
        >
            <div className="recording-card__main">
                {/* Thumbnail */}
                <div className="recording-card__thumbnail">
                    {recording.status === 'recording' ? (
                        <span className="recording-card__live-indicator">
                            <Icon name="circle" size={16} className="recording-card__live-dot" />
                        </span>
                    ) : (
                        <Icon name="play" size={20} />
                    )}
                </div>

                {/* Info */}
                <div className="recording-card__info">
                    <div className="recording-card__title">{name}</div>
                    <div className="recording-card__meta">
                        <span className="recording-card__duration">
                            <Icon name="clock" size={10} />
                            {formatDurationMs(recording.duration_ms)}
                        </span>
                        <span className="recording-card__events">
                            {recording.event_count || 0} events
                        </span>
                        <span className="recording-card__mode">
                            <Icon name={modeIconName} size={10} />
                        </span>
                        {isExported && (
                            <span className="recording-card__exported" title="Exported to storage">
                                <Icon name="checkCircle" size={10} />
                            </span>
                        )}
                    </div>
                    <div className="recording-card__date">
                        {formatDate(recording.started_at)}
                        {recording.recorded_by_name && ` by ${recording.recorded_by_name}`}
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {isSelected && (
                <div className="recording-card__expanded">
                    {/* Status info */}
                    <div className="recording-card__details">
                        <span>Status: {recording.status}</span>
                        {recording.file_size && (
                            <span>Size: {(recording.file_size / 1024).toFixed(1)} KB</span>
                        )}
                    </div>

                    {/* Playback controls */}
                    {recording.status !== 'recording' && (
                        <div className="recording-card__playback">
                            <IconButton
                                icon="skipBack"
                                size="sm"
                                disabled
                                className="recording-card__playback-btn"
                            />
                            <IconButton
                                icon="play"
                                size="sm"
                                disabled
                                tooltip="Playback coming soon"
                                className="recording-card__playback-btn recording-card__playback-btn--play"
                            />
                            <IconButton
                                icon="skipForward"
                                size="sm"
                                disabled
                                className="recording-card__playback-btn"
                            />

                            <div className="recording-card__progress">
                                <div className="recording-card__progress-bar" />
                            </div>

                            <span className="recording-card__progress-time">
                                0:00 / {formatDurationMs(recording.duration_ms)}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="recording-card__actions">
                        {!isExported && recording.status !== 'recording' && (
                            <LabeledButton
                                icon={isExporting ? 'loader' : 'upload'}
                                label="Export"
                                onClick={handleExport}
                                disabled={isExporting}
                                tooltip="Export to storage"
                                size="sm"
                                variant="ghost"
                                color="green"
                            />
                        )}
                        {recording.status !== 'recording' && (
                            <LabeledButton
                                icon="download"
                                label="Download"
                                onClick={handleDownload}
                                tooltip="Download recording"
                                size="sm"
                                variant="ghost"
                                color="blue"
                            />
                        )}
                        <IconButton
                            icon="delete"
                            onClick={handleDelete}
                            tooltip="Delete recording"
                            size="sm"
                            variant="ghost"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecordingCard;