const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');

describe('Concurrency & Transaction Safety Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should prevent overselling when concurrent requests compete for the last available seats', async () => {
    // Flight with only 2 remaining seats
    const { flight } = await createTestFlight({ totalSeats: 2, price: 5000 });

    // 5 different users attempting to book 1 seat each concurrently
    const users = await Promise.all([
      createTestUser({ email: 'concurrent1@example.com' }),
      createTestUser({ email: 'concurrent2@example.com' }),
      createTestUser({ email: 'concurrent3@example.com' }),
      createTestUser({ email: 'concurrent4@example.com' }),
      createTestUser({ email: 'concurrent5@example.com' })
    ]);

    // Send 5 requests simultaneously
    const responses = await Promise.all(
      users.map(u =>
        request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${u.token}`)
          .send({
            flightId: flight.id,
            noOfSeats: 1
          })
      )
    );

    const successfulBookings = responses.filter(r => r.status === 201);
    const failedBookings = responses.filter(r => r.status === 400);

    // Exactly 2 must succeed because capacity was 2
    expect(successfulBookings.length).toBe(2);
    // Exactly 3 must fail because seats were exhausted
    expect(failedBookings.length).toBe(3);

    failedBookings.forEach(res => {
      expect(res.body.message).toMatch(/insufficient seats/i);
    });

    // Check database state: total remaining seats must be 0, never negative
    await flight.reload();
    expect(flight.totalSeats).toBe(0);

    // Check total persisted bookings count in database
    const confirmedCount = await db.Booking.count({
      where: {
        flightId: flight.id,
        status: Enums.BOOKING_STATUS.CONFIRMED
      }
    });
    expect(confirmedCount).toBe(2);
  });

  it('should prevent race conditions on concurrent cancellations and restore inventory exactly once', async () => {
    const { flight } = await createTestFlight({ totalSeats: 10 });
    const { token } = await createTestUser({ email: 'race_cancel@example.com' });

    // Book 3 seats (10 - 3 = 7 seats remaining)
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ flightId: flight.id, noOfSeats: 3 });

    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    await flight.reload();
    expect(flight.totalSeats).toBe(7);

    // Fire 2 concurrent cancellation requests simultaneously for the same booking
    const [cancelRes1, cancelRes2] = await Promise.all([
      request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`),
      request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
    ]);

    const statuses = [cancelRes1.status, cancelRes2.status].sort();
    // Exactly one should succeed with 200, one should fail with 400
    expect(statuses).toEqual([200, 400]);

    // Inventory must be restored exactly once (7 + 3 = 10), NOT double-restored (13)
    await flight.reload();
    expect(flight.totalSeats).toBe(10);
  });
});
