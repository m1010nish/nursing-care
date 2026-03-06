const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new patient
 * @access  Public
 */
router.post(
    '/register',
    [
        body('fullName')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Full name must be at least 2 characters'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('phone')
            .trim()
            .isLength({ min: 7 })
            .withMessage('Please provide a valid phone number'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
    ],
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (patient or staff)
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    authController.login
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for registration or login
 * @access  Public
 */
router.post(
    '/verify-otp',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('otp')
            .isLength({ min: 6, max: 6 })
            .withMessage('OTP must be 6 digits'),
        body('purpose')
            .isIn(['registration', 'login'])
            .withMessage('Purpose must be either registration or login'),
    ],
    authController.verifyOTP
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post(
    '/resend-otp',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('purpose')
            .isIn(['registration', 'login'])
            .withMessage('Purpose must be either registration or login'),
    ],
    authController.resendOTP
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/accept-terms
 * @desc    Accept terms and conditions
 * @access  Private
 */
router.post('/accept-terms', protect, authController.acceptTerms);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, authController.updateProfile);

module.exports = router;
