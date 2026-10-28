const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');
const { BookingService } = require('../src/services');

describe('Reservation Expiry & Lifecycle Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should create a PENDING reservation that holds seats until confirmed', async () => {
    const { user, token } = await createTestUser({ email: 'reserver@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10, price: 3000 });

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        flightId: flight.id,
        noOfSeats: 2,
        status: Enums.BOOKING_STATUS.PENDING,
        holdDurationMinutes: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(Enums.BOOKING_STATUS.PENDING);
    expect(res.body.data.expiresAt).not.toBeNull();

    // Seats must be held immediately
    await flight.reload();
    expect(flight.totalSeats).toBe(8);

    // Confirm the reservation before expiry
    const confirmRes = await request(app)
      .post(`/api/v1/bookings/${res.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${token}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe(Enums.BOOKING_STATUS.CONFIRMED);

    // Seats remain deducted
    await flight.reload();
    expect(flight.totalSeats).toBe(8);
  });

  it('should reject confirmation and restore seats if reservation has passed expiry deadline', async () => {
    const { user, token } = await createTestUser({ email: 'expired_confirm@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });

    // Create a reservation that expired 5 minutes ago
    const expiredBooking = await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 3,
      totalCost: 9000,
      status: Enums.BOOKING_STATUS.PENDING,
      expiresAt: new Date(Date.now() - 300000) // 5 minutes in past
    });

    // Flight currently has 7 seats left
    await flight.update({ totalSeats: 7 });

    const confirmRes = await request(app)
      .post(`/api/v1/bookings/${expiredBooking.id}/confirm`)
      .set('Authorization', `Bearer ${token}`);

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.message).toMatch(/expired/i);

    // Invariant: Expired confirmation must restore held seats
    await flight.reload();
    expect(flight.totalSeats).toBe(10); // 7 + 3

    await expiredBooking.reload();
    expect(expiredBooking.status).toBe(Enums.BOOKING_STATUS.EXPIRED);
  });

  it('should sweep expired pending reservations, restoring inventory atomically and idempotently', async () => {
    const { user } = await createTestUser({ email: 'sweeper_user@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 20 });

    // Create 3 bookings: 2 expired, 1 still active
    const now = Date.now();
    await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 2,
      totalCost: 6000,
      status: Enums.BOOKING_STATUS.PENDING,
      expiresAt: new Date(now - 60000) // expired
    });

    await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 3,
      totalCost: 9000,
      status: Enums.BOOKING_STATUS.PENDING,
      expiresAt: new Date(now - 120000) // expired
    });

    await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 4,
      totalCost: 12000,
      status: Enums.BOOKING_STATUS.PENDING,
      expiresAt: new Date(now + 600000) // active for 10 min
    });

    // Total held seats: 2 + 3 + 4 = 9. Flight remaining seats = 11.
    await flight.update({ totalSeats: 11 });

    // First sweeper run
    const sweep1 = await BookingService.expireStaleReservations();
    expect(sweep1.expiredCount).toBe(2);

    // Flight seats must be restored by 2 + 3 = 5 (11 + 5 = 16)
    await flight.reload();
    expect(flight.totalSeats).toBe(16);

    // Second sweeper run immediately after (idempotence verification)
    const sweep2 = await BookingService.expireStaleReservations();
    expect(sweep2.expiredCount).toBe(0);

    // Inventory must remain exactly 16
    await flight.reload();
    expect(flight.totalSeats).toBe(16);
  });

  it('should handle race condition between confirmation and expiry worker cleanly', async () => {
    const { user, token } = await createTestUser({ email: 'race_expire@example.com' });
    const { flight } = await createTestFlight({ totalSeats: 10 });

    // Reservation that just expired 1 millisecond ago
    const booking = await db.Booking.create({
      flightId: flight.id,
      userId: user.id,
      noOfSeats: 2,
      totalCost: 6000,
      status: Enums.BOOKING_STATUS.PENDING,
      expiresAt: new Date(Date.now() - 10)
    });

    await flight.update({ totalSeats: 8 });

    // Run confirmation and sweeper concurrently
    const [confirmResult, sweepResult] = await Promise.all([
      request(app)
        .post(`/api/v1/bookings/${booking.id}/confirm`)
        .set('Authorization', `Bearer ${token}`),
      BookingService.expireStaleReservations()
    ]);

    await booking.reload();
    await flight.reload();

    // Either confirmation won or expiry won, but status must be consistent and seats must match exactly
    if (booking.status === Enums.BOOKING_STATUS.CONFIRMED) {
      expect(flight.totalSeats).toBe(8);
    } else {
      expect(booking.status).toBe(Enums.BOOKING_STATUS.EXPIRED);
      expect(flight.totalSeats).toBe(10); // restored
    }
  });
});
