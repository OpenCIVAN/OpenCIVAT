/**
 * @file VoiceCommandHelp.jsx
 * @description Voice command help modal showing all available commands.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - Grouped commands by category
 * - Wake words info
 * - Search/filter commands
 * - Collapsible category sections
 * - Keyboard shortcut tip
 *
 * @example
 * <VoiceCommandHelp
 *   isOpen={showHelp}
 *   onClose={() => setShowHelp(false)}
 * />
 */

import React, { useState, useMemo } from 'react';
import {
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
    ChevronDown,
} from 'lucide-react';
import { Modal } from '@UI/react/components/modals/Modal';
import { voiceCommandService } from '@Services/voice/voiceCommandService.js';
import './VoiceCommandHelp.scss';

/**
 * Command categories with metadata.
 */
const COMMAND_CATEGORIES = {
    camera: {
        label: 'Camera Controls',
        icon: Camera,
        description: 'Control the 3D view camera',
    },
    instance: {
        label: 'Instance Controls',
        icon: Layout,
        description: 'Manage visualization windows',
    },
    recording: {
        label: 'Recording',
        icon: Video,
        description: 'Screen and session recording',
    },
    annotation: {
        label: 'Annotations',
        icon: MessageSquare,
        description: 'Add notes and markers',
    },
    tool: {
        label: 'Tools',
        icon: Wrench,
        description: 'Switch between tools',
    },
    vr: {
        label: 'VR Controls',
        icon: Glasses,
        description: 'Virtual reality mode',
    },
    'voice-room': {
        label: 'Voice Chat',
        icon: Phone,
        description: 'Voice communication',
    },
    help: {
        label: 'Help',
        icon: HelpCircle,
        description: 'Get help',
    },
};

/**
 * Command descriptions for better UX.
 */
const COMMAND_DESCRIPTIONS = {
    'rotate left': 'Rotate view 15° left',
    'rotate right': 'Rotate view 15° right',
    'rotate up': 'Rotate view 15° up',
    'rotate down': 'Rotate view 15° down',
    'zoom in': 'Zoom camera in',
    'zoom out': 'Zoom camera out',
    'reset view': 'Reset to default view',
    'reset camera': 'Reset to default view',
    'close instance': 'Close current window',
    'new instance': 'Open new instance dialog',
    fullscreen: 'Enter fullscreen mode',
    'exit fullscreen': 'Exit fullscreen mode',
    'start recording': 'Start screen recording',
    'stop recording': 'Stop recording',
    'pause recording': 'Pause recording',
    'add annotation': 'Start adding annotation',
    'start annotation': 'Start adding annotation',
    'cancel annotation': 'Cancel current annotation',
    'delete annotation': 'Delete last annotation',
    'clear annotations': 'Clear all annotations',
    'select tool': 'Switch to select tool',
    'pan tool': 'Switch to pan tool',
    'zoom tool': 'Switch to zoom tool',
    'rotate tool': 'Switch to rotate tool',
    'measure tool': 'Switch to measure tool',
    'slice tool': 'Switch to slice tool',
    'enter VR': 'Enter VR mode',
    'exit VR': 'Exit VR mode',
    grab: 'Grab object (VR)',
    release: 'Release object (VR)',
    teleport: 'Teleport to location (VR)',
    'mute microphone': 'Mute your mic',
    'unmute microphone': 'Unmute your mic',
    'join voice': 'Join voice channel',
    'leave voice': 'Leave voice channel',
    help: 'Show this help',
    'what can I say': 'Show this help',
};

/**
 * @typedef {Object} VoiceCommandHelpProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {() => void} onClose - Close handler
 */

/**
 * Voice command help modal showing all available commands.
 *
 * @param {VoiceCommandHelpProps} props - Component props
 * @returns {React.ReactElement} The rendered modal
 */
export function VoiceCommandHelp({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
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
            const [category] = action.split(':');

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

    /**
     * Toggle category expansion.
     */
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Voice Commands"
            icon={Mic}
            size="lg"
        >
            <div className="voice-command-help">
                {/* Subtitle */}
                <p className="voice-command-help__subtitle">
                    Say <strong>"Hey CIA"</strong> followed by a command
                </p>

                {/* Search */}
                <div className="voice-command-help__search">
                    <Search size={14} className="voice-command-help__search-icon" />
                    <input
                        type="text"
                        placeholder="Search commands..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="voice-command-help__search-input"
                        autoFocus
                    />
                </div>

                {/* Commands */}
                <div className="voice-command-help__content">
                    {Object.entries(filteredGroups).map(([category, commands]) => {
                        const categoryInfo = COMMAND_CATEGORIES[category] || {
                            label: category,
                            icon: HelpCircle,
                        };
                        const CategoryIcon = categoryInfo.icon;
                        const isExpanded = expandedCategories.has(category);

                        return (
                            <div key={category} className="voice-command-help__category">
                                <button
                                    className="voice-command-help__category-header"
                                    onClick={() => toggleCategory(category)}
                                    aria-expanded={isExpanded}
                                >
                                    <CategoryIcon size={16} />
                                    <span>{categoryInfo.label}</span>
                                    <span className="voice-command-help__category-count">
                                        {commands.length}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`voice-command-help__chevron ${isExpanded ? 'expanded' : ''}`}
                                    />
                                </button>

                                {isExpanded && (
                                    <div className="voice-command-help__commands">
                                        {commands.map((cmd) => (
                                            <div key={cmd.phrase} className="voice-command-help__command">
                                                <span className="voice-command-help__phrase">
                                                    "{cmd.phrase}"
                                                </span>
                                                <span className="voice-command-help__description">
                                                    {cmd.description}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {Object.keys(filteredGroups).length === 0 && (
                        <div className="voice-command-help__empty">
                            No commands match "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* Tip */}
                <div className="voice-command-help__tip">
                    <strong>Tip:</strong> Press <kbd>V</kbd> to toggle voice commands
                </div>
            </div>
        </Modal>
    );
}

export default VoiceCommandHelp;