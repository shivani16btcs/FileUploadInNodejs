'use strict';

const _ = require('lodash');
const ApiError = require('./ApiError');
const jsonParser = require('./jsonParser');
const Chain = require('./Chain');

// important: tv4 instance exclusive for Route implementation, so only this has extra formats
const tv4 = require('tv4').freshApi();

/**
 * @class
 * @extends Chain
 * 
 * Defines a web service route/endpoint i.e. the execution path of a single HTTP request. 
 * Support input validation (JSON schema) and arbitrary middleware chaining as processing steps.
 */
class Route extends Chain {

    /**
     * @constructor
     *
     * Creates a new instance for HTTP method, API path and options.
     *
     * Options parameter may contain:
     * 1. parseJson : enable auto parsing body of requests with json content type. Default is true.
     * 2. parseOptions : options specific to body-parser.json() module. Default is undefined.
     *
     * @param {String} method - HTTP method (in lower case). E.g. 'get'
     * @param {String} path - Route path. E.g. '/cars/:carId'
     * @param {Object} [options] - Route options.
     */
    constructor(method, path, options) {
        super();

        // method
        if (!_.isString(method)) {
            throw new Error('method must be a String');
        }
        this._method = method;

        // path
        if (!(_.isString(path) || _.isRegExp(path))) {
            throw new Error('path must be a String or RegExp');
        }
        this._path = path;

        // options
        this._options = _.defaults(options || {}, {
            parseJson: true,
            parseOptions: undefined
        });

        // no metadata by default
        this._meta = undefined;
    }

    /**
     * Define additional JSON schema formats. 
     * @see https://github.com/geraintluff/tv4#addformatformat-validationfunction
     * 
     * @type {Function}
     */
    static get addFormat() {
        return tv4.addFormat;
    }

    /**
     * Save any custom route specific metadata info.
     * This can be later used by any custom code to further customise the route instances.
     * 
     * @see Route.getMeta()
     * 
     * @param {*} data - custom metadata object.
     * @return {Route} - Route instance.
     */
    setMeta(data) {
        this._meta = data;
        return this;
    }

    /**
     * Route specific metadata.
     * 
     * @see Route.setMeta()
     * 
     * @type {*} 
     */
    get meta() {
        return this._meta;
    }

    /**
     * Add given middleware function to the route sequence.
     * 
     * @param {Function} fn - middleware function.
     * @return {Route} Route instance. 
     */
    use(fn) {
        this.append(fn);
        return this;
    }


    /**
     * Validate request path params i.e. 'req.params'.
     * 
     * @param {Object} schema - tv4 JSON schema.
     * @return {Route} Route instance.
     */
    validateParams(schema) {
        this.prepend((req, res, next) => {
            validateInput(req.params, schema, next);
        });
        return this;
    }

    /**
     * Validate request query i.e. 'req.query'.
     * 
     * @param {Object} schema - tv4 JSON schema.
     * @return {Route} Route instance.
     */
    validateQuery(schema) {
        this.prepend((req, res, next) => {
            validateInput(req.query, schema, next);
        });
        return this;
    }

    /**
     * Validate request body i.e. 'req.body'.
     * 
     * @param {Object} schema - tv4 JSON schema.
     * @return {Route} Route instance.
     */
    validateBody(schema) {
        this.prepend((req, res, next) => {
            validateInput(req.body, schema, next);
        });
        return this;
    }

    /**
     * Mount route on given Router instance.
     * @param {Router} router - router instance (or an express app instance).
     */
    mount(router) {
        // route mothod is supposed to one of those defined in router
        if (!_.isFunction(router[this._method])) {
            throw new Error("method not defined in router: " + this._method);
        }

        // prepend JSON body parsing middleware if applicable
        if (this._options.parseJson) {
            this.prepend(jsonParser(this._options.parseOptions));
        }

        // configure route on router
        router[this._method](this._path, this.asFn);
    }
}

// add built in formats
Route.addFormat(require('./tv4Formats'));

/**
 * @type {Route}
 */
module.exports = Route;


/**
 * Validates given input using given tv4 JSON schema.
 * Forwards error via given next callback.
 * 
 * @param {*} input - input to validate. 
 * @param {Object} schema - tv4 JSON schema. 
 * @param {function} next - next callback. 
 */
function validateInput(input, schema, next) {
    // ensure input 
    input = input || {};

    // validation result
    const result = tv4.validateResult(input, schema);

    // remove tv4 specific info not intended for clients
    _.unset(result, 'error.stack');
    _.unset(result, 'error.schemaPath');

    if (result.valid) {
        // input is valid, proceed
        next();
    } else {
        // input not valid, create error with details
        const err = new ApiError("Invalid Input")
            .withStatus(400)
            .withCode('INVALID_INPUT')
            .withDetail(result);

        // forward error
        next(err);
    }
}