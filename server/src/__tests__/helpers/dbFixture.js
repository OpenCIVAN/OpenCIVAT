// server/src/__tests__/helpers/dbFixture.js
// Test DB connection + seed constants.
//
// Integration tests use TEST_DATABASE_URL first, then DATABASE_URL as fallback.
// If neither is set, integration tests skip automatically with a clear message.
//
// SAFE: This fixture never writes to rows created before the test run.
// Each test suite is responsible for cleaning up its own inserted rows.
//
// SETUP:
//   1. docker-compose up -d cia-postgres
//   2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql
//   3. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \
//      DEV_BYPASS_AUTH=true \
//      cd server && npm test -- --testPathPattern "views-concurrency"

'use strict';

const { Pool } = require('pg');

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || null;

/**
 * Create a pg Pool for integration tests.
 * Returns null if no DB URL is configured.
 */
function createTestPool() {
  if (!TEST_DB_URL) return null;
  return new Pool({ connectionString: TEST_DB_URL, max: 5 });
}

/**
 * Return a jest.fn() that skips the current test if no DB pool is available.
 * Use inside beforeAll:
 *
 *   const pool = createTestPool();
 *   beforeAll(skipIfNoDb(pool, 'views-concurrency'));
 *
 * @param {import('pg').Pool|null} pool
 * @param {string} [testSuiteName]
 * @returns {jest.Func|null}
 */
function skipIfNoDb(pool, testSuiteName = 'integration') {
  if (pool) return null; // DB is available — no skip needed
  return () => {
    console.warn(
      `[${testSuiteName}] No TEST_DATABASE_URL or DATABASE_URL set — skipping integration tests.\n` +
      `To run:\n` +
      `  1. docker-compose up -d cia-postgres\n` +
      `  2. ./server/database/run-migration.sh migrations/014_dr1_sync_hardening.sql\n` +
      `  3. TEST_DATABASE_URL="postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics" \\\n` +
      `     DEV_BYPASS_AUTH=true cd server && npm test`
    );
  };
}

/**
 * Skip a describe block if the pool is null.
 * Call from inside the describe block's beforeAll.
 */
function integrationDescribe(name, pool, fn) {
  if (!pool) {
    describe.skip(`${name} (no DB — set TEST_DATABASE_URL to enable)`, fn);
  } else {
    describe(name, fn);
  }
}

/**
 * Clean up sync_events rows created during a test run.
 * Targets only rows newer than the start of the test (by id > startEventId).
 *
 * @param {import('pg').Pool} pool
 * @param {number} startEventId  The sync_events.id value before the test started.
 */
async function cleanupSyncEvents(pool, startEventId) {
  if (!pool) return;
  await pool.query('DELETE FROM sync_events WHERE id > $1', [startEventId]);
}

/**
 * Clean up view_configurations rows created during a test run (soft-delete safe).
 * Uses the view id to identify rows to remove.
 *
 * @param {import('pg').Pool} pool
 * @param {string[]} viewIds
 */
async function cleanupViews(pool, viewIds) {
  if (!pool || !viewIds.length) return;
  await pool.query(
    `DELETE FROM view_configurations WHERE id = ANY($1::uuid[])`,
    [viewIds]
  );
}

// ============================================================================
// SEEDED CONSTANTS (from server/database/init.sql)
// ============================================================================
const SEED = {
  PROJECT_ID: '00000000-0000-0000-0000-000000000001',
  DATASET_ID: null, // No dataset seeded — tests must create one or use a real file id
  USER_ADMIN: '00000000-0000-0000-0000-000000000002', // CIA Admin (dev bypass)
  USER_ALICE: '00000000-0000-0000-0000-000000000003',
  USER_BOB:   '00000000-0000-0000-0000-000000000004',
  BRANCH_NAME: 'main',
};

// DEV_BYPASS_AUTH header for all integration test requests
const DEV_AUTH_HEADERS = {
  'x-user-id': SEED.USER_ADMIN,
  'Content-Type': 'application/json',
};

module.exports = {
  createTestPool,
  skipIfNoDb,
  integrationDescribe,
  cleanupSyncEvents,
  cleanupViews,
  SEED,
  DEV_AUTH_HEADERS,
  TEST_DB_URL,
};
