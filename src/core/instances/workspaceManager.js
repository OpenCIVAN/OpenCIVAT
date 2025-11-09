class WorkspaceManager {
  constructor() {
    this.windows = new Map(); // windowId → { renderer, renderWindow, ... }
    this.activeWindowId = null;
  }

  createWindow(containerId) {
    const windowId = generateId();
    const sceneObjects = initializeScene(document.getElementById(containerId));
    this.windows.set(windowId, {
      ...sceneObjects,
      datasetId: null,
      filters: {},
      visibility: {},
    });
    return windowId;
  }

  duplicateWindow(sourceWindowId) {
    // Copy camera, filters, dataset from source
  }

  syncAnnotations(datasetId) {
    // Share annotations across all windows showing same dataset
  }
}
