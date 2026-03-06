const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

/**
 * Middleware to verify JWT token and authenticate user
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check if token exists in Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route',
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Try to find user in User collection first
            let user = await User.findById(decoded.id).select('-password');

            // If not found in User, try Admin collection
            if (!user) {
                user = await Admin.findById(decoded.id).select('-password');
                if (user) {
                    // Add role field for Admin
                    user = user.toObject();
                    user.role = 'admin';
                }
            }

            if (!user || !user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or inactive',
                });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
        });
    }
};

/**
 * Middleware to authorize specific roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
