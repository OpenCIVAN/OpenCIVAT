/**
 * @file MemberRow.jsx
 * @description Reusable member/user row component for displaying user info.
 * Used in People tab, Voice tab participants, Chat conversations, etc.
 *
 * Features:
 * - Avatar with presence indicator
 * - Name and optional status message
 * - Contextual info (viewing, in voice, etc.)
 * - Hover actions
 * - Selection state
 *
 * @example
 * // Basic usage
 * <MemberRow user={user} onSelect={handleSelect} />
 *
 * @example
 * // With voice indicators
 * <MemberRow user={user} showVoiceStatus showActions />
 *
 * @example
 * // Compact mode
 * <MemberRow user={user} variant="compact" />
 */

import React, { memo, useCallback } from 'react';
import {
    MapPin,
    MessageSquare,
    Eye,
    EyeOff,
    MoreHorizontal,
    Mic,
    MicOff,
    Crown,
} from 'lucide-react';
import { PresenceIndicator } from '@UI/react/components/common/PresenceIndicator';
import { UserAvatar } from '@UI/react/components/common/UserAvatar';
import { Tooltip } from '@UI/react/components/common/Tooltip';
import './MemberRow.scss';

/**
 * @typedef {Object} User
 * @property {string} odbc - Unique client ID
 * @property {string} [userId] - User ID
 * @property {string} userName - Display name
 * @property {string} [userColor] - User's assigned color
 * @property {string} [status] - Presence status
 * @property {string} [statusMessage] - Custom status message
 * @property {boolean} [isYou] - Whether this is the current user
 * @property {boolean} [inVoice] - Whether user is in voice
 * @property {boolean} [isMuted] - Whether user is muted
 * @property {boolean} [isSpeaking] - Whether user is speaking
 * @property {boolean} [isRoomOwner] - Whether user is room owner
 * @property {string} [viewingDataset] - Dataset user is viewing
 * @property {string} [viewingView] - View user is looking at
 */

/**
 * @typedef {Object} MemberRowProps
 * @property {User} user - User data
 * @property {boolean} [isSelected=false] - Whether row is selected
 * @property {'default'|'compact'} [variant='default'] - Display variant
 * @property {boolean} [showVoiceStatus=false] - Show voice indicators
 * @property {boolean} [showViewing=false] - Show what user is viewing
 * @property {boolean} [showActions=false] - Show hover actions
 * @property {(userId: string) => void} [onSelect] - Selection handler
 * @property {(userId: string) => void} [onMessage] - Message action handler
 * @property {(userId: string) => void} [onGoToView] - Go to view handler
 * @property {(userId: string, visible: boolean) => void} [onToggleCursor] - Toggle cursor visibility
 * @property {(userId: string, e: React.MouseEvent) => void} [onMoreMenu] - More menu handler
 * @property {string} [className] - Additional CSS classes
 */

/**
 * Member/user row component.
 *
 * @param {MemberRowProps} props - Component props
 * @returns {React.ReactElement} The rendered row
 */
export const MemberRow = memo(function MemberRow({
    user,
    isSelected = false,
    variant = 'default',
    showVoiceStatus = false,
    showViewing = false,
    showActions = false,
    onSelect,
    onMessage,
    onGoToView,
    onToggleCursor,
    onMoreMenu,
    className = '',
}) {
    const {
        odbc,
        userId,
        userName,
        userColor,
        status = 'online',
        statusMessage,
        isYou,
        inVoice,
        isMuted,
        isSpeaking,
        isRoomOwner,
        viewingDataset,
        viewingView,
        cursorVisible = true,
    } = user;

    const id = odbc || userId;

    const handleClick = useCallback(() => {
        onSelect?.(id);
    }, [id, onSelect]);

    const handleMessage = useCallback((e) => {
        e.stopPropagation();
        onMessage?.(id);
    }, [id, onMessage]);

    const handleGoToView = useCallback((e) => {
        e.stopPropagation();
        onGoToView?.(id);
    }, [id, onGoToView]);

    const handleToggleCursor = useCallback((e) => {
        e.stopPropagation();
        onToggleCursor?.(id, !cursorVisible);
    }, [id, cursorVisible, onToggleCursor]);

    const handleMoreClick = useCallback((e) => {
        e.stopPropagation();
        onMoreMenu?.(id, e);
    }, [id, onMoreMenu]);

    // Determine presence status for indicator
    const presenceStatus = inVoice ? 'active' : status;

    return (
        <div
            className={`member-row member-row--${variant} ${isSelected ? 'member-row--selected' : ''} ${isYou ? 'member-row--you' : ''} ${className}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            {/* Avatar with presence */}
            <div className="member-row__avatar-wrapper">
                <UserAvatar userName={userName} color={userColor} size="sm" />
                <PresenceIndicator
                    status={presenceStatus}
                    size="xs"
                    pulse={isSpeaking}
                    className="member-row__presence"
                />
            </div>

            {/* Info */}
            <div className="member-row__info">
                <div className="member-row__name-row">
                    <span className="member-row__name" style={{ color: userColor }}>
                        {userName}
                    </span>
                    {isYou && <span className="member-row__you-badge">(You)</span>}
                    {isRoomOwner && (
                        <Tooltip content="Room Owner">
                            <Crown size={10} className="member-row__crown" />
                        </Tooltip>
                    )}
                </div>

                {/* Voice status */}
                {showVoiceStatus && inVoice && (
                    <div className="member-row__voice-status">
                        {isMuted ? <MicOff size={10} /> : <Mic size={10} />}
                        <span>{isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'In Voice'}</span>
                    </div>
                )}

                {/* Viewing info */}
                {showViewing && viewingView && (
                    <div className="member-row__viewing">
                        <Eye size={10} />
                        <span>{viewingView}</span>
                    </div>
                )}

                {/* Status message */}
                {statusMessage && variant !== 'compact' && (
                    <div className="member-row__status-message">{statusMessage}</div>
                )}
            </div>

            {/* Actions (show on hover) */}
            {showActions && !isYou && (
                <div className="member-row__actions">
                    {onGoToView && (
                        <Tooltip content="Go to View">
                            <button className="member-row__action" onClick={handleGoToView}>
                                <MapPin size={12} />
                            </button>
                        </Tooltip>
                    )}
                    {onMessage && (
                        <Tooltip content="Message">
                            <button className="member-row__action" onClick={handleMessage}>
                                <MessageSquare size={12} />
                            </button>
                        </Tooltip>
                    )}
                    {onToggleCursor && (
                        <Tooltip content={cursorVisible ? 'Hide Cursor' : 'Show Cursor'}>
                            <button className="member-row__action" onClick={handleToggleCursor}>
                                {cursorVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                        </Tooltip>
                    )}
                    {onMoreMenu && (
                        <button className="member-row__action member-row__action--more" onClick={handleMoreClick}>
                            <MoreHorizontal size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

export default MemberRow;