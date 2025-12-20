// src/ui/react/components/collaboration/PeoplePanel/index.js
// Clean exports for the PeoplePanel module

// Main component
export { PeoplePanel, default } from "./PeoplePanel.jsx";

// Sub-components (can be used independently)
export { UserAvatar, UserAvatarGroup } from "./UserAvatar";
export { UserStatusEditor } from "./UserStatusEditor";

// Hook for custom implementations
export { usePeoplePanel } from "./usePeoplePanel.js";
