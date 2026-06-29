// src/ui/react/hooks/useDMRooms.js
// Hook for DM (direct message) room management.
// Creates and lists DM rooms for the current user within a project.
//
// USAGE:
//   const { dmRooms, loading, createDM, error } = useDMRooms(projectId);
//   const room = await createDM([participantUserId]);

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@Services/apiClient.js';
import { ui as log } from '@Utils/logger.js';

/**
 * Hook for managing DM rooms within a project.
 *
 * @param {string|null} projectId  CIA project UUID
 * @param {string|null} currentUserId  Authenticated user's ID
 * @returns {{
 *   dmRooms: Array,
 *   loading: boolean,
 *   error: string|null,
 *   createDM: (participantIds: string[]) => Promise<object>,
 *   refresh: () => void,
 * }}
 */
export function useDMRooms(projectId, currentUserId) {
  const [dmRooms, setDmRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Load existing DM rooms for this user in this project
  useEffect(() => {
    if (!projectId || !currentUserId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/projects/${projectId}/rooms?type=dm`)
      .then((rooms) => {
        if (!mounted) return;
        // Filter to rooms where the current user is a participant
        const myDMs = Array.isArray(rooms)
          ? rooms.filter(
              (r) =>
                r.room_type === 'dm' &&
                (r.is_member ||
                  (Array.isArray(r.participants) && r.participants.includes(currentUserId)))
            )
          : [];
        setDmRooms(myDMs);
      })
      .catch((err) => {
        if (!mounted) return;
        log.warn('[useDMRooms] Failed to load DM rooms:', err?.message);
        setError(err?.message || 'Failed to load DM rooms');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId, currentUserId, refreshKey]);

  /**
   * Create a new DM room with the given participants.
   * If a DM with the same participants already exists on the server, the server
   * may return the existing room (depending on backend dedup support).
   *
   * @param {string[]} participantIds  UUIDs of users to include in the DM (besides current user)
   * @returns {Promise<object>}  The created or existing room object
   */
  const createDM = useCallback(
    async (participantIds) => {
      if (!projectId || !participantIds?.length) {
        throw new Error('projectId and at least one participantId are required');
      }

      const data = await apiClient.post(`/projects/${projectId}/rooms`, {
        name: 'Direct Message',
        room_type: 'dm',
        participants: participantIds,
        is_public: false,
      });

      const newRoom = data?.room || data;
      if (newRoom?.id) {
        setDmRooms((prev) => {
          const exists = prev.some((r) => r.id === newRoom.id);
          return exists ? prev : [newRoom, ...prev];
        });
      }

      return newRoom;
    },
    [projectId]
  );

  return { dmRooms, loading, error, createDM, refresh };
}

export default useDMRooms;
