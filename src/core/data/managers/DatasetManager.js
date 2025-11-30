// src/core/data/managers/DatasetManager.js
// v2.0: Server-authoritative - IDs must come from server
import { EventEmitter } from "events"; // Node.js events

import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { Dataset } from "@Core/data/models/Dataset.js";
import { Annotation } from "@Core/data/models/Annotation.js";
import { config } from "@Core/config/clientConfig.js";
import { dataset as log } from "@Utils/logger.js";

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

    log.info("DatasetManager: Initializing...");

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
    log.info("DatasetManager: Initializing...");
    await this._openDatabase();
    await this._loadExistingDatasets();
    log.info(
      `DatasetManager: Initialized with ${this._datasets.size} datasets`
    );
  }

  /**
   * Sync all datasets to Y.js
   * Call this after Y.js becomes available to ensure collaboration
   */
  syncAllDatasetsToYjs() {
    log.info("DatasetManager: Syncing all datasets to Y.js...");

    let syncedCount = 0;
    this._datasets.forEach((dataset) => {
      this._syncDatasetMetadataToYjs(dataset);
      syncedCount++;
    });

    log.info(`DatasetManager: Synced ${syncedCount} dataset(s) to Y.js`);
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
      log.error("DatasetManager: Failed to generate file hash:", error);
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

  /**
   * Quick check if we have a dataset with a given hash
   * @param {string} hash - The file hash to check
   * @returns {boolean}
   */
  hasDatasetWithHash(hash) {
    for (const dataset of this._datasets.values()) {
      if (dataset.hash === hash) {
        return true;
      }
    }
    return false;
  }

  async _openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () =>
        reject(new Error("Failed to open dataset metadata database"));
      request.onsuccess = (event) => {
        this._db = event.target.result;

        // Check if the required object store exists
        // If not, the database is corrupted/outdated - delete and recreate
        if (!this._db.objectStoreNames.contains("datasets")) {
          log.warn("Database missing 'datasets' store, recreating...");
          this._db.close();

          const deleteRequest = indexedDB.deleteDatabase(this._dbName);
          deleteRequest.onsuccess = () => {
            log.info("Deleted corrupted database, recreating...");
            // Recursively call _openDatabase to recreate
            this._openDatabase().then(resolve).catch(reject);
          };
          deleteRequest.onerror = () => {
            reject(new Error("Failed to delete corrupted database"));
          };
          return;
        }

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
            log.warn(
              `Skipping dataset without ID: ${data.filename || "unknown"}`
            );
            log.warn(`This dataset is corrupted and will be ignored`);
            return; // Skip this dataset
          }

          try {
            const dataset = Dataset.fromJSON(data);
            this._datasets.set(dataset.id, dataset);

            // IMPORTANT: Sync metadata to Y.js for collaboration
            // This ensures other users can see what datasets we have
            this._syncDatasetMetadataToYjs(dataset);
          } catch (error) {
            log.error(`Failed to load dataset ${data.id}:`, error);
            log.error(`Dataset: ${data.filename || "unknown"}`);
            // Skip corrupted datasets instead of crashing
          }
        });

        log.info(`Synced ${storedDatasets.length} datasets to Y.js`);
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
    log.info("DatasetManager: Syncing datasets from server...");

    // Check if we're using server storage
    if (!this.storageProvider || !this.storageProvider.listDatasets) {
      log.info("Not using server storage, skipping sync");
      return;
    }

    try {
      const serverDatasets = await this.storageProvider.listDatasets();

      log.info(`Found ${serverDatasets.length} dataset(s) on server`);

      let syncedCount = 0;
      let skippedCount = 0;

      for (const serverDataset of serverDatasets) {
        log.info(
          `Creating dataset from server: ${serverDataset.filename}`
        );

        const dataset = await this._addDatasetFromServer(serverDataset);

        if (dataset) {
          syncedCount++;
        } else {
          skippedCount++;
        }
      }

      log.info(
        `Synced ${syncedCount} new dataset(s), skipped ${skippedCount} existing`
      );

      this.syncAllDatasetsToYjs();

      return {
        total: serverDatasets.length,
        synced: syncedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      log.error("DatasetManager: Server sync failed:", error);
      throw error;
    }
  }

  /**
   * Add a dataset from server sync (v2.0)
   * Called when fetching existing datasets from server API
   * Does NOT upload - the file already exists on server
   *
   * @param {object} serverFile - Server file record
   * @returns {Promise<Dataset>} The created dataset
   */
  async _addDatasetFromServer(serverFile) {
    log.info(
      `DatasetManager: Adding dataset from server: ${serverFile.filename}`
    );

    // Check if we already have this dataset
    if (this._datasets.has(serverFile.id)) {
      log.info(`Dataset ${serverFile.id} already exists locally`);
      return this._datasets.get(serverFile.id);
    }

    // Create dataset object with server-provided data
    const dataset = new Dataset({
      id: serverFile.id,
      serverId: serverFile.id,
      filename: serverFile.filename,
      fileType:
        serverFile.file_type || this._extractFileType(serverFile.filename),
      hash: serverFile.hash,
      storageKey: serverFile.storage_key,
      publicPath: `${config.apiBaseUrl}/files/${serverFile.id}/download`,
      userId: serverFile.uploaded_by,
      metadata: {
        fileSize: serverFile.file_size,
        uploadedBy: serverFile.uploaded_by,
        uploadedAt: serverFile.uploaded_at,
        pointCount: serverFile.point_count,
        cellCount: serverFile.cell_count,
        bounds: serverFile.bounds,
        dataArrays: serverFile.data_arrays,
      },
    });

    // Mark as needing file fetch (file is on server, not local yet)
    dataset.setFileStatus("needs-fetch");

    // Store in memory
    this._datasets.set(dataset.id, dataset);

    // Persist to IndexedDB
    await this._persistDataset(dataset);

    // Notify listeners
    this._emit("datasetAdded", dataset);

    log.info(`Dataset added from server: ${dataset.id}`);
    return dataset;
  }

  /**
   * Add dataset from Y.js remote data
   * Called by Y.js observers when a remote user adds a dataset
   *
   * @param {Object} yData - Dataset metadata from Y.js
   * @returns {Dataset|null} - The created dataset, or null if duplicate
   */
  async _addDatasetFromYjs(yData) {
    // Check if we already have this dataset by ID
    if (this._datasets.has(yData.id)) {
      log.info(`Y.js dataset ${yData.id} already exists locally`);
      return null;
    }

    // Check by hash
    if (yData.hash && this.hasDatasetWithHash(yData.hash)) {
      log.info(
        `Y.js dataset with hash ${yData.hash.substring(
          0,
          8
        )}... already exists`
      );
      return null;
    }

    log.info(`Adding dataset from Y.js: ${yData.filename}`);

    const dataset = new Dataset({
      id: yData.id,
      serverId: yData.serverId,
      filename: yData.filename,
      fileType: yData.fileType || this._extractFileType(yData.filename),
      hash: yData.hash,
      userId: yData.userId,
      storageKey: yData.storageKey,
      publicPath: yData.publicPath,
      fileStatus: yData.publicPath ? "on-server" : "needs-fetch",
      metadata: yData.metadata || {},
    });

    // Add to in-memory map
    this._datasets.set(dataset.id, dataset);

    // Persist to IndexedDB
    await this._persistDataset(dataset);

    // Emit event (but don't sync back to Y.js - it came FROM Y.js)
    this._emit("datasetAdded", dataset);

    log.info(`Dataset from Y.js added: ${dataset.filename}`);

    return dataset;
  }

  /**
   * Sync dataset metadata to Y.js so other clients can see it
   * This should only be called after Y.js is connected
   */
  _syncDatasetMetadataToYjs(dataset) {
    // Use direct import instead of global variable
    // This ensures we get the ydoc as soon as the module is loaded
    if (!ydoc) {
      log.error(
        `Cannot sync dataset ${dataset.filename}: Y.js not initialized`
      );
      return;
    }

    const yDatasets = ydoc.getMap("datasets");

    // Only sync the metadata needed for fetching, not the entire dataset
    yDatasets.set(dataset.id, {
      id: dataset.id,
      serverId: dataset.serverId,
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

    log.info(`Dataset metadata synced to Y.js: ${dataset.filename}`);
  }

  // ==================== DATASET MANAGEMENT ====================

  /**
   * Add a new dataset from a file (v2.0 SERVER-AUTHORITATIVE)
   *
   * This is the primary entry point for creating datasets. The flow uploads
   * to the server first to get a server-generated ID, ensuring consistency.
   *
   * The flow:
   * 1. Extract file type from filename
   * 2. Validate it's a supported type (optional but recommended)
   * 3. Upload to server to get server-generated ID
   * 4. Store file locally for immediate use
   * 5. Create Dataset object with server-provided ID
   * 6. Persist everything
   *
   * @param {File} file - The file object from user input
   * @param {string} userId - ID of the user adding this dataset
   * @param {object} options - Optional: { projectId, orgId }
   * @returns {Promise<Dataset>} - The created dataset
   */
  async addDataset(file, userId, options = {}) {
    log.info(`DatasetManager: Adding dataset "${file.name}"`);

    try {
      // STEP 1: Extract file type from filename
      const fileType = this._extractFileType(file.name);
      log.info(`File type: ${fileType}`);

      // STEP 2: Validate file type is supported (optional but helpful)
      const isSupported = await this._isFileTypeSupported(fileType);
      if (!isSupported) {
        log.warn(
          `Warning: File type "${fileType}" may not be supported`
        );
      }

      // STEP 3: Generate hash for duplicate detection
      const hash = await this.generateFileHash(file);
      log.info(`Hash: ${hash.substring(0, 16)}...`);

      // STEP 4: Check for existing dataset with same hash locally
      const existingLocal = await this.findDatasetByHash(hash);
      if (existingLocal) {
        log.info(
          `Found existing local dataset with same hash: ${existingLocal.id}`
        );
        // Update with new file reference
        existingLocal.rawFile = file;
        existingLocal.setFileStatus("available", file);
        this._emit("datasetUpdated", existingLocal);
        return existingLocal;
      }

      // STEP 5: Upload to server to get server-generated ID
      log.info(`Uploading to server...`);
      const serverResponse = await this._uploadFileToServer(file, options);

      if (!serverResponse || !serverResponse.file || !serverResponse.file.id) {
        throw new Error("Server did not return a valid file ID");
      }

      const serverFile = serverResponse.file;
      log.info(`Server assigned ID: ${serverFile.id}`);

      // STEP 6: Store file locally for immediate use
      const storageResult = await this.storageProvider.storeFile(file);
      log.info(`File stored locally`);

      // STEP 7: Create the Dataset object with server-provided ID
      const dataset = new Dataset({
        id: serverFile.id, // SERVER-PROVIDED ID
        serverId: serverFile.id,
        filename: file.name,
        fileType: serverFile.file_type || fileType,
        hash: serverFile.hash || hash,
        storageKey: serverFile.storage_key || storageResult || hash,
        publicPath: `${config.apiBaseUrl}/files/${serverFile.id}/download`,
        userId: userId,
        rawFile: file, // Keep reference for immediate use
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: serverFile.uploaded_at || Date.now(),
        },
      });

      // STEP 8: Store in memory
      this._datasets.set(dataset.id, dataset);

      // STEP 9: Persist to IndexedDB
      await this._persistDataset(dataset);

      // STEP 10: Sync to Y.js (for presence/awareness, not state)
      this._syncDatasetMetadataToYjs(dataset);

      // STEP 11: Notify listeners
      this._emit("datasetAdded", dataset);

      log.info(
        `✅ DatasetManager: Dataset "${file.name}" added with ID ${dataset.id}`
      );
      log.info(`File type: ${fileType}`);

      return dataset;
    } catch (error) {
      log.error("DatasetManager: Failed to add dataset:", error);
      throw error;
    }
  }

  /**
   * Upload file to server API
   * @private
   * @param {File} file - The file to upload
   * @param {object} options - { projectId, orgId }
   * @returns {Promise<object>} Server response with file metadata including ID
   */
  async _uploadFileToServer(file, options = {}) {
    const formData = new FormData();
    formData.append("file", file);

    if (options.projectId) {
      formData.append("projectId", options.projectId);
    }
    if (options.orgId) {
      formData.append("orgId", options.orgId);
    }

    const response = await fetch(`${config.apiBaseUrl}/files`, {
      method: "POST",
      body: formData,
      // Note: Don't set Content-Type header - browser sets it with boundary for FormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle duplicate file case
      if (response.status === 409 && errorData.existingFile) {
        log.info(
          `Server found duplicate: ${errorData.existingFile.id}`
        );
        // Return the existing file info as if it was just uploaded
        return {
          success: true,
          file: errorData.existingFile,
          duplicate: true,
        };
      }

      throw new Error(
        errorData.message ||
          errorData.error ||
          `Upload failed: ${response.status}`
      );
    }

    return await response.json();
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
    log.info(`DatasetManager: Removing dataset ${datasetId}`);

    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      log.warn(`DatasetManager: Dataset ${datasetId} not found`);
      return;
    }

    try {
      this._datasets.delete(datasetId);
      await this._deleteDataset(datasetId);
      this._emit("datasetRemoved", datasetId);
      log.info(`DatasetManager: Dataset ${datasetId} removed`);
    } catch (error) {
      log.error("DatasetManager: Failed to remove dataset:", error);
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
   * Load a dataset file (v2.0 SERVER-AUTHORITATIVE)
   *
   * This is the bridge method that handles the complete loading workflow.
   * For new files, it uploads to server first to get a server-generated ID.
   *
   * @param {File} file - The file to load
   * @param {string} publicPath - Optional public URL for sample files
   * @param {object} options - { serverId, serverMetadata, userId, projectId, orgId }
   * @returns {Promise<string>} - The dataset ID
   */
  async loadDataset(file, publicPath = null, options = {}) {
    log.info(`DatasetManager: Loading dataset "${file.name}"`);

    // Extract options
    const {
      serverId = null,
      serverMetadata = null,
      projectId,
      orgId,
    } = options;
    let userId = options.userId || null;

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
      log.info(`File type: ${fileType}`);

      // STEP 2: Calculate hash
      const hash = await this.generateFileHash(file);
      log.info(`Hash: ${hash.substring(0, 16)}...`);

      // STEP 3: Check if we already have this dataset metadata
      const existing = await this.findDatasetByHash(hash);

      if (existing) {
        log.info(`Found existing dataset: ${existing.id}`);

        // CRITICAL: Even though we have metadata, we might not have the file!
        // Store the file so it's available for visualization
        log.info(`Updating file data for existing dataset...`);

        // Store the file in cache
        try {
          const storageResult = await this.storageProvider.storeFile(file);
          log.info(`File stored successfully`);

          // Update the dataset object with the new file reference
          existing.rawFile = file;
          existing.setFileStatus("available", file);

          // Update serverId if provided (linking local dataset to server)
          if (serverId && !existing.serverId) {
            existing.serverId = serverId;
          }

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

          log.info(
            `DatasetManager: Existing dataset updated with new file`
          );
          log.info(`ID: ${existing.id}`);

          return existing.id;
        } catch (storageError) {
          log.error(`Failed to store file:`, storageError);
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

      // STEP 5: Determine dataset ID
      // If serverId provided (from server sync), use it
      // Otherwise, upload to server to get a new ID
      let datasetId = serverId;
      let serverFile = null;

      if (!datasetId) {
        // Upload to server to get server-generated ID
        log.info(`Uploading to server...`);
        const serverResponse = await this._uploadFileToServer(file, {
          projectId,
          orgId,
        });

        if (
          !serverResponse ||
          !serverResponse.file ||
          !serverResponse.file.id
        ) {
          throw new Error("Server did not return a valid file ID");
        }

        serverFile = serverResponse.file;
        datasetId = serverFile.id;
        log.info(`Server assigned ID: ${datasetId}`);
      }

      // STEP 6: Store the raw file locally
      const storageResult = await this.storageProvider.storeFile(file);

      // STEP 7: Create dataset metadata with server-provided ID
      const dataset = new Dataset({
        id: datasetId, // SERVER-PROVIDED ID
        serverId: datasetId,
        filename: file.name,
        fileType: serverFile?.file_type || fileType,
        hash: serverFile?.hash || hash,
        publicPath:
          publicPath || `${config.apiBaseUrl}/files/${datasetId}/download`,
        storageKey: serverFile?.storage_key || storageResult || hash,
        userId: userId,
        rawFile: file, // Keep reference for immediate use
        metadata: {
          fileSize: file.size,
          uploadedBy: userId,
          uploadedAt: serverFile?.uploaded_at || Date.now(),
          ...serverMetadata,
        },
      });

      // STEP 8: Try to extract quick metadata (optional, non-blocking)
      try {
        const quickMetadata = await this.extractQuickMetadataUsingHandlers(
          file,
          fileType
        );
        if (quickMetadata) {
          dataset.quickMetadata = quickMetadata;
          dataset.updateMetadata(quickMetadata);
          log.info(`Quick metadata extracted`);
        }
      } catch (error) {
        log.warn(`Could not extract quick metadata:`, error.message);
      }

      // STEP 9: Store and sync
      this._datasets.set(dataset.id, dataset);
      await this._persistDataset(dataset);
      this._syncDatasetMetadataToYjs(dataset);

      // STEP 10: Notify listeners
      this._emit("datasetAdded", dataset);

      // STEP 11: Emit datasetLoaded event
      this._emit("datasetLoaded", {
        datasetId: dataset.id,
        dataset: dataset,
      });

      log.info(`DatasetManager: Dataset "${file.name}" ready`);
      log.info(`ID: ${dataset.id}`);
      log.info(`Type: ${fileType}`);

      return dataset.id;
    } catch (error) {
      log.error(
        `DatasetManager: Failed to load dataset "${file.name}":`,
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
        log.info(
          `Using ${handler.getDisplayName()} to extract metadata`
        );
        try {
          const metadata = await handler.extractMetadata(file, fileType);
          if (metadata) return metadata;
        } catch (error) {
          log.warn(
            `Handler failed to extract metadata:`,
            error.message
          );
        }
      }
    }

    log.info(
      `No handler available for ${fileType} metadata extraction`
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

  /**
   * Load raw file for a dataset (TYPE-AGNOSTIC)
   *
   * This is a convenience method that:
   * 1. Gets the raw file from memory if available
   * 2. Fetches it if needed (for sample files with publicPath)
   * 3. Returns the raw File object for the handler to parse
   *
   * IMPORTANT: This method is TYPE-AGNOSTIC!
   * - It does NOT parse the file - that's the handler's job
   * - VTK handler parses .vtp files
   * - Plot handler parses .csv files
   * - Image handler parses .png files
   * - Each handler knows how to parse its own formats
   *
   * This method only handles file retrieval and fetching, not parsing.
   *
   * @param {string} datasetId - Dataset ID to load
   * @returns {Promise<File>} The raw file object (unparsed)
   * @throws {Error} If dataset not found or file unavailable
   */
  async loadFile(datasetId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Check if we already have the file in memory
    let rawFile = dataset.rawFile;

    // If we don't have it, try to fetch it
    if (!rawFile) {
      log.info(
        `File not in memory for ${dataset.filename}, attempting fetch...`
      );

      // If dataset has a public path, we can fetch it
      if (dataset.publicPath) {
        log.info(`Fetching from: ${dataset.publicPath}`);

        try {
          // Update status to show we're fetching
          dataset.setFileStatus("fetching");
          this._emit("datasetUpdated", dataset);

          const response = await fetch(dataset.publicPath);

          if (!response.ok) {
            throw new Error(
              `Failed to fetch ${dataset.filename}: ${response.status} ${response.statusText}`
            );
          }

          const blob = await response.blob();
          rawFile = new File([blob], dataset.filename, {
            type: "application/octet-stream",
          });

          // Store it back in the dataset for future use
          dataset.setFileStatus("available", rawFile);

          // Only cache if this file doesn't already have a cacheKey from the server
          // Files loaded from the database already have a cacheKey and don't need re-uploading
          if (!dataset.cacheKey) {
            try {
              const serverId = await this.storageProvider.storeFile(rawFile);
              log.info(`File fetched and cached successfully`);

              // CRITICAL: Update the dataset with the server ID so downloads work
              if (serverId) {
                dataset.serverId = serverId;
                dataset.cacheKey = serverId;

                // Persist the update so it survives page reload
                await this._persistDataset(dataset);

                // Sync to Y.js so other clients get the correct server ID
                this._syncDatasetMetadataToYjs(dataset);
              }
            } catch (cacheError) {
              log.warn(`File fetched but caching failed:`, cacheError);
              // Continue anyway - we have the file in memory
            }
          } else {
            log.info(
              `File already has server cacheKey, skipping upload`
            );
          }

          // Notify that dataset was updated
          this._emit("datasetUpdated", dataset);
        } catch (fetchError) {
          dataset.setFileStatus("fetch-failed");
          this._emit("datasetUpdated", dataset);

          throw new Error(
            `Failed to fetch ${dataset.filename} from ${dataset.publicPath}: ${fetchError.message}`
          );
        }
      } else {
        // No public path - mark as needing upload
        dataset.setFileStatus("needs-upload");
        this._emit("datasetUpdated", dataset);

        throw new Error(
          `Dataset ${dataset.filename} is not available. ` +
            `The file was loaded in a previous session and is no longer in cache. ` +
            `Please re-upload this file to visualize it.`
        );
      }
    }

    if (!rawFile) {
      throw new Error(`Failed to obtain file for ${dataset.filename}`);
    }

    log.info(`loadPolydata: File ready for ${dataset.filename}`);
    return rawFile;
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

    log.info(
      `Cached parsed data for ${datasetId} (handler: ${handlerType})`
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
      log.warn("Could not validate file type support:", error);
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
          log.warn("Failed to persist fileType update:", err);
        });
      } catch (error) {
        log.warn(
          `Could not extract file type for ${dataset.filename}:`,
          error
        );
        return null;
      }
    }

    return dataset.fileType;
  }

  // ==================== ANNOTATION MANAGEMENT ====================

  /**
   * Add an annotation to a dataset (v2.0 SERVER-AUTHORITATIVE)
   *
   * Creates annotation on server first to get server-generated ID,
   * then creates local Annotation object with that ID.
   *
   * @param {string} datasetId - The dataset to annotate
   * @param {object} annotationConfig - Annotation configuration
   * @param {string} userId - User creating the annotation
   * @param {object} options - { projectId }
   * @returns {Promise<Annotation>} The created annotation
   */
  async addAnnotation(datasetId, annotationConfig, userId, options = {}) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Create annotation on server first to get ID
    log.info(`DatasetManager: Creating annotation on server...`);
    const serverAnnotation = await this._createAnnotationOnServer(
      datasetId,
      annotationConfig,
      options
    );

    if (!serverAnnotation || !serverAnnotation.id) {
      throw new Error("Server did not return a valid annotation ID");
    }

    log.info(`Server assigned annotation ID: ${serverAnnotation.id}`);

    // Create local Annotation with server-provided ID
    const annotation = new Annotation({
      id: serverAnnotation.id, // SERVER-PROVIDED ID
      ...annotationConfig,
      datasetId,
      createdBy: userId,
      createdAt: serverAnnotation.created_at || Date.now(),
    });

    dataset.addAnnotation(annotation);
    await this._persistDataset(dataset);
    this._emit("annotationAdded", { datasetId, annotation });

    log.info(
      `DatasetManager: Added annotation ${annotation.id} to dataset ${datasetId}`
    );
    return annotation;
  }

  /**
   * Create annotation on server API
   * @private
   * @param {string} fileId - The dataset/file ID
   * @param {object} annotationConfig - Annotation configuration
   * @param {object} options - { projectId }
   * @returns {Promise<object>} Server response with annotation including ID
   */
  async _createAnnotationOnServer(fileId, annotationConfig, options = {}) {
    const response = await fetch(`${config.apiBaseUrl}/annotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        projectId: options.projectId,
        type: annotationConfig.type || "point",
        coordinates: annotationConfig.position ||
          annotationConfig.coordinates || [0, 0, 0],
        position: annotationConfig.position,
        normal: annotationConfig.normal,
        text: annotationConfig.text,
        properties: annotationConfig.metadata,
        metadata: annotationConfig.metadata,
        visibility: annotationConfig.visibility || "public",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          errorData.error ||
          `Failed to create annotation: ${response.status}`
      );
    }

    const result = await response.json();
    return result.annotation;
  }

  async removeAnnotation(datasetId, annotationId) {
    const dataset = this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const removed = dataset.removeAnnotation(annotationId);
    if (!removed) {
      log.warn(`DatasetManager: Annotation ${annotationId} not found`);
      return;
    }

    await this._persistDataset(dataset);
    this._emit("annotationRemoved", { datasetId, annotationId });
    log.info(
      `DatasetManager: Removed annotation ${annotationId} from dataset ${datasetId}`
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
    log.info(`DatasetManager: Updated annotation ${annotationId}`);
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
      log.error("Cannot persist dataset without ID:", dataset);
      throw new Error(
        `Dataset ${dataset.filename} is missing required 'id' field`
      );
    }

    const transaction = this._db.transaction(["datasets"], "readwrite");
    const store = transaction.objectStore("datasets");
    const data = dataset.toJSON();

    // Double-check the JSON has the id
    if (!data.id) {
      log.error("Dataset.toJSON() did not include 'id':", data);
      throw new Error(
        `Dataset ${dataset.filename} toJSON() missing 'id' field`
      );
    }

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        log.error("IndexedDB put failed:", request.error);
        log.error("Dataset:", data);
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
      log.warn(`DatasetManager: Unknown event "${event}"`);
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
        log.error(
          `DatasetManager: Error in event listener for "${event}":`,
          error
        );
      }
    });
  }

  // ==================== CLEANUP ====================

  async cleanup() {
    log.info("DatasetManager: Cleaning up...");
    this._datasets.clear();
    if (this._db) {
      this._db.close();
      this._db = null;
    }
    log.info("DatasetManager: Cleanup complete");
  }

  async clearCorruptedData() {
    log.info("Clearing potentially corrupted IndexedDB data...");

    try {
      const transaction = this._db.transaction(["datasets"], "readwrite");
      const store = transaction.objectStore("datasets");

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          log.info("IndexedDB cleared successfully");
          log.info("Please refresh the page to start fresh");
          resolve();
        };
        request.onerror = () => {
          log.error("Failed to clear IndexedDB:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      log.error("Error clearing IndexedDB:", error);
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
 *   log.info('New dataset added:', dataset.filename);
 *   // Update UI to show the new dataset
 * });
 *
 * datasetManager.on('annotationAdded', ({ datasetId, annotation }) => {
 *   log.info('New annotation on dataset:', datasetId);
 *   // Trigger re-render if this dataset is currently visible
 * });
 */
