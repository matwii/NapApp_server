require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const connection = require('./database');
const passport = require('passport');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const {generateToken, generateCarToken, sendToken, sendCarToken} = require('./utils/token.utils');
require('./passport')();

let server;
let io;
let socketCount = 0;
let initialUsers = [];
let initialCars = [];
let initialRides = [];

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({extended: true}));
// Add headers

app.use(cors())

const corsOptions = {
    exposedHeaders: "x-auth-token",
};

app.use(cors(corsOptions));

app.route('/car')
    .get(function (req, res, next) {
        connection.query(
            "SELECT * FROM `car`",
            function (error, results, fields) {
                if (error) console.log(error);
                res.send(results);
            }
        )
    });

app.route('/user/:id')
    .delete(function (req, res, next) {
        jwt.verify(req.body.token, process.env.JWT_SECRET, function (err, decoded) {
            if (err) return new Error('Authentication error');
            if (decoded.role === 1){
                const sql = "DELETE FROM user WHERE user_id=?";
                const { id } = req.params;
                connection.query(sql, [id], function (err, result) {
                    if (err) res.send('Error');
                    res.send("Car booked successfully");
                })
            }
        })
    });


app.route('/car/:id')
    .put(function (req, res, next) {
        jwt.verify(req.body.token, process.env.JWT_SECRET, function (err, decoded) {
            const sql = "UPDATE car SET latitude=?, longitude=? WHERE car_id=?";
            const {latitude, longitude} = req.body;
            console.log(latitude, longitude);
            const {id} = req.params;
            connection.query(sql, [latitude, longitude, id], function (err, result) {
                if (err) throw err;
                for (const i in initialCars) {
                    if (initialCars[i].car_id === id) {
                        initialCars[i].latitude = latitude;
                        initialCars[i].longitude = longitude;
                        break; //Stop this loop, we found it!
                    }
                }
                io.emit('initial cars', initialCars)
            });
        })
    });

app.route('/car/:id')
    .delete(function (req, res, next) {
        const sql = "DELETE FROM `car` WHERE car_id=?";
        const {id} = req.params;
        connection.query(sql, [id], function (err, result) {
            if (err) return res.send(400, err.sqlMessage);
            initialCars = initialCars.filter(car => car.car_id !== parseInt(id));
            res.send('Car deleted successfully');
            io.emit('initial cars', initialCars);
        })
    });

/**
 * Adds a new ride to the database.
 */
app.route('/ride')
    .post(function (req, res, next) {
        const sql = 'INSERT INTO ride SET ?';
        const {car_id, token, start_latitude, start_longitude, start_time, via_latitude, via_longitude, via_time, end_latitude, end_longitude, end_time} = req.body;
        jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
            const values = {
                ride_id: null,
                car_id: car_id,
                user_id: decoded.id,
                start_latitude: start_latitude,
                start_longitude: start_longitude,
                start_time: start_time,
                via_latitude: via_latitude,
                via_longitude: via_longitude,
                via_time: via_time,
                end_latitude: end_latitude,
                end_longitude: end_longitude,
                booked_time: new Date().toLocaleString(),
                end_time: end_time,
                canceled: 0
            };
            connection.query(sql, values, function (err, result) {
                if (err) throw err;
                const values = {
                    ride_status_id: null,
                    ride_id: result.insertId,
                    status_id: 1,
                    status_time: new Date().toLocaleString(),
                    status_details: null
                };
                connection.query('INSERT INTO ride_status SET ?',values);
                res.send("successfully added ride " + result);
            });
        })
    });

app.route('/car')
    .post(function (req, res, next) {
        const sql = 'INSERT INTO car SET ?';
        let { car } = req.body;
        connection.query(sql, car, function (err, result) {
            if (err) return res.send(400, err.sqlMessage);
            car.car_id = result.insertId;
            initialCars.push(car);
            io.emit('initial cars', initialCars);
            res.send('Car added successfully')
        })
    });

app.route('/auth/google')
    .post(passport.authenticate('google-token', {session: false}), function (req, res, next) {
        if (!req.user) {
            return res.send(401, 'User Not Authenticated');
        }
        req.auth = {
            id: req.user.user_id,
            role: req.user.role_id,
        };
        next();
    }, generateToken, sendToken);

app.route('/auth/linkedin')
    .post(passport.authenticate('linkedin-token', {session: false}), function (req, res, next) {
        if (!req.user) {
            return res.send(401, 'User Not Authenticated');
        }
        req.auth = {
            id: req.user.user_id,
            role: req.user.role_id,
        };
        next();
    }, generateToken, sendToken);

app.route('/auth/login-admin')
    .post(passport.authenticate('local-login-admin', {
        session: false,
    }), function (req, res, next) {
        if (!req.user) {
            return res.send(401, 'User Not Authenticated');
        }
        req.auth = {
            id: req.user.user_id,
            role: req.user.role_id,
        };
        next();
    }, generateToken, sendToken);

app.route('/auth/login-car')
    .post(function (req, res, next) {
        const { regNr } = req.body;
        connection.query("SELECT car_id FROM car WHERE reg_number = ?", [regNr], function (err, rows) {
            if (err)
                return res.status(401).send('Error occured');
            if (!rows.length) {
                return res.status(401).send('No car found')
            }
            req.auth = {
                id: rows[0].car_id,
            };
            next();
        })
    }, generateCarToken, sendCarToken);

app.get('/', (req, res) => res.send('Working!'));

// Port 8080 for Google App Engine
app.set('port', process.env.PORT || 8080);

server = app.listen(8080, function () {
    console.log('server running on port 8080');
});

io = require('socket.io')(server);

io.on('connection', function (socket) {
    socketCount++;
    console.log('Users connected ' + socketCount);
    // Let all sockets know how many are connected
    io.sockets.emit('users connected', socketCount);

    socket.on('error', function(err) {
        console.log("Client socket error:", err);
    });

    socket.on('disconnect', function () {
        // Decrease the socket count on a disconnect, emit
        socketCount--;
        //console.log('Users connected ' + socketCount);
        console.log('A user disconnected');
        io.sockets.emit('users connected', socketCount)
    });

    socket.on('bookCar', function (carId, bookedBit) {
        console.log('BOOKCAR', carId, bookedBit);
        const sql = "UPDATE car SET booked=? WHERE car_id=?";
        connection.query(sql, [bookedBit, carId], function (err, res) {
            const foundIndex = initialCars.findIndex(el => el.car_id === carId);
            initialCars[foundIndex].booked = bookedBit;
            io.emit('initial cars', initialCars);
        })
    });
    
    socket.on('getCarRides', function (carId) {
        const sql = "SELECT * FROM ride WHERE car_id=?";
        connection.query(sql, [carId], function (err, res) {
            initialRides = res;
            io.emit('car_rides', initialRides);
        })
    });

    if (socket.handshake.query && socket.handshake.query.token) {
        jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET, function (err, decoded) {
            if (err) return new Error('Authentication error');
            //Checks to see if the user is admin.
            if (decoded.role === 1){
                connection.query(
                    "SELECT user_id, email, name, role_id, created FROM `user`",
                    function (error, results, fields) {
                        if (error) throw error;
                        initialUsers = results;
                        io.emit('initial users', initialUsers);
                    });

                socket.on('deleteUser', function (userId) {
                    const sql = 'DELETE FROM user WHERE user_id=?';
                    connection.query(sql, [userId], function (err, result) {
                        if (err) throw err;
                        initialUsers = initialUsers.filter(user => user.user_id !== userId);
                        io.emit('initial users', initialUsers);
                    })
                });
                socket.on('addUser',async function (user) {
                    const sql = 'INSERT INTO user SET ?';
                    const {name, email, password, role } = user;
                    const salt = await bcrypt.genSaltSync(10);
                    const hashedPassword = await bcrypt.hashSync(password, salt);
                    const values = {
                        user_id: null,
                        email,
                        password: hashedPassword,
                        name,
                        google_id: null,
                        google_token: null,
                        google_image: null,
                        role_id: role,
                        created: null
                    };
                    connection.query(sql, values, function (err, result) {
                        if (err) throw err;
                        user.user_id = result.insertId;
                        initialUsers.push(user);
                        io.emit('initial users', initialUsers);
                    });
                });
            }
        })
    }

    connection.query(
        "SELECT * FROM `car`",
        function (error, cars, fields) {
            if (error) throw error;
            initialCars = cars;
            io.emit('initial cars', initialCars);
        });

    connection.query(
        "SELECT * FROM `ride`",
        function (error, results, fields) {
            if (error) throw error;
            io.emit('initial rides', results);
        })

    socket.on('updateCarPosition', function (car_id, token, latitude, longitude) {
        const sql = "UPDATE car SET latitude=?, longitude=? WHERE car_id=?";
        connection.query(sql, [latitude, longitude, car_id], function (err, res) {
            console.log(latitude, longitude)
            const foundIndex = initialCars.findIndex(el => el.car_id === car_id);
            initialCars[foundIndex].latitude = latitude;
            initialCars[foundIndex].longitude = longitude;
            io.emit('initial cars', initialCars);
        })
    })
});
