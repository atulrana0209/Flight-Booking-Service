const { StatusCodes } = require('http-status-codes');
const { BookingService } = require('../services');

async function createBooking(req, res) {
    try {
        const booking = await BookingService.createBooking({
            flightId: req.body.flightId,
            userId: req.user.id,
            noOfSeats: req.body.noOfSeats,
            idempotencyKey: req.headers['idempotency-key'] || null,
            status: req.body.status,
            holdDurationMinutes: req.body.holdDurationMinutes
        });

        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Successfully booked the flight',
            data: booking,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while booking',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function confirmBooking(req, res) {
    try {
        const booking = await BookingService.confirmBooking({
            bookingId: req.params.id,
            userId: req.user.id,
            role: req.user.role
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully confirmed the booking reservation',
            data: booking,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while confirming the booking',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function cancelBooking(req, res) {
    try {
        const booking = await BookingService.cancelBooking({
            bookingId: req.params.id,
            userId: req.user.id,
            role: req.user.role
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully cancelled the booking and restored seat inventory',
            data: booking,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while cancelling the booking',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function expireStaleReservations(req, res) {
    try {
        const result = await BookingService.expireStaleReservations();
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully swept and expired stale reservations',
            data: result,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while expiring reservations',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function getBooking(req, res) {
    try {
        const booking = await BookingService.getBooking(req.params.id, req.user.id, req.user.role);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully fetched booking details',
            data: booking,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while fetching the booking',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function getAllBookings(req, res) {
    try {
        const bookings = await BookingService.getAllBookings(req.user.id, req.user.role, req.query);

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully fetched bookings list',
            data: bookings,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while fetching bookings',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

module.exports = {
    createBooking,
    confirmBooking,
    cancelBooking,
    expireStaleReservations,
    getBooking,
    getAllBookings
};
