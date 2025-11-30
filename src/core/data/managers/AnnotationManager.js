// src/core/data/managers/AnnotationManager.js
//
// v2.0: Server-authoritative - annotations sync via REST API + WebSocket
// Y.js sync removed. Real-time updates come via serverSync.js broadcasts.

import { Annotation } from "@Core/data/models/Annotation.js";
import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { config } from "@Core/config/clientConfig.js";
import { annotation as log } from "@Utils/logger.js";

/**
 * AnnotationManager - Unified annotation system for the three-layer architecture
 *
 * ARCHITECTURE INTEGRATION:
 * - Annotations belong to Datasets (Layer 1), not views or instances
 * - Server is the source of truth for annotations
 * - Real-time sync via WebSocket broadcasts (serverSync.js)
 * - DatasetManager owns the annotations, this manager provides the interface
 * - ViewConfigurations filter which annotations to display
 * - Instance handlers render the filtered annotations
 */

export class AnnotationManager {
  constructor(datasetManager) {
    // Reference to DatasetManager (owns the annotations)
    this._datasetManager = datasetManager;

    // Server API configuration
    this._apiBaseUrl = config.apiBaseUrl;

    // Event listeners
    this._listeners = {
      annotationAdded: [],
      annotationRemoved: [],
      annotationUpdated: [],
    };
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the annotation manager
   */
  initialize() {
    log.debug("AnnotationManager initializing...");
    log.info("AnnotationManager initialized (server-authoritative mode)");
  }

  /**
   * Handle server broadcast for annotation events
   * Called by serverSync.js when annotation events are received
   */
  handleServerBroadcast(eventType, msg) {
    switch (eventType) {
      case "annotation:created":
        this._handleRemoteAnnotationCreated(msg);
        break;
      case "annotation:updated":
        this._handleRemoteAnnotationUpdated(msg);
        break;
      case "annotation:deleted":
        this._handleRemoteAnnotationDeleted(msg);
        break;
    }
  }

  _handleRemoteAnnotationCreated(msg) {
    const { fileId, annotation: annotationData } = msg;
    const dataset = this._datasetManager.getDataset(fileId);
    if (!dataset) {
      log.debug(`Dataset ${fileId} not found for remote annotation`);
      return;
    }

    const annotation = Annotation.fromJSON(annotationData);
    dataset.addAnnotation(annotation);
    this._emit("annotationAdded", { datasetId: fileId, annotation });
    log.debug(`Remote annotation added: ${annotation.id}`);
  }

  _handleRemoteAnnotationUpdated(msg) {
    const { annotation: annotationData } = msg;
    const dataset = this._datasetManager.getDataset(annotationData.fileId);
    if (!dataset) return;

    const annotation = dataset.getAnnotation(annotationData.id);
    if (annotation) {
      Object.assign(annotation, annotationData);
      this._emit("annotationUpdated", {
        datasetId: annotationData.fileId,
        annotation,
      });
    }
  }

  _handleRemoteAnnotationDeleted(msg) {
    const { annotationId, fileId } = msg;
    const dataset = this._datasetManager.getDataset(fileId);
    if (!dataset) return;

    dataset.removeAnnotation(annotationId);
    this._emit("annotationRemoved", { datasetId: fileId, annotationId });
  }

  // ==================== ANNOTATION LIFECYCLE ====================

  /**
   * Create a new annotation on a dataset
   *
   * @param {string} datasetId - Dataset to annotate
   * @param {object} config - Annotation configuration
   * @param {array} config.position - [x, y, z] in dataset coordinates
   * @param {string} config.text - Annotation text
   * @param {string} config.type - Annotation type (point, line, region, etc.)
   * @param {array} config.tags - Optional tags for categorization
   * @returns {Promise<Annotation>} - The created annotation
   */
  async createAnnotation(datasetId, annotationConfig) {
    // Get the dataset
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Create annotation locally first
    const annotation = new Annotation({
      ...annotationConfig,
      datasetId,
      createdBy: getUserId(),
    });

    // Send to server
    try {
      const response = await fetch(
        `${this._apiBaseUrl}/files/${datasetId}/annotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(annotation.toJSON()),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const serverData = await response.json();
      // Update with server-assigned ID if different
      if (serverData.annotation?.id) {
        annotation.id = serverData.annotation.id;
      }
    } catch (error) {
      log.error("Failed to save annotation to server:", error);
      // Continue with local-only annotation for now
    }

    // Add to dataset
    dataset.addAnnotation(annotation);

    // Emit event
    this._emit("annotationAdded", { datasetId, annotation });

    log.debug(`Annotation created: ${annotation.id} on dataset ${datasetId}`);

    return annotation;
  }

  /**
   * Update an annotation
   *
   * @param {string} datasetId - Dataset containing the annotation
   * @param {string} annotationId - Annotation ID
   * @param {object} updates - Fields to update
   */
  async updateAnnotation(datasetId, annotationId, updates) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      log.warn(`Dataset ${datasetId} not found`);
      return;
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      log.warn(`Annotation ${annotationId} not found`);
      return;
    }

    // Check permission
    if (!annotation.canEdit(getUserId())) {
      log.warn("Cannot edit annotation created by another user");
      return;
    }

    // Update annotation locally
    annotation.update(updates, getUserId());

    // Send to server
    try {
      await fetch(
        `${this._apiBaseUrl}/files/${datasetId}/annotations/${annotationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
    } catch (error) {
      log.error("Failed to update annotation on server:", error);
    }

    // Emit event
    this._emit("annotationUpdated", { datasetId, annotation });

    log.debug(`Annotation updated: ${annotationId}`);
  }

  /**
   * Delete an annotation
   *
   * @param {string} datasetId - Dataset containing the annotation
   * @param {string} annotationId - Annotation ID
   */
  async deleteAnnotation(datasetId, annotationId) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      log.warn(`Dataset ${datasetId} not found`);
      return;
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      log.warn(`Annotation ${annotationId} not found`);
      return;
    }

    // Check permission
    if (!annotation.canEdit(getUserId())) {
      log.warn("Cannot delete annotation created by another user");
      return;
    }

    // Remove from dataset
    dataset.removeAnnotation(annotationId);

    // Delete on server
    try {
      await fetch(
        `${this._apiBaseUrl}/files/${datasetId}/annotations/${annotationId}`,
        { method: "DELETE" }
      );
    } catch (error) {
      log.error("Failed to delete annotation on server:", error);
    }

    // Emit event
    this._emit("annotationRemoved", { datasetId, annotationId });

    log.debug(`Annotation deleted: ${annotationId}`);
  }

  /**
   * Get all annotations for a dataset
   * Optionally filtered for a specific user
   *
   * @param {string} datasetId - Dataset ID
   * @param {object} filter - Optional filter (userIds, tags, types, etc.)
   * @returns {Annotation[]}
   */
  getAnnotations(datasetId, filter = null) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) return [];

    return dataset.getAnnotations(filter, getUserId());
  }

  /**
   * Get annotations filtered for a view configuration
   *
   * @param {string} datasetId - Dataset ID
   * @param {AnnotationDisplayConfig} displayConfig - View's display config
   * @returns {Annotation[]}
   */
  getAnnotationsForView(datasetId, displayConfig) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) return [];

    return displayConfig.filterAnnotations(dataset.annotations, getUserId());
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Subscribe to annotation changes
   */
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
  }

  /**
   * Unsubscribe from annotation changes
   */
  off(event, callback) {
    if (this._listeners[event]) {
      const index = this._listeners[event].indexOf(callback);
      if (index > -1) {
        this._listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          log.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Cleanup when shutting down
   */
  destroy() {
    this._listeners = {
      annotationAdded: [],
      annotationRemoved: [],
      annotationUpdated: [],
    };
  }
}

// Export singleton instance (will be initialized in appInitializer)
export let annotationManager = null;

/**
 * Initialize the annotation manager
 * Called from appInitializer.js after DatasetManager is ready
 */
export function initializeAnnotationManager(datasetManager) {
  annotationManager = new AnnotationManager(datasetManager);
  annotationManager.initialize();
  return annotationManager;
}
