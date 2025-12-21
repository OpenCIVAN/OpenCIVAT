/**
 * @file index.js
 * @description Shared bar components that can be used in SecondaryHeader or SecondaryFooter.
 * 
 * These components are intentionally kept in a shared location so they can be
 * easily moved between header and footer without reorganizing folder structures.
 * 
 * @example
 * // In SecondaryHeader.jsx or SecondaryFooter.jsx:
 * import { 
 *   StackedNavBlock, 
 *   ActiveViewSelector,
 *   SegmentedToggle 
 * } from '@UI/react/components/bars';
 */

// Navigation
export { StackedNavBlock, NAV_DIRECTIONS } from './StackedNavBlock';
export { CanvasNavigation } from './CanvasNavigation';

// View Selection
export { ActiveViewSelector } from './ActiveViewSelector';
export { InstanceSelector } from './InstanceSelector';

// Toggle Controls
export { FlowDirectionToggle } from './FlowDirectionToggle';
export { LayoutModeToggle } from '@UI/react/components/controls/LayoutModeToggle';
export { SegmentedToggle } from '@UI/react/components/common/SegmentedToggle';

// Buttons
export { LabeledIconButton } from './LabeledIconButton';
export { PopoutButtons } from './PopoutButtons';

// Voice
export { VoiceControlsPanel } from './VoiceControlsPanel';
export { VoiceQuickControls } from './VoiceQuickControls';

// Selectors
export { RoomPresenceIndicator } from './RoomPresenceIndicator';
export { WorkspaceSelector } from './WorkspaceSelector';

// Controls
export { EditToolbar } from './EditToolbar';
export { CanvasSizeDisplay } from './CanvasSizeDisplay';