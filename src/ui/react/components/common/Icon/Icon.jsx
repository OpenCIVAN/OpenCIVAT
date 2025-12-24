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
// MATERIAL ICON IMPORTS
// =============================================================================
// Organized alphabetically for easy maintenance

import {
    // A
    AddOutlined,
    AlternateEmailOutlined,
    ApartmentOutlined,
    ArchiveOutlined,
    ArrowBackOutlined,
    ArrowDownwardOutlined,
    ArrowForwardOutlined,
    ArrowUpwardOutlined,
    AccountTreeOutlined,

    // B
    BiotechOutlined,
    BookmarkBorderOutlined,
    BrokenImageOutlined,
    BuildOutlined,
    BusinessOutlined,

    // C
    CalendarTodayOutlined,
    CameraAltOutlined,
    CancelOutlined,
    CenterFocusStrongOutlined,
    ChangeHistoryOutlined,
    ChatOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    ChevronLeftOutlined,
    ChevronRightOutlined,
    CircleOutlined,
    CloseFullscreenOutlined,
    CloseOutlined,
    CommentOutlined,
    ContentCopyOutlined,
    ContentCutOutlined,
    CreateNewFolderOutlined,

    // D
    DashboardOutlined,
    DatasetOutlined,
    DeleteOutlined,
    DescriptionOutlined,
    DesktopWindowsOutlined,
    DeveloperBoardOutlined,
    DoDisturbOutlined,
    DoneOutlined,
    DownloadOutlined,
    DragHandleOutlined,
    DragIndicatorOutlined,

    // E
    EditOutlined,
    EmojiEventsOutlined,
    ErrorOutlineOutlined,
    EventOutlined,
    ExpandLessOutlined,
    ExpandMoreOutlined,
    ExploreOffOutlined,
    ExploreOutlined,

    // F
    FiberManualRecordOutlined,
    FilterAltOutlined,
    FilterListOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    FormatListBulletedOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,

    // G
    GppMaybeOutlined,
    GpsFixedOutlined,
    GridOnOutlined,
    GridViewOutlined,

    // H
    HandymanOutlined,
    HeadphonesOutlined,
    HeadsetMicOutlined,
    HeadsetOffOutlined,
    HeadsetOutlined,
    HelpOutlineOutlined,
    HexagonOutlined,
    HomeOutlined,
    HowToRegOutlined,

    // I
    ImageOutlined,
    InfoOutlined,
    Inventory2Outlined,

    // K
    KeyboardOutlined,

    // L
    LayersOutlined,
    LinkOffOutlined,
    LinkOutlined,
    ListOutlined,
    LocalCafeOutlined,
    LocationOnOutlined,
    LockOpenOutlined,
    LockOutlined,
    LoginOutlined,
    LogoutOutlined,

    // M
    ManageAccountsOutlined,
    MapOutlined,
    MeetingRoomOutlined,
    MemoryOutlined,
    MergeOutlined,
    MergeTypeOutlined,
    MicOffOutlined,
    MicOutlined,
    MonitorOutlined,
    MonitorHeartOutlined,
    MoreHorizOutlined,
    MoreVertOutlined,
    MyLocationOutlined,

    // N
    NearMeOutlined,
    NightlightOutlined,
    NotesOutlined,
    NotificationsNoneOutlined,
    NotificationsOutlined,

    // O
    OpenInFullOutlined,
    OpenInNewOutlined,
    OpenWithOutlined,

    // P
    PaletteOutlined,
    PanToolOutlined,
    PauseOutlined,
    PeopleOutlined,
    PersonAddOutlined,
    PersonOffOutlined,
    PersonOutlined,
    PersonRemoveOutlined,
    PhoneOutlined,
    PhotoCameraOutlined,
    PhotoSizeSelectSmallOutlined,
    PinDropOutlined,
    PlayArrowOutlined,
    PublicOutlined,
    PushPinOutlined,

    // R
    RadioButtonCheckedOutlined,
    RadioOutlined,
    RedoOutlined,
    RefreshOutlined,
    RemoveOutlined,
    RotateLeftOutlined,

    // S
    SaveOutlined,
    ScatterPlotOutlined,
    ScheduleOutlined,
    ScienceOutlined,
    SearchOutlined,
    SendOutlined,
    SentimentSatisfiedOutlined,
    SettingsOutlined,
    ShareOutlined,
    ShieldOutlined,
    SignalWifiOffOutlined,
    SquareOutlined,
    StarBorderOutlined,
    StarOutlined,
    StopOutlined,
    StorageOutlined,
    StraightenOutlined,
    SwapHorizOutlined,
    SwapVertOutlined,

    // T
    ThreeDRotationOutlined,
    TuneOutlined,

    // U
    UndoOutlined,
    UploadOutlined,

    // V
    VerifiedUserOutlined,
    VideocamOffOutlined,
    VideocamOutlined,
    ViewInArOutlined,
    VisibilityOffOutlined,
    VisibilityOutlined,
    VolumeUpOutlined,

    // W
    WarningAmberOutlined,
    WbSunnyOutlined,
    WifiOffOutlined,
    WifiOutlined,

    // Z
    ZoomInOutlined,
    ZoomOutOutlined,
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
    activity: MonitorHeartOutlined,
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
    combine: MergeTypeOutlined,
    cube: Inventory2Outlined,  // Alias for box (used in manifests)
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
    coffee: LocalCafeOutlined,
    comment: CommentOutlined,
    compass: ExploreOutlined,
    compassOff: ExploreOffOutlined,
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
    disabled: DoDisturbOutlined,
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
    fileDownload: DownloadOutlined,
    fileType: DescriptionOutlined,
    fileUpload: UploadOutlined,
    filter: FilterAltOutlined,
    filterList: FilterListOutlined,
    fitView: CenterFocusStrongOutlined,
    focus: GpsFixedOutlined,
    folder: FolderOutlined,
    folderOpen: FolderOpenOutlined,
    folderPlus: CreateNewFolderOutlined,
    folderTree: AccountTreeOutlined,
    fullscreen: FullscreenOutlined,
    fullscreenExit: FullscreenExitOutlined,

    // G
    gesture: PanToolOutlined,
    gitBranch: AccountTreeOutlined,
    glasses: ViewInArOutlined, // Need to make custom from Material Symbols
    globe: PublicOutlined,
    grid: GridOnOutlined,
    grid3x3: GridViewOutlined,
    gripHorizontal: DragHandleOutlined,
    gripVertical: DragIndicatorOutlined,

    // H
    hand: PanToolOutlined,
    hardDrive: StorageOutlined,
    headphones: HeadphonesOutlined,
    headset: HeadsetOutlined,
    help: HelpOutlineOutlined,
    helpCircle: HelpOutlineOutlined,
    hexagon: HexagonOutlined,
    home: HomeOutlined,

    // I
    image: ImageOutlined,
    imageOff: BrokenImageOutlined,
    info: InfoOutlined,

    // J
    joinVoice: HeadsetMicOutlined,

    // K
    keyboard: KeyboardOutlined,

    // L
    layers: LayersOutlined,
    layout: DashboardOutlined,
    layoutGrid: GridViewOutlined,
    leaveVoice: HeadsetOffOutlined,
    link: LinkOutlined,
    link2: LinkOutlined,
    linkOff: LinkOffOutlined,
    list: ListOutlined,
    location: LocationOnOutlined,
    lock: LockOutlined,
    login: LoginOutlined,
    logout: LogoutOutlined,

    // M
    map: MapOutlined,
    mapPin: PinDropOutlined,
    maximize: OpenInFullOutlined,
    maximize2: OpenInFullOutlined,
    memory: MemoryOutlined,
    menu: MoreHorizOutlined,
    merge: MergeOutlined,
    messageSquare: ChatOutlined,
    mic: MicOutlined,
    micOff: MicOffOutlined,
    minimize: CloseFullscreenOutlined,
    minimize2: CloseFullscreenOutlined,
    monitor: MonitorOutlined,
    moon: NightlightOutlined,
    moreHorizontal: MoreHorizOutlined,
    moreVertical: MoreVertOutlined,
    mousePointer: NearMeOutlined,
    move: OpenWithOutlined,

    // N
    navigation: NearMeOutlined,
    note: NotesOutlined,

    // P
    palette: PaletteOutlined,
    panelLeftClose: ChevronLeftOutlined,
    panelRightClose: ChevronRightOutlined,
    paperclip: LinkOutlined,
    pause: PauseOutlined,
    pencil: EditOutlined,
    people: PeopleOutlined,
    phone: PhoneOutlined,
    photoCamera: PhotoCameraOutlined,
    pin: PushPinOutlined,
    pinOff: PushPinOutlined,
    play: PlayArrowOutlined,
    preview: VisibilityOutlined,
    public: PublicOutlined,

    // R
    radio: RadioOutlined,
    radioDot: RadioButtonCheckedOutlined,
    redo: RedoOutlined,
    refresh: RefreshOutlined,
    remove: RemoveOutlined,
    rocket: ScienceOutlined,
    rotate3d: ThreeDRotationOutlined,
    rotateCcw: RotateLeftOutlined,
    ruler: StraightenOutlined,

    // S
    save: SaveOutlined,
    scatterChart: ScatterPlotOutlined,
    'scatter-chart': ScatterPlotOutlined,  // Alias for manifest compatibility
    science: ScienceOutlined,
    scissors: ContentCutOutlined,
    search: SearchOutlined,
    send: SendOutlined,
    settings: SettingsOutlined,
    share: ShareOutlined,
    share2: ShareOutlined,  // Alias for manifest compatibility
    shield: ShieldOutlined,
    shieldAlert: GppMaybeOutlined,
    slash: DoDisturbOutlined,
    sliders: TuneOutlined,
    smile: SentimentSatisfiedOutlined,
    spatialAudio: VolumeUpOutlined,
    square: SquareOutlined,
    star: StarOutlined,
    starOutline: StarBorderOutlined,
    stickyNote: NotesOutlined,
    stop: StopOutlined,
    sun: WbSunnyOutlined,

    // T
    target: GpsFixedOutlined,
    time: ScheduleOutlined,
    tools: BuildOutlined,
    trash: DeleteOutlined,
    triangle: ChangeHistoryOutlined,

    // U
    undo: UndoOutlined,
    unlock: LockOpenOutlined,
    upload: UploadOutlined,
    user: PersonOutlined,
    userCheck: HowToRegOutlined,
    userCircle: PersonOutlined,
    userCog: ManageAccountsOutlined,
    userPlus: PersonAddOutlined,
    userRemove: PersonRemoveOutlined,
    userX: PersonOffOutlined,
    users: PeopleOutlined,

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
    xCircle: CancelOutlined,

    // Z
    zap: ScienceOutlined,
    zoomIn: ZoomInOutlined,
    zoomOut: ZoomOutOutlined,
};

// =============================================================================
// LEGACY ALIASES
// =============================================================================
// Maps old Lucide names to new semantic names for backwards compatibility
// This allows: <Icon name="X" /> → resolves to "close"

const LEGACY_ALIASES = {
    // Lucide name → semantic name
    X: 'close',
    Plus: 'add',
    Minus: 'remove',
    Trash2: 'delete',
    Edit3: 'edit',
    Check: 'check',
    Save: 'save',
    Copy: 'copy',
    Undo2: 'undo',
    Redo2: 'redo',
    RefreshCw: 'refresh',
    Search: 'search',
    Settings: 'settings',
    MoreHorizontal: 'moreHorizontal',
    MoreVertical: 'moreVertical',
    ChevronDown: 'chevronDown',
    ChevronUp: 'chevronUp',
    ChevronLeft: 'chevronLeft',
    ChevronRight: 'chevronRight',
    Eye: 'eye',
    EyeOff: 'eyeOff',
    Maximize: 'maximize',
    Maximize2: 'maximize2',
    Minimize: 'minimize',
    Minimize2: 'minimize2',
    Fullscreen: 'fullscreen',
    ZoomIn: 'zoomIn',
    ZoomOut: 'zoomOut',
    Glasses: 'vr',
    Box: 'box',
    Layers: 'layers',
    Move: 'move',
    Hand: 'hand',
    Scissors: 'scissors',
    Ruler: 'ruler',
    Palette: 'palette',
    Filter: 'filter',
    Sliders: 'sliders',
    Wrench: 'wrench',
    Target: 'target',
    Crosshair: 'crosshair',
    MousePointer: 'mousePointer',
    MousePointer2: 'mousePointer',
    Pencil: 'pencil',
    Folder: 'folder',
    FolderPlus: 'folderPlus',
    FolderOpen: 'folderOpen',
    FolderTree: 'folderTree',
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
    Stop: 'stop',
    Video: 'video',
    VideoOff: 'videoOff',
    Mic: 'mic',
    MicOff: 'micOff',
    Volume2: 'volume',
    Camera: 'camera',
    Radio: 'radio',
    Info: 'info',
    HelpCircle: 'help',
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
    MapPin: 'mapPin',
    Home: 'home',
    Star: 'star',
    Bookmark: 'bookmark',
    Pin: 'pin',
    PinOff: 'pinOff',
    Lock: 'lock',
    Unlock: 'unlock',
    Shield: 'shield',
    Link: 'link',
    Link2: 'link2',
    ExternalLink: 'externalLink',
    Share: 'share',
    Share2: 'share',
    Clock: 'clock',
    Calendar: 'calendar',
    Circle: 'circle',
    CircleDot: 'radioDot',
    Hexagon: 'hexagon',
    Globe: 'globe',
    Wifi: 'wifi',
    WifiOff: 'wifiOff',
    Sun: 'sun',
    Moon: 'moon',
    Monitor: 'monitor',
    Headphones: 'headphones',
    Keyboard: 'keyboard',
    Smile: 'smile',
    StickyNote: 'stickyNote',
    Note: 'note',
    Archive: 'archive',
    LogOut: 'logout',
    DoorOpen: 'doorOpen',
    Merge: 'merge',
    Building2: 'building2',
    Cpu: 'cpu',
    Crown: 'crown',
    RotateCcw: 'rotateCcw',
    Loader2: 'loader',
    Loader: 'loader',
    GripHorizontal: 'gripHorizontal',
    GripVertical: 'gripVertical',
    PanelLeftClose: 'panelLeftClose',
    PanelRightClose: 'panelRightClose',
    ArrowRight: 'arrowRight',
    ArrowDown: 'arrowDown',
    ArrowUp: 'arrowUp',
    ArrowLeft: 'arrowLeft',
    ArrowLeftRight: 'arrowLeftRight',
    ArrowUpDown: 'arrowUpDown',
    AtSign: 'atSign',
    HardDrive: 'hardDrive',
    Combine: 'merge',
    GitBranch: 'gitBranch',
    Compass: 'compass',
    Navigation: 'navigation',
    Phone: 'phone',
    Coffee: 'coffee',
    Slash: 'slash',
    Triangle: 'triangle',
    Zap: 'zap',
    Rocket: 'rocket',
    Science: 'science',
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
    PeopleOutlined as IconUsers,
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