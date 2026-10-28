const express = require('express');
const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');

const { ServerConfig, Logger } = require('./config');
const apiRoutes = require('./routes');
const db = require('./models');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Correlation ID Middleware
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
});

// Request Logger Middleware
app.use((req, res, next) => {
    if (Logger && Logger.info && req.originalUrl !== '/health/live') {
        Logger.info(`${req.method} ${req.originalUrl}`, {
            requestId: req.requestId,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    }
    next();
});

// Liveness Probe (process is running)
app.get('/health/live', (req, res) => {
    return res.status(StatusCodes.OK).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Readiness Probe (verifies database connectivity and pool health)
app.get('/health/ready', async (req, res) => {
    try {
        await db.sequelize.authenticate();
        const pool = db.sequelize.connectionManager.pool;
        return res.status(StatusCodes.OK).json({
            status: 'READY',
            database: 'CONNECTED',
            pool: pool ? {
                size: pool.size,
                available: pool.available,
                using: pool.using,
                waiting: pool.waiting
            } : 'N/A',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (Logger && Logger.error) {
            Logger.error('Readiness probe failed', { error: error.message });
        }
        return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
            status: 'NOT_READY',
            database: 'DISCONNECTED',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Backward-compatible Health Check
app.get('/health', async (req, res) => {
    try {
        await db.sequelize.authenticate();
        return res.status(StatusCodes.OK).json({
            status: 'UP',
            database: 'HEALTHY',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
            status: 'DEGRADED',
            database: 'UNHEALTHY',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API Routes
app.use('/api', apiRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
    return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        data: {},
        error: { explanation: ['Resource not found'] }
    });
});

// Centralized Global Error Handler
app.use((err, req, res, next) => {
    if (Logger && Logger.error) {
        Logger.error(err.message, {
            requestId: req.requestId,
            stack: err.stack,
            method: req.method,
            path: req.originalUrl
        });
    }

    const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const isProduction = ServerConfig.NODE_ENV === 'production';

    const response = {
        success: false,
        message: err.message || 'Internal server error',
        data: {},
        error: {
            explanation: err.explanation || [isProduction ? 'An unexpected error occurred' : err.message]
        }
    };

    if (!isProduction && err.stack) {
        response.error.stack = err.stack;
    }

    return res.status(statusCode).json(response);
});

module.exports = app;
