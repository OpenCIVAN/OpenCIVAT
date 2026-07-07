// src/core/session/cameraSharePolicy.js
// Camera sharing policy — shared vs personal camera mode.
//
// When "shared" (default), local camera movements are broadcast to collaborators
// via Y.js + persisted durably, and remote camera updates are applied locally.
// When "personal", the local camera is decoupled: outgoing pushes are suppressed
// (yjsSetup.syncCameraToYjs early-returns) and incoming remote cameras are
// ignored (workspaceManager._handleYjsCameraUpdate early-returns) — UNLESS the
// follow feature is actively driving the camera (followOverride).
//
// This module intentionally imports NOTHING from collaboration/ or services/ to
// avoid import cycles (yjsSetup imports this; followService imports this).

const STORAGE_KEY = "cia_camera_shared";

/** @type {Set<(shared: boolean) => void>} */
let _listeners = new Set();

/**
 * Module-level override set by followService while it is applying a followed
 * user's camera. When true, the apply guard in workspaceManager must NOT skip
 * the remote camera even if the policy is "personal".
 */
let _followOverride = false;

function _readPersisted() {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    if (raw === null) return true; // default: shared
    return raw !== "false";
  } catch {
    return true;
  }
}

let _shared = _readPersisted();

/**
 * @returns {boolean} true when the camera is shared with collaborators (default).
 */
export function isCameraShared() {
  return _shared;
}

/**
 * Set the camera share mode and persist the preference.
 * @param {boolean} shared
 */
export function setCameraShared(shared) {
  const next = !!shared;
  if (next === _shared) return;
  _shared = next;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
    }
  } catch {
    // persistence is best-effort
  }
  _emit();
}

/**
 * Toggle between shared and personal.
 * @returns {boolean} the new shared value.
 */
export function toggleCameraShared() {
  setCameraShared(!_shared);
  return _shared;
}

/**
 * Subscribe to camera-share mode changes.
 * @param {(shared: boolean) => void} cb
 * @returns {() => void} unsubscribe
 */
export function onCameraSharedChange(cb) {
  if (typeof cb !== "function") return () => {};
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

/**
 * followService sets this while applying a followed user's camera so the apply
 * guard lets remote cameras through even in personal mode.
 * @param {boolean} on
 */
export function setFollowOverride(on) {
  _followOverride = !!on;
}

/**
 * @returns {boolean} true while followService is applying a followed camera.
 */
export function getFollowOverride() {
  return _followOverride;
}

function _emit() {
  _listeners.forEach((cb) => {
    try {
      cb(_shared);
    } catch {
      // never let a listener break the emit loop
    }
  });
}

export default {
  isCameraShared,
  setCameraShared,
  toggleCameraShared,
  onCameraSharedChange,
  setFollowOverride,
  getFollowOverride,
};
