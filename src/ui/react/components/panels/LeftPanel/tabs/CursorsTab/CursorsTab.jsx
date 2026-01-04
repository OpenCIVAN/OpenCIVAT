/**
 * @file CursorsTab.jsx
 * @description Cursors tab - cursor visibility and settings.
 *
 * Features:
 * - ALL CAPS header styling like Files/Datasets
 * - ResizableSections for settings and users
 * - CIEDE2000 color distance for accessible differentiation
 * - Admin/user color preferences with fallback
 *
 * @see Left_Panel_Design_Specification.docx - Section 8 Cursors Tab
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates
} from '@UI/react/components/organisms/ResizableSections';
import { CURSOR_PALETTE, assignColorsToUsers } from './utils';
import './CursorsTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Sample online users - replace with real presence data
const SAMPLE_USERS = [
    { id: 'user-1', name: 'You', isSelf: true, preferredColor: '#2dd4bf' },
    { id: 'user-2', name: 'Dr. Sarah Smith', preferredColor: '#fb7185' },
    { id: 'user-3', name: 'Alex Chen' },
];

const DEFAULT_SECTION_STATES = {
    settings: { expanded: true, flexGrow: 2 },
    online: { expanded: true, flexGrow: 1 },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * User cursor row component.
 *
 * @param {Object} props
 * @param {Object} props.user - User data
 * @param {string} props.color - Assigned color hex
 * @param {string} props.colorName - Color name for tooltip
 * @param {Function} props.onToggleVisibility - Toggle visibility handler
 * @param {Function} props.onChangeColor - Change color handler
 */
function UserCursorRow({ user, color, colorName, onToggleVisibility, onChangeColor }) {
    const [showColorPicker, setShowColorPicker] = useState(false);

    return (
        <div className={`cursor-row ${user.isSelf ? 'cursor-row--self' : ''}`}>
            <div
                className="cursor-row__color"
                style={{ backgroundColor: color }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title={`${colorName} - Click to change`}
            />
            <span className="cursor-row__name">
                {user.name}
                {user.isSelf && <span className="cursor-row__you">(you)</span>}
            </span>
            <button
                className="cursor-row__visibility"
                onClick={() => onToggleVisibility(user.id)}
                title={user.isVisible ? 'Hide cursor' : 'Show cursor'}
            >
                {user.isVisible ? <Icon name="eye" size={14} /> : <Icon name="eyeOff" size={14} />}
            </button>

            {/* Color picker dropdown */}
            {showColorPicker && (
                <div className="cursor-row__color-picker">
                    {CURSOR_PALETTE.map(paletteColor => (
                        <button
                            key={paletteColor.hex}
                            className={`cursor-row__color-option ${color === paletteColor.hex ? 'cursor-row__color-option--active' : ''}`}
                            style={{ backgroundColor: paletteColor.hex }}
                            title={paletteColor.name}
                            onClick={() => {
                                onChangeColor(user.id, paletteColor.hex);
                                setShowColorPicker(false);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Cursors panel content component.
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Current workspace ID
 */
export function CursorsPanelContent({ workspaceId }) {
    // User state with visibility
    const [users, setUsers] = useState(() =>
        SAMPLE_USERS.map(u => ({ ...u, isVisible: true }))
    );
    const [showAllCursors, setShowAllCursors] = useState(true);
    const [cursorSize, setCursorSize] = useState('medium');
    const [showLabels, setShowLabels] = useState(true);
    const [showTrails, setShowTrails] = useState(false);

    // Section states for resizable sections
    const { states: sectionStates, toggleSection, resizeSection } = useSectionStates(DEFAULT_SECTION_STATES);

    // Compute color assignments using CIEDE2000 algorithm
    const colorAssignments = useMemo(() => {
        return assignColorsToUsers(users);
    }, [users]);

    // Get self user color for settings panel
    const selfUser = users.find(u => u.isSelf);
    const selfColor = selfUser ? colorAssignments.get(selfUser.id) : null;

    // Handlers
    const toggleUserVisibility = useCallback((userId) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, isVisible: !u.isVisible } : u
        ));
    }, []);

    const changeUserColor = useCallback((userId, color) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, preferredColor: color } : u
        ));
    }, []);

    const toggleAllCursors = useCallback(() => {
        const newValue = !showAllCursors;
        setShowAllCursors(newValue);
        setUsers(prev => prev.map(u => ({ ...u, isVisible: newValue })));
    }, [showAllCursors]);

    // Count visible
    const visibleCount = users.filter(u => u.isVisible).length;

    return (
        <div className="cursors-tab">
            {/* Header - ALL CAPS like other tabs */}
            <div className="panel-header panel-header--cyan">
                <Icon name="mousePointer" size={16} className="panel-header__icon" />
                <span className="panel-header__title">Cursors</span>
                <span className="panel-header__count">{visibleCount}/{users.length}</span>
            </div>

            {/* Quick toggle */}
            <div className="cursors-tab__quick-toggle">
                <button
                    className={`quick-toggle-btn ${showAllCursors ? 'quick-toggle-btn--active' : ''}`}
                    onClick={toggleAllCursors}
                >
                    {showAllCursors ? <Icon name="eye" size={14} /> : <Icon name="eyeOff" size={14} />}
                    {showAllCursors ? 'Hide All' : 'Show All'}
                </button>
            </div>

            {/* Resizable Sections */}
            <ResizableSectionsContainer
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
                onSectionResize={resizeSection}
            >
                {/* Settings Section */}
                <ResizableSection
                    id="settings"
                    icon="settings"
                    iconColorClass="icon-amber"
                    label="Display Settings"
                >
                    <div className="cursors-tab__settings-content">
                        <div className="setting-row">
                            <span>Cursor Size</span>
                            <select
                                value={cursorSize}
                                onChange={(e) => setCursorSize(e.target.value)}
                                className="setting-select"
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                        <div className="setting-row">
                            <span>Show Labels</span>
                            <button
                                className={`setting-toggle ${showLabels ? 'setting-toggle--on' : ''}`}
                                onClick={() => setShowLabels(!showLabels)}
                            >
                                {showLabels ? 'On' : 'Off'}
                            </button>
                        </div>
                        <div className="setting-row">
                            <span>Cursor Trails</span>
                            <button
                                className={`setting-toggle ${showTrails ? 'setting-toggle--on' : ''}`}
                                onClick={() => setShowTrails(!showTrails)}
                            >
                                {showTrails ? 'On' : 'Off'}
                            </button>
                        </div>

                        {/* My Cursor Color */}
                        <div className="setting-row setting-row--colors">
                            <span>My Color</span>
                            <div className="color-swatches">
                                {CURSOR_PALETTE.map(paletteColor => (
                                    <button
                                        key={paletteColor.hex}
                                        className={`color-swatch ${selfColor?.hex === paletteColor.hex ? 'color-swatch--active' : ''}`}
                                        style={{ backgroundColor: paletteColor.hex }}
                                        title={paletteColor.name}
                                        onClick={() => selfUser && changeUserColor(selfUser.id, paletteColor.hex)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </ResizableSection>

                {/* Online Users Section - Collapsible at bottom */}
                <ResizableSection
                    id="online"
                    icon="users"
                    iconColorClass="icon-cyan"
                    label="Online Users"
                    count={users.length}
                >
                    <div className="cursors-tab__users-list">
                        {users.map(user => {
                            const colorInfo = colorAssignments.get(user.id);
                            return (
                                <UserCursorRow
                                    key={user.id}
                                    user={user}
                                    color={colorInfo?.hex || '#888888'}
                                    colorName={colorInfo?.name || 'Unknown'}
                                    onToggleVisibility={toggleUserVisibility}
                                    onChangeColor={changeUserColor}
                                />
                            );
                        })}
                    </div>
                </ResizableSection>
            </ResizableSectionsContainer>
        </div>
    );
}

export default CursorsPanelContent;