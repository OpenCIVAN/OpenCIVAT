// src/core/eventBus.js

class EventBus {
  constructor() {
    this.events = new Map();
    this.middleware = [];
    this.history = [];
    this.recording = false;
  }

  // Emit with metadata for debugging/auditing
  emit(event, data, metadata = {}) {
    const eventData = {
      type: event,
      data,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        userId: getUserId(),
        sessionId: getSessionId(),
      },
    };

    // Store for replay/debugging
    if (this.recording) {
      this.history.push(eventData);
    }

    // Run through middleware (auth, validation, logging)
    for (const mw of this.middleware) {
      eventData = mw(eventData);
      if (!eventData) return; // Middleware can cancel events
    }

    // Notify listeners
    const listeners = this.events.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(eventData);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  // Time-travel debugging
  replay(fromTime, toTime) {
    const events = this.history.filter(
      (e) => e.metadata.timestamp >= fromTime && e.metadata.timestamp <= toTime
    );

    for (const event of events) {
      this.emit(event.type, event.data, {
        ...event.metadata,
        replayed: true,
      });
    }
  }
}
