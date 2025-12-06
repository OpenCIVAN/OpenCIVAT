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
  // Replace the createAnnotation method in src/core/data/managers/AnnotationManager.js
  //
  // NOTE: DatasetManager.addAnnotation() already has the correct server implementation.
  // AnnotationManager should delegate to it rather than duplicate the logic.

  /**
   * Create a new annotation on a dataset
   *
   * Delegates to DatasetManager which has the correct server API integration.
   *
   * @param {string} datasetId - Dataset to annotate
   * @param {object} config - Annotation configuration
   * @param {array} config.position - [x, y, z] in dataset coordinates
   * @param {string} config.text - Annotation text
   * @param {string} config.type - Annotation type (point, line, region, etc.)
   * @param {array} config.tags - Optional tags for categorization
   * @param {string} config.visibility - 'public' or 'private'
   * @param {object} options - { projectId }
   * @returns {Promise<Annotation>} - The created annotation
   */
  async createAnnotation(datasetId, annotationConfig, options = {}) {
    // Delegate to DatasetManager which has correct server API integration
    const annotation = await this._datasetManager.addAnnotation(
      datasetId,
      annotationConfig,
      getUserId(),
      options
    );

    // DatasetManager already emits 'annotationAdded', but we also emit our own
    // for any listeners subscribed directly to AnnotationManager
    this._emit("annotationAdded", { datasetId, annotation });

    log.debug(`Annotation created via DatasetManager: ${annotation.id}`);
    return annotation;
  }

  /**
   * Update an annotation
   *
   * @param {string} datasetId - Dataset ID
   * @param {string} annotationId - Annotation ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<Annotation>}
   */
  async updateAnnotation(datasetId, annotationId, updates) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    try {
      const result = await apiClient.put(
        `/annotations/${annotationId}`,
        updates
      );

      // Update local copy
      Object.assign(annotation, updates);
      annotation.updatedAt = new Date().toISOString();

      this._emit("annotationUpdated", { datasetId, annotation });
      log.debug(`Annotation ${annotationId} updated`);

      return annotation;
    } catch (error) {
      log.error("Failed to update annotation:", error);
      throw error;
    }
  }

  /**
   * Delete an annotation
   *
   * @param {string} datasetId - Dataset ID
   * @param {string} annotationId - Annotation ID
   * @returns {Promise<void>}
   */
  async deleteAnnotation(datasetId, annotationId) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    try {
      await apiClient.delete(`/annotations/${annotationId}`);

      dataset.removeAnnotation(annotationId);
      this._emit("annotationRemoved", { datasetId, annotationId });
      log.debug(`Annotation ${annotationId} deleted`);
    } catch (error) {
      log.error("Failed to delete annotation:", error);
      throw error;
    }
  }

  /**
   * Fetch annotations from server for a dataset
   *
   * @param {string} datasetId - Dataset ID
   * @param {object} options - Filter options
   * @returns {Promise<Annotation[]>}
   */
  async fetchAnnotationsForDataset(datasetId, options = {}) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    try {
      const params = new URLSearchParams({
        fileId: datasetId,
        ...options,
      });

      const result = await apiClient.get(`/annotations?${params}`);

      // Sync with local dataset
      const annotations = (result.annotations || []).map((data) =>
        Annotation.fromJSON(data)
      );

      // Replace dataset's annotations with server data
      dataset.annotations = annotations;

      log.info(
        `Fetched ${annotations.length} annotations for dataset ${datasetId}`
      );
      return annotations;
    } catch (error) {
      log.error("Failed to fetch annotations:", error);
      throw error;
    }
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
