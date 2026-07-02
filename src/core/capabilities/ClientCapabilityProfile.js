// src/core/capabilities/ClientCapabilityProfile.js
// DR2: Client rendering capability detection and consistency comparison.
//
// LAYER BOUNDARY: Pure module. Uses feature detection, not UA sniffing.
// No React imports. No manager imports. Safe to import from any layer.
//
// Typical usage:
//   const profile    = buildClientCapabilityProfile();
//   const resolution = await resolveDatasetRefsForView(viewConfig, datasetManager);
//   const status     = compareRenderCapabilities(viewConfig, resolution, profile);

/**
 * Rendering consistency status between a ViewConfiguration and this client.
 *
 *   CONSISTENT            — dataset hash verified, all required features supported
 *   COMPATIBLE_UNVERIFIED — no hash available to verify, but features are compatible
 *   DEGRADED              — optional feature unavailable; view still loads but reduced
 *   INCOMPATIBLE          — critical mismatch (missing dataset, hash mismatch, unsupported format)
 *   UNKNOWN               — insufficient information to determine status
 */
export const CONSISTENCY_STATUS = Object.freeze({
  CONSISTENT:            'consistent',
  COMPATIBLE_UNVERIFIED: 'compatible_unverified',
  DEGRADED:              'degraded',
  INCOMPATIBLE:          'incompatible',
  UNKNOWN:               'unknown',
});

/** Formats the VTK.js handler supports locally. Keep in sync with manifest.ts. */
const LOCAL_SUPPORTED_FORMATS = Object.freeze([
  'vtp', 'vti', 'vtu', 'vtk', 'vtkjs', 'stl', 'obj', 'ply',
]);

/**
 * Build a capability profile for the current browser/client.
 *
 * Uses feature detection (canvas.getContext, navigator.xr, etc.) rather
 * than user-agent strings. The caller may override `renderMode` if the
 * RemoteRenderClient is confirmed connected.
 *
 * @param {object} [overrides] - Optional overrides (e.g. { renderMode: 'remote' })
 * @returns {{
 *   hasWebGL: boolean,
 *   hasWebGL2: boolean,
 *   hasWebXR: boolean,
 *   hasOffscreenCanvas: boolean,
 *   renderMode: 'local'|'remote'|'auto',
 *   deviceClass: 'desktop'|'hmd'|'server',
 *   supportedFormats: string[],
 * }}
 */
export function buildClientCapabilityProfile(overrides = {}) {
  let hasWebGL  = false;
  let hasWebGL2 = false;
  try {
    const canvas = document.createElement('canvas');
    hasWebGL  = !!canvas.getContext('webgl');
    hasWebGL2 = !!canvas.getContext('webgl2');
  } catch {
    // Non-browser environment (SSR, Node test) — leave false
  }

  const hasWebXR         = !!navigator?.xr;
  const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const renderMode       = overrides.renderMode ?? 'local';
  const deviceClass      = overrides.deviceClass ?? (hasWebXR ? 'hmd' : 'desktop');

  return {
    hasWebGL,
    hasWebGL2,
    hasWebXR,
    hasOffscreenCanvas,
    renderMode,
    deviceClass,
    supportedFormats: [...LOCAL_SUPPORTED_FORMATS],
  };
}

/**
 * Compare a ViewConfiguration's requirements against a client capability profile.
 *
 * @param {object}     viewConfig        - Normalized ViewConfiguration (plain object or instance)
 * @param {Map|null}   datasetResolution - From resolveDatasetRefsForView(); null → treat as unresolved
 * @param {object}     clientProfile     - From buildClientCapabilityProfile()
 * @returns {string}   One of CONSISTENCY_STATUS values
 */
export function compareRenderCapabilities(viewConfig, datasetResolution, clientProfile) {
  if (!viewConfig || !clientProfile) return CONSISTENCY_STATUS.UNKNOWN;

  const refs = viewConfig.datasetRefs;
  if (!Array.isArray(refs) || refs.length === 0) return CONSISTENCY_STATUS.UNKNOWN;

  // --- Dataset identity checks ---
  for (const ref of refs) {
    const resolution = datasetResolution?.get(ref.datasetId);

    if (!resolution || resolution.status === 'missing') {
      return CONSISTENCY_STATUS.INCOMPATIBLE;
    }
    if (resolution.status === 'hash_mismatch') {
      return CONSISTENCY_STATUS.INCOMPATIBLE;
    }
    if (ref.format && !clientProfile.supportedFormats.includes(ref.format)) {
      return CONSISTENCY_STATUS.INCOMPATIBLE;
    }
  }

  // --- Feature compatibility checks ---
  const compat = viewConfig.compatibility ?? {};

  if (compat.requiresWebGL2 && !clientProfile.hasWebGL2) {
    return CONSISTENCY_STATUS.INCOMPATIBLE;
  }
  if (compat.requiresWebXR && !clientProfile.hasWebXR) {
    return CONSISTENCY_STATUS.DEGRADED;
  }
  if (compat.requiresLocalRender && clientProfile.renderMode !== 'local') {
    return CONSISTENCY_STATUS.DEGRADED;
  }

  // --- Verified vs unverified ---
  const hasAnyHash  = refs.some(r => r.contentHash);
  const allVerified = hasAnyHash && refs.every(r => {
    if (!r.contentHash) return false;
    const res = datasetResolution?.get(r.datasetId);
    return res?.status === 'verified';
  });

  return allVerified ? CONSISTENCY_STATUS.CONSISTENT : CONSISTENCY_STATUS.COMPATIBLE_UNVERIFIED;
}
