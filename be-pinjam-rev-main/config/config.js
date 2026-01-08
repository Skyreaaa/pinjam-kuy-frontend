// File: config.js (FULL CODE FIXED)

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// SSL configuration for Sequelize (support Aiven, PlanetScale, etc.)
const dialectOptions = process.env.NODE_ENV === 'production'
    ? { 
        ssl: { 
            rejectUnauthorized: false  // Set false for cloud databases like Aiven
        } 
    }
    : {};

const sequelize = new Sequelize(
    process.env.DB_DATABASE,   // ✨ FIX: Ganti DB_NAME menjadi DB_DATABASE
    process.env.DB_USER,       
    process.env.DB_PASSWORD,   
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectOptions: dialectOptions,
        logging: false, // Matikan log SQL di console
        define: {
            timestamps: true // Mengaktifkan createdAt dan updatedAt
        }
    }
);

// Panggil model untuk inisialisasi tabel
const User = require('../models/user')(sequelize, Sequelize.DataTypes);

const mysql = require('mysql2/promise');

// SSL configuration for production databases (e.g., Aiven, PlanetScale)
const sslConfig = process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }  // Required for cloud MySQL with SSL
    : false;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    ssl: sslConfig,
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