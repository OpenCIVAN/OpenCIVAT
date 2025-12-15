// src/services/serverSync.js
// WebSocket client for real-time server sync

import { config } from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { ws as log } from "@Utils/logger.js";
import { useComputeJobStore } from "@UI/react/store/computeJobStore.js";
import { toast } from "@UI/react/store/toastStore.js";

class ServerSyncService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.handlers = new Map();
    this.datasetManager = null;
    this.viewConfigurationManager = null;
    this.canvasManager = null;
    this.subsetManager = null;
  }

  initialize(datasetManager, viewConfigurationManager = null) {
    this.datasetManager = datasetManager;
    this.viewConfigurationManager = viewConfigurationManager;
    this._setupDefaultHandlers();
    this.connect();
  }

  /**
   * Set the ViewConfigurationManager reference
   * Called by appInitializer after ViewConfigurationManager is created
   */
  setViewConfigurationManager(viewConfigurationManager) {
    this.viewConfigurationManager = viewConfigurationManager;
  }

  /**
   * Set the CanvasManager reference
   * Called by appInitializer after CanvasManager is initialized
   */
  setCanvasManager(canvasManager) {
    this.canvasManager = canvasManager;
  }

  /**
   * Set the SubsetManager reference
   * Called by appInitializer after SubsetManager is initialized
   */
  setSubsetManager(subsetManager) {
    this.subsetManager = subsetManager;
  }

  connect() {
    const wsUrl = config.apiBaseUrl
      .replace(/^http/, "ws")
      .replace("/api", "/ws");
    log.info(`Connecting to ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        log.info("Connected to server");
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this._send({
          type: "auth",
          userId: "00000000-0000-0000-0000-000000000001",
        });

        const projectId =
          sessionManager.getProjectId?.() || config.defaultSessionId;
        this._send({ type: "join:project", projectId });
      };

      this.ws.onmessage = (event) => this._handleMessage(event.data);
      this.ws.onclose = () => {
        log.info("Disconnected");
        this.isConnected = false;
        this._scheduleReconnect();
      };
      this.ws.onerror = (error) => log.error("WebSocket error", error);
    } catch (error) {
      log.error("Failed to connect", error);
      this._scheduleReconnect();
    }
  }

  _handleMessage(data) {
    try {
      const message = JSON.parse(data);
      log.debug(`Received: ${message.type}`, message);
      const handler = this.handlers.get(message.type);
      if (handler) handler(message);
    } catch (error) {
      log.error("Failed to parse message", error);
    }
  }

  _setupDefaultHandlers() {
    this.on("connected", () => log.debug("Server hello received"));
    this.on("auth:success", (msg) =>
      log.info(`Authenticated as ${msg.userId}`)
    );
    this.on("project:joined", (msg) =>
      log.info(`Joined project ${msg.projectId}`)
    );

    // File events
    this.on("file:added", async (msg) => {
      log.info(`File added: ${msg.file.filename}`);
      if (this.datasetManager) {
        await this.datasetManager._addDatasetFromServer(msg.file);
      }
    });

    this.on("file:removed", (msg) => {
      log.info(`File removed: ${msg.fileId}`);
      if (this.datasetManager) {
        this.datasetManager.removeDataset(msg.fileId);
      }
    });

    // Annotation events
    this.on("annotation:created", (msg) =>
      log.info(`Annotation created on ${msg.fileId}`)
    );
    this.on("annotation:updated", (msg) =>
      log.info(`Annotation updated: ${msg.annotation.id}`)
    );
    this.on("annotation:deleted", (msg) =>
      log.info(`Annotation deleted: ${msg.annotationId}`)
    );

    // View events - forward to ViewConfigurationManager
    this.on("view:created", (msg) => {
      log.info(`View created: ${msg.view.name || msg.view.id}`);
      if (this.viewConfigurationManager) {
        this.viewConfigurationManager.handleServerBroadcast(
          "view:created",
          msg
        );
      }
    });
    this.on("view:updated", (msg) => {
      log.info(`View updated: ${msg.view.id}`);
      if (this.viewConfigurationManager) {
        this.viewConfigurationManager.handleServerBroadcast(
          "view:updated",
          msg
        );
      }
    });
    this.on("view:deleted", (msg) => {
      log.info(`View deleted: ${msg.viewId}`);
      if (this.viewConfigurationManager) {
        this.viewConfigurationManager.handleServerBroadcast(
          "view:deleted",
          msg
        );
      }
    });

    // Canvas events - forward to CanvasManager
    this.on("canvas:created", (msg) => {
      log.info(`Canvas created: ${msg.canvas?.name || msg.canvasId}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });
    this.on("canvas:updated", (msg) => {
      log.info(`Canvas updated: ${msg.canvasId}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });
    this.on("canvas:deleted", (msg) => {
      log.info(`Canvas deleted: ${msg.canvasId}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });

    // Placement events - forward to CanvasManager
    this.on("placement:added", (msg) => {
      log.info(`Placement added to canvas ${msg.canvasId}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });
    this.on("placement:updated", (msg) => {
      log.info(`Placement updated: ${msg.placement?.id}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });
    this.on("placement:removed", (msg) => {
      log.info(`Placement removed: ${msg.placementId}`);
      if (this.canvasManager) {
        this.canvasManager.handleServerBroadcast(msg);
      }
    });

    // Subset events - forward to SubsetManager
    this.on("subset:created", (msg) => {
      log.info(`Subset created: ${msg.subset?.name || msg.subsetId}`);
      if (this.subsetManager) {
        this.subsetManager.handleServerBroadcast(msg);
      }
    });
    this.on("subset:updated", (msg) => {
      log.info(`Subset updated: ${msg.subsetId}`);
      if (this.subsetManager) {
        this.subsetManager.handleServerBroadcast(msg);
      }
    });
    this.on("subset:deleted", (msg) => {
      log.info(`Subset deleted: ${msg.subsetId}`);
      if (this.subsetManager) {
        this.subsetManager.handleServerBroadcast(msg);
      }
    });

    // Member events
    this.on("member:joined", (msg) => log.debug(`User ${msg.userId} joined`));
    this.on("member:left", (msg) => log.debug(`User ${msg.userId} left`));

    // Thumbnail events - dispatch custom events for UI components to listen to
    this.on("thumbnail:ready", (msg) => {
      log.debug(`Thumbnail ready for view ${msg.viewId}`);
      // Dispatch event for useThumbnail hook and other listeners
      window.dispatchEvent(
        new CustomEvent("cia:thumbnail-ready", {
          detail: { viewId: msg.viewId, snapshotId: msg.snapshotId },
        })
      );
    });

    this.on("thumbnail:file-updated", (msg) => {
      log.info(`File thumbnail updated: ${msg.fileId}`);
      // Dispatch event for FilesTab and other file thumbnail displays
      window.dispatchEvent(
        new CustomEvent("cia:file-thumbnail-updated", {
          detail: { fileId: msg.fileId, storageKey: msg.storageKey },
        })
      );
      // Also update dataset manager if available
      if (this.datasetManager) {
        this.datasetManager.notifyThumbnailUpdated(msg.fileId);
      }
    });

    this.on("thumbnail:view-updated", (msg) => {
      log.debug(`View thumbnail updated: ${msg.viewId}`);
      // Dispatch event for view thumbnail displays
      window.dispatchEvent(
        new CustomEvent("cia:thumbnail-ready", {
          detail: { viewId: msg.viewId, fileId: msg.fileId },
        })
      );
    });

    // Compute job events
    this.on("compute:progress", (msg) => {
      log.debug(`Compute progress: ${msg.jobId} - ${msg.progress}%`);
      const { updateProgress, getJob } = useComputeJobStore.getState();
      updateProgress(msg.jobId, msg.progress, msg.message);

      // Show toast at key milestones only (to avoid spam)
      if (msg.progress === 50) {
        const job = getJob(msg.jobId);
        if (job) {
          toast.info(`Processing ${job.fileName || "file"}... 50%`, 2000);
        }
      }
    });

    this.on("compute:complete", async (msg) => {
      log.info(`Compute complete: ${msg.jobId}`);
      const { completeJob, getJob } = useComputeJobStore.getState();

      // Get job info BEFORE marking complete (for toast message)
      const job = getJob(msg.jobId);
      const jobName = job?.fileName || "Processing";
      const operation = job?.operation?.replace(/-/g, " ") || "Operation";

      completeJob(msg.jobId, msg.result);

      // Show success toast
      toast.success(`${jobName}: ${operation} complete!`, 4000);

      // If a derived file was created, add it to DatasetManager
      if (msg.result?.derivedFileId && this.datasetManager) {
        try {
          const response = await fetch(
            `${config.apiBaseUrl}/files/${msg.result.derivedFileId}`
          );
          if (response.ok) {
            const { file } = await response.json();
            await this.datasetManager._addDatasetFromServer(file);
            log.info(`Added derived dataset: ${file.filename}`);

            // Additional toast for derived file
            toast.info(`New file created: ${file.filename}`, 3000);
          }
        } catch (error) {
          log.error("Failed to fetch derived dataset:", error);
        }
      }
    });

    this.on("compute:failed", (msg) => {
      log.error(`Compute failed: ${msg.jobId} - ${msg.error}`);
      const { failJob, getJob } = useComputeJobStore.getState();

      // Get job info for toast
      const job = getJob(msg.jobId);
      const jobName = job?.fileName || "Processing";

      failJob(msg.jobId, msg.error);

      // Show error toast (longer duration for errors)
      toast.error(`${jobName} failed: ${msg.error || "Unknown error"}`, 6000);
    });
  }

  on(type, handler) {
    this.handlers.set(type, handler);
  }

  _send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error("Max reconnect attempts reached");
      return;
    }
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    log.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const serverSync = new ServerSyncService();
