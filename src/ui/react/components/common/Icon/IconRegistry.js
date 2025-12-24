import * as LucideIcons from 'lucide-react';
import * as MaterialIcons from "@mui/icons-material";

// Current library preference
let currentLibrary = "material"; // or 'lucide'

// Icon registry with semantic names
const ICON_MAP = {
  // VR & 3D
  vr: { lucide: "Glasses", material: "ViewInAr" },
  rotate3d: { lucide: "RotateCcw", material: "ThreeDRotation" },
  gesture: { lucide: "Move", material: "Gesture" },
  spatialAudio: { lucide: "Mic", material: "SpatialAudio" },
  volume3d: { lucide: "Box", material: "ViewInAr" },

  // Navigation
  pan: { lucide: "Move", material: "OpenWith" },
  zoom: { lucide: "ZoomIn", material: "ZoomIn" },
  fit: { lucide: "Maximize", material: "CenterFocusStrong" },
  reset: { lucide: "RotateCcw", material: "Refresh" },
  camera: { lucide: "Camera", material: "Camera" },
  eye: { lucide: "Eye", material: "Visibility" },
  eyeOff: { lucide: "EyeOff", material: "VisibilityOff" },
  fullscreen: { lucide: "Maximize", material: "Fullscreen" },

  // Tools
  clip: { lucide: "Scissors", material: "ContentCut" },
  measure: { lucide: "Ruler", material: "Straighten" },
  annotate: { lucide: "MessageSquare", material: "Comment" },
  colorMap: { lucide: "Palette", material: "Palette" },
  representation: { lucide: "Layers", material: "Layers" },
  filter: { lucide: "Settings", material: "FilterAlt" },

  // Data
  dataset: { lucide: "Box", material: "Dataset" },
  file: { lucide: "FileText", material: "Description" },
  image: { lucide: "Image", material: "Image" },
  download: { lucide: "Download", material: "Download" },
  upload: { lucide: "Upload", material: "Upload" },

  // UI Actions
  close: { lucide: "X", material: "Close" },
  add: { lucide: "Plus", material: "Add" },
  check: { lucide: "Check", material: "Check" },
  delete: { lucide: "Trash2", material: "Delete" },
  copy: { lucide: "Copy", material: "ContentCopy" },
  settings: { lucide: "Settings", material: "Settings" },
  menu: { lucide: "MoreHorizontal", material: "MoreHoriz" },
  menuVertical: { lucide: "MoreVertical", material: "MoreVert" },
  undo: { lucide: "Undo", material: "Undo" },
  redo: { lucide: "Redo", material: "Redo" },
  search: { lucide: "Search", material: "Search" },
  link: { lucide: "Link", material: "Link" },
  pin: { lucide: "Pin", material: "PushPin" },
  grid: { lucide: "Grid", material: "GridView" },
  tools: { lucide: "Wrench", material: "Build" },

  // Collaboration
  users: { lucide: "Users", material: "Group" },
  mic: { lucide: "Mic", material: "Mic" },
  play: { lucide: "Play", material: "PlayArrow" },
  pause: { lucide: "Pause", material: "Pause" },

  // Scientific
  biotech: { lucide: "Box", material: "Biotech" },
  science: { lucide: "Box", material: "Science" },
  microscope: { lucide: "Eye", material: "Microscope" },
  memory: { lucide: "Box", material: "Memory" },
};

// Custom icons registered at runtime (for plugins)
const customIcons = {};

/**
 * Get icon component by semantic name
 * @param {string} name - Semantic icon name
 * @returns {React.Component} Icon component
 */
export function getIcon(name) {
  // Check custom icons first (plugins)
  if (customIcons[name]) {
    return customIcons[name];
  }

  // Get from registry
  const mapping = ICON_MAP[name];
  if (!mapping) {
    console.warn(`Unknown icon: ${name}`);
    return currentLibrary === "material"
      ? MaterialIcons.HelpOutline
      : LucideIcons.HelpCircle;
  }

  // Return based on current library preference
  const iconName = mapping[currentLibrary];
  const library = currentLibrary === "material" ? MaterialIcons : LucideIcons;

  return library[iconName] || LucideIcons.Box;
}

/**
 * Icon component with semantic naming
 * @example <Icon name="vr" size={20} />
 */
export function Icon({ name, size = 24, color, className, ...props }) {
  const IconComponent = getIcon(name);
  return (
    <IconComponent
      size={size}
      style={{ color }}
      className={className}
      {...props}
    />
  );
}

/**
 * Register custom icon (for plugins)
 * @param {string} name - Icon name
 * @param {React.Component} component - Icon component
 */
export function registerIcon(name, component) {
  if (ICON_MAP[name]) {
    console.warn(`Overwriting existing icon: ${name}`);
  }
  customIcons[name] = component;
}

/**
 * Switch icon library globally
 * @param {'lucide' | 'material'} library
 */
export function setIconLibrary(library) {
  if (library !== "lucide" && library !== "material") {
    console.error(`Invalid library: ${library}`);
    return;
  }
  currentLibrary = library;
}

/**
 * Get current icon library
 * @returns {'lucide' | 'material'}
 */
export function getIconLibrary() {
  return currentLibrary;
}

/**
 * Check if icon exists
 * @param {string} name
 * @returns {boolean}
 */
export function hasIcon(name) {
  return name in ICON_MAP || name in customIcons;
}

/**
 * Get all available icon names
 * @returns {string[]}
 */
export function getAvailableIcons() {
  return [...Object.keys(ICON_MAP), ...Object.keys(customIcons)];
}

/**
 * Get icon component by Lucide icon name (for dynamic file type icons)
 * This is used when icon names come from external sources like file type configs.
 * @param {string} lucideName - Lucide icon name (e.g., "Box", "Database", "FileText")
 * @returns {React.Component} Icon component
 */
export function getLucideIcon(lucideName) {
  if (!lucideName) {
    return LucideIcons.Box;
  }
  // Ensure first letter is capitalized for Lucide lookup
  const normalizedName = lucideName.charAt(0).toUpperCase() + lucideName.slice(1);
  return LucideIcons[normalizedName] || LucideIcons.Box;
}

/**
 * Alias for getIcon - returns the icon component for use where a component is needed
 * @param {string} name - Semantic icon name
 * @returns {React.Component} Icon component
 */
export function getIconComponent(name) {
  return getIcon(name);
}
