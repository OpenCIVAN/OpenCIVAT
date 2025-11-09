// src/core/reductionController.js
// Dimensionality Reduction Controller
// UPDATED to use new state manager and logging

import { performPCA } from "@Algorithms/dimensionality/pca.js";
import { performTSNE } from "@Algorithms/dimensionality/tsne.js";
import { performUMAP } from "@Algorithms/dimensionality/umap.js";
import {
  extractPointsFromPolyData,
  applyReductionToPolyData,
} from "@Algorithms/processing/pointProcessing.js";
import { broadcastReductionState } from "@Collaboration/sync/reductionSync.js";
import { REDUCTION_DEFAULTS } from "@Core/config/constants.js";
import {
  reductionState,
  getReductionMethod,
  getReductionComponents,
  setReductionIsApplied,
} from "@Core/reductionState.js";
import {
  getSceneObjects,
  getOriginalPointsData,
  setReductionApplied,
  isReductionApplied,
} from "@Core/scene/sceneManager.js";
import {
  cleanupTensors,
  logMemoryUsage,
} from "@Services/tensorflow/tensorflowSetup.js";
import { restore3DView } from "@Utils/viewHelpers.js";
import {
  logInfo,
  logProgress,
  logSuccess,
  logError,
  logWarning,
} from "@UI/react/hooks/useLogging.js";

// ----------------------------------------------------------------------------
// Main Dimensionality Reduction Function
// ----------------------------------------------------------------------------

export async function toggleDimensionalityReduction(isRemote = false) {
  const originalPointsData = getOriginalPointsData();

  if (!originalPointsData) {
    logError("No data loaded for processing");
    alert("Please load a VTP file first!");
    return false;
  }

  const { mapper, renderer, renderWindow } = getSceneObjects();
  const currentPolyData = mapper.getInputData(); // Get from mapper, not vtpReader
  const reductionMethod = getReductionMethod();
  const reductionComponents = getReductionComponents();

  // Only broadcast if this toggle came from *local user*, not from Yjs
  if (!isRemote) {
    broadcastReductionState(reductionMethod, reductionComponents);
  }

  if (!isReductionApplied()) {
    // Apply reduction
    logInfo(`Starting ${reductionMethod.toUpperCase()} transformation...`);
    logProgress(`Target: ${reductionComponents}D reduction`);
    logMemoryUsage("before reduction");

    try {
      const pointsMatrix = await extractPointsFromPolyData(currentPolyData);
      if (!pointsMatrix) {
        logError("Failed to extract points from polydata");
        return false;
      }

      logProgress(`Processing ${pointsMatrix.length.toLocaleString()} points`);

      let reducedPoints;
      const startTime = performance.now();

      logProgress(
        `Executing ${reductionMethod.toUpperCase()} with ${reductionComponents}D target...`
      );

      if (reductionMethod === "pca") {
        reducedPoints = await performPCA(pointsMatrix, reductionComponents);
        logSuccess(
          `PCA completed - output has ${reducedPoints[0].length} dimensions`
        );
      } else if (reductionMethod === "tsne") {
        const tsneOptions = {
          perplexity: Math.min(
            REDUCTION_DEFAULTS.TSNE_PERPLEXITY,
            Math.floor(pointsMatrix.length / 6)
          ),
          maxIterations: REDUCTION_DEFAULTS.TSNE_MAX_ITERATIONS,
          learningRate: REDUCTION_DEFAULTS.TSNE_LEARNING_RATE,
        };
        logProgress(
          `t-SNE options: perplexity=${tsneOptions.perplexity}, target=${reductionComponents}D`
        );
        reducedPoints = await performTSNE(
          pointsMatrix,
          reductionComponents,
          tsneOptions
        );
        logSuccess(
          `t-SNE completed - output has ${reducedPoints[0].length} dimensions`
        );

        // Verify we got the expected dimensions
        if (reductionComponents === 2 && reducedPoints[0].length === 3) {
          logProgress("t-SNE 2D result padded to 3D for visualization (Z=0)");
        }
      } else if (reductionMethod === "umap") {
        // Get UMAP parameters with defaults
        const umapOptions = {
          nNeighbors: REDUCTION_DEFAULTS.UMAP_N_NEIGHBORS,
          minDist: REDUCTION_DEFAULTS.UMAP_MIN_DIST,
          nEpochs: REDUCTION_DEFAULTS.UMAP_N_EPOCHS,
        };

        logProgress(
          `UMAP options: neighbors=${umapOptions.nNeighbors}, min_dist=${umapOptions.minDist}, target=${reductionComponents}D`
        );
        reducedPoints = await performUMAP(
          pointsMatrix,
          reductionComponents,
          umapOptions
        );
        logSuccess(
          `UMAP completed - output has ${reducedPoints[0].length} dimensions`
        );

        // Verify we got the expected dimensions
        if (reductionComponents === 2 && reducedPoints[0].length === 3) {
          logProgress("UMAP 2D result padded to 3D for visualization (Z=0)");
        }
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Log original and new bounds
      const originalBounds = currentPolyData.getBounds();
      logProgress(
        `Original bounds: X[${originalBounds[0].toFixed(
          2
        )}, ${originalBounds[1].toFixed(2)}] Y[${originalBounds[2].toFixed(
          2
        )}, ${originalBounds[3].toFixed(2)}] Z[${originalBounds[4].toFixed(
          2
        )}, ${originalBounds[5].toFixed(2)}]`
      );

      applyReductionToPolyData(currentPolyData, reducedPoints);
      setReductionApplied(true);
      setReductionIsApplied(true); // Update global state

      const newBounds = currentPolyData.getBounds();
      logProgress(
        `New bounds: X[${newBounds[0].toFixed(2)}, ${newBounds[1].toFixed(
          2
        )}] Y[${newBounds[2].toFixed(2)}, ${newBounds[3].toFixed(
          2
        )}] Z[${newBounds[4].toFixed(2)}, ${newBounds[5].toFixed(2)}]`
      );

      logSuccess(
        `${reductionMethod.toUpperCase()} reduction completed in ${processingTime}s`
      );
      logInfo(`Visualization updated with ${reductionComponents}D data`);
      logMemoryUsage("after reduction complete");

      // Clean up tensors if using TensorFlow.js
      if (reductionMethod === "pca") {
        cleanupTensors();
      }
    } catch (error) {
      logError(
        `${reductionMethod.toUpperCase()} reduction failed: ${error.message}`
      );
      logWarning("Try reloading the file or using a different method");
      logMemoryUsage("after error");

      // Clean up on error
      if (reductionMethod === "pca") {
        cleanupTensors();
      }
      return false;
    }
  } else {
    logInfo("Restoring original data...");

    const points = currentPolyData.getPoints();
    // Create a NEW Float32Array to ensure VTK detects the change
    const restoredData = new Float32Array(originalPointsData);
    points.setData(restoredData);

    // CRITICAL: Mark as modified so VTK updates
    points.modified();
    currentPolyData.modified();

    // Update bounds
    currentPolyData.getBounds();

    setReductionApplied(false);
    setReductionIsApplied(false); // Update global state

    // Reset to 3D perspective view when restoring original data
    restore3DView();

    // CRITICAL: Reset camera AFTER restoring 3D view
    renderer.resetCamera();

    logSuccess("Original data restored successfully");

    // Clean up any remaining tensors
    cleanupTensors();
  }

  mapper.setInputData(currentPolyData);

  // Always reset camera after data changes and render multiple times
  renderer.resetCamera();
  renderWindow.render();

  // Force additional renders to ensure update
  setTimeout(() => {
    renderWindow.render();
  }, 50);

  setTimeout(() => {
    renderWindow.render();
  }, 200);

  logInfo("Visualization refreshed");
  logProgress(
    `Current state: ${
      isReductionApplied()
        ? `${reductionMethod.toUpperCase()} ${reductionComponents}D`
        : "Original 3D"
    }`
  );

  return true;
}
