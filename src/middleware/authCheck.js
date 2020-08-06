const libsvc = require('libsvc');
const APIError = libsvc.ApiError;

const { jwtToken } = require('../../util');

module.exports = (isPublic, authorizationFor) => {
    return (req, res, next) => {
        const token = req.get('Authorization') || req.query.Authorization;

        if (isPublic) {
            return next();
        } else if (token) {
            jwtToken.verifyAuthToken(token, authorizationFor).then(decrypt => {
                res.locals.user = decrypt;
            });
            return next();
        } else {
            throw new APIError('Please provide auth token.')
                .withCode(401)
                .withStatus('MISSING_TOKEN');
        }
    };
};
