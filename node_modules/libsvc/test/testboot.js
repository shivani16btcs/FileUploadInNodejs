'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');
const Promise = require('bluebird');


describe('boot', () => {

    // mock module dependencies
    const mockSvcutil = {};
    const mockFs = {};
    const mockGetConfig = { 'init': sinon.spy() };
    const mockWinston = {
        'log': sinon.spy()
    };

    // module under test
    const boot = requireproxy('../src/boot', {
        './svcutil': mockSvcutil,
        './getConfig': mockGetConfig,
        'fs': mockFs,
        'winston': mockWinston
    });

    it('Should return a Promise', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);

        const mockApp = {
            'use': sinon.spy()
        };

        const bootPromise = boot('/', mockApp);
        expect(bootPromise).to.be.instanceof(Promise);

        bootPromise.then((app) => {
            expect(app).to.be.equal(mockApp);
            done();
        }).catch(done);
    });


    it('Should call getConfig.init() with default configDir', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);
        mockGetConfig.init.reset();

        const mockApp = {
            'use': sinon.spy()
        };

        boot('/', mockApp).then(() => {
            sinon.assert.calledWith(mockGetConfig.init, '/config');
            done();
        });

    });

    it('Should call getConfig.init() with custom configDir', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);
        mockGetConfig.init.reset();

        const mockApp = {
            'use': sinon.spy()
        };

        const options = {
            'configDir': '/customConfig'
        };

        boot('/', mockApp, options).then(() => {
            sinon.assert.calledWith(mockGetConfig.init, '/customConfig');
            done();
        });

    });

    it('Should NOT call getConfig.init() if configDir is null', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);
        mockGetConfig.init.reset();

        const mockApp = {
            'use': sinon.spy()
        };

        const options = {
            'configDir': null
        };

        boot('/', mockApp, options).then(() => {
            sinon.assert.notCalled(mockGetConfig.init);
            done();
        });

    });

    /**
     * Test routes mounting with optional custom routes dir.
     * @param routesDir : custom routes dir, or undefined for default.
     * @param done: mocha done callback.
     */
    function testMountRoutes(routesDir, done) {
        mockFs.existsSync = sinon.stub().withArgs(routesDir ? ('/' + routesDir) : '/routes').returns(true);

        const routes = [{ 'mount': sinon.spy() }, { 'mount': sinon.spy() }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(routes);

        const mockApp = {
            'use': sinon.spy()
        };

        const bootPromise = routesDir ? boot('/', mockApp, { 'routesDir': routesDir }) : boot('/', mockApp);

        bootPromise.then((app) => {

            expect(app).to.be.equal(mockApp);

            routes.forEach((r) => sinon.assert.calledWith(r.mount, mockApp));

            done();

        }).catch(done);
    }

    it('Should mount routes from routes dir', (done) => {
        testMountRoutes(undefined, done);
    });

    it('Should mount routes from custom routes dir', (done) => {
        testMountRoutes('customRoutes', done);
    });

    it('Should skip mounting routes if routes dir does not exists', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);

        const routes = [{ 'mount': sinon.spy() }, { 'mount': sinon.spy() }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(routes);

        const mockApp = {
            'use': sinon.spy()
        };

        boot('/', mockApp)
            .then(() => {
                routes.forEach((r) => sinon.assert.notCalled(r.mount));
                done();
            }).catch((e) => done(e));

    });

    it('Should invoke preMountHook before mounting each Route, when provided', (done) => {
        mockFs.existsSync = sinon.stub().returns(true);

        const routes = [{ 'mount': sinon.spy() }, { 'mount': sinon.spy() }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(routes);

        const mockApp = {
            'use': sinon.spy()
        };

        const options = {
            'preMountHook': sinon.spy()
        };

        boot('/', mockApp, options)
            .then(() => {
                routes.forEach((r) => sinon.assert.calledWith(options.preMountHook, r));
                done();
            }).catch((e) => done(e));

    });

    it('Should fail if routes mount fails: error from: svcutil.walkModulesSync()', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/routes').returns(true);

        const error = new Error('Should not succeed.');
        mockSvcutil.walkModulesSync = sinon.stub().throws(error);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });

    });

    it('Should fail if routes mount fails: error from: Route.mount()', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/routes').returns(true);

        const error = new Error('Should not succeed.');
        mockSvcutil.walkModulesSync = sinon.stub().returns([{ 'mount': sinon.stub().throws(error) }]);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });

    });


    /**
     * Test startup running with optional custom startup dir.
     * @param startupDir : custom startup dir, or undefined for default.
     * @param done: mocha done callback.
     */
    function testStartupRun(startupDir, done) {
        mockFs.existsSync = sinon.stub().withArgs(startupDir ? ('/' + startupDir) : '/startup').returns(true);

        const prom = Promise.resolve();
        const startups = [{ 'run': sinon.stub().returns(prom) }, { 'run': sinon.stub().returns(prom) }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(startups);

        const mockApp = {
            'use': sinon.spy()
        };

        const bootPromise = startupDir ? boot('/', mockApp, { 'startupDir': startupDir }) : boot('/', mockApp);

        bootPromise.then((app) => {

            expect(app).to.be.equal(mockApp);

            startups.forEach((s) => sinon.assert.calledWith(s.run, mockApp));

            done();

        }).catch(done);
    }

    it('Should run startups from startup dir', (done) => {
        testStartupRun(undefined, done);
    });

    it('Should run startups from custom startup dir', (done) => {
        testStartupRun('customStartup', done);
    });

    it('Should skip running startups if startup dir does not exists', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);

        const prom = Promise.resolve();
        const startups = [{ 'run': sinon.stub().returns(prom) }, { 'run': sinon.stub().returns(prom) }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(startups);

        const mockApp = {
            'use': sinon.spy()
        };

        boot('/', mockApp)
            .then(() => {
                startups.forEach((s) => sinon.assert.notCalled(s.run));
                done();
            }).catch((e) => done(e));

    });

    it('Should fail if startup run fails: error from: svcutil.walkModulesSync()', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/startup').returns(true);

        const error = new Error('Should not succeed.');
        mockSvcutil.walkModulesSync = sinon.stub().throws(error);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });

    });

    it('Should fail if startup run fails: error from: Startup.run', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/startup').returns(true);

        const error = new Error('Should not succeed.');
        const prom1 = Promise.reject(error);
        const prom2 = Promise.resolve();

        const startups = [{ 'run': sinon.stub().returns(prom1) }, { 'run': sinon.stub().returns(prom2) }];

        mockSvcutil.walkModulesSync = sinon.stub().returns(startups);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });
    });

    /**
     * Test schedule initializing with optional custom schedule dir.
     * @param scheduleDir : custom schedule dir, or undefined for default.
     * @param done: mocha done callback.
     */
    function testScheduleInit(scheduleDir, done) {
        mockFs.existsSync = sinon.stub().withArgs(scheduleDir ? ('/' + scheduleDir) : '/schedule').returns(true);

        const schedules = [{ 'init': sinon.spy() }, { 'init': sinon.spy() }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(schedules);

        const mockApp = {
            'use': sinon.spy()
        };

        const bootPromise = scheduleDir ? boot('/', mockApp, { 'scheduleDir': scheduleDir }) : boot('/', mockApp);

        bootPromise.then((app) => {

            expect(app).to.be.equal(mockApp);

            schedules.forEach((s) => sinon.assert.calledWith(s.init, mockApp));

            done();

        }).catch(done);
    }

    it('Should init schedules from schedule dir', (done) => {
        testScheduleInit(undefined, done);
    });

    it('Should init schedules from custom schedule dir', (done) => {
        testScheduleInit('customSchedule', done);
    });

    it('Should skip initializing schedules if schedule dir does not exists', (done) => {
        mockFs.existsSync = sinon.stub().returns(false);

        const schedules = [{ 'init': sinon.spy() }, { 'init': sinon.spy() }];
        mockSvcutil.walkModulesSync = sinon.stub().returns(schedules);

        const mockApp = {
            'use': sinon.spy()
        };

        boot('/', mockApp)
            .then(() => {
                schedules.forEach((s) => sinon.assert.notCalled(s.init));
                done();
            }).catch((e) => done(e));

    });

    it('Should fail if schedule init fails: error from: svcutil.walkModulesSync()', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/schedule').returns(true);

        const error = new Error('Should not succeed.');
        mockSvcutil.walkModulesSync = sinon.stub().throws(error);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });

    });

    it('Should fail if schedule init fails: error from: Schedule.init', (done) => {
        mockFs.existsSync = sinon.stub().withArgs('/schedule').returns(true);

        const error = new Error('Should not succeed.');

        const schedules = [{ 'init': sinon.stub().throws(error) }, { 'init': sinon.spy() }];

        mockSvcutil.walkModulesSync = sinon.stub().returns(schedules);

        const mockApp = {};

        boot('/', mockApp)
            .then(() => done(error))
            .catch((e) => {
                expect(e).to.be.equal(error);
                done();
            });
    });
});