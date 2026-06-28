// src/services/DatasetIdentityService.js
// DR2: Per-dataset identity resolution and content-hash verification.
//
// LAYER BOUNDARY: Service layer. Depends on DatasetManager API only.
// No React. No VTK runtime objects. Results feed into ClientCapabilityProfile
// for consistency status determination.

/** Status of a single dataset reference resolved against local manager state. */
export const DATASET_STATUS = Object.freeze({
  VERIFIED:      'verified',      // contentHash present and matched local dataset hash
  UNVERIFIED:    'unverified',    // no contentHash in ref or no hash on local dataset
  MISSING:       'missing',       // dataset not registered in datasetManager
  HASH_MISMATCH: 'hash_mismatch', // contentHash present but does not match local hash
  UNSUPPORTED:   'unsupported',   // format not supported on this client
});

const SUPPORTED_FORMATS = new Set(['vtp', 'vti', 'vtu', 'vtk', 'vtkjs', 'stl', 'obj', 'ply']);

/**
 * Resolve each datasetRef in a ViewConfiguration against the local DatasetManager.
 *
 * Returns a Map so callers can look up per-dataset status and pass to
 * compareRenderCapabilities() for overall consistency determination.
 *
 * @param {object} viewConfig     - Normalized ViewConfiguration (plain object or instance)
 * @param {object} datasetManager - DatasetManager instance with getDataset(id) method
 * @returns {Promise<Map<string, { status: string, dataset?: object, message?: string }>>}
 */
export async function resolveDatasetRefsForView(viewConfig, datasetManager) {
  const result = new Map();

  if (!viewConfig?.datasetRefs?.length || !datasetManager) return result;

  for (const ref of viewConfig.datasetRefs) {
    const { datasetId, contentHash, format } = ref;

    const dataset = datasetManager.getDataset(datasetId);
    if (!dataset) {
      result.set(datasetId, {
        status:  DATASET_STATUS.MISSING,
        message: `Dataset "${datasetId}" not found in local manager`,
      });
      continue;
    }

    if (format && !SUPPORTED_FORMATS.has(format)) {
      result.set(datasetId, {
        status:  DATASET_STATUS.UNSUPPORTED,
        dataset,
        message: `Format "${format}" is not supported on this client`,
      });
      continue;
    }

    if (!contentHash || !dataset.hash) {
      result.set(datasetId, { status: DATASET_STATUS.UNVERIFIED, dataset });
      continue;
    }

    if (contentHash !== dataset.hash) {
      result.set(datasetId, {
        status:  DATASET_STATUS.HASH_MISMATCH,
        dataset,
        message: 'Content hash in ViewConfiguration does not match local dataset hash',
      });
      continue;
    }

    result.set(datasetId, { status: DATASET_STATUS.VERIFIED, dataset });
  }

  return result;
}

/**
 * Roll up a resolution Map into the single worst-case dataset status.
 * Use this when you need one value for display or routing.
 *
 * Priority (worst first): MISSING > HASH_MISMATCH > UNSUPPORTED > UNVERIFIED > VERIFIED
 *
 * @param {Map} resolutionMap - From resolveDatasetRefsForView()
 * @returns {string} One of DATASET_STATUS values
 */
export function overallDatasetStatus(resolutionMap) {
  if (!resolutionMap?.size) return DATASET_STATUS.UNVERIFIED;

  const statuses = [...resolutionMap.values()].map(r => r.status);

  if (statuses.includes(DATASET_STATUS.MISSING))       return DATASET_STATUS.MISSING;
  if (statuses.includes(DATASET_STATUS.HASH_MISMATCH)) return DATASET_STATUS.HASH_MISMATCH;
  if (statuses.includes(DATASET_STATUS.UNSUPPORTED))   return DATASET_STATUS.UNSUPPORTED;
  if (statuses.includes(DATASET_STATUS.UNVERIFIED))    return DATASET_STATUS.UNVERIFIED;
  if (statuses.every(s => s === DATASET_STATUS.VERIFIED)) return DATASET_STATUS.VERIFIED;

  return DATASET_STATUS.UNVERIFIED;
}
