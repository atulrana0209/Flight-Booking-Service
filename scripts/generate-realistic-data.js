const bcrypt = require('bcrypt');
const db = require('../src/models');
const { Enums } = require('../src/utils/common');

async function generateRealisticData() {
    console.log('Generating realistic dataset (1000+ flights, 25 airports, 20 cities, users)...');

    const airplanesData = [
        { modelNumber: 'A320neo', capacity: 180 },
        { modelNumber: 'A321neo', capacity: 220 },
        { modelNumber: 'B737-800', capacity: 189 },
        { modelNumber: 'B737-MAX8', capacity: 178 },
        { modelNumber: 'B787-9', capacity: 296 },
        { modelNumber: 'A350-900', capacity: 315 },
        { modelNumber: 'B777-300ER', capacity: 368 },
        { modelNumber: 'A380-800', capacity: 516 },
        { modelNumber: 'ATR-72', capacity: 72 },
        { modelNumber: 'Q400', capacity: 78 }
    ];

    const airplanes = await db.Airplane.bulkCreate(airplanesData, { ignoreDuplicates: true });
    console.log(`Created ${airplanes.length} airplanes.`);

    const citiesData = [
        { id: 201, name: 'New Delhi' },
        { id: 202, name: 'Mumbai' },
        { id: 203, name: 'Bengaluru' },
        { id: 204, name: 'Hyderabad' },
        { id: 205, name: 'Chennai' },
        { id: 206, name: 'Kolkata' },
        { id: 207, name: 'Ahmedabad' },
        { id: 208, name: 'Goa' },
        { id: 209, name: 'Kochi' },
        { id: 210, name: 'Pune' },
        { id: 211, name: 'Jaipur' },
        { id: 212, name: 'Lucknow' },
        { id: 213, name: 'Guwahati' },
        { id: 214, name: 'Chandigarh' },
        { id: 215, name: 'Dubai' },
        { id: 216, name: 'Singapore' },
        { id: 217, name: 'London' },
        { id: 218, name: 'Bangkok' },
        { id: 219, name: 'Doha' },
        { id: 220, name: 'Frankfurt' }
    ];

    await db.City.bulkCreate(citiesData, { ignoreDuplicates: true });
    console.log(`Created ${citiesData.length} cities.`);

    const airportsData = [
        { name: 'Indira Gandhi International Airport', code: 'DEL', cityId: 201, address: 'Palam, New Delhi' },
        { name: 'Chhatrapati Shivaji Maharaj Airport', code: 'BOM', cityId: 202, address: 'Sahar, Mumbai' },
        { name: 'Kempegowda International Airport', code: 'BLR', cityId: 203, address: 'Devanahalli, Bengaluru' },
        { name: 'Rajiv Gandhi International Airport', code: 'HYD', cityId: 204, address: 'Shamshabad, Hyderabad' },
        { name: 'Chennai International Airport', code: 'MAA', cityId: 205, address: 'Meenambakkam, Chennai' },
        { name: 'Netaji Subhash Chandra Bose Airport', code: 'CCU', cityId: 206, address: 'Dum Dum, Kolkata' },
        { name: 'Sardar Vallabhbhai Patel Airport', code: 'AMD', cityId: 207, address: 'Hansol, Ahmedabad' },
        { name: 'Dabolim Airport', code: 'GOI', cityId: 208, address: 'Dabolim, Goa' },
        { name: 'Cochin International Airport', code: 'COK', cityId: 209, address: 'Nedumbassery, Kochi' },
        { name: 'Pune Airport', code: 'PNQ', cityId: 210, address: 'Lohegaon, Pune' },
        { name: 'Jaipur International Airport', code: 'JAI', cityId: 211, address: 'Sanganer, Jaipur' },
        { name: 'Chaudhary Charan Singh Airport', code: 'LKO', cityId: 212, address: 'Amausi, Lucknow' },
        { name: 'Lokpriya Gopinath Bordoloi Airport', code: 'GAU', cityId: 213, address: 'Borjhar, Guwahati' },
        { name: 'Shaheed Bhagat Singh Airport', code: 'IXC', cityId: 214, address: 'Chandigarh' },
        { name: 'Dubai International Airport', code: 'DXB', cityId: 215, address: 'Garhoud, Dubai' },
        { name: 'Singapore Changi Airport', code: 'SIN', cityId: 216, address: 'Changi, Singapore' },
        { name: 'London Heathrow Airport', code: 'LHR', cityId: 217, address: 'Hounslow, London' },
        { name: 'Suvarnabhumi Airport', code: 'BKK', cityId: 218, address: 'Bang Phli, Bangkok' },
        { name: 'Hamad International Airport', code: 'DOH', cityId: 219, address: 'Doha, Qatar' },
        { name: 'Frankfurt Airport', code: 'FRA', cityId: 220, address: 'Frankfurt am Main' }
    ];

    await db.Airport.bulkCreate(airportsData, { ignoreDuplicates: true });
    console.log(`Created ${airportsData.length} airports.`);

    // Generate 1,000 realistic scheduled flights
    const airlines = ['AI', '6E', 'UK', 'SG', 'QP', 'EK', 'SQ', 'BA', 'QR', 'LH'];
    const airportCodes = airportsData.map(a => a.code);
    const flightsData = [];
    const baseTimestamp = Date.now();

    for (let i = 1; i <= 1000; i++) {
        const airline = airlines[i % airlines.length];
        const flightNum = `${airline}-${100 + (i % 899)}`;
        const depIdx = i % airportCodes.length;
        let arrIdx = (i * 7) % airportCodes.length;
        if (arrIdx === depIdx) arrIdx = (arrIdx + 1) % airportCodes.length;

        const depAirport = airportCodes[depIdx];
        const arrAirport = airportCodes[arrIdx];
        const dayOffset = (i % 30) * 86400000;
        const hourOffset = (i % 24) * 3600000;
        const departureTime = new Date(baseTimestamp + dayOffset + hourOffset);
        const flightDuration = (2 + (i % 8)) * 3600000;
        const arrivalTime = new Date(departureTime.getTime() + flightDuration);
        const airplane = airplanes[i % airplanes.length];
        const totalSeats = Math.floor(airplane.capacity * 0.9);
        const price = 2500 + (i % 40) * 350;

        flightsData.push({
            flightNumber: flightNum,
            airplaneId: airplane.id,
            departureAirportId: depAirport,
            arrivalAirportId: arrAirport,
            departureTime,
            arrivalTime,
            price,
            boardingGate: `${String.fromCharCode(65 + (i % 6))}${1 + (i % 20)}`,
            totalSeats
        });
    }

    await db.Flight.bulkCreate(flightsData, { ignoreDuplicates: true });
    console.log(`Created ${flightsData.length} scheduled flights.`);

    // Create 50 benchmark load users
    const defaultPassword = await bcrypt.hash('LoadUser@123', 10);
    const usersData = [];
    for (let u = 1; u <= 50; u++) {
        usersData.push({
            name: `Load Test User ${u}`,
            email: `loaduser_${u}@benchmark.com`,
            password: defaultPassword,
            role: Enums.USER_ROLES.CUSTOMER
        });
    }

    await db.User.bulkCreate(usersData, { ignoreDuplicates: true });
    console.log(`Created ${usersData.length} benchmark test users.`);

    console.log('Deterministic large dataset successfully seeded!');
    process.exit(0);
}

generateRealisticData().catch(err => {
    console.error('Failed to generate realistic data:', err);
    process.exit(1);
});
