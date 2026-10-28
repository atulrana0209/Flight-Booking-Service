const request = require('supertest');
const app = require('../src/app');
const { Logger } = require('../src/config');

describe('Observability & Operational Health Suite', () => {
  it('GET /health/live should return 200 UP without querying database', async () => {
    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health/ready should return 200 READY with database pool metrics', async () => {
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
    expect(res.body.database).toBe('CONNECTED');
    expect(res.body.pool).toBeDefined();
  });

  it('should generate a correlation ID and return X-Request-Id header', async () => {
    const res = await request(app).get('/health/live');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
  });

  it('should preserve and propagate client-supplied X-Request-Id header', async () => {
    const clientCorrelationId = 'client-tracer-abc-123-xyz';

    const res = await request(app)
      .get('/health/live')
      .set('X-Request-Id', clientCorrelationId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(clientCorrelationId);
  });
});
