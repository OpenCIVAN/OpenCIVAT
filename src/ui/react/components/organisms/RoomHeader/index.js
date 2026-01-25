/**
 * RoomHeader
 * Room-level navigation bar with voice controls, presence, and chat access.
 */

export { RoomHeader } from './RoomHeader';
export { default } from './RoomHeader';

// Sub-components
export { RoomTab } from './RoomTab';
export { VoiceDropdown } from './VoiceDropdown';

// Logic exports
export {
    useRoomPrioritization,
    useVoiceState,
    useDropdowns,
    useRoomStatus,
    ROOM_HEADER_CONFIG,
} from './RoomHeader.logic';
