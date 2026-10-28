const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { ServerConfig } = require('../config');
const { UserRepository } = require('../repositories');
const AppError = require('../utils/errors/app-error');

const userRepository = new UserRepository();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        data: {},
        error: { explanation: ['Rate limit exceeded on authentication endpoint'] }
    }
});

function validateAuthRequest(req, res, next) {
    if (!req.body.email) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Email is required',
            data: {},
            error: { explanation: ['Email was not found in the request'] }
        });
    }
    if (!req.body.password) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Password is required',
            data: {},
            error: { explanation: ['Password was not found in the request'] }
        });
    }
    next();
}

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Authentication token missing or malformed',
                data: {},
                error: { explanation: ['Bearer token must be provided in Authorization header'] }
            });
        }

        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, ServerConfig.JWT_SECRET);
        } catch (jwtError) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid or expired token',
                data: {},
                error: { explanation: [jwtError.message] }
            });
        }

        const user = await userRepository.get(decoded.id);
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User belonging to this token no longer exists',
                data: {},
                error: { explanation: ['User not found'] }
            });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal authentication error',
            data: {},
            error: { explanation: [error.message] }
        });
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                success: false,
                message: 'You do not have permission to perform this action',
                data: {},
                error: { explanation: ['Access denied: insufficient privileges'] }
            });
        }
        next();
    };
}

module.exports = {
    authLimiter,
    validateAuthRequest,
    authenticate,
    authorize
};
