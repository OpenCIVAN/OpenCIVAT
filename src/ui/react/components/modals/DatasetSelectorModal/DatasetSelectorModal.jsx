/**
 * @file DatasetSelectorModal.jsx
 * @description Modal for selecting a dataset to place in an empty canvas cell.
 *
 * Shows three sections depending on render mode:
 *  1. Server Datasets — from Python VTK render server (when RENDER_MODE != local)
 *  2. Sample Datasets — built-in VTP files from public/vtp_files/ (local mode)
 *  3. My Files       — user-uploaded datasets
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Modal from '@UI/react/components/modals/Modal';
import { Icon } from '@UI/react/components/atoms';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { viewLifecycleService } from '@Services/ViewLifecycleService.js';
import { getDatasetManager } from '@Init/appInitializer.js';
import { config } from '@Core/config/clientConfig.js';
import { toast } from '@UI/react/store/toastStore';
import { syncActiveDatasetToYjs } from '@Collaboration/yjs/yjsSetup.js';
import { getUserId } from '@Collaboration/presence/userManagement.js';
import { sessionManager } from '@Core/session/sessionManager.js';
import './DatasetSelectorModal.scss';

const MANIFEST_URL = '/vtp_files/manifest.json';
const SERVER_DATASETS_URL = '/render-api/datasets';

function cleanName(name) {
    return name ? name.replace(/\.vtp$/i, '') : name;
}

export function DatasetSelectorModal({
    isOpen,
    onClose,
    targetRow,
    targetCol,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isPlacing, setIsPlacing] = useState(false);
    const [placingId, setPlacingId] = useState(null);

    // Local manifest fallback (when DatasetManager hasn't loaded built-ins yet)
    const [manifestEntries, setManifestEntries] = useState(null);

    // Server dataset state
    const [serverDatasets, setServerDatasets] = useState(null);  // null = not fetched yet
    const [serverLoading, setServerLoading] = useState(false);
    const [serverOffline, setServerOffline] = useState(false);

    const datasets = useDatasets();
    const isServerMode = config.renderMode !== 'local';

    // Split local datasets into built-ins and uploads
    const builtInDatasets = useMemo(
        () => datasets.filter(d => d.id?.startsWith('builtin-')),
        [datasets]
    );
    const uploadedDatasets = useMemo(
        () => datasets.filter(d => !d.id?.startsWith('builtin-')),
        [datasets]
    );

    // ── Fetch server datasets when modal opens (server/hybrid mode) ────────────
    useEffect(() => {
        if (!isOpen || !isServerMode) return;
        if (serverDatasets !== null) return; // Already fetched

        setServerLoading(true);
        setServerOffline(false);

        console.log('[DatasetSelector] render mode:', config.renderMode);
        console.log('[DatasetSelector] fetching server datasets from:', SERVER_DATASETS_URL);

        fetch(SERVER_DATASETS_URL)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                console.log('[DatasetSelector] server datasets:', list.map(d => d.id));
                setServerDatasets(list);
                setServerLoading(false);
            })
            .catch(err => {
                console.warn('[DatasetSelector] server datasets fetch failed:', err.message);
                setServerDatasets([]);
                setServerLoading(false);
                setServerOffline(true);
            });
    }, [isOpen, isServerMode, serverDatasets]);

    // Reset server datasets when modal closes so next open re-fetches
    useEffect(() => {
        if (!isOpen) {
            setServerDatasets(null);
            setServerOffline(false);
        }
    }, [isOpen]);

    // ── Fetch local manifest fallback (local mode only) ───────────────────────
    useEffect(() => {
        if (!isOpen || isServerMode) return;
        if (builtInDatasets.length > 0) {
            setManifestEntries(null);
            return;
        }
        fetch(MANIFEST_URL)
            .then(r => r.ok ? r.json() : null)
            .then(entries => setManifestEntries(Array.isArray(entries) ? entries : []))
            .catch(() => setManifestEntries([]));
    }, [isOpen, isServerMode, builtInDatasets.length]);

    // ── Search filtering ───────────────────────────────────────────────────────
    const q = searchQuery.toLowerCase();

    const filteredServer = useMemo(() =>
        serverDatasets
            ? (q ? serverDatasets.filter(d => d.name?.toLowerCase().includes(q)) : serverDatasets)
            : null,
        [serverDatasets, q]
    );
    const filteredBuiltIns = useMemo(() =>
        q ? builtInDatasets.filter(d => cleanName(d.name)?.toLowerCase().includes(q)) : builtInDatasets,
        [builtInDatasets, q]
    );
    const filteredUploads = useMemo(() =>
        q ? uploadedDatasets.filter(d => d.name?.toLowerCase().includes(q)) : uploadedDatasets,
        [uploadedDatasets, q]
    );
    const filteredManifest = useMemo(() =>
        manifestEntries
            ? (q ? manifestEntries.filter(e => e.name?.toLowerCase().includes(q)) : manifestEntries)
            : null,
        [manifestEntries, q]
    );

    // ── Click handlers ─────────────────────────────────────────────────────────

    // Local VTK.js path (existing behavior — unchanged)
    const handleSelect = useCallback(async (datasetId, datasetName) => {
        if (isPlacing) return;
        console.log('[DatasetSelector] handleSelect:', { id: datasetId, name: datasetName });
        setIsPlacing(true);
        setPlacingId(datasetId);
        try {
            await viewLifecycleService.createAndPlaceView(
                datasetId,
                { row: targetRow, col: targetCol },
                { name: datasetName }
            );
            // Broadcast to other tabs/users in the same room
            try {
                const ds = getDatasetManager()?.getDataset(datasetId);
                console.log('[CIA Collab] Local dataset selected:', datasetId, datasetName);
                syncActiveDatasetToYjs(sessionManager.getRoomId(), getUserId(), {
                    datasetId,
                    name: datasetName,
                    path: ds?.publicPath || null,
                    type: ds?.fileType || null,
                    source: 'uploaded',
                });
            } catch (syncErr) {
                console.warn('[CIA Collab] Failed to broadcast dataset selection:', syncErr);
            }
            toast.success(`Loading ${datasetName}…`);
            onClose();
        } catch (error) {
            console.error('[DatasetSelector] failed to place dataset:', error);
            const msg = error.message?.includes('No canvas')
                ? 'Canvas is still initializing — please try again in a moment.'
                : (error.message || 'Failed to load dataset');
            toast.error(msg);
        } finally {
            setIsPlacing(false);
            setPlacingId(null);
        }
    }, [isPlacing, targetRow, targetCol, onClose]);

    // Manifest fallback (registers entry in DatasetManager then uses local path)
    const handleManifestSelect = useCallback(async (entry) => {
        console.log('[DatasetSelector] manifest entry clicked:', entry);
        console.log('[DatasetSelector] dataset id:', entry.id);
        console.log('[DatasetSelector] dataset path:', entry.path);
        const resolvedUrl = new URL(entry.path, window.location.origin).toString();
        console.log('[DatasetSelector] resolved URL:', resolvedUrl);

        const dm = getDatasetManager();
        if (dm) {
            dm.addBuiltInDataset(entry);
        } else {
            console.warn('[DatasetSelector] DatasetManager not ready — lookup may fail');
        }

        // Broadcast BEFORE local load — entry.path is from the manifest so it's available here
        try {
            console.log('[CIA Collab] Local dataset selected (builtin):', entry.id, entry.name);
            syncActiveDatasetToYjs(sessionManager.getRoomId(), getUserId(), {
                datasetId: entry.id,
                name: entry.name,
                path: entry.path,
                type: 'vtp',
                source: 'builtin',
            });
        } catch (syncErr) {
            console.warn('[CIA Collab] Failed to broadcast built-in dataset selection:', syncErr);
        }

        await handleSelect(entry.id, entry.name);
    }, [handleSelect]);

    // Server render path — opens fullscreen ServerRenderedViewport overlay
    const handleServerSelect = useCallback((entry) => {
        if (isPlacing) return;

        console.log('[DatasetSelector] server dataset clicked:', entry);
        console.log('[DatasetSelector] dataset id:', entry.id);
        console.log('[DatasetSelector] dataset path:', entry.path);
        console.log('[DatasetSelector] dataset type:', entry.type);

        // Dispatch app-level event — the workspace listens and shows the overlay
        window.dispatchEvent(new CustomEvent('cia:open-server-render', {
            detail: { datasetId: entry.id, path: entry.path, fileType: entry.type, name: entry.name },
        }));

        // Broadcast to other tabs/users in the same room
        try {
            console.log('[CIA Collab] Local dataset selected (server):', entry.id, entry.name);
            syncActiveDatasetToYjs(sessionManager.getRoomId(), getUserId(), {
                datasetId: entry.id,
                name: entry.name,
                path: entry.path,
                type: entry.type,
                source: 'server',
            });
        } catch (syncErr) {
            console.warn('[CIA Collab] Failed to broadcast server dataset selection:', syncErr);
        }

        onClose();
    }, [isPlacing, onClose]);

    // ── Button renderer ────────────────────────────────────────────────────────
    const renderDatasetButton = (id, name, meta, onClickFn) => (
        <button
            key={id}
            className="dataset-selector-modal__item"
            onClick={onClickFn}
            disabled={isPlacing}
        >
            {placingId === id
                ? <Icon name="loader" size={16} className="dataset-selector-modal__item-icon spin" />
                : <Icon name="hexagon" size={16} className="dataset-selector-modal__item-icon" />
            }
            <div className="dataset-selector-modal__item-info">
                <span className="dataset-selector-modal__item-name">{name}</span>
                {meta && <span className="dataset-selector-modal__item-meta">{meta}</span>}
            </div>
            <Icon name="chevronRight" size={14} className="dataset-selector-modal__item-arrow" />
        </button>
    );

    // Local display flags
    const showManifestFallback = !isServerMode &&
        builtInDatasets.length === 0 &&
        filteredManifest &&
        filteredManifest.length > 0;
    const sampleItems = showManifestFallback ? null : filteredBuiltIns;
    const isLoadingSamples = !isServerMode && builtInDatasets.length === 0 && manifestEntries === null;

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Load Dataset"
            icon="database"
            size="md"
            testId="dataset-selector-modal"
        >
            <div className="dataset-selector-modal">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search datasets…"
                    className="dataset-selector-modal__search"
                />

                {/* ── Server Datasets (server / hybrid mode) ── */}
                {isServerMode && (
                    <>
                        <div className="dataset-selector-modal__section-header">
                            <Icon name="server" size={13} />
                            <span>Server Datasets</span>
                        </div>

                        <div className="dataset-selector-modal__list">
                            {serverLoading && (
                                <div className="dataset-selector-modal__loading">
                                    <Icon name="loader" size={16} className="spin" />
                                    <span>Contacting render server…</span>
                                </div>
                            )}

                            {serverOffline && !serverLoading && (
                                <div className="dataset-selector-modal__offline">
                                    <Icon name="alertTriangle" size={14} />
                                    <span>
                                        Rendering server is not available.
                                        Start the backend or switch to local mode.
                                    </span>
                                    <code>cd server/render_server &amp;&amp; uvicorn app:app --port 7000</code>
                                </div>
                            )}

                            {!serverLoading && !serverOffline && filteredServer?.map(entry =>
                                renderDatasetButton(
                                    entry.id,
                                    entry.name,
                                    `${entry.type?.toUpperCase()} · Server · ${entry.sizeMB} MB`,
                                    () => handleServerSelect(entry)
                                )
                            )}

                            {!serverLoading && !serverOffline && filteredServer?.length === 0 && (
                                <div className="dataset-selector-modal__empty-small">
                                    No datasets found on server.
                                    Add files to <code>server/datasets/</code> or{' '}
                                    <code>public/vtp_files/</code>.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── Sample Datasets (local / hybrid mode) ── */}
                {!isServerMode && (
                    <>
                        <div className="dataset-selector-modal__section-header">
                            <Icon name="layers" size={13} />
                            <span>Sample Datasets</span>
                        </div>

                        <div className="dataset-selector-modal__list">
                            {isLoadingSamples && (
                                <div className="dataset-selector-modal__loading">
                                    <Icon name="loader" size={16} className="spin" />
                                    <span>Loading samples…</span>
                                </div>
                            )}

                            {sampleItems && sampleItems.length > 0 && sampleItems.map(d =>
                                renderDatasetButton(
                                    d.id,
                                    cleanName(d.name),
                                    d.metadata?.sizeHint || d.fileType?.toUpperCase(),
                                    () => handleSelect(d.id, cleanName(d.name))
                                )
                            )}

                            {showManifestFallback && filteredManifest.map(entry =>
                                renderDatasetButton(
                                    entry.id,
                                    entry.name,
                                    entry.sizeHint || entry.description,
                                    () => handleManifestSelect(entry)
                                )
                            )}

                            {!isLoadingSamples && (sampleItems?.length === 0) && !showManifestFallback && (
                                <div className="dataset-selector-modal__empty-small">
                                    No sample datasets found.
                                    Check <code>public/vtp_files/manifest.json</code>.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── Uploaded Files ── */}
                {filteredUploads.length > 0 && (
                    <>
                        <div className="dataset-selector-modal__section-header">
                            <Icon name="upload" size={13} />
                            <span>My Files</span>
                        </div>
                        <div className="dataset-selector-modal__list">
                            {filteredUploads.map(d =>
                                renderDatasetButton(
                                    d.id,
                                    d.name,
                                    d.pointCount > 0 ? `${d.pointCount.toLocaleString()} pts` : null,
                                    () => handleSelect(d.id, d.name)
                                )
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default DatasetSelectorModal;
