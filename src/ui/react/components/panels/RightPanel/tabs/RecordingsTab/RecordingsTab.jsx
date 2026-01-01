/**
 * @file RecordingsTab.jsx
 * @description Recordings tab for session capture and playback.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Start/stop recording with mode selection
 * - Recording modes: Full Session, Isolation, Subset
 * - Audio toggle and live indicator
 * - Past recordings list with playback controls
 * - Export and download options
 * - Storage usage indicator
 *
 * @see Right_Panel_Design_Specification.md - Recording Tab section
 *
 * @example
 * <RecordingsTab workspaceId="ws-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { Button } from '@UI/react/components/common/Button';
import { CollapsibleHeaderSection, StatusDot, StatBadge, SectionHeader } from '@UI/react/components/common/HeaderSection';
import { SearchBar } from '@UI/react/components/common/SearchBar';

import { useRecordingsTab } from './hooks/useRecordingsTab';
import { RecordingCard } from './components/RecordingCard';

import './RecordingsTab.scss';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} RecordingsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Recordings tab component.
 * Provides session recording and playback.
 *
 * @param {RecordingsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function RecordingsTab({ workspaceId }) {
    const {
        recordings,
        filteredRecordings,
        isRecording,
        isPaused,
        recordingDuration,
        recordingName,
        setRecordingName,
        recordingMode,
        setRecordingMode,
        includeAudio,
        setIncludeAudio,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        sortOrder,
        toggleSortOrder,
        filterBy,
        setFilterBy,
        selectedRecording,
        setSelectedRecording,
        exportingId,
        loading,
        error,
        totalSize,
        handleStartRecording,
        handleStopRecording,
        handlePauseRecording,
        handleResumeRecording,
        handleExport,
        handleDownload,
        handleDelete,
        refresh,
    } = useRecordingsTab();

    // Count markers (placeholder - would come from real data)
    const markerCount = 0;

    return (
        <div className="recordings-panel">
            {/* Panel Header */}
            <div className="panel-header">
                <Icon name="video" size={14} className="panel-header__icon file-icon--red" />
                <span className="panel-header__title">Recording</span>
                <span className="panel-header__count">
                    {isRecording ? 'Recording...' : `${recordings.length} saved`}
                </span>
            </div>

            {/* Error display */}
            {error && (
                <div className="recordings-panel__error">
                    <Icon name="alertCircle" size={14} />
                    <span>{error}</span>
                </div>
            )}

            {/* Recording Status/Controls */}
            <div className="recordings-panel__header">
                <CollapsibleHeaderSection
                    icon="radio"
                    title={isRecording ? "Live Session" : "Start Session"}
                    color={isRecording ? "red" : "default"}
                    defaultExpanded={true}
                >
                    {isRecording ? (
                        <>
                            {/* Row 1: Recording name + status */}
                            <div className="recording-status__info">
                                <StatusDot
                                    color="var(--color-accent-red)"
                                    pulse={!isPaused}
                                />
                                <span className="recording-status__name">
                                    {recordingName || 'Session Recording'}
                                </span>
                                {isPaused && (
                                    <span className="recording-status__paused">
                                        Paused
                                    </span>
                                )}
                            </div>

                            {/* Row 2: Stats */}
                            <div className="recording-status__stats">
                                <StatBadge icon="clock">
                                    <span className="monospace">
                                        {formatDuration(recordingDuration)}
                                    </span>
                                </StatBadge>
                                <StatBadge icon="circle">
                                    {markerCount} markers
                                </StatBadge>
                            </div>

                            {/* Row 3: Controls */}
                            <div className="recording-status__controls">
                                <div className="recording-status__controls-left">
                                    <Button
                                        icon={isPaused ? 'play' : 'pause'}
                                        variant="secondary"
                                        onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                                        title={isPaused ? 'Resume' : 'Pause'}
                                    />
                                    <Button
                                        icon="circle"
                                        variant="secondary"
                                        onClick={() => { /* handleAddMarker */ }}
                                        title="Add Marker"
                                    />
                                </div>
                                <Button
                                    icon="stop"
                                    variant="danger"
                                    onClick={handleStopRecording}
                                >
                                    Stop
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Button
                            icon="radio"
                            variant="danger"
                            fullWidth
                            onClick={handleStartRecording}
                        >
                            Start Recording
                        </Button>
                    )}
                </CollapsibleHeaderSection>
            </div>

            {/* Past Recordings List */}
            <div className="recordings-panel__list">
                <SectionHeader
                    icon="video"
                    color="var(--color-accent-red)"
                    count={recordings.length}
                >
                    Past Recordings
                </SectionHeader>

                {/* Search */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search recordings..."
                />

                {/* Controls Row */}
                <div className="recordings-tab__toolbar">
                    <div className="recordings-tab__controls">
                        {/* Filter dropdown */}
                        <div className="recordings-tab__dropdown">
                            <button
                                className={`recordings-tab__dropdown-btn ${filterBy !== 'all' ? 'recordings-tab__dropdown-btn--active' : ''}`}
                                title="Filter by date"
                            >
                                <Icon name="filter" size={12} />
                            </button>
                            <select
                                value={filterBy}
                                onChange={(e) => setFilterBy(e.target.value)}
                                className="recordings-tab__dropdown-select"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                        {/* Sort dropdown */}
                        <div className="recordings-tab__dropdown">
                            <button
                                className="recordings-tab__dropdown-btn"
                                onClick={toggleSortOrder}
                                title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                            >
                                <Icon name={sortOrder === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />
                            </button>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="recordings-tab__dropdown-select"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                                <option value="duration">Duration</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="recordings-tab__loading">
                        <Icon name="loader" size={20} className="spin" />
                        <span>Loading recordings...</span>
                    </div>
                )}

                {/* Empty state */}
                {!loading && filteredRecordings.length === 0 && (
                    <div className="recordings-tab__empty">
                        <Icon name="video" size={32} />
                        <span>
                            {searchQuery
                                ? 'No recordings match your search'
                                : 'No recordings yet. Start one above!'}
                        </span>
                    </div>
                )}

                {/* Recordings list */}
                <div className="recordings-list">
                    {filteredRecordings.map(recording => (
                        <RecordingCard
                            key={recording.id}
                            recording={recording}
                            isSelected={selectedRecording === recording.id}
                            onSelect={setSelectedRecording}
                            onExport={handleExport}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            isExporting={exportingId === recording.id}
                        />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="recordings-panel__footer">
                <span className="recordings-panel__storage">
                    Storage: {totalSize}
                </span>
                <button className="recordings-panel__refresh-btn" onClick={refresh}>
                    <Icon name="refreshCw" size={10} />
                    Refresh
                </button>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { RecordingsTab as RecordingsPanelContent };
export default RecordingsTab;