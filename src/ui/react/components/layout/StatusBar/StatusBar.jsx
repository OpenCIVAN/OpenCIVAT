// src/ui/react/components/layout/StatusBar/StatusBar.jsx
// App-level status bar with sync status, online users, cursors, recording, and FPS
// Matches artifact design with left/center/right zones

import React, { useState, useEffect, useCallback } from 'react';
import {
    Wifi,
    WifiOff,
    Users,
    AlertTriangle,
    Eye,
    EyeOff,
    Circle,
    Zap,
    ChevronUp,
    ChevronDown,
    Shield,
    ShieldAlert,
} from 'lucide-react';

import { presenceSystem } from '@Collaboration/presence/presenceSystem.js';
import { getBottomPanelControls } from '@UI/react/components/panels/BottomPanel';
import { useAuth } from '@UI/react/hooks/useAuth.js';
import { VoiceCommandToggle } from '@UI/react/components/common/VoiceCommandToggle';
import './StatusBar.scss';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * SyncStatus - Shows connection/sync status
 */
function SyncStatus({ isConnected, isSyncing }) {
    if (!isConnected) {
        return (
            <div className="status-bar__item status-bar__item--error">
                <WifiOff size={10} />
                <span>Offline</span>
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="status-bar__item status-bar__item--warning">
                <Wifi size={10} />
                <span>Syncing...</span>
            </div>
        );
    }

    return (
        <div className="status-bar__item status-bar__item--success">
            <Wifi size={10} />
            <span>Synced</span>
        </div>
    );
}

/**
 * OnlineUsersIndicator - Shows count of online users with hover popover
 */
function OnlineUsersIndicator({ count }) {
    const [showPopover, setShowPopover] = useState(false);
    const [users, setUsers] = useState([]);

    const handleMouseEnter = () => {
        // Get current online users from presence system
        const onlineUsers = presenceSystem.getOnlineUsers?.() || [];
        setUsers(onlineUsers);
        setShowPopover(true);
    };

    return (
        <div
            className="status-bar__item status-bar__item--interactive"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowPopover(false)}
        >
            <Users size={10} />
            <span>{count} online</span>

            {showPopover && users.length > 0 && (
                <div className="online-popover">
                    <div className="online-popover__header">Currently Online</div>
                    <div className="online-popover__list">
                        {users.map(user => (
                            <div key={user.userId} className="online-popover__user">
                                <Circle
                                    size={8}
                                    fill={user.status === 'active' ? '#34d399' : '#fbbf24'}
                                    stroke={user.status === 'active' ? '#34d399' : '#fbbf24'}
                                    className="online-popover__status"
                                />
                                <span
                                    className="online-popover__name"
                                    style={{ color: user.userColor }}
                                >
                                    {user.userName}
                                    {user.isYou && ' (you)'}
                                </span>
                                {user.status === 'idle' && (
                                    <span className="online-popover__idle">(idle)</span>
                                )}
                                {user.status === 'away' && (
                                    <span className="online-popover__idle">(away)</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * WarningsIndicator - Shows warning count if any
 */
function WarningsIndicator({ count }) {
    if (count === 0) return null;

    return (
        <div className="status-bar__item status-bar__item--warning">
            <AlertTriangle size={10} />
            <span>{count} {count === 1 ? 'warning' : 'warnings'}</span>
        </div>
    );
}

/**
 * CursorsToggle - Toggle visibility of other users' cursors
 */
function CursorsToggle({ visible, onToggle }) {
    return (
        <button
            className={`status-bar__toggle ${visible ? 'status-bar__toggle--active' : ''}`}
            onClick={onToggle}
            title={visible ? 'Hide cursors' : 'Show cursors'}
        >
            {visible ? <Eye size={10} /> : <EyeOff size={10} />}
            <span>Cursors</span>
        </button>
    );
}

/**
 * RecordingIndicator - Shows active recording status
 */
function RecordingIndicator({ isRecording, duration, mode }) {
    if (!isRecording) return null;

    // Format duration as mm:ss
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="status-bar__recording">
            <Circle size={8} className="status-bar__recording-dot" />
            <span>REC {formatDuration(duration)}</span>
            {mode && <span className="status-bar__recording-mode">• {mode}</span>}
        </div>
    );
}

/**
 * FPSCounter - Shows current frame rate
 */
function FPSCounter({ fps }) {
    const getFpsClass = () => {
        if (fps >= 55) return 'status-bar__item--success';
        if (fps >= 30) return 'status-bar__item--warning';
        return 'status-bar__item--error';
    };

    return (
        <div className={`status-bar__item ${getFpsClass()}`}>
            <Zap size={10} />
            <span>{fps} FPS</span>
        </div>
    );
}

/**
 * AuthModeIndicator - Shows authentication mode (dev/prod)
 */
function AuthModeIndicator({ isDevMode, isAuthenticated, userName }) {
    if (isDevMode) {
        return (
            <div
                className="status-bar__item status-bar__item--dev-mode"
                title="Development mode - authentication bypassed"
            >
                <ShieldAlert size={10} />
                <span>Dev Mode</span>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div
                className="status-bar__item status-bar__item--auth"
                title={userName ? `Signed in as ${userName}` : 'Authenticated'}
            >
                <Shield size={10} />
                <span>Secure</span>
            </div>
        );
    }

    // Not authenticated and not in dev mode - shouldn't normally show
    return null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function StatusBar() {
    // Auth state
    const { isDevMode, isAuthenticated, userName } = useAuth();

    // Connection state
    const [isConnected, setIsConnected] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Users state
    const [onlineCount, setOnlineCount] = useState(1);

    // Warnings state
    const [warningCount, setWarningCount] = useState(0);

    // Cursors state
    const [cursorsVisible, setCursorsVisible] = useState(true);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingMode, setRecordingMode] = useState('Workspace');

    // FPS state
    const [fps, setFps] = useState(60);

    // Subscribe to presence system for online user count
    useEffect(() => {
        const handlePresenceChange = (users) => {
            setOnlineCount(users.length);
        };

        const cleanup = presenceSystem.onPresenceChange(handlePresenceChange);
        return cleanup;
    }, []);

    // FPS monitoring
    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationId;

        const measureFps = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = currentTime;
            }

            animationId = requestAnimationFrame(measureFps);
        };

        animationId = requestAnimationFrame(measureFps);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, []);

    // Recording timer
    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    // Listen for recording events from window (global state)
    useEffect(() => {
        const handleRecordingStart = (event) => {
            setIsRecording(true);
            setRecordingDuration(0);
            setRecordingMode(event.detail?.mode || 'Workspace');
        };

        const handleRecordingStop = () => {
            setIsRecording(false);
            setRecordingDuration(0);
        };

        window.addEventListener('recording:start', handleRecordingStart);
        window.addEventListener('recording:stop', handleRecordingStop);

        return () => {
            window.removeEventListener('recording:start', handleRecordingStart);
            window.removeEventListener('recording:stop', handleRecordingStop);
        };
    }, []);

    // Toggle cursors visibility
    const handleToggleCursors = useCallback(() => {
        setCursorsVisible(prev => {
            const newValue = !prev;
            // Emit event for cursor system to listen
            window.dispatchEvent(new CustomEvent('cursors:visibility', {
                detail: { visible: newValue }
            }));
            return newValue;
        });
    }, []);

    // Add handler for panel toggle
    const handleTogglePanel = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.toggle();
        }
    };

    // Add handler for clicking on warnings (opens logs filtered to warnings)
    const handleWarningsClick = () => {
        const controls = typeof getBottomPanelControls === 'function'
            ? getBottomPanelControls()
            : null;
        if (controls) {
            controls.showLogs();
        }
    };

    return (
        <div className="status-bar">
            {/* Left Zone: Auth, Sync, Online, Warnings */}
            <div className="status-bar__left">
                <AuthModeIndicator
                    isDevMode={isDevMode}
                    isAuthenticated={isAuthenticated}
                    userName={userName}
                />

                <div className="status-bar__divider" />

                <SyncStatus
                    isConnected={isConnected}
                    isSyncing={isSyncing}
                />

                <div className="status-bar__divider" />

                <OnlineUsersIndicator count={onlineCount} />

                {/* Warnings indicator - clickable to open logs */}
                {warningCount > 0 && (
                    <button
                        className="status-bar__item status-bar__item--warnings"
                        onClick={handleWarningsClick}
                        title="Click to view logs"
                    >
                        <AlertTriangle size={12} />
                        <span>{warningCount}</span>
                    </button>
                )}

                <div className="status-bar__divider" />

                <CursorsToggle
                    visible={cursorsVisible}
                    onToggle={handleToggleCursors}
                />

                <div className="status-bar__divider" />

                <VoiceCommandToggle size="sm" />
            </div>

            {/* Center Zone: Empty or future use */}
            <div className="status-bar__center">
                {/* Reserved for future status items */}
            </div>

            {/* Right Zone: Recording, FPS */}
            <div className="status-bar__right">
                <RecordingIndicator
                    isRecording={isRecording}
                    duration={recordingDuration}
                    mode={recordingMode}
                />

                <FPSCounter fps={fps} />

                {/* Panel toggle button - at the right end */}
                <button
                    className="status-bar__item status-bar__item--toggle"
                    onClick={handleTogglePanel}
                    title="Toggle output panel"
                    aria-label="Toggle output panel"
                >
                    <ChevronUp size={14} />
                </button>
            </div>
        </div>
    );
}

export default StatusBar;