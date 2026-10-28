const { Sequelize } = require('sequelize');
const { StatusCodes } = require('http-status-codes');

const CrudRepository = require('./crud-repository');
const { Flight, Airplane, Airport, City } = require('../models');
const db = require('../models');
const AppError = require('../utils/errors/app-error');

class FlightRepository extends CrudRepository {
    constructor() {
        super(Flight);
    }

    async getAllFlights(filter, sort, pagination = {}) {
        const queryOptions = {
            where: filter,
            order: sort,
            include: [
                {
                    model: Airplane,
                    required: true,
                    as: 'airplaneDetail',
                },
                {
                    model: Airport,
                    required: true,
                    as: 'departureAirport',
                    on: {
                        col1: Sequelize.where(Sequelize.col("Flight.departureAirportId"), "=", Sequelize.col("departureAirport.code"))
                    },
                    include: {
                        model: City,
                        required: true
                    }
                },
                {
                    model: Airport,
                    required: true,
                    as: 'arrivalAirport',
                    on: {
                        col1: Sequelize.where(Sequelize.col("Flight.arrivalAirportId"), "=", Sequelize.col("arrivalAirport.code"))
                    },
                    include: {
                        model: City,
                        required: true
                    }
                }
            ]
        };

        if (pagination.limit !== undefined) {
            queryOptions.limit = pagination.limit;
        }
        if (pagination.offset !== undefined) {
            queryOptions.offset = pagination.offset;
        }

        const response = await Flight.findAndCountAll(queryOptions);
        return response;
    }

    async updateRemainingSeats(flightId, seats, dec = true, externalTransaction = null) {
        const transaction = externalTransaction || await db.sequelize.transaction();
        try {
            const flight = await Flight.findByPk(flightId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!flight) {
                throw new AppError('The flight you requested does not exist', StatusCodes.NOT_FOUND);
            }

            const seatCount = Number(seats);
            if (isNaN(seatCount) || seatCount <= 0) {
                throw new AppError('Invalid seat count requested', StatusCodes.BAD_REQUEST);
            }

            if (+dec) {
                if (flight.totalSeats < seatCount) {
                    throw new AppError('Insufficient seats available on this flight', StatusCodes.BAD_REQUEST);
                }
                await flight.decrement('totalSeats', { by: seatCount, transaction });
            } else {
                await flight.increment('totalSeats', { by: seatCount, transaction });
            }

            await flight.reload({ transaction });

            if (!externalTransaction) {
                await transaction.commit();
            }
            return flight;
        } catch (error) {
            if (!externalTransaction) {
                await transaction.rollback();
            }
            throw error;
        }
    }
}

module.exports = FlightRepository;
