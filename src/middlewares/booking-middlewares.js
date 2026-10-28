const { StatusCodes } = require('http-status-codes');

function validateCreateBookingRequest(req, res, next) {
    if (!req.body.flightId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'flightId is required',
            data: {},
            error: { explanation: ['flightId not found in the incoming request'] }
        });
    }

    const flightId = Number(req.body.flightId);
    if (isNaN(flightId) || flightId <= 0 || !Number.isInteger(flightId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'flightId must be a positive integer',
            data: {},
            error: { explanation: ['Invalid flightId provided'] }
        });
    }

    if (req.body.noOfSeats !== undefined) {
        const seats = Number(req.body.noOfSeats);
        if (isNaN(seats) || seats <= 0 || !Number.isInteger(seats)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'noOfSeats must be a positive integer',
                data: {},
                error: { explanation: ['Invalid noOfSeats provided'] }
            });
        }
    }

    next();
}

module.exports = {
    validateCreateBookingRequest
};
