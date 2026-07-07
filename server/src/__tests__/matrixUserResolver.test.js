// server/src/__tests__/matrixUserResolver.test.js
// Unit tests for Matrix user profile resolution.
// No database, no Synapse required — the Matrix client is a plain mock object with
// jest.fn() implementations, so no network I/O ever occurs.

'use strict';

const { MatrixUserResolver, createMatrixUserResolver } = require('../services/matrixUserResolver');

function makeMockClient(overrides = {}) {
  return {
    baseUrl: 'https://matrix.example.org',
    getProfileInfo: jest.fn().mockResolvedValue({ displayname: 'Alice', avatar_url: null }),
    getRoom: jest.fn().mockReturnValue(null),
    mxcUrlToHttp: jest.fn((mxc) => `https://example.org/thumb/${mxc}`),
    ...overrides,
  };
}

describe('createMatrixUserResolver()', () => {
  test('throws if no matrix client is provided', () => {
    expect(() => createMatrixUserResolver(null, null)).toThrow('Matrix client is required');
  });

  test('creates a resolver instance given a client', () => {
    const resolver = createMatrixUserResolver(makeMockClient(), null);
    expect(resolver).toBeInstanceOf(MatrixUserResolver);
    resolver.stopCacheCleanup();
  });
});

describe('resolveUser()', () => {
  let client;
  let resolver;

  afterEach(() => {
    resolver?.stopCacheCleanup();
  });

  test('resolves display name and avatar from the Matrix client (no DB pool)', async () => {
    client = makeMockClient({
      getProfileInfo: jest.fn().mockResolvedValue({
        displayname: 'Alice Federation',
        avatar_url: 'mxc://example.org/abc123',
      }),
    });
    resolver = new MatrixUserResolver(client, null);

    const profile = await resolver.resolveUser('@alice:example.org');

    expect(profile.matrixUserId).toBe('@alice:example.org');
    expect(profile.displayName).toBe('Alice Federation');
    expect(profile.avatarUrl).toBe('https://example.org/thumb/mxc://example.org/abc123');
    expect(profile.serverName).toBe('example.org');
    expect(profile.isFederated).toBe(true);
    expect(client.getProfileInfo).toHaveBeenCalledWith('@alice:example.org');
  });

  test('falls back to localpart when displayname is missing', async () => {
    client = makeMockClient({
      getProfileInfo: jest.fn().mockResolvedValue({ displayname: null, avatar_url: null }),
    });
    resolver = new MatrixUserResolver(client, null);

    const profile = await resolver.resolveUser('@bob:example.org');

    expect(profile.displayName).toBe('bob');
    expect(profile.avatarUrl).toBeNull();
  });

  test('returns a fallback profile when the Matrix API call fails (no throw)', async () => {
    client = makeMockClient({
      getProfileInfo: jest.fn().mockRejectedValue(new Error('ECONNREFUSED: Synapse unreachable')),
    });
    resolver = new MatrixUserResolver(client, null);

    const profile = await resolver.resolveUser('@carol:example.org');

    expect(profile.displayName).toBe('carol');
    expect(profile.serverName).toBe('example.org');
    expect(profile.isFederated).toBe(true);
    expect(profile.avatarUrl).toBeNull();
  });

  test('caches resolved profiles and does not re-hit the Matrix API on second call', async () => {
    client = makeMockClient();
    resolver = new MatrixUserResolver(client, null);

    await resolver.resolveUser('@alice:example.org');
    await resolver.resolveUser('@alice:example.org');

    expect(client.getProfileInfo).toHaveBeenCalledTimes(1);
  });

  test('uses room-specific display name and avatar when a room member is found', async () => {
    const member = {
      name: 'Alice (Room Nick)',
      getAvatarUrl: jest.fn().mockReturnValue('mxc://example.org/room-avatar'),
    };
    const room = { getMember: jest.fn().mockReturnValue(member) };
    client = makeMockClient({
      getRoom: jest.fn().mockReturnValue(room),
    });
    resolver = new MatrixUserResolver(client, null);

    const profile = await resolver.resolveUser('@alice:example.org', '!room:example.org');

    expect(profile.displayName).toBe('Alice (Room Nick)');
    expect(room.getMember).toHaveBeenCalledWith('@alice:example.org');
  });

  test('invalidateCache() forces a fresh API lookup', async () => {
    client = makeMockClient();
    resolver = new MatrixUserResolver(client, null);

    await resolver.resolveUser('@alice:example.org');
    resolver.invalidateCache('@alice:example.org');
    await resolver.resolveUser('@alice:example.org');

    expect(client.getProfileInfo).toHaveBeenCalledTimes(2);
  });
});

describe('resolveUsers() (batch)', () => {
  test('resolves multiple users in parallel and returns a Map keyed by userId', async () => {
    const client = makeMockClient();
    const resolver = new MatrixUserResolver(client, null);

    const results = await resolver.resolveUsers(['@a:example.org', '@b:example.org']);

    expect(results.size).toBe(2);
    expect(results.get('@a:example.org').matrixUserId).toBe('@a:example.org');
    expect(results.get('@b:example.org').matrixUserId).toBe('@b:example.org');

    resolver.stopCacheCleanup();
  });
});

describe('localpart / server name extraction', () => {
  let resolver;

  beforeEach(() => {
    resolver = new MatrixUserResolver(makeMockClient(), null);
  });

  afterEach(() => {
    resolver.stopCacheCleanup();
  });

  test('_extractLocalpart strips leading @ and trailing :server', () => {
    expect(resolver._extractLocalpart('@dave:matrix.org')).toBe('dave');
  });

  test('_extractServerName returns the homeserver domain', () => {
    expect(resolver._extractServerName('@dave:matrix.org')).toBe('matrix.org');
  });

  test('_extractServerName returns "unknown" for malformed IDs without a server part', () => {
    expect(resolver._extractServerName('not-a-valid-id')).toBe('unknown');
  });
});

describe('cache cleanup timer lifecycle', () => {
  test('stopCacheCleanup() clears the interval and is idempotent', () => {
    const resolver = new MatrixUserResolver(makeMockClient(), null);
    expect(resolver.cacheCleanupInterval).not.toBeNull();

    resolver.stopCacheCleanup();
    expect(resolver.cacheCleanupInterval).toBeNull();

    // Calling again should not throw
    expect(() => resolver.stopCacheCleanup()).not.toThrow();
  });

  test('clearCache() empties the in-memory cache', async () => {
    const client = makeMockClient();
    const resolver = new MatrixUserResolver(client, null);

    await resolver.resolveUser('@alice:example.org');
    expect(resolver.getCacheStats().size).toBe(1);

    resolver.clearCache();
    expect(resolver.getCacheStats().size).toBe(0);

    resolver.stopCacheCleanup();
  });
});
