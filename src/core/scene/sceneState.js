// ----------------------------------------------------------------------------
// Scene State Manager
// Prevents camera resets by tracking what's loaded
// ----------------------------------------------------------------------------

class SceneStateManager {
  constructor() {
    this.currentlyLoadedDatasetId = null;
    this.isLoading = false;
  }

  isDatasetLoaded(datasetId) {
    return this.currentlyLoadedDatasetId === datasetId;
  }

  setLoadedDataset(datasetId) {
    this.currentlyLoadedDatasetId = datasetId;
  }

  clearLoadedDataset() {
    this.currentlyLoadedDatasetId = null;
  }

  setLoading(loading) {
    this.isLoading = loading;
  }

  getIsLoading() {
    return this.isLoading;
  }
}

export const sceneState = new SceneStateManager();