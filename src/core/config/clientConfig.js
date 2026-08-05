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

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

/**
 * Configuration object with all client settings
 * Values are resolved once at module load time
 */
export const config = Object.freeze({
  // ---------------------------------------------------------------------------
  // API & Server URLs
  // ---------------------------------------------------------------------------

  /** Base URL for the API server. A relative path like "/api" is resolved
   *  against the page origin at request/connect time (see resolveWsUrl.js for
   *  the WebSocket case) — see the webpack devServer /api and /ws proxies. */
  apiBaseUrl: resolveValue(
    "apiBaseUrl",
    typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : undefined,
    "/api"
  ),

  /** WebSocket URL for Y.js collaboration server. A path like "/yjs-ws" is
   *  resolved against the page origin at connect time (ws/wss to match the
   *  page protocol) — see the webpack devServer /yjs-ws proxy. */
  yjsWebSocketUrl: resolveValue(
    "yjsWebSocketUrl",
    typeof __YJS_WS_URL__ !== "undefined" ? __YJS_WS_URL__ : undefined,
    "/yjs-ws"
  ),

  /** LiveKit media server (SFU) URL for voice chat. Must be an absolute
   *  ws(s):// URL — WebRTC media is direct/ICE and cannot ride a same-origin
   *  proxy, so on a headset (Quest/Vision Pro) this has no working localhost
   *  default and must point at a TLS + TURN reachable SFU (LiveKit Cloud or a
   *  self-hosted server). See docs/quest-voice-setup.md. */
  liveKitUrl: resolveValue(
    "liveKitUrl",
    typeof __LIVEKIT_URL__ !== "undefined" ? __LIVEKIT_URL__ : undefined,
    "ws://localhost:7880"
  ),

  /** LiveKit token server URL. Defaults to the same-origin proxy path
   *  "/livekit-token" (resolved against the page origin at fetch time via
   *  resolveHttpUrl), so it rides the page's TLS/host on LAN/tunnel — see the
   *  webpack devServer /livekit-token proxy. */
  liveKitTokenUrl: resolveValue(
    "liveKitTokenUrl",
    typeof __LIVEKIT_TOKEN_URL__ !== "undefined" ? __LIVEKIT_TOKEN_URL__ : undefined,
    "/livekit-token"
  ),

  // ---------------------------------------------------------------------------
  // Project & Session
  // ---------------------------------------------------------------------------

  /** Default session/project ID for development */
  defaultSessionId: resolveValue(
    "defaultSessionId",
    typeof __DEFAULT_SESSION_ID__ !== "undefined" ? __DEFAULT_SESSION_ID__ : undefined,
    "00000000-0000-0000-0000-000000000001"
  ),

  /** Demo project ID (sample files project) */
  demoProjectId: "00000000-0000-0000-0000-000000000001",

  // ---------------------------------------------------------------------------
  // Feature Flags
  // ---------------------------------------------------------------------------

  /** Whether to use server storage (vs local-only mode) */
  useServerStorage: resolveValue(
    "useServerStorage",
    typeof __USE_SERVER_STORAGE__ !== "undefined" ? __USE_SERVER_STORAGE__ : undefined,
    true
  ),

  /** Whether we're in development mode */
  isDevelopment: resolveValue(
    "isDevelopment",
    typeof __DEV__ !== "undefined" ? __DEV__ : undefined,
    true
  ),

  /** Whether to enable debug logging */
  debugEnabled: resolveValue(
    "debugEnabled",
    typeof __DEBUG__ !== "undefined" ? __DEBUG__ : undefined,
    true
  ),

  /** Whether to show multi-window / tiled workspace layout (false = single main workspace) */
  enableMultiView: resolveValue(
    "enableMultiView",
    typeof __ENABLE_MULTI_VIEW__ !== "undefined" ? __ENABLE_MULTI_VIEW__ : undefined,
    false
  ),

  /** Application version (injected at build time) */
  version: resolveValue(
    "version",
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : undefined,
    "dev"
  ),

  // ---------------------------------------------------------------------------
  // Authentication (Keycloak)
  // ---------------------------------------------------------------------------

  /** Keycloak server URL */
  keycloakUrl: resolveValue(
    "keycloakUrl",
    typeof __KEYCLOAK_URL__ !== "undefined" ? __KEYCLOAK_URL__ : undefined,
    "http://localhost:8080"
  ),

  /** Keycloak realm name */
  keycloakRealm: resolveValue(
    "keycloakRealm",
    typeof __KEYCLOAK_REALM__ !== "undefined" ? __KEYCLOAK_REALM__ : undefined,
    "cia-web"
  ),

  /** Keycloak client ID */
  keycloakClientId: resolveValue(
    "keycloakClientId",
    typeof __KEYCLOAK_CLIENT_ID__ !== "undefined" ? __KEYCLOAK_CLIENT_ID__ : undefined,
    "cia-web-app"
  ),

  /** Dev bypass auth (skip Keycloak in development) */
  devBypassAuth: resolveValue(
    "devBypassAuth",
    typeof __DEV_BYPASS_AUTH__ !== "undefined" ? __DEV_BYPASS_AUTH__ : undefined,
    false
  ),

  // ---------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------

  /**
   * Identity behaviour flags.
   *
   * `deviceFallback` — in dev bypass with no explicit `?devUser=`, resolve the
   * identity from `@Core/identity/deviceIdentity.js` (a persistent per-device
   * UUID) instead of the shared default mock user. This is what lets two
   * headsets on the same LAN be two distinct users. Set
   * `window.__CIA_CONFIG__.identityDeviceFallback = false` to revert every
   * call site to the old default-mock-user behaviour in one place.
   */
  identity: Object.freeze({
    deviceFallback: resolveValue("identityDeviceFallback", undefined, true),
  }),

  // ---------------------------------------------------------------------------
  // Server-Side Rendering
  // ---------------------------------------------------------------------------

  /** Rendering mode: 'server' | 'local' | 'hybrid' */
  renderMode: resolveValue(
    "renderMode",
    typeof __RENDER_MODE__ !== "undefined" ? __RENDER_MODE__ : undefined,
    "local"
  ),

  /** Base HTTP URL of the Python VTK render server */
  renderServerUrl: resolveValue(
    "renderServerUrl",
    typeof __RENDER_SERVER_URL__ !== "undefined" ? __RENDER_SERVER_URL__ : undefined,
    "http://localhost:7001"
  ),

  /** WebSocket URL for interactive frame streaming */
  renderWsUrl: resolveValue(
    "renderWsUrl",
    typeof __RENDER_WS_URL__ !== "undefined" ? __RENDER_WS_URL__ : undefined,
    "/render-ws"
  ),
});

// =============================================================================
// VALUE RESOLUTION
// =============================================================================

/**
 * Resolve a configuration value from multiple sources
 * Priority order:
 * 1. Webpack DefinePlugin (build-time) — passed in already-resolved, since
 *    DefinePlugin only replaces identifiers that appear literally in source;
 *    it cannot rewrite a key name assembled at runtime (e.g. via eval), so
 *    each call site above resolves its own `typeof __X__ !== 'undefined'`
 *    check inline rather than deferring that to a shared helper.
 * 2. Window config object (runtime)
 * 3. Default fallback
 */
function resolveValue(key, defineValue, defaultValue) {
  if (defineValue !== undefined) {
    return defineValue;
  }

  // Try window config object
  if (typeof window !== "undefined" && window.__CIA_CONFIG__) {
    const windowValue = window.__CIA_CONFIG__[key];
    if (windowValue !== undefined) {
      return windowValue;
    }
  }

  return defaultValue;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a config value at runtime (for dynamic lookups)
 * Prefer using `config.propertyName` for static access
 */
export function getConfig(key, defaultValue = undefined) {
  return config[key] ?? defaultValue;
}

/** Check if running in a browser environment */
export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Check if running in development mode */
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

/**
 * Log storage configuration specifically
 * Used during initialization to show storage mode
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

// Log config on load in development
if (config.debugEnabled && isBrowser()) {
  setTimeout(() => logConfig(), 100);
}

export default config;
