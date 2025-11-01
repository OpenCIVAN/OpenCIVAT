// src/collaboration/userManagement.js
// Fixed to avoid race condition with React modal

let userId = null;
let userName = null;
let userColor = null;

export function getUserId() {
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return userId;
}

export function getUserName() {
  return userName || "Guest";
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

// Check if username is set
export function hasUserName() {
  // return false; // Always return false to ensure modal prompt for now during tab testing
  return !!userName;
}

// Allow changing username later
export function changeUserName() {
  localStorage.removeItem("cia_username");
  userName = null;
  // Reload to show modal again
  window.location.reload();
}
