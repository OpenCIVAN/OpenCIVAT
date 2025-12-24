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
import {
    ResizableSectionsContainer,
    ResizableSection,
} from '@UI/react/components/common/ResizableSections';

import { useRecordingsTab } from './hooks/useRecordingsTab';
import { RecordingControls } from './components/RecordingControls';
import { RecordingCard } from './components/RecordingCard';

import './RecordingsTab.scss';

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
        selectedRecording,
        setSelectedRecording,
        exportingId,
        loading,
        error,
        sectionStates,
        toggleSection,
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

    return (
        <div className="recordings-tab">
            {/* Header */}
            <div className="panel-header">
                <Icon name="video" size={14} className="panel-header__icon file-icon--red" />
                <span className="panel-header__title">Recording</span>
                {isRecording && (
                    <div className="panel-header__live-badge">
                        <span className="panel-header__live-dot" />
                        LIVE
                    </div>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="recordings-tab__error">
                    <Icon name="alertCircle" size={14} />
                    <span>{error}</span>
                </div>
            )}

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Recording Controls */}
                <ResizableSection
                    id="controls"
                    icon={isRecording ? 'circle' : 'video'}
                    iconColorClass="icon-red"
                    label={isRecording ? 'Current Recording' : 'New Recording'}
                >
                    <RecordingControls
                        isRecording={isRecording}
                        recordingDuration={recordingDuration}
                        recordingMode={recordingMode}
                        includeAudio={includeAudio}
                        onModeChange={setRecordingMode}
                        onAudioToggle={() => setIncludeAudio(!includeAudio)}
                        onStart={handleStartRecording}
                        onStop={handleStopRecording}
                        recordingName={recordingName}
                        onNameChange={setRecordingName}
                        isPaused={isPaused}
                        onPause={handlePauseRecording}
                        onResume={handleResumeRecording}
                    />
                </ResizableSection>

                {/* Past Recordings */}
                <ResizableSection
                    id="recordings"
                    icon="calendar"
                    iconColorClass="icon-purple"
                    label="Past Recordings"
                    count={recordings.length}
                >
                    {/* Search */}
                    <div className="recordings-tab__search">
                        <Icon name="search" size={14} className="recordings-tab__search-icon" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search recordings..."
                            className="recordings-tab__search-input"
                        />
                        {searchQuery && (
                            <button
                                className="recordings-tab__search-clear"
                                onClick={() => setSearchQuery('')}
                            >
                                <Icon name="close" size={10} />
                            </button>
                        )}
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
                    <div className="recordings-tab__list">
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
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="panel-footer panel-footer--with-info">
                <span className="panel-footer__storage">
                    Storage: {totalSize}
                </span>
                <button className="panel-footer__settings-btn" onClick={refresh}>
                    <Icon name="settings" size={10} />
                    Refresh
                </button>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { RecordingsTab as RecordingsPanelContent };
export default RecordingsTab;