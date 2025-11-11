// src/index.js
// Foundation layer - handles browser compatibility and Phase 1 initialization
// Then hands control to Bootstrap for gate-keeping and user setup

import React from "react";
import ReactDOM from "react-dom/client";
import { initializePhase1 } from "@Init/appInitializer.js";
import { Bootstrap } from "@UI/react/Bootstrap.jsx";

// Import global styles
import "@UI/react/styles/global.css";

/**
 * Check browser compatibility
 * Ensures the user's browser supports all required features
 */
function checkBrowserCompatibility() {
  const required = {
    WebGL: !!document.createElement("canvas").getContext("webgl2"),
    WebRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    WebSocket: "WebSocket" in window,
    IndexedDB: "indexedDB" in window,
  };

  const missing = Object.entries(required)
    .filter(([feature, supported]) => !supported)
    .map(([feature]) => feature);

  if (missing.length > 0) {
    console.warn(`⚠️ Missing browser features: ${missing.join(", ")}`);
    return false;
  }

  return true;
}

/**
 * Show error screen for fatal errors
 */
function showFatalError(message) {
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a1a;
      color: #fff;
      font-family: system-ui;
      padding: 20px;
    ">
      <h1 style="color: #ff4444;">Fatal Error</h1>
      <p style="max-width: 600px; text-align: center; line-height: 1.5;">
        ${message}
      </p>
      <button 
        onclick="window.location.reload()"
        style="
          margin-top: 20px;
          padding: 10px 20px;
          background: #007acc;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 16px;
        "
      >
        Reload Page
      </button>
    </div>
  `;
}

/**
 * Main initialization function
 * Runs Phase 1, then hands control to Bootstrap → CIAWebApp
 */
async function initializeApp() {
  console.log("====================================");
  console.log("   CIA Web - Collaborative");
  console.log("   Immersive Analytics");
  console.log("====================================");
  console.log("");

  // Check browser compatibility first
  if (!checkBrowserCompatibility()) {
    showFatalError(
      "Your browser doesn't support all required features. " +
        "Please use a modern browser like Chrome, Firefox, or Edge."
    );
    return;
  }

  try {
    // Run Phase 1: Core Services (before React)
    // This initializes services that don't depend on user context
    console.log("🏗️ Foundation: Initializing core services...");
    await initializePhase1();
    console.log("✅ Foundation: Core services ready");

    // Create or find root element
    let rootElement = document.getElementById("root");
    if (!rootElement) {
      rootElement = document.createElement("div");
      rootElement.id = "root";
      document.body.appendChild(rootElement);
    }

    // Render Bootstrap component
    // Bootstrap will handle:
    // - Authentication (future)
    // - Username collection
    // - Phase 2 initialization
    // - Then render CIAWebApp
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <Bootstrap />
      </React.StrictMode>
    );

    console.log("✅ Foundation: React application rendered");
    console.log("🔐 Bootstrap layer will handle user setup and Phase 2");
    console.log("📝 Type CIA.help() in console for debug commands");
  } catch (error) {
    console.error("❌ Fatal error during core initialization:", error);
    showFatalError(
      `Failed to initialize core services: ${error.message}. ` +
        `Check the console for details and try refreshing the page.`
    );
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Global error handlers for debugging
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// Version for debugging
window.CIAWebAppVersion = "2.0.0";
