const app = require('./app');
const { ServerConfig, Logger } = require('./config');
const db = require('./models');

const server = app.listen(ServerConfig.PORT, () => {
    const startMsg = `Successfully started the server on PORT : ${ServerConfig.PORT}`;
    console.log(startMsg);
    if (Logger && Logger.info) {
        Logger.info(startMsg);
    }
});

let isShuttingDown = false;

// Graceful application shutdown
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (Logger && Logger.info) {
        Logger.info(`Received ${signal}. Draining in-flight requests...`);
    }

    server.close(async () => {
        console.log('HTTP server closed. In-flight requests drained.');
        try {
            await db.sequelize.close();
            console.log('Database connections closed cleanly.');
            process.exit(0);
        } catch (dbErr) {
            console.error('Error closing database connections:', dbErr);
            process.exit(1);
        }
    });

    // Force shutdown after timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
