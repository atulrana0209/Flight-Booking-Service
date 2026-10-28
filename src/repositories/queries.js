function addRowLockOnFlights(flightId) {
    const id = Number(flightId);
    if (isNaN(id)) {
        throw new Error('Invalid flightId supplied for row lock');
    }
    return `SELECT * from Flights WHERE Flights.id = ${id} FOR UPDATE;`;
}

module.exports = {
    addRowLockOnFlights
};
