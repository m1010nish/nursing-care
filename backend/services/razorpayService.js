const Razorpay = require('razorpay');
const crypto = require('crypto');

// Custom error class for payment-related errors
class PaymentError extends Error {
    constructor(message, statusCode = 500, code = 'PAYMENT_ERROR') {
        super(message);
        this.name = 'PaymentError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

// Initialize Razorpay instance
let razorpayInstance = null;

const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new PaymentError(
                'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
                500,
                'RAZORPAY_CONFIG_ERROR'
            );
        }

        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in paise (e.g., 50000 for ₹500)
 * @param {string} currency - Currency code (default: INR)
 * @param {string} receipt - Unique receipt ID
 * @param {object} notes - Additional notes/metadata
 * @returns {Promise<object>} Razorpay order object
 */
const createOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
    try {
        const instance = getRazorpayInstance();

        if (!amount || amount <= 0) {
            throw new PaymentError('Invalid amount. Amount must be greater than 0', 400, 'INVALID_AMOUNT');
        }

        const options = {
            amount: Math.round(amount), // amount in paise, must be integer
            currency,
            receipt,
            notes,
        };

        const order = await instance.orders.create(options);
        return order;
    } catch (error) {
        if (error instanceof PaymentError) throw error;

        console.error('Razorpay create order error:', error);

        // Handle Razorpay-specific errors
        if (error.statusCode === 401) {
            throw new PaymentError('Invalid Razorpay credentials', 500, 'RAZORPAY_AUTH_ERROR');
        }
        if (error.statusCode === 400) {
            throw new PaymentError(
                error.error?.description || 'Invalid order parameters',
                400,
                'RAZORPAY_VALIDATION_ERROR'
            );
        }

        throw new PaymentError(
            'Failed to create payment order. Please try again.',
            500,
            'ORDER_CREATION_FAILED'
        );
    }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} true if signature is valid
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    try {
        if (!orderId || !paymentId || !signature) {
            throw new PaymentError(
                'Missing required fields for signature verification',
                400,
                'MISSING_VERIFICATION_FIELDS'
            );
        }

        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        if (error instanceof PaymentError) throw error;
        console.error('Signature verification error:', error);
        throw new PaymentError('Payment signature verification failed', 400, 'SIGNATURE_VERIFICATION_FAILED');
    }
};

/**
 * Verify webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - X-Razorpay-Signature header
 * @returns {boolean} true if signature is valid
 */
const verifyWebhookSignature = (body, signature) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('RAZORPAY_WEBHOOK_SECRET not configured — skipping webhook signature verification');
            return true; // Allow in development if secret not set
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Webhook signature verification error:', error);
        return false;
    }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
const fetchPayment = async (paymentId) => {
    try {
        const instance = getRazorpayInstance();
        const payment = await instance.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        console.error('Fetch payment error:', error);
        throw new PaymentError(
            'Failed to fetch payment details from Razorpay',
            500,
            'FETCH_PAYMENT_FAILED'
        );
    }
};

/**
 * Initiate a refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Refund amount in paise (optional for full refund)
 * @param {object} notes - Additional notes
 * @returns {Promise<object>} Refund object
 */
const refundPayment = async (paymentId, amount = null, notes = {}) => {
    try {
        const instance = getRazorpayInstance();

        const options = {
            notes,
        };

        // If amount is specified, it's a partial refund
        if (amount) {
            options.amount = Math.round(amount);
        }

        const refund = await instance.payments.refund(paymentId, options);
        return refund;
    } catch (error) {
        console.error('Razorpay refund error:', error);

        if (error.statusCode === 400) {
            // Check for common refund errors
            const description = error.error?.description || '';
            if (description.includes('already been fully refunded')) {
                throw new PaymentError('Payment has already been fully refunded', 400, 'ALREADY_REFUNDED');
            }
            if (description.includes('not been captured')) {
                throw new PaymentError('Payment has not been captured yet', 400, 'PAYMENT_NOT_CAPTURED');
            }
            throw new PaymentError(description || 'Invalid refund request', 400, 'REFUND_VALIDATION_ERROR');
        }

        throw new PaymentError(
            'Failed to initiate refund. Please try again.',
            500,
            'REFUND_FAILED'
        );
    }
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
    fetchPayment,
    refundPayment,
    PaymentError,
};
