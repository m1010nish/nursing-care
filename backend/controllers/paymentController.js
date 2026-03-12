const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const razorpayService = require('../services/razorpayService');
const { CONSULTATION_FEE_PAISE } = require('../config/constants');

/**
 * @desc    Create a Razorpay order for an appointment
 * @route   POST /api/payments/create-order
 * @access  Private (Patient)
 */
exports.createOrder = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { appointmentId } = req.body;

        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Verify the appointment belongs to the logged-in patient
        if (appointment.patient.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to pay for this appointment',
            });
        }

        // Check if appointment is already paid
        if (appointment.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'This appointment has already been paid for',
                code: 'ALREADY_PAID',
            });
        }

        // Check if there's already a pending order (prevent duplicate orders)
        const existingPayment = await Payment.findOne({
            appointment: appointmentId,
            status: 'created',
        });

        if (existingPayment) {
            // Return existing order if it's still valid
            return res.status(200).json({
                success: true,
                message: 'Existing order found',
                order: {
                    id: existingPayment.razorpayOrderId,
                    amount: existingPayment.amount,
                    currency: existingPayment.currency,
                },
                paymentId: existingPayment._id,
                key: process.env.RAZORPAY_KEY_ID,
            });
        }

        const amount = appointment.amount || CONSULTATION_FEE_PAISE;

        // Razorpay limits receipt length to 40 characters. 
        // We trim the appointmentId and timestamp to fit.
        const shortId = appointmentId.toString().substring(14); // 10 chars
        const shortTime = Date.now().toString().substring(5); // 8 chars
        const receipt = `apt_${shortId}_${shortTime}`;

        // Create Razorpay order
        const order = await razorpayService.createOrder(amount, 'INR', receipt, {
            appointmentId: appointmentId.toString(),
            patientId: req.user._id.toString(),
            patientName: req.user.fullName,
            patientEmail: req.user.email,
        });

        // Create Payment record in database
        const payment = await Payment.create({
            appointment: appointmentId,
            patient: req.user._id,
            razorpayOrderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            notes: {
                appointmentId: appointmentId.toString(),
                patientName: req.user.fullName,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Payment order created successfully',
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            paymentId: payment._id,
            key: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Create order error:', error);

        if (error.name === 'PaymentError') {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message,
        });
    }
};

/**
 * @desc    Verify Razorpay payment after checkout
 * @route   POST /api/payments/verify
 * @access  Private (Patient)
 */
exports.verifyPayment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Find the payment record
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found for this order',
                code: 'PAYMENT_NOT_FOUND',
            });
        }

        // Check if payment is already verified
        if (payment.status === 'captured') {
            return res.status(200).json({
                success: true,
                message: 'Payment has already been verified',
                payment: {
                    id: payment._id,
                    status: payment.status,
                    amount: payment.amount,
                    razorpayPaymentId: payment.razorpayPaymentId,
                },
            });
        }

        // Verify the payment signature
        const isValid = razorpayService.verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            // Mark payment as failed
            payment.status = 'failed';
            payment.errorCode = 'SIGNATURE_MISMATCH';
            payment.errorDescription = 'Payment signature verification failed — possible tampering detected';
            await payment.save();

            // Update appointment payment status
            await Appointment.findByIdAndUpdate(payment.appointment, {
                paymentStatus: 'failed',
            });

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Signature mismatch.',
                code: 'SIGNATURE_MISMATCH',
            });
        }

        // Signature is valid — fetch payment details from Razorpay for extra safety
        let paymentDetails;
        try {
            paymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);
        } catch (fetchError) {
            console.warn('Could not fetch payment details, proceeding with verification:', fetchError.message);
        }

        // Update payment record
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.status = 'captured';
        payment.method = paymentDetails?.method || 'unknown';
        await payment.save();

        // Update appointment status
        await Appointment.findByIdAndUpdate(payment.appointment, {
            paymentStatus: 'paid',
            paymentId: payment._id,
        });

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            payment: {
                id: payment._id,
                status: payment.status,
                amount: payment.amount,
                method: payment.method,
                razorpayPaymentId: payment.razorpayPaymentId,
                appointmentId: payment.appointment,
            },
        });
    } catch (error) {
        console.error('Verify payment error:', error);

        if (error.name === 'PaymentError') {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message,
        });
    }
};

/**
 * @desc    Get payment status for an appointment
 * @route   GET /api/payments/:appointmentId/status
 * @access  Private
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const payment = await Payment.findOne({ appointment: appointmentId })
            .sort({ createdAt: -1 })
            .select('-razorpaySignature');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No payment found for this appointment',
            });
        }

        // Verify authorization
        if (
            req.user.role === 'patient' &&
            payment.patient.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this payment',
            });
        }

        res.status(200).json({
            success: true,
            payment: {
                id: payment._id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                razorpayPaymentId: payment.razorpayPaymentId,
                razorpayOrderId: payment.razorpayOrderId,
                refundStatus: payment.refundStatus,
                refundAmount: payment.refundAmount,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
            },
        });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: error.message,
        });
    }
};

/**
 * @desc    Initiate refund for an appointment
 * @route   POST /api/payments/refund/:appointmentId
 * @access  Private (Staff/Admin or Patient who owns the appointment)
 */
exports.refundPayment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        // Find the most recent captured payment for this appointment
        const payment = await Payment.findOne({
            appointment: appointmentId,
            status: 'captured',
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No captured payment found for this appointment',
                code: 'NO_CAPTURED_PAYMENT',
            });
        }

        // Authorization: patient can only refund their own, staff/admin can refund any
        if (
            req.user.role === 'patient' &&
            payment.patient.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to refund this payment',
            });
        }

        // Check if already refunded
        if (payment.refundStatus === 'processed') {
            return res.status(400).json({
                success: false,
                message: 'This payment has already been refunded',
                code: 'ALREADY_REFUNDED',
            });
        }

        // Initiate refund via Razorpay
        const refund = await razorpayService.refundPayment(
            payment.razorpayPaymentId,
            null, // Full refund
            {
                appointmentId: appointmentId.toString(),
                reason: 'Appointment cancelled',
            }
        );

        // Update payment record
        payment.status = 'refunded';
        payment.refundId = refund.id;
        payment.refundStatus = 'processed';
        payment.refundAmount = refund.amount;
        await payment.save();

        // Update appointment
        await Appointment.findByIdAndUpdate(appointmentId, {
            paymentStatus: 'refunded',
        });

        res.status(200).json({
            success: true,
            message: 'Refund initiated successfully',
            refund: {
                id: refund.id,
                amount: refund.amount,
                status: refund.status,
            },
        });
    } catch (error) {
        console.error('Refund payment error:', error);

        if (error.name === 'PaymentError') {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                code: error.code,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message,
        });
    }
};

/**
 * @desc    Handle Razorpay webhook events
 * @route   POST /api/payments/webhook
 * @access  Public (verified by Razorpay signature)
 */
exports.handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

        // Verify webhook signature
        const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            console.warn('Invalid webhook signature received');
            return res.status(400).json({ status: 'invalid_signature' });
        }

        const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { event: eventType, payload } = event;

        console.log(`Razorpay webhook received: ${eventType}`);

        switch (eventType) {
            case 'payment.captured': {
                const paymentEntity = payload.payment.entity;
                const payment = await Payment.findOne({
                    razorpayOrderId: paymentEntity.order_id,
                });

                if (payment && payment.status !== 'captured') {
                    payment.razorpayPaymentId = paymentEntity.id;
                    payment.status = 'captured';
                    payment.method = paymentEntity.method;
                    await payment.save();

                    await Appointment.findByIdAndUpdate(payment.appointment, {
                        paymentStatus: 'paid',
                        paymentId: payment._id,
                    });

                    console.log(`Payment captured via webhook: ${paymentEntity.id}`);
                }
                break;
            }

            case 'payment.failed': {
                const paymentEntity = payload.payment.entity;
                const payment = await Payment.findOne({
                    razorpayOrderId: paymentEntity.order_id,
                });

                if (payment && payment.status === 'created') {
                    payment.status = 'failed';
                    payment.razorpayPaymentId = paymentEntity.id;
                    payment.errorCode = paymentEntity.error_code;
                    payment.errorDescription = paymentEntity.error_description;
                    payment.errorSource = paymentEntity.error_source;
                    await payment.save();

                    await Appointment.findByIdAndUpdate(payment.appointment, {
                        paymentStatus: 'failed',
                    });

                    console.log(`Payment failed via webhook: ${paymentEntity.id}`);
                }
                break;
            }

            case 'refund.processed': {
                const refundEntity = payload.refund.entity;
                const payment = await Payment.findOne({
                    razorpayPaymentId: refundEntity.payment_id,
                });

                if (payment) {
                    payment.refundId = refundEntity.id;
                    payment.refundStatus = 'processed';
                    payment.refundAmount = refundEntity.amount;
                    payment.status = 'refunded';
                    await payment.save();

                    await Appointment.findByIdAndUpdate(payment.appointment, {
                        paymentStatus: 'refunded',
                    });

                    console.log(`Refund processed via webhook: ${refundEntity.id}`);
                }
                break;
            }

            case 'refund.failed': {
                const refundEntity = payload.refund.entity;
                const payment = await Payment.findOne({
                    razorpayPaymentId: refundEntity.payment_id,
                });

                if (payment) {
                    payment.refundStatus = 'failed';
                    await payment.save();
                    console.log(`Refund failed via webhook: ${refundEntity.id}`);
                }
                break;
            }

            default:
                console.log(`Unhandled webhook event: ${eventType}`);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Still return 200 to prevent Razorpay from retrying
        res.status(200).json({ status: 'error', message: error.message });
    }
};

/**
 * @desc    Handle failed payment (called by frontend when user dismisses checkout)
 * @route   POST /api/payments/failed
 * @access  Private (Patient)
 */
exports.handlePaymentFailure = async (req, res) => {
    try {
        const { razorpay_order_id, error_code, error_description } = req.body;

        if (!razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required',
            });
        }

        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found',
            });
        }

        // Only update if payment is still in 'created' state
        if (payment.status === 'created') {
            payment.status = 'failed';
            payment.errorCode = error_code || 'USER_CANCELLED';
            payment.errorDescription = error_description || 'Payment was cancelled by the user';
            await payment.save();

            await Appointment.findByIdAndUpdate(payment.appointment, {
                paymentStatus: 'failed',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment failure recorded',
        });
    } catch (error) {
        console.error('Handle payment failure error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment failure',
            error: error.message,
        });
    }
};
