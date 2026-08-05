import { beforeEach, describe, expect, test, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  handleUnauthorized: vi.fn(),
}));

vi.mock("@Services/authService.js", () => ({
  authService: authMocks,
}));

vi.mock("@Core/config/clientConfig.js", () => ({
  config: {
    apiBaseUrl: "/api",
    devBypassAuth: false,
  },
}));

vi.mock("@Utils/logger.js", () => ({
  api: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@Config/mockUsers.js", () => ({
  getStoredMockUserId: vi.fn(),
  getMockUser: vi.fn(),
  getDefaultMockUser: vi.fn(),
}));

vi.mock("@Core/identity/deviceIdentity.js", () => ({
  getDeviceId: vi.fn(),
  getDeviceName: vi.fn(),
  getDeviceEmail: vi.fn(),
}));

import { ApiClient } from "../apiClient.js";

describe("ApiClient authentication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authMocks.getAccessToken.mockReset();
    authMocks.handleUnauthorized.mockReset();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  test("adds the current bearer token to authenticated requests", async () => {
    authMocks.getAccessToken.mockResolvedValue("access-token");

    await new ApiClient("/api").get("/projects");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      })
    );
  });

  test("does not request or attach a token when skipAuth is set", async () => {
    await new ApiClient("/api").get("/health", { skipAuth: true });

    expect(authMocks.getAccessToken).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ headers: {} })
    );
  });
});
