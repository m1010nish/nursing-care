const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment (Patient only)
 * @access  Private (Patient)
 */
router.post(
    '/',
    authorize('patient'),
    [
        body('date')
            .trim()
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage('Date must be in YYYY-MM-DD format'),
        body('time')
            .trim()
            .matches(/^\d{2}:\d{2}$/)
            .withMessage('Time must be in HH:MM format'),
        body('services')
            .isArray({ min: 1 })
            .withMessage('Please select at least one nursing service'),
    ],
    appointmentController.createAppointment
);

/**
 * @route   GET /api/appointments/my
 * @desc    Get all appointments for logged-in patient
 * @access  Private (Patient)
 */
router.get('/my', authorize('patient'), appointmentController.getMyAppointments);

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments (Staff only)
 * @access  Private (Staff)
 */
router.get('/', authorize('staff'), appointmentController.getAllAppointments);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get single appointment by ID
 * @access  Private
 */
router.get('/:id', appointmentController.getAppointmentById);

/**
 * @route   PATCH /api/appointments/:id/status
 * @desc    Update appointment status (Staff only)
 * @access  Private (Staff)
 */
router.patch(
    '/:id/status',
    authorize('staff'),
    [
        body('status')
            .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
            .withMessage('Invalid status value'),
    ],
    appointmentController.updateAppointmentStatus
);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Cancel appointment (Patient can cancel their own)
 * @access  Private
 */
router.delete('/:id', appointmentController.cancelAppointment);

module.exports = router;
