// src/embed.js
// Minimal embed entry point for server-side thumbnail capture
//
// This page renders ONLY the visualization canvas for thumbnail capture.
// No headers, no tools, no UI chrome - just the raw visualization.
//
// IMPORTANT: This is handler-agnostic! It does NOT import VTK or any
// specific rendering library. Instead, it:
//   1. Receives handlerType from the URL (set by server via thumbnail worker)
//   2. Uses the InstanceTypeRegistry to get the appropriate handler
//   3. Calls handler.renderForThumbnail() which does all type-specific work
//
// This maintains the plugin architecture - new handler types work automatically
// as long as they implement renderForThumbnail().

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { embed as log } from "@Utils/logger.js";

// Import the registry singleton - NOTE: lowercase 'i' in filename!
// The file exports: InstanceTypeRegistry (class), instanceTypeRegistry (singleton)
import { instanceTypeRegistry } from "@Core/instances/types/instanceTypeRegistry.js";

// Import handler registration - this registers VTK and other handlers
import { registerInstanceTypes } from "@Core/instances/types/instanceTypesInit.js";

// API base URL - can be overridden by environment
const API_BASE = window.API_BASE_URL || "http://localhost:3001/api";

// =============================================================================
// URL PARAMETER PARSING
// =============================================================================

/**
 * Extract parameters from URL
 *
 * Expected parameters (set by thumbnail worker):
 * - mode: "view" or "file"
 * - id: view ID or file ID depending on mode
 * - handlerType: server-determined handler type (e.g., "vtk")
 * - width: desired thumbnail width
 * - height: desired thumbnail height
 */
function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get("mode") || "view",
    id: params.get("id"),
    handlerType: params.get("handlerType"), // Server-authoritative!
    width: parseInt(params.get("width")) || 800,
    height: parseInt(params.get("height")) || 600,
  };
}

// =============================================================================
// API HELPERS
// =============================================================================

/**
 * Fetch view configuration from server
 * Returns dataset ID, handler type, and camera state
 */
async function fetchViewConfig(viewId) {
  const response = await fetch(`${API_BASE}/views/${viewId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch view: ${response.status}`);
  }

  const data = await response.json();

  // Handle both camelCase and snake_case responses
  return {
    datasetId: data.datasetId || data.dataset_id,
    handlerType: data.handlerType || data.handler_type,
    // Camera state for restoring saved view position
    camera: data.camera || null,
  };
}

/**
 * Fetch dataset info (including handler type) from server
 */
async function fetchDatasetInfo(datasetId) {
  const response = await fetch(`${API_BASE}/files/${datasetId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    handlerType: data.handlerType || data.handler_type,
  };
}

// =============================================================================
// EMBED VISUALIZATION COMPONENT
// =============================================================================

/**
 * EmbedVisualization - Handler-agnostic visualization renderer
 *
 * This component:
 * 1. Resolves the dataset ID and handler type
 * 2. Gets the handler from the registry
 * 3. Calls handler.renderForThumbnail() to do the actual rendering
 *
 * All type-specific rendering code lives in the handler, not here.
 */
function EmbedVisualization({
  mode,
  id,
  handlerType: urlHandlerType,
  width,
  height,
}) {
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !id) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        log.info(
          `Embed initializing: mode=${mode}, id=${id}, handlerType=${urlHandlerType}`
        );

        // Step 1: Resolve dataset ID, handler type, and camera state
        let datasetId;
        let handlerType = urlHandlerType; // Prefer URL param (from server)
        let cameraState = null; // For restoring saved view position

        if (mode === "view") {
          // Fetch view config to get dataset ID and saved camera state
          const viewConfig = await fetchViewConfig(id);
          datasetId = viewConfig.datasetId;
          cameraState = viewConfig.camera; // May be null for default views

          // Use handler type from view if not in URL
          if (!handlerType) {
            handlerType = viewConfig.handlerType;
          }

          log.debug(
            `View has camera state: ${
              cameraState ? "yes" : "no (using default)"
            }`
          );
        } else {
          // mode === "file" - id is the dataset ID directly
          datasetId = id;
          // No camera state for raw files - use default

          // Fetch dataset info if we don't have handler type
          if (!handlerType) {
            const datasetInfo = await fetchDatasetInfo(datasetId);
            handlerType = datasetInfo.handlerType;
          }
        }

        if (!mounted) return;

        // Validate we have what we need
        if (!datasetId) {
          throw new Error("Could not determine dataset ID");
        }

        if (!handlerType) {
          throw new Error("Could not determine handler type");
        }

        log.info(
          `Resolved: datasetId=${datasetId}, handlerType=${handlerType}`
        );

        // Step 2: Get handler from registry (use the singleton)
        const handler = instanceTypeRegistry.getHandler(handlerType);

        if (!handler) {
          throw new Error(`No handler registered for type: ${handlerType}`);
        }

        if (typeof handler.renderForThumbnail !== "function") {
          throw new Error(
            `Handler ${handlerType} does not support thumbnail rendering`
          );
        }

        log.info(`Using handler: ${handlerType}`);

        // Step 3: Let the handler render the visualization
        // The handler creates ONLY the canvas - no headers, no tools
        setLoading(false);

        cleanupRef.current = handler.renderForThumbnail(
          containerRef.current,
          datasetId,
          {
            width,
            height,
            camera: cameraState, // Pass saved camera state (or null for default)
            onReady: () => {
              if (mounted) {
                log.info("Visualization ready for capture");
                document.body.setAttribute(
                  "data-testid",
                  "visualization-ready"
                );
              }
            },
            onError: (msg) => {
              if (mounted) {
                log.error("Handler reported error:", msg);
                setError(msg);
                document.body.setAttribute(
                  "data-testid",
                  "visualization-error"
                );
              }
            },
          }
        );
      } catch (err) {
        log.error("Embed initialization failed:", err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
          document.body.setAttribute("data-testid", "visualization-error");
        }
      }
    }

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (typeof cleanupRef.current === "function") {
        cleanupRef.current();
      }
    };
  }, [mode, id, urlHandlerType, width, height]);

  // Loading state - just show the background color
  if (loading) {
    return (
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: "#0a0a0a",
        }}
      />
    );
  }

  // Error state - visible for debugging
  if (error) {
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: "#1a0000",
          color: "#ff6666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "20px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        Error: {error}
      </div>
    );
  }

  // Normal state - container for handler to render into
  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: "#0a0a0a",
      }}
    />
  );
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the embed page
 */
async function initializeEmbed() {
  const params = getParams();

  log.info("Embed mode starting...", params);

  // Validate required parameters
  if (!params.id) {
    document.body.innerHTML = `
      <div style="color: #ff6666; padding: 20px; font-family: monospace;">
        Error: Missing 'id' parameter
      </div>
    `;
    document.body.setAttribute("data-testid", "visualization-error");
    return;
  }

  // Register handlers so the registry can find them
  // This is the same registration that happens in the main app
  try {
    registerInstanceTypes();
    log.info("Instance types registered");
  } catch (err) {
    log.warn("Could not initialize instance types:", err.message);
    // Continue anyway - handler might already be registered
  }

  // Set up minimal page styles
  document.body.style.cssText = `
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #0a0a0a;
  `;

  // Create and mount root element
  const rootElement = document.createElement("div");
  rootElement.id = "embed-root";
  document.body.innerHTML = "";
  document.body.appendChild(rootElement);

  // Render the embed visualization
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <EmbedVisualization
      mode={params.mode}
      id={params.id}
      handlerType={params.handlerType}
      width={params.width}
      height={params.height}
    />
  );

  log.info("Embed rendered");
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeEmbed);
} else {
  initializeEmbed();
}
