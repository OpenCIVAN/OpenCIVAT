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

import React, { createContext, useContext, useMemo } from "react";
import { useLayoutPanel } from "./LayoutPanel.logic";

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
  const logic = useLayoutPanel({ canvasId });

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
 * @returns {Object} { logic, canvasId }
 * @throws {Error} If used outside of LayoutPanelProvider
 */
export function useLayoutPanelContext() {
  const context = useContext(LayoutPanelContext);

  if (!context) {
    throw new Error(
      "useLayoutPanelContext must be used within a LayoutPanelProvider. " +
        "Wrap your component tree with <LayoutPanelProvider>."
    );
  }

  return context;
}

/**
 * useLayoutPanelLogic - Convenience hook to get just the logic object
 *
 * @returns {Object} The logic object from useLayoutPanel
 */
export function useLayoutPanelLogic() {
  const { logic } = useLayoutPanelContext();
  return logic;
}

/**
 * useNavigatorDocked - Hook for just the navigator docked state
 * Useful for components that only need to know if navigator is docked
 *
 * @returns {Object} { navigatorDocked, toggleNavigatorDocked, dockNavigator, undockNavigator }
 */
export function useNavigatorDocked() {
  const { logic } = useLayoutPanelContext();

  return {
    navigatorDocked: logic.navigatorDocked,
    toggleNavigatorDocked: logic.toggleNavigatorDocked,
    dockNavigator: logic.dockNavigator,
    undockNavigator: logic.undockNavigator,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LayoutPanelContext;
