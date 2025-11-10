// src/ui/react/components/panels/FilesPanel.jsx
// Enhanced version with proper publicPath handling for sample files

import React, { useState, useRef } from "react";
import { FolderOpen, Upload, File as FileIcon, Check, Loader } from "lucide-react";

import { datasetManager } from "@Core/datasets/datasetManager.js";
import { visualizationManager } from "@Core/visualizationManager.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";
import { useCurrentDataset } from "@UI/react/hooks/useCurrentDataset.js";

import "./FilesPanel.css";  // Use a separate CSS file

const SAMPLE_FILES = [
    { name: "Skull.vtp", path: "/vtp_files/Skull.vtp", size: "19.5 MB" },
    { name: "Bones.vtp", path: "/vtp_files/Bones.vtp", size: "26 MB" },
    { name: "Diskout.vtp", path: "/vtp_files/Diskout.vtp", size: "472 KB" },
    { name: "Lungs.vtp", path: "/vtp_files/Lungs.vtp", size: "10 MB" },
    { name: "LungVessels.vtp", path: "/vtp_files/LungVessels.vtp", size: "27 MB" },
    { name: "Earth.vtp", path: "/vtp_files/Earth.vtp", size: "1.2 MB" }
];

export function FilesPanel() {
    // Get datasets from the hook - this includes loading state
    const datasets = useDatasets();
    const { datasetId: currentDatasetId } = useCurrentDataset();
    const [uploadType, setUploadType] = useState("samples");
    const fileInputRef = useRef(null);

    // Check if ANY dataset is currently loading
    const isAnyLoading = datasets.some(d => d.isLoading);

    // Handle loading a sample file
    const handleLoadSample = async (sampleFile) => {
        console.log(`📂 Loading sample: ${sampleFile.path}`);

        try {
            // Check if already exists and is loaded
            const existing = datasets.find(d => d.name === sampleFile.name);
            if (existing?.hasPolydata) {
                console.log("📂 Sample already loaded, switching to it");
                visualizationManager.setCurrentDataset(existing.id, sampleFile.name);
                return;
            }

            // If exists but not loaded, just select it and let the system load it
            if (existing) {
                console.log("📂 Sample exists, selecting it...");
                visualizationManager.setCurrentDataset(existing.id, sampleFile.name);
                return;
            }

            // Fetch the sample file
            const response = await fetch(sampleFile.path);
            if (!response.ok) {
                throw new Error(`Failed to load sample: ${response.status}`);
            }

            const blob = await response.blob();
            const file = new File([blob], sampleFile.name, { type: "application/octet-stream" });

            // Load through dataset manager - it handles all state updates
            const publicPath = window.location.origin + sampleFile.path;
            const datasetId = await datasetManager.loadDataset(file, publicPath);

            console.log(`✅ Sample loaded successfully`);

            // Set as current dataset
            visualizationManager.setCurrentDataset(datasetId, sampleFile.name);

        } catch (error) {
            console.error("❌ Failed to load sample:", error);
            console.error("Error stack:", error.stack); // This will show the full call chain
            alert(`Failed to load sample: ${error.message}`);
        }
    };

    // Handle user file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log(`📂 Uploading file: ${file.name}`);

        try {
            // Check if already exists
            const existing = datasets.find(d => d.name === file.name);
            if (existing?.hasPolydata) {
                console.log("📂 File already exists, switching to it");
                visualizationManager.setCurrentDataset(existing.id, file.name);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }

            // Load the file - dataset manager handles all state
            const datasetId = await datasetManager.loadDataset(file, null);

            console.log(`✅ File uploaded successfully`);

            // Set as current dataset
            visualizationManager.setCurrentDataset(datasetId, file.name);

        } catch (error) {
            console.error("❌ Failed to upload file:", error);
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Handle clicking on an existing dataset
    const handleSelectDataset = (dataset) => {
        // If already loaded, just switch to it
        if (dataset.hasPolydata) {
            visualizationManager.setCurrentDataset(dataset.id, dataset.name);
            return;
        }

        // If loading, do nothing (let it finish)
        if (dataset.isLoading) {
            console.log(`⏳ Dataset is loading: ${dataset.name}`);
            return;
        }

        // Not loaded yet - trigger async load by selecting it
        console.log(`📂 Dataset not loaded, triggering load: ${dataset.name}`);
        visualizationManager.setCurrentDataset(dataset.id, dataset.name);
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
                    <div className="files-panel__sample-files">
                        {SAMPLE_FILES.map(sample => {
                            const dataset = datasets.find(d => d.name === sample.name);
                            const isThisLoading = dataset?.isLoading || false;
                            const isLoaded = dataset?.hasPolydata || false;
                            const isAlreadyAdded = datasets.some(d => d.name === sample.name);

                            return (
                                <button
                                    key={sample.name}
                                    className="files-panel__sample-btn"
                                    onClick={() => handleLoadSample(sample)}
                                    disabled={isAnyLoading || isAlreadyAdded}
                                >
                                    <FileIcon size={18} />
                                    <span className="files-panel__sample-name">{sample.name}</span>
                                    <span className="files-panel__sample-size">{sample.size}</span>
                                    {isThisLoading && (
                                        <Loader size={14} className="spinner" />
                                    )}
                                    {isLoaded && !isThisLoading && (
                                        <Check size={16} className="files-panel__check" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="files-panel__upload-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".vtp"
                            onChange={handleFileUpload}
                            disabled={isAnyLoading}
                            style={{ display: "none" }}
                        />
                        <button
                            className="files-panel__upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnyLoading}
                        >
                            <Upload size={20} />
                            Choose VTP File
                        </button>
                        <p className="files-panel__hint">
                            User-uploaded files are only visible to users who upload the same file
                        </p>
                    </div>
                )}
            </div>

            <div className="files-panel__datasets-section">
                <h4>Loaded Datasets ({datasets.length})</h4>
                <div className="files-panel__dataset-list">
                    {datasets.map((dataset) => (
                        <div
                            key={dataset.id}
                            className={`files-panel__dataset-item ${dataset.id === currentDatasetId ? "active" : ""
                                } ${dataset.isLoading ? "loading" : ""}`}
                            onClick={() => handleSelectDataset(dataset)}
                        >
                            <div className="files-panel__dataset-info">
                                <div className="files-panel__dataset-name">
                                    {dataset.isLoading ? (
                                        <Loader size={14} className="spinner" />
                                    ) : dataset.hasPolydata ? (
                                        <Check size={14} />
                                    ) : (
                                        "⚠️"
                                    )}
                                    {dataset.name}
                                    {dataset.isLoading && dataset.loadingStage && (
                                        <span className="files-panel__stage"> ({dataset.loadingStage})</span>
                                    )}
                                </div>
                                <div className="files-panel__dataset-meta">
                                    {dataset.pointCount?.toLocaleString()} points
                                    {" • "}
                                    {dataset.uploadedByName || "Unknown"}
                                    {dataset.publicPath && " • 🌐 Public"}
                                </div>
                            </div>
                            {dataset.id === currentDatasetId && (
                                <span className="files-panel__current-badge">Current</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}