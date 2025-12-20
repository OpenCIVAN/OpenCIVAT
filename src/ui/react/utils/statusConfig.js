/**
 * @file statusConfig.js
 * @description Centralized user status configuration for CIA Web.
 * Single source of truth for status colors, icons, and labels.
 *
 * @example
 * import { STATUS_CONFIG, getStatusIcon, getStatusColor } from '@UI/react/utils/statusConfig';
 *
 * const config = STATUS_CONFIG[user.status];
 * // or
 * const StatusIcon = getStatusIcon(user.status);
 * const color = getStatusColor(user.status);
 */

import { Circle, Clock, Coffee, XCircle } from "lucide-react";

/**
 * Status types available in CIA Web
 * @typedef {'online'|'idle'|'away'|'dnd'|'offline'} StatusType
 */

/**
 * Complete status configuration
 */
export const STATUS_CONFIG = {
  online: {
    id: "online",
    icon: Circle,
    label: "Online",
    description: "Available and active",
    color: "var(--status-online)",
    colorHex: "#4CAF50",
    fill: true,
  },
  idle: {
    id: "idle",
    icon: Clock,
    label: "Idle",
    description: "Temporarily away",
    color: "var(--status-idle)",
    colorHex: "#FF9800",
    fill: false,
  },
  away: {
    id: "away",
    icon: Coffee,
    label: "Away",
    description: "Away for a while",
    color: "var(--status-away)",
    colorHex: "#808080",
    fill: false,
  },
  dnd: {
    id: "dnd",
    icon: XCircle,
    label: "Do Not Disturb",
    description: "Mute notifications",
    color: "var(--status-dnd)",
    colorHex: "#f44336",
    fill: false,
  },
  offline: {
    id: "offline",
    icon: Circle,
    label: "Offline",
    description: "Not connected",
    color: "var(--status-offline)",
    colorHex: "#404040",
    fill: false,
  },
  // Alias for 'online' - some components use 'active' instead
  active: {
    id: "active",
    icon: Circle,
    label: "Active",
    description: "Available and active",
    color: "var(--status-online)",
    colorHex: "#34d399",
    fill: true,
  },
  // Alias for 'busy' - ProfileModal uses this instead of 'dnd'
  busy: {
    id: "busy",
    icon: XCircle,
    label: "Busy",
    description: "Do not disturb",
    color: "var(--status-dnd)",
    colorHex: "#f44336",
    fill: false,
  },
};

/**
 * Array of primary statuses for iteration (excludes aliases)
 */
export const STATUS_OPTIONS = [
  STATUS_CONFIG.online,
  STATUS_CONFIG.idle,
  STATUS_CONFIG.away,
  STATUS_CONFIG.dnd,
];

/**
 * All statuses including offline (for user lists)
 */
export const ALL_STATUSES = [
  STATUS_CONFIG.online,
  STATUS_CONFIG.idle,
  STATUS_CONFIG.away,
  STATUS_CONFIG.dnd,
  STATUS_CONFIG.offline,
];

/**
 * Get the icon component for a status
 * @param {StatusType} status - Status type
 * @returns {React.ComponentType} Lucide icon component
 */
export function getStatusIcon(status) {
  return STATUS_CONFIG[status]?.icon || Circle;
}

/**
 * Get the CSS variable color for a status
 * @param {StatusType} status - Status type
 * @returns {string} CSS color value
 */
export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.color || STATUS_CONFIG.offline.color;
}

/**
 * Get the hex color for a status (for contexts without CSS vars)
 * @param {StatusType} status - Status type
 * @returns {string} Hex color value
 */
export function getStatusColorHex(status) {
  return STATUS_CONFIG[status]?.colorHex || STATUS_CONFIG.offline.colorHex;
}

/**
 * Get the label for a status
 * @param {StatusType} status - Status type
 * @returns {string} Human-readable label
 */
export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || "Unknown";
}

/**
 * Get the description for a status
 * @param {StatusType} status - Status type
 * @returns {string} Description text
 */
export function getStatusDescription(status) {
  return STATUS_CONFIG[status]?.description || "";
}

/**
 * Check if a status icon should be filled
 * @param {StatusType} status - Status type
 * @returns {boolean} Whether icon should be filled
 */
export function isStatusFilled(status) {
  return STATUS_CONFIG[status]?.fill || false;
}

/**
 * Render a status icon with proper styling
 * @param {StatusType} status - Status type
 * @param {Object} options - Options
 * @param {number} options.size - Icon size (default: 10)
 * @param {boolean} options.useHex - Use hex colors instead of CSS vars (default: false)
 * @param {string} options.className - Additional CSS class
 * @returns {Object} Props to spread onto icon component
 */
export function getStatusIconProps(status, options = {}) {
  const { size = 10, useHex = false, className = "" } = options;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const color = useHex ? config.colorHex : config.color;

  return {
    size,
    color,
    fill: config.fill ? color : "none",
    className: `status-icon ${className}`.trim(),
  };
}

export default STATUS_CONFIG;
