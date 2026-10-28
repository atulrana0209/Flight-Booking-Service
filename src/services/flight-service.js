const { StatusCodes } = require('http-status-codes');
const { Op } = require('sequelize');
const { FlightRepository } = require('../repositories');
const AppError = require('../utils/errors/app-error');

const flightRepository = new FlightRepository();

async function createFlight(data) {
    try {
        if (data.departureAirportId === data.arrivalAirportId) {
            throw new AppError('Departure and arrival airports cannot be the same', StatusCodes.BAD_REQUEST);
        }
        const flight = await flightRepository.create(data);
        return flight;
    } catch(error) {
        if(error instanceof AppError) throw error;
        if(error.name == 'SequelizeValidationError') {
            let explanation = [];
            error.errors.forEach((err) => {
                explanation.push(err.message);
            });
            throw new AppError(explanation, StatusCodes.BAD_REQUEST);
        }
        throw new AppError('Cannot create a new Flight object', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function getAllFlights(query) {
    let customFilter = {};
    let sortFilter = [];
    const endingTripTime = " 23:59:59";

    // trips=MUM-DEL
    if(query.trips) {
        const parts = query.trips.split("-");
        if (parts.length === 2) {
            const [departureAirportId, arrivalAirportId] = parts;
            if (departureAirportId === arrivalAirportId) {
                throw new AppError('Departure and arrival airports cannot be the same', StatusCodes.BAD_REQUEST);
            }
            customFilter.departureAirportId = departureAirportId;
            customFilter.arrivalAirportId = arrivalAirportId;
        }
    }
    if(query.price) {
        const [minPrice, maxPrice] = query.price.split("-");
        customFilter.price = {
            [Op.between]: [Number(minPrice) || 0, ((maxPrice == undefined) ? 20000 : Number(maxPrice))]
        };
    }
    if(query.travellers) {
        customFilter.totalSeats = {
            [Op.gte]: Number(query.travellers)
        };
    }
    if(query.tripDate) {
        customFilter.departureTime = {
            [Op.between]: [query.tripDate, query.tripDate + endingTripTime]
        };
    }
    if(query.sort) {
        const params = query.sort.split(',');
        const sortFilters = params.map((param) => param.split('_'));
        sortFilter = sortFilters;
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    try {
        const flights = await flightRepository.getAllFlights(customFilter, sortFilter, { offset, limit });
        return {
            totalItems: flights.count,
            totalPages: Math.ceil(flights.count / limit),
            currentPage: page,
            pageSize: limit,
            flights: flights.rows
        };
    } catch(error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot fetch data of all the flights', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function getFlight(id) {
    try {
        const flight = await flightRepository.get(id);
        return flight;
    } catch(error) {
        if(error.statusCode == StatusCodes.NOT_FOUND) {
            throw new AppError('The flight you requested is not present', error.statusCode);
        }
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot fetch data of the flight', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}

async function updateSeats(data) {
    try {
        const response = await flightRepository.updateRemainingSeats(data.flightId, data.seats, data.dec);
        return response;
    } catch(error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Cannot update data of the flight', StatusCodes.INTERNAL_SERVER_ERROR);
    }
}
 
module.exports = {
    createFlight,
    getAllFlights,
    getFlight,
    updateSeats
};
