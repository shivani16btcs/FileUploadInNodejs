'use strict';

const _ = require('lodash');
const winston = require('winston');
const cron = require('cron');

/**
 * @class
 * 
 * Defines a Schedule to run a specified cron job. 
 */
class Schedule {

    /**
     * @constructor
     * 
     * Schedule takes a cron time (cron format String or a Date instance) 
     * and a job function with signature: function(app){}.
     * 
     * The first parameter to job fumction is express app instance.
     * The job function is supposed to perform/trigger required processing. 
     * 
     * Options parameter may contain:
     * 1. timeZone - set timezone for execution e.g. 'America/Los_Angeles'. Default is system timezone.
     * 2. retry - set false to stop job's scheduled runs if job run fails. Default is true.
     *  
     * @param {String|Date} cronTime - cron time string, or Date instance
     * @param {Function} jobFn - job function.
     * @param {Object} options - Schedule options.
     */
    constructor(cronTime, jobFn, options) {

        // validate cron time
        if (!(_.isString(cronTime) || cronTime instanceof Date)) {
            // expecting a cron time string or a Date instance
            throw new Error("Schedule requires a cron time string or a Date instance.");
        }

        // validate job function
        if (!_.isFunction(jobFn)) {
            // expecting a job function
            throw new Error("Schedule requires a job function.");
        }

        this._cronTime = cronTime;
        this._fn = jobFn;
        this._options = _.defaults(options, {
            'timeZone': undefined,
            'retry': true
        });

    }


    /**
     * Initialize Schedule. Should be called only onece at start.
     * 
     * @param {Application} app - express app instance.
     */
    init(app) {

        // for reference in inner scope
        const self = this;

        if (self._job) {
            // can init once only
            throw new Error('Already initialized.');
        }

        try {
            // define cron job
            self._job = new cron.CronJob(self._cronTime, () => {
                try {
                    // try running job function
                    self._fn(app);

                } catch (jobErr) {

                    // log error
                    winston.log('error', 'Error running scheduled job.', jobErr);

                    if (!self._options.retry) {
                        // stop if no retry
                        self._job.stop();
                        winston.log('info', 'Schedule stopped: last job run failed and retry is false.');
                    }
                }
            }, false, self._options.timeZone);

            self._job.start();

        } catch (initErr) {
            // probably invalid cron time
            winston.log('error', 'Error initializing Schedule. Is cronTime valid format ?', initErr);
        }
    }
}

/**
 * @type {Schedule}
 */
module.exports = Schedule;