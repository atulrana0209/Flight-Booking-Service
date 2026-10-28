'use strict';
const { Model } = require('sequelize');

const { Enums } = require('../utils/common');
const { PENDING, CONFIRMED, CANCELLED, FAILED, EXPIRED } = Enums.BOOKING_STATUS;

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      this.belongsTo(models.Flight, {
        foreignKey: 'flightId',
        as: 'flightDetail'
      });
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'userDetail'
      });
    }
  }

  Booking.init({
    flightId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(PENDING, CONFIRMED, CANCELLED, FAILED, EXPIRED),
      defaultValue: PENDING,
      allowNull: false
    },
    noOfSeats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: { args: [1], msg: 'Number of seats must be at least 1' }
      }
    },
    totalCost: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Total cost cannot be negative' }
      }
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Booking',
  });

  return Booking;
};
