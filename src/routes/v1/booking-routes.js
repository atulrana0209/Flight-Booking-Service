const express = require('express');

const { BookingController } = require('../../controllers');
const { AuthMiddlewares, BookingMiddlewares, IdempotencyMiddlewares } = require('../../middlewares');
const { Enums } = require('../../utils/common');

const router = express.Router();

// /api/v1/bookings POST (Create booking with Auth and Idempotency)
router.post(
    '/',
    AuthMiddlewares.authenticate,
    IdempotencyMiddlewares.handleIdempotency,
    BookingMiddlewares.validateCreateBookingRequest,
    BookingController.createBooking
);

// /api/v1/bookings GET (Get user bookings or all bookings for admin)
router.get(
    '/',
    AuthMiddlewares.authenticate,
    BookingController.getAllBookings
);

// /api/v1/bookings/sweep-expired POST (Sweeper endpoint to expire stale reservations)
router.post(
    '/sweep-expired',
    AuthMiddlewares.authenticate,
    AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
    BookingController.expireStaleReservations
);

// /api/v1/bookings/:id GET (Get single booking details)
router.get(
    '/:id',
    AuthMiddlewares.authenticate,
    BookingController.getBooking
);

// /api/v1/bookings/:id/confirm POST (Confirm a PENDING reservation before expiry)
router.post(
    '/:id/confirm',
    AuthMiddlewares.authenticate,
    BookingController.confirmBooking
);

// /api/v1/bookings/:id/cancel POST (Cancel booking and restore inventory)
router.post(
    '/:id/cancel',
    AuthMiddlewares.authenticate,
    BookingController.cancelBooking
);

module.exports = router;
