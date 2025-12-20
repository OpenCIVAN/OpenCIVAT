/**
 * @file useRecordingsTab.js
 * @description Logic hook for RecordingsTab component.
 * Handles recording state, filtering, and recording operations.
 *
 * @example
 * const {
 *   recordings,
 *   isRecording,
 *   handleStartRecording,
 *   handleStopRecording,
 * } = useRecordingsTab();
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSectionStates } from "@UI/react/components/common/ResizableSections";
import { useRecordings } from "@UI/react/hooks/useRecordings.js";

/**
 * Recording modes
 */
export const RECORDING_MODES = [
  {
    id: "full",
    label: "Full Session",
    description: "Record entire workspace grid",
  },
  {
    id: "isolation",
    label: "Isolation",
    description: "Record single focused instance",
  },
  {
    id: "subset",
    label: "Subset",
    description: "Record selected instances only",
  },
];

/**
 * Hook for RecordingsTab logic and state management.
 *
 * @param {Object} options - Hook options
 * @param {string} [options.workspaceId] - Current workspace ID
 * @returns {Object} Recordings state and handlers
 */
export function useRecordingsTab(options = {}) {
  // Use the recordings hook for data
  const {
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
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    exportRecording,
    downloadRecording,
    refresh,
  } = useRecordings();

  // Local state
  const [recordingMode, setRecordingMode] = useState("full");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [exportingId, setExportingId] = useState(null);

  // Section states
  const { states: sectionStates, toggleSection } = useSectionStates({
    controls: { expanded: true, flexGrow: 0 },
    recordings: { expanded: true, flexGrow: 2 },
  });

  // Update options when includeAudio changes
  useEffect(() => {
    setRecordingOptions((prev) => ({ ...prev, includeAudio }));
  }, [includeAudio, setRecordingOptions]);

  // Filter recordings by search
  const filteredRecordings = useMemo(() => {
    if (!searchQuery.trim()) return recordings;
    const query = searchQuery.toLowerCase();
    return recordings.filter((r) => {
      const name = r.metadata?.name || "";
      const recordedBy = r.recorded_by_name || "";
      return (
        name.toLowerCase().includes(query) ||
        recordedBy.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, recordings]);

  // Calculate storage
  const totalSize = useMemo(() => {
    const bytes = recordings.reduce((sum, r) => sum + (r.file_size || 0), 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [recordings]);

  // Handlers
  const handleStartRecording = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handlePauseRecording = useCallback(() => {
    pauseRecording();
  }, [pauseRecording]);

  const handleResumeRecording = useCallback(() => {
    resumeRecording();
  }, [resumeRecording]);

  const handleExport = useCallback(
    async (id) => {
      setExportingId(id);
      try {
        await exportRecording(id);
      } finally {
        setExportingId(null);
      }
    },
    [exportRecording]
  );

  const handleDownload = useCallback(
    (id) => {
      downloadRecording(id);
    },
    [downloadRecording]
  );

  const handleDelete = useCallback(
    (id) => {
      deleteRecording(id);
      if (selectedRecording === id) {
        setSelectedRecording(null);
      }
    },
    [deleteRecording, selectedRecording]
  );

  return {
    // Data
    recordings,
    filteredRecordings,

    // Recording state
    isRecording,
    isPaused,
    recordingDuration,
    recordingName,
    setRecordingName,

    // Options
    recordingMode,
    setRecordingMode,
    includeAudio,
    setIncludeAudio,

    // Search state
    searchQuery,
    setSearchQuery,

    // Selection state
    selectedRecording,
    setSelectedRecording,
    exportingId,

    // Loading state
    loading,
    error,

    // Section state
    sectionStates,
    toggleSection,

    // Computed
    totalSize,

    // Handlers
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleExport,
    handleDownload,
    handleDelete,
    refresh,
  };
}

export default useRecordingsTab;
