// CLEAN PATTERN: Map semantic icon names, not tool IDs

import { ui as log } from "@Utils/logger.js";
import { createSlashedIcon } from "@UI/react/components/common/IconOverlay";
import { getIconComponent } from '@UI/react/components/common/Icon';

// Create slashed icon variants using getIconComponent
const SlashedCompass = createSlashedIcon(getIconComponent('compass'));
const SlashedGrid = createSlashedIcon(getIconComponent('grid'));
const SlashedRuler = createSlashedIcon(getIconComponent('ruler'));

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
  box: getIconComponent('box'),
  cube: getIconComponent('box'),
  square: getIconComponent('square'),
  circle: getIconComponent('circle'),
  triangle: getIconComponent('triangle'),
  layers: getIconComponent('layers'),

  // ==========================================================================
  // MEASUREMENT & ANALYSIS
  // Used by: measurement tools, statistics, data analysis
  // ==========================================================================
  ruler: getIconComponent('ruler'),
  measure: getIconComponent('ruler'), // Alias
  "ruler-off": SlashedRuler,
  "measure-off": SlashedRuler,
  "bar-chart": getIconComponent('barChart3'),
  trend: getIconComponent('trendingUp'),
  network: getIconComponent('network'),
  graph: getIconComponent('network'), // Alias

  // ==========================================================================
  // CAMERA & VIEWING
  // Used by: camera controls, view presets, zoom
  // ==========================================================================
  camera: getIconComponent('camera'),
  eye: getIconComponent('eye'),
  "eye-off": getIconComponent('eyeOff'),
  focus: getIconComponent('focus'),
  "zoom-in": getIconComponent('zoomIn'),
  "zoom-out": getIconComponent('zoomOut'),

  // ==========================================================================
  // TOOLS & MANIPULATION
  // Used by: transform, clipping, editing tools
  // ==========================================================================
  scissors: getIconComponent('scissors'),
  clip: getIconComponent('scissors'), // Alias
  wand: getIconComponent('wand2'),
  transform: getIconComponent('wand2'), // Alias
  move: getIconComponent('move'),
  translate: getIconComponent('move'), // Alias
  "rotate-cw": getIconComponent('rotateCw'),
  "rotate-ccw": getIconComponent('rotateCcw'),
  rotate: getIconComponent('rotateCw'), // Alias
  "move-3d": getIconComponent('move3d'),
  axes: getIconComponent('move3d'), // Alias

  // ==========================================================================
  // VISUAL PROPERTIES
  // Used by: colormaps, lighting, rendering options
  // ==========================================================================
  palette: getIconComponent('palette'),
  colormap: getIconComponent('palette'), // Alias
  sun: getIconComponent('sun'),
  lighting: getIconComponent('sun'), // Alias
  contrast: getIconComponent('contrast'),
  rainbow: getIconComponent('rainbow'),
  "temp-cold": getIconComponent('thermometerSnowflake'),
  "temp-hot": getIconComponent('thermometerSun'),
  eclipse: getIconComponent('eclipse'),
  grayscale: getIconComponent('eclipse'), // Alias
  wallpaper: getIconComponent('wallpaper'),
  texture: getIconComponent('wallpaper'), // Alias
  grid: getIconComponent('grid'),
  "grid-off": SlashedGrid,
  "grid-3x3": getIconComponent('grid3x3'),
  points: getIconComponent('circleDot'),
  droplet: getIconComponent('droplet'),

  // ==========================================================================
  // NAVIGATION & ORIENTATION
  // Used by: orientation cube, navigation aids
  // ==========================================================================
  compass: getIconComponent('compass'),
  "compass-off": SlashedCompass,

  // ==========================================================================
  // CORNER POSITIONING
  // Used by: widget positioning controls
  // ==========================================================================
  "corner-down-right": getIconComponent('cornerDownRight'),
  "corner-down-left": getIconComponent('cornerDownLeft'),
  "corner-up-right": getIconComponent('cornerUpRight'),
  "corner-up-left": getIconComponent('cornerUpLeft'),
  "corner-br": getIconComponent('cornerDownRight'), // Alias
  "corner-bl": getIconComponent('cornerDownLeft'), // Alias
  "corner-tr": getIconComponent('cornerUpRight'), // Alias
  "corner-tl": getIconComponent('cornerUpLeft'), // Alias

  // ==========================================================================
  // ANNOTATIONS & COMMUNICATION
  // Used by: annotations, notes, measurements display
  // ==========================================================================
  message: getIconComponent('messageSquare'),
  annotation: getIconComponent('messageSquare'), // Alias
  note: getIconComponent('messageSquare'), // Alias
  "pencil-ruler": getIconComponent('pencilRuler'),

  // ==========================================================================
  // UI ACTIONS
  // Used by: buttons, confirmations, common actions
  // ==========================================================================
  plus: getIconComponent('add'),
  add: getIconComponent('add'), // Alias
  edit: getIconComponent('edit3'),
  delete: getIconComponent('delete'),
  trash: getIconComponent('delete'), // Alias
  check: getIconComponent('check'),
  confirm: getIconComponent('check'), // Alias
  x: getIconComponent('close'),
  cancel: getIconComponent('close'), // Alias
  close: getIconComponent('close'), // Alias
  refresh: getIconComponent('refresh'),
  reload: getIconComponent('refresh'), // Alias
  fullscreen: getIconComponent('maximize2'),
  maximize: getIconComponent('maximize2'), // Alias
  minimize: getIconComponent('minimize2'),

  // ==========================================================================
  // DATA & FILES
  // Used by: data info, import/export
  // ==========================================================================
  database: getIconComponent('database'),
  data: getIconComponent('database'), // Alias
  file: getIconComponent('fileText'),
  document: getIconComponent('fileText'), // Alias
  download: getIconComponent('download'),
  export: getIconComponent('download'), // Alias
  upload: getIconComponent('upload'),
  import: getIconComponent('upload'), // Alias

  // ==========================================================================
  // SETTINGS & INFO
  // Used by: configuration, properties, information
  // ==========================================================================
  settings: getIconComponent('settings'),
  config: getIconComponent('settings'), // Alias
  sliders: getIconComponent('sliders'),
  properties: getIconComponent('sliders'), // Alias
  controls: getIconComponent('sliders'), // Alias
  info: getIconComponent('info'),
  help: getIconComponent('info'), // Alias

  // ==========================================================================
  // FALLBACK
  // ==========================================================================
  default: getIconComponent('box'),
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
  log.warn(`No icon mapping for tool: ${toolId}, using default`);
  log.debug(
    `Hint: Add 'icon: "icon-name"' to tool definition or add mapping: "${toolId}": IconComponent`
  );
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
    log.warn(`Overwriting existing icon mapping: ${iconName}`);
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
