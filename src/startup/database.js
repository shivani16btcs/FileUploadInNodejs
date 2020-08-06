const libsvc = require('libsvc');
const Startup = libsvc.Startup;

function runAtBoot(app, done) {
    console.log('Database handshake successful');
    done();
}

const options = {
    priority: 0,
    timeout: 10000
};

module.exports = new Startup(runAtBoot, options);
