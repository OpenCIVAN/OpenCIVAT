// src/streaming/dataStreamer.js

class DataStreamer {
  constructor() {
    this.streams = new Map();
    this.chunkSize = 1024 * 1024; // 1MB chunks
    this.cache = new LRUCache(100); // 100MB cache
  }

  // Progressive loading with Level-of-Detail (LoD)
  async streamDataset(datasetId, options = {}) {
    const stream = {
      id: datasetId,
      resolution: options.resolution || "auto",
      priority: options.priority || "balanced",
      chunks: new Map(),
      metadata: null,
    };

    // Load metadata first (small, fast)
    stream.metadata = await this.fetchMetadata(datasetId);

    // Start streaming based on viewport
    if (options.viewport) {
      await this.streamVisibleChunks(stream, options.viewport);
    } else {
      await this.streamProgressively(stream);
    }

    this.streams.set(datasetId, stream);
    return stream;
  }

  // Intelligent chunk prioritization
  async streamVisibleChunks(stream, viewport) {
    const chunks = this.calculateVisibleChunks(
      stream.metadata.bounds,
      viewport
    );

    // Sort by distance from camera
    chunks.sort((a, b) => a.distance - b.distance);

    // Stream nearest chunks first
    for (const chunk of chunks) {
      await this.loadChunk(stream, chunk.id, chunk.priority);
    }
  }

  // Adaptive quality based on network/device
  adjustQuality(stream, metrics) {
    if (metrics.bandwidth < 1000000) {
      // < 1Mbps
      stream.resolution = "low";
    } else if (metrics.frameRate < 30) {
      stream.resolution = "medium";
    } else {
      stream.resolution = "high";
    }
  }
}
