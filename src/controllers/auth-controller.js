const { StatusCodes } = require('http-status-codes');
const { UserService } = require('../services');

async function signup(req, res) {
    try {
        const response = await UserService.signup({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role
        });

        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Successfully registered user',
            data: response,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while signing up',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function signin(req, res) {
    try {
        const response = await UserService.signin({
            email: req.body.email,
            password: req.body.password
        });

        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Successfully authenticated user',
            data: response,
            error: {}
        });
    } catch (error) {
        return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Something went wrong while authenticating',
            data: {},
            error: { explanation: error.explanation || [error.message] }
        });
    }
}

async function me(req, res) {
    return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Successfully fetched current user',
        data: req.user,
        error: {}
    });
}

module.exports = {
    signup,
    signin,
    me
};
