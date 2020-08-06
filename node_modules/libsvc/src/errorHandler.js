const _ = require('lodash');
const winston = require('winston');
const ApiError = require('./ApiError');

/**
 * Error handling middleware that responds with formatted error JSON. 
 * Some Mongoose ODM errors are also recognised to help with development.
 * 
 * @param {*} err - error forwarded from middleware chain.
 * @param {Request} req - express request.
 * @param {Response} res - express response.
 * @param {function(err)} next - express next.
 */
function errorHandler(err, req, res, next) {

    // trace request
    winston.log('info', `\nREQUEST HAS ERROR:${req.method}: ${req.url} \n`);

    // log all errors
    if (err instanceof ApiError) {
        winston.log('warn', `API ERROR: ${err.message}\n`, _.map(err.stackFrames, _.property('source')).join('\n'));
    } else if (err instanceof Error) {
        winston.log('error', `SERVER ERROR: ${err.message}\n`, err);
    } else {
        winston.log('error', `UNKNOWN ERROR: ${err.toString()}\n`);
    }


    if (res.headersSent) {
        // response sending has already started
        res.end();
        winston.log('warn', 'errorHandler: Request headers already sent. Cannot respond with error.');
    } else if (err instanceof ApiError) {
        // Api error, just send details
        sendErrorResponse(err, res);
    } else {
        // some other error, send 500 with some salvaged details  
        sendErrorResponse(new ApiError('Internal Server Error.').withStatus(500).withDetail(inspectDetail(err)), res);
    }

    // proceed
    next();
}

/**
 * @type {errorHandler}
 */
module.exports = errorHandler;

/**
 * Send error response with data from ApiError instance.
 * @param {ApiError} apiError - api error instance.
 * @param {Response} res - express response.
 */
function sendErrorResponse(apiError, res) {
    res.status(apiError.status).json({
        isError: true,
        code: apiError.code,
        detail: apiError.detail
    });
}

/**
 * Inspect err object and return related error detail if any.
 * 
 * @param {*} err - error to inspect.
 * @return {Object} error details, or undefined.
 */
function inspectDetail(err) {

    // native mongo driver errors, forwarded by mongoose
    if (err instanceof Error && err.name === "MongoError" && err.driver) {
        switch (err.code) {
            case 11000: // unique index conflict
                return ['Document already exists.'];
        }
    }

    // mongoose errors
    if ("MongooseError" === _.get(err, 'constructor.name')) {
        const details = [];
        switch (err.name) {
            case "ValidationError": // schema validation failed
                extractMongooseValidationDetails(details, err.errors);
                return details;
        }
    }

    // generic errors
    if (err instanceof Error && _.has(err, 'message')) {
        return err.message;
    }


    // return default detail
    return 'Unknown Error';
}

/**
 * Extract mongoose validation error tree to flat array.
 * 
 * @param {Array} details - array to populate. Empty array for start.
 * @param {Object} errors - mongoose errors object.
 */
function extractMongooseValidationDetails(details, errors) {

    // log path and message if exist
    if (_.isString(errors.path) && _.isString(errors.message)) {
        details.push({ path: errors.path, message: errors.message });
    }

    // recurse
    _.forOwn(errors, (e) => {
        if ("MongooseError" === _.get(e, 'constructor.name')) {
            extractMongooseValidationDetails(details, e);
        }
    });
}