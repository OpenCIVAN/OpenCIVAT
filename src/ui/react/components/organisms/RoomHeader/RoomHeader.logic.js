/**
 * @file RoomHeader.logic.js
 * @description Business logic hooks for RoomHeader component
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Constants for room header configuration
 */
export const ROOM_HEADER_CONFIG = {
    maxVisibleTabs: 3,
    tabMaxWidth: 120,
};

/**
 * Hook to manage room prioritization
 * Viewing room is always first, then voice room, then others
 */
export function useRoomPrioritization(rooms, viewingRoomId, voiceRoomId) {
    const prioritizedRooms = useMemo(() => {
        return [...rooms].sort((a, b) => {
            if (a.id === viewingRoomId) return -1;
            if (b.id === viewingRoomId) return 1;
            if (a.id === voiceRoomId) return -1;
            if (b.id === voiceRoomId) return 1;
            return 0;
        });
    }, [rooms, viewingRoomId, voiceRoomId]);

    const visibleRooms = useMemo(() =>
        prioritizedRooms.slice(0, ROOM_HEADER_CONFIG.maxVisibleTabs),
        [prioritizedRooms]
    );

    const overflowRooms = useMemo(() =>
        prioritizedRooms.slice(ROOM_HEADER_CONFIG.maxVisibleTabs),
        [prioritizedRooms]
    );

    return { prioritizedRooms, visibleRooms, overflowRooms };
}

/**
 * Hook to manage voice state
 */
export function useVoiceState(rooms, voiceRoomId) {
    const voiceRoom = useMemo(() =>
        rooms.find(r => r.id === voiceRoomId) || null,
        [rooms, voiceRoomId]
    );

    const isInVoice = !!voiceRoomId;

    const availableVoiceRooms = useMemo(() =>
        rooms.filter(r => r.id !== voiceRoomId),
        [rooms, voiceRoomId]
    );

    return { voiceRoom, isInVoice, availableVoiceRooms };
}

/**
 * Hook to manage dropdown visibility
 */
export function useDropdowns() {
    const [showMoreRooms, setShowMoreRooms] = useState(false);
    const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

    const toggleMoreRooms = useCallback(() => {
        setShowMoreRooms(prev => !prev);
        setShowVoiceDropdown(false);
    }, []);

    const toggleVoiceDropdown = useCallback(() => {
        setShowVoiceDropdown(prev => !prev);
        setShowMoreRooms(false);
    }, []);

    const closeAllDropdowns = useCallback(() => {
        setShowMoreRooms(false);
        setShowVoiceDropdown(false);
    }, []);

    return {
        showMoreRooms,
        showVoiceDropdown,
        setShowMoreRooms,
        setShowVoiceDropdown,
        toggleMoreRooms,
        toggleVoiceDropdown,
        closeAllDropdowns,
    };
}

/**
 * Hook to get room status indicators
 */
export function useRoomStatus(roomId, viewingRoomId, voiceRoomId) {
    const isViewing = roomId === viewingRoomId;
    const isVoiceRoom = roomId === voiceRoomId;
    const isBothViewingAndVoice = isViewing && isVoiceRoom;

    return { isViewing, isVoiceRoom, isBothViewingAndVoice };
}
