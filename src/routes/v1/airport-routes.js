const express = require('express');

const { AirportController } = require('../../controllers');
const { AirportMiddlewares, AuthMiddlewares } = require('../../middlewares');
const { Enums } = require('../../utils/common');

const router = express.Router();

// /api/v1/airports POST (Admin only)
router.post('/', 
        AuthMiddlewares.authenticate,
        AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
        AirportMiddlewares.validateCreateRequest,
        AirportController.createAirport);

// /api/v1/airports GET
router.get('/', 
    AirportController.getAirports);

// /api/v1/airports/:id GET
router.get('/:id', 
    AirportController.getAirport);

// /api/v1/airports/:id DELETE (Admin only)
router.delete('/:id', 
    AuthMiddlewares.authenticate,
    AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
    AirportController.destroyAirport);

module.exports = router;
