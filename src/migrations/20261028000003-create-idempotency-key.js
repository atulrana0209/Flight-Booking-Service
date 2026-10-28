'use strict';
const { Enums } = require('../utils/common');
const { IN_PROGRESS, RESOLVED, FAILED } = Enums.IDEMPOTENCY_STATUS;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IdempotencyKeys', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: false
      },
      requestHash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      responseStatusCode: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      responseBody: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM(IN_PROGRESS, RESOLVED, FAILED),
        defaultValue: IN_PROGRESS,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('IdempotencyKeys');
  }
};
