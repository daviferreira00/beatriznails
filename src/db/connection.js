const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "45.143.7.175",
    user: process.env.DB_USER || "davi",
    password: process.env.DB_PASSWORD || "Davi@159",
    database: process.env.DB_NAME || "beatriznails",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;