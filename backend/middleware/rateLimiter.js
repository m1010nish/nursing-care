const rateLimit = require('express-rate-limit');
const {
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX_REQUESTS,
} = require('../config/constants');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for certain IPs (optional)
    skip: (req) => {
        // Skip for localhost in development
        if (process.env.NODE_ENV === 'development' && req.ip === '::1') {
            return true;
        }
        return false;
    },
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests, even successful ones
    skip: (req) => {
        // Skip for localhost in development
        if (process.env.NODE_ENV === 'development' && req.ip === '::1') {
            return true;
        }
        return false;
    },
});

/**
 * Very strict rate limiter for OTP endpoints to prevent spam
 */
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // Max 3 OTP requests per minute
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait before requesting another code.',
        code: 'OTP_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed/unsuccessful requests
    skip: (req) => {
        // Skip for localhost in development
        if (process.env.NODE_ENV === 'development' && req.ip === '::1') {
            return true;
        }
        return false;
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    otpLimiter,
};
