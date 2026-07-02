// src/ui/react/components/organisms/ConflictResolutionDialog.jsx
// Generic persistent-entity conflict dialog.
//
// Triggers on the window event 'cia:sync-conflict' dispatched by any manager
// that detects a 409 Conflict response from the server.
//
// The dialog is configured per-entity via CONFLICT_STRATEGIES (src/utils/conflictStrategies.js).
// Entity types not listed in CONFLICT_STRATEGIES are silently ignored.
//
// Resolution options:
//   1. Use server version  — discard local edits, adopt server state
//   2. Keep mine (overwrite) — force-push local state after confirmation
//   3. Save mine as copy   — available only when strategy.supportsDuplication is true
//   4. Auto-merge           — conservative: path-disjoint AND all fields in strategy.safeFields

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@UI/react/components/atoms/Button';
import { diff, canAutoMergeSafe } from '@Utils/jsonPatch.js';
import { CONFLICT_STRATEGIES } from '@Utils/conflictStrategies.js';

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(isoString) {
  if (!isoString) return 'unknown time';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatUserLabel(conflict) {
  const by = conflict?.updatedBy;
  return by ? `user ${by.slice(0, 8)}…` : 'another user';
}

function summariseDiff(ops) {
  if (!ops || ops.length === 0) return 'No detected changes';
  const paths = [...new Set(ops.map((o) => o.path.split('/')[1]).filter(Boolean))];
  if (paths.length <= 3) return `Changed: ${paths.join(', ')}`;
  return `Changed ${paths.length} fields including: ${paths.slice(0, 3).join(', ')}…`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConflictResolutionDialog() {
  const [conflict, setConflict] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [resolving, setResolving] = useState(false);
  const resolverRef = useRef(null);

  // Listen for conflict events from any manager
  useEffect(() => {
    function onConflict(e) {
      const detail = e.detail;
      if (!detail || !detail.entityType) return;

      const s = CONFLICT_STRATEGIES[detail.entityType];
      if (!s) {
        // Unknown entity type — log and ignore; don't show dialog for unknown types
        console.warn(`[ConflictResolutionDialog] No strategy for entityType: ${detail.entityType}`);
        return;
      }

      setConflict(detail);
      setStrategy(s);
      setConfirmOverwrite(false);
      setResolving(false);

      // Look up the manager via window.CIA using the strategy's resolverId
      try {
        const manager = window.CIA?.[s.resolverId];
        if (manager) {
          resolverRef.current = {
            useServer: () => manager.resolveConflictUseServer(detail.entityId),
            overwrite: () => manager.resolveConflictOverwrite(detail.entityId),
            saveAsCopy: s.supportsDuplication && manager.resolveConflictSaveAsCopy
              ? () => manager.resolveConflictSaveAsCopy(detail.entityId)
              : null,
          };
        }
      } catch (_) {
        resolverRef.current = null;
      }
    }

    window.addEventListener('cia:sync-conflict', onConflict);
    return () => window.removeEventListener('cia:sync-conflict', onConflict);
  }, []);

  const dismiss = useCallback(() => {
    setConflict(null);
    setStrategy(null);
    setConfirmOverwrite(false);
    setResolving(false);
    resolverRef.current = null;
  }, []);

  const handleUseServer = useCallback(async () => {
    if (!resolverRef.current) return;
    setResolving(true);
    resolverRef.current.useServer();
    dismiss();
  }, [dismiss]);

  const handleOverwrite = useCallback(async () => {
    if (!confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    if (!resolverRef.current) return;
    setResolving(true);
    await resolverRef.current.overwrite();
    dismiss();
  }, [confirmOverwrite, dismiss]);

  const handleSaveAsCopy = useCallback(async () => {
    if (!resolverRef.current?.saveAsCopy) return;
    setResolving(true);
    await resolverRef.current.saveAsCopy();
    dismiss();
  }, [dismiss]);

  const handleMerge = useCallback(async () => {
    if (!conflict || !strategy) return;
    const manager = window.CIA?.[strategy.resolverId];
    if (!manager) return;

    setResolving(true);
    try {
      const base = conflict.serverObject || {};
      const clientObj = conflict.clientObject || {};
      const serverObj = conflict.serverObject || {};

      const patchToServer = diff(base, serverObj);
      const patchToClient = diff(base, clientObj);

      if (!canAutoMergeSafe(patchToServer, patchToClient, strategy.safeFields)) {
        setResolving(false);
        setConfirmOverwrite(true);
        return;
      }

      const { merge } = await import('@Utils/jsonPatch.js');
      const merged = merge(base, patchToServer, patchToClient);

      const { apiClient } = await import('@Services/apiClient.js');
      // Use entity-type-specific route
      const routeMap = {
        view_configuration: `/views/${conflict.entityId}`,
        annotation: `/annotations/${conflict.entityId}`,
        viewgroup: `/viewgroups/${conflict.entityId}`,
        workspace_annotation: `/workspace-annotations/${conflict.entityId}`,
      };
      const route = routeMap[conflict.entityType] || `/views/${conflict.entityId}`;
      await apiClient.put(route, { ...merged, force_overwrite: true });
    } catch (err) {
      console.warn('[ConflictResolutionDialog] Auto-merge failed:', err);
    }
    dismiss();
  }, [conflict, strategy, dismiss]);

  if (!conflict || !strategy) return null;

  const serverDiff = diff(conflict.clientObject || {}, conflict.serverObject || {});
  const clientDiff = diff(conflict.serverObject || {}, conflict.clientObject || {});
  const mergeEnabled = canAutoMergeSafe(serverDiff, clientDiff, strategy.safeFields);
  const hasSaveAsCopy = strategy.supportsDuplication && resolverRef.current?.saveAsCopy != null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        background: 'var(--color-surface-elevated, #1e1e2e)',
        border: '1px solid var(--color-border, #3a3a4a)',
        borderRadius: 8,
        padding: '24px',
        minWidth: 380,
        maxWidth: 520,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        color: 'var(--color-text-primary, #e0e0e0)',
        fontFamily: 'inherit',
      }}
    >
      {/* Title */}
      <h2
        id="conflict-dialog-title"
        style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}
      >
        {strategy.displayName} Conflict
      </h2>

      {/* Description */}
      <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', opacity: 0.8 }}>
        {formatUserLabel(conflict)} changed this {strategy.entityLabel} at{' '}
        {formatTime(conflict.updatedAt)}.
      </p>
      <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', opacity: 0.6 }}>
        Server revision {conflict.serverRevision ?? '?'} · Your base was{' '}
        {conflict.clientBaseRevision ?? '?'}.
      </p>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', opacity: 0.6 }}>
        {summariseDiff(serverDiff)}
      </p>

      {/* Confirm overwrite notice */}
      {confirmOverwrite && (
        <p
          style={{
            margin: '0 0 12px 0',
            padding: '8px 12px',
            background: 'var(--color-warning-bg, rgba(220,120,0,0.15))',
            borderRadius: 4,
            fontSize: '0.85rem',
            color: 'var(--color-warning, #f0a020)',
          }}
        >
          This will overwrite the server version and any edits made by{' '}
          {formatUserLabel(conflict)}. Click &quot;Keep mine&quot; again to confirm.
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUseServer}
          disabled={resolving}
        >
          Use server version
        </Button>

        <Button
          variant={confirmOverwrite ? 'danger' : 'secondary'}
          size="sm"
          onClick={handleOverwrite}
          disabled={resolving}
        >
          {confirmOverwrite ? `Confirm: keep mine (overwrites server)` : 'Keep mine (overwrite)'}
        </Button>

        {hasSaveAsCopy ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveAsCopy}
            disabled={resolving}
          >
            Save mine as new copy
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled
            title={strategy.duplicationUnsupportedReason || `Saving a copy is not supported for ${strategy.entityLabel}s.`}
          >
            Save as copy (unavailable)
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleMerge}
          disabled={resolving || !mergeEnabled}
          title={
            mergeEnabled
              ? 'Changes touch different safe fields — auto-merge is safe'
              : strategy.mergeWarning || 'Cannot auto-merge: overlapping or unsafe field edits'
          }
        >
          {mergeEnabled
            ? 'Merge (safe — independent fields)'
            : 'Merge (unavailable — overlapping or unsafe edits)'}
        </Button>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Close conflict dialog"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1.2rem',
          lineHeight: 1,
          opacity: 0.5,
        }}
      >
        ×
      </button>
    </div>
  );
}

export default ConflictResolutionDialog;
