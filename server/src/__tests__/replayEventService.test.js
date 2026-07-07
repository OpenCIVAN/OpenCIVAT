// server/src/__tests__/replayEventService.test.js
// Pure unit tests for the replay query param parsing + SQL builder.
// No database required.

const {
  parseReplayParams,
  buildReplayQuery,
  DEFAULT_REPLAY_PAGE_LIMIT,
  MAX_REPLAY_PAGE_LIMIT,
} = require("../services/replayEventService");

describe("parseReplayParams", () => {
  test("defaults when query is empty", () => {
    const r = parseReplayParams({});
    expect(r.ok).toBe(true);
    expect(r.params).toEqual({
      cursor: 0,
      limit: DEFAULT_REPLAY_PAGE_LIMIT,
      from: null,
      to: null,
      entityTypes: null,
    });
  });

  test("parses a valid cursor", () => {
    const r = parseReplayParams({ cursor: "42" });
    expect(r.ok).toBe(true);
    expect(r.params.cursor).toBe(42);
  });

  test("rejects a negative cursor", () => {
    const r = parseReplayParams({ cursor: "-1" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cursor/);
  });

  test("rejects a non-integer cursor", () => {
    const r = parseReplayParams({ cursor: "abc" });
    expect(r.ok).toBe(false);
  });

  test("clamps limit to the maximum", () => {
    const r = parseReplayParams({ limit: "99999" });
    expect(r.ok).toBe(true);
    expect(r.params.limit).toBe(MAX_REPLAY_PAGE_LIMIT);
  });

  test("falls back to default limit for non-numeric input", () => {
    const r = parseReplayParams({ limit: "notanumber" });
    expect(r.ok).toBe(true);
    expect(r.params.limit).toBe(DEFAULT_REPLAY_PAGE_LIMIT);
  });

  test("normalizes valid ISO timestamps", () => {
    const r = parseReplayParams({
      from: "2026-01-01T00:00:00Z",
      to: "2026-01-02T00:00:00Z",
    });
    expect(r.ok).toBe(true);
    expect(r.params.from).toBe("2026-01-01T00:00:00.000Z");
    expect(r.params.to).toBe("2026-01-02T00:00:00.000Z");
  });

  test("rejects an invalid from timestamp", () => {
    const r = parseReplayParams({ from: "not-a-date" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/from/);
  });

  test("rejects from > to", () => {
    const r = parseReplayParams({
      from: "2026-02-01T00:00:00Z",
      to: "2026-01-01T00:00:00Z",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/from must be <= to/);
  });

  test("parses a valid entityTypes list", () => {
    const r = parseReplayParams({ entityTypes: "annotation,view_configuration" });
    expect(r.ok).toBe(true);
    expect(r.params.entityTypes).toEqual([
      "annotation",
      "view_configuration",
    ]);
  });

  test("trims whitespace in entityTypes", () => {
    const r = parseReplayParams({ entityTypes: " annotation , viewgroup " });
    expect(r.ok).toBe(true);
    expect(r.params.entityTypes).toEqual(["annotation", "viewgroup"]);
  });

  test("rejects an unknown entity type", () => {
    const r = parseReplayParams({ entityTypes: "annotation,bogus" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/bogus/);
  });
});

describe("buildReplayQuery", () => {
  const WS = "00000000-0000-0000-0000-000000000abc";

  test("minimal query: only workspace filter + limit+1", () => {
    const params = parseReplayParams({}).params;
    const { text, values } = buildReplayQuery(WS, params);
    expect(text).toMatch(/workspace_id = \$1/);
    expect(text).toMatch(/ORDER BY id ASC/);
    // workspace + (limit+1)
    expect(values[0]).toBe(WS);
    expect(values[values.length - 1]).toBe(DEFAULT_REPLAY_PAGE_LIMIT + 1);
    // No cursor/time/type predicates (created_at appears in SELECT, not WHERE)
    expect(text).not.toMatch(/id > \$/);
    expect(text).not.toMatch(/created_at >= \$/);
    expect(text).not.toMatch(/created_at <= \$/);
    expect(text).not.toMatch(/entity_type = ANY/);
  });

  test("adds cursor predicate with strict greater-than", () => {
    const params = parseReplayParams({ cursor: "10" }).params;
    const { text, values } = buildReplayQuery(WS, params);
    expect(text).toMatch(/id > \$2/);
    expect(values).toContain(10);
  });

  test("adds time-range and entity-type predicates in order", () => {
    const params = parseReplayParams({
      cursor: "5",
      from: "2026-01-01T00:00:00Z",
      to: "2026-02-01T00:00:00Z",
      entityTypes: "annotation",
    }).params;
    const { text, values } = buildReplayQuery(WS, params);
    expect(text).toMatch(/id > \$2/);
    expect(text).toMatch(/created_at >= \$3/);
    expect(text).toMatch(/created_at <= \$4/);
    expect(text).toMatch(/entity_type = ANY\(\$5\)/);
    expect(values[4]).toEqual(["annotation"]);
    // last value is limit + 1
    expect(values[values.length - 1]).toBe(DEFAULT_REPLAY_PAGE_LIMIT + 1);
  });

  test("orders ascending (chronological)", () => {
    const params = parseReplayParams({}).params;
    const { text } = buildReplayQuery(WS, params);
    expect(text).toMatch(/ORDER BY id ASC/);
    expect(text).not.toMatch(/ORDER BY id DESC/);
  });
});
