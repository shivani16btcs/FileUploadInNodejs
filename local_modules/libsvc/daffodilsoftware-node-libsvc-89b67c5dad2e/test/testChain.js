'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

describe('Chain', function () {

    const Chain = require('../src/Chain');

    describe('Constructor', () => {

        it('Should create a chain instance', () => {
            expect(new Chain()).to.be.instanceof(Chain);
        });
    });

    describe('append()', () => {

        it('Should add middleware functions from arguments at END of chain, flattening nested elements', () => {
            const mws = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];

            const chain = new Chain().append(mws[0]);
            chain.append(mws[1], [mws[2], new Chain().append([mws[3], mws[4]])]);

            expect(chain.fns).to.be.deep.equals(mws);
        });

        it('Should error if arguments have something that is not a function', () => {
            const mws = [sinon.spy(), sinon.spy(), sinon.spy(), "NOT_FUNCTION", sinon.spy()];

            const chain = new Chain(mws[0]);
            const testFn = () => chain.append(mws[1], [mws[2], [mws[3], mws[4]]]);

            expect(testFn).to.throw(Error);
        });
    });

    describe('prepend()', () => {

        it('Should add middleware functions from arguments at START of chain, flattening nested elements', () => {
            const mws = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];

            const chain = new Chain().append(mws[4]);
            chain.prepend(mws[0], new Chain().prepend([mws[1], [mws[2], mws[3]]]));

            expect(chain._fns).to.be.deep.equals(mws);
        });

        it('Should error if arguments have something that is not a function', () => {
            const mws = [sinon.spy(), sinon.spy(), sinon.spy(), "NOT_FUNCTION", sinon.spy()];

            const chain = new Chain(mws[4]);
            const testFn = () => chain.prepend(mws[0], [mws[1], [mws[2], mws[3]]]);

            expect(testFn).to.throw(Error);
        });
    });

    describe('has()', () => {

        it('Should determine if chain has a given middleware function or not.', () => {
            const mws = [sinon.spy(), sinon.spy(), sinon.spy()];
            const chain = new Chain().append(mws);

            mws.forEach((mw) => {
                expect(chain.has(mw)).to.be.true;
            });

            expect(chain.has(sinon.spy())).to.be.false;
        });
    });

    describe('length', () => {

        it('Should reflect length of collected middleware functions', () => {
            const chain = new Chain();

            for (let i = 0; i < 5; i++) {
                chain.append(sinon.spy());
                expect(chain.length).to.be.equals(i + 1);
            }
        });
    });

    describe('fns', () => {
        it('Should reflect collected middleware functions', () => {
            const chain = new Chain();
            const mws = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];

            for (let i = 0; i < mws.length; i++) {
                chain.append(mws[i]);
                expect(chain.fns).to.be.an('Array');
                expect(chain.fns.length).to.be.equals(i + 1);
            }
        });
    });

    describe('middleware()', () => {

        it('Should simply call next if no middleware in chain', (done) => {
            const chain = new Chain();

            const req = {};
            const res = {};

            chain.asFn(req, res, (err) => {
                done(err);
            });
        });

        it('Should invoke collected middleware functions', (done) => {
            const mws = [];
            for (let i = 0; i < 5; i++) {
                mws.push(sinon.stub().callsArg(2));
            }

            const req = {};
            const res = {};

            const chain = new Chain().append(mws);

            chain.asFn(req, res, (err) => {
                mws.forEach((mw) => {
                    sinon.assert.calledWith(mw, req, res, sinon.match.func);
                });

                done(err);
            });
        });

        it('Should skip to error handling middleware if an error is propagated', (done) => {
            const error = new Error();
            const mws = [];

            // 0: normal middleware
            mws[0] = sinon.stub().callsArg(2);

            // 1: normal middleware
            mws[1] = sinon.stub().callsArg(2);

            // 2: normal middleware, propagates error
            mws[2] = sinon.stub().callsArgWith(2, error);

            // 3: nornal middleware
            mws[3] = sinon.stub().callsArg(2);

            // 4: normal middleware
            mws[4] = sinon.stub().callsArg(2);

            // 5: error handling middleware
            mws[5] = sinon.stub({ 'fn': (a, b, c, d) => { d(); } }, 'fn').callsArg(3);

            // 6: normal middleware
            mws[6] = sinon.stub().callsArg(2);


            const req = {};
            const res = {};

            const chain = new Chain().append(mws);

            chain.asFn(req, res, (err) => {
                // 0, 1 and 2 should be called
                sinon.assert.calledWith(mws[0], req, res, sinon.match.func);
                sinon.assert.calledWith(mws[1], req, res, sinon.match.func);
                sinon.assert.calledWith(mws[2], req, res, sinon.match.func);

                // 3 and 4 should NOT be called
                sinon.assert.notCalled(mws[3]);
                sinon.assert.notCalled(mws[4]);

                // 5 should be called with error
                sinon.assert.calledWith(mws[5], error, req, res, sinon.match.func);

                // 6 should be called
                sinon.assert.calledWith(mws[6], req, res, sinon.match.func);

                done(err);
            });
        });

        it('Should skip error handling middleware if no error is propagated', (done) => {
            const mws = [];

            // 0: normal middleware
            mws[0] = sinon.stub().callsArg(2);

            // 1: error handling middleware
            mws[1] = sinon.stub({ 'fn': (a, b, c, d) => { d(); } }, 'fn').callsArg(3);

            // 2: normal middleware
            mws[2] = sinon.stub().callsArg(2);

            const req = {};
            const res = {};

            const chain = new Chain().append(mws);

            chain.asFn(req, res, (err) => {
                // 0 and 2 should be called
                sinon.assert.calledWith(mws[0], req, res, sinon.match.func);
                sinon.assert.calledWith(mws[2], req, res, sinon.match.func);

                // 1 should NOT be called
                sinon.assert.notCalled(mws[1]);

                done(err);
            });
        });

        it('Should propagate unhandeled error to callback', (done) => {
            const error = new Error();
            const mws = [];

            // 0: normal middleware
            mws[0] = sinon.stub().callsArg(2);

            // 1: normal middleware, propagates error
            mws[1] = sinon.stub().callsArgWith(2, error);

            // 2: nornal middleware
            mws[2] = sinon.stub().callsArg(2);

            const req = {};
            const res = {};

            const chain = new Chain().append(mws);

            chain.asFn(req, res, (err) => {
                // 0 and 1 should be called
                sinon.assert.calledWith(mws[0], req, res, sinon.match.func);
                sinon.assert.calledWith(mws[1], req, res, sinon.match.func);

                // 2 should NOT be called
                sinon.assert.notCalled(mws[2]);

                // error should be sent to callback
                expect(err).to.be.equals(error);

                done();
            });
        });

        it('Should throw error thrown from callback', (done) => {
            const error = new Error('My message');
            const mws = [];

            // 0: normal middleware
            mws[0] = sinon.stub().callsArg(2);

            // 1: normal middleware, throws error
            mws[1] = sinon.stub().throws(error);

            // 2: nornal middleware
            mws[2] = sinon.stub().callsArg(2);

            const req = {};
            const res = {};

            const chain = new Chain().append(mws);

            // chain callback
            const callback = sinon.spy();

            // run chain
            chain.asFn(req, res, callback)
                .catch((err) => {
                    // error that is thrown
                    expect(err).to.be.equal(error);

                    //c0 and 1 should be called
                    sinon.assert.calledWith(mws[0], req, res, sinon.match.func);
                    sinon.assert.calledWith(mws[1], req, res, sinon.match.func);

                    // 2 should NOT be called
                    sinon.assert.notCalled(mws[2]);

                    // callback should not be called
                    sinon.assert.notCalled(callback);

                    // finished
                    done();
                });

        });
    });

});