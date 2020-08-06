'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;

describe('ApiError', () => {

    const ApiError = require('../src/ApiError');

    it('Should extend Error', () => {
        expect(new ApiError()).to.be.instanceof(Error);
    });

    describe('constructor', () => {
        it('Should create a new instance with message, status and stack frames', () => {
            const err = new ApiError('test_message');

            expect(err.message).to.be.equal('test_message');
            expect(err.status).to.be.equal(500);
            expect(err.detail).to.be.equal('test_message');
            expect(err.stackFrames).to.be.an('Array');
        });
    });

    describe('withStatus', () => {

        it('Should only accept a number', () => {
            const err = new ApiError('test_message');

            expect(() => err.withStatus(500)).to.not.throw();
            expect(() => err.withStatus('500')).to.throw(Error);
            expect(() => err.withStatus({})).to.throw(Error);
            expect(() => err.withStatus([])).to.throw(Error);
        });

        it('Should set status', () => {
            const err = new ApiError('test_message');

            err.withStatus(2345);
            expect(err.status).to.be.equal(2345);
        });

        it('Should return ApiError instance', () => {
            const err = new ApiError('test_message');
            expect(err.withStatus(400)).to.be.instanceof(ApiError);
        });
    });

    describe('DEFAULT_CODE', () => {
        it('Should be: Internal Error', () => {
            expect(ApiError.DEFAULT_CODE).to.be.equal('INTERNAL_ERROR');
        });
    });

    describe('withCode', () => {

        it('Should only accept a string or a number', () => {
            const err = new ApiError('test_message');

            expect(() => err.withCode(1001)).to.not.throw();
            expect(() => err.withCode('ECODE')).to.not.throw();
            expect(() => err.withCode({})).to.throw(Error);
            expect(() => err.withCode([])).to.throw(Error);
        });

        it('Should set code', () => {
            const err = new ApiError('test_message');

            err.withCode(1001);
            expect(err.code).to.be.equal(1001);
        });

        it('Should return ApiError instance', () => {
            const err = new ApiError('test_message');
            expect(err.withCode(1001)).to.be.instanceof(ApiError);
        });
    });

    describe('withDetail', () => {

        it('Should set detail', () => {
            const err = new ApiError('test_message');
            const detail = { path: '/abc' };

            err.withDetail(detail);
            expect(err.detail).to.be.equal(detail);
        });

        it('Should return ApiError instance', () => {
            const err = new ApiError('test_message');
            const detail = { path: '/abc' };
            expect(err.withDetail(detail)).to.be.instanceof(ApiError);
        });
    });
});