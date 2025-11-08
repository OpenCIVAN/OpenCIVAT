// src/core/datasetLoadingOrchestrator.js
// This orchestrates the complete flow from dataset selection to visualization

import { datasetManager } from "./datasetManager.js";
import { simpleVisualizationManager } from "./simpleVisualizationManager.js";
import { loadDatasetIntoScene } from "./scene.js";
import { sceneState } from "./sceneState.js";

class DatasetLoadingOrchestrator {
  constructor() {
    this.isLoading = false;
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator and set up all necessary observers
   * This ensures that whenever a dataset is selected, it gets loaded into the scene
   */
  initialize() {
    if (this.initialized) {
      console.log("⚠️ Orchestrator already initialized");
      return;
    }

    console.log("🎭 Initializing dataset loading orchestrator...");

    // Listen for current dataset changes
    this.setupCurrentDatasetObserver();

    // Listen for new datasets being added
    this.setupDatasetAddedObserver();

    // Check if there's already a current dataset that needs loading
    this.checkAndLoadCurrentDataset();

    this.initialized = true;
    console.log("✅ Dataset loading orchestrator ready");
  }

  /**
   * Set up observer for when the current dataset changes
   */
  setupCurrentDatasetObserver() {
    simpleVisualizationManager.yViz.observe(() => {
      const current = simpleVisualizationManager.getCurrentDataset();

      if (!current) {
        console.log("🎭 No current dataset");
        return;
      }

      console.log("🎭 Current dataset changed:", current.datasetName);
      this.loadCurrentDatasetIntoScene(current);
    });
  }

  /**
   * Set up observer for when new datasets are added
   */
  setupDatasetAddedObserver() {
    datasetManager.onChange(() => {
      // Check if we should auto-load the first dataset
      const datasets = datasetManager.getAllDatasets();
      const current = simpleVisualizationManager.getCurrentDataset();

      if (datasets.length === 1 && !current) {
        console.log("🎭 First dataset added, auto-selecting it");
        const firstDataset = datasets[0];
        simpleVisualizationManager.setCurrentDataset(
          firstDataset.id,
          firstDataset.name
        );
      }
    });
  }

  /**
   * Check if there's a current dataset and load it
   */
  checkAndLoadCurrentDataset() {
    const current = simpleVisualizationManager.getCurrentDataset();
    if (current) {
      console.log(
        "🎭 Found existing current dataset on init:",
        current.datasetName
      );
      this.loadCurrentDatasetIntoScene(current);
    }
  }

  /**
   * Load the current dataset into the VTK scene
   */
  async loadCurrentDatasetIntoScene(currentDatasetInfo) {
    if (this.isLoading) {
      console.log("🎭 Already loading a dataset, skipping");
      return;
    }

    if (!currentDatasetInfo || !currentDatasetInfo.datasetId) {
      console.error("🎭 Invalid dataset info");
      return;
    }

    // Check if already loaded in scene
    if (sceneState.isDatasetLoaded(currentDatasetInfo.datasetId)) {
      console.log("🎭 Dataset already loaded in scene");
      return;
    }

    this.isLoading = true;
    console.group("🎭 Loading dataset into scene");
    console.log("Dataset ID:", currentDatasetInfo.datasetId);
    console.log("Dataset Name:", currentDatasetInfo.datasetName);

    try {
      // Step 1: Get the dataset with polydata
      let dataset = datasetManager.getDatasetSync(currentDatasetInfo.datasetId);

      if (!dataset || !dataset.polydata) {
        console.log("🎭 Polydata not in memory, attempting to load...");

        // Try to load from cache or fetch from public path
        dataset = await datasetManager.getDataset(currentDatasetInfo.datasetId);

        if (!dataset || !dataset.polydata) {
          console.error("🎭 ❌ Failed to load polydata");
          console.log("🎭 User may need to upload the file locally");

          // Show user a message
          alert(
            `Dataset "${currentDatasetInfo.datasetName}" needs to be uploaded locally.\n\nThe file data is not available in cache.`
          );

          this.isLoading = false;
          console.groupEnd();
          return;
        }
      }

      console.log("🎭 ✅ Polydata ready, loading into scene...");
      console.log(
        "🎭 Point count:",
        dataset.polydata.getPoints()?.getNumberOfPoints() || 0
      );

      // Step 2: Load into VTK scene
      loadDatasetIntoScene(
        dataset.polydata,
        true,
        currentDatasetInfo.datasetId
      );

      // Step 3: Mark as loaded
      sceneState.setLoadedDataset(currentDatasetInfo.datasetId);

      console.log("🎭 ✅ Successfully loaded into scene");
    } catch (error) {
      console.error("🎭 ❌ Error loading dataset:", error);
      alert(`Failed to load dataset: ${error.message}`);
    } finally {
      this.isLoading = false;
      console.groupEnd();
    }
  }

  /**
   * Manually trigger loading of a specific dataset
   * Useful for debugging
   */
  async forceLoadDataset(datasetId) {
    console.log("🎭 Force loading dataset:", datasetId);

    const dataset = datasetManager
      .getAllDatasets()
      .find((d) => d.id === datasetId);
    if (!dataset) {
      console.error("🎭 Dataset not found");
      return false;
    }

    // Set as current
    simpleVisualizationManager.setCurrentDataset(datasetId, dataset.name);

    // Wait a bit for observers to fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If still not loaded, force it
    if (!sceneState.isDatasetLoaded(datasetId)) {
      const current = {
        datasetId,
        datasetName: dataset.name,
      };
      await this.loadCurrentDatasetIntoScene(current);
    }

    return true;
  }
}

export const datasetLoadingOrchestrator = new DatasetLoadingOrchestrator();
