const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        patientName: {
            type: String,
            required: true,
        },
        patientEmail: {
            type: String,
            required: true,
        },

        // ── Medical Information ──
        currentDiagnosis: {
            type: String,
            trim: true,
        },
        medicalHistory: {
            type: String,
            trim: true,
        },
        allergies: {
            type: String,
            trim: true,
        },
        currentMedications: {
            type: String,
            trim: true,
        },
        recentSurgeries: {
            type: String,
            trim: true,
        },
        mobilityStatus: {
            type: String,
            enum: ['Independent', 'Assisted', 'Bedridden', ''],
            default: '',
        },
        specialEquipmentNeeds: {
            type: String,
            trim: true,
        },

        // ── Nursing Service Selection ──
        services: {
            type: [String],
            default: [],
        },

        // ── Scheduling ──
        date: {
            type: String,
            required: [true, 'Appointment date is required'],
        },
        time: {
            type: String,
            required: [true, 'Appointment time is required'],
        },

        // ── Legacy / general ──
        reason: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending',
        },
        notes: {
            type: String,
            trim: true,
        },

        // ── Payment fields ──
        amount: {
            type: Number,
            default: 50000, // Default consultation fee in paise (₹500)
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
        },
        // ── Staff Assignment ──
        assignedStaff: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexes for better query performance
appointmentSchema.index({ patient: 1, date: -1 }); // Patient's appointments sorted by date
appointmentSchema.index({ status: 1, date: -1 }); // Appointments by status and date
appointmentSchema.index({ assignedStaff: 1, status: 1 }); // Staff's assigned appointments
appointmentSchema.index({ paymentStatus: 1 }); // Payment status queries
appointmentSchema.index({ date: 1, time: 1 }); // Scheduling conflicts check

module.exports = mongoose.model('Appointment', appointmentSchema);
