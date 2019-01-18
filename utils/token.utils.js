const jwt = require('jsonwebtoken');

const createToken = function(auth) {
    return jwt.sign({
            id: auth.id
        }, process.env.JWT_SECRET);
};

module.exports = {
    generateToken: function(req, res, next) {
        req.token = createToken(req.auth);
        return next();
    },
    sendToken: function(req, res) {
        res.setHeader('x-auth-token', req.token);
        return res.status(200).send(JSON.stringify(req.token));
    }
};
