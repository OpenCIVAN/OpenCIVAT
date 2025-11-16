// src/ui/react/components/layout/ThreeEdgeLayout.logic.js
// Pure logic hooks for layout state management
// Separates business logic from presentation (headless pattern)

import { useState, useEffect, useCallback } from "react";

/**
 * Panel dimension constraints
 * Ensures panels don't get too small or too large
 */
const PANEL_CONSTRAINTS = {
  left: {
    min: 240,
    max: 600,
    default: 320,
    collapsed: 48,
  },
  right: {
    min: 280,
    max: 600,
    default: 340,
    collapsed: 48,
  },
};

/**
 * useLayoutState - Manages panel open/closed state and dimensions
 *
 * @returns {Object} Layout state and setters
 */
export function useLayoutState() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(PANEL_CONSTRAINTS.left.default);
  const [rightWidth, setRightWidth] = useState(PANEL_CONSTRAINTS.right.default);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadLayoutState();
    if (savedState) {
      setLeftOpen(savedState.leftOpen);
      setRightOpen(savedState.rightOpen);
      setLeftWidth(savedState.leftWidth);
      setRightWidth(savedState.rightWidth);
    }
  }, []);

  return {
    leftOpen,
    setLeftOpen,
    rightOpen,
    setRightOpen,
    leftWidth,
    setLeftWidth: (width) => {
      const constrained = constrainWidth(width, "left");
      setLeftWidth(constrained);
    },
    rightWidth,
    setRightWidth: (width) => {
      const constrained = constrainWidth(width, "right");
      setRightWidth(constrained);
    },
  };
}

/**
 * useResizeHandler - Handles drag-to-resize logic for panels
 *
 * @param {string} side - 'left' or 'right'
 * @param {Function} onWidthChange - Callback when width changes
 * @returns {Object} Resize handlers
 */
export function useResizeHandler(side, onWidthChange) {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      let newWidth;

      if (side === "left") {
        // Left panel: width = mouse X position
        newWidth = e.clientX;
      } else {
        // Right panel: width = window width - mouse X position
        newWidth = window.innerWidth - e.clientX;
      }

      // Apply constraints
      const constrained = constrainWidth(newWidth, side);
      onWidthChange(constrained);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, side, onWidthChange]);

  return {
    isResizing,
    handleMouseDown,
  };
}

/**
 * usePanelPersistence - Saves layout state to localStorage
 *
 * @param {Object} state - Current layout state
 */
export function usePanelPersistence(state) {
  useEffect(() => {
    saveLayoutState(state);
  }, [state]);
}

/**
 * Constrain width to min/max values
 *
 * @param {number} width - Proposed width
 * @param {string} side - 'left' or 'right'
 * @returns {number} Constrained width
 */
function constrainWidth(width, side) {
  const constraints = PANEL_CONSTRAINTS[side];
  return Math.max(constraints.min, Math.min(constraints.max, width));
}

/**
 * Load layout state from localStorage
 *
 * @returns {Object|null} Saved state or null
 */
function loadLayoutState() {
  try {
    const saved = localStorage.getItem("ciaLayoutState");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load layout state:", error);
    return null;
  }
}

/**
 * Save layout state to localStorage
 *
 * @param {Object} state - State to save
 */
function saveLayoutState(state) {
  try {
    localStorage.setItem("ciaLayoutState", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save layout state:", error);
  }
}

/**
 * Export constraints for use in other components
 */
export { PANEL_CONSTRAINTS };
