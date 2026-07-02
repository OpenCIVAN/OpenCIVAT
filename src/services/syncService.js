// src/services/syncService.js
// Handles client-server state reconciliation and delta hydration

import clientConfig from "@Core/config/clientConfig.js";
import { sync as log } from "@Utils/logger.js";
import { apiClient } from "@Services/apiClient.js";

// localStorage keys
const SYNC_STATE_KEY = "cia_sync_state";

/**
 * Build the localStorage key for a sync watermark.
 * Scoped by both userId and workspaceId to prevent cross-user reuse on a
 * shared browser.  When userId is null the key still differs from the old
 * unscoped format (double-underscore prefix) so stale pre-hardening
 * watermarks are not accidentally reused.
 *
 * Format: cia_sync_watermark_<userId>_<workspaceId>
 *   or    cia_sync_watermark__<workspaceId>   (when userId unknown)
 */
function watermarkKey(workspaceId, userId = null) {
  const uid = userId || "";
  return `cia_sync_watermark_${uid}_${workspaceId}`;
}

// Divergence thresholds
const THRESHOLDS = {
  SILENT: 5, // 0-5 orphans: silent cleanup
  MODERATE: 20, // 6-20 orphans: toast notification
  // 20+ or version mismatch: major divergence
};

/**
 * Divergence levels for UI decisions
 */
export const DivergenceLevel = {
  NONE: "none",
  MINOR: "minor", // 1-5 orphans, silent cleanup
  MODERATE: "moderate", // 6-20 orphans, show toast
  MAJOR: "major", // Server reset detected
  OFFLINE: "offline", // Can't reach server
};

/**
 * Get stored sync state from localStorage
 */
function getStoredSyncState() {
  try {
    const stored = localStorage.getItem(SYNC_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    log.warn("Failed to read sync state:", e);
    return null;
  }
}

/**
 * Save sync state to localStorage
 */
function saveSyncState(state) {
  try {
    localStorage.setItem(
      SYNC_STATE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    log.warn("Failed to save sync state:", e);
  }
}

/**
 * Clear stored sync state
 */
export function clearSyncState() {
  localStorage.removeItem(SYNC_STATE_KEY);
  log.debug("Sync state cleared");
}

/**
 * Fetch server sync status
 */
export async function fetchServerStatus() {
  try {
    const response = await fetch(`${clientConfig.apiBaseUrl}/sync/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    log.error("Failed to fetch server status:", error);
    return null;
  }
}

/**
 * Check if server has been reset since last sync
 */
export async function checkForServerReset() {
  const serverStatus = await fetchServerStatus();

  if (!serverStatus) {
    return { reset: false, serverStatus: null, offline: true };
  }

  const storedState = getStoredSyncState();

  // First time syncing
  if (!storedState || !storedState.serverInstanceId) {
    log.debug("First sync - no previous state");
    return { reset: false, serverStatus, firstSync: true };
  }

  // Compare server instance IDs
  const reset = storedState.serverInstanceId !== serverStatus.serverInstanceId;

  if (reset) {
    log.warn("Server reset detected!");
    log.warn(`  Previous: ${storedState.serverInstanceId}`);
    log.warn(`  Current:  ${serverStatus.serverInstanceId}`);
  }

  return { reset, serverStatus };
}

/**
 * Calculate divergence level based on orphan count
 */
export function calculateDivergence(orphanCount, serverReset) {
  if (serverReset) return DivergenceLevel.MAJOR;
  if (orphanCount === 0) return DivergenceLevel.NONE;
  if (orphanCount <= THRESHOLDS.SILENT) return DivergenceLevel.MINOR;
  if (orphanCount <= THRESHOLDS.MODERATE) return DivergenceLevel.MODERATE;
  return DivergenceLevel.MAJOR;
}

/**
 * Update sync state after successful reconciliation
 */
export function updateSyncState(serverStatus, reconciliationResult) {
  saveSyncState({
    serverInstanceId: serverStatus.serverInstanceId,
    schemaVersion: serverStatus.schemaVersion,
    lastSyncAt: new Date().toISOString(),
    lastReconciliation: {
      orphansRemoved: reconciliationResult.orphansRemoved || 0,
      added: reconciliationResult.added || 0,
      total: reconciliationResult.total || 0,
    },
  });
  log.debug("Sync state updated");
}

/**
 * Main sync check - called early in app initialization
 */
export async function checkSyncStatus() {
  log.info("Checking sync status...");

  const { reset, serverStatus, offline, firstSync } =
    await checkForServerReset();

  if (offline) {
    log.warn("Server unreachable - continuing with local state");
    return {
      divergence: DivergenceLevel.OFFLINE,
      serverStatus: null,
      canContinue: true,
      message: "Working offline",
    };
  }

  if (reset) {
    return {
      divergence: DivergenceLevel.MAJOR,
      serverStatus,
      canContinue: true, // Will clear state automatically
      message: "Server database was reset",
      requiresClear: true,
    };
  }

  return {
    divergence: DivergenceLevel.NONE,
    serverStatus,
    canContinue: true,
    firstSync,
  };
}

/**
 * Perform full reconciliation
 */
export async function performReconciliation(
  datasetManager,
  viewManager,
  serverStatus
) {
  log.info("Performing reconciliation...");

  const results = {
    datasets: { orphansRemoved: 0, added: 0 },
    views: { orphansRemoved: 0, added: 0 },
  };

  // Reconcile datasets first
  if (datasetManager?.reconcileWithServer) {
    results.datasets = await datasetManager.reconcileWithServer();
  }

  // Then views
  if (viewManager?.reconcileWithServer) {
    results.views = await viewManager.reconcileWithServer();
  }

  // Calculate divergence
  const totalOrphans =
    results.datasets.orphansRemoved + results.views.orphansRemoved;
  const divergence = calculateDivergence(totalOrphans, false);

  // Update stored state
  if (serverStatus) {
    updateSyncState(serverStatus, {
      orphansRemoved: totalOrphans,
      added: results.datasets.added + results.views.added,
      total: (results.datasets.total || 0) + (results.views.total || 0),
    });
  }

  return { ...results, totalOrphansRemoved: totalOrphans, divergence };
}

// ============================================================================
// WATERMARK MANAGEMENT (DR1 — Delta Hydration)
// ============================================================================

/**
 * Return the last known sync_events.id for a workspace/user pair.
 * Returns 0 if no watermark has been saved (triggers full hydration).
 *
 * @param {string} workspaceId
 * @param {string|null} [userId=null]  Authenticated user id for scoping.
 */
export function getSyncWatermark(workspaceId, userId = null) {
  try {
    const raw = localStorage.getItem(watermarkKey(workspaceId, userId));
    return raw ? parseInt(raw, 10) : 0;
  } catch (e) {
    log.warn("Failed to read sync watermark:", e);
    return 0;
  }
}

/**
 * Persist the latest known sync_events.id for a workspace/user pair.
 *
 * @param {string}      workspaceId
 * @param {number}      eventId
 * @param {string|null} [userId=null]
 */
export function saveSyncWatermark(workspaceId, eventId, userId = null) {
  try {
    if (!workspaceId || eventId == null) return;
    localStorage.setItem(watermarkKey(workspaceId, userId), String(eventId));
  } catch (e) {
    log.warn("Failed to save sync watermark:", e);
  }
}

/**
 * Remove the saved watermark (e.g. on server reset or workspace change).
 *
 * @param {string}      workspaceId
 * @param {string|null} [userId=null]
 */
export function clearSyncWatermark(workspaceId, userId = null) {
  try {
    localStorage.removeItem(watermarkKey(workspaceId, userId));
  } catch (e) {
    log.warn("Failed to clear sync watermark:", e);
  }
}

/**
 * Fetch delta events from the server since a given watermark.
 * Returns the raw API response shape:
 *   { workspaceId, fromWatermark, toWatermark, events, requiresFullResync, reason? }
 */
export async function fetchDeltaSince(workspaceId, since) {
  try {
    const data = await apiClient.get(
      `/sync/delta?workspaceId=${encodeURIComponent(workspaceId)}&since=${since}`
    );
    return data;
  } catch (error) {
    log.warn("Delta fetch failed, will use full resync:", error.message);
    return { requiresFullResync: true, reason: "fetch_error", events: [], toWatermark: since };
  }
}

/**
 * Apply an ordered array of delta events to the running managers.
 *
 * Idempotent: events whose next_revision <= the current local revision are
 * skipped without counting as failures.
 *
 * Stops at the first failure because sync_events are strictly ordered —
 * skipping a failed event would create a permanent hole in local state.
 *
 * @param {object[]} events     sync_events rows from the server (ordered by id ASC)
 * @param {object}   managers   { viewConfigurationManager, ... }
 * @param {string|null} [_userId]  Reserved for future per-user state (unused here).
 * @returns {{ applied: number, lastAppliedEventId: number|null, failed: boolean }}
 */
export async function applyDeltaEvents(events, managers = {}, _userId = null) {
  const {
    viewConfigurationManager,
    annotationManager,
    viewGroupManager,
    workspaceAnnotationManager,
  } = managers;
  let applied = 0;
  let lastAppliedEventId = null;
  let failed = false;

  for (const event of events) {
    try {
      if (event.entity_type === "view_configuration" && viewConfigurationManager) {
        const existing = viewConfigurationManager.getView?.(event.entity_id);
        if (existing && Number(existing.revision) >= Number(event.next_revision)) {
          log.debug(`Delta skip (already at rev ${existing.revision}): view:${event.entity_id}`);
          lastAppliedEventId = Number(event.id);
          continue;
        }

        if (event.operation === "delete" || event.payload_type === "tombstone") {
          viewConfigurationManager.removeView?.(event.entity_id);
        } else if (event.payload_type === "patch" && event.patch) {
          const current = viewConfigurationManager.getView?.(event.entity_id);
          if (current) {
            try {
              const { patch: applyPatch } = await import("@Utils/jsonPatch.js");
              const currentServerFmt = viewConfigurationManager._clientToServerFormat(current);
              const merged = applyPatch(currentServerFmt, event.patch);
              viewConfigurationManager.handleServerBroadcast?.("view:updated", { view: merged });
            } catch (patchErr) {
              log.warn(`Patch apply failed for view ${event.entity_id}, stopping batch: ${patchErr.message}`);
              failed = true;
              break;
            }
          } else {
            log.warn(`Cannot apply patch for view ${event.entity_id}: not in local state`);
            failed = true;
            break;
          }
        } else if (event.snapshot) {
          viewConfigurationManager.handleServerBroadcast?.("view:updated", {
            view: event.snapshot,
          });
        }
        applied++;
      } else if (event.entity_type === "annotation" && annotationManager?.applyDeltaEvent) {
        const ok = await annotationManager.applyDeltaEvent(event);
        if (!ok) {
          log.warn(`Annotation delta event #${event.id} failed — stopping batch`);
          failed = true;
          break;
        }
        applied++;
      } else if (event.entity_type === "viewgroup" && viewGroupManager?.applyDeltaEvent) {
        const ok = await viewGroupManager.applyDeltaEvent(event);
        if (!ok) {
          log.warn(`ViewGroup delta event #${event.id} failed — stopping batch`);
          failed = true;
          break;
        }
        applied++;
      } else if (
        event.entity_type === "workspace_annotation" &&
        workspaceAnnotationManager?.applyDeltaEvent
      ) {
        const ok = await workspaceAnnotationManager.applyDeltaEvent(event);
        if (!ok) {
          log.warn(`WorkspaceAnnotation delta event #${event.id} failed — stopping batch`);
          failed = true;
          break;
        }
        applied++;
      } else {
        // Unknown entity type: log and skip (forward-compatible — future entity types
        // don't break existing clients; watermark still advances).
        log.debug(`Delta: unknown entity_type "${event.entity_type}" — skipping`);
      }

      lastAppliedEventId = Number(event.id);
    } catch (err) {
      log.warn(`Failed to apply delta event #${event.id}: ${err.message}. Stopping batch.`);
      failed = true;
      break;
    }
  }

  log.info(`Applied ${applied}/${events.length} delta events${failed ? " (stopped early on failure)" : ""}`);
  return { applied, lastAppliedEventId, failed };
}

/**
 * Startup hydration entrypoint.
 *
 * Flow:
 *  1. Read saved watermark for workspaceId + userId.
 *  2. If watermark > 0: request delta → apply events → advance watermark to
 *     lastAppliedEventId (not toWatermark — never skip past a failed event).
 *     If server returns requiresFullResync: clear watermark, fall through.
 *  3. If watermark = 0: return { usedFullHydration: true } (caller runs full REST).
 *
 * @param {string}      workspaceId
 * @param {object}      [managers={}]   { viewConfigurationManager, ... }
 * @param {string|null} [userId=null]   Authenticated user id for watermark scoping.
 * @returns {{ usedDelta?: boolean, usedFullHydration?: boolean, eventsApplied?: number, reason?: string }}
 */
export async function performStartupHydration(workspaceId, managers = {}, userId = null) {
  const watermark = getSyncWatermark(workspaceId, userId);
  log.info(`Startup hydration: workspaceId=${workspaceId} userId=${userId} watermark=${watermark}`);

  if (watermark <= 0) {
    log.info("No watermark — using full hydration");
    return { usedFullHydration: true, reason: "no_watermark" };
  }

  const delta = await fetchDeltaSince(workspaceId, watermark);

  if (delta.requiresFullResync) {
    log.info(`Delta hydration requires full resync: ${delta.reason}`);
    clearSyncWatermark(workspaceId, userId);
    return { usedFullHydration: true, reason: delta.reason };
  }

  const { applied, lastAppliedEventId, failed } = await applyDeltaEvents(
    delta.events || [],
    managers,
    userId
  );

  if (failed && applied === 0) {
    // No events applied at all — clear watermark and fall back to full hydration
    log.warn("All delta events failed to apply; falling back to full hydration");
    clearSyncWatermark(workspaceId, userId);
    return { usedFullHydration: true, reason: "apply_failed" };
  }

  // Advance watermark only as far as we successfully applied, not to toWatermark
  if (lastAppliedEventId != null && lastAppliedEventId > watermark) {
    saveSyncWatermark(workspaceId, lastAppliedEventId, userId);
    log.info(`Watermark advanced: ${watermark} → ${lastAppliedEventId}`);
  }

  return { usedDelta: true, eventsApplied: applied };
}

// ============================================================================
// DEBUG ACCESS
// ============================================================================

// Debug access
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.syncService = {
    checkSyncStatus,
    fetchServerStatus,
    clearSyncState,
    getStoredSyncState,
    // Watermark management (workspaceId, userId) — userId is optional
    getSyncWatermark,
    saveSyncWatermark,
    clearSyncWatermark,
    fetchDeltaSince,
    applyDeltaEvents,
    performStartupHydration,
  };
}
