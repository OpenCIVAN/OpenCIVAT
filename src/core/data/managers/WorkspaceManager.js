// src/core/data/managers/WorkspaceManager.js
// Manager for workspace hierarchy
//
// Handles workspace CRUD, membership, and hierarchy operations

import {
  Workspace,
  WorkspaceType,
  WorkspacePermission,
} from "../models/Workspace.js";
import { workspace as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import {
  getStoredMockUserId,
  getMockUser,
  getDefaultMockUser,
} from "@Config/mockUsers.js";

/**
 * WorkspaceManager - Manages workspace hierarchy
 */
class WorkspaceManagerClass {
  constructor() {
    this._apiBaseUrl = config.apiBaseUrl || "http://localhost:3001/api";
    this._sessionManager = null;

    // Storage
    this.workspaces = new Map(); // id -> Workspace
    this.pendingByLocalId = new Map(); // localId -> Workspace

    // Index by type
    this.personalWorkspaces = new Map(); // userId -> workspaceId
    this.projectWorkspaces = new Set(); // workspaceIds
    this.breakoutWorkspaces = new Map(); // projectId -> Set<workspaceId>

    // Current state
    this.activeWorkspaceId = null;

    this.listeners = new Set();
  }

  /**
   * Initialize manager with shared config
   */
  initialize(options = {}) {
    if (options.apiBaseUrl) this._apiBaseUrl = options.apiBaseUrl;
    if (options.sessionManager) this._sessionManager = options.sessionManager;
    log.debug("Workspace data manager initialized");
  }

  /**
   * Subscribe to workspace changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  notify(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        log.error("WorkspaceManager listener error:", err);
      }
    });
  }

  _getToken() {
    if (this._sessionManager?.getToken) {
      return this._sessionManager.getToken();
    }
    return null;
  }

  _isDevMode() {
    return config.devBypassAuth === true || config.devBypassAuth === "true";
  }

  _getDevUserHeaders() {
    if (!this._isDevMode()) {
      return {};
    }

    const storedId = getStoredMockUserId();
    const user = storedId ? getMockUser(storedId) : getDefaultMockUser();
    if (!user) return {};

    return {
      "x-user-id": user.id,
      "x-user-email": user.email,
      "x-user-name": user.name,
    };
  }

  async _fetch(endpoint, options = {}) {
    const url = `${this._apiBaseUrl}${endpoint}`;
    const token = this._getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...this._getDevUserHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response;
  }

  _resetCaches() {
    this.workspaces.clear();
    this.pendingByLocalId.clear();
    this.personalWorkspaces.clear();
    this.projectWorkspaces.clear();
    this.breakoutWorkspaces.clear();
    this.activeWorkspaceId = null;
  }

  _normalizeWorkspaceData(data = {}) {
    if (!data) return null;
    return {
      id: data.id,
      localId: data.local_id || data.localId,
      name: data.name,
      description: data.description,
      type: data.type,
      parentId: data.parent_id || data.parentId,
      projectId: data.project_id || data.projectId,
      roomId: data.room_id || data.roomId,
      ownerId: data.owner_id || data.ownerId,
      createdBy: data.created_by || data.createdBy,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      isArchived: data.is_archived ?? data.isArchived ?? false,
      archivedAt: data.archived_at || data.archivedAt,
      expiresAt: data.expires_at || data.expiresAt,
      autoMerge: data.auto_merge ?? data.autoMerge ?? false,
      members: (data.members || []).map((member) => ({
        userId: member.user_id || member.userId,
        permission: member.permission,
        joinedAt: member.joined_at || member.joinedAt,
      })),
      canvasIds: data.canvas_ids || data.canvasIds || [],
      activeCanvasId: data.active_canvas_id || data.activeCanvasId || null,
    };
  }

  _upsertWorkspace(workspace) {
    if (!workspace) return null;
    const id = workspace.getEffectiveId();
    this.workspaces.set(id, workspace);
    if (workspace.isPending) {
      this.pendingByLocalId.set(workspace.localId, workspace);
    }
    this._indexWorkspace(workspace);
    return workspace;
  }

  // ============ WORKSPACE CRUD ============

  /**
   * Create a new workspace
   */
  async createWorkspace(data) {
    try {
      const payload = {
        name: data?.name,
        description: data?.description,
        type: data?.type,
        project_id: data?.projectId || data?.project_id || null,
        expires_at: data?.expiresAt || data?.expires_at || null,
        auto_merge: data?.autoMerge ?? data?.auto_merge ?? false,
      };
      const response = await this._fetch("/workspaces", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const serverData = await response.json();
      const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
      this._upsertWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: false });
      return workspace;
    } catch (err) {
      log.error("Failed to create workspace on server:", err);
      const workspace = new Workspace(data);
      this.workspaces.set(workspace.localId, workspace);
      this.pendingByLocalId.set(workspace.localId, workspace);
      this._indexWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: true });
      return workspace;
    }
  }

  /**
   * Create personal workspace for user
   */
  async createPersonalWorkspace(userId, name = "My Workspace") {
    // Check if user already has a personal workspace
    if (this.personalWorkspaces.has(userId)) {
      return this.getWorkspace(this.personalWorkspaces.get(userId));
    }
    try {
      const response = await this._fetch("/workspaces/personal");
      const serverData = await response.json();
      const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
      this._upsertWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: false });
      return workspace;
    } catch (err) {
      log.error("Failed to load personal workspace from server:", err);
      const workspace = Workspace.createPersonal(userId, name);
      return this.createWorkspace(workspace.toJSON());
    }
  }

  /**
   * Create project workspace
   */
  async createProjectWorkspace(name, description = "", projectId = null) {
    return this.createWorkspace({
      name,
      description,
      type: WorkspaceType.PROJECT,
      projectId: projectId || null,
    });
  }

  /**
   * Create breakout from project
   */
  async createBreakout(
    projectId,
    name,
    userId,
    expiresInHours = 2,
    roomId = null
  ) {
    try {
      const response = await this._fetch(`/workspaces/${projectId}/breakout`, {
        method: "POST",
        body: JSON.stringify({
          name,
          expires_hours: expiresInHours,
          room_id: roomId,
        }),
      });
      const serverData = await response.json();
      const workspace = new Workspace(this._normalizeWorkspaceData(serverData));
      this._upsertWorkspace(workspace);
      this.notify("workspace:created", { workspace, pending: false });
      return workspace;
    } catch (err) {
      log.error("Failed to create breakout on server:", err);
      const breakout = Workspace.createBreakout(
        projectId,
        name,
        userId,
        expiresInHours,
        roomId
      );
      return this.createWorkspace(breakout.toJSON());
    }
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(id) {
    return this.workspaces.get(id) || null;
  }

  /**
   * Get personal workspace for user
   */
  getPersonalWorkspace(userId) {
    const id = this.personalWorkspaces.get(userId);
    return id ? this.getWorkspace(id) : null;
  }

  /**
   * Get all project workspaces
   */
  getProjectWorkspaces() {
    return Array.from(this.projectWorkspaces)
      .map((id) => this.workspaces.get(id))
      .filter(Boolean);
  }

  /**
   * Get breakouts for a project
   */
  getBreakoutsForProject(projectId) {
    const ids = this.breakoutWorkspaces.get(projectId) || new Set();
    return Array.from(ids)
      .map((id) => this.workspaces.get(id))
      .filter(Boolean)
      .filter((w) => !w.isExpired());
  }

  /**
   * Update a workspace
   */
  async updateWorkspace(id, updates) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return null;
    try {
      const response = await this._fetch(`/workspaces/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
        }),
      });
      const serverData = await response.json();
      const normalized = this._normalizeWorkspaceData({
        ...serverData,
        canvas_ids: workspace.canvasIds,
        active_canvas_id: workspace.activeCanvasId,
      });
      const updatedWorkspace = new Workspace(normalized);
      Object.assign(updatedWorkspace, updates);
      this._unindexWorkspace(workspace, workspace.type);
      this._upsertWorkspace(updatedWorkspace);
      this.notify("workspace:updated", { workspace: updatedWorkspace });
      return updatedWorkspace;
    } catch (err) {
      log.error("Failed to update workspace on server:", err);
      const oldType = workspace.type;
      Object.assign(workspace, updates);
      workspace.updatedAt = new Date().toISOString();

      if (updates.type && updates.type !== oldType) {
        this._unindexWorkspace(workspace, oldType);
        this._indexWorkspace(workspace);
      }

      this.notify("workspace:updated", { workspace });
      return workspace;
    }
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return false;
    try {
      await this._fetch(`/workspaces/${id}`, { method: "DELETE" });
    } catch (err) {
      log.error("Failed to delete workspace on server:", err);
    }

    this._unindexWorkspace(workspace, workspace.type);
    this.workspaces.delete(id);

    if (workspace.isPending) {
      this.pendingByLocalId.delete(workspace.localId);
    }

    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = null;
    }

    this.notify("workspace:deleted", { id });

    return true;
  }

  /**
   * Confirm workspace with server ID
   */
  confirmWorkspace(localId, serverId) {
    const workspace = this.pendingByLocalId.get(localId);
    if (!workspace) return null;

    workspace.confirmWithServerId(serverId);

    this.workspaces.delete(localId);
    this.workspaces.set(serverId, workspace);

    // Re-index with server ID
    this._unindexWorkspace(workspace, workspace.type, localId);
    this._indexWorkspace(workspace);

    this.pendingByLocalId.delete(localId);
    this.notify("workspace:confirmed", { workspace, serverId });

    return workspace;
  }

  // ============ MEMBERSHIP ============

  /**
   * Add member to workspace
   */
  async addMember(
    workspaceId,
    userId,
    permission = WorkspacePermission.VIEWER
  ) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.addMember(userId, permission);

    // TODO: Sync to server
    this.notify("workspace:member-added", { workspace, userId, permission });

    return workspace;
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId, userId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.removeMember(userId);

    // TODO: Sync to server
    this.notify("workspace:member-removed", { workspace, userId });

    return workspace;
  }

  /**
   * Update member permission
   */
  async setMemberPermission(workspaceId, userId, permission) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.setMemberPermission(userId, permission);

    // TODO: Sync to server
    this.notify("workspace:member-updated", { workspace, userId, permission });

    return workspace;
  }

  // ============ ACTIVE WORKSPACE ============

  /**
   * Set active workspace
   */
  setActiveWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return null;

    this.activeWorkspaceId = id;
    this.notify("workspace:activated", { workspace });

    return workspace;
  }

  /**
   * Clear active workspace
   */
  clearActiveWorkspace() {
    this.activeWorkspaceId = null;
    this.notify("workspace:activated", { workspace: null });
  }

  /**
   * Get active workspace
   */
  getActiveWorkspace() {
    return this.activeWorkspaceId
      ? this.getWorkspace(this.activeWorkspaceId)
      : null;
  }

  // ============ CANVAS MANAGEMENT ============

  /**
   * Add canvas to workspace
   */
  async addCanvasToWorkspace(workspaceId, canvasId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.addCanvas(canvasId);

    // TODO: Sync to server
    this.notify("workspace:canvas-added", { workspace, canvasId });

    return workspace;
  }

  /**
   * Remove canvas from workspace
   */
  async removeCanvasFromWorkspace(workspaceId, canvasId) {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) return null;

    workspace.removeCanvas(canvasId);

    // TODO: Sync to server
    this.notify("workspace:canvas-removed", { workspace, canvasId });

    return workspace;
  }

  // ============ BREAKOUT OPERATIONS ============

  /**
   * Merge breakout back to project
   */
  async mergeBreakoutToProject(breakoutId) {
    const breakout = this.getWorkspace(breakoutId);
    if (!breakout || !breakout.isBreakout()) return null;

    const project = this.getWorkspace(breakout.projectId);
    if (!project) return null;

    // Copy canvases to project
    for (const canvasId of breakout.canvasIds) {
      project.addCanvas(canvasId);
    }

    // Archive the breakout
    breakout.archive();

    // TODO: Sync to server
    this.notify("workspace:breakout-merged", { breakout, project });

    return project;
  }

  /**
   * Clean up expired breakouts
   */
  cleanupExpiredBreakouts() {
    const expired = [];

    for (const [projectId, breakoutIds] of this.breakoutWorkspaces) {
      for (const breakoutId of breakoutIds) {
        const breakout = this.getWorkspace(breakoutId);
        if (breakout?.isExpired() && !breakout.isArchived) {
          if (breakout.autoMerge) {
            this.mergeBreakoutToProject(breakoutId);
          } else {
            breakout.archive();
          }
          expired.push(breakoutId);
        }
      }
    }

    if (expired.length > 0) {
      this.notify("workspace:breakouts-expired", { expired });
    }

    return expired;
  }

  // ============ INTERNAL ============

  /**
   * Index workspace by type
   */
  _indexWorkspace(workspace) {
    const id = workspace.getEffectiveId();

    switch (workspace.type) {
      case WorkspaceType.PERSONAL:
        this.personalWorkspaces.set(workspace.ownerId, id);
        break;
      case WorkspaceType.PROJECT:
        this.projectWorkspaces.add(id);
        break;
      case WorkspaceType.BREAKOUT:
        if (!this.breakoutWorkspaces.has(workspace.projectId)) {
          this.breakoutWorkspaces.set(workspace.projectId, new Set());
        }
        this.breakoutWorkspaces.get(workspace.projectId).add(id);
        break;
    }
  }

  /**
   * Remove workspace from index
   */
  _unindexWorkspace(workspace, type, oldId = null) {
    const id = oldId || workspace.getEffectiveId();

    switch (type) {
      case WorkspaceType.PERSONAL:
        if (this.personalWorkspaces.get(workspace.ownerId) === id) {
          this.personalWorkspaces.delete(workspace.ownerId);
        }
        break;
      case WorkspaceType.PROJECT:
        this.projectWorkspaces.delete(id);
        break;
      case WorkspaceType.BREAKOUT:
        const breakouts = this.breakoutWorkspaces.get(workspace.projectId);
        if (breakouts) {
          breakouts.delete(id);
        }
        break;
    }
  }

  /**
   * Load workspaces from server
   */
  async loadWorkspaces(userId, projectId = null, roomId = null) {
    try {
      this._resetCaches();

      let personalWorkspace = null;
      try {
        const personalResponse = await this._fetch("/workspaces/personal");
        const personalData = await personalResponse.json();
        personalWorkspace = new Workspace(
          this._normalizeWorkspaceData(personalData)
        );
        this._upsertWorkspace(personalWorkspace);
      } catch (err) {
        log.debug("Personal workspace load failed:", err);
      }

      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      if (roomId) params.set("room_id", roomId);

      const response = await this._fetch(
        `/workspaces${params.toString() ? `?${params.toString()}` : ""}`
      );
      const data = await response.json();
      const serverWorkspaces = data.workspaces || [];

      const workspaceList = [];
      serverWorkspaces.forEach((row) => {
        const workspace = new Workspace(this._normalizeWorkspaceData(row));
        this._upsertWorkspace(workspace);
        workspaceList.push(workspace);
      });

      await Promise.all(
        workspaceList.map(async (workspace) => {
          try {
            const canvasesResponse = await this._fetch(
              `/canvases?workspace_id=${workspace.id}`
            );
            const canvasesData = await canvasesResponse.json();
            const canvasIds = (canvasesData.canvases || []).map(
              (canvas) => canvas.id
            );
            workspace.canvasIds = canvasIds;
            if (!workspace.activeCanvasId && canvasIds.length > 0) {
              workspace.activeCanvasId = canvasIds[0];
            }
          } catch (err) {
            log.debug(
              `Failed to load canvases for workspace ${workspace.id}:`,
              err
            );
          }
        })
      );

      return {
        personal: personalWorkspace || this.getPersonalWorkspace(userId),
        projects: this.getProjectWorkspaces(),
        breakouts: projectId ? this.getBreakoutsForProject(projectId) : [],
      };
    } catch (err) {
      log.error("Failed to load workspaces from server:", err);
      return {
        personal: this.getPersonalWorkspace(userId),
        projects: this.getProjectWorkspaces(),
        breakouts: projectId ? this.getBreakoutsForProject(projectId) : [],
      };
    }
  }
}

// Singleton instance
export const workspaceManager = new WorkspaceManagerClass();
export default workspaceManager;
