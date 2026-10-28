const express = require('express');

const { AuthController } = require('../../controllers');
const { AuthMiddlewares } = require('../../middlewares');

const router = express.Router();

// /api/v1/auth/signup POST
router.post(
    '/signup',
    AuthMiddlewares.authLimiter,
    AuthMiddlewares.validateAuthRequest,
    AuthController.signup
);

// /api/v1/auth/signin POST
router.post(
    '/signin',
    AuthMiddlewares.authLimiter,
    AuthMiddlewares.validateAuthRequest,
    AuthController.signin
);

// /api/v1/auth/me GET
router.get(
    '/me',
    AuthMiddlewares.authenticate,
    AuthController.me
);

module.exports = router;
