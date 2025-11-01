import {
  getSceneObjects,
  setOriginalPointsData,
  setCurrentActor,
  setReductionApplied,
} from "./scene.js";
import { createOrientationMarker } from "./orientationMarker.js";
import {
  logProgress,
  logSuccess,
  logWarning,
  logError,
  logInfo,
} from "../ui/react/hooks/useLogging.js";
import { logMemoryUsage } from "../utils/tensorflowSetup.js";
import { ALGORITHM_LIMITS } from "../config/constants.js";
import { yFile } from "../collaboration/yjsSetup.js";
import { annotationRenderer } from "../core/annotationRenderer.js";

let isLocalFileLoad = false;

export function setupFileHandler() {
  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", handleFile);
  }

  // ----------------------------------------------------------------------------
  // Yjs Observer: File Data
  // ----------------------------------------------------------------------------

  yFile.observe((event) => {
    if (isLocalFileLoad) {
      isLocalFileLoad = false;
      return;
    }

    const b64 = yFile.get("polydata");
    if (b64) {
      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
      updateScene(binary);
    }
  });
}

function handleFile(e) {
  preventDefaults(e);
  const dataTransfer = e.dataTransfer;
  const files = e.target.files || dataTransfer.files;

  if (files.length > 0) {
    const file = files[0];
    logInfo(`Loading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    logMemoryUsage("before file loading");

    const fileReader = new FileReader();
    fileReader.onload = function onLoad(e) {
      const fileData = fileReader.result;
      const b64 = arrayBufferToBase64(fileData);

      isLocalFileLoad = true; //mark as a local change
      //overwite the polydata if it already exists
      yFile.set("polydata", b64);

      updateScene(fileData);
    };

    fileReader.onerror = function (error) {
      logError(`File reading failed: ${error.message}`);
    };

    fileReader.readAsArrayBuffer(files[0]);
  }
}

function updateScene(fileData) {
  const { vtpReader, mapper, renderer, renderWindow, actor } =
    getSceneObjects();

  try {
    logProgress("Parsing VTP file...");
    vtpReader.parseAsArrayBuffer(fileData);

    const polyData = vtpReader.getOutputData(0);

    const points = polyData.getPoints();
    if (points) {
      logInfo(points);
      setOriginalPointsData(new Float32Array(points.getData()));
      const numPoints = points.getNumberOfPoints();
      const bounds = polyData.getBounds();

      logSuccess("File loaded successfully!");
      logInfo("Dataset information:");
      logProgress(`  Points: ${numPoints.toLocaleString()}`);
      logProgress(
        `  Bounds: X[${bounds[0].toFixed(2)}, ${bounds[1].toFixed(
          2
        )}] Y[${bounds[2].toFixed(2)}, ${bounds[3].toFixed(
          2
        )}] Z[${bounds[4].toFixed(2)}, ${bounds[5].toFixed(2)}]`
      );

      const cells = polyData.getPolys();
      if (cells) {
        const numCells = cells.getNumberOfCells();
        logProgress(`  Polygons: ${numCells.toLocaleString()}`);
      }

      const pointDataSizeMB = (points.getData().length * 4) / (1024 * 1024);
      logProgress(`Memory usage: ~${pointDataSizeMB.toFixed(1)} MB`);

      if (numPoints > ALGORITHM_LIMITS.LARGE_DATASET_WARNING) {
        logWarning(
          "Large dataset: Memory-optimized algorithms will be used automatically"
        );
      }
      if (numPoints > ALGORITHM_LIMITS.VERY_LARGE_DATASET_WARNING) {
        logWarning(
          "Very large dataset: Consider using smaller files for better performance"
        );
      }

      // Auto-size annotation markers based on data bounds
      const xRange = bounds[1] - bounds[0];
      const yRange = bounds[3] - bounds[2];
      const zRange = bounds[5] - bounds[4];
      const maxRange = Math.max(xRange, yRange, zRange);
      const annotationRadius = maxRange * 0.01;

      import("../core/annotationRenderer.js").then((module) => {
        module.annotationRenderer.setMarkerRadius(annotationRadius);
        logInfo(`Annotation marker size: ${annotationRadius.toFixed(4)}`);
      });

      createOrientationMarker();
    } else {
      logWarning("No point data found in VTP file");
    }

    mapper.setInputData(polyData);
    actor.setPickable(true);

    renderer.addActor(actor);
    renderer.resetCamera();

    // FORCE MULTIPLE RENDERS - fixes visibility issue
    renderWindow.render();

    // Force resize event to ensure canvas updates
    setTimeout(() => {
      if (renderWindow.getViews() && renderWindow.getViews()[0]) {
        const view = renderWindow.getViews()[0];
        const canvas = view.getCanvas();
        if (canvas) {
          // Trigger resize
          const event = new Event("resize");
          window.dispatchEvent(event);
        }
      }
      renderWindow.render();
    }, 100);

    // Another render after short delay
    setTimeout(() => {
      renderWindow.render();
    }, 300);

    setCurrentActor(actor);
    setReductionApplied(false);

    logSuccess("Visualization rendered successfully");
    logInfo('Use "Toggle Reduction" to apply PCA, t-SNE, or UMAP');
    logMemoryUsage("after file loading complete");
  } catch (error) {
    logError(`Failed to load VTP file: ${error.message}`);
    logWarning("Make sure the file is a valid VTP (VTK XML PolyData) format");
    logMemoryUsage("after file loading error");
  }
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

export { isLocalFileLoad, updateScene };
