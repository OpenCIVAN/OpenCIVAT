import { generateUserId } from "@Utils/idGenerator.js";
import { presence as log } from "@Utils/logger.js";
import { config } from "@Core/config/clientConfig.js";
import { authService } from "@Services/authService.js";
import { getStoredMockUserId, getDefaultMockUser, getMockUser } from "@Config/mockUsers.js";
import {
  getDeviceId,
  getDeviceName,
  getDeviceEmail,
  hasDeviceName,
} from "@Core/identity/deviceIdentity.js";

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

/**
 * Whether dev bypass is active (no Keycloak; identity comes from mock users
 * or the per-device identity).
 * @returns {boolean}
 */
function isDevBypassMode() {
  return config.devBypassAuth === true || config.devBypassAuth === "true";
}

/**
 * Whether the dev fallback identity is the persistent per-device one rather
 * than the shared default mock user. Single revert switch — see
 * `identity.deviceFallback` in clientConfig.
 * @returns {boolean}
 */
function useDeviceFallback() {
  return config.identity?.deviceFallback !== false;
}

// ONE-TIME MIGRATION: Bootstrap's dev-bypass path used to call setUserName()
// with authService's mock dev user, which persisted the shared name
// "CIA Admin" into cia_username on every device's first launch. That value
// then poisoned identity resolution permanently — getUserName() and
// deviceIdentity.getDeviceName() both prefer it over the per-device name, and
// hasUserName() true short-circuits needsDisplayNamePrompt(), so already
// affected browsers could never recover on their own. Clear it here, once,
// so previously provisioned headsets fall back to the per-device name (or get
// re-prompted) without a manual localStorage/site-data wipe. Scoped tightly —
// only the exact known shared mock name, only where the device-fallback path
// would otherwise apply — so a name a user actually typed is never touched.
// Safe to run eagerly at module init: this module already imports `config`
// and `@Config/mockUsers.js` unconditionally above, and neither has an import
// path back to this module, so both are fully resolved before this line runs.
if (
  userName === getDefaultMockUser().name &&
  isDevBypassMode() &&
  useDeviceFallback()
) {
  localStorage.removeItem("cia_username");
  userName = null;
}

export function getUserId() {
  const isDevMode = isDevBypassMode();
  if (isDevMode) {
    // An explicitly selected mock identity (?devUser=alice, DevUserSwitcher)
    // always wins.
    const mockUserId = getStoredMockUserId();
    if (mockUserId) return mockUserId;
    // Otherwise this browser is its own user, not a shared "CIA Admin".
    if (useDeviceFallback()) return getDeviceId();
    return getDefaultMockUser().id;
  }
  const authUser = authService.getUser?.();
  if (authUser?.id) {
    return authUser.id;
  }
  return userId;
}

export function getUserName() {
  const isDevMode = isDevBypassMode();
  if (isDevMode) {
    const mockUserId = getStoredMockUserId();
    if (mockUserId) {
      const mockUser = getMockUser(mockUserId);
      if (mockUser) return mockUser.name;
    }
    if (useDeviceFallback()) {
      // A name typed into the entry/VR prompt wins over the UA-derived one.
      return userName || getDeviceName();
    }
    return getDefaultMockUser().name;
  }
  const authUser = authService.getUser?.();
  if (authUser) {
    return (
      authUser.name ||
      authUser.username ||
      authUser.email?.split("@")[0] ||
      userName
    );
  }
  return userName;
}

export function getUserEmail() {
  const isDevMode = isDevBypassMode();
  if (isDevMode) {
    const mockUserId = getStoredMockUserId();
    if (mockUserId) {
      const mockUser = getMockUser(mockUserId);
      if (mockUser) return mockUser.email;
    }
    if (useDeviceFallback()) return getDeviceEmail();
    return getDefaultMockUser().email;
  }
  const authUser = authService.getUser?.();
  if (authUser?.email) {
    return authUser.email;
  }
  return null;
}

// Check if username is set
export function hasUserName() {
  // return false; // Always return false to ensure modal prompt for now during tab testing
  return !!userName;
}

/**
 * Whether the user should be asked for a display name before entering a
 * collaborative surface (VR in particular, where every participant is listed
 * by name).
 *
 * Never prompts when the identity was supplied externally: `?devUser=alice`
 * in dev, or a signed-in Keycloak user in production.
 *
 * NOTE for callers on the VR entry path: resolve this on a PRIOR user
 * interaction. WebXR `requestSession()` needs fresh user activation, so an
 * async modal in the same click that calls `startExploration` burns the
 * activation and VR entry fails silently.
 *
 * @returns {boolean}
 */
export function needsDisplayNamePrompt() {
  if (isDevBypassMode()) {
    // Explicit mock identity (?devUser=) already carries a name.
    if (getStoredMockUserId()) return false;
    if (!useDeviceFallback()) return false;
  } else {
    // Signed-in users get their name from the token.
    const authUser = authService.getUser?.();
    if (authUser) return false;
  }

  if (hasUserName()) return false;
  if (hasDeviceName()) return false;
  return true;
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
