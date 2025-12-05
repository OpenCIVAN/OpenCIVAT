// src/ui/react/hooks/useRecordings.js
// Hook for managing session recordings
//
// Provides:
// - Start/stop recording controls
// - List of past recordings
// - Active recording state with timer
// - Playback controls (future)

import { useState, useEffect, useCallback, useRef } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { app as log } from "@Utils/logger.js";

/**
 * Hook for managing session recordings
 *
 * @returns {Object} Recording state and controls
 */
export function useRecordings() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingName, setRecordingName] = useState("");
  const [recordingOptions, setRecordingOptions] = useState({
    includeAudio: true,
    includeChat: true,
    includeAnnotations: true,
    includeCursors: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const durationIntervalRef = useRef(null);
  const projectId =
    sessionManager.getProjectId?.() || sessionManager.getRoomId?.();
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  // ---------------------------------------------------------------------------
  // API HELPERS
  // ---------------------------------------------------------------------------

  const apiCall = useCallback(
    async (method, endpoint, body = null) => {
      const url = `${apiBase}/projects/${projectId}/recordings${endpoint}`;

      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": sessionManager.getUserId?.() || "anonymous",
          "x-user-email": sessionManager.getUserEmail?.() || "anonymous@local",
          "x-user-name": sessionManager.getUserName?.() || "Anonymous",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed: ${response.status}`
        );
      }

      return response.json();
    },
    [apiBase, projectId]
  );

  // ---------------------------------------------------------------------------
  // FETCH RECORDINGS
  // ---------------------------------------------------------------------------

  const fetchRecordings = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiCall("GET", "");
      setRecordings(data.recordings || []);
    } catch (err) {
      log.error("Failed to fetch recordings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiCall, projectId]);

  // ---------------------------------------------------------------------------
  // CHECK FOR ACTIVE RECORDING
  // ---------------------------------------------------------------------------

  const checkActiveRecording = useCallback(async () => {
    if (!projectId) return;

    try {
      const data = await apiCall("GET", "/status/active");

      if (data.active && data.recording) {
        setIsRecording(true);
        setActiveRecordingId(data.recording.id);
        setRecordingDuration(Math.floor(data.elapsed_ms / 1000));

        // Parse name from metadata
        const metadata = data.recording.metadata || {};
        setRecordingName(metadata.name || "");
      }
    } catch (err) {
      // Not critical if this fails
      log.debug("No active recording found");
    }
  }, [apiCall, projectId]);

  // ---------------------------------------------------------------------------
  // START RECORDING
  // ---------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (!projectId) {
      setError("No project selected");
      return;
    }

    setError(null);

    try {
      const name = recordingName || `Session ${new Date().toLocaleString()}`;

      const data = await apiCall("POST", "/start", {
        name,
        mode: "full",
        options: recordingOptions,
      });

      setActiveRecordingId(data.recording.id);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);

      // Dispatch global event for StatusBar
      window.dispatchEvent(
        new CustomEvent("cia:recording-started", {
          detail: {
            recordingId: data.recording.id,
            mode: "full",
            name,
          },
        })
      );

      log.info(`Recording started: ${data.recording.id}`);
    } catch (err) {
      log.error("Failed to start recording:", err);
      setError(err.message);
    }
  }, [apiCall, projectId, recordingName, recordingOptions]);

  // ---------------------------------------------------------------------------
  // STOP RECORDING
  // ---------------------------------------------------------------------------

  const stopRecording = useCallback(async () => {
    if (!projectId || !activeRecordingId) return;

    try {
      const data = await apiCall("POST", `/${activeRecordingId}/stop`);

      setIsRecording(false);
      setIsPaused(false);
      setActiveRecordingId(null);
      setRecordingDuration(0);
      setRecordingName("");

      // Dispatch global event for StatusBar
      window.dispatchEvent(
        new CustomEvent("cia:recording-stopped", {
          detail: {
            recordingId: data.recording.id,
            duration_ms: data.recording.duration_ms,
            event_count: data.recording.event_count,
          },
        })
      );

      // Refresh recordings list
      await fetchRecordings();

      log.info(`Recording stopped: ${data.recording.id}`);
    } catch (err) {
      log.error("Failed to stop recording:", err);
      setError(err.message);
    }
  }, [apiCall, projectId, activeRecordingId, fetchRecordings]);

  // ---------------------------------------------------------------------------
  // PAUSE/RESUME (Client-side only - events still captured)
  // ---------------------------------------------------------------------------

  const pauseRecording = useCallback(() => {
    setIsPaused(true);
    log.debug("Recording paused (client-side)");
  }, []);

  const resumeRecording = useCallback(() => {
    setIsPaused(false);
    log.debug("Recording resumed");
  }, []);

  // ---------------------------------------------------------------------------
  // DELETE RECORDING
  // ---------------------------------------------------------------------------

  const deleteRecording = useCallback(
    async (recordingId) => {
      if (!projectId) return;

      try {
        await apiCall("DELETE", `/${recordingId}`);
        setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
        log.info(`Recording deleted: ${recordingId}`);
      } catch (err) {
        log.error("Failed to delete recording:", err);
        setError(err.message);
      }
    },
    [apiCall, projectId]
  );

  // ---------------------------------------------------------------------------
  // EXPORT RECORDING
  // ---------------------------------------------------------------------------

  const exportRecording = useCallback(
    async (recordingId) => {
      if (!projectId) return;

      try {
        // Fetch all events
        const data = await apiCall("GET", `/${recordingId}/events?limit=10000`);

        // Get recording metadata
        const recordingData = await apiCall("GET", `/${recordingId}`);

        // Create export object
        const exportData = {
          recording: recordingData.recording,
          events: data.events,
          exportedAt: new Date().toISOString(),
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording-${recordingId}.json`;
        a.click();
        URL.revokeObjectURL(url);

        log.info(`Recording exported: ${recordingId}`);
      } catch (err) {
        log.error("Failed to export recording:", err);
        setError(err.message);
      }
    },
    [apiCall, projectId]
  );

  // ---------------------------------------------------------------------------
  // PLAYBACK (Future - placeholder)
  // ---------------------------------------------------------------------------

  const playRecording = useCallback(async (recordingId) => {
    log.info(`Playback requested for recording: ${recordingId}`);
    // TODO: Implement playback
    // 1. Fetch events in batches
    // 2. Create playback controller
    // 3. Reconstruct state from events
    // 4. Step through timeline
    setError("Playback not yet implemented");
  }, []);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Fetch recordings on mount
  useEffect(() => {
    if (projectId) {
      fetchRecordings();
      checkActiveRecording();
    }
  }, [projectId, fetchRecordings, checkActiveRecording]);

  // Duration timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Listen for WebSocket recording events
  useEffect(() => {
    const handleRecordingStarted = (event) => {
      const { recordingId } = event.detail || {};
      if (recordingId && recordingId !== activeRecordingId) {
        // Another user started recording
        checkActiveRecording();
      }
    };

    const handleRecordingStopped = () => {
      fetchRecordings();
    };

    window.addEventListener("ws:recording:started", handleRecordingStarted);
    window.addEventListener("ws:recording:stopped", handleRecordingStopped);

    return () => {
      window.removeEventListener(
        "ws:recording:started",
        handleRecordingStarted
      );
      window.removeEventListener(
        "ws:recording:stopped",
        handleRecordingStopped
      );
    };
  }, [activeRecordingId, checkActiveRecording, fetchRecordings]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    recordings,
    isRecording,
    isPaused,
    recordingDuration,
    recordingName,
    setRecordingName,
    recordingOptions,
    setRecordingOptions,
    loading,
    error,
    activeRecordingId,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    exportRecording,
    playRecording,

    // Utilities
    refresh: fetchRecordings,
  };
}

export default useRecordings;
