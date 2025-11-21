import React from "react";
import { createRoot } from "react-dom/client";

import { CIAWebApp } from "@UI/react/CIAWebApp.jsx";

// Store the root instance to prevent multiple createRoot calls
let reactRoot = null;

export function mountReactUI(roomName = "default-analytics-room") {
  console.log("🔍 Mounting React UI...");

  let rootElement = document.getElementById("react-root");

  if (!rootElement) {
    console.log("📦 Creating react-root element");
    rootElement = document.createElement("div");
    rootElement.id = "react-root";
    document.body.appendChild(rootElement);
  }

  // If root already exists, just update it
  if (reactRoot) {
    console.log("🔄 Updating existing React root");
    reactRoot.render(<CIAWebApp roomName={roomName} />);
  } else {
    console.log("🆕 Creating new React root");
    reactRoot = createRoot(rootElement);
    reactRoot.render(<CIAWebApp roomName={roomName} />);
  }

  console.log("✅ React UI mounted successfully");
}

// Optional: Export function to unmount React (for cleanup if needed)
export function unmountReactUI() {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;

    const rootElement = document.getElementById("react-root");
    if (rootElement) {
      rootElement.remove();
    }

    console.log("✅ React UI unmounted");
  }
}

window.addEventListener("error", (e) => {
  if (
    e.message ===
    "ResizeObserver loop completed with undelivered notifications."
  ) {
    e.stopImmediatePropagation();
    return false;
  }
});
