// src/services/__tests__/replayService.test.js
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@Utils/logger.js', () => ({
  api: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('@Services/apiClient.js', () => ({
  apiClient: { get: vi.fn() },
}));

// applyDeltaEvents is the read-only apply engine — spy on it.
const applyDeltaEvents = vi.hoisted(() => vi.fn(async () => ({ applied: 0, lastAppliedEventId: null, failed: false })));
vi.mock('@Services/syncService.js', () => ({
  applyDeltaEvents,
}));

// serverSync singleton with mock managers + watermark.
const serverSyncMock = vi.hoisted(() => ({
  _lastWatermark: 7,
  viewConfigurationManager: { tag: 'vcm' },
  annotationManager: { tag: 'am' },
  viewGroupManager: { tag: 'vgm' },
  workspaceAnnotationManager: { tag: 'wam' },
}));
vi.mock('@Services/serverSync.js', () => ({ serverSync: serverSyncMock }));

// Simple in-memory EventBus mock.
const busHandlers = vi.hoisted(() => new Map());
const eventBusMock = vi.hoisted(() => ({
  on: vi.fn((ev, h) => {
    if (!busHandlers.has(ev)) busHandlers.set(ev, new Set());
    busHandlers.get(ev).add(h);
    return () => busHandlers.get(ev).delete(h);
  }),
  emit: vi.fn((ev, data) => {
    (busHandlers.get(ev) || []).forEach((h) => h(data));
  }),
}));
vi.mock('@Core/events/EventBus.js', () => ({
  eventBus: eventBusMock,
  BUS_EVENTS: {},
}));

import { replayService, REPLAY_EVENTS } from '../replayService.js';
import { apiClient } from '@Services/apiClient.js';

// ============================================================================
// Helpers
// ============================================================================

function makeEvent(id, type = 'view_configuration', createdOffsetMs = 0) {
  return {
    id,
    entity_type: type,
    entity_id: `entity-${id}`,
    operation: 'update',
    next_revision: id,
    actor_user_id: 'user-abc',
    created_at: new Date(1_700_000_000_000 + createdOffsetMs).toISOString(),
  };
}

/** Configure apiClient.get to return the given events across paged responses. */
function mockPagedEvents(pages) {
  apiClient.get.mockReset();
  pages.forEach((page) => {
    apiClient.get.mockResolvedValueOnce(page);
  });
}

const WS = 'ws-replay-001';

beforeEach(async () => {
  vi.clearAllMocks();
  busHandlers.clear();
  applyDeltaEvents.mockResolvedValue({ applied: 0, lastAppliedEventId: null, failed: false });
  await replayService.reset();
  if (typeof window !== 'undefined') window.__CIA_REPLAY_ACTIVE__ = false;
});

// ============================================================================
// Paging
// ============================================================================

describe('load / paging', () => {
  test('follows the cursor across pages and buffers in order', async () => {
    mockPagedEvents([
      { events: [makeEvent(1), makeEvent(2)], nextCursor: 2, hasMore: true },
      { events: [makeEvent(3)], nextCursor: 3, hasMore: false },
    ]);

    const events = await replayService.load(WS);
    expect(events.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    // Second call carries the cursor from the first page.
    expect(apiClient.get.mock.calls[1][0]).toContain('cursor=2');
  });

  test('stops after a single page when hasMore is false', async () => {
    mockPagedEvents([{ events: [makeEvent(1)], nextCursor: 1, hasMore: false }]);
    await replayService.load(WS);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  test('passes entityTypes filter to the request', async () => {
    mockPagedEvents([{ events: [], nextCursor: null, hasMore: false }]);
    await replayService.load(WS, { entityTypes: ['annotation', 'viewgroup'] });
    const url = apiClient.get.mock.calls[0][0];
    expect(decodeURIComponent(url)).toContain('entityTypes=annotation,viewgroup');
  });

  test('emits LOADED with the total', async () => {
    const loaded = vi.fn();
    eventBusMock.on(REPLAY_EVENTS.LOADED, loaded);
    mockPagedEvents([{ events: [makeEvent(1), makeEvent(2)], nextCursor: 2, hasMore: false }]);
    await replayService.load(WS);
    expect(loaded).toHaveBeenCalledWith({ total: 2 });
  });
});

// ============================================================================
// Replay mode + suppression
// ============================================================================

describe('replay mode + suppression flag', () => {
  test('enterReplay raises the suppression flag and window marker', () => {
    replayService.enterReplay();
    expect(replayService.isInReplayMode()).toBe(true);
    expect(replayService.isSuppressingSync()).toBe(true);
    expect(window.__CIA_REPLAY_ACTIVE__).toBe(true);
  });

  test('exitReplay clears the suppression flag and converges via applyDeltaEvents', async () => {
    mockPagedEvents([{ events: [makeEvent(1), makeEvent(2)], nextCursor: 2, hasMore: false }]);
    await replayService.load(WS);
    replayService.enterReplay();
    applyDeltaEvents.mockClear();

    await replayService.exitReplay();
    expect(replayService.isInReplayMode()).toBe(false);
    expect(replayService.isSuppressingSync()).toBe(false);
    expect(window.__CIA_REPLAY_ACTIVE__).toBe(false);
    // Converged by applying the full buffered set once.
    expect(applyDeltaEvents).toHaveBeenCalledTimes(1);
    const [eventsArg, managersArg] = applyDeltaEvents.mock.calls[0];
    expect(eventsArg.map((e) => e.id)).toEqual([1, 2]);
    expect(managersArg.viewConfigurationManager).toBe(serverSyncMock.viewConfigurationManager);
  });

  test('never calls apiClient with a write method (read-only)', async () => {
    mockPagedEvents([{ events: [makeEvent(1)], nextCursor: 1, hasMore: false }]);
    await replayService.load(WS);
    replayService.enterReplay();
    await replayService.seek(0);
    // apiClient only exposes get in the mock; assert nothing else was invoked.
    expect(Object.keys(apiClient)).toEqual(['get']);
  });
});

// ============================================================================
// Seek semantics
// ============================================================================

describe('seek', () => {
  beforeEach(async () => {
    mockPagedEvents([
      { events: [makeEvent(1), makeEvent(2), makeEvent(3)], nextCursor: 3, hasMore: false },
    ]);
    await replayService.load(WS);
    replayService.enterReplay();
    applyDeltaEvents.mockClear();
  });

  test('forward seek applies only the newly-crossed events', async () => {
    await replayService.seek(1); // apply events index 0..1
    expect(applyDeltaEvents).toHaveBeenCalledTimes(1);
    const applied = applyDeltaEvents.mock.calls[0][0];
    expect(applied.map((e) => e.id)).toEqual([1, 2]);
    expect(replayService.getState().position).toBe(1);
  });

  test('backward seek rebuilds from the start', async () => {
    await replayService.seek(2); // position 2
    applyDeltaEvents.mockClear();

    await replayService.seek(0); // backward → rebuild [0..0]
    expect(applyDeltaEvents).toHaveBeenCalledTimes(1);
    const applied = applyDeltaEvents.mock.calls[0][0];
    expect(applied.map((e) => e.id)).toEqual([1]);
    expect(replayService.getState().position).toBe(0);
  });

  test('seek clamps to valid range', async () => {
    await replayService.seek(999);
    expect(replayService.getState().position).toBe(2); // last index
    await replayService.seek(-999);
    expect(replayService.getState().position).toBe(-1); // before-first
  });

  test('emits POSITION_CHANGED on seek', async () => {
    const posCb = vi.fn();
    eventBusMock.on(REPLAY_EVENTS.POSITION_CHANGED, posCb);
    await replayService.seek(1);
    expect(posCb).toHaveBeenCalled();
    expect(posCb.mock.calls.at(-1)[0].position).toBe(1);
  });
});

// ============================================================================
// Playback timing (fake timers)
// ============================================================================

describe('play timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('play advances through events on the timer', async () => {
    mockPagedEvents([
      {
        events: [makeEvent(1, 'view_configuration', 0), makeEvent(2, 'view_configuration', 1000), makeEvent(3, 'view_configuration', 2000)],
        nextCursor: 3,
        hasMore: false,
      },
    ]);
    await replayService.load(WS);
    applyDeltaEvents.mockClear();

    replayService.play();
    expect(replayService.getState().playing).toBe(true);

    // Advance generously: each step delay is clamped to <=2000ms, and after
    // the last event an extra tick fires stepForward() → false → pause().
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(replayService.getState().position).toBe(2);
    // Auto-paused at the end.
    expect(replayService.getState().playing).toBe(false);
  });

  test('pause stops the timer', async () => {
    mockPagedEvents([
      { events: [makeEvent(1, 'view_configuration', 0), makeEvent(2, 'view_configuration', 5000)], nextCursor: 2, hasMore: false },
    ]);
    await replayService.load(WS);
    replayService.play();
    replayService.pause();
    expect(replayService.getState().playing).toBe(false);

    const posBefore = replayService.getState().position;
    await vi.advanceTimersByTimeAsync(10000);
    expect(replayService.getState().position).toBe(posBefore);
  });

  test('setSpeed only accepts the allowed multipliers', () => {
    replayService.setSpeed(2);
    expect(replayService.getSpeed()).toBe(2);
    replayService.setSpeed(3); // invalid — ignored
    expect(replayService.getSpeed()).toBe(2);
  });
});
