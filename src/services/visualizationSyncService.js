// src/services/visualizationSyncService.js
// Canonical write path for shared InstanceToolsPanel visualization controls
// (Camera, Transform, Appearance, Colormap, Slice, Window/Level, Widgets).
//
// Every shared panel setter calls one of the push* functions here AFTER
// applying its change locally via instanceTools/vtkSceneFeature. Each push*:
//   1. Checks permission (view:modify_configuration) for the active workspace.
//   2. Pushes an ephemeral update over Y.js for real-time cross-client feedback
//      (reuses the existing syncCameraToYjs/syncVisualizationToYjs channel —
//      already consumed by workspaceManager._setupViewSyncListener()).
//   3. Persists the change to ViewConfiguration via ViewConfigurationManager
//      (throttled REST sync + WebSocket broadcast to other clients, and
//      durable for late joiners / reload).
//
// Permission is resolved from workspaceManager.getActiveWorkspace() (the
// collaboration-workspace singleton), NOT from a React prop — the
// InstanceToolsPanel component tree does not currently thread a workspaceId
// prop down to this depth, so gating on a hook prop would silently no-op.

import { getViewConfigurationManager } from "@Init/appInitializer.js";
import { syncCameraToYjs, syncVisualizationToYjs } from "@Collaboration/yjs/yjsSetup.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { workspaceManager as collaborationWorkspaceManager } from "@Core/data/managers/WorkspaceManager.js";
import { permissionService, PERMISSIONS } from "@Services/permissionService.js";

const NO_VIEW = { persisted: false, reason: "no-active-view" };
const NO_PERMISSION = { persisted: false, reason: "permission-denied" };

const _roleFetchInFlight = new Set();

// ---------------------------------------------------------------------------
// Ephemeral Y.js send throttling
//
// The durable REST persist (ViewConfigurationManager) already throttles to
// 100ms, but the ephemeral Y.js send was called once per React onChange tick —
// a slider drag flooded the CRDT + relay with an update per pixel. Throttle the
// Y.js send per view with a leading edge + a guaranteed trailing flush so the
// final value is never dropped, at ~20 updates/sec (matches VRCursorSync).
// Patches are merged per view (shallow) so distinct fields queued within a
// window are all delivered in one send.
// ---------------------------------------------------------------------------
const YJS_SEND_THROTTLE_MS = 50;

function createViewPatchThrottle(sendFn, throttleMs = YJS_SEND_THROTTLE_MS) {
  const state = new Map(); // viewId -> { lastSent, timer, pending, userId }

  const flush = (viewId) => {
    const e = state.get(viewId);
    if (!e || !e.pending) return;
    const patch = e.pending;
    e.pending = null;
    e.lastSent = Date.now();
    if (e.timer) {
      clearTimeout(e.timer);
      e.timer = null;
    }
    if (e.userId) sendFn(viewId, e.userId, patch);
  };

  return (viewId, userId, patch) => {
    let e = state.get(viewId);
    if (!e) {
      e = { lastSent: 0, timer: null, pending: null, userId };
      state.set(viewId, e);
    }
    e.userId = userId;
    e.pending = { ...(e.pending || {}), ...patch };

    const elapsed = Date.now() - e.lastSent;
    if (elapsed >= throttleMs) {
      flush(viewId);
    } else if (!e.timer) {
      e.timer = setTimeout(() => flush(viewId), throttleMs - elapsed);
    }
  };
}

const _throttledCameraSend = createViewPatchThrottle(syncCameraToYjs);
const _throttledVizSend = createViewPatchThrottle(syncVisualizationToYjs);

/**
 * Resolve the workspaceId for the currently active collaboration workspace.
 * Returns null if none is active (e.g. not yet loaded).
 */
export function resolveActiveWorkspaceId() {
  return collaborationWorkspaceManager.getActiveWorkspace()?.getEffectiveId() || null;
}

/**
 * Synchronous permission check for shared-view edits, using whatever role is
 * currently cached. Kicks off a background role fetch if nothing is cached
 * yet for this workspace, so subsequent calls become accurate.
 */
export function canModifyActiveView() {
  const workspaceId = resolveActiveWorkspaceId();
  if (!workspaceId) return false;

  if (
    permissionService.getCachedRole(workspaceId) == null &&
    !_roleFetchInFlight.has(workspaceId)
  ) {
    _roleFetchInFlight.add(workspaceId);
    permissionService
      .fetchWorkspaceRole(workspaceId)
      .finally(() => _roleFetchInFlight.delete(workspaceId));
  }

  return permissionService.hasPermission(workspaceId, PERMISSIONS.VIEW_MODIFY_CONFIGURATION);
}

/** Human-readable reason to show in the panel when a control is gated. */
export function getPermissionDeniedReason() {
  const workspaceId = resolveActiveWorkspaceId();
  if (!workspaceId) return null;
  return canModifyActiveView() ? null : "View is read-only for your role";
}

/**
 * Push a camera update: ephemeral Y.js (real-time) + throttled durable persist.
 * @param {string} viewId
 * @param {object} cameraPatch - partial camera state (position, focalPoint, viewUp, viewAngle, ...)
 */
export function pushSharedCameraUpdate(viewId, cameraPatch) {
  if (!viewId) return NO_VIEW;
  if (!canModifyActiveView()) return NO_PERMISSION;

  const userId = getUserId();
  if (userId) _throttledCameraSend(viewId, userId, cameraPatch);
  getViewConfigurationManager()?.updateCamera(viewId, cameraPatch);

  return { persisted: true };
}

/**
 * Push a visualization update (opacity, representation, pointSize, lineWidth,
 * colormap, activeArray, transform, slice, windowLevel, glyph): ephemeral
 * Y.js (real-time) + throttled durable persist.
 * @param {string} viewId
 * @param {object} patch - shallow patch, e.g. { opacity: 0.5 } or { transform: {...} }
 */
export function pushSharedVisualizationUpdate(viewId, patch) {
  if (!viewId) return NO_VIEW;
  if (!canModifyActiveView()) return NO_PERMISSION;

  const userId = getUserId();
  if (userId) _throttledVizSend(viewId, userId, patch);
  getViewConfigurationManager()?.updateVisualization(viewId, patch);

  return { persisted: true };
}

/**
 * Push a widget activation toggle (ruler/angle/plane). Durable-only (REST +
 * WebSocket broadcast) — widget toggles create/destroy VTK widget objects
 * rather than mutate a continuous property, so there's no ephemeral Y.js
 * channel for them; the receiving side diffs against current state instead
 * of blindly re-toggling on every tick.
 * @param {string} viewId
 * @param {string} widgetType - 'line' | 'angle' | 'plane'
 * @param {boolean} active
 */
export function pushSharedWidgetToggle(viewId, widgetType, active) {
  if (!viewId) return NO_VIEW;
  if (!canModifyActiveView()) return NO_PERMISSION;

  const vcm = getViewConfigurationManager();
  const view = vcm?.getView(viewId);
  if (!view) return NO_VIEW;

  const existing = view.widgets?.find((w) => w.type === widgetType);
  if (existing) {
    vcm.updateWidget(viewId, existing.id, { active });
  } else {
    vcm.addWidget(viewId, { type: widgetType, active });
  }

  return { persisted: true };
}
