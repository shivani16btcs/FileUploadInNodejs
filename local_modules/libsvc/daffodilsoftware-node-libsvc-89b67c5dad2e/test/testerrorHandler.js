'use strict';

const mocha = require('mocha');
const chai = require('chai');
const sinon = require('sinon');
const requireproxy = require('./requireproxy');
const describe = mocha.describe;
const it = mocha.it;
const expect = chai.expect;

const ApiError = require('../src/ApiError');

describe('errorHandler', () => {
    const mockWinston = {
        'log': sinon.spy()
    };

    const errorHandler = requireproxy('../src/errorHandler', {
        'winston': mockWinston
    });

    it('Should exports a middleware function', () => {
        expect(errorHandler).to.be.a('function');
    });

    it('Should log ApiErrors to winston', () => {
        mockWinston.log.reset();

        const err = new ApiError('error message');

        const req = { method: 'GET', url: '/cars' };
        const res = {};
        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);
        sinon.assert.called(mockWinston.log);
        sinon.assert.calledOnce(next);
    });

    it('Should log Errors to winston', () => {
        mockWinston.log.reset();

        const err = new Error('error message');

        const req = { method: 'GET', url: '/cars' };
        const res = {};
        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);
        sinon.assert.called(mockWinston.log);
        sinon.assert.calledOnce(next);
    });

    it('Should log Non-Errors to winston', () => {
        mockWinston.log.reset();

        const err = 'something strange';
        const req = { method: 'GET', url: '/cars' };
        const res = {};
        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);
        sinon.assert.called(mockWinston.log);
        sinon.assert.calledOnce(next);
    });

    it('Should end response whose header is already sent', () => {
        const err = new Error('error message');

        const req = {};
        const res = { headersSent: true, end: sinon.spy() };

        const next = sinon.spy();

        errorHandler(err, req, res, next);

        sinon.assert.calledOnce(res.end);
        sinon.assert.calledOnce(next);
    });

    it('Should send Api Error instances via response', () => {
        const err = new ApiError('test_message').withStatus(404).withCode(1001).withDetail('test_detail');

        const req = {};
        const res = {};

        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);

        sinon.assert.calledWith(res.status, 404);
        sinon.assert.calledWith(res.json, sinon.match({
            'isError': true,
            'code': 1001,
            'detail': 'test_detail'
        }));
        sinon.assert.calledOnce(next);
    });

    it('Should responds with internal server error for other errors.', () => {
        const err = new Error('test_message');

        const req = {};
        const res = {};
        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);

        sinon.assert.calledWith(res.status, 500);
        sinon.assert.calledWith(res.json, sinon.match({ 'detail': 'test_message' }));
        sinon.assert.calledOnce(next);
    });

    it('Should resolve Unknown Error detail for non Error type instances.', () => {
        const err = [{}];

        const req = {};
        const res = {};
        res.status = sinon.stub().returns(res);
        res.json = sinon.spy();

        const next = sinon.spy();

        errorHandler(err, req, res, next);

        sinon.assert.calledWith(res.status, 500);
        sinon.assert.calledWith(res.json, sinon.match({ 'detail': 'Unknown Error' }));
        sinon.assert.calledOnce(next);
    });

    describe('mongoose error support', () => {

        it('Should map native driver codes to error details.', () => {
            const mongoErr = new Error();
            mongoErr.name = 'MongoError';
            mongoErr.driver = true;

            const map = [
                { code: 11000, details: ['Document already exists.'] }
            ];

            map.forEach((m) => {
                const req = {};
                const res = {};
                res.status = sinon.stub().returns(res);
                res.json = sinon.spy();

                const next = sinon.spy();

                mongoErr.code = m.code;

                errorHandler(mongoErr, req, res, next);

                sinon.assert.calledWith(res.status, 500);
                sinon.assert.calledWith(res.json, sinon.match({ 'detail': m.details }));
                sinon.assert.calledOnce(next);
            });
        });

        it('Should resolve ValidationError details.', () => {
            const mongooseErr = new Error();
            mongooseErr.constructor = { name: 'MongooseError' };
            mongooseErr.name = 'ValidationError';

            mongooseErr.errors = {
                subErr: { constructor: { name: 'MongooseError' }, path: '/', message: 'msg' },
            };

            const req = {};
            const res = {};
            res.status = sinon.stub().returns(res);
            res.json = sinon.spy();

            const next = sinon.spy();

            errorHandler(mongooseErr, req, res, next);

            sinon.assert.calledWith(res.json, sinon.match({ 'detail': [{ path: '/', message: 'msg' }] }));

        });

    });

});