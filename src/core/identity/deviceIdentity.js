// src/core/identity/deviceIdentity.js
// Persistent per-device identity for dev-bypass (and any unauthenticated) mode.
//
// WHY THIS EXISTS
// In dev bypass with no `?devUser=`, every browser used to resolve to the same
// mock user (CIA Admin, ...0002). Two headsets on the same LAN therefore shared
// a single userId, collapsing them into one entry in every Y.js map (all keyed
// by userId) and making them invisible to each other. This module gives each
// browser profile a stable, unique identity instead.
//
// DEPENDENCY RULE — keep this module dependency-free.
// It is imported by BOTH `@Collaboration/presence/userManagement.js` and
// `@Services/apiClient.js`. `userManagement -> authService -> apiClient` is a
// real import cycle, so this file must not import from `@Services`,
// `@Collaboration`, or `@Config`. `@Utils/idGenerator.js` is a leaf module and
// is the one allowed import.
//
// STORAGE
// The device id lives in `localStorage.cia_user_id` — the same key
// `userManagement.js` has always used for its (previously unreachable in dev)
// generated id, so existing browsers keep the id they already had.
// Every storage access is wrapped: headset browsers can throw on
// localStorage in private/locked-down modes.

import { generateUserId } from "@Utils/idGenerator.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** localStorage key holding the persistent device UUID. */
export const DEVICE_ID_KEY = "cia_user_id";

/** localStorage key holding an explicitly chosen device display name. */
export const DEVICE_NAME_KEY = "cia_device_name";

/**
 * localStorage key `userManagement.setUserName()` writes. Read-only here, so a
 * name typed into the app-entry modal is reflected in API headers too.
 */
const LEGACY_USER_NAME_KEY = "cia_username";

/** Window event dispatched when the device display name changes. */
export const IDENTITY_CHANGED_EVENT = "cia:identity-changed";

/** Marker used as `externalId` for synthetic device users. */
export const DEVICE_EXTERNAL_ID = "device";

/** Fallback label when the user agent tells us nothing useful. */
const FALLBACK_MODEL = "Explorer";

/** RFC 4122 shape check — `users.id` is a UUID PRIMARY KEY server-side. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Resolved once per page load. Storage may be unwritable (private mode), in
// which case the id still stays stable for the lifetime of the document.
let cachedDeviceId = null;

// =============================================================================
// SAFE STORAGE
// =============================================================================

/**
 * Read a localStorage key, tolerating storage being unavailable.
 * @param {string} key
 * @returns {string|null}
 */
function readStored(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a localStorage key, tolerating storage being unavailable.
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true if the value was persisted
 */
function writeStored(key, value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// IDENTITY
// =============================================================================

/**
 * Stable per-device user id (v4 UUID), generated once and persisted.
 *
 * Must be a UUID: the server upserts it straight into `users.id`
 * (`UUID PRIMARY KEY`), and it is also the key every Y.js participant map uses.
 *
 * @returns {string} v4 UUID
 */
export function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = readStored(DEVICE_ID_KEY);
  if (stored && UUID_RE.test(stored)) {
    cachedDeviceId = stored;
    return cachedDeviceId;
  }

  // Absent, or a legacy non-UUID value that would break the server upsert.
  const generated = generateUserId();
  cachedDeviceId = generated;
  writeStored(DEVICE_ID_KEY, generated);
  return cachedDeviceId;
}

/**
 * Short hex suffix used to disambiguate two identical devices on a LAN.
 * @param {string} id
 * @returns {string} first 4 hex characters of the id
 */
function idSuffix(id) {
  return String(id).replace(/-/g, "").slice(0, 4);
}

/**
 * Derive a human-readable device model from a user agent string.
 * Order matters: Quest's UA also contains "Chrome", and visionOS Safari also
 * matches the generic Safari test.
 *
 * @param {string} ua
 * @returns {string|null} model name, or null when nothing is recognised
 */
function modelFromUserAgent(ua) {
  if (!ua || typeof ua !== "string") return null;

  // --- Headsets -------------------------------------------------------------
  const quest = ua.match(/Quest\s*(\d+|Pro)/i);
  if (quest) return `Quest ${quest[1]}`;
  if (/OculusBrowser|Oculus|Meta\s*Quest/i.test(ua)) return "Quest";
  if (/visionOS|Vision\s*Pro|XRBrowser/i.test(ua)) return "Vision Pro";

  // --- Desktop / mobile browsers -------------------------------------------
  if (/\bEdgA?\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\//.test(ua)) return "Opera";
  if (/\bFirefox\/|\bFxiOS\//.test(ua)) return "Firefox";
  if (/\bChromium\//.test(ua)) return "Chromium";
  if (/\bChrome\/|\bCriOS\//.test(ua)) return "Chrome";
  if (/\bSafari\//.test(ua)) return "Safari";

  return null;
}

/**
 * Display name for this device.
 * Returns the explicitly chosen name when one has been set, otherwise a name
 * derived from the user agent plus the id suffix — "Quest 3 a41f",
 * "Vision Pro 90c2", "Chrome 1e77", "Explorer 4b02".
 *
 * @returns {string}
 */
export function getDeviceName() {
  const stored = readStored(DEVICE_NAME_KEY);
  if (stored && stored.trim()) return stored.trim();

  // A name typed into the app-entry username modal counts too: it is the same
  // name presence shows (`getUserName()`), and API headers built from this
  // module must not disagree with it.
  const legacyName = readStored(LEGACY_USER_NAME_KEY);
  if (legacyName && legacyName.trim()) return legacyName.trim();

  const ua =
    typeof navigator !== "undefined" && navigator ? navigator.userAgent : "";
  const model = modelFromUserAgent(ua) || FALLBACK_MODEL;
  return `${model} ${idSuffix(getDeviceId())}`;
}

/**
 * Whether the user explicitly chose a display name for this device
 * (as opposed to the UA-derived default). Used to decide whether to prompt.
 * @returns {boolean}
 */
export function hasDeviceName() {
  const stored = readStored(DEVICE_NAME_KEY);
  return !!(stored && stored.trim());
}

/**
 * Persist an explicitly chosen display name for this device and notify
 * listeners via a `cia:identity-changed` window event.
 *
 * @param {string} name
 * @returns {boolean} true if a non-empty name was accepted
 */
export function setDeviceName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return false;

  writeStored(DEVICE_NAME_KEY, trimmed);

  try {
    if (typeof window !== "undefined" && typeof CustomEvent === "function") {
      window.dispatchEvent(
        new CustomEvent(IDENTITY_CHANGED_EVENT, {
          detail: {
            id: getDeviceId(),
            name: trimmed,
            email: getDeviceEmail(),
            color: getDeviceColor(),
          },
        })
      );
    }
  } catch {
    // Event dispatch is best-effort — never block the name change on it.
  }

  return true;
}

/**
 * Clear the explicitly chosen device name (falls back to UA derivation).
 * @returns {void}
 */
export function clearDeviceName() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(DEVICE_NAME_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Deterministic, unique email for this device.
 * `users.email` is NOT NULL UNIQUE, so it must be derived from the id.
 * @returns {string}
 */
export function getDeviceEmail() {
  return `device-${getDeviceId()}@cia-web.local`;
}

/**
 * Consistent presence colour for this device.
 * Same HSL hash formula as `getUserColor()` in
 * `src/collaboration/presence/userManagement.js`, duplicated here rather than
 * imported to keep this module dependency-free (see the header note).
 * @returns {string} `hsl(h, 70%, 60%)`
 */
export function getDeviceColor() {
  const targetId = getDeviceId();
  let hash = 0;
  for (let i = 0; i < targetId.length; i++) {
    hash = targetId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Synthetic user object shaped like a `MockUser`, for code paths that expect a
 * full user record (DevUserContext, API headers).
 *
 * @returns {{id: string, externalId: string, email: string, name: string,
 *   shortName: string, avatar: null, color: string, roles: string[],
 *   department: null}}
 */
export function getDeviceUser() {
  const name = getDeviceName();
  return {
    id: getDeviceId(),
    externalId: DEVICE_EXTERNAL_ID,
    email: getDeviceEmail(),
    name,
    shortName: name,
    avatar: null,
    color: getDeviceColor(),
    roles: ["user"],
    department: null,
  };
}
