// CLEAN PATTERN: Map semantic icon names, not tool IDs

import { createSlashedIcon } from "@UI/react/components/common/IconOverlay.jsx";

import {
  // Geometry & 3D
  Box,
  Circle,
  Square,
  Triangle,
  Layers,

  // Measurement & Analysis
  Ruler,
  Move,
  BarChart3,
  TrendingUp,
  Network,

  // Camera & View
  Camera,
  Eye,
  EyeOff,
  Focus,
  ZoomIn,
  ZoomOut,

  // Tools & Editing
  Scissors,
  Wand2,
  RotateCw,
  RotateCcw,
  Move3d,

  // Visual Properties
  Sun,
  Palette,
  Contrast,
  Rainbow,
  ThermometerSnowflake,
  ThermometerSun,
  Eclipse,
  Grid,
  Grid3x3,
  CircleDot,

  // Navigation
  Compass,
  Maximize2,
  Minimize2,

  // UI Actions
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Sliders,
  Info,

  // Communication
  MessageSquare,
  PencilRuler,

  // Data
  Database,
  FileText,
  Wallpaper,

  // Corner positioning
  CornerDownRight,
  CornerDownLeft,
  CornerUpRight,
  CornerUpLeft,
} from "lucide-react";

const SlashedCompass = createSlashedIcon(Compass);
const SlashedGrid = createSlashedIcon(Grid);
const SlashedRuler = createSlashedIcon(Ruler);

/**
 * ICON REGISTRY
 *
 * Maps semantic icon NAMES to Lucide components.
 * Tool definitions reference these names via the `icon` property.
 *
 * PATTERN:
 * - Use lowercase-with-hyphens for names
 * - Keep names semantic, not tool-specific
 * - Allow multiple tools to share one icon
 * - Add aliases for common variations
 *
 * USAGE IN TOOLS:
 * {
 *   id: "my-specific-tool",        ← Unique tool ID
 *   icon: "compass",               ← Semantic icon name
 *   label: "My Tool"
 * }
 */
const TOOL_ICON_MAP = {
  // ==========================================================================
  // GEOMETRY & 3D
  // Used by: general shapes, bounds, primitives
  // ==========================================================================
  box: Box,
  cube: Box,
  square: Square,
  circle: Circle,
  triangle: Triangle,
  layers: Layers,

  // ==========================================================================
  // MEASUREMENT & ANALYSIS
  // Used by: measurement tools, statistics, data analysis
  // ==========================================================================
  ruler: Ruler,
  measure: Ruler, // Alias
  "ruler-off": SlashedRuler,
  "measure-off": SlashedRuler,
  "bar-chart": BarChart3,
  trend: TrendingUp,
  network: Network,
  graph: Network, // Alias

  // ==========================================================================
  // CAMERA & VIEWING
  // Used by: camera controls, view presets, zoom
  // ==========================================================================
  camera: Camera,
  eye: Eye,
  "eye-off": EyeOff,
  focus: Focus,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,

  // ==========================================================================
  // TOOLS & MANIPULATION
  // Used by: transform, clipping, editing tools
  // ==========================================================================
  scissors: Scissors,
  clip: Scissors, // Alias
  wand: Wand2,
  transform: Wand2, // Alias
  move: Move,
  translate: Move, // Alias
  "rotate-cw": RotateCw,
  "rotate-ccw": RotateCcw,
  rotate: RotateCw, // Alias
  "move-3d": Move3d,
  axes: Move3d, // Alias

  // ==========================================================================
  // VISUAL PROPERTIES
  // Used by: colormaps, lighting, rendering options
  // ==========================================================================
  palette: Palette,
  colormap: Palette, // Alias
  sun: Sun,
  lighting: Sun, // Alias
  contrast: Contrast,
  rainbow: Rainbow,
  "temp-cold": ThermometerSnowflake,
  "temp-hot": ThermometerSun,
  eclipse: Eclipse,
  grayscale: Eclipse, // Alias
  wallpaper: Wallpaper,
  texture: Wallpaper, // Alias
  grid: Grid,
  "grid-off": SlashedGrid,
  "grid-3x3": Grid3x3,
  points: CircleDot,

  // ==========================================================================
  // NAVIGATION & ORIENTATION
  // Used by: orientation cube, navigation aids
  // ==========================================================================
  compass: Compass,
  "compass-off": SlashedCompass,

  // ==========================================================================
  // CORNER POSITIONING
  // Used by: widget positioning controls
  // ==========================================================================
  "corner-down-right": CornerDownRight,
  "corner-down-left": CornerDownLeft,
  "corner-up-right": CornerUpRight,
  "corner-up-left": CornerUpLeft,
  "corner-br": CornerDownRight, // Alias
  "corner-bl": CornerDownLeft, // Alias
  "corner-tr": CornerUpRight, // Alias
  "corner-tl": CornerUpLeft, // Alias

  // ==========================================================================
  // ANNOTATIONS & COMMUNICATION
  // Used by: annotations, notes, measurements display
  // ==========================================================================
  message: MessageSquare,
  annotation: MessageSquare, // Alias
  note: MessageSquare, // Alias
  "pencil-ruler": PencilRuler,

  // ==========================================================================
  // UI ACTIONS
  // Used by: buttons, confirmations, common actions
  // ==========================================================================
  plus: Plus,
  add: Plus, // Alias
  edit: Edit3,
  delete: Trash2,
  trash: Trash2, // Alias
  check: Check,
  confirm: Check, // Alias
  x: X,
  cancel: X, // Alias
  close: X, // Alias
  refresh: RefreshCw,
  reload: RefreshCw, // Alias
  fullscreen: Maximize2,
  maximize: Maximize2, // Alias
  minimize: Minimize2,

  // ==========================================================================
  // DATA & FILES
  // Used by: data info, import/export
  // ==========================================================================
  database: Database,
  data: Database, // Alias
  file: FileText,
  document: FileText, // Alias
  download: Download,
  export: Download, // Alias
  upload: Upload,
  import: Upload, // Alias

  // ==========================================================================
  // SETTINGS & INFO
  // Used by: configuration, properties, information
  // ==========================================================================
  settings: Settings,
  config: Settings, // Alias
  sliders: Sliders,
  properties: Sliders, // Alias
  controls: Sliders, // Alias
  info: Info,
  help: Info, // Alias

  // ==========================================================================
  // FALLBACK
  // ==========================================================================
  default: Box,
};

/**
 * Get Lucide icon component for a tool
 *
 * Priority order:
 * 1. Explicit icon provided by tool definition (tool.icon)
 * 2. Tool's ID if it matches an icon name (tool.id)
 * 3. Default fallback (Box)
 *
 * @param {string} toolId - The tool's unique ID
 * @param {string} [toolIcon] - Optional explicit icon name from tool.icon
 * @returns {React.Component} Lucide icon component
 */
export function getToolIcon(toolId, toolIcon) {
  // Priority 1: Explicit icon name provided
  if (toolIcon && TOOL_ICON_MAP[toolIcon]) {
    return TOOL_ICON_MAP[toolIcon];
  }

  // Priority 2: Tool ID matches an icon name
  if (TOOL_ICON_MAP[toolId]) {
    return TOOL_ICON_MAP[toolId];
  }

  // Priority 3: Default fallback
  console.warn(`⚠️ No icon mapping for tool: ${toolId}, using default`);
  console.log(`   Hint: Add 'icon: "icon-name"' to tool definition`);
  console.log(`   Or add mapping: "${toolId}": IconComponent`);
  return TOOL_ICON_MAP["default"];
}

/**
 * Check if an icon name exists
 *
 * @param {string} iconName - Icon name to check
 * @returns {boolean}
 */
export function hasIconMapping(iconName) {
  return iconName in TOOL_ICON_MAP;
}

/**
 * Get all available icon names
 * Useful for documentation and debugging
 *
 * @returns {string[]} Array of all icon names
 */
export function getAvailableIcons() {
  return Object.keys(TOOL_ICON_MAP);
}

/**
 * Register a new icon at runtime
 * Allows features/plugins to add their own icons
 *
 * @param {string} iconName - Name to register
 * @param {React.Component} iconComponent - Lucide icon component
 */
export function registerIcon(iconName, iconComponent) {
  if (TOOL_ICON_MAP[iconName]) {
    console.warn(`⚠️ Overwriting existing icon mapping: ${iconName}`);
  }
  TOOL_ICON_MAP[iconName] = iconComponent;
}

/**
 * USAGE EXAMPLES
 *
 * Example 1: Explicit icon (recommended)
 * ----------------------------------------
 * {
 *   id: "orientation-cube-toggle",
 *   icon: "compass",          ← References TOOL_ICON_MAP["compass"]
 *   label: "Orientation"
 * }
 *
 * Example 2: Multiple tools, same icon
 * ----------------------------------------
 * {
 *   id: "line-measurement",
 *   icon: "ruler",            ← Reuses "ruler"
 *   label: "Line"
 * }
 * {
 *   id: "distance-tool",
 *   icon: "ruler",            ← Same icon!
 *   label: "Distance"
 * }
 *
 * Example 3: Using aliases
 * ----------------------------------------
 * {
 *   id: "import-data",
 *   icon: "upload",           ← Or "import" - both work!
 *   label: "Import"
 * }
 *
 * Example 4: ID fallback (less flexible)
 * ----------------------------------------
 * {
 *   id: "compass",            ← If no icon property, uses ID
 *   label: "Orientation"      ← Works if TOOL_ICON_MAP["compass"] exists
 * }
 */
