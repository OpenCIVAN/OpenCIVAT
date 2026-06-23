/**
 * @file DatasetSelectorModal.jsx
 * @description Modal for selecting a dataset to place in an empty canvas cell.
 * Shows built-in sample VTP files from public/vtp_files/ and any uploaded files.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Modal from '@UI/react/components/modals/Modal';
import { Icon } from '@UI/react/components/atoms';
import { SearchBar } from '@UI/react/components/molecules/SearchBar';
import { useDatasets } from '@UI/react/hooks/useDatasets.js';
import { viewLifecycleService } from '@Services/ViewLifecycleService.js';
import { toast } from '@UI/react/store/toastStore';
import './DatasetSelectorModal.scss';

const MANIFEST_URL = '/vtp_files/manifest.json';

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
    // Manifest entries as fallback when DatasetManager hasn't loaded built-ins yet
    const [manifestEntries, setManifestEntries] = useState(null);

    const datasets = useDatasets();

    // Split into built-in samples and user uploads
    const builtInDatasets = useMemo(
        () => datasets.filter(d => d.id?.startsWith('builtin-')),
        [datasets]
    );
    const uploadedDatasets = useMemo(
        () => datasets.filter(d => !d.id?.startsWith('builtin-')),
        [datasets]
    );

    // Fetch manifest directly as fallback if built-ins haven't loaded yet
    useEffect(() => {
        if (!isOpen) return;
        if (builtInDatasets.length > 0) {
            setManifestEntries(null); // DatasetManager has them — no need for fallback
            return;
        }
        fetch(MANIFEST_URL)
            .then(r => r.ok ? r.json() : null)
            .then(entries => setManifestEntries(Array.isArray(entries) ? entries : []))
            .catch(() => setManifestEntries([]));
    }, [isOpen, builtInDatasets.length]);

    // Filter lists by search query
    const q = searchQuery.toLowerCase();
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

    const handleSelect = useCallback(async (datasetId, datasetName) => {
        if (isPlacing) return;
        setIsPlacing(true);
        setPlacingId(datasetId);
        try {
            await viewLifecycleService.createAndPlaceView(
                datasetId,
                { row: targetRow, col: targetCol },
                { name: datasetName }
            );
            toast.success(`Loading ${datasetName}…`);
            onClose();
        } catch (error) {
            console.error('Failed to place dataset:', error);
            const msg = error.message?.includes('No canvas')
                ? 'Canvas is still initializing — please try again in a moment.'
                : (error.message || 'Failed to load dataset');
            toast.error(msg);
        } finally {
            setIsPlacing(false);
            setPlacingId(null);
        }
    }, [isPlacing, targetRow, targetCol, onClose]);

    // Determine what to show for built-in samples
    const showManifestFallback = builtInDatasets.length === 0 && filteredManifest && filteredManifest.length > 0;
    const sampleItems = showManifestFallback ? null : filteredBuiltIns;
    const isLoadingSamples = builtInDatasets.length === 0 && manifestEntries === null;

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

                {/* ── Sample Datasets ── */}
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

                    {/* Built-ins from DatasetManager */}
                    {sampleItems && sampleItems.length > 0 && sampleItems.map(d =>
                        renderDatasetButton(
                            d.id,
                            cleanName(d.name),
                            d.metadata?.sizeHint || d.fileType?.toUpperCase(),
                            () => handleSelect(d.id, cleanName(d.name))
                        )
                    )}

                    {/* Manifest fallback (DatasetManager hasn't registered them yet) */}
                    {showManifestFallback && filteredManifest.map(entry =>
                        renderDatasetButton(
                            entry.id,
                            entry.name,
                            entry.sizeHint || entry.description,
                            () => handleSelect(entry.id, entry.name)
                        )
                    )}

                    {/* Empty sample state */}
                    {!isLoadingSamples && (sampleItems?.length === 0) && !showManifestFallback && (
                        <div className="dataset-selector-modal__empty-small">
                            No sample datasets found.
                            Check <code>public/vtp_files/manifest.json</code>.
                        </div>
                    )}
                </div>

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
