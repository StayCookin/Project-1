const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inrent_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database.');
        connection.release();
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

// Export the pool and test function
module.exports = {
    pool,
    testConnection
}; 