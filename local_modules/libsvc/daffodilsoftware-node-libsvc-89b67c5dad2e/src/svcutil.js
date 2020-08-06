const _ = require('lodash');
const fs = require('fs');
const path = require('path');


/**
 * Walks a directory tree syncronously and returns file paths. 
 * 
 * @param {String} rootDir - path to base directory.
 * @param {Array} [files] - array to store results in. 
 * @returns {[String]} file paths.
 */
function walkDirSync(rootDir, files) {
    // ensure collect init
    files = files || [];

    // read entries in directory
    const entries = fs.readdirSync(rootDir);

    // stat entries
    entries.forEach((entry) => {

        const entryPath = path.join(rootDir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
            // recurse into sub directories
            walkDirSync(entryPath, files);
        } else {
            // collect file paths
            files.push(entryPath);
        }

    });

    // all done
    return files;
}

/**
 * Walks directory synchronously to load modules of given type.
 * 
 * @param {String} rootDir - base directory.
 * @param {Function} [filterType] - only return module instances of this type.
 * @returns {[Function]} module instances.
 */
function walkModulesSync(rootDir, filterType) {
    // get files
    const files = walkDirSync(rootDir, []);

    // get js files
    const scripts = files.filter((file) => _.endsWith(file, ".js"));

    // require files
    const loaded = scripts.map(require);


    if (filterType) {
        // return instance of filterType
        return loaded.filter((m) => m instanceof filterType);
    } else {
        // return all
        return loaded;
    }

}

/**
 * Utility functions.
 */
const svcutil = {
    'walkDirSync': walkDirSync,
    'walkModulesSync': walkModulesSync
};

/**
 * @type {svcutil}
 */
module.exports = svcutil;