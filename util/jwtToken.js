const JWT = require('jsonwebtoken');
const async = require('async');
const libsvc = require('libsvc');
const getConfig = libsvc.getConfig;

const jwtToken = {};
module.exports = jwtToken;

jwtToken.create = (payload, config) => {
    return JWT.sign(
        payload,
        config.secretKey,
        { expiresIn: config.expiresIn }
    );
};

jwtToken.createToken = (data) => {
    const payload = {
        environment: getConfig('environment'),
        user: {
            email: data.email
        }
    };

    return jwtToken.create(payload, getConfig('auth.SystemAdmin'));
};

jwtToken.verify = (token, secretKey) => {
    return new Promise((resolve, reject) => {
        JWT.verify(token, secretKey, (error, decode) => {
            if (error) {
                reject(error);
            } else {
                resolve(decode);
            }
        });
    });
};

jwtToken.verifyToken = (token, authorizationFor) => {
    if (authorizationFor instanceof Array) {
        return new Promise((resolve, reject) => {
            async.eachSeries(authorizationFor, (authorization, callback) => {
                jwtToken.verify(token, getConfig('auth')[authorization].secretKey).then(result => {
                    resolve(result);
                }).catch(error => {
                    callback();
                });
            }, error => {
                reject(error);
            });
        });
    } else {
        return verify(token, getConfig('auth')[authorizationFor].secretKey);
    }
};
