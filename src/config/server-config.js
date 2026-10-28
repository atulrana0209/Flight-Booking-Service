const dotenv = require('dotenv');

dotenv.config();

const requiredEnvVars = ['PORT'];
if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET');
}

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] && process.env.NODE_ENV === 'production') {
        throw new Error(`CRITICAL: Required environment variable ${envVar} is missing!`);
    }
}

module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_for_flight_booking_service',
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1d'
};
