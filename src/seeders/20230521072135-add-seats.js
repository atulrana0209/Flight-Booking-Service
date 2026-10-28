'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const [airplanes] = await queryInterface.sequelize.query('SELECT id FROM Airplanes LIMIT 1');
    const airplaneId = airplanes.length > 0 ? airplanes[0].id : 1;

    await queryInterface.bulkInsert('Seats', [
      {
        airplaneId,
        row: 1,
        col: 'A',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 1,
        col: 'B',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 1,
        col: 'C',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 1,
        col: 'D',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 1,
        col: 'E',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 1,
        col: 'F',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'A',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'B',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'C',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'D',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'E',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        airplaneId,
        row: 2,
        col: 'F',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Seats', null, {});
  }
};
