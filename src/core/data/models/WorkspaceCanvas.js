// src/core/data/models/WorkspaceCanvas.js
// Represents an infinite pinboard canvas with view placements
//
// ARCHITECTURE:
// - Canvas is an infinite 2D grid that users navigate via viewport
// - Only views within the viewport are rendered (GPU optimization)
// - Server is source of truth - all canvas state persisted via API
//
// Ownership Types:
// - 'personal': User's private workspace (only they can see)
// - 'breakout': Shared within a breakout room (subset of team)
// - 'project': Shared with all project members

import { CanvasPlacement } from './CanvasPlacement.js';

/**
 * WorkspaceCanvas - The infinite pinboard containing view placements
 *
 * Key Concepts:
 * - Dimensions grow on demand (add rows/columns)
 * - Placements can span multiple cells (1-3 rows, 1-3 cols)
 * - Viewport determines which placements are rendered
 */
export class WorkspaceCanvas {
  /**
   * @param {Object} options
   * @param {string} options.id - Server-generated ID
   * @param {string} options.projectId - Parent project ID
   * @param {string} options.name - Canvas display name
   * @param {Object} options.dimensions - { rows, cols } current grid size
   * @param {Object} options.ownership - { type, ownerId }
   * @param {Array} options.placements - Array of CanvasPlacement objects
   * @param {string} options.createdBy - User ID who created this
   * @param {string} options.createdAt - ISO timestamp
   * @param {string} options.updatedAt - ISO timestamp
   */
  constructor({
    id = null,
    projectId,
    name = 'Untitled Workspace',
    dimensions = { rows: 3, cols: 3 },
    ownership = { type: 'personal', ownerId: null },
    placements = [],
    createdBy = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.dimensions = { ...dimensions };
    this.ownership = { ...ownership };
    this.placements = placements.map((p) =>
      p instanceof CanvasPlacement ? p : new CanvasPlacement(p)
    );
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // ===========================================================================
  // DIMENSION MANAGEMENT
  // ===========================================================================

  /**
   * Add a row to the canvas
   * @returns {number} New row count
   */
  addRow() {
    this.dimensions.rows++;
    return this.dimensions.rows;
  }

  /**
   * Add a column to the canvas
   * @returns {number} New column count
   */
  addColumn() {
    this.dimensions.cols++;
    return this.dimensions.cols;
  }

  /**
   * Remove last row (if empty)
   * @returns {boolean} True if removed, false if row has placements
   */
  removeRow() {
    const lastRow = this.dimensions.rows - 1;
    const hasPlacementsInRow = this.placements.some(
      (p) => p.row <= lastRow && p.row + (p.rowSpan || 1) > lastRow
    );

    if (!hasPlacementsInRow && this.dimensions.rows > 1) {
      this.dimensions.rows--;
      return true;
    }
    return false;
  }

  /**
   * Remove last column (if empty)
   * @returns {boolean} True if removed, false if column has placements
   */
  removeColumn() {
    const lastCol = this.dimensions.cols - 1;
    const hasPlacementsInCol = this.placements.some(
      (p) => p.col <= lastCol && p.col + (p.colSpan || 1) > lastCol
    );

    if (!hasPlacementsInCol && this.dimensions.cols > 1) {
      this.dimensions.cols--;
      return true;
    }
    return false;
  }

  /**
   * Set canvas dimensions
   * @param {number} rows
   * @param {number} cols
   */
  setDimensions(rows, cols) {
    this.dimensions.rows = Math.max(1, rows);
    this.dimensions.cols = Math.max(1, cols);
  }

  // ===========================================================================
  // PLACEMENT QUERIES
  // ===========================================================================

  /**
   * Get placement at a specific grid position (considering spans)
   * @param {number} row
   * @param {number} col
   * @returns {CanvasPlacement|null}
   */
  getPlacementAt(row, col) {
    return (
      this.placements.find(
        (p) =>
          row >= p.row &&
          row < p.row + (p.rowSpan || 1) &&
          col >= p.col &&
          col < p.col + (p.colSpan || 1)
      ) || null
    );
  }

  /**
   * Get placement by ID
   * @param {string} placementId
   * @returns {CanvasPlacement|null}
   */
  getPlacementById(placementId) {
    return this.placements.find((p) => p.id === placementId) || null;
  }

  /**
   * Check if a position is available for a placement
   * @param {number} row - Starting row
   * @param {number} col - Starting column
   * @param {number} rowSpan - Height in cells (1-3)
   * @param {number} colSpan - Width in cells (1-3)
   * @param {string} excludePlacementId - Placement to exclude (for moving)
   * @returns {boolean}
   */
  isPositionAvailable(row, col, rowSpan = 1, colSpan = 1, excludePlacementId = null) {
    // Check bounds
    if (row < 0 || col < 0) return false;
    if (row + rowSpan > this.dimensions.rows) return false;
    if (col + colSpan > this.dimensions.cols) return false;

    // Check for overlaps
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const existing = this.getPlacementAt(r, c);
        if (existing && existing.id !== excludePlacementId) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get placements visible within a viewport
   * @param {Object} viewport - { row, col, rows, cols }
   * @returns {CanvasPlacement[]}
   */
  getPlacementsInViewport(viewport) {
    return this.placements.filter((p) => p.isInViewport(viewport));
  }

  /**
   * Find first available position for a new placement
   * @param {number} rowSpan - Desired height
   * @param {number} colSpan - Desired width
   * @returns {{ row: number, col: number }|null}
   */
  findAvailablePosition(rowSpan = 1, colSpan = 1) {
    for (let row = 0; row <= this.dimensions.rows - rowSpan; row++) {
      for (let col = 0; col <= this.dimensions.cols - colSpan; col++) {
        if (this.isPositionAvailable(row, col, rowSpan, colSpan)) {
          return { row, col };
        }
      }
    }

    // No space found - suggest expanding canvas
    return null;
  }

  // ===========================================================================
  // PLACEMENT MANAGEMENT
  // ===========================================================================

  /**
   * Add a placement to the canvas
   * @param {CanvasPlacement|Object} placement
   * @returns {CanvasPlacement}
   */
  addPlacement(placement) {
    const p = placement instanceof CanvasPlacement
      ? placement
      : new CanvasPlacement(placement);

    if (!this.isPositionAvailable(p.row, p.col, p.rowSpan, p.colSpan)) {
      throw new Error(`Position (${p.row}, ${p.col}) is not available`);
    }

    this.placements.push(p);
    return p;
  }

  /**
   * Remove a placement from the canvas
   * @param {string} placementId
   * @returns {CanvasPlacement|null} The removed placement
   */
  removePlacement(placementId) {
    const index = this.placements.findIndex((p) => p.id === placementId);
    if (index !== -1) {
      return this.placements.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * Move a placement to a new position
   * @param {string} placementId
   * @param {number} newRow
   * @param {number} newCol
   * @returns {boolean} Success
   */
  movePlacement(placementId, newRow, newCol) {
    const placement = this.getPlacementById(placementId);
    if (!placement) return false;

    if (!this.isPositionAvailable(
      newRow, newCol, placement.rowSpan, placement.colSpan, placementId
    )) {
      return false;
    }

    placement.row = newRow;
    placement.col = newCol;
    return true;
  }

  /**
   * Resize a placement
   * @param {string} placementId
   * @param {number} newRowSpan
   * @param {number} newColSpan
   * @returns {boolean} Success
   */
  resizePlacement(placementId, newRowSpan, newColSpan) {
    const placement = this.getPlacementById(placementId);
    if (!placement) return false;

    // Clamp to 1-3 range
    newRowSpan = Math.max(1, Math.min(3, newRowSpan));
    newColSpan = Math.max(1, Math.min(3, newColSpan));

    if (!this.isPositionAvailable(
      placement.row, placement.col, newRowSpan, newColSpan, placementId
    )) {
      return false;
    }

    placement.rowSpan = newRowSpan;
    placement.colSpan = newColSpan;
    return true;
  }

  // ===========================================================================
  // OWNERSHIP & SHARING
  // ===========================================================================

  /**
   * Check if canvas is personal workspace
   */
  isPersonal() {
    return this.ownership.type === 'personal';
  }

  /**
   * Check if canvas is a breakout room workspace
   */
  isBreakout() {
    return this.ownership.type === 'breakout';
  }

  /**
   * Check if canvas is the project-wide shared workspace
   */
  isProjectRoom() {
    return this.ownership.type === 'project';
  }

  /**
   * Check if user can edit this canvas
   * @param {string} userId
   * @param {string[]} userBreakoutRooms - IDs of breakout rooms user belongs to
   * @returns {boolean}
   */
  canEdit(userId, userBreakoutRooms = []) {
    switch (this.ownership.type) {
      case 'personal':
        return this.ownership.ownerId === userId;
      case 'breakout':
        return userBreakoutRooms.includes(this.ownership.ownerId);
      case 'project':
        return true; // All project members can edit project room
      default:
        return false;
    }
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Convert to plain object for API/storage
   */
  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      dimensions: { ...this.dimensions },
      ownership: { ...this.ownership },
      placements: this.placements.map((p) => p.toJSON()),
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create from plain object
   * @param {Object} data
   * @returns {WorkspaceCanvas}
   */
  static fromJSON(data) {
    return new WorkspaceCanvas(data);
  }

  /**
   * Clone the canvas (creates new instance with same data)
   * @returns {WorkspaceCanvas}
   */
  clone() {
    return new WorkspaceCanvas({
      ...this.toJSON(),
      id: null, // New canvas should get new ID from server
      placements: this.placements.map((p) => ({
        ...p.toJSON(),
        id: null, // New placements should get new IDs
      })),
    });
  }
}
