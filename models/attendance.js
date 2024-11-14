// models/attendance.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'attendance.db'),
  logging: false, // Disable logging; default: console.log
});

// Define the Attendance model
const Attendance = sequelize.define('Attendance', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: 'Unknown',
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  // Other model options
});

// Sync the model with the database
sequelize.sync();

module.exports = { Attendance, sequelize };