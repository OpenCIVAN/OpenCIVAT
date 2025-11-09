// src/core/annotationState.js
// Shared state for annotation mode
// Can be used by both vanilla JS and React hooks

class AnnotationModeState {
  constructor() {
    this.isAnnotationMode = false;
    this.annotationType = "note"; // "note", "warning", "info", "measurement"
    this.listeners = [];
  }

  // Check if annotation mode is active
  isActive() {
    return this.isAnnotationMode;
  }

  // Enter annotation mode
  enable(type = "note") {
    if (!this.isAnnotationMode || this.annotationType !== type) {
      this.isAnnotationMode = true;
      this.annotationType = type;
      this.notifyListeners();
      console.log(`📍 Annotation mode enabled: ${type}`);
    }
  }

  // Exit annotation mode
  disable() {
    if (this.isAnnotationMode) {
      this.isAnnotationMode = false;
      this.notifyListeners();
      console.log("📍 Annotation mode disabled");
    }
  }

  // Toggle annotation mode
  toggle(type = "note") {
    if (this.isAnnotationMode) {
      this.disable();
    } else {
      this.enable(type);
    }
  }

  // Get current annotation type
  getType() {
    return this.annotationType;
  }

  // Listen for changes
  onChange(callback) {
    this.listeners.push(callback);
  }

  // Stop listening
  offChange(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in annotation mode listener:", error);
      }
    });
  }
}

// Export singleton instance
export const annotationModeState = new AnnotationModeState();

// Export convenience functions for backwards compatibility
export const isAnnotationMode = () => annotationModeState.isActive();
export const enableAnnotationMode = (type) => annotationModeState.enable(type);
export const disableAnnotationMode = () => annotationModeState.disable();
export const toggleAnnotationMode = (type) => annotationModeState.toggle(type);
export const getAnnotationType = () => annotationModeState.getType();

export function promptForAnnotationText(position) {
  console.log("📍 Showing annotation modal for position:", position);

  // Let the global handler take care of modals
  if (window.showAnnotationModal) {
    window.showAnnotationModal(position);
  } else {
    console.error("❌ window.showAnnotationModal not available");
  }
}
