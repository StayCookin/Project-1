// db.js
// MySQL connection setup for Node.js backend

const mysql = require("mysql2");

// Update these credentials as needed
dbConfig = {
  host: "localhost",
  user: "your_mysql_user",
  password: "your_mysql_password",
  database: "inrent_db",
};

const pool = mysql.createPool(dbConfig);

module.exports = pool.promise();
