/**
 * LayoutPanelContext
 *
 * Provides shared state between LayoutPanel and FloatingCanvasNavigator.
 * This ensures both the docked navigator (inside panel) and floating navigator
 * (on the canvas) stay in sync - they're views of the same state.
 *
 * USAGE:
 * 1. Wrap your layout area with <LayoutPanelProvider canvasId={...}>
 * 2. Use useLayoutPanelContext() in any child component
 * 3. LayoutPanel and FloatingCanvasNavigator will share state automatically
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useLayoutPanel } from "./LayoutPanel.logic";

// =============================================================================
// DOCK POSITIONS
// =============================================================================

export const DOCK_POSITIONS = {
  LEFT_PANEL: "left-panel",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  FLOAT: "float",
  MINIMIZED: "minimized",
};

// LocalStorage key
const DOCK_POSITION_KEY = "cia-navigator-dock-position";

// =============================================================================
// CONTEXT
// =============================================================================

const LayoutPanelContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * LayoutPanelProvider - Provides shared layout panel state to children
 *
 * @param {Object} props
 * @param {string} [props.canvasId] - Target canvas ID (uses active canvas if not provided)
 * @param {React.ReactNode} props.children - Child components
 */
export function LayoutPanelProvider({ canvasId, children }) {
  // Create the logic instance once at the provider level
  const baseLogic = useLayoutPanel({ canvasId });

  // Dock position state (persisted to localStorage)
  const [dockPosition, setDockPositionState] = useState(() => {
    try {
      const stored = localStorage.getItem(DOCK_POSITION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate it's a valid dock position
        if (Object.values(DOCK_POSITIONS).includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load dock position:", e);
    }
    return DOCK_POSITIONS.FLOAT; // Default to floating
  });

  // Persist dock position changes
  const setDockPosition = useCallback((position) => {
    setDockPositionState(position);
    try {
      localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify(position));
    } catch (e) {
      console.warn("Failed to save dock position:", e);
    }
  }, []);

  // Check if docked in left panel
  const navigatorDocked = dockPosition === DOCK_POSITIONS.LEFT_PANEL;

  // Convenience functions for backward compatibility
  const dockNavigator = useCallback(() => {
    setDockPosition(DOCK_POSITIONS.LEFT_PANEL);
  }, [setDockPosition]);

  const undockNavigator = useCallback(() => {
    setDockPosition(DOCK_POSITIONS.FLOAT);
  }, [setDockPosition]);

  const toggleNavigatorDocked = useCallback(() => {
    setDockPosition(
      navigatorDocked ? DOCK_POSITIONS.FLOAT : DOCK_POSITIONS.LEFT_PANEL
    );
  }, [navigatorDocked, setDockPosition]);

  // Combine base logic with dock position
  const logic = useMemo(
    () => ({
      ...baseLogic,
      dockPosition,
      setDockPosition,
      navigatorDocked,
      dockNavigator,
      undockNavigator,
      toggleNavigatorDocked,
    }),
    [
      baseLogic,
      dockPosition,
      setDockPosition,
      navigatorDocked,
      dockNavigator,
      undockNavigator,
      toggleNavigatorDocked,
    ]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      logic,
      canvasId,
    }),
    [logic, canvasId]
  );

  return (
    <LayoutPanelContext.Provider value={contextValue}>
      {children}
    </LayoutPanelContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useLayoutPanelContext - Access shared layout panel state
 *
 * @returns {Object|null} { logic, canvasId } or null if outside provider
 */
export function useLayoutPanelContext() {
  const context = useContext(LayoutPanelContext);

  if (!context) {
    // Return null instead of throwing - allows optional usage
    // Components can check for null and handle gracefully
    return null;
  }

  return context;
}

/**
 * useLayoutPanelLogic - Convenience hook to get just the logic object
 *
 * @returns {Object|null} The logic object from useLayoutPanel, or null
 */
export function useLayoutPanelLogic() {
  const context = useLayoutPanelContext();
  return context?.logic || null;
}

/**
 * useNavigatorDocked - Hook for just the navigator docked state
 * Useful for components that only need to know if navigator is docked
 *
 * @returns {Object} { navigatorDocked, toggleNavigatorDocked, dockNavigator, undockNavigator, dockPosition, setDockPosition }
 */
export function useNavigatorDocked() {
  const context = useLayoutPanelContext();

  if (!context?.logic) {
    // Return safe defaults when outside provider
    return {
      navigatorDocked: false,
      toggleNavigatorDocked: () => {},
      dockNavigator: () => {},
      undockNavigator: () => {},
      dockPosition: DOCK_POSITIONS.FLOAT,
      setDockPosition: () => {},
    };
  }

  const { logic } = context;
  return {
    navigatorDocked: logic.navigatorDocked,
    toggleNavigatorDocked: logic.toggleNavigatorDocked,
    dockNavigator: logic.dockNavigator,
    undockNavigator: logic.undockNavigator,
    dockPosition: logic.dockPosition,
    setDockPosition: logic.setDockPosition,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LayoutPanelContext;
