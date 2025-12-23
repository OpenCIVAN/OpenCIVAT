// src/ui/react/components/panels/BottomPanel/tabs/ComputeTab/ComputeTab.jsx
// Compute jobs tab for the bottom panel
//
// Shows background processing jobs from BullMQ:
// - Dimensionality reduction (PCA, t-SNE, UMAP)
// - Data processing tasks
// - VTK Python worker jobs

import React, { useMemo } from "react";
import {
    Cpu,
    Clock,
    CheckCircle,
    XCircle,
    Loader,
    RefreshCw,
    Trash2,
    Play,
    Pause,
    StopCircle,
} from 'lucide-react';
import { useComputeJobs } from "@UI/react/hooks/useComputeJobs.js";
import "./ComputeTab.scss";

// Job type display configuration
const JOB_TYPES = {
    pca: { label: "PCA", color: "#4CAF50" },
    tsne: { label: "t-SNE", color: "#2196F3" },
    umap: { label: "UMAP", color: "#9C27B0" },
    vtk_process: { label: "VTK Process", color: "#FF9800" },
    data_transform: { label: "Transform", color: "#00BCD4" },
    default: { label: "Job", color: "#607D8B" },
};

// Status icons and colors
const STATUS_CONFIG = {
    pending: { icon: Clock, color: "#FFA726", label: "Pending" },
    running: { icon: Loader, color: "#2196F3", label: "Running", animate: true },
    completed: { icon: CheckCircle, color: "#4CAF50", label: "Completed" },
    failed: { icon: XCircle, color: "#f44336", label: "Failed" },
    paused: { icon: Pause, color: "#9E9E9E", label: "Paused" },
};

/**
 * Format duration in human-readable form
 */
function formatDuration(ms) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

/**
 * Single job row component
 */
function JobRow({ job, onCancel, onRetry }) {
    const typeConfig = JOB_TYPES[job.type] || JOB_TYPES.default;
    const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;

    // Calculate progress percentage
    const progress = job.progress ?? 0;
    const hasProgress = job.status === "running" && progress > 0;

    return (
        <div className={`compute-tab__job compute-tab__job--${job.status}`}>
            {/* Type badge */}
            <div
                className="compute-tab__job-type"
                style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
            >
                {typeConfig.label}
            </div>

            {/* Job name/description */}
            <div className="compute-tab__job-info">
                <span className="compute-tab__job-name">
                    {job.name || `Job ${job.id.slice(0, 8)}`}
                </span>
                {job.datasetName && (
                    <span className="compute-tab__job-dataset">
                        {job.datasetName}
                    </span>
                )}
            </div>

            {/* Progress bar (if running) */}
            {hasProgress && (
                <div className="compute-tab__job-progress">
                    <div
                        className="compute-tab__job-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                    <span className="compute-tab__job-progress-text">{progress}%</span>
                </div>
            )}

            {/* Status */}
            <div className="compute-tab__job-status" style={{ color: statusConfig.color }}>
                <StatusIcon
                    size={14}
                    className={statusConfig.animate ? "animate-spin" : ""}
                />
                <span>{statusConfig.label}</span>
            </div>

            {/* Duration */}
            <div className="compute-tab__job-duration">
                {job.status === "running"
                    ? formatDuration(Date.now() - job.startedAt)
                    : formatDuration(job.duration)
                }
            </div>

            {/* Time */}
            <div className="compute-tab__job-time">
                {formatTime(job.createdAt)}
            </div>

            {/* Actions */}
            <div className="compute-tab__job-actions">
                {job.status === "running" && (
                    <button
                        onClick={() => onCancel?.(job.id)}
                        title="Cancel job"
                        className="compute-tab__job-action compute-tab__job-action--cancel"
                    >
                        <StopCircle size={14} />
                    </button>
                )}
                {job.status === "failed" && (
                    <button
                        onClick={() => onRetry?.(job.id)}
                        title="Retry job"
                        className="compute-tab__job-action compute-tab__job-action--retry"
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * ComputeTab - Shows background job status
 */
export function ComputeTab() {
    const {
        jobs,
        isLoading,
        cancelJob,
        retryJob,
        clearCompleted,
        refresh,
    } = useComputeJobs();

    // Group jobs by status
    const groupedJobs = useMemo(() => {
        const groups = {
            running: [],
            pending: [],
            completed: [],
            failed: [],
        };

        jobs.forEach(job => {
            const group = groups[job.status] || groups.pending;
            group.push(job);
        });

        // Sort each group by time (newest first)
        Object.values(groups).forEach(group => {
            group.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        });

        return groups;
    }, [jobs]);

    // Counts for header
    const counts = useMemo(() => ({
        running: groupedJobs.running.length,
        pending: groupedJobs.pending.length,
        completed: groupedJobs.completed.length,
        failed: groupedJobs.failed.length,
        total: jobs.length,
    }), [groupedJobs, jobs]);

    // All jobs in display order
    const orderedJobs = useMemo(() => [
        ...groupedJobs.running,
        ...groupedJobs.pending,
        ...groupedJobs.failed,
        ...groupedJobs.completed,
    ], [groupedJobs]);

    return (
        <div className="compute-tab">
            {/* Toolbar */}
            <div className="compute-tab__toolbar">
                <div className="compute-tab__toolbar-left">
                    <div className="compute-tab__counts">
                        {counts.running > 0 && (
                            <span className="compute-tab__count compute-tab__count--running">
                                <Loader size={12} className="animate-spin" />
                                {counts.running} running
                            </span>
                        )}
                        {counts.pending > 0 && (
                            <span className="compute-tab__count compute-tab__count--pending">
                                <Clock size={12} />
                                {counts.pending} pending
                            </span>
                        )}
                        {counts.failed > 0 && (
                            <span className="compute-tab__count compute-tab__count--failed">
                                <XCircle size={12} />
                                {counts.failed} failed
                            </span>
                        )}
                        {counts.total === 0 && (
                            <span className="compute-tab__count">No jobs</span>
                        )}
                    </div>
                </div>

                <div className="compute-tab__toolbar-right">
                    <button
                        className="compute-tab__action"
                        onClick={refresh}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {counts.completed > 0 && (
                        <button
                            className="compute-tab__action"
                            onClick={clearCompleted}
                            title="Clear completed"
                        >
                            <Trash2 size={14} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Job list */}
            <div className="compute-tab__jobs">
                {isLoading ? (
                    <div className="compute-tab__loading">
                        <Loader size={24} className="animate-spin" />
                        <span>Loading jobs...</span>
                    </div>
                ) : orderedJobs.length === 0 ? (
                    <div className="compute-tab__empty">
                        <Cpu size={32} />
                        <p>No compute jobs</p>
                        <span>Background processing tasks will appear here</span>
                    </div>
                ) : (
                    orderedJobs.map(job => (
                        <JobRow
                            key={job.id}
                            job={job}
                            onCancel={cancelJob}
                            onRetry={retryJob}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default ComputeTab;