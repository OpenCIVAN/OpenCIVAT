// src/core/data/providers/ServerStorageProvider.js

/**
 * ServerStorageProvider
 *
 * This acts as a "cache" adapter for DatasetManager, but instead of storing
 * files in IndexedDB, it uploads them to the server and retrieves them from
 * the server when needed.
 *
 * From DatasetManager's perspective, this looks identical to DatasetManagerAdapter.
 * Both implement the same interface: storeFile(), getFile(), removeFile(), etc.
 *
 * This is the ADAPTER PATTERN - making the server API look like a local cache
 * so existing code doesn't need to change.
 */
export class ServerStorageProvider {
  constructor(apiBaseUrl, sessionId) {
    // Validate required parameters
    if (!apiBaseUrl) {
      throw new Error("ServerStorageProvider requires apiBaseUrl parameter");
    }
    if (!sessionId) {
      throw new Error("ServerStorageProvider requires sessionId parameter");
    }

    this.apiBaseUrl = apiBaseUrl; // e.g., 'http://localhost:3001'
    this.sessionId = sessionId; // Current collaboration session

    // Track uploaded datasets in memory for quick lookups
    // Maps hash -> datasetId
    this._hashToId = new Map();

    // Track dataset metadata
    // Maps datasetId -> { filename, hash, size, etc. }
    this._metadata = new Map();

    console.log("📡 ServerStorageProvider: Created");
  }

  /**
   * Initialize the provider
   * This could load existing datasets from the server to populate our cache
   */
  async initialize() {
    console.log("📡 ServerStorageProvider: Initializing...");

    try {
      // Load existing datasets for this session
      const datasets = await this.listDatasets();

      // Populate our hash registry
      for (const dataset of datasets) {
        if (dataset.metadata?.hash) {
          this._hashToId.set(dataset.metadata.hash, dataset.id);
        }
        this._metadata.set(dataset.id, dataset);
      }

      console.log(
        `✅ ServerStorageProvider: Loaded ${datasets.length} existing datasets`
      );
    } catch (error) {
      console.error("❌ ServerStorageProvider: Initialization failed:", error);

      // Re-throw so the fallback logic in initializeStorageProvider can catch it
      throw new Error(`Failed to initialize server storage: ${error.message}`);
    }
  }

  /**
   * Store a file by uploading to the server
   *
   * This matches the interface that DatasetManager expects from the cache adapter.
   * Returns a "cache key" which is actually the server's dataset ID.
   *
   * @param {File} file - The file to store
   * @returns {Promise<string>} - Dataset ID (used as cache key)
   */
  async storeFile(file) {
    console.log(`📡 ServerStorageProvider: Uploading file "${file.name}"`);

    try {
      // First, calculate hash to check if we already have this file
      const hash = await this.calculateHash(file);

      // Check if we already uploaded this file (deduplication)
      if (this._hashToId.has(hash)) {
        const existingId = this._hashToId.get(hash);
        console.log(`  ✓ File already exists with ID ${existingId}`);
        return existingId;
      }

      // Prepare upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadedBy", this._getCurrentUser());

      // Upload to server
      const response = await fetch(`${this.apiBaseUrl}/api/datasets/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const { dataset } = await response.json();

      // Store the hash-to-id mapping for deduplication
      this._hashToId.set(hash, dataset.id);

      // Store metadata
      this._metadata.set(dataset.id, {
        ...dataset,
        metadata: {
          ...dataset.metadata,
          hash, // Add the hash we calculated
        },
      });

      console.log(
        `✅ ServerStorageProvider: File uploaded with ID ${dataset.id}`
      );

      // Return the dataset ID - this becomes the "cache key" in Dataset objects
      return dataset.id;
    } catch (error) {
      console.error("❌ ServerStorageProvider: Upload failed:", error);
      throw error;
    }
  }

  /**
   * Retrieve a file from the server
   *
   * @param {string} cacheKey - Dataset ID from storeFile()
   * @returns {Promise<File>} - The file object
   */
  async getFile(cacheKey) {
    console.log(`📡 ServerStorageProvider: Downloading file ${cacheKey}`);

    try {
      // Download from server
      const response = await fetch(
        `${this.apiBaseUrl}/api/datasets/${cacheKey}/download`
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ ServerStorageProvider: File not found: ${cacheKey}`);
          return null;
        }
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the file data as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // Get metadata to reconstruct the filename
      const metadata = this._metadata.get(cacheKey);
      const filename = metadata?.filename || "downloaded.vtp";

      // Convert to File object
      const blob = new Blob([arrayBuffer]);
      const file = new File([blob], filename, {
        type: "application/octet-stream",
        lastModified: metadata?.uploaded_at
          ? new Date(metadata.uploaded_at).getTime()
          : Date.now(),
      });

      console.log(`✅ ServerStorageProvider: File downloaded: "${filename}"`);

      return file;
    } catch (error) {
      console.error("❌ ServerStorageProvider: Download failed:", error);
      throw error;
    }
  }

  /**
   * Check if a file exists on the server
   *
   * @param {string} cacheKey - Dataset ID
   * @returns {Promise<boolean>}
   */
  async hasFile(cacheKey) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/datasets/${cacheKey}`,
        { method: "HEAD" } // HEAD request just checks if resource exists
      );
      return response.ok;
    } catch (error) {
      console.error(
        "❌ ServerStorageProvider: Error checking file existence:",
        error
      );
      return false;
    }
  }

  /**
   * Remove a file from the server
   *
   * @param {string} cacheKey - Dataset ID
   * @returns {Promise<boolean>}
   */
  async removeFile(cacheKey) {
    console.log(`📡 ServerStorageProvider: Removing file ${cacheKey}`);

    try {
      // Find and remove hash mapping
      for (const [hash, id] of this._hashToId.entries()) {
        if (id === cacheKey) {
          this._hashToId.delete(hash);
          break;
        }
      }

      // Remove metadata
      this._metadata.delete(cacheKey);

      // Note: We're not implementing server deletion yet
      // In the future, this would call DELETE /api/datasets/:id
      // For now, files stay on server (which is safer during development)

      console.log(`✅ ServerStorageProvider: File removed from local tracking`);

      return true;
    } catch (error) {
      console.error("❌ ServerStorageProvider: Removal failed:", error);
      return false;
    }
  }

  /**
   * Calculate hash for a file
   * Uses SHA-256 just like your dataCache
   *
   * @param {File} file
   * @returns {Promise<string>} - Hash string
   */
  async calculateHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * List all available datasets from server
   * @returns {Promise<Array>} Array of dataset metadata
   */
  async listDatasets() {
    console.log("📡 ServerStorageProvider: Listing datasets from server");

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/sessions/${this.sessionId}/datasets`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const datasets = await response.json();
      console.log(`   ✓ Retrieved ${datasets.length} datasets from server`);

      return datasets;
    } catch (error) {
      console.error(
        "❌ ServerStorageProvider: Failed to list datasets:",
        error
      );
      throw error;
    }
  }

  /**
   * Get statistics about stored files
   *
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const datasets = await this.listDatasets();

      return {
        count: datasets.length,
        totalSize: datasets.reduce((sum, ds) => sum + (ds.file_size || 0), 0),
        files: datasets.map((ds) => ({
          id: ds.id.substring(0, 16) + "...",
          name: ds.filename,
          size: ds.file_size,
          uploaded: new Date(ds.uploaded_at).toLocaleString(),
        })),
      };
    } catch (error) {
      console.error("❌ ServerStorageProvider: Failed to get stats:", error);
      return {
        count: 0,
        totalSize: 0,
        files: [],
      };
    }
  }

  /**
   * Helper to get current user ID
   * @private
   */
  _getCurrentUser() {
    // This would integrate with your user management system
    // For now, return a placeholder
    return "anonymous";
  }

  /**
   * Clear all datasets (for development/testing)
   * WARNING: Destructive!
   */
  async clearAll() {
    console.warn(
      "📡 ServerStorageProvider: Clear operation not implemented on server"
    );
    console.warn("   Clearing local tracking only");

    this._hashToId.clear();
    this._metadata.clear();

    return true;
  }
}
