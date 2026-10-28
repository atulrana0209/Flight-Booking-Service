const express = require('express');

const { FlightController } = require('../../controllers');
const { FlightMiddlewares, AuthMiddlewares } = require('../../middlewares');
const { Enums } = require('../../utils/common');

const router = express.Router();

// /api/v1/flights POST (Admin only)
router.post(
    '/',
    AuthMiddlewares.authenticate,
    AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
    FlightMiddlewares.validateCreateRequest,
    FlightController.createFlight
);

// /api/v1/flights GET (Public - search flights)
router.get('/', FlightController.getAllFlights);

// /api/v1/flights/:id GET (Public - get single flight)
router.get('/:id', FlightController.getFlight);

// /api/v1/flights/:id/seats PATCH (Admin only)
router.patch(
    '/:id/seats',
    AuthMiddlewares.authenticate,
    AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
    FlightMiddlewares.validateUpdateSeatsRequest,
    FlightController.updateSeats
);

module.exports = router;
