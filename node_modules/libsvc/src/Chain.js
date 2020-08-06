'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

/**
 * @class
 * 
 * A Standalone middleware function seqeunce, 
 * that can be represented as a single middleware function.
 */
class Chain {

    /**
     * @constructor
     * 
     * Creates a new instance.
     * Arguments can be expressjs style middleware functions, 
     * or other Chain instances, or arrays of these.
     * 
     * Note: Nested elements in arrays will be flattened.
     */
    constructor() {
        // array of collected functions
        this._fns = [];
    }

    /**
     * Length of chain. I.e. number of middleware functiions in chain.
     * 
     * @type {Number}
     */
    get length() {
        return this._fns.length;
    }

    /**
     * Middleware functiions in chain.
     * 
     * @type {Function[]}
     */
    get fns() {
        return Array.from(this._fns);
    }

    /**
     * Add middleware functions to END of chain.
     * Arguments can be expressjs style middleware functions, 
     * or other Chain instances, or arrays of these.
     * 
     * Note: Nested elements in arrays will be flattened.
     * 
     * @returns {Chain} - chain instance.
     */
    append() {
        addMiddleware(false, this, arguments);
        return this;
    }

    /**
    * Add middleware functions at START of chain.
    * Arguments can be expressjs style middleware functions, 
    * or other Chain instances, or arrays of these.
    * 
    * Note: Nested elements in arrays will be flattened.
    * 
    * @returns {Chain} - chain instance.
    */
    prepend() {
        addMiddleware(true, this, arguments);
        return this;
    }

    /**
     * Check if Chain has the given middleware function.
     * 
     * @param {Function} fn - function to search for.
     * 
     * @return {Boolean} - true if found, false otherwise.
     */
    has(fn) {
        return _.includes(this._fns, fn);
    }

    /**
     * Chain represented as a single middleware function. 
     * It runs chain middleware functiions in sequence.
     * @type {Function}
     */
    get asFn() {
        return _.partial(runFns, this._fns);
    }
}

/**
 * @type {Chain}
 */
module.exports = Chain;


/**
 * Adds middleware functions to chain.
 * 
 * @param {boolean} prepend - true to add at start of chain, false to add at end of chain.
 * @param {Chain} chain - chain instance to add to.
 * @param {arguments} args - collection of functions.
 */
function addMiddleware(prepend, chain, args) {

    // flatten arguments to an array
    let input = _.flattenDeep(_.map(args));

    // flat map nested Chains
    input = _.flatMap(input, (fn) => fn instanceof Chain ? fn._fns : fn);

    if (_.every(input, _.isFunction)) {
        // concat accordingly
        if (prepend) {
            // add before existing middleware
            chain._fns = _.concat(input, chain._fns);
        } else {
            // add after existing middleware
            chain._fns = _.concat(chain._fns, input);
        }
    } else {
        // accept only functions
        throw new Error('A Middleware in arguments is not a function.');
    }
}

/**
 * Invoke middleware function for chained execution.
 * 
 * @param {Request} req - expressjs request.
 * @param {Response} res - expressjs response.
 * @param {{err:Error}} memo - propagating error holder.
 * @param {Function} fn - middleware function.
 */
function invokeFn(req, res, memo, fn) {
    // return a Promise of async execution
    return new Promise((resolve) => {

        // middleware next callback
        const next = (err) => {
            // save error from last middleware and continue
            memo.err = err;
            resolve(memo);
        };

        if (memo.err) {
            // error propagated            
            if (fn.length === 4) {
                // invoke if error handling middleware
                fn(memo.err, req, res, next);
            } else {
                // skip if normal middleware
                resolve(memo);
            }
        } else {
            // no error 
            if (fn.length === 4) {
                // skip if error handling middleware
                resolve(memo);
            } else {
                // invoke if normal middleware
                fn(req, res, next);
            }
        }

    });
}

/**
 * Runs Chain middlewares in sequence.
 * 
 * @param {Function[]} fns - Chain middleware functiions array.
 * @param {Request} req - expressjs request.
 * @param {Response} res - expressjs response.
 * @param {function(Error)} next - next callback.
 */
function runFns(fns, req, res, next) {

    // if functiions array is empty
    if (fns.length < 1) {
        return next();
    }

    // error holder
    const memo = { err: null };

    // chain reducer
    const reducer = _.partial(invokeFn, req, res);

    // reduce functiions array async, pass collected error to callback
    return Promise.reduce(fns, reducer, memo).then(() => next(memo.err));
}
