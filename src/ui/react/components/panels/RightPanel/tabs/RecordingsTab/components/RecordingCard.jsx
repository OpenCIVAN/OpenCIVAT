/**
 * @file RecordingCard.jsx
 * @description Recording card with playback controls and actions.
 */

import React, { useCallback } from 'react';
import {
    Play,
    Clock,
    Download,
    Trash2,
    Upload,
    Loader,
    Circle,
    Monitor,
    Maximize,
    Layers,
    CheckCircle,
    SkipBack,
    SkipForward,
} from 'lucide-react';

/**
 * Recording modes for icon lookup
 */
const RECORDING_MODES = {
    full: Monitor,
    isolation: Maximize,
    subset: Layers,
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
    const ModeIcon = RECORDING_MODES[mode] || Monitor;
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
                            <Circle size={16} className="recording-card__live-dot" />
                        </span>
                    ) : (
                        <Play size={20} />
                    )}
                </div>

                {/* Info */}
                <div className="recording-card__info">
                    <div className="recording-card__title">{name}</div>
                    <div className="recording-card__meta">
                        <span className="recording-card__duration">
                            <Clock size={10} />
                            {formatDurationMs(recording.duration_ms)}
                        </span>
                        <span className="recording-card__events">
                            {recording.event_count || 0} events
                        </span>
                        <span className="recording-card__mode">
                            <ModeIcon size={10} />
                        </span>
                        {isExported && (
                            <span className="recording-card__exported" title="Exported to storage">
                                <CheckCircle size={10} />
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
                            <button className="recording-card__playback-btn" disabled>
                                <SkipBack size={14} />
                            </button>
                            <button className="recording-card__playback-btn recording-card__playback-btn--play" disabled title="Playback coming soon">
                                <Play size={16} />
                            </button>
                            <button className="recording-card__playback-btn" disabled>
                                <SkipForward size={14} />
                            </button>

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
                            <button
                                className="recording-card__action-btn"
                                data-color="green"
                                onClick={handleExport}
                                disabled={isExporting}
                                title="Export to storage"
                            >
                                {isExporting ? <Loader size={10} className="spin" /> : <Upload size={10} />}
                                Export
                            </button>
                        )}
                        {recording.status !== 'recording' && (
                            <button
                                className="recording-card__action-btn"
                                data-color="blue"
                                onClick={handleDownload}
                                title="Download recording"
                            >
                                <Download size={10} />
                                Download
                            </button>
                        )}
                        <button
                            className="recording-card__action-btn"
                            onClick={handleDelete}
                            title="Delete recording"
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecordingCard;