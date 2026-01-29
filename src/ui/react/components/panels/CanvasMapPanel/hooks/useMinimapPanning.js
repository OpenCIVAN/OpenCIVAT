/**
 * @file useMinimapPanning.js
 * @description Hook for minimap panning functionality
 *
 * Provides drag-to-pan behavior with bounds checking for the minimap.
 * When the canvas content exceeds the viewport, users can drag to pan.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { clamp } from '../utils/gridUtils';

/**
 * useMinimapPanning - Drag panning logic for minimap
 *
 * @param {Object} options
 * @param {number} options.contentWidth - Total content width in pixels
 * @param {number} options.contentHeight - Total content height in pixels
 * @param {number} options.viewportWidth - Visible viewport width in pixels
 * @param {number} options.viewportHeight - Visible viewport height in pixels
 * @param {boolean} [options.enabled=true] - Whether panning is enabled
 * @returns {Object} Panning state and handlers
 */
export function useMinimapPanning({
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  enabled = true,
} = {}) {
  // Current pan offset
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Calculate pan bounds
  const maxPanX = Math.max(0, contentWidth - viewportWidth);
  const maxPanY = Math.max(0, contentHeight - viewportHeight);
  const canPan = maxPanX > 0 || maxPanY > 0;

  /**
   * Clamp pan offset to valid bounds
   */
  const clampPan = useCallback((x, y) => {
    return {
      x: clamp(x, 0, maxPanX),
      y: clamp(y, 0, maxPanY),
    };
  }, [maxPanX, maxPanY]);

  /**
   * Handle mouse/touch down - start dragging
   */
  const handlePanStart = useCallback((e) => {
    if (!enabled || !canPan) return;

    // Get client coordinates from mouse or touch event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...panOffset };
    setIsDragging(true);

    // Prevent default to avoid text selection
    e.preventDefault();
  }, [enabled, canPan, panOffset]);

  /**
   * Handle mouse/touch move - update pan position
   */
  const handlePanMove = useCallback((e) => {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;

    const newPan = clampPan(
      panStartRef.current.x + deltaX,
      panStartRef.current.y + deltaY
    );

    setPanOffset(newPan);
  }, [isDragging, clampPan]);

  /**
   * Handle mouse/touch up - stop dragging
   */
  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Reset pan to origin
   */
  const resetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  /**
   * Pan to show a specific position (centered if possible)
   */
  const panToPosition = useCallback((x, y) => {
    const targetX = x - viewportWidth / 2;
    const targetY = y - viewportHeight / 2;
    setPanOffset(clampPan(targetX, targetY));
  }, [viewportWidth, viewportHeight, clampPan]);

  /**
   * Pan to show a specific grid cell
   */
  const panToCell = useCallback((row, col, cellSize, gap) => {
    const x = col * (cellSize + gap) + cellSize / 2;
    const y = row * (cellSize + gap) + cellSize / 2;
    panToPosition(x, y);
  }, [panToPosition]);

  // Add global mouse/touch event listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => handlePanMove(e);
    const handleEnd = () => handlePanEnd();

    // Mouse events
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // Touch events
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, handlePanMove, handlePanEnd]);

  // Reset pan when content/viewport size changes significantly
  useEffect(() => {
    // Clamp current pan to new bounds
    setPanOffset(prev => clampPan(prev.x, prev.y));
  }, [contentWidth, contentHeight, viewportWidth, viewportHeight, clampPan]);

  return {
    // State
    panOffset,
    isDragging,
    canPan,
    maxPanX,
    maxPanY,

    // Event handlers (attach to minimap container)
    handlePanStart,
    handlePanMove,
    handlePanEnd,

    // Imperative methods
    resetPan,
    panToPosition,
    panToCell,
    setPanOffset,

    // Props to spread on container
    panProps: {
      onMouseDown: handlePanStart,
      onTouchStart: handlePanStart,
      style: {
        cursor: canPan ? (isDragging ? 'grabbing' : 'grab') : 'default',
      },
    },
  };
}

export default useMinimapPanning;
