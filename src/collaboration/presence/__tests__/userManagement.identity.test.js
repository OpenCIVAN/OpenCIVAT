// src/collaboration/presence/__tests__/userManagement.identity.test.js
// In dev bypass, every browser used to resolve to the same mock user
// (CIA Admin, ...0002), which collapsed two headsets into one Y.js participant.
// The dev fallback must now be the per-device identity — while an explicitly
// selected mock identity (?devUser=alice) still wins, and the production path
// is untouched.
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (all module-level imports of userManagement.js) -------------------

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  });
  return { presence: mkLog(), app: mkLog(), createLogger: () => mkLog() };
});

vi.mock("@Utils/idGenerator.js", () => ({
  generateUserId: vi.fn(() => "generated-local-id"),
}));

// Mutable so each test can flip dev mode / the revert flag.
const mockConfig = { devBypassAuth: true, identity: { deviceFallback: true } };
vi.mock("@Core/config/clientConfig.js", () => ({
  config: mockConfig,
}));

const mockGetAuthUser = vi.fn(() => null);
vi.mock("@Services/authService.js", () => ({
  authService: { getUser: mockGetAuthUser },
}));

const mockGetStoredMockUserId = vi.fn(() => null);
const DEFAULT_MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "admin@cia-web.local",
  name: "CIA Admin",
};
const ALICE = {
  id: "00000000-0000-0000-0000-000000000003",
  email: "alice@cia-web.local",
  name: "Alice Analyst",
};
vi.mock("@Config/mockUsers.js", () => ({
  getStoredMockUserId: () => mockGetStoredMockUserId(),
  getDefaultMockUser: () => DEFAULT_MOCK_USER,
  getMockUser: (id) => (id === ALICE.id ? ALICE : undefined),
}));

const DEVICE_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const mockHasDeviceName = vi.fn(() => false);
vi.mock("@Core/identity/deviceIdentity.js", () => ({
  getDeviceId: () => DEVICE_ID,
  getDeviceName: () => "Quest 3 aaaa",
  getDeviceEmail: () => `device-${DEVICE_ID}@cia-web.local`,
  hasDeviceName: () => mockHasDeviceName(),
}));

// Imported AFTER the mocks are registered.
const userManagement = await import("@Collaboration/presence/userManagement.js");
const {
  getUserId,
  getUserName,
  getUserEmail,
  needsDisplayNamePrompt,
  clearUserName,
  setUserName,
} = userManagement;

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.devBypassAuth = true;
  mockConfig.identity = { deviceFallback: true };
  mockGetStoredMockUserId.mockReturnValue(null);
  mockGetAuthUser.mockReturnValue(null);
  mockHasDeviceName.mockReturnValue(false);
  clearUserName();
});

describe("userManagement identity — dev bypass with an explicit mock user", () => {
  it("returns the stored mock id, name and email (?devUser= still wins)", () => {
    mockGetStoredMockUserId.mockReturnValue(ALICE.id);

    expect(getUserId()).toBe(ALICE.id);
    expect(getUserName()).toBe(ALICE.name);
    expect(getUserEmail()).toBe(ALICE.email);
  });

  it("never prompts for a display name when a mock identity is selected", () => {
    mockGetStoredMockUserId.mockReturnValue(ALICE.id);
    expect(needsDisplayNamePrompt()).toBe(false);
  });
});

describe("userManagement identity — dev bypass with nothing stored", () => {
  it("returns the per-device id, NOT the shared default mock user", () => {
    expect(getUserId()).toBe(DEVICE_ID);
    expect(getUserId()).not.toBe("00000000-0000-0000-0000-000000000002");
  });

  it("returns the device name and the deterministic device email", () => {
    expect(getUserName()).toBe("Quest 3 aaaa");
    expect(getUserEmail()).toBe(`device-${DEVICE_ID}@cia-web.local`);
  });

  it("prefers an explicitly typed display name over the derived one", () => {
    setUserName("Fahim");
    expect(getUserName()).toBe("Fahim");
    // The id is unaffected by the display name.
    expect(getUserId()).toBe(DEVICE_ID);
  });

  it("prompts for a display name until one has been chosen", () => {
    expect(needsDisplayNamePrompt()).toBe(true);

    setUserName("Fahim");
    expect(needsDisplayNamePrompt()).toBe(false);

    clearUserName();
    mockHasDeviceName.mockReturnValue(true);
    expect(needsDisplayNamePrompt()).toBe(false);
  });
});

describe("userManagement identity — revert flag", () => {
  it("restores the default mock user when identity.deviceFallback is false", () => {
    mockConfig.identity = { deviceFallback: false };

    expect(getUserId()).toBe(DEFAULT_MOCK_USER.id);
    expect(getUserName()).toBe(DEFAULT_MOCK_USER.name);
    expect(getUserEmail()).toBe(DEFAULT_MOCK_USER.email);
  });
});

describe("userManagement identity — two devices, two identities", () => {
  // These need module-fresh instances (not the shared top-level import) so
  // each can see its own deviceIdentity mock and its own empty localStorage.
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    mockConfig.devBypassAuth = true;
    mockConfig.identity = { deviceFallback: true };
  });

  it("gives two different device ids two different getUserName() values", async () => {
    vi.doMock("@Core/identity/deviceIdentity.js", () => ({
      getDeviceId: () => "device-one-id",
      getDeviceName: () => "Quest 2 dev1",
      getDeviceEmail: () => "device-one-id@cia-web.local",
      hasDeviceName: () => false,
    }));
    const deviceOne = await import("@Collaboration/presence/userManagement.js");
    const nameOne = deviceOne.getUserName();

    vi.resetModules();
    vi.doMock("@Core/identity/deviceIdentity.js", () => ({
      getDeviceId: () => "device-two-id",
      getDeviceName: () => "Quest 2 dev2",
      getDeviceEmail: () => "device-two-id@cia-web.local",
      hasDeviceName: () => false,
    }));
    const deviceTwo = await import("@Collaboration/presence/userManagement.js");
    const nameTwo = deviceTwo.getUserName();

    expect(nameOne).toBe("Quest 2 dev1");
    expect(nameTwo).toBe("Quest 2 dev2");
    expect(nameOne).not.toBe(nameTwo);
  });
});

describe("userManagement identity — one-time migration of the poisoned shared name", () => {
  // The migration runs once, at module top-level init, so each scenario needs
  // its own fresh module instance with localStorage seeded beforehand.
  beforeEach(() => {
    // Re-pin the deviceIdentity mock to the file's default ("Quest 3 aaaa").
    // vi.doMock persists past resetModules, so without this the leftover
    // per-test override from the "two devices" block above would leak in.
    vi.doMock("@Core/identity/deviceIdentity.js", () => ({
      getDeviceId: () => DEVICE_ID,
      getDeviceName: () => "Quest 3 aaaa",
      getDeviceEmail: () => `device-${DEVICE_ID}@cia-web.local`,
      hasDeviceName: () => mockHasDeviceName(),
    }));
    vi.resetModules();
    localStorage.clear();
    mockConfig.devBypassAuth = true;
    mockConfig.identity = { deviceFallback: true };
  });

  it('clears a persisted "CIA Admin" and falls back to the device name', async () => {
    localStorage.setItem("cia_username", "CIA Admin");

    const fresh = await import("@Collaboration/presence/userManagement.js");

    expect(localStorage.getItem("cia_username")).toBeNull();
    expect(fresh.getUserName()).toBe("Quest 3 aaaa");
  });

  it("leaves a genuinely chosen name intact", async () => {
    localStorage.setItem("cia_username", "Fahim");

    const fresh = await import("@Collaboration/presence/userManagement.js");

    expect(localStorage.getItem("cia_username")).toBe("Fahim");
    expect(fresh.getUserName()).toBe("Fahim");
  });

  it("does not touch a persisted name outside dev bypass", async () => {
    mockConfig.devBypassAuth = false;
    localStorage.setItem("cia_username", "CIA Admin");

    await import("@Collaboration/presence/userManagement.js");

    // Not dev bypass, so the migration guard must not fire even though the
    // stored value matches the shared mock name.
    expect(localStorage.getItem("cia_username")).toBe("CIA Admin");
  });
});

describe("userManagement identity — production path unchanged", () => {
  beforeEach(() => {
    mockConfig.devBypassAuth = false;
  });

  it("uses the authenticated user and never the dev fallbacks", () => {
    mockGetAuthUser.mockReturnValue({
      id: "keycloak-user-1",
      name: "Real User",
      email: "real@example.com",
    });

    expect(getUserId()).toBe("keycloak-user-1");
    expect(getUserName()).toBe("Real User");
    expect(getUserEmail()).toBe("real@example.com");
    expect(mockGetStoredMockUserId).not.toHaveBeenCalled();
  });

  it("falls back to the locally generated id when nobody is signed in", () => {
    const id = getUserId();
    expect(id).not.toBe(DEVICE_ID);
    expect(id).not.toBe(DEFAULT_MOCK_USER.id);
    expect(getUserEmail()).toBeNull();
  });

  it("does not prompt for a display name when signed in", () => {
    mockGetAuthUser.mockReturnValue({ id: "keycloak-user-1" });
    expect(needsDisplayNamePrompt()).toBe(false);
  });
});
