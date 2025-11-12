// src/core/data/models/Annotation.js

/**
 * Annotation - Represents user-created annotations on datasets
 *
 * IMPORTANT: Annotations belong to datasets, NOT to view configurations.
 * They are spatially anchored to the dataset's coordinate system and
 * represent knowledge about the data itself.
 *
 * View configurations control which annotations are visible and how they're
 * displayed, but they don't own the annotations.
 *
 * This separation is critical for:
 * - Auditing: Track who annotated what and when at the dataset level
 * - Collaboration: Multiple users can annotate the same dataset
 * - Role-based access: Filter annotations by user, role, or permission
 * - Persistence: Annotations exist independent of views
 */

import { generateAnnotationId } from "@Utils/idGenerator.js";

export class Annotation {
  constructor(config = {}) {
    // Core identification
    this.id = config.id || this._generateId();
    this.datasetId = config.datasetId; // Required: which dataset this belongs to

    // Spatial anchoring (coordinates in dataset's coordinate system)
    // These coordinates are in the raw data space, not view space
    this.position = config.position || [0, 0, 0]; // [x, y, z] in dataset coordinates
    this.normal = config.normal || null; // Optional [x, y, z] for surface annotations

    // Content
    this.text = config.text || "";
    this.type = config.type || "point"; // 'point' | 'line' | 'region' | 'measurement' | 'label'

    // Auditing metadata - critical for scientific/medical applications
    this.createdBy = config.createdBy; // userId of creator
    this.createdAt = config.createdAt || Date.now();
    this.modifiedBy = config.modifiedBy || null; // userId of last modifier
    this.modifiedAt = config.modifiedAt || null;

    // Organization and filtering
    this.tags = config.tags || []; // User-defined tags for categorization

    // Collaboration and permissions
    this.visibility = config.visibility || "public"; // 'public' | 'private' | 'shared'
    this.sharedWith = config.sharedWith || []; // Array of userIds who can see this

    // Type-specific metadata (flexible structure)
    // For 'line' type: might include {endPosition: [x, y, z]}
    // For 'measurement': might include {value: 12.5, unit: 'mm'}
    // For 'region': might include {points: [[x,y,z], [x,y,z], ...]}
    this.metadata = config.metadata || {};

    // Validate required fields
    if (!this.datasetId) {
      throw new Error("Annotation requires a datasetId");
    }
  }

  /**
   * Generate a unique ID for this annotation
   * In production, you might use a UUID library
   */
  _generateId() {
    return generateAnnotationId();
  }

  /**
   * Check if a user can view this annotation
   * @param {string} userId - The user requesting access
   * @returns {boolean} - Whether the user can see this annotation
   */
  canView(userId) {
    if (this.visibility === "public") return true;
    if (this.visibility === "private") return userId === this.createdBy;
    if (this.visibility === "shared") {
      return userId === this.createdBy || this.sharedWith.includes(userId);
    }
    return false;
  }

  /**
   * Check if a user can edit this annotation
   * @param {string} userId - The user requesting access
   * @returns {boolean} - Whether the user can edit this annotation
   */
  canEdit(userId) {
    // Only the creator can edit (you might expand this later)
    return userId === this.createdBy;
  }

  /**
   * Update the annotation content
   * @param {object} updates - Fields to update
   * @param {string} modifiedBy - UserId of the user making the change
   */
  update(updates, modifiedBy) {
    // Update allowed fields
    const allowedFields = [
      "text",
      "tags",
      "visibility",
      "sharedWith",
      "metadata",
      "position",
      "normal",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        this[field] = updates[field];
      }
    });

    // Update modification tracking
    this.modifiedBy = modifiedBy;
    this.modifiedAt = Date.now();
  }

  /**
   * Serialize for storage or network transmission
   * @returns {object} - Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      datasetId: this.datasetId,
      position: this.position,
      normal: this.normal,
      text: this.text,
      type: this.type,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      modifiedBy: this.modifiedBy,
      modifiedAt: this.modifiedAt,
      tags: this.tags,
      visibility: this.visibility,
      sharedWith: this.sharedWith,
      metadata: this.metadata,
    };
  }

  /**
   * Create an Annotation from stored JSON
   * @param {object} json - Serialized annotation data
   * @returns {Annotation} - New Annotation instance
   */
  static fromJSON(json) {
    return new Annotation(json);
  }

  /**
   * Check if this annotation matches a filter specification
   * This is used by view configurations to determine which annotations to display
   *
   * @param {object} filter - Filter specification from a view configuration
   * @returns {boolean} - Whether this annotation passes the filter
   */
  matchesFilter(filter) {
    // If no filter or filter is disabled, show everything
    if (!filter) return true;

    // Filter by user IDs
    if (filter.userIds && filter.userIds.length > 0) {
      if (!filter.userIds.includes(this.createdBy)) {
        return false;
      }
    }

    // Filter by tags (annotation must have at least one matching tag)
    if (filter.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some((tag) => this.tags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(this.type)) {
        return false;
      }
    }

    // Filter by date range
    if (filter.dateRange) {
      if (filter.dateRange.start && this.createdAt < filter.dateRange.start) {
        return false;
      }
      if (filter.dateRange.end && this.createdAt > filter.dateRange.end) {
        return false;
      }
    }

    // Passed all filters
    return true;
  }
}

/**
 * AnnotationDisplayConfig - Configuration for how annotations are displayed in a view
 *
 * This is NOT part of the Annotation class because it's view-specific, not data-specific.
 * Each view configuration has one of these to control annotation rendering.
 */
export class AnnotationDisplayConfig {
  constructor(config = {}) {
    // Master switch for annotation visibility
    this.enabled = config.enabled !== undefined ? config.enabled : true;

    // Filter specification - determines which annotations from the dataset to show
    this.filter = {
      userIds: config.filter?.userIds || [], // Empty = show all users
      tags: config.filter?.tags || [], // Empty = show all tags
      types: config.filter?.types || [], // Empty = show all types
      dateRange: config.filter?.dateRange || null, // null = no date filter
    };

    // Style overrides for annotation rendering
    // The instance type handler uses these when rendering
    this.style = {
      color: config.style?.color || null, // null = use default color
      size: config.style?.size || 1.0, // Relative size multiplier
      opacity: config.style?.opacity || 1.0, // 0-1
      labelVisibility:
        config.style?.labelVisibility !== undefined
          ? config.style.labelVisibility
          : true,
      fontSize: config.style?.fontSize || 12,
    };
  }

  /**
   * Apply this filter to a collection of annotations
   * @param {Annotation[]} annotations - All annotations from a dataset
   * @param {string} currentUserId - The user viewing (for permission checks)
   * @returns {Annotation[]} - Filtered annotations that should be displayed
   */
  filterAnnotations(annotations, currentUserId) {
    if (!this.enabled) return [];

    return annotations.filter((annotation) => {
      // Check if user has permission to view
      if (!annotation.canView(currentUserId)) {
        return false;
      }

      // Check if annotation matches the filter criteria
      return annotation.matchesFilter(this.filter);
    });
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      enabled: this.enabled,
      filter: this.filter,
      style: this.style,
    };
  }

  /**
   * Create from stored JSON
   */
  static fromJSON(json) {
    return new AnnotationDisplayConfig(json);
  }
}
