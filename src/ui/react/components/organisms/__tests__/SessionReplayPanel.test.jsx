// src/ui/react/components/organisms/__tests__/SessionReplayPanel.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Minimal atom stand-ins so we can assert on labels/handlers without styling.
vi.mock('@UI/react/components/atoms', () => ({
  Icon: ({ name }) => <i data-icon={name} />,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  IconButton: ({ icon, onClick, disabled, title }) => (
    <button data-icon={icon} onClick={onClick} disabled={disabled} title={title}>
      {title}
    </button>
  ),
  Toggle: ({ checked, onChange, label }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
      {label}
    </label>
  ),
  Spinner: () => <span data-testid="spinner" />,
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
}));

// In-memory event bus.
const busHandlers = vi.hoisted(() => new Map());
const eventBusMock = vi.hoisted(() => ({
  on: vi.fn((ev, h) => {
    if (!busHandlers.has(ev)) busHandlers.set(ev, new Set());
    busHandlers.get(ev).add(h);
    return () => busHandlers.get(ev).delete(h);
  }),
  emit: vi.fn((ev, data) => (busHandlers.get(ev) || []).forEach((h) => h(data))),
}));
vi.mock('@Services', () => ({ eventBus: eventBusMock }));

// replayService mock.
const replayServiceMock = vi.hoisted(() => {
  let state = { position: -1, total: 0, playing: false, speed: 1, inReplayMode: false, currentEvent: null };
  let events = [];
  return {
    __setEvents: (e) => { events = e; state = { ...state, total: e.length }; },
    __setState: (s) => { state = { ...state, ...s }; },
    getState: vi.fn(() => state),
    getEvents: vi.fn(() => events),
    load: vi.fn(async () => events),
    reset: vi.fn(async () => {}),
    seek: vi.fn(),
    togglePlay: vi.fn(),
    setSpeed: vi.fn(),
  };
});
vi.mock('@Services/replayService.js', () => ({
  replayService: replayServiceMock,
  REPLAY_EVENTS: {
    LOADED: 'replay:loaded',
    STATE_CHANGED: 'replay:stateChanged',
    POSITION_CHANGED: 'replay:positionChanged',
    ENTERED: 'replay:entered',
    EXITED: 'replay:exited',
    ERROR: 'replay:error',
  },
  REPLAY_SPEEDS: [0.5, 1, 2, 5],
}));

import { SessionReplayPanel } from '../SessionReplayPanel/SessionReplayPanel.jsx';

const SAMPLE_EVENTS = [
  { id: 1, entity_type: 'view_configuration', entity_id: 'e1', operation: 'create', actor_user_id: 'abcdef12', created_at: new Date().toISOString() },
  { id: 2, entity_type: 'annotation', entity_id: 'e2', operation: 'update', actor_user_id: 'abcdef12', created_at: new Date().toISOString() },
  { id: 3, entity_type: 'view_configuration', entity_id: 'e1', operation: 'delete', actor_user_id: 'abcdef12', created_at: new Date().toISOString() },
];

beforeEach(() => {
  vi.clearAllMocks();
  busHandlers.clear();
  replayServiceMock.__setEvents([]);
  replayServiceMock.__setState({ position: -1, total: 0, playing: false, speed: 1, inReplayMode: false, currentEvent: null });
});

// ============================================================================
// Tests
// ============================================================================

describe('SessionReplayPanel', () => {
  test('loads events on mount', async () => {
    replayServiceMock.__setEvents(SAMPLE_EVENTS);
    render(<SessionReplayPanel workspaceId="ws-1" />);
    await waitFor(() => expect(replayServiceMock.load).toHaveBeenCalledWith('ws-1', expect.any(Object)));
  });

  test('renders the empty state when there are no events', async () => {
    render(<SessionReplayPanel workspaceId="ws-1" />);
    await waitFor(() =>
      expect(screen.getByText(/No collaboration history/i)).toBeInTheDocument()
    );
  });

  test('renders entity-type filter toggles', () => {
    render(<SessionReplayPanel workspaceId="ws-1" />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('View Groups')).toBeInTheDocument();
    expect(screen.getByText('Workspace Notes')).toBeInTheDocument();
  });

  test('play/pause button calls togglePlay', async () => {
    replayServiceMock.__setEvents(SAMPLE_EVENTS);
    replayServiceMock.__setState({ total: 3, position: 0 });
    render(<SessionReplayPanel workspaceId="ws-1" />);

    await waitFor(() => expect(screen.getByTitle('Play')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Play'));
    expect(replayServiceMock.togglePlay).toHaveBeenCalled();
  });

  test('speed buttons call setSpeed with the right multiplier', async () => {
    replayServiceMock.__setEvents(SAMPLE_EVENTS);
    replayServiceMock.__setState({ total: 3, position: 0 });
    render(<SessionReplayPanel workspaceId="ws-1" />);

    await waitFor(() => expect(screen.getByText('2x')).toBeInTheDocument());
    fireEvent.click(screen.getByText('2x'));
    expect(replayServiceMock.setSpeed).toHaveBeenCalledWith(2);
  });

  test('step-forward control calls seek', async () => {
    replayServiceMock.__setEvents(SAMPLE_EVENTS);
    replayServiceMock.__setState({ total: 3, position: 0 });
    render(<SessionReplayPanel workspaceId="ws-1" />);

    await waitFor(() => expect(screen.getByTitle('Step forward')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Step forward'));
    expect(replayServiceMock.seek).toHaveBeenCalledWith(1);
  });

  test('reacts to STATE_CHANGED bus events', async () => {
    replayServiceMock.__setEvents(SAMPLE_EVENTS);
    replayServiceMock.__setState({ total: 3, position: 0 });
    render(<SessionReplayPanel workspaceId="ws-1" />);
    await waitFor(() => expect(screen.getByTitle('Play')).toBeInTheDocument());

    // Emit a playing=true state → button flips to Pause.
    eventBusMock.emit('replay:stateChanged', {
      position: 1, total: 3, playing: true, speed: 1, inReplayMode: true,
      currentEvent: SAMPLE_EVENTS[1],
    });
    await waitFor(() => expect(screen.getByTitle('Pause')).toBeInTheDocument());
  });
});
