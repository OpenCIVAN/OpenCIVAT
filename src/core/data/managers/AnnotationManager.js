// src/core/data/managers/AnnotationManager.js

import { Annotation } from "@Core/data/models/Annotation.js";
import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";

/**
 * AnnotationManager - Unified annotation system for the three-layer architecture
 *
 * This replaces the old src/collaboration/annotations/annotationSystem.js
 * and properly integrates annotations with Dataset objects.
 *
 * ARCHITECTURE INTEGRATION:
 * - Annotations belong to Datasets (Layer 1), not views or instances
 * - This manager syncs annotations via Y.js for collaboration
 * - DatasetManager owns the annotations, this manager just provides the interface
 * - ViewConfigurations filter which annotations to display
 * - Instance handlers render the filtered annotations
 *
 * Y.js STRUCTURE:
 * yAnnotations = {
 *   datasetId1: [annotation1, annotation2, ...],
 *   datasetId2: [annotation3, annotation4, ...],
 * }
 */

export class AnnotationManager {
  constructor(datasetManager) {
    // Reference to DatasetManager (owns the annotations)
    this._datasetManager = datasetManager;

    // Y.js map for syncing annotations
    // Structure: datasetId -> Array of annotation data
    this._yAnnotations = ydoc.getMap("annotations");

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
   * Sets up Y.js observation for collaboration
   */
  initialize() {
    console.log("📍 AnnotationManager: Initializing...");

    // Set up Y.js observer for remote annotation changes
    this._setupYjsObserver();

    console.log("✅ AnnotationManager initialized");
  }

  /**
   * Set up Y.js observer to sync remote annotation changes
   */
  _setupYjsObserver() {
    this._yAnnotations.observe((event) => {
      event.changes.keys.forEach((change, datasetId) => {
        if (change.action === "add" || change.action === "update") {
          const remoteAnnotations = this._yAnnotations.get(datasetId);
          if (!remoteAnnotations) return;

          console.log(
            `📥 Remote annotations received for dataset: ${datasetId}`
          );
          console.log(`   Count: ${remoteAnnotations.length}`);

          // Update the dataset's annotations
          this._syncAnnotationsToDataset(datasetId, remoteAnnotations);
        } else if (change.action === "delete") {
          console.log(`🗑️ All annotations deleted for dataset: ${datasetId}`);
          // Clear annotations for this dataset
          const dataset = this._datasetManager.getDataset(datasetId);
          if (dataset) {
            dataset.annotations = [];
          }
        }
      });
    });
  }

  /**
   * Sync remote annotations to the local dataset
   */
  _syncAnnotationsToDataset(datasetId, annotationDataArray) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      console.warn(`Dataset ${datasetId} not found, cannot sync annotations`);
      return;
    }

    // Convert annotation data to Annotation objects
    const annotations = annotationDataArray.map((data) =>
      Annotation.fromJSON(data)
    );

    // Replace dataset's annotations with synced version
    dataset.annotations = annotations;

    // Emit event for each annotation
    annotations.forEach((annotation) => {
      this._emit("annotationAdded", { datasetId, annotation });
    });
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
   * @returns {Annotation} - The created annotation
   */
  createAnnotation(datasetId, config) {
    // Get the dataset
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Create annotation
    const annotation = new Annotation({
      ...config,
      datasetId,
      createdBy: getUserId(),
    });

    // Add to dataset
    dataset.addAnnotation(annotation);

    // Sync to Y.js for collaboration
    this._syncDatasetAnnotationsToYjs(datasetId);

    // Emit event
    this._emit("annotationAdded", { datasetId, annotation });

    console.log(
      `✅ Annotation created: ${annotation.id} on dataset ${datasetId}`
    );

    return annotation;
  }

  /**
   * Update an annotation
   *
   * @param {string} datasetId - Dataset containing the annotation
   * @param {string} annotationId - Annotation ID
   * @param {object} updates - Fields to update
   */
  updateAnnotation(datasetId, annotationId, updates) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      console.warn(`Dataset ${datasetId} not found`);
      return;
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      console.warn(`Annotation ${annotationId} not found`);
      return;
    }

    // Check permission
    if (!annotation.canEdit(getUserId())) {
      console.warn("Cannot edit annotation created by another user");
      return;
    }

    // Update annotation
    annotation.update(updates, getUserId());

    // Sync to Y.js
    this._syncDatasetAnnotationsToYjs(datasetId);

    // Emit event
    this._emit("annotationUpdated", { datasetId, annotation });

    console.log(`✅ Annotation updated: ${annotationId}`);
  }

  /**
   * Delete an annotation
   *
   * @param {string} datasetId - Dataset containing the annotation
   * @param {string} annotationId - Annotation ID
   */
  deleteAnnotation(datasetId, annotationId) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) {
      console.warn(`Dataset ${datasetId} not found`);
      return;
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      console.warn(`Annotation ${annotationId} not found`);
      return;
    }

    // Check permission
    if (!annotation.canEdit(getUserId())) {
      console.warn("Cannot delete annotation created by another user");
      return;
    }

    // Remove from dataset
    dataset.removeAnnotation(annotationId);

    // Sync to Y.js
    this._syncDatasetAnnotationsToYjs(datasetId);

    // Emit event
    this._emit("annotationRemoved", { datasetId, annotationId });

    console.log(`🗑️ Annotation deleted: ${annotationId}`);
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

  // ==================== SYNCHRONIZATION ====================

  /**
   * Sync a dataset's annotations to Y.js for collaboration
   *
   * @param {string} datasetId - Dataset ID
   */
  _syncDatasetAnnotationsToYjs(datasetId) {
    const dataset = this._datasetManager.getDataset(datasetId);
    if (!dataset) return;

    // Serialize all annotations
    const annotationData = dataset.annotations.map((a) => a.toJSON());

    // Sync to Y.js
    this._yAnnotations.set(datasetId, annotationData);
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
          console.error(`Error in ${event} listener:`, error);
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
