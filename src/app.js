const express = require('express');
const cors = require('cors');

const libsvc = require('libsvc');
const getConfig = libsvc.getConfig;

const { authCheck } = require('./middleware');

const app = express();
app.use(cors());

function setupRouteAuth(route) {
    if (route.meta && !route.meta.isPublic) {
        route.prepend(authCheck(
            route.meta.isPublic,
            route.meta.authorizationFor
        ));
    }
}

const options = {
    preMountHook: setupRouteAuth
};

libsvc.boot(__dirname, app, options).then((app) => {
    app.listen(getConfig('server.http.port'), () => {
        console.log(`Server Listen: ${getConfig('server.http.port')} port`);
        console.log(`Server Environment: ${getConfig('environment')}`);
    });
}).catch((err) => {
    throw err;
});
