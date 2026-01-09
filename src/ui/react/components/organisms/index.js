// src/ui/react/components/organisms/index.js
// Barrel export for all organism components
// Organisms are complex UI components composed of molecules and atoms

// =============================================================================
// ORGANISMS (complex composed components)
// =============================================================================

// InstanceCard - View/instance card with color bar and metadata
export { InstanceCard, INSTANCE_CARD_VARIANTS, INSTANCE_CARD_COLOR_POSITIONS } from './InstanceCard';

// ToolPanel - Slide-out tool panel with header and content
export { ToolPanel } from './ToolPanel';

// WorkspaceOverlay - Full-screen overlay for workspace modes
export { WorkspaceOverlay } from './WorkspaceOverlay';

// ResizableSections - Resizable panel sections
export { ResizableSections } from './ResizableSections';

// PropertyPanel - Property inspector/editor panel
export { PropertyPanel } from './PropertyPanel';

// FilterBar - Search and filter bar
export { FilterBar } from './FilterBar';

// =============================================================================
// TOOLBAR/BAR ORGANISMS (moved from bars/)
// =============================================================================

// RoomPresenceIndicator - Room indicator with presence avatars
export { RoomPresenceIndicator } from './RoomPresenceIndicator';

// ViewContextBlock - Unified view context display (mode, view, links, actions)
export { ViewContextBlock } from './ViewContextBlock';

// VoiceControlsPanel - Voice command controls panel
export { VoiceControlsPanel } from './VoiceControlsPanel';

// =============================================================================
// MODE TOGGLE ORGANISMS (moved from controls/)
// =============================================================================

// LayoutModeToggle - Normal/Isolation/Subset mode toggle (built on SegmentedToggle)
export {
    LayoutModeToggle,
    LayoutModeIndicator,
    LAYOUT_MODES,
    LAYOUT_MODE_INFO,
    useLayoutModeToggle,
    useLayoutModeKeyboardShortcut,
} from './LayoutModeToggle';

// ViewModeToggle - Desktop/VR mode toggle (built on SegmentedToggle)
export {
    ViewModeToggle,
    ViewModeIndicator,
    VIEW_MODES,
    useViewModeToggle,
    useWebXRAvailability,
    useViewModeKeyboardShortcut,
    useGlobalKeyboardShortcuts,
} from './ViewModeToggle';

// =============================================================================
// LINK MANAGER PANELS (View Linking System)
// =============================================================================

// ViewLinkManager - Main panel for managing view-to-view links
// UserFollowingPanel - Panel for following other users' views
// WorkspaceLinksHub - Overview of all sync groups in workspace
export {
    ViewLinkManager,
    UserFollowingPanel,
    WorkspaceLinksHub,
    LINK_PROPERTIES,
    LINK_MODES,
    getPropertyById,
    getModeById,
    getModeIconChar,
} from './LinkManagerPanels';
