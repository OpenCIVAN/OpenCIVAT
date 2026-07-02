// src/ui/react/components/molecules/RenderConsistencyBadge/RenderConsistencyBadge.jsx
// DR2: Render consistency status indicator for a ViewConfiguration.
//
// Runs real capability detection and dataset hash resolution on mount.
// Non-blocking — displays UNKNOWN while async checks run.
// Non-invasive — informational only; never blocks visualization.

import React, { useState, useEffect, useCallback } from 'react';
import { Chip } from '@UI/react/components/atoms/Chip';
import {
  buildClientCapabilityProfile,
  compareRenderCapabilities,
  CONSISTENCY_STATUS,
} from '@Core/capabilities/ClientCapabilityProfile.js';
import { resolveDatasetRefsForView } from '@Services/DatasetIdentityService.js';

// ─── Status display config ────────────────────────────────────────────────────

const STATUS_CONFIG = {
  [CONSISTENCY_STATUS.CONSISTENT]: {
    label:   'Verified',
    color:   '#22c55e', // green
    icon:    'check',
    tooltip: 'Dataset hash verified — view should render identically across clients',
  },
  [CONSISTENCY_STATUS.COMPATIBLE_UNVERIFIED]: {
    label:   'Unverified',
    color:   '#eab308', // yellow
    icon:    'warning',
    tooltip: 'No dataset hash available — cannot confirm byte-identical data across clients',
  },
  [CONSISTENCY_STATUS.DEGRADED]: {
    label:   'Degraded',
    color:   '#f97316', // orange
    icon:    'warning',
    tooltip: 'Optional feature unavailable on this client — view may render with reduced fidelity',
  },
  [CONSISTENCY_STATUS.INCOMPATIBLE]: {
    label:   'Incompatible',
    color:   '#ef4444', // red
    icon:    'error',
    tooltip: 'Dataset missing, hash mismatch, or unsupported format — visualization may be misleading',
  },
  [CONSISTENCY_STATUS.UNKNOWN]: {
    label:   'Checking…',
    color:   '#6b7280', // gray
    icon:    null,
    tooltip: 'Determining render consistency…',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * RenderConsistencyBadge
 *
 * Displays the rendering consistency status of a ViewConfiguration on this client.
 * Checks run asynchronously after mount; shows "Checking…" until done.
 *
 * @param {object} props
 * @param {object} props.viewConfig     - ViewConfiguration instance or plain object
 * @param {object} props.datasetManager - DatasetManager instance with getDataset()
 * @param {string} [props.className]    - Optional extra CSS class
 * @param {string} [props.renderModeOverride] - Pass 'remote' if RemoteRenderClient connected
 */
export function RenderConsistencyBadge({ viewConfig, datasetManager, className, renderModeOverride }) {
  const [status,  setStatus]  = useState(CONSISTENCY_STATUS.UNKNOWN);
  const [tooltip, setTooltip] = useState(STATUS_CONFIG[CONSISTENCY_STATUS.UNKNOWN].tooltip);

  const runChecks = useCallback(async () => {
    if (!viewConfig || !datasetManager) return;

    try {
      const profile = buildClientCapabilityProfile(
        renderModeOverride ? { renderMode: renderModeOverride } : {}
      );

      const resolution = await resolveDatasetRefsForView(viewConfig, datasetManager);
      const result     = compareRenderCapabilities(viewConfig, resolution, profile);

      // Build an informative tooltip for degraded/incompatible
      let detail = STATUS_CONFIG[result]?.tooltip ?? '';
      if (result === CONSISTENCY_STATUS.INCOMPATIBLE) {
        for (const [id, info] of resolution) {
          if (info.message) { detail = info.message; break; }
        }
      }

      setStatus(result);
      setTooltip(detail);
    } catch {
      setStatus(CONSISTENCY_STATUS.UNKNOWN);
    }
  }, [viewConfig, datasetManager, renderModeOverride]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[CONSISTENCY_STATUS.UNKNOWN];

  return (
    <span
      title={tooltip}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Chip
        label={cfg.label}
        icon={cfg.icon}
        color={cfg.color}
        size="sm"
      />
    </span>
  );
}

export default RenderConsistencyBadge;
