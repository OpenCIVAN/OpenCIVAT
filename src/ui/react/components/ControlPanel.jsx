// src/ui/react/components/ControlPanel.jsx
import React, { useState } from "react";
import {
    Settings,
    Camera,
    Layers,
    Activity,
    Users,
    MessageSquare,
    Mic,
    MicOff,
    Eye,
    EyeOff
} from "lucide-react";
import { textChat } from "@Collaboration/communication/textChat.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

export function ControlPanel() {
    const [activeTab, setActiveTab] = useState('tools');
    const [micEnabled, setMicEnabled] = useState(false);
    const [cursorsVisible, setCursorsVisible] = useState(true);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [connectedUsers, setConnectedUsers] = useState([]);

    // Get connected users periodically
    React.useEffect(() => {
        const updateUsers = () => {
            const users = presenceSystem.getOnlineUsers();
            setConnectedUsers(users);
        };

        updateUsers();
        const interval = setInterval(updateUsers, 3000);

        return () => clearInterval(interval);
    }, []);

    // Listen for chat messages
    React.useEffect(() => {
        const handleMessage = (message) => {
            setMessages(prev => [...prev, message]);
        };

        // Subscribe to text chat if available
        if (textChat && textChat.onMessage) {
            textChat.onMessage(handleMessage);
        }

        return () => {
            // Cleanup
        };
    }, []);

    const handleSendMessage = () => {
        if (messageInput.trim() && textChat) {
            textChat.sendMessage(messageInput.trim());
            setMessageInput('');
        }
    };

    const toggleMic = () => {
        setMicEnabled(!micEnabled);
        // TODO: Actually toggle voice chat when implemented
    };

    const toggleCursors = () => {
        setCursorsVisible(!cursorsVisible);
        // Toggle cursor visibility
        if (window.CIA?.instanceCollaboration) {
            // This would need to be implemented per instance
            console.log(`Cursors ${cursorsVisible ? 'hidden' : 'shown'}`);
        }
    };

    return (
        <div className="control-panel">
            <div className="control-panel__header">
                <Settings size={20} />
                <h3>Controls</h3>
            </div>

            <div className="control-panel__tabs">
                <button
                    className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tools')}
                    title="Tools"
                >
                    <Layers size={18} />
                </button>
                <button
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                    title="Users"
                >
                    <Users size={18} />
                </button>
                <button
                    className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chat')}
                    title="Chat"
                >
                    <MessageSquare size={18} />
                </button>
                <button
                    className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>

            <div className="control-panel__content">
                {activeTab === 'tools' && (
                    <div className="tools-section">
                        <h4>Visualization Tools</h4>
                        <div className="tool-info">
                            <p>Tools are available per instance:</p>
                            <ul>
                                <li>📏 Distance measurement</li>
                                <li>📐 Angle measurement</li>
                                <li>✂️ Clipping planes</li>
                                <li>📍 Annotations</li>
                                <li>🎨 Color maps</li>
                                <li>🔲 Wireframe mode</li>
                            </ul>
                            <p className="hint">Use the controls in each instance header</p>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-section">
                        <h4>Connected Users ({connectedUsers.length})</h4>
                        <div className="users-list">
                            {connectedUsers.map(user => (
                                <div key={user.id} className="user-item">
                                    <div
                                        className="user-color"
                                        style={{ backgroundColor: user.color }}
                                    />
                                    <span className="user-name">{user.name}</span>
                                    <span className="user-status">
                                        {user.isActive ? '🟢' : '🔴'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="collaboration-controls">
                            <button
                                className={`control-btn ${micEnabled ? 'active' : ''}`}
                                onClick={toggleMic}
                            >
                                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                                Voice Chat
                            </button>

                            <button
                                className={`control-btn ${cursorsVisible ? 'active' : ''}`}
                                onClick={toggleCursors}
                            >
                                {cursorsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                Show Cursors
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="chat-section">
                        <h4>Text Chat</h4>
                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <div className="no-messages">No messages yet</div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className="chat-message">
                                        <span className="chat-author">{msg.userName}:</span>
                                        <span className="chat-text">{msg.text}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="chat-input-container">
                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleSendMessage();
                                }}
                            />
                            <button
                                className="chat-send"
                                onClick={handleSendMessage}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="settings-section">
                        <h4>Settings</h4>
                        <div className="settings-list">
                            <div className="setting-item">
                                <label>Performance Mode</label>
                                <select defaultValue="balanced">
                                    <option value="quality">Quality</option>
                                    <option value="balanced">Balanced</option>
                                    <option value="performance">Performance</option>
                                </select>
                            </div>

                            <div className="setting-item">
                                <label>Grid Layout</label>
                                <select defaultValue="auto">
                                    <option value="auto">Auto</option>
                                    <option value="single">Single</option>
                                    <option value="grid-2x2">2x2 Grid</option>
                                    <option value="grid-3x3">3x3 Grid</option>
                                </select>
                            </div>

                            <div className="setting-item">
                                <label>Theme</label>
                                <select defaultValue="dark">
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>

                            <div className="setting-item">
                                <button className="reset-btn">
                                    Reset All Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}