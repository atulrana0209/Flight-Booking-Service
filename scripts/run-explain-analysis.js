const db = require('../src/models');

async function runExplainAnalysis() {
    console.log('=== MySQL Query Execution Plan (EXPLAIN) Analysis ===\n');

    // 1. Flight Search by Route and Price
    console.log('1. Query Plan: Route Filter (DEL -> BOM) with Price Range:');
    const [routeExplain] = await db.sequelize.query(`
        EXPLAIN SELECT f.*, a.name AS depAirportName, b.name AS arrAirportName 
        FROM Flights f
        JOIN Airports a ON f.departureAirportId = a.code
        JOIN Airports b ON f.arrivalAirportId = b.code
        WHERE f.departureAirportId = 'DEL' 
          AND f.arrivalAirportId = 'BOM' 
          AND f.price BETWEEN 2000 AND 10000;
    `);
    console.table(routeExplain.map(r => ({
        table: r.table,
        type: r.type,
        possible_keys: r.possible_keys,
        key: r.key,
        rows: r.rows,
        Extra: r.Extra
    })));

    // 2. Flight Search by Date Range
    console.log('\n2. Query Plan: Departure Date Range Filter:');
    const [dateExplain] = await db.sequelize.query(`
        EXPLAIN SELECT * FROM Flights 
        WHERE departureTime BETWEEN '2026-10-28 00:00:00' AND '2026-11-05 23:59:59';
    `);
    console.table(dateExplain.map(r => ({
        table: r.table,
        type: r.type,
        possible_keys: r.possible_keys,
        key: r.key,
        rows: r.rows,
        Extra: r.Extra
    })));

    // 3. Booking Lookup by User ID and Status
    console.log('\n3. Query Plan: Booking Lookup by User ID and Status:');
    const [bookingExplain] = await db.sequelize.query(`
        EXPLAIN SELECT * FROM Bookings 
        WHERE userId = 2 AND status = 'CONFIRMED' 
        ORDER BY createdAt DESC;
    `);
    console.table(bookingExplain.map(r => ({
        table: r.table,
        type: r.type,
        possible_keys: r.possible_keys,
        key: r.key,
        rows: r.rows,
        Extra: r.Extra
    })));

    // 4. Idempotency Key Lookup
    console.log('\n4. Query Plan: Idempotency Key Lookup by Key:');
    const [idempExplain] = await db.sequelize.query(`
        EXPLAIN SELECT * FROM IdempotencyKeys 
        WHERE \`key\` = 'test-idempotency-key-sample';
    `);
    console.table(idempExplain.map(r => ({
        table: r.table,
        type: r.type,
        possible_keys: r.possible_keys,
        key: r.key,
        rows: r.rows,
        Extra: r.Extra
    })));

    console.log('Query execution plan analysis complete.');
    process.exit(0);
}

runExplainAnalysis().catch(err => {
    console.error(err);
    process.exit(1);
});
