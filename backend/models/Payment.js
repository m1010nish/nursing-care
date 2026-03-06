const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        appointment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Razorpay identifiers
        razorpayOrderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            sparse: true,
        },
        razorpaySignature: {
            type: String,
        },
        // Payment details
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        status: {
            type: String,
            enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
            default: 'created',
        },
        // Payment method info (populated after payment)
        method: {
            type: String, // card, upi, netbanking, wallet, etc.
        },
        // Refund details
        refundId: {
            type: String,
        },
        refundStatus: {
            type: String,
            enum: ['pending', 'processed', 'failed', null],
            default: null,
        },
        refundAmount: {
            type: Number,
            min: 0,
        },
        // Error tracking
        errorCode: {
            type: String,
        },
        errorDescription: {
            type: String,
        },
        errorSource: {
            type: String,
        },
        // Notes / metadata
        notes: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
paymentSchema.index({ appointment: 1 });
paymentSchema.index({ patient: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
