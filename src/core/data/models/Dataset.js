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

// src/core/data/models/Dataset.js

export class Dataset {
  constructor(config = {}) {
    this.id = config.id;
    this.filename = config.filename;
    this.name = config.name || config.filename;
    this.fileType = config.fileType;
    this.hash = config.hash;
    this.publicPath = config.publicPath;
    this.storageKey = config.storageKey;
    this.userId = config.userId;

    this.metadata = config.metadata || {
      fileSize: 0,
      uploadedAt: Date.now(),
      uploadedBy: config.userId,
    };

    // Runtime properties that are NOT persisted
    this.rawFile = config.rawFile || null;
    this.parsedDataCache = config.parsedDataCache || {};
    this.quickMetadata = config.quickMetadata || null;

    this.annotations = config.annotations || [];
  }

  /**
   * Convert this Dataset to a plain object for storage
   * This is called when saving to IndexedDB
   */
  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      name: this.name,
      fileType: this.fileType,
      hash: this.hash,
      publicPath: this.publicPath,
      storageKey: this.storageKey,
      userId: this.userId,
      metadata: this.metadata,
      annotations: this.annotations,
    };
  }

  /**
   * Create a Dataset instance from stored data
   * This is called when loading from IndexedDB
   */
  static fromJSON(json) {
    return new Dataset({
      id: json.id,
      filename: json.filename,
      name: json.name,
      fileType: json.fileType,
      hash: json.hash,
      publicPath: json.publicPath,
      storageKey: json.storageKey,
      userId: json.userId,
      metadata: json.metadata,
      annotations: json.annotations,
    });
  }

  /**
   * Check if this dataset has been analyzed
   * A dataset is "analyzed" if it has spatial metadata like point count and bounds
   */
  isAnalyzed() {
    return !!(
      this.metadata?.pointCount ||
      this.metadata?.bounds ||
      this.quickMetadata?.pointCount
    );
  }

  /**
   * Update dataset metadata
   */
  updateMetadata(updates) {
    this.metadata = { ...this.metadata, ...updates };
  }

  /**
   * Add an annotation to this dataset
   */
  addAnnotation(annotation) {
    this.annotations.push(annotation);
  }

  /**
   * Remove an annotation from this dataset
   */
  removeAnnotation(annotationId) {
    const index = this.annotations.findIndex((a) => a.id === annotationId);
    if (index !== -1) {
      this.annotations.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get an annotation by ID
   */
  getAnnotation(annotationId) {
    return this.annotations.find((a) => a.id === annotationId);
  }

  /**
   * Get all annotations (optionally filtered)
   */
  getAnnotations(filter = null, userId = null) {
    let results = this.annotations;

    if (filter) {
      // Apply filter logic here
      // For now, just return all
    }

    return results;
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
