/**
 * @file constants.js
 * @description Constants for Instance Tools Panel V2
 */

// ViewGroup tipping point - when to switch from connectors to grid
export const VIEWGROUP_TIPPING_POINT = 5;

// Tool section configuration
export const TOOL_SECTIONS = [
  { id: 'camera', label: 'Camera', icon: 'camera', color: 'cyan' },
  { id: 'transform', label: 'Transform', icon: 'move', color: 'pink' },
  { id: 'slice', label: 'Slice', icon: 'sliders', color: 'blue' },
  { id: 'windowLevel', label: 'Window/Level', icon: 'sun', color: 'orange' },
  { id: 'appearance', label: 'Appearance', icon: 'eye', color: 'green' },
];

// Transform limits
export const TRANSFORM_LIMITS = {
  position: { min: -500, max: 500, step: 1, unit: 'mm' },
  rotation: { min: -180, max: 180, step: 1, unit: '°' },
  scale: { min: 10, max: 200, step: 1, unit: '%' },
};

// Camera presets for the camera grid
export const CAMERA_PRESETS = [
  { id: 'iso', label: 'Iso', icon: 'box', position: [0, 0] },
  { id: 'top', label: 'Top', icon: 'arrowUp', position: [0, 1] },
  null, // Empty cell
  { id: 'left', label: 'Left', icon: 'arrowLeft', position: [1, 0] },
  { id: 'reset', label: 'Reset', icon: 'refreshCcw', position: [1, 1], special: true },
  { id: 'right', label: 'Right', icon: 'arrowRight', position: [1, 2] },
  { id: 'front', label: 'Front', icon: 'circle', position: [2, 0] },
  { id: 'bottom', label: 'Bot', icon: 'arrowDown', position: [2, 1] },
  { id: 'back', label: 'Back', icon: 'circleDot', position: [2, 2] },
];

// Slice orientations
export const SLICE_ORIENTATIONS = [
  { id: 'axial', label: 'Axial' },
  { id: 'sagittal', label: 'Sagittal' },
  { id: 'coronal', label: 'Coronal' },
];

// Window/Level presets
export const WINDOW_LEVEL_PRESETS = [
  { id: 'brain', label: 'Brain', window: 80, level: 40 },
  { id: 'bone', label: 'Bone', window: 2500, level: 480 },
  { id: 'lung', label: 'Lung', window: 1500, level: -600 },
  { id: 'soft', label: 'Soft', window: 400, level: 40 },
];

// Appearance representations
export const REPRESENTATIONS = [
  { id: 'surface', label: 'Surface' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'points', label: 'Points' },
];

// Panel tabs
export const PANEL_TABS = [
  { id: 'tools', label: 'Tools', icon: 'wrench', color: 'amber' },
  { id: 'annotations', label: 'Annotations', icon: 'mapPin', color: 'pink' },
];

// Layer types with colors
export const LAYER_TYPES = {
  data: { label: 'Data', color: 'purple' },
  overlay: { label: 'Overlay', color: 'pink' },
  segmentation: { label: 'Segmentation', color: 'teal' },
};

// Widget types
export const WIDGET_TYPES = {
  line: { label: 'Line', icon: 'ruler' },
  angle: { label: 'Angle', icon: 'cornerUpRight' },
  plane: { label: 'Plane', icon: 'square' },
  point: { label: 'Point', icon: 'mapPin' },
};
