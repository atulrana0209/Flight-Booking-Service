'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('Flights', ['departureAirportId', 'arrivalAirportId'], {
      name: 'idx_flights_route'
    });
    await queryInterface.addIndex('Flights', ['departureTime'], {
      name: 'idx_flights_departure_time'
    });
    await queryInterface.addIndex('Flights', ['price'], {
      name: 'idx_flights_price'
    });

    await queryInterface.addIndex('Bookings', ['userId'], {
      name: 'idx_bookings_user_id'
    });
    await queryInterface.addIndex('Bookings', ['flightId'], {
      name: 'idx_bookings_flight_id'
    });
    await queryInterface.addIndex('Bookings', ['status'], {
      name: 'idx_bookings_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Flights', 'idx_flights_route');
    await queryInterface.removeIndex('Flights', 'idx_flights_departure_time');
    await queryInterface.removeIndex('Flights', 'idx_flights_price');

    await queryInterface.removeIndex('Bookings', 'idx_bookings_user_id');
    await queryInterface.removeIndex('Bookings', 'idx_bookings_flight_id');
    await queryInterface.removeIndex('Bookings', 'idx_bookings_status');
  }
};
