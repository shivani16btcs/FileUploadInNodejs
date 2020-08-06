const libsvc = require('libsvc');
const Route = libsvc.Route;

const { authorization } = require('../controller');

const login = new Route('post', '/login');
module.exports = login;

login.setMeta({
    isPublic: true
});

login.validateBody({
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email'
        },
        password: {
            type: 'string',
            format: 'nonEmptyOrBlank'
        }
    },
    required: ['email', 'password']
});

login.use((req, res, next) => {
    authorization.validateCredentails(
        req.body.email,
        req.body.password
    ).then(result => {
        res.setHeader('Authorization', result.token);
        res.locals.user = result;
        return next();
    }).catch(next);
});

login.use((req, res, next) => {
    res.json(res.locals.user);
});
