'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

/**
 * Config holder Object.
 */
const CONFIG = {};

/**
 * Initialized flag.
 */
let IS_INIT = false;

/**
 * Initialize module. This function should be called once before module usage.
 * 
 * @param {String} configDir - Absolute path to config directory.
 * @param {String} [env] - Optional environment name, defaults to NODE_ENV environment variable.
 */
function init(configDir, env) {

    // should be called once
    if (IS_INIT) {
        throw new Error('Already initailized!. getConfig.init() should only be called once.');
    }

    // confDir should be a String
    if (!_.isString(configDir)) {
        throw new Error('confDir should be a String.');
    }

    // env should be a String, if provided
    if (!_.isNil(env) && !_.isString(env)) {
        throw new Error('If provided, env should be a String.');
    }

    // default config file path
    const defaultFileName = 'default.json';
    const defaultPath = path.join(configDir, defaultFileName);

    // environment specific config file path, or null if env/NODE_ENV is not defined
    env = _.isNil(env) ? process.env.NODE_ENV : env;
    const envFileName = _.isNil(env) ? null : `${env}.json`;
    const envPath = envFileName && defaultFileName != envFileName ? path.join(configDir, envFileName) : null;

    // check if default config file can be read
    let hasDefaultFile = false;
    try {
        fs.accessSync(defaultPath, fs.R_OK);
        hasDefaultFile = true;
    } catch (err) {
        winston.log('error', `CONF: Could not find default config: ${defaultFileName}`);
    }

    // check if environment specific config file can be read
    let hasEnvFile = false;
    if (envPath) {
        try {
            fs.accessSync(envPath, fs.R_OK);
            hasEnvFile = true;
        } catch (err) {
            winston.log('warn', `CONF: Could not find environment specific config: ${envFileName}`);
        }
    }


    // load default config
    if (hasDefaultFile) {
        _.merge(CONFIG, readJson(defaultPath));
        winston.log('info', `CONF: Read default config: ${defaultFileName}`);
    }

    // merge with environment specific config
    if (hasEnvFile) {
        _.merge(CONFIG, readJson(envPath));
        winston.log('info', `CONF: Read environment specific config: ${envFileName}`);
    }

    // make CONFIG immutable
    deepFreeze(CONFIG);

    // initialized
    IS_INIT = true;
}

/**
 * Makes an Object immutable by (deep) freezing all own peoperties.
 * 
 * @param {*} obj - Object to make immutable.
 * @returns {*} The input Object.
 */
function deepFreeze(obj) {
    if (_.isObject(obj) || _.isArray(obj) || _.isFunction(obj)) {
        Object.freeze(obj);
        _.forOwn(obj, deepFreeze);
    }
    return obj;
}

/**
 * Reads a JSON file and parses the contents into an Object.
 * 
 * @param {String} jsonFile - path to json file.
 */
function readJson(jsonFile) {
    return JSON.parse(fs.readFileSync(jsonFile));
}


/**
 * Get configuration value for path. Retuned values are immutable.
 * 
 * Arguments can be: 
 * 1. The path as a String. E.g getConfig('db.url')
 * 2. Or, path as arguments. E.g getConfig('db','url')
 * 3. Or, path as an Array. E.g. getConfig(['db','url'])
 * 
 * @returns {*} - config value at specified path.
 */
function getConfig() {

    // must be initailized
    if (!IS_INIT) {
        throw new Error('Not initalized. Call getConfig.init() once at start.');
    }

    // get path from arguments
    let pathArgs;
    switch (arguments.length) {
        case 0:
            pathArgs = undefined;
            break;
        case 1:
            pathArgs = arguments[0];
            break;
        default:
            pathArgs = _.flatten(_.map(arguments));
            break;
    }

    // lodash get/has() args 
    const getArgs = [CONFIG, pathArgs];

    if (_.isNil(pathArgs) || pathArgs.length < 1) {
        // no args, return entire config
        return CONFIG;
    }

    if (_.has.apply(_, getArgs)) {
        // path exists, get value
        return _.get.apply(_, getArgs);
    } else {
        // path does not exists
        const notFoundPath = _.join(_.flatten(pathArgs), ' > ');
        throw new Error(`Config value not defined in config file(s) for path: ${notFoundPath}`);
    }
}

// add init() as a property to getConfig()
Object.defineProperty(getConfig, 'init', { 'value': init });

/**
 * getConfig module.
 * 
 * Provides config values from a default.json in config dir.
 * Call getConfig.init(confDir,env) before everything to initialize the module for a specific config dirctory.
 * Default values can be overridden by providing additional json files matching the NODE_ENV environment variable.
 * 
 * @type {getConfig}
 */
module.exports = getConfig;

