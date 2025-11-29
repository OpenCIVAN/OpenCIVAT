// src/ui/react/components/layout/SecondaryBottomBar/SecondaryBottomBar.logic.js
// Headless logic for the secondary bottom bar
// Manages canvas viewport, voice controls, and workspace indicators

import { useState, useCallback, useMemo, useEffect } from "react";

/**
 * useCanvasViewport - Manages canvas position/viewport state
 *
 * @param {Object} options
 * @param {Object} options.canvasSize - Total canvas dimensions { rows, cols }
 * @param {Object} options.viewport - Current viewport { row, col, rows, cols }
 * @param {Function} options.onViewportChange - Callback when viewport changes
 * @returns {Object} Viewport state and minimap data
 */
export function useCanvasViewport({
  canvasSize = { rows: 4, cols: 5 },
  viewport = { row: 0, col: 0, rows: 2, cols: 3 },
  onViewportChange,
} = {}) {
  const [isHovering, setIsHovering] = useState(false);

  // Calculate viewport bounds
  const viewportBounds = useMemo(
    () => ({
      startRow: viewport.row,
      startCol: viewport.col,
      endRow: viewport.row + viewport.rows - 1,
      endCol: viewport.col + viewport.cols - 1,
    }),
    [viewport]
  );

  // Generate minimap cells
  const minimapCells = useMemo(() => {
    const cells = [];
    for (let row = 0; row < canvasSize.rows; row++) {
      for (let col = 0; col < canvasSize.cols; col++) {
        const inViewport =
          row >= viewportBounds.startRow &&
          row <= viewportBounds.endRow &&
          col >= viewportBounds.startCol &&
          col <= viewportBounds.endCol;
        cells.push({ row, col, inViewport });
      }
    }
    return cells;
  }, [canvasSize, viewportBounds]);

  // Format position string
  const positionString = useMemo(() => {
    const { startCol, startRow, endCol, endRow } = viewportBounds;
    return `(${startCol},${startRow}) → (${endCol},${endRow})`;
  }, [viewportBounds]);

  const sizeString = useMemo(() => {
    return `${canvasSize.cols}×${canvasSize.rows}`;
  }, [canvasSize]);

  return {
    canvasSize,
    viewport,
    viewportBounds,
    minimapCells,
    positionString,
    sizeString,
    isHovering,
    setIsHovering,
  };
}

/**
 * useVoiceControls - Manages voice chat state
 *
 * @param {Object} options
 * @param {boolean} options.initialInVoice - Initial voice connection state
 * @param {boolean} options.initialMuted - Initial mute state
 * @param {boolean} options.initialDeafened - Initial deafen state
 * @param {string} options.currentRoom - Current voice room name
 * @param {Function} options.onJoinVoice - Callback for joining voice
 * @param {Function} options.onLeaveVoice - Callback for leaving voice
 * @param {Function} options.onMuteToggle - Callback for mute toggle
 * @param {Function} options.onDeafenToggle - Callback for deafen toggle
 * @returns {Object} Voice control state and actions
 */
export function useVoiceControls({
  initialInVoice = false,
  initialMuted = false,
  initialDeafened = false,
  currentRoom = "Main Room",
  onJoinVoice,
  onLeaveVoice,
  onMuteToggle,
  onDeafenToggle,
} = {}) {
  const [inVoice, setInVoice] = useState(initialInVoice);
  const [muted, setMuted] = useState(initialMuted);
  const [deafened, setDeafened] = useState(initialDeafened);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const joinVoice = useCallback(() => {
    setInVoice(true);
    onJoinVoice?.();
  }, [onJoinVoice]);

  const leaveVoice = useCallback(() => {
    setInVoice(false);
    setMuted(false);
    setDeafened(false);
    onLeaveVoice?.();
  }, [onLeaveVoice]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newValue = !prev;
      onMuteToggle?.(newValue);
      return newValue;
    });
  }, [onMuteToggle]);

  const toggleDeafen = useCallback(() => {
    setDeafened((prev) => {
      const newValue = !prev;
      onDeafenToggle?.(newValue);
      return newValue;
    });
  }, [onDeafenToggle]);

  const toggleRoomDropdown = useCallback(() => {
    setShowRoomDropdown((prev) => !prev);
  }, []);

  return {
    // State
    inVoice,
    muted,
    deafened,
    currentRoom,
    showRoomDropdown,

    // Actions
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleRoomDropdown,
    closeRoomDropdown: () => setShowRoomDropdown(false),
  };
}

/**
 * useWorkspaceIndicator - Gets current workspace info for display
 *
 * @param {Object} currentWorkspace - Current workspace object
 * @returns {Object} Workspace indicator data
 */
export function useWorkspaceIndicator(currentWorkspace) {
  return useMemo(
    () => ({
      name: currentWorkspace?.name || "No Workspace",
      color: currentWorkspace?.color || "#666",
      type: currentWorkspace?.type || "personal",
    }),
    [currentWorkspace]
  );
}

/**
 * useSecondaryBottomBar - Combined hook for all secondary bottom bar state
 *
 * @param {Object} options - Configuration options
 * @returns {Object} All secondary bottom bar state and actions
 */
export function useSecondaryBottomBar({
  // Canvas options
  canvasSize,
  viewport,
  onViewportChange,

  // Voice options
  initialInVoice,
  initialMuted,
  initialDeafened,
  currentVoiceRoom,
  onJoinVoice,
  onLeaveVoice,
  onMuteToggle,
  onDeafenToggle,

  // Workspace
  currentWorkspace,

  // Instance count
  instanceCount = 0,
} = {}) {
  const canvasViewport = useCanvasViewport({
    canvasSize,
    viewport,
    onViewportChange,
  });

  const voiceControls = useVoiceControls({
    initialInVoice,
    initialMuted,
    initialDeafened,
    currentRoom: currentVoiceRoom,
    onJoinVoice,
    onLeaveVoice,
    onMuteToggle,
    onDeafenToggle,
  });

  const workspaceIndicator = useWorkspaceIndicator(currentWorkspace);

  return {
    canvas: canvasViewport,
    voice: voiceControls,
    workspace: workspaceIndicator,
    instanceCount,
  };
}
