const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');

describe('Idempotency Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return original booking result for duplicate requests with the same Idempotency-Key', async () => {
    const { token } = await createTestUser({ email: 'idemp1@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10, price: 4000 });
    const idempotencyKey = 'unique-key-12345';

    // First request
    const firstRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        flightId: flight.id,
        noOfSeats: 2
      });

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.success).toBe(true);
    const bookingId = firstRes.body.data.id;

    // Retry request with the exact same Idempotency-Key
    const secondRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        flightId: flight.id,
        noOfSeats: 2
      });

    expect(secondRes.status).toBe(201);
    expect(secondRes.headers['x-cache-lookup']).toBe('HIT');
    expect(secondRes.body.data.id).toBe(bookingId);

    // Verify seats were deducted ONLY ONCE (10 - 2 = 8, NOT 6)
    await flight.reload();
    expect(flight.totalSeats).toBe(8);

    // Verify only ONE booking was created in the database
    const bookingCount = await db.Booking.count({ where: { flightId: flight.id } });
    expect(bookingCount).toBe(1);
  });

  it('should reject reuse of an Idempotency-Key with a different request payload', async () => {
    const { token } = await createTestUser({ email: 'idemp2@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const idempotencyKey = 'unique-key-67890';

    // Initial request with 2 seats
    const firstRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        flightId: flight.id,
        noOfSeats: 2
      });

    expect(firstRes.status).toBe(201);

    // Different request (e.g. 3 seats) using the exact same Idempotency-Key
    const secondRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        flightId: flight.id,
        noOfSeats: 3
      });

    expect(secondRes.status).toBe(422);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toMatch(/different request payload/i);
  });

  it('should prevent duplicate bookings when concurrent requests share the same Idempotency-Key', async () => {
    const { token } = await createTestUser({ email: 'idemp3@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const idempotencyKey = 'concurrent-key-999';

    // Send 2 identical requests concurrently with the same idempotency key
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ flightId: flight.id, noOfSeats: 2 }),
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ flightId: flight.id, noOfSeats: 2 })
    ]);

    const statuses = [res1.status, res2.status];
    // Either both return 201 (one created, one cached replay) OR one returns 201 and the other 409 Conflict
    const hasCreated = statuses.includes(201);
    expect(hasCreated).toBe(true);

    // In no case should two bookings be created
    const bookingCount = await db.Booking.count({ where: { flightId: flight.id } });
    expect(bookingCount).toBe(1);

    // Remaining seats must be deducted only once (10 - 2 = 8)
    await flight.reload();
    expect(flight.totalSeats).toBe(8);
  });
});
