require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@healthcare.com' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists!');
            console.log('Email: admin@healthcare.com');
            process.exit(0);
        }

        // Create admin user
        const admin = await Admin.create({
            fullName: 'Admin',
            email: 'admin@healthcare.com',
            password: 'admin123', // Change this password after first login
            isActive: true,
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: admin@healthcare.com');
        console.log('🔑 Password: admin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
