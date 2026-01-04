/**
 * @file ChatTab.jsx
 * @description Chat tab for real-time messaging in the collaboration hub.
 * Connected to Y.js for real-time sync with other users.
 *
 * Features:
 * - Room chat synced via Y.js (persisted to PostgreSQL)
 * - Message bubbles with user avatars and colors
 * - System messages for annotations/events
 * - Message input with send on Enter
 * - Message deletion for own messages
 *
 * @see Right_Panel_Design_Specification.md - Chat Tab section
 *
 * @example
 * <ChatTab workspaceId="ws-1" />
 */

import React, { useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { SubtabBar } from '@UI/react/components/common/SubtabBar';

import { useChatTab } from './hooks/useChatTab';
import { MessageBubble } from './components/MessageBubble';
import { MessageInput } from './components/MessageInput';

import './ChatTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} ChatTabProps
 * @property {string} [workspaceId] - Current workspace ID
 */

/**
 * Chat tab component.
 * Provides real-time messaging synced via Y.js.
 *
 * @param {ChatTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function ChatTab({ workspaceId }) {
    const messagesEndRef = useRef(null);

    const {
        messages,
        isLoading,
        isSynced,
        currentUserId,
        activeSubtab,
        setActiveSubtab,
        subtabs,
        handleSend,
        handleDelete,
    } = useChatTab({ workspaceId });

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get subtab label for display
    const currentSubtabLabel = subtabs.find(t => t.id === activeSubtab)?.label || 'Room';

    return (
        <div className="chat-tab">
            {/* Header */}
            <div className="panel-header">
                <Icon name="messageSquare" size={14} className="panel-header__icon file-icon--blue" />
                <span className="panel-header__title">Chat</span>
                <div className="panel-header__status">
                    {isLoading ? (
                        <span className="chat-status chat-status--loading">
                            <Icon name="loader" size={12} className="spin" />
                            Syncing...
                        </span>
                    ) : isSynced ? (
                        <span className="chat-status chat-status--connected">
                            <Icon name="globe" size={12} />
                            Connected
                        </span>
                    ) : (
                        <span className="chat-status chat-status--offline">
                            Offline
                        </span>
                    )}
                </div>
            </div>

            {/* Subtab Bar */}
            <SubtabBar
                tabs={subtabs}
                activeTab={activeSubtab}
                onTabChange={setActiveSubtab}
            />

            {/* Chat scope indicator */}
            <div className="chat-tab__scope-indicator">
                <Icon name={activeSubtab === 'room' ? 'home' : activeSubtab === 'project' ? 'globe' : 'messageSquare'} size={12} />
                <span>{currentSubtabLabel} Chat</span>
                <span className="chat-tab__message-count">{messages.length} messages</span>
            </div>

            {/* Messages */}
            <div className="chat-tab__messages">
                {isLoading ? (
                    <div className="chat-tab__loading">
                        <Icon name="loader" size={24} className="spin" />
                        <span>Loading messages...</span>
                    </div>
                ) : activeSubtab === 'dm' ? (
                    <div className="chat-tab__empty">
                        <Icon name="messageSquare" size={32} />
                        <span>Direct Messages</span>
                        <span className="chat-tab__empty-hint">Select a person to start a conversation</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-tab__empty">
                        <Icon name="messageSquare" size={32} />
                        <span>No messages yet</span>
                        <span className="chat-tab__empty-hint">Start the conversation!</span>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput onSend={handleSend} disabled={isLoading || activeSubtab === 'dm'} />
        </div>
    );
}

// Export with both names for backwards compatibility
export { ChatTab as ChatPanelContent };
export default ChatTab;