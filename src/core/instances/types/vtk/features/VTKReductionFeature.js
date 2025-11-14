// src/core/instances/types/vtk/features/VTKReductionFeature.js

import { ReductionFeature } from "@Core/instances/features/ReductionFeature.js";
import { performPCA } from "@Algorithms/dimensionality/pca.js";
import { performTSNE } from "@Algorithms/dimensionality/tsne.js";
import { performUMAP } from "@Algorithms/dimensionality/umap.js";
import {
  extractPointsFromPolyData,
  applyReductionToPolyData,
  clonePolydata,
} from "../utils/VTKPointProcessing.js";

/**
 * VTK Dimensionality Reduction Feature
 *
 * CRITICAL INITIALIZATION FIX:
 * We do NOT clone polydata during initialize() because there's no data yet!
 * Instead, we save the original polydata the FIRST time data is loaded.
 * This is stored in instanceStates and used for restoration.
 */
export class VTKReductionFeature extends ReductionFeature {
  constructor() {
    super();
    this.instanceStates = new Map();
  }

  /**
   * Initialize for an instance
   *
   * IMPORTANT: At this point, there's no data loaded yet.
   * We just set up the empty state structure.
   */
  async initialize(instanceId, instanceData) {
    const { sceneObjects } = instanceData;

    // Create empty state - we'll save original data when it's first loaded
    this.instanceStates.set(instanceId, {
      method: null,
      components: null,
      isApplied: false,
      originalPolydata: null, // Will be set when data is first loaded
      sceneObjects,
    });

    console.log(
      `✅ VTK Reduction feature initialized for instance: ${instanceId}`
    );
  }

  async cleanup(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (state && state.originalPolydata) {
      // Clean up the cloned polydata to free memory
      if (state.originalPolydata.delete) {
        state.originalPolydata.delete();
      }
    }

    this.instanceStates.delete(instanceId);
    console.log(`🧹 VTK Reduction cleaned up for instance: ${instanceId}`);
  }

  getAvailableMethods() {
    return ["pca", "tsne", "umap"];
  }

  /**
   * Apply reduction to the instance's data
   *
   * CRITICAL: We save the original polydata the FIRST time this is called
   */
  async applyReduction(instanceId, method, components, options = {}) {
    const state = this.instanceStates.get(instanceId);

    if (!state) {
      throw new Error(`Instance ${instanceId} not initialized for reduction`);
    }

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;
    const currentPolydata = mapper.getInputData();

    // Guard: Check if there's actually data to reduce
    if (!currentPolydata) {
      console.warn(
        `⚠️ Cannot apply reduction: no data loaded in instance ${instanceId}`
      );
      return;
    }

    // PERFORMANCE GUARD: Warn for large datasets
    const pointCount = currentPolydata.getPoints().getNumberOfPoints();
    if (pointCount > 100000) {
      console.warn(
        `⚠️ Large dataset (${pointCount.toLocaleString()} points) - reduction may be slow`
      );
      console.log(`   Consider downsampling the data first`);
      // You could prompt the user here or automatically downsample
    }

    console.log(
      `🎨 Applying ${method} reduction (${components}D) to ${pointCount.toLocaleString()} points`
    );
    console.log(`   This may take a moment...`);

    try {
      // CRITICAL: Save original polydata the FIRST time we apply reduction
      // This lets us restore later
      if (!state.originalPolydata) {
        console.log(`  💾 Saving original polydata for restoration`);
        state.originalPolydata = clonePolydata(currentPolydata);
      }

      // Extract points from current polydata
      const pointsMatrix = await extractPointsFromPolyData(currentPolydata);

      if (!pointsMatrix || pointsMatrix.length === 0) {
        throw new Error("No points to reduce");
      }

      console.log(
        `  Processing ${pointsMatrix.length.toLocaleString()} points`
      );

      // Apply the algorithm
      let reducedPoints;

      switch (method) {
        case "pca":
          reducedPoints = await performPCA(pointsMatrix, components);
          break;

        case "tsne":
          reducedPoints = await performTSNE(pointsMatrix, components, options);
          break;

        case "umap":
          reducedPoints = await performUMAP(pointsMatrix, components, options);
          break;

        default:
          throw new Error(`Unknown reduction method: ${method}`);
      }

      // Apply reduced points back to the polydata
      applyReductionToPolyData(currentPolydata, reducedPoints);

      // Update state
      state.method = method;
      state.components = components;
      state.isApplied = true;

      // Re-render
      mapper.setInputData(currentPolydata);
      renderer.resetCamera();
      renderWindow.render();

      console.log(`✅ Reduction applied successfully`);
    } catch (error) {
      console.error(`❌ Reduction failed:`, error);
      throw error;
    }
  }

  /**
   * Restore original data
   */
  async restoreOriginal(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (!state || !state.isApplied) {
      return; // Nothing to restore
    }

    // Guard: Make sure we actually have original data saved
    if (!state.originalPolydata) {
      console.warn(
        `⚠️ Cannot restore: no original data saved for instance ${instanceId}`
      );
      return;
    }

    const { sceneObjects } = state;
    const { mapper, renderer, renderWindow } = sceneObjects;

    console.log(`🔄 Restoring original data for instance ${instanceId}`);

    // Clone the original (don't modify our backup!)
    const restoredPolydata = clonePolydata(state.originalPolydata);

    // Replace current data
    mapper.setInputData(restoredPolydata);

    // Update state
    state.isApplied = false;
    state.method = null;
    state.components = null;

    // Re-render
    renderer.resetCamera();
    renderWindow.render();

    console.log(`✅ Original data restored`);
  }

  isApplied(instanceId) {
    const state = this.instanceStates.get(instanceId);
    return state ? state.isApplied : false;
  }

  getState(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (!state) {
      return null;
    }

    return {
      method: state.method,
      components: state.components,
      isApplied: state.isApplied,
      availableMethods: this.getAvailableMethods(),
    };
  }

  /**
   * Get tools for the toolbar
   */
  /**
   * Get tools for the toolbar
   *
   * Returns tool definitions using Lucide icon IDs (no emojis)
   */
  getTools(instanceId) {
    const state = this.instanceStates.get(instanceId);

    if (!state) {
      return [];
    }

    const tools = [];

    // ========================================================================
    // MAIN REDUCTION MENU
    // ========================================================================
    tools.push({
      id: "reduction",
      icon: "reduction", // → Maps to BarChart3
      label: "Dimensionality Reduction",
      description: "Reduce data to 2D or 3D",
      type: "menu",
      active: state.isApplied,
      options: [
        {
          id: "pca",
          icon: "pca", // → Maps to TrendingUp
          label: "PCA",
          description: "Principal Component Analysis - Fast, linear",
          active: state.isApplied && state.method === "pca",
          onClick: () => this._toggleReduction(instanceId, "pca"),
        },
        {
          id: "tsne",
          icon: "tsne", // → Maps to Network
          label: "t-SNE",
          description: "Preserves local structure, nonlinear",
          active: state.isApplied && state.method === "tsne",
          onClick: () => this._toggleReduction(instanceId, "tsne"),
        },
        {
          id: "umap",
          icon: "umap", // → Maps to Network
          label: "UMAP",
          description: "Balances local and global structure",
          active: state.isApplied && state.method === "umap",
          onClick: () => this._toggleReduction(instanceId, "umap"),
        },
        {
          type: "separator",
        },
        {
          id: "restore",
          icon: "restore", // → Maps to RotateCcw
          label: "Restore Original",
          description: "Reset to full-dimensional data",
          disabled: !state.isApplied,
          onClick: () => this.restoreOriginal(instanceId),
        },
      ],
    });

    // ========================================================================
    // DIMENSION SELECTOR (only shown when reduction is active)
    // ========================================================================
    if (state.isApplied) {
      tools.push({
        id: "dimensions",
        icon: "dimensions", // → Maps to Layers
        label: `${state.components}D Projection`,
        description: "Change projection dimensions",
        type: "menu",
        active: true,
        options: [
          {
            id: "dimension-2d",
            icon: "dimension-2d", // → Maps to Square
            label: "2D Projection",
            description: "Flatten to 2 dimensions",
            active: state.components === 2,
            onClick: () => this._changeDimensions(instanceId, 2),
          },
          {
            id: "dimension-3d",
            icon: "dimension-3d", // → Maps to Box
            label: "3D Projection",
            description: "Reduce to 3 dimensions",
            active: state.components === 3,
            onClick: () => this._changeDimensions(instanceId, 3),
          },
        ],
      });
    }

    return tools;
  }

  // Helper methods (no changes needed, included for completeness)
  async _toggleReduction(instanceId, method) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method === method) {
      // If same method is active, restore original
      await this.restoreOriginal(instanceId);
    } else {
      // Apply reduction (defaults to 2D)
      await this.applyReduction(instanceId, method, 2);
    }
  }

  async _changeDimensions(instanceId, components) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method) {
      // Restore original first, then reapply with new dimensions
      await this.restoreOriginal(instanceId);
      await this.applyReduction(instanceId, state.method, components);
    }
  }

  // ============================================================================
  // ICON CHOICES EXPLAINED
  // ============================================================================

  /*
Why these specific icons?

✅ reduction: BarChart3
   - Represents data analysis and statistical operations
   - Commonly used for analytics features

✅ pca: TrendingUp
   - PCA finds linear trends in data
   - Upward arrow suggests progressive transformation

✅ tsne / umap: Network
   - Both algorithms work with data manifolds and neighborhoods
   - Network icon represents interconnected data points

✅ restore: RotateCcw
   - Universal "undo" symbol
   - Counter-clockwise arrow suggests going back

✅ dimensions: Layers
   - Multiple layers represent multiple dimensions
   - Common metaphor for dimensional data

✅ dimension-2d: Square
   - Flat square represents 2D plane
   - Simple, clear geometric shape

✅ dimension-3d: Box
   - 3D cube represents 3D space
   - Obvious visual for three dimensions

ALTERNATIVES YOU COULD USE:

If you want different aesthetics:
- reduction: Network, GitBranch (branching paths)
- pca: GitBranch (component branches)
- tsne/umap: TrendingUp (data transformation)
- dimensions: Box (geometric), Maximize2 (expanding)

The key is consistency - pick icons that make sense together!
*/

  // Helper methods
  async _toggleReduction(instanceId, method) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method === method) {
      await this.restoreOriginal(instanceId);
    } else {
      await this.applyReduction(instanceId, method, 2);
    }
  }

  async _changeDimensions(instanceId, components) {
    const state = this.instanceStates.get(instanceId);

    if (state.isApplied && state.method) {
      // Restore original first, then reapply with new dimensions
      await this.restoreOriginal(instanceId);
      await this.applyReduction(instanceId, state.method, components);
    }
  }
}
