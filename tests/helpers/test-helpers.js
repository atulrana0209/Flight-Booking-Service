const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../src/models');
const { ServerConfig } = require('../../src/config');
const { Enums } = require('../../src/utils/common');

async function cleanDatabase() {
  await db.IdempotencyKey.destroy({ where: {}, truncate: false });
  await db.Booking.destroy({ where: {}, truncate: false });
  await db.Seat.destroy({ where: {}, truncate: false });
  await db.Flight.destroy({ where: {}, truncate: false });
  await db.Airport.destroy({ where: {}, truncate: false });
  await db.City.destroy({ where: {}, truncate: false });
  await db.Airplane.destroy({ where: {}, truncate: false });
  await db.User.destroy({ where: {}, truncate: false });
}

async function createTestUser({ name = 'Test User', email = 'test@example.com', password = 'password123', role = Enums.USER_ROLES.CUSTOMER } = {}) {
  const user = await db.User.create({
    name,
    email,
    password,
    role
  });

  const token = jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role
  }, ServerConfig.JWT_SECRET, {
    expiresIn: '1h'
  });

  return { user, token };
}

async function createTestFlight({ flightNumber = 'AI-202', totalSeats = 10, price = 5000 } = {}) {
  const airplane = await db.Airplane.create({
    modelNumber: 'Boeing737',
    capacity: 180
  });

  const city1 = await db.City.create({ name: `CityA_${Date.now()}_${Math.random()}` });
  const city2 = await db.City.create({ name: `CityB_${Date.now()}_${Math.random()}` });

  const depCode = `D${Math.floor(Math.random() * 899 + 100)}`;
  const arrCode = `A${Math.floor(Math.random() * 899 + 100)}`;

  const depAirport = await db.Airport.create({
    name: `Airport ${depCode}`,
    code: depCode,
    cityId: city1.id,
    address: `Address ${depCode}`
  });

  const arrAirport = await db.Airport.create({
    name: `Airport ${arrCode}`,
    code: arrCode,
    cityId: city2.id,
    address: `Address ${arrCode}`
  });

  const departureTime = new Date(Date.now() + 86400000);
  const arrivalTime = new Date(Date.now() + 86400000 + 7200000);

  const flight = await db.Flight.create({
    flightNumber,
    airplaneId: airplane.id,
    departureAirportId: depAirport.code,
    arrivalAirportId: arrAirport.code,
    departureTime,
    arrivalTime,
    price,
    totalSeats,
    boardingGate: 'G1'
  });

  return { flight, airplane, depAirport, arrAirport };
}

module.exports = {
  cleanDatabase,
  createTestUser,
  createTestFlight
};
