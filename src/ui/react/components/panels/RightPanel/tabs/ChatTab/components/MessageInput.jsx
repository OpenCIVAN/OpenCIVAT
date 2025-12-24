/**
 * @file MessageInput.jsx
 * @description Message input component for composing chat messages.
 * Features textarea with send on Enter and action buttons.
 */

import React, { useState, useRef } from 'react';
import { Icon } from '@UI/react/components/common/Icon';

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
                <button className="chat-input__btn" disabled={disabled}>
                    <Icon name="paperclip" size={16} />
                </button>

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

                <button className="chat-input__btn" disabled={disabled}>
                    <Icon name="atSign" size={16} />
                </button>

                <button className="chat-input__btn" disabled={disabled}>
                    <Icon name="smile" size={16} />
                </button>

                <button
                    className={`chat-input__send ${message.trim() && !disabled ? 'chat-input__send--active' : ''}`}
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                >
                    <Icon name="send" size={14} />
                </button>
            </div>
        </div>
    );
}

export default MessageInput;