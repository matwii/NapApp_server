require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const connection = require('./database');
const passport = require('passport');
const bcrypt = require('bcrypt-nodejs');
const { generateToken, sendToken } = require('./utils/token.utils');
require('./passport')();


// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({extended: true}));

app.route('/car')
    .get(function (req, res, next) {
        connection.query(
            "SELECT * FROM `car`",
            function (error, results, fields) {
                if (error) throw error;
                res.send(results);
            }
        )
    });


app.route('/car/:id')
    .put(function (req, res, next) {
        const sql = "UPDATE car SET latitude=?, longitude=?, booked=? WHERE car_id=?";
        const {latitude, longitude, booked} = req.body;
        console.log(latitude, longitude);
        const {id} = req.params;
        connection.query(sql, [latitude, longitude, booked, id], function (err, result) {
            if (err) throw err;
            res.send("Car booked successfully");
        });
    });

app.route('/ride')
    .post(function (req, res, next) {
        const sql = 'INSERT INTO ride SET ?';
        const {car_id, user_id, start_latitude, start_longitude, start_time, via_latitude, via_longitude, via_time, end_latitude, end_longitude, end_time} = req.body;
        const values = {
            ride_id: null,
            car_id: car_id,
            user_id: user_id,
            start_latitude: start_latitude,
            start_longitude: start_longitude,
            start_time: start_time,
            via_latitude: via_latitude,
            via_longitude: via_longitude,
            via_time: via_time,
            end_latitude: end_latitude,
            end_longitude: end_longitude,
            end_time: end_time,
            booked_time: new Date().toLocaleString()
        };
        console.log(req.body);
        connection.query(sql, values, function (err, result) {
            if (err) throw err;
            console.log("successfully added ride");
            res.send("successfully added ride " + result.affectedRows);
        });
    });

app.route('/auth/google')
    .post(passport.authenticate('google-token', {session: false}), function(req, res, next) {
        if (!req.user) {
            return res.send(401, 'User Not Authenticated');
        }
        req.auth = {
            id: req.user.google_id
        };
        next();
    }, generateToken, sendToken);

app.route('/auth/login')
    .post(passport.authenticate('local-login', {
        session: false
    }), function(req, res, next) {
        if (!req.user) {
            return res.send(401, 'User Not Authenticated');
        }
        req.auth = {
            id: req.user.user_id
        };
        next();
    }, generateToken, sendToken);

app.get('/', (req, res) => res.send('Working!'));

// Port 8080 for Google App Engine
app.set('port', process.env.PORT || 3000);
app.listen(3000);
