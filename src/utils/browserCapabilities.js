// Browser capability detection — never blocks on browser name.
// Used by src/index.js startup check and optionally by UI components.

/**
 * Synchronous capability snapshot.
 * Call this immediately; for WebXR and immersive-vr use detectCapabilitiesAsync().
 */
export function detectCapabilities() {
  const canvas = document.createElement("canvas");

  const webgl = !!canvas.getContext("webgl");
  const webgl2 = !!canvas.getContext("webgl2");
  const webSocket = "WebSocket" in window;
  const secureContext = window.isSecureContext === true;
  const indexedDB = "indexedDB" in window;
  const webRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Optional — gracefully absent on Vision Pro and restricted browsers
  const webGPU = "gpu" in navigator;
  const fileReader = "FileReader" in window;
  const dragDrop = "ondragstart" in document.createElement("div");
  const webXR = "xr" in navigator;

  return {
    // Required
    webgl,
    webgl2,
    webSocket,
    secureContext,
    indexedDB,
    webRTC,
    // Optional
    webGPU,
    fileReader,
    dragDrop,
    webXR,
    // Populated by detectCapabilitiesAsync
    immersiveVR: null,
  };
}

/**
 * Async extension: resolves immersive-vr support via WebXR.
 * Returns a merged capabilities object.
 */
export async function detectCapabilitiesAsync() {
  const caps = detectCapabilities();

  if (caps.webXR) {
    try {
      caps.immersiveVR = await navigator.xr.isSessionSupported("immersive-vr");
    } catch {
      caps.immersiveVR = false;
    }
  } else {
    caps.immersiveVR = false;
  }

  return caps;
}

/**
 * Returns the subset of capabilities that are required for the app to run.
 * Missing any of these triggers a hard error at startup.
 */
export function getRequiredCapabilities() {
  return ["webgl2", "webSocket", "indexedDB"];
}

/**
 * Returns a human-readable label for a capability key.
 */
export function capabilityLabel(key) {
  const labels = {
    webgl: "WebGL",
    webgl2: "WebGL2",
    webSocket: "WebSocket",
    secureContext: "Secure Context (HTTPS)",
    indexedDB: "IndexedDB",
    webRTC: "WebRTC (camera/mic)",
    webGPU: "WebGPU (optional)",
    fileReader: "File Upload (optional)",
    dragDrop: "Drag & Drop (optional)",
    webXR: "WebXR",
    immersiveVR: "Immersive VR",
  };
  return labels[key] || key;
}
