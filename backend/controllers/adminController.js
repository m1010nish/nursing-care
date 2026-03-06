const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { email, password } = req.body;

        // Find admin user
        const admin = await Admin.findOne({ email }).select('+password');

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check if admin is active
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated',
            });
        }

        // Verify password
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate token
        const token = generateToken(admin._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email,
                role: 'admin',
            },
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
};

/**
 * @desc    Create staff user
 * @route   POST /api/admin/staff
 * @access  Private (Admin only)
 */
exports.createStaff = async (req, res) => {
    try {
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
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // Create staff user
        const staff = await User.create({
            fullName,
            email,
            phone,
            password,
            role: 'staff',
            emailVerified: true, // Staff accounts are pre-verified
        });

        res.status(201).json({
            success: true,
            message: 'Staff user created successfully',
            staff: {
                id: staff._id,
                fullName: staff.fullName,
                email: staff.email,
                phone: staff.phone,
                role: staff.role,
            },
        });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create staff user',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all staff users
 * @route   GET /api/admin/staff
 * @access  Private (Admin only)
 */
exports.getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: staff.length,
            staff,
        });
    } catch (error) {
        console.error('Get all staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff users',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all patients
 * @route   GET /api/admin/patients
 * @access  Private (Admin only)
 */
exports.getAllPatients = async (req, res) => {
    try {
        const patients = await User.find({ role: 'patient' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: patients.length,
            patients,
        });
    } catch (error) {
        console.error('Get all patients error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patients',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all appointments
 * @route   GET /api/admin/appointments
 * @access  Private (Admin only)
 */
exports.getAllAppointments = async (req, res) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('patient', 'fullName email phone')
            .populate('assignedStaff', 'fullName email phone')
            .sort({ date: -1, time: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments,
        });
    } catch (error) {
        console.error('Get all appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message,
        });
    }
};

/**
 * @desc    Assign staff to an appointment
 * @route   PATCH /api/admin/appointments/:id/assign-staff
 * @access  Private (Admin only)
 */
exports.assignStaff = async (req, res) => {
    try {
        const { assignedStaffIds } = req.body;

        // Ensure assignedStaffIds is an array
        if (!Array.isArray(assignedStaffIds)) {
            return res.status(400).json({
                success: false,
                message: 'assignedStaffIds must be an array of user IDs'
            });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        appointment.assignedStaff = assignedStaffIds;
        await appointment.save();

        const updatedAppointment = await Appointment.findById(req.params.id)
            .populate('patient', 'fullName email phone')
            .populate('assignedStaff', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: 'Staff assigned successfully',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Assign staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign staff',
            error: error.message,
        });
    }
};

/**
 * @desc    Update appointment status
 * @route   PATCH /api/admin/appointments/:id/status
 * @access  Private (Admin only)
 */
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array(),
            });
        }

        const { status } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        appointment.status = status;
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment,
        });
    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment status',
            error: error.message,
        });
    }
};

/**
 * @desc    Delete user (staff or patient)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent deleting admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users',
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message,
        });
    }
};

/**
 * @desc    Toggle user active status
 * @route   PATCH /api/admin/users/:id/toggle-active
 * @access  Private (Admin only)
 */
exports.toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent toggling admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify admin users',
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error('Toggle user active error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle user status',
            error: error.message,
        });
    }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Get counts
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalStaff = await User.countDocuments({ role: 'staff' });
        const totalAppointments = await Appointment.countDocuments();
        const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
        const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });
        const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
        const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });

        // Get recent appointments
        const recentAppointments = await Appointment.find()
            .populate('patient', 'fullName email phone')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalPatients,
                totalStaff,
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                completedAppointments,
                cancelledAppointments,
            },
            recentAppointments,
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message,
        });
    }
};
