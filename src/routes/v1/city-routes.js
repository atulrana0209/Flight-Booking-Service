const express = require('express');

const { CityController } = require('../../controllers');
const { CityMiddlewares, AuthMiddlewares } = require('../../middlewares');
const { Enums } = require('../../utils/common');

const router = express.Router();

// /api/v1/cities POST (Admin only)
router.post('/', 
        AuthMiddlewares.authenticate,
        AuthMiddlewares.authorize(Enums.USER_ROLES.ADMIN),
        CityMiddlewares.validateCreateRequest,
        CityController.createCity);

module.exports = router;
