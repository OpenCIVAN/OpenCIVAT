// ----------------------------------------------------------------------------
// Collaborative Annotations System
// ----------------------------------------------------------------------------

import {
  getUserId,
  getUserName,
  getUserColor,
} from "@Collaboration/presence/userManagement.js";
import { ydoc } from "@Collaboration/yjs/yjsSetup.js";
import { generateAnnotationId } from "@Utils/idGenerator.js";

class AnnotationSystem {
  constructor() {
    this.annotations = null;
    this.annotationListeners = [];
    this.selectedAnnotation = null;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Get or create annotations map in Yjs
    this.annotations = ydoc.getMap("annotations");

    // Listen for annotation changes
    this.annotations.observe((event) => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === "add" || change.action === "update") {
          const annotation = this.annotations.get(key);
          console.log("📍 Annotation change detected:", annotation);
          this.notifyListeners("added", annotation);
        } else if (change.action === "delete") {
          this.notifyListeners("deleted", { id: key });
        }
      });
    });

    console.log("📍 Annotation system initialized");
  }

  createAnnotation(position, text, type = "note", datasetId) {
    // ✅ REQUIRE datasetId parameter
    if (!datasetId) {
      console.error("❌ Cannot create annotation without datasetId");
      console.error(
        "   In multi-instance architecture, annotations must be tied to a dataset"
      );
      throw new Error("datasetId is required for createAnnotation");
    }

    const annotation = {
      id: generateAnnotationId(),
      userId: getUserId(),
      userName: getUserName(),
      userColor: getUserColor(getUserId()),
      datasetId: datasetId,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      text: text,
      type: type,
      timestamp: Date.now(),
      visible: true,
    };

    // Add to Yjs map (syncs to all clients)
    this.annotations.set(annotation.id, annotation);

    console.log("📍 Created annotation for dataset:", datasetId);

    return annotation;
  }

  getAnnotationsByDataset(datasetId) {
    return this.getAllAnnotations().filter((a) => a.datasetId === datasetId);
  }

  updateAnnotation(id, updates) {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      console.warn("Annotation not found:", id);
      return;
    }

    // Only allow creator to edit
    if (annotation.userId !== getUserId()) {
      console.warn("Cannot edit annotation created by another user");
      return;
    }

    const updated = {
      ...annotation,
      ...updates,
      lastModified: Date.now(),
    };

    this.annotations.set(id, updated);
    return updated;
  }

  deleteAnnotation(id) {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      console.warn("Annotation not found:", id);
      return;
    }

    // Only allow creator to delete
    if (annotation.userId !== getUserId()) {
      console.warn("Cannot delete annotation created by another user");
      return;
    }

    this.annotations.delete(id);
  }

  getAnnotation(id) {
    return this.annotations.get(id);
  }

  getAllAnnotations() {
    if (!this.annotations) {
      return []; // Return empty array if not initialized yet
    }

    const annotations = [];
    this.annotations.forEach((annotation, id) => {
      annotations.push(annotation);
    });
    return annotations;
  }

  getAnnotationsByUser(userId) {
    return this.getAllAnnotations().filter((a) => a.userId === userId);
  }

  getAnnotationsByType(type) {
    return this.getAllAnnotations().filter((a) => a.type === type);
  }

  clearAllAnnotations() {
    // Only clear own annotations
    const myAnnotations = this.getAnnotationsByUser(getUserId());
    myAnnotations.forEach((annotation) => {
      this.annotations.delete(annotation.id);
    });
  }

  clearAllAnnotationsForEveryone() {
    // Clear all annotations (use with caution!)
    this.annotations.clear();
  }

  toggleAnnotationVisibility(id) {
    const annotation = this.annotations.get(id);
    if (annotation) {
      this.updateAnnotation(id, { visible: !annotation.visible });
    }
  }

  onAnnotationChange(callback) {
    this.annotationListeners.push(callback);
  }

  notifyListeners(action, annotation) {
    this.annotationListeners.forEach((callback) => {
      try {
        callback(action, annotation);
      } catch (error) {
        console.error("Error in annotation listener:", error);
      }
    });
  }

  selectAnnotation(id) {
    this.selectedAnnotation = id;
  }

  getSelectedAnnotation() {
    return this.selectedAnnotation;
  }
}

export const annotationSystem = new AnnotationSystem();
