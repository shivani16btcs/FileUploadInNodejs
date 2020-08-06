/**
 * libsvc module.
 */
module.exports = {
    'boot': require('./src/boot'),
    'Route': require('./src/Route'),
    'Startup': require('./src/Startup'),
    'Schedule': require('./src/Schedule'),
    'ApiError': require('./src/ApiError'),
    'Chain': require('./src/Chain'),
    'getConfig': require('./src/getConfig')
};