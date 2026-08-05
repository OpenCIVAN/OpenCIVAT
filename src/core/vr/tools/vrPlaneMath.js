// src/core/vr/tools/vrPlaneMath.js
//
// Pure geometry helpers shared by the VR clip-plane and slice-plane tools.
//
// These functions have NO dependency on WebXR, VTK, or React — they operate on
// plain arrays / quaternion objects so they can be unit-tested in isolation and
// reused across tools. The two coordinate spaces involved:
//
//   - XR space:   what WebXR poses report (metres, headset origin).
//   - Data space: the coordinate system the VTK scene is rendered in. The VR
//                 camera maps XR → data via `dataPos = xrPos / vrScale + vrOrigin`
//                 (see VTKInstanceHandler._updateCameraFromVRPose). Raycasts and
//                 clipping planes all live in data space, so controller poses
//                 must be converted before they can drive a clip/slice plane.
//
// Direction vectors (plane normals, controller forward) are affected only by
// rotation, never by the vrScale/vrOrigin offset — so they are rotated by the
// controller quaternion but NOT run through mapXRPointToData.

/**
 * Rotate a 3-vector by a unit quaternion using v' = q · v · q⁻¹.
 *
 * Hand-rolled (no gl-matrix dependency) so it stays trivially testable. The
 * quaternion is normalized defensively; a (near) zero-magnitude quaternion is
 * treated as identity and returns the input vector unchanged.
 *
 * @param {number[]} vec - [x, y, z]
 * @param {{x:number,y:number,z:number,w:number}} q - quaternion
 * @returns {number[]} rotated [x, y, z]
 */
export function rotateVectorByQuaternion(vec, q) {
  if (!q) return [...vec];

  let { x: qx, y: qy, z: qz, w: qw } = q;
  const mag = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
  if (mag < 1e-8) return [...vec];

  // Normalize so |q| = 1 (rotation quaternions must be unit length).
  qx /= mag;
  qy /= mag;
  qz /= mag;
  qw /= mag;

  const [vx, vy, vz] = vec;

  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  // v' = v + q.w * t + cross(q.xyz, t)
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/**
 * Rotate a 3-vector by `theta` radians about the world-up (+Y) axis.
 *
 * Used for the two-hand "handlebar" twist that spins the dataset on a
 * turntable: the data actor is yawed about its own centre (see
 * VTKInstanceHandler._applyVRDataRotation), and probe lookups undo that yaw to
 * query the un-rotated polydata (VTKInstanceHandler.probeDataVR). Right-handed:
 * a positive theta rotates +X toward -Z (e.g. yawRotateVector([1,0,0], PI/2)
 * = [0,0,-1]).
 *
 * @param {number[]} vec - [x, y, z]
 * @param {number} theta - radians
 * @returns {number[]} rotated [x, y, z]
 */
export function yawRotateVector(vec, theta) {
  const [x, y, z] = vec;
  if (!theta) return [x, y, z];
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c + z * s, y, -x * s + z * c];
}

/**
 * Build a flat 16-element column-major 4x4 matrix (gl-matrix / vtk.js
 * `mat4` layout — the same layout `actor.setUserMatrix()` expects) for
 * "translate to pivot, yaw by theta, translate back": `T(pivot) · Ry(theta) ·
 * T(-pivot)`. Applying this to a point gives exactly `pivot +
 * yawRotateVector(point - pivot, theta)` — i.e. it rotates a point about
 * `pivot` the same way `yawRotateVector` rotates a vector about the origin.
 *
 * Used as an actor's `UserMatrix` (see
 * VTKInstanceHandler._applyVRDataRotation) to spin the data actor about a
 * WORLD-space pivot as an OUTER wrapper around its existing Position/Origin/
 * Orientation/Scale — vtk.js's `computeMatrix()` applies UserMatrix outermost
 * (`world = UserMatrix · innerWorld`), so this is identity at theta=0
 * regardless of the actor's own transform, and never needs to know or touch
 * it. This is what makes it safe where directly mutating Origin/Orientation
 * was not: Origin is defined in the actor's LOCAL frame, so writing a
 * WORLD-space pivot into it corrupts the transform whenever the actor
 * already has any non-identity Orientation/Scale (e.g. from the desktop
 * Pan/Rotate/Scale tool or a collaborator's shared state).
 *
 * @param {number} theta - radians
 * @param {number[]} [pivot] - [x, y, z] world-space pivot point
 * @returns {number[]} flat 16-element column-major matrix
 */
export function buildYawPivotMatrix(theta, pivot = [0, 0, 0]) {
  const [cx, , cz] = pivot;
  const t = theta || 0;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const tx = cx * (1 - c) - cz * s;
  const tz = cz * (1 - c) + cx * s;
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    tx, 0, tz, 1,
  ];
}

/**
 * The controller "forward" axis in data space: the WebXR local -Z axis
 * ([0, 0, -1]) rotated by the controller's orientation quaternion. Used as the
 * clip/slice plane normal so the plane faces the way the user points.
 *
 * @param {{x:number,y:number,z:number,w:number}} orientation
 * @returns {number[]} unit-ish forward vector [x, y, z]
 */
export function controllerForward(orientation) {
  return rotateVectorByQuaternion([0, 0, -1], orientation);
}

/**
 * Map an XR-space point to data space: dataPos = xrPos / vrScale + vrOrigin.
 * Mirrors VTKInstanceHandler._updateCameraFromVRPose so plane origins land on
 * the same geometry the user sees.
 *
 * @param {{x:number,y:number,z:number}} xrPos
 * @param {number} vrScale
 * @param {number[]} vrOrigin - [x, y, z]
 * @returns {number[]} data-space [x, y, z]
 */
export function mapXRPointToData(xrPos, vrScale = 1.0, vrOrigin = [0, 0, 0]) {
  const s = vrScale || 1.0;
  const o = vrOrigin || [0, 0, 0];
  return [
    xrPos.x / s + (o[0] || 0),
    xrPos.y / s + (o[1] || 0),
    xrPos.z / s + (o[2] || 0),
  ];
}

/**
 * Quantize an arbitrary normal to the nearest principal axis (±X, ±Y, ±Z).
 * Returns both the unit axis vector and the axis index (0=X, 1=Y, 2=Z). Used to
 * snap a free-floating slice plane to an orthogonal slicing mode for image data.
 *
 * @param {number[]} normal - [x, y, z] (need not be normalized)
 * @returns {{ axis: number, sign: number, vector: number[] }}
 */
export function quantizeNormalToAxis(normal) {
  const [nx, ny, nz] = normal || [0, 1, 0];
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);

  let axis = 0;
  let comp = nx;
  let maxAbs = ax;
  if (ay > maxAbs) {
    axis = 1;
    comp = ny;
    maxAbs = ay;
  }
  if (az > maxAbs) {
    axis = 2;
    comp = nz;
  }

  const sign = comp < 0 ? -1 : 1;
  const vector = [0, 0, 0];
  vector[axis] = sign;
  return { axis, sign, vector };
}

/**
 * Build a column-major (gl-matrix layout) 4x4 that maps the local +Z axis onto
 * `normal` and translates to `origin`.
 *
 * Used to orient the clip tool's visible plane quad, which is authored in the
 * local XY plane (so its own normal is +Z). Applied via actor.setUserMatrix for
 * the same reason _applyVRDataRotation uses UserMatrix: it wraps outermost, is
 * identity-safe, and requires no knowledge of the actor's own transform.
 *
 * The tangent basis is arbitrary about the normal — only the plane's
 * orientation is meaningful, not its in-plane rotation — so the reference axis
 * is picked as whichever of +X/+Y is least parallel to the normal, avoiding a
 * degenerate cross product.
 *
 * @param {number[]} origin - [x,y,z] in data space
 * @param {number[]} normal - [x,y,z]; need not be unit length
 * @returns {number[]|null} 16-element column-major matrix, or null if `normal`
 *   is degenerate (zero-length or non-finite)
 */
export function buildPlaneFrameMatrix(origin, normal) {
  const o = Array.isArray(origin) ? origin : [0, 0, 0];
  if (!Array.isArray(normal) || normal.length < 3) return null;

  const len = Math.hypot(normal[0], normal[1], normal[2]);
  if (!Number.isFinite(len) || len < 1e-9) return null;
  const n = [normal[0] / len, normal[1] / len, normal[2] / len];

  // Least-parallel reference axis keeps the cross product well-conditioned.
  const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];

  // tangent = normalize(ref x n)
  let t = [
    ref[1] * n[2] - ref[2] * n[1],
    ref[2] * n[0] - ref[0] * n[2],
    ref[0] * n[1] - ref[1] * n[0],
  ];
  const tLen = Math.hypot(t[0], t[1], t[2]);
  if (!Number.isFinite(tLen) || tLen < 1e-9) return null;
  t = [t[0] / tLen, t[1] / tLen, t[2] / tLen];

  // bitangent = n x tangent (already unit: both operands are unit and normal)
  const b = [
    n[1] * t[2] - n[2] * t[1],
    n[2] * t[0] - n[0] * t[2],
    n[0] * t[1] - n[1] * t[0],
  ];

  // Columns are the images of local X, Y, Z; translation lives at 12..14.
  return [
    t[0], t[1], t[2], 0,
    b[0], b[1], b[2], 0,
    n[0], n[1], n[2], 0,
    o[0] || 0, o[1] || 0, o[2] || 0, 1,
  ];
}
