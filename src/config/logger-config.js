const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, json } = format;

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret', 'creditcard'];

function redactSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(redactSensitiveData);

    const copy = { ...obj };
    for (const key of Object.keys(copy)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            copy[key] = '[REDACTED]';
        } else if (typeof copy[key] === 'object' && copy[key] !== null) {
            copy[key] = redactSensitiveData(copy[key]);
        }
    }
    return copy;
}

const redactFormat = format((info) => {
    return redactSensitiveData(info);
});

const customFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
    const reqStr = requestId ? `[${requestId}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${reqStr}${message}${metaStr}`;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        redactFormat(),
        process.env.NODE_ENV === 'production' ? json() : customFormat
    ),
    transports: [
        new transports.Console({
            silent: process.env.NODE_ENV === 'test'
        }),
        new transports.File({ filename: 'combined.log', silent: process.env.NODE_ENV === 'test' })
    ],
});

module.exports = logger;
