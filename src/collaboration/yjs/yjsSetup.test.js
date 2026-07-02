// src/collaboration/yjs/yjsSetup.test.js
// Documents the actual presence-collision behavior: cursors are keyed by
// userId (two tabs sharing a user id intentionally overwrite one entry),
// while camera sync is keyed by viewId + echo-guarded by per-tab clientId
// (unaffected by userId collisions). No real WebSocket connection is made.

import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
  })),
}));

vi.mock('@Core/config/clientConfig.js', () => ({
  default: { devBypassAuth: true, yjsWebSocketUrl: 'ws://localhost:9001' },
}));

vi.mock('@Core/session/sessionManager', () => ({
  sessionManager: {
    getRoomId: vi.fn(() => 'test-room'),
    getUserId: vi.fn(() => 'test-user'),
  },
}));

vi.mock('@Services/authService.js', () => ({
  authService: {
    getUser: vi.fn(() => ({ id: 'test-user', name: 'Test User' })),
    getAccessToken: vi.fn(async () => null),
  },
}));

vi.mock('@Collaboration/presence/userManagement.js', () => ({
  getUserId: vi.fn(() => 'test-user'),
}));

vi.mock('@Utils/logger.js', () => ({
  sync: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  ydoc,
  yCursors,
  yCameras,
  syncCursorToYjs,
  syncCameraToYjs,
} from './yjsSetup.js';

describe('cursor presence (yCursors) — keyed by userId', () => {
  beforeEach(() => {
    yCursors.clear();
  });

  test('two distinct users produce two distinct cursor entries', () => {
    syncCursorToYjs('user-alice', { position: { x: 1, y: 1 } });
    syncCursorToYjs('user-bob', { position: { x: 2, y: 2 } });

    expect(yCursors.size).toBe(2);
    expect(yCursors.get('user-alice').position).toEqual({ x: 1, y: 1 });
    expect(yCursors.get('user-bob').position).toEqual({ x: 2, y: 2 });
  });

  test('same user id from two tabs overwrites a single entry (expected, documented)', () => {
    syncCursorToYjs('user-shared', { position: { x: 1, y: 1 } });
    syncCursorToYjs('user-shared', { position: { x: 9, y: 9 } });

    expect(yCursors.size).toBe(1);
    expect(yCursors.get('user-shared').position).toEqual({ x: 9, y: 9 });
  });
});

describe('camera presence (yCameras) — keyed by viewId, echo-guarded by clientId', () => {
  beforeEach(() => {
    yCameras.clear();
  });

  test('camera update is keyed by viewId and tagged with this tab clientId', () => {
    syncCameraToYjs('view-1', 'user-alice', { position: [0, 0, 1] });

    const entry = yCameras.get('view-1');
    expect(entry.camera).toEqual({ position: [0, 0, 1] });
    expect(entry.userId).toBe('user-alice');
    expect(entry.clientId).toBe(ydoc.clientID);
  });

  test('same-user multi-tab camera updates still key by viewId, not userId', () => {
    syncCameraToYjs('view-1', 'user-shared', { position: [0, 0, 1] });
    syncCameraToYjs('view-2', 'user-shared', { position: [1, 1, 1] });

    expect(yCameras.size).toBe(2);
    expect(yCameras.get('view-1').camera.position).toEqual([0, 0, 1]);
    expect(yCameras.get('view-2').camera.position).toEqual([1, 1, 1]);
  });
});
