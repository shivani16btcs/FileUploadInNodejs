'use strict';

const _ = require('lodash');

// A practical regex for RFC 2822 email spec. @see http://stackoverflow.com/a/1373724/1531054  
const REGEX_EMAIL = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

/**
 * Extra formats for tv4 JSON schema validator.
 * @type {Object}
 */
module.exports = {

    // anything parcelable to a valid Date Object
    'date': (data) => {
        let valid = (_.isFinite(data) || _.isString(data) || _.isDate(data));
        valid = valid && new Date(data).toString() !== 'Invalid Date';
        return valid ? null : 'Should be a date.';
    },

    // string with something to read. i.e not empy or blank
    'nonEmptyOrBlank': (data) => {
        return (data.length > 0 && !/^\s+$/.test(data)) ? null : 'Should not be empty or blank.';
    },

    // string parcelable to a number
    'numberString': (data) => {
        return !isNaN(data) ? null : 'Should be a numeric';
    },

    // true or false string
    'booleanString': (data) => {
        return data === 'true' || data === "false" ? null : 'Should be a true/false';
    },

    // email address
    'email': (data) => {
        return REGEX_EMAIL.test(data) ? null : 'Should be a valid email';
    }
};