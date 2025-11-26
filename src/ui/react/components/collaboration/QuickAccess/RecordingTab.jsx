// src/ui/react/components/collaboration/QuickAccess/RecordingTab.jsx
// Session recording controls and past recordings browser

import React, { useState, useMemo } from "react";
import {
    Circle,
    Square,
    Play,
    Pause,
    Search,
    Download,
    Trash2,
    Eye,
    Clock,
    Calendar,
    Users,
    FileText,
    Mic,
    Video,
    MousePointer,
    MapPin,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    X
} from "lucide-react";

import { useRecordings } from "./useRecordings.js";
import { UserAvatar, UserAvatarGroup } from "../PeoplePanel/UserAvatar";

import "./RecordingTab.scss";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RecordingTab() {
    // ---------------------------------------------------------------------------
    // STATE & HOOKS
    // ---------------------------------------------------------------------------

    const {
        // Current recording state
        isRecording,
        isPaused,
        recordingDuration,
        recordingName,
        setRecordingName,
        recordingOptions,
        setRecordingOptions,

        // Actions
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,

        // Past recordings
        recordings,
        deleteRecording,
        exportRecording,
        playRecording,
    } = useRecordings();

    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSection, setExpandedSection] = useState("record"); // "record" | "history"

    // ---------------------------------------------------------------------------
    // FILTERING
    // ---------------------------------------------------------------------------

    const filteredRecordings = useMemo(() => {
        if (!searchQuery.trim()) return recordings;
        const query = searchQuery.toLowerCase();
        return recordings.filter(r =>
            r.name.toLowerCase().includes(query) ||
            r.participants?.some(p => p.userName.toLowerCase().includes(query)) ||
            r.datasets?.some(d => d.toLowerCase().includes(query))
        );
    }, [recordings, searchQuery]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const toggleOption = (option) => {
        setRecordingOptions(prev => ({
            ...prev,
            [option]: !prev[option],
        }));
    };

    const handleStartRecording = () => {
        if (!recordingName.trim()) {
            // Auto-generate name
            const now = new Date();
            const autoName = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            setRecordingName(autoName);
        }
        startRecording();
    };

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <div className="recording-tab">
            {/* Record Section */}
            <div className="recording-tab__section">
                <button
                    className="recording-tab__section-header"
                    onClick={() => setExpandedSection(expandedSection === "record" ? null : "record")}
                >
                    <span className="recording-tab__section-chevron">
                        {expandedSection === "record" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <Video size={14} />
                    <span>Record New Session</span>
                    {isRecording && (
                        <span className="recording-tab__live-badge">
                            <Circle size={8} fill="currentColor" />
                            REC
                        </span>
                    )}
                </button>

                {expandedSection === "record" && (
                    <div className="recording-tab__section-content">
                        {/* Recording Status */}
                        {isRecording ? (
                            <div className="recording-tab__active-recording">
                                <div className="recording-tab__status">
                                    <div className="recording-tab__status-indicator recording-tab__status-indicator--recording">
                                        <Circle size={12} fill="currentColor" />
                                    </div>
                                    <div className="recording-tab__status-info">
                                        <span className="recording-tab__status-label">
                                            {isPaused ? "Paused" : "Recording"}
                                        </span>
                                        <span className="recording-tab__status-duration">
                                            {formatDuration(recordingDuration)}
                                        </span>
                                    </div>
                                </div>

                                <div className="recording-tab__recording-name">
                                    {recordingName}
                                </div>

                                <div className="recording-tab__controls">
                                    {isPaused ? (
                                        <button
                                            className="recording-tab__control-btn recording-tab__control-btn--resume"
                                            onClick={resumeRecording}
                                        >
                                            <Play size={16} />
                                            Resume
                                        </button>
                                    ) : (
                                        <button
                                            className="recording-tab__control-btn recording-tab__control-btn--pause"
                                            onClick={pauseRecording}
                                        >
                                            <Pause size={16} />
                                            Pause
                                        </button>
                                    )}
                                    <button
                                        className="recording-tab__control-btn recording-tab__control-btn--stop"
                                        onClick={stopRecording}
                                    >
                                        <Square size={16} />
                                        Stop
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="recording-tab__setup">
                                {/* Session Name */}
                                <div className="recording-tab__field">
                                    <label>Session Name</label>
                                    <input
                                        type="text"
                                        value={recordingName}
                                        onChange={(e) => setRecordingName(e.target.value)}
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>

                                {/* Recording Options */}
                                <div className="recording-tab__field">
                                    <label>Include in Recording</label>
                                    <div className="recording-tab__options">
                                        <button
                                            className={`recording-tab__option ${recordingOptions.viewChanges ? "active" : ""}`}
                                            onClick={() => toggleOption("viewChanges")}
                                            title="Camera movements, filter changes, etc."
                                        >
                                            <Eye size={14} />
                                            <span>Views</span>
                                        </button>
                                        <button
                                            className={`recording-tab__option ${recordingOptions.annotations ? "active" : ""}`}
                                            onClick={() => toggleOption("annotations")}
                                            title="Annotation creation and edits"
                                        >
                                            <MapPin size={14} />
                                            <span>Annotations</span>
                                        </button>
                                        <button
                                            className={`recording-tab__option ${recordingOptions.voice ? "active" : ""}`}
                                            onClick={() => toggleOption("voice")}
                                            title="Voice audio from all participants"
                                        >
                                            <Mic size={14} />
                                            <span>Voice</span>
                                        </button>
                                        <button
                                            className={`recording-tab__option ${recordingOptions.chat ? "active" : ""}`}
                                            onClick={() => toggleOption("chat")}
                                            title="Text chat messages"
                                        >
                                            <FileText size={14} />
                                            <span>Chat</span>
                                        </button>
                                        <button
                                            className={`recording-tab__option ${recordingOptions.cursors ? "active" : ""}`}
                                            onClick={() => toggleOption("cursors")}
                                            title="Cursor movements in 3D space"
                                        >
                                            <MousePointer size={14} />
                                            <span>Cursors</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Start Button */}
                                <button
                                    className="recording-tab__start-btn"
                                    onClick={handleStartRecording}
                                >
                                    <Circle size={16} fill="currentColor" />
                                    Start Recording
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Past Recordings Section */}
            <div className="recording-tab__section">
                <button
                    className="recording-tab__section-header"
                    onClick={() => setExpandedSection(expandedSection === "history" ? null : "history")}
                >
                    <span className="recording-tab__section-chevron">
                        {expandedSection === "history" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <Clock size={14} />
                    <span>Past Recordings</span>
                    <span className="recording-tab__count">({recordings.length})</span>
                </button>

                {expandedSection === "history" && (
                    <div className="recording-tab__section-content">
                        {/* Search */}
                        <div className="recording-tab__search">
                            <Search size={14} className="recording-tab__search-icon" />
                            <input
                                type="text"
                                placeholder="Search recordings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Recordings List */}
                        <div className="recording-tab__list">
                            {filteredRecordings.length === 0 ? (
                                <div className="recording-tab__empty">
                                    <Video size={24} strokeWidth={1.5} />
                                    <p>No recordings yet</p>
                                    <span>Start a recording to capture your session</span>
                                </div>
                            ) : (
                                filteredRecordings.map(recording => (
                                    <RecordingItem
                                        key={recording.id}
                                        recording={recording}
                                        onPlay={() => playRecording(recording.id)}
                                        onExport={() => exportRecording(recording.id)}
                                        onDelete={() => deleteRecording(recording.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// RECORDING ITEM COMPONENT
// =============================================================================

function RecordingItem({ recording, onPlay, onExport, onDelete }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div className="recording-item">
            <div className="recording-item__icon">
                <Video size={16} />
            </div>

            <div className="recording-item__content">
                <div className="recording-item__header">
                    <span className="recording-item__name">{recording.name}</span>
                    <span className="recording-item__duration">
                        {formatDuration(recording.duration)}
                    </span>
                </div>

                <div className="recording-item__meta">
                    <span className="recording-item__date">
                        <Calendar size={10} />
                        {formatDate(recording.timestamp)}
                    </span>
                    {recording.participants && recording.participants.length > 0 && (
                        <span className="recording-item__participants">
                            <Users size={10} />
                            {recording.participants.map(p => p.userName).join(", ")}
                        </span>
                    )}
                </div>

                {recording.datasets && recording.datasets.length > 0 && (
                    <div className="recording-item__datasets">
                        {recording.datasets.slice(0, 2).join(", ")}
                        {recording.datasets.length > 2 && ` +${recording.datasets.length - 2}`}
                    </div>
                )}
            </div>

            <div className="recording-item__actions">
                <button
                    className="recording-item__action recording-item__action--play"
                    onClick={onPlay}
                    title="Play recording"
                >
                    <Play size={14} />
                </button>
                <button
                    className="recording-item__action"
                    onClick={onExport}
                    title="Export"
                >
                    <Download size={14} />
                </button>
                <button
                    className="recording-item__action recording-item__action--delete"
                    onClick={onDelete}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default RecordingTab;