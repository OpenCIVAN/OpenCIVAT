// =============================================================================
// ENHANCED ICON SYSTEM
// =============================================================================
//
// Single component, name-based lookup, enforced size presets.
// If we ever switch icon libraries, only this file changes.
//
// USAGE:
//   import { Icon } from '@UI/react/components/common/Icon';
//
//   <Icon name="close" />
//   <Icon name="close" size="sm" />
//   <Icon name="vr" size="lg" color="#60a5fa" />
//   <Icon name="settings" size={18} />  // Custom size still allowed
//
// SIZE PRESETS:
//   xs: 12px
//   sm: 16px (default)
//   md: 20px
//   lg: 24px
//   xl: 32px
//
// =============================================================================

import React from 'react';

// =============================================================================
// ICON REGISTRY
// =============================================================================
// Maps semantic names to Material Outlined icons.
// Add new icons here - they're instantly available everywhere.
// =============================================================================

import {
    // UI Actions
    CloseOutlined,
    AddOutlined,
    RemoveOutlined,
    DeleteOutlined,
    EditOutlined,
    CheckOutlined,
    DoneOutlined,
    SaveOutlined,
    ContentCopyOutlined,
    UndoOutlined,
    RedoOutlined,
    RefreshOutlined,
    SyncOutlined,
    SearchOutlined,
    MoreHorizOutlined,
    MoreVertOutlined,
    SettingsOutlined,
    MenuOutlined,

    // Navigation
    ExpandMoreOutlined,
    ExpandLessOutlined,
    ChevronLeftOutlined,
    ChevronRightOutlined,
    KeyboardDoubleArrowLeftOutlined,
    KeyboardDoubleArrowRightOutlined,
    ArrowForwardOutlined,
    ArrowBackOutlined,
    ArrowDownwardOutlined,
    ArrowUpwardOutlined,
    SwapHorizOutlined,
    SwapVertOutlined,
    HomeOutlined,
    OpenInNewOutlined,

    // View & Visibility
    VisibilityOutlined,
    VisibilityOffOutlined,
    OpenInFullOutlined,
    CloseFullscreenOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    CenterFocusStrongOutlined,
    PreviewOutlined,

    // VR & 3D
    ViewInArOutlined,
    ThreeDRotationOutlined,
    Inventory2Outlined,
    LayersOutlined,
    OpenWithOutlined,
    GestureOutlined,
    SpatialAudioOffOutlined,

    // Tools & Editing
    ContentCutOutlined,
    StraightenOutlined,
    SquareFootOutlined,
    PaletteOutlined,
    FilterAltOutlined,
    FilterListOutlined,
    TuneOutlined,
    BuildOutlined,
    GpsFixedOutlined,
    MyLocationOutlined,
    CreateOutlined,
    NearMeOutlined,

    // Data & Files
    FolderOutlined,
    CreateNewFolderOutlined,
    FolderOpenOutlined,
    AccountTreeOutlined,
    DescriptionOutlined,
    InsertDriveFileOutlined,
    ImageOutlined,
    HideImageOutlined,
    BrokenImageOutlined,
    StorageOutlined,
    DatasetOutlined,
    DownloadOutlined,
    FileDownloadOutlined,
    UploadOutlined,
    FileUploadOutlined,
    AttachFileOutlined,
    DnsOutlined,

    // Communication
    ChatOutlined,
    ChatBubbleOutlineOutlined,
    CommentOutlined,
    SendOutlined,
    NotificationsOutlined,
    NotificationsNoneOutlined,
    AlternateEmailOutlined,

    // Users & Collaboration
    PersonOutlined,
    GroupOutlined,
    PeopleOutlined,
    AccountCircleOutlined,
    PersonAddOutlined,
    PersonOffOutlined,
    PersonRemoveOutlined,
    ManageAccountsOutlined,
    HowToRegOutlined,

    // Media & Recording
    PlayArrowOutlined,
    PauseOutlined,
    StopOutlined,
    VideocamOutlined,
    VideocamOffOutlined,
    MicOutlined,
    MicOffOutlined,
    VolumeUpOutlined,
    CameraAltOutlined,
    PhotoCameraOutlined,
    RadioOutlined,

    // Status & Feedback
    InfoOutlined,
    HelpOutlineOutlined,
    WarningAmberOutlined,
    ReportProblemOutlined,
    ErrorOutlineOutlined,
    CancelOutlined,
    CheckCircleOutlined,

    // Layout & Grid
    GridViewOutlined,
    GridOnOutlined,
    DashboardOutlined,
    ViewModuleOutlined,
    MapOutlined,
    ListOutlined,

    // Pins, Bookmarks & Favorites
    PushPinOutlined,
    StarOutlined,
    StarBorderOutlined,
    BookmarkBorderOutlined,

    // Drag & Grip
    DragHandleOutlined,
    DragIndicatorOutlined,

    // Lock & Security
    LockOutlined,
    LockOpenOutlined,
    SecurityOutlined,

    // Time & Calendar
    ScheduleOutlined,
    AccessTimeOutlined,
    CalendarTodayOutlined,
    EventOutlined,

    // Share & Links
    ShareOutlined,
    LinkOutlined,
    InsertLinkOutlined,
    LinkOffOutlined,

    // Shapes & Indicators
    CircleOutlined,
    FiberManualRecordOutlined,
    RadioButtonCheckedOutlined,
    HexagonOutlined,

    // Network & Connection
    WifiOutlined,
    WifiOffOutlined,
    LanguageOutlined,
    PublicOutlined,

    // Scientific
    BiotechOutlined,
    ScienceOutlined,
    MemoryOutlined,
    DeveloperBoardOutlined,

    // Theme & Display
    LightModeOutlined,
    DarkModeOutlined,
    MonitorOutlined,
    DesktopWindowsOutlined,
    HeadphonesOutlined,

    // Misc
    KeyboardOutlined,
    EmojiEmotionsOutlined,
    PlaceOutlined,
    LocationOnOutlined,
    NoteOutlined,
    StickyNote2Outlined,
    ArchiveOutlined,
    LogoutOutlined,
    LoginOutlined,
    MeetingRoomOutlined,
    MergeOutlined,
    CallMergeOutlined,
    EmojiEventsOutlined,
    RotateLeftOutlined,
    BusinessOutlined,
    ApartmentOutlined,
    PhotoSizeSelectSmallOutlined,
    HandymanOutlined,
} from '@mui/icons-material';

// Loading spinner (special case - from @mui/material, not icons)
import { CircularProgress } from '@mui/material';

// =============================================================================
// ICON MAP
// =============================================================================
// Semantic name → Component mapping
// Organized alphabetically for easy lookup
// =============================================================================

const ICON_MAP = {
    // A
    add: AddOutlined,
    archive: ArchiveOutlined,
    arrowDown: ArrowDownwardOutlined,
    arrowLeft: ArrowBackOutlined,
    arrowLeftRight: SwapHorizOutlined,
    arrowRight: ArrowForwardOutlined,
    arrowUp: ArrowUpwardOutlined,
    arrowUpDown: SwapVertOutlined,
    atSign: AlternateEmailOutlined,

    // B
    bell: NotificationsOutlined,
    bellOutline: NotificationsNoneOutlined,
    biotech: BiotechOutlined,
    bookmark: BookmarkBorderOutlined,
    box: Inventory2Outlined,
    brokenImage: BrokenImageOutlined,
    building: BusinessOutlined,
    building2: ApartmentOutlined,

    // C
    calendar: CalendarTodayOutlined,
    camera: CameraAltOutlined,
    cancel: CancelOutlined,
    canvasSize: PhotoSizeSelectSmallOutlined,
    chat: ChatOutlined,
    check: CheckOutlined,
    checkCircle: CheckCircleOutlined,
    chevronDown: ExpandMoreOutlined,
    chevronLeft: ChevronLeftOutlined,
    chevronRight: ChevronRightOutlined,
    chevronUp: ExpandLessOutlined,
    circle: CircleOutlined,
    clip: ContentCutOutlined,
    clock: ScheduleOutlined,
    close: CloseOutlined,
    comment: CommentOutlined,
    copy: ContentCopyOutlined,
    cpu: DeveloperBoardOutlined,
    crosshair: MyLocationOutlined,
    crown: EmojiEventsOutlined,

    // D
    dashboard: DashboardOutlined,
    database: StorageOutlined,
    dataset: DatasetOutlined,
    delete: DeleteOutlined,
    desktop: DesktopWindowsOutlined,
    done: DoneOutlined,
    doorOpen: MeetingRoomOutlined,
    dot: FiberManualRecordOutlined,
    download: DownloadOutlined,
    dragHorizontal: DragHandleOutlined,
    dragVertical: DragIndicatorOutlined,

    // E
    edit: EditOutlined,
    error: ErrorOutlineOutlined,
    event: EventOutlined,
    externalLink: OpenInNewOutlined,
    eye: VisibilityOutlined,
    eyeOff: VisibilityOffOutlined,

    // F
    file: DescriptionOutlined,
    fileDownload: FileDownloadOutlined,
    fileType: InsertDriveFileOutlined,
    fileUpload: FileUploadOutlined,
    filter: FilterAltOutlined,
    filterList: FilterListOutlined,
    fitView: CenterFocusStrongOutlined,
    folder: FolderOutlined,
    folderOpen: FolderOpenOutlined,
    folderPlus: CreateNewFolderOutlined,
    folderTree: AccountTreeOutlined,
    fullscreen: FullscreenOutlined,
    fullscreenExit: FullscreenExitOutlined,

    // G
    gesture: GestureOutlined,
    gitBranch: AccountTreeOutlined,
    globe: LanguageOutlined,
    grid3x3: GridOnOutlined,
    gripHorizontal: DragHandleOutlined,
    gripVertical: DragIndicatorOutlined,

    // H
    hardDrive: DnsOutlined,
    headphones: HeadphonesOutlined,
    help: HelpOutlineOutlined,
    helpCircle: HelpOutlineOutlined,
    hexagon: HexagonOutlined,
    home: HomeOutlined,

    // I
    image: ImageOutlined,
    imageOff: HideImageOutlined,
    info: InfoOutlined,

    // K
    keyboard: KeyboardOutlined,

    // L
    layers: LayersOutlined,
    layout: DashboardOutlined,
    layoutGrid: GridViewOutlined,
    link: LinkOutlined,
    link2: InsertLinkOutlined,
    linkOff: LinkOffOutlined,
    list: ListOutlined,
    loader: 'loader', // Special case - handled separately
    location: LocationOnOutlined,
    lock: LockOutlined,
    login: LoginOutlined,
    logout: LogoutOutlined,

    // M
    map: MapOutlined,
    mapPin: PlaceOutlined,
    maximize: OpenInFullOutlined,
    memory: MemoryOutlined,
    menu: MenuOutlined,
    merge: MergeOutlined,
    messageSquare: ChatBubbleOutlineOutlined,
    mic: MicOutlined,
    micOff: MicOffOutlined,
    minimize: CloseFullscreenOutlined,
    monitor: MonitorOutlined,
    moon: DarkModeOutlined,
    moreHorizontal: MoreHorizOutlined,
    moreVertical: MoreVertOutlined,
    mousePointer: NearMeOutlined,
    move: OpenWithOutlined,

    // N
    note: NoteOutlined,

    // P
    palette: PaletteOutlined,
    panelLeftClose: KeyboardDoubleArrowLeftOutlined,
    panelRightClose: KeyboardDoubleArrowRightOutlined,
    paperclip: AttachFileOutlined,
    pause: PauseOutlined,
    pencil: CreateOutlined,
    people: PeopleOutlined,
    photoCamera: PhotoCameraOutlined,
    pin: PushPinOutlined,
    pinOff: PushPinOutlined, // Same icon, use CSS for "off" state
    play: PlayArrowOutlined,
    preview: PreviewOutlined,
    public: PublicOutlined,

    // R
    radio: RadioOutlined,
    radioDot: RadioButtonCheckedOutlined,
    redo: RedoOutlined,
    refresh: RefreshOutlined,
    remove: RemoveOutlined,
    rotateCcw: RotateLeftOutlined,
    rotate3d: ThreeDRotationOutlined,
    ruler: StraightenOutlined,

    // S
    save: SaveOutlined,
    science: ScienceOutlined,
    scissors: ContentCutOutlined,
    search: SearchOutlined,
    send: SendOutlined,
    settings: SettingsOutlined,
    share: ShareOutlined,
    shield: SecurityOutlined,
    sliders: TuneOutlined,
    smile: EmojiEmotionsOutlined,
    spatialAudio: SpatialAudioOffOutlined,
    star: StarOutlined,
    starOutline: StarBorderOutlined,
    stickyNote: StickyNote2Outlined,
    stop: StopOutlined,
    sun: LightModeOutlined,
    sync: SyncOutlined,

    // T
    target: GpsFixedOutlined,
    time: AccessTimeOutlined,
    tools: BuildOutlined,
    trash: DeleteOutlined,

    // U
    undo: UndoOutlined,
    unlock: LockOpenOutlined,
    upload: UploadOutlined,
    user: PersonOutlined,
    userCheck: HowToRegOutlined,
    userCircle: AccountCircleOutlined,
    userCog: ManageAccountsOutlined,
    userPlus: PersonAddOutlined,
    userRemove: PersonRemoveOutlined,
    userX: PersonOffOutlined,
    users: GroupOutlined,

    // V
    video: VideocamOutlined,
    videoOff: VideocamOffOutlined,
    volume: VolumeUpOutlined,
    vr: ViewInArOutlined,

    // W
    warning: WarningAmberOutlined,
    wifi: WifiOutlined,
    wifiOff: WifiOffOutlined,
    wrench: HandymanOutlined,

    // X
    x: CloseOutlined,
    xCircle: CancelOutlined,

    // Z
    zoomIn: ZoomInOutlined,
    zoomOut: ZoomOutOutlined,
};

// =============================================================================
// LEGACY ALIASES
// =============================================================================
// Maps old Lucide names to new semantic names for easy migration.
// These allow: <Icon name="X" /> instead of <Icon name="close" />
// =============================================================================

const LEGACY_ALIASES = {
    // Lucide name → semantic name
    X: 'close',
    Plus: 'add',
    Minus: 'remove',
    Trash2: 'delete',
    Edit3: 'edit',
    Eye: 'eye',
    EyeOff: 'eyeOff',
    ChevronDown: 'chevronDown',
    ChevronUp: 'chevronUp',
    ChevronLeft: 'chevronLeft',
    ChevronRight: 'chevronRight',
    Maximize2: 'maximize',
    Minimize2: 'minimize',
    Glasses: 'vr',
    Box: 'box',
    Layers: 'layers',
    Move: 'move',
    Scissors: 'scissors',
    Ruler: 'ruler',
    Palette: 'palette',
    Filter: 'filter',
    Sliders: 'sliders',
    Wrench: 'tools',
    Target: 'target',
    MousePointer: 'mousePointer',
    Pencil: 'pencil',
    Folder: 'folder',
    FileText: 'file',
    FileType: 'fileType',
    Image: 'image',
    ImageOff: 'imageOff',
    Database: 'database',
    Download: 'download',
    Upload: 'upload',
    Paperclip: 'paperclip',
    MessageSquare: 'messageSquare',
    Send: 'send',
    Bell: 'bell',
    User: 'user',
    Users: 'users',
    UserCircle: 'userCircle',
    UserPlus: 'userPlus',
    UserX: 'userX',
    UserCog: 'userCog',
    UserCheck: 'userCheck',
    Play: 'play',
    Pause: 'pause',
    Video: 'video',
    Mic: 'mic',
    MicOff: 'micOff',
    Volume2: 'volume',
    Camera: 'camera',
    Radio: 'radio',
    Info: 'info',
    HelpCircle: 'helpCircle',
    AlertTriangle: 'warning',
    AlertCircle: 'error',
    XCircle: 'xCircle',
    CheckCircle: 'checkCircle',
    CheckCircle2: 'checkCircle',
    LayoutGrid: 'layoutGrid',
    Grid3X3: 'grid3x3',
    Grid3x3: 'grid3x3',
    Layout: 'layout',
    Map: 'map',
    FolderTree: 'folderTree',
    GitBranch: 'gitBranch',
    List: 'list',
    Pin: 'pin',
    PinOff: 'pinOff',
    Star: 'star',
    Bookmark: 'bookmark',
    GripHorizontal: 'gripHorizontal',
    GripVertical: 'gripVertical',
    Lock: 'lock',
    Unlock: 'unlock',
    Shield: 'shield',
    Clock: 'clock',
    Calendar: 'calendar',
    Share: 'share',
    Share2: 'share',
    Link: 'link',
    Link2: 'link2',
    Circle: 'circle',
    Hexagon: 'hexagon',
    Wifi: 'wifi',
    WifiOff: 'wifiOff',
    Globe: 'globe',
    Sun: 'sun',
    Moon: 'moon',
    Monitor: 'monitor',
    Headphones: 'headphones',
    Keyboard: 'keyboard',
    Smile: 'smile',
    MapPin: 'mapPin',
    StickyNote: 'stickyNote',
    Archive: 'archive',
    LogOut: 'logout',
    DoorOpen: 'doorOpen',
    Merge: 'merge',
    Building2: 'building2',
    Cpu: 'cpu',
    Crown: 'crown',
    RotateCcw: 'rotateCcw',
    RefreshCw: 'refresh',
    Home: 'home',
    ExternalLink: 'externalLink',
    ZoomIn: 'zoomIn',
    ZoomOut: 'zoomOut',
    Check: 'check',
    Save: 'save',
    Search: 'search',
    Settings: 'settings',
    Copy: 'copy',
    Undo: 'undo',
    Redo: 'redo',
    MoreHorizontal: 'moreHorizontal',
    MoreVertical: 'moreVertical',
    PanelLeftClose: 'panelLeftClose',
    PanelRightClose: 'panelRightClose',
    ArrowRight: 'arrowRight',
    ArrowDown: 'arrowDown',
    ArrowLeftRight: 'arrowLeftRight',
    ArrowUpDown: 'arrowUpDown',
    AtSign: 'atSign',
    HardDrive: 'hardDrive',
    Loader2: 'loader',
};

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
// ICON COMPONENT
// =============================================================================

/**
 * Universal Icon component with name-based lookup.
 *
 * @param {string} name - Icon name (e.g., 'close', 'vr', 'settings')
 * @param {string|number} [size='sm'] - Size preset ('xs'|'sm'|'md'|'lg'|'xl') or number
 * @param {string} [color] - Icon color
 * @param {string} [className] - Additional CSS classes
 * @param {object} [sx] - Additional MUI sx styles
 * @param {object} [props] - Additional props passed to icon
 *
 * @example
 * <Icon name="close" />
 * <Icon name="close" size="sm" />
 * <Icon name="vr" size="lg" color="#60a5fa" />
 * <Icon name="settings" size={18} />
 */
export function Icon({
    name,
    size = 'sm',
    color,
    className,
    sx,
    ...props
}) {
    // Resolve legacy aliases
    const resolvedName = LEGACY_ALIASES[name] || name;

    // Handle loader special case
    if (resolvedName === 'loader') {
        const fontSize = typeof size === 'number' ? size : ICON_SIZES[size] || ICON_SIZES.sm;
        return (
            <CircularProgress
                size={fontSize}
                className={className}
                sx={{ color, ...sx }}
                {...props}
            />
        );
    }

    // Get icon component
    const IconComponent = ICON_MAP[resolvedName];

    if (!IconComponent) {
        console.warn(`[Icon] Unknown icon name: "${name}"${resolvedName !== name ? ` (resolved from "${name}")` : ''}. Available icons:`, Object.keys(ICON_MAP).sort());
        return null;
    }

    // Resolve size
    const fontSize = typeof size === 'number' ? size : ICON_SIZES[size] || ICON_SIZES.sm;

    // Build sx prop
    const mergedSx = {
        fontSize,
        color,
        ...sx,
    };

    return (
        <IconComponent
            className={className}
            sx={mergedSx}
            {...props}
        />
    );
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get list of all available icon names
 */
export function getAvailableIcons() {
    return Object.keys(ICON_MAP).sort();
}

/**
 * Check if an icon exists
 */
export function hasIcon(name) {
    const resolvedName = LEGACY_ALIASES[name] || name;
    return resolvedName in ICON_MAP || resolvedName === 'loader';
}

/**
 * Get icon component by name (for advanced usage)
 */
export function getIconComponent(name) {
    const resolvedName = LEGACY_ALIASES[name] || name;
    if (resolvedName === 'loader') return CircularProgress;
    return ICON_MAP[resolvedName] || null;
}

// =============================================================================
// DIRECT EXPORTS (for backwards compatibility / tree-shaking)
// =============================================================================
// These allow: import { IconClose } from '@UI/react/components/common/Icon';
// Prefer using <Icon name="close" /> for new code.
// =============================================================================

export {
    CloseOutlined as IconClose,
    AddOutlined as IconAdd,
    RemoveOutlined as IconRemove,
    DeleteOutlined as IconDelete,
    EditOutlined as IconEdit,
    CheckOutlined as IconCheck,
    SaveOutlined as IconSave,
    ContentCopyOutlined as IconCopy,
    UndoOutlined as IconUndo,
    RedoOutlined as IconRedo,
    RefreshOutlined as IconRefresh,
    SearchOutlined as IconSearch,
    SettingsOutlined as IconSettings,
    MoreHorizOutlined as IconMoreHorizontal,
    MoreVertOutlined as IconMoreVertical,
    ExpandMoreOutlined as IconChevronDown,
    ExpandLessOutlined as IconChevronUp,
    ChevronLeftOutlined as IconChevronLeft,
    ChevronRightOutlined as IconChevronRight,
    HomeOutlined as IconHome,
    VisibilityOutlined as IconEye,
    VisibilityOffOutlined as IconEyeOff,
    OpenInFullOutlined as IconMaximize,
    CloseFullscreenOutlined as IconMinimize,
    ZoomInOutlined as IconZoomIn,
    ZoomOutOutlined as IconZoomOut,
    ViewInArOutlined as IconVR,
    Inventory2Outlined as IconBox,
    LayersOutlined as IconLayers,
    OpenWithOutlined as IconMove,
    ContentCutOutlined as IconScissors,
    StraightenOutlined as IconRuler,
    PaletteOutlined as IconPalette,
    FilterAltOutlined as IconFilter,
    TuneOutlined as IconSliders,
    BuildOutlined as IconTools,
    FolderOutlined as IconFolder,
    DescriptionOutlined as IconFile,
    ImageOutlined as IconImage,
    StorageOutlined as IconDatabase,
    DownloadOutlined as IconDownload,
    UploadOutlined as IconUpload,
    PersonOutlined as IconUser,
    GroupOutlined as IconUsers,
    MicOutlined as IconMic,
    MicOffOutlined as IconMicOff,
    VideocamOutlined as IconVideo,
    PlayArrowOutlined as IconPlay,
    PauseOutlined as IconPause,
    InfoOutlined as IconInfo,
    HelpOutlineOutlined as IconHelp,
    WarningAmberOutlined as IconWarning,
    ErrorOutlineOutlined as IconError,
    CircularProgress as IconLoader,
};

export default Icon;