// server/src/__tests__/helpers/testApp.js
// Minimal Express app factory for integration tests.
// Mounts only the routes needed for sync/OCC tests.
// Does NOT start WebSocket, Redis, MinIO, or Matrix services.

'use strict';

const express = require('express');

/**
 * Create a minimal Express app suitable for supertest integration tests.
 *
 * @param {import('pg').Pool} pool
 * @param {object} [options]
 * @param {boolean} [options.devBypassAuth=true]  Use DEV_BYPASS_AUTH mode.
 * @returns {import('express').Express}
 */
function createTestApp(pool, options = {}) {
  const { devBypassAuth = true } = options;

  // Temporarily set env for auth middleware
  const origBypass = process.env.DEV_BYPASS_AUTH;
  if (devBypassAuth) process.env.DEV_BYPASS_AUTH = 'true';

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Expose pool and a minimal no-op wsManager via app.locals
  app.locals.pool = pool;
  app.locals.wsManager = {
    viewUpdated: () => {},
    annotationUpdated: () => {},
    broadcastToProject: () => {},
    broadcast: () => {},
  };

  // Mount routes
  const viewsRouter = require('../../routes/views');
  const annotationsRouter = require('../../routes/annotations');
  const viewgroupsRouter = require('../../routes/viewgroups');
  const syncRouter = require('../../routes/sync');

  // Auth middleware (reads x-user-id header in dev bypass mode)
  const { authenticate, optionalAuth } = require('../../middleware/auth');

  app.use('/api/views', authenticate, viewsRouter);
  app.use('/api/annotations', authenticate, annotationsRouter);
  app.use('/api/viewgroups', authenticate, viewgroupsRouter);
  app.use('/api/sync', authenticate, syncRouter);

  // Restore env
  if (devBypassAuth) {
    if (origBypass === undefined) delete process.env.DEV_BYPASS_AUTH;
    else process.env.DEV_BYPASS_AUTH = origBypass;
  }

  return app;
}

module.exports = { createTestApp };
