const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

const createTransporter = () => {
    if (transporter) return transporter;

    // Render.com explicitly blocks port 587 for anti-spam reasons.
    // Port 465 (SMTPS) works because it uses implicit SSL (looks like HTTPS traffic).
    // If EMAIL_PORT is 587 in production, we forcefully upgrade it to 465.
    let port = parseInt(process.env.EMAIL_PORT) || 465;
    if (process.env.NODE_ENV === 'production' && port === 587) {
        port = 465;
        console.log('⚠️ Upgrading SMTP port from 587 to 465 for production (Render.com compatibility)');
    }

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: port,
        secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
            // Allow self-signed certificates if needed
            rejectUnauthorized: false // In production, sometimes shared hosts have cert chain issues
        }
    });

    return transporter;
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, otp, purpose) => {
    try {
        // DEVELOPMENT MODE: If email sending is disabled, just log to console
        if (process.env.ENABLE_EMAIL_SENDING === 'false') {
            console.log('\n╔════════════════════════════════════════════════════════════╗');
            console.log('║           🔑 DEVELOPMENT MODE - OTP CODE                  ║');
            console.log('╠════════════════════════════════════════════════════════════╣');
            console.log(`║  Email:   ${email.padEnd(46)} ║`);
            console.log(`║  OTP:     ${otp.padEnd(46)} ║`);
            console.log(`║  Purpose: ${purpose.padEnd(46)} ║`);
            console.log('╠════════════════════════════════════════════════════════════╣');
            console.log('║  ⚠️  Email sending is DISABLED (dev mode)                 ║');
            console.log('║  📋 Copy the OTP above and paste it in the app            ║');
            console.log('║  💡 To enable emails: Set ENABLE_EMAIL_SENDING=true       ║');
            console.log('╚════════════════════════════════════════════════════════════╝\n');

            return {
                success: true,
                messageId: 'dev-mode-' + Date.now(),
                devMode: true
            };
        }

        // PRODUCTION MODE: Send actual email
        console.log(`\n📧 Sending OTP email to ${email}...\n`);

        const transporter = createTransporter();

        const subject =
            purpose === 'registration'
                ? 'Verify Your Email - Healthcare App'
                : 'Login Verification - Healthcare App';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏥 Healthcare App</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 24px;">
                                ${purpose === 'registration' ? 'Welcome!' : 'Login Verification'}
                            </h2>

                            <p style="color: #64748B; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                ${purpose === 'registration'
                ? 'Thank you for registering with Healthcare App. To complete your registration, please verify your email address using the code below:'
                : 'We received a login attempt for your account. Please use the verification code below to continue:'
            }
                            </p>

                            <!-- OTP Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <div style="background-color: #F0F9FF; border: 2px dashed #0EA5E9; border-radius: 8px; padding: 20px; display: inline-block;">
                                            <p style="color: #64748B; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                            <p style="color: #0EA5E9; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                ${otp}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                ⏰ This code will expire in <strong style="color: #0F172A;">${process.env.OTP_EXPIRES_IN || 10} minutes</strong>.
                            </p>

                            <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                ⚠️ If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.5;">
                                This is an automated email, please do not reply.<br>
                                © ${new Date().getFullYear()} Healthcare App. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending failed:');
        console.error('   Error code:', error.code);
        console.error('   Error message:', error.message);
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('   ⚠️  SMTP Authentication failed — check EMAIL_USER and EMAIL_PASSWORD in environment variables');
        }
        return { success: false, error: error.message };
    }
};

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
    sendOTPEmail,
    generateOTP,
};
