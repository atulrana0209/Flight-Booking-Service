'use strict';
const { Model } = require('sequelize');

const { Enums } = require('../utils/common');
const { IN_PROGRESS, RESOLVED, FAILED } = Enums.IDEMPOTENCY_STATUS;

module.exports = (sequelize, DataTypes) => {
  class IdempotencyKey extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      this.belongsTo(models.Booking, {
        foreignKey: 'bookingId',
        as: 'booking'
      });
    }
  }

  IdempotencyKey.init({
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requestHash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    responseStatusCode: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    responseBody: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('responseBody');
        if (!rawValue) return null;
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      },
      set(value) {
        if (typeof value === 'object' && value !== null) {
          this.setDataValue('responseBody', JSON.stringify(value));
        } else {
          this.setDataValue('responseBody', value);
        }
      }
    },
    status: {
      type: DataTypes.ENUM(IN_PROGRESS, RESOLVED, FAILED),
      defaultValue: IN_PROGRESS,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'IdempotencyKey',
  });

  return IdempotencyKey;
};
