CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255),
  `email` varchar(255) UNIQUE,
  `phone_number` varchar(255),
  `password_hash` varchar(255),
  `role` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `farms` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `farm_name` varchar(255),
  `location` varchar(255),
  `owner_user_id` int,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `rooms` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `farm_id` int,
  `name` varchar(255),
  `description` text,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `room_user` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `room_id` int,
  `access_level` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `sensors` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `room_id` int,
  `sensor_name` varchar(255),
  `sensor_type` varchar(255),
  `installation_date` date,
  `status` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `temperature_readings` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `sensor_id` int,
  `temperature_value` decimal,
  `recorded_at` timestamp,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `thresholds` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `room_id` int,
  `min_temperature` decimal,
  `max_temperature` decimal,
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `notifications` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` int,
  `room_id` int,
  `message` text,
  `notification_type` varchar(255),
  `sent_at` timestamp,
  `status` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp
);

CREATE TABLE `alert_logs` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `room_id` int,
  `sensor_id` int,
  `temperature_value` decimal,
  `alert_type` varchar(255),
  `triggered_at` timestamp,
  `resolved_at` timestamp,
  `status` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp
);

ALTER TABLE `farms` ADD FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`);

ALTER TABLE `rooms` ADD FOREIGN KEY (`farm_id`) REFERENCES `farms` (`id`);

ALTER TABLE `room_user` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `room_user` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

ALTER TABLE `sensors` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

ALTER TABLE `temperature_readings` ADD FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`);

ALTER TABLE `thresholds` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

ALTER TABLE `notifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `notifications` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

ALTER TABLE `alert_logs` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

ALTER TABLE `alert_logs` ADD FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`id`);

ALTER TABLE `temperature_readings` ADD FOREIGN KEY (`temperature_value`) REFERENCES `temperature_readings` (`id`);
