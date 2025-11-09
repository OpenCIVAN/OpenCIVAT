// src/core/datasetManager.js
// Enhanced version with proper public file fetching for sample datasets

import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";

import {
  getUserId,
  getUserName,
} from "@Collaboration/presence/userManagement.js";
import { yDatasets, syncDatasetToYjs } from "@Collaboration/yjs/yjsSetup.js";
import { dataCache } from "@Services/storage/dataCache.js";
import { useDatasetStore } from "@UI/react/store/datasetStore.js";
import { generateDatasetId } from "@Utils/idGenerator.js";

/**
 * Singleton instance of DatasetManager used throughout the application to
 * create, load, cache, and manage datasets and their metadata.
 *
 * This exported constant provides a single shared API surface for:
 *  - registering and unregistering datasets
 *  - loading datasets from local or remote sources
 *  - accessing dataset metadata and cached content
 *  - emitting/handling dataset lifecycle events
 *
 * Use this instance instead of creating new DatasetManager instances to
 * maintain a consistent, centralized dataset state across modules.
 *
 * @constant
 * @type {DatasetManager}
 * @name datasetManager
 * @memberof module:core/datasetManager
 */
class DatasetManager {
  constructor() {
    this.datasets = new Map(); // Local polydata cache
    this.loadingDatasets = new Map(); // Track loading with more detail: datasetId → { started, stage }
    this.listeners = [];
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;
    console.log("📦 Dataset manager initialized");
  }

  // Helper to update loading state and notify listeners
  _setLoadingState(datasetId, stage) {
    if (stage) {
      this.loadingDatasets.set(datasetId, {
        started: Date.now(),
        stage: stage, // "fetching", "parsing", "caching", "syncing"
      });
    } else {
      this.loadingDatasets.delete(datasetId);
    }
    this._notifyListeners(); // Notify immediately so UI updates
  }

  /**
   * Check if dataset with this filename already exists
   */
  findDatasetByFilename(filename) {
    const allDatasets = useDatasetStore.getState().getAllDatasets();
    return allDatasets.find((ds) => ds.name === filename);
  }

  /**
   * Check if dataset with this hash already exists
   */
  findDatasetByHash(hash) {
    const allDatasets = useDatasetStore.getState().getAllDatasets();
    return allDatasets.find((ds) => ds.hash === hash);
  }

  /**
   * Load dataset from File object
   * @param {File} file - The VTP file to load
   * @param {string} publicPath - Optional public URL for sample files
   */
  async loadDataset(file, publicPath = null) {
    const startTime = Date.now();
    let datasetId = null;
    console.log("📂 ========================================");
    console.log(`📂 Loading dataset: ${file.name}`);
    console.log(`📂 File size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`📂 Public path: ${publicPath || "none (user upload)"}`);
    console.log("📂 ========================================");

    try {
      // Step 1: Calculate hash first (for deduplication)
      console.log(`  ⏳ [${Date.now() - startTime}ms] Calculating hash...`);
      const hash = await dataCache.hashFile(file);
      console.log(
        `  ✅ [${Date.now() - startTime}ms] Hash: ${hash.substring(0, 16)}...`
      );

      // Step 2: Check for duplicates by hash
      const existingByHash = this.findDatasetByHash(hash);
      if (existingByHash) {
        datasetId = existingByHash.id;
        console.log(`  ⚠️  File already exists with this hash!`);
        console.log(`     Existing ID: ${datasetId}`);
        console.log(`     Existing name: ${existingByHash.name}`);

        // Make sure we have the polydata loaded
        let dataset = this.datasets.get(existingByHash.id);

        // If we already have polydata, we're done
        if (this.datasets.get(datasetId)?.polydata) {
          console.log(`✅ Dataset already loaded: ${existingByHash.name}`);
          return datasetId;
        }

        // Otherwise, load the polydata
        this._setLoadingState(datasetId, "loading existing");
        await this.loadPolydataFromCache(datasetId);
        this._setLoadingState(datasetId, null);
        return datasetId;
      }

      // Step 3: Generate new ID and start loading
      datasetId = generateDatasetId();
      console.log(
        `  ✅ [${Date.now() - startTime}ms] Generated ID: ${datasetId}`
      );
      this._setLoadingState(datasetId, "parsing");

      // Step 4: Parse VTP
      console.log(`  ⏳ [${Date.now() - startTime}ms] Parsing VTP file...`);
      const arrayBuffer = await file.arrayBuffer();
      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsArrayBuffer(arrayBuffer);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error("Failed to parse VTP file");
      }

      // If getPoints() is null or undefined, treat as 0 points
      const pointCount = polydata.getPoints()?.getNumberOfPoints() || 0;
      console.log(
        `  ✅ [${
          Date.now() - startTime
        }ms] VTP parsed: ${pointCount.toLocaleString()} points`
      );

      // Step 5: Store in IndexedDB (for local caching)
      this._setLoadingState(datasetId, "caching");
      console.log(`  ⏳ [${Date.now() - startTime}ms] Storing in IndexedDB...`);
      await dataCache.storeDataset(file);
      console.log(
        `  ✅ [${Date.now() - startTime}ms] Cached with hash: ${hash.substring(
          0,
          16
        )}...`
      );

      // Step 6: Create metadata
      const metadata = {
        id: datasetId,
        name: file.name,
        hash: hash,
        bounds: polydata.getBounds(),
        pointCount: pointCount,
        cellCount: polydata.getNumberOfCells(),
        sizeBytes: file.size,
        uploadedBy: getUserId(),
        uploadedByName: getUserName(),
        uploadedAt: Date.now(),
        publicPath: publicPath, // Critical for cross-browser sync!
        annotations: [],
      };
      console.log(`  ✅ [${Date.now() - startTime}ms] Metadata created`);

      // Step 7: Store polydata in memory FIRST before any syncing
      console.log(
        `  ⏳ [${Date.now() - startTime}ms] Storing polydata in memory...`
      );
      this.datasets.set(datasetId, {
        id: datasetId,
        name: file.name,
        polydata,
        metadata,
      });

      console.log(
        `  ✅ [${Date.now() - startTime}ms] Polydata stored in memory`
      );
      console.log(
        `  🔍 Verification: has dataset = ${this.datasets.has(datasetId)}`
      );
      console.log(
        `  🔍 Verification: has polydata = ${!!this.datasets.get(datasetId)
          ?.polydata}`
      );
      console.log(`  🔍 Verification: polydata points = ${pointCount}`);

      // Step 8: Add to Zustand store (metadata only)
      this._setLoadingState(datasetId, "syncing");
      console.log(
        `  ⏳ [${Date.now() - startTime}ms] Adding to Zustand store...`
      );
      useDatasetStore.getState().addDataset(datasetId, metadata);
      console.log(`  ✅ [${Date.now() - startTime}ms] Added to Zustand`);

      // Step 9: Sync to Y.js (metadata only)
      console.log(`  ⏳ [${Date.now() - startTime}ms] Syncing to Y.js...`);
      syncDatasetToYjs(datasetId, metadata);
      console.log(`  ✅ [${Date.now() - startTime}ms] Synced to Y.js`);

      // Clear loading state BEFORE notifying listeners
      this._setLoadingState(datasetId, null);

      // Step 10: Notify listeners
      console.log(`  ⏳ [${Date.now() - startTime}ms] Notifying listeners...`);
      this._notifyListeners();
      console.log(`  ✅ [${Date.now() - startTime}ms] Listeners notified`);

      console.log(
        `✅ Dataset loaded successfully: ${file.name} (${
          Date.now() - startTime
        }ms)`
      );
      return datasetId;
    } catch (error) {
      console.error("❌ Failed to load dataset:", error);
      // Clear loading state on error
      if (datasetId) {
        this._setLoadingState(datasetId, null);
      }
      throw error;
    }
  }

  /**
   * Load dataset polydata from cache or fetch from public URL
   * This is called when a remote user receives metadata via Y.js
   */
  async loadPolydataFromCache(datasetId) {
    // Check if already loaded
    const existing = this.datasets.get(datasetId);
    if (existing?.polydata) {
      console.log(`✅ Polydata already loaded for: ${datasetId}`);
      return existing.polydata;
    }

    // Prevent duplicate loading, check if already loaded
    if (this.loadingDatasets.has(datasetId)) {
      console.log(`⏳ Already loading dataset: ${datasetId}`);

      // Wait for it to finish with timeout
      const startWait = Date.now();
      const maxWait = 30000; // 30 seconds

      while (this.loadingDatasets.has(datasetId)) {
        if (Date.now() - startWait > maxWait) {
          console.error(`⏱️ Timeout waiting for dataset to load: ${datasetId}`);
          this._setLoadingState(datasetId, null); // Clear stuck loading state
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // After waiting, check if it loaded
      const loaded = this.datasets.get(datasetId);
      return existing?.polydata || null;
    }

    // Get metadata from Zustand
    const metadata = useDatasetStore.getState().getDataset(datasetId);
    if (!metadata) {
      console.warn(`⚠️  Dataset metadata not in Zustand: ${datasetId}`);
      return null;
    }

    if (!metadata.hash) {
      console.warn(`⚠️  Dataset missing hash: ${datasetId}`);
      return null;
    }

    // Start loading
    this._setLoadingState(datasetId, "fetching");
    console.log(`📥 Loading polydata from cache: ${metadata.name}`);
    console.log(`   Dataset ID: ${datasetId}`);
    console.log(`   Hash: ${metadata.hash.substring(0, 16)}...`);
    console.log(`   Public path: ${metadata.publicPath || "none"}`);

    try {
      // Try to load from local cache first
      let cached = await dataCache.getDataset(metadata.hash);

      // If not in cache but is a public file, fetch it
      if (!cached && metadata.publicPath) {
        console.log(
          `📥 File not in cache, fetching from: ${metadata.publicPath}`
        );
        this._setLoadingState(datasetId, "downloading");

        const response = await fetch(metadata.publicPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], metadata.name, {
          type: "application/octet-stream",
        });

        // Cache it
        this._setLoadingState(datasetId, "caching");
        await dataCache.storeDataset(file);

        // Now get it from cache
        cached = await dataCache.getDataset(metadata.hash);
      }

      if (!cached) {
        console.warn(`⚠️ File not available: ${metadata.name}`);
        this._setLoadingState(datasetId, null);
        return null;
      }

      // Parse the VTP data
      console.log(`📥 Parsing VTP data...`);
      this._setLoadingState(datasetId, "parsing");
      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsArrayBuffer(cached.data);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error("Failed to parse cached VTP");
      }

      // Store in memory
      this.datasets.set(datasetId, {
        id: datasetId,
        name: metadata.name,
        polydata,
        metadata,
      });

      const pointCount = polydata.getPoints()?.getNumberOfPoints() || 0;
      console.log(
        `📥 ✅ Polydata loaded: ${
          metadata.name
        } (${pointCount.toLocaleString()} points)`
      );

      // Clear loading state and notify
      this._setLoadingState(datasetId, null);

      return polydata;
    } catch (error) {
      console.error(`📥 ❌ Failed to load polydata from cache:`, error);
      this._setLoadingState(datasetId, null);
      return null;
    }
  }

  /**
   * Get dataset SYNCHRONOUSLY (only returns if already loaded)
   */
  getDatasetSync(datasetId) {
    const dataset = this.datasets.get(datasetId);

    if (!dataset) {
      console.warn(`⚠️  getDatasetSync(${datasetId}): NOT FOUND in local Map`);
      console.log(
        `   Available datasets in Map: ${
          Array.from(this.datasets.keys()).join(", ") || "none"
        }`
      );
    } else if (!dataset.polydata) {
      console.warn(`⚠️  getDatasetSync(${datasetId}): Found but NO POLYDATA`);
    } else {
      const pointCount = dataset.polydata.getPoints()?.getNumberOfPoints() || 0;
      console.log(
        `✅ getDatasetSync(${datasetId}): Found with polydata (${pointCount} points)`
      );
    }

    return dataset;
  }

  /**
   * Register a listener for dataset changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  /**
   * Get dataset ASYNCHRONOUSLY (loads from cache if needed)
   */
  async getDataset(datasetId) {
    // Try sync first
    const existing = this.datasets.get(datasetId);
    if (existing?.polydata) {
      return existing;
    }

    // Try to load from cache/public
    await this.loadPolydataFromCache(datasetId);
    return this.datasets.get(datasetId);
  }

  /**
   * Calculate bounds from polydata
   */
  _calculateBounds(polydata) {
    if (!polydata || !polydata.getPoints()) {
      return null;
    }
    const bounds = polydata.getBounds();
    return {
      xMin: bounds[0],
      xMax: bounds[1],
      yMin: bounds[2],
      yMax: bounds[3],
      zMin: bounds[4],
      zMax: bounds[5],
    };
  }

  /**
   * Get all datasets (metadata only)
   */
  getAllDatasets() {
    const datasets = useDatasetStore.getState().getAllDatasets();

    return datasets.map((metadata) => {
      const localDataset = this.datasets.get(metadata.id);
      const loadingInfo = this.loadingDatasets.get(metadata.id);

      return {
        id: metadata.id,
        filename: metadata.name || metadata.filename || "Unknown",
        name: metadata.name || metadata.filename || "Unknown",
        hash: metadata.hash,
        bounds: metadata.bounds,
        pointCount: metadata.pointCount,
        cellCount: metadata.cellCount,
        sizeBytes: metadata.sizeBytes,
        uploadedBy: metadata.uploadedBy,
        uploadedByName: metadata.uploadedByName,
        uploadedAt: metadata.uploadedAt,
        publicPath: metadata.publicPath,
        hasPolydata: !!localDataset?.polydata,
        isLoading: !!loadingInfo,
        loadingStage: loadingInfo?.stage || null,
      };
    });
  }

  /**
   * Remove dataset
   */
  removeDataset(datasetId) {
    this.datasets.delete(datasetId);
    useDatasetStore.getState().removeDataset(datasetId);
    yDatasets.delete(datasetId);
    this._notifyListeners();
    console.log(`🗑️ Dataset removed: ${datasetId}`);
  }

  /**
   * Listen for dataset changes
   */
  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  _notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in dataset listener:", error);
      }
    });
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId) {
    const dataset = this.datasets.get(datasetId);
    if (dataset) {
      this.datasets.delete(datasetId);
      this._notifyListeners();
    }

    // Also remove from Zustand and Y.js
    useDatasetStore.getState().removeDataset(datasetId);
    yDatasets.delete(datasetId);
  }

  /**
   * Get all loaded datasets
   */
  getAllDatasets() {
    return Array.from(this.datasets.values());
  }
}

export const datasetManager = new DatasetManager();
