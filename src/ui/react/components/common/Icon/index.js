// =============================================================================
// ICON SYSTEM - PUBLIC EXPORTS
// =============================================================================
//
// Usage:
//   import { Icon } from '@UI/react/components/common/Icon';
//   <Icon name="close" size="sm" />
//
// Or for direct component access:
//   import { IconClose, IconVR } from '@UI/react/components/common/Icon';
//
// For dynamic file type icons:
//   import { getLucideIcon } from '@UI/react/components/common/Icon';
//   const TypeIcon = getLucideIcon(fileTypeInfo.icon);
//
// =============================================================================

// Re-export getLucideIcon from IconRegistry for dynamic file type icons
export { getLucideIcon } from './IconRegistry.js';

export {
  // Main component
  Icon,
  Icon as default,

  // Utilities
  ICON_SIZES,
  getAvailableIcons,
  hasIcon,
  getIconComponent,

  // Direct icon exports (for tree-shaking / backwards compatibility)
  IconClose,
  IconAdd,
  IconRemove,
  IconDelete,
  IconEdit,
  IconCheck,
  IconSave,
  IconCopy,
  IconUndo,
  IconRedo,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconMoreHorizontal,
  IconMoreVertical,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconEye,
  IconEyeOff,
  IconMaximize,
  IconMinimize,
  IconZoomIn,
  IconZoomOut,
  IconVR,
  IconBox,
  IconLayers,
  IconMove,
  IconScissors,
  IconRuler,
  IconPalette,
  IconFilter,
  IconSliders,
  IconTools,
  IconFolder,
  IconFile,
  IconImage,
  IconDatabase,
  IconDownload,
  IconUpload,
  IconUser,
  IconUsers,
  IconMic,
  IconMicOff,
  IconVideo,
  IconPlay,
  IconPause,
  IconInfo,
  IconHelp,
  IconWarning,
  IconError,
  IconLoader,
} from "./Icon.jsx";
