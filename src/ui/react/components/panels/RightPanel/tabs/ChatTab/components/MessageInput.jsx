/**
 * @file MessageInput.jsx
 * @description Message input component for composing chat messages.
 * Features textarea with send on Enter and action buttons.
 */

import React, { useState, useRef } from 'react';
import { IconButton } from '@UI/react/components/atoms';

/**
 * @typedef {Object} MessageInputProps
 * @property {function} onSend - Callback when message is sent
 * @property {boolean} [disabled] - Whether input is disabled
 */

/**
 * Message input component.
 * Provides textarea and buttons for composing messages.
 *
 * @param {MessageInputProps} props - Component props
 * @returns {React.ReactElement} The rendered input
 */
export function MessageInput({ onSend, disabled }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-input">
            <div className="chat-input__wrapper">
                <IconButton
                    icon="paperclip"
                    disabled={disabled}
                    size="sm"
                    variant="ghost"
                    tooltip="Attach file"
                    className="chat-input__btn"
                />

                <textarea
                    ref={textareaRef}
                    className="chat-input__textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? "Connecting..." : "Type a message..."}
                    rows={1}
                    disabled={disabled}
                />

                <IconButton
                    icon="atSign"
                    disabled={disabled}
                    size="sm"
                    variant="ghost"
                    tooltip="Mention user"
                    className="chat-input__btn"
                />

                <IconButton
                    icon="smile"
                    disabled={disabled}
                    size="sm"
                    variant="ghost"
                    tooltip="Add emoji"
                    className="chat-input__btn"
                />

                <IconButton
                    icon="send"
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    size="sm"
                    variant="primary"
                    tooltip="Send message"
                    className={`chat-input__send ${message.trim() && !disabled ? 'chat-input__send--active' : ''}`}
                />
            </div>
        </div>
    );
}

export default MessageInput;