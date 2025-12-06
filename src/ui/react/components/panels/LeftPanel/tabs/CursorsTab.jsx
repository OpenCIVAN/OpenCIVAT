// src/ui/react/components/panels/LeftPanel/tabs/CursorsTab.jsx
// Cursors tab content for the unified left panel
//
// Features:
// - My cursor settings (visibility, color)
// - Default behavior settings for new workspaces
// - Links to fine-grained controls in other panels
// - Cursor color presets

import React, { useState, useCallback, useEffect } from 'react';
import {
    Users,
    MousePointer2,
    Palette,
    Radio,
    X,
    Link,
    LayoutGrid,
    Wand2,
    Settings,
    ChevronRight,
    Check,
    Eye,
    EyeOff,
    Tag,
    Crosshair,
} from 'lucide-react';
import {
    // Cursor name visibility
    getCursorNamesVisible,
    setCursorNamesVisible,
    onCursorNamesVisibilityChange,
    // My cursor visibility to others
    getMyCursorVisible,
    setMyCursorVisible,
    // My cursor color
    getMyCursorColor,
    setMyCursorColor,
    // Self cursor projection
    getSelfCursorVisible,
    setSelfCursorVisible,
    onSelfCursorVisibilityChange,
    // Show others' cursors
    getShowOthersCursors,
    setShowOthersCursors,
    onShowOthersCursorsChange,
} from '@Collaboration/presence/cursors.js';

// =============================================================================
// CURSOR COLOR PRESETS
// =============================================================================

const CURSOR_COLORS = [
    { name: 'Green', value: '#34d399' },
    { name: 'Blue', value: '#60a5fa' },
    { name: 'Purple', value: '#c084fc' },
    { name: 'Pink', value: '#fb7185' },
    { name: 'Amber', value: '#fbbf24' },
    { name: 'Teal', value: '#7dd3fc' },
    { name: 'Red', value: '#f87171' },
    { name: 'White', value: '#ffffff' },
];

const FOLLOW_MODES = [
    { id: 'none', label: 'None', icon: X },
    { id: 'follow', label: 'Follow', icon: Radio },
    { id: 'broadcast', label: 'Broadcast', icon: Link },
];

// =============================================================================
// TOGGLE SWITCH
// =============================================================================

function ToggleSwitch({ value, onChange }) {
    return (
        <button
            className={`toggle-switch ${value ? 'toggle-switch--active' : ''}`}
            onClick={() => onChange(!value)}
        >
            <span className="toggle-switch__thumb" />
        </button>
    );
}

// =============================================================================
// SETTING ROW
// =============================================================================

function SettingRow({ icon: Icon, iconColor, title, description, children }) {
    return (
        <div className="cursor-setting-row">
            <div className="cursor-setting-row__icon" style={{ '--icon-color': iconColor }}>
                <Icon size={16} />
            </div>
            <div className="cursor-setting-row__info">
                <span className="cursor-setting-row__title">{title}</span>
                <span className="cursor-setting-row__description">{description}</span>
            </div>
            <div className="cursor-setting-row__control">
                {children}
            </div>
        </div>
    );
}

// =============================================================================
// COLOR PICKER
// =============================================================================

function ColorPicker({ selectedColor, onSelectColor }) {
    return (
        <div className="cursor-color-picker">
            {CURSOR_COLORS.map(color => (
                <button
                    key={color.value}
                    className={`cursor-color-picker__swatch ${selectedColor === color.value ? 'cursor-color-picker__swatch--selected' : ''}`}
                    style={{ '--swatch-color': color.value }}
                    onClick={() => onSelectColor(color.value)}
                    title={color.name}
                >
                    {selectedColor === color.value && (
                        <Check size={12} style={{ color: color.value === '#ffffff' ? '#000' : '#fff' }} />
                    )}
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// LINK CARD
// =============================================================================

function LinkCard({ icon: Icon, title, description, color, onClick }) {
    return (
        <button
            className="cursor-link-card"
            style={{ '--link-color': color }}
            onClick={onClick}
        >
            <div className="cursor-link-card__icon">
                <Icon size={18} />
            </div>
            <div className="cursor-link-card__content">
                <span className="cursor-link-card__title">{title}</span>
                <span className="cursor-link-card__description">{description}</span>
            </div>
            <ChevronRight size={16} className="cursor-link-card__arrow" />
        </button>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CursorsPanelContent({ workspaceId, onNavigateToPanel }) {
    const [showColorPicker, setShowColorPicker] = useState(false);

    // My cursor visibility to others (synced via Y.js)
    const [cursorVisible, setCursorVisible] = useState(getMyCursorVisible);

    // My cursor color (synced via Y.js)
    const [cursorColor, setCursorColor] = useState(() => getMyCursorColor() || '#34d399');

    // Cursor names visibility (local preference)
    const [showCursorNames, setShowCursorNames] = useState(getCursorNamesVisible);

    // Self cursor projection visibility (local preference)
    const [showSelfCursor, setShowSelfCursor] = useState(getSelfCursorVisible);

    // Show others' cursors (local preference)
    const [showOthersCursors, setShowOthersCursorsState] = useState(getShowOthersCursors);

    // Default follow mode (UI-only for now)
    const [defaultFollowMode, setDefaultFollowMode] = useState('none');

    // Listen for external changes
    useEffect(() => {
        const cleanupNames = onCursorNamesVisibilityChange((visible) => {
            setShowCursorNames(visible);
        });
        const cleanupSelf = onSelfCursorVisibilityChange((visible) => {
            setShowSelfCursor(visible);
        });
        const cleanupOthers = onShowOthersCursorsChange((visible) => {
            setShowOthersCursorsState(visible);
        });
        return () => {
            cleanupNames();
            cleanupSelf();
            cleanupOthers();
        };
    }, []);

    // Handle my cursor visibility toggle
    const handleCursorVisibleToggle = useCallback((visible) => {
        setMyCursorVisible(visible);
        setCursorVisible(visible);
    }, []);

    // Handle cursor color change
    const handleColorChange = useCallback((color) => {
        setMyCursorColor(color);
        setCursorColor(color);
    }, []);

    // Handle cursor names toggle
    const handleCursorNamesToggle = useCallback((visible) => {
        setCursorNamesVisible(visible);
        setShowCursorNames(visible);
    }, []);

    // Handle self cursor visibility toggle
    const handleSelfCursorToggle = useCallback((visible) => {
        setSelfCursorVisible(visible);
        setShowSelfCursor(visible);
    }, []);

    // Handle show others toggle
    const handleShowOthersToggle = useCallback((visible) => {
        setShowOthersCursors(visible);
        setShowOthersCursorsState(visible);
    }, []);

    return (
        <div className="cursors-tab">
            {/* Header */}
            <div className="panel-header">
                <Users size={14} className="panel-header__icon file-icon--pink" />
                <span className="panel-header__title">Cursors</span>
            </div>

            {/* Intro */}
            <div className="cursors-tab__intro">
                Room-wide defaults for cursor visibility and behavior
            </div>

            {/* Content */}
            <div className="cursors-tab__content">
                {/* My Cursor Section */}
                <div className="cursors-tab__section">
                    <div className="cursors-tab__section-header">My Cursor</div>

                    {/* Visibility toggle */}
                    <div className="cursor-setting-card">
                        <SettingRow
                            icon={MousePointer2}
                            iconColor="var(--color-accent-green)"
                            title="Visible to others"
                            description="Others can see your cursor in shared views"
                        >
                            <ToggleSwitch
                                value={cursorVisible}
                                onChange={handleCursorVisibleToggle}
                            />
                        </SettingRow>
                    </div>

                    {/* Cursor color */}
                    <div className="cursor-setting-card">
                        <div className="cursor-setting-row cursor-setting-row--color">
                            <div className="cursor-setting-row__icon" style={{ '--icon-color': cursorColor }}>
                                <Palette size={16} />
                            </div>
                            <div className="cursor-setting-row__info">
                                <span className="cursor-setting-row__title">Cursor Color</span>
                                <span className="cursor-setting-row__description">Your cursor color in shared views</span>
                            </div>
                            <button
                                className="cursor-color-button"
                                style={{ '--current-color': cursorColor }}
                                onClick={() => setShowColorPicker(!showColorPicker)}
                            />
                        </div>
                        {showColorPicker && (
                            <ColorPicker
                                selectedColor={cursorColor}
                                onSelectColor={(color) => {
                                    handleColorChange(color);
                                    setShowColorPicker(false);
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Display Options Section */}
                <div className="cursors-tab__section">
                    <div className="cursors-tab__section-header">Display Options</div>

                    {/* Show others' cursors */}
                    <div className="cursor-setting-card">
                        <SettingRow
                            icon={Users}
                            iconColor="var(--color-accent-pink)"
                            title="Show others' cursors"
                            description="See other users' cursors in your views"
                        >
                            <ToggleSwitch
                                value={showOthersCursors}
                                onChange={handleShowOthersToggle}
                            />
                        </SettingRow>
                    </div>

                    {/* Show cursor names */}
                    <div className="cursor-setting-card">
                        <SettingRow
                            icon={Tag}
                            iconColor="var(--color-accent-amber)"
                            title="Show cursor names"
                            description="Display name labels on other users' cursors"
                        >
                            <ToggleSwitch
                                value={showCursorNames}
                                onChange={handleCursorNamesToggle}
                            />
                        </SettingRow>
                    </div>

                    {/* Show my projected cursor */}
                    <div className="cursor-setting-card">
                        <SettingRow
                            icon={Crosshair}
                            iconColor="var(--color-accent-teal)"
                            title="Show my projected cursor"
                            description="See your own cursor rendered in your color"
                        >
                            <ToggleSwitch
                                value={showSelfCursor}
                                onChange={handleSelfCursorToggle}
                            />
                        </SettingRow>
                    </div>

                    {/* Default follow mode */}
                    <div className="cursor-setting-card">
                        <div className="cursor-setting-row">
                            <div className="cursor-setting-row__icon" style={{ '--icon-color': 'var(--color-accent-blue)' }}>
                                <Radio size={16} />
                            </div>
                            <div className="cursor-setting-row__info">
                                <span className="cursor-setting-row__title">Default Follow Mode</span>
                                <span className="cursor-setting-row__description">When joining shared views</span>
                            </div>
                        </div>
                        <div className="follow-mode-buttons">
                            {FOLLOW_MODES.map(mode => {
                                const ModeIcon = mode.icon;
                                return (
                                    <button
                                        key={mode.id}
                                        className={`follow-mode-btn ${defaultFollowMode === mode.id ? 'follow-mode-btn--active' : ''}`}
                                        onClick={() => setDefaultFollowMode(mode.id)}
                                    >
                                        <ModeIcon size={10} />
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Fine-Grained Controls Section */}
                <div className="cursors-tab__section cursors-tab__section--links">
                    <div className="cursors-tab__section-header">Fine-Grained Controls</div>

                    <LinkCard
                        icon={LayoutGrid}
                        title="Workspace Members"
                        description="Per-user cursor visibility in current workspace"
                        color="var(--color-accent-amber)"
                        onClick={() => onNavigateToPanel?.('layout')}
                    />

                    <LinkCard
                        icon={Wand2}
                        title="Instance Layers"
                        description="Per-instance cursor controls and follow mode"
                        color="var(--color-accent-purple)"
                        onClick={() => onNavigateToPanel?.('instance-tools')}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="panel-footer panel-footer--info">
                <Settings size={12} />
                <span>Changes apply to all new views automatically</span>
            </div>
        </div>
    );
}

export default CursorsPanelContent;