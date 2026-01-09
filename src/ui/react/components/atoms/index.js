// src/ui/react/components/atoms/index.js
// Barrel export for all atomic components
// These are the foundational building blocks of the UI
// All atoms consume useAdaptive() for VR-first adaptive behavior

// =============================================================================
// RE-EXPORTED ATOMS (from common/)
// These existing components are already well-designed and adaptive
// =============================================================================

export { Button, IconButton, ButtonGroup } from './Button';
export { Icon, IconLoader, getIconComponent, IconChevronDown, IconClose, IconCheck, IconSearch, IconDot, IconWarning, IconLock } from './Icon';
export { Dropdown, DropdownMenu, DropdownSelect, useDropdown } from './Dropdown';
export { IconOverlay, SlashedIcon, createSlashedIcon } from './IconOverlay';
export { Tooltip, TooltipProvider, useTooltip } from './Tooltip';
export { FileStateIndicator } from './FileStateIndicator';
export { PresenceIndicator } from './PresenceIndicator';
export { UserAvatar, UserAvatarGroup } from './UserAvatar';

// =============================================================================
// NEW ATOMS (created for atomic design migration)
// =============================================================================

// IconLabel - Icon + text label combination (most common pattern)
export { IconLabel } from './IconLabel';

// Badge - Small status/count indicator
export { Badge } from './Badge';

// StatusDot - Status indicator with predefined states
export { StatusDot } from './StatusDot';

// ColorDot - Arbitrary color indicator
export { ColorDot } from './ColorDot';

// Toggle - Switch/checkbox control
export { Toggle } from './Toggle';

// Divider - Visual separator
export { Divider } from './Divider';

// Spinner - Loading indicator
export { Spinner } from './Spinner';

// Text - Typography component
export { Text } from './Text';

// Chip - Interactive tag/pill component
export { Chip } from './Chip';

// Thumbnail - Image thumbnail with loading states
export { Thumbnail } from './Thumbnail';

// DropdownPortal - Portal-based dropdown container
export { DropdownPortal } from './DropdownPortal';

// =============================================================================
// LINK SYSTEM BADGES
// =============================================================================

// LinkBadges - Badge atoms for the view linking system
export { LinkBadge, ViewerBadge, HubBadge, ModeBadge, SyncStatusIndicator } from './LinkBadges';
