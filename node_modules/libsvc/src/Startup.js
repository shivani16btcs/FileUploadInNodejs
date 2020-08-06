'use strict';

const _ = require('lodash');
const promiseForFn = require('./promiseForFn');

/**
 * @class
 * 
 * Defines a startup task that is run once on service boot.
 */
class Startup {

    /**
     * @constructor
     * 
     * Startup takes a task function of signature: function(app,done){}.
     * 
     * The first parameter passed to task function is express app instance.
     * The second parameter passed to task function is completion/done callback.
     * 
     * The task function is supposed to do its processing and call 'done' callback when finished, passing any error to it as well.
     * Startup task has a priority 0 and a default default timeout (10 sec). This is configurable using options parameter. 
     * 
     * The options parameter can contain:
     * 1. priority : can be increased to make tasks run prior to others. default is 0.
     * 2. timeout: task function must complete (call done) within this millisecond limit. default is 10000 ms. 
     * 
     * @param {function(app,done)} taskFn - task function.
     * @param {Object} [options]- options object.
     */
    constructor(taskFn, options) {

        if (!_.isFunction(taskFn)) {
            // expecting a task function
            throw new Error("Startup requires a task function.");
        }

        this._fn = taskFn;
        this._options = _.defaults(options, {
            'priority': 0,
            'timeout': 10000
        });
    }

    /**
     * Startup task priority. Tasks with higher priority are run first.
     * @type {Number}
     */
    get priority() {
        return this._options.priority;
    }

    /**
     * Run startup task function.
     * 
     * @param {Application} app - express app instance.
     * @return {Promise} Promise to invoke task function.
     */
    run(app) {
        // timeout error
        const timeoutErr = new Error("Startup task timed out. Should have completed within " + this._options.timeout + " ms.");

        // run task function with timeout
        return promiseForFn(this._fn, app).timeout(this._options.timeout, timeoutErr);
    }

}

/**
 * @type {Startup}
 */
module.exports = Startup;
