// src/ui/react/components/panels/FilesPanel.jsx
// Updated to show instance counts per dataset instead of duplicates

import React, { useState, useRef } from "react";
import { FolderOpen, Upload, File as FileIcon, Check, Loader, Eye } from "lucide-react";

import { datasetManager } from "@Init/appInitializer.js";
import { instanceManager } from "@Core/instances/instanceManager.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";

import "./FilesPanel.css";

const SAMPLE_FILES = [
    { name: "Skull.vtp", path: "/vtp_files/Skull.vtp", size: "19.5 MB" },
    { name: "Bones.vtp", path: "/vtp_files/Bones.vtp", size: "26 MB" },
    { name: "Diskout.vtp", path: "/vtp_files/Diskout.vtp", size: "472 KB" },
    { name: "Lungs.vtp", path: "/vtp_files/Lungs.vtp", size: "10 MB" },
    { name: "LungVessels.vtp", path: "/vtp_files/LungVessels.vtp", size: "27 MB" },
    { name: "Earth.vtp", path: "/vtp_files/Earth.vtp", size: "1.2 MB" }
];

export function FilesPanel() {
    const datasets = useDatasets();
    const [uploadType, setUploadType] = useState("samples");
    const fileInputRef = useRef(null);
    const [spawnNewInstances, setSpawnNewInstances] = useState(true);

    // Get instance counts for each dataset
    // This prevents showing duplicate entries
    const datasetsWithCounts = datasets.map(dataset => ({
        ...dataset,
        instanceCount: instanceManager.getInstanceCountForDataset(dataset.id)
    }));

    const isAnyLoading = datasets.some(d => d.isLoading);

    const handleDatasetAction = async (datasetId, datasetName) => {
        console.log(`📂 Dataset selected: ${datasetName}`);

        // Check if we should spawn new or replace existing based on toggle
        if (spawnNewInstances) {
            // Create a placeholder in WorkspaceGrid's state
            // The actual VTK scene will be created when InstanceViewport mounts
            // For now, just trigger instance creation through the manager

            // WorkspaceGrid will detect this through instanceManager's listeners
            // and add it to its instances array
            console.log(`🎨 Requesting new instance for dataset: ${datasetId}`);

            // Option: Emit an event that WorkspaceGrid listens for
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: { datasetId }
            }));
        } else {
            // Replace current active instance's dataset
            console.log(`🔄 Replacing current instance dataset with: ${datasetId}`);
            // This would need to be implemented in instanceManager
        }
    };

    /**
     * Load a sample file
     */
    const handleLoadSample = async (sampleFile) => {
        console.log(`📂 Loading sample: ${sampleFile.path}`);

        try {
            // Check if already exists
            const existing = datasets.find(d => d.name === sampleFile.name);

            if (existing) {
                console.log("📂 Sample exists in metadata");

                // CRITICAL: Check if polydata is actually loaded
                if (existing.hasPolydata) {
                    console.log("✅ Sample already loaded with polydata");
                    // Trigger instance creation
                    window.dispatchEvent(new CustomEvent('cia:request-instance', {
                        detail: { datasetId: existing.id }
                    }));
                    return;
                } else {
                    // Metadata exists but no polydata - need to load it
                    console.log("📂 Sample metadata exists, loading polydata from cache...");

                    // Trigger async load from cache
                    const loaded = await datasetManager.loadPolydataFromCache(existing.id);

                    if (loaded) {
                        console.log("✅ Sample polydata loaded from cache");
                        window.dispatchEvent(new CustomEvent('cia:request-instance', {
                            detail: { datasetId: existing.id }
                        }));
                        return;
                    } else {
                        console.log("⚠️ Sample not in cache, fetching...");
                        // Fall through to fetch and load
                    }
                }
            }

            // Fetch the sample file (either new or re-fetching)
            const response = await fetch(sampleFile.path);
            if (!response.ok) {
                throw new Error(`Failed to load sample: ${response.status}`);
            }

            const blob = await response.blob();
            const file = new File([blob], sampleFile.name, {
                type: "application/octet-stream"
            });

            // Load through dataset manager
            const publicPath = window.location.origin + sampleFile.path;
            const datasetId = await datasetManager.loadDataset(file, publicPath);

            console.log(`✅ Sample loaded successfully`);

            // Trigger instance creation
            window.dispatchEvent(new CustomEvent('cia:request-instance', {
                detail: { datasetId }
            }));

        } catch (error) {
            console.error("❌ Failed to load sample:", error);
            alert(`Failed to load sample: ${error.message}`);
        }
    };

    /**
     * Handle user file upload
     */
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log(`📂 Uploading file: ${file.name}`);

        try {
            // Check if already exists
            const existing = datasets.find(d => d.name === file.name);
            if (existing?.hasPolydata) {
                console.log("📂 File already exists");
                await handleDatasetAction(existing.id, file.name);
                fileInputRef.current.value = "";
                return;
            }

            // Load the file
            const datasetId = await datasetManager.loadDataset(file, null);
            console.log(`✅ File uploaded successfully`);

            await handleDatasetAction(datasetId, file.name);

        } catch (error) {
            console.error("❌ Failed to upload file:", error);
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    /**
     * Handle clicking on an existing dataset
     */
    const handleSelectDataset = (dataset) => {
        if (dataset.hasPolydata) {
            handleDatasetAction(dataset.id, dataset.name);
            return;
        }

        if (dataset.isLoading) {
            console.log(`⏳ Dataset is loading: ${dataset.name}`);
            return;
        }

        // Not loaded yet - trigger load
        console.log(`📂 Dataset not loaded, triggering load: ${dataset.name}`);
        handleDatasetAction(dataset.id, dataset.name);
    };

    return (
        <div className="files-panel">
            <div className="files-panel__header">
                <FolderOpen size={20} />
                <h3>Files</h3>
                {isAnyLoading && (
                    <span className="files-panel__loading">
                        <Loader size={14} className="spinner" />
                        Loading...
                    </span>
                )}
            </div>

            {/* Spawn/Replace Toggle */}
            <div className="files-panel__spawn-toggle">
                <label className="toggle-label">
                    <input
                        type="checkbox"
                        checked={spawnNewInstances}
                        onChange={(e) => setSpawnNewInstances(e.target.checked)}
                    />
                    <span>Spawn new instances</span>
                </label>
                <span className="toggle-hint">
                    {spawnNewInstances
                        ? "Each dataset opens in a new window"
                        : "Datasets replace current view"}
                </span>
            </div>

            {/* Upload Tabs */}
            <div className="files-panel__upload-section">
                <div className="files-panel__tabs">
                    <button
                        className={`files-panel__tab ${uploadType === "samples" ? "active" : ""}`}
                        onClick={() => setUploadType("samples")}
                        disabled={isAnyLoading}
                    >
                        Sample Files
                    </button>
                    <button
                        className={`files-panel__tab ${uploadType === "upload" ? "active" : ""}`}
                        onClick={() => setUploadType("upload")}
                        disabled={isAnyLoading}
                    >
                        Upload VTP
                    </button>
                </div>

                {uploadType === "samples" ? (
                    <div className="files-panel__samples">
                        {SAMPLE_FILES.map(sample => (
                            <div
                                key={sample.name}
                                className="files-panel__sample"
                                onClick={() => handleLoadSample(sample)}
                            >
                                <FileIcon size={16} />
                                <div className="files-panel__sample-info">
                                    <div className="files-panel__sample-name">{sample.name}</div>
                                    <div className="files-panel__sample-size">{sample.size}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="files-panel__upload">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".vtp"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            disabled={isAnyLoading}
                        />
                        <button
                            className="files-panel__upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnyLoading}
                        >
                            <Upload size={16} />
                            Choose VTP File
                        </button>
                    </div>
                )}
            </div>

            {/* Dataset List with Instance Counts */}
            <div className="files-panel__datasets">
                <h4 className="files-panel__datasets-header">
                    Loaded Datasets ({datasetsWithCounts.length})
                </h4>
                <div className="files-panel__datasets-list">
                    {datasetsWithCounts.map(dataset => (
                        <div
                            key={dataset.id}
                            className={`files-panel__dataset ${dataset.isLoading ? "loading" : ""}`}
                            onClick={() => handleSelectDataset(dataset)}
                        >
                            <div className="files-panel__dataset-info">
                                <div className="files-panel__dataset-name">
                                    {dataset.isLoading ? (
                                        <Loader size={14} className="spinner" />
                                    ) : dataset.hasPolydata ? (
                                        <Check size={14} />
                                    ) : (
                                        <FileIcon size={14} />
                                    )}
                                    {dataset.name}
                                    {dataset.isLoading && dataset.loadingStage && (
                                        <span className="files-panel__stage"> ({dataset.loadingStage})</span>
                                    )}
                                </div>
                                <div className="files-panel__dataset-meta">
                                    {(dataset.pointCount || 0).toLocaleString()} points
                                    {" • "}
                                    {dataset.uploadedByName || "Unknown"}
                                    {dataset.publicPath && " • 🌐 Public"}
                                </div>
                            </div>

                            {/* Show instance count badge */}
                            <div className="files-panel__dataset-actions">
                                {dataset.instanceCount > 0 && (
                                    <span
                                        className="files-panel__instance-badge"
                                        title={`${dataset.instanceCount} instance${dataset.instanceCount !== 1 ? 's' : ''} viewing this dataset`}
                                    >
                                        <Eye size={12} />
                                        {dataset.instanceCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}