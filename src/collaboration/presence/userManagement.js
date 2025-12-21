import { generateUserId } from "@Utils/idGenerator.js";
import { presence as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { getStoredMockUserId, getDefaultMockUser, getMockUser } from "@Config/mockUsers.js";

// Initialize or retrieve user ID
let userId = localStorage.getItem("cia_user_id");
if (!userId) {
  userId = generateUserId();
  localStorage.setItem("cia_user_id", userId);
  log.debug("Generated new user ID:", userId);
} else {
  log.debug("Retrieved existing user ID:", userId);
}

// Display name (can be changed)
let userName = localStorage.getItem("cia_username");
let userColor = null;

export function getUserId() {
  const isDevMode =
    config.devBypassAuth === true || config.devBypassAuth === "true";
  if (isDevMode) {
    const mockUserId = getStoredMockUserId();
    return mockUserId || getDefaultMockUser().id;
  }
  return userId;
}

export function getUserName() {
  const isDevMode =
    config.devBypassAuth === true || config.devBypassAuth === "true";
  if (isDevMode) {
    const mockUserId = getStoredMockUserId();
    if (mockUserId) {
      const mockUser = getMockUser(mockUserId);
      if (mockUser) return mockUser.name;
    }
    return getDefaultMockUser().name;
  }
  return userName;
}

// Check if username is set
export function hasUserName() {
  // return false; // Always return false to ensure modal prompt for now during tab testing
  return !!userName;
}

// Called by React modal to set the username
export function setUserName(name) {
  userName = name;
  userColor = getUserColor();

  log.debug(`Username set: ${userName}`);

  // Store for next time
  localStorage.setItem("cia_username", userName);
}

// Check if username exists, but DON'T block if it doesn't
export async function setupUserName() {
  // Try to load from localStorage
  const stored = localStorage.getItem("cia_username");
  if (stored) {
    userName = stored;
    userColor = getUserColor();
    log.debug(`Username loaded from storage: ${userName}`);
    return true; // Username ready
  }

  // No username yet - React modal will handle it
  log.debug(`No username in storage - modal will prompt`);
  return false; // Username not ready (but don't block)
}

// Allow changing username later
export function changeUserName() {
  localStorage.removeItem("cia_username");
  userName = null;
  // Reload to show modal again
  window.location.reload();
}

export function clearUserName() {
  userName = null;
  localStorage.removeItem("cia_username");
  log.debug("Username cleared from localStorage");
}

export function getUserColor(uid = null) {
  const targetId = uid || getUserId();

  // Generate consistent color from user ID
  let hash = 0;
  for (let i = 0; i < targetId.length; i++) {
    hash = targetId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}
