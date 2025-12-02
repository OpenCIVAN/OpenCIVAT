// src/ui/react/hooks/useComputeJobs.js
//
// React hook for compute job management
// Provides methods to submit jobs and track their status

import { useState, useEffect, useCallback } from "react";
import {
  useComputeJobStore,
  JobStatus,
} from "@UI/react/store/computeJobStore.js";
import { config } from "@Core/config/clientConfig.js";
import { api as log } from "@Utils/logger.js";
import { toast } from "@UI/react/store/toastStore.js";

// Re-export config for components that need API URL
export { config };

/**
 * Hook for managing compute jobs
 *
 * @param {Object} options
 * @param {string} options.fileId - Filter jobs for specific file (optional)
 * @returns {Object} Job state and actions
 *
 * @example
 * const { submitJob, activeJobs, hasActiveJobs } = useComputeJobs();
 *
 * // Submit a decimation job
 * const jobId = await submitJob(fileId, 'mesh-decimation', { reduction: 0.5 });
 */
export function useComputeJobs(options = {}) {
  const { fileId } = options;

  // Get store state and actions
  const jobs = useComputeJobStore((state) => state.jobs);
  const addJob = useComputeJobStore((state) => state.addJob);
  const removeJob = useComputeJobStore((state) => state.removeJob);
  const cleanupOldJobs = useComputeJobStore((state) => state.cleanupOldJobs);

  // Cleanup old jobs on mount
  useEffect(() => {
    cleanupOldJobs();
  }, [cleanupOldJobs]);

  /**
   * Submit a new compute job
   *
   * @param {string} targetFileId - File to process
   * @param {string} operation - Operation ID (e.g., 'mesh-decimation')
   * @param {Object} params - Operation parameters
   * @param {Object} submitOptions - Additional options
   * @param {string} submitOptions.fileName - Display name for UI
   * @param {number} submitOptions.priority - Job priority (1-10)
   * @returns {Promise<string>} Job ID
   */
  const submitJob = useCallback(
    async (targetFileId, operation, params = {}, submitOptions = {}) => {
      log.info(`Submitting job: ${operation} for file ${targetFileId}`);

      try {
        const response = await fetch(`${config.apiBaseUrl}/compute/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: targetFileId,
            operation,
            params,
            priority: submitOptions.priority || 5,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.message || error.error || "Failed to submit job"
          );
        }

        const data = await response.json();

        // Check if result was cached
        if (data.cached) {
          log.info(`Job result was cached: ${data.cacheId}`);
          toast.success(
            "Result already cached! Using existing processed file.",
            3000
          );

          // If there's a derived file from the cache, return its info
          if (data.derivedFileId) {
            return { cached: true, derivedFileId: data.derivedFileId };
          }
          return { cached: true, cacheId: data.cacheId };
        }

        // Add to local store
        addJob({
          id: data.job.id,
          fileId: targetFileId,
          fileName: submitOptions.fileName || targetFileId,
          operation,
          params,
        });

        log.info(`Job submitted: ${data.job.id}`);

        // Show submission toast
        const operationName = operation.replace(/-/g, " ");
        toast.info(
          `Started: ${operationName} on ${submitOptions.fileName || "file"}`,
          3000
        );

        return { cached: false, jobId: data.job.id };
      } catch (error) {
        log.error("Failed to submit job:", error);
        throw error;
      }
    },
    [addJob]
  );

  /**
   * Cancel a job
   */
  const cancelJob = useCallback(
    async (jobId) => {
      log.info(`Cancelling job: ${jobId}`);
      try {
        await fetch(`${config.apiBaseUrl}/compute/jobs/${jobId}/cancel`, {
          method: "POST",
        });
        removeJob(jobId);
      } catch (error) {
        log.error("Failed to cancel job:", error);
        // Still remove from local state
        removeJob(jobId);
      }
    },
    [removeJob]
  );

  /**
   * Dismiss a completed/failed job from the list
   */
  const dismissJob = useCallback(
    (jobId) => {
      removeJob(jobId);
    },
    [removeJob]
  );

  // Compute derived values
  const allJobs = Object.values(jobs);
  const activeJobs = allJobs.filter(
    (j) => j.status === JobStatus.QUEUED || j.status === JobStatus.PROCESSING
  );
  const completedJobs = allJobs.filter((j) => j.status === JobStatus.COMPLETE);
  const failedJobs = allJobs.filter((j) => j.status === JobStatus.FAILED);

  // Filter by file if specified
  const filteredJobs = fileId
    ? allJobs.filter((j) => j.fileId === fileId)
    : allJobs;

  return {
    // State
    jobs: filteredJobs,
    activeJobs,
    completedJobs,
    failedJobs,
    hasActiveJobs: activeJobs.length > 0,
    activeJobCount: activeJobs.length,

    // Actions
    submitJob,
    cancelJob,
    dismissJob,

    // Re-export status enum for convenience
    JobStatus,
  };
}

/**
 * Hook to get available operations for a file type
 *
 * @param {string} handlerType - Handler type (e.g., 'vtk')
 * @param {string} fileType - File extension (e.g., 'vtp')
 * @returns {Object} Operations state
 */
export function useComputeOperations(handlerType, fileType) {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!handlerType) return;

    const fetchOperations = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(`${config.apiBaseUrl}/compute/operations`);
        url.searchParams.set("handlerType", handlerType);
        if (fileType) url.searchParams.set("fileType", fileType);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch operations");

        const data = await response.json();
        setOperations(data.operations || []);
      } catch (err) {
        setError(err.message);
        setOperations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, [handlerType, fileType]);

  return { operations, loading, error };
}
