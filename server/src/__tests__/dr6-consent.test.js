// server/src/__tests__/dr6-consent.test.js
// Integration tests for breakout merge consent workflow.
// Requires TEST_DATABASE_URL + migration 016 applied.
//
// Run:
//   psql $DATABASE_URL < server/database/migrations/016_dr6_hardening.sql
//   TEST_DATABASE_URL="..." DEV_BYPASS_AUTH=true \
//   cd server && npm test -- --testPathPattern "dr6-consent" --runInBand

'use strict';

const request  = require('supertest');
const express  = require('express');
const { createTestPool, SEED, DEV_AUTH_HEADERS } = require('./helpers/dbFixture');

const pool = createTestPool();
const maybeDescribe = pool ? describe : describe.skip;

// ============================================================================
// TEST APP
// ============================================================================

function createConsentTestApp(pool) {
  process.env.DEV_BYPASS_AUTH = 'true';
  process.env.NODE_ENV = 'development';

  const app = express();
  app.use(express.json());
  app.locals.pool = pool;
  app.locals.wsManager = {
    broadcastToProject: jest.fn(),
    broadcastToRoom: jest.fn(),
    broadcastToUsers: jest.fn(),
    broadcast: jest.fn(),
  };

  const { authenticate } = require('../middleware/auth');
  const workspacesRouter = require('../routes/workspaces');
  app.use('/api/workspaces', authenticate, workspacesRouter);
  return app;
}

// ============================================================================
// HELPERS
// ============================================================================

let app;
const cleanupWorkspaceIds = [];
const cleanupAnnotationIds = [];
const cleanupViewConfigIds = [];

async function insertWorkspace(type, parentId = null) {
  const r = await pool.query(
    `INSERT INTO workspaces (name, type, project_id, owner_id, created_by, parent_id, auto_merge)
     VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING id, created_at`,
    [`Test ${type}`, type, SEED.PROJECT_ID, SEED.USER_ADMIN, parentId, type === 'breakout']
  );
  const row = r.rows[0];
  cleanupWorkspaceIds.push(row.id);
  return row;
}

async function insertAnnotation(projectId, userId, visibility, createdAt) {
  const r = await pool.query(
    `INSERT INTO workspace_annotations
     (project_id, type, path_data, screen_coordinates, created_by, visibility, created_at, updated_at)
     VALUES ($1, 'freehand', '{}', '{}', $2, $3, $4, NOW())
     RETURNING id, visibility, revision`,
    [projectId, userId, visibility, createdAt]
  );
  cleanupAnnotationIds.push(r.rows[0].id);
  return r.rows[0];
}

async function grantConsent(workspaceId, userId) {
  await pool.query(
    `INSERT INTO breakout_merge_consents (workspace_id, user_id, granted_at, revoked_at)
     VALUES ($1, $2, NOW(), NULL)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET granted_at = NOW(), revoked_at = NULL`,
    [workspaceId, userId]
  );
}

async function getAnnotationVisibility(id) {
  const r = await pool.query(`SELECT visibility FROM workspace_annotations WHERE id = $1`, [id]);
  return r.rows[0]?.visibility;
}

// ============================================================================
// TESTS
// ============================================================================

maybeDescribe('Breakout merge consent', () => {
  beforeAll(() => { app = createConsentTestApp(pool); });

  afterAll(async () => {
    if (!pool) return;
    if (cleanupAnnotationIds.length) {
      await pool.query(`DELETE FROM workspace_annotations WHERE id = ANY($1::uuid[])`, [cleanupAnnotationIds]);
    }
    if (cleanupViewConfigIds.length) {
      await pool.query(`DELETE FROM view_configurations WHERE id = ANY($1::uuid[])`, [cleanupViewConfigIds]);
    }
    if (cleanupWorkspaceIds.length) {
      await pool.query(`DELETE FROM breakout_merge_consents WHERE workspace_id = ANY($1::uuid[])`, [cleanupWorkspaceIds]);
      await pool.query(`DELETE FROM workspaces WHERE id = ANY($1::uuid[])`, [cleanupWorkspaceIds]);
    }
    await pool.end();
  });

  // ── Consent endpoint ─────────────────────────────────────────────────────

  test('POST /consent on breakout workspace succeeds', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/consent`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.consentActive).toBe(true);
  });

  test('DELETE /consent revokes consent', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    await grantConsent(breakout.id, SEED.USER_ADMIN);

    const res = await request(app)
      .delete(`/api/workspaces/${breakout.id}/consent`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.consentActive).toBe(false);

    // Verify DB: revoked_at is now set
    const check = await pool.query(
      `SELECT revoked_at FROM breakout_merge_consents WHERE workspace_id = $1 AND user_id = $2`,
      [breakout.id, SEED.USER_ADMIN]
    );
    expect(check.rows[0]?.revoked_at).toBeTruthy();
  });

  test('GET /merge-eligibility lists active consents', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    await grantConsent(breakout.id, SEED.USER_ALICE);

    const res = await request(app)
      .get(`/api/workspaces/${breakout.id}/merge-eligibility`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.consents.some((c) => c.user_id === SEED.USER_ALICE)).toBe(true);
  });

  // ── Merge behavior with consent ──────────────────────────────────────────

  test("merge actor's own annotation is promoted without consent", async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    const ann = await insertAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', afterBreakout);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.counts.ownAnnotations).toBeGreaterThanOrEqual(1);
    expect(await getAnnotationVisibility(ann.id)).toBe('project');
  });

  test("other user's private annotation is NOT promoted without consent", async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    // Create annotation by ALICE (not the merge actor)
    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    const ann = await insertAnnotation(SEED.PROJECT_ID, SEED.USER_ALICE, 'private', afterBreakout);

    // No consent granted by ALICE
    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    // Alice's annotation should still be private
    expect(await getAnnotationVisibility(ann.id)).toBe('private');
    expect(res.body.counts.skippedNoConsent).toBeGreaterThanOrEqual(1);
  });

  test("other user's private annotation IS promoted after they grant consent", async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const afterBreakout = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    const ann = await insertAnnotation(SEED.PROJECT_ID, SEED.USER_ALICE, 'private', afterBreakout);

    // ALICE grants consent
    await grantConsent(breakout.id, SEED.USER_ALICE);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.counts.consentedAnnotations).toBeGreaterThanOrEqual(1);
    expect(await getAnnotationVisibility(ann.id)).toBe('project');
  });

  test('merge counts separate own vs consented entities', async () => {
    const parent = await insertWorkspace('project');
    const breakout = await insertWorkspace('breakout', parent.id);

    const after = new Date(new Date(breakout.created_at).getTime() + 1000).toISOString();
    await insertAnnotation(SEED.PROJECT_ID, SEED.USER_ADMIN, 'private', after); // own
    await insertAnnotation(SEED.PROJECT_ID, SEED.USER_ALICE, 'private', after); // consented
    await grantConsent(breakout.id, SEED.USER_ALICE);

    const res = await request(app)
      .post(`/api/workspaces/${breakout.id}/merge`)
      .set(DEV_AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.counts.ownAnnotations).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.consentedAnnotations).toBeGreaterThanOrEqual(1);
  });
});
