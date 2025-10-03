import { yUserNames } from "./yjsSetup.js";
import { USER_COLORS } from "../config/constants.js";
import {
  logInfo,
  logSuccess,
  logProgress,
  logError,
  logWarning,
} from "../ui/logging.js";

// Generate a unique user ID for this session
const userId = "user_" + Math.random().toString(36).substr(2, 9);
let userName = localStorage.getItem("vtk-username") || "";

export function getUserId() {
  return userId;
}

export function getUserName() {
  return userName;
}

export function getUserColor(userId) {
  // Create consistent color based on user ID
  const hash = userId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ----------------------------------------------------------------------------
// User Name Management
// ----------------------------------------------------------------------------

export async function showNameDialog() {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      font-family: Arial, sans-serif;
    `;

    // Create dialog box
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
      text-align: center;
    `;

    const title = document.createElement("h3");
    title.textContent = "Set Your Display Name";
    title.style.cssText = "margin: 0 0 15px 0; color: #333; font-size: 20px;";

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "This name will appear on your cursor for other users to see:";
    subtitle.style.cssText =
      "margin: 0 0 20px 0; color: #666; font-size: 14px;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter your name...";
    input.value = userName;
    input.style.cssText = `
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      box-sizing: border-box;
      margin-bottom: 20px;
    `;
    input.maxLength = 20;

    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText =
      "display: flex; gap: 10px; justify-content: center;";

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "Confirm";
    confirmButton.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      flex: 1;
    `;

    const skipButton = document.createElement("button");
    skipButton.textContent = "Skip";
    skipButton.style.cssText = `
      background: #f44336;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      flex: 1;
    `;

    function closeDialog(name) {
      document.body.removeChild(overlay);
      resolve(name);
    }

    confirmButton.addEventListener("click", () => {
      const name = input.value.trim();
      if (name) {
        closeDialog(name);
      } else {
        input.style.borderColor = "#f44336";
        input.placeholder = "Please enter a name...";
      }
    });

    skipButton.addEventListener("click", () => {
      closeDialog("");
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        confirmButton.click();
      }
    });

    // Focus input after a short delay
    setTimeout(() => input.focus(), 100);

    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(skipButton);

    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(input);
    dialog.appendChild(buttonContainer);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

export async function setupUserName() {
  // If no name is stored, show dialog
  if (!userName) {
    userName = await showNameDialog();
  }

  // Store the name locally
  if (userName) {
    localStorage.setItem("vtk-username", userName);
    yUserNames.set(userId, userName);
    logInfo(`User name set to: ${userName}`);
  } else {
    userName = `User ${userId.slice(-4)}`;
    logInfo(`Using default name: ${userName}`);
  }
}

export function updateUserName(newName) {
  if (newName && newName.trim()) {
    userName = newName.trim();
    localStorage.setItem("vtk-username", userName);
    yUserNames.set(userId, userName);
    logInfo(`User name updated to: ${userName}`);

    // Update own cursor label if it exists
    const ownCursor = document.getElementById(`cursor-${userId}`);
    if (ownCursor) {
      const label = ownCursor.querySelector("div");
      if (label) {
        label.textContent = userName;
      }
    }
  }
}


// ----------------------------------------------------------------------------
// Cleanup on page unload
// ----------------------------------------------------------------------------

window.addEventListener("beforeunload", () => {
  // Remove user name from shared state
  if (yUserNames) {
    yUserNames.delete(userId);
  }
});