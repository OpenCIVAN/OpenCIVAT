// server/src/services/replayEventService.js
// Read-only query helpers for session replay.
//
// Replay reads the append-only `sync_events` log for a workspace and returns
// pages of events ordered ASCENDING by id (chronological). This is a pure
// read path — it never writes to sync_events and never broadcasts.
//
// The param-parsing helpers below are separated from the DB query so they can
// be unit-tested without a live PostgreSQL instance (mirrors the buildSnapshot
// pattern in syncEventService.test.js).

const { createLogger } = require("../utils/logger");
const log = createLogger("replay");

// Default and hard-cap on page size to keep responses bounded.
const DEFAULT_REPLAY_PAGE_LIMIT = 200;
const MAX_REPLAY_PAGE_LIMIT = 500;

// Entity types replay understands. Anything else is rejected during filter
// parsing so a typo doesn't silently return an empty page.
const VALID_ENTITY_TYPES = [
  "view_configuration",
  "viewgroup",
  "annotation",
  "workspace_annotation",
];

/**
 * Parse and validate replay query parameters from an Express req.query object.
 *
 * @param {object} query
 * @param {string} [query.cursor]      Last-seen event id; results start AFTER it.
 * @param {string} [query.limit]       Page size (clamped to [1, MAX]).
 * @param {string} [query.from]        ISO timestamp lower bound (inclusive).
 * @param {string} [query.to]          ISO timestamp upper bound (inclusive).
 * @param {string} [query.entityTypes] Comma-separated entity_type filter.
 * @returns {{ ok: true, params: object } | { ok: false, error: string }}
 */
function parseReplayParams(query = {}) {
  // Cursor: an event id (BIGSERIAL). 0/absent → from the beginning.
  let cursor = 0;
  if (query.cursor != null && query.cursor !== "") {
    const parsed = Number(query.cursor);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, error: "cursor must be a non-negative integer" };
    }
    cursor = parsed;
  }

  // Limit: clamp into [1, MAX]. Non-numeric → default.
  let limit = DEFAULT_REPLAY_PAGE_LIMIT;
  if (query.limit != null && query.limit !== "") {
    const parsed = Number(query.limit);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(Math.floor(parsed), MAX_REPLAY_PAGE_LIMIT);
    }
  }

  // Time range: validate ISO parseability. Empty → unbounded on that side.
  let from = null;
  if (query.from != null && query.from !== "") {
    const t = new Date(query.from);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, error: "from must be a valid ISO timestamp" };
    }
    from = t.toISOString();
  }

  let to = null;
  if (query.to != null && query.to !== "") {
    const t = new Date(query.to);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, error: "to must be a valid ISO timestamp" };
    }
    to = t.toISOString();
  }

  if (from && to && from > to) {
    return { ok: false, error: "from must be <= to" };
  }

  // Entity type filter: comma-separated allow-list. Absent → all types.
  let entityTypes = null;
  if (query.entityTypes != null && query.entityTypes !== "") {
    const requested = String(query.entityTypes)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const invalid = requested.filter((t) => !VALID_ENTITY_TYPES.includes(t));
    if (invalid.length > 0) {
      return {
        ok: false,
        error: `unknown entityTypes: ${invalid.join(", ")}`,
      };
    }
    if (requested.length > 0) entityTypes = requested;
  }

  return { ok: true, params: { cursor, limit, from, to, entityTypes } };
}

/**
 * Build a parameterized SELECT for one page of replay events.
 * Kept separate from execution so the SQL/param shape is unit-testable.
 *
 * @param {string} workspaceId
 * @param {object} params  Output of parseReplayParams().params
 * @returns {{ text: string, values: any[] }}
 */
function buildReplayQuery(workspaceId, params) {
  const { cursor, limit, from, to, entityTypes } = params;
  const values = [workspaceId];
  const where = ["workspace_id = $1"];

  // Cursor: strictly greater than, so the same event is never returned twice.
  if (cursor > 0) {
    values.push(cursor);
    where.push(`id > $${values.length}`);
  }
  if (from) {
    values.push(from);
    where.push(`created_at >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    where.push(`created_at <= $${values.length}`);
  }
  if (entityTypes && entityTypes.length > 0) {
    values.push(entityTypes);
    where.push(`entity_type = ANY($${values.length})`);
  }

  // Fetch limit + 1 so the caller can tell whether another page exists
  // without a separate COUNT query.
  values.push(limit + 1);

  const text = `
    SELECT id, workspace_id, entity_type, entity_id, operation,
           base_revision, next_revision, snapshot, actor_user_id,
           correlation_id, created_at
    FROM sync_events
    WHERE ${where.join(" AND ")}
    ORDER BY id ASC
    LIMIT $${values.length}
  `;

  return { text, values };
}

/**
 * Fetch one page of replay events for a workspace.
 *
 * @param {import('pg').Pool} pool
 * @param {string} workspaceId
 * @param {object} params  Output of parseReplayParams().params
 * @returns {Promise<{ events: object[], nextCursor: number|null, hasMore: boolean }>}
 */
async function fetchReplayPage(pool, workspaceId, params) {
  const { text, values } = buildReplayQuery(workspaceId, params);
  const result = await pool.query(text, values);
  const rows = result.rows;

  const hasMore = rows.length > params.limit;
  const events = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor =
    events.length > 0 ? Number(events[events.length - 1].id) : null;

  log.debug(
    `replay page: workspace=${workspaceId} cursor=${params.cursor} ` +
      `returned=${events.length} hasMore=${hasMore}`
  );

  return { events, nextCursor, hasMore };
}

module.exports = {
  parseReplayParams,
  buildReplayQuery,
  fetchReplayPage,
  DEFAULT_REPLAY_PAGE_LIMIT,
  MAX_REPLAY_PAGE_LIMIT,
  VALID_ENTITY_TYPES,
};
