const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Razorpay webhook events (no auth — verified by signature)
 * @access  Public
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * All remaining routes require authentication
 */
router.use(protect);

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order for an appointment
 * @access  Private (Patient)
 */
router.post(
    '/create-order',
    authorize('patient'),
    [
        body('appointmentId')
            .trim()
            .notEmpty()
            .withMessage('Appointment ID is required')
            .isMongoId()
            .withMessage('Invalid appointment ID'),
    ],
    paymentController.createOrder
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature
 * @access  Private (Patient)
 */
router.post(
    '/verify',
    authorize('patient'),
    [
        body('razorpay_order_id')
            .trim()
            .notEmpty()
            .withMessage('Razorpay order ID is required'),
        body('razorpay_payment_id')
            .trim()
            .notEmpty()
            .withMessage('Razorpay payment ID is required'),
        body('razorpay_signature')
            .trim()
            .notEmpty()
            .withMessage('Razorpay signature is required'),
    ],
    paymentController.verifyPayment
);

/**
 * @route   POST /api/payments/failed
 * @desc    Record a failed/cancelled payment
 * @access  Private (Patient)
 */
router.post(
    '/failed',
    authorize('patient'),
    paymentController.handlePaymentFailure
);

/**
 * @route   GET /api/payments/:appointmentId/status
 * @desc    Get payment status for an appointment
 * @access  Private
 */
router.get('/:appointmentId/status', paymentController.getPaymentStatus);

/**
 * @route   POST /api/payments/refund/:appointmentId
 * @desc    Initiate refund for an appointment
 * @access  Private (Staff/Admin or owning Patient)
 */
router.post(
    '/refund/:appointmentId',
    paymentController.refundPayment
);

module.exports = router;
