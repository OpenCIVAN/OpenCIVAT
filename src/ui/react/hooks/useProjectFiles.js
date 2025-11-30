// src/ui/react/hooks/useProjectFiles.js
// Hook to fetch files, folders, and starred items from the server
//
// Features:
// - Files with folder assignments
// - Folder tree structure
// - Workspace-scoped starred items
// - CRUD operations for folders
// - Star/unstar toggle

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";

/**
 * Hook to fetch and manage project files, folders, and stars
 *
 * @param {Object} options
 * @param {string} options.projectId - Override project ID (defaults to current session)
 * @param {string} options.scope - Star scope: 'personal' | 'room' | 'project' | 'all'
 * @param {string} options.roomId - Room ID for room-scoped stars
 * @param {boolean} options.autoRefresh - Auto-refresh on project change
 * @returns {Object} Files, folders, stars, and actions
 */
export function useProjectFiles(options = {}) {
  const {
    projectId: overrideProjectId,
    scope = "all",
    roomId = null,
    autoRefresh = true,
  } = options;

  // State
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [starredIds, setStarredIds] = useState({
    all: { files: [], folders: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Get project ID from session or override
  const projectId = overrideProjectId || sessionManager.getRoomId();

  // ==========================================================================
  // FETCH DATA
  // ==========================================================================

  /**
   * Fetch all data: files, folders, and stars
   */
  const fetchAll = useCallback(async () => {
    if (!projectId) {
      setFiles([]);
      setFolders([]);
      setStarredIds({ all: { files: [], folders: [] } });
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
      const headers = {
        "Content-Type": "application/json",
        // TODO: Add auth token when implemented
      };

      // Fetch files, folders, and stars in parallel
      const [filesRes, foldersRes, starsRes] = await Promise.all([
        fetch(`${config.apiBaseUrl}/projects/${projectId}/files`, {
          signal: abortControllerRef.current.signal,
          headers,
        }),
        fetch(`${config.apiBaseUrl}/projects/${projectId}/folders`, {
          signal: abortControllerRef.current.signal,
          headers,
        }),
        fetch(
          `${config.apiBaseUrl}/projects/${projectId}/stars?scope=${scope}${
            roomId ? `&roomId=${roomId}` : ""
          }`,
          {
            signal: abortControllerRef.current.signal,
            headers,
          }
        ),
      ]);

      // Handle errors
      if (!filesRes.ok && filesRes.status !== 404) {
        throw new Error(`Failed to fetch files: ${filesRes.status}`);
      }
      if (!foldersRes.ok && foldersRes.status !== 404) {
        throw new Error(`Failed to fetch folders: ${foldersRes.status}`);
      }
      if (!starsRes.ok && starsRes.status !== 404) {
        throw new Error(`Failed to fetch stars: ${starsRes.status}`);
      }

      // Parse responses
      const filesData = filesRes.ok ? await filesRes.json() : { files: [] };
      const foldersData = foldersRes.ok
        ? await foldersRes.json()
        : { folders: [] };
      const starsData = starsRes.ok
        ? await starsRes.json()
        : { starredIds: { all: { files: [], folders: [] } } };

      // Normalize files
      const normalizedFiles = (filesData.files || []).map((file) => ({
        id: file.id,
        name: file.filename,
        filename: file.filename,
        size: file.file_size,
        fileType: file.file_type,
        mimeType: file.mime_type,
        hash: file.hash,
        folderId: file.folder_id,
        folderPath: file.folder_path || "/",
        folderName: file.folder_name,
        uploadedBy: file.uploaded_by,
        uploadedAt: file.uploaded_at || file.added_at,
        accessLevel: file.access_level,
        visibility: file.visibility,
        metadata: file.metadata || {},
      }));

      setFiles(normalizedFiles);
      setFolders(foldersData.folders || []);
      setStarredIds(
        starsData.starredIds || { all: { files: [], folders: [] } }
      );
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Failed to fetch project data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scope, roomId]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAll]);

  // Listen for file events
  useEffect(() => {
    if (!autoRefresh) return;

    const handleRefresh = () => fetchAll();

    window.addEventListener("cia:file-uploaded", handleRefresh);
    window.addEventListener("cia:folder-changed", handleRefresh);
    window.addEventListener("cia:star-changed", handleRefresh);

    return () => {
      window.removeEventListener("cia:file-uploaded", handleRefresh);
      window.removeEventListener("cia:folder-changed", handleRefresh);
      window.removeEventListener("cia:star-changed", handleRefresh);
    };
  }, [autoRefresh, fetchAll]);

  // ==========================================================================
  // FOLDER ACTIONS
  // ==========================================================================

  const createFolder = useCallback(
    async (name, parentId = null) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/folders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, parentId }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to create folder: ${response.status}`
        );
      }

      const data = await response.json();
      window.dispatchEvent(new CustomEvent("cia:folder-changed"));
      return data.folder;
    },
    [projectId]
  );

  const renameFolder = useCallback(
    async (folderId, newName) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/folders/${folderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to rename folder: ${response.status}`
        );
      }

      window.dispatchEvent(new CustomEvent("cia:folder-changed"));
      return await response.json();
    },
    [projectId]
  );

  const moveFolder = useCallback(
    async (folderId, newParentId) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/folders/${folderId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: newParentId }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to move folder: ${response.status}`
        );
      }

      window.dispatchEvent(new CustomEvent("cia:folder-changed"));
      return await response.json();
    },
    [projectId]
  );

  const deleteFolder = useCallback(
    async (folderId, cascade = false) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/folders/${folderId}?cascade=${cascade}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to delete folder: ${response.status}`
        );
      }

      window.dispatchEvent(new CustomEvent("cia:folder-changed"));
      return await response.json();
    },
    [projectId]
  );

  // ==========================================================================
  // FILE ACTIONS
  // ==========================================================================

  const moveFile = useCallback(
    async (fileId, folderId) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/files/${fileId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to move file: ${response.status}`
        );
      }

      window.dispatchEvent(new CustomEvent("cia:folder-changed"));
      return await response.json();
    },
    [projectId]
  );

  const uploadFile = useCallback(
    async (file, options = {}) => {
      const {
        visibility = "all_members",
        accessLevel = "read",
        folderId = null,
      } = options;

      if (!projectId) throw new Error("No project selected");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", visibility);
      formData.append("access_level", accessLevel);
      if (folderId) formData.append("folder_id", folderId);

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/files`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      window.dispatchEvent(new CustomEvent("cia:file-uploaded"));
      return data.file;
    },
    [projectId]
  );

  // ==========================================================================
  // STAR ACTIONS
  // ==========================================================================

  const toggleStar = useCallback(
    async (targetType, targetId, starScope = "personal", starRoomId = null) => {
      if (!projectId) throw new Error("No project selected");

      const response = await fetch(
        `${config.apiBaseUrl}/projects/${projectId}/stars/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType,
            targetId,
            scope: starScope,
            roomId: starRoomId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to toggle star: ${response.status}`
        );
      }

      const result = await response.json();

      // Optimistic update
      setStarredIds((prev) => {
        const scopeKey = starScope;
        const allKey = "all";
        const typeKey = targetType === "file" ? "files" : "folders";

        const newState = { ...prev };

        // Update specific scope
        if (!newState[scopeKey])
          newState[scopeKey] = { files: [], folders: [] };
        if (result.starred) {
          newState[scopeKey][typeKey] = [
            ...new Set([...newState[scopeKey][typeKey], targetId]),
          ];
        } else {
          newState[scopeKey][typeKey] = newState[scopeKey][typeKey].filter(
            (id) => id !== targetId
          );
        }

        // Update 'all' aggregate
        if (!newState[allKey]) newState[allKey] = { files: [], folders: [] };
        if (result.starred) {
          newState[allKey][typeKey] = [
            ...new Set([...newState[allKey][typeKey], targetId]),
          ];
        } else {
          // Only remove from 'all' if not starred in any scope
          // For simplicity, just refetch - or leave it (will be correct on next fetch)
        }

        return newState;
      });

      window.dispatchEvent(new CustomEvent("cia:star-changed"));
      return result;
    },
    [projectId]
  );

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  /**
   * Check if an item is starred (in any scope visible to user)
   */
  const isStarred = useCallback(
    (targetType, targetId) => {
      const typeKey = targetType === "file" ? "files" : "folders";
      return starredIds.all?.[typeKey]?.includes(targetId) || false;
    },
    [starredIds]
  );

  /**
   * Files formatted for UI display
   */
  const filesForUI = useMemo(() => {
    return files.map((file) => ({
      ...file,
      starred: isStarred("file", file.id),
      sizeFormatted: formatFileSize(file.size),
    }));
  }, [files, isStarred]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Data
    files: filesForUI,
    folders,
    starredIds,
    isLoading,
    error,
    projectId,

    // Fetch
    refetch: fetchAll,

    // Folder actions
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,

    // File actions
    moveFile,
    uploadFile,

    // Star actions
    toggleStar,
    isStarred,
  };
}

// ==========================================================================
// HELPERS
// ==========================================================================

function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Hook to fetch files from ALL projects (for "Add existing file" dialogs)
 */
export function useAllAccessibleFiles() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiBaseUrl}/datasets`, {
        headers: { "Content-Type": "application/json" },
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
