// src/ui/react/components/panels/RightPanel/tabs/ChatTab.jsx
// Chat tab for the unified right panel
//
// Features:
// - Room, Breakout, and Direct message tabs
// - Message bubbles with avatars
// - System messages for annotations/events
// - DM conversation selector
// - Message input with attachments and mentions

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    MessageSquare,
    Send,
    Smile,
    Paperclip,
    AtSign,
    Globe,
    Briefcase,
    User,
    ChevronDown,
    Plus,
    X,
} from 'lucide-react';

// =============================================================================
// CHAT TABS CONFIG
// =============================================================================

const CHAT_TABS = [
    { id: 'room', label: 'Room', icon: Globe, color: 'blue', unread: 0 },
    { id: 'breakout', label: 'Breakout', icon: Briefcase, color: 'purple', unread: 3 },
    { id: 'dm', label: 'Direct', icon: User, color: 'pink', unread: 1 },
];

// =============================================================================
// SAMPLE DATA
// =============================================================================

const SAMPLE_MESSAGES = {
    room: [
        { id: 'm1', user: 'Dr. Smith', color: 'pink', text: 'Can everyone see the tumor region highlighted?', time: '10:32 AM', isMe: false },
        { id: 'm2', user: 'You', color: 'green', text: 'Yes, I can see it clearly. The margins look well-defined.', time: '10:33 AM', isMe: true },
        { id: 'm3', user: 'Dr. Jones', color: 'amber', text: 'I agree. Let me add a measurement annotation.', time: '10:34 AM', isMe: false },
        { id: 'm4', user: 'Dr. Smith', color: 'pink', text: '@You can you zoom in on the left hemisphere?', time: '10:35 AM', isMe: false, mention: true },
        { id: 'm5', user: 'System', color: 'muted', text: 'Dr. Jones added annotation: "Tumor diameter - 24.5mm"', time: '10:36 AM', isSystem: true },
    ],
    breakout: [
        { id: 'b1', user: 'Alex Chen', color: 'purple', text: 'Should we discuss the surgical approach here?', time: '10:40 AM', isMe: false },
        { id: 'b2', user: 'Dr. Smith', color: 'pink', text: "Yes, let's review the options.", time: '10:41 AM', isMe: false },
        { id: 'b3', user: 'You', color: 'green', text: "I'll share my screen with the 3D model.", time: '10:42 AM', isMe: true },
    ],
    dm: [
        { id: 'd1', user: 'Dr. Smith', color: 'pink', text: 'Hey, do you have a minute to discuss the case privately?', time: '9:15 AM', isMe: false },
        { id: 'd2', user: 'You', color: 'green', text: "Sure, what's on your mind?", time: '9:16 AM', isMe: true },
        { id: 'd3', user: 'Dr. Smith', color: 'pink', text: 'I wanted to get your opinion on the prognosis before we present to the team.', time: '9:17 AM', isMe: false },
    ],
};

const DM_CONVERSATIONS = [
    { id: 'dm1', user: 'Dr. Smith', color: 'pink', lastMessage: 'I wanted to get your opinion...', time: '9:17 AM', unread: 1 },
    { id: 'dm2', user: 'Dr. Jones', color: 'amber', lastMessage: 'Thanks for the file!', time: 'Yesterday', unread: 0 },
    { id: 'dm3', user: 'Alex Chen', color: 'purple', lastMessage: 'See you in the meeting', time: 'Mon', unread: 0 },
];

// =============================================================================
// CHAT TAB BUTTONS
// =============================================================================

function ChatTabButtons({ tabs, activeTab, onTabChange }) {
    return (
        <div className="chat-tabs">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        className={`chat-tabs__btn ${isActive ? 'chat-tabs__btn--active' : ''}`}
                        data-color={tab.color}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <Icon size={12} />
                        {tab.label}
                        {tab.unread > 0 && (
                            <span className="chat-tabs__badge" style={{ background: `var(--color-accent-${tab.color})` }}>
                                {tab.unread}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// DM SELECTOR
// =============================================================================

function DMSelector({ conversations, selectedDM, onSelect, isOpen, onToggle }) {
    const selectedConvo = conversations.find(c => c.id === selectedDM);

    return (
        <div className="dm-selector">
            <button className="dm-selector__trigger" onClick={onToggle}>
                <div
                    className="dm-selector__avatar"
                    style={{ '--avatar-color': `var(--color-accent-${selectedConvo?.color || 'pink'})` }}
                >
                    {selectedConvo?.user.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DS'}
                </div>
                <span className="dm-selector__name">{selectedConvo?.user || 'Select conversation'}</span>
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="dm-selector__dropdown">
                    {conversations.map(convo => (
                        <div
                            key={convo.id}
                            className={`dm-selector__item ${selectedDM === convo.id ? 'dm-selector__item--selected' : ''}`}
                            onClick={() => { onSelect(convo.id); onToggle(); }}
                        >
                            <div
                                className="dm-selector__avatar"
                                style={{ '--avatar-color': `var(--color-accent-${convo.color})` }}
                            >
                                {convo.user.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="dm-selector__info">
                                <div className="dm-selector__user">{convo.user}</div>
                                <div className="dm-selector__preview">{convo.lastMessage}</div>
                            </div>
                            <div className="dm-selector__meta">
                                <div className="dm-selector__time">{convo.time}</div>
                                {convo.unread > 0 && (
                                    <div className="dm-selector__unread">{convo.unread}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button className="dm-selector__new">
                        <Plus size={12} />
                        New Conversation
                    </button>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

function MessageBubble({ message }) {
    if (message.isSystem) {
        return (
            <div className="message message--system">
                {message.text}
            </div>
        );
    }

    const initials = message.user.split(' ').map(n => n[0]).join('').slice(0, 2);

    return (
        <div className={`message ${message.isMe ? 'message--me' : ''}`}>
            <div
                className="message__avatar"
                style={{ '--avatar-color': `var(--color-accent-${message.color})` }}
            >
                {initials}
            </div>

            <div className="message__content">
                {!message.isMe && (
                    <span className="message__user" style={{ color: `var(--color-accent-${message.color})` }}>
                        {message.user}
                    </span>
                )}
                <div className={`message__bubble ${message.mention ? 'message__bubble--mention' : ''}`}>
                    {message.text}
                </div>
                <span className="message__time">{message.time}</span>
            </div>
        </div>
    );
}

// =============================================================================
// MESSAGE INPUT
// =============================================================================

function MessageInput({ onSend }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (message.trim()) {
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
                <button className="chat-input__btn">
                    <Paperclip size={16} />
                </button>

                <textarea
                    ref={textareaRef}
                    className="chat-input__textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                />

                <button className="chat-input__btn">
                    <AtSign size={16} />
                </button>

                <button className="chat-input__btn">
                    <Smile size={16} />
                </button>

                <button
                    className={`chat-input__send ${message.trim() ? 'chat-input__send--active' : ''}`}
                    onClick={handleSend}
                    disabled={!message.trim()}
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChatPanelContent({ workspaceId }) {
    const [activeTab, setActiveTab] = useState('room');
    const [selectedDM, setSelectedDM] = useState('dm1');
    const [showDMList, setShowDMList] = useState(false);
    const [messages, setMessages] = useState(SAMPLE_MESSAGES);
    const messagesEndRef = useRef(null);

    // Get current messages
    const currentMessages = activeTab === 'dm'
        ? messages.dm
        : messages[activeTab] || [];

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages]);

    // Handle send message
    const handleSend = useCallback((text) => {
        const newMessage = {
            id: `m${Date.now()}`,
            user: 'You',
            color: 'green',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
        };

        setMessages(prev => ({
            ...prev,
            [activeTab]: [...(prev[activeTab] || []), newMessage],
        }));
    }, [activeTab]);

    return (
        <div className="chat-tab">
            {/* Header */}
            <div className="panel-header">
                <MessageSquare size={14} className="panel-header__icon file-icon--blue" />
                <span className="panel-header__title">Chat</span>
            </div>

            {/* Chat Tabs */}
            <div className="chat-tab__tabs-container">
                <ChatTabButtons
                    tabs={CHAT_TABS}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* DM Selector (only for DM tab) */}
            {activeTab === 'dm' && (
                <DMSelector
                    conversations={DM_CONVERSATIONS}
                    selectedDM={selectedDM}
                    onSelect={setSelectedDM}
                    isOpen={showDMList}
                    onToggle={() => setShowDMList(!showDMList)}
                />
            )}

            {/* Messages */}
            <div className="chat-tab__messages">
                {currentMessages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput onSend={handleSend} />
        </div>
    );
}

export default ChatPanelContent;