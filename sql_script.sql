USE NapApp;
SET SQL_SAFE_UPDATES = 0;

SELECT * FROM user;
SELECT * FROM car;
SELECT * FROM ride;
SELECT * FROM role;

DELETE FROM ride;
DELETE FROM user;

ALTER TABLE ride
ADD COLUMN booked_time DATETIME NOT NULL AFTER end_longitude;

ALTER TABLE user
ADD COLUMN created datetime DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user
ADD COLUMN role_id integer;

UPDATE car 
SET booked=0
WHERE car_id=2;

SELECT car.reg_number, car.brand, car.modell, ride.booked_time
FROM car
INNER JOIN ride ON car.car_id=ride.car_id
WHERE ride.user_id=1;

CREATE TABLE role (
	role_id int auto_increment,
    role_name varchar(20),
    PRIMARY KEY (role_id)
);

INSERT INTO role 
VALUES(1, 'admin');

INSERT INTO role 
VALUES(2, 'user');



