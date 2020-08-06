'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');

describe('Startup', () => {

    const mockWinston = {
        'log': sinon.spy()
    };

    const Startup = requireproxy('../src/Startup', {
        'winston': mockWinston
    });

    describe('Constructor', () => {

        it('Should require a task function.', () => {
            expect(() => new Startup()).to.throw(Error);
            expect(() => new Startup('abc')).to.throw(Error);
            expect(() => new Startup({})).to.throw(Error);
        });

        it('Should create an instane of Startup', () => {
            expect(new Startup(sinon.spy())).to.be.instanceOf(Startup);
        });

        it('Should set options with defaults', () => {

            const s1 = new Startup(sinon.spy());

            expect(s1._options.priority).to.be.equal(0);
            expect(s1._options.timeout).to.be.equal(10000);

            const s2 = new Startup(sinon.spy(), {
                'priority': 200,
                'timeout': 12000
            });

            expect(s2._options.priority).to.be.equal(200);
            expect(s2._options.timeout).to.be.equal(12000);
        });
    });

    describe('describe', () => {

        it('Should be priority passed in options', () => {
            const startup = new Startup(sinon.stub().callsArg(1), { priority: 2001 });

            expect(startup.priority).to.be.equal(2001);
        });
    });

    describe('run()', () => {

        it('Should call task function with app and done callback', (done) => {
            const taskFn = sinon.stub().callsArgWith(1, undefined);
            const startup = new Startup(taskFn);

            const app = {};

            startup.run(app)
                .then(() => {
                    sinon.assert.calledWith(taskFn, app, sinon.match.func);
                    done();
                })
                .catch(done);
        });

        it('Should fail if done is called with error', (done) => {
            const error = new Error('task failed!');
            const taskFn = sinon.stub().callsArgWith(1, error);
            const startup = new Startup(taskFn);

            const app = {};

            startup.run(app)
                .then(() => done(new Error('Should not succeed')))
                .catch((err) => {
                    expect(err).to.be.equal(error);
                    done();
                });
        });

        it('Should fail if task function throws an error', (done) => {
            const error = new Error('task failed!');
            const taskFn = sinon.stub().throws(error);
            const startup = new Startup(taskFn);

            const app = {};

            startup.run(app)
                .then(() => done(new Error('Should not succeed')))
                .catch((err) => {
                    expect(err).to.be.equal(error);
                    done();
                });
        });

        it('Should fail if task function does not notify callback with in timeout', (done) => {
            const taskFn = (app, cb) => {
                setTimeout(cb, 400);
            };

            const startup = new Startup(taskFn, { timeout: 200 });

            const app = {};

            startup.run(app)
                .then(() => done(new Error('Should not succeed')))
                .catch((err) => {
                    expect(err).to.be.instanceOf(Error);
                    done();
                });
        });

        it('Should NOT fail if task function DOES notify callback with in timeout', (done) => {
            const taskFn = (app, cb) => {
                setTimeout(cb, 200);
            };

            const startup = new Startup(taskFn, { timeout: 400 });

            const app = {};

            startup.run(app)
                .then(() => done())
                .catch(() => done(new Error('Should not fail')));
        });

    });
});