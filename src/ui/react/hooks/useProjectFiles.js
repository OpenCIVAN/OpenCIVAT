// src/ui/react/hooks/useProjectFiles.js
// Hook to fetch files, folders, and starred items from the server
//
// REFACTORED: Uses useAsyncData and useAsyncMutation
// Before: ~400 lines | After: ~280 lines

import { useCallback, useMemo } from "react";
import { api as log } from "@Utils/logger.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { formatFileSize } from "@Utils/formatters.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

/**
 * Hook to fetch and manage project files, folders, and stars
 *
 * @param {Object} options
 * @param {string} options.projectId - Override project ID (defaults to current session)
 * @param {string} options.scope - Star scope: 'personal' | 'room' | 'project' | 'all'
 * @param {string} options.roomId - Room ID for room-scoped stars
 * @returns {Object} Files, folders, stars, and actions
 */
export function useProjectFiles(options = {}) {
  const {
    projectId: overrideProjectId,
    scope = "all",
    roomId = null,
  } = options;

  // Get project ID from session or override
  const projectId = overrideProjectId || sessionManager.getRoomId();
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  const getHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-user-id":
        sessionManager.getUserId?.() || "00000000-0000-0000-0000-000000000002",
      "x-user-email": sessionManager.getUserEmail?.() || "demo@cia-web.local",
      "x-user-name": sessionManager.getUserName?.() || "Demo User",
    }),
    []
  );

  // ---------------------------------------------------------------------------
  // FETCH ALL DATA
  // ---------------------------------------------------------------------------

  const fetchAll = useCallback(
    async (signal) => {
      if (!projectId) {
        return {
          files: [],
          folders: [],
          starredIds: { all: { files: [], folders: [] } },
        };
      }

      // Fetch files, folders, and stars in parallel
      const [filesRes, foldersRes, starsRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/files`, {
          signal,
          headers: getHeaders(),
        }),
        fetch(`${apiBase}/projects/${projectId}/folders`, {
          signal,
          headers: getHeaders(),
        }),
        fetch(
          `${apiBase}/projects/${projectId}/stars?scope=${scope}${
            roomId ? `&roomId=${roomId}` : ""
          }`,
          {
            signal,
            headers: getHeaders(),
          }
        ),
      ]);

      // Parse responses
      const filesData = filesRes.ok ? await filesRes.json() : { files: [] };
      const foldersData = foldersRes.ok
        ? await foldersRes.json()
        : { folders: [] };
      const starsData = starsRes.ok
        ? await starsRes.json()
        : { starredIds: { all: { files: [], folders: [] } } };

      return {
        files: filesData.files || [],
        folders: foldersData.folders || [],
        starredIds: starsData.starredIds || { all: { files: [], folders: [] } },
      };
    },
    [apiBase, projectId, scope, roomId, getHeaders]
  );

  const { data, isLoading, error, refetch } = useAsyncData(
    fetchAll,
    [projectId, scope, roomId],
    {
      initialData: {
        files: [],
        folders: [],
        starredIds: { all: { files: [], folders: [] } },
      },
      enabled: !!projectId,
    }
  );

  const { files, folders, starredIds } = data;

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("file", {
    onCreate: () => refetch(),
    onUpdate: () => refetch(),
    onDelete: () => refetch(),
  });

  useServerSyncEvents("folder", {
    onCreate: () => refetch(),
    onUpdate: () => refetch(),
    onDelete: () => refetch(),
  });

  // ---------------------------------------------------------------------------
  // FOLDER MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: createFolder } = useAsyncMutation(
    async ({ name, parentId = null }) => {
      const response = await fetch(`${apiBase}/projects/${projectId}/folders`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, parentId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: renameFolder } = useAsyncMutation(
    async ({ folderId, name }) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/folders/${folderId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to rename folder: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: moveFolder } = useAsyncMutation(
    async ({ folderId, newParentId }) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/folders/${folderId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ parentId: newParentId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to move folder: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: deleteFolder } = useAsyncMutation(
    async (folderId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/folders/${folderId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete folder: ${response.status}`);
      }

      return { id: folderId };
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // FILE MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: moveFile } = useAsyncMutation(
    async ({ fileId, folderId }) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/files/${fileId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ folderId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to move file: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  const { mutate: uploadFile } = useAsyncMutation(
    async ({ file, folderId = null }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);

      const response = await fetch(`${apiBase}/projects/${projectId}/files`, {
        method: "POST",
        headers: Object.fromEntries(
          Object.entries(getHeaders()).filter(([key]) => key !== "Content-Type")
        ),
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // STAR MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: toggleStar } = useAsyncMutation(
    async ({ type, targetId, starScope = "personal" }) => {
      // Use the toggle endpoint which handles both star and unstar
      const response = await fetch(
        `${apiBase}/projects/${projectId}/stars/toggle`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            targetType: type,
            targetId,
            scope: starScope,
            roomId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to toggle star: ${response.status}`);
      }

      return response.json();
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const isStarred = useCallback(
    (type, targetId) => {
      const typeKey = type === "file" ? "files" : "folders";
      return starredIds.all?.[typeKey]?.includes(targetId) || false;
    },
    [starredIds]
  );

  // ---------------------------------------------------------------------------
  // COMPUTED
  // ---------------------------------------------------------------------------

  const filesForUI = useMemo(() => {
    return files.map((file) => ({
      ...file,
      starred: isStarred("file", file.id),
      sizeFormatted: formatFileSize(file.size),
    }));
  }, [files, isStarred]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    files: filesForUI,
    folders,
    starredIds,
    isLoading,
    error,
    projectId,

    // Fetch
    refetch,

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

/**
 * Hook to fetch files from ALL projects (for "Add existing file" dialogs)
 */
export function useAllAccessibleFiles() {
  const fetchFiles = useCallback(async (signal) => {
    const response = await fetch(`${config.apiBaseUrl}/files`, {
      signal,
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`);
    }

    const data = await response.json();
    return data.files || data.datasets || data || [];
  }, []);

  const {
    data: files,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchFiles, [], {
    initialData: [],
  });

  return { files, isLoading, error, refetch };
}

export default useProjectFiles;
