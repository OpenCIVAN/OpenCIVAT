// src/ui/react/components/workspace/ToolbarIconRegistry.js
// Centralized icon mapping for toolbar tools
// Separates icon concerns from InstanceViewport logic

import {
  // Reduction & Analysis
  BarChart3,
  TrendingUp,
  GitBranch,
  Network,

  // Dimensions & Geometry
  Box,
  Square,
  Layers,
  Maximize2,
  Minimize2,

  // Camera & View
  Camera,
  Video,
  Focus,
  ZoomIn,
  ZoomOut,

  // Tools & Editing
  Scissors,
  Ruler,
  Triangle,
  Wand2,
  Move,
  RotateCw,
  RotateCcw,

  // Visibility & Display
  Eye,
  EyeOff,
  Sun,
  Palette,
  Contrast,
  PencilRuler,
  Wallpaper,
  ThermometerSnowflake,
  Rainbow,
  ThermometerSun,
  Eclipse,

  // Annotations & Communication
  MessageSquare,
  Plus,
  Edit3,
  Trash2,

  // Data & Files
  Database,
  FileText,
  Download,
  Upload,

  // Actions
  Play,
  Pause,
  RefreshCw,
  Check,
  X,

  // Indicators
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle,
  Settings,
  Sliders,
} from "lucide-react";

/**
 * Master icon mapping for all toolbar tools
 * Maps string IDs to Lucide React components
 *
 * Contributors: Add your tool icons here!
 */
const TOOL_ICON_MAP = {
  // ========================================================================
  // DIMENSIONALITY REDUCTION
  // ========================================================================
  reduction: BarChart3,
  pca: TrendingUp,
  tsne: Network,
  umap: Network,
  restore: RotateCcw,

  // ========================================================================
  // DIMENSIONS & PROJECTIONS
  // ========================================================================
  dimensions: Layers,
  "dimension-2d": Square,
  "dimension-3d": Box,
  "toggle-2d-3d": Layers,

  // ========================================================================
  // CAMERA CONTROLS
  // ========================================================================
  camera: Camera,
  "camera-reset": Focus,
  "reset-camera": Focus, // Alias for camera-reset
  "camera-fit": Focus, // Alias for reset
  "camera-top": Camera,
  "camera-front": Camera,
  "camera-side": Camera,
  "camera-isometric": Camera,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,

  // ========================================================================
  // ANALYSIS TOOLS
  // ========================================================================
  clipping: Scissors,
  clip: Scissors, // Alias for clipping
  "clip-x": Scissors,
  "clip-y": Scissors,
  "clip-z": Scissors,

  measurements: Ruler,
  measure: Ruler, // Alias for measurements
  "measure-distance": Ruler,
  "measure-angle": Triangle,
  "measure-area": Square,

  // ========================================================================
  // TRANSFORM TOOLS
  // ========================================================================
  transform: Wand2,
  translate: Move,
  rotate: RotateCw,
  scale: Maximize2,

  // ========================================================================
  // VISIBILITY & DISPLAY
  // ========================================================================
  visibility: Eye,
  show: Eye,
  hide: EyeOff,
  "toggle-axes": Box, // Show/hide axis indicators
  "toggle-grid": Box, // Show/hide grid
  lighting: Sun,
  colormap: Palette,
  "colormap-cool": ThermometerSnowflake,
  "colormap-hot": ThermometerSun,
  "colormap-rainbow": Rainbow,
  "colormap-greyscale": Eclipse,
  contrast: Contrast,
  wireframe: Box,
  solid: Box,
  "show-measurements": PencilRuler,
  visualization: Wallpaper,

  // ========================================================================
  // ANNOTATIONS
  // ========================================================================
  annotations: MessageSquare,
  "add-annotation": Plus,
  "edit-annotation": Edit3,
  "delete-annotation": Trash2,

  // ========================================================================
  // DATA & EXPORT
  // ========================================================================
  "dataset-info": Database,
  "file-info": FileText,
  export: Download,
  import: Upload,

  // ========================================================================
  // PROPERTIES & SETTINGS
  // ========================================================================
  properties: Sliders,
  settings: Settings,
  info: Info,

  // ========================================================================
  // ACTIONS
  // ========================================================================
  apply: Check,
  cancel: X,
  refresh: RefreshCw,
  fullscreen: Maximize2,
  minimize: Minimize2,
  delete: Trash2,

  // ========================================================================
  // FALLBACK
  // ========================================================================
  default: Box,
};

/**
 * Get Lucide icon component for a tool
 *
 * Priority order:
 * 1. Explicit icon ID provided by tool
 * 2. Tool's own ID
 * 3. Default fallback icon
 *
 * @param {string} toolId - The tool's ID
 * @param {string} [toolIcon] - Optional explicit icon ID from tool definition
 * @returns {React.Component} Lucide icon component
 */
export function getToolIcon(toolId, toolIcon) {
  // Priority 1: Explicit icon provided by tool
  if (toolIcon && TOOL_ICON_MAP[toolIcon]) {
    return TOOL_ICON_MAP[toolIcon];
  }

  // Priority 2: Map by tool ID
  if (TOOL_ICON_MAP[toolId]) {
    return TOOL_ICON_MAP[toolId];
  }

  // Priority 3: Default fallback
  console.warn(`⚠️ No icon mapping for tool: ${toolId}, using default`);
  console.log(
    `   Available mappings: ${Object.keys(TOOL_ICON_MAP)
      .slice(0, 10)
      .join(", ")}...`
  );
  return TOOL_ICON_MAP["default"];
}

/**
 * Check if a tool ID has an icon mapping
 * Useful for debugging and validation
 *
 * @param {string} toolId - Tool ID to check
 * @returns {boolean}
 */
export function hasIconMapping(toolId) {
  return toolId in TOOL_ICON_MAP;
}

/**
 * Get all available icon mappings
 * Useful for documentation and debugging
 *
 * @returns {Object} All icon mappings
 */
export function getAllIconMappings() {
  return { ...TOOL_ICON_MAP };
}

/**
 * Register a new icon mapping at runtime
 * Allows plugins to add their own icons
 *
 * @param {string} toolId - Tool ID to register
 * @param {React.Component} iconComponent - Lucide icon component
 */
export function registerIcon(toolId, iconComponent) {
  if (TOOL_ICON_MAP[toolId]) {
    console.warn(`⚠️ Overwriting existing icon mapping for: ${toolId}`);
  }
  TOOL_ICON_MAP[toolId] = iconComponent;
}

/**
 * USAGE GUIDE FOR CONTRIBUTORS
 *
 * Adding a new tool with an icon:
 *
 * 1. In your feature's getTools() method:
 *    return [
 *        {
 *            id: 'my-tool',
 *            icon: 'my-icon',  // String ID
 *            label: 'My Tool',
 *            onClick: () => ...
 *        }
 *    ];
 *
 * 2. Add to TOOL_ICON_MAP above:
 *    'my-icon': MyLucideIcon,
 *
 * 3. That's it! The toolbar will automatically pick it up.
 *
 * Common icon IDs and their meanings:
 * - Use verb-noun format: 'reset-camera', 'toggle-axes', 'add-annotation'
 * - Keep lowercase with hyphens: 'clip-plane' not 'ClipPlane'
 * - Be specific: 'measure-distance' not just 'measure'
 * - Add aliases if needed: both 'clip' and 'clipping' work
 */
