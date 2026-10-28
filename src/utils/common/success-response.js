function formatSuccess(data = {}, message = 'Successfully completed the request') {
    return {
        success: true,
        message,
        data,
        error: {}
    };
}

const success = {
    success: true,
    message: 'Successfully completed the request',
    data: {},
    error: {},
    format: formatSuccess
};

module.exports = success;
