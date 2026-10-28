const dotenv = require('dotenv');
dotenv.config();

const baseConfig = {
  username: process.env.DB_USER || 'flight_admin',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'flight_admin_pass',
  host: process.env.DB_HOST || '172.17.113.175',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 25,
    min: process.env.DB_POOL_MIN ? Number(process.env.DB_POOL_MIN) : 2,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3,
    match: [
      /SequelizeDeadlockError/,
      /ER_LOCK_DEADLOCK/,
      /Deadlock found when trying to get lock/,
      /Lock wait timeout exceeded/,
      /Connection lost/,
      /ECONNRESET/
    ]
  }
};

module.exports = {
  development: {
    ...baseConfig,
    database: process.env.DB_NAME || 'flights_dev',
  },
  test: {
    ...baseConfig,
    database: process.env.DB_TEST_NAME || 'flights_test',
  },
  production: {
    ...baseConfig,
    database: process.env.DB_NAME || 'flights_prod',
  },
};
