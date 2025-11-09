// Simple utility to generate unique IDs for datasets and instances

/**
 * Generate a unique ID
 * Format: prefix_timestamp_randomString
 *
 * Examples:
 *   dataset_1234567890_abc123
 *   instance_1234567890_xyz789
 *
 * @param {string} prefix - Optional prefix (default: "id")
 * @returns {string} Unique ID
 */
export function generateId(prefix = "id") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a dataset ID
 * @returns {string} Dataset ID
 */
export function generateDatasetId() {
  return generateId("dataset");
}

/**
 * Generate an instance ID
 * @returns {string} Instance ID
 */
export function generateInstanceId() {
  return generateId("instance");
}

/**
 * Extract timestamp from ID
 * Useful for sorting or debugging
 *
 * @param {string} id - ID to parse
 * @returns {number} Timestamp or null if invalid
 */
export function getIdTimestamp(id) {
  const parts = id.split("_");
  if (parts.length >= 2) {
    const timestamp = parseInt(parts[1], 10);
    return isNaN(timestamp) ? null : timestamp;
  }
  return null;
}
