'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');

describe('Schedule', () => {

    const mockWinston = {
        'log': sinon.spy()
    };

    const mockCronJob = {
        'start': sinon.spy(),
        'stop': sinon.spy()
    };

    let mockCronJobConst = sinon.spy();

    function CronJob() {
        mockCronJobConst.apply(mockCronJobConst, arguments);
        return mockCronJob;
    }

    const mockCron = {
        'CronJob': CronJob
    };

    const Schedule = requireproxy('../src/Schedule', {
        'winston': mockWinston,
        'cron': mockCron
    });


    describe('Constructor', () => {

        it('Should require a cron time.', () => {
            expect(() => new Schedule()).to.throw(Error);
            expect(() => new Schedule(sinon.spy())).to.throw(Error);
            expect(() => new Schedule(1234, sinon.spy())).to.throw(Error);
            expect(() => new Schedule({})).to.throw(Error);

        });

        it('Should require a job function.', () => {
            expect(() => new Schedule('*')).to.throw(Error);
            expect(() => new Schedule('*', 1234)).to.throw(Error);
            expect(() => new Schedule('*', {})).to.throw(Error);

        });

        it('Should create an instance of Schedule', () => {
            expect(new Schedule('*', sinon.spy())).to.be.instanceOf(Schedule);

        });

        it('Should set options with defaults', () => {
            const s1 = new Schedule('*', sinon.spy());

            expect(s1._options.timeZone).to.be.equal(undefined);
            expect(s1._options.retry).to.be.equal(true);

            const s2 = new Schedule('*', sinon.spy(), {
                'timeZone': 'test_timezone',
                'retry': false
            });

            expect(s2._options.timeZone).to.be.equal('test_timezone');
            expect(s2._options.retry).to.be.equal(false);
        });

    });

    describe('init()', () => {

        it('Should fail if already called', () => {
            mockCronJobConst = sinon.stub().returns(mockCronJob);

            const schedule = new Schedule('*', sinon.spy());

            const app = {};
            schedule.init(app);

            expect(() => schedule.init(app)).to.throw(Error);
        });

        it('Should start a new CronJob with job function and options', () => {
            mockCronJobConst = sinon.spy();
            mockCronJob.start = sinon.spy();
            mockCronJob.stop = sinon.spy();

            const jobFn = sinon.spy();
            const schedule = new Schedule('*', jobFn, {
                'timeZone': 'test_timezone',
                'retry': false
            });

            const app = {};
            schedule.init(app);

            sinon.assert.calledWith(mockCronJobConst, '*', sinon.match.func, false, 'test_timezone');
            sinon.assert.calledOnce(mockCronJob.start);

            // emulate cron trigger
            mockCronJobConst.getCall(0).args[1]();

            sinon.assert.calledWith(jobFn, app);
        });

        it('Should log error if CronJob creation fails: Invalid cron time.', () => {
            const error = new Error('CronJon constructor error');
            mockCronJobConst = sinon.stub().throws(error);
            mockCronJob.start = sinon.spy();
            mockCronJob.stop = sinon.spy();

            mockWinston.log.reset();

            const jobFn = sinon.spy();
            const schedule = new Schedule('*', jobFn);

            const app = {};
            schedule.init(app);

            sinon.assert.calledWith(mockWinston.log, 'error', sinon.match.string, error);
        });

        it('Should log error if CronJob creation fails: Job function error.', () => {
            mockCronJobConst = sinon.spy();
            mockCronJob.start = sinon.spy();
            mockCronJob.stop = sinon.spy();

            mockWinston.log.reset();

            const error = new Error('CronJon constructor error');
            const jobFn = sinon.stub().throws(error);
            const schedule = new Schedule('*', jobFn, { retry: true });

            const app = {};
            schedule.init(app);

            // emulate cron trigger
            mockCronJobConst.getCall(0).args[1]();

            sinon.assert.calledWith(mockWinston.log, 'error', sinon.match.string, error);
        });

        it('Should stop schedule when job function errors, if options.retry is false', () => {
            mockCronJobConst = sinon.spy();
            mockCronJob.start = sinon.spy();
            mockCronJob.stop = sinon.spy();

            mockWinston.log.reset();

            const error = new Error('CronJon constructor error');
            const jobFn = sinon.stub().throws(error);
            const schedule = new Schedule('*', jobFn, { retry: false });

            const app = {};
            schedule.init(app);

            // emulate cron trigger
            mockCronJobConst.getCall(0).args[1]();

            sinon.assert.calledWith(mockWinston.log, 'error', sinon.match.string, error);
            sinon.assert.calledOnce(mockCronJob.stop);
            sinon.assert.calledWith(mockWinston.log, 'info', sinon.match.string);

        });
    });

});