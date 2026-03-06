# Healthcare Admin Panel Setup Guide

## Overview

The Healthcare Admin Panel is a comprehensive web-based dashboard for managing the entire healthcare appointment system. It provides full control over staff, patients, and appointments.

## Features

### ✨ Core Features

1. **Dashboard Overview**
   - Total patients count
   - Total staff count
   - Pending appointments count
   - Total appointments count
   - Recent appointments list with real-time status

2. **Staff Management**
   - Create new staff users
   - View all staff members
   - Activate/deactivate staff accounts
   - Delete staff users
   - Auto-verified email for staff accounts

3. **Patient Management**
   - View all registered patients
   - Monitor patient activity
   - Activate/deactivate patient accounts
   - Delete patient records
   - View patient details (email, phone, profile completion)

4. **Appointment Management**
   - View all appointments across the system
   - Update appointment status (Pending → Confirmed → Completed/Cancelled)
   - Filter by status
   - View patient and doctor details
   - See appointment date, time, and reason

## Backend Setup

### 1. Separate Admin Model

The system now uses a **separate Admin model** instead of adding admin to the User model:
- **Admin Model** (`models/Admin.js`) - System administrators with separate collection
- **User Model** (`models/User.js`) - Only supports two roles:
  - `patient` - Regular patients
  - `staff` - Healthcare staff members

**Benefits:**
- Clear separation of concerns
- Admin data isolated from regular users
- Enhanced security
- Simpler user model

### 2. Admin Routes (API Endpoints)

**Public:**
- `POST /api/admin/login` - Admin login

**Protected (Admin only):**
- `GET /api/admin/stats` - Dashboard statistics
- `POST /api/admin/staff` - Create staff user
- `GET /api/admin/staff` - Get all staff
- `GET /api/admin/patients` - Get all patients
- `GET /api/admin/appointments` - Get all appointments
- `PATCH /api/admin/appointments/:id/status` - Update appointment status
- `DELETE /api/admin/users/:id` - Delete user
- `PATCH /api/admin/users/:id/toggle-active` - Toggle user active status

### 3. Create First Admin User

**Step 1:** Navigate to backend directory
```bash
cd backend
```

**Step 2:** Run the admin creation script
```bash
npm run create-admin
```

**Default Admin Credentials:**
```
Email: admin@healthcare.com
Password: admin123
```

**⚠️ IMPORTANT:** Change this password immediately after first login!

## Frontend Setup (Admin Panel)

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001`

### 3. Production Build

```bash
npm run build
npm start
```

## Usage Guide

### Login

1. Navigate to `http://localhost:3001`
2. You'll be redirected to `/login`
3. Enter admin credentials:
   - Email: `admin@healthcare.com`
   - Password: `admin123`
4. Click "Sign In"

### Dashboard

After login, you'll see the main dashboard with:
- **Statistics Cards**: Overview of system metrics
- **Recent Appointments Table**: Latest 5 appointments

### Creating Staff Users

1. Click the "Staff Management" tab
2. Click "+ Create Staff" button
3. Fill in the form:
   - Full Name
   - Email
   - Phone
   - Password (minimum 6 characters)
4. Click "Create Staff"
5. Staff account is created with email pre-verified

### Managing Patients

1. Click the "Patients" tab
2. View all registered patients
3. Actions available:
   - **Activate/Deactivate**: Toggle patient account status
   - **Delete**: Permanently remove patient (requires confirmation)

### Managing Appointments

1. Click the "Appointments" tab
2. View all appointments in the system
3. Change status using dropdown:
   - **Pending**: New appointment (yellow)
   - **Confirmed**: Appointment confirmed (blue)
   - **Completed**: Service completed (green)
   - **Cancelled**: Appointment cancelled (red)
4. Status changes are immediate and update patient apps

## Security Features

### Authentication
- JWT-based authentication
- Token stored in localStorage
- Protected routes (redirect to login if not authenticated)
- Admin-only API endpoints with role-based authorization

### Data Protection
- Passwords hashed with bcryptjs
- Admin users cannot be deleted or modified by other admins
- Confirmation dialogs for destructive actions

## API Integration

### Base URL
```javascript
const API_URL = 'http://localhost:3000/api/admin';
```

### Authentication Header
```javascript
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
```

### Example: Create Staff
```javascript
const response = await fetch('http://localhost:3000/api/admin/staff', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'password123',
    }),
});
```

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router
- **HTTP Client**: Fetch API

### Backend
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Password Hashing**: bcryptjs

## Folder Structure

```
admin/
├── app/
│   ├── page.js              # Root redirect page
│   ├── login/
│   │   └── page.js          # Login page
│   └── dashboard/
│       └── page.js          # Main dashboard (all tabs)
├── public/
└── package.json

backend/
├── controllers/
│   └── adminController.js   # Admin business logic
├── routes/
│   └── admin.js             # Admin API routes
├── models/
│   └── User.js              # Updated with 'admin' role
├── scripts/
│   └── createAdmin.js       # Admin creation script
└── server.js                # Updated with admin routes
```

## Troubleshooting

### Issue: Cannot Login
**Solution**:
1. Ensure backend server is running on port 3000
2. Check admin user was created: `npm run create-admin`
3. Verify credentials match

### Issue: 401 Unauthorized
**Solution**:
1. Token may have expired - logout and login again
2. Check localStorage has 'adminToken'

### Issue: Data Not Loading
**Solution**:
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Ensure MongoDB is running

### Issue: CORS Errors
**Solution**:
1. Backend CORS is configured for all origins by default
2. If needed, update `.env`: `CORS_ORIGIN=http://localhost:3001`

## Environment Variables

### Backend (.env)
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/healthcare

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=*
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in environment
2. Use strong JWT_SECRET
3. Configure CORS with specific origins
4. Enable HTTPS
5. Use MongoDB Atlas or managed database

### Frontend
1. Update API_URL to production backend URL
2. Build: `npm run build`
3. Deploy to Vercel, Netlify, or any Node.js hosting
4. Configure environment variables

## Maintenance

### Regular Tasks
1. Monitor system statistics
2. Review pending appointments daily
3. Manage staff access as needed
4. Clean up inactive accounts periodically

### Security Updates
1. Change default admin password immediately
2. Rotate JWT secrets periodically
3. Keep dependencies updated
4. Monitor for suspicious activity

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Check browser console
4. Verify all services are running

## Future Enhancements

Potential features to add:
- [ ] Analytics and reports
- [ ] Email notifications for appointments
- [ ] Bulk operations
- [ ] Advanced filtering and search
- [ ] Export data to CSV/PDF
- [ ] Activity logs
- [ ] Multi-admin support with permissions
- [ ] 2FA authentication
- [ ] Dark mode

---

**Version**: 1.0.0
**Last Updated**: 2026-03-05
