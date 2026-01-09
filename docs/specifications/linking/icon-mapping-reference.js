/**
 * Icon Mapping Reference
 * 
 * Maps emoji icons used in VR/Link design files to Material Symbols icon names.
 * Use with the Icon component: <Icon name="iconName" size={20} />
 * 
 * Import: import { Icon } from '@UI/react/components/atoms/Icon';
 */

// =============================================================================
// EMOJI → ICON NAME MAPPING
// =============================================================================

export const ICON_MAPPING = {
  // ─────────────────────────────────────────────────────────────────────────────
  // LINKING & SYNC
  // ─────────────────────────────────────────────────────────────────────────────
  '🔗': 'link',                    // Link/connection
  '↔️': 'arrowLeftRight',          // Bidirectional sync / swap
  '←': 'arrowLeft',                // Follow (one-way left)
  '→': 'arrowRight',               // Broadcast (one-way right)
  '⬅️': 'arrowLeft',               // Left direction
  '➡️': 'arrowRight',              // Right direction
  '⬆️': 'arrowUp',                 // Up direction / push up
  '⬇️': 'arrowDown',               // Down direction / push down
  '↙': 'southWest',                // Dashboard left arc
  '↓': 'arrowDown',                // Dashboard center
  '↘': 'southEast',                // Dashboard right arc
  '↗️': 'northEast',               // Transfer hub
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW PROPERTIES (for linking)
  // ─────────────────────────────────────────────────────────────────────────────
  '📷': 'camera',                  // Camera property
  '🎚': 'sliders',                 // Filters property (use tune or sliders)
  '🎨': 'palette',                 // Color maps property
  '📐': 'straighten',              // Widgets property (use ruler/straighten)
  '👁': 'eye',                     // Cursors property / visibility
  '📝': 'editNote',                // Annotations property
  
  // ─────────────────────────────────────────────────────────────────────────────
  // USERS & COLLABORATION
  // ─────────────────────────────────────────────────────────────────────────────
  '👥': 'users',                   // Group / multiple users
  '👤': 'user',                    // Single user
  '🧑‍🤝‍🧑': 'users',                // Group members
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATUS & INDICATORS
  // ─────────────────────────────────────────────────────────────────────────────
  '✓': 'check',                    // Checkmark / confirmed
  '✕': 'close',                    // Close / cancel
  '★': 'star',                     // Hub indicator / favorite
  '⭐': 'star',                    // Star
  '●': 'dot',                      // Dot indicator
  '◀': 'chevronLeft',              // Left indicator
  '▶': 'chevronRight',             // Right indicator
  '▲': 'chevronUp',                // Up indicator
  '▼': 'chevronDown',              // Down indicator
  '⬤': 'circle',                   // Filled circle
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  '➕': 'add',                      // Add / plus
  '➖': 'remove',                   // Minimize / minus
  '❌': 'close',                    // Close / delete / unlink all
  '🗑️': 'delete',                  // Delete / trash
  '📋': 'copy',                    // Copy / duplicate
  '✂️': 'cut',                     // Split / cut
  '🔍': 'search',                  // Search
  '🔍+': 'zoomIn',                 // Zoom in
  '🔍−': 'zoomOut',                // Zoom out
  
  // ─────────────────────────────────────────────────────────────────────────────
  // NAVIGATION & POSITION
  // ─────────────────────────────────────────────────────────────────────────────
  '🏠': 'home',                    // Home / homepoint
  '🎯': 'target',                  // Target / go to / navigate
  '📍': 'location',                // Position indicator
  '📌': 'pin',                     // Pin / snap position
  '🧭': 'compass',                 // Compass / navigation
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VR & SPATIAL
  // ─────────────────────────────────────────────────────────────────────────────
  '🎮': 'controller',              // VR controller / gamepad
  '👓': 'vr',                      // VR headset
  '✋': 'pan',                     // Hand / gesture / right hand
  '🤚': 'pan',                     // Left hand gesture
  '👁': 'eye',                     // HUD mode / visibility
  '🌍': 'globe',                   // World mode / globe
  '📊': 'dashboard',               // Dashboard mode / chart
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DATA & FILES
  // ─────────────────────────────────────────────────────────────────────────────
  '📊': 'barChart',                // Dataset / chart (alt: dashboard)
  '🖼️': 'image',                  // Image / view
  '📁': 'folder',                  // Folder
  '📄': 'file',                    // File
  
  // ─────────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS & FEEDBACK
  // ─────────────────────────────────────────────────────────────────────────────
  '✅': 'checkCircle',             // Success
  'ℹ️': 'info',                    // Info
  '⚠️': 'warning',                 // Warning
  '❗': 'error',                   // Error
  '🔔': 'bell',                    // Notification
  
  // ─────────────────────────────────────────────────────────────────────────────
  // UI ELEMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  '⚙️': 'settings',                // Settings / gear
  '📚': 'layers',                  // Stack / layers
  '🔒': 'lock',                    // Lock
  '🔓': 'unlock',                  // Unlock
  '⋮': 'moreVertical',             // More options vertical
  '⋯': 'moreHorizontal',           // More options horizontal
  '≡': 'menu',                     // Menu / hamburger
};

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Convert emoji to icon name
 * @param {string} emoji - The emoji character
 * @returns {string} - The icon name for use with Icon component
 */
export function getIconName(emoji) {
  return ICON_MAPPING[emoji] || 'help';
}

// =============================================================================
// ICON COMPONENT USAGE EXAMPLES
// =============================================================================

/**
 * Instead of:
 *   <span>🔗</span>
 * 
 * Use:
 *   <Icon name="link" size={16} />
 * 
 * Instead of:
 *   style={{ fontSize: '20px' }}>{emoji}</span>
 * 
 * Use:
 *   <Icon name={iconName} size={20} />
 * 
 * For colored icons:
 *   <Icon name="link" size={16} color={tokens.accent} />
 * 
 * With className:
 *   <Icon name="link" size={16} className="icon--active" />
 */

// =============================================================================
// PROPERTY ICON CONSTANTS (for View Linking)
// =============================================================================

export const PROPERTY_ICONS = {
  camera: 'camera',
  filters: 'tune',           // or 'sliders'
  colorMaps: 'palette',
  widgets: 'widgets',        // or 'straighten'
  cursors: 'eye',
  annotationDisplay: 'editNote',
};

// =============================================================================
// MODE ICON CONSTANTS (for VR Panel modes)
// =============================================================================

export const VR_MODE_ICONS = {
  hud: 'eye',
  world: 'globe',
  hand: 'pan',
  dashboard: 'dashboard',
};

// =============================================================================
// ACTION ICON CONSTANTS (for context menus)
// =============================================================================

export const ACTION_ICONS = {
  move: 'arrowLeftRight',
  swap: 'swapHoriz',
  duplicate: 'copy',
  delete: 'delete',
  merge: 'merge',
  split: 'cut',
  setHome: 'home',
  navigate: 'target',
  lock: 'lock',
  unlock: 'unlock',
  properties: 'settings',
  unlink: 'linkOff',
  viewGroup: 'users',
  transferHub: 'share',
};

// =============================================================================
// DIRECTION ICON CONSTANTS (for navigation)
// =============================================================================

export const DIRECTION_ICONS = {
  up: 'arrowUp',
  down: 'arrowDown',
  left: 'arrowLeft',
  right: 'arrowRight',
  pushUp: 'arrowUp',
  pushDown: 'arrowDown',
  pushLeft: 'arrowLeft',
  pushRight: 'arrowRight',
};

// =============================================================================
// TOAST TYPE ICONS
// =============================================================================

export const TOAST_ICONS = {
  info: 'info',
  success: 'checkCircle',
  warning: 'warning',
  error: 'error',
  sync: 'sync',
};

export default ICON_MAPPING;
