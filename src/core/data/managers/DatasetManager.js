// src/core/data/managers/DatasetManager.js

import { Dataset } from "@Core/data/models/Dataset.js";
import { Annotation } from "@Core/data/models/Annotation.js";

/**
 * DatasetManager - Manages Layer 1 of the architecture (raw data + annotations)
 *
 * This manager is your interface to dataset storage. It wraps your existing
 * IndexedDB caching system and provides a clean API for:
 * - Loading and storing dataset files
 * - Managing dataset metadata
 * - Creating and querying annotations
 * - Retrieving data for visualization
 *
 * ARCHITECTURAL ROLE:
 * The DatasetManager is the foundation of your data layer. It knows nothing about
 * views or instances - it just manages datasets and their annotations. Other managers
 * (ViewConfigurationManager, InstanceManager) depend on this manager to get data.
 *
 * INTEGRATION WITH EXISTING CODE:
 * Your existing IndexedDB cache logic (likely in a fileCache or similar module)
 * gets wrapped by this manager. Instead of calling your cache directly, other
 * parts of your app will call DatasetManager methods. This creates a clean
 * abstraction layer that makes it easier to change storage implementations later
 * (e.g., adding server-side storage alongside IndexedDB).
 */

export class DatasetManager {
  constructor(config = {}) {
    // In-memory cache of Dataset objects for fast access
    // Maps dataset ID to Dataset instance
    this._datasets = new Map();

    // Reference to your existing IndexedDB cache
    // This will be injected or initialized based on your existing code
    this._fileCache = config.fileCache || null;

    // IndexedDB database name for dataset metadata
    // Separate from file cache to keep concerns separated
    this._dbName = config.dbName || "CIA_Datasets";
    this._dbVersion = config.dbVersion || 1;
    this._db = null;

    // Event listeners for dataset changes
    // Other parts of your app can subscribe to these events
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

  /**
   * Initialize the DatasetManager
   * This should be called during your app's initialization phase
   *
   * What this does:
   * 1. Opens IndexedDB connection for dataset metadata
   * 2. Loads existing dataset metadata into memory
   * 3. Sets up the file cache reference
   *
   * @param {object} fileCache - Your existing file cache instance
   */
  async initialize(fileCache) {
    console.log("📦 DatasetManager: Initializing...");

    // Store reference to your existing file cache
    this._fileCache = fileCache;

    // Open IndexedDB for dataset metadata storage
    await this._openDatabase();

    // Load existing datasets from storage into memory
    await this._loadExistingDatasets();

    console.log(
      `📦 DatasetManager: Initialized with ${this._datasets.size} datasets`
    );
  }

  /**
   * Open the IndexedDB database for dataset metadata
   * This is separate from your file cache DB to keep concerns separated
   */
  async _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () => {
        reject(new Error("Failed to open dataset metadata database"));
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for dataset metadata if it doesn't exist
        if (!db.objectStoreNames.contains("datasets")) {
          const store = db.createObjectStore("datasets", { keyPath: "id" });

          // Create indexes for common queries
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

  /**
   * Load existing dataset metadata from IndexedDB into memory
   * This creates Dataset objects for each stored dataset
   */
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
        });

        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to load existing datasets"));
      };
    });
  }

  // ==================== DATASET MANAGEMENT ====================

  /**
   * Add a new dataset from a file
   * This is called when a user drops a file or selects one to load
   *
   * WORKFLOW:
   * 1. Store the file in your existing file cache (IndexedDB)
   * 2. Create a Dataset object with metadata
   * 3. Store the dataset metadata
   * 4. Notify listeners that a new dataset was added
   *
   * @param {File} file - The file object from user input
   * @param {string} userId - ID of the user adding this dataset
   * @returns {Promise<Dataset>} - The created dataset
   */
  async addDataset(file, userId) {
    console.log(`📦 DatasetManager: Adding dataset "${file.name}"`);

    try {
      // Store the file in your existing file cache
      // This returns the cache key, which we'll use as a reference
      const cacheKey = await this._fileCache.storeFile(file);

      // Create the Dataset object
      const dataset = new Dataset({
        filename: file.name,
        file: cacheKey, // Store the cache key, not the file itself
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: Date.now(),
        },
      });

      // Store in memory
      this._datasets.set(dataset.id, dataset);

      // Persist to IndexedDB
      await this._persistDataset(dataset);

      // Notify listeners
      this._emit("datasetAdded", dataset);

      console.log(
        `📦 DatasetManager: Dataset "${file.name}" added with ID ${dataset.id}`
      );

      return dataset;
    } catch (error) {
      console.error("📦 DatasetManager: Failed to add dataset:", error);
      throw error;
    }
  }

  /**
   * Get a dataset by ID
   * @param {string} datasetId - The dataset ID
   * @returns {Dataset|null} - The dataset or null if not found
   */
  getDataset(datasetId) {
    return this._datasets.get(datasetId) || null;
  }

  /**
   * Get all datasets
   * @returns {Dataset[]} - Array of all datasets
   */
  getAllDatasets() {
    return Array.from(this._datasets.values());
  }

  /**
   * Get datasets by filename (useful for checking if a file is already loaded)
   * @param {string} filename - The filename to search for
   * @returns {Dataset[]} - Matching datasets
   */
  getDatasetsByFilename(filename) {
    return this.getAllDatasets().filter((d) => d.filename === filename);
  }

  /**
   * Remove a dataset
   * This also removes the file from cache and all associated data
   *
   * @param {string} datasetId - The dataset ID to remove
   */
  async removeDataset(datasetId) {
    console.log(`📦 DatasetManager: Removing dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      console.warn(`📦 DatasetManager: Dataset ${datasetId} not found`);
      return;
    }

    try {
      // Remove file from cache
      await this._fileCache.removeFile(dataset.file);

      // Remove from memory
      this._datasets.delete(datasetId);

      // Remove from IndexedDB
      await this._deleteDataset(datasetId);

      // Notify listeners
      this._emit("datasetRemoved", datasetId);

      console.log(`📦 DatasetManager: Dataset ${datasetId} removed`);
    } catch (error) {
      console.error("📦 DatasetManager: Failed to remove dataset:", error);
      throw error;
    }
  }

  /**
   * Update dataset metadata
   * Called after loading and analyzing a file to add spatial metadata
   *
   * @param {string} datasetId - The dataset ID
   * @param {object} metadata - Metadata to update
   */
  async updateMetadata(datasetId, metadata) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    dataset.updateMetadata(metadata);

    // Persist changes
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("datasetUpdated", dataset);
  }

  /**
   * Load a dataset file (BRIDGE METHOD)
   *
   * This provides backward compatibility with the old datasetManager API
   * while using the new three-layer architecture internally.
   *
   * Eventually, this workflow will change:
   * - DatasetManager will ONLY store raw files and metadata
   * - VTKInstanceHandler will parse files WHEN NEEDED for rendering
   * - Polydata will live in ViewConfiguration, not Dataset
   *
   * But for now, this bridge keeps existing code working while we migrate.
   *
   * @param {File} file - The file to load
   * @param {string} publicPath - Optional public URL for sample files
   * @param {string} userId - User loading the file
   * @returns {Promise<Dataset>} - The loaded dataset
   */
  async loadDataset(file, publicPath = null, userId = null) {
    console.log(`📦 DatasetManager: Loading dataset "${file.name}"`);

    // Use current user if not specified
    if (!userId) {
      // Import getUserId from your user management
      const { getUserId } = await import(
        "@Collaboration/presence/userManagement.js"
      );
      userId = getUserId();
    }

    try {
      // Step 1: Calculate hash for deduplication
      const hash = await this._fileCache.calculateHash(file);
      console.log(`  ✓ Hash: ${hash.substring(0, 16)}...`);

      // Step 2: Check if we already have this dataset
      const existingDatasets = this.getAllDatasets();
      const existing = existingDatasets.find(
        (d) => d.metadata.hash === hash || d.filename === file.name
      );

      if (existing) {
        console.log(`  ⚠️ Dataset already exists: ${existing.id}`);
        // Check if we have polydata loaded
        if (existing.polydata) {
          console.log(`  ✓ Polydata already in memory`);
          return existing;
        }
        // If not, we'll load it below
        console.log(`  ⏳ Loading polydata for existing dataset...`);
      }

      // Step 3: Add dataset (stores file and creates Dataset object)
      const dataset = existing || (await this.addDataset(file, userId));

      // Store the hash and public path in metadata
      await this.updateMetadata(dataset.id, {
        hash,
        publicPath,
      });

      // Step 4: Parse the file to get polydata
      // This is VTK-specific, so we delegate to VTKInstanceHandler
      console.log(`  ⏳ Parsing VTP file...`);

      // Get the VTK handler from the registry
      const { getHandlerForType } = await import(
        "@Core/instances/types/instanceTypesInit.js"
      );
      const vtkHandler = getHandlerForType("vtk");

      // Parse the file
      const polydata = await vtkHandler.parseFile(file);

      // Step 5: Extract spatial metadata from polydata
      const spatialMetadata = vtkHandler.extractMetadata(polydata);

      // Update dataset with spatial metadata
      await this.updateMetadata(dataset.id, spatialMetadata);

      console.log(`  ✓ Spatial metadata extracted`);
      console.log(`    Points: ${spatialMetadata.pointCount.toLocaleString()}`);
      console.log(
        `    Bounds: [${Object.values(spatialMetadata.bounds).join(", ")}]`
      );

      // Step 6: TEMPORARY - Store polydata on dataset for backward compatibility
      // Eventually, polydata will be managed by ViewConfiguration/handlers
      // But for now, UI code expects dataset.polydata to exist
      dataset.polydata = polydata;

      console.log(`✅ DatasetManager: Dataset "${file.name}" fully loaded`);

      // Emit event so hooks can react
      this._emit("datasetLoaded", dataset);

      return dataset;
    } catch (error) {
      console.error(
        `❌ DatasetManager: Failed to load dataset "${file.name}":`,
        error
      );
      throw error;
    }
  }

  /**
   * Load polydata from cache for an existing dataset
   *
   * This is called when we have dataset metadata but need to load
   * the actual polydata (e.g., from Y.js sync or after page reload)
   *
   * @param {string} datasetId - The dataset ID
   * @returns {Promise<Object>} - The polydata object
   */
  async loadPolydataFromCache(datasetId) {
    console.log(
      `📦 DatasetManager: Loading polydata from cache for ${datasetId}`
    );

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Check if already loaded
    if (dataset.polydata) {
      console.log(`  ✓ Polydata already in memory`);
      return dataset.polydata;
    }

    try {
      // Check for publicPath BEFORE trying to load from cache
      if (!dataset.file && dataset.metadata?.publicPath) {
        console.log(
          `  🌐 Public file detected, fetching from URL: ${dataset.metadata.publicPath}`
        );
        const response = await fetch(dataset.metadata.publicPath);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch public file: ${response.status} ${response.statusText}`
          );
        }

        const blob = await response.blob();
        const fetchedFile = new File([blob], dataset.filename, {
          type: "application/octet-stream",
        });

        // Parse and store the polydata
        const polydata = await this._parseAndStorePolydata(
          datasetId,
          fetchedFile
        );

        // CRITICAL FIX: Emit the datasetLoaded event
        this._emit("datasetLoaded", { datasetId, dataset });

        return polydata;
      }

      // Normal path: Load from cache
      const file = await this.loadFile(datasetId);

      if (!file) {
        throw new Error(`File not found in cache for dataset ${datasetId}`);
      }

      // Parse the cached file
      const polydata = await this._parseAndStorePolydata(datasetId, file);

      // CRITICAL FIX: Emit the datasetLoaded event here too
      this._emit("datasetLoaded", { datasetId, dataset });

      return polydata;
    } catch (error) {
      console.error(
        `❌ DatasetManager: Failed to load polydata from cache:`,
        error
      );
      throw error;
    }
  }

  /**
   * Helper to parse file and store polydata
   * @private
   */
  async _parseAndStorePolydata(datasetId, file) {
    const dataset = this.getDataset(datasetId);

    // Get VTK handler
    const { getHandlerForType } = await import(
      "@Core/instances/types/instanceTypesInit.js"
    );
    const vtkHandler = getHandlerForType("vtk");

    // Parse
    const polydata = await vtkHandler.parseFile(file);

    // Store on dataset (temporary for backward compatibility)
    dataset.polydata = polydata;

    // Extract and update metadata if needed
    if (!dataset.isAnalyzed()) {
      const spatialMetadata = vtkHandler.extractMetadata(polydata);
      await this.updateMetadata(datasetId, spatialMetadata);
    }

    console.log(`✅ Polydata loaded and stored for ${datasetId}`);

    return polydata;
  }

  /**
   * Load the actual file data for a dataset
   * This is called by handlers when they need to visualize the data
   *
   * @param {string} datasetId - The dataset ID
   * @returns {Promise<File>} - The file object
   */
  async loadFile(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Retrieve file from cache using the stored cache key
    return await this._fileCache.getFile(dataset.file);
  }

  // ==================== ANNOTATION MANAGEMENT ====================

  /**
   * Add an annotation to a dataset
   *
   * @param {string} datasetId - The dataset to annotate
   * @param {object} annotationConfig - Configuration for the annotation
   * @param {string} userId - User creating the annotation
   * @returns {Annotation} - The created annotation
   */
  async addAnnotation(datasetId, annotationConfig, userId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Create the annotation
    const annotation = new Annotation({
      ...annotationConfig,
      datasetId,
      createdBy: userId,
    });

    // Add to dataset
    dataset.addAnnotation(annotation);

    // Persist changes
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("annotationAdded", { datasetId, annotation });

    console.log(
      `📦 DatasetManager: Added annotation ${annotation.id} to dataset ${datasetId}`
    );

    return annotation;
  }

  /**
   * Remove an annotation from a dataset
   *
   * @param {string} datasetId - The dataset ID
   * @param {string} annotationId - The annotation ID
   */
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

    // Persist changes
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("annotationRemoved", { datasetId, annotationId });

    console.log(
      `📦 DatasetManager: Removed annotation ${annotationId} from dataset ${datasetId}`
    );
  }

  /**
   * Update an annotation
   *
   * @param {string} datasetId - The dataset ID
   * @param {string} annotationId - The annotation ID
   * @param {object} updates - Fields to update
   * @param {string} userId - User making the change
   */
  async updateAnnotation(datasetId, annotationId, updates, userId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const annotation = dataset.getAnnotation(annotationId);
    if (!annotation) {
      throw new Error(`Annotation ${annotationId} not found`);
    }

    // Update the annotation
    annotation.update(updates, userId);

    // Persist changes
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("annotationUpdated", { datasetId, annotation });

    console.log(`📦 DatasetManager: Updated annotation ${annotationId}`);
  }

  /**
   * Get annotations for a dataset
   *
   * @param {string} datasetId - The dataset ID
   * @param {object} filter - Optional filter specification
   * @param {string} userId - User requesting annotations (for permission checks)
   * @returns {Annotation[]} - Filtered annotations
   */
  getAnnotations(datasetId, filter = null, userId = null) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    return dataset.getAnnotations(filter, userId);
  }

  // ==================== PERSISTENCE ====================

  /**
   * Persist a dataset to IndexedDB
   * This stores the metadata and annotations, not the file itself
   * The file is already in your file cache
   */
  async _persistDataset(dataset) {
    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");

    // Serialize the dataset
    const data = dataset.toJSON();

    return new Promise((resolve, reject) => {
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("Failed to persist dataset"));
    });
  }

  /**
   * Delete a dataset from IndexedDB
   */
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

  /**
   * Subscribe to dataset events
   * Other managers and UI components can listen for changes
   *
   * Events: datasetAdded, datasetRemoved, datasetUpdated,
   *         annotationAdded, annotationRemoved, annotationUpdated
   *
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      console.warn(`📦 DatasetManager: Unknown event "${event}"`);
      return;
    }

    this._listeners[event].push(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event, callback) {
    if (!this._listeners[event]) return;

    this._listeners[event] = this._listeners[event].filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Emit an event to all listeners
   */
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

  /**
   * Clean up resources
   * Called when shutting down the application
   */
  async cleanup() {
    console.log("📦 DatasetManager: Cleaning up...");

    // Clear in-memory cache
    this._datasets.clear();

    // Close database connection
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
