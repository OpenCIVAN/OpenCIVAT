/**
 * @file RoomSubtab.jsx
 * @description Room subtab showing users in the current room.
 * Displays users grouped by voice status (in voice vs in room).
 *
 * @example
 * <RoomSubtab
 *   roomId="room-1"
 *   searchQuery=""
 *   selectedMember={null}
 *   onSelectMember={handleSelect}
 * />
 */

import React, { useMemo } from 'react';
import { Mic, Users } from 'lucide-react';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from '@UI/react/components/common/ResizableSections';
import { MemberRow } from '@UI/react/components/common/MemberRow';
import { EmptyState } from '@UI/react/components/common/EmptyState';
import { useRoomPresence } from '@UI/react/hooks/useRoomPresence.js';

/**
 * @typedef {Object} RoomSubtabProps
 * @property {string} roomId - Current room ID
 * @property {string} searchQuery - Search filter query
 * @property {string|null} selectedMember - Selected member ID
 * @property {(memberId: string) => void} onSelectMember - Selection handler
 */

/**
 * Room subtab component.
 * Shows users in current room, grouped by voice status.
 *
 * @param {RoomSubtabProps} props - Component props
 * @returns {React.ReactElement} The rendered subtab
 */
export function RoomSubtab({
    roomId,
    searchQuery,
    selectedMember,
    onSelectMember,
}) {
    const { inVoice, notInVoice } = useRoomPresence(roomId);

    // Filter by search query
    const filteredInVoice = useMemo(() => {
        if (!searchQuery.trim()) return inVoice;
        const q = searchQuery.toLowerCase();
        return inVoice.filter(u => u.userName?.toLowerCase().includes(q));
    }, [inVoice, searchQuery]);

    const filteredNotInVoice = useMemo(() => {
        if (!searchQuery.trim()) return notInVoice;
        const q = searchQuery.toLowerCase();
        return notInVoice.filter(u => u.userName?.toLowerCase().includes(q));
    }, [notInVoice, searchQuery]);

    // Section states for resizable sections
    const { states: sectionStates, toggleSection } = useSectionStates({
        voice: { expanded: true, flexGrow: 1 },
        room: { expanded: true, flexGrow: 2 },
    });

    return (
        <ResizableSectionsContainer
            className="people-tab__sections"
            sectionStates={sectionStates}
            onSectionToggle={toggleSection}
        >
            <ResizableSection
                id="voice"
                icon={Mic}
                iconColorClass="icon-green"
                label="In Voice"
                count={filteredInVoice.length}
            >
                {filteredInVoice.length === 0 ? (
                    <EmptyState
                        icon={Mic}
                        title="No one in voice"
                        size="sm"
                    />
                ) : (
                    filteredInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                            showVoiceStatus
                        />
                    ))
                )}
            </ResizableSection>

            <ResizableSection
                id="room"
                icon={Users}
                iconColorClass="icon-blue"
                label="In Room"
                count={filteredNotInVoice.length}
            >
                {filteredNotInVoice.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No other users in room"
                        size="sm"
                    />
                ) : (
                    filteredNotInVoice.map(user => (
                        <MemberRow
                            key={user.clientId || user.userId}
                            user={user}
                            isSelected={selectedMember === (user.clientId || user.userId)}
                            onSelect={onSelectMember}
                        />
                    ))
                )}
            </ResizableSection>
        </ResizableSectionsContainer>
    );
}

export default RoomSubtab;