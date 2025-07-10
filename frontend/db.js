// db.js
// MySQL connection setup for Node.js backend

const mysql = require("mysql2");

// Update these credentials as needed
dbConfig = {
  host: process.env.DB_HOST || "34.135.188.4",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "77379041Hanzu!",
  database: process.env.DB_NAME || "inrent-mysql-instance",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT): 3306
};

const pool = mysql.createPool(dbConfig);

module.exports = pool.promise();
