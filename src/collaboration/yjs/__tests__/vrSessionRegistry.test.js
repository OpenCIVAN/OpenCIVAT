// src/collaboration/yjs/__tests__/vrSessionRegistry.test.js
// The shared `vr-sessions` registry (Phase 1 — session convergence): two
// "Enter VR" taps on the same view must converge on ONE Y.js session id.
// claimVRSession is the arbiter — it never overwrites a live record, always
// overwrites a stale one, and getVRSessionForView treats staleness the same
// way. No real WebSocket connection is made (mirrors yjsSetup.test.js).

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
  yVRSessions,
  VR_SESSION_STALE_MS,
  getVRSessionForView,
  claimVRSession,
  heartbeatVRSession,
  releaseVRSession,
} from '../yjsSetup.js';

describe('VR session registry (yVRSessions) — keyed by viewConfigurationId', () => {
  beforeEach(() => {
    yVRSessions.clear();
  });

  test('claimVRSession writes and returns our record when the slot is empty', () => {
    const record = claimVRSession('view-1', {
      sessionId: 'vrsession_alice',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    expect(record.sessionId).toBe('vrsession_alice');
    expect(record.hostUserId).toBe('alice');
    expect(yVRSessions.get('view-1').sessionId).toBe('vrsession_alice');
  });

  test('claimVRSession returns an existing LIVE record unchanged, not ours', () => {
    claimVRSession('view-1', {
      sessionId: 'vrsession_alice',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    const second = claimVRSession('view-1', {
      sessionId: 'vrsession_bob',
      hostUserId: 'bob',
      hostUserName: 'Bob',
    });

    // Bob loses the claim — the record he gets back is Alice's, unchanged.
    expect(second.sessionId).toBe('vrsession_alice');
    expect(second.hostUserId).toBe('alice');
    // The map itself was never touched by Bob's losing claim.
    expect(yVRSessions.get('view-1').sessionId).toBe('vrsession_alice');
  });

  test('a record older than VR_SESSION_STALE_MS is overwritten by a new claim', () => {
    const now = Date.now();
    yVRSessions.set('view-1', {
      sessionId: 'vrsession_dead',
      viewConfigurationId: 'view-1',
      hostUserId: 'ghost',
      hostUserName: 'Ghost',
      createdAt: now - VR_SESSION_STALE_MS - 5000,
      lastHeartbeat: now - VR_SESSION_STALE_MS - 5000,
      participantCount: 1,
    });

    const claimed = claimVRSession('view-1', {
      sessionId: 'vrsession_fresh',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    expect(claimed.sessionId).toBe('vrsession_fresh');
    expect(yVRSessions.get('view-1').sessionId).toBe('vrsession_fresh');
  });

  test('getVRSessionForView returns the record while live', () => {
    claimVRSession('view-1', {
      sessionId: 'vrsession_alice',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    const found = getVRSessionForView('view-1');
    expect(found?.sessionId).toBe('vrsession_alice');
  });

  test('getVRSessionForView returns null for a missing view', () => {
    expect(getVRSessionForView('view-nonexistent')).toBeNull();
  });

  test('getVRSessionForView returns null once the record goes stale', () => {
    const now = Date.now();
    yVRSessions.set('view-1', {
      sessionId: 'vrsession_alice',
      viewConfigurationId: 'view-1',
      hostUserId: 'alice',
      hostUserName: 'Alice',
      createdAt: now - VR_SESSION_STALE_MS - 1000,
      lastHeartbeat: now - VR_SESSION_STALE_MS - 1000,
      participantCount: 1,
    });

    expect(getVRSessionForView('view-1')).toBeNull();
    // The stale entry is left in place for claimVRSession to overwrite —
    // getVRSessionForView itself never deletes it.
    expect(yVRSessions.get('view-1').sessionId).toBe('vrsession_alice');
  });

  test('heartbeatVRSession refreshes lastHeartbeat without touching other fields', () => {
    const before = Date.now() - 5000;
    yVRSessions.set('view-1', {
      sessionId: 'vrsession_alice',
      viewConfigurationId: 'view-1',
      hostUserId: 'alice',
      hostUserName: 'Alice',
      createdAt: before,
      lastHeartbeat: before,
      participantCount: 1,
    });

    heartbeatVRSession('view-1', 'alice');

    const record = yVRSessions.get('view-1');
    expect(record.lastHeartbeat).toBeGreaterThan(before);
    expect(record.hostUserId).toBe('alice');
    expect(record.createdAt).toBe(before);
  });

  test('heartbeatVRSession is a no-op when there is no record for the view', () => {
    heartbeatVRSession('view-missing', 'alice');
    expect(yVRSessions.get('view-missing')).toBeUndefined();
  });

  test('releaseVRSession deletes the record when called by the host', () => {
    claimVRSession('view-1', {
      sessionId: 'vrsession_alice',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    releaseVRSession('view-1', 'alice');

    expect(yVRSessions.get('view-1')).toBeUndefined();
  });

  test('releaseVRSession is a no-op for a non-host', () => {
    claimVRSession('view-1', {
      sessionId: 'vrsession_alice',
      hostUserId: 'alice',
      hostUserName: 'Alice',
    });

    releaseVRSession('view-1', 'bob');

    expect(yVRSessions.get('view-1').sessionId).toBe('vrsession_alice');
    expect(yVRSessions.get('view-1').hostUserId).toBe('alice');
  });
});
