// =============================================================================
// CENTRALIZED ICON EXPORTS
// =============================================================================
//
// All icons are imported from this file. If we ever need to switch libraries
// or customize icons, only this file needs to be edited.
//
// We use OUTLINED variants to match Lucide's stroke style.
// Sizes are the same as Lucide - no conversion needed!
//
// Usage:
//   import { IconClose, IconAdd, IconVR } from '@UI/react/components/common/Icon';
//
// With wrapper (Lucide-like API):
//   import { Icon, IconClose } from '@UI/react/components/common/Icon';
//   <Icon component={IconClose} size={16} className="my-class" />
//
// Direct usage:
//   <IconClose sx={{ fontSize: 16 }} />
//
// For loading spinner:
//   import { IconLoader } from '@UI/react/components/common/Icon';
//   <IconLoader size={16} />
//
// Color:
//   <IconCheck sx={{ color: '#34d399' }} />
//   <Icon component={IconCheck} size={16} color="#34d399" />
//
// =============================================================================

// =============================================================================
// UI ACTIONS
// =============================================================================
export {
  CloseOutlined as IconClose,
  AddOutlined as IconAdd,
  RemoveOutlined as IconRemove,
  DeleteOutlined as IconDelete,
  EditOutlined as IconEdit,
  CheckOutlined as IconCheck,
  DoneOutlined as IconDone,
  SaveOutlined as IconSave,
  ContentCopyOutlined as IconCopy,
  UndoOutlined as IconUndo,
  RedoOutlined as IconRedo,
  RefreshOutlined as IconRefresh,
  SyncOutlined as IconSync,
  SearchOutlined as IconSearch,
  MoreHorizOutlined as IconMoreHorizontal,
  MoreVertOutlined as IconMoreVertical,
  SettingsOutlined as IconSettings,
  MenuOutlined as IconMenu,
} from "@mui/icons-material";

// =============================================================================
// NAVIGATION & ARROWS
// =============================================================================
export {
  ExpandMoreOutlined as IconChevronDown,
  ExpandLessOutlined as IconChevronUp,
  ChevronLeftOutlined as IconChevronLeft,
  ChevronRightOutlined as IconChevronRight,
  KeyboardDoubleArrowLeftOutlined as IconPanelLeftClose,
  KeyboardDoubleArrowRightOutlined as IconPanelRightClose,
  ArrowForwardOutlined as IconArrowRight,
  ArrowBackOutlined as IconArrowLeft,
  ArrowDownwardOutlined as IconArrowDown,
  ArrowUpwardOutlined as IconArrowUp,
  SwapHorizOutlined as IconArrowLeftRight,
  SwapVertOutlined as IconArrowUpDown,
  HomeOutlined as IconHome,
  OpenInNewOutlined as IconExternalLink,
  PanToolOutlined as IconPanTool,
} from "@mui/icons-material";

// =============================================================================
// VIEW & VISIBILITY
// =============================================================================
export {
  VisibilityOutlined as IconEye,
  VisibilityOffOutlined as IconEyeOff,
  OpenInFullOutlined as IconMaximize,
  CloseFullscreenOutlined as IconMinimize,
  FullscreenOutlined as IconFullscreen,
  FullscreenExitOutlined as IconFullscreenExit,
  ZoomInOutlined as IconZoomIn,
  ZoomOutOutlined as IconZoomOut,
  CenterFocusStrongOutlined as IconFitView,
  PreviewOutlined as IconPreview,
} from "@mui/icons-material";

// =============================================================================
// VR & 3D
// Note: Some 3D icons only have filled variants
// =============================================================================
export {
  ViewInArOutlined as IconVR,
  ThreeDRotationOutlined as IconRotate3D,
  Inventory2Outlined as IconBox,
  LayersOutlined as IconLayers,
  OpenWithOutlined as IconMove,
  GestureOutlined as IconGesture,
  SpatialAudioOffOutlined as IconSpatialAudio,
} from "@mui/icons-material";

// =============================================================================
// TOOLS & EDITING
// =============================================================================
export {
  ContentCutOutlined as IconScissors,
  ContentCutOutlined as IconClip,
  StraightenOutlined as IconRuler,
  SquareFootOutlined as IconMeasure,
  PaletteOutlined as IconPalette,
  FilterAltOutlined as IconFilter,
  FilterListOutlined as IconFilterList,
  TuneOutlined as IconSliders,
  BuildOutlined as IconTools,
  BuildOutlined as IconWrench,
  GpsFixedOutlined as IconTarget,
  MyLocationOutlined as IconCrosshair,
  CreateOutlined as IconPencil,
  NearMeOutlined as IconMousePointer,
} from "@mui/icons-material";

// =============================================================================
// DATA & FILES
// =============================================================================
export {
  FolderOutlined as IconFolder,
  CreateNewFolderOutlined as IconFolderPlus,
  FolderOpenOutlined as IconFolderOpen,
  AccountTreeOutlined as IconFolderTree,
  DescriptionOutlined as IconFile,
  InsertDriveFileOutlined as IconFileType,
  ImageOutlined as IconImage,
  HideImageOutlined as IconImageOff,
  BrokenImageOutlined as IconBrokenImage,
  StorageOutlined as IconDatabase,
  DatasetOutlined as IconDataset,
  DownloadOutlined as IconDownload,
  FileDownloadOutlined as IconFileDownload,
  UploadOutlined as IconUpload,
  FileUploadOutlined as IconFileUpload,
  AttachFileOutlined as IconPaperclip,
  DnsOutlined as IconHardDrive,
} from "@mui/icons-material";

// =============================================================================
// COMMUNICATION & CHAT
// =============================================================================
export {
  ChatOutlined as IconChat,
  ChatBubbleOutlineOutlined as IconMessageSquare,
  CommentOutlined as IconComment,
  SendOutlined as IconSend,
  NotificationsOutlined as IconBell,
  NotificationsNoneOutlined as IconBellOutline,
  AlternateEmailOutlined as IconAtSign,
} from "@mui/icons-material";

// =============================================================================
// USERS & COLLABORATION
// =============================================================================
export {
  PersonOutlined as IconUser,
  GroupOutlined as IconUsers,
  PeopleOutlined as IconPeople,
  AccountCircleOutlined as IconUserCircle,
  PersonAddOutlined as IconUserPlus,
  PersonOffOutlined as IconUserX,
  PersonRemoveOutlined as IconUserRemove,
  ManageAccountsOutlined as IconUserCog,
  HowToRegOutlined as IconUserCheck,
} from "@mui/icons-material";

// =============================================================================
// MEDIA & RECORDING
// =============================================================================
export {
  PlayArrowOutlined as IconPlay,
  PauseOutlined as IconPause,
  StopOutlined as IconStop,
  VideocamOutlined as IconVideo,
  VideocamOffOutlined as IconVideoOff,
  MicOutlined as IconMic,
  MicOffOutlined as IconMicOff,
  VolumeUpOutlined as IconVolume,
  VolumeUpOutlined as IconVolume2,
  CameraAltOutlined as IconCamera,
  PhotoCameraOutlined as IconPhotoCamera,
  RadioOutlined as IconRadio,
  HeadsetOutlined as IconHeadset,
  HeadsetOffOutlined as IconHeadsetOff,
  PhoneEnabledOutlined as IconPhone,
  PhoneDisabledOutlined as IconPhoneOff,
} from "@mui/icons-material";

// =============================================================================
// STATUS & FEEDBACK
// =============================================================================
export {
  InfoOutlined as IconInfo,
  HelpOutlineOutlined as IconHelp,
  HelpOutlineOutlined as IconHelpCircle,
  WarningAmberOutlined as IconWarning,
  ReportProblemOutlined as IconAlertTriangle,
  ErrorOutlineOutlined as IconError,
  ErrorOutlineOutlined as IconAlertCircle,
  CancelOutlined as IconCancel,
  CancelOutlined as IconXCircle,
  CheckCircleOutlined as IconCheckCircle,
  CheckCircleOutlined as IconCheckCircle2,
} from "@mui/icons-material";

// =============================================================================
// LAYOUT & GRID
// =============================================================================
export {
  GridViewOutlined as IconLayoutGrid,
  GridOnOutlined as IconGrid3x3,
  DashboardOutlined as IconDashboard,
  ViewModuleOutlined as IconLayout,
  MapOutlined as IconMap,
  AccountTreeOutlined as IconGitBranch,
  ListOutlined as IconList,
  PhotoSizeSelectSmallOutlined as IconCanvasSize,
  EastOutlined as IconFlowRow,
  SouthOutlined as IconFlowColumn,
} from "@mui/icons-material";

// =============================================================================
// PINS, BOOKMARKS & FAVORITES
// =============================================================================
export {
  PushPinOutlined as IconPin,
  PushPinOutlined as IconPinOff, // Use same + CSS for "off" state
  StarOutlined as IconStar,
  StarBorderOutlined as IconStarOutline,
  BookmarkBorderOutlined as IconBookmark,
  BookmarkBorderOutlined as IconBookmarkOutline,
} from "@mui/icons-material";

// =============================================================================
// DRAG & GRIP
// =============================================================================
export {
  DragHandleOutlined as IconGripHorizontal,
  DragIndicatorOutlined as IconGripVertical,
} from "@mui/icons-material";

// =============================================================================
// LOCK & SECURITY
// =============================================================================
export {
  LockOutlined as IconLock,
  LockOpenOutlined as IconUnlock,
  SecurityOutlined as IconShield,
} from "@mui/icons-material";

// =============================================================================
// TIME & CALENDAR
// =============================================================================
export {
  ScheduleOutlined as IconClock,
  AccessTimeOutlined as IconTime,
  CalendarTodayOutlined as IconCalendar,
  EventOutlined as IconEvent,
} from "@mui/icons-material";

// =============================================================================
// SHARE & LINKS
// =============================================================================
export {
  ShareOutlined as IconShare,
  ShareOutlined as IconShare2,
  LinkOutlined as IconLink,
  InsertLinkOutlined as IconLink2,
  LinkOffOutlined as IconLinkOff,
} from "@mui/icons-material";

// =============================================================================
// SHAPES & INDICATORS
// =============================================================================
export {
  CircleOutlined as IconCircle,
  FiberManualRecordOutlined as IconDot,
  RadioButtonCheckedOutlined as IconCircleDot,
  HexagonOutlined as IconHexagon,
} from "@mui/icons-material";

// =============================================================================
// NETWORK & CONNECTION
// =============================================================================
export {
  WifiOutlined as IconWifi,
  WifiOffOutlined as IconWifiOff,
  LanguageOutlined as IconGlobe,
  PublicOutlined as IconPublic,
} from "@mui/icons-material";

// =============================================================================
// SCIENTIFIC (Material Icons advantage!)
// =============================================================================
export {
  BiotechOutlined as IconBiotech,
  ScienceOutlined as IconScience,
  MemoryOutlined as IconMemory,
  DeveloperBoardOutlined as IconCpu,
} from "@mui/icons-material";

// =============================================================================
// THEME & DISPLAY
// =============================================================================
export {
  LightModeOutlined as IconSun,
  DarkModeOutlined as IconMoon,
  MonitorOutlined as IconMonitor,
  DesktopWindowsOutlined as IconDesktop,
  HeadphonesOutlined as IconHeadphones,
} from "@mui/icons-material";

// =============================================================================
// MISC UI ELEMENTS
// =============================================================================
export {
  KeyboardOutlined as IconKeyboard,
  EmojiEmotionsOutlined as IconSmile,
  PlaceOutlined as IconMapPin,
  LocationOnOutlined as IconLocation,
  NoteOutlined as IconNote,
  StickyNote2Outlined as IconStickyNote,
  ArchiveOutlined as IconArchive,
  LogoutOutlined as IconLogout,
  LoginOutlined as IconLogin,
  MeetingRoomOutlined as IconDoorOpen,
  MergeOutlined as IconMerge,
  CallMergeOutlined as IconCallMerge,
  EmojiEventsOutlined as IconCrown,
  RotateLeftOutlined as IconRotateCcw,
} from "@mui/icons-material";

// =============================================================================
// BUSINESS & ORGANIZATION
// =============================================================================
export {
  BusinessOutlined as IconBuilding,
  ApartmentOutlined as IconBuilding2,
} from "@mui/icons-material";

// =============================================================================
// LOADING SPINNER
// =============================================================================
// Replaces Lucide's Loader2 with spin animation
// Usage: <IconLoader size={16} />
// Note: Size is in pixels, not affected by the Outlined adjustment
export { CircularProgress as IconLoader } from "@mui/material";

// =============================================================================
// LEGACY ALIASES (Outlined versions)
// =============================================================================
// These map old Lucide names to Material Outlined icons for easier migration.
// You can use these during transition, then search-replace later.
// Eventually remove this section once migration is complete.
//
// SIZE NOTE: Reduce size by ~2px when migrating:
//   Lucide size={16} → Material sx={{ fontSize: 14 }}
//   Lucide size={20} → Material sx={{ fontSize: 18 }}
// =============================================================================
export {
  // Direct name mappings (Lucide name -> Material Outlined component)
  CloseOutlined as X,
  AddOutlined as Plus,
  RemoveOutlined as Minus,
  DeleteOutlined as Trash2,
  EditOutlined as Edit3,
  EditOutlined as Edit,
  VisibilityOutlined as Eye,
  VisibilityOffOutlined as EyeOff,
  ExpandMoreOutlined as ChevronDown,
  ExpandLessOutlined as ChevronUp,
  ChevronLeftOutlined as ChevronLeft,
  ChevronRightOutlined as ChevronRight,
  OpenInFullOutlined as Maximize2,
  CloseFullscreenOutlined as Minimize2,
  ViewInArOutlined as Glasses,
  Inventory2Outlined as Box,
  LayersOutlined as Layers,
  OpenWithOutlined as Move,
  ContentCutOutlined as Scissors,
  StraightenOutlined as Ruler,
  PaletteOutlined as Palette,
  FilterAltOutlined as Filter,
  TuneOutlined as Sliders,
  BuildOutlined as Wrench,
  GpsFixedOutlined as Target,
  NearMeOutlined as MousePointer,
  CreateOutlined as Pencil,
  FolderOutlined as Folder,
  DescriptionOutlined as FileText,
  InsertDriveFileOutlined as FileType,
  ImageOutlined as Image,
  HideImageOutlined as ImageOff,
  StorageOutlined as Database,
  DownloadOutlined as Download,
  UploadOutlined as Upload,
  AttachFileOutlined as Paperclip,
  ChatBubbleOutlineOutlined as MessageSquare,
  SendOutlined as Send,
  NotificationsOutlined as Bell,
  PersonOutlined as User,
  GroupOutlined as Users,
  AccountCircleOutlined as UserCircle,
  PersonAddOutlined as UserPlus,
  PersonOffOutlined as UserX,
  ManageAccountsOutlined as UserCog,
  HowToRegOutlined as UserCheck,
  PlayArrowOutlined as Play,
  PauseOutlined as Pause,
  VideocamOutlined as Video,
  MicOutlined as Mic,
  MicOffOutlined as MicOff,
  VolumeUpOutlined as Volume2,
  CameraAltOutlined as Camera,
  RadioOutlined as Radio,
  InfoOutlined as Info,
  HelpOutlineOutlined as HelpCircle,
  WarningAmberOutlined as AlertTriangle,
  ErrorOutlineOutlined as AlertCircle,
  CancelOutlined as XCircle,
  CheckCircleOutlined as CheckCircle,
  CheckCircleOutlined as CheckCircle2,
  GridViewOutlined as LayoutGrid,
  GridOnOutlined as Grid3X3,
  GridOnOutlined as Grid3x3,
  DashboardOutlined as Layout,
  MapOutlined as Map,
  AccountTreeOutlined as FolderTree,
  AccountTreeOutlined as GitBranch,
  ListOutlined as List,
  PushPinOutlined as Pin,
  PushPinOutlined as PinOff,
  StarOutlined as Star,
  BookmarkBorderOutlined as Bookmark,
  DragHandleOutlined as GripHorizontal,
  DragIndicatorOutlined as GripVertical,
  LockOutlined as Lock,
  LockOpenOutlined as Unlock,
  SecurityOutlined as Shield,
  ScheduleOutlined as Clock,
  CalendarTodayOutlined as Calendar,
  ShareOutlined as Share,
  ShareOutlined as Share2,
  LinkOutlined as Link,
  InsertLinkOutlined as Link2,
  CircleOutlined as Circle,
  HexagonOutlined as Hexagon,
  WifiOutlined as Wifi,
  WifiOffOutlined as WifiOff,
  LanguageOutlined as Globe,
  LightModeOutlined as Sun,
  DarkModeOutlined as Moon,
  MonitorOutlined as Monitor,
  HeadphonesOutlined as Headphones,
  KeyboardOutlined as Keyboard,
  EmojiEmotionsOutlined as Smile,
  PlaceOutlined as MapPin,
  StickyNote2Outlined as StickyNote,
  ArchiveOutlined as Archive,
  LogoutOutlined as LogOut,
  MeetingRoomOutlined as DoorOpen,
  MergeOutlined as Merge,
  ApartmentOutlined as Building2,
  MemoryOutlined as Cpu,
  EmojiEventsOutlined as Crown,
  RotateLeftOutlined as RotateCcw,
  RefreshOutlined as RefreshCw,
  HomeOutlined as Home,
  OpenInNewOutlined as ExternalLink,
  ZoomInOutlined as ZoomIn,
  ZoomOutOutlined as ZoomOut,
  CheckOutlined as Check,
  SaveOutlined as Save,
  SearchOutlined as Search,
  SettingsOutlined as Settings,
  ContentCopyOutlined as Copy,
  UndoOutlined as Undo,
  RedoOutlined as Redo,
  MoreHorizOutlined as MoreHorizontal,
  MoreVertOutlined as MoreVertical,
  KeyboardDoubleArrowLeftOutlined as PanelLeftClose,
  KeyboardDoubleArrowRightOutlined as PanelRightClose,
  ArrowForwardOutlined as ArrowRight,
  ArrowDownwardOutlined as ArrowDown,
  SwapHorizOutlined as ArrowLeftRight,
  SwapVertOutlined as ArrowUpDown,
  AlternateEmailOutlined as AtSign,
  DnsOutlined as HardDrive,
} from "@mui/icons-material";

// =============================================================================
// ICON MAP FOR DYNAMIC IMPORTS
// =============================================================================
// For files that previously used: import * as LucideIcons from 'lucide-react'
// Usage:
//   import { getIconByName, ICON_MAP } from '@UI/react/components/common/Icon';
//   const Icon = getIconByName('Box');
// =============================================================================
import {
  Inventory2Outlined,
  DescriptionOutlined,
  FolderOutlined as FolderIconOutlined,
  ImageOutlined as ImageIconOutlined,
  InsertDriveFileOutlined,
  VideoFileOutlined,
  AudioFileOutlined,
  PictureAsPdfOutlined,
  ArticleOutlined,
  CodeOutlined,
  DataObjectOutlined,
  TextSnippetOutlined,
  GridOnOutlined,
  TableChartOutlined,
  HelpOutlineOutlined,
} from "@mui/icons-material";

export const ICON_MAP = {
  // Generic
  Box: Inventory2Outlined,
  File: DescriptionOutlined,
  FileText: DescriptionOutlined,
  Folder: FolderIconOutlined,
  Image: ImageIconOutlined,

  // File types
  Document: InsertDriveFileOutlined,
  Video: VideoFileOutlined,
  Audio: AudioFileOutlined,
  Pdf: PictureAsPdfOutlined,
  Article: ArticleOutlined,
  Code: CodeOutlined,
  Json: DataObjectOutlined,
  Text: TextSnippetOutlined,
  Spreadsheet: TableChartOutlined,
  Grid: GridOnOutlined,

  // Default fallback
  default: HelpOutlineOutlined,
};

/**
 * Get icon component by name string
 * For dynamic icon rendering where the icon name comes from data
 *
 * @param {string} name - Icon name (e.g., 'Box', 'File', 'Folder')
 * @returns {React.Component} Material Outlined icon component
 *
 * @example
 * const Icon = getIconByName(file.iconType);
 * return <Icon sx={{ fontSize: 18 }} />;
 */
export function getIconByName(name) {
  return ICON_MAP[name] || ICON_MAP.default;
}

// =============================================================================
// SIZE PRESETS
// =============================================================================
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// =============================================================================
// ICON WRAPPER COMPONENT
// =============================================================================
// Provides a Lucide-like API for easier migration.
// Size is passed through directly (no conversion needed).
// strokeWidth is safely ignored (Material icons don't support it).
//
// Usage:
//   import { Icon, IconClose, IconVR } from '@UI/react/components/common/Icon';
//
//   // With size (same as Lucide!)
//   <Icon component={IconClose} size={16} className="my-class" />
//
//   // With color
//   <Icon component={IconVR} size={20} color="#60a5fa" />
//
//   // Direct usage (no wrapper needed)
//   <IconClose sx={{ fontSize: 16 }} />
//
// =============================================================================
import React from "react";

export function Icon({
  component: IconComponent,
  size,
  strokeWidth, // Ignored - Material icons don't support this
  className,
  color,
  style,
  sx,
  ...props
}) {
  // Merge sx prop with computed styles
  const mergedSx = {
    fontSize: size,
    color,
    ...sx,
  };

  // Remove undefined values
  Object.keys(mergedSx).forEach((key) => {
    if (mergedSx[key] === undefined) delete mergedSx[key];
  });

  return (
    <IconComponent
      className={className}
      style={style}
      sx={Object.keys(mergedSx).length > 0 ? mergedSx : undefined}
      {...props}
    />
  );
}
