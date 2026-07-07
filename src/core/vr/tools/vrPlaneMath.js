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
