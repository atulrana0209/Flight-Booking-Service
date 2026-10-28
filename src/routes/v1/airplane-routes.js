const express = require('express');

const { AirplaneController } = require('../../controllers');
const { AirplaneMiddlewares, AuthMiddlewares } = require('../../middlewares');
const { Enums } = require('../../utils/common');

const router = express.Router();

// /api/v1/airplanes POST (Admin only)
router.post('/', 
        AuthMiddlewares.authenticate,
        AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
        AirplaneMiddlewares.validateCreateRequest,
        AirplaneController.createAirplane);

// /api/v1/airplanes GET
router.get('/', 
        AirplaneController.getAirplanes);

// /api/v1/airplanes/:id GET
router.get('/:id', 
        AirplaneController.getAirplane);

// /api/v1/airplanes/:id DELETE (Admin only)
router.delete('/:id', 
        AuthMiddlewares.authenticate,
        AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
        AirplaneController.destroyAirplane);

module.exports = router;
