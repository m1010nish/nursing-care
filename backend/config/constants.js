/**
 * Application-wide constants and configuration
 */

// ── Payment Configuration ──
const CONSULTATION_FEE_PAISE = 50000; // ₹500 in paise
const CONSULTATION_FEE_RUPEES = CONSULTATION_FEE_PAISE / 100;

// ── OTP Configuration ──
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = process.env.OTP_EXPIRES_IN || 10;

// ── Database Configuration ──
const MAX_DB_RETRIES = 5;
const DB_RETRY_DELAY_MS = 5000;

// ── Rate Limiting Configuration ──
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

// Auth-specific rate limits
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX_REQUESTS = 30; // Max auth requests per window (register + OTP verify + retries need headroom)

module.exports = {
    // Payment
    CONSULTATION_FEE_PAISE,
    CONSULTATION_FEE_RUPEES,

    // OTP
    OTP_LENGTH,
    OTP_EXPIRY_MINUTES,

    // Database
    MAX_DB_RETRIES,
    DB_RETRY_DELAY_MS,

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX_REQUESTS,
};
