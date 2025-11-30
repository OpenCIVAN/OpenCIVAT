// src/utils/formatters.js
// Shared formatting utilities

/**
 * Format bytes to human-readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB", "256 KB")
 */
export function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Format a date for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
}

/**
 * Format a timestamp for display
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date and time
 */
export function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString();
}
