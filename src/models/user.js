'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

const { Enums } = require('../utils/common');
const { ADMIN, CUSTOMER } = Enums.USER_ROLES;

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Booking, {
        foreignKey: 'userId',
        as: 'bookings',
        onDelete: 'CASCADE'
      });
      this.hasMany(models.IdempotencyKey, {
        foreignKey: 'userId',
        as: 'idempotencyKeys',
        onDelete: 'SET NULL'
      });
    }

    async validatePassword(plainPassword) {
      return bcrypt.compare(plainPassword, this.password);
    }
  }

  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User name cannot be empty' }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Email must be a valid email address' }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [6, 128], msg: 'Password must be between 6 and 128 characters' }
      }
    },
    role: {
      type: DataTypes.ENUM(ADMIN, CUSTOMER),
      defaultValue: CUSTOMER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  return User;
};
