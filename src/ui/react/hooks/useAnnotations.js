// src/ui/react/hooks/useAnnotations.js
// Hook for accessing and managing annotations
//
// Connects UI components to the AnnotationManager and provides
// scoped annotation access, filtering, and CRUD operations.

import { useState, useEffect, useCallback, useMemo } from "react";
import { annotationManager, datasetManager } from "@Init/appInitializer.js";
import { apiClient } from "@Services/apiClient.js";
import { getUserId } from "@Collaboration/presence/userManagement.js";
import { annotation as log } from "@Utils/logger.js";

/**
 * useAnnotations - Hook for annotation management
 *
 * @param {object} options - Configuration options
 * @param {string} options.datasetId - Filter by specific dataset (optional)
 * @param {string} options.projectId - Project context (required for server calls)
 * @param {string} options.workspaceId - Filter by workspace (optional)
 * @returns {object} Annotation state and actions
 */
export function useAnnotations(options = {}) {
  const { datasetId, projectId, workspaceId } = options;

  // State
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeScope, setActiveScope] = useState("all"); // 'all' | 'mine' | 'shared'

  // Get current user for filtering
  const currentUserId = getUserId();

  // ---------------------------------------------------------------------------
  // FETCH ANNOTATIONS
  // ---------------------------------------------------------------------------

  const fetchAnnotations = useCallback(async () => {
    if (!datasetManager) {
      log.warn("DatasetManager not initialized");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let allAnnotations = [];

      if (datasetId) {
        // Fetch for specific dataset from server
        try {
          const result = await apiClient.get(
            `/annotations?fileId=${datasetId}`
          );
          allAnnotations = result.annotations || [];
        } catch (err) {
          // Fallback to local annotations if server fails
          log.warn("Server fetch failed, using local annotations:", err);
          const dataset = datasetManager.getDataset(datasetId);
          allAnnotations = dataset?.annotations || [];
        }
      } else {
        // Get annotations from all loaded datasets (local cache)
        const datasets = datasetManager.getAllDatasets();
        for (const dataset of datasets) {
          if (dataset.annotations) {
            allAnnotations.push(...dataset.annotations);
          }
        }
      }

      setAnnotations(allAnnotations);
      log.debug(`Loaded ${allAnnotations.length} annotations`);
    } catch (err) {
      log.error("Failed to fetch annotations:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [datasetId, projectId, workspaceId]);

  // ---------------------------------------------------------------------------
  // GROUPED & FILTERED DATA
  // ---------------------------------------------------------------------------

  // Group annotations by dataset
  const annotationsByDataset = useMemo(() => {
    const grouped = new Map();

    for (const ann of annotations) {
      const dsId = ann.datasetId;
      if (!grouped.has(dsId)) {
        const dataset = datasetManager.getDataset(dsId);
        grouped.set(dsId, {
          id: dsId,
          name: dataset?.filename || dataset?.name || "Unknown Dataset",
          color: dataset?.color || "blue",
          annotations: [],
        });
      }
      grouped.get(dsId).annotations.push(ann);
    }

    return Array.from(grouped.values());
  }, [annotations]);

  // Scoped annotations based on activeScope
  const scopedAnnotations = useMemo(() => {
    switch (activeScope) {
      case "mine":
        return annotations.filter((a) => a.createdBy === currentUserId);
      case "shared":
        return annotations.filter(
          (a) => a.visibility === "public" && a.createdBy !== currentUserId
        );
      default:
        return annotations;
    }
  }, [annotations, activeScope, currentUserId]);

  // Grouped by type
  const annotationsByType = useMemo(
    () => ({
      point: scopedAnnotations.filter((a) => a.type === "point"),
      ruler: scopedAnnotations.filter(
        (a) => a.type === "ruler" || a.type === "measurement"
      ),
      region: scopedAnnotations.filter((a) => a.type === "region"),
      note: scopedAnnotations.filter((a) => a.type === "note"),
    }),
    [scopedAnnotations]
  );

  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS
  // ---------------------------------------------------------------------------

  const createAnnotation = useCallback(
    async (dsId, config) => {
      try {
        // Use DatasetManager which has correct server integration
        const annotation = await datasetManager.addAnnotation(
          dsId,
          config,
          currentUserId,
          { projectId }
        );

        // Optimistically add to local state
        setAnnotations((prev) => [...prev, annotation]);

        return annotation;
      } catch (err) {
        log.error("Failed to create annotation:", err);
        setError(err);
        throw err;
      }
    },
    [projectId, currentUserId]
  );

  const updateAnnotation = useCallback(async (dsId, annotationId, updates) => {
    try {
      // Update on server
      await apiClient.put(`/annotations/${annotationId}`, updates);

      // Update local state
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotationId ? { ...a, ...updates } : a))
      );

      // Update in dataset
      const dataset = datasetManager.getDataset(dsId);
      if (dataset) {
        const annotation = dataset.getAnnotation?.(annotationId);
        if (annotation) {
          Object.assign(annotation, updates);
        }
      }
    } catch (err) {
      log.error("Failed to update annotation:", err);
      setError(err);
      throw err;
    }
  }, []);

  const deleteAnnotation = useCallback(async (dsId, annotationId) => {
    try {
      // Delete on server
      await apiClient.delete(`/annotations/${annotationId}`);

      // Remove from local state
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));

      // Remove from dataset
      const dataset = datasetManager.getDataset(dsId);
      if (dataset) {
        dataset.removeAnnotation?.(annotationId);
      }
    } catch (err) {
      log.error("Failed to delete annotation:", err);
      setError(err);
      throw err;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // VISIBILITY TOGGLE
  // ---------------------------------------------------------------------------

  const toggleVisibility = useCallback(
    async (dsId, annotationId) => {
      const annotation = annotations.find((a) => a.id === annotationId);
      if (!annotation) return;

      const newVisible = !annotation.visible;

      try {
        await apiClient.put(`/annotations/${annotationId}`, {
          visible: newVisible,
        });

        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === annotationId ? { ...a, visible: newVisible } : a
          )
        );
      } catch (err) {
        log.error("Failed to toggle annotation visibility:", err);
        setError(err);
      }
    },
    [annotations]
  );

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------

  const navigateToAnnotation = useCallback((annotation) => {
    // Emit event for VTK handler to navigate camera
    window.dispatchEvent(
      new CustomEvent("annotation:navigate", {
        detail: {
          annotationId: annotation.id,
          datasetId: annotation.datasetId,
          position: annotation.position || annotation.coordinates,
        },
      })
    );

    log.debug(`Navigating to annotation ${annotation.id}`);
  }, []);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Initial fetch
  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  // Subscribe to dataset manager annotation events
  useEffect(() => {
    if (!datasetManager) return;

    const handleAdded = ({ annotation }) => {
      setAnnotations((prev) => {
        // Avoid duplicates
        if (prev.some((a) => a.id === annotation.id)) return prev;
        return [...prev, annotation];
      });
    };

    const handleUpdated = ({ annotation }) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === annotation.id ? annotation : a))
      );
    };

    const handleRemoved = ({ annotationId }) => {
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    };

    datasetManager.on("annotationAdded", handleAdded);
    datasetManager.on("annotationUpdated", handleUpdated);
    datasetManager.on("annotationRemoved", handleRemoved);

    return () => {
      datasetManager.off("annotationAdded", handleAdded);
      datasetManager.off("annotationUpdated", handleUpdated);
      datasetManager.off("annotationRemoved", handleRemoved);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    annotations: scopedAnnotations,
    annotationsByDataset,
    annotationsByType,
    isLoading,
    error,

    // Scope
    activeScope,
    setActiveScope,

    // Actions
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleVisibility,
    navigateToAnnotation,
    refetch: fetchAnnotations,
  };
}

export default useAnnotations;
