/**
 * @file MessageBubble.jsx
 * @description Message bubble component for displaying chat messages.
 * Supports user messages with avatars and system messages.
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} userId - Sender user ID
 * @property {string} userName - Sender display name
 * @property {string} userColor - Sender color
 * @property {string} text - Message content
 * @property {number} timestamp - Message timestamp
 * @property {boolean} [isSystem] - Whether this is a system message
 * @property {Object} [metadata] - Additional message metadata
 * @property {boolean} [metadata.isFederated] - Whether message is from Matrix federation
 * @property {string} [metadata.federation_source] - Federation source (e.g., 'matrix')
 * @property {string} [metadata.matrix_sender] - Matrix user ID of sender
 */

/**
 * @typedef {Object} MessageBubbleProps
 * @property {Message} message - The message to display
 * @property {string} currentUserId - Current user's ID
 * @property {function} onDelete - Callback when delete is clicked
 */

/**
 * Message bubble component.
 * Displays a chat message with avatar, content, and optional delete action.
 *
 * @param {MessageBubbleProps} props - Component props
 * @returns {React.ReactElement} The rendered message
 */
export function MessageBubble({ message, currentUserId, onDelete }) {
    const isMe = message.userId === currentUserId;
    const isSystem = message.isSystem;
    const isFederated = message.metadata?.isFederated || message.metadata?.federation_source === 'matrix';
    const matrixSender = message.metadata?.matrix_sender;

    if (isSystem) {
        return (
            <div className="message message--system">
                {message.text}
            </div>
        );
    }

    const initials = (message.userName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    const userColor = message.userColor || '#2196F3';

    // Extract server name from Matrix user ID for display
    const serverName = matrixSender ? matrixSender.split(':')[1] : null;

    return (
        <div className={`message ${isMe ? 'message--me' : ''} ${isFederated ? 'message--federated' : ''}`}>
            <div
                className="message__avatar"
                style={{ '--avatar-color': userColor }}
            >
                {initials}
            </div>

            <div className="message__content">
                {!isMe && (
                    <div className="message__user-info">
                        <span className="message__user" style={{ color: userColor }}>
                            {message.userName}
                        </span>
                        {isFederated && (
                            <span
                                className="message__federation-badge"
                                title={`Federated user from ${serverName || 'Matrix server'}`}
                            >
                                <Icon name="globe" size={10} />
                                {serverName && <span className="message__server-name">{serverName}</span>}
                            </span>
                        )}
                    </div>
                )}
                <div className="message__bubble">
                    {message.text}
                </div>
                <span className="message__time">{time}</span>
            </div>

            {isMe && (
                <button
                    className="message__delete"
                    onClick={() => onDelete(message.id)}
                    title="Delete message"
                >
                    <Icon name="delete" size={12} />
                </button>
            )}
        </div>
    );
}

export default MessageBubble;