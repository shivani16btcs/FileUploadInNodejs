'use strict';

const _ = require('lodash');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const beforeEach = mocha.beforeEach;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');


describe('getConfig', () => {

    // mock module dependencies
    const mockWinston = {
        'log': sinon.spy()
    };

    const accessResults = {};
    const readResults = {};
    const mockFs = {
        accessSync: sinon.spy((f) => {
            if (accessResults[f]) {
                return accessResults[f];
            } else {
                throw new Error('ENOENT');
            }
        }),

        readFileSync: sinon.spy((f) => readResults[f])
    };

    // module under test
    let getConfig;

    // refresh  module before each test
    beforeEach(() => {
        // clear mock results
        _.keys(accessResults).forEach((k) => _.unset(accessResults, k));
        _.keys(readResults).forEach((k) => _.unset(readResults, k));

        // reload module
        getConfig = requireproxy('../src/getConfig', {
            'fs': mockFs,
            'winston': mockWinston,
        });
    });

    it('Should be a function.', () => {
        expect(getConfig).to.be.a('function');
    });

    it('Should have a read only function property init.', () => {
        expect(getConfig.init).to.be.a('function');
        expect(() => { getConfig.init = 'a'; }).to.throw();
    });

    describe('getConfig.init()', () => {

        it('Should require configDir to be a String.', () => {
            expect(() => getConfig.init(1)).to.throw(Error);
            expect(() => getConfig.init({})).to.throw(Error);
            expect(() => getConfig.init([])).to.throw(Error);
        });

        it('Should require env to be a String.', () => {
            expect(() => getConfig.init('/', 1)).to.throw(Error);
            expect(() => getConfig.init('/', {})).to.throw(Error);
            expect(() => getConfig.init('/', [])).to.throw(Error);
        });

        it('Should throw if called again.', () => {
            getConfig.init('/');
            expect(() => getConfig.init('/')).to.throw(Error);
        });

        it('Should read default.json from configDir.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = true;
            readResults['/default.json'] = '{"a":1}';

            getConfig.init('/');

            expect(getConfig()).to.be.deep.equal({ a: 1 });
        });

        it('Should merge default.json with json corresponding to env arg.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = true;
            readResults['/default.json'] = '{"a":1}';
            accessResults['/custom.json'] = true;
            readResults['/custom.json'] = '{"b":1}';

            getConfig.init('/', 'custom');
            expect(getConfig()).to.be.deep.equal({ a: 1, b: 1 });
        });

        it('Should log an Error if default.json is not found.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = false;
            readResults['/default.json'] = '{"a":1}';

            mockWinston.log.reset();
            getConfig.init('/');
            expect(getConfig()).to.be.deep.equal({});
            sinon.assert.called(mockWinston.log);
        });

        it('Should log an Error if env specific json is not found.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = true;
            readResults['/default.json'] = '{"a":1}';
            accessResults['/custom.json'] = false;
            readResults['/custom.json'] = '{"b":1}';

            mockWinston.log.reset();
            getConfig.init('/', 'custom');
            expect(getConfig()).to.be.deep.equal({ a: 1 });
            sinon.assert.called(mockWinston.log);
        });

    });

    describe('getConfig()', () => {
        it('Should throw if init() is not called first.', () => {
            expect(getConfig).to.throw(Error);
        });

        it('Should return an immutable config from json files.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = true;
            readResults['/default.json'] = '{"a":1}';

            getConfig.init('/');

            const c = getConfig();

            expect(c).to.be.deep.equal({ a: 1 });
            expect(() => { c.a = 2; }).to.throw();
        });

        it('Should throw requested path does not exist in config object.', () => {
            mockFs.accessSync.reset();
            mockFs.readFileSync.reset();

            accessResults['/default.json'] = true;
            readResults['/default.json'] = '{"a":{"b":1}}';

            getConfig.init('/');
            expect(() => getConfig('b')).to.throw(Error);
            expect(() => getConfig(['a', 'c'])).to.throw(Error);

            expect(getConfig()).to.be.deep.equal({ a: { b: 1 } });
            expect(getConfig('a')).to.be.deep.equal({ b: 1 });
            expect(getConfig(['a'])).to.be.deep.equal({ b: 1 });
            expect(getConfig(['a', 'b'])).to.be.equal(1);
            expect(getConfig('a', 'b')).to.be.equal(1);
            expect(getConfig('a.b')).to.be.equal(1);
        });
    });
});