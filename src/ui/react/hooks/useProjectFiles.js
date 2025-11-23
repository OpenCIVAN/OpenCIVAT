// src/ui/react/hooks/useProjectFiles.js
// Hook to fetch files available in the current project from the server
//
// This replaces the hardcoded SAMPLE_FILES array with real server data.
// Files returned are those accessible to the current user in the current project.

import { useState, useEffect, useCallback, useRef } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";

// Get API base URL - handle both Webpack DefinePlugin and direct browser usage
const getApiBase = () => {
  // Try environment variable first (if Webpack DefinePlugin is configured)
  if (typeof __API_BASE_URL__ !== "undefined") {
    return __API_BASE_URL__;
  }
  // Fallback to window config (can be set in index.html)
  if (typeof window !== "undefined" && window.__CIA_CONFIG__?.apiBaseUrl) {
    return window.__CIA_CONFIG__.apiBaseUrl;
  }
  // Default for local development
  return "http://localhost:3001/api";
};

const API_BASE = getApiBase();

/**
 * Hook to fetch and manage project files from the server
 *
 * @param {Object} options
 * @param {string} options.projectId - Override project ID (defaults to current session)
 * @param {boolean} options.autoRefresh - Auto-refresh on project change
 * @returns {Object} { files, isLoading, error, refetch, uploadFile }
 */
export function useProjectFiles(options = {}) {
  const { projectId: overrideProjectId, autoRefresh = true } = options;

  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Get project ID from session or override
  const projectId = overrideProjectId || sessionManager.getRoomId();

  /**
   * Fetch files from server
   */
  const fetchFiles = useCallback(async () => {
    if (!projectId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          // TODO: Add auth token when implemented
          // 'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Project doesn't exist yet - return empty
          setFiles([]);
          setIsLoading(false);
          return;
        }
        throw new Error(
          `Failed to fetch files: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Normalize file data for UI consumption
      const normalizedFiles = (data.files || []).map((file) => ({
        id: file.id,
        name: file.filename,
        filename: file.filename,
        size: file.file_size,
        fileType: file.file_type,
        mimeType: file.mime_type,
        hash: file.hash,
        uploadedBy: file.uploaded_by,
        uploadedAt: file.uploaded_at,
        accessLevel: file.access_level,
        visibility: file.visibility,
        isOwnUpload: file.is_own_upload,
        metadata: file.metadata || {},
      }));

      setFiles(normalizedFiles);
    } catch (err) {
      if (err.name === "AbortError") {
        return; // Request was cancelled
      }
      console.error("Failed to fetch project files:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Upload a new file to the project
   */
  const uploadFile = useCallback(
    async (file, options = {}) => {
      const { visibility = "all_members", accessLevel = "read" } = options;

      if (!projectId) {
        throw new Error("No project selected");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", visibility);
      formData.append("access_level", accessLevel);

      const response = await fetch(`${API_BASE}/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
        headers: {
          // Note: Don't set Content-Type for FormData, browser sets it with boundary
          // TODO: Add auth token when implemented
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();

      // Normalize the returned file
      const normalizedFile = {
        id: data.file.id,
        name: data.file.filename,
        filename: data.file.filename,
        size: data.file.file_size,
        fileType: data.file.file_type,
        mimeType: data.file.mime_type,
        hash: data.file.hash,
        uploadedBy: data.file.uploaded_by,
        uploadedAt: data.file.uploaded_at,
        deduplicated: data.deduplicated,
      };

      // Add to local state immediately
      setFiles((prev) => [normalizedFile, ...prev]);

      return normalizedFile;
    },
    [projectId]
  );

  /**
   * Add an existing file to this project (share from another project)
   */
  const addFileToProject = useCallback(
    async (fileId, options = {}) => {
      const { visibility = "all_members", accessLevel = "read" } = options;

      if (!projectId) {
        throw new Error("No project selected");
      }

      const response = await fetch(
        `${API_BASE}/projects/${projectId}/files/${fileId}/access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visibility, access_level: accessLevel }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to add file: ${response.status}`
        );
      }

      // Refetch to get updated list
      await fetchFiles();
    },
    [projectId, fetchFiles]
  );

  // Initial fetch
  useEffect(() => {
    fetchFiles();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFiles]);

  // Listen for file upload events (from other sources)
  useEffect(() => {
    if (!autoRefresh) return;

    const handleFileUploaded = () => {
      fetchFiles();
    };

    window.addEventListener("cia:file-uploaded", handleFileUploaded);

    return () => {
      window.removeEventListener("cia:file-uploaded", handleFileUploaded);
    };
  }, [autoRefresh, fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
    uploadFile,
    addFileToProject,
    projectId,
  };
}

/**
 * Hook to fetch files from ALL projects the user has access to
 * Useful for "Add existing file to project" dialogs
 */
export function useAllAccessibleFiles() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all datasets the user can see
      const response = await fetch(`${API_BASE}/datasets`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const data = await response.json();
      setFiles(data.datasets || data || []);
    } catch (err) {
      console.error("Failed to fetch all files:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, isLoading, error, refetch: fetchFiles };
}
