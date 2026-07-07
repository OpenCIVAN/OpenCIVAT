/**
 * @file SnapshotPickerModal.jsx
 * @description Global snapshot picker — restore or delete saved view states.
 *
 * Opens on the `cia:show-snapshot-picker` CustomEvent (detail: { viewId }),
 * which ViewsSubtab's "Load state" action has dispatched since it shipped —
 * this modal is the previously-missing listener. Lists the view's snapshots
 * (ViewConfiguration.snapshots, persisted server-side) with author, time, and
 * a VR badge; Restore applies via ViewConfigurationManager.restoreSnapshot
 * (which auto-saves the current state first), Delete removes.
 *
 * Mount once in the app shell alongside other global modals.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@UI/react/components/modals/Modal';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { getViewConfigurationManager } from '@Init/appInitializer.js';
import { toast } from '@UI/react/store/toastStore.js';
import './SnapshotPickerModal.scss';

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export function SnapshotPickerModal() {
    const [viewId, setViewId] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [viewName, setViewName] = useState('');

    const refresh = useCallback((targetViewId) => {
        const manager = getViewConfigurationManager();
        const view = manager?.getView?.(targetViewId);
        if (!view) {
            setSnapshots([]);
            setViewName('');
            return;
        }
        setViewName(view.name || 'View');
        // Newest first; hide nothing — auto-saves are useful restore points too
        setSnapshots([...(view.snapshots || [])].reverse());
    }, []);

    useEffect(() => {
        const onShow = (e) => {
            const targetViewId = e?.detail?.viewId;
            if (!targetViewId) return;
            setViewId(targetViewId);
            refresh(targetViewId);
        };
        window.addEventListener('cia:show-snapshot-picker', onShow);
        return () => window.removeEventListener('cia:show-snapshot-picker', onShow);
    }, [refresh]);

    const handleClose = useCallback(() => setViewId(null), []);

    const handleRestore = useCallback((snapshotId) => {
        try {
            getViewConfigurationManager()?.restoreSnapshot(viewId, snapshotId);
            toast.success('View state restored');
            setViewId(null);
        } catch (err) {
            console.error('Snapshot restore failed:', err);
            toast.error(`Failed to restore: ${err?.message || 'unknown error'}`);
        }
    }, [viewId]);

    const handleDelete = useCallback((snapshotId) => {
        try {
            getViewConfigurationManager()?.deleteSnapshot(viewId, snapshotId);
            refresh(viewId);
        } catch (err) {
            console.error('Snapshot delete failed:', err);
            toast.error(`Failed to delete: ${err?.message || 'unknown error'}`);
        }
    }, [viewId, refresh]);

    if (!viewId) return null;

    return (
        <Modal isOpen onClose={handleClose} size="md" className="snapshot-picker-modal">
            <ModalHeader title={`Saved states — ${viewName}`} onClose={handleClose} />
            <ModalContent>
                {snapshots.length === 0 ? (
                    <EmptyState
                        icon="camera"
                        title="No saved states"
                        description="Use 'Save state' in the views panel (or 'Save session' in the workspace bar) to capture the current view."
                        size="sm"
                    />
                ) : (
                    <ul className="snapshot-picker-modal__list">
                        {snapshots.map((snap) => (
                            <li key={snap.id} className="snapshot-picker-modal__item">
                                <div className="snapshot-picker-modal__info">
                                    <div className="snapshot-picker-modal__name">
                                        {snap.name}
                                        {snap.metadata?.isVRSnapshot && (
                                            <span className="snapshot-picker-modal__badge">
                                                <Icon name="vr" size={11} /> VR
                                            </span>
                                        )}
                                        {snap.isAutoSave && (
                                            <span className="snapshot-picker-modal__badge snapshot-picker-modal__badge--auto">
                                                auto
                                            </span>
                                        )}
                                    </div>
                                    <div className="snapshot-picker-modal__meta">
                                        {snap.createdByName || 'Unknown'} · {formatTime(snap.createdAt)}
                                    </div>
                                </div>
                                <div className="snapshot-picker-modal__actions">
                                    <LabeledButton
                                        label="Restore"
                                        size="xs"
                                        variant="primary"
                                        onClick={() => handleRestore(snap.id)}
                                    />
                                    <IconButton
                                        icon="trash"
                                        size="xs"
                                        variant="ghost"
                                        tooltip="Delete snapshot"
                                        onClick={() => handleDelete(snap.id)}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </ModalContent>
            <ModalFooter>
                <LabeledButton label="Close" variant="ghost" onClick={handleClose} />
            </ModalFooter>
        </Modal>
    );
}

export default SnapshotPickerModal;
