// src/ui/react/components/atoms/index.js
// Barrel export for all atomic components
// These are the foundational building blocks of the UI
// All atoms consume useAdaptive() for VR-first adaptive behavior

// =============================================================================
// RE-EXPORTED ATOMS (from common/)
// These existing components are already well-designed and adaptive
// =============================================================================

export { Button, IconButton, ButtonGroup } from '@UI/react/components/common/Button';
export { Icon } from '@UI/react/components/common/Icon';

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
