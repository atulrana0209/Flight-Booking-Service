function formatError(error = {}, message = 'Something went wrong') {
    return {
        success: false,
        message,
        data: {},
        error
    };
}

const error = {
    success: false,
    message: 'Something went wrong',
    data: {},
    error: {},
    format: formatError
};

module.exports = error;
