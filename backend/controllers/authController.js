const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail, generateOTP } = require('../services/emailService');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

/**
 * @desc    Register a new patient (sends OTP)
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { fullName, email, phone, password } = req.body;

        // Check if user already exists
        let existingUser = await User.findOne({ email });

        // If user exists and email is verified, they should login instead
        if (existingUser && existingUser.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists. Please login.',
            });
        }

        // If user exists but email not verified, delete old user and continue with registration
        if (existingUser && !existingUser.emailVerified) {
            await User.findByIdAndDelete(existingUser._id);
        }

        // Create new user (email not verified yet)
        const user = await User.create({
            fullName,
            email,
            phone,
            password,
            role: 'patient',
            emailVerified: false,
        });

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(
            Date.now() + (process.env.OTP_EXPIRES_IN || 10) * 60 * 1000
        );

        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email, purpose: 'registration' });

        // Save OTP to database
        await OTP.create({
            email,
            otp,
            purpose: 'registration',
            expiresAt,
        });

        // Send OTP email
        const emailResult = await sendOTPEmail(email, otp, 'registration');

        if (!emailResult.success) {
            // If email fails, delete the user and return error
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again.',
            });
        }

        res.status(201).json({
            success: true,
            message: 'OTP sent to your email. Please verify to complete registration.',
            userId: user._id,
            email: user.email,
            requiresVerification: true,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message,
        });
    }
};

/**
 * @desc    Verify OTP and complete registration
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, purpose } = req.body;

        if (!email || !otp || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and purpose are required',
            });
        }

        // Find the OTP
        const otpRecord = await OTP.findOne({
            email,
            otp,
            purpose,
            verified: false,
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP',
            });
        }

        // Check if OTP is expired
        if (new Date() > otpRecord.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.',
            });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Mark user as verified
        user.emailVerified = true;
        await user.save();

        // Mark OTP as verified
        otpRecord.verified = true;
        await otpRecord.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            token,
            user,
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP verification',
            error: error.message,
        });
    }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOTP = async (req, res) => {
    try {
        const { email, purpose } = req.body;

        if (!email || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'Email and purpose are required',
            });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // If already verified and purpose is registration, no need to send OTP
        if (user.emailVerified && purpose === 'registration') {
            return res.status(400).json({
                success: false,
                message: 'Email already verified. Please login.',
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(
            Date.now() + (process.env.OTP_EXPIRES_IN || 10) * 60 * 1000
        );

        // Delete old OTPs
        await OTP.deleteMany({ email, purpose });

        // Save new OTP
        await OTP.create({
            email,
            otp,
            purpose,
            expiresAt,
        });

        // Send OTP email
        const emailResult = await sendOTPEmail(email, otp, purpose);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'New OTP sent to your email',
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while resending OTP',
            error: error.message,
        });
    }
};

/**
 * @desc    Login user (sends OTP if email not verified)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { email, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated',
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            // Generate OTP
            const otp = generateOTP();
            const expiresAt = new Date(
                Date.now() + (process.env.OTP_EXPIRES_IN || 10) * 60 * 1000
            );

            // Delete old OTPs
            await OTP.deleteMany({ email, purpose: 'login' });

            // Save OTP
            await OTP.create({
                email,
                otp,
                purpose: 'login',
                expiresAt,
            });

            // Send OTP email
            const emailResult = await sendOTPEmail(email, otp, 'login');

            if (!emailResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send verification email. Please try again.',
                });
            }

            return res.status(200).json({
                success: false,
                message: 'Email not verified. OTP sent to your email.',
                requiresVerification: true,
                email: user.email,
            });
        }

        // Email is verified, proceed with login
        // Generate token
        const token = generateToken(user._id);

        // Remove password before sending (findOne with +password was used above)
        const userObj = user.toJSON();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userObj,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * @desc    Accept terms and conditions
 * @route   POST /api/auth/accept-terms
 * @access  Private
 */
exports.acceptTerms = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Update terms acceptance
        user.acceptedTerms = true;
        user.termsAcceptedAt = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Terms and conditions accepted',
            user,
        });
    } catch (error) {
        console.error('Accept terms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Extract profile fields from request body
        const {
            fullName,
            dateOfBirth,
            age,
            gender,
            bloodGroup,
            aadhaarNumber,
            address,
            phone,
            whatsapp,
            emergencyContact,
        } = req.body;

        // Update profile fields if provided
        if (fullName) user.fullName = fullName;
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (age) user.age = age;
        if (gender) user.gender = gender;
        if (bloodGroup) user.bloodGroup = bloodGroup;
        if (aadhaarNumber) user.aadhaarNumber = aadhaarNumber;
        if (address) user.address = address;
        if (phone) user.phone = phone;
        if (whatsapp) user.whatsapp = whatsapp;
        if (emergencyContact) user.emergencyContact = emergencyContact;

        // Check if all required profile fields are filled
        const isProfileComplete =
            user.fullName &&
            user.dateOfBirth &&
            user.age &&
            user.gender &&
            user.bloodGroup &&
            user.address &&
            user.phone &&
            user.whatsapp &&
            user.emergencyContact?.name &&
            user.emergencyContact?.relationship &&
            user.emergencyContact?.phone;

        user.profileCompleted = !!isProfileComplete;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                acceptedTerms: user.acceptedTerms,
                dateOfBirth: user.dateOfBirth,
                age: user.age,
                gender: user.gender,
                bloodGroup: user.bloodGroup,
                aadhaarNumber: user.aadhaarNumber,
                address: user.address,
                whatsapp: user.whatsapp,
                emergencyContact: user.emergencyContact,
                profileCompleted: user.profileCompleted,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile',
            error: error.message,
        });
    }
};
