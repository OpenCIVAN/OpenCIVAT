// src/collaboration/perInstance/instanceCollaboration.js
// Per-instance collaboration features (annotations, cursors)

import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";

import { ydoc, yAnnotations, yCursors } from "@Collaboration/yjs/yjsSetup.js";
import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";

/**
 * InstanceCollaborationManager
 *
 * Manages collaborative features (annotations, cursors) per VTK instance
 */
class InstanceCollaborationManager {
  constructor() {
    this.instanceManagers = new Map(); // instanceId -> manager
    this.cursorElements = new Map(); // userId -> DOM element
    this._initialized = false;
  }

  /**
   * Initialize collaboration for a specific instance
   */
  initializeForInstance(instanceId, sceneObjects) {
    if (this.instanceManagers.has(instanceId)) {
      console.warn(
        `⚠️ Collaboration already initialized for instance: ${instanceId}`
      );
      return;
    }

    console.log(`🤝 Initializing collaboration for instance: ${instanceId}`);

    const manager = {
      instanceId,
      sceneObjects,
      annotations: new Map(), // annotationId -> VTK actor
      annotationPicker: null,
      cursorTracking: false,
      localCursor: null,
    };

    // Set up annotation system for this instance
    this.setupInstanceAnnotations(manager);

    // Set up cursor system for this instance
    this.setupInstanceCursors(manager);

    // Store the manager
    this.instanceManagers.set(instanceId, manager);

    console.log(`✅ Collaboration initialized for instance: ${instanceId}`);
  }

  /**
   * Setup annotation system for an instance
   */
  setupInstanceAnnotations(manager) {
    const { instanceId, sceneObjects } = manager;
    const { renderer, renderWindow, interactor } = sceneObjects;

    // Create a picker for annotations
    const picker = vtkCellPicker.newInstance();
    picker.setPickFromList(true);
    picker.initializePickList();
    manager.annotationPicker = picker;

    // Listen for annotation clicks in this instance
    interactor.onLeftButtonPress((callData) => {
      const pos = callData.position;
      const point = [pos.x, pos.y, 0];

      // Convert screen to world coordinates
      picker.pick(point, renderer);
      const worldPos = picker.getPickPosition();

      // Check if we're in annotation mode
      if (this.isAnnotationMode(instanceId)) {
        this.createAnnotationAtPoint(instanceId, worldPos);
      }
    });

    // Listen for global annotation changes
    this.observeAnnotations(instanceId);

    console.log(`   ✅ Annotations setup for instance: ${instanceId}`);
  }

  /**
   * Setup cursor system for an instance
   */
  setupInstanceCursors(manager) {
    const { instanceId, sceneObjects } = manager;
    const { container, interactor } = sceneObjects;

    // Track mouse movement in this instance
    let mouseTimeout = null;

    container.addEventListener("mousemove", (event) => {
      if (!manager.cursorTracking) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Normalize to 0-1 range
      const normalizedX = x / rect.width;
      const normalizedY = y / rect.height;

      // Broadcast cursor position with instance context
      this.broadcastCursorPosition(instanceId, normalizedX, normalizedY);

      // Clear timeout and set new one for cursor hiding
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        this.hideCursor(instanceId);
      }, 5000);
    });

    // Hide cursor when leaving the container
    container.addEventListener("mouseleave", () => {
      this.hideCursor(instanceId);
    });

    // Listen for remote cursor updates
    this.observeCursors(instanceId);

    console.log(`   ✅ Cursors setup for instance: ${instanceId}`);
  }

  /**
   * Observe annotation changes from Y.js
   */
  observeAnnotations(instanceId) {
    // Get the manager for this instance
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    // Listen to annotation changes
    yAnnotations.observe((event) => {
      event.changes.keys.forEach((change, datasetId) => {
        // Check if this instance is showing this dataset
        const {
          workspaceManager,
        } = require("@Core/instances/workspaceManager.js");
        const instance = workspaceManager.getInstance(instanceId);

        if (instance && instance.datasetId === datasetId) {
          const annotations = yAnnotations.get(datasetId);
          if (annotations) {
            this.renderAnnotations(instanceId, annotations);
          }
        }
      });
    });
  }

  /**
   * Observe cursor changes from Y.js
   */
  observeCursors(instanceId) {
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    yCursors.observe((event) => {
      event.changes.keys.forEach((change, userId) => {
        // Skip own cursor
        if (userId === getUserId()) return;

        const cursorData = yCursors.get(userId);
        if (cursorData && cursorData.instanceId === instanceId) {
          // Show remote cursor in this instance
          this.showRemoteCursor(instanceId, userId, cursorData);
        } else {
          // Hide cursor if not in this instance
          this.hideRemoteCursor(userId);
        }
      });
    });
  }

  /**
   * Render annotations in an instance
   */
  renderAnnotations(instanceId, annotations) {
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    const { sceneObjects, annotations: annotationActors } = manager;
    const { renderer, renderWindow } = sceneObjects;

    // Clear existing annotation actors
    annotationActors.forEach((actor) => {
      renderer.removeActor(actor);
    });
    annotationActors.clear();

    // Create actors for each annotation
    annotations.forEach((annotation) => {
      const actor = this.createAnnotationActor(annotation);
      if (actor) {
        renderer.addActor(actor);
        annotationActors.set(annotation.id, actor);

        // Add to picker list
        if (manager.annotationPicker) {
          manager.annotationPicker.addPickList(actor);
        }
      }
    });

    renderWindow.render();
    console.log(
      `   Rendered ${annotations.length} annotations in instance ${instanceId}`
    );
  }

  /**
   * Create a VTK actor for an annotation
   */
  createAnnotationActor(annotation) {
    // Create a sphere at the annotation position
    const sphereSource = vtkSphereSource.newInstance({
      center: [
        annotation.position.x,
        annotation.position.y,
        annotation.position.z,
      ],
      radius: 2.0, // Adjust size as needed
      phiResolution: 16,
      thetaResolution: 16,
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(sphereSource.getOutputPort());

    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);

    // Set color based on annotation type
    const colors = {
      note: [1, 1, 0], // Yellow
      question: [1, 0.5, 0], // Orange
      issue: [1, 0, 0], // Red
      insight: [0, 1, 0], // Green
    };

    const color = colors[annotation.type] || [1, 1, 1];
    actor.getProperty().setColor(...color);
    actor.getProperty().setOpacity(0.8);

    // Store annotation data on actor for later reference
    actor.annotationData = annotation;

    return actor;
  }

  /**
   * Create annotation at a world position
   */
  async createAnnotationAtPoint(instanceId, worldPos) {
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    // Get current dataset for this instance
    const { workspaceManager } = require("@Core/instances/workspaceManager.js");
    const instance = workspaceManager.getInstance(instanceId);

    if (!instance || !instance.datasetId) {
      console.warn("No dataset loaded in this instance");
      return;
    }

    // Show annotation dialog (you can replace with your UI)
    const text = prompt("Enter annotation text:");
    if (!text) return;

    const type = prompt("Enter type (note/question/issue/insight):", "note");

    // Create the annotation
    const annotation = annotationSystem.createAnnotation(
      worldPos,
      text,
      type,
      instance.datasetId
    );

    console.log(`✅ Created annotation in instance ${instanceId}`);
  }

  /**
   * Broadcast cursor position
   */
  broadcastCursorPosition(instanceId, x, y) {
    const cursorData = {
      instanceId,
      x,
      y,
      userId: getUserId(),
      userName: getUserName(),
      userColor: getUserColor(getUserId()),
      timestamp: Date.now(),
    };

    yCursors.set(getUserId(), cursorData);
  }

  /**
   * Hide cursor
   */
  hideCursor(instanceId) {
    yCursors.delete(getUserId());
  }

  /**
   * Show remote cursor
   */
  showRemoteCursor(instanceId, userId, cursorData) {
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    const { container } = manager.sceneObjects;

    // Get or create cursor element
    let cursorEl = this.cursorElements.get(userId);
    if (!cursorEl) {
      cursorEl = this.createCursorElement(userId, cursorData);
      this.cursorElements.set(userId, cursorEl);
      container.appendChild(cursorEl);
    }

    // Update position
    const rect = container.getBoundingClientRect();
    const x = cursorData.x * rect.width;
    const y = cursorData.y * rect.height;

    cursorEl.style.left = `${x}px`;
    cursorEl.style.top = `${y}px`;
    cursorEl.style.display = "block";
  }

  /**
   * Hide remote cursor
   */
  hideRemoteCursor(userId) {
    const cursorEl = this.cursorElements.get(userId);
    if (cursorEl) {
      cursorEl.style.display = "none";
    }
  }

  /**
   * Create cursor DOM element
   */
  createCursorElement(userId, cursorData) {
    const cursor = document.createElement("div");
    cursor.className = "remote-cursor";
    cursor.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: ${cursorData.userColor};
            border: 2px solid white;
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
            transition: all 0.1s ease;
        `;

    // Add name label
    const label = document.createElement("div");
    label.style.cssText = `
            position: absolute;
            top: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            white-space: nowrap;
        `;
    label.textContent = cursorData.userName;
    cursor.appendChild(label);

    return cursor;
  }

  /**
   * Enable/disable annotation mode for an instance
   */
  setAnnotationMode(instanceId, enabled) {
    const manager = this.instanceManagers.get(instanceId);
    if (manager) {
      manager.annotationMode = enabled;
      console.log(
        `Annotation mode ${
          enabled ? "enabled" : "disabled"
        } for instance ${instanceId}`
      );
    }
  }

  /**
   * Check if annotation mode is enabled
   */
  isAnnotationMode(instanceId) {
    const manager = this.instanceManagers.get(instanceId);
    return manager?.annotationMode || false;
  }

  /**
   * Enable/disable cursor tracking for an instance
   */
  setCursorTracking(instanceId, enabled) {
    const manager = this.instanceManagers.get(instanceId);
    if (manager) {
      manager.cursorTracking = enabled;
      console.log(
        `Cursor tracking ${
          enabled ? "enabled" : "disabled"
        } for instance ${instanceId}`
      );
    }
  }

  /**
   * Clean up collaboration for an instance
   */
  cleanupInstance(instanceId) {
    const manager = this.instanceManagers.get(instanceId);
    if (!manager) return;

    console.log(`🧹 Cleaning up collaboration for instance: ${instanceId}`);

    // Remove annotation actors
    if (manager.annotations) {
      manager.annotations.forEach((actor) => {
        manager.sceneObjects.renderer.removeActor(actor);
      });
      manager.annotations.clear();
    }

    // Hide cursor if active
    this.hideCursor(instanceId);

    // Remove from managers
    this.instanceManagers.delete(instanceId);

    console.log(`✅ Collaboration cleaned up for instance: ${instanceId}`);
  }

  /**
   * Get status for debugging
   */
  getStatus() {
    return {
      instances: Array.from(this.instanceManagers.keys()),
      cursors: Array.from(this.cursorElements.keys()),
      annotationCounts: Array.from(this.instanceManagers.entries()).map(
        ([id, m]) => ({
          instanceId: id,
          annotations: m.annotations.size,
        })
      ),
    };
  }
}

// Import required VTK module
import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker";

// Create and export singleton
export const instanceCollaboration = new InstanceCollaborationManager();

// Export for debugging
if (typeof window !== "undefined") {
  window.CIA = window.CIA || {};
  window.CIA.instanceCollaboration = instanceCollaboration;
}
