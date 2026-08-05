// server/src/__tests__/vr-sessions-uuid.test.js
// Unit + route-level coverage for asUuidOrNull() in server/src/routes/vr.js.
//
// Regression test for a live-log failure during a real two-headset VR test:
//   [VR] Failed to create VR session: error: invalid input syntax for type uuid: "builtin-lungs"
// Built-in demo datasets (e.g. "builtin-lungs") are client-side-only — they
// have no row in `datasets` — but POST /vr/sessions used to bind the id
// straight into the dataset_id UUID column, so Postgres rejected the whole
// insert. No DB required — pool.query is mocked.

'use strict';

const express = require('express');
const request = require('supertest');

const vrRouter = require('../routes/vr');
const { asUuidOrNull } = vrRouter;

describe('asUuidOrNull', () => {
  test('passes through a real UUID unchanged', () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    expect(asUuidOrNull(uuid)).toBe(uuid);
  });

  test('nulls a built-in dataset id', () => {
    expect(asUuidOrNull('builtin-lungs')).toBeNull();
  });

  test('nulls arbitrary non-UUID strings', () => {
    expect(asUuidOrNull('not-a-uuid')).toBeNull();
  });

  test('nulls null/undefined without throwing', () => {
    expect(asUuidOrNull(null)).toBeNull();
    expect(asUuidOrNull(undefined)).toBeNull();
  });
});

describe('POST /vr/sessions — UUID column sanitization', () => {
  function buildApp(pool) {
    const app = express();
    app.use(express.json());
    app.locals.pool = pool;
    app.locals.wsManager = { vrSessionCreated: jest.fn() };
    app.use('/vr', vrRouter);
    return app;
  }

  function mockPool() {
    const calls = [];
    const pool = {
      query: jest.fn((sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('INSERT INTO vr_exploration_sessions')) {
          return Promise.resolve({
            rows: [{ id: params[0], dataset_id: params[2] }],
          });
        }
        return Promise.resolve({ rows: [{}] }); // participant insert
      }),
    };
    return { pool, calls };
  }

  test('non-UUID viewConfigurationId/datasetId are nulled; a real projectId UUID passes through', async () => {
    const { pool, calls } = mockPool();
    const app = buildApp(pool);

    const res = await request(app).post('/vr/sessions').send({
      viewConfigurationId: 'also-not-a-uuid',
      datasetId: 'builtin-lungs',
      projectId: '22222222-2222-2222-2222-222222222222',
    });

    // Registration must succeed instead of raising the Postgres UUID error.
    expect(res.status).toBe(200);

    const sessionInsert = calls.find((c) =>
      c.sql.includes('INSERT INTO vr_exploration_sessions')
    );
    expect(sessionInsert.params[1]).toBeNull(); // view_configuration_id
    expect(sessionInsert.params[2]).toBeNull(); // dataset_id
    expect(sessionInsert.params[3]).toBe('22222222-2222-2222-2222-222222222222'); // project_id
  });

  test('a real UUID datasetId is passed through unchanged, not nulled', async () => {
    const realDatasetId = '33333333-3333-3333-3333-333333333333';
    const { pool, calls } = mockPool();
    const app = buildApp(pool);

    const res = await request(app)
      .post('/vr/sessions')
      .send({ datasetId: realDatasetId });

    expect(res.status).toBe(200);
    const sessionInsert = calls.find((c) =>
      c.sql.includes('INSERT INTO vr_exploration_sessions')
    );
    expect(sessionInsert.params[2]).toBe(realDatasetId);
  });
});
