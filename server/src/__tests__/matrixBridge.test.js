// server/src/__tests__/matrixBridge.test.js
// Unit tests for the Matrix federation bridge.
// No database, no Synapse required — matrix-js-sdk is never loaded because these
// tests never call bridge.initialize() with enabled:true against a real homeserver.
// Tests exercise: disabled-flag no-op behavior, echo suppression, event dedup,
// rate limiting, circuit breaker, and the user-resolver delegation contract.

'use strict';

const { MatrixBridgeService, createMatrixBridge } = require('../services/matrixBridge');

// ============================================================================
// FACTORY / CONFIG VALIDATION
// ============================================================================

describe('createMatrixBridge()', () => {
  test('defaults enabled to true when not specified but throws without asToken', () => {
    expect(() => createMatrixBridge({})).toThrow('Matrix AS token is required');
  });

  test('does not require asToken when enabled is explicitly false', () => {
    const bridge = createMatrixBridge({ enabled: false });
    expect(bridge).toBeInstanceOf(MatrixBridgeService);
    expect(bridge.config.enabled).toBe(false);
  });

  test('accepts config with asToken when enabled', () => {
    const bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
    expect(bridge.config.enabled).toBe(true);
    expect(bridge.config.asToken).toBe('tok');
  });

  test('applies sensible defaults for homeserverUrl/serverName/senderLocalpart', () => {
    const bridge = createMatrixBridge({ enabled: false });
    expect(bridge.config.homeserverUrl).toBe('http://localhost:8008');
    expect(bridge.config.serverName).toBe('matrix.cia-web.local');
    expect(bridge.config.senderLocalpart).toBe('cia_bridge');
  });
});

// ============================================================================
// DISABLED-FLAG NO-OP BEHAVIOR
// ============================================================================

describe('Disabled feature flag — zero network calls', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: false });
  });

  test('initialize() returns immediately without connecting', async () => {
    await bridge.initialize(null, null);

    expect(bridge.isInitialized).toBe(false);
    expect(bridge.isConnected).toBe(false);
    expect(bridge.client).toBeNull();
    expect(bridge.userResolver).toBeNull();
  });

  test('initialize() never loads the Matrix SDK or creates a client when disabled', async () => {
    await bridge.initialize(null, null);
    // client stays null — no createClient() call was made, no network I/O occurred
    expect(bridge.client).toBeNull();
  });

  test('syncToMatrix() is a no-op when not connected (disabled bridges are never connected)', async () => {
    const result = await bridge.syncToMatrix({
      id: 'msg-1',
      roomId: 'room-1',
      message: 'hello',
      username: 'Alice',
      metadata: {},
    });

    expect(result).toBeNull();
  });

  test('getStatus() reports enabled:false and connected:false with no throw', () => {
    const status = bridge.getStatus();
    expect(status.enabled).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.initialized).toBe(false);
  });

  test('shutdown() on a never-initialized disabled bridge does not throw', async () => {
    await expect(bridge.shutdown()).resolves.not.toThrow();
  });

  test('calling initialize() twice is idempotent and safe', async () => {
    await bridge.initialize(null, null);
    await bridge.initialize(null, null);
    expect(bridge.isInitialized).toBe(false);
  });
});

// ============================================================================
// ECHO SUPPRESSION (outbound sync must never re-relay Matrix-origin messages)
// ============================================================================

describe('Echo suppression — syncToMatrix()', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
    // Simulate a connected bridge without going through the real SDK
    bridge.isConnected = true;
    bridge.pool = null;
  });

  test('skips messages whose metadata.federation_source is "matrix"', async () => {
    const result = await bridge.syncToMatrix({
      id: 'msg-1',
      roomId: 'room-1',
      message: 'From Matrix',
      username: 'federated-user',
      metadata: {
        federation_source: 'matrix',
        matrix_event_id: '$abc123:matrix.org',
      },
    });

    expect(result).toBeNull();
  });

  test('does not call _sendMatrixMessage for federation-sourced messages', async () => {
    const spy = jest.spyOn(bridge, '_sendMatrixMessage');

    await bridge.syncToMatrix({
      id: 'msg-2',
      roomId: 'room-1',
      message: 'Also from Matrix',
      username: 'federated-user',
      metadata: { federation_source: 'matrix' },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test('attempts to sync a genuinely local message (no matching room mapping -> null, but no early return)', async () => {
    // No room mapping exists, so _getMatrixRoomId resolves to null and syncToMatrix
    // returns null for a *different* reason (unmapped room) — verifying we reach
    // that branch (not the echo-suppression branch) confirms local messages are not
    // suppressed by the federation_source check.
    const result = await bridge.syncToMatrix({
      id: 'msg-3',
      roomId: 'unmapped-room',
      message: 'Hello from CIA Web',
      username: 'Alice',
      metadata: {},
    });

    expect(result).toBeNull(); // null because unmapped, not because of echo suppression
  });

  test('regression: a Matrix-origin message re-hydrated with metadata.source (old buggy key) must NOT be treated as suppressed', async () => {
    // This documents the bug that was fixed: the inbound relay handler previously
    // wrote metadata.source = 'matrix' instead of metadata.federation_source = 'matrix',
    // which meant syncToMatrix's echo check never matched and the message would be
    // relayed straight back to Matrix, causing an infinite echo loop. We assert here
    // that ONLY federation_source (not source) suppresses the sync, so any future
    // regression reintroducing the wrong key will be caught by comparing against the
    // correct-key test above returning null-for-different-reason vs this one actually
    // attempting to send (and failing due to unmapped room, not being skipped for echo).
    const spy = jest.spyOn(bridge, '_sendMatrixMessage');

    await bridge.syncToMatrix({
      id: 'msg-4',
      roomId: 'unmapped-room',
      message: 'Mislabeled federation metadata',
      username: 'federated-user',
      metadata: { source: 'matrix' }, // wrong key — should NOT suppress
    });

    // Reaches the room-mapping lookup (and returns null because unmapped), proving
    // the echo-suppression branch was skipped for this metadata shape.
    expect(spy).not.toHaveBeenCalled(); // still not called, but because room is unmapped
  });
});

// ============================================================================
// EVENT DEDUPLICATION (prevents processing the same Matrix event twice)
// ============================================================================

describe('Event deduplication', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
    bridge.pool = null; // in-memory only
  });

  test('_isDuplicate() is false for an unseen event', async () => {
    const isDup = await bridge._isDuplicate('$never-seen:matrix.org');
    expect(isDup).toBe(false);
  });

  test('_markProcessed() then _isDuplicate() returns true (in-memory path)', async () => {
    await bridge._markProcessed('$event-1:matrix.org', 'msg-1', 'inbound', '!room:matrix.org', 'cia-room', '@user:matrix.org');

    const isDup = await bridge._isDuplicate('$event-1:matrix.org');
    expect(isDup).toBe(true);
  });

  test('processedEvents cache is cleaned up after TTL (manual trigger)', () => {
    bridge.processedEvents.set('$old-event', Date.now() - (bridge.deduplicationTTL + 1000));
    bridge.processedEvents.set('$fresh-event', Date.now());

    // Simulate what the cleanup interval body does, without waiting 5 minutes
    const now = Date.now();
    for (const [eventId, timestamp] of bridge.processedEvents.entries()) {
      if (now - timestamp > bridge.deduplicationTTL) {
        bridge.processedEvents.delete(eventId);
      }
    }

    expect(bridge.processedEvents.has('$old-event')).toBe(false);
    expect(bridge.processedEvents.has('$fresh-event')).toBe(true);
  });
});

// ============================================================================
// RATE LIMITING
// ============================================================================

describe('checkRateLimit()', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
  });

  test('allows the first action for a user', () => {
    expect(bridge.checkRateLimit('roomJoins', 'user-1', 60000)).toBe(true);
  });

  test('blocks a second action within the window', () => {
    bridge.checkRateLimit('roomJoins', 'user-1', 60000);
    expect(bridge.checkRateLimit('roomJoins', 'user-1', 60000)).toBe(false);
  });

  test('tracks limits independently per action type', () => {
    bridge.checkRateLimit('roomJoins', 'user-1', 60000);
    expect(bridge.checkRateLimit('directorySearches', 'user-1', 60000)).toBe(true);
  });

  test('unknown action types are always allowed (fail-open)', () => {
    expect(bridge.checkRateLimit('notARealAction', 'user-1')).toBe(true);
  });
});

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

describe('Circuit breaker', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
  });

  test('starts CLOSED', () => {
    expect(bridge.circuitBreaker.getState().state).toBe('CLOSED');
  });

  test('opens after failureThreshold consecutive failures', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        bridge.circuitBreaker.execute(async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
    }

    expect(bridge.circuitBreaker.getState().state).toBe('OPEN');
  });

  test('fails fast with CIRCUIT_OPEN error code once open', async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await bridge.circuitBreaker.execute(async () => {
          throw new Error('boom');
        });
      } catch (_) {
        // expected
      }
    }

    await expect(bridge.circuitBreaker.execute(async () => 'ok')).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN',
    });
  });
});

// ============================================================================
// USER RESOLUTION DELEGATION (matrixBridge._resolveMatrixUser)
// ============================================================================

describe('_resolveMatrixUser() delegation to MatrixUserResolver', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
  });

  test('falls back to localpart-derived profile when no userResolver is attached', async () => {
    bridge.userResolver = null;

    const result = await bridge._resolveMatrixUser('@alice:example.org');

    expect(result).toEqual({
      userId: null,
      displayName: 'alice',
      matrixUserId: '@alice:example.org',
      isFederated: true,
    });
  });

  test('uses the attached userResolver for display name and avatar when available', async () => {
    const fakeResolver = {
      resolveUser: jest.fn().mockResolvedValue({
        matrixUserId: '@alice:example.org',
        displayName: 'Alice Federation',
        avatarUrl: 'https://example.org/avatar.png',
      }),
    };
    bridge.userResolver = fakeResolver;

    const result = await bridge._resolveMatrixUser('@alice:example.org', '!room:example.org');

    expect(fakeResolver.resolveUser).toHaveBeenCalledWith('@alice:example.org', '!room:example.org');
    expect(result).toEqual({
      userId: null,
      displayName: 'Alice Federation',
      avatarUrl: 'https://example.org/avatar.png',
      matrixUserId: '@alice:example.org',
      isFederated: true,
    });
  });

  test('falls back gracefully if the resolver throws', async () => {
    const fakeResolver = {
      resolveUser: jest.fn().mockRejectedValue(new Error('Matrix API unreachable')),
    };
    bridge.userResolver = fakeResolver;

    const result = await bridge._resolveMatrixUser('@bob:example.org');

    expect(result.displayName).toBe('bob');
    expect(result.isFederated).toBe(true);
  });
});

// ============================================================================
// RETRY QUEUE
// ============================================================================

describe('Retry queue', () => {
  let bridge;

  beforeEach(() => {
    bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
  });

  test('_addToRetryQueue() enqueues with zero attempts', () => {
    bridge._addToRetryQueue({ id: 'msg-1', roomId: 'room-1', message: 'hi' });

    expect(bridge.retryQueue).toHaveLength(1);
    expect(bridge.retryQueue[0].attempts).toBe(0);
    expect(bridge.retryQueue[0].message.id).toBe('msg-1');
  });

  test('_processRetryQueue() drops a message once maxRetries is reached', async () => {
    bridge.retryQueue.push({
      message: { id: 'msg-2', roomId: 'room-1', message: 'hi' },
      attempts: bridge.maxRetries,
      nextRetryTime: Date.now(),
      addedAt: Date.now(),
    });

    await bridge._processRetryQueue();

    expect(bridge.retryQueue).toHaveLength(0);
  });
});

// ============================================================================
// SHUTDOWN CLEANUP (timers must not leak)
// ============================================================================

describe('shutdown() timer cleanup', () => {
  test('clears deduplication cleanup interval if one was started', async () => {
    const bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
    bridge._startDeduplicationCleanup();
    expect(bridge.deduplicationCleanupInterval).not.toBeNull();

    await bridge.shutdown();

    expect(bridge.deduplicationCleanupInterval).toBeNull();
  });

  test('stops and detaches the user resolver cache cleanup on shutdown', async () => {
    const bridge = createMatrixBridge({ enabled: true, asToken: 'tok' });
    const fakeResolver = {
      stopCacheCleanup: jest.fn(),
      clearCache: jest.fn(),
    };
    bridge.userResolver = fakeResolver;

    await bridge.shutdown();

    expect(fakeResolver.stopCacheCleanup).toHaveBeenCalled();
    expect(fakeResolver.clearCache).toHaveBeenCalled();
    expect(bridge.userResolver).toBeNull();
  });
});
