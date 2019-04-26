module.exports = {
    changeCarStatus: function (connection, bookedBit, car_id, io) {
        connection.query('UPDATE car SET booked=? WHERE car_id=?', [bookedBit, car_id], function (err, res) {
            if (err) throw err;
            const foundIndex = initialCars.findIndex(x => x.car_id === car_id)
            initialCars[foundIndex].booked = bookedBit;
            io.emit('initial cars', initialCars);
        });
    },
    getCars: function (connection, io) {
        connection.query(
            "SELECT * FROM `car`",
            function (error, cars, fields) {
                if (error) throw error;
                initialCars = cars;
                io.emit('initial cars', initialCars);
            });
    }
};