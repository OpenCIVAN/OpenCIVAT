// src/ui/react/components/collaboration/PeoplePanel/UserStatusEditor.jsx
// Popup for editing user status and custom message with emoji support

import React, { useState, useRef, useEffect } from "react";
import {
    X,
    Check,
    Smile
} from "lucide-react";

import { STATUS_OPTIONS } from "@UI/react/utils/statusConfig";
import "./UserStatusEditor.scss";

// Quick status presets with emoji
const STATUS_PRESETS = [
    { emoji: "💻", text: "Deep in code" },
    { emoji: "📊", text: "Analyzing data" },
    { emoji: "🔬", text: "Running experiments" },
    { emoji: "☕", text: "Coffee break" },
    { emoji: "🍕", text: "Lunch" },
    { emoji: "📞", text: "In a meeting" },
    { emoji: "🎧", text: "Focused work" },
    { emoji: "🏃", text: "BRB" },
    { emoji: "🌙", text: "Signing off soon" },
    { emoji: "🎉", text: "It's working!" },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function UserStatusEditor({
    currentStatus = "online",
    currentMessage = "",
    onSave,
    onClose
}) {
    // ---------------------------------------------------------------------------
    // STATE
    // ---------------------------------------------------------------------------

    const [status, setStatus] = useState(currentStatus);
    const [message, setMessage] = useState(currentMessage);
    const [showPresets, setShowPresets] = useState(false);

    const inputRef = useRef(null);
    const modalRef = useRef(null);

    // ---------------------------------------------------------------------------
    // EFFECTS
    // ---------------------------------------------------------------------------

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [status, message]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        // Delay to prevent immediate close from click that opened it
        setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const handleSave = () => {
        onSave(status, message.trim());
    };

    const handlePresetClick = (preset) => {
        setMessage(`${preset.emoji} ${preset.text}`);
        setShowPresets(false);
        inputRef.current?.focus();
    };

    const handleClearMessage = () => {
        setMessage("");
        inputRef.current?.focus();
    };

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <div className="user-status-editor__overlay">
            <div className="user-status-editor" ref={modalRef}>
                {/* Header */}
                <div className="user-status-editor__header">
                    <h4>Update your status</h4>
                    <button className="user-status-editor__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Status Options */}
                <div className="user-status-editor__statuses">
                    {STATUS_OPTIONS.map(option => {
                        const IconComponent = option.icon;
                        const isSelected = status === option.id;

                        return (
                            <button
                                key={option.id}
                                className={`user-status-editor__status ${isSelected ? "active" : ""}`}
                                onClick={() => setStatus(option.id)}
                            >
                                <IconComponent
                                    size={14}
                                    color={option.color}
                                    fill={option.fill ? option.color : "none"}
                                />
                                <div className="user-status-editor__status-info">
                                    <span className="user-status-editor__status-label">{option.label}</span>
                                    <span className="user-status-editor__status-desc">{option.description}</span>
                                </div>
                                {isSelected && <Check size={14} className="user-status-editor__check" />}
                            </button>
                        );
                    })}
                </div>

                {/* Custom Message */}
                <div className="user-status-editor__message-section">
                    <label>Custom message</label>
                    <div className="user-status-editor__message-input-wrapper">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="What are you working on?"
                            maxLength={100}
                            className="user-status-editor__message-input"
                        />
                        <button
                            className="user-status-editor__emoji-btn"
                            onClick={() => setShowPresets(!showPresets)}
                            title="Quick status presets"
                        >
                            <Smile size={16} />
                        </button>
                        {message && (
                            <button
                                className="user-status-editor__clear-btn"
                                onClick={handleClearMessage}
                                title="Clear message"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <span className="user-status-editor__char-count">
                        {message.length}/100
                    </span>
                </div>

                {/* Quick Presets */}
                {showPresets && (
                    <div className="user-status-editor__presets">
                        <div className="user-status-editor__presets-label">Quick presets</div>
                        <div className="user-status-editor__presets-grid">
                            {STATUS_PRESETS.map((preset, index) => (
                                <button
                                    key={index}
                                    className="user-status-editor__preset"
                                    onClick={() => handlePresetClick(preset)}
                                >
                                    <span className="user-status-editor__preset-emoji">{preset.emoji}</span>
                                    <span className="user-status-editor__preset-text">{preset.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="user-status-editor__actions">
                    <button
                        className="user-status-editor__btn user-status-editor__btn--cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="user-status-editor__btn user-status-editor__btn--save"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>

                {/* Audit reminder */}
                <div className="user-status-editor__audit-note">
                    <span>💡 Remember: Status messages are part of the session audit log</span>
                </div>
            </div>
        </div>
    );
}

export default UserStatusEditor;