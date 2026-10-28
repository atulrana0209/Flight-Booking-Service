const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');
const { IdempotencyKey, Booking } = require('../models');
const AppError = require('../utils/errors/app-error');

const IN_PROGRESS_STALE_THRESHOLD_MS = 5000; // 5 seconds threshold for crash recovery

async function handleIdempotency(req, res, next) {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
        return next();
    }

    const payloadString = JSON.stringify(req.body || {});
    const userId = req.user ? req.user.id : null;
    const requestHash = crypto
        .createHash('sha256')
        .update(`${req.originalUrl}:${userId}:${payloadString}`)
        .digest('hex');

    try {
        let keyRecord;
        let isNewRecord = false;

        try {
            keyRecord = await IdempotencyKey.create({
                key: idempotencyKey,
                userId,
                endpoint: req.originalUrl,
                requestHash,
                status: 'IN_PROGRESS'
            });
            isNewRecord = true;
        } catch (dbError) {
            if (dbError.name === 'SequelizeUniqueConstraintError') {
                keyRecord = await IdempotencyKey.findOne({
                    where: { key: idempotencyKey }
                });
            } else {
                throw dbError;
            }
        }

        if (!keyRecord) {
            throw new AppError('Could not process idempotency key', StatusCodes.INTERNAL_SERVER_ERROR);
        }

        if (!isNewRecord) {
            // Payload mismatch detection
            if (keyRecord.requestHash !== requestHash) {
                return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
                    success: false,
                    message: 'Idempotency key was already used with a different request payload',
                    data: {},
                    error: {
                        explanation: ['Idempotency-Key mismatch: payload differs from original request']
                    }
                });
            }

            // Valid cached replay
            if (keyRecord.status === 'RESOLVED') {
                res.setHeader('X-Cache-Lookup', 'HIT');
                return res.status(keyRecord.responseStatusCode).json(keyRecord.responseBody);
            }

            // Handle recovery for orphaned IN_PROGRESS record (e.g. process crash or network loss)
            if (keyRecord.status === 'IN_PROGRESS') {
                const recordAgeMs = Date.now() - new Date(keyRecord.updatedAt || keyRecord.createdAt).getTime();

                // Check if a booking was committed to DB despite response loss / crash
                const committedBooking = await Booking.findOne({
                    where: { idempotencyKey: keyRecord.key }
                });

                if (committedBooking) {
                    // Recover from crash / lost response
                    const recoveredBody = {
                        success: true,
                        message: 'Successfully booked the flight',
                        data: committedBooking,
                        error: {}
                    };

                    await keyRecord.update({
                        status: 'RESOLVED',
                        responseStatusCode: StatusCodes.CREATED,
                        responseBody: recoveredBody,
                        bookingId: committedBooking.id
                    });

                    res.setHeader('X-Cache-Lookup', 'RECOVERED');
                    return res.status(StatusCodes.CREATED).json(recoveredBody);
                }

                // If no booking was committed and record is older than threshold, reset to allow retry
                if (recordAgeMs > IN_PROGRESS_STALE_THRESHOLD_MS) {
                    await keyRecord.update({
                        status: 'IN_PROGRESS',
                        updatedAt: new Date()
                    });
                    // Fall through to execute retry
                } else {
                    return res.status(StatusCodes.CONFLICT).json({
                        success: false,
                        message: 'A request with this Idempotency-Key is currently being processed',
                        data: {},
                        error: {
                            explanation: ['Concurrent request with the same Idempotency-Key is in progress']
                        }
                    });
                }
            }
        }

        // Intercept response to store result
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            const statusCode = res.statusCode;
            const bookingId = body?.data?.id || null;

            if (statusCode >= 200 && statusCode < 300) {
                IdempotencyKey.update({
                    status: 'RESOLVED',
                    responseStatusCode: statusCode,
                    responseBody: body,
                    bookingId
                }, {
                    where: { key: idempotencyKey }
                }).catch(err => console.error('Failed to update idempotency key:', err));
            } else {
                IdempotencyKey.update({
                    status: 'FAILED',
                    responseStatusCode: statusCode,
                    responseBody: body
                }, {
                    where: { key: idempotencyKey }
                }).catch(err => console.error('Failed to update idempotency key:', err));
            }
            return originalJson(body);
        };

        next();
    } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Idempotency verification failed',
            data: {},
            error: { explanation: [error.message] }
        });
    }
}

module.exports = {
    handleIdempotency
};
