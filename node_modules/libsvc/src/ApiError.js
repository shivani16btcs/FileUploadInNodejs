'use strict';

const _ = require('lodash');
const errStackParser = require('error-stack-parser');

/**
 * @class
 * @extends Error
 * 
 * Encapsulates an API level error. 
 * Holds response details for clients and stack frames for loggers.
 * 
 */
class ApiError extends Error {

    /**
     * @constructor
     * 
     * Creates a new instance.
     * 
     * @param {String} message - Error message.
     */
    constructor(message) {
        super(message);

        // default status is 500
        this._status = 500;

        // default code is INTERNAL ERROR
        this._code = ApiError.DEFAULT_CODE;

        // default detail is error message
        this._detail = message;

        // create error stack frames (drop the first 2 for this function call and Error constuctor call)
        this._stackFrames = _.drop(errStackParser.parse(this), 1);

        // filter out stack frames with node's internal links and node_modules links
        this._stackFrames = this.stackFrames.filter((sf) => {
            return _.startsWith(sf.fileName, '/') && !/.*node_modules.*/.test(sf.fileName);
        });
    }

    /**
     * Stack trace information for error.
     * @type {Array}
     */
    get stackFrames() {
        return this._stackFrames;
    }

    /**
     * Default error code.
     * @type {String}
     */
    static get DEFAULT_CODE() {
        return 'INTERNAL_ERROR';
    }

    /**
     * HTTP status code associated with API Error.
     * @type {Number}
     */
    get status() {
        return this._status;
    }

    /**
     * Set HTTP status code associated with API Error.
     * 
     * @param {Number} status - HTTP status code. Should be a number.
     * @returns {ApiError} - ApiError instance.
     */
    withStatus(status) {
        if (!_.isFinite(status)) {
            throw new Error('status should be a number.');
        }
        this._status = status;
        return this;
    }

    /**
     * API Error specific error-code.
     * @type {Number|String}
     */
    get code() {
        return this._code;
    }

    /**
    * Set API specific error-code.
    * 
    * @param {Number|String} code - API specific error-code.
    * @returns {ApiError} - ApiError instance.
    */
    withCode(code) {
        if (!(_.isFinite(code) || _.isString(code))) {
            throw new Error('status should be a number or a string.');
        }
        this._code = code;
        return this;
    }

    /**
     * Arbitrary detail data associated with ApiError.
     * @type {*}
     */
    get detail() {
        return this._detail;
    }

    /**
    * Set arbitrarty detail data.
    * 
    * @param {*} detail - Detail object.
    * @returns {ApiError} - ApiError instance.
    */
    withDetail(detail) {
        this._detail = detail;
        return this;
    }
}

/**
 * @type {ApiError}
 */
module.exports = ApiError;