const db = require('../../models');

async function executeWithRetry(operation, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt++;
        try {
            return await db.sequelize.transaction(async (transaction) => {
                return await operation(transaction);
            });
        } catch (error) {
            const isDeadlock = 
                error.name === 'SequelizeDeadlockError' ||
                (error.parent && error.parent.code === 'ER_LOCK_DEADLOCK') ||
                (error.original && error.original.code === 'ER_LOCK_DEADLOCK') ||
                (error.message && error.message.includes('Deadlock found'));

            const isLockTimeout =
                error.name === 'SequelizeTimeoutError' ||
                (error.parent && error.parent.code === 'ER_LOCK_WAIT_TIMEOUT') ||
                (error.original && error.original.code === 'ER_LOCK_WAIT_TIMEOUT') ||
                (error.message && error.message.includes('Lock wait timeout'));

            if ((isDeadlock || isLockTimeout) && attempt < maxRetries) {
                // Exponential backoff with random jitter: 20ms - 80ms
                const backoff = Math.floor(Math.random() * 40) + (attempt * 20);
                await new Promise(resolve => setTimeout(resolve, backoff));
                continue;
            }
            throw error;
        }
    }
}

module.exports = {
    executeWithRetry
};
