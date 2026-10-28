'use strict';
const bcrypt = require('bcrypt');
const { Enums } = require('../utils/common');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const customerPassword = await bcrypt.hash('Customer@123', 10);

    // Seed Users
    await queryInterface.bulkInsert('Users', [
      {
        name: 'System Admin',
        email: 'admin@flights.com',
        password: adminPassword,
        role: Enums.USER_ROLES.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jane Customer',
        email: 'customer@flights.com',
        password: customerPassword,
        role: Enums.USER_ROLES.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Seed Cities
    await queryInterface.bulkInsert('Cities', [
      {
        id: 101,
        name: 'Delhi',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 102,
        name: 'Mumbai',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 103,
        name: 'Bengaluru',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Seed Airports
    await queryInterface.bulkInsert('Airports', [
      {
        name: 'Indira Gandhi International Airport',
        code: 'DEL',
        address: 'New Delhi, Delhi 110037',
        cityId: 101,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Chhatrapati Shivaji Maharaj International Airport',
        code: 'BOM',
        address: 'Mumbai, Maharashtra 400099',
        cityId: 102,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kempegowda International Airport',
        code: 'BLR',
        address: 'KIAL Rd, Devanahalli, Bengaluru 560300',
        cityId: 103,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Fetch airplanes
    const [airplanes] = await queryInterface.sequelize.query('SELECT id FROM Airplanes ORDER BY id ASC LIMIT 2');
    const airplane1Id = airplanes[0] ? airplanes[0].id : 1;
    const airplane2Id = airplanes[1] ? airplanes[1].id : airplane1Id;

    // Seed Flights
    const now = Date.now();
    await queryInterface.bulkInsert('Flights', [
      {
        flightNumber: 'UK-808',
        airplaneId: airplane1Id,
        departureAirportId: 'DEL',
        arrivalAirportId: 'BOM',
        departureTime: new Date(now + 86400000),
        arrivalTime: new Date(now + 86400000 + 7200000),
        price: 4500,
        boardingGate: '12A',
        totalSeats: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        flightNumber: '6E-204',
        airplaneId: airplane2Id,
        departureAirportId: 'BOM',
        arrivalAirportId: 'BLR',
        departureTime: new Date(now + 172800000),
        arrivalTime: new Date(now + 172800000 + 5400000),
        price: 3200,
        boardingGate: '4B',
        totalSeats: 180,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Flights', null, {});
    await queryInterface.bulkDelete('Airports', null, {});
    await queryInterface.bulkDelete('Cities', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
