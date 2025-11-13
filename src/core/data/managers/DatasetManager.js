// src/core/data/managers/DatasetManager.js

import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { Dataset } from "@Core/data/models/Dataset.js";
import { Annotation } from "@Core/data/models/Annotation.js";
import { generateDatasetId } from "@Utils/idGenerator.js";

/**
 * DatasetManager - Format-agnostic dataset management
 *
 * This manager handles dataset metadata and storage references.
 * It knows NOTHING about specific file formats (VTK, JSON, etc).
 * Format-specific parsing is delegated to instance type handlers.
 */
export class DatasetManager {
  constructor(storageProvider, config = {}) {
    this.storageProvider = storageProvider;
    this._datasets = new Map();
    this._dbName = config.dbName || "CIA_Datasets";
    this._dbVersion = config.dbVersion || 1;
    this._db = null;

    this._listeners = {
      datasetAdded: [],
      datasetRemoved: [],
      datasetUpdated: [],
      datasetLoaded: [],
      annotationAdded: [],
      annotationRemoved: [],
      annotationUpdated: [],
    };
  }

  // ==================== INITIALIZATION ====================

  async initialize() {
    console.log("📦 DatasetManager: Initializing...");
    await this._openDatabase();
    await this._loadExistingDatasets();
    console.log(
      `📦 DatasetManager: Initialized with ${this._datasets.size} datasets`
    );
  }

  /**
   * Sync all datasets to Y.js
   * Call this after Y.js becomes available to ensure collaboration
   */
  syncAllDatasetsToYjs() {
    console.log("🔄 DatasetManager: Syncing all datasets to Y.js...");

    let syncedCount = 0;
    this._datasets.forEach((dataset) => {
      this._syncDatasetMetadataToYjs(dataset);
      syncedCount++;
    });

    console.log(`✅ DatasetManager: Synced ${syncedCount} dataset(s) to Y.js`);
    return syncedCount;
  }

  async generateFileHash(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    } catch (error) {
      console.error("📦 DatasetManager: Failed to generate file hash:", error);
      return `fallback_${file.name}_${file.size}_${file.lastModified}`;
    }
  }

  async findDatasetByHash(hash) {
    for (const dataset of this._datasets.values()) {
      if (dataset.hash === hash) {
        return dataset;
      }
    }
    return null;
  }

  async _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () =>
        reject(new Error("Failed to open dataset metadata database"));
      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("datasets")) {
          const store = db.createObjectStore("datasets", { keyPath: "id" });
          store.createIndex("filename", "filename", { unique: false });
          store.createIndex("uploadedBy", "metadata.uploadedBy", {
            unique: false,
          });
          store.createIndex("uploadedAt", "metadata.uploadedAt", {
            unique: false,
          });
        }
      };
    });
  }

  async _loadExistingDatasets() {
    const transaction = this._db.transaction(["datasets"], "readonly");
    const store = transaction.objectStore("datasets");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const storedDatasets = request.result;
        storedDatasets.forEach((data) => {
          const dataset = Dataset.fromJSON(data);
          this._datasets.set(dataset.id, dataset);

          // IMPORTANT: Sync metadata to Y.js for collaboration
          // This ensures other users can see what datasets we have
          this._syncDatasetMetadataToYjs(dataset);
        });

        console.log(`📦 Synced ${storedDatasets.length} datasets to Y.js`);
        resolve();
      };
      request.onerror = () =>
        reject(new Error("Failed to load existing datasets"));
    });
  }

  /**
   * Sync dataset metadata to Y.js so other clients can see it
   * This should only be called after Y.js is connected
   */
  _syncDatasetMetadataToYjs(dataset) {
    // Use direct import instead of global variable
    // This ensures we get the ydoc as soon as the module is loaded
    if (!ydoc) {
      console.error(
        `❌ Cannot sync dataset ${dataset.filename}: Y.js not initialized`
      );
      return;
    }

    const yDatasets = ydoc.getMap("datasets");

    // Only sync the metadata needed for fetching, not the entire dataset
    yDatasets.set(dataset.id, {
      id: dataset.id,
      filename: dataset.filename,
      fileType: dataset.fileType,
      hash: dataset.hash,
      publicPath: dataset.publicPath, // Critical for fetching
      storageKey: dataset.storageKey, // For server-stored files
      userId: dataset.userId,
      metadata: {
        fileSize: dataset.metadata.fileSize,
        uploadedAt: dataset.metadata.uploadedAt,
        uploadedBy: dataset.metadata.uploadedBy,
      },
    });

    console.log(`🔄 Dataset metadata synced to Y.js: ${dataset.filename}`);
  }

  // ==================== DATASET MANAGEMENT ====================

  async addDataset(dataset) {
    console.log(`📦 DatasetManager: Adding dataset "${dataset.filename}"`);

    try {
      if (!dataset.id) {
        dataset.id = generateDatasetId();
      }

      this._datasets.set(dataset.id, dataset);
      await this._persistDataset(dataset);
      this._emit("datasetAdded", dataset);

      console.log(
        `📦 DatasetManager: Dataset "${dataset.filename}" added with ID ${dataset.id}`
      );
      return dataset;
    } catch (error) {
      console.error("📦 DatasetManager: Failed to add dataset:", error);
      throw error;
    }
  }

  getDataset(datasetId) {
    return this._datasets.get(datasetId) || null;
  }

  getAllDatasets() {
    return Array.from(this._datasets.values());
  }

  getDatasetsByFilename(filename) {
    return this.getAllDatasets().filter((d) => d.filename === filename);
  }

  async removeDataset(datasetId) {
    console.log(`📦 DatasetManager: Removing dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      console.warn(`📦 DatasetManager: Dataset ${datasetId} not found`);
      return;
    }

    try {
      this._datasets.delete(datasetId);
      await this._deleteDataset(datasetId);
      this._emit("datasetRemoved", datasetId);
      console.log(`📦 DatasetManager: Dataset ${datasetId} removed`);
    } catch (error) {
      console.error("📦 DatasetManager: Failed to remove dataset:", error);
      throw error;
    }
  }

  async updateMetadata(datasetId, metadata) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    dataset.updateMetadata(metadata);
    await this._persistDataset(dataset);
    this._emit("datasetUpdated", dataset);
  }

  /**
   * Load a dataset file - this is the main entry point for adding new datasets
   * This method is format-agnostic and works with any file type
   */
  async loadDataset(file, publicPath = null, userId = null) {
    console.log(`📦 DatasetManager: Loading dataset "${file.name}"`);

    if (!userId) {
      const { getUserId } = await import(
        "@Collaboration/presence/userManagement.js"
      );
      userId = getUserId();
    }

    const hash = await this.generateFileHash(file);
    console.log(`  ✓ Hash: ${hash.substring(0, 16)}...`);

    const existingDataset = await this.findDatasetByHash(hash);
    if (existingDataset) {
      console.log(`  ℹ️ Dataset already exists: ${existingDataset.id}`);
      return existingDataset;
    }

    const fileType = file.name.split(".").pop().toLowerCase();
    const datasetId = generateDatasetId();

    const dataset = new Dataset({
      id: datasetId,
      filename: file.name,
      name: file.name,
      fileType: fileType,
      hash: hash,
      publicPath: publicPath,
      userId: userId,
      rawFile: file,
      parsedDataCache: {},
      quickMetadata: null,
      metadata: {
        fileSize: file.size,
        uploadedAt: Date.now(),
        uploadedBy: userId,
      },
    });

    await this.addDataset(dataset);

    // Try to extract quick metadata using registered handlers
    try {
      const metadata = await this.extractQuickMetadataUsingHandlers(
        file,
        fileType
      );
      if (metadata) {
        dataset.quickMetadata = metadata;
        console.log(`  ✓ Quick metadata extracted by handler`);
        if (metadata.pointCount) {
          // VTK specific needs to be removed
          console.log(`    Points: ${metadata.pointCount.toLocaleString()}`);
        }
        if (metadata.estimatedMemory) {
          console.log(`    Estimated size: ${metadata.estimatedMemory}`);
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not extract quick metadata:", error.message);
    }

    this._emit("datasetLoaded", { datasetId, dataset });
    console.log(`✅ DatasetManager: Dataset "${file.name}" loaded`);

    // In your DatasetManager.loadDataset method, after creating the dataset:

    // Sync dataset metadata to Y.js so other clients can fetch if needed
    this._syncDatasetMetadataToYjs(dataset);

    return dataset;
  }

  async extractQuickMetadataUsingHandlers(file, fileType) {
    const { instanceTypeRegistry } = await import(
      "@Core/instances/types/instanceTypeRegistry.js"
    );
    const handlers = instanceTypeRegistry.getAvailableHandlers();

    for (const { handler } of handlers) {
      if (handler.canExtractMetadata && handler.canExtractMetadata(fileType)) {
        console.log(
          `  📋 Using ${handler.getDisplayName()} to extract metadata`
        );
        try {
          const metadata = await handler.extractMetadata(file, fileType);
          if (metadata) return metadata;
        } catch (error) {
          console.warn(
            `  ⚠️ Handler failed to extract metadata:`,
            error.message
          );
        }
      }
    }

    console.log(
      `  ℹ️ No handler available for ${fileType} metadata extraction`
    );
    return null;
  }

  getRawFile(datasetId) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset.rawFile;
  }

  cacheParsedData(datasetId, handlerType, parsedData, metadata) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    dataset.parsedDataCache[handlerType] = {
      data: parsedData,
      metadata: metadata,
      parsedAt: Date.now(),
    };

    console.log(
      `📦 Cached parsed data for ${datasetId} (handler: ${handlerType})`
    );
  }

  getCachedParsedData(datasetId, handlerType) {
    const dataset = this._datasets.get(datasetId);
    if (!dataset) return null;
    return dataset.parsedDataCache[handlerType] || null;
  }

  // ==================== ANNOTATION MANAGEMENT ====================

  async addAnnotation(datasetId, annotationConfig, userId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = new Annotation({
      ...annotationConfig,
      datasetId,
      createdBy: userId,
    });

    dataset.addAnnotation(annotation);
    await this._persistDataset(dataset);
    this._emit("annotationAdded", { datasetId, annotation });

    console.log(
      `📦 DatasetManager: Added annotation ${annotation.id} to dataset ${datasetId}`
    );
    return annotation;
  }

  async removeAnnotation(datasetId, annotationId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const removed = dataset.removeAnnotation(annotationId);
    if (!removed) {
      console.warn(`📦 DatasetManager: Annotation ${annotationId} not found`);
      return;
    }

    await this._persistDataset(dataset);
    this._emit("annotationRemoved", { datasetId, annotationId });
    console.log(
      `📦 DatasetManager: Removed annotation ${annotationId} from dataset ${datasetId}`
    );
  }

  async updateAnnotation(datasetId, annotationId, updates, userId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    annotation.update(updates, userId);
    await this._persistDataset(dataset);
    this._emit("annotationUpdated", { datasetId, annotation });
    console.log(`📦 DatasetManager: Updated annotation ${annotationId}`);
  }

  getAnnotations(datasetId, filter = null, userId = null) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset.getAnnotations(filter, userId);
  }

  // ==================== PERSISTENCE ====================

  async _persistDataset(dataset) {
    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");
    const data = dataset.toJSON();

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to persist dataset"));
    });
  }

  async _deleteDataset(datasetId) {
    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");

    return new Promise((resolve, reject) => {
      const request = store.delete(datasetId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to delete dataset"));
    });
  }

  // ==================== EVENT SYSTEM ====================

  on(event, callback) {
    if (!this._listeners[event]) {
      console.warn(`📦 DatasetManager: Unknown event "${event}"`);
      return;
    }
    this._listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(
      (cb) => cb !== callback
    );
  }

  _emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `📦 DatasetManager: Error in event listener for "${event}":`,
          error
        );
      }
    });
  }

  // ==================== CLEANUP ====================

  async cleanup() {
    console.log("📦 DatasetManager: Cleaning up...");
    this._datasets.clear();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
    console.log("📦 DatasetManager: Cleanup complete");
  }
}

/**
 * USAGE EXAMPLE:
 *
 * // During app initialization (e.g., in your Phase 1 init)
 * import { DatasetManager } from '@Core/data/managers/DatasetManager.js';
 * import { fileCache } from '@Core/services/fileCache.js'; // Your existing cache
 *
 * const datasetManager = new DatasetManager();
 * await datasetManager.initialize(fileCache);
 *
 * // Make it globally accessible
 * window.CIA = window.CIA || {};
 * window.CIA.datasetManager = datasetManager;
 *
 * // When a user drops a file
 * async function handleFileDrop(file) {
 *   const dataset = await datasetManager.addDataset(file, currentUser.id);
 *
 *   // Load and analyze the file to extract metadata
 *   const fileData = await datasetManager.loadFile(dataset.id);
 *   const bounds = extractBounds(fileData); // Your existing analysis code
 *   const pointCount = extractPointCount(fileData);
 *
 *   // Update the dataset with analysis results
 *   await datasetManager.updateMetadata(dataset.id, {
 *     bounds,
 *     pointCount
 *   });
 *
 *   // Now ViewConfigurationManager can create a default view for this dataset
 * }
 *
 * // When a user creates an annotation
 * async function createAnnotation(datasetId, position, text) {
 *   const annotation = await datasetManager.addAnnotation(
 *     datasetId,
 *     {
 *       position,
 *       text,
 *       type: 'point',
 *       tags: ['user-created']
 *     },
 *     currentUser.id
 *   );
 *
 *   // The annotation is now stored with the dataset
 *   // Views can filter and display it based on their annotation display config
 * }
 *
 * // When a handler needs to render a dataset
 * async function renderDataset(datasetId) {
 *   const dataset = datasetManager.getDataset(datasetId);
 *   const file = await datasetManager.loadFile(datasetId);
 *
 *   // Load and render the file
 *   // ...
 * }
 *
 * // Listen for dataset changes
 * datasetManager.on('datasetAdded', (dataset) => {
 *   console.log('New dataset added:', dataset.filename);
 *   // Update UI to show the new dataset
 * });
 *
 * datasetManager.on('annotationAdded', ({ datasetId, annotation }) => {
 *   console.log('New annotation on dataset:', datasetId);
 *   // Trigger re-render if this dataset is currently visible
 * });
 */
