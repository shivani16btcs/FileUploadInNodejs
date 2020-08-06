const libsvc = require('libsvc');
const APIError = libsvc.ApiError;

const { jwtToken } = require('../../util');

const Authorization = {};
module.exports = Authorization;

Authorization.validateCredentails = (email, password) => {
    return new Promise((resolve, reject) => {
        if (email == 'admin@stallion.io' && password == 'admin') {
            const token = jwtToken.createToken({ email });
            resolve({ email, token });
        } else {
            throw new APIError('Invalid credentails');
        }
    });
};
