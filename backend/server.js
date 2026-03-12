require('dotenv').config();

// Validate environment variables before starting
const validateEnv = require('./config/validateEnv');
validateEnv();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : ['*'];

        if (allowedOrigins.includes('*') || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Parse JSON for all routes except webhook (which needs raw body)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Healthcare Appointment Booking API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            appointments: '/api/appointments',
            admin: '/api/admin',
            payments: '/api/payments',
        },
    });
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Start server locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`📡 Listening on port ${PORT}`);
        console.log(`🌐 API URL: http://localhost:${PORT}`);
        console.log(`\n📚 Available endpoints:`);
        console.log(`   - GET    /health                   (Health check)`);
        console.log(`   - POST   /api/auth/register        (Register new patient)`);
        console.log(`   - POST   /api/auth/login           (Login user)`);
        console.log(`   - POST   /api/auth/verify-otp      (Verify OTP)`);
        console.log(`   - POST   /api/auth/resend-otp      (Resend OTP)`);
        console.log(`   - GET    /api/auth/me              (Get current user)`);
        console.log(`   - POST   /api/appointments         (Create appointment)`);
        console.log(`   - GET    /api/appointments/my      (Get my appointments)`);
        console.log(`   - GET    /api/appointments         (Get all - staff only)`);
        console.log(`   - PATCH  /api/appointments/:id/status (Update status - staff)`);
        console.log(`   - POST   /api/payments/create-order   (Create payment order)`);
        console.log(`   - POST   /api/payments/verify         (Verify payment)`);
        console.log(`   - POST   /api/payments/refund/:id     (Refund payment)`);
        console.log(`   - GET    /api/payments/:id/status     (Get payment status)`);
        console.log(`\n✨ Ready to accept connections!\n`);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Export the Express app for Vercel Serverless Functions
module.exports = app;
