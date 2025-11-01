// src/ui/react/hooks/useVTKReduction.js
// Custom hook for dimensionality reduction state and controls
// Bridges React UI with core reduction algorithms

import { useState, useEffect, useCallback } from "react";
import { toggleDimensionalityReduction } from "../../../core/reductionController.js";
import { reductionState } from "../../../core/reductionState.js";
import { getSceneObjects } from "../../../core/scene.js";

/**
 * Hook to control dimensionality reduction (PCA, t-SNE, UMAP)
 * Returns: {
 *   method, setMethod,
 *   components, setComponents,
 *   isReductionApplied,
 *   toggleReduction,
 *   canApplyReduction
 * }
 */
export function useVTKReduction() {
  const [method, setMethodState] = useState(reductionState.getMethod());
  const [components, setComponentsState] = useState(
    reductionState.getComponents()
  );
  const [isReductionApplied, setIsReductionApplied] = useState(
    reductionState.getIsApplied()
  );
  const [canApplyReduction, setCanApplyReduction] = useState(false);

  // Sync with global state
  useEffect(() => {
    const handleStateChange = () => {
      setMethodState(reductionState.getMethod());
      setComponentsState(reductionState.getComponents());
      setIsReductionApplied(reductionState.getIsApplied());
    };

    reductionState.onChange(handleStateChange);

    return () => {
      reductionState.offChange(handleStateChange);
    };
  }, []);

  // Check if reduction can be applied (need loaded file)
  useEffect(() => {
    const checkReductionReady = () => {
      const sceneObjects = getSceneObjects();
      const hasData =
        sceneObjects && sceneObjects.actor && sceneObjects.actor.getMapper();
      setCanApplyReduction(!!hasData);
    };

    // Check immediately
    checkReductionReady();

    // Check periodically (in case file loads)
    const interval = setInterval(checkReductionReady, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update global state when user changes settings
  const setMethod = useCallback((newMethod) => {
    reductionState.setMethod(newMethod);
  }, []);

  const setComponents = useCallback((newComponents) => {
    reductionState.setComponents(newComponents);
  }, []);

  // Toggle reduction with current settings
  const toggleReduction = useCallback(async () => {
    if (!canApplyReduction) {
      console.warn("⚠️ Cannot apply reduction: No data loaded");
      return false;
    }

    try {
      console.log(`🔄 Toggling reduction: ${method}, ${components} components`);
      await toggleDimensionalityReduction(false); // false = not remote
      // State will be updated by reductionController
      return true;
    } catch (error) {
      console.error("❌ Reduction failed:", error);
      return false;
    }
  }, [method, components, canApplyReduction]);

  return {
    method,
    setMethod,
    components,
    setComponents,
    isReductionApplied,
    toggleReduction,
    canApplyReduction,
  };
}
