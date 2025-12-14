// src/ui/react/components/panels/LeftPanel/tabs/FilesTab.logic.js
// Headless logic for FilesTab - handles file selection and loading
//
// This separates business logic from presentation following the headless pattern.
// The key fix: When a user clicks a file in FilesTab, we need to:
// 1. Check if the file is already loaded as a dataset
// 2. If not, load it first via DatasetManager
// 3. Then create the instance with the correct datasetId

import { useCallback } from "react";
import { getDatasetManager } from "@Init/appInitializer.js";
import { files as log } from "@Utils/logger.js";

/**
 * Hook for file loading logic
 *
 * Bridges the gap between FilesTab (server files) and DatasetManager (loaded datasets).
 * When a user clicks a file, we need to ensure it's loaded before creating an instance.
 *
 * @param {Object} options
 * @param {Function} options.onLoadStart - Called when loading starts
 * @param {Function} options.onLoadComplete - Called when loading completes
 * @param {Function} options.onLoadError - Called on error
 * @returns {Object} File loading utilities
 */
export function useFileLoader({
  onLoadStart,
  onLoadComplete,
  onLoadError,
} = {}) {
  /**
   * Load a file and open it in an instance
   *
   * This is the key fix: we check if the file is already a dataset,
   * and if not, we load it first before dispatching the instance request.
   *
   * @param {Object} file - File object from server with id, name, etc.
   * @param {Object} options - Options for loading
   * @param {boolean} options.spawnNew - Force create new instance
   */
  const loadFileIntoInstance = useCallback(
    async (file, options = {}) => {
      const { spawnNew = false } = options;

      log.info(`Loading file into instance: ${file.name}`);
      onLoadStart?.(file);

      try {
        // Step 1: Check if file is already loaded as a dataset
        // In v2.0, file.id from the server equals dataset.id after sync
        let dataset = getDatasetManager()?.getDataset(file.id);

        if (dataset) {
          log.debug(`File already loaded as dataset: ${dataset.id}`);
        } else {
          // Step 2: File not loaded yet - need to fetch and load it
          log.debug(`File not in DatasetManager, fetching from server...`);

          // First, check if we can fetch the file data
          const downloadUrl =
            file.downloadUrl ||
            `${
              window.CIA_CONFIG?.apiBaseUrl || "http://localhost:3001"
            }/api/files/${file.id}/download`;

          try {
            const response = await fetch(downloadUrl, {
              credentials: "include",
              headers: {
                Authorization: `Bearer ${
                  localStorage.getItem("auth_token") || ""
                }`,
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to download file: ${response.status}`);
            }

            // Convert response to File object
            const blob = await response.blob();
            const fileObj = new File([blob], file.name, {
              type: file.mimeType || "application/octet-stream",
            });

            // Step 3: Add to DatasetManager with server ID
            // This registers the dataset with the correct server-provided ID
            dataset = await getDatasetManager()?.addDataset(fileObj, {
              userId: file.uploadedBy || "system",
              serverId: file.id, // Use server's file ID as dataset ID
              serverMetadata: {
                fileType: file.fileType,
                hash: file.hash,
                uploadedAt: file.uploadedAt,
              },
            });

            log.info(`File loaded into DatasetManager: ${dataset.id}`);
          } catch (fetchError) {
            log.error(`Failed to fetch file from server:`, fetchError);
            throw new Error(`Could not download file: ${fetchError.message}`);
          }
        }

        // Step 4: Now dispatch the instance request with the correct datasetId
        log.debug(`Dispatching instance request for dataset: ${dataset.id}`);

        window.dispatchEvent(
          new CustomEvent("cia:request-instance", {
            detail: {
              datasetId: dataset.id,
              spawnNew: spawnNew,
              fileName: file.name,
              fileType: file.fileType,
            },
          })
        );

        onLoadComplete?.(dataset);
        return dataset;
      } catch (error) {
        log.error(`Failed to load file into instance:`, error);
        onLoadError?.(error, file);
        throw error;
      }
    },
    [onLoadStart, onLoadComplete, onLoadError]
  );

  /**
   * Check if a file is already loaded as a dataset
   * @param {string} fileId - Server file ID
   * @returns {boolean}
   */
  const isFileLoaded = useCallback((fileId) => {
    return getDatasetManager()?.getDataset(fileId) !== null;
  }, []);

  /**
   * Get dataset for a file if loaded
   * @param {string} fileId - Server file ID
   * @returns {Dataset|null}
   */
  const getDatasetForFile = useCallback((fileId) => {
    return getDatasetManager()?.getDataset(fileId);
  }, []);

  return {
    loadFileIntoInstance,
    isFileLoaded,
    getDatasetForFile,
  };
}

/**
 * Create updated click handlers for FilesTab
 *
 * These handlers use the useFileLoader hook to properly load files
 * before creating instances.
 *
 * @param {Object} fileLoader - Result from useFileLoader
 * @param {Function} showToast - Toast notification function
 * @returns {Object} Event handlers
 */
export function createFileHandlers(fileLoader, showToast) {
  const { loadFileIntoInstance, isFileLoaded } = fileLoader;

  /**
   * Handle single click on a file
   * Single click selects, does NOT load
   */
  const handleFileClick = (file, onSelect) => {
    log.debug(`File clicked: ${file.name}`);
    onSelect?.(file.id);
  };

  /**
   * Handle double-click on a file
   * Double-click loads and opens in instance
   */
  const handleFileDoubleClick = async (file) => {
    log.info(`Double-click to open: ${file.name}`);

    // Show loading state
    showToast?.({
      type: "info",
      message: `Loading ${file.name}...`,
      duration: 2000,
    });

    try {
      await loadFileIntoInstance(file);

      showToast?.({
        type: "success",
        message: `Opened ${file.name}`,
        duration: 3000,
      });
    } catch (error) {
      showToast?.({
        type: "error",
        message: `Failed to open ${file.name}: ${error.message}`,
        duration: 5000,
      });
    }
  };

  /**
   * Handle context menu "Open" action
   */
  const handleContextOpen = async (file) => {
    log.info(`Context menu open: ${file.name}`);
    await loadFileIntoInstance(file);
  };

  /**
   * Handle context menu "Open in New Instance" action
   */
  const handleContextOpenNew = async (file) => {
    log.info(`Context menu open in new instance: ${file.name}`);
    await loadFileIntoInstance(file, { spawnNew: true });
  };

  /**
   * Handle drag start - include loaded status
   */
  const handleDragStart = (e, file) => {
    const loaded = isFileLoaded(file.id);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: 'file',
        ...file,
        isLoaded: loaded,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return {
    handleFileClick,
    handleFileDoubleClick,
    handleContextOpen,
    handleContextOpenNew,
    handleDragStart,
  };
}
