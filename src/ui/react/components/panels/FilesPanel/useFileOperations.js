// src/ui/react/components/panels/FilesPanel/useFileOperations.js
// File operations hook - handles loading files from server into client memory
//
// This hook manages the bridge between:
// - Server (files stored in database/S3)
// - Client (files loaded into DatasetManager for visualization)
//
// Key operations:
// - loadServerFile: Download from server and load into DatasetManager
// - uploadFile: Upload to server, then load into DatasetManager (via useProjectFiles)
// - loadSample: Legacy support for static sample files (deprecated)

import { useRef, useCallback } from "react";
import { datasetManager } from "@Init/appInitializer.js";
import { config } from "@Core/config/clientConfig.js";

/**
 * Hook providing file operations for the FilesPanel
 *
 * @returns {Object} File operation functions
 */
export function useFileOperations() {
  // Track files currently being loaded to prevent duplicates
  const loadingFilesRef = useRef(new Set());

  /**
   * Load a file from the server into client memory
   *
   * @param {Object} serverFile - File metadata from server
   * @param {string} serverFile.id - Server file ID
   * @param {string} serverFile.filename - Original filename
   * @param {string} serverFile.name - Display name (same as filename usually)
   * @returns {Promise<string|null>} Dataset ID if successful, null if already loading
   */
  const loadServerFile = useCallback(async (serverFile) => {
    // Use serverId if available, fall back to id
    const downloadId = serverFile.serverId || serverFile.id;

    // Prevent duplicate loading
    if (loadingFilesRef.current.has(fileId)) {
      console.log(`📂 File ${filename} already loading, skipping`);
      return null;
    }

    loadingFilesRef.current.add(fileId);

    try {
      console.log(`📂 Loading from server: ${serverFile.filename} (${downloadId})`);

      // Download file from server
      const response = await fetch(
        `${config.apiBaseUrl}/files/${fileId}/download`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], filename, {
        type: serverFile.mimeType || "application/octet-stream",
        lastModified: serverFile.uploadedAt
          ? new Date(serverFile.uploadedAt).getTime()
          : Date.now(),
      });

      // Load into DatasetManager
      // Pass server metadata so we can track the relationship
      const datasetId = await datasetManager.loadDataset(file, null, {
        serverId: fileId,
        serverMetadata: {
          id: serverFile.id,
          hash: serverFile.hash,
          uploadedBy: serverFile.uploadedBy,
          uploadedAt: serverFile.uploadedAt,
          accessLevel: serverFile.accessLevel,
        },
      });

      console.log(`✅ Server file loaded: ${filename} → Dataset ${datasetId}`);

      // Emit event for other components to react
      window.dispatchEvent(
        new CustomEvent("cia:dataset-loaded", {
          detail: { datasetId, serverId: fileId, filename },
        })
      );

      return datasetId;
    } catch (error) {
      console.error(`❌ Failed to load server file ${filename}:`, error);
      throw new Error(`Failed to load ${filename}: ${error.message}`);
    } finally {
      loadingFilesRef.current.delete(fileId);
    }
  }, []);

  /**
   * Check if a file is currently being loaded
   *
   * @param {string} fileId - Server file ID to check
   * @returns {boolean}
   */
  const isLoading = useCallback((fileId) => {
    return loadingFilesRef.current.has(fileId);
  }, []);

  /**
   * Upload a file to the server and load into client
   * Note: This is a convenience method - typically you'd use
   * useProjectFiles().uploadFile() directly for more control
   *
   * @deprecated Use useProjectFiles().uploadFile() instead
   * @param {File} file - File object from input
   * @returns {Promise<string|null>} Dataset ID if successful
   */
  const uploadFile = useCallback(async (file) => {
    if (!file) return null;

    console.warn(
      "⚠️ useFileOperations.uploadFile is deprecated. Use useProjectFiles().uploadFile()"
    );

    try {
      console.log(`📂 Uploading file: ${file.name}`);

      // Load directly into DatasetManager for now
      // In production, this should go through useProjectFiles
      const datasetId = await datasetManager.loadDataset(file, null);

      console.log(`✅ File uploaded: ${file.name} → Dataset ${datasetId}`);
      return datasetId;
    } catch (error) {
      console.error(`❌ Failed to upload file ${file.name}:`, error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
  }, []);

  /**
   * Load a sample file from static path
   *
   * @deprecated Sample files are being migrated to server storage
   * @param {Object} sample - Sample file descriptor
   * @param {string} sample.name - Filename
   * @param {string} sample.path - Path to fetch from
   * @returns {Promise<string|null>} Dataset ID if successful
   */
  const loadSample = useCallback(async (sample) => {
    if (loadingFilesRef.current.has(sample.name)) {
      console.log(`📂 Sample ${sample.name} already loading, skipping`);
      return null;
    }

    loadingFilesRef.current.add(sample.name);

    try {
      console.log(`📂 Loading sample: ${sample.path}`);
      console.warn(
        "⚠️ loadSample is deprecated. Samples should be served from database."
      );

      const response = await fetch(sample.path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], sample.name, {
        type: "application/octet-stream",
      });

      const datasetId = await datasetManager.loadDataset(file, sample.path);
      console.log(`✅ Sample loaded: ${sample.name}`);

      return datasetId;
    } catch (error) {
      console.error(`❌ Failed to load sample ${sample.name}:`, error);
      throw new Error(`Failed to load ${sample.name}: ${error.message}`);
    } finally {
      loadingFilesRef.current.delete(sample.name);
    }
  }, []);

  /**
   * Check if a server file is already loaded in the client
   *
   * @param {string} serverId - Server file ID
   * @returns {Object|null} Dataset if found, null otherwise
   */
  const findLoadedDataset = useCallback((serverId) => {
    const datasets = datasetManager?.getAllDatasets() || [];
    return datasets.find(
      (ds) =>
        ds.serverId === serverId ||
        ds.metadata?.serverId === serverId ||
        ds.id === serverId
    );
  }, []);

  /**
   * Check if a file by filename is already loaded
   * Useful for checking sample files or uploads
   *
   * @param {string} filename - Filename to check
   * @returns {Object|null} Dataset if found, null otherwise
   */
  const findDatasetByFilename = useCallback((filename) => {
    const datasets = datasetManager?.getAllDatasets() || [];
    return datasets.find(
      (ds) => ds.filename === filename || ds.name === filename
    );
  }, []);

  return {
    // Primary operations
    loadServerFile,
    isLoading,

    // Lookup helpers
    findLoadedDataset,
    findDatasetByFilename,

    // Deprecated (for backward compatibility)
    uploadFile,
    loadSample,
  };
}
