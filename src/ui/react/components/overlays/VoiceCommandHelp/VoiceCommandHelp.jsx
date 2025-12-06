// src/ui/react/components/overlays/VoiceCommandHelp/VoiceCommandHelp.jsx
// Voice command help overlay showing all available commands
//
// Features:
// - Grouped commands by category
// - Wake words info
// - Search/filter
// - ESC to close
// - Glassmorphism styling

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    X,
    Mic,
    Camera,
    Layout,
    Video,
    MessageSquare,
    Wrench,
    Glasses,
    Phone,
    HelpCircle,
    Search,
} from "lucide-react";
import { voiceCommandService } from "@Services/voice/voiceCommandService.js";
import "./VoiceCommandHelp.scss";

// Command categories with metadata
const COMMAND_CATEGORIES = {
    camera: {
        label: "Camera Controls",
        icon: Camera,
        description: "Control the 3D view camera",
    },
    instance: {
        label: "Instance Controls",
        icon: Layout,
        description: "Manage visualization windows",
    },
    recording: {
        label: "Recording",
        icon: Video,
        description: "Screen and session recording",
    },
    annotation: {
        label: "Annotations",
        icon: MessageSquare,
        description: "Add notes and markers",
    },
    tool: {
        label: "Tools",
        icon: Wrench,
        description: "Switch between tools",
    },
    vr: {
        label: "VR Controls",
        icon: Glasses,
        description: "Virtual reality mode",
    },
    "voice-room": {
        label: "Voice Chat",
        icon: Phone,
        description: "Voice communication",
    },
    help: {
        label: "Help",
        icon: HelpCircle,
        description: "Get help",
    },
};

// Command descriptions for better UX
const COMMAND_DESCRIPTIONS = {
    "rotate left": "Rotate view 15° left",
    "rotate right": "Rotate view 15° right",
    "rotate up": "Rotate view 15° up",
    "rotate down": "Rotate view 15° down",
    "zoom in": "Zoom camera in",
    "zoom out": "Zoom camera out",
    "reset view": "Reset to default view",
    "reset camera": "Reset to default view",
    "close instance": "Close current window",
    "new instance": "Open new instance dialog",
    fullscreen: "Enter fullscreen mode",
    "exit fullscreen": "Exit fullscreen mode",
    "start recording": "Start screen recording",
    "stop recording": "Stop recording",
    "pause recording": "Pause recording",
    "add annotation": "Start adding annotation",
    "start annotation": "Start adding annotation",
    "cancel annotation": "Cancel current annotation",
    "delete annotation": "Delete last annotation",
    "clear annotations": "Clear all annotations",
    "select tool": "Switch to select tool",
    "pan tool": "Switch to pan tool",
    "zoom tool": "Switch to zoom tool",
    "rotate tool": "Switch to rotate tool",
    "measure tool": "Switch to measure tool",
    "slice tool": "Switch to slice tool",
    "enter VR": "Enter VR mode",
    "exit VR": "Exit VR mode",
    grab: "Grab object (VR)",
    release: "Release object (VR)",
    teleport: "Teleport to location (VR)",
    "mute microphone": "Mute your mic",
    "unmute microphone": "Unmute your mic",
    "join voice": "Join voice channel",
    "leave voice": "Leave voice channel",
    help: "Show this help",
    "what can I say": "Show this help",
};

/**
 * VoiceCommandHelp - Modal overlay showing voice commands
 */
export function VoiceCommandHelp({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState(
        new Set(Object.keys(COMMAND_CATEGORIES))
    );

    // Get commands from service
    const commandGrammar = useMemo(() => {
        return voiceCommandService.getCommandGrammar?.() || {};
    }, []);

    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups = {};

        Object.entries(commandGrammar).forEach(([phrase, { action }]) => {
            const [category] = action.split(":");

            if (!groups[category]) {
                groups[category] = [];
            }

            groups[category].push({
                phrase,
                action,
                description: COMMAND_DESCRIPTIONS[phrase] || phrase,
            });
        });

        return groups;
    }, [commandGrammar]);

    // Filter commands by search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) {
            return groupedCommands;
        }

        const query = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(groupedCommands).forEach(([category, commands]) => {
            const matchingCommands = commands.filter(
                (cmd) =>
                    cmd.phrase.toLowerCase().includes(query) ||
                    cmd.description.toLowerCase().includes(query)
            );

            if (matchingCommands.length > 0) {
                filtered[category] = matchingCommands;
            }
        });

        return filtered;
    }, [groupedCommands, searchQuery]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose?.();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, handleKeyDown]);

    // Toggle category expansion
    const toggleCategory = (category) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    };

    if (!isOpen) return null;

    const content = (
        <div className="voice-help-overlay" onClick={handleBackdropClick}>
            <div className="voice-help" role="dialog" aria-modal="true">
                {/* Header */}
                <header className="voice-help__header">
                    <div className="voice-help__title-row">
                        <Mic size={24} className="voice-help__icon" />
                        <h2 className="voice-help__title">Voice Commands</h2>
                        <button
                            className="voice-help__close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <p className="voice-help__subtitle">
                        Say <strong>"Hey CIA"</strong> followed by a command
                    </p>

                    {/* Search */}
                    <div className="voice-help__search">
                        <Search size={14} className="voice-help__search-icon" />
                        <input
                            type="text"
                            placeholder="Search commands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="voice-help__search-input"
                            autoFocus
                        />
                    </div>
                </header>

                {/* Commands */}
                <div className="voice-help__content">
                    {Object.entries(filteredGroups).map(([category, commands]) => {
                        const categoryInfo = COMMAND_CATEGORIES[category] || {
                            label: category,
                            icon: HelpCircle,
                        };
                        const Icon = categoryInfo.icon;
                        const isExpanded = expandedCategories.has(category);

                        return (
                            <section key={category} className="voice-help__category">
                                <button
                                    className="voice-help__category-header"
                                    onClick={() => toggleCategory(category)}
                                    aria-expanded={isExpanded}
                                >
                                    <Icon size={16} className="voice-help__category-icon" />
                                    <span className="voice-help__category-title">
                                        {categoryInfo.label}
                                    </span>
                                    <span className="voice-help__category-count">
                                        {commands.length}
                                    </span>
                                    <span
                                        className={`voice-help__category-chevron ${isExpanded ? "voice-help__category-chevron--expanded" : ""}`}
                                    >
                                        ›
                                    </span>
                                </button>

                                {isExpanded && (
                                    <ul className="voice-help__command-list">
                                        {commands.map((cmd) => (
                                            <li key={cmd.phrase} className="voice-help__command">
                                                <code className="voice-help__phrase">{cmd.phrase}</code>
                                                <span className="voice-help__description">
                                                    {cmd.description}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })}

                    {Object.keys(filteredGroups).length === 0 && (
                        <div className="voice-help__empty">
                            No commands match "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="voice-help__footer">
                    <div className="voice-help__tip">
                        <strong>Tip:</strong> Press <kbd>V</kbd> to toggle voice commands
                    </div>
                </footer>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

export default VoiceCommandHelp;