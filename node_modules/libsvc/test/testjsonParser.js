'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');

const ApiError = require('../src/ApiError');

describe('jsonParser', () => {

    const mockBodyParser = {};

    const jsonParser = requireproxy('../src/jsonParser', {
        'body-parser': mockBodyParser
    });

    it('Should return a middleware function', () => {

        mockBodyParser.json = sinon.spy();

        expect(jsonParser()).to.be.a('function');
    });

    it('Should pass options to body-parser.json()', () => {

        mockBodyParser.json = sinon.spy();

        const options = { limit: '10kb' };

        jsonParser(options);

        sinon.assert.calledWith(mockBodyParser.json, options);
    });

    it('Should call body-parser.json() middleware', () => {

        const json = sinon.spy();
        mockBodyParser.json = sinon.stub().returns(json);

        const mw = jsonParser();

        const req = {};
        const res = {};
        const next = sinon.spy();

        mw(req, res, next);

        sinon.assert.calledWith(json, req, res, sinon.match.func);
    });

    it('Should covert status:400 errors from body-parser to ApiErrors', () => {

        const error = new Error('json parse error');
        error.status = 400;

        const json = sinon.stub().callsArgWith(2, error);
        mockBodyParser.json = sinon.stub().returns(json);

        const mw = jsonParser();

        const req = {};
        const res = {};
        const next = sinon.spy();

        mw(req, res, next);

        sinon.assert.calledWith(next, sinon.match.instanceOf(ApiError));
    });

    it('Should forward other errors as is to next', () => {

        const error = new Error('json parse error');

        const json = sinon.stub().callsArgWith(2, error);
        mockBodyParser.json = sinon.stub().returns(json);

        const mw = jsonParser();

        const req = {};
        const res = {};
        const next = sinon.spy();

        mw(req, res, next);

        sinon.assert.calledWith(next, error);
    });
});