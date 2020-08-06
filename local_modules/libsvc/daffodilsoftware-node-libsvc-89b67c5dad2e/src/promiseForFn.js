'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

/**
 * Wrap a callback accepting async function as a Promise.
 * 
 * The first argument is the function, the rest of arguments are passed to the function.
 * Last argument to the function is a callback function(err, output).
 * 
 * The error provided to callback results in reject(error) of promise,
 * else, the output provided to callback results in resolve(output) of promise
 * 
 */
function promiseForFn() {

    // arguments to array
    const input = _.map(arguments);

    // first arg as function
    const fn = input[0];

    // rest of arguments
    const args = _.drop(input, 1);

    // validate first arg
    if (!_.isFunction(fn)) {
        throw new Error('First argument must be a function.');
    }

    // return promise
    return new Promise((resolve, reject) => {

        // add callback as last argument
        args.push((err, output) => err ? reject(err) : resolve(output));

        // invoke function
        fn.apply(fn, args);
    });
}

/**
 * @type {promiseForFn}
 */
module.exports = promiseForFn;