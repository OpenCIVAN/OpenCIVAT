import { logInfo, logSuccess, logProgress, logWarning } from "./logging.js";
import { logMemoryUsage, cleanupTensors } from "../utils/tensorflowSetup.js";
import {
  getSceneObjects,
  getCurrentActor,
  startVR,
  stopVR,
} from "../core/scene.js";
import { setup2DView, restore3DView } from "../utils/viewHelpers.js";

let reductionMethod = "pca";
let reductionComponents = 3;
let toggleReductionFunction = null;

// ----------------------------------------------------------------------------
// UI Controls Setup
// ----------------------------------------------------------------------------

export function setupDimensionalityReductionControls(toggleReduction) {
  toggleReductionFunction = toggleReduction;

  const controlTable = document.querySelector("table");
  const { renderer, renderWindow } = getSceneObjects();

  // Method selection row
  const methodRow = document.createElement("tr");
  const methodCell = document.createElement("td");
  const methodSelect = document.createElement("select");
  methodSelect.style.width = "100%";

  const methods = [
    { value: "pca", text: "PCA (TensorFlow.js)" },
    { value: "tsne", text: "t-SNE (TensorFlow.js)" },
    { value: "umap", text: "UMAP (TensorFlow.js)" },
  ];

  methods.forEach((method) => {
    const option = document.createElement("option");
    option.value = method.value;
    option.textContent = method.text;
    if (method.value === "pca") option.selected = true;
    methodSelect.appendChild(option);
  });

  methodSelect.addEventListener("change", (e) => {
    const oldMethod = reductionMethod;
    reductionMethod = e.target.value;
    logInfo(
      `Reduction method changed: ${oldMethod.toUpperCase()} -> ${reductionMethod.toUpperCase()}`
    );

    updateComponentsSelector();
    updateUMAPParametersVisibility();

    // Update reductionComponents to match the new method's default
    if (reductionMethod === "tsne" || reductionMethod === "umap") {
      reductionComponents = 2; // Default to 2D for t-SNE and UMAP
      logProgress(
        `Target dimensions set to ${reductionComponents}D (recommended for ${reductionMethod.toUpperCase()})`
      );
    } else if (reductionMethod === "pca") {
      reductionComponents = 3; // Default to 3D for PCA
      logProgress(
        `Target dimensions set to ${reductionComponents}D for ${reductionMethod.toUpperCase()}`
      );
    }

    // if (reductionApplied) {
    //   logWarning(
    //     `Currently using ${oldMethod.toUpperCase()}. Click "Toggle Reduction" twice to apply ${reductionMethod.toUpperCase()}`
    //   );
    // } else {
    //   logInfo(
    //     `${reductionMethod.toUpperCase()} will be used when next applied`
    //   );
    // }
  });

  methodCell.appendChild(methodSelect);
  methodRow.appendChild(methodCell);
  controlTable.appendChild(methodRow);

  // UMAP parameters row (initially hidden)
  const umapParamsRow = document.createElement("tr");
  umapParamsRow.className = "umap-params-row";
  umapParamsRow.style.display = "none";
  const umapParamsCell = document.createElement("td");

  const paramsContainer = document.createElement("div");
  paramsContainer.style.cssText =
    "display: flex; gap: 8px; align-items: center; font-size: 11px;";

  const neighborsLabel = document.createElement("label");
  neighborsLabel.textContent = "Neighbors:";
  neighborsLabel.style.cssText = "font-weight: bold; min-width: 60px;";

  const neighborsInput = document.createElement("input");
  neighborsInput.type = "number";
  neighborsInput.value = "8";
  neighborsInput.min = "3";
  neighborsInput.max = "20";
  neighborsInput.step = "1";
  neighborsInput.className = "umap-neighbors-input";
  neighborsInput.style.cssText = "width: 45px; padding: 2px;";

  const minDistLabel = document.createElement("label");
  minDistLabel.textContent = "Min Dist:";
  minDistLabel.style.cssText =
    "font-weight: bold; min-width: 55px; margin-left: 8px;";

  const minDistInput = document.createElement("input");
  minDistInput.type = "number";
  minDistInput.value = "0.1";
  minDistInput.min = "0.001";
  minDistInput.max = "1.0";
  minDistInput.step = "0.01";
  minDistInput.className = "umap-mindist-input";
  minDistInput.style.cssText = "width: 55px; padding: 2px;";

  neighborsInput.addEventListener("change", (e) => {
    const value = parseInt(e.target.value);
    logInfo(`UMAP neighbors parameter changed to: ${value}`);
    logProgress("More neighbors = more global structure preservation");
  });

  minDistInput.addEventListener("change", (e) => {
    const value = parseFloat(e.target.value);
    logInfo(`UMAP min_dist parameter changed to: ${value}`);
    logProgress("Lower min_dist = tighter clusters, higher = looser embedding");
  });

  paramsContainer.appendChild(neighborsLabel);
  paramsContainer.appendChild(neighborsInput);
  paramsContainer.appendChild(minDistLabel);
  paramsContainer.appendChild(minDistInput);

  umapParamsCell.appendChild(paramsContainer);
  umapParamsRow.appendChild(umapParamsCell);
  controlTable.appendChild(umapParamsRow);

  // Components selection row
  const componentsRow = document.createElement("tr");
  const componentsCell = document.createElement("td");
  const componentsSelect = document.createElement("select");
  componentsSelect.style.width = "100%";
  componentsSelect.className = "components-selector";

  function updateComponentsSelector() {
    componentsSelect.innerHTML = "";

    if (reductionMethod === "pca") {
      const option2D = document.createElement("option");
      option2D.value = "2";
      option2D.textContent = "PCA to 2D";
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement("option");
      option3D.value = "3";
      option3D.textContent = "PCA to 3D (reorder axes)";
      option3D.selected = true;
      componentsSelect.appendChild(option3D);

      reductionComponents = 3; // Sync the variable
    } else if (reductionMethod === "tsne") {
      const option2D = document.createElement("option");
      option2D.value = "2";
      option2D.textContent = "t-SNE to 2D (recommended)";
      option2D.selected = true;
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement("option");
      option3D.value = "3";
      option3D.textContent = "t-SNE to 3D";
      componentsSelect.appendChild(option3D);

      reductionComponents = 2; // Sync the variable - default to 2D for t-SNE
    } else if (reductionMethod === "umap") {
      const option2D = document.createElement("option");
      option2D.value = "2";
      option2D.textContent = "UMAP to 2D (recommended)";
      option2D.selected = true;
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement("option");
      option3D.value = "3";
      option3D.textContent = "UMAP to 3D";
      componentsSelect.appendChild(option3D);

      reductionComponents = 2; // Sync the variable - default to 2D for UMAP
    }

    logProgress(
      `Components selector updated: ${reductionComponents}D selected for ${reductionMethod.toUpperCase()}`
    );
  }

  function updateUMAPParametersVisibility() {
    const umapParamsRow = document.querySelector(".umap-params-row");
    if (umapParamsRow) {
      umapParamsRow.style.display =
        reductionMethod === "umap" ? "table-row" : "none";
    }
  }

  updateComponentsSelector();

  componentsSelect.addEventListener("change", (e) => {
    const oldComponents = reductionComponents;
    reductionComponents = parseInt(e.target.value);
    logInfo(
      `Target dimensions changed: ${oldComponents}D -> ${reductionComponents}D`
    );

    // if (reductionApplied) {
    //   logProgress(
    //     `Reapplying ${reductionMethod.toUpperCase()} with new target dimensions...`
    //   );
    //   reductionApplied = false;
    //   toggleDimensionalityReduction();
    // } else {
    //   logProgress(
    //     `${reductionMethod.toUpperCase()} will target ${reductionComponents}D when next applied`
    //   );
    // }
  });

  componentsCell.appendChild(componentsSelect);
  componentsRow.appendChild(componentsCell);
  controlTable.appendChild(componentsRow);

  // Toggle reduction button row
  const toggleRow = document.createElement("tr");
  const toggleCell = document.createElement("td");
  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Reduction";
  toggleButton.style.width = "100%";
  toggleButton.addEventListener("click", () => {
    if (toggleReductionFunction) {
      toggleReductionFunction(false);
    }
    // const currentState = reductionApplied
    //   ? `${reductionMethod.toUpperCase()} Active`
    //   : "Original Data";
    // logInfo(`Reduction Toggle clicked - Current state: ${currentState}`);
    // toggleDimensionalityReduction();
  });
  toggleCell.appendChild(toggleButton);
  toggleRow.appendChild(toggleCell);
  controlTable.appendChild(toggleRow);

  // Visual mode switch button row
  const visualRow = document.createElement("tr");
  const visualCell = document.createElement("td");
  const visualButton = document.createElement("button");
  visualButton.textContent = "Switch to Points View";
  visualButton.style.width = "100%";
  visualButton.addEventListener("click", () => {
    const representationSelector = document.querySelector(".representations");
    if (representationSelector.value === "0") {
      representationSelector.value = "2";
      visualButton.textContent = "Switch to Points View";
      logInfo("Switched to Surface view");
    } else {
      representationSelector.value = "0";
      visualButton.textContent = "Switch to Surface View";
      logInfo("Switched to Points view - better for seeing transformations!");
    }

    representationSelector.dispatchEvent(new Event("change"));
  });
  visualCell.appendChild(visualButton);
  visualRow.appendChild(visualCell);
  controlTable.appendChild(visualRow);

  // Memory status button row
  const memoryRow = document.createElement("tr");
  const memoryCell = document.createElement("td");
  const memoryButton = document.createElement("button");
  memoryButton.textContent = "Memory Status & Cleanup";
  memoryButton.style.width = "100%";
  memoryButton.addEventListener("click", () => {
    logInfo("Memory Status Check:");
    logMemoryUsage("manual check");
    cleanupTensors();
    logProgress("Memory cleanup completed");
  });
  memoryCell.appendChild(memoryButton);
  memoryRow.appendChild(memoryCell);
  controlTable.appendChild(memoryRow);

  // 2D/3D view toggle button
  const viewModeRow = document.createElement("tr");
  const viewModeCell = document.createElement("td");
  const viewModeButton = document.createElement("button");
  viewModeButton.textContent = "Force 2D View";
  viewModeButton.style.width = "100%";
  viewModeButton.style.backgroundColor = "#2196F3";
  viewModeButton.style.color = "white";

  let is2DMode = false;

  viewModeButton.addEventListener("click", () => {
    if (!is2DMode) {
      // Force 2D mode
      setup2DView();
      viewModeButton.textContent = "Switch to 3D View";
      viewModeButton.style.backgroundColor = "#ff9800";
      is2DMode = true;
      logInfo("Forced 2D viewing mode - locked to top-down orthographic view");
    } else {
      // Switch back to 3D mode
      restore3DView();
      renderer.resetCamera();
      renderWindow.render();
      viewModeButton.textContent = "Force 2D View";
      viewModeButton.style.backgroundColor = "#2196F3";
      is2DMode = false;
      logInfo("Restored 3D viewing mode - full rotation enabled");
    }
  });

  viewModeCell.appendChild(viewModeButton);
  viewModeRow.appendChild(viewModeCell);
  controlTable.appendChild(viewModeRow);

  // Setup representation selector
  const representationSelector = document.querySelector(".representations");
  if (representationSelector) {
    representationSelector.addEventListener("change", (e) => {
      const actor = getCurrentActor();
      if (actor) {
        actor.getProperty().setRepresentation(Number(e.target.value));
        renderWindow.render();
      }
    });
  }

  // Setup VR button
  const vrbutton = document.querySelector(".vrbutton");
  if (vrbutton) {
    vrbutton.addEventListener("click", () => {
      if (vrbutton.textContent === "Send To VR") {
        startVR();
        vrbutton.textContent = "Return From VR";
      } else {
        stopVR();
        vrbutton.textContent = "Send To VR";
      }
    });
  }

  logSuccess("Dimensionality Reduction controls initialized:");
  logProgress("  - PCA: TensorFlow.js with tf.tidy() memory management");
  logProgress("  - t-SNE/UMAP: Pure JavaScript with memory optimization");
  logProgress("  - Advanced logging and performance monitoring");
  logProgress("  - Real-time memory usage visualization");
  logProgress("  - Automatic optimization for large datasets");
}

export function getReductionMethod() {
  return reductionMethod;
}

export function getReductionComponents() {
  return reductionComponents;
}

export function setReductionMethod(method) {
  reductionMethod = method;
}

export function setReductionComponents(components) {
  reductionComponents = components;
}
