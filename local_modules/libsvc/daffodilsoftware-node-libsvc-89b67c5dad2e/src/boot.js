'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const url = require('url');
const svcutil = require('./svcutil');
const Route = require('./Route');
const Startup = require('./Startup');
const Schedule = require('./Schedule');
const errorHandler = require('./errorHandler');
const getConfig = require('./getConfig');

/**
 * Performs initialization of web service for given express app instance.
 * 
 * Options parameter may contain:
 * 1. routesDir     - path of custom routes directory, relative to service root directory. Default is 'routes'.
 * 2. startupDir    - path of custom startup directory, relative to service root directory. Default is 'startup'.
 * 3. scheduleDir   - path of custom schedule directory, relative to service root directory. Default is 'schedule'.
 * 4. configDir     - path of custom config directory, relative to service root directory. Default is 'config'.
 *                    Use null to disable initialization of libsvc.getConfig() functionality.
 * 5. preMountHook  - if defined, this function is called with each Route, before Route is mounted. Default is undefined.
 * 
 * @param {String}      rootDir     - full path to the base directory of service files.
 * @param {Application} app         - express app instance.
 * @param {Object}      [options]   - options.
 * 
 * @returns {Promise} Promise of initialized app instance.
 */
function boot(rootDir, app, options) {

    // apply defaults to options
    options = _.defaults(options, {
        'routesDir': path.join(rootDir, 'routes'),
        'startupDir': path.join(rootDir, 'startup'),
        'scheduleDir': path.join(rootDir, 'schedule'),
        'configDir': path.join(rootDir, 'config'),
        'preMountHook': undefined
    });

    // init getConfig module if a path is specified
    if (options.configDir) {
        getConfig.init(options.configDir);
    }

    // boot sequence: start with running Startup tasks
    return runStartupTasks(app, options.startupDir)
        .then(() => {
            // then, mount all routes
            return mountRoutes(app, options.routesDir, options.preMountHook);
        })
        .then(() => {
            // then, init all schedules
            return initSchedules(app, options.scheduleDir);
        })
        .then(() => {
            // then, mount error handler
            app.use(errorHandler);

            // boot done, return app
            return app;
        });

}

/**
 * Run startup tasks.
 * 
 * @param {Application} app - express app.
 * @param {String} startupDir - startup tasks directory.
 * 
 * @returns {Promise} - Promise to run startup tasks.
 */
function runStartupTasks(app, startupDir) {
    return new Promise((resolve) => {

        if (fs.existsSync(startupDir)) {

            // load startup instances
            let startups = svcutil.walkModulesSync(startupDir, Startup);

            // sort by priority, descending
            startups = _.sortBy(startups, (s) => -1 * s.priority);

            // run all
            return resolve(Promise.all(startups.map(_.method('run', app))));
        } else {
            // no startup dir exists
            return resolve();
        }
    });
}

/**
 * Mount routes on app.
 * 
 * @param {Application} app - express app.
 * @param {String} routesDir - routes directory.
 * @param {Function} preMountHook - pre-mount hook function.
 * 
 * @returns {Promise} - Promise to mount routes.
 */
function mountRoutes(app, routesDir, preMountHook) {
    return new Promise((resolve) => {

        if (fs.existsSync(routesDir)) {

            // load route instances
            const routes = svcutil.walkModulesSync(routesDir, Route);

            // process premount hook
            if (preMountHook) {
                routes.forEach(preMountHook);
            }

            // call mount(app) of each
            routes.forEach(_.method('mount', app));

            // all done
            return resolve();
        } else {
            // no routes dir exists
            return resolve();
        }
    });
}

/**
 * Initialize schedules.
 * 
 * @param {Application} app - express app.
 * @param {String} scheduleDir - schedule directory.
 * 
 * @returns {Promise} - Promise to initialize schedules.
 */
function initSchedules(app, scheduleDir) {
    return new Promise((resolve) => {

        if (fs.existsSync(scheduleDir)) {

            // load schedule instances
            const schedules = svcutil.walkModulesSync(scheduleDir, Schedule);

            // call init(app) of each
            schedules.forEach(_.method('init', app));

            // all done
            return resolve();
        } else {
            // no schedule dir exists
            return resolve();
        }
    });
}


/**
 * @type {boot}
 */
module.exports = boot;