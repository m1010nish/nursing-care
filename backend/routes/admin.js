const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    adminController.login
);

/**
 * All routes below require admin authentication
 */
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/stats', adminController.getDashboardStats);

/**
 * @route   POST /api/admin/staff
 * @desc    Create staff user
 * @access  Private (Admin only)
 */
router.post(
    '/staff',
    [
        body('fullName').trim().notEmpty().withMessage('Full name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('phone').trim().notEmpty().withMessage('Phone number is required'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
    ],
    adminController.createStaff
);

/**
 * @route   GET /api/admin/staff
 * @desc    Get all staff users
 * @access  Private (Admin only)
 */
router.get('/staff', adminController.getAllStaff);

/**
 * @route   GET /api/admin/patients
 * @desc    Get all patients
 * @access  Private (Admin only)
 */
router.get('/patients', adminController.getAllPatients);

/**
 * @route   GET /api/admin/appointments
 * @desc    Get all appointments
 * @access  Private (Admin only)
 */
router.get('/appointments', adminController.getAllAppointments);

/**
 * @route   PATCH /api/admin/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private (Admin only)
 */
router.patch(
    '/appointments/:id/status',
    [
        body('status')
            .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
            .withMessage('Invalid status value'),
    ],
    adminController.updateAppointmentStatus
);

/**
 * @route   PATCH /api/admin/appointments/:id/assign-staff
 * @desc    Assign staff to appointment
 * @access  Private (Admin only)
 */
router.patch(
    '/appointments/:id/assign-staff',
    [
        body('assignedStaffIds').isArray().withMessage('assignedStaffIds must be an array'),
    ],
    adminController.assignStaff
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/users/:id', adminController.deleteUser);

/**
 * @route   PATCH /api/admin/users/:id/toggle-active
 * @desc    Toggle user active status
 * @access  Private (Admin only)
 */
router.patch('/users/:id/toggle-active', adminController.toggleUserActive);

module.exports = router;
