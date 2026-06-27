#!/usr/bin/env node
// server/scripts/prune-sync-events.js
// Manual sync_events pruning script.
//
// Usage:
//   SYNC_EVENTS_PRUNING_ENABLED=true \
//   DATABASE_URL=postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics \
//   node server/scripts/prune-sync-events.js
//
// Optional env vars:
//   SYNC_EVENTS_RETENTION_DAYS     — days to keep (default: 90)
//   SYNC_EVENTS_PRUNING_BATCH_SIZE — rows per run (default: 1000)
//
// The script prints a summary and exits.
// Run it multiple times to prune in batches larger than BATCH_SIZE.
// It is safe to run while the server is live; deletes use a CTE that does
// not lock the full table.
//
// SAFETY: The /api/sync/delta endpoint automatically returns
// requiresFullResync: WATERMARK_EXPIRED for clients whose watermark predates
// the new oldest event. No client data is lost; they fall back to full hydration.

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Pool } = require('pg');
const { pruneOldSyncEvents, PRUNING_ENABLED, RETENTION_DAYS, BATCH_SIZE } = require('../src/services/syncEventPruning');

async function main() {
  if (!PRUNING_ENABLED) {
    console.error([
      'ERROR: Pruning is disabled.',
      'Set SYNC_EVENTS_PRUNING_ENABLED=true to allow deletion.',
      '',
      'Example:',
      '  SYNC_EVENTS_PRUNING_ENABLED=true \\',
      '  SYNC_EVENTS_RETENTION_DAYS=90 \\',
      '  DATABASE_URL=postgres://... \\',
      '  node server/scripts/prune-sync-events.js',
    ].join('\n'));
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log(`Pruning sync_events:`);
  console.log(`  Retention: ${RETENTION_DAYS} days`);
  console.log(`  Batch size: ${BATCH_SIZE} rows`);
  console.log(`  Database: ${dbUrl.replace(/:([^@]+)@/, ':***@')}`);
  console.log('');

  const pool = new Pool({ connectionString: dbUrl });

  try {
    // Count before
    const before = await pool.query('SELECT COUNT(*) AS n FROM sync_events');
    const beforeCount = parseInt(before.rows[0].n, 10);
    console.log(`Events before pruning: ${beforeCount}`);

    const { deleted, skipped } = await pruneOldSyncEvents(pool);

    if (skipped) {
      console.log('Pruning skipped (PRUNING_ENABLED check failed).');
    } else {
      const after = await pool.query('SELECT COUNT(*) AS n FROM sync_events');
      const afterCount = parseInt(after.rows[0].n, 10);
      console.log(`Deleted: ${deleted} rows`);
      console.log(`Events after pruning: ${afterCount}`);

      if (deleted === BATCH_SIZE) {
        console.log(`\nNote: Batch limit (${BATCH_SIZE}) was reached.`);
        console.log('Run this script again to continue pruning older events.');
      }
    }
  } catch (err) {
    console.error('Pruning failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
