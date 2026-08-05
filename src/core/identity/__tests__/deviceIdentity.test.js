// src/core/identity/__tests__/deviceIdentity.test.js
// The per-device identity is what makes two headsets on one LAN two distinct
// users: the id must be a UUID (it is upserted into `users.id`, a UUID PK, and
// keys every Y.js participant map), stable, and persisted — and none of it may
// throw when a headset browser refuses localStorage.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fresh module instance — the id is cached at module scope. */
async function loadModule() {
  vi.resetModules();
  return import("@Core/identity/deviceIdentity.js");
}

/** Point navigator.userAgent at a fixed string for a test. */
function setUserAgent(ua) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const REAL_UA = window.navigator.userAgent;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  setUserAgent(REAL_UA);
  vi.restoreAllMocks();
});

describe("deviceIdentity — getDeviceId", () => {
  it("generates a v4 UUID when nothing is stored", async () => {
    const { getDeviceId } = await loadModule();
    expect(getDeviceId()).toMatch(UUID_V4);
  });

  it("persists the generated id to localStorage under cia_user_id", async () => {
    const { getDeviceId, DEVICE_ID_KEY } = await loadModule();
    const id = getDeviceId();
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(id);
  });

  it("is stable across repeated calls", async () => {
    const { getDeviceId } = await loadModule();
    expect(getDeviceId()).toBe(getDeviceId());
  });

  it("reuses an already stored UUID instead of minting a new one", async () => {
    const existing = "11111111-2222-4333-8444-555555555555";
    localStorage.setItem("cia_user_id", existing);
    const { getDeviceId } = await loadModule();
    expect(getDeviceId()).toBe(existing);
  });

  it("replaces a stored non-UUID value (users.id is a UUID column)", async () => {
    localStorage.setItem("cia_user_id", "legacy-not-a-uuid");
    const { getDeviceId } = await loadModule();
    const id = getDeviceId();
    expect(id).toMatch(UUID_V4);
    expect(localStorage.getItem("cia_user_id")).toBe(id);
  });

  it("is never the shared default mock user id", async () => {
    const { getDeviceId } = await loadModule();
    expect(getDeviceId()).not.toBe("00000000-0000-0000-0000-000000000002");
  });
});

describe("deviceIdentity — name derivation", () => {
  it("derives a Quest name from the Oculus Browser user agent", async () => {
    setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/34.0 Chrome/126.0 VR Safari/537.36"
    );
    const { getDeviceName, getDeviceId } = await loadModule();
    const suffix = getDeviceId().replace(/-/g, "").slice(0, 4);
    expect(getDeviceName()).toBe(`Quest 3 ${suffix}`);
  });

  it("derives a Vision Pro name from a visionOS user agent", async () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 visionOS/2.0 Safari/605.1.15"
    );
    const { getDeviceName } = await loadModule();
    expect(getDeviceName()).toMatch(/^Vision Pro [0-9a-f]{4}$/);
  });

  it("falls back to the browser name for a generic desktop user agent", async () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );
    const { getDeviceName } = await loadModule();
    expect(getDeviceName()).toMatch(/^Chrome [0-9a-f]{4}$/);
  });

  it("falls back to Explorer when the user agent says nothing useful", async () => {
    setUserAgent("some-unknown-agent/1.0");
    const { getDeviceName } = await loadModule();
    expect(getDeviceName()).toMatch(/^Explorer [0-9a-f]{4}$/);
  });
});

describe("deviceIdentity — setDeviceName", () => {
  it("persists the name and reports it back", async () => {
    const { setDeviceName, getDeviceName, hasDeviceName, DEVICE_NAME_KEY } =
      await loadModule();

    expect(hasDeviceName()).toBe(false);
    expect(setDeviceName("  Fahim  ")).toBe(true);

    expect(localStorage.getItem(DEVICE_NAME_KEY)).toBe("Fahim");
    expect(getDeviceName()).toBe("Fahim");
    expect(hasDeviceName()).toBe(true);
  });

  it("dispatches cia:identity-changed with the new identity", async () => {
    const { setDeviceName, getDeviceId, IDENTITY_CHANGED_EVENT } =
      await loadModule();

    const listener = vi.fn();
    window.addEventListener(IDENTITY_CHANGED_EVENT, listener);
    setDeviceName("Nova");
    window.removeEventListener(IDENTITY_CHANGED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      id: getDeviceId(),
      name: "Nova",
    });
  });

  it("rejects an empty name without dispatching", async () => {
    const { setDeviceName, hasDeviceName, IDENTITY_CHANGED_EVENT } =
      await loadModule();

    const listener = vi.fn();
    window.addEventListener(IDENTITY_CHANGED_EVENT, listener);
    expect(setDeviceName("   ")).toBe(false);
    window.removeEventListener(IDENTITY_CHANGED_EVENT, listener);

    expect(listener).not.toHaveBeenCalled();
    expect(hasDeviceName()).toBe(false);
  });
});

describe("deviceIdentity — derived identity fields", () => {
  it("builds a deterministic unique email (users.email is NOT NULL UNIQUE)", async () => {
    const { getDeviceEmail, getDeviceId } = await loadModule();
    expect(getDeviceEmail()).toBe(`device-${getDeviceId()}@cia-web.local`);
  });

  it("builds a stable hsl colour matching the userManagement hash", async () => {
    const id = "11111111-2222-4333-8444-555555555555";
    localStorage.setItem("cia_user_id", id);
    const { getDeviceColor } = await loadModule();

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    expect(getDeviceColor()).toBe(`hsl(${Math.abs(hash % 360)}, 70%, 60%)`);
  });

  it("exposes a synthetic user record for dev-user consumers", async () => {
    const { getDeviceUser, getDeviceId, getDeviceEmail } = await loadModule();
    expect(getDeviceUser()).toMatchObject({
      id: getDeviceId(),
      email: getDeviceEmail(),
      externalId: "device",
    });
  });
});

describe("deviceIdentity — hostile storage", () => {
  it("still yields a stable UUID when localStorage throws", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError: storage disabled");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("SecurityError: storage disabled");
      });

    const { getDeviceId, getDeviceName, getDeviceEmail, setDeviceName } =
      await loadModule();

    const id = getDeviceId();
    expect(id).toMatch(UUID_V4);
    expect(getDeviceId()).toBe(id);
    expect(() => getDeviceName()).not.toThrow();
    expect(getDeviceEmail()).toContain(id);
    expect(() => setDeviceName("Nova")).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
