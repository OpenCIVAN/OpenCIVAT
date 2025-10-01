import { MAX_LOG_MESSAGES, LOG_COLORS } from "../config/constants";

// ----------------------------------------------------------------------------
// Logging System
// ----------------------------------------------------------------------------

let logContainer = null;
let logMessages = [];

export function initializeLogging() {
  // Create log container
  logContainer = document.createElement("div");
  logContainer.id = "log-container";
  logContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 400px;
    max-height: 400px;
    background: rgba(0, 0, 0, 0.9);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #333;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    display: block;
  `;

  // Add toggle button
  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Hide Logs";
  toggleButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 420px;
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    z-index: 1001;
  `;

  toggleButton.addEventListener("click", () => {
    const isVisible = logContainer.style.display !== "none";
    logContainer.style.display = isVisible ? "none" : "block";
    toggleButton.textContent = isVisible ? "Show Logs" : "Hide Logs";
    toggleButton.style.background = isVisible ? "#4CAF50" : "#f44336";
  });

  // Add clear button
  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear";
  clearButton.style.cssText = `
    position: fixed;
    top: 50px;
    right: 420px;
    background: #ff9800;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    z-index: 1001;
  `;

  clearButton.addEventListener("click", () => {
    if (logContainer) {
      logContainer.innerHTML = "";
      logMessages = [];
      logMessage("Logs cleared", "info");
    }
  });

  document.body.appendChild(logContainer);
  document.body.appendChild(toggleButton);
  document.body.appendChild(clearButton);
}

export function logMessage(message, type = "info") {
  // Always log to console
  console.log(message);

  if (!logContainer) return;

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;

  // Create log element
  const logElement = document.createElement("div");
  logElement.style.cssText = `
    color: ${LOG_COLORS[type] || LOG_COLORS.info};
    margin-bottom: 3px;
    line-height: 1.3;
    word-wrap: break-word;
  `;
  logElement.textContent = logEntry;

  // Add to container
  logContainer.appendChild(logElement);
  logMessages.push(logElement);

  // Limit number of messages
  if (logMessages.length > MAX_LOG_MESSAGES) {
    const oldMessage = logMessages.shift();
    if (oldMessage && oldMessage.parentNode) {
      oldMessage.parentNode.removeChild(oldMessage);
    }
  }

  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;

  // Auto-show container for important messages
  if (type === "error" || type === "warning") {
    logContainer.style.display = "block";
  }
}

export function logInfo(message) {
  logMessage(message, "info");
}

export function logSuccess(message) {
  logMessage(message, "success");
}

export function logWarning(message) {
  logMessage(message, "warning");
}

export function logError(message) {
  logMessage(message, "error");
}

export function logProgress(message) {
  logMessage(message, "progress");
}
