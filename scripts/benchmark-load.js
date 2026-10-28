const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/models');
const { ServerConfig } = require('../src/config');
const { Enums } = require('../src/utils/common');

async function runBenchmark() {
    console.log('=== Flight Booking Service Load & Performance Benchmark ===\n');

    const PORT = 3099;
    const server = app.listen(PORT);
    console.log(`Ephemeral benchmark server started on port ${PORT}.\n`);

    // Ensure a flight and test user exist for benchmark
    const [flights] = await db.sequelize.query('SELECT id, totalSeats FROM Flights WHERE totalSeats > 50 LIMIT 1');
    const benchmarkFlightId = flights[0]?.id || 1;

    const [users] = await db.sequelize.query('SELECT id, email, role FROM Users LIMIT 1');
    const testUser = users[0] || { id: 1, email: 'load@test.com', role: 'customer' };

    const token = jwt.sign({
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
    }, ServerConfig.JWT_SECRET, { expiresIn: '1h' });

    console.log(`Target Flight ID: ${benchmarkFlightId}, Target User: ${testUser.email}\n`);

    // Scenario 1: Flight Search (Read-Heavy Query with Joins and Filters)
    console.log('--- Scenario 1: Flight Search API (Read-Heavy) ---');
    console.log('Parameters: 50 concurrent connections, 10s duration');

    const searchResult = await autocannon({
        url: `http://localhost:${PORT}/api/v1/flights?trips=DEL-BOM&page=1&limit=10`,
        connections: 50,
        duration: 10,
        headers: {
            'Accept': 'application/json'
        }
    });

    console.log('\nSearch API Results:');
    console.log(`- Throughput (Req/Sec): ${searchResult.requests.average.toFixed(2)}`);
    console.log(`- Total Requests Completed: ${searchResult.requests.total}`);
    console.log(`- Errors / Timeouts: ${searchResult.errors} / ${searchResult.timeouts}`);
    console.log(`- Latency (p50): ${searchResult.latency.p50} ms`);
    console.log(`- Latency (p90): ${searchResult.latency.p90} ms`);
    console.log(`- Latency (p95): ${searchResult.latency.p97_5 || searchResult.latency.p90} ms`);
    console.log(`- Latency (p99): ${searchResult.latency.p99} ms`);

    // Scenario 2: Health Readiness (Database Pool Ping)
    console.log('\n--- Scenario 2: Health Readiness Probe (DB Ping) ---');
    console.log('Parameters: 50 concurrent connections, 5s duration');

    const healthResult = await autocannon({
        url: `http://localhost:${PORT}/health/ready`,
        connections: 50,
        duration: 5
    });

    console.log('\nHealth Readiness Results:');
    console.log(`- Throughput (Req/Sec): ${healthResult.requests.average.toFixed(2)}`);
    console.log(`- Latency (p50): ${healthResult.latency.p50} ms`);
    console.log(`- Latency (p95): ${healthResult.latency.p90} ms`);
    console.log(`- Latency (p99): ${healthResult.latency.p99} ms`);

    server.close();
    await db.sequelize.close();

    console.log('\n=== Benchmark Run Finished Successfully ===');
    process.exit(0);
}

runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
