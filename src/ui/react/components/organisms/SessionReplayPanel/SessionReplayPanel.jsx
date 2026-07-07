/**
 * @file SessionReplayPanel.jsx
 * @description Session replay timeline for collaborative sync events.
 *
 * Replays the append-only sync_events history of a workspace as a scrubbable /
 * playable timeline. Read-only: applies events locally through replayService,
 * which never writes to the server or broadcasts to Y.js.
 *
 * Features:
 * - Timeline scrubber with per-event density ticks
 * - Play / pause / step and speed controls (0.5x / 1x / 2x / 5x)
 * - Current-event readout (actor, entity, type, time)
 * - Entity-type filter checkboxes (reloads the buffer)
 *
 * Colors come from CSS design tokens (var(--color-*)); no hardcoded colors.
 *
 * @example
 * <SessionReplayPanel workspaceId="ws-1" />
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, Button, IconButton, Toggle, Spinner, Badge } from '@UI/react/components/atoms';
import { replayService, REPLAY_EVENTS, REPLAY_SPEEDS } from '@Services/replayService.js';
import { eventBus } from '@Services';
import './SessionReplayPanel.scss';

// Entity types available for filtering, with display labels + token color class.
const ENTITY_TYPES = [
    { id: 'view_configuration', label: 'Views', color: 'blue' },
    { id: 'viewgroup', label: 'View Groups', color: 'purple' },
    { id: 'annotation', label: 'Annotations', color: 'amber' },
    { id: 'workspace_annotation', label: 'Workspace Notes', color: 'teal' },
];

const OPERATION_LABELS = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    restore: 'restored',
    conflict_resolved: 'resolved conflict on',
};

function formatTime(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return '';
    }
}

function shortActor(id) {
    if (!id) return 'Unknown';
    return String(id).slice(0, 8);
}

/**
 * SessionReplayPanel
 * @param {object} props
 * @param {string} props.workspaceId
 */
export function SessionReplayPanel({ workspaceId }) {
    const [state, setState] = useState(() => replayService.getState());
    const [events, setEvents] = useState(() => replayService.getEvents());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // All entity types enabled by default.
    const [enabledTypes, setEnabledTypes] = useState(
        () => new Set(ENTITY_TYPES.map((t) => t.id))
    );

    // Subscribe to replay service events → local state.
    useEffect(() => {
        const offState = eventBus.on(REPLAY_EVENTS.STATE_CHANGED, (s) => setState(s));
        const offLoaded = eventBus.on(REPLAY_EVENTS.LOADED, () => {
            setEvents(replayService.getEvents());
            setState(replayService.getState());
        });
        const offErr = eventBus.on(REPLAY_EVENTS.ERROR, (e) => setError(e?.message || 'Replay error'));
        return () => {
            offState?.();
            offLoaded?.();
            offErr?.();
        };
    }, []);

    // Load events whenever workspace or filter set changes.
    const loadEvents = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);
        setError(null);
        try {
            const entityTypes =
                enabledTypes.size === ENTITY_TYPES.length
                    ? undefined
                    : Array.from(enabledTypes);
            await replayService.load(workspaceId, { entityTypes });
            setEvents(replayService.getEvents());
            setState(replayService.getState());
        } catch (err) {
            setError(err?.message || 'Failed to load replay events');
        } finally {
            setLoading(false);
        }
    }, [workspaceId, enabledTypes]);

    useEffect(() => {
        loadEvents();
        // Reset replay mode when leaving the panel / switching workspace.
        return () => {
            replayService.reset();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const toggleType = useCallback((typeId) => {
        setEnabledTypes((prev) => {
            const next = new Set(prev);
            if (next.has(typeId)) next.delete(typeId);
            else next.add(typeId);
            // Never allow zero types — keep at least one enabled.
            if (next.size === 0) next.add(typeId);
            return next;
        });
    }, []);

    // Re-load when filters change (after initial mount).
    const [filtersDirty, setFiltersDirty] = useState(false);
    useEffect(() => {
        if (filtersDirty) loadEvents();
        else setFiltersDirty(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabledTypes]);

    const handleSeek = useCallback((e) => {
        const idx = parseInt(e.target.value, 10);
        replayService.seek(idx);
    }, []);

    const handlePlayPause = useCallback(() => replayService.togglePlay(), []);
    const handleStepBack = useCallback(() => replayService.seek(state.position - 1), [state.position]);
    const handleStepFwd = useCallback(() => replayService.seek(state.position + 1), [state.position]);
    const handleRestart = useCallback(() => replayService.seek(-1), []);
    const handleSpeed = useCallback((s) => replayService.setSpeed(s), []);

    const total = events.length;
    const position = state.position;
    const currentEvent = position >= 0 ? events[position] : null;

    // Density ticks: one marker per event, positioned along the track.
    const ticks = useMemo(() => {
        if (total <= 1) return [];
        return events.map((ev, i) => ({
            i,
            pct: (i / (total - 1)) * 100,
            type: ev.entity_type,
        }));
    }, [events, total]);

    const typeColor = (t) => ENTITY_TYPES.find((x) => x.id === t)?.color || 'gray';

    return (
        <div className="session-replay-panel">
            <div className="session-replay-panel__header">
                <div className="session-replay-panel__title">
                    <Icon name="history" size={16} />
                    <span>Session Replay</span>
                </div>
                {state.inReplayMode && (
                    <Badge color="amber" size="sm">Replay Mode</Badge>
                )}
            </div>

            {/* Entity-type filters */}
            <div className="session-replay-panel__filters">
                {ENTITY_TYPES.map((t) => (
                    <Toggle
                        key={t.id}
                        checked={enabledTypes.has(t.id)}
                        onChange={() => toggleType(t.id)}
                        label={t.label}
                        color={t.color}
                        size="sm"
                    />
                ))}
            </div>

            {loading && (
                <div className="session-replay-panel__loading">
                    <Spinner size={20} />
                    <span>Loading events…</span>
                </div>
            )}

            {error && !loading && (
                <div className="session-replay-panel__error">
                    <Icon name="alertTriangle" size={14} />
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={loadEvents}>Retry</Button>
                </div>
            )}

            {!loading && !error && total === 0 && (
                <div className="session-replay-panel__empty">
                    <Icon name="history" size={28} />
                    <span>No collaboration history yet.</span>
                </div>
            )}

            {!loading && !error && total > 0 && (
                <>
                    {/* Current event readout */}
                    <div className="session-replay-panel__readout">
                        {currentEvent ? (
                            <>
                                <div className="session-replay-panel__readout-line">
                                    <span
                                        className="session-replay-panel__dot"
                                        data-color={typeColor(currentEvent.entity_type)}
                                    />
                                    <strong>{shortActor(currentEvent.actor_user_id)}</strong>
                                    <span className="session-replay-panel__op">
                                        {OPERATION_LABELS[currentEvent.operation] || currentEvent.operation}
                                    </span>
                                    <span className="session-replay-panel__entity">
                                        {ENTITY_TYPES.find((t) => t.id === currentEvent.entity_type)?.label
                                            || currentEvent.entity_type}
                                    </span>
                                </div>
                                <div className="session-replay-panel__readout-meta">
                                    <span>{formatTime(currentEvent.created_at)}</span>
                                    <span>event {position + 1} / {total}</span>
                                </div>
                            </>
                        ) : (
                            <div className="session-replay-panel__readout-meta">
                                <span>Start of session</span>
                                <span>0 / {total}</span>
                            </div>
                        )}
                    </div>

                    {/* Timeline scrubber with density ticks */}
                    <div className="session-replay-panel__timeline">
                        <div className="session-replay-panel__ticks">
                            {ticks.map((tk) => (
                                <span
                                    key={tk.i}
                                    className="session-replay-panel__tick"
                                    data-color={typeColor(tk.type)}
                                    style={{ left: `${tk.pct}%` }}
                                    title={`Event ${tk.i + 1}`}
                                />
                            ))}
                        </div>
                        <input
                            type="range"
                            className="session-replay-panel__scrubber"
                            min={-1}
                            max={total - 1}
                            step={1}
                            value={position}
                            onChange={handleSeek}
                            aria-label="Replay timeline position"
                        />
                    </div>

                    {/* Transport controls */}
                    <div className="session-replay-panel__controls">
                        <IconButton
                            icon="skipBack"
                            size="sm"
                            onClick={handleRestart}
                            title="Restart"
                        />
                        <IconButton
                            icon="chevronLeft"
                            size="sm"
                            onClick={handleStepBack}
                            disabled={position < 0}
                            title="Step back"
                        />
                        <IconButton
                            icon={state.playing ? 'pause' : 'play'}
                            size="md"
                            onClick={handlePlayPause}
                            title={state.playing ? 'Pause' : 'Play'}
                        />
                        <IconButton
                            icon="chevronRight"
                            size="sm"
                            onClick={handleStepFwd}
                            disabled={position >= total - 1}
                            title="Step forward"
                        />
                        <div className="session-replay-panel__speeds">
                            {REPLAY_SPEEDS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className={
                                        'session-replay-panel__speed' +
                                        (state.speed === s ? ' session-replay-panel__speed--active' : '')
                                    }
                                    onClick={() => handleSpeed(s)}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default SessionReplayPanel;
