// src/core/vr/environment/VREnvironment.js
//
// Minimal spatial environment around the dataset in VR: a physically-anchored
// floor (grid + solid backing), a soft cylindrical wall/horizon so the space
// reads as a bright room rather than a void, a gradient background, and a
// few cardinal markers for depth reference. VTK-actor-based, like everything
// else in the VR scene (avatars, controllers, spatial UI) — no three.js.
//
// All actors are built ONCE in physical (metre) units and repositioned via
// VTK's actor transform (position + uniform scale) on every vrScale/vrOrigin
// change, rather than rebuilding geometry. This works because the VR camera
// mapping is itself an affine transform: dataPos = xrPos/vrScale + vrOrigin
// (see VTKInstanceHandler._updateCameraFromVRPose) — setting
// actor.setPosition(...vrOrigin) and actor.setScale(1/vrScale) reproduces
// that exact mapping for any point built in physical-unit local coordinates.

import { vr as log } from "@Utils/logger.js";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource";
import vtkCubeSource from "@kitware/vtk.js/Filters/Sources/CubeSource";
import vtkCylinderSource from "@kitware/vtk.js/Filters/Sources/CylinderSource";

const FLOOR_RADIUS_M = 10; // physical metres
const FLOOR_DIVISIONS = 20; // 1m cells across the full 20m span
const FLOOR_GRID_COLOR = [0.55, 0.6, 0.68];
const FLOOR_GRID_OPACITY = 0.8;

// Solid backing plane under the wireframe grid — same footprint, offset
// slightly below (in physical units, pre-transform) to avoid z-fighting.
const FLOOR_SOLID_Y_M = -0.005;
const FLOOR_SOLID_COLOR = [0.88, 0.88, 0.9];

// Large open-ended cylinder standing in for walls/horizon so the VR space
// reads as a room instead of a void. Capping is turned off (no top/bottom
// disks) since it's only ever seen from the inside.
const WALL_RADIUS_M = 12;
const WALL_HEIGHT_M = 4;
const WALL_RESOLUTION = 48;
const WALL_COLOR = [0.9, 0.91, 0.94];

const MARKER_DISTANCE_M = 8;
const MARKER_WIDTH_M = 0.15;
const MARKER_HEIGHT_M = 0.5;
const MARKER_COLOR = [0.2, 0.35, 0.5];

// Bright sky-to-floor gradient so the VR space reads as a lit room rather
// than a void. Falls back to a flat average color on VTK.js builds without
// gradient background support (see VTKSceneFeature._applyBackground for the
// same fallback pattern used on the desktop scene).
//
// BG_BOTTOM must stay exactly in sync with the XR frame loop's WebGL
// clearColor (see VR_CLEAR_COLOR below) — the XR compositor clears to that
// color between frames, so a mismatch would show as a background "seam".
const BG_TOP = [0.82, 0.87, 0.93];
const BG_BOTTOM = [0.93, 0.92, 0.9];

// Exported so the XR render loop can set gl.clearColor(...VR_CLEAR_COLOR, 1.0)
// to match BG_BOTTOM exactly. Keep these two in lockstep if either changes.
export const VR_CLEAR_COLOR = [0.93, 0.92, 0.9];

// Single-flip switch for the background strategy. The gradient (sky→floor)
// reads best on desktop and in most headsets, but some XR OpenGL paths have
// been observed to drop the gradient second-color and show black under the
// custom per-eye projection. This was reported on Oculus Quest 2 (the surround
// rendered black), so it's set to `false` for a guaranteed-bright FLAT
// BG_BOTTOM fill (the same colour the XR compositor clears to) — a black-proof
// surround, trading only the subtle sky gradient. See _applyBackground below.
const USE_GRADIENT_BG = false;

export class VREnvironment {
  constructor() {
    this._renderer = null;
    this._floorGridActor = null;
    this._floorSolidActor = null;
    this._wallActor = null;
    this._markerActors = [];
    // World-anchor state (see setWorldAnchor). _refPoint is the data-space
    // point the floor lattice is phase-anchored to; _markerAnchors are fixed
    // data-space positions for the cardinal posts.
    this._refPoint = null;
    this._markerAnchors = null;
    this._lastSnap = null;
    this._savedBackground = null;
    this._lastVrScale = null;
    this._lastVrOrigin = null;
  }

  /**
   * @param {Object} renderer - vtkRenderer for the VR-active instance
   * @param {Object} vrContext - current VR context (for initial placement)
   */
  initialize(renderer, vrContext) {
    if (!renderer) return;
    // Idempotency guard: if a previous VR session's teardown ever failed to
    // call dispose() (e.g. an earlier sub-manager's dispose() threw before
    // leaveSession() reached this one), stale actors would still be sitting
    // in this same long-lived renderer. Disposing first guarantees at most
    // one set of environment actors ever exists, self-healing any leak
    // instead of stacking duplicates on top of it.
    if (this._renderer) this.dispose();
    this._renderer = renderer;

    this._floorSolidActor = this._createFloorSolid();
    renderer.addActor(this._floorSolidActor);

    this._floorGridActor = this._createFloorGrid();
    renderer.addActor(this._floorGridActor);

    this._wallActor = this._createWalls();
    renderer.addActor(this._wallActor);

    this._markerActors = this._createCardinalMarkers();
    for (const actor of this._markerActors) {
      renderer.addActor(actor);
    }

    this._applyBackground(renderer);

    this.updateTransform(vrContext?.vrScale || 1.0, vrContext?.vrOrigin || [0, 0, 0]);

    log.debug("VR environment initialized");
  }

  /**
   * Reposition/rescale all environment actors so they stay anchored to the
   * physical floor as the user teleports/scales. No-ops if scale/origin
   * haven't changed since the last call (cheap per-frame dirty-check).
   *
   * @param {number} vrScale
   * @param {number[]} vrOrigin - [x, y, z] data-space offset
   */
  updateTransform(vrScale, vrOrigin) {
    if (!this._renderer) return;

    const scale = vrScale || 1.0;
    const origin = vrOrigin || [0, 0, 0];

    // The floor's PHASE is world-locked, so the dirty-check has to run against
    // the snapped value, not the raw origin — see below.
    const snapped = this._snapToLattice(origin, scale);

    if (
      this._lastVrScale === scale &&
      this._lastSnap &&
      this._lastSnap[0] === snapped[0] &&
      this._lastSnap[2] === snapped[2] &&
      this._lastVrOrigin &&
      this._lastVrOrigin[0] === origin[0] &&
      this._lastVrOrigin[1] === origin[1] &&
      this._lastVrOrigin[2] === origin[2]
    ) {
      return;
    }
    this._lastVrScale = scale;
    this._lastVrOrigin = [origin[0], origin[1], origin[2]];
    this._lastSnap = snapped;

    const invScale = 1 / scale;

    // --- Floor: world-locked PHASE, user-locked extent ---------------------
    //
    // This is what makes stick locomotion read as "I moved" rather than "the
    // data slid past me". Previously every environment actor was placed at
    // vrOrigin and scaled by 1/vrScale, which EXACTLY cancels the camera map
    // (a vertex at local metre L lands at physical xr = L identically) — the
    // grid was welded to the user's own space, so travelling produced zero
    // motion parallax and the brain attributed the relative motion to the
    // dataset instead.
    //
    // Fully world-locking the floor is worse: its cell size would then scale
    // with the zoom, so at high zoom you get a featureless plane with no
    // near-field detail at all. Instead keep the slab's physical size and 1 m
    // cell size constant, and world-lock only its phase. Because setScale(1/s)
    // makes one local unit exactly one physical metre at any zoom, snapping
    // the slab's data-space position to the 1-physical-metre lattice pins
    // every grid LINE to a fixed data point while the slab itself stays within
    // half a cell of the user. Lines stream past correctly; cells stay 1 m.
    for (const actor of [this._floorSolidActor, this._floorGridActor]) {
      if (!actor) continue;
      actor.setPosition(snapped[0], origin[1], snapped[2]);
      actor.setScale(invScale, invScale, invScale);
    }

    // --- Cardinal markers: fully world-locked ------------------------------
    // These are visibly distinct posts, not background, so leaving them
    // user-locked would directly contradict the floor's parallax. Pinned to
    // fixed data-space points, scaled for constant apparent size.
    for (let i = 0; i < this._markerActors.length; i++) {
      const actor = this._markerActors[i];
      const anchor = this._markerAnchors?.[i];
      if (!actor) continue;
      if (anchor) {
        actor.setPosition(anchor[0], origin[1], anchor[2]);
      } else {
        actor.setPosition(origin[0], origin[1], origin[2]);
      }
      actor.setScale(invScale, invScale, invScale);
    }

    // --- Walls: deliberately user-locked -----------------------------------
    // An unlit, untextured, single-colour cylinder — visually indistinguishable
    // from the background. A static surround REDUCES vection, so keeping it
    // pinned to the user is a comfort benefit rather than a conflicting cue.
    if (this._wallActor) {
      this._wallActor.setPosition(origin[0], origin[1], origin[2]);
      this._wallActor.setScale(invScale, invScale, invScale);
    }
  }

  /**
   * Snap a data-space origin to the 1-physical-metre lattice, anchored at the
   * session's reference point. Returns [x, y, z] with y passed through.
   * @private
   */
  _snapToLattice(origin, scale) {
    const rx = this._refPoint ? this._refPoint[0] : 0;
    const rz = this._refPoint ? this._refPoint[2] : 0;
    return [
      rx + Math.round((origin[0] - rx) * scale) / scale,
      origin[1],
      rz + Math.round((origin[2] - rz) * scale) / scale,
    ];
  }

  /**
   * Anchor the world-locked environment pieces to the dataset's frame.
   * Called once the dataset's real placement is known (VRExplorationManager's
   * pose-relative pass) and again whenever the data bounds change.
   *
   * @param {{refPoint?: number[], markerAnchors?: number[][]}} anchor
   */
  setWorldAnchor(anchor = {}) {
    if (Array.isArray(anchor.refPoint)) this._refPoint = [...anchor.refPoint];
    if (Array.isArray(anchor.markerAnchors)) {
      this._markerAnchors = anchor.markerAnchors.map((p) => [...p]);
    }
    // Force the next updateTransform to reposition rather than dirty-check out.
    this._lastSnap = null;
    this._lastVrOrigin = null;
  }

  dispose() {
    if (this._renderer) {
      if (this._floorSolidActor) this._renderer.removeActor(this._floorSolidActor);
      if (this._floorGridActor) this._renderer.removeActor(this._floorGridActor);
      if (this._wallActor) this._renderer.removeActor(this._wallActor);
      for (const actor of this._markerActors) {
        this._renderer.removeActor(actor);
      }
      if (this._savedBackground) {
        this._renderer.setBackground(...this._savedBackground);
      }
      if (typeof this._renderer.setGradientBackground === "function") {
        this._renderer.setGradientBackground(false);
      }
    }

    this._floorSolidActor?.delete();
    this._floorGridActor?.delete();
    this._wallActor?.delete();
    for (const actor of this._markerActors) {
      actor?.delete();
    }

    this._renderer = null;
    this._floorSolidActor = null;
    this._floorGridActor = null;
    this._wallActor = null;
    this._markerActors = [];
    this._savedBackground = null;
    this._lastVrScale = null;
    this._lastVrOrigin = null;

    log.debug("VR environment disposed");
  }

  /**
   * All environment actors currently registered — the single collection
   * `updateTransform` repositions/rescales and `dispose` tears down.
   * @private
   */
  _allActors() {
    const actors = [];
    if (this._floorSolidActor) actors.push(this._floorSolidActor);
    if (this._floorGridActor) actors.push(this._floorGridActor);
    if (this._wallActor) actors.push(this._wallActor);
    actors.push(...this._markerActors);
    return actors;
  }

  /**
   * Solid backing plane under the wireframe grid — same footprint, offset
   * slightly below in physical units to avoid z-fighting with the grid.
   * @private
   */
  _createFloorSolid() {
    const planeSource = vtkPlaneSource.newInstance();
    planeSource.setOrigin(-FLOOR_RADIUS_M, FLOOR_SOLID_Y_M, -FLOOR_RADIUS_M);
    planeSource.setPoint1(FLOOR_RADIUS_M, FLOOR_SOLID_Y_M, -FLOOR_RADIUS_M);
    planeSource.setPoint2(-FLOOR_RADIUS_M, FLOOR_SOLID_Y_M, FLOOR_RADIUS_M);

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(planeSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.setPickable(false); // never intercept teleport/tool raycasts

    const property = actor.getProperty();
    property.setRepresentation(2); // surface
    property.setColor(...FLOOR_SOLID_COLOR);
    property.setOpacity(1.0);
    property.setLighting(false);

    return actor;
  }

  /**
   * Circular-ish floor grid: a wireframe plane spanning physical
   * [-FLOOR_RADIUS_M, FLOOR_RADIUS_M] on X/Z, at physical y=0.
   * @private
   */
  _createFloorGrid() {
    const planeSource = vtkPlaneSource.newInstance();
    planeSource.setXResolution(FLOOR_DIVISIONS);
    planeSource.setYResolution(FLOOR_DIVISIONS);
    planeSource.setOrigin(-FLOOR_RADIUS_M, 0, -FLOOR_RADIUS_M);
    planeSource.setPoint1(FLOOR_RADIUS_M, 0, -FLOOR_RADIUS_M);
    planeSource.setPoint2(-FLOOR_RADIUS_M, 0, FLOOR_RADIUS_M);

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(planeSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.setPickable(false); // never intercept teleport/tool raycasts

    const property = actor.getProperty();
    property.setRepresentation(1); // wireframe
    property.setColor(...FLOOR_GRID_COLOR);
    property.setOpacity(FLOOR_GRID_OPACITY);
    property.setLighting(false);

    return actor;
  }

  /**
   * Large open-ended cylinder standing in for walls/horizon so the space
   * reads as a bright room rather than an infinite void. Capping is
   * disabled — only the inside of the side wall is ever visible.
   * @private
   */
  _createWalls() {
    const cylinderSource = vtkCylinderSource.newInstance();
    cylinderSource.setRadius(WALL_RADIUS_M);
    cylinderSource.setHeight(WALL_HEIGHT_M);
    cylinderSource.setResolution(WALL_RESOLUTION);
    cylinderSource.setCapping(false);
    cylinderSource.setCenter(0, WALL_HEIGHT_M / 2, 0);

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(cylinderSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    actor.setPickable(false); // never intercept teleport/tool raycasts

    const property = actor.getProperty();
    property.setRepresentation(2); // surface
    property.setColor(...WALL_COLOR);
    property.setOpacity(1.0);
    property.setLighting(false);
    // Backface/frontface culling stay off (VTK default) so the wall renders
    // whether viewed from inside the room or, e.g., briefly from outside
    // during teleport transitions.

    return actor;
  }

  /**
   * Four small posts at N/E/S/W of the physical origin — cheap depth
   * reference, not a decorated room.
   * @private
   */
  _createCardinalMarkers() {
    const offsets = [
      [MARKER_DISTANCE_M, 0],
      [-MARKER_DISTANCE_M, 0],
      [0, MARKER_DISTANCE_M],
      [0, -MARKER_DISTANCE_M],
    ];

    return offsets.map(([x, z]) => {
      const cubeSource = vtkCubeSource.newInstance();
      cubeSource.setXLength(MARKER_WIDTH_M);
      cubeSource.setYLength(MARKER_HEIGHT_M);
      cubeSource.setZLength(MARKER_WIDTH_M);
      cubeSource.setCenter(x, MARKER_HEIGHT_M / 2, z);

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(cubeSource.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.setPickable(false);

      const property = actor.getProperty();
      property.setColor(...MARKER_COLOR);
      property.setLighting(false);

      return actor;
    });
  }

  /**
   * Set the VR renderer background so the surround never reads as black.
   *
   * Two safe paths, selected by the USE_GRADIENT_BG flag at the top of this
   * file plus a runtime capability check:
   *   1. Gradient (BG_BOTTOM→BG_TOP) when enabled AND the build supports
   *      setGradientBackground — the nicer sky→floor look.
   *   2. FLAT BG_BOTTOM fill otherwise — the guaranteed-bright fallback. This
   *      exact color also matches VR_CLEAR_COLOR / the XR compositor clear, so
   *      even if the renderer's own erase pass is skipped the eye viewport
   *      still shows a bright surround, never black.
   *
   * Both paths set a solid flat BG_BOTTOM base first, so a failed/ignored
   * gradient degrades to bright rather than to the renderer's default black.
   * @private
   */
  _applyBackground(renderer) {
    this._savedBackground =
      typeof renderer.getBackground === "function" ? renderer.getBackground() : null;

    // Bright flat base in all cases — this is the black-proof floor.
    renderer.setBackground(...BG_BOTTOM);

    const supportsGradient =
      USE_GRADIENT_BG && typeof renderer.setGradientBackground === "function";
    if (supportsGradient) {
      renderer.setBackground2(...BG_TOP);
      renderer.setGradientBackground(true);
    } else if (typeof renderer.setGradientBackground === "function") {
      // Explicitly disable any gradient so only the flat BG_BOTTOM shows.
      renderer.setGradientBackground(false);
    }
  }
}

export const vrEnvironment = new VREnvironment();
export default vrEnvironment;
