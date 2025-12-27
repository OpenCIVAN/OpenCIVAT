/**
 * @file PeopleTab.jsx
 * @description People tab showing project members with presence status.
 * Part of the Right Panel collaboration hub.
 *
 * Features:
 * - Sub-tabs: Room (current), Breakout (all rooms), Project (full roster)
 * - Presence indicators (online, voice, VR, away, DND)
 * - Quick actions (message, go to view, toggle cursor)
 * - VR session cards with join options
 * - Settings for presence preferences
 *
 * @see Right_Panel_Design_Specification.md - People Tab section
 *
 * @example
 * <PeopleTab workspaceId="ws-1" roomId="room-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { SubtabBar } from '@UI/react/components/common/SubtabBar';

import { usePeopleTab } from './hooks/usePeopleTab';
import { RoomSubtab } from './components/RoomSubtab';
import { BreakoutSubtab } from './components/BreakoutSubtab';
import { ProjectSubtab } from './components/ProjectSubtab';

import './PeopleTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * @typedef {Object} PeopleTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {string} [roomId] - Current room ID
 */

/**
 * People tab component.
 * Shows project members organized by room, breakout, or project scope.
 *
 * @param {PeopleTabProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function PeopleTab({ workspaceId, roomId }) {
    const {
        activeSubtab,
        setActiveSubtab,
        subtabs,
        searchQuery,
        setSearchQuery,
        clearSearch,
        searchPlaceholder,
        selectedMember,
        handleSelectMember,
        onlineCount,
        isInitialized,
    } = usePeopleTab();

    return (
        <div className="people-tab">
            {/* Header */}
            <div className="panel-header">
                <Icon name="users" size={14} className="panel-header__icon file-icon--pink" />
                <span className="panel-header__title">People</span>
                <span className="panel-header__count">{onlineCount} online</span>
            </div>

            {/* Subtab Bar */}
            <SubtabBar
                tabs={subtabs}
                activeTab={activeSubtab}
                onTabChange={setActiveSubtab}
            />

            {/* Search */}
            <div className="panel-search">
                <div className="panel-search__wrapper">
                    <Icon name="search" size={12} className="search-icon" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                    />
                    {searchQuery && (
                        <button className="clear-button" onClick={clearSearch}>
                            <Icon name="close" size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Connection Status */}
            {!isInitialized && (
                <div className="people-tab__connection-status">
                    Connecting to presence server...
                </div>
            )}

            {/* Subtab Content */}
            <div className="people-tab__content">
                {activeSubtab === 'room' && (
                    <RoomSubtab
                        roomId={roomId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                    />
                )}
                {activeSubtab === 'breakout' && (
                    <BreakoutSubtab
                        workspaceId={workspaceId}
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                    />
                )}
                {activeSubtab === 'project' && (
                    <ProjectSubtab
                        searchQuery={searchQuery}
                        selectedMember={selectedMember}
                        onSelectMember={handleSelectMember}
                    />
                )}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <button className="panel-footer__btn panel-footer__btn--primary">
                    <Icon name="userPlus" size={11} />
                    <span>Invite</span>
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Raise Hand">
                    <Icon name="hand" size={11} />
                </button>
                <button className="panel-footer__btn panel-footer__btn--icon" title="Settings">
                    <Icon name="settings" size={11} />
                </button>
            </div>
        </div>
    );
}

// Export with both names for backwards compatibility
export { PeopleTab as PeoplePanelContent };
export default PeopleTab;