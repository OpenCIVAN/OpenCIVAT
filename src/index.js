// src/index.js
// Main entry point for CIA Web application

import React from "react";
import ReactDOM from "react-dom/client";
import { Bootstrap } from "@UI/react/Bootstrap.jsx";

// Import global styles
import "@UI/react/styles/global.css";

// Check for required browser features
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

// Initialize the application
function initializeApp() {
  console.log("====================================");
  console.log("   CIA Web - Collaborative");
  console.log("   Immersive Analytics");
  console.log("====================================");
  console.log("");

  // Check browser compatibility
  if (!checkBrowserCompatibility()) {
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: system-ui;">
        <h1>Browser Compatibility Issue</h1>
        <p>Your browser doesn't support all required features.</p>
        <p>Please use a modern browser like Chrome, Firefox, or Edge.</p>
      </div>
    `;
    return;
  }

  // Get or create root element
  let rootElement = document.getElementById("root");
  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);
  }

  // Create React root and render app
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<Bootstrap />);

  console.log("✅ React app rendered");
  console.log("📝 Type CIA.help() in console for debug commands");
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Handle errors globally
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// Export for debugging
window.CIAWebAppVersion = "2.0.0";
