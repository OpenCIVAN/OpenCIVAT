// src/core/session/__tests__/sessionManager.test.js
// Unit tests for SessionManager room resolution and async validation.
// No PostgreSQL required — fetch is mocked.

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock config before importing SessionManager ──────────────────────────

vi.mock('@Core/config/clientConfig.js', () => ({
  config: { defaultSessionId: 'default-session-id' },
}));

vi.mock('@Utils/logger.js', () => ({
  auth: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// ─── Import after mocks ───────────────────────────────────────────────────

// We import the class by re-instantiating for isolation
// The module exports a singleton, so we test the behavior by resetting state
import { sessionManager } from '../sessionManager.js';

// ─── Test constants ───────────────────────────────────────────────────────

const PROJECT_ID = 'proj-111';
const ROOM_UUID  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MAIN_ROOM  = { id: 'main-room-id', name: 'Main Room', is_main: true, room_type: 'main' };

// ─── Helpers ──────────────────────────────────────────────────────────────

function setLocation(pathname, search = '') {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { pathname, search, href: `https://localhost${pathname}${search}` },
  });
}

function setLocalStorage(roomId) {
  localStorage.clear();
  if (roomId) localStorage.setItem('cia_last_room', roomId);
}

function resetSessionManager() {
  sessionManager.roomId = null;
  sessionManager.roomName = null;
  sessionManager._cachedToken = null;
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('SessionManager._resolveRoomFromURL()', () => {
  beforeEach(() => {
    resetSessionManager();
    localStorage.clear();
  });

  test('1. URL path takes highest priority', () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    localStorage.setItem('cia_last_room', 'stored-room');

    const id = sessionManager._resolveRoomFromURL();
    expect(id).toBe(ROOM_UUID);
  });

  test('2. URL query param takes second priority', () => {
    setLocation('/', `?room=${ROOM_UUID}`);
    localStorage.setItem('cia_last_room', 'stored-room');

    const id = sessionManager._resolveRoomFromURL();
    expect(id).toBe(ROOM_UUID);
  });

  test('3. localStorage is third priority', () => {
    setLocation('/');
    localStorage.setItem('cia_last_room', 'stored-room-id');

    const id = sessionManager._resolveRoomFromURL();
    expect(id).toBe('stored-room-id');
  });

  test('4. default falls back to config.defaultSessionId', () => {
    setLocation('/');
    localStorage.clear();

    const id = sessionManager._resolveRoomFromURL();
    expect(id).toBe('default-session-id');
  });
});

describe('SessionManager.initializeFromURL()', () => {
  beforeEach(() => {
    resetSessionManager();
    localStorage.clear();
  });

  test('sets roomId from URL path', () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    const id = sessionManager.initializeFromURL();
    expect(id).toBe(ROOM_UUID);
    expect(sessionManager.roomId).toBe(ROOM_UUID);
  });
});

describe('SessionManager.initializeFromURLAsync()', () => {
  let fetchMock;

  beforeEach(() => {
    resetSessionManager();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('validates room via API and persists to localStorage on 200', async () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    fetchMock.mockResolvedValueOnce({ ok: true });

    const id = await sessionManager.initializeFromURLAsync(PROJECT_ID);

    expect(id).toBe(ROOM_UUID);
    expect(sessionManager.roomId).toBe(ROOM_UUID);
    expect(localStorage.getItem('cia_last_room')).toBe(ROOM_UUID);
  });

  test('falls back to main room and does NOT persist on 404', async () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    // First fetch: room not found
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    // Second fetch: main rooms list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([MAIN_ROOM]),
    });

    const id = await sessionManager.initializeFromURLAsync(PROJECT_ID);

    expect(id).toBe(MAIN_ROOM.id);
    expect(sessionManager.roomId).toBe(MAIN_ROOM.id);
    // localStorage must NOT be set to the unauthorized room
    expect(localStorage.getItem('cia_last_room')).toBeNull();
  });

  test('falls back to main room and does NOT persist on 403', async () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([MAIN_ROOM]),
    });

    const id = await sessionManager.initializeFromURLAsync(PROJECT_ID);

    expect(id).toBe(MAIN_ROOM.id);
    expect(localStorage.getItem('cia_last_room')).toBeNull();
  });

  test('proceeds with unvalidated room when fetch throws (offline)', async () => {
    setLocation(`/rooms/${ROOM_UUID}`);
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const id = await sessionManager.initializeFromURLAsync(PROJECT_ID);

    // Offline-friendly: continue with resolved room
    expect(id).toBe(ROOM_UUID);
    expect(sessionManager.roomId).toBe(ROOM_UUID);
  });

  test('uses config default when no projectId provided', async () => {
    setLocation('/');
    localStorage.clear();

    const id = await sessionManager.initializeFromURLAsync(null);

    expect(id).toBe('default-session-id');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('SessionManager auth token handling', () => {
  test('setToken/getToken round-trips', () => {
    sessionManager.setToken('my-token');
    expect(sessionManager.getToken()).toBe('my-token');
  });

  test('clearSession wipes token', () => {
    sessionManager.setToken('tok');
    sessionManager.clearSession();
    expect(sessionManager.getToken()).toBeNull();
  });
});
