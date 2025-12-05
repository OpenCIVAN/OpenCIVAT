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

/**
 * WorkspaceManager - Manages workspace hierarchy
 */
class WorkspaceManagerClass {
  constructor() {
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

  // ============ WORKSPACE CRUD ============

  /**
   * Create a new workspace
   */
  async createWorkspace(data) {
    const workspace = new Workspace(data);

    this.workspaces.set(workspace.localId, workspace);
    this.pendingByLocalId.set(workspace.localId, workspace);

    // Index by type
    this._indexWorkspace(workspace);

    // TODO: Send to server
    this.notify("workspace:created", { workspace, pending: true });

    return workspace;
  }

  /**
   * Create personal workspace for user
   */
  async createPersonalWorkspace(userId, name = "My Workspace") {
    // Check if user already has a personal workspace
    if (this.personalWorkspaces.has(userId)) {
      return this.getWorkspace(this.personalWorkspaces.get(userId));
    }

    const workspace = Workspace.createPersonal(userId, name);
    return this.createWorkspace(workspace.toJSON());
  }

  /**
   * Create project workspace
   */
  async createProjectWorkspace(name, creatorId, description = "") {
    const workspace = Workspace.createProject(name, creatorId, description);
    return this.createWorkspace(workspace.toJSON());
  }

  /**
   * Create breakout from project
   */
  createBreakout(projectId, name, userId, expiresInHours = 2, roomId = null) {
    const breakout = Workspace.createBreakout(
      projectId,
      name,
      userId,
      expiresInHours,
      roomId
    );
    return this.createWorkspace(breakout.toJSON());
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

    // Re-index if type changed
    const oldType = workspace.type;
    Object.assign(workspace, updates);
    workspace.updatedAt = new Date().toISOString();

    if (updates.type && updates.type !== oldType) {
      this._unindexWorkspace(workspace, oldType);
      this._indexWorkspace(workspace);
    }

    // TODO: Sync to server
    this.notify("workspace:updated", { workspace });

    return workspace;
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(id) {
    const workspace = this.getWorkspace(id);
    if (!workspace) return false;

    this._unindexWorkspace(workspace, workspace.type);
    this.workspaces.delete(id);

    if (workspace.isPending) {
      this.pendingByLocalId.delete(workspace.localId);
    }

    if (this.activeWorkspaceId === id) {
      this.activeWorkspaceId = null;
    }

    // TODO: Sync to server
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
  async loadWorkspaces(userId) {
    // TODO: Fetch from server
    // For now return existing
    return {
      personal: this.getPersonalWorkspace(userId),
      projects: this.getProjectWorkspaces(),
    };
  }
}

// Singleton instance
export const workspaceManager = new WorkspaceManagerClass();
export default workspaceManager;
