'use strict';

const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');
const ApiError = require('../src/ApiError');
const tv4Formats = require('../src/tv4Formats');
const Chain = require('../src/Chain');

describe('Route', () => {

    function mockJsonMw(req, res, next) {
        next();
    }

    const mockJsonParser = sinon.stub().returns(mockJsonMw);

    const mockTv4FreshApi = { 'addFormat': sinon.spy() };

    const mockTv4 = { 'freshApi': () => mockTv4FreshApi };

    const Route = requireproxy('../src/Route', { './jsonParser': mockJsonParser, 'tv4': mockTv4 });

    it('Should add tv4 formats.', () => {
        sinon.assert.calledWith(mockTv4FreshApi.addFormat, tv4Formats);
    });

    it('Should extent Chain', () => {
        expect(new Route('get', '/')).to.be.instanceof(Chain);
    });

    describe('constructor', () => {

        it('Should require method as a String', () => {
            expect(() => new Route(123, '/')).to.throw(Error);
            expect(() => new Route([], '/')).to.throw(Error);
            expect(() => new Route('get', '/')).to.not.throw();
        });

        it('Should require path as a String or RegExp', () => {
            expect(() => new Route('get', 123)).to.throw(Error);
            expect(() => new Route('get', [])).to.throw(Error);
            expect(() => new Route('get', '/')).to.not.throw();
            expect(() => new Route('get', /.*/)).to.not.throw();
        });

        it('Should create a Route instance', () => {
            expect(new Route('get', '/')).to.be.instanceof(Route);
        });

        it('Should call super constructor', () => {
            expect(new Route('get', '/')).to.have.property('_fns');
        });

    });

    describe('addFormat()', () => {

        it('Should call tv4.addFormat()', () => {
            mockTv4FreshApi.addFormat.reset();
            const formats = {};
            Route.addFormat(formats);
            sinon.assert.calledWith(mockTv4FreshApi.addFormat, formats);
        });
    });

    describe('setMeta', () => {

        it('Should set meta data', () => {
            const route = new Route('get', '/');
            const meta = {};

            route.setMeta(meta);

            expect(route.meta).to.be.equal(meta);
        });
    });

    describe('mount()', () => {

        it('Should mount Route on provided Router using route method and path', () => {
            const route = new Route('test_method', 'test_path');

            const router = {
                'test_method': sinon.spy()
            };

            route.mount(router);

            sinon.assert.calledWith(router.test_method, 'test_path', sinon.match.func);
        });

        it('Should throw an error if Router does not have route method function', () => {
            const route = new Route('test_method', 'test_path');
            const router = {};

            expect(() => route.mount(router)).to.throw(Error);
        });

        it('Should prepend json parsing middleware to Router by default', () => {
            const route = new Route('post', '/');

            const router = {
                'post': sinon.spy()
            };

            route.mount(router);

            sinon.assert.calledWith(router.post, '/', sinon.match.func);
            expect(route.has(mockJsonMw)).to.be.true;
        });

        it('Should not prepend json parsing middleware to Router, if disabled in constructor options', () => {
            const route = new Route('post', '/', {
                'parseJson': false
            });

            const router = {
                'post': sinon.spy()
            };

            route.mount(router);
            sinon.assert.calledWith(router.post, '/', sinon.match.func);
            expect(route.has(mockJsonMw)).to.be.false;
        });

        it('Should use json parser options provided in constructor options', () => {
            const parseOptions = {};

            const route = new Route('post', '/', {
                'parseOptions': parseOptions
            });

            const router = {
                'post': sinon.spy()
            };

            mockJsonParser.reset();

            route.mount(router);

            sinon.assert.calledWith(router.post, '/', sinon.match.func);
            expect(route.has(mockJsonMw)).to.be.true;

            sinon.assert.calledWith(mockJsonParser, parseOptions);
        });

    });

    describe('use()', () => {

        it('Should add given middleware to route middleware,', () => {
            const route = new Route('post', '/');

            const router = {
                'post': sinon.spy()
            };

            const m1 = sinon.spy();
            const m2 = sinon.spy();


            route.use(m1).use(m2).mount(router);

            sinon.assert.calledWith(router.post, '/', sinon.match.func);
            expect(route.has(m1)).to.be.true;
            expect(route.has(m2)).to.be.true;
        });

    });

    describe('validate[Params|Query|Body]()', () => {

        it('Should validate req.[params|query|body] with tv4 schema.', (done) => {
            const route = new Route('post', '/');

            const router = {
                'post': sinon.spy()
            };

            const schema = {};
            route.validateParams(schema)
                .validateQuery(schema)
                .validateBody(schema)
                .mount(router);

            sinon.assert.calledWith(router.post, '/', sinon.match.func);
            mockTv4FreshApi.validateResult = sinon.stub().returns({ 'valid': true });

            const req = {
                'params': {},
                'query': {},
                'body': {}
            };

            const res = {};

            route.asFn(req, res, (err) => {
                sinon.assert.calledThrice(mockTv4FreshApi.validateResult);
                sinon.assert.calledWith(mockTv4FreshApi.validateResult, req.params, schema);
                sinon.assert.calledWith(mockTv4FreshApi.validateResult, req.query, schema);
                sinon.assert.calledWith(mockTv4FreshApi.validateResult, req.body, schema);
                done(err);
            });
        });

        it('Should forward an ApiError if req.[params|query|body] is not valid as per schema.', (done) => {
            const route = new Route('post', '/');

            const router = {
                'post': sinon.spy()
            };

            const schema = {};
            route.validateParams(schema)
                .validateQuery(schema)
                .validateBody(schema)
                .mount(router);

            sinon.assert.calledWith(router.post, '/', sinon.match.func);

            const result = { 'valid': false };
            mockTv4FreshApi.validateResult = sinon.stub().returns(result);

            const req = {};
            const res = {};

            route.asFn(req, res, (err) => {
                sinon.assert.calledOnce(mockTv4FreshApi.validateResult);
                expect(err).to.be.instanceof(ApiError);
                done();
            });

        });

    });

});