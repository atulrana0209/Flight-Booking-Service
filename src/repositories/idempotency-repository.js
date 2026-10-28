const CrudRepository = require('./crud-repository');
const { IdempotencyKey } = require('../models');

class IdempotencyRepository extends CrudRepository {
    constructor() {
        super(IdempotencyKey);
    }

    async findByKey(key, transaction = null, lock = null) {
        const options = {
            where: { key }
        };
        if (transaction) {
            options.transaction = transaction;
        }
        if (lock) {
            options.lock = lock;
        }
        const record = await IdempotencyKey.findOne(options);
        return record;
    }

    async createKey(data, transaction = null) {
        const options = transaction ? { transaction } : {};
        const record = await IdempotencyKey.create(data, options);
        return record;
    }

    async updateKey(key, data, transaction = null) {
        const options = {
            where: { key }
        };
        if (transaction) {
            options.transaction = transaction;
        }
        const record = await IdempotencyKey.update(data, options);
        return record;
    }
}

module.exports = IdempotencyRepository;
