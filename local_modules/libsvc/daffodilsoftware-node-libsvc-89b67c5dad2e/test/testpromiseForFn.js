'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const Promise = require('bluebird');

describe('promiseForFn', () => {
    const promiseForFn = require('../src/promiseForFn');

    it('Should be a function.', () => {
        expect(promiseForFn).to.be.a('function');
    });

    it('Should require first argument to be a function.', () => {
        expect(() => promiseForFn()).to.throw(Error);
        expect(() => promiseForFn(123)).to.throw(Error);
        expect(() => promiseForFn('abc')).to.throw(Error);
        expect(() => promiseForFn(['abc'])).to.throw(Error);
        expect(() => promiseForFn({})).to.throw(Error);
        expect(() => promiseForFn(sinon.spy())).to.not.throw();
    });

    it('Should return a promise.', () => {
        expect(promiseForFn(sinon.spy())).to.be.instanceof(Promise);
    });

    describe('returned promise', () => {

        it('Should call given function with given arguments and a callback.', (done) => {
            const fn = sinon.stub().callsArgWith(2, null);

            promiseForFn(fn, 'a', 123).then(() => {
                sinon.assert.calledWith(fn, 'a', 123, sinon.match.func);
                done();
            }).catch(done);
        });

        it('Should reject with error from function callback.', (done) => {
            const error = new Error();
            const fn = sinon.stub().callsArgWith(2, error);

            promiseForFn(fn, 'a', 123).then(() => {
                done(new Error('Should not succeed.'));
            }).catch((err) => {
                sinon.assert.calledWith(fn, 'a', 123, sinon.match.func);
                expect(err).to.be.equal(error);
                done();
            });
        });

        it('Should resolve with output from function callback.', (done) => {
            const output = { 'a': 2 };
            const fn = sinon.stub().callsArgWith(2, null, output);

            promiseForFn(fn, 'a', 123).then((out) => {
                sinon.assert.calledWith(fn, 'a', 123, sinon.match.func);
                expect(out).to.be.equal(output);
                done();
            }).catch(done);
        });

    });

});