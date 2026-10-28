process.env.NODE_ENV = 'test';

const db = require('../src/models');

beforeAll(async () => {
  await db.sequelize.authenticate();
});

afterAll(async () => {
  await db.sequelize.close();
});
