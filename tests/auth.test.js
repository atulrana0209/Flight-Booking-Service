const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { cleanDatabase, createTestUser } = require('./helpers/test-helpers');
const { Enums } = require('../src/utils/common');

describe('Authentication & Authorization Suite', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should successfully register a user and hash the password in the database', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Alice Smith',
          email: 'alice@example.com',
          password: 'securepassword123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.role).toBe(Enums.USER_ROLES.CUSTOMER);
      expect(res.body.data.token).toBeDefined();

      // Verify that the plain text password was hashed in the database
      const userInDb = await db.User.findOne({ where: { email: 'alice@example.com' } });
      expect(userInDb).not.toBeNull();
      expect(userInDb.password).not.toBe('securepassword123');
      expect(await userInDb.validatePassword('securepassword123')).toBe(true);
    });

    it('should reject signup with an existing email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject signup with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Incomplete User'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/signin', () => {
    beforeEach(async () => {
      await createTestUser({ email: 'bob@example.com', password: 'password123' });
    });

    it('should successfully authenticate with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'bob@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('bob@example.com');
    });

    it('should reject signin with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'bob@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject signin with nonexistent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when valid Bearer token is provided', async () => {
      const { user, token } = await createTestUser({ email: 'charlie@example.com' });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.email).toBe('charlie@example.com');
    });

    it('should reject request when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with an invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
