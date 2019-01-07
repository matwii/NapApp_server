var passport = require('passport');
var GoogleTokenStrategy = require('passport-google-token').Strategy;
const connection = require('./database')

module.exports = function () {
    passport.use(new GoogleTokenStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        },
        function (accessToken, refreshToken, profile, done) {
            const sql = "SELECT * FROM user WHERE google_id=?";
            return connection.query(sql, [profile.id], async function (err, res) {
                //No user found
                if (res.length === 0) {
                    const sql = "INSERT INTO user SET ?";
                    let newUserMysql = {
                        user_id: null,
                        email: profile.emails[0].value,
                        password: null,
                        name: profile.displayName,
                        google_id: profile.id,
                        google_image: profile._json.picture,
                        google_token: accessToken
                    };
                    connection.query(sql, newUserMysql, async function (err, rows) {
                        try {
                            newUserMysql.user_id = await rows.insertId;
                            return done(null, newUserMysql);
                        } catch (err) {
                            throw err;
                        }
                    })
                } else {
                    return done(err, res);
                }
            })
        }));
}