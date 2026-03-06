require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedStaff = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if staff user already exists
        const existingStaff = await User.findOne({ email: 'staff@healthcare.com' });

        if (existingStaff) {
            console.log('⚠️  Staff user already exists');
            console.log('Email:', existingStaff.email);
            console.log('Role:', existingStaff.role);
            process.exit(0);
        }

        // Create staff user
        const staffUser = await User.create({
            fullName: 'Healthcare Staff',
            email: 'staff@healthcare.com',
            phone: '+1234567890',
            password: 'staff123', // Change this in production!
            role: 'staff',
        });

        console.log('\n✅ Staff user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:    staff@healthcare.com');
        console.log('🔑 Password: staff123');
        console.log('👤 Role:     staff');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  Remember to change the password in production!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedStaff();
