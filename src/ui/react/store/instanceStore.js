// src/ui/react/store/instanceStore.js
// Zustand store for viewport instances
// Each instance is a view of a dataset with its own camera, filters, etc.

import { create } from "zustand";

import { generateInstanceId } from "@Utils/idGenerator.js";

/**
 * Instance Store
 *
 * Manages viewport instances - individual views of datasets.
 * Multiple instances can view the same dataset with different settings.
 *
 * Instance Structure:
 * {
 *   id: string,              // Unique instance ID
 *   datasetId: string,       // Which dataset this instance is viewing
 *   userId: string,          // User who owns this instance
 *   userName: string,        // User's display name
 *   type: "desktop" | "vr",  // Instance type
 *   visibility: "private" | "shared",  // Can others see this?
 *
 *   // Camera state (instance-specific)
 *   camera: {
 *     position: [x, y, z],
 *     focalPoint: [x, y, z],
 *     viewUp: [x, y, z],
 *     viewAngle: number
 *   },
 *
 *   // Filters applied to this instance
 *   filters: [{
 *     type: "clip" | "threshold" | "contour",
 *     params: {...}
 *   }],
 *
 *   // Widgets active in this instance
 *   widgets: [{
 *     type: "clipPlane" | "ruler" | "picker",
 *     state: {...}
 *   }],
 *
 *   // Linking to other instances
 *   linkedTo: string[],      // Array of instance IDs
 *   linkMode: "camera" | "cursor" | "both",
 *
 *   // Cursor position for cursor mirroring
 *   cursor: {
 *     position: [x, y, z] | null,
 *     visible: boolean
 *   },
 *
 *   // Metadata
 *   createdAt: number,
 *   lastActive: number
 * }
 */

/**
 * Get default camera configuration
 */
function getDefaultCamera() {
  return {
    position: [0, 0, 10],
    focalPoint: [0, 0, 0],
    viewUp: [0, 1, 0],
    viewAngle: 30,
  };
}

export const useInstanceStore = create((set, get) => ({
  // Map of instance ID -> instance config
  instances: new Map(),

  // Currently active instance (in single-viewport mode)
  activeInstanceId: null,

  /**
   * Create a new instance
   *
   * @param {Object} config - Instance configuration
   * @returns {string} Instance ID
   */
  createInstance: (config) => {
    const id = config.id || generateInstanceId();

    const instance = {
      id,
      datasetId: config.datasetId,
      userId: config.userId,
      userName: config.userName,
      type: config.type || "desktop",
      visibility: config.visibility || "shared",
      camera: config.camera || getDefaultCamera(),
      filters: config.filters || [],
      widgets: config.widgets || [],
      linkedTo: config.linkedTo || [],
      linkMode: config.linkMode || "both",
      cursor: config.cursor || { position: null, visible: false },
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    set((state) => {
      const newInstances = new Map(state.instances);
      newInstances.set(id, instance);

      console.log(`✅ Instance created: ${id} (${instance.type})`);

      return {
        instances: newInstances,
        // Set as active if no active instance yet
        activeInstanceId: state.activeInstanceId || id,
      };
    });

    return id;
  },

  /**
   * Get a specific instance by ID
   *
   * @param {string} id - Instance ID
   * @returns {Object|undefined} Instance or undefined
   */
  getInstance: (id) => {
    return get().instances.get(id);
  },

  /**
   * Get the currently active instance
   *
   * @returns {Object|undefined} Active instance
   */
  getActiveInstance: () => {
    const state = get();
    return state.instances.get(state.activeInstanceId);
  },

  /**
   * Set the active instance
   *
   * @param {string} id - Instance ID to make active
   */
  setActiveInstance: (id) => {
    const instance = get().instances.get(id);
    if (instance) {
      set({ activeInstanceId: id });
      console.log(`✅ Active instance set to: ${id}`);
    } else {
      console.warn(`⚠️  Cannot set active instance: ${id} not found`);
    }
  },

  /**
   * Update instance camera
   *
   * @param {string} id - Instance ID
   * @param {Object} camera - New camera state
   */
  updateInstanceCamera: (id, camera) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot update camera: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        camera,
        lastActive: Date.now(),
      });

      return { instances: newInstances };
    });
  },

  /**
   * Update instance cursor position
   *
   * @param {string} id - Instance ID
   * @param {Array|null} position - Cursor position [x, y, z] or null
   * @param {boolean} visible - Cursor visibility
   */
  updateInstanceCursor: (id, position, visible = true) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot update cursor: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        cursor: { position, visible },
        lastActive: Date.now(),
      });

      return { instances: newInstances };
    });
  },

  /**
   * Update instance filters
   *
   * @param {string} id - Instance ID
   * @param {Array} filters - New filters array
   */
  updateInstanceFilters: (id, filters) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot update filters: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        filters,
        lastActive: Date.now(),
      });

      console.log(
        `✅ Filters updated for instance: ${id} (${filters.length} filters)`
      );
      return { instances: newInstances };
    });
  },

  /**
   * Add a filter to an instance
   *
   * @param {string} id - Instance ID
   * @param {Object} filter - Filter to add
   */
  addInstanceFilter: (id, filter) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot add filter: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        filters: [...instance.filters, filter],
        lastActive: Date.now(),
      });

      console.log(`✅ Filter added to instance: ${id}`);
      return { instances: newInstances };
    });
  },

  /**
   * Update instance widgets
   *
   * @param {string} id - Instance ID
   * @param {Array} widgets - New widgets array
   */
  updateInstanceWidgets: (id, widgets) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot update widgets: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        widgets,
        lastActive: Date.now(),
      });

      console.log(
        `✅ Widgets updated for instance: ${id} (${widgets.length} widgets)`
      );
      return { instances: newInstances };
    });
  },

  /**
   * Link instances together
   *
   * @param {string} id - Instance ID
   * @param {string[]} linkedIds - Array of instance IDs to link to
   * @param {string} linkMode - "camera" | "cursor" | "both"
   */
  linkInstances: (id, linkedIds, linkMode = "both") => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot link instances: instance ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        linkedTo: linkedIds,
        linkMode,
      });

      console.log(`✅ Instance linked: ${id} → [${linkedIds.join(", ")}]`);
      return { instances: newInstances };
    });
  },

  /**
   * Get all instances viewing a specific dataset
   *
   * @param {string} datasetId - Dataset ID
   * @returns {Array} Array of instances
   */
  getInstancesByDataset: (datasetId) => {
    const instances = Array.from(get().instances.values());
    return instances.filter((inst) => inst.datasetId === datasetId);
  },

  /**
   * Get all instances owned by a user
   *
   * @param {string} userId - User ID
   * @returns {Array} Array of instances
   */
  getInstancesByUser: (userId) => {
    const instances = Array.from(get().instances.values());
    return instances.filter((inst) => inst.userId === userId);
  },

  /**
   * Get all instances linked to a specific instance
   *
   * @param {string} id - Instance ID
   * @returns {Array} Array of linked instances
   */
  getLinkedInstances: (id) => {
    const instance = get().instances.get(id);
    if (!instance) return [];

    return instance.linkedTo
      .map((linkedId) => get().instances.get(linkedId))
      .filter(Boolean); // Remove any undefined instances
  },

  /**
   * Update entire instance
   * Useful for syncing from Y.js
   *
   * @param {string} id - Instance ID
   * @param {Object} updates - Partial instance data to update
   */
  updateInstance: (id, updates) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        // If instance doesn't exist, create it (from Y.js sync)
        const newInstances = new Map(state.instances);
        newInstances.set(id, {
          id,
          ...updates,
          lastActive: Date.now(),
        });

        console.log(`✅ Instance created from sync: ${id}`);
        return { instances: newInstances };
      }

      const newInstances = new Map(state.instances);
      newInstances.set(id, {
        ...instance,
        ...updates,
        lastActive: Date.now(),
      });

      return { instances: newInstances };
    });
  },

  /**
   * Remove an instance
   *
   * @param {string} id - Instance ID to remove
   */
  removeInstance: (id) => {
    set((state) => {
      const instance = state.instances.get(id);
      if (!instance) {
        console.warn(`⚠️  Cannot remove instance: ${id} not found`);
        return state;
      }

      const newInstances = new Map(state.instances);
      newInstances.delete(id);

      console.log(`✅ Instance removed: ${id}`);

      // If we removed the active instance, switch to another
      const newActiveId =
        state.activeInstanceId === id
          ? newInstances.size > 0
            ? newInstances.keys().next().value
            : null
          : state.activeInstanceId;

      return {
        instances: newInstances,
        activeInstanceId: newActiveId,
      };
    });
  },

  /**
   * Get all instances as an array
   *
   * @returns {Array} Array of instances
   */
  getAllInstances: () => {
    return Array.from(get().instances.values());
  },

  /**
   * Get instance count
   *
   * @returns {number} Number of instances
   */
  getInstanceCount: () => {
    return get().instances.size;
  },

  /**
   * Check if instance exists
   *
   * @param {string} id - Instance ID
   * @returns {boolean} True if exists
   */
  hasInstance: (id) => {
    return get().instances.has(id);
  },

  /**
   * Clear all instances
   * WARNING: Removes all instances from store
   */
  clearAll: () => {
    set({
      instances: new Map(),
      activeInstanceId: null,
    });
    console.log("✅ All instances cleared from store");
  },
}));
