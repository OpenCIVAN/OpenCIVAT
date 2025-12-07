// src/ui/react/hooks/useRecordings.js
// Hook for managing session recordings
//
// REFACTORED: Uses useAsyncData and useAsyncMutation
// Before: ~300 lines | After: ~200 lines

import { useState, useEffect, useCallback, useRef } from "react";
import { sessionManager } from "@Core/session/sessionManager.js";
import { config } from "@Core/config/clientConfig.js";
import { app as log } from "@Utils/logger.js";

import { useAsyncData, useAsyncMutation } from "./useAsyncData";
import { useServerSyncEvents } from "./useWebSocketEvents";

/**
 * Hook for managing session recordings
 *
 * @returns {Object} Recording state and controls
 */
export function useRecordings() {
  // Recording state
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

  const durationIntervalRef = useRef(null);
  const projectId =
    sessionManager.getProjectId?.() || sessionManager.getRoomId?.();
  const apiBase = config.apiBaseUrl || "http://localhost:3001/api";

  // ---------------------------------------------------------------------------
  // FETCH RECORDINGS
  // ---------------------------------------------------------------------------

  const fetchRecordings = useCallback(
    async (signal) => {
      if (!projectId) return [];

      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings`,
        {
          signal,
          headers: {
            "Content-Type": "application/json",
            "x-user-id": sessionManager.getUserId?.() || "anonymous",
            "x-user-email":
              sessionManager.getUserEmail?.() || "anonymous@local",
            "x-user-name": sessionManager.getUserName?.() || "Anonymous",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recordings: ${response.status}`);
      }

      const data = await response.json();
      return data.recordings || [];
    },
    [apiBase, projectId]
  );

  const {
    data: recordings,
    isLoading,
    error,
    refetch,
  } = useAsyncData(fetchRecordings, [projectId], {
    initialData: [],
    enabled: !!projectId,
  });

  // ---------------------------------------------------------------------------
  // CHECK FOR ACTIVE RECORDING
  // ---------------------------------------------------------------------------

  const checkActiveRecording = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/status/active`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-user-id": sessionManager.getUserId?.() || "anonymous",
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.active && data.recording) {
        setIsRecording(true);
        setActiveRecordingId(data.recording.id);
        setRecordingDuration(Math.floor(data.elapsed_ms / 1000));

        const metadata = data.recording.metadata || {};
        setRecordingName(metadata.name || "Untitled Recording");
        setRecordingOptions({
          includeAudio: metadata.includeAudio ?? true,
          includeChat: metadata.includeChat ?? true,
          includeAnnotations: metadata.includeAnnotations ?? true,
          includeCursors: metadata.includeCursors ?? false,
        });
      }
    } catch (err) {
      log.warn("Failed to check active recording:", err);
    }
  }, [apiBase, projectId]);

  // Check for active recording on mount
  useEffect(() => {
    checkActiveRecording();
  }, [checkActiveRecording]);

  // ---------------------------------------------------------------------------
  // DURATION TIMER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
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

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENTS
  // ---------------------------------------------------------------------------

  useServerSyncEvents("recording", {
    onCreate: () => refetch(),
    onUpdate: (detail) => {
      if (detail.recordingId === activeRecordingId) {
        // Recording was updated (paused/resumed)
        if (detail.status === "paused") {
          setIsPaused(true);
        } else if (detail.status === "recording") {
          setIsPaused(false);
        }
      }
      refetch();
    },
    onDelete: () => refetch(),
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const { mutate: startRecording, isLoading: isStarting } = useAsyncMutation(
    async (options = {}) => {
      const name =
        options.name ||
        recordingName ||
        `Recording ${new Date().toLocaleString()}`;
      const opts = { ...recordingOptions, ...options };

      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": sessionManager.getUserId?.() || "anonymous",
            "x-user-email":
              sessionManager.getUserEmail?.() || "anonymous@local",
            "x-user-name": sessionManager.getUserName?.() || "Anonymous",
          },
          body: JSON.stringify({
            name,
            metadata: opts,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to start recording: ${response.status}`
        );
      }

      const data = await response.json();

      setIsRecording(true);
      setActiveRecordingId(data.recording.id);
      setRecordingDuration(0);
      setRecordingName(name);
      setRecordingOptions(opts);

      log.info(`Recording started: ${data.recording.id}`);
      return data.recording;
    },
    { onSuccess: refetch }
  );

  const { mutate: stopRecording, isLoading: isStopping } = useAsyncMutation(
    async () => {
      if (!activeRecordingId) {
        throw new Error("No active recording to stop");
      }

      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/stop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": sessionManager.getUserId?.() || "anonymous",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to stop recording: ${response.status}`
        );
      }

      const data = await response.json();

      setIsRecording(false);
      setIsPaused(false);
      setActiveRecordingId(null);
      setRecordingDuration(0);

      log.info(`Recording stopped: ${activeRecordingId}`);
      return data.recording;
    },
    { onSuccess: refetch }
  );

  const { mutate: pauseRecording } = useAsyncMutation(async () => {
    if (!activeRecordingId) return;

    const response = await fetch(
      `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/pause`,
      {
        method: "POST",
        headers: {
          "x-user-id": sessionManager.getUserId?.() || "anonymous",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to pause recording");
    }

    setIsPaused(true);
    log.info("Recording paused");
  });

  const { mutate: resumeRecording } = useAsyncMutation(async () => {
    if (!activeRecordingId) return;

    const response = await fetch(
      `${apiBase}/projects/${projectId}/recordings/${activeRecordingId}/resume`,
      {
        method: "POST",
        headers: {
          "x-user-id": sessionManager.getUserId?.() || "anonymous",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to resume recording");
    }

    setIsPaused(false);
    log.info("Recording resumed");
  });

  const { mutate: deleteRecording, isLoading: isDeleting } = useAsyncMutation(
    async (recordingId) => {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/recordings/${recordingId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": sessionManager.getUserId?.() || "anonymous",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete recording");
      }

      log.info(`Recording deleted: ${recordingId}`);
      return { id: recordingId };
    },
    { onSuccess: refetch }
  );

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const formatDuration = useCallback((seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getPlaybackUrl = useCallback(
    (recordingId) => {
      if (!projectId) return null;
      return `${apiBase}/projects/${projectId}/recordings/${recordingId}/playback`;
    },
    [apiBase, projectId]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    recordings,
    isLoading,
    error,

    // Active recording state
    isRecording,
    isPaused,
    activeRecordingId,
    recordingDuration,
    recordingName,
    recordingOptions,
    formattedDuration: formatDuration(recordingDuration),

    // Mutation states
    isStarting,
    isStopping,
    isDeleting,

    // Recording configuration
    setRecordingName,
    setRecordingOptions,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    getPlaybackUrl,
    refetch,
  };
}

export default useRecordings;
