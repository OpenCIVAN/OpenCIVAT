// src/services/serverSync.js
// WebSocket client for real-time server sync

import { config } from "@Core/config/clientConfig.js";
import { sessionManager } from "@Core/session/sessionManager.js";
import { ws as log } from "@Utils/logger.js";

class ServerSyncService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.handlers = new Map();
    this.datasetManager = null;
  }

  initialize(datasetManager) {
    this.datasetManager = datasetManager;
    this._setupDefaultHandlers();
    this.connect();
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

    // View events
    this.on("view:created", (msg) =>
      log.info(`View created: ${msg.view.name || msg.view.id}`)
    );
    this.on("view:updated", (msg) => log.info(`View updated: ${msg.view.id}`));
    this.on("view:deleted", (msg) => log.info(`View deleted: ${msg.viewId}`));

    // Member events
    this.on("member:joined", (msg) => log.debug(`User ${msg.userId} joined`));
    this.on("member:left", (msg) => log.debug(`User ${msg.userId} left`));
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
