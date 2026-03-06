const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: ['patient', 'staff'],
            default: 'patient',
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        acceptedTerms: {
            type: Boolean,
            default: false,
        },
        termsAcceptedAt: {
            type: Date,
        },
        // Profile fields
        dateOfBirth: {
            type: Date,
        },
        age: {
            type: Number,
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other', ''],
        },
        bloodGroup: {
            type: String,
        },
        aadhaarNumber: {
            type: String,
        },
        address: {
            type: String,
        },
        whatsapp: {
            type: String,
        },
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String,
        },
        profileCompleted: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public user data (without password)
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
