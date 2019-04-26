require('dotenv').config();
const jwt = require('jsonwebtoken');
const cars = require('./car')

module.exports = {
    addRideSocket: function (socket, io, connection) {
        socket.on('addRide', (req) => {
            const sql = 'INSERT INTO ride SET ?';
            const {car_id, token, start_latitude, start_longitude, start_time,
                via_latitude, via_longitude, via_time, end_latitude, end_longitude, end_time} = req;
            jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
                if (err) return new Error('Authentication error');
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
                    booked_time: null,
                    end_time: end_time,
                    canceled: 0
                };
                connection.query(sql, values, function (err, result) {
                    if (err) throw err;
                    const values = {
                        ride_status_id: null,
                        ride_id: result.insertId,
                        status_id: 1,
                        status_time: null,
                        status_details: null
                    };
                    connection.query('INSERT INTO ride_status SET ?', values, function (err, res) {
                        if (err) throw err;
                        connection.query(
                            "SELECT r.ride_id, r.start_latitude, r.start_longitude, r.via_latitude, \n" +
                            "r.via_longitude, r.end_latitude, r.end_longitude, \n" +
                            "rs.status_id, u.name FROM ride AS r\n" +
                            "JOIN ride_status AS rs ON r.ride_id=rs.ride_id\n" +
                            "JOIN user AS u ON r.user_id=u.user_id\n" +
                            "WHERE r.car_id=? AND (rs.status_id=1 OR rs.status_id=2)", [car_id], function (err, res) {
                                initialRides = res;
                                io.emit('car_rides_' + car_id, initialRides);
                                cars.changeCarStatus(connection, 1, car_id, io);
                            }
                        )
                    });
                });
            })
        });
    },
    updateRide: function (socket, io, connection) {
        socket.on('updateRide', (status_id, ride_id, car_id) => {
           const sql = 'UPDATE ride_status SET status_id=? WHERE ride_id=?';
           connection.query(sql, [status_id, ride_id], function (err, res) {
               if (err) throw err;
               connection.query(
                   "SELECT r.ride_id, r.start_latitude, r.start_longitude, r.via_latitude, \n" +
                   "r.via_longitude, r.end_latitude, r.end_longitude, \n" +
                   "rs.status_id, u.name FROM ride AS r\n" +
                   "JOIN ride_status AS rs ON r.ride_id=rs.ride_id\n" +
                   "JOIN user AS u ON r.user_id=u.user_id\n" +
                   "WHERE r.car_id=? AND (rs.status_id=1 OR rs.status_id=2)", [car_id], function (err, res) {
                       initialRides = res;
                       console.log(res);
                       io.emit('car_rides_' + car_id, initialRides);
                   }
               )
           })
        })
    },
    getUserRides: function (req, res, connection, io) {
        jwt.verify(req.query.token, process.env.JWT_SECRET, function (err, decoded) {
            if (err) res.send('Error');
            const sql = "SELECT r.*, rs.status_id, s.status_name, c.brand, c.modell FROM ride AS r\n" +
                "INNER JOIN ride_status AS rs ON r.ride_id=rs.ride_id\n"  +
                "INNER JOIN status AS s ON rs.status_id=s.status_id\n" +
                "INNER JOIN car AS c ON r.car_id=c.car_id WHERE r.user_id=?";
            connection.query(sql, [decoded.id], function (err, result) {
                if (err) res.send('ERROR');
                console.log(result)
                io.emit('initial cars', initialCars)
                res.send(result);
            })
        });
    }
};