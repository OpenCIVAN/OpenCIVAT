// src/core/data/models/Dataset.js

import { Annotation } from "@Core/data/models/Annotation.js";
import { generateDatasetId } from "@Utils/idGenerator.js";

/**
 * Dataset - Represents a raw data file with associated metadata and annotations
 *
 * A Dataset is Layer 1 of our architecture - it's the raw data plus
 * knowledge annotations that are facts about the data itself.
 *
 * The Dataset tracks both metadata (always present) and file availability
 * (which can change based on cache state, fetching, etc).
 */
export class Dataset {
  constructor(config = {}) {
    // Local ID (for Y.js key, temporary operations)
    this.id = config.id;

    // Server ID (for downloads, persistence, sharing)
    // This is the UUID from the database
    this.serverId = config.serverId || null;
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

    // Track file availability status
    // This is runtime state that helps UI show appropriate actions
    this.fileStatus = config.fileStatus || this._determineInitialFileStatus();

    this.annotations = config.annotations || [];
  }

  /**
   * Determine initial file status based on available information
   *
   * This is called during construction to set a smart default.
   * The status will be updated as we attempt to load files.
   *
   * Possible statuses:
   * - 'available': We have the file in memory right now
   * - 'fetchable': We don't have it but can get it from publicPath
   * - 'needs-upload': We don't have it and can't fetch it automatically
   * - 'fetching': Currently fetching from publicPath
   * - 'fetch-failed': Tried to fetch but it failed
   *
   * @private
   */
  _determineInitialFileStatus() {
    // If we have the file in memory, it's definitely available
    if (this.rawFile) {
      return "available";
    }

    // If we have a public path, we can fetch it when needed
    if (this.publicPath) {
      return "fetchable";
    }

    // Otherwise, we need the user to provide it
    return "needs-upload";
  }

  /**
   * Check if we currently have the file data in memory
   *
   * This is a quick check that doesn't hit IndexedDB or make network requests.
   * It just looks at what's in memory right now.
   *
   * @returns {boolean} True if file is available in memory
   */
  hasFile() {
    return this.fileStatus === "available" && this.rawFile !== null;
  }

  /**
   * Check if we can automatically fetch the file
   *
   * Returns true if this dataset has a publicPath we can fetch from.
   * Used by UI to show "re-fetch" vs "re-upload" options.
   *
   * @returns {boolean} True if we can fetch automatically
   */
  canAutoFetch() {
    return !!this.publicPath;
  }

  /**
   * Update file status
   *
   * Call this when file status changes during operations like:
   * - Loading from cache (becomes 'available')
   * - Starting a fetch (becomes 'fetching')
   * - Fetch completes (becomes 'available')
   * - Fetch fails (becomes 'fetch-failed')
   * - User needs to upload (becomes 'needs-upload')
   *
   * @param {string} status - New status
   * @param {File|null} file - Optional file reference to store
   */
  setFileStatus(status, file = null) {
    this.fileStatus = status;

    if (file) {
      this.rawFile = file;
    }

    // Log status changes for debugging
    // This helps track the file lifecycle in console
    console.log(`📁 Dataset ${this.filename} status: ${status}`);
  }

  /**
   * Convert this Dataset to a plain object for storage
   * This is called when saving to IndexedDB
   */
  toJSON() {
    return {
      id: this.id,
      serverId: this.serverId,
      filename: this.filename,
      name: this.name,
      fileType: this.fileType,
      hash: this.hash,
      publicPath: this.publicPath,
      storageKey: this.storageKey,
      userId: this.userId,
      metadata: this.metadata,
      annotations: this.annotations,
      // Note: fileStatus, rawFile, parsedDataCache are NOT persisted
      // They are runtime state that gets recreated on load
    };
  }

  /**
   * Create a Dataset instance from stored data
   *
   * This handles data migration by deriving missing properties from
   * available information. This makes the system resilient to schema
   * changes over time.
   *
   * @param {Object} json - Stored dataset data
   * @returns {Dataset} Reconstructed dataset instance
   */
  static fromJSON(json) {
    // CRITICAL: Handle missing fileType for backward compatibility
    // Old datasets might not have fileType stored, so derive it from filename
    let fileType = json.fileType;

    if (!fileType && json.filename) {
      // Extract file extension from filename
      const parts = json.filename.split(".");
      if (parts.length > 1) {
        fileType = parts[parts.length - 1].toLowerCase();
        console.log(
          `📋 Derived fileType "${fileType}" from filename: ${json.filename}`
        );
      }
    }

    // If still no fileType, this is a serious problem
    if (!fileType) {
      console.error(`❌ Cannot determine fileType for dataset ${json.id}`);
      console.error(`   Filename: ${json.filename}`);
      console.error(
        `   This dataset may be corrupted or from a very old version`
      );
      // Set a fallback so the dataset can at least load
      fileType = "unknown";
    }

    return new Dataset({
      id: json.id,
      filename: json.filename,
      name: json.name,
      fileType: fileType, // Now guaranteed to have a value
      hash: json.hash,
      publicPath: json.publicPath,
      storageKey: json.storageKey,
      userId: json.userId,
      metadata: json.metadata,
      annotations: json.annotations,
      // fileStatus will be determined by _determineInitialFileStatus()
      // based on whether publicPath exists
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
