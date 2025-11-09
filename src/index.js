// src/index.js
// Entry point with phased initialization

import React from "react";
import ReactDOM from "react-dom/client";
import { Bootstrap } from "@UI/react/Bootstrap.jsx";
import { initializePhase1 } from "@Init/appInitializer.js";
import "@UI/react/styles/global.css";

async function startApp() {
  try {
    console.log("🚀 Starting CIA Web Application...");

    // Phase 1: Initialize basic systems (no username needed)
    const phase1Data = await initializePhase1();

    console.log("✅ Phase 1 complete, mounting React...");

    // Mount Bootstrap component
    // This will show username modal, then trigger Phase 2
    const root = ReactDOM.createRoot(document.getElementById("react-root"));
    root.render(
      <React.StrictMode>
        <Bootstrap roomName={phase1Data.roomName} />
      </React.StrictMode>
    );

    console.log("✅ React mounted, waiting for user input...");
  } catch (error) {
    console.error("❌ Failed to start application:", error);

    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ff6b6b;">
        <h1>Failed to Initialize</h1>
        <p>${error.message}</p>
        <button onclick="location.reload()">Refresh Page</button>
      </div>
    `;
  }
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
