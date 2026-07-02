#!/usr/bin/env node
// server/scripts/cleanup-expired-workspaces.js
// One-shot manual runner for expired breakout workspace cleanup.
//
// Usage:
//   WORKSPACE_CLEANUP_ENABLED=true \
//   DATABASE_URL=postgres://ciauser:ciadevpassword@localhost:5432/cia_analytics \
//   node server/scripts/cleanup-expired-workspaces.js
//
// Optional env vars:
//   WORKSPACE_CLEANUP_BATCH_SIZE — workspaces per run (default: 50)
//
// The script prints a summary and exits.
// Run multiple times to archive in batches larger than BATCH_SIZE.
// Uses soft-delete (is_archived = true) — no data is permanently lost.

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Pool } = require('pg');
const { archiveExpiredWorkspaces, CLEANUP_ENABLED, BATCH_SIZE } = require('../src/services/workspaceCleanupService');

async function main() {
  if (!CLEANUP_ENABLED) {
    console.error([
      'ERROR: Workspace cleanup is disabled.',
      'Set WORKSPACE_CLEANUP_ENABLED=true to allow archiving.',
      '',
      'Example:',
      '  WORKSPACE_CLEANUP_ENABLED=true \\',
      '  WORKSPACE_CLEANUP_BATCH_SIZE=50 \\',
      '  DATABASE_URL=postgres://... \\',
      '  node server/scripts/cleanup-expired-workspaces.js',
    ].join('\n'));
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('Cleaning up expired breakout workspaces:');
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  Database: ${dbUrl.replace(/:([^@]+)@/, ':***@')}`);
  console.log('');

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const archived = await archiveExpiredWorkspaces(pool);

    if (archived.length === 0) {
      console.log('No expired breakout workspaces found.');
    } else {
      console.log(`Archived ${archived.length} workspace(s):`);
      for (const ws of archived) {
        console.log(`  - ${ws.name} (${ws.id})`);
      }

      if (archived.length === BATCH_SIZE) {
        console.log(`\nNote: Batch limit (${BATCH_SIZE}) was reached.`);
        console.log('Run this script again to continue cleaning up more workspaces.');
      }
    }
  } catch (err) {
    console.error('Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
