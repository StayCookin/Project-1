// db.js
// MySQL connection setup for Node.js backend
require ("dotenv").config();
const mysql = require("mysql2");

// Update these credentials as needed
dbConfig = {
  host: process.env.DB_HOST || "34.135.188.4",
  user: process.env.DB_USER || "Lethabo",
  password: process.env.DB_PASSWORD || "76068664Hanzu!",
  database: process.env.DB_NAME || "inrent_db",
  port: process.env.DB_PORT|| 3306
};

const pool = mysql.createPool(dbConfig);

module.exports = pool.promise();
