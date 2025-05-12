<<<<<<< HEAD
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
}; 
=======
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            throw new Error();
        }

        // Check for invalid login status and 7-day limit
        if (user.invalidLoginDate) {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            const timeSinceInvalidLogin = Date.now() - new Date(user.invalidLoginDate).getTime();
            
            if (timeSinceInvalidLogin > sevenDaysInMs) {
                return res.status(401).json({ 
                    message: 'Your verification period has expired. Please complete verification to continue.',
                    isExpired: true
                });
            }
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate.' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'You do not have permission to perform this action.' 
            });
        }
        next();
    };
};

module.exports = { auth, checkRole }; 
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
