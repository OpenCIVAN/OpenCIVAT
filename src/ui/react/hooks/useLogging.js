// src/ui/react/hooks/useLogging.js
// Custom hook for system logging
// Provides real-time log access to React components

import { useState, useEffect, useCallback } from "react";

// Global log storage (shared across all components)
const logStore = {
  logs: [],
  maxLogs: 100,
  listeners: [],
};

// Log types
export const LogType = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  PROGRESS: "progress",
};

// Core logging functions (called from anywhere in the app)
export function logInfo(message) {
  addLog(LogType.INFO, message);
}

export function logSuccess(message) {
  addLog(LogType.SUCCESS, message);
}

export function logWarning(message) {
  addLog(LogType.WARNING, message);
}

export function logError(message) {
  addLog(LogType.ERROR, message);
}

export function logProgress(message) {
  addLog(LogType.PROGRESS, message);
}

function addLog(type, message) {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    timestamp: new Date(),
  };

  // Add to store
  logStore.logs.push(log);

  // Keep only last N logs
  if (logStore.logs.length > logStore.maxLogs) {
    logStore.logs.shift();
  }

  // Notify listeners
  logStore.listeners.forEach((listener) => {
    try {
      listener(log);
    } catch (error) {
      console.error("Error in log listener:", error);
    }
  });

  // Also log to console for debugging
  const emoji = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
    progress: "⏳",
  };
  console.log(`${emoji[type] || "📋"} ${message}`);
}

/**
 * Hook to access system logs in React components
 * Returns: { logs, clearLogs }
 */
export function useLogging() {
  const [logs, setLogs] = useState([...logStore.logs]);

  useEffect(() => {
    // Listener function
    const listener = (newLog) => {
      setLogs((prevLogs) => {
        const updatedLogs = [...prevLogs, newLog];
        // Keep only last maxLogs
        if (updatedLogs.length > logStore.maxLogs) {
          updatedLogs.shift();
        }
        return updatedLogs;
      });
    };

    // Register listener
    logStore.listeners.push(listener);

    // Cleanup
    return () => {
      const index = logStore.listeners.indexOf(listener);
      if (index > -1) {
        logStore.listeners.splice(index, 1);
      }
    };
  }, []);

  const clearLogs = useCallback(() => {
    logStore.logs = [];
    setLogs([]);
    console.log("🧹 Logs cleared");
  }, []);

  return {
    logs,
    clearLogs,
  };
}
