// src/ui/react/components/panels/LeftPanel/tabs/RecordingsTab.jsx
// Recordings tab content for the unified left panel
//
// Features:
// - Start/stop recording with mode selection
// - Recording modes: Full Session, Isolation, Subset
// - Audio toggle
// - Past recordings list with playback controls
// - Storage indicator

import React, { useState, useCallback, useMemo } from 'react';
import {
    Video,
    Search,
    Play,
    Pause,
    Square,
    Circle,
    ChevronRight,
    ChevronDown,
    Clock,
    User,
    Calendar,
    Download,
    Share2,
    Trash2,
    Settings,
    Monitor,
    Maximize,
    Layers,
    Users,
    Mic,
    MicOff,
    SkipBack,
    SkipForward,
    Maximize2,
    X,
} from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/common/ResizableSections';

// =============================================================================
// RECORDING MODES
// =============================================================================

const RECORDING_MODES = [
    { id: 'full', label: 'Full Session', icon: Monitor, description: 'Record entire workspace grid' },
    { id: 'isolation', label: 'Isolation', icon: Maximize, description: 'Record single focused instance' },
    { id: 'subset', label: 'Subset', icon: Layers, description: 'Record selected instances only' },
];

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_RECORDINGS = [
    {
        id: 'r1',
        title: 'Tumor Analysis Session',
        duration: '45:32',
        date: 'Today, 10:30 AM',
        participants: ['You', 'Dr. Smith', 'Dr. Jones'],
        mode: 'full',
    },
    {
        id: 'r2',
        title: 'Surgical Planning Review',
        duration: '28:15',
        date: 'Yesterday, 2:00 PM',
        participants: ['You', 'Dr. Smith'],
        mode: 'isolation',
    },
    {
        id: 'r3',
        title: 'Team Discussion - Case 451',
        duration: '1:12:08',
        date: 'Nov 25, 9:00 AM',
        participants: ['You', 'Dr. Smith', 'Dr. Jones', 'Alex Chen'],
        mode: 'full',
    },
];

// =============================================================================
// RECORDING CONTROLS
// =============================================================================

function RecordingControls({ isRecording, recordingTime, recordingMode, includeAudio, onModeChange, onAudioToggle, onStart, onStop }) {
    if (isRecording) {
        return (
            <div className="recording-controls recording-controls--active">
                {/* Recording indicator */}
                <div className="recording-controls__status">
                    <span className="recording-controls__dot recording-controls__dot--pulse" />
                    <span className="recording-controls__label">Recording</span>
                    <span className="recording-controls__time">{recordingTime}</span>
                </div>

                {/* Recording info */}
                <div className="recording-controls__info">
                    <span className="recording-controls__info-item">
                        <Monitor size={12} />
                        {RECORDING_MODES.find(m => m.id === recordingMode)?.label}
                    </span>
                    <span className="recording-controls__info-item">
                        {includeAudio ? <Mic size={12} /> : <MicOff size={12} />}
                        {includeAudio ? 'Audio on' : 'Audio off'}
                    </span>
                    <span className="recording-controls__info-item">
                        <Users size={12} />
                        3 participants
                    </span>
                </div>

                {/* Actions */}
                <div className="recording-controls__actions">
                    <button
                        className="recording-controls__stop-btn"
                        onClick={onStop}
                    >
                        <Square size={14} />
                        Stop Recording
                    </button>
                    <button className="recording-controls__pause-btn">
                        <Pause size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="recording-controls">
            {/* Mode selector */}
            <div className="recording-controls__mode-section">
                <div className="recording-controls__mode-label">Recording Mode</div>
                <div className="recording-controls__mode-buttons">
                    {RECORDING_MODES.map(mode => {
                        const Icon = mode.icon;
                        const isActive = recordingMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                className={`recording-controls__mode-btn ${isActive ? 'recording-controls__mode-btn--active' : ''}`}
                                onClick={() => onModeChange(mode.id)}
                                title={mode.description}
                            >
                                <Icon size={16} />
                                <span>{mode.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Audio toggle */}
            <div className="recording-controls__audio-toggle">
                <div className="recording-controls__audio-info">
                    <Mic size={14} className={includeAudio ? 'icon-green' : ''} />
                    <span>Include audio</span>
                </div>
                <button
                    className={`toggle-switch ${includeAudio ? 'toggle-switch--active' : ''}`}
                    onClick={onAudioToggle}
                >
                    <span className="toggle-switch__thumb" />
                </button>
            </div>

            {/* Start button */}
            <button
                className="recording-controls__start-btn"
                onClick={onStart}
            >
                <Circle size={16} />
                Start Recording
            </button>
        </div>
    );
}

// =============================================================================
// RECORDING CARD
// =============================================================================

function RecordingCard({ recording, isSelected, onSelect }) {
    const ModeIcon = RECORDING_MODES.find(m => m.id === recording.mode)?.icon || Monitor;

    return (
        <div
            className={`recording-card ${isSelected ? 'recording-card--selected' : ''}`}
            onClick={() => onSelect(isSelected ? null : recording.id)}
        >
            <div className="recording-card__main">
                {/* Thumbnail */}
                <div className="recording-card__thumbnail">
                    <Play size={20} />
                </div>

                {/* Info */}
                <div className="recording-card__info">
                    <div className="recording-card__title">{recording.title}</div>
                    <div className="recording-card__meta">
                        <span className="recording-card__duration">
                            <Clock size={10} />
                            {recording.duration}
                        </span>
                        <span className="recording-card__mode">
                            <ModeIcon size={10} />
                        </span>
                    </div>
                    <div className="recording-card__date">{recording.date}</div>
                </div>
            </div>

            {/* Expanded details */}
            {isSelected && (
                <div className="recording-card__expanded">
                    <div className="recording-card__participants">
                        Participants: {recording.participants.join(', ')}
                    </div>

                    {/* Playback controls */}
                    <div className="recording-card__playback">
                        <button className="recording-card__playback-btn">
                            <SkipBack size={14} />
                        </button>
                        <button className="recording-card__playback-btn recording-card__playback-btn--play">
                            <Play size={16} />
                        </button>
                        <button className="recording-card__playback-btn">
                            <SkipForward size={14} />
                        </button>

                        <div className="recording-card__progress">
                            <div className="recording-card__progress-bar" />
                        </div>

                        <span className="recording-card__progress-time">
                            0:00 / {recording.duration}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="recording-card__actions">
                        <button className="recording-card__action-btn" data-color="blue">
                            <Maximize2 size={10} />
                            Full Screen
                        </button>
                        <button className="recording-card__action-btn" data-color="green">
                            <Download size={10} />
                        </button>
                        <button className="recording-card__action-btn" data-color="pink">
                            <Share2 size={10} />
                        </button>
                        <button className="recording-card__action-btn">
                            <Trash2 size={10} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RecordingsPanelContent({ workspaceId }) {
    // State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState('00:00:00');
    const [recordingMode, setRecordingMode] = useState('full');
    const [includeAudio, setIncludeAudio] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecording, setSelectedRecording] = useState(null);

    // Section states
    const { states: sectionStates, toggleSection } = useSectionStates({
        controls: { expanded: true, flexGrow: 0 },
        recordings: { expanded: true, flexGrow: 2 },
    });

    // Handlers
    const handleStartRecording = useCallback(() => {
        setIsRecording(true);
        // In real implementation, start actual recording
    }, []);

    const handleStopRecording = useCallback(() => {
        setIsRecording(false);
        setRecordingTime('00:00:00');
    }, []);

    // Filter recordings by search
    const filteredRecordings = useMemo(() => {
        if (!searchQuery.trim()) return SAMPLE_RECORDINGS;
        const query = searchQuery.toLowerCase();
        return SAMPLE_RECORDINGS.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.participants.some(p => p.toLowerCase().includes(query))
        );
    }, [searchQuery]);

    // Calculate storage
    const storageUsed = '2.4 GB';
    const storageTotal = '10 GB';

    return (
        <div className="recordings-tab">
            {/* Header */}
            <div className="panel-header">
                <Video size={14} className="panel-header__icon file-icon--red" />
                <span className="panel-header__title">Recording</span>
                {isRecording && (
                    <div className="panel-header__live-badge">
                        <span className="panel-header__live-dot" />
                        LIVE
                    </div>
                )}
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                {/* Recording Controls */}
                <ResizableSection
                    id="controls"
                    icon={isRecording ? Circle : Video}
                    iconColorClass={isRecording ? 'icon-red' : 'icon-red'}
                    label={isRecording ? 'Current Recording' : 'New Recording'}
                >
                    <RecordingControls
                        isRecording={isRecording}
                        recordingTime={recordingTime}
                        recordingMode={recordingMode}
                        includeAudio={includeAudio}
                        onModeChange={setRecordingMode}
                        onAudioToggle={() => setIncludeAudio(!includeAudio)}
                        onStart={handleStartRecording}
                        onStop={handleStopRecording}
                    />
                </ResizableSection>

                {/* Past Recordings */}
                <ResizableSection
                    id="recordings"
                    icon={Calendar}
                    iconColorClass="icon-purple"
                    label="Past Recordings"
                    count={SAMPLE_RECORDINGS.length}
                >
                    {/* Search */}
                    <div className="recordings-tab__search">
                        <Search size={14} className="recordings-tab__search-icon" />
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
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    {/* Recordings list */}
                    <div className="recordings-tab__list">
                        {filteredRecordings.map(recording => (
                            <RecordingCard
                                key={recording.id}
                                recording={recording}
                                isSelected={selectedRecording === recording.id}
                                onSelect={setSelectedRecording}
                            />
                        ))}
                    </div>
                </ResizableSection>
            </ResizableSectionsContainer>

            {/* Footer */}
            <div className="panel-footer panel-footer--with-info">
                <span className="panel-footer__storage">
                    Storage: {storageUsed} / {storageTotal}
                </span>
                <button className="panel-footer__settings-btn">
                    <Settings size={10} />
                    Settings
                </button>
            </div>
        </div>
    );
}

export default RecordingsPanelContent;