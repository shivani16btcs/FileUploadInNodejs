'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;

describe('tv4Formats', () => {

    const formats = require('../src/tv4Formats');

    it('has format: email', () => {
        expect(formats.email('a@b.com')).to.be.a('null');
        expect(formats.email('a@b.com.org')).to.be.a('null');
        expect(formats.email('a.b@c.com')).to.be.a('null');
        expect(formats.email('a.b@c@com')).to.be.a('String');
        expect(formats.email('a.b@c.com.')).to.be.a('String');
    });

    it('has format: date', () => {
        expect(formats.date('12-Sep-2014')).to.be.a('null');
        expect(formats.date('Thu Jan 21 15:05:28 UTC 2016')).to.be.a('null');
        expect(formats.date('2016-01-19T16:07:37Z')).to.be.a('null');
        expect(formats.date(1453369016679)).to.be.a('null');
        expect(formats.date(new Date('01-01-2001'))).to.be.a('null');
        expect(formats.date('today')).to.be.a('String');
        expect(formats.date('22-99-9001')).to.be.a('String');
        expect(formats.date('32-13-2005')).to.be.a('String');
    });

    it('has format: nonEmptyOrBlank', () => {
        expect(formats.nonEmptyOrBlank('abc d')).to.be.a('null');
        expect(formats.nonEmptyOrBlank('')).to.be.a('String');
        expect(formats.nonEmptyOrBlank('\t')).to.be.a('String');
        expect(formats.nonEmptyOrBlank(' ')).to.be.a('String');
    });

    it('has format: numberString', () => {
        expect(formats.numberString('adsfg')).to.be.a('string');
        expect(formats.numberString('7544332211')).to.be.a('null');
        expect(formats.numberString('7544332211.23')).to.be.a('null');
        expect(formats.numberString('true')).to.be.a('string');
    });

    it('has format: booleanString', () => {
        expect(formats.booleanString('truea')).to.be.a('string');
        expect(formats.booleanString('true')).to.be.a('null');
        expect(formats.booleanString('false')).to.be.a('null');
        expect(formats.booleanString('123')).to.be.a('string');
    });

});