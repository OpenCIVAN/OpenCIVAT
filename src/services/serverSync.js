// src/services/serverSync.js
// WebSocket client for real-time server sync

import { config } from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { ws as log } from "@Utils/logger.js";
import { authService } from "@Services/authService.js";
import { useComputeJobStore } from "@UI/react/store/computeJobStore.js";
import { toast } from "@UI/react/store/toastStore.js";
import { saveSyncWatermark } from "@Services/syncService.js";

// Debounce window for delta back-fill requests.
// Multiple incoming events with gaps in rapid succession collapse into one fetch.
const DELTA_BACKFILL_DEBOUNCE_MS = 500;

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
    this.pendingProjectId = null;
    this._authUnsubscribe = null;
    // DR1: workspace + user scope for watermark management
    this._workspaceId = null;
    this._userId = null;
    this._lastWatermark = 0;
    this._deltaFetchPending = false;
    this._deltaFetchTimer = null;
  }

  /**
   * Set the workspace scope for watermark tracking.
   * Call this after the user joins a workspace.
   */
  setWorkspaceId(workspaceId) {
    this._workspaceId = workspaceId;
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

        this.pendingProjectId =
          sessionManager.getProjectId?.() || config.defaultSessionId;
        void this._authenticate();
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
    this.on("auth:success", (msg) => {
      log.info(`Authenticated as ${msg.userId}`);
      // Store the database userId in sessionManager and locally for watermark scoping
      sessionManager.setUserInfo(msg.userId, msg.email || null);
      this._userId = msg.userId || null;
      if (this.pendingProjectId) {
        this._send({ type: "join:project", projectId: this.pendingProjectId });
      }
    });
    this.on("auth:error", (msg) => {
      log.warn(`Authentication failed: ${msg.error || "unknown error"}`);
    });
    this.on("project:join-error", (msg) => {
      log.warn(`Project join failed: ${msg.error || "unknown error"}`);
    });
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
      log.info(`View created: ${msg.view?.name || msg.view?.id}`);
      this._advanceWatermark(msg.syncEventId);
      if (this.viewConfigurationManager) {
        this.viewConfigurationManager.handleServerBroadcast("view:created", msg);
      }
    });

    this.on("view:updated", (msg) => {
      const viewId = msg.view?.id;
      log.info(`View updated: ${viewId}`);

      // Skip echo of our own mutations to prevent double-apply
      const myUserId = sessionManager.getUserId?.() || this._userId;
      if (msg.actorUserId && myUserId && msg.actorUserId === myUserId) {
        log.debug(`Skipping own view:updated echo for ${viewId}`);
        this._advanceWatermark(msg.syncEventId);
        return;
      }

      if (msg.syncEventId) {
        const incoming = parseInt(msg.syncEventId, 10);

        // Case 1: duplicate or already-applied — skip silently
        if (this._lastWatermark > 0 && incoming <= this._lastWatermark) {
          log.debug(`Skipping already-applied view:updated event ${incoming} (watermark=${this._lastWatermark})`);
          return;
        }

        // Case 2: gap of any size > 1 — schedule back-fill, defer this event
        if (this._lastWatermark > 0 && incoming > this._lastWatermark + 1) {
          log.warn(`Event gap detected (${this._lastWatermark} → ${incoming}); scheduling delta back-fill`);
          this._scheduleDeltaFetch();
          return; // event will be re-applied via back-fill
        }

        // Case 3: expected next event (incoming === lastWatermark + 1 or first event)
      }

      try {
        if (this.viewConfigurationManager) {
          this.viewConfigurationManager.handleServerBroadcast("view:updated", msg);
        }
        this._advanceWatermark(msg.syncEventId);
      } catch (err) {
        log.warn(`Failed to apply view:updated for view ${viewId}: ${err.message}`);
        // Do NOT advance watermark — the gap on the next event will trigger back-fill
      }
    });

    this.on("view:deleted", (msg) => {
      log.info(`View deleted: ${msg.viewId}`);
      this._advanceWatermark(msg.syncEventId);
      if (this.viewConfigurationManager) {
        this.viewConfigurationManager.handleServerBroadcast("view:deleted", msg);
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

    // VR Session events - dispatch custom events for UI components
    this.on("vr:session-created", (msg) => {
      log.info(`VR session created: ${msg.session?.id}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-session-created", {
          detail: msg,
        })
      );
    });

    this.on("vr:session-updated", (msg) => {
      log.info(`VR session updated: ${msg.sessionId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-session-updated", {
          detail: msg,
        })
      );
    });

    this.on("vr:session-ended", (msg) => {
      log.info(`VR session ended: ${msg.sessionId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-session-ended", {
          detail: msg,
        })
      );
    });

    this.on("vr:participant-joined", (msg) => {
      log.info(`VR participant joined: ${msg.participant?.userName}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-participant-joined", {
          detail: msg,
        })
      );
    });

    this.on("vr:participant-left", (msg) => {
      log.info(`VR participant left: ${msg.userId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-participant-left", {
          detail: msg,
        })
      );
    });

    this.on("vr:snapshot-created", (msg) => {
      log.info(`VR snapshot created: ${msg.snapshot?.name}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-snapshot-created", {
          detail: msg,
        })
      );
    });

    // VR Preprocessing events
    this.on("vr:preprocessing-started", (msg) => {
      log.info(`VR preprocessing started: ${msg.datasetId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-preprocessing-started", {
          detail: msg,
        })
      );
    });

    this.on("vr:preprocessing-progress", (msg) => {
      log.debug(`VR preprocessing progress: ${msg.datasetId} - ${msg.progress}%`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-preprocessing-progress", {
          detail: msg,
        })
      );
    });

    this.on("vr:preprocessing-complete", (msg) => {
      log.info(`VR preprocessing complete: ${msg.datasetId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-preprocessing-complete", {
          detail: msg,
        })
      );
    });

    this.on("vr:preprocessing-failed", (msg) => {
      log.error(`VR preprocessing failed: ${msg.datasetId}`);
      window.dispatchEvent(
        new CustomEvent("cia:vr-preprocessing-failed", {
          detail: msg,
        })
      );
    });
  }

  async _authenticate() {
    try {
      const token = await authService.getAccessToken();
      const isDevBypass =
        config.devBypassAuth === true || config.devBypassAuth === "true";
      if (!token && !isDevBypass) {
        this._waitForAuth();
        return;
      }
      const user = authService.getUser?.();
      this._send({
        type: "auth",
        token,
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
      });
    } catch (error) {
      log.warn("Failed to authenticate WebSocket:", error.message);
    }
  }

  _waitForAuth() {
    if (this._authUnsubscribe) {
      return;
    }

    this._authUnsubscribe = authService.onAuthStateChange(async (event) => {
      if (event === "authenticated") {
        const unsubscribe = this._authUnsubscribe;
        this._authUnsubscribe = null;
        if (unsubscribe) {
          unsubscribe();
        }
        await this._authenticate();
      } else if (event === "logout" || event === "session_expired") {
        const unsubscribe = this._authUnsubscribe;
        this._authUnsubscribe = null;
        if (unsubscribe) {
          unsubscribe();
        }
      }
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

  // ============================================================================
  // DR1: WATERMARK HELPERS
  // ============================================================================

  /**
   * Advance the local watermark after successfully processing a WS event.
   * Scoped by both workspaceId and userId to prevent cross-user reuse.
   * @param {string|number|null} syncEventId
   */
  _advanceWatermark(syncEventId) {
    if (!syncEventId || !this._workspaceId) return;
    const id = parseInt(syncEventId, 10);
    if (isNaN(id) || id <= this._lastWatermark) return;
    this._lastWatermark = id;
    saveSyncWatermark(this._workspaceId, id, this._userId);
  }

  /**
   * Debounced entry point for triggering a delta back-fill.
   * Multiple calls within DELTA_BACKFILL_DEBOUNCE_MS collapse into one fetch.
   */
  _scheduleDeltaFetch() {
    if (this._deltaFetchTimer) clearTimeout(this._deltaFetchTimer);
    this._deltaFetchTimer = setTimeout(() => {
      this._deltaFetchTimer = null;
      this._triggerDeltaFetch();
    }, DELTA_BACKFILL_DEBOUNCE_MS);
  }

  /**
   * Execute a delta back-fill fetch immediately.
   * Only one fetch runs at a time (_deltaFetchPending guard).
   * Advances watermark only to the last successfully applied event id.
   */
  _triggerDeltaFetch() {
    if (this._deltaFetchPending || !this._workspaceId) return;
    this._deltaFetchPending = true;

    import("@Services/syncService.js").then(({ fetchDeltaSince, applyDeltaEvents, saveSyncWatermark: save }) => {
      fetchDeltaSince(this._workspaceId, this._lastWatermark).then(async (delta) => {
        this._deltaFetchPending = false;
        if (delta.requiresFullResync) {
          log.warn("Delta back-fill: full resync required");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("cia:sync-full-resync-required", {
              detail: { reason: delta.reason },
            }));
          }
          return;
        }
        const { lastAppliedEventId } = await applyDeltaEvents(
          delta.events || [],
          { viewConfigurationManager: this.viewConfigurationManager },
          this._userId
        );
        if (lastAppliedEventId != null && lastAppliedEventId > this._lastWatermark) {
          this._lastWatermark = lastAppliedEventId;
          save(this._workspaceId, lastAppliedEventId, this._userId);
        }
      }).catch((err) => {
        this._deltaFetchPending = false;
        log.warn("Delta back-fill fetch failed:", err.message);
      });
    }).catch(() => {
      this._deltaFetchPending = false;
    });
  }

  disconnect() {
    if (this._deltaFetchTimer) {
      clearTimeout(this._deltaFetchTimer);
      this._deltaFetchTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this._authUnsubscribe) {
      this._authUnsubscribe();
      this._authUnsubscribe = null;
    }
  }
}

export const serverSync = new ServerSyncService();
