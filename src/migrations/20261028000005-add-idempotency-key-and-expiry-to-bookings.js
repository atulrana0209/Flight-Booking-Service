'use strict';
const { Enums } = require('../utils/common');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add idempotencyKey to Bookings
    await queryInterface.addColumn('Bookings', 'idempotencyKey', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    // Add expiresAt to Bookings
    await queryInterface.addColumn('Bookings', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add bookingId to IdempotencyKeys
    await queryInterface.addColumn('IdempotencyKeys', 'bookingId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Bookings',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });

    // Add indexes for fast lookup
    await queryInterface.addIndex('Bookings', ['idempotencyKey'], {
      name: 'idx_bookings_idempotency_key'
    });

    await queryInterface.addIndex('Bookings', ['status', 'expiresAt'], {
      name: 'idx_bookings_status_expires_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Bookings', 'idx_bookings_status_expires_at');
    await queryInterface.removeIndex('Bookings', 'idx_bookings_idempotency_key');
    await queryInterface.removeColumn('IdempotencyKeys', 'bookingId');
    await queryInterface.removeColumn('Bookings', 'expiresAt');
    await queryInterface.removeColumn('Bookings', 'idempotencyKey');
  }
};
