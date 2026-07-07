// src/core/instances/types/vtk/collaboration/VTKRemoteVRRays.js
//
// Renders remote VR participants' controller rays inside desktop VTK views.
//
// Broadcast side: VRExplorationManager._broadcastPointerRay publishes the VR
// user's controller ray (already converted to DATA space) through
// vrCursorSync.broadcastVRPointer → Y.js "vrCursors" map, keyed by userId and
// carrying { mode: 'vr-controller', viewId, rayOrigin, rayDirection, hand,
// userName, userColor, timestamp }.
//
// This module is the desktop consumer: per attached instance it subscribes
// vrCursorSync.onRemoteCursor(viewConfigId, cb) and maintains one line actor
// per remote VR user (origin → origin + direction × RAY_LENGTH, matching the
// 5 m ray VRControllerRenderer draws locally in-headset), tinted with the
// user's color. Rays disappear when the cursor entry is deleted (VR exit) or
// goes stale (no update for STALE_TIMEOUT_MS).

import { cursor as log } from "@Utils/logger.js";
import { vrCursorSync } from "@Core/vr/VRCursorSync.js";
import { getUserId, getUserName, getUserColor } from "@Collaboration/presence/userManagement.js";
import { hexToRgb } from "@Utils/colorHelpers.js";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkLineSource from "@kitware/vtk.js/Filters/Sources/LineSource";

const RAY_LENGTH = 5.0; // matches VRControllerRenderer's local pointer ray
const RAY_OPACITY = 0.6;
const RAY_LINE_WIDTH = 2;
const STALE_TIMEOUT_MS = 2000;
const STALE_SWEEP_INTERVAL_MS = 1000;
const DEFAULT_RAY_COLOR = [0.2, 0.8, 0.4];

/**
 * Parse a cursor color that may be hex ('#rrggbb'), hsl(...) (getUserColor
 * output), or an [r,g,b] array. hsl strings can't be parsed cheaply without a
 * canvas, so they fall back to the default ray color.
 */
function toRgb(color) {
  if (Array.isArray(color) && color.length >= 3) return color.slice(0, 3);
  if (typeof color === "string" && color.startsWith("#")) return hexToRgb(color);
  return DEFAULT_RAY_COLOR;
}

export class VTKRemoteVRRays {
  constructor() {
    // instanceId -> { sceneObjects, viewConfigId, unsubscribe,
    //                 rays: Map<userId, {actor, mapper, lineSource, lastSeen}> }
    this._instances = new Map();
    this._sweepTimer = null;
  }

  /**
   * Start rendering remote VR rays into a desktop view.
   * Safe to call again for the same instance (re-attaches).
   *
   * @param {string} instanceId
   * @param {object} sceneObjects - { renderer, renderWindow }
   * @param {string} viewConfigId - shared view id the rays are scoped to
   */
  attach(instanceId, sceneObjects, viewConfigId) {
    if (!sceneObjects?.renderer || !viewConfigId) return;

    this.detach(instanceId);

    // Render-side consumers must also initialize vrCursorSync so its Y.js
    // observers are attached (idempotent).
    vrCursorSync.initialize(getUserId(), getUserName(), getUserColor(getUserId()));

    const state = {
      sceneObjects,
      viewConfigId,
      rays: new Map(),
      unsubscribe: null,
    };

    state.unsubscribe = vrCursorSync.onRemoteCursor(viewConfigId, (userId, cursorData) => {
      this._onCursor(state, userId, cursorData);
    });

    this._instances.set(instanceId, state);
    this._ensureSweep();
    log.debug(`Remote VR rays attached for instance ${instanceId} (view ${viewConfigId})`);
  }

  /**
   * Stop rendering and remove all ray actors for an instance.
   */
  detach(instanceId) {
    const state = this._instances.get(instanceId);
    if (!state) return;

    try {
      state.unsubscribe?.();
    } catch {
      // already gone
    }
    for (const userId of [...state.rays.keys()]) {
      this._removeRay(state, userId);
    }
    this._instances.delete(instanceId);

    if (this._instances.size === 0 && this._sweepTimer) {
      clearInterval(this._sweepTimer);
      this._sweepTimer = null;
    }
  }

  // ===========================================================================
  // INTERNALS
  // ===========================================================================

  _onCursor(state, userId, cursorData) {
    if (!cursorData) {
      this._removeRay(state, userId);
      state.sceneObjects.renderWindow?.render();
      return;
    }
    if (cursorData.mode !== "vr-controller") return;
    if (!cursorData.rayOrigin || !cursorData.rayDirection) return;

    this._addOrUpdateRay(state, userId, cursorData);
  }

  _addOrUpdateRay(state, userId, cursorData) {
    const { renderer, renderWindow } = state.sceneObjects;
    if (!renderer) return;

    const o = cursorData.rayOrigin;
    const d = cursorData.rayDirection;
    const point1 = [o.x, o.y, o.z];
    const point2 = [
      o.x + d.x * RAY_LENGTH,
      o.y + d.y * RAY_LENGTH,
      o.z + d.z * RAY_LENGTH,
    ];

    let entry = state.rays.get(userId);
    try {
      if (!entry) {
        const lineSource = vtkLineSource.newInstance({ point1, point2 });
        const mapper = vtkMapper.newInstance();
        mapper.setInputConnection(lineSource.getOutputPort());

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColor(...toRgb(cursorData.userColor));
        actor.getProperty().setOpacity(RAY_OPACITY);
        actor.getProperty().setLineWidth(RAY_LINE_WIDTH);
        actor.getProperty().setLighting(false);

        renderer.addActor(actor);
        entry = { actor, mapper, lineSource, lastSeen: 0 };
        state.rays.set(userId, entry);
      } else {
        entry.lineSource.setPoint1(...point1);
        entry.lineSource.setPoint2(...point2);
      }

      entry.lastSeen = Date.now();
      renderWindow?.render();
    } catch (err) {
      log.warn(`Remote VR ray render failed for ${userId}: ${err?.message}`);
    }
  }

  _removeRay(state, userId) {
    const entry = state.rays.get(userId);
    if (!entry) return;

    try {
      state.sceneObjects.renderer?.removeActor(entry.actor);
      entry.actor?.delete();
      entry.mapper?.delete();
      entry.lineSource?.delete();
    } catch (err) {
      log.warn(`Remote VR ray cleanup failed for ${userId}: ${err?.message}`);
    }
    state.rays.delete(userId);
  }

  /**
   * Periodic stale sweep: a VR client that crashed (never deleted its cursor
   * entry) must not leave a frozen ray on everyone's desktop.
   */
  _ensureSweep() {
    if (this._sweepTimer) return;
    this._sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const state of this._instances.values()) {
        let removed = false;
        for (const [userId, entry] of [...state.rays.entries()]) {
          if (now - entry.lastSeen > STALE_TIMEOUT_MS) {
            this._removeRay(state, userId);
            removed = true;
          }
        }
        if (removed) state.sceneObjects.renderWindow?.render();
      }
    }, STALE_SWEEP_INTERVAL_MS);
    // Never keep the process alive just for the sweep (tests/node).
    this._sweepTimer.unref?.();
  }
}

export const vtkRemoteVRRays = new VTKRemoteVRRays();
export default vtkRemoteVRRays;
