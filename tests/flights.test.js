const request = require('supertest');
const app = require('../src/app');
const { cleanDatabase, createTestUser, createTestFlight } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');

describe('Flights Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('GET /api/v1/flights', () => {
    it('should list all flights with pagination and return status 200', async () => {
      await createTestFlight({ flightNumber: 'FL-001' });
      await createTestFlight({ flightNumber: 'FL-002' });

      const res = await request(app).get('/api/v1/flights?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalItems).toBe(2);
      expect(res.body.data.flights.length).toBe(2);
      expect(res.body.data.currentPage).toBe(1);
    });

    it('should fetch single flight by id', async () => {
      const { flight } = await createTestFlight({ flightNumber: 'FL-100' });

      const res = await request(app).get(`/api/v1/flights/${flight.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.flightNumber).toBe('FL-100');
    });

    it('should return 404 for nonexistent flight', async () => {
      const res = await request(app).get('/api/v1/flights/99999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/flights (Role Access)', () => {
    it('should forbid customers from creating flights', async () => {
      const { token } = await createTestUser({ role: Enums.USER_ROLES.CUSTOMER });

      const res = await request(app)
        .post('/api/v1/flights')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightNumber: 'FL-999',
          airplaneId: 1,
          departureAirportId: 'DEL',
          arrivalAirportId: 'BOM',
          arrivalTime: new Date(),
          departureTime: new Date(),
          price: 4000,
          totalSeats: 100
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid flight creation when departure and arrival airport are the same', async () => {
      const { token } = await createTestUser({ role: Enums.USER_ROLES.ADMIN });

      const res = await request(app)
        .post('/api/v1/flights')
        .set('Authorization', `Bearer ${token}`)
        .send({
          flightNumber: 'FL-999',
          airplaneId: 1,
          departureAirportId: 'DEL',
          arrivalAirportId: 'DEL',
          arrivalTime: new Date(),
          departureTime: new Date(),
          price: 4000,
          totalSeats: 100
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be the same/i);
    });
  });
});
