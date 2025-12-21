// src/config/mockUsers.js
// Mock users for development and testing collaboration features
//
// These users match the seed-test-users.sql database entries.
// When DEV_BYPASS_AUTH is enabled, the user switcher allows
// switching between these identities.

/**
 * Mock users available in development mode
 * @type {Array<MockUser>}
 */
export const MOCK_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    externalId: "dev-user-001",
    email: "developer@localhost",
    name: "Development User",
    shortName: "Dev",
    avatar: null,
    color: "#6366f1", // Indigo
    roles: ["user", "admin"],
    department: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    externalId: "alice-001",
    email: "alice@research.lab",
    name: "Alice Chen",
    shortName: "Alice",
    avatar: null,
    color: "#ec4899", // Pink
    roles: ["user"],
    department: "Neuroscience",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    externalId: "bob-001",
    email: "bob@research.lab",
    name: "Bob Martinez",
    shortName: "Bob",
    avatar: null,
    color: "#14b8a6", // Teal
    roles: ["user"],
    department: "Data Science",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    externalId: "carol-001",
    email: "carol@research.lab",
    name: "Dr. Carol Williams",
    shortName: "Carol",
    avatar: null,
    color: "#f59e0b", // Amber
    roles: ["user", "admin"],
    department: "Cardiology",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    externalId: "dave-001",
    email: "dave@university.edu",
    name: "Dave Kim",
    shortName: "Dave",
    avatar: null,
    color: "#8b5cf6", // Violet
    roles: ["user"],
    department: "Biomedical Engineering",
  },
];

/**
 * Get a mock user by ID
 * @param {string} userId - User ID
 * @returns {MockUser|undefined}
 */
export function getMockUser(userId) {
  return MOCK_USERS.find((u) => u.id === userId);
}

/**
 * Get default mock user
 * @returns {MockUser}
 */
export function getDefaultMockUser() {
  return MOCK_USERS[0];
}

/**
 * Get initials for a user (for avatar fallback)
 * @param {string} name - Full name
 * @returns {string} Initials (e.g., "AC" for "Alice Chen")
 */
export function getUserInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Storage key for persisting selected mock user
 */
export const MOCK_USER_STORAGE_KEY = "cia_dev_mock_user_id";

/**
 * Get stored mock user ID (persists across page reloads)
 * @returns {string|null}
 */
export function getStoredMockUserId() {
  try {
    return localStorage.getItem(MOCK_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store mock user ID
 * @param {string} userId
 */
export function storeMockUserId(userId) {
  try {
    localStorage.setItem(MOCK_USER_STORAGE_KEY, userId);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear stored mock user ID
 */
export function clearStoredMockUserId() {
  try {
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export default MOCK_USERS;
