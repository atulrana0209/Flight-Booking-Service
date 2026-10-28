const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');

describe('Idempotency Failure & Recovery Test Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('Scenario 1: Recovers gracefully when DB committed a booking but response was lost (orphaned IN_PROGRESS)', async () => {
    const { user, token } = await createTestUser({ email: 'recovery1@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10, price: 5000 });
    const idempotencyKey = 'crash-scenario-key-001';

    // Simulate scenario: A booking was committed with this idempotency key in DB,
    // but the server died before res.json could mark IdempotencyKey as RESOLVED.
    const committedBooking = await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 2,
      totalCost: 10000,
      status: Enums.BOOKING_STATUS.CONFIRMED,
      idempotencyKey
    });

    const requestHash = crypto
      .createHash('sha256')
      .update(`/api/v1/bookings:${user.id}:${JSON.stringify({ flightId: flight.id, noOfSeats: 2 })}`)
      .digest('hex');

    // The idempotency key record remains stuck in IN_PROGRESS
    const keyRecord = await db.IdempotencyKey.create({
      key: idempotencyKey,
      userId: user.id,
      endpoint: '/api/v1/bookings',
      requestHash,
      status: 'IN_PROGRESS'
    });

    await db.sequelize.query(`
      UPDATE IdempotencyKeys 
      SET createdAt = DATE_SUB(NOW(), INTERVAL 15 SECOND), 
          updatedAt = DATE_SUB(NOW(), INTERVAL 15 SECOND) 
      WHERE \`key\` = '${idempotencyKey}'
    `);

    // Client retries after network timeout
    const retryRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ flightId: flight.id, noOfSeats: 2 });

    expect(retryRes.status).toBe(201);
    expect(retryRes.headers['x-cache-lookup']).toBe('RECOVERED');
    expect(retryRes.body.data.id).toBe(committedBooking.id);

    // Verify key was updated to RESOLVED in database
    await keyRecord.reload();
    expect(keyRecord.status).toBe('RESOLVED');
    expect(keyRecord.bookingId).toBe(committedBooking.id);

    // Invariant: No duplicate booking was created!
    const totalBookings = await db.Booking.count({ where: { flightId: flight.id } });
    expect(totalBookings).toBe(1);
  });

  it('Scenario 2: Handles process crash where transaction rolled back, leaving orphaned IN_PROGRESS with no booking', async () => {
    const { user, token } = await createTestUser({ email: 'recovery2@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const idempotencyKey = 'crashed-aborted-tx-002';

    const requestHash = crypto
      .createHash('sha256')
      .update(`/api/v1/bookings:${user.id}:${JSON.stringify({ flightId: flight.id, noOfSeats: 2 })}`)
      .digest('hex');

    // Simulate orphaned key older than stale threshold (e.g. from a past crashed server)
    await db.IdempotencyKey.create({
      key: idempotencyKey,
      userId: user.id,
      endpoint: '/api/v1/bookings',
      requestHash,
      status: 'IN_PROGRESS'
    });

    await db.sequelize.query(`
      UPDATE IdempotencyKeys 
      SET createdAt = DATE_SUB(NOW(), INTERVAL 15 SECOND), 
          updatedAt = DATE_SUB(NOW(), INTERVAL 15 SECOND) 
      WHERE \`key\` = '${idempotencyKey}'
    `);

    // Client retries: Recovery policy detects stale uncommitted record, allows retry to succeed
    const retryRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ flightId: flight.id, noOfSeats: 2 });

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.success).toBe(true);

    // Verify exactly one booking was created
    const count = await db.Booking.count({ where: { idempotencyKey } });
    expect(count).toBe(1);
  });

  it('Scenario 3: Two requests with identical key arrive simultaneously', async () => {
    const { user, token } = await createTestUser({ email: 'simultaneous@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const idempotencyKey = 'simultaneous-key-003';

    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ flightId: flight.id, noOfSeats: 1 }),
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ flightId: flight.id, noOfSeats: 1 })
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);

    // Invariant: Exactly one booking created in DB
    const count = await db.Booking.count({ where: { idempotencyKey } });
    expect(count).toBe(1);

    // Seats deducted only once
    await flight.reload();
    expect(flight.totalSeats).toBe(9);
  });

  it('Scenario 4: Reusing an idempotency key with a modified payload is rejected', async () => {
    const { user, token } = await createTestUser({ email: 'tamper@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const idempotencyKey = 'tampered-key-004';

    // Original request for 1 seat
    const res1 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ flightId: flight.id, noOfSeats: 1 });

    expect(res1.status).toBe(201);

    // Replay with modified seat count
    const res2 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ flightId: flight.id, noOfSeats: 3 });

    expect(res2.status).toBe(422);
    expect(res2.body.message).toMatch(/different request payload/i);
  });
});
