const passport = require('passport');
const GoogleTokenStrategy = require('passport-google-token').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const connection = require('./database');
const LinkedInStrategy = require('passport-linkedin-token-oauth2').Strategy;
const bcrypt = require('bcrypt-nodejs');

module.exports = function () {
    passport.use(new LinkedInStrategy({
            clientID: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        function (accessToken, refreshToken, profile, done) {
            const sql = "SELECT * FROM user WHERE email=?";
            return connection.query(sql, [profile.emails[0].value], async function (err, res) {
                //No user found
                if (res.length === 0) {
                    const sql = "INSERT INTO user SET ?";
                    let newUserMysql = {
                        user_id: null,
                        email: profile.emails[0].value,
                        password: null,
                        name: `${profile.name.givenName} ${profile.name.familyName}`,
                        google_id: null,
                        google_image: null,
                        google_token: null,
                        role_id: 2
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
                    return done(err, res[0]);
                }
            })
        }));

    passport.use(new GoogleTokenStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        function (accessToken, refreshToken, profile, done) {
            const sql = "SELECT * FROM user WHERE email=?";
            return connection.query(sql, [profile.emails[0].value], async function (err, res) {
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
                        google_token: accessToken,
                        role_id: 2
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
                    return done(err, res[0]);
                }
            })
        }));
    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'
    passport.use(
        'local-login-admin',
        new LocalStrategy({
                // by default, local strategy uses username and password, we will override with email
                usernameField: 'email',
                passwordField: 'password',
                passReqToCallback: true // allows us to pass back the entire request to the callback
            },
            async function (req, email, password, done) { // callback with email and password from our form
                connection.query("SELECT * FROM user WHERE email = ?", [email], function (err, rows) {
                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, {message: 'Incorrect username.'});
                    }

                    // if the user is found but the password is wrong
                    if (!bcrypt.compareSync(password, rows[0].password))
                        return done(null, false, {message: 'Incorrect password.'}); // create the loginMessage and save it to session as flashdata

                    if (rows[0].role_id !== 1)
                        return done(null, false, {message: 'User is not admin'})

                    // all is well, return successful user
                    return done(null, rows[0]);
                });
            })
    );
    passport.use(
        'local-login-car',
        new LocalStrategy({
                // by default, local strategy uses username and password, we will override with email
                passReqToCallback: true // allows us to pass back the entire request to the callback
            },
            async function (req, username, password, done) { // callback with email and password from our form
                console.log(req, username)
                connection.query("SELECT car_id FROM car WHERE reg_number = ?", [username], function (err, rows) {
                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, {message: 'Incorrect registration number.'});
                    }
                    // all is well, return successful user
                    return done(null, rows[0]);
                });
            })
    );
};
