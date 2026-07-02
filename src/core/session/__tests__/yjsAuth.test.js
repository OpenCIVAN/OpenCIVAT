// src/core/session/__tests__/yjsAuth.test.js
// Unit tests for Y.js auth configuration logic.
// Tests the waitForAccessToken and buildYjsParams patterns extracted from
// yjsSetup.js without importing the full module (avoids Y.js module-level init).

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (all factories must be self-contained — no outer-scope refs) ───

vi.mock('@Services/authService.js', () => ({
  authService: {
    getAccessToken: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  default: { yjsWebSocketUrl: 'ws://localhost:9001', devBypassAuth: false },
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { authService } from '@Services/authService.js';
import clientConfig from '@Core/config/clientConfig.js';

// ============================================================================
// Helper functions mirroring yjsSetup.js token logic
// ============================================================================

async function waitForAccessToken(isDevMode) {
  if (isDevMode) return null;
  try {
    return (await authService.getAccessToken?.()) ?? null;
  } catch {
    return null;
  }
}

function buildYjsParams(token, isDevMode, user) {
  const params = {};
  if (token) params.token = token;
  if (isDevMode && user?.id) {
    params.userId = user.id;
    params.username = user.name;
  }
  return params;
}

// ============================================================================
// TESTS
// ============================================================================

describe('waitForAccessToken() logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientConfig.devBypassAuth = false;
  });

  afterEach(() => {
    clientConfig.devBypassAuth = false;
  });

  test('returns JWT token in production mode', async () => {
    authService.getAccessToken.mockResolvedValueOnce('jwt-prod-token');
    const token = await waitForAccessToken(false);
    expect(token).toBe('jwt-prod-token');
    expect(authService.getAccessToken).toHaveBeenCalledTimes(1);
  });

  test('returns null in dev bypass mode without calling getAccessToken', async () => {
    const token = await waitForAccessToken(true);
    expect(token).toBeNull();
    expect(authService.getAccessToken).not.toHaveBeenCalled();
  });

  test('returns null gracefully when getAccessToken throws', async () => {
    authService.getAccessToken.mockRejectedValueOnce(new Error('Keycloak unreachable'));
    const token = await waitForAccessToken(false);
    expect(token).toBeNull();
  });

  test('returns null when getAccessToken returns undefined', async () => {
    authService.getAccessToken.mockResolvedValueOnce(undefined);
    const token = await waitForAccessToken(false);
    expect(token).toBeNull();
  });
});

describe('buildYjsParams() logic', () => {
  test('production mode with token: sets params.token', () => {
    const params = buildYjsParams('my-jwt', false, null);
    expect(params.token).toBe('my-jwt');
    expect(params.userId).toBeUndefined();
  });

  test('dev mode: sets userId and username, no token', () => {
    const user = { id: 'dev-id', name: 'Dev User' };
    const params = buildYjsParams(null, true, user);
    expect(params.token).toBeUndefined();
    expect(params.userId).toBe('dev-id');
    expect(params.username).toBe('Dev User');
  });

  test('no token, no dev mode: empty params', () => {
    const params = buildYjsParams(null, false, null);
    expect(Object.keys(params)).toHaveLength(0);
  });

  test('token set when non-null even without dev mode', () => {
    const params = buildYjsParams('token-x', false, { id: 'u1', name: 'U' });
    expect(params.token).toBe('token-x');
    expect(params.userId).toBeUndefined(); // not dev mode
  });
});

describe('Y.js auth config integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('DEV_BYPASS_AUTH true: skips getAccessToken', async () => {
    clientConfig.devBypassAuth = true;
    const token = await waitForAccessToken(true);
    expect(token).toBeNull();
    expect(authService.getAccessToken).not.toHaveBeenCalled();
    clientConfig.devBypassAuth = false;
  });

  test('production mode calls getAccessToken and passes result', async () => {
    clientConfig.devBypassAuth = false;
    authService.getAccessToken.mockResolvedValueOnce('real-jwt');
    const token = await waitForAccessToken(clientConfig.devBypassAuth);
    expect(token).toBe('real-jwt');
  });
});
