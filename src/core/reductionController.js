import {
  getSceneObjects,
  getOriginalPointsData,
  setReductionApplied,
  isReductionApplied,
} from "./scene.js";
import {
  extractPointsFromPolyData,
  applyReductionToPolyData,
} from "../utils/pointProcessing.js";
import { restore3DView } from "../utils/viewHelpers.js";
import { cleanupTensors, logMemoryUsage } from "../utils/tensorflowSetup.js";
import {
  logInfo,
  logProgress,
  logSuccess,
  logError,
  logWarning,
} from "../ui/logging.js";
import { performPCA } from "../algorithms/pca.js";
import { performTSNE } from "../algorithms/tsne.js";
import { performUMAP } from "../algorithms/umap.js";
import { broadcastReductionState } from "../collaboration/reductionSync.js";
import { getReductionMethod, getReductionComponents } from "../ui/controls.js";
import { REDUCTION_DEFAULTS } from "../config/constants.js";

// ----------------------------------------------------------------------------
// Main Dimensionality Reduction Function
// ----------------------------------------------------------------------------

export async function toggleDimensionalityReduction(isRemote = false) {
  const originalPointsData = getOriginalPointsData();

  if (!originalPointsData) {
    logError("No data loaded for processing");
    alert("Please load a VTP file first!");
    return;
  }

  const { vtpReader, mapper, renderer, renderWindow } = getSceneObjects();
  const currentPolyData = vtpReader.getOutputData(0);
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
        return;
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
        // Get UMAP parameters from UI if available
        const umapNeighborsInput = document.querySelector(
          ".umap-neighbors-input"
        );
        const umapMinDistInput = document.querySelector(".umap-mindist-input");

        const nNeighbors = umapNeighborsInput
          ? parseInt(umapNeighborsInput.value)
          : REDUCTION_DEFAULTS.UMAP_N_NEIGHBORS;
        const minDist = umapMinDistInput
          ? parseFloat(umapMinDistInput.value)
          : REDUCTION_DEFAULTS.UMAP_MIN_DIST;

        const umapOptions = {
          nNeighbors: nNeighbors,
          minDist: minDist,
          nEpochs: REDUCTION_DEFAULTS.UMAP_N_EPOCHS,
        };

        logProgress(
          `UMAP options: neighbors=${nNeighbors}, min_dist=${minDist}, target=${reductionComponents}D`
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

      // Update the reduction state in other tabs
      // sendReductionState();

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
      return;
    }
  } else {
    logInfo("Restoring original data...");

    const points = currentPolyData.getPoints();
    points.setData(originalPointsData);
    currentPolyData.modified();
    setReductionApplied(false);

    // Reset to 3D perspective view when restoring original data
    restore3DView();

    logSuccess("Original data restored successfully");

    // Clean up any remaining tensors
    cleanupTensors();
  }

  mapper.setInputData(currentPolyData);

  // Always reset camera after data changes
  renderer.resetCamera();
  renderWindow.render();

  logInfo("Visualization refreshed");
  logProgress(
    `Current state: ${
      isReductionApplied()
        ? `${reductionMethod.toUpperCase()} ${reductionComponents}D`
        : "Original 3D"
    }`
  );
}
