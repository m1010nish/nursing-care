const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const razorpayService = require('../services/razorpayService');

/**
 * @desc    Create a new appointment
 * @route   POST /api/appointments
 * @access  Private (Patient)
 */
exports.createAppointment = async (req, res) => {
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

        // Check if user profile is completed
        if (!req.user.profileCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your profile before booking an appointment',
                code: 'PROFILE_INCOMPLETE',
            });
        }

        const {
            currentDiagnosis, medicalHistory, allergies, currentMedications,
            recentSurgeries, mobilityStatus, specialEquipmentNeeds,
            services, date, time, reason, amount,
        } = req.body;

        // Create appointment with patient information
        const appointment = await Appointment.create({
            patient: req.user._id,
            patientName: req.user.fullName,
            patientEmail: req.user.email,
            currentDiagnosis,
            medicalHistory,
            allergies,
            currentMedications,
            recentSurgeries,
            mobilityStatus,
            specialEquipmentNeeds,
            services: services || [],
            date,
            time,
            reason,
            amount: amount || 50000,
            status: 'pending',
            paymentStatus: 'pending',
        });

        res.status(201).json({
            success: true,
            message: 'Appointment created. Please complete payment.',
            appointment,
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create appointment',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all appointments for logged-in patient
 * @route   GET /api/appointments/my
 * @access  Private (Patient)
 */
exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient: req.user._id })
            .populate('assignedStaff', 'fullName email phone')
            .sort({ date: -1, time: -1 })
            .select('-__v');

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments,
        });
    } catch (error) {
        console.error('Get my appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message,
        });
    }
};

/**
 * @desc    Get all appointments assigned to logged-in staff
 * @route   GET /api/appointments
 * @access  Private (Staff)
 */
exports.getAllAppointments = async (req, res) => {
    try {
        const { status } = req.query;

        // Build query: only show appointments assigned to THIS staff member
        let query = {
            assignedStaff: req.user._id
        };

        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('patient', 'fullName email phone')
            .populate('assignedStaff', 'fullName email phone')
            .sort({ date: -1, time: -1 })
            .select('-__v');

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
 * @desc    Get single appointment by ID
 * @route   GET /api/appointments/:id
 * @access  Private
 */
exports.getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient', 'fullName email phone')
            .populate('assignedStaff', 'fullName email phone');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if user is authorized to view this appointment
        if (
            req.user.role === 'patient' &&
            appointment.patient._id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this appointment',
            });
        }

        // Check if staff is authorized to view this appointment
        if (req.user.role === 'staff') {
            // assignedStaff is an array of ObjectIds
            const assignedStaffIds = (appointment.assignedStaff || []).map(staff =>
                staff._id ? staff._id.toString() : staff.toString()
            );

            if (!assignedStaffIds.includes(req.user._id.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized: You are not assigned to this appointment',
                });
            }
        }

        res.status(200).json({
            success: true,
            appointment,
        });
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointment',
            error: error.message,
        });
    }
};

/**
 * @desc    Update appointment status
 * @route   PATCH /api/appointments/:id/status
 * @access  Private (Staff)
 */
exports.updateAppointmentStatus = async (req, res) => {
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

        const { status } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Update status
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
 * @desc    Cancel appointment
 * @route   DELETE /api/appointments/:id
 * @access  Private
 */
exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
        }

        // Check if user is authorized to cancel this appointment
        if (
            req.user.role === 'patient' &&
            appointment.patient.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this appointment',
            });
        }

        // Set status to cancelled instead of deleting
        appointment.status = 'cancelled';
        await appointment.save();

        // Auto-trigger refund if payment was captured
        let refundResult = null;
        if (appointment.paymentStatus === 'paid') {
            try {
                const payment = await Payment.findOne({
                    appointment: appointment._id,
                    status: 'captured',
                });

                if (payment && payment.razorpayPaymentId) {
                    const refund = await razorpayService.refundPayment(
                        payment.razorpayPaymentId,
                        null,
                        { reason: 'Appointment cancelled by user' }
                    );

                    payment.status = 'refunded';
                    payment.refundId = refund.id;
                    payment.refundStatus = 'processed';
                    payment.refundAmount = refund.amount;
                    await payment.save();

                    appointment.paymentStatus = 'refunded';
                    await appointment.save();

                    refundResult = {
                        refundId: refund.id,
                        amount: refund.amount,
                        status: refund.status,
                    };
                }
            } catch (refundError) {
                console.error('Auto-refund failed during cancellation:', refundError);
                // Don't fail the cancellation — refund can be done manually
                refundResult = { error: 'Refund could not be processed automatically. Contact support.' };
            }
        }

        res.status(200).json({
            success: true,
            message: appointment.paymentStatus === 'refunded'
                ? 'Appointment cancelled and refund initiated'
                : 'Appointment cancelled successfully',
            appointment,
            refund: refundResult,
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel appointment',
            error: error.message,
        });
    }
};
