'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE Bookings 
      MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED', 'EXPIRED') 
      NOT NULL DEFAULT 'PENDING';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE Bookings 
      MODIFY COLUMN status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED') 
      NOT NULL DEFAULT 'PENDING';
    `);
  }
};
