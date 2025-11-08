// src/analytics/auditLogger.js

class AuditLogger {
  constructor() {
    this.logs = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 seconds
  }

  log(event) {
    const entry = {
      ...event,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      userId: getUserId(),
      deviceInfo: this.getDeviceInfo(),
      performance: this.capturePerformance(),
    };

    this.logs.push(entry);

    if (this.logs.length >= this.batchSize) {
      this.flush();
    }
  }

  capturePerformance() {
    return {
      memory: performance.memory?.usedJSHeapSize,
      fps: this.calculateFPS(),
      latency: this.measureLatency(),
      renderTime: this.lastRenderTime,
    };
  }

  async flush() {
    if (this.logs.length === 0) return;

    const batch = [...this.logs];
    this.logs = [];

    try {
      await this.sendToAnalytics(batch);
    } catch (error) {
      // Store failed logs for retry
      this.logs.unshift(...batch);
    }
  }
}
