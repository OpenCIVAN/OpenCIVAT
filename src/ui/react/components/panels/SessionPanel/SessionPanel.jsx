/**
 * SessionPanel — Google Meet–style session sharing UI.
 *
 * Lets users create a unique session link, copy it, join another session,
 * see who's connected, and generate an email invite placeholder.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { sessionManager } from '@Core/session/sessionManager.js';
import { provider } from '@Collaboration/yjs/yjsSetup.js';
import './SessionPanel.scss';

export function SessionPanel({ currentRoomId, roomMembers = [], onClose }) {
    // Always use sessionManager.getRoomId() as the Y.js session source of truth.
    // currentRoomId prop may reflect a server-side "project room" which can differ.
    const sessionId = sessionManager.getRoomId?.() || currentRoomId || 'unknown';
    const sessionUrl = `${window.location.origin}/rooms/${sessionId}`;

    const [copied, setCopied] = useState(false);
    const [joinInput, setJoinInput] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteMessage, setInviteMessage] = useState('');
    const [connStatus, setConnStatus] = useState('connecting');
    const panelRef = useRef(null);

    // Diagnostic log on mount — helps verify room ID chain
    useEffect(() => {
        console.log('[CIA Session] Panel mounted');
        console.log('[CIA Session] URL:', window.location.href);
        console.log('[CIA Session] Session ID (sessionManager):', sessionManager.getRoomId?.());
        console.log('[CIA Session] currentRoomId prop:', currentRoomId);
        console.log('[CIA Session] Resolved session ID:', sessionId);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track Y.js connection status with 400ms debounce.
    // Y.js fires `connecting → connected` in rapid succession on startup.
    // Without debouncing this causes a visible blink in the status indicator.
    useEffect(() => {
        let debounceTimer = null;
        const applyStatus = (status) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => setConnStatus(status || 'connecting'), 400);
        };

        try {
            // Read initial status synchronously (no debounce for first paint)
            setConnStatus(provider.wsconnectionstatus || 'connecting');
            const handleStatus = (event) => {
                console.log('[CIA Session] Connection status:', event.status);
                applyStatus(event.status);
            };
            provider.on('status', handleStatus);
            return () => {
                clearTimeout(debounceTimer);
                try { provider.off('status', handleStatus); } catch (e) {}
            };
        } catch (e) {
            // Provider not yet initialized — stay at 'connecting'
            console.log('[CIA Session] Provider not ready yet:', e.message);
        }
    }, []);

    // Close on Escape key
    useEffect(() => {
        const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [onClose]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(sessionUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            // Fallback: select + execCommand for older browsers / HTTPS issues
            const el = document.querySelector('.session-panel__url-input');
            if (el) { el.select(); document.execCommand('copy'); }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [sessionUrl]);

    const handleNewSession = useCallback(() => {
        // generateNewSession() creates a UUID and calls switchRoom(), which reloads
        sessionManager.generateNewSession();
    }, []);

    const handleJoin = useCallback(() => {
        const raw = joinInput.trim();
        if (!raw) return;
        let id = raw;
        // Strip origin + /rooms/ prefix if user pasted a full URL
        try {
            const url = new URL(raw);
            const m = url.pathname.match(/^\/rooms\/([^/]+)/);
            if (m) id = m[1];
        } catch (e) {
            // Not a URL — use as-is
        }
        sessionManager.switchRoom(id);
    }, [joinInput]);

    const handleGenerateInvite = useCallback(() => {
        const email = inviteEmail.trim();
        if (!email) return;
        const msg =
            `Hi,\n\n` +
            `You're invited to join a collaborative visualization session on CIA Web.\n\n` +
            `Click this link to join:\n${sessionUrl}\n\n` +
            `— sent via CIA Web\n\n` +
            `(Email sending is not configured yet. ` +
            `Copy this message and send it manually.)`;
        setInviteMessage(msg);
    }, [inviteEmail, sessionUrl]);

    const statusLabel = { connected: 'Connected', disconnected: 'Disconnected', connecting: 'Connecting…' }[connStatus] || 'Connecting…';
    const statusClass = { connected: 'session-panel__status--connected', disconnected: 'session-panel__status--disconnected', connecting: 'session-panel__status--connecting' }[connStatus] || 'session-panel__status--connecting';

    return (
        <div className="session-panel__backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="session-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="session-panel__header">
                    <div className="session-panel__title">
                        <span className={`session-panel__status-dot ${statusClass}`} title={statusLabel} />
                        Collaboration Session
                    </div>
                    <button className="session-panel__close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* ── Connection status ── */}
                <div className="session-panel__status-bar">
                    <span className={statusClass}>{statusLabel}</span>
                    <span className="session-panel__room-id" title={sessionId}>
                        ID: {sessionId.length > 20 ? `${sessionId.slice(0, 8)}…${sessionId.slice(-6)}` : sessionId}
                    </span>
                </div>

                {/* ── Share link ── */}
                <div className="session-panel__section">
                    <div className="session-panel__label">Share Session Link</div>
                    <div className="session-panel__row">
                        <input
                            className="session-panel__input session-panel__url-input"
                            value={sessionUrl}
                            readOnly
                            onClick={(e) => e.target.select()}
                            aria-label="Session URL"
                        />
                        <button className={`session-panel__btn ${copied ? 'session-panel__btn--success' : ''}`} onClick={handleCopy}>
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                    <button className="session-panel__btn session-panel__btn--ghost" onClick={handleNewSession}>
                        + New Session
                    </button>
                </div>

                {/* ── Join session ── */}
                <div className="session-panel__section">
                    <div className="session-panel__label">Join a Session</div>
                    <div className="session-panel__row">
                        <input
                            className="session-panel__input"
                            placeholder="Paste session ID or full link…"
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            aria-label="Join session input"
                        />
                        <button
                            className="session-panel__btn"
                            onClick={handleJoin}
                            disabled={!joinInput.trim()}
                        >
                            Join
                        </button>
                    </div>
                </div>

                {/* ── Connected users ── */}
                <div className="session-panel__section">
                    <div className="session-panel__label">
                        Connected Users
                        <span className="session-panel__count">{roomMembers.length}</span>
                    </div>
                    <div className="session-panel__users">
                        {roomMembers.length === 0 ? (
                            <div className="session-panel__empty">Only you are connected</div>
                        ) : (
                            roomMembers.map((member) => (
                                <div key={member.userId || member.id} className="session-panel__user">
                                    <span
                                        className="session-panel__user-dot"
                                        style={{ background: member.userColor || '#60a5fa' }}
                                    />
                                    <span className="session-panel__user-name">
                                        {member.userName || member.displayName || 'Unknown'}
                                        {member.isYou && <span className="session-panel__you"> (you)</span>}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Email invite placeholder ── */}
                <div className="session-panel__section session-panel__section--last">
                    <div className="session-panel__label">Invite by Email</div>
                    <div className="session-panel__row">
                        <input
                            className="session-panel__input"
                            type="email"
                            placeholder="Enter email address…"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateInvite()}
                            aria-label="Invite email"
                        />
                        <button
                            className="session-panel__btn"
                            onClick={handleGenerateInvite}
                            disabled={!inviteEmail.trim()}
                        >
                            Generate
                        </button>
                    </div>
                    {inviteMessage && (
                        <>
                            <div className="session-panel__invite-note">
                                Email sending is not configured yet — copy this message and send manually:
                            </div>
                            <textarea
                                className="session-panel__invite-msg"
                                value={inviteMessage}
                                readOnly
                                rows={6}
                                onClick={(e) => e.target.select()}
                                aria-label="Invite message"
                            />
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

export default SessionPanel;
