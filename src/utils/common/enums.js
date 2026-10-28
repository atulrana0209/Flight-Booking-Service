const SEAT_TYPE = {
    BUSINESS: 'business',
    ECONOMY: 'economy',
    PREMIUM_ECONOMY: 'premium-economy',
    FIRST_CLASS: 'first-class'
};

const BOOKING_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED'
};

const USER_ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer'
};

const IDEMPOTENCY_STATUS = {
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    FAILED: 'FAILED'
};

module.exports = {
    SEAT_TYPE,
    BOOKING_STATUS,
    USER_ROLES,
    IDEMPOTENCY_STATUS
};
