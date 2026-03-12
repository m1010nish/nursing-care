/**
 * Validate required environment variables on startup
 */

const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_FROM',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
];

const optionalEnvVars = [
    'PORT',
    'NODE_ENV',
    'CORS_ORIGIN',
    'ENABLE_EMAIL_SENDING',
    'OTP_EXPIRES_IN',
    'RAZORPAY_WEBHOOK_SECRET',
];

const validateEnv = () => {
    const missing = [];
    const warnings = [];

    console.log('\n🔍 Validating environment variables...\n');

    // Check required variables
    requiredEnvVars.forEach((varName) => {
        if (!process.env[varName]) {
            missing.push(varName);
        } else {
            console.log(`✅ ${varName}: Set`);
        }
    });

    // Check optional variables and provide warnings
    optionalEnvVars.forEach((varName) => {
        if (!process.env[varName]) {
            warnings.push(varName);
            console.log(`⚠️  ${varName}: Not set (using default)`);
        } else {
            console.log(`✅ ${varName}: Set`);
        }
    });

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn('\n⚠️  WARNING: JWT_SECRET is too short. Use at least 32 characters for security.');
    }

    // Validate weak default values
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('your-super-secret')) {
        console.error('\n❌ CRITICAL: JWT_SECRET contains default/weak value. Change it immediately!');
        process.exit(1);
    }

    // Check if RAZORPAY_WEBHOOK_SECRET is missing
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.warn('\n⚠️  WARNING: RAZORPAY_WEBHOOK_SECRET is not set. Webhook signature verification will fail.');
    }

    console.log('\n');

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach((varName) => console.error(`   - ${varName}`));
        console.error('\n💡 Check your .env file and compare with .env.example\n');
        process.exit(1);
    }

    if (warnings.length > 0) {
        console.log('⚠️  Optional environment variables not set:');
        warnings.forEach((varName) => console.log(`   - ${varName}`));
        console.log('');
    }

    console.log('✅ Environment validation passed\n');
};

module.exports = validateEnv;
