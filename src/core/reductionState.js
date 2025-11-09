// src/core/reductionState.js
// Shared state for dimensionality reduction
// Can be used by both vanilla JS and React hooks

class ReductionState {
  constructor() {
    this.method = "pca"; // "pca", "tsne", "umap"
    this.components = 3; // 2 or 3
    this.isApplied = false;
    this.listeners = [];
  }

  // Getters
  getMethod() {
    return this.method;
  }

  getComponents() {
    return this.components;
  }

  getIsApplied() {
    return this.isApplied;
  }

  // Setters
  setMethod(method) {
    if (method !== this.method) {
      this.method = method;
      this.notifyListeners();
    }
  }

  setComponents(components) {
    if (components !== this.components) {
      this.components = components;
      this.notifyListeners();
    }
  }

  setIsApplied(applied) {
    if (applied !== this.isApplied) {
      this.isApplied = applied;
      this.notifyListeners();
    }
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
        console.error("Error in reduction state listener:", error);
      }
    });
  }

  // Get all state at once
  getState() {
    return {
      method: this.method,
      components: this.components,
      isApplied: this.isApplied
    };
  }
}

// Export singleton instance
export const reductionState = new ReductionState();

// Export individual functions for convenience
export const getReductionMethod = () => reductionState.getMethod();
export const getReductionComponents = () => reductionState.getComponents();
export const setReductionMethod = (method) => reductionState.setMethod(method);
export const setReductionComponents = (components) => reductionState.setComponents(components);
export const getReductionIsApplied = () => reductionState.getIsApplied();
export const setReductionIsApplied = (applied) => reductionState.setIsApplied(applied);