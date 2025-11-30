// src/core/config/clientConfig.js
// Centralized configuration for client-side code
//
// This module provides a single source of truth for runtime configuration,
// handling the differences between:
// - Webpack DefinePlugin (build-time injection)
// - Window config object (runtime configuration)
// - Default fallbacks (local development)
//
// Usage:
//   import { config } from '@Core/config/clientConfig.js';
//   const response = await fetch(`${config.apiBaseUrl}/projects`);

import { app as log } from "@Utils/logger.js";

/**
 * Configuration object with all client settings
 * Values are resolved once at module load time
 */
export const config = Object.freeze({
  /**
   * Base URL for the API server
   * @example 'http://localhost:3001/api'
   * @example 'https://api.cialab.io/api'
   */
  apiBaseUrl: resolveValue(
    "apiBaseUrl",
    "__API_BASE_URL__",
    "http://localhost:3001/api"
  ),

  /**
   * WebSocket URL for Y.js collaboration server
   * @example 'ws://localhost:8080'
   * @example 'wss://collab.cialab.io'
   */
  yjsWebSocketUrl: resolveValue(
    "yjsWebSocketUrl",
    "__YJS_WS_URL__",
    "ws://localhost:8080"
  ),

  /**
   * LiveKit server URL for voice chat
   * @example 'ws://localhost:7880'
   * @example 'wss://livekit.cialab.io'
   */
  liveKitUrl: resolveValue(
    "liveKitUrl",
    "__LIVEKIT_URL__",
    "ws://localhost:7880"
  ),

  /**
   * LiveKit token server URL
   * @example 'http://localhost:3001'
   */
  liveKitTokenUrl: resolveValue(
    "liveKitTokenUrl",
    "__LIVEKIT_TOKEN_URL__",
    "http://localhost:3001"
  ),

  /**
   * Default session/project ID for development
   * In production, this comes from URL or user selection
   */
  defaultSessionId: resolveValue(
    "defaultSessionId",
    "__DEFAULT_SESSION_ID__",
    "00000000-0000-0000-0000-000000000001"
  ),

  /**
   * Demo project ID (sample files project)
   */
  demoProjectId: "00000000-0000-0000-0000-000000000001",

  /**
   * Whether to use server storage (vs local-only mode)
   */
  useServerStorage: resolveValue(
    "useServerStorage",
    "__USE_SERVER_STORAGE__",
    true
  ),

  /**
   * Whether we're in development mode
   */
  isDevelopment: resolveValue("isDevelopment", "__DEV__", true),

  /**
   * Whether to enable debug logging
   */
  debugEnabled: resolveValue("debugEnabled", "__DEBUG__", true),

  /**
   * Application version (injected at build time)
   */
  version: resolveValue("version", "__APP_VERSION__", "dev"),
});

/**
 * Resolve a configuration value from multiple sources
 * Priority order:
 * 1. Webpack DefinePlugin (build-time)
 * 2. Window config object (runtime)
 * 3. Default fallback
 *
 * @param {string} key - Key in window.__CIA_CONFIG__
 * @param {string} defineKey - Webpack DefinePlugin variable name
 * @param {any} defaultValue - Fallback value
 * @returns {any} Resolved value
 */
function resolveValue(key, defineKey, defaultValue) {
  // Try Webpack DefinePlugin first
  // Note: We use eval to prevent Webpack from replacing the check itself
  try {
    // Check if the define variable exists and isn't the literal string
    const defineValue = eval(
      `typeof ${defineKey} !== 'undefined' ? ${defineKey} : undefined`
    );
    if (defineValue !== undefined && defineValue !== defineKey) {
      return defineValue;
    }
  } catch (e) {
    // DefinePlugin variable doesn't exist, continue to next source
  }

  // Try window config object
  if (typeof window !== "undefined" && window.__CIA_CONFIG__) {
    const windowValue = window.__CIA_CONFIG__[key];
    if (windowValue !== undefined) {
      return windowValue;
    }
  }

  // Return default
  return defaultValue;
}

/**
 * Get a config value at runtime (for dynamic lookups)
 * Prefer using `config.propertyName` for static access
 *
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Fallback if not found
 * @returns {any}
 */
export function getConfig(key, defaultValue = undefined) {
  return config[key] ?? defaultValue;
}

/**
 * Check if running in a browser environment
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export function isDev() {
  return config.isDevelopment;
}

/**
 * Log configuration (for debugging)
 * Only logs in development mode
 */
export function logConfig() {
  if (!config.debugEnabled) return;

  log.debug("CIA Web Configuration:", {
    apiBaseUrl: config.apiBaseUrl,
    yjsWebSocketUrl: config.yjsWebSocketUrl,
    liveKitUrl: config.liveKitUrl,
    isDevelopment: config.isDevelopment,
    debugEnabled: config.debugEnabled,
    version: config.version,
  });
}

// Log config on load in development
if (config.debugEnabled && isBrowser()) {
  // Delay to ensure console is ready
  setTimeout(() => logConfig(), 100);
}

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// These mirror the old storage.js exports for easier migration
// =============================================================================

/**
 * @deprecated Use config.useServerStorage instead
 */
export const USE_SERVER_STORAGE = config.useServerStorage;

/**
 * @deprecated Use config.apiBaseUrl instead
 */
export const API_BASE_URL = config.apiBaseUrl;

/**
 * @deprecated Use config.defaultSessionId instead
 */
export const DEFAULT_SESSION_ID = config.defaultSessionId;

/**
 * Helper to log the current storage configuration
 * @deprecated Use logConfig() instead
 */
export function logStorageConfig() {
  log.debug("Storage Configuration:", {
    mode: config.useServerStorage
      ? "Server (with local fallback)"
      : "Local only",
    apiBaseUrl: config.apiBaseUrl,
    sessionId: config.defaultSessionId,
  });
}

export default config;
