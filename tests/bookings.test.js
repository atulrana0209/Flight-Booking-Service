const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');

describe('Booking System Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/bookings', () => {
    it('should successfully create a booking, deduct seats atomically, and return CONFIRMED status', async () => {
      const { user, token } = await createTestUser({ email: 'user1@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 10, price: 3000 });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightId: flight.id,
          noOfSeats: 3
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(Enums.BOOKING_STATUS.CONFIRMED);
      expect(res.body.data.noOfSeats).toBe(3);
      expect(res.body.data.totalCost).toBe(9000); // 3000 * 3
      expect(res.body.data.userId).toBe(user.id);

      // Verify database inventory update
      await flight.reload();
      expect(flight.totalSeats).toBe(7); // 10 - 3
    });

    it('should reject booking when requested seats exceed availability', async () => {
      const { token } = await createTestUser({ email: 'user2@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 2, price: 4000 });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightId: flight.id,
          noOfSeats: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient seats/i);

      // Verify database inventory is completely untouched
      await flight.reload();
      expect(flight.totalSeats).toBe(2);

      // Verify no booking was persisted
      const bookingsCount = await db.Booking.count({ where: { flightId: flight.id } });
      expect(bookingsCount).toBe(0);
    });

    it('should reject booking for a nonexistent flight with 404', async () => {
      const { token } = await createTestUser({ email: 'user3@example.com' });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightId: 999999,
          noOfSeats: 1
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject booking with invalid seat counts (negative or zero)', async () => {
      const { token } = await createTestUser({ email: 'user4@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 10 });

      const resNegative = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightId: flight.id,
          noOfSeats: -2
        });

      expect(resNegative.status).toBe(400);

      const resZero = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightId: flight.id,
          noOfSeats: 0
        });

      expect(resZero.status).toBe(400);
    });
  });

  describe('POST /api/v1/bookings/:id/cancel', () => {
    it('should cancel a booking and restore flight inventory exactly once', async () => {
      const { token } = await createTestUser({ email: 'canceller@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 5, price: 2000 });

      // Create booking for 2 seats
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ flightId: flight.id, noOfSeats: 2 });

      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data.id;

      await flight.reload();
      expect(flight.totalSeats).toBe(3); // 5 - 2

      // Cancel the booking
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe(Enums.BOOKING_STATUS.CANCELLED);

      // Verify flight inventory restored
      await flight.reload();
      expect(flight.totalSeats).toBe(5); // 3 + 2
    });

    it('should reject repeated cancellation requests and not restore inventory twice', async () => {
      const { token } = await createTestUser({ email: 'repeat_canceller@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 10 });

      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ flightId: flight.id, noOfSeats: 4 });

      const bookingId = createRes.body.data.id;

      // First cancellation
      const cancel1 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(cancel1.status).toBe(200);

      await flight.reload();
      expect(flight.totalSeats).toBe(10);

      // Second cancellation attempt
      const cancel2 = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(cancel2.status).toBe(400);
      expect(cancel2.body.message).toMatch(/already cancelled/i);

      // Ensure inventory was NOT restored again
      await flight.reload();
      expect(flight.totalSeats).toBe(10);
    });
  });

  describe('Authorization & Cross-User Security', () => {
    it('should forbid User B from viewing User A booking', async () => {
      const userA = await createTestUser({ email: 'userA@example.com' });
      const userB = await createTestUser({ email: 'userB@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 10 });

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ flightId: flight.id, noOfSeats: 1 });

      const bookingId = bookingRes.body.data.id;

      // User B tries to view User A's booking
      const viewRes = await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(viewRes.status).toBe(403);
      expect(viewRes.body.message).toMatch(/not authorized/i);
    });

    it('should forbid User B from cancelling User A booking', async () => {
      const userA = await createTestUser({ email: 'owner@example.com' });
      const userB = await createTestUser({ email: 'attacker@example.com' });
      const { flight } = await createTestFlight({ totalSeats: 10 });

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ flightId: flight.id, noOfSeats: 1 });

      const bookingId = bookingRes.body.data.id;

      // User B tries to cancel User A's booking
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userB.token}`);

      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.message).toMatch(/not authorized/i);
    });

    it('should allow Admin to view and cancel any booking', async () => {
      const customer = await createTestUser({ email: 'cust@example.com' });
      const admin = await createTestUser({ email: 'admin@example.com', role: Enums.USER_ROLES.ADMIN });
      const { flight } = await createTestFlight({ totalSeats: 10 });

      const bookingRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ flightId: flight.id, noOfSeats: 2 });

      const bookingId = bookingRes.body.data.id;

      // Admin views customer booking
      const viewRes = await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(viewRes.status).toBe(200);

      // Admin cancels customer booking
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(Enums.BOOKING_STATUS.CANCELLED);
    });
  });
});
