'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Flight extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Airplane, {
        foreignKey: 'airplaneId',
        as: 'airplaneDetail'
      });
      this.belongsTo(models.Airport, {
        foreignKey: 'departureAirportId',
        as: 'departureAirport',
      });
      this.belongsTo(models.Airport, {
        foreignKey: 'arrivalAirportId',
        as: 'arrivalAirport',
      });
      this.hasMany(models.Booking, {
        foreignKey: 'flightId',
        as: 'bookings',
        onDelete: 'CASCADE'
      });
    }
  }
  Flight.init({
    flightNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    airplaneId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    departureAirportId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    arrivalAirportId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    arrivalTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    departureTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    boardingGate: {
      type: DataTypes.STRING
    },
    totalSeats: { // total remaining seats
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Total remaining seats cannot be negative' }
      }
    },
  }, {
    sequelize,
    modelName: 'Flight',
  });
  return Flight;
};
