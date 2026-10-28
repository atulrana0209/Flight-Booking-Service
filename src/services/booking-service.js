const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const db = require('../models');
const { Booking, Flight } = require('../models');
const { BookingRepository, FlightRepository } = require('../repositories');
const AppError = require('../utils/errors/app-error');
const { Enums } = require('../utils/common');
const { executeWithRetry } = require('../utils/helpers/transaction-helper');

const bookingRepository = new BookingRepository();
const flightRepository = new FlightRepository();

/**
 * Creates a booking atomically with row-level locking.
 * Status defaults to CONFIRMED (or PENDING if reservation hold is specified).
 */
async function createBooking(data) {
    const flightId = Number(data.flightId);
    const userId = Number(data.userId);
    const noOfSeats = Number(data.noOfSeats) || 1;
    const idempotencyKey = data.idempotencyKey || null;
    const status = data.status || Enums.BOOKING_STATUS.CONFIRMED;
    const holdDurationMinutes = data.holdDurationMinutes || 10;

    if (!flightId || isNaN(flightId)) {
        throw new AppError('A valid flightId must be provided', StatusCodes.BAD_REQUEST);
    }
    if (!userId || isNaN(userId)) {
        throw new AppError('A valid userId must be provided', StatusCodes.BAD_REQUEST);
    }
    if (noOfSeats <= 0 || !Number.isInteger(noOfSeats)) {
        throw new AppError('Number of seats must be a positive integer', StatusCodes.BAD_REQUEST);
    }

    const expiresAt = status === Enums.BOOKING_STATUS.PENDING
        ? new Date(Date.now() + holdDurationMinutes * 60 * 1000)
        : null;

    return await executeWithRetry(async (transaction) => {
        // Row-level lock on flight to serialize concurrent booking attempts
        const flight = await Flight.findByPk(flightId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!flight) {
            throw new AppError('The flight you requested does not exist', StatusCodes.NOT_FOUND);
        }

        if (flight.totalSeats < noOfSeats) {
            throw new AppError('Insufficient seats available on this flight', StatusCodes.BAD_REQUEST);
        }

        const totalCost = flight.price * noOfSeats;

        // Decrement seats inside the transaction
        await flight.decrement('totalSeats', {
            by: noOfSeats,
            transaction
        });

        const booking = await Booking.create({
            flightId,
            userId,
            noOfSeats,
            totalCost,
            status,
            idempotencyKey,
            expiresAt
        }, { transaction });

        return booking;
    });
}

/**
 * Confirms a PENDING reservation if not expired.
 */
async function confirmBooking({ bookingId, userId, role }) {
    const id = Number(bookingId);
    if (!id || isNaN(id)) {
        throw new AppError('Invalid booking ID provided', StatusCodes.BAD_REQUEST);
    }

    const result = await executeWithRetry(async (transaction) => {
        const booking = await Booking.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!booking) {
            throw new AppError('The booking you requested does not exist', StatusCodes.NOT_FOUND);
        }

        if (role !== Enums.USER_ROLES.ADMIN && booking.userId !== userId) {
            throw new AppError('You are not authorized to confirm this booking', StatusCodes.FORBIDDEN);
        }

        if (booking.status === Enums.BOOKING_STATUS.CONFIRMED) {
            return booking; // Idempotent success
        }

        if (booking.status === Enums.BOOKING_STATUS.CANCELLED) {
            throw new AppError('Cannot confirm a cancelled booking', StatusCodes.BAD_REQUEST);
        }

        if (booking.status === Enums.BOOKING_STATUS.EXPIRED) {
            throw new AppError('Reservation has already expired', StatusCodes.BAD_REQUEST);
        }

        // Check if reservation has passed its expiry deadline
        if (booking.expiresAt && new Date(booking.expiresAt).getTime() < Date.now()) {
            const flight = await Flight.findByPk(booking.flightId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (flight) {
                await flight.increment('totalSeats', {
                    by: booking.noOfSeats,
                    transaction
                });
            }

            booking.status = Enums.BOOKING_STATUS.EXPIRED;
            await booking.save({ transaction });

            // Mark expired flag on booking object to throw after transaction commits
            booking._wasExpired = true;
            return booking;
        }

        booking.status = Enums.BOOKING_STATUS.CONFIRMED;
        booking.expiresAt = null;
        await booking.save({ transaction });

        return booking;
    });

    if (result._wasExpired) {
        throw new AppError('Reservation has expired and seats have been released', StatusCodes.BAD_REQUEST);
    }

    return result;
}

/**
 * Cancels a booking and restores inventory exactly once.
 */
async function cancelBooking({ bookingId, userId, role }) {
    const id = Number(bookingId);
    if (!id || isNaN(id)) {
        throw new AppError('Invalid booking ID provided', StatusCodes.BAD_REQUEST);
    }

    return await executeWithRetry(async (transaction) => {
        // Row-level lock on booking
        const booking = await Booking.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!booking) {
            throw new AppError('The booking you requested does not exist', StatusCodes.NOT_FOUND);
        }

        // Authorization check: only owner or admin can cancel
        if (role !== Enums.USER_ROLES.ADMIN && booking.userId !== userId) {
            throw new AppError('You are not authorized to cancel this booking', StatusCodes.FORBIDDEN);
        }

        if (booking.status === Enums.BOOKING_STATUS.CANCELLED) {
            throw new AppError('Booking is already cancelled', StatusCodes.BAD_REQUEST);
        }

        if (booking.status === Enums.BOOKING_STATUS.EXPIRED) {
            throw new AppError('Booking is already expired', StatusCodes.BAD_REQUEST);
        }

        // Lock flight row and restore inventory exactly once
        const flight = await Flight.findByPk(booking.flightId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (flight) {
            await flight.increment('totalSeats', {
                by: booking.noOfSeats,
                transaction
            });
        }

        booking.status = Enums.BOOKING_STATUS.CANCELLED;
        await booking.save({ transaction });

        return booking;
    });
}

/**
 * Sweeper worker: Expired pending reservations are transitioned to EXPIRED
 * and their seat inventory is returned to the flight.
 */
async function expireStaleReservations() {
    const expiredBookings = await Booking.findAll({
        where: {
            status: Enums.BOOKING_STATUS.PENDING,
            expiresAt: {
                [Op.lte]: new Date()
            }
        }
    });

    let expiredCount = 0;

    for (const b of expiredBookings) {
        try {
            await executeWithRetry(async (transaction) => {
                // Lock booking row to prevent race condition with concurrent confirm/cancel
                const booking = await Booking.findByPk(b.id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!booking || booking.status !== Enums.BOOKING_STATUS.PENDING) {
                    return; // Already confirmed or cancelled concurrently
                }

                if (booking.expiresAt && new Date(booking.expiresAt).getTime() > Date.now()) {
                    return; // Not yet expired
                }

                // Lock flight row and restore inventory
                const flight = await Flight.findByPk(booking.flightId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (flight) {
                    await flight.increment('totalSeats', {
                        by: booking.noOfSeats,
                        transaction
                    });
                }

                booking.status = Enums.BOOKING_STATUS.EXPIRED;
                await booking.save({ transaction });
                expiredCount++;
            });
        } catch (err) {
            console.error(`Failed to expire booking ${b.id}:`, err.message);
        }
    }

    return { expiredCount, scanned: expiredBookings.length };
}

async function getBooking(bookingId, userId, role) {
    const id = Number(bookingId);
    if (!id || isNaN(id)) {
        throw new AppError('Invalid booking ID provided', StatusCodes.BAD_REQUEST);
    }

    const booking = await bookingRepository.get(id);

    // Authorization check
    if (role !== Enums.USER_ROLES.ADMIN && booking.userId !== userId) {
        throw new AppError('You are not authorized to view this booking', StatusCodes.FORBIDDEN);
    }

    return booking;
}

async function getAllBookings(userId, role, query = {}) {
    const filter = {};
    if (role !== Enums.USER_ROLES.ADMIN) {
        filter.userId = userId;
    } else if (query.userId) {
        filter.userId = Number(query.userId);
    }

    if (query.status && Object.values(Enums.BOOKING_STATUS).includes(query.status)) {
        filter.status = query.status;
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const result = await bookingRepository.getAllBookings(filter, { offset, limit });

    return {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limit),
        currentPage: page,
        pageSize: limit,
        bookings: result.rows
    };
}

module.exports = {
    createBooking,
    confirmBooking,
    cancelBooking,
    expireStaleReservations,
    getBooking,
    getAllBookings
};
