// src/core/data/managers/DatasetManager.js
import { EventEmitter } from "events"; // Node.js events

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
export class DatasetManager extends EventEmitter {
  constructor(storageProvider, config = {}) {
    super();

    this.storageProvider = storageProvider;
    this._datasets = new Map();
    this.parsedDataCache = new Map();
    this._dbName = config.dbName || "CIA_Datasets";
    this._dbVersion = config.dbVersion || 1;
    this._db = null;

    console.log("📦 DatasetManager: Initializing...");

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
          if (!data.id) {
            console.warn(
              `⚠️ Skipping dataset without ID: ${data.filename || "unknown"}`
            );
            console.warn(`   This dataset is corrupted and will be ignored`);
            return; // Skip this dataset
          }

          try {
            const dataset = Dataset.fromJSON(data);
            this._datasets.set(dataset.id, dataset);

            // IMPORTANT: Sync metadata to Y.js for collaboration
            // This ensures other users can see what datasets we have
            this._syncDatasetMetadataToYjs(dataset);
          } catch (error) {
            console.error(`❌ Failed to load dataset ${data.id}:`, error);
            console.error(`   Dataset: ${data.filename || "unknown"}`);
            // Skip corrupted datasets instead of crashing
          }
        });

        console.log(`📦 Synced ${storedDatasets.length} datasets to Y.js`);
        resolve();
      };
      request.onerror = () =>
        reject(new Error("Failed to load existing datasets"));
    });
  }

  /**
   * Sync datasets from the server's session storage
   * Called during Phase 1 initialization to populate from server
   */
  async syncDatasetsFromServer() {
    console.log("📡 DatasetManager: Syncing datasets from server...");

    // Check if we're using server storage
    if (!this.storageProvider || !this.storageProvider.listDatasets) {
      console.log("   ℹ️ Not using server storage, skipping sync");
      return;
    }

    try {
      const serverDatasets = await this.storageProvider.listDatasets();

      console.log(`   Found ${serverDatasets.length} dataset(s) on server`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const serverDataset of serverDatasets) {
        const existingDataset = this.getDataset(serverDataset.id);

        if (existingDataset) {
          skippedCount++;
          continue;
        }

        console.log(
          `   📥 Creating dataset from server: ${serverDataset.filename}`
        );

        const dataset = new Dataset({
          id: serverDataset.id,
          filename: serverDataset.filename,
          fileType: serverDataset.file_type,
          fileSize: serverDataset.file_size,
          userId: serverDataset.uploaded_by, // CRITICAL: Set userId for Y.js filtering
          uploadedBy: serverDataset.uploaded_by,
          uploadedAt: serverDataset.uploaded_at,
          cacheKey: serverDataset.id,
          fileStatus: "on-server",
          metadata: serverDataset.metadata || {},
        });

        this._datasets.set(dataset.id, dataset);
        this._emit("datasetAdded", dataset);

        syncedCount++;
      }

      console.log(
        `   ✅ Synced ${syncedCount} new dataset(s), skipped ${skippedCount} existing`
      );

      this.syncAllDatasetsToYjs();

      return {
        total: serverDatasets.length,
        synced: syncedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      console.error("❌ DatasetManager: Server sync failed:", error);
      throw error;
    }
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

  /**
   * Add a new dataset from a file (UPDATED WITH FILE TYPE)
   *
   * This is the primary entry point for creating datasets. It now properly
   * extracts and stores the file type as part of the dataset's core metadata.
   *
   * The flow:
   * 1. Extract file type from filename
   * 2. Validate it's a supported type (optional but recommended)
   * 3. Store the file in cache
   * 4. Create Dataset object WITH fileType set
   * 5. Persist everything
   *
   * @param {File} file - The file object from user input
   * @param {string} userId - ID of the user adding this dataset
   * @returns {Promise<Dataset>} - The created dataset
   */
  async addDataset(file, userId) {
    console.log(`📦 DatasetManager: Adding dataset "${file.name}"`);

    try {
      // STEP 1: Extract file type from filename
      const fileType = this._extractFileType(file.name);
      console.log(`  📋 File type: ${fileType}`);

      // STEP 2: Validate file type is supported (optional but helpful)
      const isSupported = await this._isFileTypeSupported(fileType);
      if (!isSupported) {
        console.warn(
          `  ⚠️ Warning: File type "${fileType}" may not be supported`
        );
      }

      // STEP 3: Generate hash and store file using YOUR storageProvider
      const hash = await this.generateFileHash(file);
      const storageResult = await this.storageProvider.storeFile(file);
      console.log(`  ✓ File stored: ${hash.substring(0, 16)}...`);

      // STEP 4: Create the Dataset object with fileType
      const dataset = new Dataset({
        id: generateDatasetId(),
        filename: file.name,
        fileType: fileType, // ← THE KEY FIX
        hash: hash,
        storageKey: storageResult || hash, // storageResult IS the key, not storageResult.key
        userId: userId,
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: Date.now(),
        },
      });

      // STEP 5: Store in memory
      this._datasets.set(dataset.id, dataset);

      // STEP 6: Persist to IndexedDB
      await this._persistDataset(dataset);

      // STEP 7: Sync to Y.js
      this._syncDatasetMetadataToYjs(dataset);

      // STEP 8: Notify listeners
      this._emit("datasetAdded", dataset);

      console.log(
        `✅ DatasetManager: Dataset "${file.name}" added with ID ${dataset.id}`
      );
      console.log(`   File type: ${fileType}`);

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
   * Load a dataset file (UPDATED WITH FILE TYPE)
   *
   * This is the bridge method that handles the complete loading workflow.
   * It now also ensures fileType is properly set when loading datasets.
   *
   * @param {File} file - The file to load
   * @param {string} publicPath - Optional public URL for sample files
   * @param {string} userId - User loading the file
   * @returns {Promise<string>} - The dataset ID
   */
  // In DatasetManager.js, update the loadDataset method

  async loadDataset(file, publicPath = null, userId = null) {
    console.log(`📦 DatasetManager: Loading dataset "${file.name}"`);

    // Use current user if not specified
    if (!userId) {
      const { getUserId } = await import(
        "@Collaboration/presence/userManagement.js"
      );
      userId = getUserId();
    }

    try {
      // STEP 1: Extract file type
      const fileType = this._extractFileType(file.name);
      console.log(`  📋 File type: ${fileType}`);

      // STEP 2: Calculate hash
      const hash = await this.generateFileHash(file);
      console.log(`  ✓ Hash: ${hash.substring(0, 16)}...`);

      // STEP 3: Check if we already have this dataset metadata
      const existing = await this.findDatasetByHash(hash);

      if (existing) {
        console.log(`  📋 Found existing dataset: ${existing.id}`);

        // CRITICAL: Even though we have metadata, we might not have the file!
        // Store the file so it's available for visualization
        console.log(`  💾 Updating file data for existing dataset...`);

        // Store the file in cache
        try {
          const storageResult = await this.storageProvider.storeFile(file);
          console.log(`  ✓ File stored successfully`);

          // Update the dataset object with the new file reference
          existing.rawFile = file;
          existing.setFileStatus("available", file);

          // If publicPath was provided, update it (in case it changed)
          if (publicPath && publicPath !== existing.publicPath) {
            existing.publicPath = publicPath;
            await this._persistDataset(existing);
          }

          // Emit events so UI updates
          this._emit("datasetUpdated", existing);
          this._syncDatasetMetadataToYjs(existing);

          // Emit datasetLoaded event so instances can load it
          this._emit("datasetLoaded", {
            datasetId: existing.id,
            dataset: existing,
          });

          console.log(
            `✅ DatasetManager: Existing dataset updated with new file`
          );
          console.log(`   ID: ${existing.id}`);

          return existing.id;
        } catch (storageError) {
          console.error(`  ❌ Failed to store file:`, storageError);
          throw new Error(
            `Failed to update file for ${file.name}: ${storageError.message}`
          );
        }
      }

      // STEP 4: This is a truly new dataset - validate file type support
      const isSupported = await this._isFileTypeSupported(fileType);
      if (!isSupported) {
        throw new Error(
          `File type ${fileType.toUpperCase()} is not supported by any registered handler. ` +
            `Please ensure the appropriate visualization plugin is installed.`
        );
      }

      // STEP 5: Store the raw file
      const storageResult = await this.storageProvider.storeFile(file);

      // STEP 6: Create dataset metadata
      const dataset = new Dataset({
        id: generateDatasetId(),
        filename: file.name,
        fileType: fileType,
        hash: hash,
        publicPath: publicPath,
        storageKey: storageResult || hash, // storageResult IS the key, not storageResult.key
        userId: userId,
        rawFile: file, // Keep reference for immediate use
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: Date.now(),
        },
      });

      // STEP 7: Try to extract quick metadata (optional, non-blocking)
      try {
        const quickMetadata = await this.extractQuickMetadataUsingHandlers(
          file,
          fileType
        );
        if (quickMetadata) {
          dataset.quickMetadata = quickMetadata;
          dataset.updateMetadata(quickMetadata);
          console.log(`  ✓ Quick metadata extracted`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not extract quick metadata:`, error.message);
      }

      // STEP 8: Store and sync
      this._datasets.set(dataset.id, dataset);
      await this._persistDataset(dataset);
      this._syncDatasetMetadataToYjs(dataset);

      // STEP 9: Notify listeners
      this._emit("datasetAdded", dataset);

      // STEP 10: Emit datasetLoaded event
      this._emit("datasetLoaded", {
        datasetId: dataset.id,
        dataset: dataset,
      });

      console.log(`✅ DatasetManager: Dataset "${file.name}" ready`);
      console.log(`   ID: ${dataset.id}`);
      console.log(`   Type: ${fileType}`);

      return dataset.id;
    } catch (error) {
      console.error(
        `❌ DatasetManager: Failed to load dataset "${file.name}":`,
        error
      );
      throw error;
    }
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

  // ==================== FILE TYPE UTILITIES ====================
  // These helper methods extract and validate file types
  // They live in DatasetManager because this is where datasets are created

  /**
   * Extract file type (extension) from filename
   *
   * This is the authoritative place where file type determination happens.
   * Extract once at dataset creation, store it, and all subsequent code
   * can simply read dataset.fileType with confidence it's always populated.
   *
   * Examples:
   *   "Earth.vtp" → "vtp"
   *   "model.STL" → "stl"
   *   "data.tar.gz" → "gz" (last extension)
   *
   * @param {string} filename - The filename to parse
   * @returns {string} - The lowercase file extension without the dot
   * @throws {Error} - If filename is invalid or has no extension
   * @private
   */
  _extractFileType(filename) {
    // Defensive validation
    if (!filename || typeof filename !== "string") {
      throw new Error("Invalid filename: must be a non-empty string");
    }

    // Handle filenames with multiple dots (like "data.tar.gz")
    // We want the last part after the final dot
    const parts = filename.split(".");

    if (parts.length < 2) {
      throw new Error(
        `Filename "${filename}" has no extension. ` +
          `All dataset files must have a file extension (e.g., .vtp, .vti, .stl)`
      );
    }

    // Get the last part and normalize to lowercase
    const extension = parts[parts.length - 1].toLowerCase();

    // Additional validation: extension should not be empty
    if (extension.length === 0) {
      throw new Error(`Filename "${filename}" has empty extension`);
    }

    return extension;
  }

  /**
   * Validate that a file type is supported by at least one registered handler
   *
   * This provides early validation - we can reject unsupported file types
   * immediately at upload time with a helpful error message, rather than
   * letting the file get stored and only failing later when someone tries
   * to visualize it.
   *
   * @param {string} fileType - The file extension to validate
   * @returns {boolean} - True if at least one handler supports this type
   * @private
   */
  async _isFileTypeSupported(fileType) {
    try {
      const { instanceTypeRegistry } = await import(
        "@Core/instances/types/instanceTypeRegistry.js"
      );

      // Create a descriptor that matches what canHandleDataset() expects
      // The interface default implementation looks for dataset.fileType
      const descriptor = {
        extension: fileType,
        filename: `test.${fileType}`,
        fileType: fileType, // ← ADD THIS - matches interface expectations
      };

      // Ask registry which handlers can work with this type
      const compatibleHandlers =
        instanceTypeRegistry.getCompatibleHandlers(descriptor);

      return compatibleHandlers.length > 0;
    } catch (error) {
      // If we can't check (registry not available), be permissive
      console.warn("Could not validate file type support:", error);
      return true;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get the file type for a dataset
   *
   * This is a convenience method that returns the fileType with validation.
   * It's useful when you want to be extra defensive in case old datasets
   * don't have fileType set.
   *
   * @param {string} datasetId - The dataset ID
   * @returns {string|null} - The file type, or null if dataset not found
   */
  getDatasetFileType(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      return null;
    }

    // If fileType is missing (old dataset), extract it from filename
    if (!dataset.fileType && dataset.filename) {
      try {
        dataset.fileType = this._extractFileType(dataset.filename);
        // Persist the update so we don't have to extract again
        this._persistDataset(dataset).catch((err) => {
          console.warn("Failed to persist fileType update:", err);
        });
      } catch (error) {
        console.warn(
          `Could not extract file type for ${dataset.filename}:`,
          error
        );
        return null;
      }
    }

    return dataset.fileType;
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
    // Validate dataset has required id field before persisting
    if (!dataset.id) {
      console.error("❌ Cannot persist dataset without ID:", dataset);
      throw new Error(
        `Dataset ${dataset.filename} is missing required 'id' field`
      );
    }

    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");
    const data = dataset.toJSON();

    // Double-check the JSON has the id
    if (!data.id) {
      console.error("❌ Dataset.toJSON() did not include 'id':", data);
      throw new Error(
        `Dataset ${dataset.filename} toJSON() missing 'id' field`
      );
    }

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("❌ IndexedDB put failed:", request.error);
        console.error("   Dataset:", data);
        reject(
          new Error(`Failed to persist dataset: ${request.error.message}`)
        );
      };
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

  async clearCorruptedData() {
    console.log("🗑️ Clearing potentially corrupted IndexedDB data...");

    try {
      const transaction = this._db.transaction(["datasets"], "readwrite");
      const store = transaction.objectStore("datasets");

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log("✅ IndexedDB cleared successfully");
          console.log("   Please refresh the page to start fresh");
          resolve();
        };
        request.onerror = () => {
          console.error("❌ Failed to clear IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("❌ Error clearing IndexedDB:", error);
    }
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
