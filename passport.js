var passport = require('passport');
var GoogleTokenStrategy = require('passport-google-token').Strategy;
var LocalStrategy = require('passport-local').Strategy;
const connection = require('./database');
var bcrypt = require('bcrypt-nodejs');

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
    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
    passport.use(
        'local-login',
        new LocalStrategy({
                // by default, local strategy uses username and password, we will override with email
                usernameField : 'email',
                passwordField : 'password',
                passReqToCallback : true // allows us to pass back the entire request to the callback
            },
            async function(req, email, password, done) { // callback with email and password from our form
                connection.query("SELECT * FROM user WHERE email = ?",[email], function(err, rows){
                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, { message: 'Incorrect username.' });
                    }

                    // if the user is found but the password is wrong
                    if (!bcrypt.compareSync(password, rows[0].password))
                        return done(null, false, { message: 'Incorrect password.' }); // create the loginMessage and save it to session as flashdata

                    if (rows[0].role_id !== 1)
                        return done(null, false, {message: 'User is not admin'})

                    // all is well, return successful user
                    return done(null, rows[0]);
                });
            })
    );
};
