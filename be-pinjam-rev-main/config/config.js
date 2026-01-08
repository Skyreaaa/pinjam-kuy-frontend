// File: config.js (FULL CODE FIXED)

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE,   // ✨ FIX: Ganti DB_NAME menjadi DB_DATABASE
    process.env.DB_USER,       
    process.env.DB_PASSWORD,   
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Matikan log SQL di console
        define: {
            timestamps: true // Mengaktifkan createdAt dan updatedAt
        }
    }
);

// Panggil model untuk inisialisasi tabel
const User = require('../models/user')(sequelize, Sequelize.DataTypes);

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.User = User;
db.pool = pool;

module.exports = db;