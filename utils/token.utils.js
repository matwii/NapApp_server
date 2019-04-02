const jwt = require('jsonwebtoken');

const createToken = function(auth) {
    return jwt.sign({
            id: auth.id,
            role: auth.role
        }, process.env.JWT_SECRET);
};

const createCarToken = function(auth) {
    return jwt.sign({
        id: auth.id,
    }, process.env.JWT_SECRET);
};

module.exports = {
    generateToken: function(req, res, next) {
        req.token = createToken(req.auth);
        return next();
    },
    sendToken: function(req, res) {
        res.setHeader('x-auth-token', req.token);
        const user = {
            email: req.user.email,
            name: req.user.name,
            token: req.token,
            google_image: req.user.google_image ? req.user.google_image : null
        };
        return res.status(200).send(JSON.stringify(user));
    },
    generateCarToken: function(req, res, next) {
        req.token = createCarToken(req.auth);
        return next();
    },
    sendCarToken: function(req, res) {
        res.setHeader('x-auth-token', req.token);
        const car = {
            token: req.token,
            id: req.auth.id
        };
        return res.status(200).send(JSON.stringify(car));
    },
};
