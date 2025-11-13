// src/core/config/storage.js

import { ServerStorageProvider } from "@Core/data/providers/ServerStorageProvider.js";
import { DatasetManagerAdapter } from "@Core/data/managers/DatasetManagerAdapter.js";
import { dataCache } from "@Services/storage/dataCache.js";

/**
 * Storage configuration for the application
 *
 * This file determines which storage provider to use and how to configure it.
 * During development, you can easily switch between local and server storage
 * by changing the USE_SERVER_STORAGE flag.
 *
 * IMPORTANT: These are hardcoded values for development. When you deploy to
 * production, you'll need to either:
 * 1. Build different versions of the app for different environments, OR
 * 2. Configure webpack's DefinePlugin to inject environment variables, OR
 * 3. Load configuration from a runtime config file
 *
 * For now, we're keeping it simple with hardcoded dev values.
 */

// Flag to control which storage provider to use
// Set this to false if you want to work offline or test local-only features
export const USE_SERVER_STORAGE = true;

// API server configuration
// For local development with Docker
export const API_BASE_URL = "http://localhost:3001/api";

// Session configuration
// Fixed UUID for local development - all local users share this session
// In production, this would be generated per collaborative workspace
export const DEFAULT_SESSION_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Helper to log the current storage configuration
 * Useful for debugging which storage mode is active
 */
export function logStorageConfig() {
  console.log("📡 Storage Configuration:");
  console.log(
    `   Mode: ${
      USE_SERVER_STORAGE ? "Server (with local fallback)" : "Local only"
    }`
  );
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   Session ID: ${DEFAULT_SESSION_ID}`);
}

/**
 * Initialize storage provider with automatic fallback
 *
 * This function implements the storage initialization strategy:
 * 1. If USE_SERVER_STORAGE is true, try to connect to the server
 * 2. If server connection fails OR USE_SERVER_STORAGE is false, use local storage
 * 3. Return both the provider and what mode we're in
 *
 * The automatic fallback ensures the app can work even if the server is down,
 * providing graceful degradation from full server functionality to local-only mode.
 *
 * @returns {Promise<{provider: StorageProvider, mode: string}>}
 */
export async function initializeStorageProvider() {
  if (USE_SERVER_STORAGE) {
    console.log("  📡 Creating server storage provider...");
    const provider = new ServerStorageProvider(
      API_BASE_URL,
      DEFAULT_SESSION_ID
    );

    try {
      await provider.initialize();
      console.log("  ✅ Server storage provider ready");
      return { provider, mode: "server" };
    } catch (error) {
      console.warn("  ⚠️ Server storage provider failed:", error.message);
      console.warn("  Falling back to local storage...");
      // Fall through to local storage initialization below
    }
  }

  // Either USE_SERVER_STORAGE is false, or server initialization failed
  console.log("  💾 Creating local storage adapter...");

  // Initialize the data cache if needed
  if (dataCache && typeof dataCache.initialize === "function") {
    await dataCache.initialize();
  }

  const provider = new DatasetManagerAdapter(dataCache);
  await provider.initialize();
  console.log("  ✅ Local storage provider ready");

  return { provider, mode: "local" };
}
