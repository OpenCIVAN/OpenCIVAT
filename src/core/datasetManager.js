import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import { yDatasets } from '../collaboration/yjsSetup.js';
import { getUserId, getUserName } from '../collaboration/userManagement.js';

class DatasetManager {
  constructor() {
    this.datasets = new Map();
    this.loadingDatasets = new Set();
    this.listeners = [];
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Listen for Y.js changes
    yDatasets.observe((event) => {
      console.log('📦 yDatasets observe triggered');
      setTimeout(() => {
        this._syncFromYjs();
        this._notifyListeners();
      }, 100); // Small delay to batch changes
    });

    // Initial sync
    this._syncFromYjs();

    console.log('📦 Dataset manager initialized');
  }

  /**
   * Check if dataset with this filename already exists
   */
findDatasetByFilename(filename) {
  let found = null;
  yDatasets.forEach((metadata, id) => {
    if (metadata.filename === filename) {
      // Return the first one we find (prefer ones with publicPath)
      if (!found || (metadata.publicPath && !found.publicPath)) {
        found = { id, ...metadata };
      }
    }
  });
  return found;
}

  async loadDataset(file, publicPath = null) {
    console.log('📂 Loading dataset:', file.name);

    // Check if this file is already loaded
    const existing = this.findDatasetByFilename(file.name);
    if (existing) {
      console.log('⚠️ Dataset already exists:', file.name);
      return existing.id;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsArrayBuffer(arrayBuffer);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error('Failed to parse VTP file');
      }

      const id = `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store locally
      this.datasets.set(id, {
        id,
        filename: file.name,
        polydata,
        metadata: {
          points: polydata.getPoints() ? polydata.getPoints().getNumberOfValues() / 3 : 0,
          cells: polydata.getNumberOfCells(),
          fileSize: file.size
        }
      });

      // Sync to Y.js (this triggers observe in ALL connected clients)
      yDatasets.set(id, {
        id,
        filename: file.name,
        uploadedBy: getUserId(),
        uploadedByName: getUserName(),
        uploadedAt: Date.now(),
        publicPath: publicPath,
        metadata: {
          points: polydata.getPoints() ? polydata.getPoints().getNumberOfValues() / 3 : 0,
          cells: polydata.getNumberOfCells(),
          fileSize: file.size
        }
      });

      console.log(`✅ Dataset loaded and synced: ${file.name} (${id})`);
      this._notifyListeners();
      
      return id;

    } catch (error) {
      console.error('❌ Failed to load dataset:', error);
      throw error;
    }
  }

  getDataset(id) {
    return this.datasets.get(id);
  }

  getAllDatasets() {
    const datasets = [];
    yDatasets.forEach((metadata, id) => {
      const local = this.datasets.get(id);
      datasets.push({
        id,
        ...metadata,
        hasPolydata: !!local?.polydata,
        isLoading: this.loadingDatasets.has(id)
      });
    });
    return datasets;
  }

  removeDataset(id) {
    this.datasets.delete(id);
    yDatasets.delete(id);
    this._notifyListeners();
    console.log(`🗑️ Dataset removed: ${id}`);
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('Error in dataset listener:', error);
      }
    });
  }

  async _syncFromYjs() {
    console.log('🔄 Syncing from Y.js, datasets count:', yDatasets.size);
    
    yDatasets.forEach((metadata, id) => {
      // Skip if we already have it
      if (this.datasets.has(id)) {
        return;
      }
      
      // Skip if already loading
      if (this.loadingDatasets.has(id)) {
        return;
      }

      console.log(`📦 New dataset discovered: ${metadata.filename} (by ${metadata.uploadedByName})`);

      // If it has a public path, auto-load it
      if (metadata.publicPath) {
        console.log(`🔄 Will auto-load: ${metadata.publicPath}`);
        this._loadFromPublicPath(id, metadata.publicPath, metadata.filename);
      } else {
        console.log(`ℹ️ Non-public file: ${metadata.filename}`);
        this.datasets.set(id, {
          id,
          filename: metadata.filename,
          polydata: null,
          metadata: metadata.metadata
        });
      }
    });
  }

  async _loadFromPublicPath(id, path, filename) {
    if (this.loadingDatasets.has(id)) return;
    
    this.loadingDatasets.add(id);
    this._notifyListeners();
    
    try {
      console.log(`📥 Fetching: ${path}`);
      
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsArrayBuffer(arrayBuffer);
      const polydata = reader.getOutputData();

      if (!polydata) {
        throw new Error('Failed to parse VTP');
      }

      this.datasets.set(id, {
        id,
        filename,
        polydata,
        metadata: {
          points: polydata.getPoints() ? polydata.getPoints().getNumberOfValues() / 3 : 0,
          cells: polydata.getNumberOfCells()
        }
      });
      
      console.log(`✅ Auto-loaded: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to auto-load ${path}:`, error);
      this.datasets.set(id, {
        id,
        filename,
        polydata: null
      });
    } finally {
      this.loadingDatasets.delete(id);
      this._notifyListeners();
    }
  }
}

export const datasetManager = new DatasetManager();