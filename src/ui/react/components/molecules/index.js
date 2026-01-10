// src/ui/react/components/molecules/index.js
// Barrel export for all molecule components
// Molecules are composed from atoms and provide higher-level UI patterns

// =============================================================================
// MOLECULES (composed from atoms)
// =============================================================================

// LabeledButton - Icon button with visible text label
export { LabeledButton } from './LabeledButton';

// LabeledIconButton - Standalone icon button with label (for toolbars)
export { LabeledIconButton } from './LabeledIconButton';

// TabButton - Tab/navigation button with optional badge
export { TabButton } from './TabButton';

// MenuItem - Dropdown/context menu item
export { MenuItem } from './MenuItem';

// DirectionalButton - Navigation button for D-pads and navigators
export { DirectionalButton } from './DirectionalButton';

// ToggleGroup - Mutually exclusive toggle buttons
export { ToggleGroup } from './ToggleGroup';

// StatusIndicator - Status dot with label
export { StatusIndicator } from './StatusIndicator';

// InfoRow - Label + value display row
export { InfoRow } from './InfoRow';

// SearchInput - Input with search icon and clear button
export { SearchInput } from './SearchInput';

// PanelHeader - Panel header with title, icon, and actions
export { PanelHeader } from './PanelHeader';

// ChipGroup - Group of toggleable filter chips
export { ChipGroup, Chip, useChipGroup } from './ChipGroup';

// MemberRow - User/member list item with avatar and status
export { MemberRow } from './MemberRow';

// PillBar - Tab/filter pill navigation bar
export { PillBar } from './PillBar';

// Toast - Notification toast message
export { Toast } from './Toast';

// EmptyState - Empty content placeholder
export { EmptyState } from './EmptyState';

// SearchBar - Search input with suggestions
export { SearchBar } from './SearchBar';

// Section - Collapsible content section
export { Section } from './Section';

// SegmentedToggle - Segmented button toggle
export { SegmentedToggle } from './SegmentedToggle';

// SubtabBar - Secondary tab navigation
export { SubtabBar } from './SubtabBar';

// Tabs - Tab container component
export { Tabs } from './Tabs';

// OptionList - Selectable option list
export { OptionList } from './OptionList';

// CameraGrid - Camera view grid layout
export { CameraGrid } from './CameraGrid';

// ThumbnailPreview - Thumbnail with preview overlay
export { ThumbnailPreview } from './ThumbnailPreview';

// HeaderSection - Section with header and content
export { CollapsibleHeaderSection, DismissibleCard, SectionHeader } from './HeaderSection';

// VRButton - VR-optimized button
export { VRButton } from './VRButton';

// ViewItem - View list item
export { ViewItem } from './ViewItem';

// VoiceCommandToggle - Voice command activation toggle
export { VoiceCommandToggle } from './VoiceCommandToggle';

// NumberStepper - Increment/decrement number input
export { NumberStepper } from './NumberStepper';

// MiniMapCell - Canvas navigator minimap cell
export { MiniMapCell } from './MiniMapCell';

// PositionDisplay - Position coordinates display
export { PositionDisplay } from './PositionDisplay';

// AnnotationToolButton - Annotation tool selection button
export { AnnotationToolButton, getToolTypes, getToolConfig } from './AnnotationToolButton';

// SliderMenuOption - Slider for dropdown menus
export { SliderMenuOption } from './SliderMenuOption';

// SliderWithPresets - Slider with preset buttons
export { SliderWithPresets } from './SliderWithPresets';

// PositionGridPicker - 2x2 position picker grid
export { PositionGridPicker } from './PositionGridPicker';

// ColorSwatchGrid - Color/colormap swatch grid
export { ColorSwatchGrid, DEFAULT_COLORMAPS } from './ColorSwatchGrid';

// CameraViewGridPicker - 3x3 camera view preset grid
export { CameraViewGridPicker } from './CameraViewGridPicker';

// =============================================================================
// TOOLBAR/BAR MOLECULES (moved from bars/)
// =============================================================================

// FlowDirectionToggle - Row/Column flow toggle
export { FlowDirectionToggle } from './FlowDirectionToggle';

// CanvasSizeDisplay - Canvas dimensions display/editor
export { CanvasSizeDisplay } from './CanvasSizeDisplay';

// ViewportSizeDisplay - Viewport dimensions display/editor
export { ViewportSizeDisplay } from './ViewportSizeDisplay';

// WorkspaceSelector - Workspace dropdown selector
export { WorkspaceSelector } from './WorkspaceSelector';

// EditToolbar - Edit mode toolbar
export { EditToolbar } from './EditToolbar';

// CanvasNavigation - Canvas pan navigation controls
export { CanvasNavigation } from './CanvasNavigation';

// PopoutButtons - Canvas popout/float/dock buttons
export { PopoutButtons } from './PopoutButtons';

// StackedNavBlock - Stacked navigation with arrows
export { StackedNavBlock, NAV_DIRECTIONS } from './StackedNavBlock';

// ActiveViewSelector - Active view dropdown selector
export { ActiveViewSelector } from './ActiveViewSelector';

// =============================================================================
// PANEL OVERLAY MOLECULES
// =============================================================================

// PreviewHintBanner - Banner shown when panel is in preview mode
export { PreviewHintBanner } from './PreviewHintBanner';

// OverlayPanelHeader - Panel header with context-aware buttons
export { OverlayPanelHeader } from './OverlayPanelHeader';
