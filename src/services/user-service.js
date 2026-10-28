const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');

const { UserRepository } = require('../repositories');
const AppError = require('../utils/errors/app-error');
const { ServerConfig } = require('../config');
const { Enums } = require('../utils/common');

const userRepository = new UserRepository();

function generateJWT(payload) {
    return jwt.sign(payload, ServerConfig.JWT_SECRET, {
        expiresIn: ServerConfig.JWT_EXPIRY
    });
}

async function signup(data) {
    try {
        const existingUser = await userRepository.getUserByEmail(data.email);
        if (existingUser) {
            throw new AppError('User with this email already exists', StatusCodes.BAD_REQUEST);
        }

        const role = data.role && Object.values(Enums.USER_ROLES).includes(data.role)
            ? data.role
            : Enums.USER_ROLES.CUSTOMER;

        const user = await userRepository.create({
            name: data.name,
            email: data.email,
            password: data.password,
            role
        });

        const token = generateJWT({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        if (error.name === 'SequelizeValidationError') {
            const explanation = error.errors.map(err => err.message);
            throw new AppError(explanation, StatusCodes.BAD_REQUEST);
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new AppError('User with this email already exists', StatusCodes.BAD_REQUEST);
        }
        throw new AppError('Cannot create a new User', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function signin(data) {
    try {
        const user = await userRepository.getUserByEmail(data.email);
        if (!user) {
            throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        const isPasswordMatch = await user.validatePassword(data.password);
        if (!isPasswordMatch) {
            throw new AppError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        const token = generateJWT({
            id: user.id,
            email: user.email,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot authenticate user', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function getUserById(id) {
    try {
        const user = await userRepository.get(id);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot fetch user', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

module.exports = {
    signup,
    signin,
    getUserById,
    generateJWT
};
