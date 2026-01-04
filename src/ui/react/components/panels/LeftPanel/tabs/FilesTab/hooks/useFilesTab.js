/**
 * @file useFilesTab.js
 * @description Hook for FilesTab state management.
 * Provides file loading, filtering, and actions.
 *
 * @example
 * const { files, starredFiles, handleStar, handleUpload } = useFilesTab({ workspaceId });
 */

import { useState, useMemo, useCallback } from "react";
import { ui as log } from "@Utils/logger.js";
import { useProjectFiles } from "@UI/react/hooks/useProjectFiles.js";
import { useComputeJobs } from "@UI/react/hooks/useComputeJobs.js";
import { useDatasets } from "@UI/react/hooks/useDatasets.js";
import { useSectionStates } from "@UI/react/components/organisms/ResizableSections";
import { formatFileSize } from "@Utils/formatters.js";
import { getHandlerForFileType } from "@Core/instances/types/instanceTypesInit.js";
import { instanceTypeRegistry } from "@Core/instances/types/instanceTypeRegistry.js";

/**
 * Check if a file type can be visualized
 * @param {string} fileType - File type extension
 * @returns {boolean}
 */
export const canVisualize = (fileType) => {
  if (!fileType) return false;
  return getHandlerForFileType(fileType) !== null;
};

/**
 * @typedef {Object} UseFilesTabOptions
 * @property {string} workspaceId - Current workspace ID
 * @property {Array} [mockFiles] - Mock files for testing
 * @property {Set} [mockStarredIds] - Mock starred IDs for testing
 * @property {boolean} [mockIsLoading] - Mock loading state
 * @property {string} [mockError] - Mock error state
 */

/**
 * Hook for FilesTab state management.
 *
 * @param {UseFilesTabOptions} options - Hook options
 * @returns {Object} Hook return value
 */
export function useFilesTab({
  workspaceId,
  mockFiles = null,
  mockStarredIds = null,
  mockIsLoading = null,
  mockError = null,
}) {
  // View state
  const [viewMode, setViewMode] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ types: [] });

  // Selection and expansion state
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set([1]));

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Upload drag state
  const [isDragOver, setIsDragOver] = useState(false);

  // Section states (VS Code-style)
  const {
    states: sectionStates,
    toggleSection,
    resizeSection,
  } = useSectionStates({
    starred: { expanded: true, flexGrow: 1 },
    loaded: { expanded: true, flexGrow: 1 },
    all: { expanded: true, flexGrow: 2 },
  });

  // Fetch files from server
  const {
    files: hookFiles,
    isLoading: hookLoading,
    error: hookError,
    refetch,
    uploadFile,
    toggleStar,
  } = useProjectFiles();

  // Compute jobs hook
  const { submitJob } = useComputeJobs();

  // Loaded datasets from DatasetManager
  const loadedDatasets = useDatasets();

  // Use mock data if provided
  const serverFiles = mockFiles ?? hookFiles;
  const isLoading = mockIsLoading ?? hookLoading;
  const error = mockError ?? hookError;

  // Transform server files to UI format
  const files = useMemo(() => {
    if (!serverFiles || serverFiles.length === 0) return [];

    return serverFiles.map((file) => ({
      id: file.id,
      name: file.name || file.filename,
      fileType: file.fileType,
      size:
        file.sizeFormatted ||
        (typeof file.size === "number"
          ? formatFileSize(file.size)
          : file.size) ||
        "",
      starred: mockStarredIds
        ? mockStarredIds.has(file.id)
        : file.starred ?? false,
      loaded: file.loaded ?? false,
      thumbnail: file.thumbnail ?? canVisualize(file.fileType),
      date: file.uploadedAt,
      isFolder: false,
    }));
  }, [serverFiles, mockStarredIds]);

  // Starred files
  const starredFiles = useMemo(() => {
    return files.filter((f) => f.starred);
  }, [files]);

  // Loaded datasets formatted for display
  const loadedDatasetsFormatted = useMemo(() => {
    return loadedDatasets.map((ds) => ({
      id: ds.id,
      name: ds.name,
      fileType: ds.fileType,
      size: ds.pointCount ? `${ds.pointCount.toLocaleString()} pts` : "",
      starred: false,
      loaded: true,
      thumbnail: true,
      date: ds.uploadedAt,
      isFolder: false,
      isDataset: true,
    }));
  }, [loadedDatasets]);

  // Loaded count
  const loadedCount = useMemo(() => {
    return files.filter((f) => f.loaded).length;
  }, [files]);

  // Get all supported file types
  const supportedFileTypes = useMemo(() => {
    const handlers = instanceTypeRegistry.getAvailableHandlers();
    const types = new Set();

    handlers.forEach(({ handler }) => {
      const supported = handler.getSupportedFileTypes();
      supported.forEach((t) => types.add(t.extension));
    });

    return Array.from(types);
  }, []);

  // Filter files
  const filteredFiles = useMemo(() => {
    let result = files;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.name?.toLowerCase().includes(query));
    }

    // Type filter
    if (activeFilters.types.length > 0) {
      result = result.filter((f) => activeFilters.types.includes(f.fileType));
    }

    return result;
  }, [files, searchQuery, activeFilters]);

  // Handlers
  const toggleFolder = useCallback((id) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleStar = useCallback(
    async (id) => {
      try {
        await toggleStar({ type: "file", targetId: id });
        log.debug("Toggled star for file:", id);
      } catch (err) {
        log.error("Failed to toggle star:", err);
      }
    },
    [toggleStar]
  );

  const handleDragStart = useCallback((e, file) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "file",
        ...file,
        isFile: true,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleDoubleClick = useCallback((file) => {
    log.info(`Double-click to open: ${file.name}`);
    window.dispatchEvent(
      new CustomEvent("cia:request-instance", {
        detail: {
          datasetId: file.id,
          fileId: file.id,
          fileName: file.name,
        },
      })
    );
  }, []);

  const handleContextMenu = useCallback((e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleMenuClick = useCallback((e, file) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.right, y: rect.top, file });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback(
    async (action, file, operation) => {
      log.debug("Context action:", action, file, operation);

      switch (action) {
        case "open":
          log.info(`Opening file in instance: ${file.name}`);
          window.dispatchEvent(
            new CustomEvent("cia:request-instance", {
              detail: {
                datasetId: file.id,
                fileId: file.id,
                fileName: file.name,
              },
            })
          );
          break;

        case "info":
          log.info(`Show details for: ${file.name}`);
          break;

        case "rename":
          log.info(`Rename file: ${file.name}`);
          break;

        case "star":
          await handleStar(file.id);
          break;

        case "process":
          if (operation) {
            try {
              log.info(`Submitting ${operation.id} job for file ${file.id}`);
              await submitJob(
                file.id,
                operation.id,
                operation.defaultParams || {},
                {
                  fileName: file.name,
                }
              );
            } catch (err) {
              log.error("Failed to submit compute job:", err);
            }
          }
          break;

        default:
          log.warn(`Unknown context action: ${action}`);
      }
    },
    [submitJob, handleStar]
  );

  const toggleTypeFilter = useCallback((type) => {
    setActiveFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({ types: [] });
  }, []);

  const handleUpload = useCallback(
    async (file) => {
      try {
        await uploadFile({ file });
        refetch();
      } catch (err) {
        log.error("Upload failed:", err);
      }
    },
    [uploadFile, refetch]
  );

  return {
    // View state
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    activeFilters,
    toggleTypeFilter,
    clearFilters,

    // Selection
    selectedFileId,
    setSelectedFileId,
    expandedFolders,
    toggleFolder,

    // Section states
    sectionStates,
    toggleSection,
    resizeSection,

    // Context menu
    contextMenu,
    handleContextMenu,
    handleMenuClick,
    closeContextMenu,
    handleContextAction,

    // Upload
    isDragOver,
    setIsDragOver,
    handleUpload,

    // Files data
    files: filteredFiles,
    allFiles: files,
    starredFiles,
    loadedDatasetsFormatted,
    loadedCount,
    supportedFileTypes,
    isLoading,
    error,

    // Actions
    handleStar,
    handleDragStart,
    handleDoubleClick,
    refetch,
  };
}

export default useFilesTab;
