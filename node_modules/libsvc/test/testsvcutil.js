'use strict';

const _ = require('lodash');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const requireproxy = require('./requireproxy');

describe('svcutil', () => {

    const mockDirTree = {};

    const mockFs = {
        'readdirSync': (p) => {
            return _.keys(_.get(mockDirTree, p.split('/')));
        },

        'statSync': (p) => {
            const isDir = _.isPlainObject(_.get(mockDirTree, p.split('/')));
            return {
                'isDirectory': sinon.stub().returns(isDir)
            };
        }
    };

    function ModuleType1() { }
    function ModuleType2() { }

    const module1 = new ModuleType1();
    const module2 = new ModuleType2();

    const svcutil = requireproxy('../src/svcutil', { 'fs': mockFs, 'dir/a.js': module1, 'dir/b/c.js': module2 });

    describe('walkDirSync', () => {

        it('Lists files in a dir recursively', () => {
            mockDirTree['dir'] = {
                'a': {
                    'b': 1
                },
                'c': 1,
                'd': {
                    'e': {
                        'f': 1
                    }
                }
            };

            const files = svcutil.walkDirSync('dir');

            expect(files).to.be.deep.equal(['dir/a/b', 'dir/c', 'dir/d/e/f']);
        });
    });

    describe('walkModulesSync', () => {
        it('Loads modules in a dir recursively', () => {
            mockDirTree['dir'] = {
                'a.js': 1,
                'b': { 'c.js': 1 }
            };

            const modules = svcutil.walkModulesSync('dir');

            expect(modules).to.be.deep.equal([module1, module2]);
        });

        it('Loads modules in a dir recursively, filtered by type', () => {
            mockDirTree['dir'] = {
                'a.js': 1,
                'b': { 'c.js': 1 }
            };

            const modules = svcutil.walkModulesSync('dir', ModuleType2);

            expect(modules).to.be.deep.equal([module2]);
        });

    });
});