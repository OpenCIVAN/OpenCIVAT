// src/state/stateManager.js

class StateManager {
  constructor() {
    this.state = {};
    this.reducers = new Map();
    this.middleware = [];
    this.history = [];
    this.subscribers = new Set();
    this.maxHistory = 100;
  }

  // Dispatch actions with automatic history
  dispatch(action) {
    // Run middleware (logging, async, validation)
    let finalAction = action;
    for (const mw of this.middleware) {
      finalAction = mw(this.state)(this.dispatch)(finalAction);
    }

    // Apply reducers
    const prevState = this.state;
    const nextState = this.rootReducer(prevState, finalAction);

    // Store history for undo/redo
    this.history.push({
      action: finalAction,
      prevState,
      nextState,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Update state
    this.state = nextState;

    // Notify subscribers
    this.notifySubscribers(prevState, nextState, finalAction);
  }

  // Time travel for debugging
  jumpToState(index) {
    if (index < 0 || index >= this.history.length) return;

    const entry = this.history[index];
    this.state = entry.nextState;
    this.notifySubscribers(entry.prevState, entry.nextState, {
      type: "TIME_TRAVEL",
      index,
    });
  }
}
