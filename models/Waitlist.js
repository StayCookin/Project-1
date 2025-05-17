const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Waitlist = sequelize.define('Waitlist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    institution: {
        type: DataTypes.STRING,
        allowNull: false
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^[0-9]{8}$/ // 8-digit phone number
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'notified', 'registered'),
        defaultValue: 'pending'
    },
    notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = Waitlist; 