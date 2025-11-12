// src/core/data/models/Dataset.js

import { Annotation } from "@Core/data/models/Annotation.js";
import { generateDatasetId } from "@Utils/idGenerator.js";

/**
 * Dataset - Represents a raw data file with associated metadata and annotations
 *
 * A Dataset is Layer 1 of our architecture - it's the raw data plus
 * knowledge annotations that are facts about the data itself.
 *
 * View configurations (Layer 2) reference datasets but don't modify them.
 * Instance windows (Layer 3) render views of datasets.
 *
 * The Dataset owns:
 * - The actual file data (stored in IndexedDB)
 * - Metadata about the file (bounds, point count, etc.)
 * - Annotations created on this dataset (facts about the data)
 *
 * Multiple view configurations can reference the same dataset,
 * each showing different aspects of it with different filters and cameras.
 */

export class Dataset {
  constructor(config = {}) {
    // Core identification
    this.id = config.id || this._generateId();
    this.filename = config.filename; // Required

    // The actual file data (stored in IndexedDB via your existing cache system)
    // This might be a File object or a reference to IndexedDB storage
    this.file = config.file || null;

    // Dataset-level metadata extracted from the file
    this.metadata = {
      fileSize: config.metadata?.fileSize || 0,
      fileType: config.metadata?.fileType || this._inferFileType(this.filename),
      uploadedAt: config.metadata?.uploadedAt || Date.now(),
      uploadedBy: config.metadata?.uploadedBy || null,

      // Spatial metadata (populated after loading)
      bounds: config.metadata?.bounds || null, // [xmin, xmax, ymin, ymax, zmin, zmax]
      pointCount: config.metadata?.pointCount || null,
      cellCount: config.metadata?.cellCount || null,

      // Optional domain-specific metadata
      ...config.metadata,
    };

    // Annotations on this dataset - this is the key part
    // Annotations are stored as an array of Annotation objects
    // They live here at the dataset level, not in view configurations
    this.annotations =
      config.annotations?.map((a) =>
        a instanceof Annotation ? a : Annotation.fromJSON(a)
      ) || [];

    // Validation
    if (!this.filename) {
      throw new Error("Dataset requires a filename");
    }
  }

  /**
   * Generate a unique ID for this dataset
   */
  _generateId() {
    return generateDatasetId();
  }

  /**
   * Infer file type from filename extension
   */
  _inferFileType(filename) {
    if (!filename) return "unknown";
    const ext = filename.split(".").pop().toLowerCase();
    const typeMap = {
      vtp: "vtk-polydata",
      vti: "vtk-imagedata",
      vtu: "vtk-unstructuredgrid",
      stl: "stl",
      obj: "obj",
      ply: "ply",
      csv: "csv",
      json: "json",
    };
    return typeMap[ext] || ext;
  }

  // ==================== ANNOTATION MANAGEMENT ====================
  // These methods manage annotations at the dataset level

  /**
   * Add an annotation to this dataset
   * @param {Annotation} annotation - The annotation to add
   */
  addAnnotation(annotation) {
    if (!(annotation instanceof Annotation)) {
      throw new Error("Must provide an Annotation instance");
    }

    if (annotation.datasetId !== this.id) {
      throw new Error("Annotation datasetId does not match this dataset");
    }

    this.annotations.push(annotation);
    return annotation;
  }

  /**
   * Remove an annotation from this dataset
   * @param {string} annotationId - ID of the annotation to remove
   * @returns {boolean} - Whether the annotation was found and removed
   */
  removeAnnotation(annotationId) {
    const initialLength = this.annotations.length;
    this.annotations = this.annotations.filter((a) => a.id !== annotationId);
    return this.annotations.length < initialLength;
  }

  /**
   * Get an annotation by ID
   * @param {string} annotationId - ID of the annotation
   * @returns {Annotation|null} - The annotation or null if not found
   */
  getAnnotation(annotationId) {
    return this.annotations.find((a) => a.id === annotationId) || null;
  }

  /**
   * Get all annotations (optionally filtered)
   * @param {object} filter - Optional filter specification
   * @param {string} currentUserId - User requesting annotations (for permission checks)
   * @returns {Annotation[]} - Filtered annotations
   */
  getAnnotations(filter = null, currentUserId = null) {
    let filtered = this.annotations;

    // Apply permission filtering if userId provided
    if (currentUserId) {
      filtered = filtered.filter((a) => a.canView(currentUserId));
    }

    // Apply additional filters if provided
    if (filter) {
      filtered = filtered.filter((a) => a.matchesFilter(filter));
    }

    return filtered;
  }

  /**
   * Query annotations by creator
   * This is useful for auditing and filtering by user
   * @param {string} userId - User ID to filter by
   * @returns {Annotation[]} - Annotations created by this user
   */
  getAnnotationsByUser(userId) {
    return this.annotations.filter((a) => a.createdBy === userId);
  }

  /**
   * Query annotations by tag
   * @param {string[]} tags - Tags to filter by (annotation must have at least one)
   * @returns {Annotation[]} - Matching annotations
   */
  getAnnotationsByTags(tags) {
    return this.annotations.filter((a) =>
      tags.some((tag) => a.tags.includes(tag))
    );
  }

  /**
   * Query annotations by date range
   * This is critical for auditing - "show me all annotations made last week"
   * @param {number} startTime - Start timestamp (inclusive)
   * @param {number} endTime - End timestamp (inclusive)
   * @returns {Annotation[]} - Annotations created in this range
   */
  getAnnotationsByDateRange(startTime, endTime) {
    return this.annotations.filter(
      (a) => a.createdAt >= startTime && a.createdAt <= endTime
    );
  }

  /**
   * Get annotation statistics
   * Useful for displaying in UI and for auditing
   * @returns {object} - Statistics about annotations on this dataset
   */
  getAnnotationStats() {
    const stats = {
      total: this.annotations.length,
      byUser: {},
      byType: {},
      byTag: {},
      byVisibility: {
        public: 0,
        private: 0,
        shared: 0,
      },
    };

    this.annotations.forEach((annotation) => {
      // Count by user
      stats.byUser[annotation.createdBy] =
        (stats.byUser[annotation.createdBy] || 0) + 1;

      // Count by type
      stats.byType[annotation.type] = (stats.byType[annotation.type] || 0) + 1;

      // Count by visibility
      stats.byVisibility[annotation.visibility]++;

      // Count by tag
      annotation.tags.forEach((tag) => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    });

    return stats;
  }

  // ==================== METADATA MANAGEMENT ====================

  /**
   * Update dataset metadata
   * This is called after the file is loaded and analyzed
   * @param {object} updates - Metadata fields to update
   */
  updateMetadata(updates) {
    this.metadata = {
      ...this.metadata,
      ...updates,
    };
  }

  /**
   * Check if the dataset has been fully loaded and analyzed
   * @returns {boolean} - Whether spatial metadata is available
   */
  isAnalyzed() {
    return this.metadata.bounds !== null && this.metadata.pointCount !== null;
  }

  // ==================== SERIALIZATION ====================

  /**
   * Serialize for storage
   * Note: The file itself is stored separately in IndexedDB
   * This just stores the metadata and annotations
   * @returns {object} - Serializable representation
   */
  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      metadata: this.metadata,
      annotations: this.annotations.map((a) => a.toJSON()),
      // Note: file is not included - it's stored separately in IndexedDB
    };
  }

  /**
   * Create a Dataset from stored JSON
   * @param {object} json - Serialized dataset data
   * @returns {Dataset} - New Dataset instance
   */
  static fromJSON(json) {
    return new Dataset({
      ...json,
      annotations: json.annotations?.map((a) => Annotation.fromJSON(a)) || [],
    });
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // Create a new dataset when a file is loaded
 * const dataset = new Dataset({
 *   filename: 'skull.vtp',
 *   file: fileObject, // The actual File from user upload
 *   metadata: {
 *     uploadedBy: currentUser.id
 *   }
 * });
 *
 * // After loading and analyzing the file, update metadata
 * dataset.updateMetadata({
 *   bounds: [0, 100, 0, 100, 0, 100],
 *   pointCount: 50000
 * });
 *
 * // User creates an annotation
 * const annotation = new Annotation({
 *   datasetId: dataset.id,
 *   position: [50, 50, 50],
 *   text: 'Area of interest',
 *   type: 'point',
 *   createdBy: currentUser.id,
 *   tags: ['important', 'findings']
 * });
 *
 * // Add it to the dataset
 * dataset.addAnnotation(annotation);
 *
 * // Later, query annotations for auditing
 * const recentAnnotations = dataset.getAnnotationsByDateRange(
 *   Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
 *   Date.now()
 * );
 *
 * // Get annotations visible to a specific user
 * const visibleAnnotations = dataset.getAnnotations(null, currentUser.id);
 *
 * // Get statistics for display
 * const stats = dataset.getAnnotationStats();
 * // { total: 5, byUser: { 'user1': 3, 'user2': 2 }, ... }
 */
