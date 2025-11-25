// src/ui/react/components/FileUploadPrompt.stories.jsx
import React, { useState } from "react";
import { AlertTriangle, Upload, X, Check } from "lucide-react";

export default {
    title: "Components/FileUploadPrompt",
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "40px", background: "#0a0a0f", minWidth: "400px" }}>
                <Story />
            </div>
        ),
    ],
};

// =============================================================================
// MOCK COMPONENT (since original has complex dependencies)
// =============================================================================

const MockFileUploadPrompt = ({ files = [] }) => {
    const [missingFiles, setMissingFiles] = useState(files);

    if (missingFiles.length === 0) return null;

    return (
        <div
            style={{
                background: "#1a1a1f",
                border: "1px solid #444",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "12px 16px",
                    background: "#2a2020",
                    borderBottom: "1px solid #444",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                <AlertTriangle size={18} color="#ff9800" />
                <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>
                    Missing Files ({missingFiles.length})
                </h3>
            </div>

            {/* File List */}
            <div style={{ padding: "12px" }}>
                {missingFiles.map((file) => (
                    <div
                        key={file.datasetId}
                        style={{
                            padding: "12px",
                            background: "#2a2a2f",
                            borderRadius: "6px",
                            marginBottom: "8px",
                        }}
                    >
                        {/* File Info */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "10px",
                            }}
                        >
                            <span style={{ fontSize: "18px" }}>⚠️</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "500" }}>
                                    {file.filename}
                                </div>
                                <div style={{ fontSize: "11px", color: "#808080", marginTop: "2px" }}>
                                    Not in your cache
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <label
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "8px 12px",
                                    background: "#4CAF50",
                                    color: "white",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                }}
                            >
                                <Upload size={14} />
                                <span>Upload File</span>
                                <input type="file" accept=".vtp" style={{ display: "none" }} />
                            </label>
                            <button
                                style={{
                                    padding: "8px 12px",
                                    background: "transparent",
                                    border: "1px solid #666",
                                    borderRadius: "4px",
                                    color: "#808080",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                }}
                                onClick={() => setMissingFiles((prev) => prev.filter((f) => f.datasetId !== file.datasetId))}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Help Text */}
            <div
                style={{
                    padding: "10px 16px",
                    borderTop: "1px solid #333",
                    fontSize: "11px",
                    color: "#666",
                }}
            >
                These files are referenced by shared views but aren't in your local cache.
            </div>
        </div>
    );
};

// =============================================================================
// STORIES
// =============================================================================

export const SingleMissingFile = {
    render: () => (
        <MockFileUploadPrompt
            files={[
                {
                    datasetId: "dataset-001",
                    filename: "brain_scan_001.vtp",
                    hash: "abc123def456",
                },
            ]}
        />
    ),
};

export const MultipleMissingFiles = {
    render: () => (
        <MockFileUploadPrompt
            files={[
                {
                    datasetId: "dataset-001",
                    filename: "brain_scan_001.vtp",
                    hash: "abc123def456",
                },
                {
                    datasetId: "dataset-002",
                    filename: "heart_model.vtp",
                    hash: "def789ghi012",
                },
                {
                    datasetId: "dataset-003",
                    filename: "lung_tissue_sample.vtp",
                    hash: "ghi345jkl678",
                },
            ]}
        />
    ),
};

export const NoMissingFiles = {
    render: () => (
        <div style={{ color: "#808080", textAlign: "center", padding: "40px" }}>
            <Check size={32} color="#4CAF50" style={{ marginBottom: "12px" }} />
            <p>All files are available in cache</p>
            <p style={{ fontSize: "12px", color: "#666" }}>
                (FileUploadPrompt returns null when no files are missing)
            </p>
        </div>
    ),
};

export const UploadInProgress = {
    render: () => (
        <div
            style={{
                background: "#1a1a1f",
                border: "1px solid #444",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "12px 16px",
                    background: "#2a2020",
                    borderBottom: "1px solid #444",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                <AlertTriangle size={18} color="#ff9800" />
                <h3 style={{ margin: 0, fontSize: "14px", color: "#e0e0e0" }}>
                    Missing Files (1)
                </h3>
            </div>

            <div style={{ padding: "12px" }}>
                <div
                    style={{
                        padding: "12px",
                        background: "#2a2a2f",
                        borderRadius: "6px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        <span style={{ fontSize: "18px" }}>📤</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "500" }}>
                                large_dataset.vtp
                            </div>
                            <div style={{ fontSize: "11px", color: "#4CAF50", marginTop: "2px" }}>
                                Uploading... 45%
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                        style={{
                            height: "4px",
                            background: "#333",
                            borderRadius: "2px",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: "45%",
                                height: "100%",
                                background: "#4CAF50",
                                transition: "width 0.3s ease",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
};

export const HashMismatchError = {
    render: () => (
        <div
            style={{
                background: "#1a1a1f",
                border: "1px solid #f44336",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "12px 16px",
                    background: "#2a2020",
                    borderBottom: "1px solid #444",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                <X size={18} color="#f44336" />
                <h3 style={{ margin: 0, fontSize: "14px", color: "#f44336" }}>
                    Upload Failed
                </h3>
            </div>

            <div style={{ padding: "12px" }}>
                <div
                    style={{
                        padding: "12px",
                        background: "#3a2020",
                        borderRadius: "6px",
                        border: "1px solid #5a3030",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        <span style={{ fontSize: "18px" }}>❌</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "500" }}>
                                brain_scan_001.vtp
                            </div>
                            <div style={{ fontSize: "11px", color: "#f44336", marginTop: "2px" }}>
                                File hash mismatch! This is not the correct file.
                            </div>
                        </div>
                    </div>

                    <button
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    ),
};