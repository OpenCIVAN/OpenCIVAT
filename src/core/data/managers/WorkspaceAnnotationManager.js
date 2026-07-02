// src/core/data/managers/WorkspaceAnnotationManager.js
// Lightweight conflict-tracking manager for workspace_annotation entities.
//
// Workspace annotations are canvas-grid level annotations (arrows, freehand
// shapes, text overlays, etc.) that are NOT anchored to dataset geometry.
// They live at the workspace/canvas level and are updated infrequently.
//
// This manager:
//   1. Tracks registered workspace annotations by id.
//   2. Wraps updates with base_revision for optimistic concurrency control.
//   3. Detects 409 Conflict responses and surfaces them via cia:sync-conflict.
//   4. Provides conflict resolution methods used by ConflictResolutionDialog.
//
// Dependency direction: Manager → Services → Utils (no React imports)

import { wsa as log } from '@Utils/logger.js';
import { apiClient } from '@Services/apiClient.js';

const LOG_CAT = 'workspaceAnnotation';

class WorkspaceAnnotationManager {
  constructor() {
    // Flat map of id → { ...serverData, revision, hasConflict, conflict }
    this._annotations = new Map();
  }

  // =========================================================================
  // REGISTRATION
  // =========================================================================

  /**
   * Register (or update) a workspace annotation from a server response.
   * Call this whenever a workspace annotation is loaded or received via WS.
   *
   * @param {object} serverObj  Raw server row (snake_case) with `revision` field.
   */
  registerAnnotation(serverObj) {
    if (!serverObj?.id) return;
    const existing = this._annotations.get(serverObj.id);
    if (existing) {
      Object.assign(existing, serverObj);
      existing.revision = serverObj.revision != null ? Number(serverObj.revision) : existing.revision;
    } else {
      this._annotations.set(serverObj.id, {
        ...serverObj,
        revision: serverObj.revision != null ? Number(serverObj.revision) : null,
        hasConflict: false,
        conflict: null,
      });
    }
  }

  /**
   * Retrieve a registered annotation by id (or null).
   * @param {string} id
   */
  getAnnotation(id) {
    return this._annotations.get(id) ?? null;
  }

  // =========================================================================
  // UPDATES
  // =========================================================================

  /**
   * Send a PUT update for a workspace annotation with optimistic concurrency control.
   *
   * @param {string} id       The workspace annotation UUID.
   * @param {object} updates  Fields to update (snake_case, matching server schema).
   * @returns {Promise<object|null>} Updated server object on success, null on conflict.
   */
  async updateWorkspaceAnnotation(id, updates) {
    const annotation = this._annotations.get(id);

    if (annotation?.hasConflict) {
      const cat = log?.[LOG_CAT] || log;
      cat?.warn?.(`WorkspaceAnnotation ${id} has unresolved conflict; skipping update`);
      return null;
    }

    const payload = { ...updates };
    if (annotation?.revision != null) {
      payload.base_revision = annotation.revision;
    }

    try {
      const result = await apiClient.put(`/workspace-annotations/${id}`, payload);
      const serverObj = result?.annotation ?? result;

      if (serverObj?.id) {
        this.registerAnnotation(serverObj);
      } else if (annotation && result?.revision != null) {
        annotation.revision = Number(result.revision);
      }
      return serverObj || null;
    } catch (error) {
      if (error?.status === 409) {
        const details = error?.details || {};
        const conflict = {
          entityType: 'workspace_annotation',
          entityId: id,
          clientBaseRevision: annotation?.revision ?? null,
          serverRevision: details.serverRevision,
          serverObject: details.serverObject,
          updatedBy: details.updatedBy || null,
          updatedAt: details.updatedAt || null,
          clientObject: payload,
        };

        if (annotation) {
          annotation.hasConflict = true;
          annotation.conflict = conflict;
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cia:sync-conflict', { detail: conflict }));
        }

        const cat = log?.[LOG_CAT] || log;
        cat?.warn?.(`Conflict detected on workspace annotation ${id}`);
        return null;
      }
      throw error;
    }
  }

  // =========================================================================
  // DELTA APPLY
  // =========================================================================

  /**
   * Apply one delta event from the sync stream to local workspace annotation state.
   * Called by syncService.applyDeltaEvents.
   *
   * Workspace annotations are stored as plain snake_case objects (server format),
   * so patch operations can be applied directly without format conversion.
   *
   * @param {object} event  sync_events row (payload_type, patch, snapshot)
   * @returns {Promise<boolean>} true = applied, false = failed (stop batch)
   */
  async applyDeltaEvent(event) {
    const id = event.entity_id;
    const cat = log?.[LOG_CAT] || log;

    if (event.operation === 'delete' || event.payload_type === 'tombstone') {
      this._annotations.delete(id);
      return true;
    }

    const existing = this.getAnnotation(id);

    // Idempotency: skip if already at this revision or newer
    if (
      existing?.revision != null &&
      Number(existing.revision) >= Number(event.next_revision)
    ) {
      return true;
    }

    if (event.payload_type === 'patch' && event.patch) {
      if (!existing) {
        cat?.warn?.(`Cannot apply patch for workspace annotation ${id}: not in local state`);
        return false;
      }

      try {
        const { patch: applyPatch } = await import('@Utils/jsonPatch.js');
        // Annotations are already in server (snake_case) format — apply directly
        const patched = applyPatch({ ...existing }, event.patch);
        this.registerAnnotation({ ...patched, revision: Number(event.next_revision) });
        return true;
      } catch (err) {
        cat?.warn?.(`Workspace annotation patch failed for ${id}: ${err.message}`);
        return false;
      }
    }

    if (event.snapshot) {
      this.registerAnnotation(event.snapshot);
      return true;
    }

    cat?.warn?.(`Unrecognized delta event format for workspace annotation ${id}`);
    return false;
  }

  // =========================================================================
  // CONFLICT RESOLUTION
  // =========================================================================

  /**
   * Resolve conflict by adopting the server's current state.
   * @param {string} id
   */
  resolveConflictUseServer(id) {
    const annotation = this._annotations.get(id);
    if (!annotation?.hasConflict) return;

    const serverObj = annotation.conflict?.serverObject;
    if (serverObj) {
      Object.assign(annotation, {
        ...serverObj,
        revision: serverObj.revision != null ? Number(serverObj.revision) : annotation.revision,
      });
    }
    annotation.hasConflict = false;
    annotation.conflict = null;

    const cat = log?.[LOG_CAT] || log;
    cat?.info?.(`Conflict resolved (use server) for workspace annotation ${id}`);
  }

  /**
   * Resolve conflict by force-overwriting the server with the client's state.
   * @param {string} id
   */
  async resolveConflictOverwrite(id) {
    const annotation = this._annotations.get(id);
    if (!annotation?.hasConflict) return;

    const clientObj = annotation.conflict?.clientObject || {};
    annotation.hasConflict = false;
    annotation.conflict = null;

    try {
      const result = await apiClient.put(`/workspace-annotations/${id}`, {
        ...clientObj,
        force_overwrite: true,
      });
      const serverObj = result?.annotation ?? result;
      if (serverObj?.revision != null) {
        annotation.revision = Number(serverObj.revision);
      }
      const cat = log?.[LOG_CAT] || log;
      cat?.info?.(`Conflict resolved (force overwrite) for workspace annotation ${id}`);
    } catch (err) {
      const cat = log?.[LOG_CAT] || log;
      cat?.error?.(`Force overwrite failed for workspace annotation ${id}:`, err);
    }
  }
}

// Module-level singleton (mirrors the viewGroupManager pattern)
export const workspaceAnnotationManager = new WorkspaceAnnotationManager();

export default WorkspaceAnnotationManager;
