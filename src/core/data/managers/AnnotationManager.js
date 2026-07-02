// src/core/data/managers/AnnotationManager.js
//
// v2.0: Server-authoritative - annotations sync via REST API + WebSocket
// Y.js sync removed. Real-time updates come via serverSync.js broadcasts.
//
// MIGRATED: Now extends BaseManager for standardized event handling

import { Annotation } from "@Core/data/models/Annotation.js";
import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { config } from "@Core/config/clientConfig.js";
import { annotation as log } from "@Utils/logger.js";
import { apiClient } from "@Services/apiClient.js";
import { BaseManager } from "@Core/data/managers/BaseManager.js";

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
export class AnnotationManager extends BaseManager {
  constructor(datasetManager) {
    super({
      events: ["annotationAdded", "annotationRemoved", "annotationUpdated"],
      logCategory: "annotation",
    });

    // Reference to DatasetManager (owns the annotations)
    this._datasetManager = datasetManager;

    // Server API configuration
    this._apiBaseUrl = config.apiBaseUrl;
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the annotation manager
   */
  initialize() {
    this._log.debug("Initializing...");
    this._log.info("Initialized (server-authoritative mode)");
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
      this._log.debug(`Dataset ${fileId} not found for remote annotation`);
      return;
    }

    const annotation = Annotation.fromJSON(annotationData);
    dataset.addAnnotation(annotation);
    this._emit("annotationAdded", { datasetId: fileId, annotation });
    this._log.debug(`Remote annotation added: ${annotation.id}`);
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
    const annotation = await this._datasetManager.addAnnotation(
      datasetId,
      annotationConfig,
      getUserId(),
      options
    );

    // DatasetManager already emits 'annotationAdded', but we also emit our own
    // for any listeners subscribed directly to AnnotationManager
    this._emit("annotationAdded", { datasetId, annotation });

    this._log.debug(`Annotation created via DatasetManager: ${annotation.id}`);
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

    // Skip sync while conflict is unresolved
    if (annotation.hasConflict) {
      this._log.warn(`Annotation ${annotationId} has unresolved conflict; skipping update sync`);
      return annotation;
    }

    // Build payload, including base_revision for optimistic concurrency control
    const payload = { ...updates };
    if (annotation.revision != null) {
      payload.base_revision = annotation.revision;
    }

    try {
      const result = await apiClient.put(`/annotations/${annotationId}`, payload);

      // Accept new revision from server response
      const newRevision = result?.annotation?.revision ?? result?.revision;
      if (newRevision != null) {
        annotation.revision = Number(newRevision);
      }

      // Update local copy
      Object.assign(annotation, updates);
      this._emit("annotationUpdated", { datasetId, annotation });

      this._log.debug(`Annotation updated: ${annotationId}`);
      return annotation;
    } catch (error) {
      if (error?.status === 409) {
        // Stale write — another user changed this annotation; surface conflict
        const details = error?.details || {};
        annotation.hasConflict = true;
        annotation.conflict = {
          entityType: "annotation",
          entityId: annotationId,
          clientBaseRevision: annotation.revision,
          serverRevision: details.serverRevision,
          serverObject: details.serverObject,
          updatedBy: details.updatedBy || null,
          updatedAt: details.updatedAt || null,
          clientObject: { ...annotation, ...updates },
        };
        this._emit("conflictDetected", annotation.conflict);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cia:sync-conflict", { detail: annotation.conflict })
          );
        }
        this._log.warn(`Conflict detected on annotation ${annotationId}`);
        return annotation; // return current state; user must resolve
      }
      this._log.error(`Failed to update annotation ${annotationId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve a conflict by adopting the server's current annotation state.
   * @param {string} annotationId
   */
  resolveConflictUseServer(annotationId) {
    // Find the annotation across all datasets
    const { annotation, dataset } = this._findAnnotation(annotationId);
    if (!annotation?.hasConflict) return;

    const serverObj = annotation.conflict?.serverObject;
    if (serverObj) {
      // Adopt server state, including the server's revision
      Object.assign(annotation, {
        text: serverObj.text,
        content: serverObj.content,
        position: serverObj.position,
        normal: serverObj.normal,
        visibility: serverObj.visibility,
        metadata: serverObj.metadata,
        type: serverObj.type,
        revision: serverObj.revision != null ? Number(serverObj.revision) : annotation.revision,
      });
    }
    annotation.hasConflict = false;
    annotation.conflict = null;

    if (dataset) {
      this._emit("annotationUpdated", { datasetId: dataset.id, annotation });
    }
    this._log.info(`Conflict resolved (use server) for annotation ${annotationId}`);
  }

  /**
   * Resolve a conflict by force-overwriting with the client's pending changes.
   * @param {string} annotationId
   */
  async resolveConflictOverwrite(annotationId) {
    const { annotation, dataset } = this._findAnnotation(annotationId);
    if (!annotation?.hasConflict) return;

    const clientObj = annotation.conflict?.clientObject || {};
    annotation.hasConflict = false;
    annotation.conflict = null;

    try {
      const result = await apiClient.put(`/annotations/${annotationId}`, {
        ...clientObj,
        force_overwrite: true,
      });
      const newRevision = result?.annotation?.revision ?? result?.revision;
      if (newRevision != null) annotation.revision = Number(newRevision);
      this._log.info(`Conflict resolved (force overwrite) for annotation ${annotationId}`);
    } catch (err) {
      this._log.error(`Force overwrite failed for annotation ${annotationId}:`, err);
    }

    if (dataset) {
      this._emit("annotationUpdated", { datasetId: dataset.id, annotation });
    }
  }

  /**
   * Apply one delta event from the sync stream to local annotation state.
   * Called by syncService.applyDeltaEvents.
   *
   * @param {object} event  sync_events row (with payload_type, patch, snapshot)
   * @returns {Promise<boolean>} true = applied (advance watermark), false = failed (stop batch)
   */
  async applyDeltaEvent(event) {
    const annotationId = event.entity_id;

    // Tombstone: remove from local state
    if (event.operation === "delete" || event.payload_type === "tombstone") {
      const { annotation, dataset } = this._findAnnotation(annotationId);
      if (annotation && dataset) {
        dataset.removeAnnotation(annotationId);
        this._emit("annotationRemoved", { datasetId: dataset.id, annotationId });
      }
      return true;
    }

    const { annotation, dataset } = this._findAnnotation(annotationId);

    // Idempotency: skip if already at this revision or newer
    if (
      annotation?.revision != null &&
      Number(annotation.revision) >= Number(event.next_revision)
    ) {
      return true;
    }

    if (event.payload_type === "patch" && event.patch) {
      if (!annotation || !dataset) {
        this._log.warn(
          `Cannot apply annotation patch ${annotationId}: not in local state`
        );
        return false;
      }

      try {
        const { patch: applyPatch } = await import("@Utils/jsonPatch.js");
        const currentAsServer = _annotationToServerFormat(annotation, dataset.id);
        const patched = applyPatch(currentAsServer, event.patch);
        _applyServerFormatToAnnotation(annotation, patched);
        annotation.revision = Number(event.next_revision);
        this._emit("annotationUpdated", { datasetId: dataset.id, annotation });
        return true;
      } catch (err) {
        this._log.warn(
          `Annotation patch failed for ${annotationId}: ${err.message}`
        );
        return false;
      }
    }

    // Snapshot: route through existing handleServerBroadcast path.
    // _handleRemoteAnnotationUpdated expects annotationData.fileId (not dataset_id).
    if (event.snapshot) {
      const snap = event.snapshot;
      this.handleServerBroadcast("annotation:updated", {
        annotation: { ...snap, fileId: snap.dataset_id },
      });
      return true;
    }

    this._log.warn(`Unrecognized delta event format for annotation ${annotationId}`);
    return false;
  }

  /**
   * Find an annotation by id across all loaded datasets.
   * @private
   */
  _findAnnotation(annotationId) {
    if (!this._datasetManager) return { annotation: null, dataset: null };
    const datasets = this._datasetManager.getAllDatasets?.() || [];
    for (const dataset of datasets) {
      const annotation = dataset.getAnnotation?.(annotationId);
      if (annotation) return { annotation, dataset };
    }
    return { annotation: null, dataset: null };
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

      this._log.debug(`Annotation deleted: ${annotationId}`);
    } catch (error) {
      this._log.error(`Failed to delete annotation ${annotationId}:`, error);
      throw error;
    }
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get all annotations for a dataset
   *
   * @param {string} datasetId - Dataset ID
   * @param {object} filter - Optional filter (e.g., { type: 'point' })
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

  // ==================== CLEANUP ====================
  // NOTE: dispose() is inherited from BaseManager - no need to override
  // unless we have AnnotationManager-specific cleanup
}

// ============================================================================
// FORMAT HELPERS (module-level — no `this` dependency)
// ============================================================================

/**
 * Convert a camelCase Annotation model to the snake_case format used by the
 * server's DB rows and sync_events patches.
 */
function _annotationToServerFormat(annotation, datasetId) {
  return {
    id: annotation.id,
    dataset_id: datasetId,
    position: annotation.position,
    normal: annotation.normal,
    text: annotation.text,
    type: annotation.type,
    created_by: annotation.createdBy,
    created_at: annotation.createdAt,
    modified_by: annotation.modifiedBy,
    modified_at: annotation.modifiedAt,
    tags: annotation.tags,
    visibility: annotation.visibility,
    shared_with: annotation.sharedWith,
    metadata: annotation.metadata,
    ownership: annotation.ownership,
    group_id: annotation.groupId,
    group_name: annotation.groupName,
    contributors: annotation.contributors,
    creation_context: annotation.creationContext,
    revision: annotation.revision,
  };
}

/**
 * Merge patched snake_case fields back into a camelCase Annotation model.
 * Only updates fields that are present in serverFmt (patch is sparse).
 */
function _applyServerFormatToAnnotation(annotation, serverFmt) {
  if (serverFmt.text !== undefined) annotation.text = serverFmt.text;
  if (serverFmt.position !== undefined) annotation.position = serverFmt.position;
  if (serverFmt.normal !== undefined) annotation.normal = serverFmt.normal;
  if (serverFmt.type !== undefined) annotation.type = serverFmt.type;
  if (serverFmt.visibility !== undefined) annotation.visibility = serverFmt.visibility;
  if (serverFmt.tags !== undefined) annotation.tags = serverFmt.tags;
  if (serverFmt.shared_with !== undefined) annotation.sharedWith = serverFmt.shared_with;
  if (serverFmt.metadata !== undefined) annotation.metadata = serverFmt.metadata;
  if (serverFmt.ownership !== undefined) annotation.ownership = serverFmt.ownership;
  if (serverFmt.group_id !== undefined) annotation.groupId = serverFmt.group_id;
  if (serverFmt.group_name !== undefined) annotation.groupName = serverFmt.group_name;
  if (serverFmt.contributors !== undefined) annotation.contributors = serverFmt.contributors;
  if (serverFmt.creation_context !== undefined)
    annotation.creationContext = serverFmt.creation_context;
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
