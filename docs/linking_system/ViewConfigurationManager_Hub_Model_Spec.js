/**
 * ViewConfigurationManager Hub Model Extension
 * 
 * Detailed implementation specification for adding sync groups with
 * hub-based architecture to the existing ViewConfigurationManager.
 * 
 * This document provides:
 * 1. Data structure changes
 * 2. New methods with full signatures and logic
 * 3. Event specifications
 * 4. Migration strategy from point-to-point to hub model
 * 5. Edge cases and error handling
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 * @file ViewConfigurationManager_Hub_Model_Spec.js
 */

// =============================================================================
// PART 1: NEW CONSTANTS
// Location: Add to src/core/data/models/ViewConfiguration.js
// =============================================================================

/**
 * Sync group roles
 */
export const SYNC_GROUP_ROLE = Object.freeze({
  HUB: 'hub',           // Source of truth, broadcasts to all members
  MEMBER: 'member',     // Participant, behavior depends on link mode
});

/**
 * Hub election strategies
 */
export const HUB_ELECTION_STRATEGY = Object.freeze({
  FIRST_REMAINING: 'first_remaining',  // First member by join time
  MOST_ACTIVE: 'most_active',          // Member with most recent activity
  OWNER_PRIORITY: 'owner_priority',    // Prefer view owner over shared
  MANUAL: 'manual',                    // Require explicit selection
});

/**
 * Sync group state
 */
export const SYNC_GROUP_STATE = Object.freeze({
  ACTIVE: 'active',     // Group is functioning normally
  DEGRADED: 'degraded', // Hub offline, members operating independently
  PAUSED: 'paused',     // Group sync temporarily paused
});

// =============================================================================
// PART 2: NEW DATA STRUCTURES
// =============================================================================

/**
 * SyncGroup - Represents a group of views syncing a specific property
 * 
 * Each linkable property can have its own sync groups.
 * A view can be in different groups for different properties.
 */
export class SyncGroup {
  constructor(config = {}) {
    // Identity
    this.id = config.id || generateSyncGroupId();
    this.property = config.property; // Which property this group syncs
    
    // Hub information
    this.hubViewId = config.hubViewId;
    this.hubServerId = config.hubServerId || null;
    this.hubOwnerUserId = config.hubOwnerUserId;
    this.hubOwnerUserName = config.hubOwnerUserName;
    
    // Members (excluding hub)
    // Map<viewId, SyncGroupMembership>
    this.members = new Map(config.members || []);
    
    // State
    this.state = config.state || SYNC_GROUP_STATE.ACTIVE;
    this.stateReason = config.stateReason || null;
    
    // Election strategy for when hub leaves
    this.hubElectionStrategy = config.hubElectionStrategy || HUB_ELECTION_STRATEGY.FIRST_REMAINING;
    
    // Timestamps
    this.createdAt = config.createdAt || Date.now();
    this.updatedAt = config.updatedAt || Date.now();
    this.lastSyncAt = config.lastSyncAt || null;
  }
  
  /**
   * Get all view IDs in this group (hub + members)
   */
  getAllViewIds() {
    return [this.hubViewId, ...this.members.keys()];
  }
  
  /**
   * Get member count (excluding hub)
   */
  getMemberCount() {
    return this.members.size;
  }
  
  /**
   * Get total count (hub + members)
   */
  getTotalCount() {
    return this.members.size + 1;
  }
  
  /**
   * Check if a view is in this group
   */
  hasView(viewId) {
    return viewId === this.hubViewId || this.members.has(viewId);
  }
  
  /**
   * Check if a view is the hub
   */
  isHub(viewId) {
    return viewId === this.hubViewId;
  }
  
  /**
   * Get a member's configuration
   */
  getMember(viewId) {
    if (viewId === this.hubViewId) {
      return {
        viewId: this.hubViewId,
        role: SYNC_GROUP_ROLE.HUB,
        mode: null, // Hub doesn't have a mode
        joinedAt: this.createdAt,
      };
    }
    return this.members.get(viewId) || null;
  }
  
  /**
   * Add a member to the group
   */
  addMember(viewId, mode, metadata = {}) {
    const membership = new SyncGroupMembership({
      viewId,
      mode,
      viewName: metadata.viewName,
      ownerUserId: metadata.ownerUserId,
      ownerUserName: metadata.ownerUserName,
    });
    this.members.set(viewId, membership);
    this.updatedAt = Date.now();
    return membership;
  }
  
  /**
   * Remove a member from the group
   */
  removeMember(viewId) {
    const removed = this.members.delete(viewId);
    if (removed) {
      this.updatedAt = Date.now();
    }
    return removed;
  }
  
  /**
   * Update a member's mode
   */
  updateMemberMode(viewId, newMode) {
    const member = this.members.get(viewId);
    if (member) {
      member.mode = newMode;
      member.updatedAt = Date.now();
      this.updatedAt = Date.now();
    }
  }
  
  /**
   * Transfer hub to a new view
   */
  transferHub(newHubViewId, metadata = {}) {
    // Move current hub to members (as bidirectional sync)
    const oldHubViewId = this.hubViewId;
    this.addMember(oldHubViewId, LINK_MODES.BIDIRECTIONAL, {
      viewName: this.hubViewName,
      ownerUserId: this.hubOwnerUserId,
      ownerUserName: this.hubOwnerUserName,
    });
    
    // Remove new hub from members
    const newHubMembership = this.members.get(newHubViewId);
    this.members.delete(newHubViewId);
    
    // Set new hub
    this.hubViewId = newHubViewId;
    this.hubServerId = metadata.serverId || null;
    this.hubOwnerUserId = metadata.ownerUserId || newHubMembership?.ownerUserId;
    this.hubOwnerUserName = metadata.ownerUserName || newHubMembership?.ownerUserName;
    this.hubViewName = metadata.viewName || newHubMembership?.viewName;
    this.updatedAt = Date.now();
    
    return oldHubViewId;
  }
  
  /**
   * Elect a new hub when current hub leaves
   */
  electNewHub(strategy = this.hubElectionStrategy) {
    if (this.members.size === 0) {
      return null; // Group will be dissolved
    }
    
    let newHubId = null;
    
    switch (strategy) {
      case HUB_ELECTION_STRATEGY.FIRST_REMAINING:
        // Earliest join time
        let earliest = Infinity;
        for (const [viewId, membership] of this.members) {
          if (membership.joinedAt < earliest) {
            earliest = membership.joinedAt;
            newHubId = viewId;
          }
        }
        break;
        
      case HUB_ELECTION_STRATEGY.MOST_ACTIVE:
        // Most recent sync
        let mostRecent = 0;
        for (const [viewId, membership] of this.members) {
          if (membership.lastSyncAt > mostRecent) {
            mostRecent = membership.lastSyncAt;
            newHubId = viewId;
          }
        }
        break;
        
      case HUB_ELECTION_STRATEGY.OWNER_PRIORITY:
        // Prefer views owned by different users (collaborative)
        // Fall back to first remaining
        for (const [viewId, membership] of this.members) {
          if (membership.ownerUserId !== this.hubOwnerUserId) {
            newHubId = viewId;
            break;
          }
        }
        if (!newHubId) {
          newHubId = this.members.keys().next().value;
        }
        break;
        
      case HUB_ELECTION_STRATEGY.MANUAL:
        // Return null, requiring explicit selection
        return null;
        
      default:
        newHubId = this.members.keys().next().value;
    }
    
    if (newHubId) {
      this.transferHub(newHubId);
    }
    
    return newHubId;
  }
  
  /**
   * Serialize for storage/sync
   */
  toJSON() {
    return {
      id: this.id,
      property: this.property,
      hubViewId: this.hubViewId,
      hubServerId: this.hubServerId,
      hubOwnerUserId: this.hubOwnerUserId,
      hubOwnerUserName: this.hubOwnerUserName,
      hubViewName: this.hubViewName,
      members: Array.from(this.members.entries()).map(([id, m]) => [id, m.toJSON()]),
      state: this.state,
      stateReason: this.stateReason,
      hubElectionStrategy: this.hubElectionStrategy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastSyncAt: this.lastSyncAt,
    };
  }
  
  static fromJSON(json) {
    return new SyncGroup({
      ...json,
      members: json.members?.map(([id, m]) => [id, SyncGroupMembership.fromJSON(m)]),
    });
  }
}

/**
 * SyncGroupMembership - A member's participation in a sync group
 */
export class SyncGroupMembership {
  constructor(config = {}) {
    this.viewId = config.viewId;
    this.viewName = config.viewName;
    this.ownerUserId = config.ownerUserId;
    this.ownerUserName = config.ownerUserName;
    
    this.mode = config.mode || LINK_MODES.BIDIRECTIONAL;
    this.role = SYNC_GROUP_ROLE.MEMBER;
    
    this.joinedAt = config.joinedAt || Date.now();
    this.updatedAt = config.updatedAt || Date.now();
    this.lastSyncAt = config.lastSyncAt || null;
  }
  
  toJSON() {
    return {
      viewId: this.viewId,
      viewName: this.viewName,
      ownerUserId: this.ownerUserId,
      ownerUserName: this.ownerUserName,
      mode: this.mode,
      role: this.role,
      joinedAt: this.joinedAt,
      updatedAt: this.updatedAt,
      lastSyncAt: this.lastSyncAt,
    };
  }
  
  static fromJSON(json) {
    return new SyncGroupMembership(json);
  }
}

/**
 * Generate unique sync group ID
 */
function generateSyncGroupId() {
  return `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// PART 3: NEW EVENTS
// Location: Add to src/core/events/eventConstants.js
// =============================================================================

export const SYNC_GROUP_EVENTS = {
  // Group lifecycle
  CREATED: 'syncGroupCreated',
  DISSOLVED: 'syncGroupDissolved',
  
  // Membership changes
  MEMBER_JOINED: 'syncGroupMemberJoined',
  MEMBER_LEFT: 'syncGroupMemberLeft',
  MEMBER_MODE_CHANGED: 'syncGroupMemberModeChanged',
  
  // Hub changes
  HUB_CHANGED: 'syncGroupHubChanged',
  HUB_ELECTION_REQUIRED: 'syncGroupHubElectionRequired',
  
  // State changes
  STATE_CHANGED: 'syncGroupStateChanged',
  
  // Sync events
  SYNC_PROPAGATED: 'syncGroupSyncPropagated',
};

// =============================================================================
// PART 4: VIEWCONFIGURATIONMANAGER EXTENSIONS
// Location: Add to src/core/data/managers/ViewConfigurationManager.js
// =============================================================================

/**
 * Extension methods for ViewConfigurationManager
 * 
 * These methods should be added to the existing ViewConfigurationManager class.
 */

class ViewConfigurationManagerExtensions {
  
  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================
  
  /**
   * Initialize sync group tracking
   * Call in constructor after existing initialization
   */
  _initializeSyncGroups() {
    // Map<property, Map<groupId, SyncGroup>>
    this._syncGroups = new Map();
    
    // Initialize a map for each linkable property
    for (const property of LINKABLE_PROPERTIES) {
      this._syncGroups.set(property, new Map());
    }
    
    // Map<viewId, Map<property, groupId>> for quick view → group lookup
    this._viewSyncGroupIndex = new Map();
  }
  
  // ===========================================================================
  // SYNC GROUP CREATION
  // ===========================================================================
  
  /**
   * Create a new sync group with the specified view as hub
   * 
   * @param {string} hubViewId - View to be the hub
   * @param {string} property - Property to sync
   * @param {Object} options - Optional configuration
   * @returns {SyncGroup} The created sync group
   */
  createSyncGroup(hubViewId, property, options = {}) {
    const hubView = this._viewConfigs.get(hubViewId);
    if (!hubView) {
      throw new Error(`Cannot create sync group: hub view ${hubViewId} not found`);
    }
    
    if (!LINKABLE_PROPERTIES.includes(property)) {
      throw new Error(`Cannot create sync group for unknown property: ${property}`);
    }
    
    // Check if view is already in a group for this property
    const existingGroupId = this._getViewSyncGroupId(hubViewId, property);
    if (existingGroupId) {
      throw new Error(`View ${hubViewId} is already in sync group ${existingGroupId} for ${property}`);
    }
    
    // Create the sync group
    const group = new SyncGroup({
      property,
      hubViewId,
      hubServerId: hubView.serverId,
      hubOwnerUserId: hubView.ownerUserId,
      hubOwnerUserName: hubView.ownerUserName,
      hubViewName: hubView.name,
      hubElectionStrategy: options.hubElectionStrategy,
    });
    
    // Store the group
    this._syncGroups.get(property).set(group.id, group);
    
    // Update index
    this._setViewSyncGroupId(hubViewId, property, group.id);
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.CREATED, {
      groupId: group.id,
      property,
      hubViewId,
      hubViewName: hubView.name,
    });
    
    log.debug(`Created sync group ${group.id} for ${property} with hub ${hubViewId}`);
    
    return group;
  }
  
  // ===========================================================================
  // SYNC GROUP MEMBERSHIP
  // ===========================================================================
  
  /**
   * Join a view to an existing sync group
   * 
   * @param {string} viewId - View to join
   * @param {string} property - Property being synced
   * @param {string} groupId - ID of the group to join
   * @param {string} mode - Link mode (FOLLOW, BIDIRECTIONAL, BROADCAST)
   * @returns {SyncGroupMembership} The membership record
   */
  joinSyncGroup(viewId, property, groupId, mode = LINK_MODES.BIDIRECTIONAL) {
    const view = this._viewConfigs.get(viewId);
    if (!view) {
      throw new Error(`Cannot join sync group: view ${viewId} not found`);
    }
    
    const group = this._syncGroups.get(property)?.get(groupId);
    if (!group) {
      throw new Error(`Sync group ${groupId} not found for property ${property}`);
    }
    
    // Check if already in this group
    if (group.hasView(viewId)) {
      throw new Error(`View ${viewId} is already in sync group ${groupId}`);
    }
    
    // Check if in another group for this property
    const existingGroupId = this._getViewSyncGroupId(viewId, property);
    if (existingGroupId) {
      // Auto-leave the existing group
      this.leaveSyncGroup(viewId, property);
    }
    
    // Add to group
    const membership = group.addMember(viewId, mode, {
      viewName: view.name,
      ownerUserId: view.ownerUserId,
      ownerUserName: view.ownerUserName,
    });
    
    // Update the view's link configuration
    view.linkProperty(property, this._viewConfigs.get(group.hubViewId), mode);
    
    // Update index
    this._setViewSyncGroupId(viewId, property, groupId);
    
    // Apply initial state from hub if following
    if (mode === LINK_MODES.FOLLOW || mode === LINK_MODES.BIDIRECTIONAL) {
      const hubView = this._viewConfigs.get(group.hubViewId);
      if (hubView) {
        this._applyLinkedProperty(view, property, hubView);
      }
    }
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.MEMBER_JOINED, {
      groupId,
      property,
      viewId,
      viewName: view.name,
      mode,
      totalMembers: group.getTotalCount(),
    });
    
    log.debug(`View ${viewId} joined sync group ${groupId} for ${property} with mode ${mode}`);
    
    return membership;
  }
  
  /**
   * Leave a sync group
   * 
   * @param {string} viewId - View to remove
   * @param {string} property - Property being synced
   * @returns {boolean} Whether the view was removed
   */
  leaveSyncGroup(viewId, property) {
    const groupId = this._getViewSyncGroupId(viewId, property);
    if (!groupId) {
      log.warn(`View ${viewId} is not in a sync group for ${property}`);
      return false;
    }
    
    const group = this._syncGroups.get(property)?.get(groupId);
    if (!group) {
      // Clean up stale index entry
      this._clearViewSyncGroupId(viewId, property);
      return false;
    }
    
    const view = this._viewConfigs.get(viewId);
    
    // Check if this view is the hub
    if (group.isHub(viewId)) {
      return this._handleHubLeaving(group, property);
    }
    
    // Remove from group
    group.removeMember(viewId);
    
    // Clear the view's link configuration
    if (view) {
      view.unlinkProperty(property);
    }
    
    // Update index
    this._clearViewSyncGroupId(viewId, property);
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.MEMBER_LEFT, {
      groupId,
      property,
      viewId,
      viewName: view?.name,
      remainingMembers: group.getTotalCount(),
    });
    
    log.debug(`View ${viewId} left sync group ${groupId} for ${property}`);
    
    return true;
  }
  
  /**
   * Handle when the hub view leaves the group
   * @private
   */
  _handleHubLeaving(group, property) {
    const oldHubId = group.hubViewId;
    
    if (group.getMemberCount() === 0) {
      // No members left, dissolve the group
      return this._dissolveSyncGroup(group, property, 'hub_left_no_members');
    }
    
    // Elect new hub
    const newHubId = group.electNewHub();
    
    if (!newHubId) {
      // Manual election required
      this._emit(SYNC_GROUP_EVENTS.HUB_ELECTION_REQUIRED, {
        groupId: group.id,
        property,
        previousHubId: oldHubId,
        candidates: Array.from(group.members.keys()),
      });
      
      group.state = SYNC_GROUP_STATE.DEGRADED;
      group.stateReason = 'hub_election_required';
      return true;
    }
    
    // Update links for all members to point to new hub
    const newHubView = this._viewConfigs.get(newHubId);
    for (const [memberId, membership] of group.members) {
      const memberView = this._viewConfigs.get(memberId);
      if (memberView && memberId !== newHubId) {
        memberView.linkProperty(property, newHubView, membership.mode);
      }
    }
    
    // Clear old hub's index entry
    this._clearViewSyncGroupId(oldHubId, property);
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.HUB_CHANGED, {
      groupId: group.id,
      property,
      previousHubId: oldHubId,
      newHubId,
      newHubName: newHubView?.name,
      reason: 'previous_hub_left',
    });
    
    log.debug(`Hub for sync group ${group.id} changed from ${oldHubId} to ${newHubId}`);
    
    return true;
  }
  
  /**
   * Dissolve a sync group
   * @private
   */
  _dissolveSyncGroup(group, property, reason) {
    const groupId = group.id;
    
    // Clear all members' link configurations
    for (const viewId of group.getAllViewIds()) {
      const view = this._viewConfigs.get(viewId);
      if (view) {
        view.unlinkProperty(property);
      }
      this._clearViewSyncGroupId(viewId, property);
    }
    
    // Remove the group
    this._syncGroups.get(property).delete(groupId);
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.DISSOLVED, {
      groupId,
      property,
      reason,
    });
    
    log.debug(`Sync group ${groupId} dissolved: ${reason}`);
    
    return true;
  }
  
  // ===========================================================================
  // SYNC GROUP QUERIES
  // ===========================================================================
  
  /**
   * Get the sync group a view belongs to for a property
   * 
   * @param {string} viewId
   * @param {string} property
   * @returns {SyncGroup|null}
   */
  getSyncGroup(viewId, property) {
    const groupId = this._getViewSyncGroupId(viewId, property);
    if (!groupId) return null;
    return this._syncGroups.get(property)?.get(groupId) || null;
  }
  
  /**
   * Get all members of a view's sync group for a property
   * 
   * @param {string} viewId
   * @param {string} property
   * @returns {Array<{viewId, viewName, mode, isHub}>}
   */
  getSyncGroupMembers(viewId, property) {
    const group = this.getSyncGroup(viewId, property);
    if (!group) return [];
    
    const members = [];
    
    // Add hub
    const hubView = this._viewConfigs.get(group.hubViewId);
    members.push({
      viewId: group.hubViewId,
      viewName: hubView?.name || group.hubViewName,
      ownerUserName: hubView?.ownerUserName || group.hubOwnerUserName,
      mode: null,
      isHub: true,
      role: SYNC_GROUP_ROLE.HUB,
    });
    
    // Add members
    for (const [memberId, membership] of group.members) {
      const memberView = this._viewConfigs.get(memberId);
      members.push({
        viewId: memberId,
        viewName: memberView?.name || membership.viewName,
        ownerUserName: memberView?.ownerUserName || membership.ownerUserName,
        mode: membership.mode,
        isHub: false,
        role: SYNC_GROUP_ROLE.MEMBER,
      });
    }
    
    return members;
  }
  
  /**
   * Get the hub view ID for a sync group
   * 
   * @param {string} viewId
   * @param {string} property
   * @returns {string|null}
   */
  getSyncGroupHub(viewId, property) {
    const group = this.getSyncGroup(viewId, property);
    return group?.hubViewId || null;
  }
  
  /**
   * Check if a view is the hub of its sync group
   * 
   * @param {string} viewId
   * @param {string} property
   * @returns {boolean}
   */
  isViewHub(viewId, property) {
    const group = this.getSyncGroup(viewId, property);
    return group?.isHub(viewId) || false;
  }
  
  /**
   * Get all sync groups for all properties
   * 
   * @returns {Map<property, Array<SyncGroup>>}
   */
  getAllSyncGroups() {
    const result = new Map();
    for (const [property, groups] of this._syncGroups) {
      result.set(property, Array.from(groups.values()));
    }
    return result;
  }
  
  /**
   * Get all sync groups a view belongs to
   * 
   * @param {string} viewId
   * @returns {Map<property, SyncGroup>}
   */
  getViewSyncGroups(viewId) {
    const result = new Map();
    const viewIndex = this._viewSyncGroupIndex.get(viewId);
    if (!viewIndex) return result;
    
    for (const [property, groupId] of viewIndex) {
      const group = this._syncGroups.get(property)?.get(groupId);
      if (group) {
        result.set(property, group);
      }
    }
    return result;
  }
  
  // ===========================================================================
  // HIGH-LEVEL LINKING API (Facade over sync groups)
  // ===========================================================================
  
  /**
   * Link a view to another view's sync group (or create new group)
   * 
   * This is the main API that UI should call. It handles:
   * - Creating a new sync group if target isn't in one
   * - Joining existing group if target is in one
   * - Leaving current group if in a different one
   * 
   * @param {string} sourceViewId - View to link (will be member)
   * @param {string} targetViewId - View to link to (will be hub or join its group)
   * @param {string} property - Property to link
   * @param {string} mode - Link mode
   * @returns {SyncGroup} The sync group
   */
  linkViewToView(sourceViewId, targetViewId, property, mode = LINK_MODES.BIDIRECTIONAL) {
    if (sourceViewId === targetViewId) {
      throw new Error('Cannot link a view to itself');
    }
    
    const sourceView = this._viewConfigs.get(sourceViewId);
    const targetView = this._viewConfigs.get(targetViewId);
    
    if (!sourceView || !targetView) {
      throw new Error('Source or target view not found');
    }
    
    // Check if target is already in a sync group
    let group = this.getSyncGroup(targetViewId, property);
    
    if (group) {
      // Join the existing group
      this.joinSyncGroup(sourceViewId, property, group.id, mode);
    } else {
      // Create new group with target as hub
      group = this.createSyncGroup(targetViewId, property);
      // Add source as member
      this.joinSyncGroup(sourceViewId, property, group.id, mode);
    }
    
    return group;
  }
  
  /**
   * Link all properties from one view to another
   * 
   * @param {string} sourceViewId
   * @param {string} targetViewId
   * @param {string} mode
   * @returns {Map<property, SyncGroup>}
   */
  linkAllProperties(sourceViewId, targetViewId, mode = LINK_MODES.BIDIRECTIONAL) {
    const groups = new Map();
    
    for (const property of LINKABLE_PROPERTIES) {
      try {
        const group = this.linkViewToView(sourceViewId, targetViewId, property, mode);
        groups.set(property, group);
      } catch (error) {
        log.error(`Failed to link ${property}: ${error.message}`);
      }
    }
    
    return groups;
  }
  
  /**
   * Unlink a view from all sync groups
   * 
   * @param {string} viewId
   * @returns {number} Number of groups left
   */
  unlinkAllProperties(viewId) {
    let count = 0;
    
    for (const property of LINKABLE_PROPERTIES) {
      if (this.leaveSyncGroup(viewId, property)) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Change a member's mode in their sync group
   * 
   * @param {string} viewId
   * @param {string} property
   * @param {string} newMode
   */
  changeLinkMode(viewId, property, newMode) {
    const group = this.getSyncGroup(viewId, property);
    if (!group) {
      throw new Error(`View ${viewId} is not in a sync group for ${property}`);
    }
    
    if (group.isHub(viewId)) {
      throw new Error('Cannot change mode of hub view');
    }
    
    group.updateMemberMode(viewId, newMode);
    
    // Update the view's link configuration
    const view = this._viewConfigs.get(viewId);
    const hubView = this._viewConfigs.get(group.hubViewId);
    if (view && hubView) {
      view.links[property].mode = newMode;
    }
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.MEMBER_MODE_CHANGED, {
      groupId: group.id,
      property,
      viewId,
      newMode,
    });
  }
  
  /**
   * Transfer hub status to another view in the group
   * 
   * @param {string} viewId - Current hub or member requesting transfer
   * @param {string} property
   * @param {string} newHubId
   */
  transferHubTo(viewId, property, newHubId) {
    const group = this.getSyncGroup(viewId, property);
    if (!group) {
      throw new Error(`View ${viewId} is not in a sync group for ${property}`);
    }
    
    if (!group.hasView(newHubId)) {
      throw new Error(`View ${newHubId} is not in the same sync group`);
    }
    
    if (group.hubViewId === newHubId) {
      return; // Already the hub
    }
    
    const oldHubId = group.hubViewId;
    const newHubView = this._viewConfigs.get(newHubId);
    
    group.transferHub(newHubId, {
      serverId: newHubView?.serverId,
      ownerUserId: newHubView?.ownerUserId,
      ownerUserName: newHubView?.ownerUserName,
      viewName: newHubView?.name,
    });
    
    // Update all member links to point to new hub
    for (const [memberId, membership] of group.members) {
      const memberView = this._viewConfigs.get(memberId);
      if (memberView) {
        memberView.linkProperty(property, newHubView, membership.mode);
      }
    }
    
    // Update index
    this._clearViewSyncGroupId(oldHubId, property);
    this._setViewSyncGroupId(oldHubId, property, group.id); // Now a member
    this._setViewSyncGroupId(newHubId, property, group.id); // Now the hub
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.HUB_CHANGED, {
      groupId: group.id,
      property,
      previousHubId: oldHubId,
      newHubId,
      newHubName: newHubView?.name,
      reason: 'manual_transfer',
    });
  }
  
  // ===========================================================================
  // SYNC PROPAGATION
  // ===========================================================================
  
  /**
   * Propagate a property change through the sync group
   * Called when a view's property changes
   * 
   * @param {string} viewId - View that changed
   * @param {string} property - Property that changed
   * @param {any} newValue - New value
   */
  propagateSyncChange(viewId, property, newValue) {
    const group = this.getSyncGroup(viewId, property);
    if (!group || group.state !== SYNC_GROUP_STATE.ACTIVE) {
      return;
    }
    
    const changingView = this._viewConfigs.get(viewId);
    if (!changingView) return;
    
    const isHub = group.isHub(viewId);
    const membership = group.getMember(viewId);
    
    // Determine which views should receive this change
    const viewsToUpdate = [];
    
    if (isHub) {
      // Hub broadcasts to all members
      for (const [memberId, memberConfig] of group.members) {
        // Only update members in FOLLOW or BIDIRECTIONAL mode
        if (memberConfig.mode === LINK_MODES.FOLLOW || 
            memberConfig.mode === LINK_MODES.BIDIRECTIONAL) {
          viewsToUpdate.push(memberId);
        }
      }
    } else {
      // Member change
      const mode = membership.mode;
      
      if (mode === LINK_MODES.BIDIRECTIONAL || mode === LINK_MODES.BROADCAST) {
        // Update hub
        viewsToUpdate.push(group.hubViewId);
        
        // If bidirectional, hub will then propagate to other members
        // This is handled by the hub's change triggering another propagate
      }
    }
    
    // Apply changes
    for (const targetViewId of viewsToUpdate) {
      const targetView = this._viewConfigs.get(targetViewId);
      if (targetView) {
        this._applyLinkedProperty(targetView, property, changingView);
        
        // Update sync timestamps
        const targetMembership = group.getMember(targetViewId);
        if (targetMembership && targetMembership.role === SYNC_GROUP_ROLE.MEMBER) {
          targetMembership.lastSyncAt = Date.now();
        }
      }
    }
    
    group.lastSyncAt = Date.now();
    
    // Emit event
    this._emit(SYNC_GROUP_EVENTS.SYNC_PROPAGATED, {
      groupId: group.id,
      property,
      sourceViewId: viewId,
      targetViewIds: viewsToUpdate,
      sourceName: changingView.name,
      sourceOwnerName: changingView.ownerUserName,
    });
  }
  
  // ===========================================================================
  // INDEX HELPERS
  // ===========================================================================
  
  /**
   * Get sync group ID for a view/property
   * @private
   */
  _getViewSyncGroupId(viewId, property) {
    return this._viewSyncGroupIndex.get(viewId)?.get(property) || null;
  }
  
  /**
   * Set sync group ID for a view/property
   * @private
   */
  _setViewSyncGroupId(viewId, property, groupId) {
    if (!this._viewSyncGroupIndex.has(viewId)) {
      this._viewSyncGroupIndex.set(viewId, new Map());
    }
    this._viewSyncGroupIndex.get(viewId).set(property, groupId);
  }
  
  /**
   * Clear sync group ID for a view/property
   * @private
   */
  _clearViewSyncGroupId(viewId, property) {
    const viewIndex = this._viewSyncGroupIndex.get(viewId);
    if (viewIndex) {
      viewIndex.delete(property);
      if (viewIndex.size === 0) {
        this._viewSyncGroupIndex.delete(viewId);
      }
    }
  }
  
  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================
  
  /**
   * Serialize all sync groups for storage
   */
  serializeSyncGroups() {
    const data = {};
    for (const [property, groups] of this._syncGroups) {
      data[property] = Array.from(groups.values()).map(g => g.toJSON());
    }
    return data;
  }
  
  /**
   * Restore sync groups from storage
   */
  deserializeSyncGroups(data) {
    for (const [property, groups] of Object.entries(data)) {
      const groupMap = this._syncGroups.get(property);
      if (!groupMap) continue;
      
      for (const groupJson of groups) {
        const group = SyncGroup.fromJSON(groupJson);
        groupMap.set(group.id, group);
        
        // Rebuild index
        this._setViewSyncGroupId(group.hubViewId, property, group.id);
        for (const [memberId] of group.members) {
          this._setViewSyncGroupId(memberId, property, group.id);
        }
      }
    }
  }
}

// =============================================================================
// PART 5: MIGRATION FROM POINT-TO-POINT
// =============================================================================

/**
 * Migration utility to convert existing point-to-point links to sync groups
 * 
 * Run this once after deploying the hub model.
 */
export function migrateToSyncGroups(viewConfigurationManager) {
  const vcm = viewConfigurationManager;
  const migrated = { groups: 0, links: 0 };
  
  // Get all views
  const views = vcm.getAllViews();
  
  // Track which links we've already processed
  const processedLinks = new Set();
  
  for (const view of views) {
    for (const property of LINKABLE_PROPERTIES) {
      const link = view.links[property];
      if (!link || !link.targetViewId) continue;
      
      // Create a unique key for this link relationship
      const linkKey = [view.id, link.targetViewId, property].sort().join('|');
      if (processedLinks.has(linkKey)) continue;
      processedLinks.add(linkKey);
      
      // Check if target already has a sync group for this property
      const existingGroup = vcm.getSyncGroup(link.targetViewId, property);
      
      if (existingGroup) {
        // Join existing group
        vcm.joinSyncGroup(view.id, property, existingGroup.id, link.mode);
        migrated.links++;
      } else {
        // Create new group with target as hub
        vcm.createSyncGroup(link.targetViewId, property);
        const group = vcm.getSyncGroup(link.targetViewId, property);
        vcm.joinSyncGroup(view.id, property, group.id, link.mode);
        migrated.groups++;
        migrated.links++;
      }
    }
  }
  
  log.info(`Migration complete: ${migrated.groups} groups created, ${migrated.links} links migrated`);
  return migrated;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  SyncGroup,
  SyncGroupMembership,
  SYNC_GROUP_ROLE,
  SYNC_GROUP_STATE,
  HUB_ELECTION_STRATEGY,
  SYNC_GROUP_EVENTS,
  ViewConfigurationManagerExtensions,
  migrateToSyncGroups,
};
