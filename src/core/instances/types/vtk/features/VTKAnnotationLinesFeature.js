// src/core/instances/types/vtk/features/VTKAnnotationLinesFeature.js

/**
 * VTK Annotation Lines Feature
 *
 * Renders 'measurement' annotations (created by the VR measure tool, see
 * VRMeasureTool.js / VRExplorationManager._persistVRMeasurement) as
 * non-interactive 3D line actors in desktop VTK views, with a floating
 * distance label at the midpoint.
 *
 * This is intentionally NOT built on VTKMeasurementWidgetsFeature — that
 * feature drives interactive, desktop-local measurement widgets and has no
 * knowledge of the server-authoritative Annotation model. Measurements made
 * in VR are persisted as annotations (type: 'measurement') and broadcast to
 * every connected client via serverSync -> AnnotationManager. This feature
 * mirrors that flow: fetch existing measurement annotations for the
 * instance's dataset on load, then stay live via AnnotationManager's
 * 'annotationAdded' / 'annotationRemoved' events so lines appear/disappear
 * as VR users create or undo measurements.
 *
 * Stored shape (see VRExplorationManager._persistVRMeasurement):
 *   annotation.type === 'measurement'
 *   annotation.position          -> midpoint [x, y, z] (dataset/data space)
 *   annotation.metadata.startPoint -> [x, y, z]
 *   annotation.metadata.endPoint   -> [x, y, z]
 *   annotation.metadata.distance   -> number
 *   annotation.metadata.unit       -> string (default 'units')
 * Points are already in dataset coordinate space: VRMeasureTool records the
 * VTK picker's world-space hit position, and raycastVR() (VTKInstanceHandler)
 * picks directly against the scene's renderer -- the same coordinate system
 * desktop rendering uses. No vrScale/vrOrigin transform is applied to stored
 * points (that transform only maps XR device space to data space for camera
 * placement; annotation content is recorded post-pick, already in data space).
 */

import { FeatureInterface } from "@Core/instances/features/FeatureInterface.js";
import { render as log } from "@Utils/logger.js";
import { apiClient } from "@Services/apiClient.js";
import { getAnnotationManager } from "@Init/appInitializer.js";
import { hexToRgb, rgbToHex } from "@Utils/colorHelpers.js";
import { VRTextBillboard } from "@Core/vr/ui/VRTextBillboard.js";

import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkLineSource from "@kitware/vtk.js/Filters/Sources/LineSource";
import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SETTINGS = {
  enabled: true,
  lineColor: [1, 1, 0],
  lineWidth: 3,
  labelColor: [1, 1, 1],
  labelScale: 0.03, // relative to a unit line; adequate default for most datasets
  pointColor: [1, 0.5, 0], // matches VRAnnotationTool's default user color
  // Sphere radius as a fraction of the visible scene diagonal; falls back to
  // an absolute radius when bounds aren't computable (e.g. empty renderer).
  pointRadiusFraction: 0.008,
  pointRadiusFallback: 0.05,
};

/**
 * Parse a stored annotation row/model into line endpoints + label text.
 * Returns null (never throws) if the annotation isn't a well-formed
 * measurement -- malformed content must be ignored, not crash the feature.
 *
 * @param {object} annotation - Annotation model instance or server row
 * @returns {{ startPoint: number[], endPoint: number[], distance: number, unit: string, id: string } | null}
 */
export function parseMeasurementAnnotation(annotation) {
  try {
    if (!annotation || annotation.type !== "measurement") return null;

    const metadata = annotation.metadata || {};
    const startPoint = metadata.startPoint;
    const endPoint = metadata.endPoint;

    if (!isFinitePoint(startPoint) || !isFinitePoint(endPoint)) return null;

    const distance =
      typeof metadata.distance === "number" && Number.isFinite(metadata.distance)
        ? metadata.distance
        : _distanceBetween(startPoint, endPoint);

    return {
      id: annotation.id,
      startPoint: [startPoint[0], startPoint[1], startPoint[2]],
      endPoint: [endPoint[0], endPoint[1], endPoint[2]],
      distance,
      unit: typeof metadata.unit === "string" ? metadata.unit : "units",
    };
  } catch (err) {
    log.warn(`Failed to parse measurement annotation: ${err.message}`);
    return null;
  }
}

/**
 * Parse a stored annotation row/model into a point marker description.
 * Returns null (never throws) if the annotation isn't a well-formed 'point'
 * annotation (the shape produced by VRExplorationManager._persistVRAnnotation:
 * type 'point', position [x,y,z] in data space, text, metadata.color).
 *
 * @param {object} annotation - Annotation model instance or server row
 * @returns {{ id: string, position: number[], text: string, color: number[]|null, authorName: string|null } | null}
 */
export function parsePointAnnotation(annotation) {
  try {
    if (!annotation || annotation.type !== "point") return null;
    if (!isFinitePoint(annotation.position)) return null;

    return {
      id: annotation.id,
      position: [annotation.position[0], annotation.position[1], annotation.position[2]],
      text: typeof annotation.text === "string" ? annotation.text : "",
      color: normalizeColor(annotation.metadata?.color),
      // Display name only (see VRExplorationManager._persistVRAnnotation) —
      // lets a persisted pin say who placed it without a separate user-id
      // lookup. Absent on annotations created before this field existed.
      authorName:
        typeof annotation.metadata?.authorName === "string"
          ? annotation.metadata.authorName
          : null,
    };
  } catch (err) {
    log.warn(`Failed to parse point annotation: ${err.message}`);
    return null;
  }
}

/**
 * Accepts either an [r,g,b] array (0-1, VRAnnotationTool userColor default)
 * or a hex string ('#rrggbb'); anything else -> null (caller uses default).
 */
function normalizeColor(color) {
  if (Array.isArray(color) && color.length >= 3 && color.slice(0, 3).every((v) => typeof v === "number" && Number.isFinite(v))) {
    return [color[0], color[1], color[2]];
  }
  if (typeof color === "string" && color.startsWith("#")) {
    return hexToRgb(color);
  }
  return null;
}

function isFinitePoint(p) {
  return (
    Array.isArray(p) &&
    p.length >= 3 &&
    p.slice(0, 3).every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

function _distanceBetween(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// =============================================================================
// VTK ANNOTATION LINES FEATURE
// =============================================================================

export class VTKAnnotationLinesFeature extends FeatureInterface {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  getMetadata() {
    return {
      id: "VTKAnnotationLinesFeature",
      name: "Annotation Measurement Lines",
      description: "Renders VR-created measurement annotations as 3D lines with distance labels, and point annotations as sphere markers",
      version: "1.0.0",
      author: "CIA Team",
    };
  }

  isAvailable(instanceId, instanceData) {
    return instanceData?.sceneObjects?.renderer != null;
  }

  /**
   * Initialize the feature for an instance: render any measurement
   * annotations already known for the dataset, fetch the current server
   * state, and subscribe to live AnnotationManager events.
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects, datasetId } = instanceData;

    if (!sceneObjects?.renderer) {
      log.warn(`Cannot initialize annotation lines: no renderer for ${instanceId}`);
      return;
    }

    // loadData() (and therefore feature initialize()) can run more than once
    // for the same instance (e.g. dataset reload). Tear down any prior state
    // first so actors/subscriptions from an earlier initialize() don't leak.
    if (this.instanceStates.has(instanceId)) {
      await this.cleanup(instanceId);
    }

    const state = {
      ...DEFAULT_SETTINGS,
      sceneObjects,
      datasetId: datasetId || null,
      // measurementId -> { actor, mapper, lineSource, labelBillboard }
      lines: new Map(),
      // pointAnnotationId -> { actor, mapper, sphereSource, labelBillboard }
      points: new Map(),
      unsubscribers: [],
    };

    this.instanceStates.set(instanceId, state);

    this._subscribeToAnnotationManager(instanceId, state);

    if (state.datasetId) {
      await this._loadExistingMeasurements(instanceId, state);
    }

    log.debug(`Annotation lines feature initialized for instance: ${instanceId}`);
  }

  /**
   * Update the dataset scope this feature renders for (called if an
   * instance's dataset changes after initial load, e.g. loadData()).
   */
  async setDatasetId(instanceId, datasetId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    if (state.datasetId === datasetId) return;

    this._clearAllLines(state);
    state.datasetId = datasetId || null;

    if (state.datasetId) {
      await this._loadExistingMeasurements(instanceId, state);
    }
  }

  /**
   * Clean up all actors, subscriptions, and state for an instance.
   */
  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    for (const unsubscribe of state.unsubscribers) {
      try {
        unsubscribe();
      } catch (err) {
        log.warn(`Error unsubscribing annotation lines listener: ${err.message}`);
      }
    }
    state.unsubscribers = [];

    this._clearAllLines(state);

    this.instanceStates.delete(instanceId);
    log.debug(`Annotation lines feature cleaned up for instance: ${instanceId}`);
  }

  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return null;

    return {
      enabled: state.enabled,
      datasetId: state.datasetId,
      measurementCount: state.lines.size,
      pointCount: state.points.size,
    };
  }

  // ===========================================================================
  // ANNOTATION MANAGER WIRING
  // ===========================================================================

  _subscribeToAnnotationManager(instanceId, state) {
    const annotationManager = getAnnotationManager();
    if (!annotationManager) {
      log.warn(
        `AnnotationManager not available yet; instance ${instanceId} won't receive live measurement updates`
      );
      return;
    }

    const onAdded = ({ datasetId, annotation }) => {
      if (!state.enabled) return;
      if (datasetId !== state.datasetId) return;
      this._addOrUpdateAnnotation(state, annotation);
    };

    const onRemoved = ({ datasetId, annotationId }) => {
      if (datasetId !== state.datasetId) return;
      this._removeLine(state, annotationId);
      this._removePoint(state, annotationId);
    };

    const onUpdated = ({ datasetId, annotation }) => {
      if (!state.enabled) return;
      if (datasetId !== state.datasetId) return;
      this._addOrUpdateAnnotation(state, annotation);
    };

    state.unsubscribers.push(annotationManager.on("annotationAdded", onAdded));
    state.unsubscribers.push(annotationManager.on("annotationRemoved", onRemoved));
    state.unsubscribers.push(annotationManager.on("annotationUpdated", onUpdated));
  }

  /**
   * Fetch existing annotations for the dataset directly from the server
   * (mirrors useAnnotations.js's fetchAnnotations), so measurements and point
   * markers created before this view was opened still render on load.
   * Non-renderable annotation types in the response are simply skipped by
   * the parsers.
   */
  async _loadExistingMeasurements(instanceId, state) {
    try {
      const result = await apiClient.get(`/annotations?fileId=${state.datasetId}`);
      const rows = result?.annotations || [];

      for (const row of rows) {
        // Server rows are snake_case; the parsers only need id/type/position/
        // metadata, all of which are present as-is on raw rows.
        this._addOrUpdateAnnotation(state, row);
      }
    } catch (err) {
      log.warn(`Failed to load existing annotations: ${err.message}`);
    }
  }

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  /**
   * Route an annotation to the right renderer by type ('measurement' -> line,
   * 'point' -> sphere marker). Anything else is ignored.
   */
  _addOrUpdateAnnotation(state, annotation) {
    if (!annotation) return;
    if (annotation.type === "measurement") {
      this._addOrUpdateLine(state, annotation);
    } else if (annotation.type === "point") {
      this._addOrUpdatePoint(state, annotation);
    }
  }

  _addOrUpdateLine(state, annotation) {
    const parsed = parseMeasurementAnnotation(annotation);
    if (!parsed) return;

    // Replace any existing actor for this id (covers annotationUpdated)
    this._removeLine(state, parsed.id);

    const { renderer, renderWindow } = state.sceneObjects;
    if (!renderer) return;

    try {
      const lineSource = vtkLineSource.newInstance({
        point1: parsed.startPoint,
        point2: parsed.endPoint,
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(lineSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(...state.lineColor);
      actor.getProperty().setLineWidth(state.lineWidth);
      actor.getProperty().setLighting(false);
      // Persisted annotations are display-only; without this, raycastVR's
      // pick list (VTKInstanceHandler._getVRPickTargets) treats this line as
      // a live target and placing a second annotation nearby lands on it
      // instead of on the data.
      actor.setPickable(false);

      renderer.addActor(actor);

      const entry = { actor, mapper, lineSource, labelBillboard: null };

      const label = this._createLabel(state, parsed);
      if (label) {
        entry.labelBillboard = label.labelBillboard;
      }

      state.lines.set(parsed.id, entry);

      renderWindow?.render();
    } catch (err) {
      log.warn(`Failed to render measurement annotation ${parsed.id}: ${err.message}`);
    }
  }

  /**
   * Build a floating text label (VRTextBillboard) showing the distance,
   * positioned at the line's midpoint. Returns null (never throws) if the
   * label can't be built -- the line itself still renders.
   *
   * vtkVectorText is NOT used here: it requires an opentype.js-parsed font
   * via setFont(), which nothing in this codebase (or its dependencies --
   * opentype.js isn't even installed) ever supplies, so it silently renders
   * empty, invisible geometry. See VRTextBillboard.js's header for the full
   * writeup; this is the same failure VTKVRSpatialUI already worked around.
   */
  _createLabel(state, parsed) {
    try {
      const text = `${Number(parsed.distance).toFixed(3)} ${parsed.unit}`;

      const mid = [
        (parsed.startPoint[0] + parsed.endPoint[0]) / 2,
        (parsed.startPoint[1] + parsed.endPoint[1]) / 2,
        (parsed.startPoint[2] + parsed.endPoint[2]) / 2,
      ];

      // Same data-space sizing intent as the old vtkVectorText actor-scale
      // (distance * labelScale) -- VRTextBillboard takes that size directly
      // as worldHeight instead of scaling a unit-sized glyph mesh.
      const worldHeight = Math.max(parsed.distance * state.labelScale, 1e-6);

      const labelBillboard = new VRTextBillboard({
        text,
        worldHeight,
        color: rgbToHex(state.labelColor),
      });
      labelBillboard.attach(state.sceneObjects.renderer);
      if (!labelBillboard.getActor()) {
        // attach() never throws; it degrades to a null actor on failure.
        labelBillboard.dispose();
        return null;
      }

      labelBillboard.setPosition(...mid);
      // Never pickable -- see the setPickable(false) note on the line actor
      // above; a label must not be able to absorb a raycast either.
      labelBillboard.getActor().setPickable(false);
      // Face the camera once at creation. This feature has no per-frame
      // render hook; annotationUpdated tears down and rebuilds the whole
      // entry (see _addOrUpdateLine), which re-runs this and re-faces for
      // free. A label going edge-on as a desktop user orbits far away is
      // acceptable -- a full billboard frame loop is out of scope here.
      labelBillboard.faceCamera(state.sceneObjects.renderer);

      return { labelBillboard };
    } catch (err) {
      log.warn(`Failed to create measurement label: ${err.message}`);
      return null;
    }
  }

  _addOrUpdatePoint(state, annotation) {
    const parsed = parsePointAnnotation(annotation);
    if (!parsed) return;

    // Replace any existing actor for this id (covers annotationUpdated)
    this._removePoint(state, parsed.id);

    const { renderer, renderWindow } = state.sceneObjects;
    if (!renderer) return;

    try {
      const radius = this._computePointRadius(state);

      const sphereSource = vtkSphereSource.newInstance({
        center: parsed.position,
        radius,
        thetaResolution: 16,
        phiResolution: 16,
      });

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(sphereSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(...(parsed.color || state.pointColor));
      actor.getProperty().setLighting(false);
      // See the matching setPickable(false) note in _addOrUpdateLine -- a
      // persisted marker must not be a live raycast target either.
      actor.setPickable(false);

      renderer.addActor(actor);

      const entry = { actor, mapper, sphereSource, labelBillboard: null };

      // Optional floating text label just above the marker (skips the default
      // 'VR marker' placeholder text to avoid cluttering the scene).
      if (parsed.text && parsed.text !== "VR marker") {
        const label = this._createPointLabel(state, parsed, radius);
        if (label) {
          entry.labelBillboard = label.labelBillboard;
        }
      }

      state.points.set(parsed.id, entry);

      renderWindow?.render();
    } catch (err) {
      log.warn(`Failed to render point annotation ${parsed.id}: ${err.message}`);
    }
  }

  /**
   * Sphere radius scaled to the visible scene so markers stay legible across
   * datasets of different coordinate magnitudes. Never throws.
   *
   * Derived from the DATA actor's own bounds, not the renderer's. In VR the
   * same renderer also holds the spatial menu panel and (soon) a 1.15m-wide
   * keyboard panel, placed in data space at head-relative distances -- both
   * are visible props, so computeVisiblePropBounds() would fold them into
   * the diagonal and inflate every marker. Falls back to renderer bounds
   * when there's no data actor to measure (e.g. an empty scene), then to the
   * fixed default, exactly as before.
   */
  _computePointRadius(state) {
    try {
      const dataActor = state.sceneObjects.actor;
      let bounds =
        typeof dataActor?.getBounds === "function" ? dataActor.getBounds() : null;

      if (!(Array.isArray(bounds) && bounds.length === 6 && bounds[0] <= bounds[1])) {
        bounds = state.sceneObjects.renderer.computeVisiblePropBounds?.();
      }

      if (Array.isArray(bounds) && bounds.length === 6 && bounds[0] <= bounds[1]) {
        const dx = bounds[1] - bounds[0];
        const dy = bounds[3] - bounds[2];
        const dz = bounds[5] - bounds[4];
        const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (Number.isFinite(diagonal) && diagonal > 0) {
          return diagonal * state.pointRadiusFraction;
        }
      }
    } catch {
      // fall through to fallback
    }
    return state.pointRadiusFallback;
  }

  /**
   * Build a floating text label above a point marker. See _createLabel's
   * comment for why this is a VRTextBillboard and not vtkVectorText.
   * Returns null (never throws) if the label can't be built -- the marker
   * itself still renders.
   */
  _createPointLabel(state, parsed, radius) {
    try {
      // Same sizing intent as the old vtkVectorText actor-scale (radius) --
      // worldHeight replaces scaling a unit-sized glyph mesh.
      const worldHeight = Math.max(radius, 1e-6);

      const labelBillboard = new VRTextBillboard({
        // Author name, when the pin carries one, so OTHER participants see
        // who left it — not just the note text. VRTextBillboard is
        // single-line (Canvas2D fillText, no wrapping), hence one line.
        text: parsed.authorName ? `${parsed.text} — ${parsed.authorName}` : parsed.text,
        worldHeight,
        color: rgbToHex(state.labelColor),
      });
      labelBillboard.attach(state.sceneObjects.renderer);
      if (!labelBillboard.getActor()) {
        labelBillboard.dispose();
        return null;
      }

      labelBillboard.setPosition(
        parsed.position[0],
        parsed.position[1] + radius * 1.5,
        parsed.position[2]
      );
      labelBillboard.getActor().setPickable(false);
      labelBillboard.faceCamera(state.sceneObjects.renderer);

      return { labelBillboard };
    } catch (err) {
      log.warn(`Failed to create point annotation label: ${err.message}`);
      return null;
    }
  }

  _removePoint(state, annotationId) {
    const entry = state.points.get(annotationId);
    if (!entry) return;

    const { renderer, renderWindow } = state.sceneObjects;

    if (renderer && entry.actor) renderer.removeActor(entry.actor);

    entry.actor?.delete();
    entry.mapper?.delete();
    entry.sphereSource?.delete();
    // dispose() removes the billboard's own actor from whatever renderer it
    // attached to -- it must never be leaked into the renderer VR and
    // desktop share.
    entry.labelBillboard?.dispose();

    state.points.delete(annotationId);
    renderWindow?.render();
  }

  _removeLine(state, annotationId) {
    const entry = state.lines.get(annotationId);
    if (!entry) return;

    const { renderer, renderWindow } = state.sceneObjects;

    if (renderer && entry.actor) renderer.removeActor(entry.actor);

    entry.actor?.delete();
    entry.mapper?.delete();
    entry.lineSource?.delete();
    // See _removePoint's note: dispose() removes the billboard's actor from
    // its renderer -- must never be skipped or a label leaks permanently.
    entry.labelBillboard?.dispose();

    state.lines.delete(annotationId);
    renderWindow?.render();
  }

  _clearAllLines(state) {
    for (const annotationId of [...state.lines.keys()]) {
      this._removeLine(state, annotationId);
    }
    for (const annotationId of [...state.points.keys()]) {
      this._removePoint(state, annotationId);
    }
  }

  // ===========================================================================
  // TOOLS INTERFACE
  // ===========================================================================

  /**
   * Toggle visibility of all measurement lines for an instance.
   */
  setEnabled(instanceId, enabled) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;

    state.enabled = enabled;

    if (!enabled) {
      this._clearAllLines(state);
    } else if (state.datasetId) {
      this._loadExistingMeasurements(instanceId, state);
    }
  }

  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return [];

    return [
      {
        id: "annotation-lines-toggle",
        type: "toggle",
        icon: "ruler",
        label: state.enabled ? "Measurements On" : "Measurements",
        description: "Toggle visibility of VR-created measurement lines and point markers",
        active: state.enabled,
        onClick: () => this.setEnabled(instanceId, !state.enabled),
      },
    ];
  }
}

// Export singleton instance
export const vtkAnnotationLinesFeature = new VTKAnnotationLinesFeature();
export default vtkAnnotationLinesFeature;
