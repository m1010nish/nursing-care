const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

/**
 * Custom validator for appointment date - must be a valid future date
 */
const validateAppointmentDate = (value) => {
    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Date must be in YYYY-MM-DD format');
    }

    const appointmentDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    // Check if date is valid
    if (isNaN(appointmentDate.getTime())) {
        throw new Error('Invalid date');
    }

    // Check if date is in the future
    if (appointmentDate < today) {
        throw new Error('Appointment date must be today or in the future');
    }

    return true;
};

/**
 * Custom validator for appointment time - must be in HH:MM format
 */
const validateAppointmentTime = (value) => {
    if (!/^\d{2}:\d{2}$/.test(value)) {
        throw new Error('Time must be in HH:MM format (24-hour)');
    }

    const [hours, minutes] = value.split(':').map(Number);

    if (hours < 0 || hours > 23) {
        throw new Error('Hours must be between 00 and 23');
    }

    if (minutes < 0 || minutes > 59) {
        throw new Error('Minutes must be between 00 and 59');
    }

    return true;
};

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
            .custom(validateAppointmentDate),
        body('time')
            .trim()
            .custom(validateAppointmentTime),
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
