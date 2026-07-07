// src/core/vr/VRMultiViewGrid.js
// Renders the OTHER open views of the workspace as a grid of datasets inside
// an active VR exploration session, using VRGridLayout for placement math.
//
// HOW IT WORKS
// A VR exploration session renders exactly one instance's VTK scene (the
// renderer inside vrContext.sceneObjects). To show the workspace's other open
// views without disturbing them, this module builds PROXY ACTORS: for every
// source actor of another instance it creates a new vtkActor that SHARES the
// source's mapper (geometry/pipeline reuse, no data copy) but carries its own
// world transform. Each instance's actor set is normalized into a grid cell:
//
//   worldPoint = cellCenter + s * (dataPoint - datasetCenter)
//   => proxy.setScale(s); proxy.setPosition(cellCenter - s * datasetCenter)
//
// where s fits the instance's combined bounds diagonal into the layout's
// view scale. Source actors are never mutated, so desktop views and remote
// participants are unaffected. Disabling the grid removes and deletes only
// the proxy actors (mappers stay alive — they belong to the source views).

import { vr as log } from "@Utils/logger.js";
import { VRGridLayout } from "@Core/vr/VRGridLayout.js";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

const TARGET_SCALE_BOOST = 1.35; // targeted placement grows by this factor

/**
 * Arrange instance ids into a row-major grid.
 * Pure helper, exported for tests and for callers that want the shape ahead
 * of time. Column count defaults to ceil(sqrt(n)) for a near-square grid.
 *
 * @param {string[]} ids
 * @param {number} [cols]
 * @returns {{ placements: Array<{id:string,row:number,col:number}>, rows: number, cols: number }}
 */
export function computeGridPlacements(ids, cols) {
  const n = Array.isArray(ids) ? ids.length : 0;
  if (n === 0) return { placements: [], rows: 0, cols: 0 };

  const c = Number.isInteger(cols) && cols > 0 ? cols : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / c);

  const placements = ids.map((id, i) => ({
    id,
    row: Math.floor(i / c),
    col: i % c,
  }));

  return { placements, rows, cols: c };
}

/**
 * Union the bounds of a set of vtk actors.
 * @param {Array<object>} actors - vtkActor-like objects exposing getBounds()
 * @returns {number[]|null} [xmin,xmax,ymin,ymax,zmin,zmax] or null if unusable
 */
export function unionActorBounds(actors) {
  let out = null;
  for (const actor of actors || []) {
    let b = null;
    try {
      b = actor?.getBounds?.();
    } catch {
      continue;
    }
    if (!Array.isArray(b) || b.length !== 6 || b[0] > b[1]) continue;
    if (!b.every((v) => Number.isFinite(v))) continue;
    if (!out) {
      out = [...b];
    } else {
      out[0] = Math.min(out[0], b[0]);
      out[1] = Math.max(out[1], b[1]);
      out[2] = Math.min(out[2], b[2]);
      out[3] = Math.max(out[3], b[3]);
      out[4] = Math.min(out[4], b[4]);
      out[5] = Math.max(out[5], b[5]);
    }
  }
  return out;
}

export class VRMultiViewGrid {
  constructor(options = {}) {
    this._layout = options.layout || new VRGridLayout(options.layoutConfig || {});
    this._renderer = null;
    this._renderWindow = null;
    this._enabled = false;
    // placementId -> { proxies: vtkActor[], baseScale: number, transform }
    this._cells = new Map();
    this._targetedId = null;
  }

  isEnabled() {
    return this._enabled;
  }

  getPlacements() {
    return Array.from(this._cells.keys());
  }

  getTargetedPlacement() {
    return this._targetedId;
  }

  /**
   * Build proxy actors for the given instances and add them to the VR
   * session's renderer. Instances whose actors have no usable bounds are
   * skipped (logged, not fatal).
   *
   * @param {object} sceneObjects - the active vrContext.sceneObjects
   *   ({ renderer, renderWindow })
   * @param {Array<{instanceId:string, actors:object[]}>} instances - other
   *   open views' id + source vtkActor list (source actors are not mutated)
   * @returns {number} number of grid cells actually built
   */
  enable(sceneObjects, instances) {
    if (this._enabled) this.disable();

    const renderer = sceneObjects?.renderer;
    if (!renderer) {
      log.warn("VRMultiViewGrid: no renderer; grid not enabled");
      return 0;
    }

    const usable = (instances || []).filter(
      (inst) => inst?.instanceId && Array.isArray(inst.actors) && inst.actors.length > 0
    );
    if (usable.length === 0) {
      log.info("VRMultiViewGrid: no other views with data to show");
      return 0;
    }

    this._renderer = renderer;
    this._renderWindow = sceneObjects.renderWindow || null;
    this._layout.clearCache();

    const { placements, rows, cols } = computeGridPlacements(
      usable.map((i) => i.instanceId)
    );
    const byId = new Map(usable.map((i) => [i.instanceId, i]));

    for (const placement of placements) {
      const inst = byId.get(placement.id);
      const transform = this._layout.getWorldTransform(placement, { rows, cols });
      const cell = this._buildCell(inst, transform);
      if (cell) this._cells.set(placement.id, cell);
    }

    this._enabled = this._cells.size > 0;
    if (this._enabled) {
      this._renderWindow?.render();
      log.info(`VRMultiViewGrid: showing ${this._cells.size} views in grid`);
    }
    return this._cells.size;
  }

  /**
   * Remove and delete all proxy actors. Shared mappers are left untouched —
   * they belong to the source instances' own render pipelines.
   */
  disable() {
    for (const cell of this._cells.values()) {
      for (const proxy of cell.proxies) {
        try {
          this._renderer?.removeActor(proxy);
          proxy.delete();
        } catch (err) {
          log.warn(`VRMultiViewGrid: proxy cleanup failed: ${err?.message}`);
        }
      }
    }
    this._cells.clear();
    this._targetedId = null;
    this._layout.clearCache();
    this._renderWindow?.render();
    this._renderer = null;
    this._renderWindow = null;
    this._enabled = false;
  }

  /**
   * Highlight one placement (e.g. the one the user's ray points at or has
   * grabbed): its proxies scale up by TARGET_SCALE_BOOST; the previous
   * target reverts. Pass null to clear.
   * @param {string|null} placementId
   */
  setTargeted(placementId) {
    if (placementId === this._targetedId) return;

    const prev = this._cells.get(this._targetedId);
    if (prev) this._applyCellScale(prev, 1);

    const next = placementId != null ? this._cells.get(placementId) : null;
    if (next) this._applyCellScale(next, TARGET_SCALE_BOOST);

    this._targetedId = next ? placementId : null;
    this._layout.setTargetedPlacement(this._targetedId);
    this._renderWindow?.render();
  }

  // ===========================================================================
  // INTERNALS
  // ===========================================================================

  /**
   * Build one grid cell: proxy actors for every source actor of an instance,
   * normalized so the instance's combined bounds fit the cell.
   * @returns {{ proxies: object[], baseScale: number, transform: object,
   *   datasetCenter: number[] } | null}
   */
  _buildCell(inst, transform) {
    const bounds = unionActorBounds(inst.actors);
    if (!bounds) {
      log.warn(`VRMultiViewGrid: instance ${inst.instanceId} has no usable bounds; skipped`);
      return null;
    }

    const dx = bounds[1] - bounds[0];
    const dy = bounds[3] - bounds[2];
    const dz = bounds[5] - bounds[4];
    const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const datasetCenter = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    // Fit the dataset's diagonal into the cell's world-space size.
    const s = diagonal > 0 ? transform.scale / diagonal : transform.scale;

    const cell = { proxies: [], baseScale: s, transform, datasetCenter };

    for (const source of inst.actors) {
      try {
        const mapper = source?.getMapper?.();
        if (!mapper) continue;

        const proxy = vtkActor.newInstance();
        proxy.setMapper(mapper);

        // Best-effort visual match; property copy failures are cosmetic only.
        try {
          const srcProp = source.getProperty?.();
          const dstProp = proxy.getProperty();
          if (srcProp && dstProp) {
            dstProp.setColor(...srcProp.getColor());
            dstProp.setOpacity(srcProp.getOpacity());
            if (typeof srcProp.getRepresentation === "function") {
              dstProp.setRepresentation(srcProp.getRepresentation());
            }
          }
        } catch {
          // keep default property
        }

        this._positionProxy(proxy, cell, 1);
        this._renderer.addActor(proxy);
        cell.proxies.push(proxy);
      } catch (err) {
        log.warn(`VRMultiViewGrid: proxy build failed for ${inst.instanceId}: ${err?.message}`);
      }
    }

    return cell.proxies.length > 0 ? cell : null;
  }

  _applyCellScale(cell, boost) {
    for (const proxy of cell.proxies) {
      try {
        this._positionProxy(proxy, cell, boost);
      } catch {
        // cosmetic only
      }
    }
  }

  /**
   * worldPoint = cellCenter + (baseScale*boost) * (dataPoint - datasetCenter)
   */
  _positionProxy(proxy, cell, boost) {
    const s = cell.baseScale * boost;
    const p = cell.transform.position;
    const c = cell.datasetCenter;
    proxy.setScale(s, s, s);
    proxy.setPosition(p.x - s * c[0], p.y - s * c[1], p.z - s * c[2]);
  }
}

export const vrMultiViewGrid = new VRMultiViewGrid();
export default vrMultiViewGrid;
