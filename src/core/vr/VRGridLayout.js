// src/core/vr/VRGridLayout.js
// Calculates 3D positions for views in VR grid mode
//
// Layout: flat grid centered in front of user, one row per canvas row.

import { vr as log } from "@Utils/logger.js";

export class VRGridLayout {
  constructor(options = {}) {
    this._gridRadius = options.gridRadius || 3.0;
    this._viewSpacing = options.viewSpacing || 0.1;
    this._viewScale = options.viewScale || 1.0;
    this._eyeHeight = options.eyeHeight || 1.6;
    this._rowHeight = options.rowHeight || 0.8;
    this._placementPositions = new Map();
    this._targetedPlacementId = null;
  }

  setConfig(config) {
    if (config.gridRadius !== undefined) this._gridRadius = config.gridRadius;
    if (config.viewSpacing !== undefined) this._viewSpacing = config.viewSpacing;
    if (config.viewScale !== undefined) this._viewScale = config.viewScale;
    if (config.eyeHeight !== undefined) this._eyeHeight = config.eyeHeight;
    if (config.rowHeight !== undefined) this._rowHeight = config.rowHeight;
  }

  /**
   * Calculate world transform for a placement in a flat grid.
   * Placements are arranged in a rectangular grid facing the user.
   *
   * @param {object} placement - { id, row, col, rowSpan, colSpan }
   * @param {object} gridConfig - { rows, cols }
   * @returns {{ position: {x,y,z}, rotation: {x,y,z,w}, scale: number }}
   */
  getWorldTransform(placement, gridConfig = { rows: 1, cols: 1 }) {
    const { row, col, rowSpan = 1, colSpan = 1 } = placement;
    const { cols } = gridConfig;

    const cellWidth = this._viewScale + this._viewSpacing;
    const cellHeight = this._rowHeight;

    // Horizontal: center the grid, spread columns left/right
    const totalWidth = cols * cellWidth;
    const x = (col + colSpan / 2) * cellWidth - totalWidth / 2;

    // Vertical: rows go up from eye height
    const y = this._eyeHeight - row * cellHeight;

    // Depth: flat panel facing user (negative Z = in front)
    const z = -this._gridRadius;

    const transform = {
      position: { x, y, z },
      rotation: { x: 0, y: 0, z: 0, w: 1 }, // face toward +Z (user)
      scale: this._viewScale * Math.max(rowSpan, colSpan),
    };

    this._placementPositions.set(placement.id, transform);
    return transform;
  }

  getPlacementPosition(placementId) {
    return this._placementPositions.get(placementId) || null;
  }

  getAllPositions() {
    return Object.fromEntries(this._placementPositions);
  }

  setTargetedPlacement(placementId) {
    this._targetedPlacementId = placementId;
  }

  getTargetedPlacement() {
    return this._targetedPlacementId;
  }

  clearCache() {
    this._placementPositions.clear();
    this._targetedPlacementId = null;
  }
}

export const vrGridLayout = new VRGridLayout();
