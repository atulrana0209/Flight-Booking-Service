const { StatusCodes } = require('http-status-codes');
const CrudRepository = require('./crud-repository');
const { Booking, Flight, User, Airplane, Airport } = require('../models');
const AppError = require('../utils/errors/app-error');

class BookingRepository extends CrudRepository {
    constructor() {
        super(Booking);
    }

    async create(data, transaction = null) {
        const options = transaction ? { transaction } : {};
        const response = await Booking.create(data, options);
        return response;
    }

    async get(id, transaction = null, lock = null) {
        const options = {
            include: [
                {
                    model: Flight,
                    as: 'flightDetail'
                },
                {
                    model: User,
                    as: 'userDetail',
                    attributes: ['id', 'name', 'email', 'role']
                }
            ]
        };
        if (transaction) {
            options.transaction = transaction;
        }
        if (lock) {
            options.lock = lock;
        }
        const response = await Booking.findByPk(id, options);
        if (!response) {
            throw new AppError('The booking you requested does not exist', StatusCodes.NOT_FOUND);
        }
        return response;
    }

    async update(id, data, transaction = null) {
        const options = {
            where: { id }
        };
        if (transaction) {
            options.transaction = transaction;
        }
        const response = await Booking.update(data, options);
        return response;
    }

    async getAllBookings(filter = {}, pagination = {}) {
        const queryOptions = {
            where: filter,
            include: [
                {
                    model: Flight,
                    as: 'flightDetail'
                },
                {
                    model: User,
                    as: 'userDetail',
                    attributes: ['id', 'name', 'email', 'role']
                }
            ],
            order: [['createdAt', 'DESC']]
        };

        if (pagination.limit !== undefined) {
            queryOptions.limit = pagination.limit;
        }
        if (pagination.offset !== undefined) {
            queryOptions.offset = pagination.offset;
        }

        const response = await Booking.findAndCountAll(queryOptions);
        return response;
    }
}

module.exports = BookingRepository;
