import { generateUserId } from "@Utils/idGenerator.js";

// Initialize or retrieve user ID
let userId = localStorage.getItem("cia_user_id");
if (!userId) {
  userId = generateUserId();
  localStorage.setItem("cia_user_id", userId);
  console.log("🆔 Generated new user ID:", userId);
} else {
  console.log("🆔 Retrieved existing user ID:", userId);
}

// Display name (can be changed)
let userName = localStorage.getItem("cia_username");
let userColor = null;

export function getUserId() {
  return userId;
}

export function getUserName() {
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

  console.log(`👤 Username set: ${userName}`);

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
    console.log(`👤 Username loaded from storage: ${userName}`);
    return true; // Username ready
  }

  // No username yet - React modal will handle it
  console.log(`👤 No username in storage - modal will prompt`);
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
  console.log("🗑️ Username cleared from localStorage");
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