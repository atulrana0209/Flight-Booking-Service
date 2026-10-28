const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');
const { BookingService } = require('../src/services');

describe('Hardened Concurrency & Failure-Injection Test Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('Stress Test: 100 concurrent requests competing for 20 available seats', async () => {
    // Flight with capacity 180, but only 20 seats left
    const { flight, airplane } = await createTestFlight({ totalSeats: 20, price: 4000 });

    // Create 100 distinct users to simulate 100 independent clients
    const userPromises = [];
    for (let i = 0; i < 100; i++) {
      userPromises.push(createTestUser({ email: `stress_user_${i}@example.com` }));
    }
    const users = await Promise.all(userPromises);

    // Launch all 100 requests concurrently
    const bookingPromises = users.map((u) =>
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${u.token}`)
        .send({
          flightId: flight.id,
          noOfSeats: 1
        })
    );

    const responses = await Promise.all(bookingPromises);

    const successfulBookings = responses.filter(r => r.status === 201);
    const failedBookings = responses.filter(r => r.status === 400);

    // Measure and assert invariants
    expect(successfulBookings.length).toBe(20);
    expect(failedBookings.length).toBe(80);

    // Invariant: Final inventory must be exactly 0, never negative
    await flight.reload();
    expect(flight.totalSeats).toBe(0);
    expect(flight.totalSeats).toBeGreaterThanOrEqual(0);
    expect(flight.totalSeats).toBeLessThanOrEqual(airplane.capacity);

    // Invariant: Exactly 20 bookings persisted in DB
    const persistedCount = await db.Booking.count({
      where: {
        flightId: flight.id,
        status: Enums.BOOKING_STATUS.CONFIRMED
      }
    });
    expect(persistedCount).toBe(20);
  });

  it('should prevent double cancellation and double inventory restoration on concurrent cancel requests', async () => {
    const { token } = await createTestUser({ email: 'dual_cancel@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ flightId: flight.id, noOfSeats: 3 });

    const bookingId = bookingRes.body.data.id;

    await flight.reload();
    expect(flight.totalSeats).toBe(7);

    // Concurrently trigger two cancellation requests on the exact same booking
    const [cancelRes1, cancelRes2] = await Promise.all([
      request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`),
      request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
    ]);

    const statuses = [cancelRes1.status, cancelRes2.status].sort();
    // Exactly one succeeds with 200, one fails with 400
    expect(statuses).toEqual([200, 400]);

    // Invariant: Inventory is restored exactly once (7 + 3 = 10), NEVER double-restored (13)
    await flight.reload();
    expect(flight.totalSeats).toBe(10);
  });

  it('should force an error between inventory deduction and booking insert, verifying full atomic rollback', async () => {
    const { user } = await createTestUser({ email: 'rollback_user@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 15, price: 5000 });

    // Mock Booking.create to throw a synthetic database error inside the transaction
    const originalCreate = db.Booking.create;
    db.Booking.create = jest.fn().mockImplementation(() => {
      throw new Error('SIMULATED_DB_FAILURE_DURING_BOOKING_INSERT');
    });

    let caughtError = null;
    try {
      await BookingService.createBooking({
        flightId: flight.id,
        userId: user.id,
        noOfSeats: 3
      });
    } catch (err) {
      caughtError = err;
    }

    // Restore original method
    db.Booking.create = originalCreate;

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toBe('SIMULATED_DB_FAILURE_DURING_BOOKING_INSERT');

    // Invariant: The seat inventory deduction must have rolled back completely!
    await flight.reload();
    expect(flight.totalSeats).toBe(15);

    // Invariant: No phantom bookings were created
    const count = await db.Booking.count({ where: { flightId: flight.id } });
    expect(count).toBe(0);
  });

  it('should ensure inventory never exceeds airplane capacity upon multiple cancellation attempts', async () => {
    const { token } = await createTestUser({ email: 'capacity_user@example.com' });
    const { flight, airplane } = await createTestFlight({ totalSeats: 10 });

    // Book 2 seats
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ flightId: flight.id, noOfSeats: 2 });

    const bookingId = bookingRes.body.data.id;

    // Send 5 concurrent cancellation requests for the exact same booking
    const cancelRequests = [];
    for (let i = 0; i < 5; i++) {
      cancelRequests.push(
        request(app)
          .post(`/api/v1/bookings/${bookingId}/cancel`)
          .set('Authorization', `Bearer ${token}`)
      );
    }

    const cancelResponses = await Promise.all(cancelRequests);

    const successfulCancels = cancelResponses.filter(r => r.status === 200);
    const failedCancels = cancelResponses.filter(r => r.status === 400);

    expect(successfulCancels.length).toBe(1);
    expect(failedCancels.length).toBe(4);

    // Invariant: Flight seats must be restored exactly once (10) and never exceed airplane capacity
    await flight.reload();
    expect(flight.totalSeats).toBe(10);
    expect(flight.totalSeats).toBeLessThanOrEqual(airplane.capacity);
  });
});
